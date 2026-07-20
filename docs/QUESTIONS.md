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

## 👺 REND-Q6: origin (継承由来 entry) の canonical 既定表示 (説明付き再提示)

**裁定済み**: REND-Q1=a / Q2=b (テンプレ型、移行需要でバイトレベル制御) / Q3=a / Q4=b / Q5=a / Q7=a。残 = Q6 のみ。

### 背景説明 (何の話か)

help model の各 option/command entry には `origin` (どこで定義されたか) が載っている: `local` (その scope 自身) / `global` (祖先の global 宣言のコピー) / `inheritable` (子の inheritable 宣言が祖先へコピー) / alias 併記。

サブコマンドの help を表示するとき、**親から降ってきた option (global 由来) をどう見せるか**が CLI ごとに流儀が分かれる。実 CLI 実測 (findings 2026-07-19-help-display-order-and-visibility-patterns.md) で 4 方式:

| 方式 | 実例 | 見え方 |
|---|---|---|
| **(a) merge** | cargo | 継承 option も通常の Options: に混ぜて表示。由来は出さない |
| **(b) separate_section** | gh | `INHERITED FLAGS` のような独立見出しで継承分だけ分けて表示 |
| **(c) reference** | kubectl | 値は出さず「グローバルオプションは --help を見よ」の案内文 1 行のみ |
| **(d) omit** | rustup / docker | 継承分は一切出さない |

canonical レンダラ (kuu 標準のテキストレンダラ) の**既定値**をどれにするかの裁定。定義側は `origin_style` 語彙 (REND-Q1=a で確定した help_render 席) で明示上書き可能なので、ここで決めるのは「無指定時のデフォルト」だけ。

- **候補 a = merge (cargo 型)**: 驚き最小・出力が一番シンプル。ただし model に origin を載せた設計判断の価値が既定では見えない
- **候補 b = separate_section (gh 型、統括推し)**: 「継承であることの明示」と「値の表示」を両立する唯一の方式。origin 素材が既定で活きる
- **候補 c/d**: 情報が欠落するので既定には不向き (明示指定用)

**回答形式**: `REND-Q6=b` 等。
