# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺UXL-Q1〜Q4: DR-117 ux/product 層の座席設計 (正本: docs/findings/2026-07-23-completion-ux-layer-plan.md)

- **👺UXL-Q1: 座席の分割線** — (a 推し) completion_script / completion_query の**両 capability 実装 (行指向応答の emit 込み) を kuu.mbt に置く**。根拠 2 本: (i) 行応答は「人間向けレンダラ出力 (非規範)」でなく「glue という機械消費者向けの規範 wire」で、help 前例 (レンダラ = kuu-cli) の対称が成立しない、(ii) 本命の組み込みアプリは kuu.mbt しか import しないので、行 emit が kuu-cli 側だと一般 MoonBit アプリが補完を持てない。kuu-cli は CLI 面 + 検証ハーネスのみ / (b) DR-117 波及節の示唆どおり組版を product 側 — findings §1
- **👺UXL-Q2: glue テンプレの置き場所** — (a 推し) spec リポ `templates/` を正本 + 各言語リポへ転写 (vendoring) + CI 同期検査 (契約と同居 + 言語間共有を同時に満たす) / (b) kuu.mbt / (c) kuu-cli / (d) 独立配布 — §2
- **👺UXL-Q3: 玄関判定の呼び出し規約** — (a 推し) v1 は純関数 `completion_entry(ast, registry, argv, env) -> NotCompletion | Respond(String)` の明示呼び出し規約 (副作用ゼロで一様性を構造担保)。run() 級の統合玄関への内包は ux API 設計時へ送る / (b) 統合玄関を今設計 — §3
- **👺UXL-Q4: shell 翻訳表の実機検証** — (a 推し) 初回は tmux 実端末マトリクス (bash 3.2/5.x の 2 点込み) + 恒常は kuu-cli CI の非対話煙テストの 2 段 / (b) 自動のみ / (c) 手動のみ — §5

**回答形式**: 「UXL 全部推し通り」/ 個別指定。裁定後 M1 (kuu.mbt パイプライン) から実装開始。
