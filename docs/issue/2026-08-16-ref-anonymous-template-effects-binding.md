---
title: anonymous scalar template への ref が effects に出ない (binding key が "" で sentinel 扱い)
status: open
category: bug
created: 2026-08-16T01:19:15+09:00
last_read:
open_entered: 2026-08-16T01:19:15+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: self
---

# anonymous scalar template への ref が effects に出ない (binding key が "" で sentinel 扱い)

## 概要

scalar template への ref が effects に出ない (binding key が "" で sentinel 扱い) / category: bug / project: kuu.mbt

## 背景

（起票時の一文のみ、詳細背景は追って追記）

## 受け入れ条件

- [ ] 匿名 scalar template への `ref` で、値セルへの set が `effects` に現れる (binding key が "" になって sentinel gate に落ちる経路の修正)
- [ ] **`fixtures/name-surface/ref-id-axis-lookup.json` に `effects` 期待を復活させる** — 本 bug のため現在は `result` だけで pin している。復活させる期待は次の 3 件 (id 軸の綴り):
  ```json
  {"entity": "box_width",   "op": "set", "operand": 12, "source": "cli"},
  {"entity": "mirror_name", "op": "set", "operand": 34, "source": "cli"},
  {"entity": "mirror_id",   "op": "set", "operand": 56, "source": "cli"}
  ```

## 相互参照

- `fixtures/name-surface/ref-id-axis-lookup.json` — 本 bug の影響で `effects` を書けない fixture。why にも本 issue への参照を書いてある。**DR-136 (trigger_name 軸) とは無関係な別問題**であり、当該 fixture が pin する参照解決の 2 段ルックアップ (DR-136 §6) 自体は `result` で観測できている
