/**
 * POST /api/pro/strain-train/upload
 * Upload images for private strain training
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { supabaseAdmin } from '@/app/api/_utils/supabaseAdmin';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check pro membership
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('membership')
      .eq('user_id', user.id)
      .single();

    if (profile?.membership !== 'pro' && profile?.membership !== 'ultimate') {
      return NextResponse.json({ error: 'Pro membership required' }, { status: 403 });
    }

    const formData = await req.formData();
    const strainName = formData.get('strain_name') as string;
    const images = formData.getAll('images') as File[];

    if (!strainName || images.length < 20) {
      return NextResponse.json(
        { error: 'Strain name and at least 20 images required' },
        { status: 400 }
      );
    }

    // Create private directory
    const privateDir = join(process.cwd(), 'datasets', 'private_manifests', user.id, strainName);
    await mkdir(privateDir, { recursive: true });

    // Save images
    const savedPaths = [];
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${strainName}-${i + 1}.${file.name.split('.').pop()}`;
      const filepath = join(privateDir, filename);
      await writeFile(filepath, buffer);
      savedPaths.push(filepath);
    }

    return NextResponse.json({
      success: true,
      strain_name: strainName,
      images_uploaded: images.length,
      paths: savedPaths
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
