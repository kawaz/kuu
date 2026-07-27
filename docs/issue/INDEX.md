# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-27 | design | idea | [seq-child-default-ladder-branch-ambiguity](./2026-07-27-seq-child-default-ladder-branch-ambiguity.md) | 両子とも default: を持つ seq に 1 トークンだけ与えたときの枝の立ち方が未規定 (CHILDDEF-Q1=b 波及、pin 保留) |
| 2026-07-24 | design | idea | [insert-form-positional-group-decode-drop](./2026-07-24-insert-form-positional-group-decode-drop.md) | positional group 上の insert_form 宣言が decode 段で silent drop される spec gap (DR-117 §2.6) |
| 2026-07-16 | design | idea | [engine-contract-verification-fixture](./2026-07-16-engine-contract-verification-fixture.md) | engine 単体の契約検証 fixture 化 (DR-110 §8 の将来課題)、合成住人による extension interface 準拠検証 |
| 2026-07-12 | design | idea | [vocab-alias-installer](./2026-07-12-vocab-alias-installer.md) | 語彙の糖衣 alias を Map 一個で追加する installer 構想 (正準語彙は動かさない) |
| 2026-07-14 | design | idea | [argv0-preset-type](./2026-07-14-argv0-preset-type.md) | busybox型 multi-call binary の argv0 分岐は kuu対象外、値注入presetの構想 (需要が出たら) |
| 2026-07-15 | design | idea | [default-lexical-scope-borrow](./2026-07-15-default-lexical-scope-borrow.md) | default の lexical-scope 借用構想、repeat 行内 default を外側要素から明示借用 (実需 corpus 待ち) |
| 2026-07-15 | design | idea | [descriptor-conformance-promotion-revisit](./2026-07-15-descriptor-conformance-promotion-revisit.md) | descriptor 検証の conformance 昇格の再検討 (DAX-Q6 先送り分、独自フィルタ実装ラップ or 2言語目着手で再検討) |
| 2026-07-23 | task | idea | [help-category-link-last-wins](./2026-07-23-help-category-link-last-wins.md) | M5 で #help_category 内部セルの link 配線実装時は at_pos ベース last-wins を使う (completion.mbt L42-72 pattern 再利用、宣言順 push 由来の bug class 回避) |
| 2026-07-26 | design | open | [array-element-provenance-sources-addressing](./2026-07-26-array-element-provenance-sources-addressing.md) | 配列・反復結果の要素ごとの provenance を sources でどうアドレスするか未規定 (export_key 修正時に切り出し) |
| 2026-07-26 | design | open | [parent-type-ignored-lint-warn](./2026-07-26-parent-type-ignored-lint-warn.md) | 親と子の両方が type を持つ or/seq に「親の type は無意味」の lint warn を出す (DR-067 §2/§3.5 は合法規定、静的バリデータ未実装後の追加項目) |
| 2026-07-25 | bug | open | [expose-key-collision-option-command-silent-loss](./2026-07-25-expose-key-collision-option-command-silent-loss.md) | 露出キー衝突検出が option × command で効かず ambiguous に昇格しない (command が黙って勝つ、DR-073) |
| 2026-07-25 | design | open | [bash-completion-comp-line-point-relex](./2026-07-25-bash-completion-comp-line-point-relex.md) | bash 補完 glue の words 再結合、COMP_WORDS ベースでは空白情報が失われる残存ギャップ (H9 follow-up) |
| 2026-07-25 | design | open | [raw-tail-capture-after-positional](./2026-07-25-raw-tail-capture-after-positional.md) | 最初の positional 充足後を丸ごと raw で取る境界を宣言できない (docker run/kubectl exec 型) |
| 2026-07-25 | design | open | [closed-enum-open-form-completion-gap](./2026-07-25-closed-enum-open-form-completion-gap.md) | closed enum + 開放形の混在値 (default|all|named:X) が補完候補として提示できない |
| 2026-07-25 | design | open | [fixture-envelope-shared-runner](./2026-07-25-fixture-envelope-shared-runner.md) | fixture envelope を第三者が再利用できる共通 runner/runbook 資産が無い |
| 2026-07-22 | task | open | [dr-116-completion-generator-implementation](./2026-07-22-dr-116-completion-generator-implementation.md) | DR-116 (canonical 補完生成器の既定 policy) の実装 — 生成器・product test 未実装 |
| 2026-07-25 | docs | open | [dr-body-implementation-specific-names-cleanup](./2026-07-25-dr-body-implementation-specific-names-cleanup.md) | DR-057/076/078/105/106 本文に残る実装固有名 (kuu.mbt/installer.mbt/slice PoC) の整理 |
| 2026-07-26 | design | open | [warnings-element-export-key-timing](./2026-07-26-warnings-element-export-key-timing.md) | warnings[].element のキー体系が export_key 適用の前後どちらか未規定 (sources 側は明確化済み、DR-058 §2 の canonical 解釈待ち) |
| 2026-07-26 | task | open | [projection-verification-structural-gaps](./2026-07-26-projection-verification-structural-gaps.md) | 射影 (result/effects/sources) の検証断面に構造的な空白が残っている (P1/P2 の 8 テーマ) |
| 2026-07-27 | bug | open | [failure-outcome-errors-required-schema-mismatch](./2026-07-27-failure-outcome-errors-required-schema-mismatch.md) | named-group-child-default.json の partial-row-is-not-a-complete-path が failureOutcome required ["outcome","errors"] に違反 (errors 欠落) |
| 2026-07-27 | design | open | [seq-both-default-children-branching-unspecified](./2026-07-27-seq-both-default-children-branching-unspecified.md) | 両子とも default: を持つ seq の枝の立ち方が未規定 (CHILDDEF-Q1=b の残余断面、literal-child-default-ladder.json は非対称ケースのみ) |

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
