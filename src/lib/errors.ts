/**
 * Application Error Types
 * Standardizes error handling across API routes.
 */

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Yetkisiz Erişim') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Erişim Reddedildi') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Bulunamadı') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Çok Fazla İstek') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST'
}

export function formatError(error: any) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: (error as any).code || ErrorCode.INTERNAL_ERROR,
      details: error.details
    };
  }
  return {
    message: error.message || 'Beklenmeyen bir hata oluştu',
    code: ErrorCode.INTERNAL_ERROR
  };
}
