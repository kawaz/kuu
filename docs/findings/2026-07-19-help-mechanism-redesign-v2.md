# help 機構の再設計プラン (v2) — DR-112 撤回とゼロベース設計

> 由来: kawaz 原発題 (2026-07-17)「実装がない奴として help_installer が無くないですか？必要な機能やそれを実現するための語彙や展開方などの設計プランからまず立てる必要があるのでは」+ 2026-07-19 の HIP-META-Q1〜Q6 全裁定 (mid=14/15/17/18/20/21/23)。
>
> DR-112 (「help installer は存在しない、help は query である」) は kawaz 未承認の worker 解釈拡大が spec に land した状態。**HIP-META-Q1 = a 裁定で DR-112 §1 全体撤回**、原発題「help_installer が必要、設計プランから立て直せ」に沿ってゼロベース設計する。本 finding は新 DR (次番号) の下敷き、統括 (Opus 4.7) が中心で起草 (worker 解釈拡大の再発を防ぐため)。

## 1. 判明した事実 — DR-112 の drift 内訳と kawaz 裁定の確定分

### 1.1 DR-112 の撤回対象 (worker 解釈拡大、kawaz 未承認)

| DR-112 節 | 記述 | drift の性質 | 処理 |
|---|---|---|---|
| §1 | 「help_installer は存在しない、help は query である」 | 原発題「installer が必要」を worker が真逆に読み拡張 | **撤回** (meta-Q1=a) |
| §7 type:"help_all" | 「hidden 込み全表示の意図メタ」 | kawaz 原意「全 category を見せる」と乖離 | **撤回 + 再設計** (meta-Q5) |
| §3 (help model 全体) | help model schema の詳細 | 部分的に kawaz 承認、部分的に worker 起草 | **再設計** (meta-Q4 で value_structure tree + type_ref + types 追加) |

### 1.2 撤回しない (kawaz 承認済み or 齟齬なし)

| DR-112 節 | 記述 | 承認根拠 |
|---|---|---|
| §2 depth | `depth?: "scope" | "all"` の 2 値、数値 depth 不採用 | meta-Q3 承認 |
| §4 | help_long (HELP-Q4=a) | 原裁定 findings 明記 |
| §4 | help_epilog | meta-Q2 承認 (mid=15 の "epilog のことか、理解。ok") |
| §5 | help_group_name / help_group_title / help_group_description | HELP-Q3 原裁定明記 |
| §5-6-6 前半 | 同名グループの別設定重複は definition-error | HELP-Q3 原裁定明記 |
| §5-6-6 後半 | 「同一設定の再宣言は冪等で合法」 | **撤回** (HIP-Q3 drift、原裁定に無い後段追加) |
| §6 | help_order / help_group_order / help_after (order 関連) | meta-Q2 承認 (mid=14 で「明確に話したはず」+ 詳細規定) |
| §7 type:"help_category" | 特定 category に絞る (string 値) | meta-Q5 承認 (help_all_category と併存) |
| §8 | on_failure / help_on_failure | meta-Q2 承認 (HELP-Q1 由来) |
| §9 | help_meta installer (語彙所有座席) | worker 起草だが「基本よさそう」承認 (meta-Q3)。ただし meta-Q1=a 裁定に伴い help_installer との関係を再整理 |
| §10 | hidden: bool 1 本、面別は ref&link で分割 | HELP-Q12=a 原裁定明記 |
| §11 | 5 プロファイル green を v1 発行条件 | HELP-Q7=a 原裁定明記 |

### 1.3 HIP-META-Q 裁定 (meta-Q1〜Q6) — 新設計に組み込む

- **meta-Q1 = a**: help_installer 必要、DR-112 §1 撤回、設計プランから立て直し
- **meta-Q2**: help_epilog + order 関連 + display_name + value_name + help_on_failure = 承認 (§1.2)
- **meta-Q3**: depth = "scope" | "all" 承認、他 worker 起草部分 (help_meta installer など) も「基本よさそう」
- **meta-Q4**: value_structure tree (options entry に or/seq/repeat/single/type_ref の tree ノード) + type_ref ノード + model トップの types セクション。レンダラ側の表現 (pipe 曖昧回避 / 集約 vs inline / 詳細説明) は canonical レンダラ設計 issue に持ち越し + レンダラ policy 指定オプション語彙で選択可能に
- **meta-Q5**: 5 直交 type 構成 — `help` / `help_all_category` (旧 help_all の名前変更 + 意味論訂正、絞りなし) / `help_category` / `help_show_hidden` (独立軸) / `help_tree` (独立軸)。hidden は独立、混合概念回避
- **meta-Q6 = A**: default_fn 汎用機構 (fn registry 引き + DSL `"fn_name[:arg...]"`、filter/variant DSL と対称)。専用属性 (default_from/default_for) 廃案。**DR-088 で kawaz 裁定原文に「default_fn」の語が既出** (「env 指定があるってことは env から遅延解決する default_fn が設定されてるようなもん」) = 概念は既存、mid=19/21 の提案は DSL 実装の汎用化。既存の `env: "VAR"` / `inherit: true` / `default: value` は default_fn の糖衣として整合的に位置づけ可能 (それぞれ `"env:VAR"` / `"inherit"` / `"constant:<value>"`)

## 2. 中心設計 — help_installer の実装

kawaz 原発題「実装がない、必要な機能・語彙・展開方の設計プラン」に応える設計:

### 2.1 help_installer の 3 役 (DR-042 installer 3 役に当てはめる)

| 役 | help_installer の実体 |
|---|---|
| 回収 | 表示メタ語彙 (help / help_long / help_epilog / display_name / value_name / help_group_name / help_group_title / help_group_description / help_group_order / help_order / help_after) を宣言層から取り込む |
| 植え付け | **type:"help"/"help_all_category"/"help_category"/"help_show_hidden"/"help_tree" の 5 型 preset を canonical 展開**。各 preset は long/short/env の入口 + 内部セル link + 固定値供給 + on_failure 展開 + help_on_failure 糖衣 + values 制約 (help_category のみ) |
| 能力提供 | help_query capability (spec 内 helper であって別 query ではない)。宣言層寄与適用後の断面から model を組む純関数、implementation は installer が担う |

**DR-112 §1 との対比**: DR-112 は「help_installer は存在しない、query 分解が正しい」= 3 役のうち「能力提供」だけを取り出して query 化。新設計は 3 役全てを help_installer に統合し、query capability も installer が提供する組み込み関数として扱う。**conformance runner の主体は kuu.mbt が help_installer capability を直接呼ぶ標準経路** (§7 参照、kuu-cli 実装に依存しない、DR-108 の v1 主語は指定参照実装 kuu.mbt)。kuu-cli の `kuu help` サブコマンドは同 capability の consumer で、v1 発行の必須要件ではない (P4 の追随作業)。

### 2.2 5 直交 type の canonical 展開 (help_installer が担う lowering)

**type:"help"** (基本 help、bool):
- 入口: long/short/env が使える (flag preset と同型)
- 内部セル: `#help` (help 機構管理の内部単一セル、bool)
- 発火: 固定 true 供給
- on_failure: help_on_failure=true (糖衣、既定 true) → on_failure=true (汎用属性へ展開)
- lint warn: 露出手段 (name 経由) が無い help 系構成のみ warn

**type:"help_all_category"** (全 category 絞りなし、bool):
- 入口: 同上
- 内部セル: `#help` + `#help_all_category` (共通の help 内部セル + 独立フラグセル)
- 発火: `#help` に true + `#help_all_category` に true
- on_failure: help_on_failure=true (糖衣)
- 意味論: レンダラは `#help_all_category` を見て「category 絞りなし = 全 category を並べる」を選ぶ (DR-058 §1「--help-all で hidden も表示」ではなく、mid=18 で kawaz 修正)

**type:"help_category"** (特定 category、string):
- 入口: 同上、値スロット (string) or or 展開で bool 枝と string 枝の 2 経路
- 内部セル: `#help` + `#help_category` (string 全体単一セル)
- 発火: `#help` に true + `#help_category` に指定 category 文字列 (last-wins for multiple)
- values 制約: descriptor で category 名の enum (spec §5 の help_group_name と同名前空間)
- on_failure: help_on_failure=true

**type:"help_show_hidden"** (hidden 露出、独立軸、bool):
- 入口: 同上
- 内部セル: `#help_show_hidden` (bool、独立)
- 発火: `#help_show_hidden` に true。**`#help` は立てない** (kawaz mid=18 独立軸方針、hidden 露出は help 発火とは別軸)
- ただし単独で意味を持たないため、他 help 系 type と or 合成 or 別 flag の default_fn で連動させる想定 (定義側の設計)
- on_failure: help_on_failure=false (デフォルト、他 help 系 flag に紐付いて発火するのが自然)

**type:"help_tree"** (サブコマンド tree 全展開、独立軸、bool):
- 入口: 同上
- 内部セル: `#help` + `#help_tree` (共通 help + 独立フラグ)
- 発火: `#help` に true + `#help_tree` に true
- 意味論: レンダラは `#help_tree` を見て「depth = all を暗黙採用、サブコマンド tree 全展開」を選ぶ
- on_failure: help_on_failure=true

### 2.3 5 直交 type の合成 (mid=19 発題、meta-Q6=A で default_fn で解決)

**廃案の簡略記法** (worker 起草段階の探索、meta-Q6=A では採用しない): `default_for: [...]` の逆方向宣言は default_from / default_for 両案とも meta-Q6=A で廃案、**default_fn 一本 (target 側に書く形)** に集約。以下は正しい設計。

**default_fn の実際の設計** (mid=21 対案、meta-Q6=A):

**向き規定**: `default_fn: "borrow:X"` を要素 Y に書く = **Y の default が X の値になる** = X 発火時に Y も default 経由で立つ (「Y が X を borrow」の宣言、Y 側に書く)。**source (X) 側でなく target (Y = 立てたい要素) 側に書く**。

正確な JSON (裁定案 A 採用、二段継承 = 「full = all + tree」構成):

```json
{
  "options": [
    {"name": "help-full", "long": true, "type": "flag"},
    {"name": "help-all", "long": true, "type": "flag",
     "default_fn": "borrow:help-full"},
    {"name": "help-tree", "long": true, "type": "help_tree",
     "default_fn": "borrow:help-full"},
    {"name": "help-all-category", "long": true, "type": "help_all_category",
     "default_fn": "borrow:help-all"},
    {"name": "help-show-hidden", "long": true, "type": "help_show_hidden",
     "default_fn": "borrow:help-all"}
  ]
}
```

発火連鎖の帰結:

- `--help-full` → help-full=true → help-all default=true (borrow) → help-all=true + help-tree default=true (borrow) → help-tree=true。help-all=true が波及 → help-all-category / help-show-hidden default=true (borrow:help-all) → 両方立つ。**全ての help 系 type が立つ = fullest**
- `--help-all` → help-all=true → help-all-category / help-show-hidden default=true (borrow) → 両方立つ (help-tree は立たない、= tree 展開なし)
- `--help-tree` → help-tree のみ立つ (単独、他は default 経由で立たない)
- `--help-all-category` / `--help-show-hidden` / `--help-category` / `--help` は個別発火

**「help-tree のみ立てたい (help でない場面)」の懸念**: type:"help_tree" は内部セル `#help` を立てる仕様 (§2.2) なので、`--help-tree` 単独発火でも help 出力が発生する。「tree 展開のフラグだけ立てて help は出さない」のような分離ユースは想定外 (kawaz mid=18 の「独立軸」= help 系内での独立、help 系外への流用は別議論)。

## 3. help model schema (meta-Q4 反映、value_structure tree + type_ref + types + origin)

DR-112 §3 の options entry (spellings / value_name 1 個の限界) を刷新:

```json
{
  "command_path": ["prog", "remote", "add"],
  "usage": {"has_options": true, "positionals": [...], "has_subcommands": true, "has_dd": true},
  "description": "...", "description_long": "...", "epilog": "...",
  "types": [
    {"id": "color_value", "value_structure": {...}, "help": "...", "used_as": ["COLOR", "INFO", "WARN", "DEBUG"]}
  ],
  "commands": [
    {"name": "run", "aliases": ["r"], "help": "...", "help_long": "...",
     "hidden": false, "deprecated": false, "origin": "local"}
  ],
  "options": [
    {"group": {"name": "net", "title": "Network options", "description": "..."}},
    {
      "spellings": ["--port", "-p"],
      "alias_spellings": ["-n"],
      "value_structure": {"single": {"value_name": "PORT", "type": "number"}},
      "display_name": "ポート番号",
      "help": "...", "help_long": "...",
      "help_group_name": "net",
      "default": 8080, "env": "PORT",
      "required": false, "multiple": false,
      "hidden": false, "deprecated": false,
      "origin": "local"
    },
    {
      "spellings": ["--fg"],
      "value_structure": {"type_ref": "color_value"},
      "help": "...",
      "origin": "local"
    }
  ],
  "positionals": [...],
  "help_entry": "--help"
}
```

**変更点** (DR-112 §3 との差分):
- `value_name` (単一 1 個) → `value_structure` (tree: or/seq/repeat/single/type_ref の任意ネスト)
- `types` セクション新設 (definitions で参照される共有型を集約射影、参照回数 ≥ 2 の場合)
- `origin` フィールド新設 (options / commands entry、値: "local" | {"kind": "global", "declared_at": [...]} | {"kind": "inheritable", ...} | {"kind": "alias", "of": "..."})

## 4. default_fn 汎用機構の設計 (meta-Q6=A)

### 4.1 DSL

```
default_fn: "fn_name[:arg[:arg...]]"
```

filter/variant DSL と同じ書式。args は string、fn descriptor 側でキャスト。

**DR-088 との整合**: DR-088 で kawaz 裁定原文に「env 指定があるってことは env から遅延解決する default_fn が設定されてるようなもん」と既出。既存の `env: "VAR"` / `inherit: true` / `default: value` は default_fn の糖衣として整合的に位置づけ可能 (env → `"env:VAR"`、inherit → `"inherit"`、default value → `"constant:<value>"`)。本節の default_fn 汎用機構は DR-088 で示唆された概念を DSL として明示実装したもの。

### 4.2 builtin default_fn (kuu ns、canonical)

| fn | args | 用途 |
|---|---|---|
| `borrow` | `<other_option_name>` | 同 scope 他 option 値借用 |
| `inherit` | `<name>?` (省略時は自 name) | 祖先 scope 継承の明示形 (現 `inherit: true` の対称、汎用化) |
| `env` | `<VAR_NAME>` | 環境変数 |
| `constant` | `<value>` | 定数 (現 `default: value` の 1 対 1 対応、糖衣自動変換候補) |
| `computed` | `<key>` | 動的計算 (registry 拡張、system 提供 = `git_branch` / `hostname` / `date_now` 等) |
| `uuid` | `<v1|v4|v7>` | UUID 生成 (例、拡張候補) |

### 4.3 descriptor 設計 (DR-107 準拠、dr113-review Critical 1 反映)

DR-107 (descriptor 直交軸) の `role` enum に **新値 `"default_fn"` を追加**する (HIP-META-Q7-α 統括推し = a、kawaz 裁定要)。DR-107 の他軸に載せる形は role 軸の対象性 (「独立実装者が host 言語で実装しうる runtime callable ABI を持つ registry 住人」) を満たす。

descriptor の各軸 (HIP-META-Q7-β 統括推し暫定):

| 軸 | 値 | 根拠 |
|---|---|---|
| `role` | `"default_fn"` | 新値追加 (DR-107 §1 の enum 拡張と同型) |
| `construction` | `"static" | "factory"` (自由) | builtin fn 6 種は static、拡張 fn (config を取る computed 系) は factory |
| `io_type` | 必須、`input`/`output` は fn ごと自由 | fn は arbitrary value を返す (target option の型に合わせる用途は "same_as_target" 相当だが、schema 表現は個別 fn descriptor で書く) |
| `output_mode` | **禁止** | default 席は「入力保持」概念が無い、fn は新規値生成 (provider と同型の扱い) |
| `fallibility` | 必須、`"total"` or `"reject"` | `borrow` は absent source で reject、`constant` は total 等 |
| `invocation` | 必須、`encoding: "colon_args"` 固定 | filter/variant DSL と同じ書式 (`"fn:args"`) |
| `owns` / `observes` | **禁止** | installer 軸、default_fn は language capability |
| `config` | `construction:factory` なら必須、`static` なら禁止 | DR-107 §7 の filter と同型 |
| `reasons` | fallibility=reject 時必須、total なら空 | fn の失敗 reason 語彙 (§4.5 参照) |

例 (`role:"default_fn"`, `construction:"static"`):

```json
{
  "name": "borrow", "role": "default_fn", "construction": "static",
  "io_type": {"input": "string", "output": "value"},
  "fallibility": "reject",
  "invocation": {
    "encoding": "colon_args",
    "parameters": [{"name": "source", "type": "string", "required": true,
                    "description": "同 scope 他 option の name"}]
  },
  "reasons": ["absent-source", "cycle-detected"]
}
```

**schema 波及**: `schema/descriptor.schema.json` の `role` enum に `"default_fn"` 追加、`schema/builtin-descriptors.json` に builtin fn 6 種 (borrow / inherit / env / constant / computed / uuid) の descriptor 追加。P2 の波及作業 (§9)。

### 4.4 default_fn 一本化 (kawaz 追補 mid=28) — default 席の unified 意味論

kawaz mid=28 追加提案の裁定: **default 席の値は常に default_fn 経由**、`default: value` / `env: "VAR"` / `inherit: true` は全て default_fn の糖衣として整理:

| 糖衣記法 (wire form 不変) | 展開後 default_fn |
|---|---|
| `default: value` | `default_fn: "constant:<value>"` |
| `env: "VAR"` | `default_fn: "env:VAR"` |
| `inherit: true` | `default_fn: "inherit"` (省略引数 = 自 name) |
| `inherit: {"from": "other"}` (仮) | `default_fn: "inherit:other"` |
| `default_fn: "fn:args"` (明示) | そのまま |

**利点**:
1. 実装機構が 1 個 (default_fn) — シンプル
2. DR-088 kawaz 裁定原文「env 指定があるってことは env から遅延解決する default_fn が設定されてるようなもん」と厳密整合 = default 席は常に fn 経由の思想
3. wire form 記法は不変 (`default: value` / `env: "VAR"` / `inherit: true` はそのまま書ける、既存 fixture / 実装への破壊的変更なし)
4. 「default 席の値は必ず fn 経由」の unified 意味論
5. 値源ラダー §11.4 の default 席が「fn 呼び出し 1 種類」に集約、他値源は全て default_fn の糖衣で表現可能

**fn 命名**: `constant` を採用 (`set` は variant DSL の effect 語彙 `":set"` と衝突するため避ける)。

**相互排他**: 同一要素に糖衣記法と `default_fn:` を併用は definition-error (kind: `invalid-range`)、または `default:` と `env:` の併用等の複数糖衣も併用は definition-error (糖衣層で自然に検出、default 席は 1 個の fn しか持てない)。

**破壊的でない実装移行**: 既存 wire (`{"default": 8080}`) は internal で `{"default_fn": "constant:8080"}` に自動展開、runtime は default_fn 経路 1 本で走る。conformance fixtures の記法も不変。

### 4.5 failure semantics (dr113-review Major 5 反映、HIP-META-Q7-γ)

default_fn の失敗パターンと outcome/error kind (統括推し、HIP-META-Q7-γ で kawaz 裁定要):

| 失敗パターン | outcome/error kind | 根拠 DR |
|---|---|---|
| **unknown fn** (`default_fn: "unknown:args"`、registry に無い) | definition-error kind = `unknown-vocab` | DR-101 と同型 |
| **arity/type 不正** (fn の宣言 arity と args 数の不一致、type mismatch) | definition-error kind = `invalid-argument` | DR-085 と同型 |
| **absent source** (`borrow:X` で X が値未持ち、fn の runtime reject) | fn の reason `absent-source` で reject → DR-088 「遅延評価でデフォルト解決したらやっぱりありませんでした、になったらそのノードは unset のまま = committed=false に戻されて落ちる」 | DR-088 直参照 |
| **依存循環** (`X borrow:Y`, `Y borrow:X`) | definition-error kind = `circular-ref` | DR-082 と同型 (help_after 循環と同型) |
| **unset source** (最終的に何も無い) | absent-source と同じ扱い (unset で落ちる) | DR-088 |
| **依存グラフ解決順** | DR-087 の遅延解決に載せる、位相順で回す。循環は definition-error | DR-087 直参照 |

これで v1 blocker (dr113-review Major 5) を閉じる。P2/P3 前に確定必要。

## 5. help_all_category / help_category の内部セルモデル

DR-112 §7 の内部セルモデル (「help の値セル実体は help 系要素のどれでもなく、help 機構が管理する内部セル」) は骨格として維持。ただし kawaz mid=18 の「hidden 独立軸」を反映して、複数の内部セルを持つ:

- `#help` (bool、共通、type:"help" / help_all_category / help_category / help_tree の発火で立つ)
- `#help_all_category` (bool、独立、type:"help_all_category" の発火で立つ)
- `#help_category` (string、独立、type:"help_category" の発火値)
- `#help_show_hidden` (bool、独立、type:"help_show_hidden" の発火で立つ、#help は立てない)
- `#help_tree` (bool、独立、type:"help_tree" の発火で立つ)

**result への露出**: 各 type の name (export_key) 経由。内部セルは `#` 予約 namespace の実装細部、wire にも result にも直接現れない。

## 6. lint warn の観測手段判定 (DR-112 §7 の kawaz 追補を維持)

「help 系要素はあるが、どれも結果面に露出していない = 発火をアプリが観測する手段が無い」構成のみ warn。help 不在でも name 露出があれば warn 不要。

## 7. conformance — fixture format と v1 発行条件 (dr113-review Major 2 反映)

DR-112 §11 の骨格 (query:"help" fixture format + 順序込み比較 + 5 プロファイル green) は骨格として維持。**query:"help" は fixture の discriminator + assembly/help_installer capability 呼び出しの経路**として位置づけ:

- **spec 上の位置**: `query:"help"` は fixture の discriminator (parse/complete/definition-error と並列)。model 生成は spec 内の help_installer capability 呼び出しで得る (kuu.mbt が直接呼ぶ標準経路)
- **kuu.mbt runner** (P3 の完了主体): definition + query:"help" input から help_installer capability を呼んで help model を組む。**kuu-cli 実装に依存しない** (v1 発行条件 5 プロファイル green の主語は指定参照実装 kuu.mbt、DR-108)
- **kuu-cli** (P4): `kuu help` サブコマンドは同 capability の consumer。CLI 実装は v1 発行に必須でない (kuu.mbt runner の green で発行判定)

**v1 発行条件**: 5 プロファイル green (parse-core / lowering / definition-error / completion / help)、kuu.mbt を指定参照実装として。DR-108 §3 の 4→5 プロファイル改訂は維持。

## 8. help_epilog / order 関連 / hidden / group の維持

meta-Q2/Q3 承認済みの語彙は現行 DR-112 の記述をほぼそのまま維持:

- `help_long` / `help_epilog` (§4)
- `help_group_name` / `help_group_title` / `help_group_description` / グループ宣言エントリ (§5)
- `help_order` / `help_group_order` / `help_after` (§6、mid=14 で kawaz 詳細規定確認)
- `hidden: bool` 1 本、面別は ref&link (§10)
- `on_failure` / `help_on_failure` (§8)

**変更**:
- §5-6-6 後半「同一設定の再宣言は冪等で合法」を削除 (HIP-Q3 drift)、同名グループの重複宣言は無条件 definition-error

## 9. 段階的実現パス

| 段階 | 内容 |
|---|---|
| **P0** | 本 finding を kawaz レビュー、微修正 |
| **P1** | 新 DR (DR-113 「help 機構の再設計 (v2) — help_installer + 5 直交 type + value_structure tree + default_fn」) を起草。DR-112 を "Superseded by DR-113" 状態に。**schema 3 種の更新**: `schema/wire.schema.json` (入力語彙: 5 type / 表示メタ / default_fn 属性)、`schema/fixture.schema.json` (出力語彙: helpModelExpect に value_structure/type_ref/types/origin 追加、query:"help" 分岐)、`schema/descriptor.schema.json` + `schema/builtin-descriptors.json` (default_fn role 追加 + builtin fn 6 種の descriptor、HIP-META-Q7 裁定確定後) |
| **P2** | fixtures/help/ の書き直し (5 直交 type の合成例 + value_structure tree + type_ref 例 + default_fn 例)。既存 13 fixture の drift 分 (help_all の意味論、同一設定冪等の記述) を訂正 |
| **P3** | kuu.mbt 実装のロールバック + 再実装。既存 help query 実装 3 コミット (7576ae0b M1 / 5547f383 M2 / cd37433d M3) は撤回、help_installer + 5 直交 type + value_structure tree + default_fn を新規実装。**kuu.mbt runner が help_installer capability を直接呼ぶ標準経路** (kuu-cli 実装に依存しない、DR-108 の v1 主語は指定参照実装 kuu.mbt) |
| **P4** | **kuu-cli の追随のみ**: `kuu help` サブコマンドを P3 の help_installer capability の consumer として接続。**canonical レンダラの実装・policy 確定は別 issue** (P4 の対象外、下記 §10 射程外に完全に切り離し) |
| **P5** | v1 発行条件 (5 プロファイル green、指定参照実装 kuu.mbt) 達成 |

## 10. スコープ外 (別 issue / 別 DR)

- **canonical レンダラ設計 issue** (別立て): pipe 曖昧回避 / 集約 vs inline / 詳細説明形式 / レンダラ policy 指定オプション語彙 / version binding 等
- v1.0.0 発行そのもの (DR-108 §6 のまま)
- default_fn の 3rd party registry (拡張 ns 経由、DR-094)
- help_category の multiple 合成 (last-wins のみ v1)

## 11. リスク・悪い面

- **DR-112 land 済みの spec 波及** (DESIGN.md §14.1 / §14.6 / §15.15 / CONFORMANCE §5 / schema/wire.schema.json 等) を巻き戻す必要
- **kuu.mbt 実装コミット群 (5 コミット) のロールバック**: TRI-Q4 (4 コミット) は独立で維持、help query 実装 (3 コミット) は撤回。ロールバックは jj で新 commit として書き戻す (履歴 rewrite でなく forward rewrite)
- **fixtures/help/ 13 本の書き直し**: 既存 fixture の意味論が worker 起草仕様に依存している箇所を訂正、5 直交 type + value_structure tree + type_ref + default_fn の例を追加
- **conformance が一時的に red になる**: P3 実装ロールバック中は pin bump が同期する必要 (spec と kuu.mbt の lockstep 窓を厳密に管理)

## 12. 関連

- DR-112 (撤回対象、"Superseded by DR-113" にする)
- DR-042 (installer 3 役)、DR-057 (alias)、DR-058 (hidden / deprecated)、DR-059 (inheritable)、DR-063 (wire form)、DR-076 (プリセット属性展開)、**DR-087 (default 遅延解決)**、**DR-088 (宣言された値源はデフォルトの存在、default_fn の概念既出)**、DR-094 (namespace)、DR-098 (tty 値源化)、DR-099 (tty preset)、DR-109 (semantic sections)、DR-111 (accumulator/completer descriptor)
- docs/findings/2026-07-17-help-mechanism-design-plan.md (原設計プラン、drift 検出の物証)
- docs/findings/2026-07-17-cli-help-vocab-survey.md (12 系統ライブラリ調査)
- docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md (実 CLI 20+ 調査、4 方式 + 2 メタ軸)
- docs/findings/2026-07-19-kuu-help-display-expressibility-check.md (12 系統ライブラリ + 現 kuu 表現力チェック + origin 提案)
- docs/QUESTIONS.md の HIP-META-Q1〜Q6 (裁定履歴)
