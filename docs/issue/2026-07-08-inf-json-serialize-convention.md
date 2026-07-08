---
title: inf / 非整数 number の JSON serialize 規約
status: open
category: design
created: 2026-07-08T21:57:03+09:00
last_read:
open_entered: 2026-07-08T21:57:03+09:00
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

# inf / 非整数 number の JSON serialize 規約

## 概要

distill-spec-gaps close 時の切り出し (旧 #3 派生)。JSON に inf リテラルが無いため、float の inf 値を fixture の期待値 (result / effects) や wire にどう書くかの規約が未確定。DR-050 §4 の stringification (1.0 → "1") と同族の serialize 規約論点。

## 背景

fixtures/value-typing/number-inf-nan.json は inf 受理 case で「成功輪郭 + source のみ固定」(値の直接比較を避ける) で凌いでいる (2026-07-08 の符号付き inf 追加 case も同じ扱い)。規約が決まれば値まで pin できる。

2026-07-08 台帳 issue 監査。

## 受け入れ条件

- [ ] inf の JSON serialize 表現を裁定する (候補: 文字列表現 "inf" / "-inf"、tagged object。JSON5 的拡張は不採用 — protobuf3/Go 互換の DR-071 と同じ wire 制約意識)
- [ ] result オブジェクトの言語バインディング側表現 (各言語の inf) との対応を一言明記する
- [ ] fixtures/value-typing/number-inf-nan.json の inf case を値まで pin する形に更新する
