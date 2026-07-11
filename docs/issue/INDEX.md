# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-12 | task | open | [kuu-prefix-factory-rename](./2026-07-12-kuu-prefix-factory-rename.md) | kuu_ prefix factory 名のリネーム (kuu_number_parser 等 → builtin/ 正規名、DR-094 §9 案 A) |
| 2026-07-12 | task | open | [dr-093-required-type-dispatch-implementation](./2026-07-12-dr-093-required-type-dispatch-implementation.md) | DR-093 を実装完了する: required/requires 型委譲充足の kuu.mbt 実装 + die.json 更新 |
| 2026-07-11 | task | open | [config-derived-rulings-short-combine-eqsep](./2026-07-11-config-derived-rulings-short-combine-eqsep.md) | §7.2 config キーの導出裁定 2 件の明文化と輪郭 fixture (short_combine / require×allow_equal_separator) |
| 2026-07-08 | task | open | [schema-materialization-and-reason-descriptors](./2026-07-08-schema-materialization-and-reason-descriptors.md) | Schema 実体化 + reason descriptor 全列挙 (DR-068 lifecycle 管掌) |
| 2026-07-07 | task | open | [mbt-workspace-cleanup](./2026-07-07-mbt-workspace-cleanup.md) | kuu.mbt 旧実装系 workspace (refactor/review/parts-arggen) と origin 残存枝の廃止検討 |
| 2026-07-07 | design | open | [filter-bundle-bulk-registration](./2026-07-07-filter-bundle-bulk-registration.md) | filter を bundle 単位で一括登録する口 (idea、優先度低) |
| 2026-07-07 | design | open | [tty-value-as-injected-source](./2026-07-07-tty-value-as-injected-source.md) | tty 判定値のモデル化 — ambient probe でなく値源として注入する案 (kawaz/die 由来) |

<!--
雛形メモ (migrate sub-command 用):

- 列構成は固定 (= 上記 5 列、列名と順序を変えない)
- 行の {{rows}} は migrate が走査後の active issue から生成 (= 全件再生成)
- ソート規約:
  1. status 優先順: idea → open → wip → blocked → pending-sublimation
  2. 同 status 内は date 降順 (= 新しい起票が上)
- 各行: `| YYYY-MM-DD | <category> | <status> | [<slug>](./YYYY-MM-DD-<slug>.md) | <本文 1 行目から 80 文字以内> |`
- 概要は 80 文字を超えたら末尾を「…」で省略
-->
