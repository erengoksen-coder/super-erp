import { NextRequest, NextResponse } from 'next/server';
import { askAI } from '@/lib/ai/ai-service';
import { withAuth, AuthUser, AuthContext } from '@/lib/api/withAuth';

/**
 * AI Asistan Chat API
 * Programla ilgili soruları cevaplar
 */
export const POST = withAuth(async (request: NextRequest, user: AuthUser, context: any) => {
    try {
        let body: any;
        try {
            body = await request.json();
        } catch (err: any) {
            console.error('[AI Chat API] Body read failed:', err?.message || err);
            return NextResponse.json({ success: false, error: 'İstek gövdesi okunamadı.' }, { status: 400 });
        }
        
        const { message, pulseEvents } = body;
        const activePath = body.path || '';

        if (!message || String(message).length < 2) {
            return NextResponse.json({
                success: false,
                error: 'Mesaj boş olamaz.'
            }, { status: 400 });
        }

        const result = await askAI(message, user.companyId, activePath, pulseEvents);

        return NextResponse.json({
            success: true,
            data: {
                answer: result.answer,
                related: result.related,
                action: result.action,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('[AI Chat API] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
