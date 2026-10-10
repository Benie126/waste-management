import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { isProd } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // MySQL duplicate entry -> friendly conflict message
  const anyErr = err as { code?: string; sqlMessage?: string; message?: string };
  if (anyErr?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'A record with these details already exists' });
  }

  console.error('[error]', err);
  return res.status(500).json({
    success: false,
    message: isProd ? 'Internal server error' : anyErr?.message || 'Internal server error',
  });
}
