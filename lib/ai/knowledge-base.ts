export interface KnowledgeItem {
    keywords: string[];
    title: string;
    answer: string;
    category: 'general' | 'inventory' | 'production' | 'sales' | 'bayi' | 'finance' | 'ssh';
}

export const knowledgeBase: KnowledgeItem[] = [
    // GENERAL
    {
        category: 'general',
        title: 'Super ERP Nedir?',
        keywords: ['merhaba', 'selam', 'nedir', 'kim', 'yardım', 'ne yapar'],
        answer: 'Super ERP, işletmenizin üretim, stok, satış ve bayi süreçlerini tek bir platformdan yönetmenizi sağlayan kapsamlı bir kurumsal kaynak planlama sistemidir. Size stok takibi, üretim emirleri, sevkiyat yönetimi ve bayi portalı gibi modüller sunar.'
    },
    {
        category: 'general',
        title: 'Nasıl Kullanılır?',
        keywords: ['nasıl kullanılır', 'rehber', 'başlangıç', 'eğitim', 'kullanım'],
        answer: 'Programı kullanmaya başlamak için sol menüdeki modülleri kullanabilirsiniz. Temel akış: Ürünlerinizi tanımlayın, hammadde stoklarınızı girin, ardından satış siparişleri alıp bu siparişlere istinaden üretim emirleri oluşturun. Üretim tamamlandığında sevkiyat modülü ile ürünlerinizi müşterilerinize ulaştırabilirsiniz.'
    },

    // INVENTORY
    {
        category: 'inventory',
        title: 'Stok Girişi Nasıl Yapılır?',
        keywords: ['stok', 'ürün ekle', 'malzeme', 'hammadde', 'stok ekle', 'envanter'],
        answer: 'Stok girişi yapmak için "Envanter → Malzeme Stokları" veya "Ürünler" sekmesini kullanabilirsiniz. Yeni bir malzeme eklemek için "Yeni Malzeme" butonuna tıklayıp bilgilerini girmeniz yeterlidir. Mevcut stokları güncellemek için "Stok Sayımı" veya "Hızlı Giriş" ekranlarını da kullanabilirsiniz.'
    },
    {
        category: 'inventory',
        title: 'Kritik Stok Takibi',
        keywords: ['kritik', 'azalan', 'stok bitti', 'sipariş verilecek', 'uyarı'],
        answer: 'Sistem, belirlediğiniz "Minimum Stok Seviyesi"nin altına düşen ürünleri "Satın Alma → Kritik Stok" sayfasında otomatik olarak listeler. Buradan tek tıkla satın alma talebi oluşturabilirsiniz.'
    },

    // PRODUCTION
    {
        category: 'production',
        title: 'Siparişten Üretim Nasıl Başlatılır?',
        keywords: ['üretim', 'imalat', 'iş emri', 'nasıl üretilir', 'üretim başlat'],
        answer: 'Bir siparişi üretime almak için "Satış → Siparişler" listesinden ilgili siparişi bulun ve "Üretime Gönder" butonuna basın. Alternatif olarak "Üretim → Yeni Üretim Emri" sayfasından manuel iş emri oluşturabilirsiniz.'
    },
    {
        category: 'production',
        title: 'BOM (Ürün Reçetesi) Nedir?',
        keywords: ['bom', 'reçete', 'ürün ağacı', 'içerik', 'maliyet'],
        answer: 'BOM (Bill of Materials), bir ürünün üretilmesi için gereken hammadde ve operasyonların listesidir. Ürünler modülünde her ürün için bir reçete tanımlayarak, üretim esnasında stokların otomatik düşmesini ve maliyetin hesaplanmasını sağlayabilirsiniz.'
    },

    // SALES
    {
        category: 'sales',
        title: 'Yeni Sipariş Nasıl Girilir?',
        keywords: ['sipariş', 'satış', 'fatura', 'satış gir', 'yeni sipariş'],
        answer: 'Yeni sipariş girmek için "Satış → Yeni Sipariş" ekranını kullanabilirsiniz. Burada müşteriyi seçip ürünleri ekledikten sonra "Kaydet" demeniz yeterlidir. Onaylanan siparişler sevkiyat veya üretim kuyruğuna alınabilir.'
    },

    // BAYI PORTAL
    {
        category: 'bayi',
        title: 'Bayi Portalı Ne İşe Yarar?',
        keywords: ['bayi', 'portal', 'bayi girişi', 'bayi ne yapar'],
        answer: 'Bayi Portalı, bayilerinizin kendi kullanıcı adları ile giriş yapıp stoklarınızı görmesine, sipariş vermesine, sevkiyatlarını takip etmesine ve destek (SSH) talebi oluşturmasına olanak tanır.'
    },
    {
        category: 'bayi',
        title: 'Bayi Siparişi Nasıl Verilir?',
        keywords: ['bayi sipariş', 'katalog', 'sepete ekle'],
        answer: 'Bayiler sisteme giriş yaptıktan sonra "Katalog & Sipariş" sayfasından ürünleri inceleyip sepete ekleyebilir ve siparişlerini anında size iletebilirler.'
    },

    // SSH / TICKETS
    {
        category: 'ssh',
        title: 'Destek/Servis Talebi (SSH) Nedir?',
        keywords: ['destek', 'ssh', 'servis', 'arıza', 'şikayet', 'talep'],
        answer: 'SSH (Satış Sonrası Hizmetler) modülü, müşterilerinizden veya bayilerinizden gelen arıza bildirimlerini ve servis taleplerini yönetmenizi sağlar. Her talep bir "Ticket" (Bilet) numarası ile takip edilir.'
    },

    // FINANCE
    {
        category: 'finance',
        title: 'Ödeme ve Tahsilat Takibi',
        keywords: ['finans', 'ödeme', 'tahsilat', 'cari', 'borç', 'alacak', 'çek', 'senet'],
        answer: 'Finans modülünde müşterilerinizin ve tedarikçilerinizin cari hesaplarını görebilir, çek/senet girişlerini yapabilir ve banka/kasa durumunuzu gerçek zamanlı takip edebilirsiniz.'
    }
];
