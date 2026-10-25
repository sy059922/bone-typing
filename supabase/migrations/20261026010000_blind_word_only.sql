-- 블라인드는 낱말 연습에서만 (문장 연습 블라인드 판·기록 막기)
-- 그 사이 문장 블라인드로 친 기록은 지우지 않고 같은 일반 문장 랭킹으로 옮김 (블라인드가 더 어려우니 손해 없음)
update public.scores set mode = substr(mode, 3) where mode ~ '^b-.*sentence$';
alter table public.scores drop constraint if exists scores_mode_check;
alter table public.scores add constraint scores_mode_check check (
  mode ~ '^((m-)?(ko|en)-(word|sentence)|b-(m-)?(ko|en)-word)$'
);

do $$
declare src text;
begin
  select pg_get_functiondef('public.start_round(text, text)'::regprocedure) into src;
  src := replace(src, $q$p_mode !~ '^(b-)?(m-)?(ko|en)-(word|sentence)$'$q$, $q$p_mode !~ '^((m-)?(ko|en)-(word|sentence)|b-(m-)?(ko|en)-word)$'$q$);
  if position('b-(m-)?(ko|en)-word)$' in src) = 0 then raise exception 'start_round patch failed'; end if;
  execute src;
end $$;
