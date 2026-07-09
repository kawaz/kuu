---
title: DESIGN.md §6.2 pieceProcessor 図の相ラベル「post_filters」が wire フィールド名と衝突
status: open
category: design
created: 2026-07-09T16:01:37+09:00
last_read:
open_entered: 2026-07-09T16:01:37+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kuu.mbt (pre_filters 配線作業中の spec 一次資料検証)
---

# DESIGN.md §6.2 pieceProcessor 図の相ラベル「post_filters」が wire フィールド名と衝突

## 概要

DESIGN.md §6.2 (DR-034 の multiple 経路構造) の pieceProcessor 図が、per-piece の
T→T 検証相を「post_filters (FilterChain[T, T]、各 piece 検証)」と表記している。

しかし wire の `post_filters` フィールドは DR-009 の 7 段でいう「累積後
(accumulator 後) の最終値への Acc→Acc」であり、per-piece の T→T は wire の
`filters` フィールド (each 暗黙) が担う。つまり §6.2 図中の相ラベルに wire
フィールド名 `post_filters` を流用したのが衝突源。

`schema/wire.schema.json` の `post_filters` description「parse 後段の T→T
チェイン」も累積後であることが読み取れず曖昧。

## 背景

- DR-040 の count 上限 in_range も累積後前提
- kuu.mbt 実装 `resolve.mbt` の `apply_entity_filters` も累積後で配線済み
- 2026-07-09 pre_filters 配線作業 (kuu.mbt 側 issue
  `pre-split-filters-execution-wiring`) の spec 一次資料検証中に発見

対処案 (要 kawaz 確認、裁定は導出可能に見えるが wire フィールドの意味論確定
のため安全側に倒す):

- §6.2 図の相ラベルを wire 名と紛れない語 (例: `piece_post` または
  `filters`) に改める
- `schema/wire.schema.json` の `post_filters` description を「累積後」と
  明確化する
- DR-034 本文の同様の図も同時確認

## 受け入れ条件

- [ ] §6.2 図の相ラベルと wire フィールド名の衝突が解消されている
- [ ] `schema/wire.schema.json` の `post_filters` description が累積後であると明確
- [ ] DR-034 本文の同様の図の確認が完了

## 2026-07-09 追記: DR-050 の「post_filters」も同じ曖昧さを持つ

DR-050 (config 値源) の「非 string で型一致 → post_filters のみ」の「post_filters」が、
pieceProcessor 内 post 相 (= wire の `filters`、each 相) を指すのか累積後の `post_filters` を
指すのか、本 issue のラベル衝突がそのまま波及して読み分けられない。効果 op と `filters` の
関係を明文化した 2026-07-09 の DESIGN §8.3 追記では、値源席由来の値の chain 通過を
「DR-049/050 が正本」と参照に留めて矛盾を回避した (codex stop-gate 指摘 2 回) — 本 issue の
解消時に DR-050 の当該箇所も同時に語彙を確定させること。
