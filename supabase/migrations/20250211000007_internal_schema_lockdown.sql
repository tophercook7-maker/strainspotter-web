-- RLS plan B: internal schema + lock down (anon/authenticated have no access; service_role only)
-- Run before moving auth-exposing views into internal (00006).

create schema if not exists internal;

revoke all on schema internal from anon, authenticated;
revoke all on all tables in schema internal from anon, authenticated;
revoke all on all sequences in schema internal from anon, authenticated;
revoke all on all functions in schema internal from anon, authenticated;
