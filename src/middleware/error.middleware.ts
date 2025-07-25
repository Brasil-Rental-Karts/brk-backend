import { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';

import { HttpException } from '../exceptions/http.exception';

export const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = error.status || 500;
  const message = error.message || 'Something went wrong';

  // Capture error in Sentry
  Sentry.captureException(error);

  res.status(status).json({
    status,
    message,
  });
};
