# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## CLI-Q1: kuu-cli PoC の置き場所 (NEXT-Q1=b の kawaz 逆質問への回答、2026-07-15)

- **(a) kuu.mbt リポ内の src/cli パッケージで PoC 開始** (統括推し) — 未公開 module への moon 依存問題なし (path 依存)、conformance と同居で速い。brew 配布は kuu.mbt の release にバイナリを載せて tap へ push する標準パターンで成立。製品としての「kuu-cli」リポ分離は PoC の出来と配布要件を見てから判断
- **(b) 最初から kawaz/kuu-cli 新リポ (public)** — 製品の顔・履歴の独立が最初から立つ。kuu.mbt への依存は path/git 依存の工夫が必要 (mooncakes 未公開のため)

(NEXT-Q1 裁定済み: a 着手 / b OK / c は b の後 / d 並行 / e OK — a と d を並行実行中、b は d 完了後に着手)


