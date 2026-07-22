# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺GEN-Q3'〜Q6': 補完生成器 (再構成版 — セルフバイナリ主軸、正本: docs/findings/2026-07-22-completion-generator-plan.md 改稿済み)

**裁定済み**: GEN-Q1=a (ブリッジ型 — 呼ぶのは kuu 組み込みアプリ自身のバイナリ)、GEN-Q2=a (zsh/bash/fish)。Q3/Q4 の kuu-cli 前提を kawaz 指摘で棄却し、消費者 2 形態 (A = セルフバイナリ組み込みが本命 / B = kuu-cli の def.json 外部指定は従) + cobra/clap 定石調査で再構成した再提示。

- **👺GEN-Q3': 生成側の標準形** — (a 推し) 形態 A = `<prog> completion <shell>` を多言語共通推奨 (cobra 並び positional)、形態 B = kuu-cli はその def.json 外部指定形 / (b) 推奨を置かず各言語裁量 — findings §2
- **👺GEN-Q4': 補完時 query 口の方式と契約** — (a 推し) 予約サブコマンド `__kuu_complete --shell <s> --cword <N> -- <word...>` (cobra 型、手で叩けてデバッグ可) + **行指向テキスト応答** (`候補\t説明` + directive 行。初版の JSON envelope は「glue は jq を持たない」現実で棄却)。kuu 独自: words 全量 + cword 渡しで **args_after を捨てない** (cobra はカーソル後を捨てる — after 整合フィルタは kuu の全解決モデルの能力)。契約正本は spec 側 ABI DR / (b) clap 型 env var 起動 (契約 unstable・stdout 事故の縁) — §3
- **👺GEN-Q5': custom completer 実行不能時の縮退** — (a 推し) 形態 A では問題不存在 (バイナリ内で実クロージャ実行 — 初版 Q5 は静的展開の発想の残滓)。形態 B のみ「候補なし + validate で capability 機械可読報告」、files fallback しない / (b) files fallback — §6
- **👺GEN-Q6': 置き場所 3 層** — (a 推し) 契約 = spec ABI DR (非 conformance、DR-111 §5 座席の実体化) / shell glue テンプレ = 言語間共有資産 (各言語手書きは shell×言語 drift) / 実装 = 各言語 ux 層 / (b) kuu-cli docs 正本 / (c) glue も言語別 — §5

**回答形式**: 「GEN 残り全部推し通り」/ 個別指定。Q6'=a の場合は新規 spec ABI DR の起草へ。
