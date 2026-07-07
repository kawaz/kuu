---
title: dd 相当マーカーを「発火必須」にできない (values セルを持たないため required の判定対象にならない)
status: open
category: design
created: 2026-07-07T23:24:02+09:00
last_read:
open_entered: 2026-07-07T23:24:02+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kuu 自リポ TODO
---

# dd 相当マーカーを「発火必須」にできない (values セルを持たないため required の判定対象にならない)

## 概要

kawaz/die の `die [opts] -- ARGS...` は `--` (dd) の出現を**必須**とする (`--` が無い `die foo` は構文エラー)。しかし dd (DR-064) は値セルを持たない (fixtures/dd/export-key-inert.json で export_key すら inert と確認済み) ため、`required: true` の判定対象である「値の有無」(DESIGN.md §9.1) が dd には存在せず、「このマーカーが発火したこと」を制約として要求する手段が無い。

結果として、`corpus/real-cli/die.json` の定義では `args` (dd 越しに埋まる想定の positional) が dd の発火有無に関わらず背骨上で通常消費されてしまい (fixtures/dd/basic.json の no-dd-flag-fires と同型の創発)、`die msg` (`--` 無し) が実機では構文エラーであるにもかかわらず kuu の定義では success (`args=["msg"]`) になってしまう。

## 背景

- fixtures/dd/basic.json — dd は 0 回でも 1 回でも発火可能な greedy 面の住人。「発火 0 回」が正常系として固定されている (`no-dd-flag-fires` ケース)
- fixtures/dd/export-key-inert.json — dd に export_key を付けても結果に何のキーも現れない。dd の値効果なしは §4 の仕様断定
- `corpus/real-cli/die.json` の `bare-arg-without-dd-diverges` ケースが本ギャップを実例で固定 (kuu がどう出力するかを固定するものであり、die の正しい挙動ではないことを `why` に明記)

これは `docs/issue/2026-07-07-corpus-implicit-trailing-passthrough.md` (positional の充足が暗黙トリガになり pass-through する env/xargs/ssh/docker/ffmpeg のギャップ) とは**別種**の課題であることに注意: あちらは「マーカーが存在せず positional 自体が暗黙トリガになる」問題、本件は「明示マーカー (dd) は既にあるが、その発火自体を必須制約にできない」問題。

## 受け入れ条件

- [ ] dd (または marker 系語彙全般) に「発火したこと」を制約として要求する手段を検討する (候補: (a) 表現しない・現状維持で「-- 必須」なユースケースは kuu のスコープ外とする、(b) dd に発火有無を示す隠しセル (boolean、export_key と別軸) を持たせ required の対象にする、(c) 「positional は dd 発火後にしか埋まらない」ような構造的順序制約を positionals/dd の配置関係で表現する新語彙、(d) その他)
- [ ] 採用方針を DR として記録する (DR-064 / DESIGN §9.1 との関係を明示)
- [ ] 採用方針に応じて `corpus/real-cli/die.json` の `bare-arg-without-dd-diverges` を更新する (方針が「スコープ外」なら現状維持、表現手段を追加するなら正しい挙動 (failure) に更新)

## 関連

- corpus/real-cli/die.json (`bare-arg-without-dd-diverges` ケースが本 issue を forward-reference)
- fixtures/dd/basic.json / fixtures/dd/export-key-inert.json
- docs/issue/2026-07-07-corpus-implicit-trailing-passthrough.md (別種の関連ギャップ)
