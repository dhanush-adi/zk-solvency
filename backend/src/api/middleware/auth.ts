import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env.js';
import Pino from 'pino';

const logger = Pino({ name: 'auth-middleware' });

export interface JwtPayload {
  sub: string;
  role: 'user' | 'auditor' | 'regulator' | 'admin';
  exp: number;
  iat: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  
  const token = authHeader.substring(7);
  const env = getEnv();
  
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn({ err }, 'JWT verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}

export function generateToken(payload: Omit<JwtPayload, 'exp' | 'iat'>): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });
}
