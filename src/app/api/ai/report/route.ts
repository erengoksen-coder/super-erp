import { NextRequest, NextResponse } from 'next/server';
import { aiAdvisorService } from '@/lib/services/ai-advisor-service';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

/**
 * AI Performance Report API
 * Haftalık tam sistem değerlendirmesi
 */
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const finance = await aiAdvisorService.getWeeklyFinancialSummary(user.companyId);
        const stock = await aiAdvisorService.getStockInsights(user.companyId);
        const production = await aiAdvisorService.getProductionStatus(user.companyId);

        // Markdown formatında rapor üretimi (İleride PDF/Excel'e dönüştürülebilir)
        const report = {
            title: "Super ERP Haftalık Performans Raporu",
            period: new Date().toLocaleDateString('tr-TR'),
            sections: [
                {
                    header: "Finansal Durum",
                    content: `Bu hafta toplam **${finance.income.toLocaleString()} ₺** gelir ve **${finance.expense.toLocaleString()} ₺** gider kaydedildi. Toplam net kâr/zarar durumunuz: **${finance.netProfit.toLocaleString()} ₺**. Gelirler geçen haftaya göre **%${finance.incomeTrend.toFixed(1)}** ${finance.incomeTrend >= 0 ? 'artış' : 'azalış'} gösterdi.`
                },
                {
                    header: "Stok ve Envanter",
                    content: `Şu an depoda **${stock.criticalCount}** kalem ürün kritik seviyenin altında. En çok satan ürününüz: **${stock.topSellers[0]?.name || '-'}**. ${stock.criticalCount > 0 ? 'Kritik stoklar için acil tedarik planlanması önerilir.' : 'Stok seviyeleriniz güvenli bölgede.'}`
                },
                {
                    header: "Üretim Verimliliği",
                    content: `Atölye şu an **${production.active}** aktif iş emriyle çalışıyor. Gecikme oranı: **%${production.delayRate.toFixed(1)}**. ${production.delayed > 0 ? `Toplam **${production.delayed}** iş emri takvimin gerisinde kalmış durumda.` : 'Tüm üretim süreçleri zamanında ilerliyor.'}`
                }
            ],
            footer: "Bu rapor Furki AI Advisor tarafından otomatik olarak oluşturulmuştur."
        };

        return NextResponse.json({
            success: true,
            data: report
        });
    } catch (error: any) {
        console.error('[AI Report API] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
