import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { CustomerRecord } from './dataStore';
import { getActiveStore } from './db';

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
const revokedCustomerSessions = new Map<string, number>();

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'development-customer-session-secret';
}

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function readSignedSession(token: string): CustomerSession | null {
  if (!token.startsWith('cust_sess_') || !token.includes('.')) return null;

  const raw = token.slice('cust_sess_'.length);
  const [encodedPayload, signature] = raw.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const valid = Buffer.from(expected);
  if (provided.length !== valid.length || !crypto.timingSafeEqual(provided, valid)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (parsed?.type !== 'customer' || !parsed.customerId || !parsed.email || !parsed.expiresAt) return null;
    return {
      token,
      customerId: String(parsed.customerId),
      email: String(parsed.email).trim().toLowerCase(),
      createdAt: Number(parsed.createdAt || Date.now()),
      expiresAt: Number(parsed.expiresAt)
    };
  } catch {
    return null;
  }
}

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
  const now = Date.now();
  const payload = {
    type: 'customer',
    customerId,
    email: email.trim().toLowerCase(),
    createdAt: now,
    expiresAt: now + CUSTOMER_SESSION_TTL_MS
  };
  const encodedPayload = encodePayload(payload);
  const token = `cust_sess_${encodedPayload}.${signPayload(encodedPayload)}`;
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
  const session = activeCustomerSessions.get(token) || readSignedSession(token);
  if (session) {
    revokedCustomerSessions.set(token, session.expiresAt);
  }
  return activeCustomerSessions.delete(token) || Boolean(session);
}

/**
 * Verify a customer session token and return the customer record
 */
export async function getCustomerFromSession(token: string): Promise<CustomerRecord | null> {
  if (!token) return null;
  if (revokedCustomerSessions.has(token)) return null;

  const session = activeCustomerSessions.get(token) || readSignedSession(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeCustomerSessions.delete(token);
    revokedCustomerSessions.delete(token);
    return null;
  }

  const customer = await getActiveStore().getCustomerById(session.customerId);
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
export async function requireCustomerAuth(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.headers['x-customer-token'] as string);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Customer authentication required'
    });
  }

  const customer = await getCustomerFromSession(token);
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
export async function optionalCustomerAuth(req: AuthenticatedCustomerRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : (req.headers['x-customer-token'] as string);

  if (token) {
    const customer = await getCustomerFromSession(token);
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
