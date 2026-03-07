-- Remediation: auth_users_exposed
-- Move views that reference auth.users out of public so PostgREST won't expose them.
-- Run in Supabase SQL Editor or via: supabase db push

create schema if not exists internal;

alter view if exists public.v_scan_credit_summary_moderator set schema internal;
alter view if exists public.user_credit_balance set schema internal;
alter view if exists public.v_chat_messages set schema internal;
alter view if exists public.v_chat_messages_enriched set schema internal;

-- Lock down internal: anon and authenticated must not access it (service_role only).
revoke all on schema internal from anon, authenticated;
revoke all on all tables in schema internal from anon, authenticated;
revoke all on all sequences in schema internal from anon, authenticated;
revoke all on all functions in schema internal from anon, authenticated;
