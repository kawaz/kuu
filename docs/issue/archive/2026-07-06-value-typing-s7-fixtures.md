---
title: DR-074 §7 の細部規則の輪郭 fixture 追加
status: resolved
category: task
created: 2026-07-06T16:12:19+09:00
last_read:
open_entered: 2026-07-06T16:12:19+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-08T21:46:20+09:00
discard_reason:
pending_reason:
close_reason: ["done:DR-074 §7 細部規則 21 case (fixtures/value-typing/ 4 ファイル、spec commit fa3c6e12) + int-round-modes.json の DR-075 全10モード網羅 rewrite 8 case (spec commit a7aa2e14)。全期待値は spec から導出し kuu.mbt 実測で乖離0"]
blocked_by:
origin: 自リポ TODO (DR-074 反映の codex stop-gate レビューで発見)
---

# DR-074 §7 の細部規則の輪郭 fixture 追加

## 概要

DR-074 §7 (未規定組合せの pin) で number canonical 字句の細部規則を確定したが、
`fixtures/value-typing/` が現状被覆するのは基本形のみ (`1_000` / `1e3` / inf 2 語 /
hex float 系)。§7 で確定した以下の輪郭が fixture 未整備のため、既存 value-typing
fixture への case 追加で埋める。

1. **指数部符号**: `1e-3` / `1e+3` / `0x1.8p-3` (opt-in) の success
2. **符号付き inf**: `-inf` / `+Infinity` の success (float 型)
3. **基数 prefix 大文字**: `0X1F` / `0B101` (opt-in) の success
4. **0o/0b への小数・指数適用**: `0o1.5` / `0b1.1` の Error (opt-in 有効でも)
5. **`_` 配置文法の negative**: `1__000` / `_1` / `1_` / `1_e3` / `1_.5` の Error、
   `12_34_5` の success (幅検証なし)。opt-in 時の `0xff_ff` success と `0x_ff` Error
6. **符号付きゼロ**: `-0` / `+0` の success (int 型でも)

## 背景

DR-074 §7 は「fixture 被覆は基本形のみ、本節の細部規則の輪郭 fixture は未整備」と
明記して本 issue への追跡を予告している。発見経緯は DR-074 反映の codex stop-gate
レビュー (§7 の被覆主張が過大だった → DR 側の文言は正確化済み)。

各 case は DR-072 準拠の安定 id を持たせ、`why` は DR-074 §7 参照で self-contained
に書く (DR を別タブで開かなくても判断が分かる形、tdd-and-test-design の inline
仕様書原則)。新規 fixture ファイルは乱立させず、既存 value-typing fixture への
case 追加が自然 (number-decimal-lexicon / number-base-prefix-optin /
number-base-prefix-rejected / number-inf-nan の性格に応じて振り分け)。

追加後は slice runner (kuu.mbt slice ws) で実食する。slice の `parse_number` は
DR-074 に未追従であることが既に判明している (slice リポ
`docs/issue/2026-07-06-parse-number-bool-dr074-followup.md` 参照) ため、実食で
divergence が出ても新規発見ではなく既知ギャップの再確認になる可能性が高い。
divergence が出た場合は凍結台帳 (phase23-distill-ledger 系) に記録する。

## 受け入れ条件

- [ ] `fixtures/value-typing/` に上記 6 項目の輪郭 case が (既存ファイルへの追加として) 揃っている
- [ ] 各 case が DR-072 準拠の一意な id を持ち、`why` が DR-074 §7 参照で self-contained
- [ ] slice runner で実食し、divergence の有無を確認・記録

## TODO

- [x] number-decimal-lexicon.json に指数部符号 (`1e-3`/`1e+3`) の case を追加 (2026-07-08、spec fixture バッチ worker)
- [x] number-base-prefix-optin.json に `0x1.8p-3` / `0X1F` / `0B101` / `0xff_ff` の success case を追加 (同日)
- [x] number-base-prefix-rejected.json (または opt-in 側) に `0o1.5` / `0b1.1` の Error case を追加 (opt-in 側に配置、同日)
- [x] number-inf-nan.json に `-inf` / `+Infinity` の success case を追加 (同日)
- [x] `_` 配置文法の negative 系 (`1__000` / `_1` / `1_` / `1_e3` / `1_.5`) と `12_34_5` success、`0x_ff` Error の case を追加 (10 進側は number-decimal-lexicon.json、hex 側は number-base-prefix-optin.json に振り分け、同日)
- [x] 符号付きゼロ (`-0` / `+0`, int 型含む) の case を追加 (number 側は number-decimal-lexicon.json、int 側は int-value-space.json、同日)
- [x] slice runner で実食、divergence があれば凍結台帳へ記録 (kuu.mbt で全 case 0 mismatch を確認、divergence なし、同日)
- [x] int-round-modes.json に残 6 モード (ceil / away / half_floor / half_ceil / half_trunc / error) の fixture を named type shadow 方式で追加 (DR-075 期待値表準拠) (2026-07-08、spec fixture バッチ worker: 全 10 モード comprehensive 方式に rewrite、8 case で正負 tie × 4 (2.5/-2.5/3.5/-3.5) + 正負 nontie × 2 (3.2/-3.2) + error モード isolated 2 case、conformance fresh 0 mismatch)

## 追記: DR-075 (int_round) 派生の残タスク

DR-075 (int_round) 派生の残タスク: int_round の残 6 モード (ceil / away / half_floor /
half_ceil / half_trunc / error) の fixture 化。fixtures/value-typing/int-round-modes.json
は判別力の高い代表 4 モード (floor / trunc / half_even / half_away) で輪郭を固定し、
int-value-space.json が error モードの受理輪郭を被覆済み。残 6 モードの期待値正本は
DR-075 の期待値表 (負数判別ベクタ -3.7/-2.5/2.5/3.5 の全 10 モード表)。全 10 モード
fixture 化を本 issue の追加 TODO とする。int-round-modes.json と同じ named type shadow
方式 (definitions.types で kuu_int_parser を各 int_round config で shadow) で横並び
検証できる。
