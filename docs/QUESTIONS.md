# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## CR-Q1 → ACC-Q: accum_filters の Result 化 + accumulator 語彙の再検討 (調査中)

kawaz 方向出し (2026-07-14): 「Result なしは初期に綺麗だからで選んだだけ。現実に即さないなら他でも生やしてるし Result を返しても良い」— fallible 化 (旧 CR-Q1-a) に前向き。ただし判断材料として (1) **filter 系装置の fallibility 全数調査** (失敗を返せない種別は他に何があるか、どちらが優勢か)、(2) **flat しない追加 (T[][]) の組み込み手段の有無** (あれば final 相でまとめて処理する迂回が成立)、(3) **append 語彙の妥当性** (Python append/extend、JS push/concat のように flat 有無で言語間の意味が割れる — 曖昧さのない動詞ペアへの見直し + flat する/しない両建ての要否) を統括が調査中。結果を ACC-Q バッチとして再提示する。

参照: docs/issue/2026-07-14-codex-review-dr102-dr103-postland.md C-1 節 / docs/decisions/DR-102-filter-attribute-split.md §4 / DR-036 (accumulators registry)

## V1-Q1〜Q3: v1.0.0 発行条件まわり

正本: **docs/findings/2026-07-13-v1-readiness-audit.md §4** (各 Q の詳細)。

- **V1-Q1** (最優先): DR-068「fixture 全 pass」の範囲 — (a) parse-core のみ / (b) 4 プロファイル全部。統括推し = 「バンドル現存 fixture の参照実装 green」(現在 210/210 で充足) と整理し、プロファイルは第三者実装の準拠宣言単位と切り分ける小 DR で閉じる。参照: docs/decisions/DR-068-json-schema-lifecycle.md / DR-069-conformance-profiles.md / docs/issue/archive/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q4 の過去 3 案)
- **V1-Q2**: lowering 単独 golden 欠落 6 種 (command/global/constraint/alias/inheritable/config) は意図的省略か拡充漏れか。参照: docs/decisions/DR-070-lower-fixture-format.md / fixtures/lowering/
- **V1-Q3**: complete フォーマット確定 DR の起票時期 (V1-Q1 と COMP-Q の裁定に従属)
