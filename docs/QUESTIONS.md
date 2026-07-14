# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## SPL-Q1〜Q6: cell_filters 属性分割の設計

kawaz 裁定 (2026-07-13、cell_filters の union 名付け棄却) を受けた分割設計の裁定バッチ。issue: docs/issue/2026-07-14-cell-filters-attribute-split.md。設計提案全文はセッション scratchpad の cell-filters-split-proposal.md (裁定確定後に新 DR として起草、その時点で repo に永続化)。

- **SPL-Q6** (最優先、Q1 の要否を決める): 非 accum 側の「最終値ガード」席を独立属性として**残す** (a、worker+統括推し) か、**value_filters に一本化** (b) か。
  - a の根拠: value_filters (piece 毎に効き、piece トークンに argv_pos 帰属) と最終値ガード (確定後に 1 回、argv.length 帰属) は wire で観測可能に別物 (fixtures/multiple-parse/filters-each.json vs fixtures/count-parse/cell-filter-range.json の実測差)。count の下限付き range (`in_range:2:3`) は per-application では中間値 1 で必ず reject するため一本化だと**表現不能** = 表現力の喪失。「違うものを同じものとして扱うな」は per-piece と final-once の統合にも効く
  - b の根拠: 属性数が減る。final-once の実需を裏付ける fixture/corpus 実例は現状無い (残余論拠であることは worker が明示)
  - 補足 (裁定不要、報告): 非 multiple 要素の宣言 default 値が value_filters を通るかは DR-049/050/051 に明文なし — どちらを選んでも新 DR で座席を明文化する
- **SPL-Q1** (Q6=a の場合のみ): 非 accum 側の属性名 — `final_filters` (推し) / `settle_filters` / `resolve_filters`
- **SPL-Q2**: accum 側の属性名 — `accum_filters` (推し。DR-079 で一度不採用だが不採用理由「multiple 無し要素で名前が浮く」は分割で構造的に解消) / `collected_filters` / `array_filters` (DR-079 §2 の進行段階アンカー命名原則に反し非推奨)
- **SPL-Q3**: 未 push DR-102 チェーン (spec 3 commit + kuu.mbt 実装 1 commit) の処置 — **C** (推し): commit は jj abandon し、番号 102 は新決定 (属性分割 DR) に再利用 (未 push なので番号と内容の同一性問題は外部に存在しない) / A: abandon + 永久欠番 / B: commit を rewrite
- **SPL-Q5**: final/accum 席と multiple 有無の排他をどの層で強制するか — **definition-error kind=invalid-range** (推し。fixtures/definition-error/scalar-array-default-invalid-range.json の確立前例に一致、fixture で pin 可能。wire schema の if/then は補助に留める) / wire schema 構文層のみ (parse_definition が検査しない形は非 schema 検証実装の挙動が未規定になる)
- **SPL-Q4** (ほぼ導出済み、確認のみ): CONFORMANCE §2 argv_pos 規約の「累積後の cell_filters reject は argv.length」を「final/accum 両席の reject は argv.length 帰属」に明文補正 (非 accum 側も argv.length 帰属であることは fixture 2 本で実測確認済み — 現文言が accum 側しか書いていないだけ)

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
