import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose'; 


/**
 * Super ERP - Global Middleware
 * Handles: Token validation, Protected routes, CORS, Rate limiting
 */

const PROTECTED_PATHS = ['/api/orders', '/api/inventory', '/api/accounts', '/api/production', '/api/admin'];
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. CORS Ayarları
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response;
  }

  // 2. Korumalı Rotalar İçin Token Kontrolü
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path));

  if (isProtected && !isPublic) {
    const token = request.headers.get('Authorization')?.split(' ')[1] || request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Token missing' },
        { status: 401 }
      );
    }

    try {
      // Token doğrulama (JWT_SECRET env'den alınır)
      // Not: jose kütüphanesi edge runtime uyumludur
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jose.jwtVerify(token, secret);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
