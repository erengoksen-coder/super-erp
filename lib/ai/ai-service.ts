import { knowledgeBase, KnowledgeItem } from './knowledge-base';
import { getDatabase } from '@/lib/database/db';
import { aiAdvisorService } from '@/lib/services/ai-advisor-service';

/**
 * Metni normalleştirir (Türkçe karakterleri dönüştürür, boşlukları temizler)
 */
function normalize(text: string | null | undefined): string {
    if (!text) return '';
    return text.toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .trim();
}

/**
 * Furki AI - Zeki Soru-Cevap Servisi
 * Agi-OS Platinum Phase 3: Contextual Agi-Operator
 */
export async function askAI(query: string, companyId?: string, path?: string, pulseEvents?: any[]): Promise<{ 
    answer: string; 
    related?: string[];
    action?: { type: 'navigate' | 'modal'; path: string }
}> {
    const originalQ = query;
    const q = normalize(query);
    const db = getDatabase();
    const fallbackCompanyId = 'default_company';
    const activeCompanyId = companyId || fallbackCompanyId;

    // Agi-Operator: Recognize recent system events from the Pulse stream
    // Ensure we don't process "null" as a valid text
    const validPulse = (pulseEvents || []).filter(e => e && e.text && e.text !== 'null');
    const recentPulse = validPulse.length > 0 ? validPulse[0] : null;

    try {
        // --- SELAMLAŞMA VE TEŞEKKÜR ---
        if (q === 'selam' || q === 'merhaba' || q.includes('gunaydin') || q.includes('iyi gunler')) {
            let greeting = 'Merhaba! Ben Furki G2.';
            if (recentPulse) {
                greeting += ` Canlı akışı takip ediyorum: "${recentPulse.text}" olayını az önce kaydettim. Bu konuda yardımcı olabilir miyim?`;
            } else {
                greeting += ' Bulunduğunuz sayfayı görüyor ve akışı takip ediyorum. Bugün size nasıl yardımcı olabilirim?';
            }
            return {
                answer: greeting,
                related: ['Neler oldu?', 'Burası ne işe yarar?', 'Özet geç']
            };
        }

        if (q.includes('tesekkur') || q.includes('sagol')) {
            return {
                answer: 'Rica ederim! Agi-OS Platinum ile her zaman bir adım öndeyiz. Başka bir sorunuz olursa buradayım.',
                related: ['Analiz yap', 'Sistem Pulse']
            };
        }

        // --- AGI-OPERATOR: PULSE SORGULARI ---
        if (q.includes('pulse') || q.includes('neler oldu') || q.includes('son durum')) {
            if (validPulse.length > 0) {
                const eventsList = validPulse.slice(0, 3).map(e => `• ${e.text} (${e.time})`).join('\n');
                return {
                    answer: `Sistem akışındaki son olaylar şunlar:\n\n${eventsList}\n\nBunlarla ilgili bir aksiyon almamı ister misiniz?`,
                    related: ['Hepsini onayla', 'Haftalık Analiz', 'Detay ver']
                };
            }
            return { answer: 'Sistem şu an sakin görünüyor, yeni bir pulse kaydı bulunmamaktadır.' };
        }

        // --- DİNAMİK VERİ SORGULARI ---
        if ((q.includes('kac') || q.includes('sayisi')) && (q.includes('cari') || q.includes('hesap') || q.includes('musteri'))) {
            const row = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE deleted_at IS NULL').get() as any;
            return {
                answer: `Sisteme kayıtlı toplam ${row.count} adet aktif cari kartı bulunmaktadır.`,
                related: ['En borçlu müşteriler kimler?', 'Cari modülüne git']
            };
        }

        if (q.includes('en borclu') || q.includes('kimlerin borcu var')) {
            const rows = db.prepare('SELECT name, balance FROM accounts WHERE CAST(balance AS REAL) > 0 AND deleted_at IS NULL ORDER BY CAST(balance AS REAL) DESC LIMIT 5').all() as any[];
            if (rows.length === 0) return { answer: 'Borçlu cari bulunamadı.' };
            const list = rows.map(r => `• ${r.name}: ${Math.round(r.balance).toLocaleString('tr-TR')} ₺`).join('\n');
            return {
                answer: `En çok borcu olan ilk 5 cariniz:\n\n${list}`,
                related: ['Ödeme ve Tahsilat', 'Mizan al']
            };
        }

        if (q.includes('geciken') || q.includes('problem') || q.includes('aksama')) {
            const delayedProduction = db.prepare("SELECT COUNT(*) as count FROM production_orders WHERE status = 'delayed' AND deleted_at IS NULL").get() as any;
            const delayedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending' AND created_at < datetime('now', '-7 days') AND deleted_at IS NULL").get() as any;
            
            if (delayedProduction.count > 0 || delayedOrders.count > 0) {
                return {
                    answer: `Dikkat! Agi-Analiz ${delayedProduction.count} geciken üretim ve ${delayedOrders.count} onay bekleyen eski sipariş tespit etti.`,
                    related: ['Üretim detayları', 'Onay sayfasına git']
                };
            }
            return { answer: 'Her şey yolunda, operasyonel bir aksama tespit etmedim.' };
        }

        // --- AI ADVISOR ENTEGRASYONU ---
        if (q.includes('ozet') || q.includes('analiz') || q.includes('nasil gidiyoruz')) {
            const summary = await aiAdvisorService.getWeeklyFinancialSummary(activeCompanyId);
            const stock = await aiAdvisorService.getStockInsights(activeCompanyId);
            const production = await aiAdvisorService.getProductionStatus(activeCompanyId);

            return {
                answer: `🥇 **Agi-Platinum Analiz Raporu:**\n\n` +
                        `💰 **Finans:** Bu hafta ${summary.income.toLocaleString()} ₺ gelir kaydedildi. Trend ${summary.incomeTrend > 0 ? 'yukarı yönlü' : 'stabil'}.\n` +
                        `📦 **Stok:** ${stock.criticalCount} hammadde kritik seviyede. Agi-Agent otomatik taleplerini kontrol etmenizi öneririm.\n` +
                        `🏭 **Üretim:** Atölyede ${production.active} iş emri aktif. Gecikme oranı: %${((production.delayed / (production.active ||1)) * 100).toFixed(0)}.\n\n` +
                        `Profesyonel Tavsiye: Nakit akışını korumak için tahsilatları hızlandırmalısınız.`,
                related: ['Tavsiye ver', 'Kritik stoklar']
            };
        }

        // --- BAĞLAM (PATH) BAZLI YÖNLENDİRMELER ---
        if (q.includes('burada ne') || q.includes('burasi ne')) {
            if (path?.includes('/accounts')) return { answer: 'Finansal yönetim merkezindesiniz.', related: ['En borçlu müşteriler', 'Tahsilat gir'] };
            if (path?.includes('/production')) return { answer: 'Üretim takip ekranındasınız.', related: ['Aktif üretimler', 'İstasyon verimliği'] };
        }

    } catch (err) {
        console.error('Furki AI Logic Error:', err);
        return { answer: 'Üzgünüm, şu an zihnimi toparlayamıyorum (Teknik Hata). Lütfen biraz sonra tekrar deneyin.' };
    }

    // --- KNOWLEDGE BASE MATCHING ---
    let bestMatch: KnowledgeItem | null = null;
    let maxMatches = 0;
    for (const item of knowledgeBase) {
        let matches = 0;
        for (const kw of item.keywords) {
            if (q.includes(normalize(kw))) matches++;
        }
        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = item;
        }
    }

    if (bestMatch && maxMatches > 0) {
        return { answer: bestMatch.answer, related: knowledgeBase.filter(i => i.category === bestMatch?.category).slice(0, 3).map(i => i.title) };
    }

    return {
        answer: `Sorduğunuz "${originalQ}" konusunda Agi-Pulse verilerini kontrol ettim. Genel bir eşleşme bulamadım ama size stok veya finans hakkında özet verebilirim.`,
        related: ['Haftalık Özet', 'Cari Bakiyeleri']
    };
}
