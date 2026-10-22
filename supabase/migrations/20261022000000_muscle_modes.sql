-- 근육 모드 랭킹 (m-ko-word …) 추가
alter table public.scores drop constraint if exists scores_mode_check;
alter table public.scores add constraint scores_mode_check check (mode in (
  'ko-word', 'ko-sentence', 'en-word', 'en-sentence',
  'm-ko-word', 'm-ko-sentence', 'm-en-word', 'm-en-sentence'
));
