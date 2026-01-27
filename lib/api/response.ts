import { NextResponse } from 'next/server'

type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}

type ApiError = {
  success: false
  error: string
  details?: unknown
}

export function ok<T>(
  data: T,
  init?: { status?: number; message?: string; headers?: HeadersInit }
) {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    ...(init?.message ? { message: init.message } : {}),
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
  return NextResponse.json(payload, { status: init?.status, headers: init?.headers })
}
