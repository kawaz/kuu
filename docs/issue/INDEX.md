# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-12 | design | idea | [exclusive-group-at-least-one-required](./2026-07-12-exclusive-group-at-least-one-required.md) | exclusive_group に「少なくとも1つ必須」の表現が無い — tar のモード必須が書けない |
| 2026-07-12 | design | idea | [vocab-alias-installer](./2026-07-12-vocab-alias-installer.md) | 語彙の糖衣 alias を Map 一個で追加する installer 構想 (正準語彙は動かさない) |
| 2026-07-07 | task | open | [mbt-workspace-cleanup](./2026-07-07-mbt-workspace-cleanup.md) | kuu.mbt 旧実装系 workspace (refactor/review/parts-arggen) と origin 残存枝の廃止検討 |
| 2026-07-13 | design | wip | [dr101-non-accum-array-only-filter-vocab](./2026-07-13-dr101-non-accum-array-only-filter-vocab.md) | DR-101 §3 判定マトリクスの非 accum × ARRAY-only 綴りの座席が未定 (unknown-vocab vs invalid-range) |
| 2026-07-12 | task | wip | [complete-query-fixture-coverage-gap](./2026-07-12-complete-query-fixture-coverage-gap.md) | complete クエリの fixture が0件、補完挙動のカバレッジが kuu.mbt wbtest のみ |

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
