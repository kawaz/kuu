---
title: 参照実装の CommandDef が value 担体を持たず command の value を reject する (DR-134 未追随)
status: resolved
category: task
created: 2026-08-12T09:47:45+09:00
last_read:
open_entered: 2026-08-12T09:47:45+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-08-16T07:21:43+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-134","implemented","followup:2026-08-12-command-definition-error-parity-review-followup"]
blocked_by:
origin: DR-134 起草時の実測 (2026-08-12)
---

# 参照実装の CommandDef が value 担体を持たず command の value を reject する (DR-134 未追随)

## 概要

DR-134 (command は値かスコープのどちらかを名乗る) が command node の `value` を合法化したが、参照実装 (kuu.mbt) は値の担体を持たず decode 段で reject する。DR-134 の fixture 3 件は実装が追随するまで通らない。

## 背景

### 現象 (実測 2026-08-12)

spec リポの新 fixture を入れた状態で kuu.mbt の `moon test -p kuu` を実行:

- `[json-conformance] decoded=403 ran_cases=912 skipped=2 mismatches=1`
- `skip 2× command has unsupported key 'value'` (command-scope/value-command.json と command-scope/value-command-non-occupying-children.json が decode 段で skip)
- `diverge definition-error/command-value-occupying-child.json::occupying-children-under-value-command :: EXPECTED-DEFINITION-ERROR got=malformed:command has unsupported key 'value'`
- ledger は MDR-001 §6 で空始まりのため UNEXPECTED SKIP でテスト失敗 (`Total tests: 727, passed: 726, failed: 1`)

### 原因 (コード引用)

- `src/internal/engine/declaration.mbt:417` の `struct CommandDef { name, body, export_key }` に値セルの担体が無い
- `src/kuu/wire_decode.mbt` の `dec_command` が `allowed = ["type","name","options","positionals","commands","export_key","config"]` + installer 所有語彙で `allowed_keys(o, allowed, "command")` を掛けており、`value` / `default` / `default_fn` はこの許可集合に無いので DecodeSkip になる

### 追随に要る作業 (spec 側の規範は DR-134 が正本)

- CommandDef に値セルの担体を持たせ、選択時に親スコープのキーへ値を射影する (kv ではない、DR-134 §3)。sources は値を確定させた席のタグ (`value:` 由来なら const)
- 未選択は値持ち・default 持ちでも null で一様 (DR-134 §4、DR-130 §2/§5)
- 値持ち command の内側に結果キー占有子 (DR-120 §4 占有側) がある形を definition-error kind=invalid-range で報告する (DR-134 §2、element は当該 command の name)
- 非占有子 (`dd` / `type:"none"` / `link` / `alias` / `#` 内部セル) との共存は合法

### 注意 (push 順序)

spec 側の fixture は既に commit 済み (未 push)。spec を先に push すると kuu.mbt の conformance が red になるので、実装追随とロックステップで push すること。

## 受け入れ条件

- [ ] fixtures/command-scope/value-command.json が通る
- [ ] fixtures/command-scope/value-command-non-occupying-children.json が通る
- [ ] fixtures/definition-error/command-value-occupying-child.json が通る (errors = {a,b} の invalid-range)
- [ ] skip ledger / divergence ledger が空のまま緑
