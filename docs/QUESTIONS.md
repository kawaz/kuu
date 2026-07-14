# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## CR-Q1: accum_filters の reject 能力 (codex レビュー C-1)

DR-102 §4 と CONFORMANCE は accum_filters の reject 時 args 位置帰属を規定しているが、ARRAY filter registry の実態は「拒否を持たない純関数」(builtin-descriptors の unique 記述、ArrayFilterDescriptor に Result 経路なし) で **reject を発生させられない** — 旧 cell_filters 時代から継承した規定と実態の乖離が分割で顕在化した。

- **CR-Q1-a**: ArrayFilterDescriptor を fallible 化 (Result 経路を通し、配列長検査のような検証系 array filter を書けるようにする。規定が実効化し fixture で pin 可能になる)
- **CR-Q1-b** (統括推し): ARRAY registry は **transform 専用を正式契約に昇格** (現実態の明文化)。DR-102 §4 の accum 側 reject 規定は「将来 fallible な array filter が導入された場合の帰属規則」として条件付き化 (または削除)。fallible 化は検証系 array filter の実需が出た時に非破壊で追加できる — 今の fallible 化は将来の仮定的要件への先回り

参照: docs/issue/2026-07-14-codex-review-dr102-dr103-postland.md (レビュー指摘全体) / docs/decisions/DR-102-filter-attribute-split.md §4 / schema/builtin-descriptors.json の unique

## V1-Q1〜Q3: v1.0.0 発行条件まわり

正本: **docs/findings/2026-07-13-v1-readiness-audit.md §4** (各 Q の詳細)。

- **V1-Q1** (最優先): DR-068「fixture 全 pass」の範囲 — (a) parse-core のみ / (b) 4 プロファイル全部。統括推し = 「バンドル現存 fixture の参照実装 green」(現在 210/210 で充足) と整理し、プロファイルは第三者実装の準拠宣言単位と切り分ける小 DR で閉じる。参照: docs/decisions/DR-068-json-schema-lifecycle.md / DR-069-conformance-profiles.md / docs/issue/archive/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q4 の過去 3 案)
- **V1-Q2**: lowering 単独 golden 欠落 6 種 (command/global/constraint/alias/inheritable/config) は意図的省略か拡充漏れか。参照: docs/decisions/DR-070-lower-fixture-format.md / fixtures/lowering/
- **V1-Q3**: complete フォーマット確定 DR の起票時期 (V1-Q1 と COMP-Q の裁定に従属)
