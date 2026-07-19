# DR-113: help 機構の再設計 — help_installer・5 直交 type・value_structure tree・default_fn

> 由来: kawaz 発題「実装がない奴として help_installer が無くないですか？必要な機能やそれを実現するための語彙や展開方などの設計プランからまず立てる必要があるのでは」(2026-07-17) と、`docs/QUESTIONS.md` の HIP-META-Q1〜Q6 裁定 (2026-07-19)。HIP-META-Q1=a により DR-112 §1 の「help_installer は存在しない」を撤回し、原発題どおり help_installer を中心に設計し直す。HIP-META-Q4 は value_structure tree + type_ref + types、HIP-META-Q5 は 5 直交 type、HIP-META-Q6=A は default_fn 汎用機構を確定した。下敷きは `docs/findings/2026-07-19-help-mechanism-redesign-v2.md`。

## 決定

### 1. help_installer は回収・植え付け・能力提供の 3 役を担う

DR-042 の installer 3 役を help 機構へそのまま当てはめる:

| 役 | help_installer の実体 |
|---|---|
| 回収 | 表示メタ語彙 `help` / `help_long` / `help_epilog` / `display_name` / `value_name` / `help_group_name` / `help_group_title` / `help_group_description` / `help_group_order` / `help_order` / `help_after` を宣言層から取り込む |
| 植え付け | `type: "help"` / `"help_all_category"` / `"help_category"` / `"help_show_hidden"` / `"help_tree"` の 5 型 preset を canonical 展開する。各 preset は long / short / env の入口、内部セル link、固定値供給、`on_failure` 展開、`help_on_failure` 糖衣、必要な values 制約を持つ |
| 能力提供 | **help_query capability** を提供する。installer の宣言層寄与を適用し終えた断面から help model を組み立てる純関数であり、実装主体は help_installer である |

help_installer は上表の表示メタ語彙に加え、5 個の type 値と `help_on_failure` を所有する。`on_failure` 自体は専用 on_failure installer が所有し、help_installer は糖衣を参照して展開する。

DR-112 の `help_meta` installer が担っていた純所有・定義時検査は help_installer の回収役へ統合する。表示メタ語彙の unknown-vocab 正当化、グループ・順序語彙の定義時検査、help model への射影を同じ装置が担う。

help_query capability の概念シグネチャは次のとおり:

```
help_query(definition, {
  path?: ["<サブコマンド名>", ...],
  depth?: "scope" | "all",
  category?: "<グループ名>",
}) → help model
```

- `definition` は wire form。パース実行も args も要らない
- `path` は選択スコープ、省略時はルート。存在しない path は definition-error `absent-ref`
- `depth` は既定 `"scope"`、全層再帰は `"all"`。数値 depth は持たない
- `category` は `help_group_name` と同じ名前空間を指す。指定時は該当グループ所属 entry と当該グループ宣言 entry に絞る。存在しない category は `absent-ref`
- 読む層は **installer の宣言層寄与を適用し終えた宣言層**。global / alias / inheritable の宣言的コピーを含み、lowered 産物は読まない

この capability は spec の独立した query 語彙ではない。`kuu help` は kuu-cli が help_installer の capability を呼び出すサブコマンドであり、complete query と同格の spec query を新設しない。

### 2. help 系 type は 5 個の直交軸に分ける

#### 2.1 `type: "help"`

基本 help を発火する bool preset:

- long / short / env の入口を持てる。flag preset と同型
- 内部セルは `#help` (bool)
- 発火時に `#help = true`
- `help_on_failure` の既定は true。`on_failure: true` へ展開する
- help 系要素が存在しても name 経由の結果露出が一つも無い構成は lint warn

#### 2.2 `type: "help_all_category"`

category の絞りを外し、全 category を並べる bool preset:

- long / short / env の入口を持てる
- 内部セルは `#help` と `#help_all_category`
- 発火時に両セルへ true を供給する
- `help_on_failure` の既定は true
- 意味論は「category 絞りなし」であり、hidden 表示を含意しない

#### 2.3 `type: "help_category"`

特定 category を選ぶ string preset:

- long / short / env の入口と値スロットを持てる
- `or` により bool 枝と string 枝を組み合わせ、`--help` と `--help <category>` の 2 経路を表現できる
- 内部セルは `#help` と string の `#help_category`
- 発火時に `#help = true` と指定 category 文字列を供給する
- 複数指定は string 全体セルの last-wins
- `values` で category 名を enum 制約できる。名前空間は `help_group_name` と同じ
- `help_on_failure` の既定は true

#### 2.4 `type: "help_show_hidden"`

hidden 露出だけを表す独立 bool 軸:

- long / short / env の入口を持てる
- 内部セルは `#help_show_hidden`
- 発火時に `#help_show_hidden = true` を供給する
- **`#help` は立てない**。hidden 露出と help 発火を混ぜない
- 単独では表示要求にならないため、他の help type との合成または `default_fn` による連動を定義側で行う
- `help_on_failure` の既定は false

#### 2.5 `type: "help_tree"`

サブコマンド tree の全展開を表す独立 bool 軸:

- long / short / env の入口を持てる
- 内部セルは `#help` と `#help_tree`
- 発火時に両セルへ true を供給する
- レンダラは `#help_tree` により `depth: "all"` を暗黙採用し、サブコマンド tree を全展開する
- `help_on_failure` の既定は true

5 type は、`or` で入口形の代替経路を組み、`default_fn` で複数軸を連動させる。`help_all_category` と `help_show_hidden` を分けることで、「全 category」と「hidden を見せる」を混合概念にしない。

### 3. help type の合成は default_fn で表現する

同一 flag から複数の help 軸を立てるための専用属性 `default_from` / `default_for` は作らない。被参照側が `default_fn: "borrow:<source>"` を宣言する:

```json
{
  "options": [
    {"name": "help-all", "long": true, "type": "flag"},
    {"name": "help-full", "long": true, "type": "flag"},
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
    },
    {
      "name": "help-tree",
      "long": true,
      "type": "help_tree",
      "default_fn": "borrow:help-full"
    }
  ]
}
```

この定義では `--help-all` が all-category + show-hidden を立て、`--help-full` が tree を立てる。`full = all + tree` としたい場合は、`help-all` に `default_fn: "borrow:help-full"` を指定する。これにより help-full → help-all → all-category + show-hidden と、help-full → help-tree の両経路が立つ。

### 4. help model は value_structure tree・type_ref・types・origin を持つ

help model は表示文言でなく構造素材を返す。基本形は次のとおり:

```json
{
  "command_path": ["prog", "remote", "add"],
  "usage": {
    "has_options": true,
    "positionals": [],
    "has_subcommands": true,
    "has_dd": true
  },
  "description": "...",
  "description_long": "...",
  "epilog": "...",
  "types": [
    {
      "id": "color_value",
      "value_structure": {},
      "help": "...",
      "used_as": ["COLOR", "INFO", "WARN", "DEBUG"]
    }
  ],
  "commands": [
    {
      "name": "run",
      "aliases": ["r"],
      "help": "...",
      "help_long": "...",
      "hidden": false,
      "deprecated": false,
      "origin": "local"
    }
  ],
  "options": [
    {
      "group": {
        "name": "net",
        "title": "Network options",
        "description": "..."
      }
    },
    {
      "spellings": ["--port", "-p"],
      "alias_spellings": ["-n"],
      "value_structure": {
        "single": {"value_name": "PORT", "type": "number"}
      },
      "display_name": "ポート番号",
      "help": "...",
      "help_long": "...",
      "help_group_name": "net",
      "default": 8080,
      "env": "PORT",
      "required": false,
      "multiple": false,
      "hidden": false,
      "deprecated": false,
      "origin": "local"
    },
    {
      "spellings": ["--fg"],
      "value_structure": {"type_ref": "color_value"},
      "help": "...",
      "origin": "local"
    }
  ],
  "positionals": [],
  "help_entry": "--help"
}
```

#### 4.1 value_structure tree

DR-112 の単一 `value_name` を、`or` / `seq` / `repeat` / `single` / `type_ref` の任意ネスト tree に置き換える。kuu の or/seq/repeat 表現力を help model でも失わない:

```json
{
  "value_structure": {
    "or": [
      {
        "single": {
          "value_name": "COLOR_NAME",
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
  }
}
```

レンダラが tree を一行 pipe 表記、複数行、詳細説明のどれへ落とすかは canonical レンダラの policy で決める。model の tree 自体には曖昧さがない。

#### 4.2 type_ref と types

`definitions` + `ref` で共有された値構造は `type_ref` ノードとして射影する:

```json
{"type_ref": "color_value", "value_name": "INFO"}
```

- `type_ref` は definitions の共有型を指す
- `value_name` は参照箇所固有の上書き。省略時は型定義側の名前を使う
- 参照回数が 2 以上の共有型は model トップの `types` に集約射影する
- `used_as` は参照箇所の value_name 一覧を保持する

単一参照を inline 展開するか type_ref 表示のまま扱うか、複数参照を `Types:` セクションへどう集約するかは canonical レンダラ policy の関心である。

#### 4.3 origin

options / commands entry に由来素材 `origin` を載せる:

- `"local"`
- `{"kind": "global", "declared_at": ["<command_path>", ...]}`
- `{"kind": "inheritable", "declared_at": ["<command_path>", ...]}`
- `{"kind": "alias", "of": "<canonical_name>"}`

これにより、global 由来 entry の混在表示、完全省略、参照文への集約、専用セクション表示、深さ依存表示を、素材を失わずレンダラ policy で選べる。コマンドの副作用 semantics に応じて global 集合自体を動的変更する挙動は spec の関心外とする。

#### 4.4 model の既存規約

- `command_path` はルート定義要素の name があれば先頭に置き、選択 path を続ける。プログラム名を定義が持たない場合はレンダラ / 呼び出し側が供給する
- `hidden` は model に残す。除外はレンダラ policy
- alias は canonical entry の `alias_spellings` / `aliases` に併記し、独立一覧しない
- `default` / `env` / `required` / `multiple` / `deprecated` は注記素材
- usage は構造素材のみで、一行文字列を持たない
- `depth: "all"` は各 command entry の `scope` に子 help model を再帰埋め込みする
- options / commands の順序は §8 の並べ替え適用後の順序を保存し、conformance は順序込みで比較する。positionals は定義順
- `help` / `help_long` の未設定側は省略する。相互フォールバックはレンダラ policy
- version 文字列は載せない

### 5. default_fn は汎用 registry 機構とする

#### 5.1 DSL

```
default_fn: "fn_name[:arg[:arg...]]"
```

filter / variant DSL と同じ colon args 形式を使う。args は string として受け、descriptor 側の引数定義でキャスト・制約する。bare 名は DR-094 により builtin namespace の糖衣となる。

#### 5.2 builtin default_fn

| fn | args | 用途 |
|---|---|---|
| `borrow` | `<other_option_name>` | 同一 scope の他 option 値を借用する |
| `inherit` | `<name>?` (省略時は自 name) | 祖先 scope 継承の明示形 |
| `env` | `<VAR_NAME>` | 環境変数から解決する |
| `constant` | `<value>` | 定数。`default: value` と 1 対 1 に対応する |
| `computed` | `<key>` | registry 拡張による動的計算 |
| `uuid` | `<v1|v4|v7>` | UUID を生成する拡張候補 |

`computed` の system 提供候補は `git_branch` / `hostname` / `date_now` 等である。`uuid` を含む具体的住人の実体化は descriptor と fixture で確定する。

#### 5.3 descriptor

DR-061 / DR-107 / DR-111 の descriptor 骨格に従う:

```json
{
  "id": "borrow",
  "ns": "builtin",
  "kind": "default_fn",
  "owns": ["borrow"],
  "args": [
    {"name": "source", "type": "string"}
  ],
  "returns": {"type": "same_as_target"}
}
```

引数宣言には kuu の positionals 定義式を使い、`values` による enum 制約も利用できる。

#### 5.4 default との関係と評価時点

- DR-088 の既存概念を DSL として明示する。`env: "VAR"` は `default_fn: "env:VAR"`、`inherit: true` は `default_fn: "inherit"`、`default: value` は `default_fn: "constant:<value>"` の糖衣として整合的に位置づけ可能である
- 既存の `env` / `inherit` / `default` 語彙と値源ラダーは維持する
- `default_fn: "fn:args"` は動的 default を表す
- `default` と `default_fn` の併用は definition-error `invalid-range`
- DR-087 の placeholder モデルに従い、default_fn は解決フェーズまで評価しない
- 値源が他 cell に依存する場合は依存グラフの位相順で実体化する
- DR-088 に従い、default_fn の宣言は探索中の「デフォルトあり」判定へ参加し、最終充足は遅延解決後の実値で判定する

### 6. 内部セルは help の直交軸をそのまま表す

help 機構が管理する内部セルは定義全体でそれぞれ単一の実体であり、どのサブコマンド scope の入口から発火しても同じセルへ link して合流する。セルは次の 5 個:

- `#help`: bool。help / help_all_category / help_category / help_tree の発火で立つ
- `#help_all_category`: bool。help_all_category の発火で立つ
- `#help_category`: string。help_category の発火値を保持する
- `#help_show_hidden`: bool。help_show_hidden の発火で立つ。`#help` は立てない
- `#help_tree`: bool。help_tree の発火で立つ

内部セルは `#` 予約 namespace の実装細部で、wire と result に直接現れない。result への露出は各 type の name / export_key を経由し、link の既存意味論を使う。

help 系要素が存在しても、name / export_key 経由で発火を結果面に観測できる要素が一つも無い構成だけを lint warn にする。`type: "help"` が無くても、help_all_category / help_category / help_show_hidden / help_tree 自身に name 露出があれば warn しない。

### 7. 説明文・失敗時発火・hidden の既存語彙を維持する

#### 7.1 help / help_long / help_epilog

- `help`: 短い説明
- `help_long`: 長い説明
- `help_epilog`: 選択スコープの一覧後に置く自由テキスト素材

3 語彙とも inert な表示メタであり、文言の出し分けとフォールバックはレンダラの関心とする。

#### 7.2 on_failure / help_on_failure

- `on_failure` は任意要素に付く汎用 bool 属性、既定 false
- 完全経路 0 本の failure 時、dead end 込み候補経路で selected なら発火する。意味論は DR-048 を維持する
- `on_failure` は専用 installer が所有する
- `help_on_failure` は help 系 preset の糖衣で、help_installer が `on_failure` へ展開する
- help / help_all_category / help_category / help_tree の既定は true、help_show_hidden の既定は false
- help 系 type 以外への `help_on_failure` は definition-error `invalid-range`

#### 7.3 hidden / deprecated

- `hidden: bool` 1 本を維持する
- help / completion からの既定除外は表示層の policy であり、受理は変えない
- 面別の非対称は ref & link による分割定義で表現する
- deprecated は canonical entry の構造化メタとして model に残す

### 8. グループと順序の語彙を維持し、重複規則を訂正する

#### 8.1 グループ宣言

- 通常 entry の `help_group_name` は所属グループ名参照
- `name` / `id` / `type` / 入口属性を持たず、グループ属性だけを持つ options entry はグループ宣言エントリ
- `help_group_title` / `help_group_description` は同時に書かれた `help_group_name` に属する
- model では `{"group": {"name", "title", "description"}}` entry としてフラット列に残す
- **同じグループ名の重複宣言は、設定が同一か否かを問わず definition-error `invalid-range`**。同一設定の再宣言を冪等で合法とはしない
- commands のグループ宣言席は本 DR では追加しない

#### 8.2 順序

- `help_order`: 通常 entry の表示順
- `help_group_order`: グループ宣言 entry の表示順
- `help_after`: 同一 scope・同一 entries 列の name を参照し、その直後へ配置する
- 座席違いの order 指定、および同一要素への order と help_after の併用は definition-error `invalid-range`

並べ替えは options / commands の各フラット列へ独立に 2 段適用する:

1. 明示 order、無ければ宣言 index を実効 order として安定ソートする。同値なら宣言順を保つ
2. help_after entry を取り出し、target の直後へ配置する

help_after の規則:

- 同一 target への複数 after は定義順
- 連鎖は解決して許容する
- 循環は definition-error `circular-ref`
- 不在 target は lint warn とし、段 1 の位置へ fallback する
- positionals は並べ替えず、順序語彙は lint warn + 無視

### 9. conformance は help_installer の標準経路を検証する

`fixtures/help/` は help model と順序を pin するが、`query: "help"` という独立 spec query を意味しない。kuu-cli の `kuu help` サブコマンドが definition と選択引数を受け、help_installer の capability を呼び出す標準経路の入力・出力 fixture と位置づける。

検証対象:

- 5 直交 type の canonical 展開と合成
- value_structure の or / seq / repeat / single / type_ref
- types 集約射影と used_as
- origin の local / global / inheritable / alias
- help_long / help_epilog
- グループ宣言と order / after
- hidden / deprecated
- path / depth / category
- absent-ref / invalid-range / circular-ref
- default_fn と default の排他、borrow の依存解決

options / commands / positionals は順序込みで比較する。v1.0.0 発行条件は DR-108 §3 の改訂を維持し、parse-core / lowering / definition-error / completion / help の 5 プロファイルすべてが指定参照実装 kuu.mbt で green であることとする。

## 採用しなかった案

### help_installer を置かず、help を独立 query とする

DR-112 §1 の案。kawaz 未承認の worker 解釈であり、原発題「help_installer が無くないですか。必要な機能・語彙・展開方の設計プランから立てる必要がある」の真逆へ拡張していたため撤回する。

この案は installer 3 役のうち model 構築だけを切り出し、5 type の preset 展開、表示メタ語彙の所有・検査、内部セルへの canonical lowering を一つの責務として扱えない。新設計は 3 役を help_installer に統合し、help_query はその capability として位置づける。

### `type: "help_all"` に全 category と hidden 表示を混在させる

「全 category 絞りなし」と「hidden を見せる」は独立軸であり、1 type に混ぜると組合せを失う。`help_all_category` と `help_show_hidden` に分ける。

### help type 合成専用の default_from / default_for

help 以外の集約 flag、env、computed、uuid、inherit ごとに専用語彙が増殖する。既存の registry + DSL + descriptor の骨格に揃う default_fn を採る。

### value_name 1 個または value_names 平坦列

or / seq / repeat の任意ネストと共有型参照を表せず、kuu の定義表現力を help model が縮小する。value_structure tree を採る。

### usage の一行文字列を model に含める

任意ネスト構造の忠実な一行化はレンダラ policy であり、素材と文言を混ぜる。model は構造素材を保持する。

### origin を持たず global 表示方式を一つに固定する

実 CLI には混在、完全複製、省略、参照、専用セクション、深さ依存が実在する。origin が無いと複数 policy を選べないため、素材として origin を保持する。

### hidden の面別属性

`hidden: bool` と ref & link の分割定義で表現できる。表示面ごとの専用語彙は増やさない。

### 同じグループ設定の再宣言を冪等として許す

元裁定に無い worker 追加であり、宣言箇所を一意にするグループ先頭宣言スタイルを崩す。同名グループの重複は無条件に definition-error とする。

## 波及

本 DR の実装追随は次の段階で行う。本 DR 自体は設計記録だけを確定し、以下のファイルは別 change で更新する。

### P2: spec 本文・schema・fixture

- **DESIGN.md**: help_installer 3 役、5 type、内部セル、default_fn、value_structure / type_ref / types / origin、表示メタ、group / order、on_failure の現行設計へ更新
- **LOWERING.md**: help_installer の preset 展開、内部セル link、固定値供給、help_on_failure → on_failure、default_fn placeholder と依存解決を追記
- **CONFORMANCE.md**: help プロファイルを help_installer 標準経路として定義し、順序込み比較と fixture 契約を更新
- **schema/wire.schema.json**: 5 type、新規表示メタ、default_fn、value_structure 関連の入力語彙・制約を反映
- **fixtures/help/**: 5 直交 type の合成、value_structure tree、type_ref / types、origin、default_fn、グループ・順序、意味論訂正を pin。DR-112 依存の `help_all` と同一設定再宣言の fixture を訂正

### P3: kuu.mbt

- DR-112 に基づく独立 help query 実装を forward rewrite で撤回
- help_installer、5 type、内部セル、value_structure / type_ref / types / origin、default_fn を実装
- conformance runner を新 fixture 契約へ追随
- spec fixture・pin・実装の lockstep 窓を維持する

### P4: kuu-cli

- `kuu help` サブコマンドを help_installer capability へ接続
- canonical レンダラを別 issue の設計に従って実装
- value_structure の pipe 曖昧回避、集約表示と inline 表示、詳細説明、renderer policy 指定オプション、version binding を確定

### P5: v1 発行条件

5 プロファイルすべてを指定参照実装 kuu.mbt で green にし、DR-108 の発行条件を満たす。

## 射程外

- canonical レンダラの具体設計: pipe 曖昧回避、集約 vs inline、詳細説明形式、renderer policy 指定オプション、version binding
- help の文言、翻訳、幅、折返し、色、ページング、ソート既定、stdout/stderr、exit code、man / Markdown 生成
- default_fn の 3rd party registry の具体的住人。拡張 namespace の経路は DR-094 に従う
- help_category の multiple 合成。v1 で pin するのは last-wins
- コマンドの副作用 semantics に応じた global 集合の動的変更
- v1.0.0 の発行そのもの

## リスク・悪い面

- DR-112 に基づいて DESIGN.md / LOWERING.md / CONFORMANCE.md / schema / fixtures へ入った記述を forward rewrite する必要がある
- help query 実装済みの参照実装を help_installer へ組み替える必要がある
- fixtures/help/ の意味論変更と追加が広く、spec pin と kuu.mbt の同期を外すと conformance が一時的に red になる
- default_fn は help 以外にも及ぶ汎用機構であり、descriptor・遅延解決・definition-error を一体で実装する必要がある
- value_structure tree と types は model の表現力を上げる一方、canonical レンダラが複雑 tree を読みやすく表示する policy を別途設計する必要がある

## 関連

- DR-112 (本 DR により Superseded)
- DR-042 (installer 3 役・合成契約)
- DR-057 (alias の表示帰属)
- DR-058 (hidden / deprecated)
- DR-059 (inheritable の宣言的コピー)
- DR-063 (wire form = 宣言層)
- DR-076 (preset の属性展開)
- DR-087 / DR-088 (default の遅延解決と宣言充足)
- DR-094 (registry namespace)
- DR-098 / DR-099 (注入値源から preset 型へ責務を移す先例)
- DR-108 (v1 発行条件)
- DR-109 (semantic model + policy、renderer は言語側)
- DR-111 (descriptor 直交軸)
- `docs/findings/2026-07-17-help-mechanism-design-plan.md` (原設計プランと HELP-Q 裁定)
- `docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md` (実 CLI の表示方式)
- `docs/findings/2026-07-19-kuu-help-display-expressibility-check.md` (origin の必要性)
- `docs/findings/2026-07-19-help-mechanism-redesign-v2.md` (本 DR の下敷き)
- `docs/QUESTIONS.md` の HIP-META-Q1〜Q6 裁定履歴
