---
title: フェーズ2-③ parse fixture 蒸留の 1:1 網羅性 audit (slice → fixture case)
status: open
category: task
created: 2026-07-08T21:58:01+09:00
last_read:
open_entered: 2026-07-08T21:58:01+09:00
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

# フェーズ2-③ parse fixture 蒸留の 1:1 網羅性 audit (slice → fixture case)

## 概要

phase23-distill-ledger close 時の切り出し。台帳の 15 領域 (D1〜D15) は全て fixture 実装済みだが、slice PoC の各テスト行 (phase1〜29、167 テスト) が該当 fixture のどの case にマップされたかを 1 行ずつ突き合わせる検算は未実施。fixture 数の充足と conformance 0 mismatch (318 case) は間接証拠に留まる。

## 背景

2026-07-08 台帳 issue 監査にて、蒸留計画の実行 (旧台帳 phase23-distill-ledger) と蒸留成果の網羅性 audit (本 issue) を分離した。

## 受け入れ条件

- [ ] slice テスト一覧 (旧台帳の割当表を出発点に) と fixtures/** の case を 1:1 マッピングし、漏れた argv バリアントを列挙する
- [ ] 漏れが出たら fixture 追加、または「意図的に蒸留しない」判断を根拠付きで記録する (網羅性の主張が価値を持つ文書なので「該当なし」明示が正)
