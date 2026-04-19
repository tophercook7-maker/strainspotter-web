# Apple In-App Purchase Integration Guide

## Overview
StrainSpotter uses **StoreKit 2** for iOS subscriptions with server-side verification via Supabase Edge Functions.

Product ID: `ss_premium_monthly`

## iOS Implementation (Swift/StoreKit 2)

### 1. Setup StoreKit

\`\`\`swift
import StoreKit

class SubscriptionManager: ObservableObject {
    @Published var isSubscribed = false
    private var updateListenerTask: Task<Void, Error>?
    
    init() {
        // Listen for transaction updates
        updateListenerTask = listenForTransactions()
    }
    
    func listenForTransactions() -> Task<Void, Error> {
        return Task.detached {
            for await result in Transaction.updates {
                do {
                    let transaction = try self.checkVerified(result)
                    await self.updateSubscriptionStatus()
                    await transaction.finish()
                } catch {
                    print("Transaction failed verification: \(error)")
                }
            }
        }
    }
    
    func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.failedVerification
        case .verified(let safe):
            return safe
        }
    }
}
\`\`\`

### 2. Purchase Flow

\`\`\`swift
func purchase(productId: String = "ss_premium_monthly") async throws {
    // Fetch product
    let products = try await Product.products(for: [productId])
    guard let product = products.first else {
        throw StoreError.productNotFound
    }
    
    // Start purchase
    let result = try await product.purchase()
    
    switch result {
    case .success(let verification):
        let transaction = try checkVerified(verification)
        
        // Send to backend for verification
        await verifyWithBackend(transaction: transaction)
        
        await transaction.finish()
        await updateSubscriptionStatus()
        
    case .userCancelled, .pending:
        break
    @unknown default:
        break
    }
}
\`\`\`

### 3. Backend Verification

\`\`\`swift
func verifyWithBackend(transaction: Transaction) async {
    guard let signedPayload = transaction.jsonRepresentation.data(using: .utf8),
          let jws = String(data: signedPayload, encoding: .utf8) else {
        print("Failed to get JWS from transaction")
        return
    }
    
    // Get auth token
    guard let authToken = await getSupabaseAuthToken() else {
        print("No auth token")
        return
    }
    
    let url = URL(string: "https://YOUR-PROJECT-REF.supabase.co/functions/v1/verify-subscription")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = [
        "provider": "apple",
        "product_id": "ss_premium_monthly",
        "receipt_or_token": jws
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    do {
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(SubscriptionResponse.self, from: data)
        
        if response.status == "active" {
            print("Subscription verified: \(response)")
            await updateLocalSubscriptionStatus(active: true)
        } else {
            print("Subscription inactive: \(response.error ?? "unknown")")
        }
    } catch {
        print("Backend verification failed: \(error)")
    }
}

struct SubscriptionResponse: Codable {
    let status: String // "active" or "inactive"
    let product_id: String
    let current_period_end: String?
    let transaction_id: String?
    let original_transaction_id: String?
    let error: String?
}
\`\`\`

### 4. Check Subscription Status

\`\`\`swift
func updateSubscriptionStatus() async {
    // Check for active subscription
    guard let result = await Transaction.currentEntitlement(for: "ss_premium_monthly") else {
        isSubscribed = false
        return
    }
    
    guard case .verified(let transaction) = result else {
        isSubscribed = false
        return
    }
    
    // Verify with backend
    await verifyWithBackend(transaction: transaction)
    
    isSubscribed = true
}
\`\`\`

## Backend API

### Endpoint: \`verify-subscription\`

**URL**: \`https://YOUR-PROJECT-REF.supabase.co/functions/v1/verify-subscription\`

**Method**: POST

**Headers**:
- \`Authorization: Bearer <supabase_user_token>\`
- \`Content-Type: application/json\`

**Body**:
\`\`\`json
{
  "provider": "apple",
  "product_id": "ss_premium_monthly",
  "receipt_or_token": "<StoreKit 2 JWS signedPayload>"
}
\`\`\`

**Response** (200 OK):
\`\`\`json
{
  "status": "active",
  "product_id": "ss_premium_monthly",
  "current_period_end": "2025-11-21T12:00:00.000Z",
  "transaction_id": "2000000123456789",
  "original_transaction_id": "2000000123456789"
}
\`\`\`

**Response** (inactive):
\`\`\`json
{
  "status": "inactive",
  "product_id": "ss_premium_monthly",
  "error": "Subscription expired"
}
\`\`\`

## Database Schema

The \`club_memberships\` table tracks subscription state:

\`\`\`sql
CREATE TABLE club_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  apple_transaction_id TEXT,
  apple_original_transaction_id TEXT,
  receipt_data TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

## Subscription Refresh

A cron job (\`refresh-subscriptions\`) runs daily to:
1. Fetch all active memberships with Apple receipts
2. Re-verify each receipt with stored JWS
3. Update status to \`inactive\` if expired
4. Update \`current_period_end\` if renewed

**Invoke manually**:
\`\`\`bash
curl -X POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/refresh-subscriptions \\
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
\`\`\`

## Testing

### Sandbox Environment
- Use Apple's Sandbox environment during development
- Create sandbox testers in App Store Connect
- Subscriptions renew every few minutes in sandbox

### Test Flow
1. Sign in with sandbox Apple ID on device
2. Purchase \`ss_premium_monthly\`
3. Verify the transaction JWS is sent to backend
4. Check \`club_memberships\` table for updated record
5. Confirm app shows active subscription status

## Production Checklist

- [ ] Enable "Paid Applications" in App Store Connect
- [ ] Create \`ss_premium_monthly\` product in App Store Connect
- [ ] Run migration: \`backend/migrations/2025_10_21_apple_iap_fields.sql\`
- [ ] Deploy Edge Functions: \`verify-subscription\`, \`refresh-subscriptions\`
- [ ] Set up Supabase Cron for daily refresh
- [ ] Test end-to-end with TestFlight + sandbox
- [ ] Monitor subscription status in Supabase dashboard

## Security Notes

- **JWS Verification**: MVP parses the Apple-signed JWS. For production, add full x5c certificate chain validation.
- **Server API**: Integrate Apple's App Store Server API for live status queries.
- **RLS**: Use Supabase RLS to restrict \`club_memberships\` access.
