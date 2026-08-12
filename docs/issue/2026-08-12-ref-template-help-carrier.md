---
title: ref/template 由来 help_meta の provenance carrier 未実装 (M1 次サイクル)
status: open
category: task
created: 2026-08-12T11:08:26+09:00
last_read: 2026-08-12T14:57:04+09:00
open_entered: 2026-08-12T11:08:26+09:00
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

# ref/template 由来 help_meta の provenance carrier 未実装 (M1 次サイクル)

## 概要

DR-116 §4 の説明引き直しを ref template 越しの候補にも効かせる対応を次サイクルへ持ち越す。inline 宣言分は実装済み (commit 9d56053c)。ref/template 由来分は規模: inline の 2〜3 倍。

## 背景

- (1) `AtomicAST.templates` が `Map[String, @engine.Node]` (front_door.mbt:42) で宣言層でなく help_meta を持たないため、新しい carrier が要る
- (2) DR-078 は同一テンプレへの複数参照を許すため、origin (= テンプレ内部 leaf 名、DR-104 (iv)) だけでは参照インスタンスが決まらない。M4 の fire_path と同型の provenance channel が engine に要る
- (3) DR-104 (iv) の非対称 (trigger の origin = 参照元要素名 / 値位置 = テンプレ内部 leaf) で、2 つの面が別の carrier に照合される

## 着手前の確認手順

wire で ref template 内 leaf に help を書いて lower が通るか、の 1 点から着手する (= surfacing する help がそもそも存在するか)。`fixtures/complete/ref-template-origin-value.json` の leaf は help 無し。

## 受け入れ条件

- [ ] 上記確認手順 (ref template 内 leaf への help 記述 + lower 通過確認) を実施
- [ ] 確認結果を踏まえ、provenance carrier の設計・実装方針を決定
- [ ] ref/template 由来分の DR-116 §4 説明引き直しが実装される

## TODO

<!-- wip 時のみ -->
