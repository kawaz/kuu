---
title: DR-101 §3 判定マトリクス — 非 accum × ARRAY-only 綴りの座席が未定 (unknown-vocab で reject するが対称論理では invalid-range が本来の座席)
status: idea
category: design
created: 2026-07-13T12:47:53+09:00
last_read:
open_entered:
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

# DR-101 §3 判定マトリクス — 非 accum × ARRAY-only 綴りの座席が未定 (unknown-vocab で reject するが対称論理では invalid-range が本来の座席)

## 概要

DR-101 §3 の判定マトリクスは **6 セル中 5 セルしか規定していない**。抜けているのは「非 accum 位置 × cell_filters × ARRAY-only registry の綴り (例: `unique`)」の帰結。現行実装 (installer.mbt:3684-3690) は unknown-vocab で reject するが、DR-101 §3 の「T→T と Acc→Acc は異なる vocabulary 空間、別 registry には載るが本席の要求シグネチャに合わない構成」の論理を対称に適用すると **invalid-range (層違い)** が本来の座席。

DR-101 land 直後の独立レビュー (2026-07-13) で発見。今サイクルは PASS で land 済み (CI green)、対称性穴は本 issue で追跡し次サイクルで裁定する。

## 現行判定マトリクス vs 対称論理

| 位置 | scalar IN | ARRAY IN | 現行帰結 | 対称論理の期待 |
|---|---|---|---|---|
| accum × cell_filters | ✗ | ✗ | unknown-vocab (§3 一次) | ○ |
| accum × cell_filters | ✓ | ✗ | invalid-range (§3 二次) | ○ |
| accum × cell_filters | ✗ | ✓ | pass (合法) | ○ |
| **非 accum × cell_filters** | **✗** | **✓** | **unknown-vocab** | **invalid-range?** |
| 非 accum × cell_filters | ✓ | ✗ | pass (合法) | ○ |
| 非 accum × cell_filters | ✗ | ✗ | unknown-vocab | ○ |

## 影響

- **spec 座席未確定**: 「なぜ非 accum × ARRAY-only を対称にしないか」の justification が DR-101 §3 に不在
- **fixture 抜け穴**: このケースを pin する fixture が無く、対称性のリグレッション検出網が張れていない
- **実運用 UX**: 「非 accum 位置に unique を書いた」ユーザに unknown-vocab (「登録されていない語彙」) メッセージが出るが、実際は「別 registry には登録されている」ため誤導する可能性

## 裏取り済み事実

- 現行実装: installer.mbt:3684-3690 の非 accum 分岐は `lookup_filter(fs.name) is None` のみで判定 (ARRAY registry 側の lookup なし)
- DR-101 §3 Notes: accum 位置の判定順 (一次 unknown-vocab → 二次 invalid-range) は規定されているが、非 accum 位置の対称形は言及なし
- 既存 fixture: fixtures/definition-error/cell-filters-unknown-vocab.json は非 accum × 完全未登録 (scalar NOT IN & ARRAY NOT IN) を pin、非 accum × ARRAY-only は pin なし

## 解決候補

### (a) 非対称 justify + 補完 fixture

DR-101 §3 に「非 accum × ARRAY-only 綴りも unknown-vocab で扱う」justify を追記 (実運用希少 / hint field で情報補完 / accum 側と非対称にする理由)。補完 fixture 1 件 (非 accum × unique 等) を追加。実装変更なし。

### (b) 対称化 (実装 + spec + fixture 変更)

installer.mbt の非 accum 分岐を「scalar IN → pass、ARRAY IN & scalar NOT IN → DInvalidRange、両方 NOT IN → DUnknownVocab」に変更。DR-101 §3 のマトリクスを対称形に refine (DR 本文は不変規則より、Notes 節への追記 or DR-102 で refinement)。fixture 追加。

## 受け入れ条件

- [ ] 裁定 (a) or (b)、および spec 追記形式 (DR-101 追記 or DR-102 新設)
- [ ] 実装対応 (b 選択時のみ、installer.mbt 分岐追加)
- [ ] 補完 fixture 1 件を fixtures/definition-error/ に追加
- [ ] conformance decoded=210+、mismatches=0 維持

## 関連

- DR-101 §3 (判定順の Notes、accum × cell_filters 側のみ規定)
- installer.mbt:3634-3702 (collect_unknown_filter の非 accum 分岐)
- installer.mbt:3577 付近 (collect_invalid_accum_cell_filter の判定条件)
- fixtures/definition-error/cell-filters-unknown-vocab.json (非 accum × 完全未登録の既存 pin)
- 発見経緯: DR-101 land 直後の独立レビュー (2026-07-13)、opus47-worker-high による観測
