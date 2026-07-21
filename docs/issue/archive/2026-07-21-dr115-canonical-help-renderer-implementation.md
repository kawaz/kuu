---
title: DR-115 (canonical help レンダラ) を実装完了する
status: resolved
category: task
created: 2026-07-21T05:50:29+09:00
last_read:
open_entered: 2026-07-21T05:50:29+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-21T09:10:18+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-115","implemented","done:kuu-cli main=0ee0adcf/kuu.mbt main=76212140, RIMPL-Q1〜Q6反映済み (repeat 表記は暫定採用)"]
blocked_by:
origin: 自リポ TODO
---

# DR-115 (canonical help レンダラ) を実装完了する

## 概要

`docs/issue/2026-07-18-help-renderer-design.md` の close により DR-115 の設計は
land 済み (spec main = 13deea75、2026-07-21) だが、canonical レンダラ本体の実装は
未着手 (次フェーズ)。DR-115 の決定事項を実装に反映する。

## 背景

DR-115 (`docs/decisions/DR-115-canonical-help-renderer.md`) は REND-Q1〜Q7 裁定
(1a/2b/3a/4b/5a/6b/7a、kawaz 2026-07-21) を反映し、以下を決定済み:

1. レンダラ指示語彙は `help_render` 席の 3 段 override (一括席 / 個別席 / API 引数)
2. §2 骨格テンプレ・§5 value_structure / types 表示 style・§4 binding 補間 等
   (DR-115 本文の「## 決定」節が正本)
3. §12 波及節 (DR-113 §8.1 update を含む) が実装計画の起点

completion 生成器の表示 policy は REND-Q7=a により本サイクル除外、
`docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` へ統合済み
(= 本 issue のスコープ外)。

## 受け入れ条件

- [ ] DR-115 §1〜§5 (help_render 席、骨格テンプレ、value_structure/types/origin
      表示 style) の実装
- [ ] DR-113 §8.1 の update 反映 (DR-115 波及節に従う)
- [ ] DR-115 §12 波及節に挙がる既存箇所の追従漏れがないか確認

## 関連

- docs/decisions/DR-115-canonical-help-renderer.md (決定事項の正本)
- docs/issue/2026-07-18-help-renderer-design.md (archive 済み、由来 issue)
- docs/findings/2026-07-21-help-renderer-design-plan.md (設計プラン下敷き)
