import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAppleTransaction, isSubscriptionActive } from '../../_shared/appleIAP.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { provider, product_id, receipt_or_token } = await req.json();

    if (!provider || !product_id || !receipt_or_token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: provider, product_id, receipt_or_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (provider !== 'apple') {
      return new Response(
        JSON.stringify({ error: 'Only apple provider supported currently' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify StoreKit 2 signedPayload (JWS)
    const verifyResult = await verifyAppleTransaction(receipt_or_token);
    if (!verifyResult.valid || !verifyResult.transaction) {
      return new Response(
        JSON.stringify({ 
          status: 'inactive', 
          error: verifyResult.error || 'Invalid transaction',
          product_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = verifyResult.transaction;

    // Validate product ID matches expected
    if (transaction.productId !== product_id) {
      return new Response(
        JSON.stringify({ 
          status: 'inactive', 
          error: 'Product ID mismatch',
          product_id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if subscription is currently active
    const active = isSubscriptionActive(transaction);

    // Extract user_id from auth header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Update or create membership record if active
    if (userId && active) {
      const membershipData = {
        user_id: userId,
        status: 'active',
        apple_transaction_id: transaction.transactionId,
        apple_original_transaction_id: transaction.originalTransactionId,
        receipt_data: receipt_or_token,
        current_period_end: transaction.expiresDate 
          ? new Date(transaction.expiresDate).toISOString() 
          : null,
        updated_at: new Date().toISOString()
      };

      // Upsert membership (conflict on user_id)
      const { error: upsertError } = await supabase
        .from('club_memberships')
        .upsert(membershipData, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('[verify-subscription] Failed to update membership:', upsertError);
      }
    }

    // Return subscription status
    return new Response(
      JSON.stringify({
        status: active ? 'active' : 'inactive',
        product_id: transaction.productId,
        current_period_end: transaction.expiresDate 
          ? new Date(transaction.expiresDate).toISOString() 
          : null,
        transaction_id: transaction.transactionId,
        original_transaction_id: transaction.originalTransactionId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
