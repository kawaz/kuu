# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-09 | design | idea | [ref-elemdef-inheritance-semantics](./2026-07-09-ref-elemdef-inheritance-semantics.md) | ref の「ElemDef 全体継承」用法 (DR-007) と「消費文法 Node 差し替え」実装の意味論差 |
| 2026-07-08 | design | idea | [negatable-sugar-b3-ruling](./2026-07-08-negatable-sugar-b3-ruling.md) | negatable 糖衣 (bool 否定形 B3) の採否裁定 (DR-011 裁定との緊張関係) |
| 2026-07-10 | design | wip | [multiple-declared-default-semantics](./2026-07-10-multiple-declared-default-semantics.md) | multiple 要素への宣言 default (配列) の意味論が未規定 |
| 2026-07-10 | design | open | [values-variant-branch-competition](./2026-07-10-values-variant-branch-competition.md) | values 制約と variant 枝競合 (:set vs :set:always) の意味論明文化 |
| 2026-07-09 | task | open | [ref-nested-consumption-fixture-gap](./2026-07-09-ref-nested-consumption-fixture-gap.md) | ref テンプレ入れ子の消費境界 + multiple×ref 意味論の fixture 未整備 |
| 2026-07-09 | design | open | [conformance-tried-triggers-help-entry-fields](./2026-07-09-conformance-tried-triggers-help-entry-fields.md) | CONFORMANCE §2 に tried_triggers / help_entry の optional フィールドを追加する |
| 2026-07-08 | design | open | [inf-json-serialize-convention](./2026-07-08-inf-json-serialize-convention.md) | inf / 非整数 number の JSON serialize 規約 (distill-spec-gaps close 時の切り出し) |
| 2026-07-08 | task | open | [schema-materialization-and-reason-descriptors](./2026-07-08-schema-materialization-and-reason-descriptors.md) | Schema 実体化 + reason descriptor 全列挙 (DR-068 lifecycle 管掌) |
| 2026-07-08 | task | open | [distill-1to1-coverage-audit](./2026-07-08-distill-1to1-coverage-audit.md) | フェーズ2-③ parse fixture 蒸留の 1:1 網羅性 audit (slice → fixture case) |
| 2026-07-07 | design | open | [dd-required-marker-fire-constraint](./2026-07-07-dd-required-marker-fire-constraint.md) | dd 相当マーカーを「発火必須」にできない (values セルを持たないため required の判定対象にならない) |
| 2026-07-07 | task | open | [mbt-workspace-cleanup](./2026-07-07-mbt-workspace-cleanup.md) | kuu.mbt 旧実装系 workspace (refactor/review/parts-arggen) と origin 残存枝の廃止検討 |
| 2026-07-07 | design | open | [filter-bundle-bulk-registration](./2026-07-07-filter-bundle-bulk-registration.md) | filter を bundle 単位で一括登録する口 (idea、優先度低) |
| 2026-07-07 | design | open | [corpus-sequential-optional-positionals](./2026-07-07-corpus-sequential-optional-positionals.md) | 連続する optional positional が単一トークンで ambiguous になる表現ギャップ (uniq corpus プローブ由来) |
| 2026-07-07 | design | open | [corpus-optional-scalar-positional](./2026-07-07-corpus-optional-scalar-positional.md) | 省略可能な scalar positional にデフォルト値を持たせられない (optional は配列強制) |
| 2026-07-07 | design | open | [tty-value-as-injected-source](./2026-07-07-tty-value-as-injected-source.md) | tty 判定値のモデル化 — ambient probe でなく値源として注入する案 (kawaz/die 由来) |
| 2026-07-07 | design | open | [corpus-implicit-trailing-passthrough](./2026-07-07-corpus-implicit-trailing-passthrough.md) | positional 充足以降の暗黙 raw pass-through (env/xargs/ssh/docker) が表現できない |
| 2026-07-07 | design | open | [corpus-bare-key-value-operand](./2026-07-07-corpus-bare-key-value-operand.md) | bare key=value operand 形式 (dd if=/of=, env VAR=val) の第一級表現手段が無い |

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
