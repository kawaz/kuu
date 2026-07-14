---
title: type:"argv0" — $0 を値注入する preset の構想 (需要が出たら)
status: idea
category: design
created: 2026-07-14T11:49:08+09:00
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
origin: kawaz スケッチ (args 改名裁定 COMP-Q1d 派生, 2026-07-14) — 自リポ TODO
---

# type:"argv0" — $0 を値注入する preset の構想 (需要が出たら)

## 概要

argv0 (プログラム名 `$0`) によって動作を変えるコマンド (busybox 型
multi-call binary 等) への kuu の関わり方を整理する。

基本方針: **kuu 側での検証・対応は今は不要**。アプリ側がまず argv0 だけ見て
複数の引数定義から選択し、その定義で引数パースすれば済む。定義選択は
アプリの関心であって、kuu は選ばれた定義で args をパースするだけ。

## 背景

kawaz スケッチ (2026-07-14、fixture 基底フィールド argv → args 改名裁定の
際の派生)。

前提: 基底フィールドは `args` (`$0` 非包含) で統一済み (issue
`2026-07-14-argv-to-args-rename` 参照)。このため `$0` が必要な場面はこの種の
明示的な値源で供給する形になる。

将来の可能性 (需要は限りなく低い想定): `type:"tty"` (DR-098/099) と同型の
**値注入するだけの preset** として `type:"argv0"` を作ることはできる。
`values` や `filter` と合成して「特定の名前の `$0` 以外は弾く」のような
使い方もありうる。

## 受け入れ条件 (= idea 段階につき着手条件)

- [ ] corpus/real-cli で multi-call 型 (busybox 等) の実需が出た時に再訪
- [ ] 再訪時、`type:"tty"` (DR-098/099) の値注入 preset 実装パターンを参照して設計する
