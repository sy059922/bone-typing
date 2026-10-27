// 서버가 점수를 계산할 때 쓰는 문제별 글자(입력 단위) 수 → supabase/round_items.sql
// 실행: node --experimental-strip-types scripts/gen-round-items.mts
import {writeFileSync} from 'node:fs';
import {BONES} from '../src/data/bones.ts';
import {MUSCLES} from '../src/data/muscles.ts';
import {NERVES} from '../src/data/nerves.ts';
import {NATIVE_NAME, NATIVE_SENTENCE, toNative} from '../src/data/native.ts';
import {MORE} from '../src/data/sentences.ts';
import {units} from '../src/lib/typing.ts';

const rows: string[] = [];
for (const [cat, pool] of [['bone', BONES], ['muscle', MUSCLES], ['nerve', NERVES]] as const) {
  for (const b of pool) {
    // 낱말 1개 + 문장 여럿 (0번 = 원래 문장, k번 = 'id#k' — Game.tsx 의 withSentence 와 같은 이름)
    const tasks: [string, string, [string, string, string][]][] = [
      ['word', b.id, [['en', '-', b.en], ['ko', 'hanja', b.ko], ['ko', 'native', NATIVE_NAME[b.id] ?? b.ko]]],
      ['sentence', b.id, [['en', '-', b.sentence.en], ['ko', 'hanja', b.sentence.ko], ['ko', 'native', NATIVE_SENTENCE[b.id] ?? toNative(b.sentence.ko)]]],
      ...(MORE[b.id] ?? []).map((s, i): [string, string, [string, string, string][]] => ['sentence', `${b.id}#${i + 1}`, [['en', '-', s.en], ['ko', 'hanja', s.ko], ['ko', 'native', s.nat]]]),
    ];
    for (const [kind, item, variants] of tasks) {
      for (const [lang, term, text] of variants) {
        const u = units(text, lang as 'ko' | 'en').length + 1; // + 확정 키
        rows.push(`('${cat}','${lang}','${kind}','${term}','${item}',${u})`);
      }
    }
  }
}
writeFileSync('supabase/round_items.sql', `insert into public.round_items (cat, lang, kind, term, item, units) values\n${rows.join(',\n')}\non conflict (cat, lang, kind, term, item) do update set units = excluded.units;\n`);
console.log(rows.length, 'rows');
