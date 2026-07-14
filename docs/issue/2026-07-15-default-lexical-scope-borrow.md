---
title: default の lexical-scope 借用構想 (socket-ttl → repeat 行 default 供給)
status: idea
category: design
created: 2026-07-15T02:24:15+09:00
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
origin: kawaz 発案 (DAX-Q2 裁定の際のコメント, 2026-07-15) — 自リポ TODO
---

# default の lexical-scope 借用構想 (socket-ttl → repeat 行 default 供給)

## 概要

repeat 行内で未指定の値について、default を「レキシカルスコープ上の外側の
別要素」から明示的に借用できる構想。現 spec には無い機構 (default は純データ、
値源ラダー §11.4)。

動機の例: `--socket-ttl 60 --socket a.sock --ttl 10 --socket b.sock` のような
repeat 行 (socket ごとの ttl) で、行内未指定の `ttl` の default を外側の
`--socket-ttl` から明示的に借用したい。

kawaz の方向性: descriptor の construction に derived/inherit のような
分かりにくい機構を「勝手に増やす」より、「socket > ttl の default を
socket-ttl から取る」と定義側で明示宣言する形が良さそう。

## 背景

DAX-Q2 (docs/findings/2026-07-15-descriptor-axes-design-recon.md) 裁定の際の
kawaz コメントから派生。

「default を別要素から借用する」機構は現 spec に無い (default は純データ、
値源ラダー §11.4)。既存の継承機構としては DR-062 (filter chain 継承) がある
が、これは別軸 (filter の継承であって default 値の借用ではない)。

## 受け入れ条件 (= idea 段階につき着手条件)

- [ ] 実需 fixture (corpus) が出てきた時に DR 起草

## 設計時の確認事項 (再訪時のメモ)

- 値源ラダーの default 席との合成順 (DR-049/050/051)
- repeat 行スコープと外側スコープの参照解決 (DR-084 の row 構造)
- 循環参照の definition-error 扱い

## 関連

- DR-049/050/051 (値源ラダー)
- DR-062 (filter chain 継承 — 別軸の既存継承機構)
- DR-084 (row 構造)
- docs/findings/2026-07-15-descriptor-axes-design-recon.md DAX-Q2
