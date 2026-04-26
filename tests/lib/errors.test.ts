import { describe, it, expect } from 'vitest'
import {
  AppError,
  AuthError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  RateLimitError,
} from '@/lib/errors'

describe('AppError', () => {
  it('should set statusCode and message correctly', () => {
    const err = new AppError('Test error', 500)
    expect(err.message).toBe('Test error')
    expect(err.statusCode).toBe(500)
    expect(err.name).toBe('AppError')
  })

  it('should be an instance of Error', () => {
    const err = new AppError('Test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })

  it('should default statusCode to 500', () => {
    const err = new AppError('Generic error')
    expect(err.statusCode).toBe(500)
  })

  it('should store optional details', () => {
    const err = new AppError('Error with details', 400, { field: 'email' })
    expect(err.details).toEqual({ field: 'email' })
  })
})

describe('AuthError', () => {
  it('should have statusCode 401', () => {
    const err = new AuthError()
    expect(err.statusCode).toBe(401)
    expect(err.name).toBe('AuthError')
  })

  it('should accept a custom message', () => {
    const err = new AuthError('Token süresi dolmuş')
    expect(err.message).toBe('Token süresi dolmuş')
  })
})

describe('ValidationError', () => {
  it('should have statusCode 400', () => {
    const err = new ValidationError('E-posta gerekli')
    expect(err.statusCode).toBe(400)
    expect(err.name).toBe('ValidationError')
  })
})

describe('NotFoundError', () => {
  it('should have statusCode 404', () => {
    const err = new NotFoundError()
    expect(err.statusCode).toBe(404)
    expect(err.name).toBe('NotFoundError')
  })
})

describe('ForbiddenError', () => {
  it('should have statusCode 403', () => {
    const err = new ForbiddenError()
    expect(err.statusCode).toBe(403)
    expect(err.name).toBe('ForbiddenError')
  })
})

describe('RateLimitError', () => {
  it('should have statusCode 429', () => {
    const err = new RateLimitError()
    expect(err.statusCode).toBe(429)
    expect(err.name).toBe('RateLimitError')
  })
})
