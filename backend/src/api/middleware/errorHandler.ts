import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import Pino from 'pino';

const logger = Pino({ name: 'error-handler' });

export class ZKProofError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ZKProofError';
  }
}

export class AttestationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AttestationError';
  }
}

export class NullifierError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'NullifierError';
  }
}

export class ChainError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ChainError';
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  logger.error({
    err,
    path: req.path,
    method: req.method,
    body: req.body,
  }, 'Request error');
  
  if (err instanceof ZKProofError) {
    res.status(500).json({
      error: 'Proof generation error',
      code: err.code,
      message: isDevelopment ? err.message : 'An error occurred while generating the proof',
    });
    return;
  }
  
  if (err instanceof AttestationError) {
    res.status(400).json({
      error: 'Attestation error',
      code: err.code,
      message: isDevelopment ? err.message : 'Invalid attestation data',
    });
    return;
  }
  
  if (err instanceof NullifierError) {
    res.status(400).json({
      error: 'Nullifier error',
      code: err.code,
      message: isDevelopment ? err.message : 'Invalid nullifier operation',
    });
    return;
  }
  
  if (err instanceof ChainError) {
    res.status(503).json({
      error: 'Blockchain error',
      code: err.code,
      message: isDevelopment ? err.message : 'Unable to interact with blockchain',
    });
    return;
  }
  
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation error',
      message: err.message,
    });
    return;
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
  });
};

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
