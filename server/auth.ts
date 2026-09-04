import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

export interface AdminSession {
  token: string;
  user: AdminUser;
  createdAt: number;
  expiresAt: number;
}

// In-memory active session store with automatic TTL management
const activeSessions = new Map<string, AdminSession>();
const revokedSessions = new Map<string, number>();

// Session duration: 24 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// Configuration read from environment variables only.
const SESSION_SECRET = process.env.SESSION_SECRET || '';

function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

function readSignedAdminSession(token: string): AdminSession | null {
  if (!SESSION_SECRET || !token.startsWith('adm_sess_') || !token.includes('.')) return null;

  const raw = token.slice('adm_sess_'.length);
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
    if (parsed?.type !== 'admin' || parsed?.user?.role !== 'admin' || !parsed.expiresAt) return null;
    return {
      token,
      user: {
        id: String(parsed.user.id),
        email: String(parsed.user.email),
        name: String(parsed.user.name),
        role: 'admin'
      },
      createdAt: Number(parsed.createdAt || Date.now()),
      expiresAt: Number(parsed.expiresAt)
    };
  } catch {
    return null;
  }
}

function getAdminEmails(): string[] {
  const envEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : '';
  return envEmail ? [envEmail] : [];
}

function getAdminPasswords(): string[] {
  const envPass = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD : '';
  return envPass ? [envPass, envPass.trim()].filter(Boolean) : [];
}

export const authService = {
  // Check if admin credentials are fully configured on the server
  isConfigured(): boolean {
    return Boolean(SESSION_SECRET && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  },

  // Validate admin login credentials
  authenticate(email: string, password: string): { success: boolean; session?: AdminSession; error?: string } {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }

    if (!this.isConfigured()) {
      return { success: false, error: 'Administrator credentials are not configured on the server.' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validEmails = getAdminEmails();
    const validPasswords = getAdminPasswords();

    const emailMatches = validEmails.some(e => e.toLowerCase() === normalizedEmail);
    const passwordMatches = validPasswords.some(p => p === password || p === password.trim());

    if (!emailMatches || !passwordMatches) {
      return { success: false, error: 'Invalid administrator email or password' };
    }

    // Clean up expired sessions periodically
    this.cleanupExpiredSessions();

    const now = Date.now();
    const user: AdminUser = {
      id: 'admin_master_1',
      email: normalizedEmail,
      name: 'Atelier Administrator',
      role: 'admin'
    };
    const payload = {
      type: 'admin',
      user,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS
    };
    const encodedPayload = encodePayload(payload);
    const token = `adm_sess_${encodedPayload}.${signPayload(encodedPayload)}`;
    const session: AdminSession = {
      token,
      user,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS
    };

    activeSessions.set(token, session);
    return { success: true, session };
  },

  // Validate an active session token
  validateSession(token: string): AdminSession | null {
    if (!token) return null;
    if (revokedSessions.has(token)) return null;

    const session = activeSessions.get(token) || readSignedAdminSession(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      revokedSessions.delete(token);
      return null;
    }

    return session;
  },

  // Destroy a session on logout
  destroySession(token: string): boolean {
    if (!token) return false;
    const session = activeSessions.get(token) || readSignedAdminSession(token);
    if (session) {
      revokedSessions.set(token, session.expiresAt);
    }
    return activeSessions.delete(token) || Boolean(session);
  },

  // Cleanup expired sessions
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of activeSessions.entries()) {
      if (now > session.expiresAt) {
        activeSessions.delete(token);
      }
    }
    for (const [token, expiresAt] of revokedSessions.entries()) {
      if (now > expiresAt) {
        revokedSessions.delete(token);
      }
    }
  }
};

// Express Middleware to enforce Admin Authorization
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Extract token from Authorization header or custom header
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  } else if (req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required. No administrator session token provided.'
    });
  }

  // Reject customer tokens immediately if a customer token was sent to admin endpoint
  if (token.startsWith('cust_sess_')) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied. Customer session cannot be used for administrative privileges.'
    });
  }

  const session = authService.validateSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired administrator session. Please log in again.'
    });
  }

  if (session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied. Administrative privileges required.'
    });
  }

  // Attach verified admin user to request object
  (req as any).adminUser = session.user;
  next();
}
