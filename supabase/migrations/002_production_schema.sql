-- Koltuk Üretimi için Veritabanı Şeması
-- Products, BOM (Bill of Materials), Stocks tabloları

-- ============================================
-- 1. PRODUCTS - Koltuk Modelleri
-- ============================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    base_cost DECIMAL(12, 2) DEFAULT 0,
    base_price DECIMAL(12, 2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'adet',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 2. STOCKS - Hammadde Stokları
-- ============================================

CREATE TABLE IF NOT EXISTS stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'kumaş', 'sünger', 'ayak', 'diğer'
    unit VARCHAR(20) NOT NULL, -- 'metre', 'adet', 'kg', 'm²'
    current_quantity DECIMAL(12, 3) DEFAULT 0,
    min_quantity DECIMAL(12, 3) DEFAULT 0,
    unit_cost DECIMAL(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 3. BOM (Bill of Materials) - Ürün Reçetesi
-- ============================================

CREATE TABLE IF NOT EXISTS bom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    quantity DECIMAL(12, 3) NOT NULL, -- Bu ürün için gereken miktar
    unit VARCHAR(20) NOT NULL, -- Birim (metre, adet, vb.)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, stock_id) -- Aynı ürün için aynı hammadde sadece bir kez
);

-- ============================================
-- 4. PRODUCTION_ORDERS - Üretim Emirleri
-- ============================================

CREATE TABLE IF NOT EXISTS production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. STOCK_MOVEMENTS - Stok Hareketleri
-- ============================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity DECIMAL(12, 3) NOT NULL,
    reference_type VARCHAR(50), -- 'production', 'purchase', 'sale', 'adjustment'
    reference_id UUID, -- İlgili kaydın ID'si (production_order_id vb.)
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. İNDEKSLER
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bom_product ON bom(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_stock ON bom(stock_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_product ON production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock ON stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ============================================
-- 7. TRİGGER'LAR - Otomatik Güncellemeler
-- ============================================

-- Stok hareketi sonrası stok güncelleme
-- KRİTİK: Stok eksiye düşerse hata fırlat
CREATE OR REPLACE FUNCTION update_stock_quantity()
RETURNS TRIGGER AS $$
DECLARE
    current_qty DECIMAL(12, 3);
BEGIN
    -- Mevcut stok miktarını al
    SELECT current_quantity INTO current_qty
    FROM stocks
    WHERE id = NEW.stock_id;

    IF NEW.movement_type = 'in' THEN
        -- Stok girişi: Artır
        UPDATE stocks
        SET current_quantity = current_quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.stock_id;
    ELSIF NEW.movement_type = 'out' THEN
        -- Stok çıkışı: Düşür, ama eksiye düşmesin
        IF current_qty < NEW.quantity THEN
            RAISE EXCEPTION 'Stok yetersiz! Mevcut: %, Gereken: %', current_qty, NEW.quantity;
        END IF;
        
        UPDATE stocks
        SET current_quantity = current_quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_quantity
    AFTER INSERT ON stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_quantity();

-- Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_stocks_updated_at BEFORE UPDATE ON stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_bom_updated_at BEFORE UPDATE ON bom FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_production_orders_updated_at BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. VIEW'LAR - Kolay Sorgular
-- ============================================

-- Ürün reçetesi görünümü (ürün + hammaddeler)
CREATE OR REPLACE VIEW product_bom_view AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name as product_name,
    s.id as stock_id,
    s.code as stock_code,
    s.name as stock_name,
    s.category as stock_category,
    s.unit as stock_unit,
    b.quantity as required_quantity,
    s.current_quantity as available_quantity,
    CASE 
        WHEN s.current_quantity >= b.quantity THEN true 
        ELSE false 
    END as is_available
FROM products p
JOIN bom b ON p.id = b.product_id
JOIN stocks s ON b.stock_id = s.id
WHERE p.deleted_at IS NULL AND s.deleted_at IS NULL;

