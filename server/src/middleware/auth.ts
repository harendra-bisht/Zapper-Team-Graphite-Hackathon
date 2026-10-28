import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/db';

export interface AuthUser {
  id: number;
  uuid: string;
  name: string;
  authorized_rep_name?: string;
  email: string;
  role: 'admin' | 'institution';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  organization_name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient administrative privileges' });
    }
    next();
  };
}

export async function requireApprovedInstitution(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'admin') {
    return next();
  }

  try {
    const db = await getDatabase();
    const instQuery = await db.query('SELECT status FROM institutions WHERE id = $1', [req.user.id]);
    const liveStatus = instQuery.rows[0]?.status || req.user.status;

    if (liveStatus !== 'approved') {
      return res.status(403).json({
        error: `Institution account status is '${liveStatus}'. Official approval required before issuing certificates.`,
      });
    }

    req.user.status = 'approved';
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
