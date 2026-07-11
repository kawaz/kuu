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

## PoC 結果と改訂裁定案 (DD2 バッチ、2026-07-11)

### PoC (kuu.mbt エンジン直構築、2026-07-11 実測)

kawaz 提案「die の -- 必須は dd でなく greedy 面の素の seq で表現できる」を kuu.mbt の Scope/Node 直構築で検証。greedy 面に `Seq([Exact("--"), Ref(strings repeat min:1 の cons形)])` を置いた結果:

- `["msg"]` → failure (bare operand に消費者なし) / `["--","msg"]` → success / `["--","-x","msg"]` → success で `-x` は operand として一体消費 (dd 機構・severed フラグ一切なし) / `["--"]` → failure (min:1) / `["--verbose","--","msg"]` → success
- 結論: sever 相当は DESIGN L1086「greedy 内部は背骨なし一体消費」の構造的性質であり dd 固有ではない。「発火必須」は制約語彙なしに構造 (bare operand の消費者不在) から導出される
- ただし現行 JSON wire (`dec_option`) にこの形を直接書ける宣言語彙は無い (kawaz 例示の seq 記法は lowering 断面表記であり wire 入力語彙ではない)。エンジン能力は証明済み、宣言経路が未整備

### 改訂裁定案 (DD2 バッチ — 旧 DD-Q1〜Q3 を置換)

DD2-Q1. 宣言経路の形:
- a) dd 宣言に opt-in キーを足し、dd installer が移送 matcher でなく greedy Seq (exact トリガ + 継続消費列) へ lowering する糖衣分岐 【推奨 — kawaz 原案。移送の特殊性が不要なケースを dd の宣言 UX のまま賄う。DR-090 の「設計で競合を避ける」と同筋】
- b) dd と独立の新 wire 語彙 (bare greedy seq を直接宣言) を足す: 表現力は最大だが greedy 面の宣言語彙を大きく開ける
- c) a + b 両方

DD2-Q2. (a のとき) opt-in キーの形: 継続消費列 (die なら string repeat min:1) をどう宣言するか。候補: dd 要素に consume キーで tail 仕様を書く / dd 要素の values 席を opt-in 時のみ解禁 (DR-064 §5 の「dd は値セルなし」との整合を要調停) / プリセット固定 (string repeat min:1 のみ) で始めて必要時に開放。キー名も要裁定 (例: require / placement / rewrite)

DD2-Q3. 旧 DD-Q1-a の残り: DR-089 §4「requires の目的語等」の『等』に required を含める明示化 (none/dd への required:true = definition-error) は本件と独立に有効なので、採否を裁定

DD2-Q4. corpus/real-cli/die.json: opt-in 形へ定義を書き換えて `bare-arg-without-dd-diverges` を failure pin に更新 + fixtures/dd/ に opt-in 形の輪郭 fixture (DD2-Q1/Q2 裁定後)

## 関連

- corpus/real-cli/die.json (`bare-arg-without-dd-diverges` ケースが本 issue を forward-reference)
- fixtures/dd/basic.json / fixtures/dd/export-key-inert.json
- docs/issue/2026-07-07-corpus-implicit-trailing-passthrough.md (別種の関連ギャップ)
