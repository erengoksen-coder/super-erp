# Excel uygulamasını başlat
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

# Yeni çalışma kitabı oluştur
$workbook = $excel.Workbooks.Add()

# Mevcut sayfayı al ve adını değiştir
$sheet1 = $workbook.Worksheets.Item(1)
$sheet1.Name = "KUMAŞ TAKİP"

# Listeler sayfasını oluştur
$listSheet = $workbook.Worksheets.Add()
$listSheet.Name = "Listeler"
$listSheet.Move($workbook.Worksheets.Item($workbook.Worksheets.Count))

# Veri girişi sayfası oluştur
$dataSheet = $workbook.Worksheets.Add()
$dataSheet.Name = "VERİ GİRİŞİ"
$dataSheet.Move($workbook.Worksheets.Item($workbook.Worksheets.Count))

# ============================================
# LİSTELER SAYFASINI DOLDUR
# ============================================

# Ürün isimleri
$urunler = @("VENÜS", "GALATA", "LONDON KÖŞE", "STAR", "EVA", "PRADA", "LOTTO", "LAVİN KANEPE", "COMFORD KANEPE", "VERA", "PIRLANTA", "OSLO", "ATLAS")
$listSheet.Cells.Item(1, 1).Value2 = "ÜRÜN LİSTESİ"
$listSheet.Cells.Item(1, 1).Font.Bold = $true
for ($i = 0; $i -lt $urunler.Count; $i++) {
    $listSheet.Cells.Item($i + 2, 1).Value2 = $urunler[$i]
}

# Birimler
$birimler = @("ADET", "TAKIM", "METRE")
$listSheet.Cells.Item(1, 3).Value2 = "BİRİM LİSTESİ"
$listSheet.Cells.Item(1, 3).Font.Bold = $true
for ($i = 0; $i -lt $birimler.Count; $i++) {
    $listSheet.Cells.Item($i + 2, 3).Value2 = $birimler[$i]
}

# Konfigürasyonlar
$konfigler = @("BERJER", "ÖRÜLÜ", "2+K+3", "3+K+3", "2+K+2", "KÖŞE")
$listSheet.Cells.Item(1, 5).Value2 = "KONFİGÜRASYON LİSTESİ"
$listSheet.Cells.Item(1, 5).Font.Bold = $true
for ($i = 0; $i -lt $konfigler.Count; $i++) {
    $listSheet.Cells.Item($i + 2, 5).Value2 = $konfigler[$i]
}

# Kumaş kodları
$kumaslar = @("ALASKA 05", "ALASKA 02", "ALASKA 03", "ALASKA 08", "ALASKA 09", "ALASKA 10", "DARK 897", "DARK 896", "DARK 895", "DARK 894", "TETRA 01", "BELLA 01", "BELLA 12", "BELLA 16", "BELLA V 28", "NORDE 63-03", "CASA 02", "LONDON 060", "LONDON 020", "LONDON 110", "LUPEN 16", "LUPEN 03", "ARTEMİS 7684")
$listSheet.Cells.Item(1, 7).Value2 = "KUMAŞ KODU LİSTESİ"
$listSheet.Cells.Item(1, 7).Font.Bold = $true
for ($i = 0; $i -lt $kumaslar.Count; $i++) {
    $listSheet.Cells.Item($i + 2, 7).Value2 = $kumaslar[$i]
}

# Konfigürasyona göre Toplam değerleri
$listSheet.Cells.Item(1, 9).Value2 = "TOPLAM DEĞERLERİ"
$listSheet.Cells.Item(1, 9).Font.Bold = $true
$listSheet.Cells.Item(2, 9).Value2 = "BERJER"
$listSheet.Cells.Item(2, 10).Value2 = 4.5
$listSheet.Cells.Item(3, 9).Value2 = "ÖRÜLÜ"
$listSheet.Cells.Item(3, 10).Value2 = 11
$listSheet.Cells.Item(4, 9).Value2 = "2+K+3"
$listSheet.Cells.Item(4, 10).Value2 = 25
$listSheet.Cells.Item(5, 9).Value2 = "3+K+3"
$listSheet.Cells.Item(5, 10).Value2 = 30
$listSheet.Cells.Item(6, 9).Value2 = "2+K+2"
$listSheet.Cells.Item(6, 10).Value2 = 20
$listSheet.Cells.Item(7, 9).Value2 = "KÖŞE"
$listSheet.Cells.Item(7, 10).Value2 = 35

# Sütun genişliklerini ayarla
$listSheet.Columns.Item("A:A").ColumnWidth = 20
$listSheet.Columns.Item("C:C").ColumnWidth = 15
$listSheet.Columns.Item("E:E").ColumnWidth = 20
$listSheet.Columns.Item("G:G").ColumnWidth = 20
$listSheet.Columns.Item("I:J").ColumnWidth = 15

# ============================================
# VERİ GİRİŞİ SAYFASINI OLUŞTUR
# ============================================

# Başlık satırı
$headers = @("TAKİP NO", "ÜRÜN ADI", "SİPARİŞ MİKTAR", "BİRİM", "KONFİGÜRASYON", "KUMAŞ KODU", "TOPLAM (m²)", "İHTİYAÇ (m²)", "TARİH", "DURUM", "NOTLAR")
for ($i = 0; $i -lt $headers.Count; $i++) {
    $dataSheet.Cells.Item(1, $i + 1).Value2 = $headers[$i]
}

# Başlık satırını biçimlendir
$headerRange = $dataSheet.Range("A1:K1")
$headerRange.Font.Bold = $true
$headerRange.Font.Size = 12
$headerRange.Interior.ColorIndex = 37  # Koyu mavi
$headerRange.Font.ColorIndex = 2  # Beyaz
$headerRange.HorizontalAlignment = -4108  # Ortalı

# Örnek veri ekle (ilk 5 satır)
$ornekVeriler = @(
    @(301, "VENÜS", 1, "ADET", "ÖRÜLÜ", "ALASKA 05"),
    @(306, "GALATA", 2, "ADET", "BERJER", "DARK 897"),
    @(307, "LONDON KÖŞE", 1, "TAKIM", "2+K+3", "ALASKA 10"),
    @(310, "STAR", 2, "ADET", "BERJER", "TETRA 01"),
    @(312, "EVA", 2, "ADET", "BERJER", "BELLA 01")
)

for ($i = 0; $i -lt $ornekVeriler.Count; $i++) {
    $row = $i + 2
    $dataSheet.Cells.Item($row, 1).Value2 = $ornekVeriler[$i][0]
    $dataSheet.Cells.Item($row, 2).Value2 = $ornekVeriler[$i][1]
    $dataSheet.Cells.Item($row, 3).Value2 = $ornekVeriler[$i][2]
    $dataSheet.Cells.Item($row, 4).Value2 = $ornekVeriler[$i][3]
    $dataSheet.Cells.Item($row, 5).Value2 = $ornekVeriler[$i][4]
    $dataSheet.Cells.Item($row, 6).Value2 = $ornekVeriler[$i][5]
}

# ============================================
# FORMÜLLER EKLE
# ============================================

# TOPLAM formülü (G sütunu) - Konfigürasyona göre otomatik hesaplama
for ($row = 2; $row -le 50; $row++) {
    $dataSheet.Cells.Item($row, 7).Formula = "=IF(E$row="""","""",VLOOKUP(E$row,`$I`$2:`$J`$7,2,FALSE))"
}

# İHTİYAÇ formülü (H sütunu) - Sipariş Miktar × Toplam
for ($row = 2; $row -le 50; $row++) {
    $dataSheet.Cells.Item($row, 8).Formula = "=IF(AND(C$row<>"""",G$row<>""""),C$row*G$row,"""")"
}

# TARİH formülü (I sütunu) - Bugünün tarihi
for ($row = 2; $row -le 50; $row++) {
    $dataSheet.Cells.Item($row, 9).Formula = "=IF(B$row<>"""",TODAY(),"""")"
}

# DURUM formülü (J sütunu)
for ($row = 2; $row -le 50; $row++) {
    $dataSheet.Cells.Item($row, 10).Formula = "=IF(B$row="""","""",""BEKLİYOR"")"
}

# ============================================
# VERİ DOĞRULAMA (DROPDOWN) EKLE
# ============================================

# Ürün Adı Dropdown (B sütunu)
$productRange = $dataSheet.Range("B2:B50")
$productValidation = $productRange.Validation
$productValidation.Delete()
$productValidation.Add(3, 1, 1, "=Listeler!`$A`$2:`$A`$14")  # 3 = xlValidateList
$productValidation.ErrorMessage = "Lütfen listeden bir ürün seçin!"
$productValidation.ErrorTitle = "HATA"
$productValidation.ShowError = $true

# Birim Dropdown (D sütunu)
$birimRange = $dataSheet.Range("D2:D50")
$birimValidation = $birimRange.Validation
$birimValidation.Delete()
$birimValidation.Add(3, 1, 1, "=Listeler!`$C`$2:`$C`$4")
$birimValidation.ErrorMessage = "Lütfen listeden bir birim seçin!"
$birimValidation.ErrorTitle = "HATA"
$birimValidation.ShowError = $true

# Konfigürasyon Dropdown (E sütunu)
$konfigRange = $dataSheet.Range("E2:E50")
$konfigValidation = $konfigRange.Validation
$konfigValidation.Delete()
$konfigValidation.Add(3, 1, 1, "=Listeler!`$E`$2:`$E`$7")
$konfigValidation.ErrorMessage = "Lütfen listeden bir konfigürasyon seçin!"
$konfigValidation.ErrorTitle = "HATA"
$konfigValidation.ShowError = $true

# Kumaş Kodu Dropdown (F sütunu)
$kumasRange = $dataSheet.Range("F2:F50")
$kumasValidation = $kumasRange.Validation
$kumasValidation.Delete()
$kumasValidation.Add(3, 1, 1, "=Listeler!`$G`$2:`$G`$24")
$kumasValidation.ErrorMessage = "Lütfen listeden bir kumaş kodu seçin!"
$kumasValidation.ErrorTitle = "HATA"
$kumasValidation.ShowError = $true

# Durum Dropdown (J sütunu)
$durumRange = $dataSheet.Range("J2:J50")
$durumValidation = $durumRange.Validation
$durumValidation.Delete()
$durumValidation.Add(3, 1, 1, """BEKLİYOR,ÜRETİMDE,TAMAMLANDI,TESLİM EDİLDİ,İPTAL""")
$durumValidation.ErrorMessage = "Lütfen listeden bir durum seçin!"
$durumValidation.ErrorTitle = "HATA"
$durumValidation.ShowError = $true

# Sipariş Miktar Sayısal Kontrol (C sütunu)
$miktarRange = $dataSheet.Range("C2:C50")
$miktarValidation = $miktarRange.Validation
$miktarValidation.Delete()
$miktarValidation.Add(1, 1, 1, 0)  # 1 = xlValidateWholeNumber, 1 = xlGreaterEqual
$miktarValidation.ErrorMessage = "Lütfen 0'dan büyük bir sayı girin!"
$miktarValidation.ErrorTitle = "HATA"
$miktarValidation.ShowError = $true

# Takip No Sayısal Kontrol (A sütunu)
$takipRange = $dataSheet.Range("A2:A50")
$takipValidation = $takipRange.Validation
$takipValidation.Delete()
$takipValidation.Add(1, 1, 1, 1)  # 1'den büyük
$takipValidation.ErrorMessage = "Lütfen 1'den büyük bir sayı girin!"
$takipValidation.ErrorTitle = "HATA"
$takipValidation.ShowError = $true

# ============================================
# KOŞULLU BİÇİMLENDİRME EKLE
# ============================================

# İHTİYAÇ sütunu için koşullu biçimlendirme
$ihtiyacRange = $dataSheet.Range("H2:H50")

# Yüksek (Yeşil) - 100'den büyük
$highRule = $ihtiyacRange.FormatConditions.Add(1, 3, 100)  # 1 = xlCellValue, 3 = xlGreater
$highRule.Interior.ColorIndex = 4  # Yeşil
$highRule.Font.Bold = $true

# Orta (Sarı) - 50-100 arası
$midRule = $ihtiyacRange.FormatConditions.Add(1, 5, 50, 100)  # 5 = xlBetween
$midRule.Interior.ColorIndex = 6  # Sarı

# Düşük (Kırmızı) - 50'den küçük
$lowRule = $ihtiyacRange.FormatConditions.Add(1, 6, 50)  # 6 = xlLess
$lowRule.Interior.ColorIndex = 3  # Kırmızı
$lowRule.Font.Bold = $true

# Durum sütunu için koşullu biçimlendirme
$durumRange = $dataSheet.Range("J2:J50")

# BEKLİYOR - Sarı
$waitRule = $durumRange.FormatConditions.Add(2, $null, "BEKLİYOR")  # 2 = xlTextString
$waitRule.Interior.ColorIndex = 6

# ÜRETİMDE - Mavi
$prodRule = $durumRange.FormatConditions.Add(2, $null, "ÜRETİMDE")
$prodRule.Interior.ColorIndex = 5

# TAMAMLANDI - Yeşil
$doneRule = $durumRange.FormatConditions.Add(2, $null, "TAMAMLANDI")
$doneRule.Interior.ColorIndex = 4

# TESLİM EDİLDİ - Koyu yeşil
$deliverRule = $durumRange.FormatConditions.Add(2, $null, "TESLİM EDİLDİ")
$deliverRule.Interior.ColorIndex = 10

# İPTAL - Kırmızı
$cancelRule = $durumRange.FormatConditions.Add(2, $null, "İPTAL")
$cancelRule.Interior.ColorIndex = 3

# ============================================
# TABLO OLUŞTUR
# ============================================

# Veri aralığını tabloya çevir
$tableRange = $dataSheet.Range("A1:K50")
$table = $dataSheet.ListObjects.Add(1, $tableRange, $null, 1)  # 1 = xlSrcRange
$table.Name = "KumasTakipTablosu"
$table.TableStyle = "TableStyleMedium9"

# ============================================
# SÜTUN GENİŞLİKLERİNİ AYARLA
# ============================================

$dataSheet.Columns.Item("A:A").ColumnWidth = 12  # Takip No
$dataSheet.Columns.Item("B:B").ColumnWidth = 20  # Ürün Adı
$dataSheet.Columns.Item("C:C").ColumnWidth = 15  # Sipariş Miktar
$dataSheet.Columns.Item("D:D").ColumnWidth = 10  # Birim
$dataSheet.Columns.Item("E:E").ColumnWidth = 18  # Konfigürasyon
$dataSheet.Columns.Item("F:F").ColumnWidth = 18  # Kumaş Kodu
$dataSheet.Columns.Item("G:G").ColumnWidth = 15  # Toplam
$dataSheet.Columns.Item("H:H").ColumnWidth = 15  # İhtiyaç
$dataSheet.Columns.Item("I:I").ColumnWidth = 12  # Tarih
$dataSheet.Columns.Item("J:J").ColumnWidth = 18  # Durum
$dataSheet.Columns.Item("K:K").ColumnWidth = 25  # Notlar

# ============================================
# BAŞLIK SATIRINI DONDUR
# ============================================

$dataSheet.Range("A2").Select()
$excel.ActiveWindow.FreezePanes = $true

# ============================================
# SAYFAYI VERİ GİRİŞİ SAYFASINA AYARLA
# ============================================

$dataSheet.Activate()

# ============================================
# DOSYAYI KAYDET
# ============================================

$desktopPath = [Environment]::GetFolderPath("Desktop")
$savePath = Join-Path $desktopPath "2026 kumaş.xlsx"

$workbook.SaveAs($savePath)
$workbook.Close()
$excel.Quit()

# COM nesnelerini temizle
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($listSheet) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($dataSheet) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($sheet1) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Excel dosyası başarıyla oluşturuldu: $savePath" -ForegroundColor Green