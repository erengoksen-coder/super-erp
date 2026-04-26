import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, formatError, ErrorCode } from '@/lib/errors';
import { getCurrentUser } from '@/lib/auth/jwt';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Super ERP - Standard API Handler
 * Handles: Auth, Rate Limiting, Error Catching, Logging, Response Formatting
 */

interface HandlerOptions {
  authRequired?: boolean;
  roles?: string[];
  rateLimit?: {
    limit: number;
    windowMs: number;
  };
}

export type AuthUser = {
  userId: string;
  role: string;
  username: string;
  companyId: string;
  branchId: string;
};

type ApiHandlerFunc<T> = (
  req: NextRequest,
  context: { user?: AuthUser; params: any }
) => Promise<T>;

export function apiHandler<T>(
  handler: ApiHandlerFunc<T>,
  options: HandlerOptions = { authRequired: true }
) {
  return async (req: NextRequest, { params }: { params: any }) => {
    try {
      // 1. Hız Sınırlama (Rate Limiting)
      if (options.rateLimit) {
        const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
        const limitResult = await rateLimit(ip, options.rateLimit);
        if (!limitResult.success) {
          throw new AppError(
            'Çok fazla istek. Lütfen biraz bekleyin.',
            429,
            undefined,
            ErrorCode.RATE_LIMIT_EXCEEDED
          );
        }
      }

      // 2. Kimlik Doğrulama (Authentication)
      let user: AuthUser | undefined;
      if (options.authRequired) {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          throw new AppError(
            'Bu işlem için giriş yapmanız gerekiyor.',
            401,
            undefined,
            ErrorCode.UNAUTHORIZED
          );
        }
        
        user = {
          userId: currentUser.userId,
          role: currentUser.role,
          username: currentUser.username,
          companyId: currentUser.companyId,
          branchId: currentUser.branchId
        };

        // 3. Yetki Kontrolü (Authorization)
        if (options.roles && !options.roles.includes(user.role)) {
          throw new AppError(
            'Bu işlem için yetkiniz bulunmuyor.',
            403,
            undefined,
            ErrorCode.FORBIDDEN
          );
        }
      }

      // 4. İşleyiciyi Çalıştır
      const data = await handler(req, { user, params });

      // 5. Başarılı Yanıt Dön
      if (data instanceof NextResponse) return data;
      
      return NextResponse.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      // 6. Hata Yönetimi ve Loglama
      console.error(`[API ERROR] ${req.nextUrl.pathname}:`, error);

      // Zod doğrulama hatalarını özel ele al
      if (error instanceof ZodError) {
        return NextResponse.json(
          formatError(new AppError('Geçersiz girdi verisi', 400, error.errors, ErrorCode.VALIDATION_ERROR)),
          { status: 400 }
        );
      }

      const formatted = formatError(error);
      const status = error instanceof AppError ? error.statusCode : 500;

      return NextResponse.json(formatted, { status });
    }
  };
}

// Eski handleApi uyumluluğu için (gerekiyorsa)
export async function handleApi<T>(handler: () => Promise<T>) {
  try {
    const data = await handler();
    if (data instanceof NextResponse) return data;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const formatted = formatError(error);
    return NextResponse.json(formatted, { status: error.statusCode || 500 });
  }
}
