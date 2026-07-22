---
title: ref/link 越し・lowering 生成要素の complete origin 決定則が未定義
status: resolved
category: design
created: 2026-07-14T20:11:44+09:00
last_read:
open_entered: 2026-07-14T20:11:44+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-22T15:38:23+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-104", "implemented", "fixtures/complete/ref-template-origin-trigger.json", "fixtures/complete/ref-template-origin-value.json", "done:MISC-Q1=a 裁定 (2026-07-22) で DR-104 §2 note (iv) 確定 — trigger 候補の origin は参照元要素名、値位置候補は template 内部 leaf 名。非対称は意図設計。§3 6フィールド identity による非 dedup も同 fixture で pin"]
blocked_by:
origin: 自リポ TODO
---

# ref/link 越し・lowering 生成要素の complete origin 決定則が未定義

## 概要

codex レビュー #2 の M-14 (残課題)。DR-104 §2 の origin は「由来要素名」と定義され、alias は
DR-057 帰結で canonical (meta.json pin 済み)。当初未規定だった断面は codex #3 A-M-9 追加分を
含め計 4 つあったが、統括検証 (2026-07-15) による DR-104 §2 の明確化 note でうち 3 断面は
確定・解消済み。**残スコープは ref template (DR-078) 越しの候補の origin 非対称のみ**。

## 解消済みの断面 (統括検証 2026-07-15)

- **global 越し**: 宣言元 canonical 名。fixtures/complete/global-scope-union.json で pin 済み
- **repeat lowering 内部 id**: origin に不出現。fixtures/complete/repeat-internal-id-origin.json で pin
- **DR-063 A.1 匿名 exact 候補**: origin は spelling 自身。fixtures/complete/anonymous-exact-origin.json で pin

## 残スコープ: ref template (DR-078) 越しの候補の origin 非対称

参照実装 (kuu.mbt) は trigger 候補に参照元要素名、値位置候補に template 内部 leaf 名を返す
非対称を持つ (2026-07-15 調査で発見、fixture 未検証)。これを「trigger=入口の名前 / value=
値セルの名前として仕様化」するか「どちらかに統一」するかは真の設計判断であり、実需 fixture
が出た時に確定する (DR-104 note の保留残置と対応)。

確定時は DR-104 §3 の 6 フィールド同一性への影響 (同一実体を指す trigger/value 候補が origin
差で dedup 分裂しないか) の実測検証も要る。

## 受け入れ条件

- [ ] ref template 越しの trigger/value 候補で origin を要求する fixture が出た時点で、
      「trigger=入口の名前 / value=値セルの名前」仕様化 or どちらかへの統一かを確定する
- [ ] DR-104 §2 に決定則を追記し、ref template 経由分の明確化 note を解消する
- [ ] 確定時、DR-104 §3 の 6 フィールド同一性への dedup 影響 (trigger/value 候補が origin
      差で分裂しないか) を実測検証する

## TODO

<!-- wip 時のみ -->
