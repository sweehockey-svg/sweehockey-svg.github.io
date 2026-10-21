-- All fixtures and moderation changes are rolled back. No public test posts remain.
begin;
select set_config('request.headers','{"x-forwarded-for":"203.0.113.77"}',true);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare message_id uuid; begin
 message_id:=public.seh_match_tv_chat_guest_send(repeat('a',64),'Testgäst','TEST – privat modereringskö');
 perform set_config('test.chat_id',message_id::text,true);
 if exists(select 1 from jsonb_array_elements(public.seh_match_tv_chat_list()) x where x->>'id'=message_id::text) then raise exception 'FAIL pending message leaked'; end if;
 begin perform public.seh_match_tv_chat_moderation(); raise exception 'FAIL anonymous moderation'; exception when insufficient_privilege then null; end;
 begin perform count(*) from seh_match_tv_private.guest_messages; raise exception 'FAIL private rows exposed'; exception when insufficient_privilege then null; end;
 begin perform public.seh_match_tv_chat_guest_send(repeat('a',64),'Annat namn','spam'); raise exception 'FAIL rate limit'; exception when others then if sqlerrm not like '%15 sekunder%' then raise; end if; end;
 begin perform public.seh_match_tv_chat_guest_send('short','Testgäst','invalid'); raise exception 'FAIL invalid token'; exception when others then if sqlerrm not like '%Gäst-ID%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set local role authenticated;
do $$ begin
 begin perform public.seh_match_tv_chat_moderate(current_setting('test.chat_id')::uuid,'guest','approve',24); raise exception 'FAIL nonadmin approval'; exception when others then if sqlerrm not like '%Endast admin%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select auth_uid::text from public.seh_news_code_writers where active and role='admin' and auth_uid is not null limit 1),true);
set local role authenticated;
do $$ declare mid uuid:=current_setting('test.chat_id')::uuid; ban_id uuid; begin
 if not exists(select 1 from jsonb_array_elements(public.seh_match_tv_chat_moderation()->'pending') x where x->>'id'=mid::text) then raise exception 'FAIL admin queue'; end if;
 perform public.seh_match_tv_chat_moderate(mid,'guest','approve',24);
 if not exists(select 1 from jsonb_array_elements(public.seh_match_tv_chat_list()) x where x->>'id'=mid::text and x->>'sender_kind'='guest' and not(x ? 'ip_hash') and not(x ? 'guest_hash')) then raise exception 'FAIL approved public guest'; end if;
 perform public.seh_match_tv_chat_moderate(mid,'guest','hide',24);
 if exists(select 1 from jsonb_array_elements(public.seh_match_tv_chat_list()) x where x->>'id'=mid::text) then raise exception 'FAIL hide'; end if;
 perform public.seh_match_tv_chat_moderate(mid,'guest','block',1);
 begin perform public.seh_match_tv_chat_guest_send(repeat('a',64),'Changed name','blocked'); raise exception 'FAIL browser ban'; exception when others then if sqlerrm not like '%blockerad%' then raise; end if; end;
 select (x->>'id')::uuid into ban_id from jsonb_array_elements(public.seh_match_tv_chat_moderation()->'bans') x where x->>'kind'='guest' and x->>'label'='Testgäst';
 perform public.seh_match_tv_chat_moderate(ban_id,'guest','unblock',1);
 perform public.seh_match_tv_chat_moderate(mid,'guest','block_ip',1);
 begin perform public.seh_match_tv_chat_guest_send(repeat('b',64),'New browser','blocked network'); raise exception 'FAIL IP ban'; exception when others then if sqlerrm not like '%blockerad%' then raise; end if; end;
 select (x->>'id')::uuid into ban_id from jsonb_array_elements(public.seh_match_tv_chat_moderation()->'bans') x where x->>'kind'='ip' and x->>'label'='Gästnät · Testgäst';
 perform public.seh_match_tv_chat_moderate(ban_id,'guest','unblock',1);
 perform public.seh_match_tv_chat_guest_send(repeat('c',64),'After unblock','pending after unblock');
end $$;
reset role;
do $$ declare mid uuid; admin_uid uuid:=auth.uid(); begin
 insert into public.seh_match_tv_chat(user_id,gamertag,body) values(admin_uid,'Testkonto','TEST account block') returning id into mid;
 perform public.seh_match_tv_chat_moderate(mid,'account','block',1);
 begin perform public.seh_match_tv_chat_send('blocked account'); raise exception 'FAIL account ban'; exception when others then if sqlerrm not like '%blockerat%' then raise; end if; end;
end $$;
select 'PASS pending privacy, anonymous/nonadmin denials, rate limit, validation, approve/hide, guest/IP/account blocks and unblock' as result;
rollback;
