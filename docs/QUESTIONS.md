# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## VE-Q1: DR-107 の `effect` 軸の rename (codex #4 A-M6、DR-107 未 push なので今なら本文直接修正可)

descriptor 新軸 `effect: "preserve"|"transform"` が、spec 中核語彙の cell 操作 `effect(s)` (DR-011/DR-045/CONFORMANCE §2 の effects[].op、しかも effects[].transform フィールドと `effect:"transform"` が字面衝突) と同名で紛らわしい — DAX-Q4 裁定時にはこの衝突が未検出だった。

- **(a) `output_mode` に rename** (推し — 「出力が入力の保持か変換か」を直接言う、衝突なし)
- **(b) `value_effect` に rename** — effect の語を残しつつ区別
- **(c) `effect` のまま + 「cell 操作の effects とは別軸」の note で済ます**

