---
title: DR-113 §1 の help_installer.apply 記述と実装位相の差を注記
status: open
category: design
created: 2026-07-21T02:04:48+09:00
last_read:
open_entered: 2026-07-21T02:04:48+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 依頼元プロジェクト (kuu.mbt)
---

# DR-113 §1 の help_installer.apply 記述と実装位相の差を注記

## 概要

DR-113 §1 は「help_installer.apply による preset canonical expansion (内部セル植え付け + cell_fns 供給)」を規定する。
一方 kuu.mbt の実装は、fixture 観測面で等価な暫定位相 (decode-time preset 処理 + 宣言層 snapshot 経由の model 射影) を採っており、
内部セルの Entity 化 + eval への CellFn dispatch 接続は、内部セルを実際に読む consumer (実 CLI の help 発火経路等) が生まれるフェーズへ繰り延べられている。

DR-113 §1 に「apply の canonical expansion は観測等価な実装位相を許す (内部セルの実効化は consumer 出現時)」の注記を足すか、
設計正本 (DR) と実装の対応関係をどう記述するかを、次に DR-113 を触るタイミングで検討する。

## 背景

kuu.mbt 側の issue `helpmeta-preset-canonical-expansion-migration` の close 判断 (2026-07-21) に伴う、
design-impl-bidirectional-check の B 方向 (設計→実装) 記録として起票。旧 issue は kuu.mbt の `docs/issue/archive/` を参照。

fixture 観測面での仕様一致は既に担保済みであり、急ぎの対応は不要。DR-113 を次に編集するタイミングでまとめて検討する。

## 受け入れ条件

- [ ] DR-113 §1 に実装位相の許容範囲 (観測等価な暫定位相を許すか否か) を明記する、または設計/実装対応関係の記述方針を決める
- [ ] 内部セルの Entity 化 + eval への CellFn dispatch 接続が必要になった時点 (consumer 出現時) の移行条件を DR-113 側に残すか判断する

## TODO

<!-- wip 時のみ -->
