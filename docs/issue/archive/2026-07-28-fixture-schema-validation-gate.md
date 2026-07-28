---
title: fixtures/ の JSON schema 検証を常設 push gate 化
status: resolved
category: task
created: 2026-07-28T21:36:43+09:00
last_read: 2026-07-28T23:37:20+09:00
open_entered: 2026-07-28T21:36:43+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-28T23:40:37+09:00
discard_reason:
pending_reason:
close_reason: ["done:commit usslvuuq/942b8cf9 で scripts/lint-fixtures.py 常設化、justfile lint-fixtures recipe 追加、push deps 組み込み。fresh 実行 383 件 green、意図的違反で FAIL+exit1 実機確認済み"]
blocked_by:
origin: 自リポ TODO
---

# fixtures/ の JSON schema 検証を常設 push gate 化

## 概要

fixtures/ の JSON schema 検証 (`schema/fixture.schema.json` + `schema/wire.schema.json`) を
justfile の常設 recipe (`just lint-fixtures` 等) にして push gate に組み込む。

## 背景

2026-07-28 の Phase 1 作業で判明: spec リポの justfile gate は `lint-reference` /
`lint-descriptors` の 2 本だけで、fixtures/ を一切検証していない。schema 違反の
fixture が push を素通りする状態。

実績: `/tmp/kuu-validate-fixtures.py` (`uv run --with jsonschema`、local store で
`$ref` 解決する 40 行程度のスクリプト) で fixtures/ 配下 全 383 本を検証し green
であることを確認済み。この使い捨てスクリプトを `scripts/` 等へ常設化して
justfile から呼ぶのが最短経路。

## 受け入れ条件

- [x] `just lint-fixtures` が fixtures/ 配下の全 fixture を schema 検証する
- [x] `just lint-fixtures` が push の deps (既存 `lint-reference` / `lint-descriptors`
      と同列) に組み込まれている
