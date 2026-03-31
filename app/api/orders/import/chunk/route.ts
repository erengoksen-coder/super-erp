import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Chunk'ları geçici olarak saklamak için dizin
const CHUNK_DIR = path.join(process.cwd(), '.next', 'chunks')

// Dizini oluştur (yoksa)
if (!fs.existsSync(CHUNK_DIR)) {
  fs.mkdirSync(CHUNK_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  try {
    // FormData'yı oku
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File | null
    const chunkIndex = parseInt(formData.get('chunkIndex')?.toString() || '0')
    const totalChunks = parseInt(formData.get('totalChunks')?.toString() || '0')
    const uploadId = formData.get('uploadId')?.toString() || ''
    const fileName = formData.get('fileName')?.toString() || ''
    const isLastChunk = formData.get('isLastChunk')?.toString() === 'true'
    
    // Auth kontrolü
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : authHeader?.trim()
    const cookieToken = request.cookies.get('auth-token')?.value || request.cookies.get('access_token')?.value
    const token = headerToken || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }
    
    // Validasyon
    if (!chunk || !(chunk instanceof File)) {
      return NextResponse.json({ error: 'Chunk bulunamadı' }, { status: 400 })
    }
    
    if (!uploadId || !fileName) {
      return NextResponse.json({ error: 'Upload ID veya dosya adı eksik' }, { status: 400 })
    }
    
    // Chunk'ı buffer'a çevir
    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Chunk'ı dosyaya kaydet
    const chunkPath = path.join(CHUNK_DIR, `${uploadId}_${chunkIndex}.chunk`)
    fs.writeFileSync(chunkPath, buffer)
    
    console.log(`[chunk] Chunk ${chunkIndex + 1}/${totalChunks} kaydedildi: ${chunkPath} (${buffer.length} bytes)`)
    
    return NextResponse.json({
      success: true,
      chunkIndex: chunkIndex,
      totalChunks: totalChunks,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} başarıyla yüklendi`
    })
  } catch (error: any) {
    console.error('[chunk] Hata:', error)
    return NextResponse.json({
      error: 'Chunk yüklenemedi',
      details: error?.message || 'Bilinmeyen hata'
    }, { status: 500 })
  }
}
