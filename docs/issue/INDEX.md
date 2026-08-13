# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-08-02 | design | open | [accum-cell-value-path-semantics](./2026-08-02-accum-cell-value-path-semantics.md) | accumulator セルへの link 値空間パスの意味論が未規定。v1 は Unsupported (definition-error) で塞ぐ裁定 (DR-127 第2波) |
| 2026-07-29 | design | idea | [unset-variant-on-repeat-closure-interaction](./2026-07-29-unset-variant-on-repeat-closure-interaction.md) | unset variant を repeat 閉包を持つ要素へ撃つ場合の相互作用 (min 消費段・途中発火・再初期化) が未規定 |
| 2026-07-28 | design | idea | [positional-seq-child-porosity-unpinned](./2026-07-28-positional-seq-child-porosity-unpinned.md) | positional 直下 seq 子と positionals 入れ子の消費意味論の差 (option 割り込みの多孔質性) が未規定、fixture pin 無し |
| 2026-07-24 | design | idea | [insert-form-positional-group-decode-drop](./2026-07-24-insert-form-positional-group-decode-drop.md) | positional group 上の insert_form 宣言が decode 段で silent drop される spec gap (DR-117 §2.6) |
| 2026-07-16 | design | idea | [engine-contract-verification-fixture](./2026-07-16-engine-contract-verification-fixture.md) | engine 単体の契約検証 fixture 化 (DR-110 §8 の将来課題)、合成住人による extension interface 準拠検証 |
| 2026-07-12 | design | idea | [vocab-alias-installer](./2026-07-12-vocab-alias-installer.md) | 語彙の糖衣 alias を Map 一個で追加する installer 構想 (正準語彙は動かさない) |
| 2026-07-14 | design | idea | [argv0-preset-type](./2026-07-14-argv0-preset-type.md) | busybox型 multi-call binary の argv0 分岐は kuu対象外、値注入presetの構想 (需要が出たら) |
| 2026-07-15 | design | idea | [descriptor-conformance-promotion-revisit](./2026-07-15-descriptor-conformance-promotion-revisit.md) | descriptor 検証の conformance 昇格の再検討 (DAX-Q6 先送り分、独自フィルタ実装ラップ or 2言語目着手で再検討) |
| 2026-07-23 | task | idea | [help-category-link-last-wins](./2026-07-23-help-category-link-last-wins.md) | M5 で #help_category 内部セルの link 配線実装時は at_pos ベース last-wins を使う (completion.mbt L42-72 pattern 再利用、宣言順 push 由来の bug class 回避) |
| 2026-08-12 | task | open | [ref-template-help-carrier](./2026-08-12-ref-template-help-carrier.md) | ref/template 由来 help_meta の provenance carrier 未実装、DR-116 §4 説明引き直しの ref 越し分を次サイクルへ |
| 2026-08-12 | design | open | [nested-config-not-supplied](./2026-08-12-nested-config-not-supplied.md) | 参照実装が root 宣言の config_file を子スコープの要素へ供給しない (DR-050 §3 同型対応の nested 未実装) |
| 2026-08-12 | task | open | [config-committed-carry-over](./2026-08-12-config-committed-carry-over.md) | 参照実装が DR-133 のパス列 fold に未追随 (最後勝ち全体置換のまま)。fixture 8件 mismatch、multiple config_file の result 漏れも併発 |
| 2026-08-12 | task | open | [command-value-carrier](./2026-08-12-command-value-carrier.md) | 参照実装の CommandDef が value 担体を持たず command の value を reject する (DR-134 未追随) |
| 2026-08-12 | design | open | [completion-ux-layer-completer-closure-abi](./2026-08-12-completion-ux-layer-completer-closure-abi.md) | completion ux 層の座席 (kuu.mbt vs kuu-cli lib) と形態 A completer クロージャ ABI が DR-117 波及節で未設計 |
| 2026-08-12 | design | open | [command-value-default-fn-value-space](./2026-08-12-command-value-default-fn-value-space.md) | value 持ち command の default_fn 単独時の値空間が未規定 |
| 2026-08-12 | design | open | [io-predicate-vocabulary-seat](./2026-08-12-io-predicate-vocabulary-seat.md) | IO 述語系語彙 (readable / exists / dir) の座席設計 (filter 語彙拡張 vs DR-107 role 軸新設) |
| 2026-07-26 | design | open | [parent-type-ignored-lint-warn](./2026-07-26-parent-type-ignored-lint-warn.md) | 親と子の両方が type を持つ or/seq に「親の type は無意味」の lint warn を出す (DR-067 §2/§3.5 は合法規定、静的バリデータ未実装後の追加項目) |
| 2026-07-25 | design | open | [bash-completion-comp-line-point-relex](./2026-07-25-bash-completion-comp-line-point-relex.md) | bash 補完 glue の words 再結合、COMP_WORDS ベースでは空白情報が失われる残存ギャップ (H9 follow-up) |
| 2026-07-25 | design | open | [raw-tail-capture-after-positional](./2026-07-25-raw-tail-capture-after-positional.md) | 最初の positional 充足後を丸ごと raw で取る境界を宣言できない (docker run/kubectl exec 型) |
| 2026-07-25 | design | open | [closed-enum-open-form-completion-gap](./2026-07-25-closed-enum-open-form-completion-gap.md) | closed enum + 開放形の混在値 (default|all|named:X) が補完候補として提示できない |
| 2026-07-25 | design | open | [fixture-envelope-shared-runner](./2026-07-25-fixture-envelope-shared-runner.md) | fixture envelope を第三者が再利用できる共通 runner/runbook 資産が無い |
| 2026-07-25 | docs | open | [dr-body-implementation-specific-names-cleanup](./2026-07-25-dr-body-implementation-specific-names-cleanup.md) | DR-057/076/078/105/106 本文に残る実装固有名 (kuu.mbt/installer.mbt/slice PoC) の整理 |
| 2026-07-26 | design | open | [warnings-element-export-key-timing](./2026-07-26-warnings-element-export-key-timing.md) | warnings[].element のキー体系が export_key 適用の前後どちらか未規定 (sources 側は明確化済み、DR-058 §2 の canonical 解釈待ち) |
| 2026-07-26 | task | open | [projection-verification-structural-gaps](./2026-07-26-projection-verification-structural-gaps.md) | 射影 (result/effects/sources) の検証断面に構造的な空白が残っている (P1/P2 の 8 テーマ) |
| 2026-07-22 | task | wip | [dr-116-completion-generator-implementation](./2026-07-22-dr-116-completion-generator-implementation.md) | DR-116 (canonical 補完生成器の既定 policy) の実装 — 生成器・product test 未実装 |

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
