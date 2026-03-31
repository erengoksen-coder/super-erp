import { NextRequest, NextResponse } from 'next/server'

type ValidationError = { field: string; message: string; value?: unknown }

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Business logic errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_STATUS: 'INVALID_STATUS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
} as const

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: 'Yetkisiz erişim',
  [ERROR_CODES.FORBIDDEN]: 'Bu işlem için yetkiniz yok',
  [ERROR_CODES.INVALID_TOKEN]: 'Geçersiz token',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Token süresi dolmuş',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'Doğrulama hatası',
  [ERROR_CODES.INVALID_INPUT]: 'Geçersiz giriş verisi',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Gerekli alan eksik',
  
  [ERROR_CODES.NOT_FOUND]: 'Kayıt bulunamadı',
  [ERROR_CODES.ALREADY_EXISTS]: 'Kayıt zaten mevcut',
  
  [ERROR_CODES.INTERNAL_ERROR]: 'Sunucu hatası',
  [ERROR_CODES.DATABASE_ERROR]: 'Veritabanı hatası',
  [ERROR_CODES.NETWORK_ERROR]: 'Ağ hatası',
  
  [ERROR_CODES.INSUFFICIENT_STOCK]: 'Yetersiz stok',
  [ERROR_CODES.INVALID_STATUS]: 'Geçersiz durum',
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'İşleme izin verilmiyor',
}

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Base App Error class
export class AppErrorImpl extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(code: keyof typeof ERROR_CODES, message?: string, details?: unknown) {
    super(message || ERROR_MESSAGES[code])
    this.name = 'AppError'
    this.code = ERROR_CODES[code]
    this.statusCode = this.getStatusCode(code)
    this.details = details
  }

  private getStatusCode(code: string): number {
    switch (code) {
      case ERROR_CODES.UNAUTHORIZED:
      case ERROR_CODES.INVALID_TOKEN:
      case ERROR_CODES.TOKEN_EXPIRED:
        return HTTP_STATUS.UNAUTHORIZED
      case ERROR_CODES.FORBIDDEN:
      case ERROR_CODES.OPERATION_NOT_ALLOWED:
        return HTTP_STATUS.FORBIDDEN
      case ERROR_CODES.NOT_FOUND:
        return HTTP_STATUS.NOT_FOUND
      case ERROR_CODES.ALREADY_EXISTS:
        return HTTP_STATUS.CONFLICT
      case ERROR_CODES.VALIDATION_ERROR:
      case ERROR_CODES.INVALID_INPUT:
      case ERROR_CODES.MISSING_REQUIRED_FIELD:
        return HTTP_STATUS.BAD_REQUEST
      case ERROR_CODES.INSUFFICIENT_STOCK:
      case ERROR_CODES.INVALID_STATUS:
        return HTTP_STATUS.UNPROCESSABLE_ENTITY
      case ERROR_CODES.DATABASE_ERROR:
        return HTTP_STATUS.INTERNAL_SERVER_ERROR
      default:
        return HTTP_STATUS.INTERNAL_SERVER_ERROR
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    }
  }
}

// Validation Error class
export class ValidationErrorImpl extends Error {
  public readonly errors: ValidationError[]
  public readonly statusCode = HTTP_STATUS.BAD_REQUEST

  constructor(errors: ValidationError[]) {
    super('Validation failed')
    this.name = 'ValidationError'
    this.errors = errors
  }

  toJSON() {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: this.message,
      statusCode: this.statusCode,
      errors: this.errors,
    }
  }
}

// Error factory functions
export const createError = {
  unauthorized: (message?: string) => 
    new AppErrorImpl('UNAUTHORIZED', message),
  
  forbidden: (message?: string) => 
    new AppErrorImpl('FORBIDDEN', message),
  
  invalidToken: (message?: string) => 
    new AppErrorImpl('INVALID_TOKEN', message),
  
  tokenExpired: (message?: string) => 
    new AppErrorImpl('TOKEN_EXPIRED', message),
  
  validation: (message?: string, details?: unknown) => 
    new AppErrorImpl('VALIDATION_ERROR', message, details),
  
  invalidInput: (message?: string, details?: unknown) => 
    new AppErrorImpl('INVALID_INPUT', message, details),
  
  notFound: (message?: string) => 
    new AppErrorImpl('NOT_FOUND', message),
  
  alreadyExists: (message?: string) => 
    new AppErrorImpl('ALREADY_EXISTS', message),
  
  insufficientStock: (details?: unknown) => 
    new AppErrorImpl('INSUFFICIENT_STOCK', undefined, details),
  
  invalidStatus: (message?: string) => 
    new AppErrorImpl('INVALID_STATUS', message),
  
  operationNotAllowed: (message?: string) => 
    new AppErrorImpl('OPERATION_NOT_ALLOWED', message),
  
  database: (message?: string, details?: unknown) => 
    new AppErrorImpl('DATABASE_ERROR', message, details),
  
  internal: (message?: string, details?: unknown) => 
    new AppErrorImpl('INTERNAL_ERROR', message, details),
  
  validationErrors: (errors: ValidationError[]) => 
    new ValidationErrorImpl(errors),
}

// Error handler middleware
export function handleError(error: unknown): NextResponse {
  // Log the error for debugging
  console.error('Error occurred:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    details: error instanceof AppErrorImpl ? error.details : undefined,
  })

  // Handle known errors
  if (error instanceof AppErrorImpl) {
    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
    })
  }

  if (error instanceof ValidationErrorImpl) {
    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
    })
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const validationErrors = (error as any).issues.map((issue: any) => ({
      field: issue.path?.join('.') || 'unknown',
      message: issue.message,
      value: issue.received,
    }))
    
    return NextResponse.json(
      createError.validationErrors(validationErrors).toJSON(),
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }

  // Handle unknown errors
  return NextResponse.json(
    createError.internal('Beklenmeyen bir hata oluştu').toJSON(),
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  )
}

// Async error wrapper
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      throw error
    }
  }
}

// API route wrapper
export function withRouteHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

// Success response helper
export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  statusCode: number = HTTP_STATUS.OK
) => {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  )
}

// Paginated response helper
export const createPaginatedResponse = <T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  },
  message?: string
) => {
  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
      message,
      timestamp: new Date().toISOString(),
    },
    { status: HTTP_STATUS.OK }
  )
}