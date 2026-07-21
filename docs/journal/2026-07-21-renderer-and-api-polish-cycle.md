# API 磨き + canonical レンダラサイクル (2026-07-21)

前サイクル (help 再設計 + universal fn、journal 2026-07-20 参照) 完了後の連続サイクル。統括セッション db96a3ad。

## 完了サマリ

- **公開 API 監査** (kawaz 定期依頼「どこに出しても恥ずかしくないか」): fable5 監査で「直せば出せる」判定 → Critical 4 (Hungarian variant / HelpTypeEntry 同名 / util 漏れ / tuple エラー) + Major 11 を 17 commits で消化 (kuu.mbt 2f6fc7bb)。kuu-cli 追随込み
- **命名原則の確立**: 「省略形は使わない (よほど普遍的でない限り)」(kawaz)。API-Q2 (RVal→ResultValue / Cand→Candidate / CandMeta flatten / Sat→Satisfied)、API-Q3 (Decl→Declaration / Err→Error 統一 / Elem→Element / AmbInterp→AmbiguousInterpretation / Node variant 展開)。wire 第一級語彙 (fn/dd/op/eq_split) と Ctx/Def/Ext/Spec 等は残置裁定
- **CandMeta の責務調査**: 補完候補モデルの業界調査 (clap/cobra/carapace/fish/zsh/argcomplete) — is_alias/deprecated を候補に載せる例は業界ゼロだが、kuu は DR-060 §3「絞りは生成器側」の意図的設計と確認。flatten (meta 入れ子廃止、wire 不変) で決着
- **DR-115 (canonical help レンダラ)**: findings 起草 → REND-Q1〜Q7 裁定 (1a/2b テンプレ型=移行需要/3a/4b グループ hidden/5a auto/6b separate_section/7a) → DR 化 (レビュー Major3+Minor3 反映) → spec schema+fixtures (6 種) → kuu.mbt 語彙実装 (受理・搬送・射影・検査) → kuu-cli serializer 追随 → **canonical レンダラ本体 (kuu help --format text、テンプレ置換/binding 補間/types 集約/Inherited options 分離/golden 4+1)**
- **RIMPL-Q1〜Q6 裁定**: 美観・語彙の追認。repeat 表記は新設計 `[FILE{..3}]` / `<FILE> <FILE>...` (外側ブラケットが min 0/1、内側 {..} が有限上限、上限なしは unroll、暫定採用)
- **kuu-cli の help conformance 恒常 gate 新設** (25→33 case、CI 込み)

## 最終 head

- kuu (spec) = QUESTIONS 空 / kuu.mbt = 76212140 系列 / kuu-cli = 0ee0adcf。全 CI green

## 残課題

- spec issue 4 件 (DR gap 系、P3 で実害なし) + DR-113 apply 位相差 issue + DR-115 実装 issue (レンダラ本体完了により close 対象 → 統括が別途 close)
