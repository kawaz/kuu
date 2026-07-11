---
title: wire.schema.json の未対応構文 2 件 (env の配列形 / multiple: true)
status: open
category: task
created: 2026-07-12T01:30:16+09:00
last_read:
open_entered: 2026-07-12T01:30:16+09:00
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

# wire.schema.json の未対応構文 2 件 (env の配列形 / multiple: true)

## 概要

wire.schema.json の properties 定義に未反映の構文 2 件を、spec 正本を確認のうえ schema へ反映する。

## 背景

schema-writer の実機バリデート (2026-07-12) で発見した既存ギャップ。
fixtures/constraints-parse/requires-bool-target*.json の `env: ["C"]` (配列形) と
fixtures/definition-error/*.json の `multiple: true` (boolean 形) が wire.schema.json の
properties 定義に反映されていない (バリデートでこの 2 種のみ fail)。
spec 正本 (DESIGN §12 の env 多重宣言 / multiple の bool 糖衣) を確認のうえ schema に反映する。

## 受け入れ条件

- [ ] fixtures 全 188 件が schema バリデート pass

## 関連

DR-067 / DR-095 の実機検証
