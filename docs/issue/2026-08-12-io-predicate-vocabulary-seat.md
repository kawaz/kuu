---
title: IO 述語系語彙 (readable / exists / dir) の座席設計
status: open
category: design
created: 2026-08-12T17:40:35+09:00
last_read:
open_entered: 2026-08-12T17:40:35+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kawaz mid=9-10 (2026-08-12) の議論
---

# IO 述語系語彙 (readable / exists / dir) の座席設計

## 概要

値の検証・選択に IO を伴う語彙 (readable / exists / dir 等) を kuu の語彙体系のどこに座席させるかを設計する。

## 背景

kawaz mid=9-10 (2026-08-12) の議論より。用途は 2 つ:

1. **config 探索**: multiple な file 要素のパス列から readable な最初の 1 個を選び、`config_file` が borrow で受ける合成。DR-133 再改稿で探索を fold から分離した帰結として必要になった。
2. **cd 型の補完**: dir 候補 + 存在検証。補完の files/dirs は現行 shell 委譲 (DR-060 §4 / DR-117 §7) だが、値検証は shell に委譲できない。

位置づけの選択肢:

- (a) filter 語彙に IO 系を追加し、descriptor に IO 観測タグを持たせる
- (b) DR-107 の role 軸に IO 検証系の装置区分を新設する

kuu 生態系には config provider という IO 装置の前例がある (DR-050 §2)。

関連: DR-133 (再改稿予定)、DR-107、DR-050 §2、DR-060 §4

## 受け入れ条件

- [ ] IO 述語系語彙 (readable / exists / dir 等) の座席 (filter 語彙拡張 か role 軸新設 か) を裁定する
- [ ] config 探索 (DR-133 再改稿) と cd 型補完の両ユースケースを満たす設計になっている

## TODO

<!-- wip 時のみ -->
