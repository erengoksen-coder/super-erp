import { NextRequest, NextResponse } from 'next/server';
import { askAI } from '@/lib/ai/ai-service';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

/**
 * AI Asistan Chat API
 * Programla ilgili soruları cevaplar
 */
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const body = await request.json();
        const { message } = body;

        if (!message || String(message).length < 2) {
            return NextResponse.json({
                success: false,
                error: 'Mesaj boş olamaz.'
            }, { status: 400 });
        }

        const result = await askAI(message);

        return NextResponse.json({
            success: true,
            data: {
                answer: result.answer,
                related: result.related,
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
