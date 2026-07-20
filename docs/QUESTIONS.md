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

