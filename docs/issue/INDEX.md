# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-11 | task | open | [dr-091-bare-kv-operand-stages-implementation](./2026-07-11-dr-091-bare-kv-operand-stages-implementation.md) | DR-091 を実装完了する: kv_map accumulator と require_equal_separator の実装 + corpus 書き直し |
| 2026-07-11 | task | open | [dr-090-dd-match-self-implementation](./2026-07-11-dr-090-dd-match-self-implementation.md) | DR-090 を実装完了する: dd installer の match/self 属性対応と corpus 書き直し |
| 2026-07-11 | task | open | [dr-088-positional-default-verification](./2026-07-11-dr-088-positional-default-verification.md) | DR-088 を実装完了する: kuu.mbt の positional 充足経路 (default 供給) を検証する |
| 2026-07-08 | design | open | [inf-json-serialize-convention](./2026-07-08-inf-json-serialize-convention.md) | inf / 非整数 number の JSON serialize 規約 (distill-spec-gaps close 時の切り出し) |
| 2026-07-08 | task | open | [schema-materialization-and-reason-descriptors](./2026-07-08-schema-materialization-and-reason-descriptors.md) | Schema 実体化 + reason descriptor 全列挙 (DR-068 lifecycle 管掌) |
| 2026-07-07 | design | open | [dd-required-marker-fire-constraint](./2026-07-07-dd-required-marker-fire-constraint.md) | dd 相当マーカーを「発火必須」にできない (values セルを持たないため required の判定対象にならない) |
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
