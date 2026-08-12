---
title: value 持ち command の default_fn 単独時の値空間が未規定
status: open
category: design
created: 2026-08-12T12:07:28+09:00
last_read:
open_entered: 2026-08-12T12:07:28+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kuu spec リポ自リポ TODO
---

# value 持ち command の default_fn 単独時の値空間が未規定

## 概要

DR-134 は command node の value/default/default_fn 担体を合法化したが、command は `type:"command"` なので値の型を宣言する席が無い。`value:` / `default:` の literal がある場合は literal の JSON 型がそのまま値空間になる (fixture `command-scope/value-command.json` の `default:7` が number で座る形で pin 済み、DR-134 §5「値供給は既存 node 意味論」から導出可能)。しかし literal を伴わない `default_fn` だけの担体は型の手掛かりが無く、参照実装は値なし node の既定と同じ string へ倒した (kuu.mbt `lowering.mbt` の `command_value_type`、2026-08-12)。この読みで良いか、あるいは型宣言語彙が要るかが未規定。

## 背景

DR-134 §5、kuu.mbt commit 61715d3c 参照。fixture を足すなら「default_fn が number を返す value 持ち command」の形。

## 受け入れ条件

- [ ] default_fn 単独担体の値空間の裁定 (string 既定 or 型宣言語彙追加) が確定する
- [ ] 裁定に応じた fixture (default_fn が number を返す value 持ち command 等) が追加される
