import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const provided = req.header('x-api-key');

  if (!provided || !safeEqual(provided, config.appApiKey)) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'API key inválida o ausente. Envía el header X-API-Key.',
    });
    return;
  }

  next();
}
