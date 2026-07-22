# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-16 | design | idea | [engine-contract-verification-fixture](./2026-07-16-engine-contract-verification-fixture.md) | engine 単体の契約検証 fixture 化 (DR-110 §8 の将来課題)、合成住人による extension interface 準拠検証 |
| 2026-07-12 | design | idea | [vocab-alias-installer](./2026-07-12-vocab-alias-installer.md) | 語彙の糖衣 alias を Map 一個で追加する installer 構想 (正準語彙は動かさない) |
| 2026-07-14 | design | idea | [argv0-preset-type](./2026-07-14-argv0-preset-type.md) | busybox型 multi-call binary の argv0 分岐は kuu対象外、値注入presetの構想 (需要が出たら) |
| 2026-07-15 | design | idea | [default-lexical-scope-borrow](./2026-07-15-default-lexical-scope-borrow.md) | default の lexical-scope 借用構想、repeat 行内 default を外側要素から明示借用 (実需 corpus 待ち) |
| 2026-07-15 | design | idea | [descriptor-conformance-promotion-revisit](./2026-07-15-descriptor-conformance-promotion-revisit.md) | descriptor 検証の conformance 昇格の再検討 (DAX-Q6 先送り分、独自フィルタ実装ラップ or 2言語目着手で再検討) |
| 2026-07-22 | task | open | [dr-116-completion-generator-implementation](./2026-07-22-dr-116-completion-generator-implementation.md) | DR-116 (canonical 補完生成器の既定 policy) の実装 — 生成器・product test 未実装 |

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
