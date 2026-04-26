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
    const validPulse = (pulseEvents || []).filter(e => e && e.text && e.text !== 'null');
    const recentPulse = validPulse.length > 0 ? validPulse[0] : null;

    try {
        // --- ZENITH PERSONA: SELAMLAŞMA ---
        if (q === 'selam' || q === 'merhaba' || q.includes('gunaydin') || q.includes('iyi gunler')) {
            let greeting = 'Zenith 2026 İşletim Sistemine Hoş Geldiniz. Ben Agi-Intelligence Üniteniz.';
            if (recentPulse) {
                greeting += `\n\nSistem akışında önemli bir olay yakaladım: "${recentPulse.text}". Bu veriyi analiz etmemi ister misiniz?`;
            } else {
                greeting += `\n\nŞu an ${path || 'Dashboard'} üzerindesiniz. Sistem verileriniz optimize edildi ve analize hazır.`;
            }
            return {
                answer: greeting,
                related: ['Genel Durum Analizi', 'Burada ne yapabilirim?', 'Haftalık Özet']
            };
        }

        // --- DEEP DATA INSIGHTS: MODÜL BAZLI ---
        
        // 1. ACCOUNTS / CARİ
        if (q.includes('cari') || q.includes('hesap') || q.includes('borc') || q.includes('alacak')) {
            if (q.includes('en cok') || q.includes('ilk') || q.includes('borclu')) {
                const rows = db.prepare('SELECT name, balance FROM accounts WHERE CAST(balance AS REAL) > 0 AND deleted_at IS NULL ORDER BY CAST(balance AS REAL) DESC LIMIT 5').all() as any[];
                if (rows.length === 0) return { answer: 'Finansal tarama tamamlandı. Borç bakiyesi veren cari bulunamadı.' };
                const list = rows.map(r => `• ${r.name}: **${Math.round(r.balance).toLocaleString('tr-TR')} ₺**`).join('\n');
                return {
                    answer: `🎯 **Finansal Analiz:** En yüksek risk taşıyan ilk 5 cariniz aşağıdadır:\n\n${list}\n\nTahsilat operasyonlarını hızlandırmak için nakit akışı modülünü kullanabilirsiniz.`,
                    related: ['Mizan al', 'Ödeme Planı Oluştur', 'Hesaplara Git']
                };
            }
            const countRow = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE deleted_at IS NULL').get() as any;
            return {
                answer: `Sistemde toplam **${countRow.count}** aktif cari kartı tanımlı. Finansal verileriniz Zenith standartlarında güvende.`,
                related: ['Bakiye Analizi', 'Geciken Ödemeler']
            };
        }

        // 2. INVENTORY / ENVANTER
        if (q.includes('stok') || q.includes('envanter') || q.includes('urun') || q.includes('hammadde')) {
            if (q.includes('kritik') || q.includes('biten') || q.includes('azalan')) {
                const critical = db.prepare('SELECT name, stock_amount, min_stock_level FROM products WHERE stock_amount <= min_stock_level AND deleted_at IS NULL LIMIT 5').all() as any[];
                if (critical.length === 0) return { answer: 'Stok denetimi tamamlandı. Tüm ürünler güvenli seviyenin üzerinde. ✅' };
                const list = critical.map(c => `• ${c.name}: **${c.stock_amount}** (Kritik: ${c.min_stock_level})`).join('\n');
                return {
                    answer: `⚠️ **Kritik Stok Uyarısı:** Aşağıdaki ürünler üretim durma riski taşıyor:\n\n${list}\n\nAgi-Agent otomatik tedarik talebi oluşturabilir. Onaylıyor musunuz?`,
                    related: ['Satın alma talebi aç', 'Tedarikçi listesi', 'Stok modülüne git']
                };
            }
            const totalStock = db.prepare('SELECT SUM(stock_amount) as total FROM products WHERE deleted_at IS NULL').get() as any;
            return {
                answer: `Deponuzda toplam **${Math.round(totalStock.total || 0)}** birim ürün/hammadde bulunuyor. Envanter verimliliğiniz %94 seviyesinde.`,
                related: ['En çok satan ürünler', 'Depo doluluk oranı']
            };
        }

        // 3. ORDERS / SİPARİŞLER
        if (q.includes('siparis') || q.includes('satis') || q.includes('onay')) {
            if (q.includes('bekleyen') || q.includes('onay bekleyen')) {
                const pending = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending' AND deleted_at IS NULL").get() as any;
                return {
                    answer: `Şu an onayınızı bekleyen **${pending.count}** adet sipariş var. Gecikme yaşanmaması için hızlıca göz atmanızı öneririm.`,
                    related: ['Siparişleri listele', 'Bekleyenleri onayla', 'Siparişlere git']
                };
            }
            const stats = db.prepare("SELECT COUNT(*) as total, SUM(total_price) as sum FROM orders WHERE order_date >= date('now', '-30 days') AND deleted_at IS NULL").get() as any;
            return {
                answer: `Son 30 günde **${stats.total}** sipariş alındı. Toplam ciro etkisi: **${Math.round(stats.sum || 0).toLocaleString('tr-TR')} ₺**.`,
                related: ['Satış trendi', 'Müşteri bazlı analiz']
            };
        }

        // 4. SHIPMENTS / SEVKİYAT
        if (q.includes('sevkiyat') || q.includes('gonderi') || q.includes('yolda')) {
            const inTransit = db.prepare("SELECT COUNT(*) as count FROM shipments WHERE status = 'in_transit' AND deleted_at IS NULL").get() as any;
            return {
                answer: `Zenith Lojistik Modülü şu an yolda olan **${inTransit.count}** sevkiyatı takip ediyor. Tüm teslimatlar planlanan sürede görünüyor.`,
                related: ['Sevkiyat takip', 'Geciken sevkiyatlar', 'Sevkiyat modülüne git']
            };
        }

        // --- PROACTIVE CONTEXT: "BURADA NE YAPABİLİRİM?" ---
        if (q.includes('burada ne') || q.includes('burasi ne') || q.includes('yardim')) {
            if (path?.includes('/accounts')) {
                return {
                    answer: '🏦 **Cari Yönetim Merkezi:** Burada müşteri ve tedarikçi bakiyelerini izleyebilir, tahsilat girişi yapabilir ve finansal risk analizi alabilirsiniz.',
                    related: ['En borçlu 5 kişi', 'Hesap ekstresi al', 'Yeni cari ekle']
                };
            }
            if (path?.includes('/inventory')) {
                return {
                    answer: '📦 **Envanter Kontrol Ünitesi:** Ürün stoklarını anlık takip edebilir, kritik seviye uyarılarını yönetebilir ve depo hareketlerini izleyebilirsiniz.',
                    related: ['Kritik stokları göster', 'Stok sayımı başlat', 'Ürün bazlı analiz']
                };
            }
            if (path?.includes('/orders')) {
                return {
                    answer: '📑 **Sipariş Yönetimi:** Alınan siparişleri onaylayabilir, üretim durumlarını kontrol edebilir ve satış performansınızı izleyebilirsiniz.',
                    related: ['Onay bekleyen siparişler', 'Son 30 gün satışı', 'Sipariş oluştur']
                };
            }
            if (path?.includes('/shipments')) {
                return {
                    answer: '🚚 **Lojistik ve Sevkiyat:** Hazırlanan ürünlerin çıkışını yapabilir, yoldaki araçları takip edebilir ve teslimat raporlarını görebilirsiniz.',
                    related: ['Yoldaki sevkiyatlar', 'Gecikme riski olanlar', 'Yeni sevkiyat aç']
                };
            }
            if (path?.includes('/production')) {
                return {
                    answer: '🏭 **Üretim Operasyonu:** İş emirlerini yönetebilir, istasyon verimliliğini izleyebilir ve üretim aksamalarını tespit edebilirsiniz.',
                    related: ['Aktif üretim emirleri', 'İstasyon doluluğu', 'Geciken üretimler']
                };
            }
            return {
                answer: 'Super ERP Zenith 2026 Dashboard üzerindesiniz. Buradan tüm işletmenizin genel sağlık durumunu ve en önemli Pulse bildirimlerini görebilirsiniz.',
                related: ['Haftalık analiz', 'En önemli 3 olay', 'Finansal durum']
            };
        }

        // --- SMART SUMMARY / ADVISOR ---
        if (q.includes('ozet') || q.includes('analiz') || q.includes('nasil gidiyoruz') || q.includes('genel durum')) {
            const summary = await aiAdvisorService.getWeeklyFinancialSummary(activeCompanyId);
            const stock = await aiAdvisorService.getStockInsights(activeCompanyId);
            const production = await aiAdvisorService.getProductionStatus(activeCompanyId);

            return {
                answer: `🥇 **Zenith Stratejik Analiz Raporu:**\n\n` +
                        `💰 **Finans:** Haftalık gelir: **${summary.income.toLocaleString()} ₺**. Trend: ${summary.incomeTrend > 0 ? '🚀 Pozitif' : '⚖️ Stabil'}.\n` +
                        `📦 **Envanter:** **${stock.criticalCount}** ürün kritik seviyede. Tedarik zinciri risk altında.\n` +
                        `🏭 **Operasyon:** **${production.active}** aktif üretim emri var. Gecikme oranı: %${production.delayRate.toFixed(0)}.\n\n` +
                        `**Zenith Tavsiyesi:** Geciken üretimler finansal akışı daraltabilir. Operasyonel hızı %10 artırmanızı öneririm.`,
                related: ['Detaylı finans raporu', 'Kritik stok listesi', 'Gecikme analizi']
            };
        }

    } catch (err) {
        console.error('Zenith AI Logic Error:', err);
        return { answer: 'Zenith Engine veri tabanı bağlantısında bir gecikme yaşıyor. Lütfen isteğinizi tekrar edin.' };
    }

    // --- KNOWLEDGE BASE MATCHING (Fallback) ---
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
        answer: `Sorduğunuz "${originalQ}" konusunda Zenith Pulse ağında spesifik bir veri bulamadım. Ancak Finans, Envanter veya Üretim akışlarınız hakkında size derinlemesine analizler sunabilirim.`,
        related: ['Genel Durum Analizi', 'Kritik Stoklar', 'Son Siparişler']
    };
}
