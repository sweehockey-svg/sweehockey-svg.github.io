-- Server-only storage. Browser requests use the capability-protected Edge Function.
create table public.seh_web_push_keys (
  id integer primary key check (id = 1),
  public_key text not null,
  private_key text not null
);
create table public.seh_web_push_subscriptions (
  id text primary key check (length(id) = 64),
  endpoint text not null unique,
  subscription jsonb not null,
  topics text[] not null,
  updated_at timestamptz not null default now()
);
alter table public.seh_web_push_keys enable row level security;
alter table public.seh_web_push_subscriptions enable row level security;
revoke all on public.seh_web_push_keys, public.seh_web_push_subscriptions from public, anon, authenticated;
grant select, insert on public.seh_web_push_keys to service_role;
grant select, insert, update, delete on public.seh_web_push_subscriptions to service_role;

-- Independent webhook: no changes to the existing Android trigger or sender.
create or replace function seh_internal.dispatch_news_web_push()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'seh_push_webhook_secret' limit 1;
  if coalesce(v_secret, '') = '' then return new; end if;
  perform net.http_post(
    url := 'https://oujqnvrczdavqbqaavuh.supabase.co/functions/v1/web-push/send',
    headers := jsonb_build_object('content-type', 'application/json', 'x-seh-push-secret', v_secret),
    body := jsonb_build_object('type', 'UPDATE', 'table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(new), 'old_record', to_jsonb(old)),
    timeout_milliseconds := 10000
  );
  return new;
end; $$;
revoke all on function seh_internal.dispatch_news_web_push() from public, anon, authenticated;
create trigger seh_news_articles_web_push after update of status on public.seh_news_articles
for each row when (new.status = 'published' and old.status is distinct from new.status)
execute function seh_internal.dispatch_news_web_push();
