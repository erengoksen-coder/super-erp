import { NextRequest, NextResponse } from 'next/server';
import { aiAdvisorService } from '@/lib/services/ai-advisor-service';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

/**
 * AI Dashboard Insights API
 */
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const insights = await aiAdvisorService.generateDailyInsights(user.companyId);
        const stats = await aiAdvisorService.getWeeklyFinancialSummary(user.companyId);

        return NextResponse.json({
            success: true,
            data: {
                insights,
                stats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('[AI Insights API] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
