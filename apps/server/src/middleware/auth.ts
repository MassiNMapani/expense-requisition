import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import env from '../config/env';
import type { UserRole } from '../constants/roles';
import { logger } from '../lib/logger';

interface TokenPayload {
  sub?: string;
  userId?: string;
  role: UserRole;
  departmentId?: string;
}

type AuthenticatedUser = {
  id: string;
  role: UserRole;
  departmentId?: string;
};

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer', '').trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    const user: AuthenticatedUser = {
      id: payload.sub ?? payload.userId ?? '',
      role: payload.role
    };

    if (!user.id) {
      throw new Error('Invalid token payload');
    }

    if (payload.departmentId) {
      user.departmentId = payload.departmentId;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Failed authentication', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
