import "server-only";
import { NextRequest, NextResponse } from 'next/server'
import { createScan } from '@/app/api/_utils/supabaseAdmin'
import { uploadScanImage } from '@/app/api/_utils/storage'
import { getUser } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    // Authentication required (using legacy pattern)
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required for scans' },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Missing image field' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    const contentType = imageFile.type
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit.' },
        { status: 400 }
      )
    }

    const scanId = randomUUID()
    const fileExt = imageFile.name.split('.').pop() || 'jpg'

    // Convert File to Buffer
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage using legacy helper
    let imagePath: string
    let imageUrl: string
    try {
      const uploadResult = await uploadScanImage(buffer, contentType, fileExt)
      imagePath = uploadResult.image_path
      imageUrl = uploadResult.image_url
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Storage upload failed'
      return NextResponse.json(
        { error: message },
        { status: 500 }
      )
    }

    // Create scan record using legacy schema (id, image_path, image_url, status, user_id)
    try {
      await createScan({
        id: scanId,
        image_path: imagePath,
        image_url: imageUrl,
        status: 'uploaded',
        user_id: user.id,
      })
    } catch (dbError) {
      const message = dbError instanceof Error ? dbError.message : 'Database insert failed'
      return NextResponse.json(
        { error: message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      scan_id: scanId,
      image_url: imageUrl,
      status: 'uploaded',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

