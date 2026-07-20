---
title: DR-114 に count preset の wire 糖衣規則 (long:true → [":incr"]) が未規定
status: resolved
category: design
created: 2026-07-20T15:29:33+09:00
last_read:
open_entered: 2026-07-20T15:29:33+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-20T17:24:49+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-114","implemented"]
blocked_by:
origin: docs-fn-p2 worker
---

# DR-114 に count preset の wire 糖衣規則 (long:true → [":incr"]) が未規定

## 概要

fixtures (`lowering/count/bare-increment.json` および `count-parse/` 配下) では
count preset の canonical 展開が意味論として規範化済みだが、DR-114 本文には
§6.1 の lowered carrier 規定のみがあり、wire 層の糖衣規則が欠けている。

具体的には、flag preset の DR-076 §2 で規定される「`long:true` →
`[":set:true"]`」と対称の count 版規則、すなわち:

- `long:true` → `[":incr"]` への差し替え
- 非空の明示 list に対する `:incr` 補完の有無

が DR-114 に明文化されていない。

## 背景

docs-fn-p2 worker が DR-114 の実装 (P3, kuu.mbt) に向けた発明ガードの過程で検出。
旧 DR-077 §3 の count 展開規則が Superseded となり、空席になった部分の補完が
必要な状態。

P3 (kuu.mbt 実装) 着手前に DR-114 へ追記して規範化する必要がある。

## 受け入れ条件

- [ ] DR-114 に count preset の wire 糖衣規則 (`long:true` → `[":incr"]`) が明文化される
- [ ] 非空明示 list への `:incr` 補完の有無が規定される
- [ ] fixtures (`lowering/count/bare-increment.json`, `count-parse/`) と整合することを確認
