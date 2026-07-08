# Issue INDEX

active な issue の一覧。close 済みは archive/ にあり、ここには載せない。

| date | category | status | slug | 概要 |
|---|---|---|---|---|
| 2026-07-08 | design | open | [int-value-domain-out-of-range](./2026-07-08-int-value-domain-out-of-range.md) | int の値域 (Int64 範囲外の入力) が spec 未規定、reason 語彙・int_round 帰結も未裁定 |
| 2026-07-08 | design | open | [variant-bool-eq-split-value](./2026-07-08-variant-bool-eq-split-value.md) | variant を持つ bool 要素は --ssl=false (eq-split 値形) を受けるべきか |
| 2026-07-07 | design | open | [bool-invalid-reason-vocab-gap](./2026-07-07-bool-invalid-reason-vocab-gap.md) | bool 不正入力の reason 語彙が DR-066 v1 に無い (number 系は not_a_number/not_an_integer 定義済みなのに非対称) |
| 2026-07-07 | design | open | [dd-required-marker-fire-constraint](./2026-07-07-dd-required-marker-fire-constraint.md) | dd 相当マーカーを「発火必須」にできない (values セルを持たないため required の判定対象にならない) |
| 2026-07-07 | task | open | [mbt-workspace-cleanup](./2026-07-07-mbt-workspace-cleanup.md) | kuu.mbt 旧実装系 workspace (refactor/review/parts-arggen) と origin 残存枝の廃止検討 |
| 2026-07-07 | design | open | [filter-bundle-bulk-registration](./2026-07-07-filter-bundle-bulk-registration.md) | filter を bundle 単位で一括登録する口 (idea、優先度低) |
| 2026-07-07 | design | open | [corpus-sequential-optional-positionals](./2026-07-07-corpus-sequential-optional-positionals.md) | 連続する optional positional が単一トークンで ambiguous になる表現ギャップ (uniq corpus プローブ由来) |
| 2026-07-07 | design | open | [corpus-optional-scalar-positional](./2026-07-07-corpus-optional-scalar-positional.md) | 省略可能な scalar positional にデフォルト値を持たせられない (optional は配列強制) |
| 2026-07-07 | design | open | [tty-value-as-injected-source](./2026-07-07-tty-value-as-injected-source.md) | tty 判定値のモデル化 — ambient probe でなく値源として注入する案 (kawaz/die 由来) |
| 2026-07-07 | design | open | [corpus-implicit-trailing-passthrough](./2026-07-07-corpus-implicit-trailing-passthrough.md) | positional 充足以降の暗黙 raw pass-through (env/xargs/ssh/docker) が表現できない |
| 2026-07-07 | design | open | [corpus-bare-key-value-operand](./2026-07-07-corpus-bare-key-value-operand.md) | bare key=value operand 形式 (dd if=/of=, env VAR=val) の第一級表現手段が無い |
| 2026-07-06 | task | open | [value-typing-s7-fixtures](./2026-07-06-value-typing-s7-fixtures.md) | DR-074 §7 の細部規則の輪郭 fixture 追加 (指数符号・符号付き inf・prefix 大文字等) |
| 2026-07-05 | task | open | [phase23-distill-ledger](./2026-07-05-phase23-distill-ledger.md) | フェーズ2-③ parse fixture 蒸留台帳 (slice 167 テスト → 領域割り当て) |
| 2026-07-04 | design | open | [phase1-serialization-design-agenda](./2026-07-04-phase1-serialization-design-agenda.md) | フェーズ1 (AtomicAST 直列形 + conformance fixture フォーマット) 設計叩き台 |
| 2026-07-05 | design | wip | [distill-spec-gaps](./2026-07-05-distill-spec-gaps.md) | 蒸留 wave1/wave2 監査で出た仕様詰め所の集約 (フェーズ2-③ 議論球) |

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
