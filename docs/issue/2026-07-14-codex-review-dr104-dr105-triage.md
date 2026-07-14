---
title: codex レビュー #2 (DR-104/DR-105) のトリアージと対応
status: wip
category: task
created: 2026-07-14T17:40:48+09:00
last_read: 2026-07-14T18:52:37+09:00
open_entered: 2026-07-14T17:40:48+09:00
wip_entered: 2026-07-14T18:55:03+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (次セッション、dr-105-fixture-impl-followup と並ぶ最優先キュー)
---

# codex レビュー #2 (DR-104/DR-105) のトリアージと対応

## 概要

codex (gpt-5.6-sol) による DR-104 (complete fixture format) / fixtures/complete/
10 本 / DR-105 (flatten ダイヤル + ARRAY filter fallibility) の全方位レビュー。
**全指摘が未トリアージ (統括検証前)** — 各指摘は実物 (DR / fixture / DR-060 の
既存規定) と突き合わせてから採否を判断すること (鵜呑み禁止)。特に C-1 は
DR-060 §2 が word 系を元々「v1 未使用可」としていた事実との整合確認が必要。

## 背景

- 出所: codex (gpt-5.6-sol) による DR-104 / DR-105 全方位レビュー
- レビュー全文: `docs/findings/2026-07-14-codex-review-dr104-dr105.md`

### 指摘内訳

**Critical 4 件**

- **C-1**: word 系入力の扱い — 改名でなく能力削除になっていないか、単語内
  カーソル時の `args_before` 定義が未定 (DR-060 §2 の「word 系は v1 未使用可」
  規定との整合確認が必須)
- **C-2**: 候補同一性が複数規則の同時主張になっていないか
- **C-3**: 集合比較では dedup 契約を検証できない懸念
- **C-4**: DR-105 flatten の適用段階 (どの値に効くか) が未定義

**Major 10+ 件**

- args_after の省略 vs 空配列
- origin 必須規則と例の矛盾
- candidate schema の tagged union 化
- 省略=default と省略=未検証の混在
- completer の現行 wire か将来予約か
- term:"cont" の conformance ゼロ
- 遅延述語 5 種一括規定 vs fixture は exclusive のみ
- constraint fixture の関心分離
- after-filter の見出し過大 + Ambiguous 生存規則未 fixture
- (その他、レビュー全文参照)

### 対応順の提案

1. C 系の検証 (fixture / DR の実物突き合わせ + 必要なら live probe)
2. 成立した指摘のみ DR-104/105 の明確化 note or 未 push なら本文修正 + fixture 追補
3. `dr-105-fixture-impl-followup` issue と同一サイクルで実装追随

## 受け入れ条件

- [ ] 全指摘に CONFIRMED / REJECTED の判定と根拠が付いている
- [ ] 成立分の spec・fixture 反映が完了している
- [ ] conformance mismatches = 0

## TODO

- [ ] C-1〜C-4 の実物突き合わせ検証 (DR-060 §2 との整合確認含む)
- [ ] Major 指摘の要否判定
- [ ] 成立指摘の DR 明確化 note / fixture 追補
- [ ] dr-105-fixture-impl-followup と同期した実装追随

## 関連

- `docs/findings/2026-07-14-codex-review-dr104-dr105.md`
- `docs/issue/2026-07-14-dr-105-fixture-impl-followup.md`
- DR-104, DR-105, DR-060 §2
