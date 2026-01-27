-- ============================================
-- KOLTUK ÜRETİM ERP - İLİŞKİSEL VERİTABANI ŞEMASI
-- Supabase SQL Editor'e yapıştırıp çalıştırın
-- ============================================

-- UUID extension'ı aktif et
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MATERIALS (Hammaddeler) Tablosu
-- ============================================

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- 'metre', 'adet', 'kg', 'm²'
    stock_amount DECIMAL(12, 3) DEFAULT 0,
    min_stock_level DECIMAL(12, 3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials için indeks
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);

-- ============================================
-- 2. PRODUCTS (Bitmiş Ürünler) Tablosu
-- ============================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products için indeks
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ============================================
-- 3. BOM (Bill of Materials - Ürün Reçetesi) Tablosu
-- ============================================

CREATE TABLE IF NOT EXISTS bom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    material_id UUID NOT NULL,
    quantity_required DECIMAL(12, 3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key İlişkileri
    CONSTRAINT fk_bom_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_bom_material 
        FOREIGN KEY (material_id) 
        REFERENCES materials(id) 
        ON DELETE CASCADE,
    
    -- Aynı ürün için aynı hammadde sadece bir kez olabilir
    CONSTRAINT unique_product_material 
        UNIQUE(product_id, material_id)
);

-- BOM için indeksler
CREATE INDEX IF NOT EXISTS idx_bom_product_id ON bom(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_material_id ON bom(material_id);

-- ============================================
-- 4. PRODUCTION_ORDERS (Üretim Emirleri) Tablosu
-- ============================================

CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key İlişkisi
    CONSTRAINT fk_production_order_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE RESTRICT
);

-- Production Orders için indeksler
CREATE INDEX IF NOT EXISTS idx_production_orders_product_id ON production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_created_at ON production_orders(created_at DESC);

-- ============================================
-- 5. STOCK_MOVEMENTS (Stok Hareketleri) Tablosu
-- ============================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity DECIMAL(12, 3) NOT NULL,
    reference_type VARCHAR(50), -- 'production', 'purchase', 'sale'
    reference_id UUID, -- İlgili kaydın ID'si
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key İlişkisi
    CONSTRAINT fk_stock_movement_material 
        FOREIGN KEY (material_id) 
        REFERENCES materials(id) 
        ON DELETE RESTRICT
);

-- Stock Movements için indeksler
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_id ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ============================================
-- 6. TRİGGER'LAR - Otomatik Güncellemeler
-- ============================================

-- Updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Her tablo için updated_at trigger'ı
CREATE TRIGGER trigger_materials_updated_at 
    BEFORE UPDATE ON materials 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_bom_updated_at 
    BEFORE UPDATE ON bom 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_production_orders_updated_at 
    BEFORE UPDATE ON production_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Stok hareketi sonrası otomatik stok güncelleme
CREATE OR REPLACE FUNCTION update_material_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock DECIMAL(12, 3);
BEGIN
    -- Mevcut stok miktarını al
    SELECT stock_amount INTO current_stock
    FROM materials
    WHERE id = NEW.material_id;

    IF NEW.movement_type = 'in' THEN
        -- Stok girişi: Artır
        UPDATE materials
        SET stock_amount = stock_amount + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.material_id;
        
    ELSIF NEW.movement_type = 'out' THEN
        -- Stok çıkışı: Düşür, ama eksiye düşmesin
        IF current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Stok yetersiz! Hammadde ID: %, Mevcut: %, Gereken: %', 
                NEW.material_id, current_stock, NEW.quantity;
        END IF;
        
        UPDATE materials
        SET stock_amount = stock_amount - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.material_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stok hareketi trigger'ı
CREATE TRIGGER trigger_update_material_stock
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_material_stock();

-- ============================================
-- 7. VIEW'LAR - Kolay Sorgular
-- ============================================

-- Ürün reçetesi görünümü (ürün + hammaddeler + stok durumu)
CREATE OR REPLACE VIEW product_bom_view AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name as product_name,
    m.id as material_id,
    m.name as material_name,
    m.unit as material_unit,
    b.quantity_required,
    m.stock_amount as available_stock,
    m.min_stock_level,
    CASE 
        WHEN m.stock_amount >= b.quantity_required THEN true 
        ELSE false 
    END as is_available
FROM products p
JOIN bom b ON p.id = b.product_id
JOIN materials m ON b.material_id = m.id;

-- Üretim emri detay görünümü
CREATE OR REPLACE VIEW production_order_details AS
SELECT 
    po.id as order_id,
    po.quantity as order_quantity,
    po.status,
    po.created_at,
    p.id as product_id,
    p.sku,
    p.name as product_name,
    p.price
FROM production_orders po
JOIN products p ON po.product_id = p.id;

-- ============================================
-- 8. ÖRNEK VERİLER (Test için)
-- ============================================

-- Hammaddeler
INSERT INTO materials (name, unit, stock_amount, min_stock_level) VALUES
('Kadife Kumaş', 'metre', 100.5, 20),
('Deri Kumaş', 'metre', 75.0, 15),
('Yumuşak Sünger', 'adet', 25, 5),
('Orta Sertlik Sünger', 'adet', 30, 5),
('Ahşap Ayak', 'adet', 50, 10),
('Metal Ayak', 'adet', 40, 10)
ON CONFLICT DO NOTHING;

-- Ürünler
INSERT INTO products (name, sku, price) VALUES
('Chester Koltuk', 'KOL-001', 850.00),
('Berjer Koltuk', 'KOL-002', 720.00),
('Kanepe 2+1', 'KOL-003', 2200.00)
ON CONFLICT (sku) DO NOTHING;

-- BOM Reçeteleri (Chester Koltuk için)
INSERT INTO bom (product_id, material_id, quantity_required)
SELECT 
    p.id,
    m.id,
    CASE 
        WHEN m.name = 'Kadife Kumaş' THEN 8.0
        WHEN m.name = 'Orta Sertlik Sünger' THEN 1.0
        WHEN m.name = 'Ahşap Ayak' THEN 4.0
    END
FROM products p, materials m
WHERE p.sku = 'KOL-001'
AND m.name IN ('Kadife Kumaş', 'Orta Sertlik Sünger', 'Ahşap Ayak')
ON CONFLICT (product_id, material_id) DO NOTHING;

-- BOM Reçeteleri (Berjer Koltuk için)
INSERT INTO bom (product_id, material_id, quantity_required)
SELECT 
    p.id,
    m.id,
    CASE 
        WHEN m.name = 'Deri Kumaş' THEN 5.0
        WHEN m.name = 'Yumuşak Sünger' THEN 1.0
        WHEN m.name = 'Metal Ayak' THEN 4.0
    END
FROM products p, materials m
WHERE p.sku = 'KOL-002'
AND m.name IN ('Deri Kumaş', 'Yumuşak Sünger', 'Metal Ayak')
ON CONFLICT (product_id, material_id) DO NOTHING;

-- ============================================
-- 9. YARDIMCI FONKSİYONLAR
-- ============================================

-- Üretim için stok kontrolü fonksiyonu
CREATE OR REPLACE FUNCTION check_production_stock(
    p_product_id UUID,
    p_quantity INTEGER
)
RETURNS TABLE (
    material_name VARCHAR,
    required DECIMAL,
    available DECIMAL,
    is_sufficient BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.name,
        b.quantity_required * p_quantity as required,
        m.stock_amount as available,
        (m.stock_amount >= b.quantity_required * p_quantity) as is_sufficient
    FROM bom b
    JOIN materials m ON b.material_id = m.id
    WHERE b.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ŞEMA OLUŞTURMA TAMAMLANDI
-- ============================================

-- Tabloları kontrol et
SELECT 
    'materials' as table_name, 
    COUNT(*) as row_count 
FROM materials
UNION ALL
SELECT 
    'products', 
    COUNT(*) 
FROM products
UNION ALL
SELECT 
    'bom', 
    COUNT(*) 
FROM bom
UNION ALL
SELECT 
    'production_orders', 
    COUNT(*) 
FROM production_orders;


