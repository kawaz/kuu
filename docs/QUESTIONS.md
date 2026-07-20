# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺 API-Q3: 公開面の残り省略形の一括展開 (全数裏取り済み)

**背景**: 「省略形は使わない (よほど普遍的でない限り)」原則の適用第 2 弾。kuu.mbt の .mbti 3 本を全数走査し、wire (JSON) 語彙との対応も実物確認済み。

### バッチ 1: wire 非依存 — 展開する (統括推し = 全部実施、個別却下可)

| 現名 | 提案名 |
|---|---|
| `Ctx` 系 (`FnCtx`/`FilterCtx`/`DefaultCtx`/`EffectCtx`/`SeatCtx`/`DecodeCtx`) | `*Context` |
| `AmbInterp` | `AmbiguousInterpretation` |
| `*Def` 型 (`AliasDef`/`CommandDef`/`ElemDef`/`FailDef`) | `*Definition` (`ElemDef`→`ElementDefinition`) |
| `DefsView` / `collect_defs_errors` | `DefinitionsView` / `collect_definitions_errors` |
| `*Decl` 型 (`LongDecl`/`OwnedDecl`/`HelpMetaDecl`/`HelpTypeDecl`/`ScopeDecl` 等) | `*Declaration` |
| `DefError`/`DefErrKind`/`ErrKind` | `DefinitionError`/`DefinitionErrorKind`/`ErrorKind` |
| `ElemBody`/`elem_value`/`elem_head` 等 | `ElementBody`/`element_value`/`element_head` |
| `ScopedCons` | `ScopedConstraints` |
| `*Ext` trait 8 種 (`InstallerExt`/`TypeExt` 等) | `*Extension` |
| `EqSepMode` (型名のみ) | 下記バッチ 2 の Eq 判定に従う |
| `kv_arg`/`kv_map_accumulator` | `key_value_arg`/`key_value_map_accumulator` |
| `depr_marker` | `deprecation_marker` |
| `Accum` 系フィールド/関数 (`accum`/`apply_accum_filter_chain`) | `accumulator`/`apply_accumulator_filter_chain` (wire キー `accum_filters` は不変、実装名のみ) |

### バッチ 2: wire 語彙が第一級 — 残置 (統括推し、確認済み実測)

| 語 | wire 実物 | 判定 |
|---|---|---|
| `fn` (`FnCall`/`FnCtx`/`FnInvocation` 等) | descriptor schema の `role:"fn"` + carrier `{"fn":...}` が第一級 (DR-114 §6.1) | **残置** — wire 語彙 `fn` と実装型の対応が 1:1 で崩せない |
| `dd` (`DdSatisfied`/`is_dd` 等) | wire の `type:"dd"` が第一級 (REFERENCE §356 等) | **残置** — kuu の固有概念名として確立 |
| `op` (`EffectOp`/`Binding.op`) | fixture effects の `"op":"set"` が第一級 | **残置** |
| `eq_split` (matcher 名) | lowering 断面の `matcher:"eq_split"` が第一級 | **残置** (matcher 名)。型 `EqSepMode`/`EqEntry` は `=` 記号の domain 語なので**境界** — 展開なら `EqualsSplitMode` 等、統括推しは wire と揃えて残置 |

### バッチ 3: Node variant — 展開する (統括推し)

`Node::ReqArg`→`RequiredArgument`、`Node::IdxRepeat`→`IndexedRepeat`、`Node::CmdSatisfied` は既に Cmd… — `Cmd`→`Command` 展開 (`CommandSatisfied`)。Node variant は lowering 断面 (fixture) に matcher/構造名として出るものと出ないものがあり、**出ないもの (実装内部の tree 表現) は自由に改名可、出るもの (spec 語彙) は wire と揃える**。実施 worker が fixture grep で判別し、wire に出る variant は改名対象から除外して報告する形。

### バッチ 4: 境界 — 統括推しのみ提示

`RepeatSpec`/`FromEntriesSpec` の `Spec` = 残置 (specification の慣用として普遍側)、`AtomicAST` = 残置 (AST は普遍)。

**規模**: kuu.mbt 30-50 ファイル + kuu-cli 10-20 ファイル追随。conformance green 維持 gate、wire 不変。

**回答形式**: `API-Q3=推し通り` / バッチ別・項目別の個別指定 (例「バッチ1 は Ext 残置、他は推し通り」)。

## 👺 REND-Q1〜Q7: canonical help レンダラ設計 (バッチ裁定)

**正本**: `docs/findings/2026-07-21-help-renderer-design-plan.md` (設計プラン全体 + 各 Q の詳細節)。以下は索引。

- **👺 REND-Q1: レンダラ指示語彙の座席** — (a) wire 3 段 (一括席 `help_render` + entry 個別 + API override) / (b) 同構造で座席名 `help_display` / (c) wire に載せず API のみ。**推し = a** (kawaz 示唆「config 一括 + 個別併用」の直接具体化、定義ファイルで表示意図が完結) — findings §3
- **👺 REND-Q2: セクション骨格の指定形** — (a) セクション識別子の配列 (model トップレベルキー由来、picocli 型の宣言的半分) / (b) プレースホルダ文字列テンプレ (clap 型) / (c) v1 は指定不可。**推し = a** (テンプレ言語の沼を回避しつつ並べ替え実需を満たす、識別子発明ゼロ) — §2
- **👺 REND-Q3: 文言内 binding 補間** — (a) `{name}` 変数参照のみ (エスケープ `{{`、制御構造なし) / (b) 補間なし。**推し = a** (version binding の承認 signal を最小機構で満たし境界を明言) — §5
- **👺 REND-Q4: category_mode default/all の canonical 差分** — (a) v1 は差分なし (vacuous) / (b) グループ宣言 entry へ `hidden` を許可、default = hidden group 省略・all = 表示 (cargo -Z 型受け皿、DR-113 §8.1 小改訂)。**推し = b** (v1 完備主義、help_all_category を意味ある軸に) — §6.4
- **👺 REND-Q5: 部品表記の canonical 既定値** — (a) auto (単純 or は 1 行括弧、ネストは詳細形式。types は参照 ≥2 で集約) / (b) 常に詳細 / (c) 常に 1 行。**推し = a** — §6.1-6.2
- **👺 REND-Q6: origin の canonical 既定表示** — (a) merge (cargo 型) / (b) separate_section (gh INHERITED 型) / (c) omit。**推し = b** (継承の明示と値の表示を両立) — §6.3
- **👺 REND-Q7: completion 表示 policy の扱い** — (a) 本サイクル除外、completion-ordering issue へ統合 / (b) 含める。**推し = a** — §7

**回答形式**: 「REND 全部推し通り」 / 個別 (例「Q1=a, Q4=a, 他推し通り」)。裁定後 DR 化 → canonical レンダラ実装計画へ。
