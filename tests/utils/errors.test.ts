import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createError } from '../../lib/utils/errors'

describe('Error Handling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createError', () => {
    it('should create unauthorized error', () => {
      const error = createError.unauthorized('Custom message')
      
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.message).toBe('Custom message')
      expect(error.statusCode).toBe(401)
    })

    it('should create validation error with details', () => {
      const details = { field: 'username', value: 'test' }
      const error = createError.validation('Validation failed', details)
      
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Validation failed')
      expect(error.details).toEqual(details)
      expect(error.statusCode).toBe(400)
    })

    it('should create not found error', () => {
      const error = createError.notFound('User not found')
      
      expect(error.code).toBe('NOT_FOUND')
      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
    })

    it('should create insufficient stock error', () => {
      const details = { requested: 10, available: 5 }
      const error = createError.insufficientStock(details)
      
      expect(error.code).toBe('INSUFFICIENT_STOCK')
      expect(error.statusCode).toBe(422)
      expect(error.details).toEqual(details)
    })
  })

  describe('Error Serialization', () => {
    it('should serialize AppError to JSON', () => {
      const details = { field: 'test' }
      const error = createError.validation('Test validation', details)
      const json = error.toJSON()
      
      expect(json).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Test validation',
        statusCode: 400,
        details: { field: 'test' },
      })
    })
  })

  describe('Status Code Mapping', () => {
    it('should map error codes to correct HTTP status codes', () => {
      const testCases = [
        { factory: createError.unauthorized, expectedStatus: 401 },
        { factory: createError.forbidden, expectedStatus: 403 },
        { factory: createError.notFound, expectedStatus: 404 },
        { factory: createError.alreadyExists, expectedStatus: 409 },
        { factory: createError.validation, expectedStatus: 400 },
        { factory: createError.insufficientStock, expectedStatus: 422 },
        { factory: createError.database, expectedStatus: 500 },
        { factory: createError.internal, expectedStatus: 500 },
      ]

      testCases.forEach(({ factory, expectedStatus }) => {
        const error = factory('Test')
        expect(error.statusCode).toBe(expectedStatus)
      })
    })
  })

  describe('Error Creation', () => {
    it('should create unauthorized error', () => {
      const error = createError.unauthorized('Custom message')
      
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.message).toBe('Custom message')
      expect(error.statusCode).toBe(401)
    })

    it('should create validation error with details', () => {
      const details = { field: 'username', value: 'test' }
      const error = createError.validation('Validation failed', details)
      
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Validation failed')
      expect(error.details).toEqual(details)
      expect(error.statusCode).toBe(400)
    })
  })
})