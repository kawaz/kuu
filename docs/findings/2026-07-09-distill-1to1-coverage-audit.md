# フェーズ2-③ parse fixture 蒸留の 1:1 網羅性 audit — slice PoC → fixtures/**

> issue `2026-07-08-distill-1to1-coverage-audit.md` の第一段 (マッピング調査) の確定成果。旧台帳 `docs/issue/archive/2026-07-05-phase23-distill-ledger.md` の割当表 (領域 D1-D15) と、slice PoC (kuu.mbt slice/poc/ の phase1-29、28 ファイル) の各テスト行を、現行 `fixtures/**` の case (312 case index 化) と cross-check した audit レポート。読み取り作業のみ、fixture 変更は第二段で別途着手。

## 判明した事実

- **総 slice test (領域 D1-D15 に列挙)**: 124 items (領域跨ぎのクロス掲載を含むと合計 130 items)
- **蒸留済み (対応 fixture case が明確)**: **116 items**
- **意図的非蒸留 (根拠明記)**: **3 items** (phase1:130 匿名副スコープ / phase21:59 INTERNAL / phase25:15 installer 順列一致)
- **漏れ**: **8 items** (即対応可 6 件 + blocked 2 件)
- **非対象セクション (§3 台帳)**: 9 項目、全て現行 DR / 予約中クエリと整合 (再確認結果、変更不要)

### 領域別集計

| 領域 | slice test 数 | 蒸留済み | 意図的非蒸留 | 漏れ |
|---|---|---|---|---|
| D1 path-search | 10 | 9 | 1 (phase1:130) | 0 |
| D2 matcher-readings | 6 | 6 | 0 | 0 |
| D3 dd | 5 | 5 | 0 | 0 |
| D4 repeat-parse | 18 | 13 | 0 | **5** (phase4:114, 10:64, 14:157, 7:47, 7:56) |
| D5 multiple-parse | 4 | 4 | 0 | 0 |
| D6 command-scope | 17 | 17 | 0 | 0 |
| D7 inheritable-parse | 5 | 5 | 0 | 0 |
| D8 constraints-parse | 8 | 6 | 1 (phase25:15) | **2** (phase25:171 即応可、phase23:45 kind:filter blocked) |
| D9 variant-effects | 7 | 7 | 0 | 0 |
| D10 failure-actions | 9 | 8 | 0 | **1** (phase23:90 blocked、CONFORMANCE §2 拡張要) |
| D11 value-sources | 14 | 14 | 0 | 0 |
| D12 export-key | 7 | 7 | 0 | 0 |
| D13 absent | 5 | 4 | 1 (phase21:59) | 0 |
| D14 alias-parse | 6 | 6 | 0 | 0 |
| D15 name-surface | 3 | 3 | 0 | 0 |
| **合計** | **124** | **114** | **3** | **8** (即対応 6 / blocked 2) |

(D6 phase3:73/121 が D11 と cross referenced など、いくつかの slice ref は複数領域に掲載されるため、fixture 側の対応数 = 116 のほうが多い。上表は「D 割当領域内でカウント」した数値)

### 漏れ 8 件の詳細

| # | slice ref | 領域 | 内容 | 依存 / 追加難度 |
|---|---|---|---|---|
| 1 | phase4:114 | D4 | 共有 or-template を ref する repeat の ambiguity 表出 | 通常 (or × repeat のクロス、DR-038 派生) |
| 2 | phase10:64 | D4 | 取り分選好 (greedy/lazy) が or 分岐 ambiguity を消さない (非侵食性) | 通常 (DR-043 × DR-038) |
| 3 | phase14:157 | D4 | `unwrap_single` opt-in collector の輪郭 | 中 (DR-036 filters 統合後の座席未定、要裁定) |
| 4 | phase7:47 | D4 | repeat 複数バインドが result で 1 リストに平坦化 (DR-044) | 通常 |
| 5 | phase7:56 | D4 | 名前付き command scope 内 repeat = nest + flat 両立 | 通常 (D4 × D6 クロス) |
| 6 | phase25:171 | D8 | constraint が 2 完全経路の一方を落とし 1 本確定 | 通常 (D8 × D1 クロス) |
| 7 | phase23:45 (filter 側) | D8 | `kind:"filter"` の実例輪郭 | **blocked** (filters registry 実装 = task #18 待ち) |
| 8 | phase23:90 | D10 | tried_triggers / help_entry フィールドの failure 表現 | **blocked** (CONFORMANCE §2 に optional フィールド追加要) |

### 非対象セクション (§3 台帳) の再確認結果

9 項目全てを DR と現状に照らして再検査した。全て「現在も妥当」で、非蒸留判断の変更不要。

| 項目 | 台帳の非対象理由 | 現状の妥当性 |
|---|---|---|
| installer 順列 (phase2:109, 3:190, 20:74, 26:146, 27:112) | DR-070 §3 の runner 組込順列検査で被覆 | ✓ 現在も妥当 |
| installer 冪等・宣言層 inert (phase2:33, 2:57) | DR-042 ①' engine 内部 | ✓ 現在も妥当 |
| canon 構造比較 (phase4:40, 13:53, 14:128, 26:107, 29:44/63/77) | fixtures/lowering/ で被覆済み | ✓ 現在も妥当 (lowering カテゴリ 20 fixture) |
| definition-error (phase2:74/92, 3:148, 4:145, 14:177, 20:275, 24:8/28/45/59/77) | `query:"definition_error"` 予約中 | ✓ 現在も予約中 (フォーマット未確定) |
| completion (phase28 全 9 件) | `query:"complete"` 予約中 | ✓ 現在も予約中 |
| result-shaping (phase15:9/21/34/50, phase12:92) | result builder 内部 (DR-044) | ✓ 現在も妥当 |
| effect-identity engine 内部 (phase9:6/16/24/32, phase11:35/44, phase13:9/22/37) | dd/duplicate-decl.json で原理被覆済み | ✓ 現在も妥当 |
| authsock pre_filter 内部 (phase12:43/59/76) | engine 内部 pre_filter 実測 | ✓ 現在も妥当 |
| phase16:14 oracle 既知限界 | DR-070 §1b KNOWN GAP 台帳 | ✓ 現在も妥当 (subcommand 内 repeat の scope 境界誤認は既知バグ) |

## 実用的な示唆 / ベストプラクティス

### 監査結果を受けた第二段の推奨スコープ

- **即座に fixture 化可能**: 6 件 (漏れ #1-#6)。1 バッチで完了可能
- **Blocked 中**: 2 件 (#7 filter registry 実装後 / #8 CONFORMANCE §2 拡張後) — 別 issue 起票が妥当

### 「意図的非蒸留」の運用パターン

3 items (phase1:130 / phase21:59 / phase25:15) は fixture 化しない判断で残す。共通パターン:

- **engine 内部不変則** (phase1:130 の DR-042 ⑤、phase25:15 の installer 順列一致) — 挙動観測が spec fixture の範疇でなく runner / 内部検査の関心
- **outcome union 外の INTERNAL** (phase21:59 の ParserContext roster/bindings 2 層分離、DR-051 §5) — CONFORMANCE §2 の outcome union に載らない要素は fixture 対象外

網羅性の主張が価値を持つ本 audit のような文書では、これら「該当なし」を明示するのが正 (rule-writing-guidelines の「該当なし」明示、[[no-historical-noise]] の除外リスト禁止との棲み分け)。

### 予約中クエリの fixture (definition_error / complete)

台帳非対象の 2 大カテゴリ (definition-error 10 件、completion 9 件、計 19 件) は `query:` タグ予約中のため fixture フォーマット確定前は着手不可。フォーマット確定 = フェーズ 3 の実装段階と同期する見込み (DR-065 予約規定に沿う)。

## 検証の詳細

### D1 path-search (10 slice test → fixture case)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase1:11 | 完全経路 0 本 → held Error 伴う failure | `complete-path-count.json::{missing-trailing-operand, residual-token, value-parser-reject}` | ✓ 蒸留済み |
| phase1:18 | 完全経路唯一 → commit | `complete-path-count.json::single-complete-path` | ✓ |
| phase1:24 | Many 2 本全消費 → ambiguous | `ambiguous-receptacles.json::{zero-tokens-unique-split, one-token-greedy-left, two-tokens-greedy-left}` | ✓ |
| phase1:78 | greedy 割込み 2 positional 間 | `complete-path-count.json::verbose-interjection` | ✓ (併示形) |
| phase1:88 | greedy 割込み repeat 反復間 | `repeat-porous.json` (3 case) | ✓ |
| phase1:101 | 値 greedy が次トークン raw 消費 | `greedy-value-slot.json` (3 case) | ✓ |
| phase1:130 | 匿名副スコープの背骨化 | 非対象 (DR-042 ⑤ 維持) | ✓ 意図的非蒸留 |
| phase1:147 | 可変アリティ option → ambiguous | `variable-arity-ambiguous.json` (2 case) | ✓ |
| phase23:15 | 異位置失敗の primary=最深 | `held-errors-distinct-depth.json` (2 case) | ✓ |
| phase23:30 | 同深タイ両方 primary + 0/2 双対 | `held-errors-same-depth.json` (2 case) | ✓ |

### D2 matcher-readings (6 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase1:36 | `-n1.0f` cluster 分割 ambiguous | `cluster-split.json::suffix-rejected-split-only` (DR-074 波及形) | ✓ |
| phase1:50 | `-n1.0` 単一読み | `cluster-split.json::no-split-point` | ✓ |
| phase1:64 | `-n1.0f` -f 未定義 → failure | `cluster-split-no-flag.json::no-flag-suffix-error` | ✓ |
| phase2:223 | 4 形同一 cell 一致 | `entry-forms.json` (4 case) | ✓ |
| phase9:32 | 同 entity/source 値違い → ambiguous | `cluster-split-string.json` / `short-cluster-inf-multi-accept.json` | ✓ (mechanism 覆) |
| phase23:59 | ambiguous 解釈 全列挙 | 上記 fixture の interpretations 配列 | ✓ |

### D3 dd (5 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase2:202 | `--` 後 greedy 面遮断 | `dd/basic.json::dd-rescope-raw` | ✓ |
| phase6:11 | dd × global | `dd/global-sever.json::dd-severs-global` | ✓ |
| phase6:35 | 遮断境界は子の `--` 位置 | `dd/global-sever.json::{no-dd-global-sync, sever-boundary-child-dd}` | ✓ |
| phase17:65 | dd 内部 `--help` raw 消費 | `dd/fail-action-sever.json` (2 case) | ✓ |
| phase29:52 | 明示 dd 名 `++` 綴り差替 | `dd/dialect-name.json` (2 case) | ✓ |

### D4 repeat-parse (18 slice test) — **漏れ 5 件**

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase4:15 | `cp src... dst` 分割点は末尾トークン数で一意 | `min2-trailing.json` (3 case) | ✓ |
| phase4:57 | greedy 割込み repeat 反復間 | `interjection.json` (2 case) | ✓ |
| phase4:80 | min:2 head + 再帰 tail | `min2-standalone.json` (3 case) | ✓ |
| phase4:114 | 共有 or-template を ref する repeat の ambiguity | **未蒸留** | ⚠ 漏れ #1 |
| phase10:16 | greedy+greedy 左最長取り | `preference-greedy.json` | ✓ |
| phase10:30 | lazy+greedy 左 lazy | `preference-lazy.json` + `preference-lazy-min0.json` | ✓ |
| phase10:47 | greedy backtrack 再分割 | `backtrack.json` (2 case) | ✓ |
| phase10:64 | 取り分選好が or 分岐 ambiguity を消さない | **未蒸留** | ⚠ 漏れ #2 |
| phase14:34 | min:2 再帰 Ref tail | `min2-standalone.json` | ✓ |
| phase14:52 | max {1,3} 4 個目消費不能 | `max-finite.json` (3 case) | ✓ |
| phase14:71 | exact {2,2} 過不足 fail | `exact-count.json` (3 case) | ✓ |
| phase14:93 | 有界 greedy 左上限内最長 | `preference-bounded-greedy.json` | ✓ |
| phase14:110 | 有界 lazy 最短 | `preference-bounded-lazy.json` | ✓ |
| phase14:157 | `unwrap_single` opt-in collector | **未蒸留** | ⚠ 漏れ #3 |
| phase16:38 | separator × repeat flatten | `multiple-parse/separator-repeat.json` (3 case) | ✓ (D5 領域) |
| phase16:53 | separator (repeat なし) append 分割 | `multiple-parse/separator-split.json` (3 case) | ✓ (D5 領域) |
| phase7:47 | repeat 複数バインドが result で 1 リストに平坦化 | **未蒸留** | ⚠ 漏れ #4 |
| phase7:56 | 名前付き command scope 内 repeat nest+flat 両立 | **未蒸留** | ⚠ 漏れ #5 |

### D5 multiple-parse (4 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase7:15 | multiple option 複数発火 = append | `multiple-parse/append.json` (3 case) | ✓ |
| phase7:25 | 非 accumulator 複数発火 = last-wins | `multiple-parse/last-wins-scalar.json` (2 case) | ✓ |
| phase7:75 | multiple option + repeat positional 独立リスト | `multiple-parse/multiple-with-repeat.json::multiple-and-repeat` | ✓ |
| phase13:143 | empty variant `--clear-tags` 空リセット | `variant-effects/empty-clear.json` (D9 領域) | ✓ |

### D6 command-scope (17 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase3:13 | subcommand が greedy trigger 発火 | `subcommand.json` (4 case) | ✓ |
| phase3:37 | global 構造コピー | `global.json::child-entry-fires` | ✓ |
| phase3:54 | global shadowing | `shadowing.json` (3 case) | ✓ |
| phase3:73 | inherit ladder (D11 クロス) | `value-sources/inherit-ladder.json` | ✓ |
| phase3:121 | inherit 元なし → 子 default | `inherit-ladder.json` (fallback ケース) | ✓ |
| phase6:53 | global 孫まで多段伝播 | `global.json::grandchild-propagation` | ✓ |
| phase6:70 | shadowing subtree ブロック | `shadowing-subtree.json` (3 case) | ✓ |
| phase7:35 | subcommand 1 段ネスト result | `subcommand.json::nested-value-and-flag` | ✓ |
| phase8:13 | 親子同名 innermost readable | `early-close.json::innermost-consumes` | ✓ |
| phase8:25 | root readable 先勝ち | `early-close.json::root-consumes-first` | ✓ |
| phase8:40 | 早閉じ抑制 + 親再開 | `early-close.json::parent-backbone-resume` | ✓ |
| phase8:58 | 3 階層再帰早閉じ抑制 | `early-close.json::three-level-early-close` | ✓ |
| phase8:78 | global で子 readable | `early-close.json` 3-level case (併示) | ✓ |
| phase11:10 | global root entity 束縛 | `global.json::child-entry-fires` | ✓ |
| phase11:24 | 値持ち global の root cell 同期 | `global.json::valued-global-sync` | ✓ |
| phase19:25 | 3 段 別 name + 同 trigger | `shadowing-3level-diff-name.json` (2 case) | ✓ |
| phase19:43 | 3 段 同 name + 同 trigger | `shadowing-3level-same-name.json` + `mid-global-repropagation.json` | ✓ |
| phase19:55 | 3 段 同 name + 別 trigger | `shadowing-3level-diff-trigger.json` (3 case) | ✓ |

### D7 inheritable-parse (5 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase27:17 | inheritable 自スコープ + 祖先両綴り | `basic.json::{self-scope-spelling, ancestor-inherit-flowdown}` | ✓ |
| phase27:33 | 祖先綴り 全階層同じ | `ancestor-spelling.json` (3 case) | ✓ |
| phase27:61 | 祖先書込み値が配下 default (D11 クロス) | `basic.json` + `inheritable-ladder.json` | ✓ |
| phase27:98 | 祖先同綴り自前で inheritable コピー抑制 | `shadow.json` (2 case) | ✓ |
| phase27:128 | prefix 付き long 合成 | `long-composition.json` (2 case) | ✓ |

### D8 constraints-parse (8 slice test) — **漏れ 2 件**

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase21:46 | required positional (D13 クロス) | `absent/required-positional.json` (2 case) | ✓ |
| phase23:45 | error kind 3 値: parse / filter / constraint | parse: `path-search/complete-path-count.json` / constraint: `constraints-parse/*.json` / **filter: 未蒸留** | ⚠ 漏れ #7 (blocked, filters registry) |
| phase25:15 | constraint installer 不在 unknown-vocab、順列で結果不変 | 非対象 (DR-070 §3 runner 組込順列検査) | ✓ 意図的非蒸留 |
| phase25:42 | requires + 目的語不足で違反 | `requires.json` + `default-interaction.json::requires-target-default` | ✓ |
| phase25:74 | conflicts_with 片側宣言双方向、unset 取消 | `conflicts.json` (4 case) | ✓ |
| phase25:114 | exclusive_group + conflicts 独立 2 errors | `exclusive.json` (3 case) | ✓ |
| phase25:133 | value_requires committed 分岐 | `requires.json::value-requires-*` + `default-interaction.json::value-branch-cli-trigger` | ✓ |
| phase25:171 | constraint が 2 完全経路の一方を落とし 1 本確定 | **未蒸留** | ⚠ 漏れ #6 |

### D9 variant-effects (7 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase13:82 | set variant `--gzip` operand | `set-operand.json` (3 case) | ✓ |
| phase13:103 | unset ladder 開放 (D11 クロス) | `value-sources/unset-ladder.json` | ✓ |
| phase13:143 | empty variant コレクション clear | `empty-clear.json` (2 case) | ✓ |
| phase18:37 | long/short 同一 cell 効果順序 | `effect-order.json` (2 case) | ✓ |
| phase18:52 | global root + command 内コピー別トークン発火 | `effect-order-global.json` (2 case) | ✓ |
| phase25:74 | unset で conflict 取消 (D8 クロス) | `constraints-parse/conflicts.json::unset-cancels-conflict` | ✓ |
| phase26:52 | long alias base+variant 再導出 (D14 クロス) | `alias-rederive.json` (5 case) | ✓ |

### D10 failure-actions (9 slice test) — **漏れ 1 件**

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase17:37 | help 先行 + 後続失敗 | `help-basic.json::help-first-then-fail` | ✓ |
| phase17:50 | 失敗トークン先行 → help 到達不能 | `help-basic.json::failure-first-help-unreached` | ✓ |
| phase17:65 | dd 内部 `--help` raw 消費 (D3 クロス) | `dd-internal.json` + `dd/fail-action-sever.json` | ✓ |
| phase17:85 | 2 failure-action argv 最小 | `argv-minimal.json` (2 case) | ✓ |
| phase17:108 | help + number 失敗 | `held-candidate.json::help-fires-then-deadend` | ✓ |
| phase17:130 | 全経路 help | `held-candidate.json::failure-first-help-unreached` | ✓ |
| phase18:15 | ambiguous suppress help | `ambiguous-non-firing.json` (2 case) | ✓ |
| phase23:76 | fired_action + retain Error 両立 | `held-candidate.json::help-fires-then-deadend` | ✓ |
| phase23:90 | tried_triggers / help_entry フィールド | **未蒸留** (CONFORMANCE §2 未定義) | ⚠ 漏れ #8 (blocked) |

### D11 value-sources (14 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase2:133 | env ladder | `env-ladder.json` (3 case) | ✓ |
| phase3:73 | inherit ladder (D6 クロス) | `inherit-ladder.json` (3 case) | ✓ |
| phase13:103 | unset ladder 開放 (D9 クロス) | `unset-ladder.json` (4 case) | ✓ |
| phase20:44 | 4 値源 ladder | `config/ladder.json` (4 case) | ✓ |
| phase20:94 | config_key 同型探索 | `config/isomorphic-path.json` (2 case) | ✓ |
| phase20:120 | config 型寛容双方向 | `config/value-typing.json` (4 case) | ✓ |
| phase20:173 | config 配列→multiple piece | `config/array-object.json` | ✓ |
| phase20:196 | 整数値 number→string | `config/value-typing.json::number-to-string` | ✓ |
| phase20:218 | config_file パス cli>env>default | `config/path.json` (3 case) | ✓ |
| phase20:252 | committed 失敗 Error, default 黙認 | `config/path.json::default-read-tolerated` | ✓ |
| phase21:81 | config JSON null は供給なし | `config/null-supply.json` (2 case) | ✓ |
| phase21:107 | int 型は整数のみ | `config/value-typing.json::number-vs-int` | ✓ (DR-075 §1 追従) |
| phase21:130 | number 1.5 許容 int Error | `config/value-typing.json::number-vs-int` | ✓ |
| phase27:61 | inheritable inherit→default (D7 クロス) | `inheritable-ladder.json` (3 case) | ✓ |

### D12 export-key (7 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase22:15 | export_key 文字列上書き | `rename.json` (2 case) | ✓ |
| phase22:26 | export_key null option | `transparent-kv.json` (2 case) | ✓ |
| phase22:44 | export_key null array 要素 | `transparent-seq.json` (2 case) | ✓ |
| phase22:69 | export_key null command 昇格 | `command-promote.json` (2 case) | ✓ |
| phase22:97 | export_key `""` → null 正規化 | `empty-string-normalizes.json` | ✓ |
| phase22:116 | export_key と link/id 直交 | `rename-orthogonal-link.json` (2 case) | ✓ |
| phase22:143 | 同一 export_key の 2 要素 ambiguous | `collision.json` (2 case) + DR-073 claimants | ✓ |

### D13 absent (5 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase21:15 | 値源なし要素の未指定は absent | `no-source-and-default.json::unspecified-baseline` | ✓ |
| phase21:30 | default 保持要素は常に present | `no-source-and-default.json::name-supplied-cli` | ✓ |
| phase21:37 | repeat 要素は 0 発火でも `[]` | `repeat-empty.json` (2 case) | ✓ |
| phase21:59 | absent 要素の meta は roster+bindings 側 | 非対象 (DR-051 §5 INTERNAL) | ✓ 意図的非蒸留 |
| phase22:131 | selected scope 子 absent でも `{}` | `selected-scope-empty.json` (2 case) | ✓ |

### D14 alias-parse (6 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase26:34 | short alias canonical cell へ | `short-alias.json` (3 case) | ✓ |
| phase26:52 | long alias base+variant 再導出 (D9 クロス) | `long-rederive.json` (4 case) | ✓ |
| phase26:79 | 明示 `long:[]` 上書き | `long-override.json` (3 case) — DR-071 §1 対応で表記補正済 | ✓ |
| phase26:122 | command alias canonical subtree | `command-alias.json` (2 case) | ✓ |
| phase26:162 | deprecated alias 受理+warning | `deprecated.json` (3 case) | ✓ |
| phase26:185 | alias 入口 → canonical requires 発動 (D8 クロス) | `canonical-constraint.json` (2 case) | ✓ |

### D15 name-surface (3 slice test)

| slice ref | 検証内容 | 対応 fixture case | 状態 |
|---|---|---|---|
| phase29:17 | `:set` が `--<name>` 生成 | `main-entry.json` (2 case) | ✓ |
| phase29:26 | snake_case → kebab-case | `snake-kebab.json` (3 case) | ✓ |
| phase29:35 | 明示綴り 素通し | `explicit-variant.json` (3 case) | ✓ |

## 手続き / 手法

- fixtures/ 全 case ID を index 化 (312 case) して cross-check の基礎とした
- 台帳 D1-D15 の各 slice ref を fixture case へ 1:1 マッピング、複数領域クロス掲載は各領域でカウント
- 漏れ候補は grep で二重確認 (fixtures/** 全域で該当キーワード / 検証内容の類似 case が無いことを検算)
- 非対象セクション §3 の 9 項目を現行 DR / 予約中クエリと再確認
- 全 slice phase (1-29 の 28 ファイル、phase5 は欠番) を非対象含めてカバー

## 関連

- issue `2026-07-08-distill-1to1-coverage-audit.md` (本 audit の trigger)
- archive `2026-07-05-phase23-distill-ledger.md` (蒸留計画の実行台帳、本 audit の cross-check 元)
- DR-065 (conformance fixture format) / DR-070 (lowering fixture format) / DR-053 (outcome union) / DR-066 (reason 語彙)
- 監査中間報告: SendMessage msg_id ac5ab5f6 (Batch 1) / 1dbc6381 (Batch 2) / e59ab8f0 (Batch 3)

## 2026-07-10 差分監査 (現況照合)

- 漏れ 8 件のうち 7 件は 2026-07-09 午後〜07-10 の fixture 追加で解消済み (各 fixture の why に「蒸留 1:1 audit 漏れ #N」の自己参照あり):
  - #1 phase4:114 / #2 phase10:64 → `fixtures/repeat-parse/ref-or-template.json::rgb-vs-3-names-ambiguous`
  - #3 phase14:157 → `fixtures/multiple-parse/collector-unwrap-single.json`
  - #6 phase25:171 → `fixtures/constraints-parse/requires-bool-target.json` (代替輪郭、DR-047 §5)
  - #7 phase23:45 → `fixtures/value-typing/cell-filter-reject.json`
  - (#4 phase7:47 / #5 phase7:56 は前回時点で解消済み)
- 残る漏れは #8 phase23:90 のみ (CONFORMANCE §2 拡張待ち、issue `2026-07-09-conformance-tried-triggers-help-entry-fields` が追跡)
- 集計更新: 対応済み 121 / 漏れ 1 / 意図的非蒸留 3 (総 124。過去集計の 114+8+3=125 の 1 件超過は D6 phase3:73/121 のクロス掲載由来の可能性、厳密再計算は未実施と明記)
- 逆方向 (slice 非由来) case が +107 増 (計 170 ファイル / 419 case、DR-079〜084 追従の新規仕様由来: count-parse / definition-error / piece-filters / multiple-parse の merge・accum 系 / value-typing の cell-filter 系)。個別由来確認はスコープ外
- definition-error フォーマットは DR-082 で確定済みのため、旧「`query:"definition_error"` 予約中」を根拠とした非対象 10 slice item (phase2:74/92, 3:148, 4:145, 14:177, 20:275, 24:8/28/45/59/77) の非対象判断は根拠が古い — 内容自体は未 fixture 化のまま、次回台帳更新時に再分類要否の確認を推奨
