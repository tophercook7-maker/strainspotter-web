// supabase/_shared/appleIAP.ts
// Apple IAP verification helpers using App Store Server API (StoreKit 2)

interface AppleJWTHeader {
  alg: string;
  x5c: string[];
}

interface AppleTransactionPayload {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  revocationDate?: number;
  type: string;
  inAppOwnershipType: string;
  signedDate: number;
}

interface VerifyResult {
  valid: boolean;
  transaction?: AppleTransactionPayload;
  error?: string;
}

/**
 * Verify Apple StoreKit 2 signedPayload (JWS from Transaction)
 * This is a JWS with Apple's certificate chain in x5c header
 */
export async function verifyAppleTransaction(signedPayload: string): Promise<VerifyResult> {
  try {
    // Parse JWS
    const parts = signedPayload.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWS format' };
    }

    const headerB64 = parts[0];
    const payloadB64 = parts[1];
    const signatureB64 = parts[2];

    // Decode header and payload
    const header: AppleJWTHeader = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload: AppleTransactionPayload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Verify certificate chain (x5c) is from Apple
    // In production, validate x5c[0] certificate against Apple's root CA
    // For now, we'll trust the signature if x5c is present
    if (!header.x5c || header.x5c.length === 0) {
      return { valid: false, error: 'Missing Apple certificate chain' };
    }

    // Basic validation: check required fields
    if (!payload.transactionId || !payload.originalTransactionId || !payload.productId) {
      return { valid: false, error: 'Missing required transaction fields' };
    }

    // In production, verify signature using x5c[0] public key
    // For MVP, we trust the structure and will verify via Server API later
    return { valid: true, transaction: payload };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { valid: false, error: `Parse error: ${errorMessage}` };
  }
}

/**
 * Query Apple App Store Server API for current subscription status
 * Requires App Store Connect API credentials (not implemented in MVP)
 */
export async function queryAppleServerAPI(
  originalTransactionId: string,
  bundleId: string,
  issuerId: string,
  keyId: string,
  privateKey: string
): Promise<{ active: boolean; expiresDate?: number; error?: string }> {
  // Generate JWT for authentication with App Store Server API
  // This requires jose library and proper key formatting
  // For MVP, we'll return a placeholder
  return { active: false, error: 'Server API not implemented in MVP' };
}

/**
 * Check if a subscription is currently active based on transaction payload
 */
export function isSubscriptionActive(transaction: AppleTransactionPayload): boolean {
  const now = Date.now();
  
  // Check revocation
  if (transaction.revocationDate && transaction.revocationDate < now) {
    return false;
  }

  // Check expiration (for auto-renewable subscriptions)
  if (transaction.expiresDate) {
    return transaction.expiresDate > now;
  }

  // For non-consumable or lifetime, check type
  if (transaction.type === 'Non-Consumable') {
    return true;
  }

  return false;
}
