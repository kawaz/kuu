---
title: values enum 情報の help model 射影が未規定 + spellings/types/used_as の配列順が DR 未規定
status: open
category: design
created: 2026-07-20T15:56:10+09:00
last_read:
open_entered: 2026-07-20T15:56:10+09:00
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

# values enum 情報の help model 射影が未規定 + spellings/types/used_as の配列順が DR 未規定

## 概要

P2 help fixture レビュー (codex-sol-reviewer 2026-07-20) で検出した DR gap 2 点。

1. wire は pure syntax normalized で values 糖衣は or/exact へ正規化済み (LOWERING
   A.4)。正規化後に enum 糖衣の出自が失われるため、help model へ「これは enum
   選択肢」という情報を射影する経路が無い。help_category の values 制約
   (DR-113 §2.3) の表示素材としても必要になり得る。model に enum 情報を載せる
   か (載せるならどの層で)、renderer が or/exact tree から自力導出するか、の
   裁定が要る。
2. help model の spellings / alias_spellings / types / used_as の配列順は比較
   規約上 mismatch になるのに DR が順序を規定していない。fixture は暫定で定義
   出現順。DR で順序規定するか runner で集合比較にするかの裁定が要る。

## 背景

両方 P3 (kuu.mbt 実装) 前に DR-113 追記で確定する必要がある。

関連: docs/issue/2026-07-20-dr113-help-category-value-structure-underspecified.md

## 受け入れ条件

- [ ] enum 情報の help model 射影経路 (model 側 or renderer 側導出) が DR-113
      に規定される
- [ ] spellings / alias_spellings / types / used_as の配列順規約 (DR 明記 or
      runner 集合比較) が確定する

## TODO

<!-- wip 時のみ -->
