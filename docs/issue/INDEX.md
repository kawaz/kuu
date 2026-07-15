# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-12 | design | idea | [vocab-alias-installer](./2026-07-12-vocab-alias-installer.md) | 語彙の糖衣 alias を Map 一個で追加する installer 構想 (正準語彙は動かさない) |
| 2026-07-14 | design | idea | [argv0-preset-type](./2026-07-14-argv0-preset-type.md) | busybox型 multi-call binary の argv0 分岐は kuu対象外、値注入presetの構想 (需要が出たら) |
| 2026-07-15 | design | idea | [default-lexical-scope-borrow](./2026-07-15-default-lexical-scope-borrow.md) | default の lexical-scope 借用構想、repeat 行内 default を外側要素から明示借用 (実需 corpus 待ち) |
| 2026-07-15 | design | idea | [descriptor-conformance-promotion-revisit](./2026-07-15-descriptor-conformance-promotion-revisit.md) | descriptor 検証の conformance 昇格の再検討 (DAX-Q6 先送り分、独自フィルタ実装ラップ or 2言語目着手で再検討) |
| 2026-07-15 | task | open | [anonymous-named-exact-collision-fixture](./2026-07-15-anonymous-named-exact-collision-fixture.md) | named 要素と匿名 exact の同綴り衝突 dedup を pin する collision fixture (codex #6 Minor) |
| 2026-07-14 | design | open | [from-entries-nonconforming-input-wire-form](./2026-07-14-from-entries-nonconforming-input-wire-form.md) | from_entries の輪郭検証 — 不適合入力の結果と wire 直列形 (codex #3 A-M-6/A-C-3) |
| 2026-07-14 | design | open | [lowering-generated-element-origin-rule](./2026-07-14-lowering-generated-element-origin-rule.md) | ref template (DR-078) 越しの候補 origin 非対称が未定義 (codex #2 M-14 残課題、他3断面は統括検証で解消済み) |
| 2026-07-07 | task | open | [mbt-workspace-cleanup](./2026-07-07-mbt-workspace-cleanup.md) | kuu.mbt 旧実装系 workspace (refactor/review/parts-arggen) と origin 残存枝の廃止検討 |
| 2026-07-14 | task | wip | [mbt-remote-branch-context-audit](./2026-07-14-mbt-remote-branch-context-audit.md) | kuu.mbt 旧リモート枝5本の未回収コンテキスト棚卸し (削除不可、回収候補提示まで、kawaz裁定) |
| 2026-07-12 | task | wip | [complete-query-fixture-coverage-gap](./2026-07-12-complete-query-fixture-coverage-gap.md) | complete クエリの fixture が0件、補完挙動のカバレッジが kuu.mbt wbtest のみ |
| 2026-07-14 | bug | open | [codex-review-dr102-dr103-postland](./2026-07-14-codex-review-dr102-dr103-postland.md) | codex レビュー指摘の対応 — DR-102/103 post-land (実バグ1 + spec精密化 + fixture輪郭補完) |

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
