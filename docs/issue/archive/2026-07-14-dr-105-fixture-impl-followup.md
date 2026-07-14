---
title: DR-105 の fixture・実装追随 (flatten ダイヤル / ARRAY filter Result 化 / length_range)
status: resolved
category: task
created: 2026-07-14T17:30:09+09:00
last_read: 2026-07-14T18:51:16+09:00
open_entered: 2026-07-14T17:30:09+09:00
wip_entered: 2026-07-14T18:54:17+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-14T20:16:14+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-105","implemented","done:spec lowering2本をappend+flatten:trueへ書換+definition-error5本(merge×flatten true/false, legacy flatten unknown-vocab, length_range/in_range malformed)+length-range-reject新設(commit ac8f3227); kuu.mbt flatten decode/展開・旧flatten accumulator廃止・ArrayFilterDescriptor Result化・length_range・invalid-range gate・unknown accumulator・DSL引数definition-time検査(commit 23018b11); conformance decoded=256/ran_cases=632/skipped=0/mismatches=0, moon test 324/324; ロックステップpush済み(spec 57ea0bc6→pin bump→kuu.mbt 0fe02498), CI run 29327970515 green; mismatchレビューでfixture期待値ミス2件(要素名typo/args_pos off-by-one)を検出・修正"]
blocked_by:
origin: 自リポ TODO (次セッション最優先キュー)
---

# DR-105 の fixture・実装追随 (flatten ダイヤル / ARRAY filter Result 化 / length_range)

## 概要

DR-105 (accumulator flatten ダイヤル + ARRAY filter fallibility、ACC-Q1d/Q3/Q4 裁定) の
DR/schema/docs は land 済みだが、**fixture と kuu.mbt 実装の追随が未着手**。

## 背景

この間、main 上で「DR-105 は flatten accumulator 廃止を規定するが lowering fixture は
まだ `"accumulator": "flatten"` を使う」一時的不整合が存在する (CI は green — fixture と
実装は旧形で整合しているため)。

### spec fixture 書き換え計画 (spec-w2 の棚卸し 2026-07-14)

- **必須**: `fixtures/lowering/repeat/basic.json:35` と
  `lowering/baseline/converged.json:121` の `"accumulator":"flatten"` →
  `{"accumulator":"append","flatten":true}` + why 文言
- **why コメント文言確認が望ましい 11 本**: multiple-with-repeat /
  ref-repeat-rows-nested / repeat-inside-scope / flatten-scalar-tail
  (ファイル名込み) / min2-standalone / max-finite / preference-greedy /
  min2-trailing / config/array-object (別義の可能性、要確認) / repeat-porous

### 新規 fixture

- flatten × 他 accumulator (merge 等) の definition-error (DR-084 §3 同型)
- accum_filters Result 化 + length_range の runtime reject
  (ARRAY filter 初の reject 実例、args_pos=args.length)

### kuu.mbt 実装

- multiple object の flatten decode
- append+flatten:true の展開 (旧 flatten accumulator の置換)
- ArrayFilterDescriptor の Result 化
  (apply_accum_filter_chain → build_result の error 配管)
- length_range 実装 (too_short/too_long)
- flatten × 非 append の invalid-range gate
- 関連 wbtest 追随

## 受け入れ条件

- [ ] conformance mismatches=0
- [ ] 既存 flip ゼロ (lowering 2 本は正当な書き換えとして許容)
- [ ] ロックステップ push (spec fixture / 台帳 / pin / kuu.mbt 実装を同一ウィンドウで)
- [ ] 「flatten accumulator 廃止 vs lowering fixture 残存」の一時的不整合の解消

## TODO

- [ ] fixtures/lowering/repeat/basic.json:35 と lowering/baseline/converged.json:121 の書き換え
- [ ] why コメント文言要確認 11 本の確認・修正
- [ ] flatten × 他 accumulator の definition-error fixture 追加
- [ ] accum_filters Result 化 + length_range reject fixture 追加
- [ ] kuu.mbt: multiple object の flatten decode 実装
- [ ] kuu.mbt: append+flatten:true 展開実装 (旧 flatten accumulator 置換)
- [ ] kuu.mbt: ArrayFilterDescriptor の Result 化 (apply_accum_filter_chain → build_result)
- [ ] kuu.mbt: length_range 実装 (too_short/too_long)
- [ ] kuu.mbt: flatten × 非 append の invalid-range gate
- [ ] 関連 wbtest 追随

## 関連

- `docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md`
- DR-036・DR-043 の Superseded 節
- `docs/QUESTIONS.md` の ACC 裁定記録 (2026-07-14)
