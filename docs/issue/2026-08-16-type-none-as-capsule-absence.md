---
title: type:"none" を廃して value カプセル不在で「値空間なし」を表現する案の検討
status: open
category: design
created: 2026-08-16T12:38:35+09:00
last_read:
open_entered: 2026-08-16T12:38:35+09:00
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

# type:"none" を廃して value カプセル不在で「値空間なし」を表現する案の検討

## 概要

現状 `type:"none"` として値空間の語彙で表現している「値空間なし」を、type 語彙から
外し、value カプセルそのものの不在で表現し直す案の検討。DR-140 §4 は「実体判別は
value の presence」としているが、`type:"none"` は value を持つため判別式が自己矛盾
しており、none 例外が判別式に残っている。

## 背景

opus レビュー C4 発 (2026-08-16)。value カプセル移送 (DR-139/DR-140) のレビュー中に
指摘。none をカプセル不在そのもので表現できれば presence 判別が真に成立し、
DR-089/DR-135 の分界も簡潔化できる可能性がある。ただし既存 fixture (none 系多数)・
help・DR-121 に広く波及するため、値カプセル移送 (DR-139/DR-140) とは独立したサイクル
での裁定・設計が必要。

## 受け入れ条件

- [ ] DR-140 §4 の presence 判別式に none 例外が残るかどうかの現状整理
- [ ] type:"none" 廃止案の DR-089/DR-121/DR-135 への波及範囲の洗い出し
- [ ] 既存 fixture (none 系) の移行方針の裁定
- [ ] 採否の裁定 (現状維持 or 廃止して capsule 不在化)
