---
title: borrow の対象名が参照層で存在検査されず definition ACCEPTED になる
status: open
category: design
created: 2026-08-16T10:55:36+09:00
last_read:
open_entered: 2026-08-16T10:55:36+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kuu (union-impl2 報告)
---

# borrow の対象名が参照層で存在検査されず definition ACCEPTED になる

## 概要

`default_fn: "borrow:<存在しない対象>"` が definition ACCEPTED になり、実行時に黙って値なし
(供給なしとしてラダー素通り) になる。対照の `link: "<存在しない対象>"` は参照層で
definition-error `absent-ref` REJECTED になる。kuu.mbt での実測 (union-impl2 報告、2026-08-16)。

## 背景

裁定候補: borrow の対象名も参照層 (DR-067) の absent-ref 検査対象にするか。

definition-error 側が筋に見える根拠:
1. DR-054 §4 の Error 基準 — 対象が存在しない borrow は全入力で値を供給できない構成
2. link との対称性 — どちらも参照識別子 (id) 軸の名前参照 (DR-136 §6)。borrow だけ素通り
   する非対称に設計理由が見当たらない

対極の材料: borrow は default 席の fn (DR-125 §3) で「実行時に他セルを引く」建付けのため、
遅延解決を意図した設計と読む余地もある (DR-029 の「解決は遅延」の残響)。ただし DR-127 §7 が
「name 参照 (セル空間) は定義時に束縛され、値構造の降下だけが遅延する」と分界した後なので、
対象名の存在検査は定義時静的に倒せるはず。

kawaz 裁定待ち — 裁定が definition-error 側なら DR-125 §3 への追補 + definition-error
fixture (borrow-absent-target) を追加。

## 受け入れ条件

- [ ] kawaz の裁定 (definition-error 化 or 現状維持) が確定する
- [ ] definition-error 側裁定の場合: DR-125 §3 への追補、および
      definition-error fixture (borrow-absent-target) の追加
