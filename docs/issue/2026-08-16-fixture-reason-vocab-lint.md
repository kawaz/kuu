---
title: fixture の errors[].reason 宣言語彙 lint が無い
status: open
category: task
created: 2026-08-16T04:12:42+09:00
last_read:
open_entered: 2026-08-16T04:12:42+09:00
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

# fixture の errors[].reason 宣言語彙 lint が無い

## 概要

fixture の `errors[].reason` が宣言語彙 (descriptor の reasons + REFERENCE §7.3 エンジン表) に含まれるかを検査する lint が無い — opus レビュー m-2 (2026-08-16、DR-138 サイクル)。

現状 `lint-fixtures` は schema 構文検査のみで reason は open pattern。fixture 側の reason typo (例: incomplete_value の綴り違い) は runner 実行まで検出されない。

## 背景

検討: `scripts/lint-fixtures.py` に「fixture の reason ⊆ (builtin-descriptors の全 reasons ∪ REFERENCE §7.3 の手動転記表)」の検査を追加する。§7.3 は機械検査対象外の手動転記なので、正本をどこに置くか (REFERENCE の `kuu-lint:vocab` マーカー化等) の設計判断が要る。

## 受け入れ条件

- [ ] reason 語彙の正本をどこに置くか (REFERENCE §7.3 の手動転記 vs builtin-descriptors 側への一本化 vs マーカー化) の設計判断
- [ ] `scripts/lint-fixtures.py` に fixture の `errors[].reason` ⊆ 宣言語彙集合 の検査を追加
- [ ] typo 系 reason (例: incomplete_value の綴り違い) が lint 時点で検出できることを確認

## TODO

<!-- wip 時のみ -->
