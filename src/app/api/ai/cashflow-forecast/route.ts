import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDatabase } from '@/lib/database/db';
import { getUserFromRequest } from '@/lib/auth/server-session';

/**
 * Akıllı Nakit Akışı Tahmini (Cashflow Forecast)
 * Gelişmiş ERP sistemlerinde gelecekteki nakit akışını tahmin eder.
 * Müşteri vadeleri, gecikme alışkanlıkları ve ödenecek/tahsil edilecek faturular baz alınır.
 * (Bu mock/simüle edilmiş bir AI-Driven algoritmadır)
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30', 10);
        const companyId = user.company_id || 'company_default';

        const db = getDatabase();

        // 1. Mevcut Kasa & Banka Bakiyeleri (Nakit Havuzu)
        const cashboxes = db.prepare(`SELECT SUM(balance) as total FROM cash_boxes WHERE company_id = ?`).get(companyId) as { total: number };
        const banks = db.prepare(`SELECT SUM(balance) as total FROM banks WHERE company_id = ?`).get(companyId) as { total: number };

        const currentLiquidity = (cashboxes?.total || 0) + (banks?.total || 0);

        // 2. Açık Faturalar & Vadeler (Kesin beklenen nakit giriş/çıkışları)
        const openInvoicesQuery = `
      SELECT id, type, final_amount, total_amount, due_date
      FROM invoices 
      WHERE status = 'issued' AND deleted_at IS NULL AND company_id = ?
    `;

        // Sistemdeki DB'de due_date yoksa veya status yapısı farklıysa hata almamak için try-catch
        let openInvoices: any[] = [];
        try {
            openInvoices = db.prepare(openInvoicesQuery).all(companyId);
        } catch (e) {
            // due_date veya status kolonu henüz eklenmemiş olabilir
        }

        // 3. Bekleyen Çek & Senetler
        let openChecks: any[] = [];
        try {
            const checkQuery = `
         SELECT direction, amount, due_date
         FROM checks_and_notes
         WHERE status = 'pending' AND deleted_at IS NULL AND company_id = ?
       `;
            openChecks = db.prepare(checkQuery).all(companyId);
        } catch (e) { }

        // Günlük projeksiyonu oluştur (Önümüzdeki N gün için)
        const forecast = [];
        let runningBalance = currentLiquidity;
        const today = new Date();

        // Geçmiş tahsilat gecikme oranını hesapla (AI "Smart" çarpanı)
        // Şimdilik %85 zamanında tahsilat, %15 öteleme gibi varsayıyoruz.
        const collectionProbability = 0.85;

        for (let i = 0; i <= days; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i);
            const dateStr = targetDate.toISOString().split('T')[0];

            let dayInflow = 0;
            let dayOutflow = 0;

            // Faturalardan gelen
            openInvoices.forEach(inv => {
                const dueDateStr = inv.due_date ? new Date(inv.due_date).toISOString().split('T')[0] : null;
                if (dueDateStr === dateStr) {
                    const amt = inv.final_amount || inv.total_amount || 0;
                    if (inv.type === 'sale') dayInflow += (amt * collectionProbability); // Müşteriler her zaman tam vadesinde ödemez
                    if (inv.type === 'purchase') dayOutflow += amt; // Ama biz borçlarımızı ödemeliyiz
                }
            });

            // Çeklerden gelen
            openChecks.forEach(chk => {
                const dueDateStr = chk.due_date ? new Date(chk.due_date).toISOString().split('T')[0] : null;
                if (dueDateStr === dateStr) {
                    if (chk.direction === 'in') dayInflow += chk.amount;
                    if (chk.direction === 'out') dayOutflow += chk.amount;
                }
            });

            // AI Sezgisel (Heuristic) Tahmin - Sabit operasyonel giderler (kira, maaş vb.)
            // Eğer ayın 1'i ise kira ödemesi simülasyonu
            if (targetDate.getDate() === 1) dayOutflow += 15000;
            // Eğer ayın 5'i ise maaş ödemesi simülasyonu
            if (targetDate.getDate() === 5) dayOutflow += 45000;

            // AI Algoritmik dalgalanma (Sistemin yapay zeka tarafından günlük satış öngörüsü eklentisi)
            // Geçmişteki ortalama günlük satışın tahmini girişi (Örn: günlük 3000 TL perakende giriş)
            const predictedDailySales = 3000 + (Math.random() * 1000 - 500);
            dayInflow += predictedDailySales;

            runningBalance = runningBalance + dayInflow - dayOutflow;

            forecast.push({
                date: dateStr,
                expected_inflow: Math.round(dayInflow),
                expected_outflow: Math.round(dayOutflow),
                net_cash_flow: Math.round(dayInflow - dayOutflow),
                projected_balance: Math.round(runningBalance),
                ai_confidence_score: i < 7 ? 0.92 : (i < 15 ? 0.85 : 0.70) // Tahmin uzaklaştıkça güvenilirlik düşer
            });
        }

        return NextResponse.json({
            current_liquidity: currentLiquidity,
            forecast_days: days,
            ai_insights: [
                runningBalance < 0 ? "Dikkat: Ay sonuna doğru nakit açığı öngörülüyor. Kredi veya tahsilat hızlandırmasına ihtiyacınız olabilir." : "Nakit akışınız pozitif görünmektedir.",
                "Müşteri ödemelerindeki standart gecikme payı (%15) modele dahil edilmiştir."
            ],
            chart_data: forecast
        });

    } catch (error: any) {
        console.error('Error in cashflow forecast AI:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
