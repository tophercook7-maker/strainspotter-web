// supabase/functions/refresh-subscriptions/index.ts
// Cron job to periodically verify all active Apple subscriptions
// Schedule: daily via Supabase Cron or external scheduler

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAppleTransaction, isSubscriptionActive } from '../../_shared/appleIAP.ts';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active memberships with Apple receipts
    const { data: memberships, error: fetchError } = await supabase
      .from('club_memberships')
      .select('*')
      .eq('status', 'active')
      .not('apple_original_transaction_id', 'is', null);

    if (fetchError) {
      console.error('[refresh-subscriptions] Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    const results = {
      checked: 0,
      renewed: 0,
      expired: 0,
      errors: 0
    };

    // Verify each subscription
    for (const membership of (memberships || [])) {
      results.checked++;

      if (!membership.receipt_data) {
        console.warn(`[refresh-subscriptions] No receipt_data for user ${membership.user_id}`);
        continue;
      }

      try {
        const verifyResult = await verifyAppleTransaction(membership.receipt_data);
        
        if (!verifyResult.valid || !verifyResult.transaction) {
          // Mark as inactive
          await supabase
            .from('club_memberships')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('user_id', membership.user_id);
          results.expired++;
          continue;
        }

        const transaction = verifyResult.transaction;
        const active = isSubscriptionActive(transaction);

        if (!active) {
          // Mark as expired
          await supabase
            .from('club_memberships')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('user_id', membership.user_id);
          results.expired++;
        } else {
          // Update with latest transaction data
          await supabase
            .from('club_memberships')
            .update({
              apple_transaction_id: transaction.transactionId,
              current_period_end: transaction.expiresDate 
                ? new Date(transaction.expiresDate).toISOString() 
                : null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', membership.user_id);
          results.renewed++;
        }
      } catch (e) {
        console.error(`[refresh-subscriptions] Error for user ${membership.user_id}:`, e);
        results.errors++;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      timestamp: new Date().toISOString(),
      results
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[refresh-subscriptions] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
