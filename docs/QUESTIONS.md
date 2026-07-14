# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## SPL-Q1〜Q6: cell_filters 属性分割の設計

kawaz 裁定 (2026-07-13、cell_filters の union 名付け棄却) を受けた分割設計の裁定バッチ。issue: docs/issue/2026-07-14-cell-filters-attribute-split.md。設計提案全文はセッション scratchpad の cell-filters-split-proposal.md (裁定確定後に新 DR として起草、その時点で repo に永続化)。

裁定済み: SPL-Q6 = a (2 席を残す。「違うものを違うものとして扱え」、kawaz 2026-07-14)。SPL-Q3 = C / Q4 = 文言補正 / Q5 = definition-error は導出で確定 (詳細は新 DR に記録)。残りは命名 2 つのみ:

- **SPL-Q1**: 非 accum 側 (T→T、最終値ガード) の属性名 — `final_filters` (推し) / `settle_filters` / `resolve_filters`
- **SPL-Q2**: accum 側 (Acc→Acc、累積配列) の属性名 — `accum_filters` (推し。DR-079 で一度不採用だが不採用理由「multiple 無し要素で名前が浮く」は分割で構造的に解消) / `collected_filters` / `array_filters` (DR-079 §2 の進行段階アンカー命名原則に反し非推奨)

## BR-Q: kuu.mbt 旧リモート枝の削除 (不可逆、Yes/No)

kuu.mbt の origin に残る kuu-v0 / ast-spec / slice / claude/review-* / dependabot 枝を削除してよいか。一覧の実物確認は `git ls-remote --heads origin` (kuu.mbt 側)。

参照: docs/findings/2026-07-13-v1-readiness-audit.md の V1-R01 行 (ast-spec 枝の残存観測)

## COMP-Q1〜Q5: complete fixture 系統の設計

正本: **docs/findings/2026-07-13-complete-fixture-recon.md §5** (各 Q の詳細)。関連 issue: docs/issue/2026-07-12-complete-query-fixture-coverage-gap.md

- **COMP-Q1** 入力フィールド名: `before`/`after` 新設 (統括推し) / `argv` 再利用 — 背景は同 findings §2.2
- **COMP-Q2** `candidates[].meta` の検証: 既存の「省略 = default と等価」規約維持 + 非 default を明示する pin fixture (統括推し) / complete 専用に必須化
- **COMP-Q3** completer 名の設計乖離: DESIGN は候補に「型情報 / completer 名」を明記、実装 `Cand` (kuu.mbt の src/core/node.mbt:601-609) に completer 名フィールドが無い。(a) v1 は返さない設計 / (b) 実装漏れ — **推し無し、kawaz の意図確認が必要**
- **COMP-Q4** `path` の扱い: wire に含めず検証対象外と明記 (統括推し — dedup 規則が path を候補同一性から除外) / 含めるが比較無視 / fixture 化しない
- **COMP-Q5** 「7 op 表と無関係」明示文: 書かない (統括推し — complete 節冒頭を包含側で書けば自然に排除される) / 再発防止に明示

## V1-Q1〜Q3: v1.0.0 発行条件まわり

正本: **docs/findings/2026-07-13-v1-readiness-audit.md §4** (各 Q の詳細)。

- **V1-Q1** (最優先): DR-068「fixture 全 pass」の範囲 — (a) parse-core のみ / (b) 4 プロファイル全部。統括推し = 「バンドル現存 fixture の参照実装 green」(現在 210/210 で充足) と整理し、プロファイルは第三者実装の準拠宣言単位と切り分ける小 DR で閉じる。参照: docs/decisions/DR-068-json-schema-lifecycle.md / DR-069-conformance-profiles.md / docs/issue/archive/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q4 の過去 3 案)
- **V1-Q2**: lowering 単独 golden 欠落 6 種 (command/global/constraint/alias/inheritable/config) は意図的省略か拡充漏れか。参照: docs/decisions/DR-070-lower-fixture-format.md / fixtures/lowering/
- **V1-Q3**: complete フォーマット確定 DR の起票時期 (V1-Q1 と COMP-Q の裁定に従属)
