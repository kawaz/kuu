---
title: engine 単体の契約検証 fixture 化 (DR-110 §8 の将来課題)
status: idea
category: design
created: 2026-07-16T22:47:25+09:00
last_read:
open_entered:
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

# engine 単体の契約検証 fixture 化 (DR-110 §8 の将来課題)

## 概要

engine 単体の契約検証を fixture 化する構想。合成住人 (synthetic inhabitant) を使い、
extension interface への準拠を検証する仕組みを想定している。

## 背景

DR-110 §8 で将来課題として言及されていた論点。現時点では各実装の engine unit test の
関心に留めておき、fixture 化までは踏み込まない判断。

再検討トリガ:

- 3rd party 拡張の生態系が実体化したとき
- 多言語 2 実装目の engine 移植に着手するとき

## 受け入れ条件

- [ ] 再検討トリガ発生時に、fixture 化の要否と設計方針を判断する
