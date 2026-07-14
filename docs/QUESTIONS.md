# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## COMP-Q1c: 基底語彙 `argv` の維持可否 (調査中 → 表を添えて再提示予定)

COMP-Q1b は裁定済み (2026-07-14): `argv_before` / `argv_after` 採用、word 系も `word_before` / `word_after` の系統命名に (旧 word / word_suffix は complete DR で改名、v1 未使用のため無傷)。

残る確認: kawaz の宿題「argv という語彙は全言語で普遍的に同じ意味か」。論点は 2 つ — (1) 言語横断の認知度、(2) 伝統的 argv は $0 (プログラム名) 込みだが kuu の `argv` フィールドは $0 抜き、という意味ずれの許容可否 (代替候補: args 等)。統括が言語横断マトリクスを調査中 — 結果を添えて a) argv 維持 (+$0 非包含の明記) / b) 改名、を再提示する。argv で良いとなればそのまま確定。

## V1-Q1〜Q3: v1.0.0 発行条件まわり

正本: **docs/findings/2026-07-13-v1-readiness-audit.md §4** (各 Q の詳細)。

- **V1-Q1** (最優先): DR-068「fixture 全 pass」の範囲 — (a) parse-core のみ / (b) 4 プロファイル全部。統括推し = 「バンドル現存 fixture の参照実装 green」(現在 210/210 で充足) と整理し、プロファイルは第三者実装の準拠宣言単位と切り分ける小 DR で閉じる。参照: docs/decisions/DR-068-json-schema-lifecycle.md / DR-069-conformance-profiles.md / docs/issue/archive/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q4 の過去 3 案)
- **V1-Q2**: lowering 単独 golden 欠落 6 種 (command/global/constraint/alias/inheritable/config) は意図的省略か拡充漏れか。参照: docs/decisions/DR-070-lower-fixture-format.md / fixtures/lowering/
- **V1-Q3**: complete フォーマット確定 DR の起票時期 (V1-Q1 と COMP-Q の裁定に従属)
