
insert into public.sportsgamer_discord_free_command_config
  (enabled,channel_id,last_message_id,last_polled_at,last_error,updated_at,activated_at)
values
  (true,'1029039731427778631',null,null,null,now(),now())
on conflict (channel_id) where channel_id is not null
do update set
  enabled=true,
  last_message_id=null,
  last_error=null,
  updated_at=now(),
  activated_at=now();
