-- Forced/free replacements are part of transfer_count, but they must not consume
-- free transfers or create paid transfers. Keep the event check aligned with
-- seh_fantasy_save_my_team() which records them separately.
alter table public.ehockey_fantasy_transfer_events
  drop constraint if exists ehockey_fantasy_transfer_event_counts_chk;

alter table public.ehockey_fantasy_transfer_events
  add constraint ehockey_fantasy_transfer_event_counts_chk
  check (
    transfer_count >= 0
    and forced_replacement_count >= 0
    and free_used >= 0
    and paid_count >= 0
    and forced_replacement_count <= transfer_count
    and transfer_count = forced_replacement_count + free_used + paid_count
  );
