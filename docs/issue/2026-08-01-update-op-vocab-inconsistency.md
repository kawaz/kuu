---
title: update op の語彙不整合 (DR-045/077 vs CONFORMANCE §2)
status: open
category: design
created: 2026-08-01T23:21:31+09:00
last_read:
open_entered: 2026-08-01T23:21:31+09:00
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

# update op の語彙不整合 (DR-045/077 vs CONFORMANCE §2)

## 概要

`update` op の扱いについて、正本間で矛盾がある。

- DR-045 §更新 と DR-077 は `update` を 5 語目の effects op として規定している。
- CONFORMANCE §2 の op 表は `update` を持たず、「incr 等が返した新値も set として観測し、専用 update op は持たない」と規定している。

両者は同じ対象 (effects op 語彙) について正反対の規定をしており、どちらが正かが未裁定。

## 背景

DR-131 (Sentinel 縮小、2026-08-01) の op 表改定作業中に発見された。当初は null 反転の調査
(`research/2026-08-01-null-projection-inversion.md` §5b) の一部として扱いかけたが、null 反転
とは独立の既存不整合であるため、同 §5b の裁定に従い別 issue として切り出した。

## 受け入れ条件

- [ ] `update` op の有無についてどちらを正とするか裁定する
- [ ] 裁定結果を DR-045/077 か CONFORMANCE のいずれか (または両方) に追補注記として反映する
- [ ] 現行実装 (kuu.mbt) が `update` op を実装しているか / incr 等の新値を set として観測しているかを実測し、裁定の判断材料に含める
- [ ] 実装が正本のどちらとも異なる場合は、実装側の修正 or 別途 issue 化を検討する

## TODO

<!-- wip 時のみ -->
