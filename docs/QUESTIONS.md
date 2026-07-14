# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## COMP-Q1d: 補完入力の最終命名 (微確認 2 点)

kawaz 裁定 (2026-07-14): **argv は不採用** — 言語横断で $0 包含が拮抗している事実は「悪くない」ではなく「読み手によって意味が割れる曖昧語」の証拠であり、曖昧さを嫌う kuu は避けた命名を採る (「悪いわけじゃないから良い、ではなく良い名前が良い」)。方向: arg(s)_before/after + word_before/word_after の系統命名、complete_fn (自作補完関数) に渡す CompletionCtx にそのまま収まる形。line / line_pos は将来素材として complete DR に記録。残る微確認:

- **Q1d-1**: トークン列の表記 — **`args_before` / `args_after`** (統括推し: 複数形 = 配列・単数形 (word_*) = 文字列という型シグナルが立つ。kawaz 記法「args_before/after:[]」とも一致) / `arg_before` / `arg_after`
- **Q1d-2**: parse fixture の基底フィールド `"argv"` も **`"args"` へ一斉改名**するか — 統括推し = する (補完だけ args 系で親が argv のままだと系統不一致 + 曖昧語が残る。200+ fixture の機械置換 + CONFORMANCE §1 + kuu.mbt decode 層、ドラフト期の作業リスト)

## V1-Q1〜Q3: v1.0.0 発行条件まわり

正本: **docs/findings/2026-07-13-v1-readiness-audit.md §4** (各 Q の詳細)。

- **V1-Q1** (最優先): DR-068「fixture 全 pass」の範囲 — (a) parse-core のみ / (b) 4 プロファイル全部。統括推し = 「バンドル現存 fixture の参照実装 green」(現在 210/210 で充足) と整理し、プロファイルは第三者実装の準拠宣言単位と切り分ける小 DR で閉じる。参照: docs/decisions/DR-068-json-schema-lifecycle.md / DR-069-conformance-profiles.md / docs/issue/archive/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q4 の過去 3 案)
- **V1-Q2**: lowering 単独 golden 欠落 6 種 (command/global/constraint/alias/inheritable/config) は意図的省略か拡充漏れか。参照: docs/decisions/DR-070-lower-fixture-format.md / fixtures/lowering/
- **V1-Q3**: complete フォーマット確定 DR の起票時期 (V1-Q1 と COMP-Q の裁定に従属)
