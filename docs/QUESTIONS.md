# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## V-Q1: kuu 全体構想の文書化の形

kuu-cli 構想 (旧 kuu-v0 枝 DR-0057「言語非依存の独立コマンド」+ design/kuu-cli.md) が現役リポから欠落しており、全体像の正本が無い (ROADMAP はフェーズ計画でありレイヤ構想を持たない)。再構成した全体像 = spec-as-core → 各言語 kuu-core → kuu-ux → DX 層 (help/completion 生成器) → kuu-cli (独立コマンド) → 外周 (Web UI ビルダー / 100 コマンド showcase / 多言語)。conformance runner の JSON in/out が kuu-cli プロトコルの原型として既に稼働している点も記録価値あり。

- **(a) docs/VISION.md 新設** — 旧 DR-0057 を現 spec 語彙で再輸入し ROADMAP と役割分担 (統括の推し: フェーズ計画と構想は寿命が違う)
- **(b) ROADMAP.md に統合** — 文書を増やさない
- **(c) まだ文書化しない**
