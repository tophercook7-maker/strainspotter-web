import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import "server-only";
/**
 * API route to serve strain_images.json
 * Handles file location in both dev and production
 */
export async function GET() {
  try {
    // Try multiple possible locations
    const possiblePaths = [
      join(process.cwd(), 'tools', 'strain_images.json'),
      join(process.cwd(), 'strain_images.json'),
      join(process.cwd(), 'public', 'data', 'strain_images.json'),
      join(process.cwd(), 'public', 'strain_images.json'),
    ];

    for (const filePath of possiblePaths) {
      if (existsSync(filePath)) {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        });
      }
    }

    // File not found - return empty array
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('[API] Error loading strain images:', error);
    return NextResponse.json(
      { error: 'Failed to load strain images' },
      { status: 500 }
    );
  }
}
