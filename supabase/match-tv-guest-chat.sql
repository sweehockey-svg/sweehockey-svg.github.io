-- Guest queue and moderation. Existing account messages remain unchanged.
begin;
create table if not exists seh_match_tv_private.chat_secret(id boolean primary key default true check(id), secret bytea not null);
insert into seh_match_tv_private.chat_secret(id,secret) values(true,extensions.gen_random_bytes(32)) on conflict do nothing;
create table if not exists seh_match_tv_private.guest_messages(
 id uuid primary key default gen_random_uuid(), guest_hash text not null, ip_hash text,
 gamertag text not null check(char_length(gamertag) between 2 and 40),
 body text not null check(char_length(body) between 1 and 500),
 status text not null default 'pending' check(status in ('pending','approved','rejected','hidden')),
 created_at timestamptz not null default clock_timestamp(), reviewed_at timestamptz, reviewed_by uuid
);
create index if not exists chat_guest_sender_time on seh_match_tv_private.guest_messages(guest_hash,created_at desc);
create index if not exists chat_guest_ip_time on seh_match_tv_private.guest_messages(ip_hash,created_at desc);
create index if not exists chat_guest_queue on seh_match_tv_private.guest_messages(status,created_at desc);
create table if not exists seh_match_tv_private.chat_bans(
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('account','guest','ip')),
 subject text not null, label text not null, expires_at timestamptz not null,
 created_at timestamptz not null default now(),created_by uuid not null,
 unique(kind,subject)
);
alter table seh_match_tv_private.chat_secret enable row level security;
alter table seh_match_tv_private.guest_messages enable row level security;
alter table seh_match_tv_private.chat_bans enable row level security;
revoke all on seh_match_tv_private.chat_secret,seh_match_tv_private.guest_messages,seh_match_tv_private.chat_bans from public,anon,authenticated;
create policy chat_secret_no_client on seh_match_tv_private.chat_secret for all to anon,authenticated using(false) with check(false);
create policy chat_guests_no_client on seh_match_tv_private.guest_messages for all to anon,authenticated using(false) with check(false);
create policy chat_bans_no_client on seh_match_tv_private.chat_bans for all to anon,authenticated using(false) with check(false);

create or replace function seh_match_tv_private.chat_is_blocked(p_kind text,p_subject text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from seh_match_tv_private.chat_bans where kind=p_kind and subject=p_subject and expires_at>now());
$$;
revoke all on function seh_match_tv_private.chat_is_blocked(text,text) from public,anon,authenticated;

create or replace function seh_match_tv_private.chat_guest_send(p_token text,p_name text,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare gh text; ih text; ip text; name text:=btrim(p_name); body text:=btrim(p_body); result uuid;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Gäst-ID saknas. Ladda om sidan.'; end if;
 if name is null or char_length(name) not between 2 and 40 or name ~ '[[:cntrl:]]' or lower(name) in ('admin','moderator','swnworks','svensk ehockey') then raise exception 'Välj ett namn med 2–40 tecken, inte ett administratörsnamn.'; end if;
 if body is null or char_length(body) not between 1 and 500 then raise exception 'Skriv 1–500 tecken.'; end if;
 if auth.uid() is not null and seh_match_tv_private.chat_is_blocked('account',auth.uid()::text) then raise exception 'Ditt konto är blockerat från chatten.'; end if;
 gh:=encode(extensions.digest(p_token,'sha256'),'hex');
 -- Supabase's gateway supplies forwarded client IP. This is supplementary anti-abuse,
 -- never an identity claim; guests always require moderation even if it is absent.
 ip:=btrim(split_part(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for',''),',',1));
 begin ip:=host(ip::inet); exception when others then ip:=''; end;
 if ip<>'' then select encode(extensions.hmac(convert_to(ip,'UTF8'),secret,'sha256'),'hex') into ih from seh_match_tv_private.chat_secret where id; end if;
 if ih is not null then perform pg_advisory_xact_lock(hashtextextended('chat-ip:'||ih,18)); end if;
 perform pg_advisory_xact_lock(hashtextextended('chat-guest:'||gh,18));
 if seh_match_tv_private.chat_is_blocked('guest',gh) or (ih is not null and seh_match_tv_private.chat_is_blocked('ip',ih)) then raise exception 'Du är tillfälligt blockerad från gästchatten.'; end if;
 if exists(select 1 from seh_match_tv_private.guest_messages where guest_hash=gh and created_at>clock_timestamp()-interval '15 seconds') then raise exception 'Vänta 15 sekunder mellan gästmeddelanden.'; end if;
 if (select count(*) from seh_match_tv_private.guest_messages where guest_hash=gh and created_at>now()-interval '10 minutes')>=10 or
    (select count(*) from seh_match_tv_private.guest_messages where guest_hash=gh and status='pending' and created_at>now()-interval '1 day')>=5 or
    (ih is not null and (select count(*) from seh_match_tv_private.guest_messages where ip_hash=ih and created_at>now()-interval '10 minutes')>=30) then raise exception 'För många meddelanden. Vänta innan du försöker igen.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('chat-queue-capacity',18));
 if (select count(*) from seh_match_tv_private.guest_messages where status='pending' and created_at>now()-interval '1 day')>=1000 then raise exception 'Gästkön är full just nu. Försök senare.'; end if;
 insert into seh_match_tv_private.guest_messages(guest_hash,ip_hash,gamertag,body) values(gh,ih,name,body) returning id into result;
 return result;
end $$;

create or replace function seh_match_tv_private.chat_list() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc,m.id),'[]'::jsonb) from (
  select * from (
   select id,gamertag,body,created_at,'account'::text as sender_kind from public.seh_match_tv_chat where hidden_at is null and created_at>now()-interval '7 days'
   union all
   select id,gamertag,body,created_at,'guest'::text from seh_match_tv_private.guest_messages where status='approved' and created_at>now()-interval '7 days'
  ) messages order by created_at desc,id limit 100
 ) m;
$$;

create or replace function seh_match_tv_private.chat_moderation() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.seh_current_writer_role() is distinct from 'admin' then raise exception 'Endast admin kan moderera.'; end if;
 return jsonb_build_object('pending',coalesce((select jsonb_agg(to_jsonb(m) order by created_at) from (select id,gamertag,body,created_at,ip_hash is not null as can_block_ip from seh_match_tv_private.guest_messages where status='pending' and created_at>now()-interval '1 day' order by created_at limit 100) m),'[]'::jsonb),
 'bans',coalesce((select jsonb_agg(to_jsonb(b) order by expires_at desc) from (select id,kind,label,expires_at from seh_match_tv_private.chat_bans where expires_at>now()) b),'[]'::jsonb));
end $$;

create or replace function seh_match_tv_private.chat_moderate(p_id uuid,p_source text,p_action text,p_hours integer default 24) returns void
language plpgsql security definer set search_path='' as $$
declare g seh_match_tv_private.guest_messages; subject text; kind text; label text;
begin
 if auth.uid() is null or public.seh_current_writer_role() is distinct from 'admin' then raise exception 'Endast admin kan moderera.'; end if;
 if p_action='unblock' then delete from seh_match_tv_private.chat_bans where id=p_id; return; end if;
 if p_source not in ('guest','account') or p_source is null then raise exception 'Ogiltig källa.'; end if;
 if p_source='guest' then
  select * into g from seh_match_tv_private.guest_messages where id=p_id for update;
  if g.id is null then raise exception 'Meddelandet finns inte längre.'; end if;
  if p_action='approve' then
   if g.status<>'pending' or g.created_at<=now()-interval '1 day' then raise exception 'Meddelandet väntar inte längre på godkännande.'; end if;
   if seh_match_tv_private.chat_is_blocked('guest',g.guest_hash) or (g.ip_hash is not null and seh_match_tv_private.chat_is_blocked('ip',g.ip_hash)) then raise exception 'Avsändaren är blockerad.'; end if;
   update seh_match_tv_private.guest_messages set status='approved',reviewed_at=now(),reviewed_by=auth.uid() where id=p_id;return;
  elsif p_action in ('reject','hide') then
   update seh_match_tv_private.guest_messages set status=case when p_action='reject' then 'rejected' else 'hidden' end,reviewed_at=now(),reviewed_by=auth.uid() where id=p_id;return;
  elsif p_action='block' then subject:=g.guest_hash;kind:='guest';label:=g.gamertag;
  elsif p_action='block_ip' then subject:=g.ip_hash;kind:='ip';label:='Gästnät · '||g.gamertag;
  else raise exception 'Ogiltig åtgärd.'; end if;
 else
  if p_action='hide' then perform seh_match_tv_private.chat_hide(p_id);return; end if;
  if p_action<>'block' then raise exception 'Ogiltig kontoåtgärd.'; end if;
  select user_id::text,gamertag into subject,label from public.seh_match_tv_chat where id=p_id;
  kind:='account';
 end if;
 if subject is null then raise exception 'Blockering saknar avsändare eller nätadress.'; end if;
 if p_hours not in (1,24,168) or p_hours is null then raise exception 'Välj 1 timme, 24 timmar eller 7 dagar.'; end if;
 insert into seh_match_tv_private.chat_bans(kind,subject,label,expires_at,created_by) values(kind,subject,label,now()+make_interval(hours=>p_hours),auth.uid())
 on conflict on constraint chat_bans_kind_subject_key do update set expires_at=excluded.expires_at,created_by=excluded.created_by,label=excluded.label;
 if kind='account' then
  update public.seh_match_tv_chat set hidden_at=now(),hidden_by=auth.uid() where id=p_id;
 else
  update seh_match_tv_private.guest_messages set status=case when status='pending' then 'rejected' else 'hidden' end,reviewed_at=now(),reviewed_by=auth.uid()
   where (kind='guest' and guest_hash=subject or kind='ip' and ip_hash=subject) and (status='pending' or id=p_id);
 end if;
end $$;

-- Keep the existing account validation, and check blocks on every account send.
create or replace function seh_match_tv_private.chat_send(p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare identity jsonb; message_id uuid; clean text:=btrim(p_body);
begin
 if auth.uid() is null then raise exception 'Logga in med Discord först.'; end if;
 if seh_match_tv_private.chat_is_blocked('account',auth.uid()::text) then raise exception 'Ditt konto är blockerat från chatten.'; end if;
 identity:=seh_match_tv_private.chat_identity();
 if not coalesce((identity->>'can_write')::boolean,false) then raise exception 'Koppla Discord och gamertag till ett godkänt spelarkort först.'; end if;
 if clean is null or char_length(clean) not between 1 and 500 then raise exception 'Meddelandet måste innehålla 1–500 tecken.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,42));
 if exists(select 1 from public.seh_match_tv_chat where user_id=auth.uid() and created_at>clock_timestamp()-interval '5 seconds') then raise exception 'Vänta fem sekunder mellan meddelandena.'; end if;
 insert into public.seh_match_tv_chat(user_id,gamertag,body) values(auth.uid(),identity->>'gamertag',clean) returning id into message_id;
 return message_id;
end $$;

create or replace function public.seh_match_tv_chat_guest_send(p_token text,p_name text,p_body text) returns uuid language sql set search_path='' as $$ select seh_match_tv_private.chat_guest_send(p_token,p_name,p_body); $$;
create or replace function public.seh_match_tv_chat_list() returns jsonb language sql stable set search_path='' as $$ select seh_match_tv_private.chat_list(); $$;
create or replace function public.seh_match_tv_chat_moderation() returns jsonb language sql stable set search_path='' as $$ select seh_match_tv_private.chat_moderation(); $$;
create or replace function public.seh_match_tv_chat_moderate(p_id uuid,p_source text,p_action text,p_hours integer default 24) returns void language sql set search_path='' as $$ select seh_match_tv_private.chat_moderate(p_id,p_source,p_action,p_hours); $$;
revoke all on function public.seh_match_tv_chat_guest_send(text,text,text),public.seh_match_tv_chat_list(),public.seh_match_tv_chat_moderation(),public.seh_match_tv_chat_moderate(uuid,text,text,integer) from public,anon,authenticated;
revoke all on function seh_match_tv_private.chat_guest_send(text,text,text),seh_match_tv_private.chat_list(),seh_match_tv_private.chat_moderation(),seh_match_tv_private.chat_moderate(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.seh_match_tv_chat_guest_send(text,text,text),public.seh_match_tv_chat_list(),seh_match_tv_private.chat_guest_send(text,text,text),seh_match_tv_private.chat_list() to anon,authenticated;
grant execute on function public.seh_match_tv_chat_moderation(),public.seh_match_tv_chat_moderate(uuid,text,text,integer),seh_match_tv_private.chat_moderation(),seh_match_tv_private.chat_moderate(uuid,text,text,integer) to authenticated;

create or replace function seh_match_tv_private.chat_cleanup() returns void language sql security definer set search_path='' as $$
 delete from seh_match_tv_private.guest_messages where created_at<now()-interval '7 days';
 delete from seh_match_tv_private.chat_bans where expires_at<now();
$$;
revoke all on function seh_match_tv_private.chat_cleanup() from public,anon,authenticated;
select cron.schedule('match-tv-guest-chat-cleanup','17 3 * * *','select seh_match_tv_private.chat_cleanup()') where not exists(select 1 from cron.job where jobname='match-tv-guest-chat-cleanup');
commit;
