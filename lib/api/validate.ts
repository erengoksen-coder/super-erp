import { z } from 'zod'
import { NextRequest } from 'next/server'

const defaultBodySchema = z.record(z.unknown())

export class ApiValidationError extends Error {
  status = 400
  constructor(message: string) {
    super(message)
    this.name = 'ApiValidationError'
  }
}

export async function parseJsonBody<T = Record<string, any>>(
  request: NextRequest,
  schema: z.ZodType<T> = defaultBodySchema as z.ZodType<T>
): Promise<T> {
  // Schema kontrolü - güvenli şekilde
  let activeSchema: z.ZodType<T>
  try {
    if (schema && typeof schema === 'object' && 'safeParse' in schema && typeof (schema as any).safeParse === 'function') {
      activeSchema = schema as z.ZodType<T>
    } else {
      activeSchema = defaultBodySchema as z.ZodType<T>
    }
  } catch {
    activeSchema = defaultBodySchema as z.ZodType<T>
  }

  let body: unknown
  let raw = ''
  try {
    raw = await request.text()
  } catch {
    throw new ApiValidationError('Geçersiz JSON')
  }

  if (!raw || !raw.trim()) {
    throw new ApiValidationError('Geçersiz JSON')
  }

  try {
    body = JSON.parse(raw)
  } catch {
    try {
      const params = new URLSearchParams(raw)
      if ([...params.keys()].length > 0) {
        body = Object.fromEntries(params.entries())
      } else {
        throw new Error('empty')
      }
    } catch {
      throw new ApiValidationError('Geçersiz JSON')
    }
  }

  // Güvenli parse işlemi
  try {
    if (!activeSchema || typeof activeSchema !== 'object' || !('safeParse' in activeSchema)) {
      // Schema geçersizse, body'yi olduğu gibi döndür
      return body as T
    }

    const parsed = activeSchema.safeParse(body)
    if (!parsed.success) {
      const error = parsed.error
      const message = (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues) && error.issues.length > 0)
        ? error.issues[0]?.message || 'Geçersiz istek'
        : 'Geçersiz istek'
      throw new ApiValidationError(message)
    }
    return parsed.data
  } catch (error) {
    if (error instanceof ApiValidationError) {
      throw error
    }
    // Beklenmeyen hata durumunda body'yi olduğu gibi döndür
    return body as T
  }
}
