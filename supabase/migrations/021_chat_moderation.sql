-- 021_chat_moderation.sql
--
-- Moderation support for community group chat (Chat phase 2).
-- muted_until: a moderator mute — the user can still read the group but
-- cannot post until the timestamp passes. Kick/remove is a participant-row
-- delete (no column needed). Message hiding uses the existing
-- chat_messages.hidden flag from 015_garden_messaging.

alter table public.chat_participants
  add column if not exists muted_until timestamptz;
