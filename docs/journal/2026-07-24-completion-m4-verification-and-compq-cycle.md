# M4 実機検証と COMPQ-Q1/tiebreak サイクル (2026-07-24)

## 完了サマリ

- **M4 (kuu-cli)**: `completion generate` / `completion query` サブコマンド + validate の completer_capabilities 報告 + 煙テスト (bash/zsh syntax + bash 関数直呼び + 形態 B query、fish はローカル未導入で skip)。kuu-cli main = 9b83d8fd で push、CI green
- **段 1 実機検証 (tmux マトリクス)**: zsh 5.9.1 / bash 5.3.9 / bash 3.2.57 で翻訳表全カテゴリを裏取り。zsh glue の bug 2 件を修正 (nospace group の説明表示 / local 再宣言による stdout 汚染)。zsh の nospace/normal 混在時 cross-group 順序崩壊は制約として記録。fish は未検証 (環境なし) と正直に記録。TRANSLATION.md の status を更新、検証ログは kuu-cli `docs/findings/2026-07-23-shell-matrix-verification.md`
- **COMPQ-Q1 裁定と実装**: 実機検証で見つかった重複 emit (同一 spelling の word_end/cont 併存が行応答に 2 行出る) を DR-117 §5 の規範 gap と判定。既定 space 形統合 + `insert_form` パラメータ (`"space"`/`"eq"`、cobra 互換動機) で裁定。DR-117 §2.6 (insert_form) + §5 merge 規則の改訂 (spec)、wire.schema + definition-error fixture 2 本、kuu.mbt 実装 (受理/installer 検査/reconciliation/merge、wbtest 13 本)
- **tiebreak bug 修正**: `#completion_script` の複数入口で last-wins が entity 宣言順になっていたバグ (DR-117 §2.1 = DR-015 あと勝ち = CLI 消費順が規範)。原因は `apply_entity_links` の宣言順 push + 配列順 last-wins 消費。at_pos ベースの scoped fix + 回帰 wbtest 3 本で修正 (kuu.mbt 2ce3ebda)
- 最終 head: spec e860d3b9 / kuu.mbt c47578df / kuu-cli 41df34d3、全 CI green。テスト 461/461、conformance decoded=317 mismatch 0

## 裁定の材料

COMPQ-Q1 (重複 emit) は他ライブラリ慣習調査 (clap / argcomplete / click / fish / yargs は space 優勢、eq 積極既定は cobra のみ、bash `COMP_WORDBREAKS` の制約) を裁定素材として提示、kawaz が既定 space 形統合 + insert_form パラメータで裁定。

## 発見事項

- help_category 系は link 未配線で現バグなし (実物検査済み)。M5 の配線時に tiebreak と同じ罠 (宣言順 push + 配列順 last-wins) を踏まないよう issue に注意書き
- 実機検証は 1 サンプルで仕様を主張せず、zsh/bash 5.3.9/bash 3.2.57 の 3 カテゴリで裏取りした上で fish 未検証を明記する形にした

## 事故と学び

- spec pin bump で SHA を実出力からでなく補完して書き CI red になった。`git ls-remote` から取り直して復旧 (SHA は実出力からコピーする禁則の再確認)
- 並行 worker の交錯で fix revert 判断が走ったが、landed fix が正だったため observation commit を abandon して収束
- issue 更新の fork が kuu.mbt working copy に probe を残していた (唯一 writer 原則の綻び、実害なし)

## 新規 issue

- completion-query-duplicate-candidates: 裁定済み・実装済み、close 待ち
- help-category-link-last-wins: M5 での配線時の注意書き
- insert-form-positional-group-decode-drop: DR-117 次回改訂時の裁定待ち

## 残課題

- 上記 3 issue の後続対応 (M5 配線、DR-117 次改訂)
