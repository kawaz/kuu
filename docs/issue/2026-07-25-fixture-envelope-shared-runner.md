---
title: fixture envelope を第三者が再利用できる共通 runner 資産が無い (F6)
status: open
category: design
created: 2026-07-25T15:58:51+09:00
last_read:
open_entered: 2026-07-25T15:58:51+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (dogfooding D1 findings)
---

# fixture envelope を第三者が再利用できる共通 runner 資産が無い (F6)

## 概要

dogfooding D1 (kuu-cli 自己定義) で判明した資産ギャップ。kuu-cli の self
harness (`impl/mbt/tests/self/definition.sh`、kuu-cli リポ) は独自 shell 実装に
落ちた。spec リポの fixture envelope 形式を外部実装がそのまま食える共通
runner、または runner の書き方を示す runbook が無いため、dogfooding 実装
ごとに harness を自作するコストが発生している。

## 背景

CONFORMANCE.md の守備範囲拡張候補として記録されたもの。

一次資料: `docs/findings/2026-07-24-dogfooding-d1-expressiveness.md` の F6 節。
共通 runner を spec リポ側に用意するか、runbook 化に留めるか、
CONFORMANCE.md の記述拡張で足りるか等の採否・形式は spec サイクルの裁定に
委ねる。

(category: design — 要確認。一次資料は「design またはドキュメント」と
両論を残しており、runbook/CONFORMANCE.md 寄りの documentation 整理として
扱う可能性もある)

## 受け入れ条件

- [ ] 共通 runner (実行可能資産) と runbook (手順書) のどちらで解決するかを
      spec サイクルで判断
- [ ] CONFORMANCE.md の守備範囲拡張が必要かを判断し、必要なら反映
