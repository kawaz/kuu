---
title: CONFORMANCE §2 に tried_triggers / help_entry の optional フィールドを追加する
status: resolved
category: design
created: 2026-07-09T10:50:03+09:00
last_read: 2026-07-10T21:26:32+09:00
open_entered: 2026-07-09T10:50:03+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-10T21:37:41+09:00
discard_reason:
pending_reason:
close_reason: ["implemented","spec-commit:dd445aa3","impl-commit:bf5e5402","done:CONFORMANCE §2/§3 に help_entry(failure/ambiguous, optional String, 構造等価)と tried_triggers(failure のみ, optional Array[String], 集合比較・順序非規範・空配列は0個の明示検証)を語彙化, fixtures/failure-actions/tried-triggers-scope.json 2 case で失敗位置スコープ基準を pin, conformance decoded=175/ran_cases=455/skipped=0/mismatches=0, distill audit残1件(slice phase23:90)解消, 残未裁定は dd綴り--のtried_triggers混在可否のみkawazバッチ管理"]
blocked_by:
origin: 自リポ TODO
---

# CONFORMANCE §2 に tried_triggers / help_entry の optional フィールドを追加する

## 概要

DR-053 §4 は failure の表示素材として help_entry (help 入口の綴り) と
tried_triggers (失敗位置で試行された綴り一覧、「Did you mean」素材) を規定し、
kuu.mbt は実装済み (tried_triggers は 2026-07-08 に失敗位置のスコープ基準へ
修正済み = kuu.mbt commit e43facd7)。しかし conformance fixture の failure
期待値 (CONFORMANCE §2 の outcome union) にこれらを書く投影が未定義で、
fixture で輪郭を固定できない (蒸留 1:1 audit の漏れ #8 = slice phase23:90、
findings/2026-07-09-distill-1to1-coverage-audit.md 参照)。

## 背景

蒸留 1:1 網羅性 audit (2026-07-09) の blocked 漏れ #8 として発見。

## 受け入れ条件

- [ ] CONFORMANCE §2 の failure 形に tried_triggers / help_entry を optional
      検証フィールドとして追加 (warnings / sources / reason / path と同じ
      opt-in パターン)
- [ ] tried_triggers は集合比較か順序比較かを決める (DR-053 §4 は素材列挙で
      順序非規範のはず → 集合比較が自然)
- [ ] kuu.mbt harness の投影追加 + fixture 1 本 (subcommand 内失敗で子スコープの
      トリガが出る輪郭 = kuu.mbt の e43facd7 修正の conformance 固定)
