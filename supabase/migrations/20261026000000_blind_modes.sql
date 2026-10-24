-- 블라인드 모드 랭킹 따로 (모드 이름 앞에 'b-': b-ko-word, b-m-en-sentence …)
alter table public.scores drop constraint if exists scores_mode_check;
alter table public.scores add constraint scores_mode_check check (
  mode ~ '^(b-)?(m-)?(ko|en)-(word|sentence)$'
);

create or replace function public.start_round(p_mode text, p_term text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text; v_cat text; v_lang text; v_kind text; v_term text; v_n int; v_items text[]; v_id uuid; v_ip text := client_ip(); v_recent int;
begin
  if p_mode is null or p_mode !~ '^(b-)?(m-)?(ko|en)-(word|sentence)$' then
    raise exception 'bad mode';
  end if;
  v_base := regexp_replace(p_mode, '^b-', '');
  v_cat := case when v_base like 'm-%' then 'muscle' else 'bone' end;
  v_lang := split_part(regexp_replace(v_base, '^m-', ''), '-', 1);
  v_kind := split_part(regexp_replace(v_base, '^m-', ''), '-', 2);
  v_term := case when v_lang = 'ko' then (case when p_term = 'native' then 'native' else 'hanja' end) else '-' end;
  v_n := case when v_kind = 'word' then 20 else 8 end;
  if v_ip is not null then
    select count(*) into v_recent from rounds where ip = v_ip and created_at > now() - interval '10 minutes';
    if v_recent >= 60 then raise exception 'too many rounds'; end if;
  end if;
  select array_agg(item) into v_items from (
    select item from round_items where cat = v_cat and lang = v_lang and kind = v_kind and term = v_term order by random() limit v_n
  ) s;
  insert into rounds (mode, term, items, ip) values (p_mode, v_term, v_items, v_ip) returning id into v_id;
  return json_build_object('round', v_id, 'items', v_items);
end;
$$;

-- 제출: 모드 이름에서 'b-' 를 떼고 문제 글자 수를 찾음 (나머지는 그대로)
do $$
declare src text;
begin
  select pg_get_functiondef('public.submit_score(uuid, text, text, integer)'::regprocedure) into src;
  src := replace(src, $q$case when r.mode like 'm-%' then$q$, $q$case when r.mode ~ '^(b-)?m-' then$q$);
  src := replace(src, $q$regexp_replace(r.mode, '^m-', '')$q$, $q$regexp_replace(r.mode, '^(b-)?(m-)?', '')$q$);
  if src !~ 'b-\)\?m-' or src !~ '\^\(b-\)\?\(m-\)\?' then raise exception 'submit_score patch failed'; end if;
  execute src;
end $$;
