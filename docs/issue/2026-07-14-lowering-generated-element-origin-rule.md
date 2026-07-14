---
title: ref/link 越し・lowering 生成要素の complete origin 決定則が未定義
status: open
category: design
created: 2026-07-14T20:11:44+09:00
last_read:
open_entered: 2026-07-14T20:11:44+09:00
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

# ref/link 越し・lowering 生成要素の complete origin 決定則が未定義

## 概要

codex レビュー #2 の M-14 (残課題)。DR-104 §2 の origin は「由来要素名」と定義され、alias は
DR-057 帰結で canonical (meta.json pin 済み) だが、以下 2 点が未規定:

- ref/link 越しの complete 候補が、参照元・参照先のどちらの名前を origin として返すか
- unnamed / generated 要素 (repeat installer 等の lowering 産物) の origin が何になるか

## 背景

DR-104 §2 の明確化 note (c) で「実需が出た時に決める」保留になっている論点。実装済みの
origin 決定則は named canonical element の単純ケースまでで、ref/link を辿った先や lowering
で生成された unnamed 要素に対する origin 抽出の仕様がない。

## 受け入れ条件

- [ ] fixture が要求する具体場面が出た時点で、「lowering 後の owner element の wire name」
      等の抽出関数として origin 決定則を確定する
- [ ] DR-104 §2 に決定則を追記し、明確化 note (c) を解消する

## TODO

<!-- wip 時のみ -->
