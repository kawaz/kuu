---
title: unset variant × repeat 閉包の相互作用が未規定
status: open
category: design
created: 2026-07-29T05:09:42+09:00
last_read:
open_entered: 2026-07-29T05:09:42+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: fixture-repdef (DR-123 conformance fixture 作成中の発見)
---

# unset variant と repeat 閉包の相互作用が未規定

## 概要

unset variant (例 `long: ["reset:unset"]`) を `repeat:` 閉包を持つ要素へ撃つ場合の相互作用が、どの DR にも規定されていない。具体的な未確定点:

1. unset の発火が閉包の min 消費段を要求するのか (unset は値を消費しない発火のはずだが、閉包要素の入口としてどう振る舞うか)
2. 閉包の反復途中 (発火列の間) に unset を撃てるのか、その場合それまでの蓄積はどうなるか
3. unset 後の再発火でセルは再び「初回発火の `[]` 初期化」(DR-123 §1) からやり直すのか

DR-045 (unset 効果) は cell op の側から、DR-043 (repeat の閉包と min の枝生成) は消費構造の側から、それぞれ独立に規定しており、両者が同一要素上で交わる場合の裁定が無い。

## 背景

DR-123 の fixture pin 作成時 (2026-07-29) に「unset のラダー開放 × 宣言 default」を repeat セルで書こうとして発見した。未規定のため multiple セル構成 (`fixtures/multiple-parse/unset-opens-ladder-to-declared-default.json`) へ置き換えて回避した。

## 受け入れ条件

- [ ] 上記 (1)-(3) を裁定し DR 化 (または DR-045 / DR-123 追補)
- [ ] 裁定内容を repeat セル版の unset fixture で pin

## 関連

- DR-045 §2 (unset のラダー開放)
- DR-123 (反復セルの初期化位相)
- DR-043 (repeat 閉包)

## TODO

<!-- wip 時のみ -->
