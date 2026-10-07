create schema if not exists seh_match_tv_private;
create table public.seh_match_tv_chat (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 gamertag text not null,
 body text not null check(char_length(body) between 1 and 500),
 created_at timestamptz not null default now(),
 hidden_at timestamptz,
 hidden_by uuid
);
create index seh_match_tv_chat_recent on public.seh_match_tv_chat(created_at desc) where hidden_at is null;
create index seh_match_tv_chat_user_recent on public.seh_match_tv_chat(user_id,created_at desc);
alter table public.seh_match_tv_chat enable row level security;
revoke all on public.seh_match_tv_chat from anon,authenticated;
grant select(id,gamertag,body,created_at) on public.seh_match_tv_chat to anon,authenticated;
create policy chat_public_read on public.seh_match_tv_chat for select to anon,authenticated
 using(hidden_at is null and created_at > now()-interval '7 days');

create function seh_match_tv_private.chat_identity() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare gt text;
begin
 if auth.uid() is null then return jsonb_build_object('can_write',false,'is_admin',false); end if;
 select d.display_gamertag into gt
 from public.ehockey_discord_player_links l
 join public.app_account_player_directory_cache d on d.player_key=l.approved_player_key
 where l.user_id=auth.uid() and l.status='approved'
 and nullif(btrim(d.display_gamertag),'') is not null
 and exists(select 1 from auth.identities i where i.user_id=l.user_id and i.provider='discord' and i.provider_id=l.discord_user_id)
 limit 1;
 return jsonb_build_object('can_write',gt is not null,'gamertag',gt,
 'is_admin',coalesce(public.seh_current_writer_role()='admin',false));
end $$;
create function seh_match_tv_private.chat_send(p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare identity jsonb; message_id uuid; clean text:=btrim(p_body);
begin
 if auth.uid() is null then raise exception 'Logga in med Discord först.'; end if;
 identity:=seh_match_tv_private.chat_identity();
 if not coalesce((identity->>'can_write')::boolean,false) then raise exception 'Koppla Discord och gamertag till ett godkänt spelarkort först.'; end if;
 if clean is null or char_length(clean) not between 1 and 500 then raise exception 'Meddelandet måste innehålla 1–500 tecken.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,42));
 if exists(select 1 from public.seh_match_tv_chat where user_id=auth.uid() and created_at>clock_timestamp()-interval '5 seconds') then
 raise exception 'Vänta fem sekunder mellan meddelandena.';
 end if;
 insert into public.seh_match_tv_chat(user_id,gamertag,body)
 values(auth.uid(),identity->>'gamertag',clean) returning id into message_id;
 return message_id;
end $$;
create function seh_match_tv_private.chat_hide(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or public.seh_current_writer_role() is distinct from 'admin' then raise exception 'Endast admin kan dölja meddelanden.'; end if;
 update public.seh_match_tv_chat set hidden_at=now(),hidden_by=auth.uid() where id=p_id and hidden_at is null;
end $$;
revoke all on function seh_match_tv_private.chat_identity(),seh_match_tv_private.chat_send(text),seh_match_tv_private.chat_hide(uuid) from public,anon,authenticated;
grant usage on schema seh_match_tv_private to anon,authenticated;
grant execute on function seh_match_tv_private.chat_identity() to anon,authenticated;
grant execute on function seh_match_tv_private.chat_send(text),seh_match_tv_private.chat_hide(uuid) to authenticated;
create function public.seh_match_tv_chat_identity() returns jsonb language sql stable security invoker set search_path='' as $$ select seh_match_tv_private.chat_identity(); $$;
create function public.seh_match_tv_chat_send(p_body text) returns uuid language sql security invoker set search_path='' as $$ select seh_match_tv_private.chat_send(p_body); $$;
create function public.seh_match_tv_chat_hide(p_id uuid) returns void language sql security invoker set search_path='' as $$ select seh_match_tv_private.chat_hide(p_id); $$;
revoke all on function public.seh_match_tv_chat_identity(),public.seh_match_tv_chat_send(text),public.seh_match_tv_chat_hide(uuid) from public,anon,authenticated;
grant execute on function public.seh_match_tv_chat_identity() to anon,authenticated;
grant execute on function public.seh_match_tv_chat_send(text),public.seh_match_tv_chat_hide(uuid) to authenticated;
notify pgrst,'reload schema';
