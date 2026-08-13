import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET (or SESSION_SECRET) must be set for JWT signing.');
  }
  return secret;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = verifyJwt(token);
    (req as AuthRequest).user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = verifyJwt(auth.slice(7));
      (req as AuthRequest).user = { id: payload.sub, email: payload.email };
    } catch {
      // invalid token → treat as unauthenticated
    }
  }
  next();
}
