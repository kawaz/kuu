# DR-113: help 機構の再設計 — help_installer・5 直交 type・構造化 model

> 由来: kawaz 発題「実装がない奴として help_installer が無くないですか？必要な機能やそれを実現するための語彙や展開方などの設計プランからまず立てる必要があるのでは」(2026-07-17) と、`docs/QUESTIONS.md` の HIP-META-Q1〜Q8 裁定 (2026-07-19)。HIP-META-Q1=a により help_installer を中心に設計し直し、Q4 により `value_structure` tree + `type_ref` + `types`、Q5 により 5 直交 type、Q6〜Q8 により DR-114 の universal fn / `cell_fns` / default_fn 一本化を採用した。下敷きは `docs/findings/2026-07-19-help-mechanism-redesign-v2.md`。本 DR は DR-114 を前提とし、DR-112 を Supersede する。

## 決定

### 1. help_installer は回収・植え付け・能力提供の 3 役を担う

DR-042 の installer 3 役を help 機構へそのまま当てはめる。

| 役 | help_installer の実体 |
|---|---|
| 回収 | 表示メタ語彙 `help` / `help_long` / `help_epilog` / `display_name` / `value_name` / `help_group_name` / `help_group_title` / `help_group_description` / `help_group_order` / `help_order` / `help_after` / `help_render` / `help_value_structure_style` (DR-115) を宣言層から取り込む |
| 植え付け | `type: "help"` / `"help_all_category"` / `"help_category"` / `"help_show_hidden"` / `"help_tree"` の 5 preset を canonical 展開する。各 preset は入口、内部セル link、`cell_fns` による固定値供給、`on_failure` 展開、`help_on_failure` 糖衣、必要な values 制約を持つ |
| 能力提供 | 宣言層寄与適用後の断面から help model を組む **help_query capability** を提供する |

help_installer は表示メタ語彙、5 個の type 値、`help_on_failure` を所有する。canonical レンダラ指示語彙 `help_render` (一括席) と `help_value_structure_style` (entry 個別席) も help_installer が所有する (DR-115 §1)。`on_failure` 自体は専用 on_failure installer が所有し、help_installer は糖衣から展開する。

canonical expansion は観測等価な実装位相を許す。5 preset の lowered 産物 (入口 → 内部セル link → `cell_fns` 固定値供給 → `on_failure` 展開) は宣言時に構造として確定するが、内部セルの実効化は consumer (help_query capability 呼び出し) 出現時に遅延してもよい。位相を早めても後ろへずらしても、観測される help model と result envelope が等価であれば実装位相は自由である。

表示メタ語彙の unknown-vocab 正当化、グループ・順序語彙の definition-time 検査、5 preset の lowering、help model への射影を一つの装置が担う。表示メタは宣言層に inert 属性として残り、lowered 産物や評価器へ運ばない。

help_query capability の概念シグネチャ:

```
help_query(definition, {
  path?: ["<サブコマンド名>", ...],
  depth?: "scope" | "all",
  category_mode?: "default" | "all" | {"named": "<グループ名>"}
}) → help model | query-error
```

- `definition` は wire form。args のパース実行は行わない
- `path` は選択スコープ。省略時はルート
- `depth` は既定 `"scope"`、全層再帰は `"all"`。数値 depth は持たない
- `category_mode` の既定は `"default"`
  - `"default"` / `"all"`: model の entry 集合は同一 (全 entry + 全グループ宣言 entry)。値は renderer への表示 policy 指示であり、model 素材を変えない (hidden が meta として model に載り renderer が表示選択するのと同じ構図。HIP-META-Q13=a 2026-07-20)
  - `{"named": name}`: `help_group_name` が name の entry と当該グループ宣言 entry に絞る (これだけが model 素材を絞る)
- 読む層は全 installer の宣言層寄与を適用し終えた宣言層。global / alias / inheritable の宣言的コピーを含み、lowered 産物は読まない

不在 path / named category は help query 固有の failure envelope で返す。

- 不在 path: query-error `absent-path`
- 不在 named category: query-error `absent-category`
- failure envelope は `{"outcome":"query-error","errors":[{"kind":"absent-path"}]}` または `{"outcome":"query-error","errors":[{"kind":"absent-category"}]}` の構造を持つ
- definition の合法性検査は definition_error profile の責務、query-error は合法な definition に対する呼び出し側入力の失敗であり、位相を混ぜない

help_query は help_installer が提供する capability であり、complete と同格の独立 spec query を新設するものではない。fixture の `query: "help"` は conformance runner がこの capability を選ぶ discriminator である。

### 2. help 系 type は 5 個の直交軸に分ける

> **配置 note (DR-117 §2.3):** 以下の long / short / env は代表的入口の例示であり、preset の配置面を閉じない。positional を含む各配置で canonical 展開に必要な値構造が成立すれば合法である。

#### 2.1 `type: "help"`

基本 help を発火する bool preset。

- long / short / env の入口を持てる。flag preset と同型
- 内部セルは `#help` (bool)
- 発火時に `cell_fns` の `set:true` で `#help = true`
- `help_on_failure` の既定は true。`on_failure: true` へ展開する
- help 系要素が存在しても name / export_key 経由の結果露出が一つも無い構成だけを lint warn にする

#### 2.2 `type: "help_all_category"`

category の絞りを外し、全 category を並べる bool preset。

- long / short / env の入口を持てる
- 内部セルは `#help` と `#help_all_category`
- 発火時に両セルへ true を供給する
- `help_on_failure` の既定は true
- 意味論は「category 絞りなし」であり、hidden 表示を含意しない

#### 2.3 `type: "help_category"`

特定 category を選ぶ string preset。

- long / short / env の入口と値スロットを持てる
- `or` により bool 枝と string 枝を組み、`--help` と `--help <category>` を表現できる
- 内部セルは `#help` と string の `#help_category`
- 発火時に `#help = true` と指定 category 文字列を供給する
- 複数指定は string 全体セルの last-wins
- `values` で category 名を enum 制約できる。名前空間は `help_group_name` と同じ
- `help_on_failure` の既定は true
- 入口の値スロットは §4 の help model 射影 (`value_structure`) では `or[single{bool}, single{value_name:"CATEGORY", string}]` の 2 枝で表現する。string 枝の `value_name` 既定は `"CATEGORY"` (preset canonical、entry 側で `value_name` 明示指定時はそれで上書き)。`values` に指定した enum 値制約は string 枝の `single.values_enum` (§4.1) に写る

positional 配置では string 枝が通常の位置値消費として成立する。例: `{"commands":[{"name":"help","positionals":[{"name":"category","type":"help_category"}]}]}`。

#### 2.4 `type: "help_show_hidden"`

hidden 露出だけを表す独立 bool 軸。

- long / short / env の入口を持てる
- 内部セルは `#help_show_hidden`
- 発火時に `#help_show_hidden = true`
- `#help` は立てない。hidden 露出と help 発火を混ぜない
- 単独では表示要求にならない。他の help type との `or` 合成または default_fn 連動を定義側で行う
- `help_on_failure` の既定は false

#### 2.5 `type: "help_tree"`

サブコマンド tree の全展開を表す独立 bool 軸。

- long / short / env の入口を持てる
- 内部セルは `#help` と `#help_tree`
- 発火時に両セルへ true を供給する
- `#help_tree` が立った help 表示では `depth: "all"` を採用する
- `help_on_failure` の既定は true

5 type は `or` で入口形を合成し、DR-114 の default_fn で複数軸を連動させる。`help_all_category` と `help_show_hidden` を分けることで、「全 category」と「hidden を見せる」を一つの概念にしない。

help 出力の orchestration は内部セルを capability 入力へ次のように写す。

- `#help` が立っていれば help_query capability を呼ぶ
- `#help_category` が値を持てば `category_mode: {"named": value}`
- `#help_all_category` が true なら `category_mode: "all"`
- どちらも立っていなければ `category_mode: "default"`
- `#help_tree` が true なら `depth: "all"`、それ以外は `"scope"`
- `#help_show_hidden` は model 取得条件を変えず、hidden entry を表示する renderer policy 入力になる

内部セル値そのものを help model に載せるのではない。アプリが内部セルを上記 capability 入力へ変換して help_query を呼ぶ。renderer は同じ `category_mode` に従い、`"default"` は通常表示、`"all"` は絞りなし全表示、`{"named": name}` は特定 category 表示の policy を選ぶ。

### 3. help type の合成は default_fn で表現する

help 専用の `default_from` / `default_for` は作らない。target 側が `default_fn: "borrow:<source>"` を宣言する。

```json
{
  "options": [
    {"name": "help-full", "long": true, "type": "flag"},
    {
      "name": "help-all",
      "long": true,
      "type": "flag",
      "default_fn": "borrow:help-full"
    },
    {
      "name": "help-tree",
      "long": true,
      "type": "help_tree",
      "default_fn": "borrow:help-full"
    },
    {
      "name": "help-all-category",
      "long": true,
      "type": "help_all_category",
      "default_fn": "borrow:help-all"
    },
    {
      "name": "help-show-hidden",
      "long": true,
      "type": "help_show_hidden",
      "default_fn": "borrow:help-all"
    }
  ]
}
```

値伝播の帰結:

- `--help-full`: help-full → help-all + help-tree → help-all-category + help-show-hidden
- `--help-all`: help-all → help-all-category + help-show-hidden。help-tree は立たない
- `--help-tree`: help-tree の preset が管理する `#help` と `#help_tree` が立つ
- `--help-all-category` / `--help-show-hidden` / `--help-category` / `--help`: 各 preset の内部セルを個別に立てる

`default_fn` は DR-114 の `cell_fns` registry を使う。`borrow` は統一 `FnCtx` の default mode から参照先 option を読み、descriptor の `observes` が依存 edge を宣言する。

help preset の `default_fn` は入口 effect の再発火を意味しない。help_installer は preset が管理する各内部セルへ同じ default placeholder を植え付ける。`help_all_category` なら `#help` と `#help_all_category`、`help_tree` なら `#help` と `#help_tree` が同じ `borrow` 依存から解決される。入口発火と default 解決のどちらでも同じ内部セル集合が充足されるため、DR-087 の一回限りの遅延解決を破らない。

### 4. help model は構造素材を完全に保持する

help model は表示文言でなく、レンダラが policy を選ぶための構造素材を返す。`value_structure` は `or` / `seq` / `repeat` / `single` / `type_ref` の tree、共有型は model トップの `types` に射影し、options / commands は `origin` を持つ。

完全形の例:

```json
{
  "command_path": ["prog", "paint"],
  "usage": {
    "has_options": true,
    "positionals": [
      {
        "value_structure": {
          "repeat": {
            "min": 1,
            "node": {"single": {"value_name": "FILE", "type": "string"}}
          }
        }
      }
    ],
    "has_subcommands": true,
    "has_dd": true
  },
  "description": "画像を処理する",
  "description_long": "入力画像へ指定した変換を適用する",
  "epilog": "詳細はマニュアルを参照",
  "types": [
    {
      "id": "color_value",
      "value_structure": {
        "or": [
          {
            "single": {
              "value_name": "COLOR_NAME",
              "type": "string",
              "values_enum": ["red", "green", "blue"]
            }
          },
          {
            "seq": [
              {"single": {"value_name": "R", "type": "number"}},
              {"single": {"value_name": "G", "type": "number"}},
              {"single": {"value_name": "B", "type": "number"}}
            ]
          }
        ]
      },
      "help": "色名または RGB 3 値",
      "used_as": ["COLOR", "INFO", "WARN", "DEBUG"]
    }
  ],
  "commands": [
    {
      "name": "show",
      "aliases": ["s"],
      "help": "結果を表示する",
      "help_long": "処理後の画像を表示する",
      "hidden": false,
      "deprecated": false,
      "origin": "local"
    }
  ],
  "options": [
    {
      "group": {
        "name": "appearance",
        "title": "Appearance options",
        "description": "表示色の設定"
      }
    },
    {
      "spellings": ["--fg"],
      "alias_spellings": ["-f"],
      "value_structure": {"type_ref": "color_value", "value_name": "COLOR"},
      "display_name": "前景色",
      "help": "前景色を指定する",
      "help_long": "色名または RGB 3 値で前景色を指定する",
      "help_group_name": "appearance",
      "default": "green",
      "env": "FG_COLOR",
      "required": false,
      "multiple": false,
      "hidden": false,
      "deprecated": false,
      "origin": "local"
    },
    {
      "spellings": ["--level-colors"],
      "value_structure": {
        "seq": [
          {"type_ref": "color_value", "value_name": "INFO"},
          {"type_ref": "color_value", "value_name": "WARN"},
          {"type_ref": "color_value", "value_name": "DEBUG"}
        ]
      },
      "help": "ログレベル別の色を指定する",
      "required": false,
      "multiple": false,
      "hidden": false,
      "deprecated": false,
      "origin": {
        "kind": "inheritable",
        "declared_at": ["prog"]
      }
    }
  ],
  "positionals": [
    {
      "value_structure": {
        "repeat": {
          "min": 1,
          "node": {"single": {"value_name": "FILE", "type": "string"}}
        }
      },
      "help": "入力ファイル",
      "hidden": false,
      "deprecated": false
    }
  ],
  "help_entry": "--help"
}
```

#### 4.1 `value_structure`

- `single`: 1 値の `value_name` / `type` / `values_enum` を持つ。`values_enum` は enum 値制約を保持する配列で、宣言側の `values` から model へ射影される (順序は宣言出現順)
- `seq`: 子 node の順序付き連接
- `or`: 代替枝
- `repeat`: 子 node と min / max
- `type_ref`: definitions の共有値構造への参照
- node は任意にネストでき、kuu の or / seq / repeat 表現力を model でも失わない

#### 4.2 `type_ref` と `types`

- `type_ref` は definitions の共有型を指す
- 参照箇所の `value_name` は型定義側の名前を上書きできる
- 共有型は model トップの `types` に集約射影する
- `used_as` は参照箇所の value_name 一覧を保持する
- inline 表示か `Types:` 集約表示かはレンダラ policy が決める。model は両方に必要な素材を保持する

#### 4.3 `origin`

options / commands entry の由来は次の形で載せる。

- `"local"`
- `{"kind": "global", "declared_at": [...]}`
- `{"kind": "inheritable", "declared_at": [...]}`

alias は canonical entry の `alias_spellings` / `aliases` に併記して独立一覧しない (§4.4) ため、`origin` の alias 形は持たない。global 由来 entry の混在、完全省略、参照文への集約、専用セクション、depth 依存表示は上記 3 形と `alias_spellings` / `aliases` の組合せでレンダラが選べる。

#### 4.4 model の共通規約

- `command_path` はルート定義要素の name があれば先頭に置き、選択 path を続ける。定義に無いプログラム名は呼び出し側が供給する
- `hidden` は model に残す。除外はレンダラ policy
- alias は canonical entry の `alias_spellings` / `aliases` に併記し、独立一覧しない
- `default` / `env` / `required` / `multiple` / `deprecated` は注記素材
- usage は構造素材のみで、一行文字列を持たない
- `depth: "all"` は各 command entry の `scope` に子 help model を再帰埋め込みする
- options / commands は §8 の並べ替え後の順序を保存し、positionals は定義順を保存する
- `help` / `help_long` の未設定側は省略する。相互フォールバックはレンダラ policy
- version 文字列は載せない

per-field 配列 (`spellings` / `alias_spellings` / `types` の `used_as` / `values_enum`) の要素順は、いずれも宣言出現順を保存する。model は宣言側の記述順を素材として維持し、並べ替えはレンダラ policy に委ねる。

### 5. default_fn は DR-114 の `cell_fns` を使う

#### 5.1 DSL と array 記法

```
default_fn: "fn_name[:arg[:arg...]]"
default_fn: ["fn_name", "arg", "arg:with:colon"]
```

colon-string と array of string は意味論的に等価で、array は 1 段限定とする。bare fn 名は DR-094 により builtin namespace の糖衣である。

#### 5.2 default 席の一本化

| wire 糖衣 | canonical default_fn |
|---|---|
| `default: value` | typed internal call `set(value)`。native JSON value を保持し、string DSL へ serialize しない |
| 明示 `default_fn` | そのまま |
| `env: "VAR"` | env ラダー席を維持。default_fn 糖衣ではない |
| `inherit: true` / `inherit: {"from": "other"}` | inherit ラダー席を維持。default_fn 糖衣ではない |

DR-114 §4.1 に従い、env / config / inherit / default の異なる値源席は共存できる。同じ default 席へ `default` と明示 `default_fn` を併用する等、同一席の複数宣言だけを definition-error `invalid-range` とする。type preset の暗黙 default は同じ席のユーザ明示 default / default_fn に置換される。

#### 5.3 descriptor と ABI

DR-107 の `role` enum へ DR-114 が `"fn"` を追加し、default_fn と variant effect は `cell_fns` registry の同じ住人を使う。`role: "default_fn"` や default 専用 registry は設けない。

`cell_fns` descriptor は `construction` / `io_type` / `fallibility` / `invocation` / `observes` / `reasons` の直交軸に載る。`io_type` は output-only で、args の型と個数は `invocation.parameters` が担う。`output_mode` は filter の入力保持 / 変換軸なので `fn` role では禁止し、`io_type.output` の `Value` / tagged `Sentinel` で結果種別を表す。fn ABI は次の 1 種類である。

```
(args: string[], ctx: FnCtx) → Result<Value | Sentinel, Reason>
```

help type 合成の `borrow` は `ctx.mode() == "default"` で `ctx.as_default()` を取得し、descriptor の `observes: ["option:<source>"]` から依存 edge を構築する。default 席は `Value` を返す fn だけを受ける。

#### 5.4 failure semantics

| 失敗パターン | outcome / error kind |
|---|---|
| unknown fn | definition-error `unknown-vocab` (DR-101) |
| arity / type 不正 | definition-error `invalid-argument` (DR-085) |
| default 席で Sentinel fn を指定 | definition-error `invalid-range` |
| `observes` の依存循環 | definition-error `circular-ref` (DR-082) |
| `borrow:X` の source が最終的に不在 / unset | fn reason `absent-source`。呼び出し元も unset のまま落ちる |

default_fn は DR-087 の placeholder と依存グラフへ載せ、位相順で解決する。DR-088 に従い、宣言は探索中の「default あり」判定へ参加するが、遅延解決後に値が無ければ unset のまま落ち、探索へ戻らない。

### 6. 内部セルは help の直交軸をそのまま表す

help 機構が管理する内部セルは定義全体で各 1 実体であり、どの command scope の入口から発火しても同じセルへ link して合流する。

- `#help`: bool。help / help_all_category / help_category / help_tree で立つ
- `#help_all_category`: bool。help_all_category で立つ
- `#help_category`: string。help_category の発火値を保持する
- `#help_show_hidden`: bool。help_show_hidden で立つ。`#help` は立てない
- `#help_tree`: bool。help_tree で立つ

内部セルは `#` 予約 namespace の実装細部で、wire と result に直接現れない。result への露出は各 type の name / export_key を経由し、link の既存意味論を使う。

help 系要素が存在しても、name / export_key 経由で発火を観測できる要素が一つも無い構成だけを lint warn にする。`type: "help"` が無くても、他 help type 自身に露出があれば warn しない。

### 7. 説明文・失敗時発火・hidden の語彙を確定する

#### 7.1 help / help_long / help_epilog

- `help`: 短い説明
- `help_long`: 長い説明
- `help_epilog`: 選択スコープの一覧後に置く自由テキスト素材

3 語彙は inert な表示メタであり、出し分けとフォールバックはレンダラの関心とする。

#### 7.2 on_failure / help_on_failure

- `on_failure` は任意要素に付く汎用 bool 属性、既定 false
- 完全経路 0 本の failure 時、dead end 込み候補経路で selected なら発火する。意味論は DR-048
- `on_failure` は専用 installer が所有する
- `help_on_failure` は help preset の糖衣で、help_installer が `on_failure` へ展開する
- help / help_all_category / help_category / help_tree の既定は true、help_show_hidden は false
- help type 以外への `help_on_failure` は definition-error `invalid-range`

#### 7.3 hidden / deprecated

- `hidden: bool` 1 本を維持する
- help / completion からの既定除外は表示 policy であり、受理は変えない
- 面別の非対称は ref & link による分割定義で表現する
- deprecated は canonical entry の構造化メタとして model に残す

### 8. グループと順序を宣言層の構造として保持する

#### 8.1 グループ宣言

- 通常 entry の `help_group_name` は所属グループ名参照
- `name` / `id` / `type` / 入口属性を持たず、グループ属性と `hidden` だけを持つ options entry はグループ宣言 entry (DR-115 §4 が `hidden` 許可を追加)
- `help_group_title` / `help_group_description` は同じ entry の `help_group_name` に属する
- model では group 属性を `group: {name, title, description}` sibling として、`hidden: bool` は entry 直下 sibling として `{"group": {"name", "title", "description"}, "hidden": true}` の形でフラット列に残す (DR-115 §4)
- 同じグループ名の重複宣言は、設定が同一か否かを問わず definition-error `invalid-range`
- commands のグループ宣言席は追加しない
- グループ宣言 entry の `hidden` の canonical 表示意味論 (default = 入口注記のみ / all = 所属 entry 込みで表示 / named = 表示、show_hidden との相互作用) は DR-115 §4 が正本

#### 8.2 順序

- `help_order`: 通常 entry の表示順
- `help_group_order`: グループ宣言 entry の表示順
- `help_after`: 同一 scope・同一 entries 列の name を参照し、その直後へ配置
- 座席違いの order 指定、および同一要素への order と help_after の併用は definition-error `invalid-range`

options / commands の各フラット列へ独立に 2 段適用する。

1. 明示 order、無ければ宣言 index を実効 order として安定ソートする。同値なら宣言順を保つ
2. help_after entry を段 1 の列から取り出し、target の直後へ配置する

help_after の規則:

- 同一 target への複数 after は定義順
- 連鎖は解決して許容
- 循環は definition-error `circular-ref`
- 不在 target は lint warn とし、段 1 の位置へ fallback
- positionals は並べ替えず、順序語彙は lint warn + 無視

### 9. conformance は kuu.mbt runner が capability を直接呼ぶ

`fixtures/help/` の `query: "help"` は fixture discriminator であり、独立 spec query の宣言ではない。標準検証経路は次のとおり。

1. kuu.mbt runner が definition と case の path / depth / category_mode を読む
2. assembly の help_installer を適用する
3. help_installer の help_query capability を直接呼ぶ
4. 成功時は help model、失敗時は query-error envelope を fixture expect と比較する

この経路は kuu-cli に依存しない。DR-108 が定める v1 発行条件の主語は指定参照実装 kuu.mbt であり、kuu-cli は capability の consumer である。

検証対象:

- 5 直交 type の canonical 展開と default_fn 合成
- value_structure の or / seq / repeat / single / type_ref
- types / used_as と origin
- help_long / help_epilog
- グループ宣言と order / after
- hidden / deprecated
- path / depth / category_mode (`default` / `all` / `named`)
- definition-error の invalid-range / circular-ref
- query-error `absent-path` / `absent-category`。definition_error outcome と別 outcome で pin する
- cell_fns の unknown-vocab / invalid-argument / absent-source と依存解決

conformance runner は definition の合法性検査と help query 実行を別位相として扱い、definition-error と query-error を混同しない。options / commands / positionals は順序込みで比較する。v1 発行条件は parse-core / lowering / definition-error / completion / help の 5 プロファイルすべてが指定参照実装 kuu.mbt で green であることとする。

## 採用しなかった案

### help_installer を置かず、help を独立 query とする

installer 3 役のうち model 構築だけを切り出すと、5 type の preset 展開、表示メタ語彙の所有と検査、内部セルへの canonical lowering が別責務へ分散する。help_query は help_installer の能力提供として置く。

### `type: "help_all"` に全 category と hidden 表示を混在させる

「category 絞りなし」と「hidden を見せる」は独立軸である。`help_all_category` と `help_show_hidden` に分ける。

### help type 合成専用の `default_from` / `default_for`

help 以外の値連動でも同じ語彙が必要になる。DR-114 の `default_fn: "borrow:<source>"` を使う。

### default_fn 専用の role / registry / context

variant effect と同じ値供給 fn を重複実装し、universal fn の対称性を失う。DR-114 の `cell_fns`、`role: "fn"`、統一 `FnCtx` を使う。

### default の固定値 fn を `constant` と呼ぶ

variant DSL の `set` と同じ意味なので `set` に統一する。

### `value_name` 1 個または `value_names` 平坦列

or / seq / repeat の任意ネストと共有型参照を表せず、kuu の定義表現力を model が縮小する。`value_structure` tree を採る。

### usage の一行文字列を model に含める

任意ネスト構造の一行化はレンダラ policy である。model は構造素材を保持する。

### origin を持たず global 表示方式を固定する

混在、省略、参照、専用セクション、depth 依存表示の選択肢を失う。素材として origin を保持する。

### hidden の面別属性

`hidden: bool` と ref & link の分割定義で表現できる。

### 同じグループ設定の再宣言を冪等として許す

グループ宣言箇所を一意にする先頭宣言スタイルを崩す。同名グループの重複は無条件に definition-error とする。

### help_category を optional 値スロットで表す

次トークンが category か positional かを特殊規則で解くことになる。bool 枝と string 枝の `or` なら経路成立の既存意味論へ載る。

### depth に数値を持たせる

必要な軸は選択 scope だけか全 tree かの 2 値である。`"scope" | "all"` とする。

## 波及

本 DR と DR-114 の実現は同じ Phase U-1〜U-6 で進める。本 change は DR だけを確定し、以下は別 task で更新する。

### Phase U-1: schema 3 層と builtin descriptor

- **`schema/wire.schema.json` (入力)**: 5 type、表示メタ、group / order、on_failure / help_on_failure、default_fn の string / 1 段 array 記法を受理
- **`schema/fixture.schema.json` (model 出力 + discriminator)**: `query: "help"` 分岐、入力の `category_mode`、help model の value_structure / type_ref / types / origin、query-error (`absent-path` / `absent-category`)、順序込み expect を定義
- **`schema/descriptor.schema.json` (registry 宣言)**: DR-114 の `role: "fn"`、`cell_fns`、`observes`、FnCtx に必要な出力型制約を追加
- **`schema/builtin-descriptors.json` (住人データ)**: variant 4 fn (`set` / `default` / `unset` / `empty`) と `ctx.old` 参照 fn (`incr` 等)、`borrow` / `env` / `inherit` / `computed` / `uuid` 等の cell fn descriptor を追加

### Phase U-2: spec 本文と関連 DR

- `docs/DESIGN.md`: help_installer 3 役、5 type、内部セル、構造化 model、display/group/order/on_failure と DR-114 の universal fn を §7 / §8 / §11 を含めて統合再記述
- `docs/LOWERING.md`: help preset 展開、内部セル link、cell_fns 固定値供給、help_on_failure → on_failure、default_fn placeholder を記述
- `docs/CONFORMANCE.md`: help_installer capability の標準経路、`category_mode`、query-error と definition-error の位相分離、fixture discriminator、順序込み比較を記述
- DR-042 / DR-057 / DR-058 / DR-059 / DR-063 / DR-076 / DR-087 / DR-088 / DR-094 / DR-101 / DR-102 / DR-107 / DR-108 / DR-109 / DR-111 に関係を追記

### Phase U-3: fixtures

- `fixtures/help/`: 5 type の個別・合成、category_mode 3 分岐、query-error 2 種、value_structure tree、type_ref / types、origin、display/group/order、default_fn、失敗意味論を pin
- help_all の旧意味論と同一グループ再宣言を許す期待値を訂正
- universal fn の string / array 混在と colon を含む arg を追加

### Phase U-4: kuu.mbt

- help_installer の回収・植え付け・能力提供
- 5 type、内部セル、構造化 model
- kuu.mbt runner から capability を直接呼ぶ help conformance 経路
- DR-114 の cell_fns / FnCtx / observes / 遅延解決を使用
- spec fixture・pin・実装の lockstep 窓を維持

### Phase U-5: kuu-cli

- `kuu help` サブコマンドを U-4 の help_installer capability へ接続する
- capability の入力と構造化 model 出力を CLI envelope へ写す
- canonical レンダラの実装や policy は含めない

### Phase U-6: v1 発行条件

5 プロファイルすべてを指定参照実装 kuu.mbt で green にし、DR-108 の発行条件を満たす。

## 射程外

- canonical レンダラの具体設計: pipe 曖昧回避、集約 vs inline、詳細説明、renderer policy 指定語彙、version binding
- help の文言、翻訳、幅、折返し、色、ページング、stdout / stderr、exit code、man / Markdown 生成
- v1.0.0 の発行時期と発行操作
- 3rd party fn registry の配布・登録・運用規約
- help_category の multiple 合成。v1 は last-wins
- command の副作用 semantics に応じた global 集合の動的変更

## リスク・悪い面

- DR-112 に基づく spec / fixture / 実装を help_installer へ組み替える必要がある
- help model の表現力が増えるため、schema と runner の一方だけを更新すると profile が不整合になる
- help と universal fn が同じ lockstep 波に入り、spec pin を単独で動かすと conformance が red になる
- default_fn の `observes` 宣言漏れは help type 合成の依存順を壊すため、descriptor と実装の整合検査が必要である
- canonical レンダラを分離するため、U-5 完了時点でも構造化 JSON の consumer と、人間向け標準表示の完成は別である

## 関連

- DR-112 (本 DRにより Superseded)
- DR-042 (installer 3 役)
- DR-048 (on_failure の意味論)
- DR-057 (alias)
- DR-058 (hidden / deprecated)
- DR-059 (inheritable)
- DR-063 (wire form と宣言層)
- DR-076 (preset 属性展開)
- DR-082 / DR-085 / DR-101 (definition-error kind)
- DR-087 / DR-088 (default 遅延解決と宣言充足)
- DR-094 (registry namespace)
- DR-107 / DR-111 (descriptor 直交軸)
- DR-108 (v1 発行条件)
- DR-109 (semantic model と renderer の境界)
- DR-114 (universal fn / cell_fns / FnCtx / observes)
- `docs/findings/2026-07-17-help-mechanism-design-plan.md`
- `docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md`
- `docs/findings/2026-07-19-kuu-help-display-expressibility-check.md`
- `docs/findings/2026-07-19-help-mechanism-redesign-v2.md`
- `docs/QUESTIONS.md` の HIP-META-Q1〜Q8 裁定
