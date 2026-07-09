---
title: ref テンプレ内要素の結果ビュー形が未確定 (repeat 下の flat 化 / ref 要素自身の露出)
status: open
category: design
created: 2026-07-09T12:58:37+09:00
last_read:
open_entered: 2026-07-09T12:58:37+09:00
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

# ref テンプレ内要素の結果ビュー形が未確定 (repeat 下の flat 化 / ref 要素自身の露出)

## 概要

repeat 配下にある ref テンプレ (or [rgb seq | colorname] のような構造参照) の
result / interpretations ビューの形が未確定。repeat 下の複数バインドが
flat 化されない非対称、および値セルを持たない ref 要素自身がキーとして
result に露出する挙動、どちらも裁定が必要。

## 背景

2026-07-09、kuu.mbt DR-078 decode 実装後の fixture 化作業で露呈した。

`hlcolors := color+` (definitions.templates の or [rgb seq | colorname]) を
parse すると:

- `["red","blue"]` の result = `{colorname: "blue", hlcolors: []}` —
  colorname は **last-wins スカラー** (repeat 下の複数バインドが
  flat 化されない)、**hlcolors: [] が混入** (値を持たない ref 構造参照が
  uniform array 注入を受けている)
- ambiguous の interpretations にも同じ形が出る

### 論点

1. **repeat 下のテンプレ内要素の flat 化**: repeat 対象そのもの (BCell、
   例 fixtures/repeat-parse/flatten-scalar-tail.json の src → ["a","b"])
   には flatten accumulator が付くが、ref テンプレ内の名前付き要素
   (colorname / r,g,b) には付かない非対称。DR-044 の「repeat 複数バインドは
   1 リストに平坦化」がテンプレ内要素まで及ぶべきか。及ぶ場合、rgb 枝が
   2 反復したときの形 ({r:[..], g:[..]} の列単位配列?) まで定義が要る
2. **ref 要素自身の露出**: hlcolors は値セルを持たない構造参照なのに
   result にキーが出る。非露出 (キー自体なし) が自然に見えるが、
   「反復系は 0 発火でも []」(DR-051 §2b) の適用範囲の明確化が要る

### 現状の凌ぎ

fixtures/repeat-parse/ref-or-template.json は effects (bindings 面) と
outcome までの検証に絞り、result / interpretations の pin を保留
(why に明記)。slice の元テスト (phase4/phase10) も bindings レベルまでしか
pin していなかったので、蒸留の輪郭は失っていない。

kawaz 裁定待ちの議論球。

## 受け入れ条件

- [ ] repeat 下のテンプレ内要素 flat 化の要否を裁定 (DR 起票 or 既存 DR-044 の適用範囲明確化)
- [ ] 値セルを持たない ref 要素の result 露出/非露出を裁定
- [ ] fixtures/repeat-parse/ref-or-template.json の result / interpretations pin 保留を解消
