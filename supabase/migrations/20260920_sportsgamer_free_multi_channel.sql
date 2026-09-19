-- Allow the SportsGamer !f bot to run in multiple Discord channels.
-- Each channel keeps its own cursor and polling state.

alter table public.sportsgamer_discord_free_command_config
  drop constraint if exists sportsgamer_discord_free_command_config_id_check;

create sequence if not exists public.sportsgamer_discord_free_command_config_id_seq
  as smallint;

select setval(
  'public.sportsgamer_discord_free_command_config_id_seq',
  greatest(coalesce((select max(id) from public.sportsgamer_discord_free_command_config),1),1),
  true
);

alter sequence public.sportsgamer_discord_free_command_config_id_seq
  owned by public.sportsgamer_discord_free_command_config.id;

alter table public.sportsgamer_discord_free_command_config
  alter column id set default nextval('public.sportsgamer_discord_free_command_config_id_seq');

create unique index if not exists sportsgamer_discord_free_command_config_channel_uidx
  on public.sportsgamer_discord_free_command_config(channel_id)
  where channel_id is not null;

revoke all on public.sportsgamer_discord_free_command_config from anon, authenticated;
grant select, insert, update, delete on public.sportsgamer_discord_free_command_config to service_role;
grant usage, select on sequence public.sportsgamer_discord_free_command_config_id_seq to service_role;

notify pgrst,'reload schema';
