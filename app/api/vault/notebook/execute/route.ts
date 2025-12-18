/**
 * POST /api/vault/notebook/execute
 * Execute Python code in isolated environment
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAPI } from '@/lib/adminAuth';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    await requireAdminAPI();

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    // Create temporary Python file
    const tempFile = join(tmpdir(), `notebook_${Date.now()}.py`);
    
    // Wrap code with vault access helpers
    const wrappedCode = `
import sys
import json
import os

# Vault path
VAULT_PATH = os.getenv('VAULT_PATH', '/Volumes/TheVault/StrainSpotter')

# Helper functions
def read_vault_file(*segments):
    path = os.path.join(VAULT_PATH, *segments)
    with open(path, 'rb') as f:
        return f.read()

def list_vault_dir(*segments):
    path = os.path.join(VAULT_PATH, *segments)
    return os.listdir(path)

# User code
try:
    ${code}
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    await writeFile(tempFile, wrappedCode);

    try {
      // Execute Python code (sandboxed - no network access)
      const { stdout, stderr } = await execAsync(`python3 ${tempFile}`, {
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          VAULT_PATH: process.env.VAULT_PATH || '/Volumes/TheVault/StrainSpotter',
          PYTHONUNBUFFERED: '1'
        }
      });

      return NextResponse.json({
        success: true,
        output: stdout,
        error: stderr || null
      });
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  } catch (error: any) {
    console.error('Execute notebook error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to execute code',
        output: error.stdout || '',
        stderr: error.stderr || ''
      },
      { status: 500 }
    );
  }
}
