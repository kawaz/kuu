# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺 RIMPL-Q1〜Q6: canonical レンダラ実装の美観・語彙裁定 (実装は land 済み、後から調整可能な既定値の追認/変更)

canonical レンダラ本体 (kuu-cli の `kuu help --format text`) が実装完了。DR-115 §6.2 で canonical 出力は非規範なので、以下は「kuu プロダクトの好み」の裁定。全て現状値で動作中、変更は軽微。

- **👺 RIMPL-Q1: `kuu help` の既定 --format** — (a) json 維持 (現状。help-conformance gate 互換) / (b) text へ切替 (gate 側の同期改修が要る)。**推し = a** (機械消費が第一 consumer、人間は --format text)
- **👺 RIMPL-Q2: --format の将来値** — markdown / man を足す余地。今は text|json のまま予約だけしておくか。**推し = 予約のみ (何もしない)**
- **👺 RIMPL-Q3: hidden group の入口注記文言** — 現状 `(hidden group; use --category-mode named:<name> to view)`。**推し = 現状維持** (実利用で不満が出たら変更)
- **👺 RIMPL-Q4: セクション見出し `Arguments:` vs `Positionals:`** — clap は Arguments、DR-113 の data 語彙は positionals。現状 = Arguments。**推し = Arguments 維持** (UX 親和性 > 内部語彙一貫。見出しは人間向けの顔)
- **👺 RIMPL-Q5: repeat の範囲表記** — 現状 `<FILE>{1..3}` (Rust range 記法)。clap 慣習は `<FILE>...` (範囲なし)。**推し = 現状維持** (範囲を表現できる新規表記として妥当)
- **👺 RIMPL-Q6: default/env の表記位置** — 現状 help 本文右に `[default: X] [env: NAME]` (clap 型 1 行)。**推し = 現状維持**

**回答形式**: 「RIMPL 全部推し通り」/ 個別指定。
