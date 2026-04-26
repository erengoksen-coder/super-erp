import { NextResponse } from 'next/server'

type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
  meta?: { total?: number; limit?: number; offset?: number; [key: string]: any }
}

type ApiError = {
  success: false
  error: string
  details?: unknown
}

export function ok<T>(
  data: T,
  init?: { 
    status?: number; 
    message?: string; 
    headers?: HeadersInit; 
    meta?: { total?: number; limit?: number; offset?: number; [key: string]: any } 
  }
) {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    ...(init?.message ? { message: init.message } : {}),
    ...(init?.meta ? { meta: init.meta } : {}),
  }
  return NextResponse.json(payload, { status: init?.status, headers: init?.headers })
}

export function fail(
  error: string,
  init?: { status?: number; details?: unknown; headers?: HeadersInit }
) {
  const payload: ApiError = {
    success: false,
    error,
    ...(init?.details ? { details: init.details } : {}),
  }
  return NextResponse.json(payload, { status: init?.status ?? 500, headers: init?.headers })
}
