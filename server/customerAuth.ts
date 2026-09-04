import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { store, CustomerRecord } from './dataStore';

// Customer Session TTL: 7 days
const CUSTOMER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CustomerSession {
  token: string;
  customerId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory active customer sessions map (keyed by session token)
const activeCustomerSessions = new Map<string, CustomerSession>();

/**
 * Hash password with bcrypt
 */
export async function hashCustomerPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify customer password against bcrypt hash
 */
export async function verifyCustomerPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Create a new customer session
 */
export function createCustomerSession(customerId: string, email: string): CustomerSession {
  const token = 'cust_sess_' + crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: CustomerSession = {
    token,
    customerId,
    email: email.trim().toLowerCase(),
    createdAt: now,
    expiresAt: now + CUSTOMER_SESSION_TTL_MS
  };

  activeCustomerSessions.set(token, session);
  return session;
}

/**
 * Invalidate a customer session
 */
export function revokeCustomerSession(token: string): boolean {
  if (!token) return false;
  return activeCustomerSessions.delete(token);
}

/**
 * Verify a customer session token and return the customer record
 */
export function getCustomerFromSession(token: string): CustomerRecord | null {
  if (!token) return null;
  const session = activeCustomerSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeCustomerSessions.delete(token);
    return null;
  }

  const customer = store.getCustomerById(session.customerId);
  if (!customer) {
    activeCustomerSessions.delete(token);
    return null;
  }

  return customer;
}

// Express Request augmentation type
export interface AuthenticatedCustomerRequest extends Request {
  customer?: {
    id: string;
    name: string;
    email: string;
    role: 'customer';
    createdAt: string;
  };
}

/**
 * Middleware: Strictly requires customer authentication
 * Customer tokens CANNOT authenticate admin routes, and vice versa.
 */
export function requireCustomerAuth(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.headers['x-customer-token'] as string);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Customer authentication required'
    });
  }

  const customer = getCustomerFromSession(token);
  if (!customer) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired customer session. Please log in again.'
    });
  }

  req.customer = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    role: 'customer',
    createdAt: customer.createdAt
  };

  next();
}

/**
 * Middleware: Optional customer authentication
 */
export function optionalCustomerAuth(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.headers['x-customer-token'] as string);

  if (token) {
    const customer = getCustomerFromSession(token);
    if (customer) {
      req.customer = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        role: 'customer',
        createdAt: customer.createdAt
      };
    }
  }

  next();
}
