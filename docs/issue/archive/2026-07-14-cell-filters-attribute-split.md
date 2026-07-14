---
title: cell_filters の multiple 有無による二重意味を属性分割で解消する (kawaz 裁定 2026-07-13)
status: resolved
category: design
created: 2026-07-14T09:37:24+09:00
last_read: 2026-07-14T09:43:22+09:00
open_entered:
wip_entered: 2026-07-14T09:37:24+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-14T13:40:45+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-102", "implemented", "done: kuu.mbt 44e51ba0 (8 files) landed; final_filters/accum_filters 分割で層違い2段判定消滅; conformance decoded=218/mismatches=0; CI green (lockstep push #1 92a52de6 -> #3 414131f1)", "follow-up: issue/2026-07-14-codex-review-dr102-dr103-postland (post-land codex レビュー指摘)"]
blocked_by:
origin: 自リポ TODO
---

# cell_filters の multiple 有無による二重意味を属性分割で解消する (kawaz 裁定 2026-07-13)

## 概要

`cell_filters` は非 accum 位置 (T→T、scalar filter registry) と accum 位置
(Acc→Acc、ARRAY filter registry) という **明らかに型が異なるユニオン** を
1 つの属性名に内包している。「cell」という名前自体が「その要素の値の置き場」
という内部事情由来で、利用者の目的語彙に合っていない。両方を 1 つのクロージャ
として扱いたい利用者はいない。

対応: `cell_filters` を属性分割する (命名は要提案)。1 属性 = 1 registry = 1
語彙にすることで、DR-101 §3 の位置切替判定マトリクス・層違い invalid-range
判定・DR-102 (未 push) が丸ごと不要化する。「別属性の綴りを書いた」ケースは
hint (kind と直交、レンダラ管轄) で誘導する。

## 背景

kawaz 裁定 (2026-07-13、VF-Q/VF-Q2 への回答として前提を棄却): `cell_filters`
の二重意味そのものが根本問題であり、判定マトリクスの精緻化 (DR-101 §3 の穴埋め
= DR-102) は対症療法に過ぎない。

原則 (kawaz 明言):
- 違うものを同じものとして扱わない
- 解像度が上がった時点で名付けを正す
- 既存を壊すことは正しさがあれば問題ない (ドラフト期)

波及実測 (2026-07-13):
- spec 49 箇所 (fixtures 9 本: count-parse/basic, count-parse/cell-filter-range,
  definition-error/cell-filters-\* 2 本, multiple-parse/default-cell-ops,
  multiple-parse/filters-each, piece-filters/config-source,
  piece-filters/env-source, value-typing/cell-filter-reject
  + docs/DESIGN, LOWERING, CONFORMANCE, REFERENCE
  + schema/wire.schema.json, builtin-descriptors.json)
- kuu.mbt 121 箇所 (src/core の filters/installer/resolve/node/eval + wbtest 3 本)

影響 DR:
- DR-034 (3 属性統合)、DR-079 (座席格子)、DR-101 §3 (判定順) は Superseded
  節追記の前例形式で部分 supersede
- 未 push の DR-102 チェーン (spec 3 commit + kuu.mbt 実装 1 commit) はリワーク
  で置き換え

## 裁定 (2026-07-14 確定)

kawaz 裁定確定 (SPL-Q バッチへの回答):

- **SPL-Q6=a**: 非 accum 側の最終値ガード席を独立属性として残す。「違うものを
  違うものとして扱え、同じにするな」。corpus 実例不在は表現力削減の論拠にならない
- **SPL-Q1=`final_filters`**: 非 accum、T→T、scalar filter registry
- **SPL-Q2=`accum_filters`**: accum、Acc→Acc、ARRAY filter registry
- **SPL-Q3=C**: 旧 DR-102 の未 push commit 3 件は jj abandon、番号 102 は
  分割 DR に再利用
- **SPL-Q4**: CONFORMANCE の argv_pos 規約を両席 argv.length 帰属で明文補正
- **SPL-Q5**: 排他 (multiple 有無 × 属性) は definition-error
  kind=invalid-range (scalar-array-default 前例)

## 受け入れ条件

- [ ] 命名裁定 (SPL-Q バッチで提示予定)
- [ ] 新 DR 起案
- [ ] wire schema・fixtures・corpus・docs・kuu.mbt 実装の一斉追随
- [ ] conformance mismatches=0
- [ ] ロックステップ push (spec push → pin bump → kuu.mbt push を連続実行)

## TODO

<!-- wip 時のみ -->

- [ ] 属性分割の命名案を SPL-Q バッチで提示・裁定を得る
- [ ] 新 DR (命名未定、DR-102 チェーンの置き換え) を起案
- [ ] DR-034 / DR-079 / DR-101 §3 に Superseded 節を追記
- [ ] spec 49 箇所 + kuu.mbt 121 箇所を一斉追随
- [ ] conformance decoded 数維持・mismatches=0 を確認

## 関連

- docs/issue/2026-07-13-dr101-non-accum-array-only-filter-vocab.md
  (本裁定により前提解消、close 予定)
- DR-034-multiple-structure.md
- DR-079-filter-seat-lattice-and-artifact-anchored-names.md
- DR-101-unknown-filter-definition-error.md
