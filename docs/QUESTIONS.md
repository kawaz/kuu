# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺GEN-Q3x〜Q6x: 補完生成器 (確定骨格版 — 生成 = preset / query = env モード切替)

**確定済み骨格** (kawaz 裁定 3 回反映): 生成 = help 同型の completion_script preset (入口は定義者の自由) / query = KUU_COMPLETE=<shellname> <バイナリ> <words...> の env var モード切替 (引数解釈を玄関で奪う、定義非侵襲)。統括評価: env 方式は stdout 純度規約 + 子プロセス unset 規約で縁を潰せば構造的に最良 (findings 3.4 に規約化済み)。残る裁定 4 問 (正本: docs/findings/2026-07-22-completion-generator-plan.md):

- **👺GEN-Q3x: completion_script preset の形** — (a 推し) shell 名必須値の string preset (bool 枝なし)、shell 名値域は spec で閉じない、on_failure 既定 false。入口 long/short/env/サブコマンド形は定義者の自由 — findings 2 節
- **👺GEN-Q4x: cword (カーソル位置) の受け方** — (a 推し) KUU_COMPLETE_INDEX=<N> の別 env、省略時は行末補完扱い。argv が純粋に words のままで、カーソル後の単語も捨てず after 整合フィルタ (kuu の全解決モデルの能力) が活きる / (b) cobra 型の末尾単語方式 (カーソル後を捨てる = args_after 原理的に不能) — 3.3 節
- **👺GEN-Q5x: custom completer 実行不能時の縮退** — (a 推し) 形態 A (組み込みバイナリ) では問題不存在。形態 B (kuu-cli の def.json デバッガ) のみ「候補なし + validate で capability 機械可読報告」、files fallback しない — 6 節
- **👺GEN-Q6x: 正本の置き場所** — (a 推し) preset 語彙 + env プロトコル + 応答行文法 = spec の新 ABI DR (DR-113 対称、DR-111 5 節座席の実体化) / shell glue テンプレ = 言語間共有資産 / 実装 = 各言語 ux 層。付帯: preset 1 種分の conformance 増分が発生 (発題 issue の「spec 増分ゼロ」条件の更新が必要) / (b) 正本を kuu-cli docs に — 5 節

**回答形式**: 「GEN 残り推し通り」/ 個別指定 (例 Q4x=a)。
