# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-05 | design | open | [phase2-lower-fixture-format](./2026-07-05-phase2-lower-fixture-format.md) | フェーズ2-② lowering conformance (query:"lower" fixture フォーマット) 設計叩き台 |
| 2026-07-04 | design | open | [phase1-serialization-design-agenda](./2026-07-04-phase1-serialization-design-agenda.md) | フェーズ1 (AtomicAST 直列形 + conformance fixture フォーマット) 設計叩き台 |

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
