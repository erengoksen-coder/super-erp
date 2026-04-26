# Excel uygulamasını başlat
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

# Yeni çalışma kitabı oluştur
$workbook = $excel.Workbooks.Add()

# ============================================
# LİSTELER SAYFASINI OLUŞTUR
# ============================================
$listSheet = $workbook.Worksheets.Item(1)
$listSheet.Name = "Listeler"

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
$listSheet.Cells.Item(1, 5).Value2 = "KONFİGÜRASYON"
$listSheet.Cells.Item(1, 5).Font.Bold = $true
for ($i = 0; $i -lt $konfigler.Count; $i++) {
    $listSheet.Cells.Item($i + 2, 5).Value2 = $konfigler[$i]
}

# Kumaş kodları
$kumaslar = @("ALASKA 05", "ALASKA 02", "ALASKA 03", "ALASKA 08", "ALASKA 09", "ALASKA 10", "DARK 897", "DARK 896", "DARK 895", "DARK 894", "TETRA 01", "BELLA 01", "BELLA 12", "BELLA 16", "BELLA V 28", "NORDE 63-03", "CASA 02", "LONDON 060", "LONDON 020", "LONDON 110", "LUPEN 16", "LUPEN 03", "ARTEMİS 7684")
$listSheet.Cells.Item(1, 7).Value2 = "KUMAŞ KODLARI"
$listSheet.Cells.Item(1, 7).Font.Bold = $true
for ($i = 0; $i -lt $kumaslar.Count; $i++) {
    $listSheet.Cells.Item($i + 2, 7).Value2 = $kumaslar[$i]
}

# Konfigürasyon-Toplam eşleştirme
$listSheet.Cells.Item(1, 9).Value2 = "KONFİGÜRASYON"
$listSheet.Cells.Item(1, 10).Value2 = "TOPLAM (m²)"
$listSheet.Cells.Item(1, 9).Font.Bold = $true
$listSheet.Cells.Item(1, 10).Font.Bold = $true
$listSheet.Cells.Item(2, 9).Value2 = "BERJER"
$listSheet.Cells.Item(2, 10).Value2 = "4.5"
$listSheet.Cells.Item(3, 9).Value2 = "ÖRÜLÜ"
$listSheet.Cells.Item(3, 10).Value2 = "11"
$listSheet.Cells.Item(4, 9).Value2 = "2+K+3"
$listSheet.Cells.Item(4, 10).Value2 = "25"
$listSheet.Cells.Item(5, 9).Value2 = "3+K+3"
$listSheet.Cells.Item(5, 10).Value2 = "30"
$listSheet.Cells.Item(6, 9).Value2 = "2+K+2"
$listSheet.Cells.Item(6, 10).Value2 = "20"
$listSheet.Cells.Item(7, 9).Value2 = "KÖŞE"
$listSheet.Cells.Item(7, 10).Value2 = "35"

# Sütun genişlikleri
$listSheet.Columns.Item("A:A").ColumnWidth = 20
$listSheet.Columns.Item("C:C").ColumnWidth = 15
$listSheet.Columns.Item("E:E").ColumnWidth = 20
$listSheet.Columns.Item("G:G").ColumnWidth = 20
$listSheet.Columns.Item("I:J").ColumnWidth = 15

# ============================================
# VERİ GİRİŞİ SAYFASINI OLUŞTUR
# ============================================
$dataSheet = $workbook.Worksheets.Add()
$dataSheet.Name = "VERİ GİRİŞİ"

# Başlıklar
$headers = @("TAKİP NO", "ÜRÜN ADI", "SİPARİŞ MİKTAR", "BİRİM", "KONFİGÜRASYON", "KUMAŞ KODU", "TOPLAM (m²)", "İHTİYAÇ (m²)", "TARİH", "DURUM", "NOTLAR")
for ($i = 0; $i -lt $headers.Count; $i++) {
    $dataSheet.Cells.Item(1, $i + 1).Value2 = $headers[$i]
}

# Başlık biçimlendirme
$headerRange = $dataSheet.Range("A1:K1")
$headerRange.Font.Bold = $true
$headerRange.Font.Size = 11
$headerRange.Interior.ColorIndex = 37
$headerRange.Font.ColorIndex = 2
$headerRange.HorizontalAlignment = -4108

# ============================================
# FORMÜLLER EKLE (2-50 satırları arası)
# ============================================
for ($row = 2; $row -le 50; $row++) {
    # TOPLAM formülü - Konfigürasyona göre
    $dataSheet.Cells.Item($row, 7).Formula = '=IF(E' + $row + '="","",VLOOKUP(E' + $row + ',Listeler!$I$2:$J$7,2,FALSE))'
    
    # İHTİYAÇ formülü
    $dataSheet.Cells.Item($row, 8).Formula = '=IF(AND(C' + $row + '<>"",G' + $row + '<>""),C' + $row + '*G' + $row + ',"")'
    
    # TARİH formülü
    $dataSheet.Cells.Item($row, 9).Formula = '=IF(B' + $row + '<>"",TODAY(),"")'
    
    # DURUM formülü
    $dataSheet.Cells.Item($row, 10).Formula = '=IF(B' + $row + '="","","BEKLİYOR")'
}

# ============================================
# DROPDOWNLAR EKLE
# ============================================

# Ürün Adı Dropdown
$productRange = $dataSheet.Range("B2:B50")
$productValidation = $productRange.Validation
$productValidation.Delete()
$productValidation.Add(3, 1, 1, '=Listeler!$A$2:$A$14')
$productValidation.ErrorMessage = "Lütfen listeden bir ürün seçin!"
$productValidation.ErrorTitle = "HATA"
$productValidation.ShowError = $true

# Birim Dropdown
$birimRange = $dataSheet.Range("D2:D50")
$birimValidation = $birimRange.Validation
$birimValidation.Delete()
$birimValidation.Add(3, 1, 1, '=Listeler!$C$2:$C$4')
$birimValidation.ErrorMessage = "Lütfen listeden bir birim seçin!"
$birimValidation.ShowError = $true

# Konfigürasyon Dropdown
$konfigRange = $dataSheet.Range("E2:E50")
$konfigValidation = $konfigRange.Validation
$konfigValidation.Delete()
$konfigValidation.Add(3, 1, 1, '=Listeler!$E$2:$E$7')
$konfigValidation.ErrorMessage = "Lütfen listeden bir konfigürasyon seçin!"
$konfigValidation.ShowError = $true

# Kumaş Kodu Dropdown
$kumasRange = $dataSheet.Range("F2:F50")
$kumasValidation = $kumasRange.Validation
$kumasValidation.Delete()
$kumasValidation.Add(3, 1, 1, '=Listeler!$G$2:$G$24')
$kumasValidation.ErrorMessage = "Lütfen listeden bir kumaş kodu seçin!"
$kumasValidation.ShowError = $true

# Durum Dropdown
$durumRange = $dataSheet.Range("J2:J50")
$durumValidation = $durumRange.Validation
$durumValidation.Delete()
$durumValidation.Add(3, 1, 1, "BEKLİYOR,ÜRETİMDE,TAMAMLANDI,TESLİM EDİLDİ,İPTAL")
$durumValidation.ErrorMessage = "Lütfen listeden bir durum seçin!"
$durumValidation.ShowError = $true

# ============================================
# KOŞULLU BİÇİMLENDİRME
# ============================================

# İHTİYAÇ sütunu
$ihtiyacRange = $dataSheet.Range("H2:H50")

# Yeşil - 100'den büyük
$highRule = $ihtiyacRange.FormatConditions.Add(1, 3, 100)
$highRule.Interior.ColorIndex = 4
$highRule.Font.Bold = $true

# Sarı - 50-100 arası
$midRule = $ihtiyacRange.FormatConditions.Add(1, 5, 50, 100)
$midRule.Interior.ColorIndex = 6

# Kırmızı - 50'den küçük
$lowRule = $ihtiyacRange.FormatConditions.Add(1, 6, 50)
$lowRule.Interior.ColorIndex = 3
$lowRule.Font.Bold = $true

# ============================================
# SÜTUN GENİŞLİKLERİ
# ============================================
$dataSheet.Columns.Item("A:A").ColumnWidth = 12
$dataSheet.Columns.Item("B:B").ColumnWidth = 20
$dataSheet.Columns.Item("C:C").ColumnWidth = 15
$dataSheet.Columns.Item("D:D").ColumnWidth = 10
$dataSheet.Columns.Item("E:E").ColumnWidth = 18
$dataSheet.Columns.Item("F:F").ColumnWidth = 18
$dataSheet.Columns.Item("G:G").ColumnWidth = 15
$dataSheet.Columns.Item("H:H").ColumnWidth = 15
$dataSheet.Columns.Item("I:I").ColumnWidth = 12
$dataSheet.Columns.Item("J:J").ColumnWidth = 18
$dataSheet.Columns.Item("K:K").ColumnWidth = 25

# Başlık satırını dondur
$dataSheet.Range("A2").Select()
$excel.ActiveWindow.FreezePanes = $true

# ============================================
# DOSYAYI KAYDET
# ============================================
$desktopPath = [Environment]::GetFolderPath("Desktop")
$savePath = Join-Path $desktopPath "2026 kumaş.xlsx"

# Eğer dosya varsa sil
if (Test-Path $savePath) {
    Remove-Item $savePath -Force
}

$workbook.SaveAs($savePath)
$workbook.Close()
$excel.Quit()

# Temizlik
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($dataSheet) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($listSheet) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "Dosya oluşturuldu: $savePath" -ForegroundColor Green