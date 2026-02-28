'use client'

import { useState, useRef } from 'react'
import { Camera, Image as ImageIcon, UploadCloud, AlertTriangle, CheckCircle, Scan, Maximize, ScanLine, AlertCircle } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'

type Detection = {
    id: string
    label: string
    confidence: string
    color: string
    box: {
        x: number
        y: number
        width: number
        height: number
    }
}

type VisionResult = {
    status: 'passed' | 'failed'
    confidence_score: string
    timestamp: string
    detections: Detection[]
    summary: string
}

export default function VisionQcPage() {
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [result, setResult] = useState<VisionResult | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setResult(null)
        const url = URL.createObjectURL(file)
        setImageSrc(url)
    }

    const handleAnalyze = async () => {
        if (!imageSrc) return
        setAnalyzing(true)
        setResult(null)

        try {
            // Simulate API call to our mock endpoint
            const res = await fetchApi<{ success: boolean; data: VisionResult }>('/api/ai/vision-qc', {
                method: 'POST',
            })
            if (res.success) {
                setResult(res.data)
            }
        } catch (err) {
            console.error(err)
            alert("Analiz sırasında bir hata oluştu.")
        } finally {
            setAnalyzing(false)
        }
    }

    return (
        <AppDashboardLayout
            title="Görsel Kalite Kontrol (AI Vision)"
            subtitle="Üretim bantından çıkan ürünlerin fotoğraflarını yapay zeka ile analiz edin."
            icon={Camera}
        >
            <div className="grid lg:grid-cols-3 gap-6">

                {/* Left Col: Upload & Preview */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-gray-900 border border-gray-800 h-full">
                        <CardBody className="p-6 h-full flex flex-col">

                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                            />

                            {!imageSrc ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 min-h-[400px] border-2 border-dashed border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 hover:border-blue-500/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <UploadCloud className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Ürün Fotoğrafı Yükle</h3>
                                    <p className="text-gray-400 text-sm text-center max-w-sm">
                                        Buraya tıklayarak kalite kontrolü yapılacak ürünün detaylı bir fotoğrafını seçin.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col h-full min-h-[500px]">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="font-medium text-gray-300 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" />
                                            Önizleme
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => { setImageSrc(null); setResult(null) }}>
                                            Yeni Görsel Seç
                                        </Button>
                                    </div>

                                    <div className="relative flex-1 bg-black rounded-xl border border-gray-800 overflow-hidden flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imageSrc}
                                            alt="QC Upload"
                                            className={`max-h-full max-w-full object-contain ${analyzing ? 'opacity-50 blur-[2px] grayscale' : ''}`}
                                        />

                                        {/* Scanning overlay */}
                                        {analyzing && (
                                            <>
                                                <div className="absolute inset-x-0 h-1 bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]" />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                                    <ScanLine className="w-12 h-12 text-blue-400 animate-pulse mb-4" />
                                                    <span className="bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-full font-mono text-sm text-blue-300 border border-blue-500/30">
                                                        YZ Analizi Sürüyor...
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {/* Defect Bounding Boxes */}
                                        {result?.detections.map((det) => (
                                            <div
                                                key={det.id}
                                                className="absolute border-2 bg-transparent transition-all duration-700 animate-in fade-in zoom-in group/box"
                                                style={{
                                                    left: `${det.box.x}%`,
                                                    top: `${det.box.y}%`,
                                                    width: `${det.box.width}%`,
                                                    height: `${det.box.height}%`,
                                                    borderColor: det.color,
                                                    backgroundColor: `${det.color}33` // 20% opacity wrapper
                                                }}
                                            >
                                                <div
                                                    className="absolute -top-7 left-[-2px] px-2 py-1 text-xs font-bold text-white whitespace-nowrap rounded-t-md flex items-center gap-1 opacity-0 group-hover/box:opacity-100 transition-opacity"
                                                    style={{ backgroundColor: det.color }}
                                                >
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {det.label} %{det.confidence}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Overall overlay text if passed */}
                                        {result?.status === 'passed' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/40 backdrop-blur-[2px] animate-in fade-in">
                                                <div className="bg-emerald-500/20 border border-emerald-500/50 p-6 rounded-2xl flex flex-col items-center">
                                                    <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
                                                    <h3 className="text-2xl font-black text-emerald-400 tracking-wider">KUSURSUZ</h3>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            size="lg"
                                            className="px-8 bg-blue-600 hover:bg-blue-500"
                                            onClick={handleAnalyze}
                                            disabled={analyzing || result !== null}
                                        >
                                            {analyzing ? 'İşleniyor...' : result ? 'Analiz Tamamlandı' : 'Analizi Başlat'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* Right Col: Analysis Results */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-gray-900 border border-gray-800">
                        <CardHeader
                            title="YZ Analiz Raporu"
                            subtitle="Model: LivaSofa-Vision-v2.1"
                        />
                        <CardBody className="p-6">
                            {!result && !analyzing && (
                                <div className="text-center py-10 opacity-50">
                                    <Scan className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                                    <p className="text-sm">Rapor için görsel analiz bekleniyor.</p>
                                </div>
                            )}

                            {analyzing && (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-800 rounded w-1/2"></div>
                                    <div className="h-24 bg-gray-800 rounded-lg mt-6"></div>
                                    <div className="h-12 bg-gray-800 rounded mt-2"></div>
                                </div>
                            )}

                            {result && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                                    <div className={`p-4 rounded-xl border flex items-start gap-4 ${result.status === 'passed' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
                                        }`}>
                                        {result.status === 'passed' ? <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" /> : <AlertCircle className="w-8 h-8 text-red-400 shrink-0" />}
                                        <div>
                                            <h4 className={`font-bold text-lg ${result.status === 'passed' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {result.status === 'passed' ? 'ONAYLANDI' : 'RET: Hata Tespit Edildi'}
                                            </h4>
                                            <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                                                {result.summary}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                            <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Güven Skoru</div>
                                            <div className="text-xl font-mono text-gray-200">%{result.confidence_score}</div>
                                        </div>
                                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                            <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Tespit Sayısı</div>
                                            <div className="text-xl font-mono text-gray-200">{result.detections.length} Adet</div>
                                        </div>
                                    </div>

                                    {result.detections.length > 0 && (
                                        <div>
                                            <h5 className="text-xs uppercase font-bold text-gray-500 border-b border-gray-800 pb-2 mb-3">
                                                Bulunan Hatalar (Etiketler)
                                            </h5>
                                            <div className="space-y-2">
                                                {result.detections.map((det) => (
                                                    <div key={det.id} className="flex justify-between items-center p-2 rounded bg-gray-950 border border-gray-800 text-sm">
                                                        <div className="flex items-center gap-2 font-medium">
                                                            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: det.color }} />
                                                            {det.label}
                                                        </div>
                                                        <div className="font-mono text-xs text-gray-400">
                                                            %{det.confidence}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-gray-800">
                                        <Button variant="outline" className="w-full">
                                            Kalite Raporuna Yazdır
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
        </AppDashboardLayout>
    )
}
