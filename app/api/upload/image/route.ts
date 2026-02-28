import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products')
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
}

/** POST: Görsel Yükle (FormData: file) */
export const POST = withAuth(async (request: NextRequest) => {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
        return NextResponse.json({ error: 'FormData gerekli (file)' }, { status: 400 })
    }

    let formData: FormData
    try {
        formData = await request.formData()
    } catch {
        return NextResponse.json({ error: 'FormData ayrıştırılamadı' }, { status: 400 })
    }

    const file = formData.get('file') as File | null

    if (!file || typeof file.arrayBuffer !== 'function') {
        return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 })
    }

    const mime = file.type || 'application/octet-stream'
    if (!ALLOWED_MIME.includes(mime)) {
        return NextResponse.json({ error: 'İzin verilen türler: JPEG, PNG, GIF, WebP' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Dosya en fazla 5 MB olabilir' }, { status: 400 })
    }

    ensureUploadDir()
    const id = randomUUID()
    const ext = path.extname(file.name) || '.webp'
    const safeName = `${id}${ext}`
    const filePath = path.join(UPLOAD_DIR, safeName)

    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // URL rotası: /uploads/products/safeName
    const imageUrl = `/uploads/products/${safeName}`

    return NextResponse.json({
        success: true,
        url: imageUrl,
        file_name: file.name
    })
})
