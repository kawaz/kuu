# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺UXL-Q1: 補完 capability 実装の座席の分割線

**質問**: completion_script / completion_query の実装 (行指向応答の emit 含む) をどこに置くか。正本: docs/findings/2026-07-23-completion-ux-layer-plan.md §1

- **(a) 推し: 両 capability 実装を行 emit 込みで kuu.mbt に置く**。kuu-cli は CLI 面 + 検証ハーネスのみ
  - 根拠 1: 行応答は「人間向けレンダラ出力 (非規範、help の前例)」でなく「glue という機械消費者向けの規範 wire」— help 前例の対称が成立しない
  - 根拠 2: 本命の組み込みアプリは kuu.mbt しか import しない。行 emit が kuu-cli 側だと一般 MoonBit アプリが補完を持てない
- (b) DR-117 波及節の示唆どおり、組版 (行 emit) は product 側に置く

## 👺UXL-Q2: glue テンプレの置き場所

**質問**: シェル別 glue スクリプトのテンプレ (言語間共有資産) をどこで管理するか。findings §2

- **(a) 推し: spec リポの `templates/` を正本**とし、各言語リポへ転写 (vendoring) + CI で同期検査
  - 契約 (DR-117) と同居し、言語間共有も満たす唯一の案
- (b) kuu.mbt に置く (MoonBit 以外の実装から遠い)
- (c) kuu-cli に置く (契約から遠い)
- (d) 独立配布リポ (管理物が増える)

## 👺UXL-Q3: 玄関判定の呼び出し規約

**質問**: アプリが KUU_COMPLETE 玄関判定をどう呼ぶか。findings §3

- **(a) 推し: v1 は純関数の明示呼び出し規約** — `completion_entry(ast, registry, argv, env) -> NotCompletion | Respond(String)`
  - 副作用ゼロで「不一致 = 通常実行と観測等価」を構造的に担保
  - run() 級の統合玄関への内包は ux API 設計時へ送る
- (b) 統合玄関 (run() が内部で判定) を今設計する (ux API 全体の先取りになり二度手間リスク)

## 👺UXL-Q4: shell 翻訳表の実機検証方法

**質問**: Web 調査由来の shell 翻訳表 (zsh/bash/fish の補完機構対応) をどう実機検証するか。findings §5

- **(a) 推し: 2 段構え** — 初回は tmux 実端末マトリクス (bash 3.2 / 5.x の 2 点込み) で表のセルを裏取り + 恒常は kuu-cli CI の非対話煙テスト
- (b) 自動テストのみ (表示挙動は実端末でしか観測できない部分が残る)
- (c) 手動のみ (回帰検出がない)

**回答形式**: 「UXL 全部推し通り」/ 個別指定 (例 UXL-Q1=a)。裁定後 M1 (kuu.mbt パイプライン) から実装開始。
