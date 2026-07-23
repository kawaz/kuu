---
title: completion_script 複数入口の同時発火時の内部セル勝者順が未裁定
status: resolved
category: design
created: 2026-07-23T17:15:32+09:00
last_read:
open_entered: 2026-07-23T17:15:32+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-23T23:22:15+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-117","implemented"]
blocked_by:
origin: 自リポ TODO
---

# completion_script 複数入口の同時発火時の内部セル勝者順が未裁定

## 概要

同一 scope に複数の `completion_script` 入口 (例: option 形と positional 形を併置)
があり同時発火した場合、内部セル `#completion_script` の勝者を決める規則が
spec (DR-117) では規定されていない。

現 kuu.mbt 実装では、この場合の勝者は entity 宣言順で決まる (CLI 出現順ではない)。

## 背景

DR-117 実装レビュー (2026-07-23) で検出。

last-wins (CLI 出現順) が kuu の他の string セル (`help_category` の last-wins 等)
と整合する候補として挙がっているが、複数 `completion_script` 入口の実需自体が薄い。

## 受け入れ条件

- [ ] 実需が出た時、または次に DR-117 を触る時に、勝者順の規則を裁定し spec に規範化する
- [ ] 裁定に応じて fixture pin を追加し、実装 (entity 宣言順 or last-wins) を規範に合わせる

## TODO

<!-- wip 時のみ -->
