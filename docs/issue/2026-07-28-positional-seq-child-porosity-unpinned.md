---
title: positional 直下 seq 子 vs positionals 入れ子の多孔質性が未規定
status: idea
category: design
created: 2026-07-28T22:42:16+09:00
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

# positional 直下 seq 子 vs positionals 入れ子の多孔質性が未規定

## 概要

positional 要素が直接 `seq:` を持つ形 (Phase 1 の `fixtures/seq-parse/child-repeat-basic.json` 等が導入した wire 表面) と、`positionals:` 入れ子 (positional group) の消費意味論の差が未規定。

具体的には「seq 子の消費列の途中に option トリガが割り込めるか (多孔質性、DR-041 §4 は positional 背骨について規定)」が、どちらの形についても fixture pin が無い。

## 背景

schema 上は seq = 「子を順に消費する枝」、positionals = 「配置で役割決定 (DR-018)」であり、結果形はどちらも同じ kv (DESIGN §5.1/§2.5)。

kuu.mbt の Phase 2-4 実装 (2026-07-28 統括裁定 D-1) では両形を同じ Group body lowering に合流させており、多孔質性は現実装の挙動に従う。将来この 2 形の割り込み挙動を分けたくなった場合は lowering の分岐復活が必要。

## 受け入れ条件

- [ ] seq 子への option 割り込みの合法性を裁定
- [ ] positionals 入れ子との異同を明文化 (同じなら「区別しない」の 1 文で良い)
- [ ] fixture で pin
