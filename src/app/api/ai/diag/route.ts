import { NextRequest, NextResponse } from 'next/server';
import { askAI } from '@/lib/ai/ai-service';
import { getDatabase } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic AI API 
 * Tests the AI engine connection directly without withAuth wrappers
 */
export async function GET(request: NextRequest) {
    console.log('[DIAG] AI Diagnostic Start');
    const logs: string[] = [];
    
    try {
        logs.push('Testing database connection...');
        const db = getDatabase();
        const settingsCount = db.prepare('SELECT count(*) as count FROM app_settings').get() as { count: number };
        logs.push(`Database OK. Settings count: ${settingsCount.count}`);
        
        logs.push('Testing askAI service...');
        // Test message
        const testCompanyId = 'company_default';
        const result = await askAI('Merhaba test', testCompanyId, '/dashboard');
        
        logs.push('askAI success!');
        
        return NextResponse.json({
            success: true,
            logs,
            data: result
        });
    } catch (error: any) {
        console.error('[DIAG] AI Diagnostic Failed:', error);
        return NextResponse.json({
            success: false,
            logs,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
