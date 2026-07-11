---
title: CONFORMANCE.md §2 の effect op 語彙が実態と乖離 (update/remove/splice + transform/args フィールド欠落)
status: resolved
category: task
created: 2026-07-12T01:30:16+09:00
last_read:
open_entered: 2026-07-12T01:30:16+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-12T04:36:56+09:00
discard_reason:
pending_reason:
close_reason: ["implemented:CONFORMANCE §2 の op 表を 7 op (set/default/unset/empty/update/remove/splice) + transform/args フィールドに更新、各 op に fixture 実例付き、fixture.schema.json と往復一致確認 (commit b1f8301b)"]
blocked_by:
origin: 自リポ TODO
---

# CONFORMANCE.md §2 の effect op 語彙が実態と乖離 (update/remove/splice + transform/args フィールド欠落)

## 概要

CONFORMANCE.md §2 の effect op 語彙表を、実態 (7 op + transform/args フィールド) に合わせて更新する。

## 背景

schema-writer による fixtures 全 188 件走査 (2026-07-12) で発見。CONFORMANCE.md §2 は effect op を
set/default/unset/empty の 4 種のみ記載するが、実際の fixtures には DR-077 の update
(+transform/args フィールド) と DR-080 の merge accumulator 由来 remove/splice が実在する。
schema/fixture.schema.json は実態 (7 op + transform/args) に合わせて作成済みで、CONFORMANCE.md
本文の追随が未了。

## 受け入れ条件

- [x] CONFORMANCE.md §2 の op 語彙表を 7 op + フィールドに更新
- [x] fixture.schema.json と往復一致

## 関連

DR-077 / DR-080 / DR-095
