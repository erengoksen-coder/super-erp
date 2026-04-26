import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/db';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

export const dynamic = 'force-dynamic';

// Bayilere özel ürün kataloğu uç noktası
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const db = getDatabase();

        // Bayiye ait cari kartı (Account) bulalım
        const userInfo = db.prepare('SELECT dealer_name FROM users WHERE id = ?').get(user.userId) as any;
        let discountRate = 0;
        let accountId = '';

        if (userInfo && userInfo.dealer_name) {
            const account = db.prepare('SELECT id, discount_rate FROM accounts WHERE name = ? COLLATE NOCASE').get(userInfo.dealer_name) as any;
            if (account) {
                accountId = account.id;
                discountRate = account.discount_rate || 0;
            }
        }

        // Ürünleri çek - BOM maliyetlerini en güncel versiyona göre hesapla
        let products: any[] = []
        const purchasedOnly = request.nextUrl.searchParams.get('purchasedOnly') === 'true';

        try {
            let sql = `
                SELECT p.*, 
                (SELECT SUM(m.unit_price * (b.quantity_required * (1 + (COALESCE(b.waste_percentage, 0) / 100.0)))) 
                 FROM bom b 
                 JOIN materials m ON m.id = b.material_id 
                 WHERE b.product_id = p.id AND b.deleted_at IS NULL) as bom_material_cost
                FROM products p 
            `;

            const params: any[] = [];

            if (purchasedOnly && accountId) {
                sql += `
                    INNER JOIN shipment_items si ON p.id = si.product_id 
                    INNER JOIN shipments s ON si.shipment_id = s.id 
                    WHERE s.customer_id = ? AND p.deleted_at IS NULL
                    GROUP BY p.id
                `;
                params.push(accountId);
            } else {
                sql += ` WHERE p.deleted_at IS NULL `;
            }

            sql += ` ORDER BY p.name `;

            products = db.prepare(sql).all(...params) as any[];
        } catch (e: any) {
            console.error('[Catalog API] Fetch error:', e);
            products = db.prepare('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY name').all() as any[];
        }

        const catalog = products.map(p => {
            // Kullanıcı isteği: Fiyat kısmına BOM'daki fiyatı getir.
            // Önce BOM maliyetini kontrol et, yoksa selling_price veya piyasa fiyatını kullan.
            let basePrice = p.bom_material_cost || p.selling_price || p.price || 0;

            // Özel bir bayi fiyatı zaten girildiyse (B2B Katalog'dan), o kullanılır
            // Girilmediyse Carideki iskonto uygulanır. Caride yoksa varsayılan iskonto %0 veya bayi özel %15 kalır.
            let dealerPrice = p.dealer_price || 0;
            if (!dealerPrice || dealerPrice <= 0) {
                if (discountRate > 0) {
                    dealerPrice = basePrice * (1 - (discountRate / 100));
                } else {
                    dealerPrice = basePrice;
                }
            }

            // Eğer resim set edilmemişse placeholder kullan
            const safeName = p.name ? p.name.substring(0, 15) : 'Urun';
            const imageUrl = p.image_url || `https://placehold.co/400x300/1f2937/a3e635?text=${encodeURIComponent(safeName)}`;

            return {
                ...p,
                base_price: basePrice,
                dealer_price: dealerPrice,
                image_url: imageUrl
            };
        });

        return NextResponse.json({ success: true, data: catalog });
    } catch (error: any) {
        console.error('[Catalog API] Global error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
