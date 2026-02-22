# Rol ve Yetki Matrisi

Bu belge, LIVASOFA ERP’deki roller ve sayfa/aksiyon erişim kurallarını özetler. Uygulama kodu: `lib/auth/permissions-check.ts`, menü filtreleme: `components/Sidebar.tsx` içinde `filterMenuByPermissions`.

---

## Roller

| Rol (role) | Açıklama | Menü / Erişim |
|------------|----------|----------------|
| **admin** / **yönetici** | Sistem yöneticisi | Tüm menü ve API; izin kontrolü atlanır (`isAdminRole`). |
| **manager** | Yönetici | Yetki matrisindeki `permissions` ile belirlenir (kullanıcıya atanmış sayfa bazlı izinler). |
| **viewer** | Görüntüleyici | Sadece görüntüleme (can_view); oluşturma/düzenleme/silme izinleri ayrı atanır. |
| **bayi** | Bayi kullanıcısı | Sadece Bayi Portal (`/bayi`); cari listesi ve standart menüye erişemez. |

---

## İzin Modeli

- **Kaynak:** Kullanıcıya atanmış `permissions` listesi (her öğe: `page_path`, `can_view`, `can_create`, `can_edit`, `can_delete`).
- **Kontrol:** `canAccessPath(permissions, pathname, action)` — `action`: `view` | `create` | `edit` | `delete`.
- **Path eşleme:** `pathname === page_path` veya `pathname.startsWith(page_path + '/')`; en spesifik eşleşen izin kullanılır.
- **HTTP metodu eşlemesi:** API tarafında `getActionFromMethod`: GET/HEAD → view, POST → create, PUT/PATCH → edit, DELETE → delete.

---

## Sayfa → Rol Özeti (Varsayılan)

Aşağıdaki tablo, **admin dışı** rollerde hangi sayfa yolunun görünür olabileceğini (izin atanmışsa) gösterir. Admin tüm yollara erişir; bayi sadece `/bayi`.

| Grup | Sayfa yolu | Açıklama |
|------|------------|----------|
| Kontrol Paneli | `/`, `/dashboard` | Ana sayfa |
| Üretim & Stok | `/production`, `/inventory`, `/inventory/materials`, `/inventory/products`, `/barcodes`, vb. | Üretim emirleri, stok, barkod |
| Satış & Tedarik | `/orders`, `/shipments`, `/invoices`, `/purchase-requests`, `/purchase-orders`, `/procurement` | Sipariş, sevkiyat, fatura, satın alma |
| Finans | `/finance`, `/accounts`, `/payments`, `/checks-notes`, `/accounting` | Cari, ödeme, muhasebe |
| Diğer | `/crm`, `/reports`, `/documents`, `/contracts`, `/settings`, `/users` | CRM, raporlar, ayarlar |
| Yönetim (admin) | `/admin`, `/admin/audit-log`, `/admin/webhooks`, `/admin/messaging` | Sadece admin |

---

## Kod Referansları

- **Admin kontrolü:** `isAdminRole(user?.role)` → true ise menü ve API’de izin kontrolü atlanır.
- **Menü filtreleme:** `filterMenuByPermissions(menuGroups, permissions, isAdmin)` — her menü öğesi için `canAccessPath(permissions, href, 'view')` çağrılır.
- **Bayi:** `role === 'bayi'` ise `bayiMenuGroups` kullanılır (sadece Bayi Portal linki).

Yeni bir sayfa eklendiğinde, menüde görünmesi için kullanıcı izinlerinde ilgili `page_path` (örn. `/reports/sales-summary`) atanmalıdır. Admin rolü her zaman tüm sayfalara erişir.
