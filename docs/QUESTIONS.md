# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## DAX-Q1〜Q7: descriptor 軸再整理の設計裁定 (詳細正本: docs/findings/2026-07-15-descriptor-axes-design-recon.md)

設計調査完了 (統括監査済み)。骨格の推し = **案 A: role / construction / io_type / effect×fallibility / invocation の直交軸分離** (DR-106 の「複合 enum より独立フィールド」原則の延長、VISION §4 の interface/struct/モック生成に足る自己記述が狙い)。以下は語彙・スコープの分岐 (各選択肢の全文と根拠は findings §DAX-Q ラベル節):

- **DAX-Q1** role の初期集合: (a) 最小 4 値 installer/filter/collector/type_parser (推し — completers 登場時に追記で足りる) / (b) +accumulator+completer 予約 / (c) +matcher 等内部装置
- **DAX-Q2** construction: (a) static/factory の 2 値 (推し) / (b) +derived 予約
- **DAX-Q3** io_type (入出力の値型軸、新設): (a) string/number/bool/value + array<T>/map<string,T> の parameterized (推し — 生成コードの型精度の源泉) / (b) 持たない (domain のみ) / (c) 相経由で導出
- **DAX-Q4** signature の分解: (a) effect: preserve|transform + fallibility: total|reject の 2 独立フィールド (推し — 変換×失敗の第 3 象限を表現可) / (b) 4 値複合 enum / (c) 現状凍結
- **DAX-Q5** invocation.encoding: (a) colon_args/object_args/none の 3 値 (推し — 現存住人を完全カバー) / (b) +positional 予約 / (c) +keyword 予約
- **DAX-Q6** conformance への descriptor 検証の昇格: (a) 別 DR に先送り (推し — 本サイクルは schema+builtin 書き換えに集中) / (b) 同時昇格 / (c) 恒久不要宣言
- **DAX-Q7** kind の rename: (a) role へ rename (推し — 意味論変更を名前に反映、追随はメカニカル) / (b) kind のまま refine

回答例: 「DAX 全部 a」「Q1=b 他 a」等。裁定後に DR 起草 → schema/builtin/fixture/実装の反映サイクルへ。
