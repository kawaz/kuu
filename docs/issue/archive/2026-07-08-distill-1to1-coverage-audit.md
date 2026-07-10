---
title: フェーズ2-③ parse fixture 蒸留の 1:1 網羅性 audit (slice → fixture case)
status: resolved
category: task
created: 2026-07-08T21:58:01+09:00
last_read:
open_entered: 2026-07-08T21:58:01+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-10T18:55:44+09:00
discard_reason:
pending_reason:
close_reason: ["finding/2026-07-09-distill-1to1-coverage-audit","done:2026-07-10 差分監査で漏れ8件中7件がfixture追加で解消済みと確認、残1件(phase23:90)はissue conformance-tried-triggers-help-entry-fieldsが追跡継続"]
blocked_by:
origin: 自リポ TODO
---

# フェーズ2-③ parse fixture 蒸留の 1:1 網羅性 audit (slice → fixture case)

## 概要

phase23-distill-ledger close 時の切り出し。台帳の 15 領域 (D1〜D15) は全て fixture 実装済みだが、slice PoC の各テスト行 (phase1〜29、167 テスト) が該当 fixture のどの case にマップされたかを 1 行ずつ突き合わせる検算は未実施。fixture 数の充足と conformance 0 mismatch (318 case) は間接証拠に留まる。

## 背景

2026-07-08 台帳 issue 監査にて、蒸留計画の実行 (旧台帳 phase23-distill-ledger) と蒸留成果の網羅性 audit (本 issue) を分離した。

## 受け入れ条件

- [x] slice テスト一覧 (旧台帳の割当表を出発点に) と fixtures/** の case を 1:1 マッピングし、漏れた argv バリアントを列挙する
      → 完了 (2026-07-09 audit worker、`docs/findings/2026-07-09-distill-1to1-coverage-audit.md` に確定成果を permanent 化)。124 items / 蒸留済み 114 / 意図的非蒸留 3 (phase1:130 / 21:59 / 25:15) / 漏れ 8 (即対応可 6 + blocked 2)
- [ ] 漏れが出たら fixture 追加、または「意図的に蒸留しない」判断を根拠付きで記録する (網羅性の主張が価値を持つ文書なので「該当なし」明示が正)
      → 第二段部分完了 (2026-07-09): 6 件のうち 2 件を蒸留 (`repeat-parse/flatten-scalar-tail.json` = phase7:47 / `command-scope/repeat-inside-scope.json` = phase7:56)。4 件は要検討/要裁定として保留 — #1 phase4:114 + #2 phase10:64 (or-template × positional × repeat の wire 表現の実装ギャップを検出、`positional × or × repeat` の lowering が現状 rgb 枝のみを見て string 枝を活性化しない事象を実測 = 別 issue で追跡)、#3 phase14:157 (unwrap_single collector の座席未定、要裁定)、#6 phase25:171 (手組 Or/Bind に依存する engine 内部テスト、wire form で 2 完全経路を作る自然な構成が見当たらず、phase1:130 と同型の engine 内部として非対象化を推奨)。blocked 2 件 (#7 / #8) と併せて別 issue 起票を team-lead に依頼済み
