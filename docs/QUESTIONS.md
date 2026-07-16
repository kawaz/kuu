# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## EXP-Q1: 共露出実体の宣言 default が異なる値の場合の帰結 (UX-Q7R の隣接論点、2026-07-16)

Q7R 定式化 (default 注入の充填判定は export_key 適用後の結果 cell 単位) の未規定縁: 共露出 2 実体の**宣言 default が異なる値** (例: a `default: true` / b `default: false`) で両者とも未発火の場合、「cell が空のままなら注入」で両 default が同時に注入候補になるが、どちらが cell を埋めるかの規則が無い。`fixtures/export-key/collision.json :: defaults-only-no-collision` は両者同値 (flag preset false) でこの論点を踏まない範囲に絞って pin 済み。

- **(a) 定義順 (宣言の出現順) で先の実体の default が cell を埋める** (統括推し): 決定的で説明可能、既存の「定義順」への依存は lowering の各所に前例がある。sources は default のまま
- (b) 異 default 値の共露出も provenance 競合として ambiguous に倒す (「default は主張でない」の原則と緊張するが、観測可能な帰結が定義順依存になるのを嫌う場合)
- (c) 定義時 warn (§15.6) に「共露出キーの異 default 値」を追加し、実行時挙動は (a)

(この構成は実needが薄い縁ケースなので、v1 前の裁定は必須ではない — 裁定保留のまま fixture を追加しない選択も可)
