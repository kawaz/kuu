---
title: bool 不正入力の reason 語彙が DR-066 v1 に無い
status: open
category: design
created: 2026-07-07T23:34:31+09:00
last_read:
open_entered: 2026-07-07T23:34:31+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO
---

# bool 不正入力の reason 語彙が DR-066 v1 に無い

## 概要

DR-074 §3 は bool の不正入力を Error と定めるが、DR-066 §3 の v1 reason 語彙表に
bool 用の reason (`not_a_bool` 相当) が存在しない。number 系は `not_a_number` /
`not_an_integer` が定義済みなのに、bool だけ reason 未確定のまま非対称になっている。

## 背景

DR-066 §3 (組み込み reason の最小語彙 v1) の表には kind=parse の reason として
`not_a_number` / `not_an_integer` のみが列挙されており、bool 用の行がない。

一方 DR-074 §3 (bool canonical 字句) は「不正 bool 文字列は Error (silent 変換
しない)」と明記している。つまり bool value_parser は失敗しうることが仕様上確定
しているのに、その失敗を機械可読に識別する reason 語彙が DR-066 側に存在しない。

参照実装 (kuu.mbt の `src/core/resolve.mbt`、コミット `ab4b5444`) はこのギャップを
埋めるため provisional に `"not_a_bool"` という reason 文字列を emit している。
この値が spec として正式採用されるかは未裁定。

fixture (`corpus/real-cli` 含む) の bool エラー期待値もこの語彙確定に影響を受ける
(reason を assert する fixture を書く場合、確定した語彙でないと後から書き換えが要る)。

発見経緯: 値確定層移植時に DR-066 の reason 宣言と実装の descriptor 突き合わせ監査を
行った際に判明。

## 受け入れ条件

- [ ] DR-066 §3 の v1 reason 語彙表に bool 用 reason (`not_a_bool` または裁定後の別名) を追記する
- [ ] 追記した reason を `kuu_bool_parser` descriptor の `reasons` 宣言に対応づける方針を明記する
- [ ] 参照実装の provisional `"not_a_bool"` を採用するか、別名にするかを裁定する
