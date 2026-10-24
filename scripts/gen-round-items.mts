// 서버가 점수를 계산할 때 쓰는 문제별 글자(입력 단위) 수 → supabase/round_items.sql
// 실행: node --experimental-strip-types scripts/gen-round-items.mts
import {writeFileSync} from 'node:fs';
import {BONES} from '../src/data/bones.ts';
import {MUSCLES} from '../src/data/muscles.ts';
import {NATIVE_NAME, NATIVE_SENTENCE, toNative} from '../src/data/native.ts';
import {units} from '../src/lib/typing.ts';

const rows: string[] = [];
for (const [cat, pool] of [['bone', BONES], ['muscle', MUSCLES]] as const) {
  for (const b of pool) {
    for (const kind of ['word', 'sentence'] as const) {
      const variants: [string, string, string][] = [
        ['en', '-', kind === 'word' ? b.en : b.sentence.en],
        ['ko', 'hanja', kind === 'word' ? b.ko : b.sentence.ko],
        ['ko', 'native', kind === 'word' ? NATIVE_NAME[b.id] ?? b.ko : NATIVE_SENTENCE[b.id] ?? toNative(b.sentence.ko)],
      ];
      for (const [lang, term, text] of variants) {
        const u = units(text, lang as 'ko' | 'en').length + 1; // + 확정 키
        rows.push(`('${cat}','${lang}','${kind}','${term}','${b.id}',${u})`);
      }
    }
  }
}
writeFileSync('supabase/round_items.sql', `insert into public.round_items (cat, lang, kind, term, item, units) values\n${rows.join(',\n')}\non conflict (cat, lang, kind, term, item) do update set units = excluded.units;\n`);
console.log(rows.length, 'rows');
