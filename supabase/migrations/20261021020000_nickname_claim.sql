-- 닉네임 선점: 처음 기록을 올린 브라우저의 비밀 열쇠(복구 코드)만 그 닉네임으로 올릴 수 있음
-- 열쇠는 해시(sha256)만 저장. 기존 기록이 있어도 아직 선점 안 된 닉네임은 다음에 올리는 사람이 선점

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.nicknames (
  key text primary key,            -- lower(btrim(nickname))
  token_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.nicknames enable row level security;
revoke all on public.nicknames from anon, authenticated;

-- 'free' (아무도 안 씀) · 'mine' (이 열쇠의 주인) · 'taken' (남의 닉네임)
create or replace function public.check_nickname(p_nickname text, p_token text)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  h text;
begin
  select token_hash into h from nicknames where key = lower(btrim(p_nickname));
  if not found then
    return 'free';
  end if;
  if p_token is not null and h = encode(digest(p_token, 'sha256'), 'hex') then
    return 'mine';
  end if;
  return 'taken';
end;
$$;
revoke all on function public.check_nickname from public;
grant execute on function public.check_nickname to anon, authenticated;

drop function if exists public.submit_score(text, text, int, numeric, int, int);

create function public.submit_score(
  p_nickname text, p_mode text, p_cpm int, p_accuracy numeric, p_items int, p_duration_ms int, p_token text
) returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  k text := lower(btrim(p_nickname));
  h text;
  recent int;
  new_id bigint;
begin
  if p_token is null or char_length(p_token) < 12 then
    raise exception 'token required';
  end if;
  select token_hash into h from nicknames where key = k;
  if not found then
    insert into nicknames (key, token_hash) values (k, encode(digest(p_token, 'sha256'), 'hex'));
  elsif h <> encode(digest(p_token, 'sha256'), 'hex') then
    raise exception 'nickname taken';
  end if;
  select count(*) into recent from scores
   where lower(nickname) = k and created_at > now() - interval '1 minute';
  if recent >= 5 then
    raise exception 'too many submissions';
  end if;
  insert into scores (nickname, mode, cpm, accuracy, items, duration_ms, score)
  values (btrim(p_nickname), p_mode, p_cpm, round(p_accuracy, 2), p_items, p_duration_ms,
          round(p_cpm * power(least(greatest(p_accuracy, 0), 100) / 100.0, 2)))
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.submit_score from public;
grant execute on function public.submit_score to anon, authenticated;
