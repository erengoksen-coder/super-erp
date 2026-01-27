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

export function ok<T>(data: T, init?: { status?: number; message?: string }) {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    ...(init?.message ? { message: init.message } : {}),
  }
  return NextResponse.json(payload, { status: init?.status })
}

export function fail(error: string, init?: { status?: number; details?: unknown }) {
  const payload: ApiError = {
    success: false,
    error,
    ...(init?.details ? { details: init.details } : {}),
  }
  return NextResponse.json(payload, { status: init?.status })
}
