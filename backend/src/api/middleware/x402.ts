import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../../config/env.js';
import { createHmac } from 'crypto';
import Pino from 'pino';

const logger = Pino({ name: 'x402-middleware' });

export interface X402Payment {
  paymentId: string;
  amount: bigint;
  token: string;
  signature: string;
  timestamp: number;
}

declare global {
  namespace Express {
    interface Request {
      payment?: X402Payment;
    }
  }
}

export function x402Middleware(req: Request, res: Response, next: NextFunction): void {
  const paymentHeader = req.headers['x402-payment'];
  
  if (!paymentHeader) {
    res.status(402).json({
      error: 'Payment Required',
      message: 'x402 payment header is required for this endpoint',
      header: 'x402-payment',
    });
    return;
  }
  
  try {
    const payment = JSON.parse(paymentHeader as string) as X402Payment;
    
    if (!payment.paymentId || !payment.signature) {
      res.status(400).json({ error: 'Invalid payment format' });
      return;
    }
    
    const env = getEnv();
    const signaturePayload = `${payment.paymentId}:${payment.amount}:${payment.timestamp}`;
    const expectedSignature = createHmac('sha256', env.X402_GATEWAY_SECRET)
      .update(signaturePayload)
      .digest('hex');
    
    if (payment.signature !== expectedSignature) {
      logger.warn({ paymentId: payment.paymentId }, 'Invalid payment signature');
      res.status(402).json({
        error: 'Payment Required',
        message: 'Invalid payment signature',
      });
      return;
    }
    
    if (Date.now() - payment.timestamp > 3600000) {
      res.status(402).json({
        error: 'Payment Required',
        message: 'Payment expired',
      });
      return;
    }
    
    req.payment = payment;
    next();
  } catch (err) {
    logger.error({ err }, 'Failed to parse payment header');
    res.status(400).json({ error: 'Invalid payment header format' });
  }
}
