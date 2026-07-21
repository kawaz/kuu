---
title: DR-113 に help_category の value_structure 形が未規定
status: resolved
category: design
created: 2026-07-20T15:34:02+09:00
last_read:
open_entered: 2026-07-20T15:34:02+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-21T09:55:09+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-113#2.3","裁定/GAP-Q1-i=承認","help_category の model 射影を or[single{bool}, single{value_name:CATEGORY,string}] で規範化"]
blocked_by:
origin: schema-p1b worker
---

# DR-113 に help_category の value_structure 形が未規定

## 概要

`help_category` preset は bool 枝 (裸発火) + string 枝 (category 名指定) の
合成入口だが、help model の value_structure tree にこの二枝をどう射影するかが
DR-113 に規定されていない。

## 背景

P2 help fixture 書き直し時に schema-p1b worker の設計論点 P2H-Q2 として検出。
暫定裁定 (2026-07-20 統括): type fixture では value_structure を省略し、
canonical 形は lowering 側へ送る。

P3 (kuu.mbt 実装) 前に DR-113 追記で確定する必要がある。

関連: `docs/issue/2026-07-20-dr114-count-wire-sugar-underspecified.md`
(同種の DR gap、P3 前確定枠)。

## 受け入れ条件

- [ ] DR-113 に help_category の bool 枝 / string 枝それぞれの value_structure
      射影規則が明文化される
- [ ] P2 help fixture の暫定裁定 (value_structure 省略) との整合が確認される
