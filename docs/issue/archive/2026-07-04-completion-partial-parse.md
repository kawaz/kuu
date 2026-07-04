---
title: 補完 — partial parse モードと completer の設計
status: resolved
category: design
created: 2026-07-04T15:56:31+09:00
last_read:
open_entered: 2026-07-04T15:56:31+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-04T18:03:11+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-060","implemented"]
blocked_by:
origin: 自リポ TODO
---

# 補完 — partial parse モードと completer の設計

## 概要

findings F-013 (completer の AtomicAST フィールド正規形・registry 区分・シグネチャ) と
F-038 (shell completion 用 partial parse モード — DR-038 の全消費契約とは別モードの
「部分入力 + カーソル位置 → 候補ノード列挙」API) を一括で確定する設計 issue。

## 背景

alias/help issue (2026-07-03-alias-normalization-help-completion-installer、
DR-056/057/058 で解消済み) から切り離した補完系の残務。alias 側の論点 (canonical 表示・
deprecated 警告・宣言語彙の所有/参照区別) は当該 issue で決着済みだが、補完固有の
API 設計・completer registry 区分はそちらでは扱わなかった。

### 論点

1. **partial parse の API 契約** — 入力列 + カーソル位置 → 期待ノード種別リストを返す
   契約をどう定義するか。DR-038 が確定した「全消費前提のパーサ契約」とは別モードとして
   部分入力を受け付ける必要がある
2. **completer registry 区分と組み込み completer** — files/dirs 等の組み込み completer の
   正規形 (DESIGN §13.9 で未予約のまま)
3. **tab-tab / 途中入力の切替仕様** — 未入力 tab-tab は canonical のみ、途中入力
   (`e<tab>` 等) は alias も展開する切替仕様。DR-057 の alias 表示帰属と接続する
4. **hidden の補完除外** — DR-058 で確定済みのルールを本設計にどう適用するか

## 受け入れ条件

- [ ] partial parse モードの API 契約 (入力列 + カーソル位置 → 期待ノード種別リスト) を確定する
- [ ] completer registry の区分と組み込み completer (files/dirs 等) の正規形を DESIGN §13.9 に追記する
- [ ] tab-tab (未入力) / 途中入力での alias 展開切替仕様を確定し DR-057 と整合させる
- [ ] hidden ノードの補完除外 (DR-058) を本設計に適用する
- [ ] F-013 / F-038 の内容を本設計に反映し、必要なら DR として起票する

## 関連

DR-038/056/057/058、F-013/F-038、DESIGN §13.9
