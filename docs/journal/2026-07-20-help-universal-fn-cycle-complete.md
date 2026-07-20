# 2026-07-20 help 機構再設計 + universal fn 統合サイクル完了

DR-113 (help 機構再設計) + DR-114 (universal fn 統合) の spec land から、3 リポ
(kuu spec / kuu.mbt / kuu-cli) の lockstep 追随完了までの記録。統括セッション
db96a3ad (前セッション a5d90f14 の継続、Prompt too long からのダンプ復帰)。

## 完了サマリ

- **P1 (spec schema)**: wire/fixture/descriptor/builtin-descriptors の 4 schema
  を DR-113/114 準拠へ + fixture 掃討 (旧 update 語彙ゼロ化)。main = 066e625b 時点
- **P2 (spec fixtures + docs)**: fixtures/help/ 19 本全面書き直し (13 更新 + 6
  新規) + DESIGN/CONFORMANCE/REFERENCE/LOWERING/PIPELINE 追随 + lint-reference
  に cell_fns 台帳検査 2 カテゴリ追加。main = a3d3a2de 時点
- **P3 (kuu.mbt)**: M1 (universal invocation carrier + cell_fns registry +
  FnCtx ABI) → M2 (10 住人実行体 + count→incr + default_fn + observes
  topological 評価 + definition-error 4 種) → M3 (5 preset 受理 +
  help_on_failure 糖衣 + query-error envelope + capability registry) → M4
  (構造化 help model: value_structure/origin/depth-all/category_mode/alias
  併記) → M5 (types 集約 + used_as + capability dispatch)。最終 = help 19
  fixture 25 case 完全 green (decoded=298 / mismatch 0 / skip 0)。main =
  2f1f1710
- **P4 (kuu-cli)**: pin bump + `kuu help` サブコマンド (help_query capability
  の consumer、model JSON 出力まで。canonical レンダラは別 issue)。
  conformance 588/588 維持 + help 25/25 構造等価。main = 58df5f2c

## 裁定履歴 (このセッション分)

- Q12=A: lowered fn invocation carrier `{"fn","args"}` → DR-114 §6.1
- Q12-α=α: bare-increment.json は Q12 待ち削除 → canonical で再作成
- Q13=a: category_mode default/all は model 素材同一 (renderer policy 差のみ)
  → DR-113 §1 明確化
- Q14=a: count wire 糖衣は `[":incr"]` 差し替えのみ (補完なし) → DR-114 §6.2

## 残課題 (issue 起票済み)

- spec 4 件: dr113-help-category-value-structure /
  help-model-values-enum-and-array-order /
  dr113-alias-origin-schema-mismatch / wire-schema-help-epilog-scope-drift
  (いずれも P3 実装で実害が出なかった DR gap、必要時に裁定)
- kuu.mbt 1 件: helpmeta-preset-canonical-expansion-migration (5 preset の
  installer.apply 移送、conformance green のため内部品質位相)
- canonical レンダラ設計: docs/issue/2026-07-18-help-renderer-design.md
  (次サイクル)

## 運用知見

- worker 続投方式 (完了報告後に同 worker へ次タスク委譲) が fresh spawn より
  コンテキスト効率良 (M3b→M3c、M4→M5)
- codex worker が 7d リミットで離脱した際、working copy 残置成果を opus47 に
  「検証・監査・仕上げ」として引き継ぐ方式が機能
- 発明ガード (DR に無い規則を worker が書かず停止 → 統括裁定 or Q 起票) が
  Q12/Q14 と issue 4 件を生んだ = spec gap の検出機構として機能
