-- Test Verileri - Koltuk Üretim ERP
-- Bu dosyayı Supabase SQL Editor'de çalıştırarak test verilerini ekleyebilirsiniz

-- ============================================
-- 1. HAMMADDE STOKLARI (Materials/Stocks)
-- ============================================

INSERT INTO stocks (code, name, category, unit, current_quantity, min_quantity, unit_cost) VALUES
('KUM-001', 'Kadife Kumaş - Kırmızı', 'kumaş', 'metre', 100.5, 20, 45.00),
('KUM-002', 'Deri Kumaş - Siyah', 'kumaş', 'metre', 75.0, 15, 120.00),
('KUM-003', 'Keten Kumaş - Bej', 'kumaş', 'metre', 50.0, 10, 35.00),
('SUN-001', 'Yumuşak Sünger', 'sünger', 'adet', 25, 5, 80.00),
('SUN-002', 'Orta Sertlik Sünger', 'sünger', 'adet', 30, 5, 95.00),
('SUN-003', 'Sert Sünger', 'sünger', 'adet', 20, 5, 110.00),
('AYK-001', 'Ahşap Ayak - Klasik', 'ayak', 'adet', 50, 10, 25.00),
('AYK-002', 'Metal Ayak - Modern', 'ayak', 'adet', 40, 10, 35.00),
('AYK-003', 'Plastik Ayak - Minimal', 'ayak', 'adet', 60, 10, 15.00),
('DIG-001', 'Dikiş İpliği', 'diğer', 'metre', 500, 100, 0.50),
('DIG-002', 'Yapıştırıcı', 'diğer', 'kg', 15, 3, 25.00);

-- ============================================
-- 2. ÜRÜNLER (Products - Koltuk Modelleri)
-- ============================================

INSERT INTO products (sku, name, description, category, base_cost, base_price, unit) VALUES
('KOL-001', 'Chester Koltuk', 'Klasik Chester modeli, konforlu ve şık', 'Koltuk', 450.00, 850.00, 'adet'),
('KOL-002', 'Berjer Koltuk', 'Modern berjer modeli, kompakt tasarım', 'Koltuk', 380.00, 720.00, 'adet'),
('KOL-003', 'Kanepe 2+1', '2+1 kanepe seti, geniş aile için', 'Kanepe', 1200.00, 2200.00, 'adet'),
('KOL-004', 'Köşe Koltuk', 'L şeklinde köşe koltuk, büyük oturma alanı', 'Koltuk', 950.00, 1800.00, 'adet'),
('KOL-005', 'Tekli Koltuk', 'Minimalist tekli koltuk, küçük alanlar için', 'Koltuk', 320.00, 600.00, 'adet');

-- ============================================
-- 3. BOM (Bill of Materials) - Ürün Reçeteleri
-- ============================================

-- Chester Koltuk Reçetesi
INSERT INTO bom (product_id, stock_id, quantity, unit) 
SELECT 
    p.id,
    s.id,
    CASE 
        WHEN s.code = 'KUM-001' THEN 8.0  -- 8 metre kumaş
        WHEN s.code = 'SUN-002' THEN 1.0  -- 1 adet sünger
        WHEN s.code = 'AYK-001' THEN 4.0  -- 4 adet ayak
        WHEN s.code = 'DIG-001' THEN 15.0 -- 15 metre iplik
    END,
    s.unit
FROM products p, stocks s
WHERE p.sku = 'KOL-001'
AND s.code IN ('KUM-001', 'SUN-002', 'AYK-001', 'DIG-001');

-- Berjer Koltuk Reçetesi
INSERT INTO bom (product_id, stock_id, quantity, unit)
SELECT 
    p.id,
    s.id,
    CASE 
        WHEN s.code = 'KUM-002' THEN 5.0
        WHEN s.code = 'SUN-001' THEN 1.0
        WHEN s.code = 'AYK-002' THEN 4.0
        WHEN s.code = 'DIG-001' THEN 10.0
    END,
    s.unit
FROM products p, stocks s
WHERE p.sku = 'KOL-002'
AND s.code IN ('KUM-002', 'SUN-001', 'AYK-002', 'DIG-001');

-- Kanepe 2+1 Reçetesi
INSERT INTO bom (product_id, stock_id, quantity, unit)
SELECT 
    p.id,
    s.id,
    CASE 
        WHEN s.code = 'KUM-003' THEN 18.0
        WHEN s.code = 'SUN-002' THEN 3.0
        WHEN s.code = 'AYK-001' THEN 12.0
        WHEN s.code = 'DIG-001' THEN 35.0
    END,
    s.unit
FROM products p, stocks s
WHERE p.sku = 'KOL-003'
AND s.code IN ('KUM-003', 'SUN-002', 'AYK-001', 'DIG-001');

-- Köşe Koltuk Reçetesi
INSERT INTO bom (product_id, stock_id, quantity, unit)
SELECT 
    p.id,
    s.id,
    CASE 
        WHEN s.code = 'KUM-001' THEN 12.0
        WHEN s.code = 'SUN-003' THEN 2.0
        WHEN s.code = 'AYK-002' THEN 6.0
        WHEN s.code = 'DIG-001' THEN 25.0
    END,
    s.unit
FROM products p, stocks s
WHERE p.sku = 'KOL-004'
AND s.code IN ('KUM-001', 'SUN-003', 'AYK-002', 'DIG-001');

-- Tekli Koltuk Reçetesi
INSERT INTO bom (product_id, stock_id, quantity, unit)
SELECT 
    p.id,
    s.id,
    CASE 
        WHEN s.code = 'KUM-002' THEN 4.0
        WHEN s.code = 'SUN-001' THEN 1.0
        WHEN s.code = 'AYK-003' THEN 4.0
        WHEN s.code = 'DIG-001' THEN 8.0
    END,
    s.unit
FROM products p, stocks s
WHERE p.sku = 'KOL-005'
AND s.code IN ('KUM-002', 'SUN-001', 'AYK-003', 'DIG-001');

-- ============================================
-- 4. ÖRNEK ÜRETİM EMİRLERİ (Opsiyonel)
-- ============================================

-- INSERT INTO production_orders (order_number, product_id, quantity, status, start_date)
-- SELECT 
--     'URE-001',
--     p.id,
--     5,
--     'pending',
--     CURRENT_DATE
-- FROM products p
-- WHERE p.sku = 'KOL-001';


