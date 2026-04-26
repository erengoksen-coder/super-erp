import { NextRequest } from 'next/server';
import { getAuthUserPayload } from '@/lib/auth/session';

/**
 * AI ve API rotaları için ortak yetkilendirme katmanı.
 * Mevcut custom JWT altyapısını kullanarak kullanıcı bilgilerini döndürür.
 */
export async function getUserFromRequest(request: NextRequest) {
    const payload = await getAuthUserPayload(request);
    
    if (!payload) return null;

    // Rotaların beklediği standart kullanıcı objesini döndür
    return {
        id: payload.userId || payload.sub,
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role,
        company_id: payload.company_id || 'company_default'
    };
}
