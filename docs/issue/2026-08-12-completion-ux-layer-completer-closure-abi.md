---
title: completion ux 層の座席設計と形態 A completer クロージャ ABI
status: open
category: design
created: 2026-08-12T08:39:21+09:00
last_read:
open_entered: 2026-08-12T08:39:21+09:00
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

# completion ux 層の座席設計と形態 A completer クロージャ ABI

## 概要

DR-117 波及節が MoonBit 実装の座席 (kuu.mbt ux 層 vs kuu-cli lib) を未確定のまま
先送りしている。分割線は preset/env モード意味論 = kuu.mbt、行指向応答組版 +
glue テンプレ埋め = product 側が自然、という方向感はあるが確定していない。
同時に、形態 A (ホスト言語クロージャ直呼び) の completer 供給 ABI (クロージャ
signature、`CompleterExt` への接続) も ux 設計へ先送りされている。

## 背景

DR-116 実装 (issue `2026-07-22-dr-116-completion-generator-implementation`) で
custom completer 実行がこの未設計により保留になった。ux 層の座席確定と同時に
クロージャ ABI を設計する必要がある。

`kuu.mbt` `src/extension/completer_ext.mbt` は現状 `name()` のみを持ち、
completer を供給する carrier を持たない。

関連: DR-117 §8.3・波及節、DR-116 §3、DR-111 §5

## 受け入れ条件

- [ ] completion ux 層の座席 (kuu.mbt ux 層 vs kuu-cli lib) が確定している
- [ ] 分割線 (preset/env モード意味論 vs 行指向応答組版 + glue テンプレ埋め) の
      帰属が DR として記録されている
- [ ] 形態 A completer クロージャの signature が確定している
- [ ] `CompleterExt` への接続方法 (供給 carrier) が設計されている
