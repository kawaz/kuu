---
title: 同一 raw command 複数入場時の ordinal marker occurrence 所属 gap
status: open
category: bug
created: 2026-08-02T20:14:37+09:00
last_read:
open_entered: 2026-08-02T20:14:37+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (docs/issue/2026-08-02-dup-label-scope-resolve-gap.md のレビュー分割)
---

# 同一 raw command 複数入場時の ordinal marker occurrence 所属 gap

## 概要

kuu.mbt に同一 raw command を 1 読解で複数回入場した場合、ordinal marker の occurrence
所属が失われる。duplicate raw command `go1`/`go2` で `go --a x go --b y` のように両枝へ
入場すると、同じ raw scope path に ordinal marker が複数並ぶが、
`command_ordinal_at_path` の単一候補選択では全 binding を一方の occurrence へ寄せてしまう。

表現力削減は禁止。marker の区間化、または occurrence identity の導入によって、各 binding
を入場した occurrence に正しく帰属させる必要がある。

## 背景

由来 issue: docs/issue/2026-08-02-dup-label-scope-resolve-gap.md のレビュー分割。
同じ raw scope path が複数回入場されるケースで、ordinal marker ベースの単一候補選択
(`command_ordinal_at_path`) が occurrence を区別できず、resolve/result/sources/effects/
constraints の射影が誤った occurrence (枝) に寄ってしまう。

## 受け入れ条件

- [ ] 同一 raw command を 1 読解で複数回入場するケース (例: `go --a x go --b y` で
      duplicate raw command go1/go2 が両枝へ入場) で、各 occurrence の ordinal marker が
      区別可能になっている (marker 区間化 or occurrence identity)
- [ ] resolve/result/sources/effects/constraints が各 occurrence (各枝) へ正しく射影される
- [ ] 表現力の削減 (duplicate raw command の一方を諦める等) を行っていない
