import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from './ApiError';

/** Validates req.body against a zod schema and replaces it with parsed data. */
export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join('.') || '(root)',
          message: i.message,
        }));
        next(ApiError.badRequest('Validation failed', details));
      } else {
        next(err);
      }
    }
  };
}

export function validateQuery(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          ApiError.badRequest(
            'Invalid query parameters',
            err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
          )
        );
      } else {
        next(err);
      }
    }
  };
}
