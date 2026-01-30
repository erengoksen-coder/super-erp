-- ============================================
-- HIZLI BAŞLANGIÇ - Supabase SQL Editor'e Yapıştır
-- ============================================
-- Bu dosyayı Supabase SQL Editor'de çalıştırarak
-- tüm tabloları, ilişkileri ve örnek verileri oluşturabilirsiniz
-- ============================================

-- UUID extension'ı aktif et
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. MATERIALS (Hammaddeler)
-- ============================================

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    stock_amount DECIMAL(12, 3) DEFAULT 0,
    min_stock_level DECIMAL(12, 3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. PRODUCTS (Bitmiş Ürünler)
-- ============================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. BOM (Ürün Reçetesi)
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
    
    -- Aynı ürün için aynı hammadde sadece bir kez
    UNIQUE(product_id, material_id)
);

-- ============================================
-- 4. PRODUCTION_ORDERS (Üretim Emirleri)
-- ============================================

CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key İlişkisi
    CONSTRAINT fk_production_order_product 
        FOREIGN KEY (product_id) 
        REFERENCES products(id) 
        ON DELETE RESTRICT
);

-- ============================================
-- 5. STOCK_MOVEMENTS (Stok Hareketleri)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(12, 3) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key İlişkisi
    CONSTRAINT fk_stock_movement_material 
        FOREIGN KEY (material_id) 
        REFERENCES materials(id) 
        ON DELETE RESTRICT
);

-- ============================================
-- 6. İNDEKSLER
-- ============================================

CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_bom_product_id ON bom(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_material_id ON bom(material_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_product_id ON production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_id ON stock_movements(material_id);

-- ============================================
-- 7. TRİGGER'LAR
-- ============================================

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    SELECT stock_amount INTO current_stock
    FROM materials
    WHERE id = NEW.material_id;

    IF NEW.movement_type = 'in' THEN
        UPDATE materials
        SET stock_amount = stock_amount + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.material_id;
        
    ELSIF NEW.movement_type = 'out' THEN
        IF current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Stok yetersiz! Mevcut: %, Gereken: %', 
                current_stock, NEW.quantity;
        END IF;
        
        UPDATE materials
        SET stock_amount = stock_amount - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.material_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_material_stock
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_material_stock();

-- ============================================
-- 8. VIEW'LAR
-- ============================================

-- Ürün reçetesi görünümü
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
FROM active_products p
JOIN bom b ON p.id = b.product_id
JOIN materials m ON b.material_id = m.id;

-- ============================================
-- 9. ÖRNEK VERİLER
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

-- BOM Reçeteleri (Chester: 8m Kumaş + 1 Sünger + 4 Ayak)
INSERT INTO bom (product_id, material_id, quantity_required)
SELECT 
    p.id,
    m.id,
    CASE 
        WHEN m.name = 'Kadife Kumaş' THEN 8.0
        WHEN m.name = 'Orta Sertlik Sünger' THEN 1.0
        WHEN m.name = 'Ahşap Ayak' THEN 4.0
    END
FROM active_products p, materials m
WHERE p.sku = 'KOL-001'
AND m.name IN ('Kadife Kumaş', 'Orta Sertlik Sünger', 'Ahşap Ayak')
ON CONFLICT (product_id, material_id) DO NOTHING;

-- BOM Reçeteleri (Berjer: 5m Kumaş + 1 Sünger + 4 Ayak)
INSERT INTO bom (product_id, material_id, quantity_required)
SELECT 
    p.id,
    m.id,
    CASE 
        WHEN m.name = 'Deri Kumaş' THEN 5.0
        WHEN m.name = 'Yumuşak Sünger' THEN 1.0
        WHEN m.name = 'Metal Ayak' THEN 4.0
    END
FROM active_products p, materials m
WHERE p.sku = 'KOL-002'
AND m.name IN ('Deri Kumaş', 'Yumuşak Sünger', 'Metal Ayak')
ON CONFLICT (product_id, material_id) DO NOTHING;

-- ============================================
-- TAMAMLANDI! ✅
-- ============================================
-- Tablolar oluşturuldu, ilişkiler kuruldu ve örnek veriler eklendi.
-- Artık sisteminizi kullanmaya başlayabilirsiniz!
-- ============================================


