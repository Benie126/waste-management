import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { JwtPayload, Role } from '../types';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as jwt.SignOptions);
}

/**
 * Verifies the Bearer token and attaches the user to the request.
 * Every protected route goes through this middleware.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication token is missing'));
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as unknown as JwtPayload;
    req.user = {
      userId: decoded.sub,
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/**
 * Role-Based Access Control. A user may only reach routes whose allowed roles
 * include their own role.
 *
 * Example: COLLECTOR hitting an ADMIN-only route gets 403 Forbidden.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Your role (${req.user.role}) is not allowed to access this resource`
        )
      );
    }
    next();
  };
}
