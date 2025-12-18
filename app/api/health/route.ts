/**
 * GET /api/health
 * Health check endpoint to diagnose configuration issues
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../_utils/supabaseAdmin';

export async function GET() {
  const checks = {
    env: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    supabase: {
      adminClientInitialized: !!supabaseAdmin,
    },
    database: {
      scansTableExists: false,
      error: null as string | null,
    },
    storage: {
      scansBucketExists: false,
      error: null as string | null,
    },
  };

  // Check database table
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          checks.database.error = 'Scans table does not exist';
        } else {
          checks.database.error = error.message;
        }
      } else {
        checks.database.scansTableExists = true;
      }
    } catch (err: any) {
      checks.database.error = err.message;
    }

    // Check storage bucket
    try {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      if (error) {
        checks.storage.error = error.message;
      } else {
        checks.storage.scansBucketExists = buckets?.some(b => b.name === 'scans') || false;
      }
    } catch (err: any) {
      checks.storage.error = err.message;
    }
  }

  const allHealthy = 
    checks.env.supabaseUrl &&
    checks.env.supabaseServiceKey &&
    checks.supabase.adminClientInitialized &&
    checks.database.scansTableExists &&
    checks.storage.scansBucketExists;

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    message: allHealthy
      ? 'All systems operational'
      : 'Some checks failed. See checks object for details.',
  });
}

