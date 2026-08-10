import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET;

if (!JWT_SECRET) {
  throw new Error('SESSION_SECRET must be set for JWT signing.');
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

/** Sign a JWT for a user. */
export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '30d' });
}

/** Verify a JWT and return the payload. Throws if invalid. */
export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET!) as JwtPayload;
}

/** Express middleware that requires a valid Bearer JWT.
 *  On success, attaches `req.user` with `{ id, email }`.
 *  On failure, responds 401 and stops the chain.
 */
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

/** Optional auth — attaches `req.user` if token present and valid, does not block. */
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

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}
