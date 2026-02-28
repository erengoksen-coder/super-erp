import { knowledgeBase, KnowledgeItem } from './knowledge-base';
import { getDatabase } from '@/lib/database/db';

/**
 * Metni normalleştirir (Türkçe karakterleri dönüştürür, boşlukları temizler)
 */
function normalize(text: string): string {
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
 */
export async function askAI(query: string): Promise<{ answer: string; related?: string[] }> {
    const originalQ = query;
    const q = normalize(query);
    const db = getDatabase();

    try {
        // --- SELAMLAŞMA VE TEŞEKKÜR ---
        if (q === 'selam' || q === 'merhaba' || q.includes('gunaydin') || q.includes('iyi gunler')) {
            return {
                answer: 'Merhaba! Ben Furki. Super ERP asistanıyım. Bugün size nasıl yardımcı olabilirim? Sistem verilerini sorabilir veya kullanım hakkında bilgi isteyebilirsiniz.',
                related: ['Kaç ürün var?', 'Sipariş nasıl girilir?', 'Üretim durumu nedir?']
            };
        }

        if (q.includes('tesekkur') || q.includes('sagol') || q.includes('eyvallah') || q.includes('tesekkur ederim')) {
            return {
                answer: 'Rica ederim! Her zaman buradayım. Başka bir sorunuz olursa çekinmeden sorabilirsiniz. İyi çalışmalar dilerim!',
                related: ['Başka ne sorabilirim?', 'Sistem Durumu']
            };
        }

        // --- DİNAMİK VERİ SORGULARI (Veritabanından Canlı) ---

        // 1. CARİ / HESAP / MÜŞTERİ SAYISI VE DETAYI
        if ((q.includes('kac') || q.includes('sayisi')) && (q.includes('cari') || q.includes('hesap') || q.includes('musteri'))) {
            const row = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as any;
            return {
                answer: `Sisteme kayıtlı toplam ${row.count} adet cari (müşteri/tedarikçi) kartı bulunmaktadır. Detaylar için Finans modülüne göz atabilirsiniz.`,
                related: ['En borçlu müşteriler kimler?', 'Cari Hesap Yönetimi']
            };
        }

        // 2. EN BORÇLU MÜŞTERİLER (TOP 5)
        if (q.includes('en borclu') || q.includes('borcu en cok') || q.includes('kimlerin borcu var')) {
            const rows = db.prepare('SELECT name, balance FROM accounts WHERE CAST(balance AS REAL) > 0 ORDER BY CAST(balance AS REAL) DESC LIMIT 5').all() as any[];
            if (rows.length === 0) return { answer: 'Şu an sistemde borcu olan herhangi bir cari kayıt bulunamadı. Harika!' };

            const list = rows.map(r => `• ${r.name}: ${Math.round(r.balance).toLocaleString('tr-TR')} ₺`).join('\n');
            return {
                answer: `En çok borcu olan ilk 5 cari hesabınız şunlardır:\n\n${list}\n\nDetaylı takip için Müşteri Ekstresi alabilirsiniz.`,
                related: ['Ödeme ve Tahsilat', 'Cari Bakiyeleri']
            };
        }

        // 3. ÜRÜN / MALZEME / STOK SAYISI
        if (q.includes('kac') && (q.includes('urun') || q.includes('malzeme') || q.includes('stok'))) {
            const pCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE deleted_at IS NULL').get() as any;
            const mCount = db.prepare('SELECT COUNT(*) as count FROM materials WHERE deleted_at IS NULL').get() as any;
            return {
                answer: `Sistemde aktif ${pCount.count} adet mamul ürün ve ${mCount.count} hammadde/malzeme kaydı var. Stok seviyelerini Envanter modülünden takip edebilirsiniz.`,
                related: ['Kritik Stok Takibi', 'Stok Sayımı']
            };
        }

        // 4. SİPARİŞ VE SATIŞ DURUMU
        if ((q.includes('kac') || q.includes('siparis') || q.includes('satis')) && (q.includes('siparis') || q.includes('satis') || q.includes('bekleyen'))) {
            const row = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
            const pending = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get() as any;
            return {
                answer: `Sistemde toplam ${row.count} sipariş kayıtlı, bunlardan ${pending.count} tanesi onay bekliyor. Toplam satış hacmi giderek artıyor!`,
                related: ['Yeni Sipariş Girişi', 'Sevkiyat Takibi']
            };
        }

        // 5. ÜRETİM / İŞ EMRİ DURUMU
        if (q.includes('uretim') || q.includes('is emri') || q.includes('calisiyor')) {
            const active = db.prepare("SELECT COUNT(*) as count FROM production_orders WHERE status NOT IN ('completed', 'cancelled')").get() as any;
            return {
                answer: `Şu an atölyelerde aktif ${active.count} adet iş emri işlem görüyor. Üretim bandı aktif ve hızlı bir şekilde devam ediyor.`,
                related: ['Üretim Planlama', 'BOM Nedir?']
            };
        }
    } catch (err) {
        console.error('Furki DB Query Error:', err);
        return {
            answer: 'Veritabanı sorgusu sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin veya sistem yöneticinizle iletişime geçin.',
            related: ['Sistem Durumu', 'Destek']
        };
    }

    // --- STATİK BİLGİ BANKASI EŞLEŞMESİ (Normalleştirilmiş Anahtar Kelimelerle) ---

    let bestMatch: KnowledgeItem | null = null;
    let maxMatches = 0;

    for (const item of knowledgeBase) {
        let matches = 0;
        for (const kw of item.keywords) {
            const normalizedKw = normalize(kw);
            if (q.includes(normalizedKw)) {
                matches++;
            }
        }

        if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = item;
        }
    }

    if (bestMatch && maxMatches > 0) {
        const related = knowledgeBase
            .filter(item => item.category === bestMatch?.category && item.title !== bestMatch?.title)
            .map(item => item.title)
            .slice(0, 3);

        return {
            answer: bestMatch.answer,
            related
        };
    }

    // --- SON ÇARE: JOKER CEVAP ---
    if (q.length > 2) {
        return {
            answer: `Sorduğunuz "${originalQ}" sorusu hakkında veritabanında doğrudan bir eşleşme bulamadım ama size genel ERP süreçleri, stok veya üretim hakkında bilgi verebilirim.`,
            related: ['Nasıl Kullanılır?', 'Sipariş Nasıl Girilir?', 'Üretim Planlama']
        };
    }

    return {
        answer: 'Merhaba! Ben Furki. Super ERP asistanıyım. Bana sistemdeki verileri veya kullanım detaylarını sorabilirsiniz.',
        related: ['Super ERP Nedir?', 'Başlangıç Rehberi']
    };
}
