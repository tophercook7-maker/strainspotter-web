// @ts-nocheck
// ================================================
// STEP 3.2: BLOCK SCANS BASED ON CREDITS
// ================================================
import { supabase } from './supabase';

export type ScanKind = 'local' | 'doctor';

export interface ScanGuardResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  details?: any;
}

/**
 * Check if a user can perform a scan based on their credits
 * @param uid - User ID (UUID)
 * @param kind - Type of scan to check ('local' or 'doctor')
 * @returns Promise with scan permission result
 */
export async function checkScanGuard(
  uid: string,
  kind: ScanKind
): Promise<ScanGuardResult> {
  try {
    const { data, error } = await supabase.rpc('can_user_scan', {
      uid,
      scan_kind: kind,
    });

    if (error) {
      return {
        allowed: false,
        reason: 'db_error',
        details: error,
      };
    }

    return data; // { allowed, reason?, remaining? }
  } catch (err: any) {
    return {
      allowed: false,
      reason: 'exception',
      details: err?.message || 'Unknown error',
    };
  }
}

/**
 * Get user-friendly error message for scan guard reasons
 */
export function getScanErrorMessage(reason?: string): string {
  const messages: Record<string, string> = {
    no_membership:
      'No active membership found. Please subscribe to continue scanning.',
    no_credit_record:
      'Credit record not found. Please contact support.',
    no_local_scans_left:
      'No local scans remaining. Your credits will renew on your next billing cycle.',
    no_doctor_scans_left:
      'No doctor scans remaining. Your credits will renew on your next billing cycle.',
    invalid_scan_kind: 'Invalid scan type specified.',
    db_error: 'Database error occurred. Please try again later.',
    exception: 'An error occurred while checking scan permissions.',
  };

  return messages[reason || ''] || 'Unable to perform scan at this time.';
}

/**
 * Deduct scan credit after a successful scan
 * @param uid - User ID (UUID)
 * @param kind - Type of scan that was performed ('local' or 'doctor')
 * @returns Promise that resolves when credit is deducted
 */
export async function deductScanCredit(
  uid: string,
  kind: ScanKind
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('deduct_scan_credit', {
      uid,
      scan_kind: kind,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unknown error',
    };
  }
}
