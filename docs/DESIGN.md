# kuu 引数定義 AST 仕様

> 対象: 言語非依存な引数定義のための AST。
> 本ドキュメントは現役仕様のみを記述する。判断経緯・代替案・撤回履歴は `docs/decisions/` の各 DR を参照。

## 0. 全体像

### 0.1 設計原則

- **言語非依存**: JSON でシリアライズ可能。各言語 DX がこの AST を生成/消費する。
- **2層 AST**:
  - **UsefulAST**: 人間が書く層、各言語 DX コードが本体、JSON は交換フォーマット
  - **AtomicAST**: パーサが直接走る正規形、シリアライズ可能なもののみ
- **キー名は snake_case 正規形** (DR-022)、case 変換は pluggable。
- **暗黙ルールを最小化**: 明示性重視、利用者の知識を信頼。
- **入力は前処理済み `Array[String]`**: `@file` (レスポンスファイル) の展開や stdin 読込は呼び出し側の責務。kuu は argv をトークン列として受け取る。
- **補完スクリプトは生成しない**: zsh / bash / fish 等の補完スクリプト生成は kuu core の提供物ではなく、AtomicAST を消費する外部ツールの責務。
- **仕様の成熟度**: 本仕様は垂直スライス実装 (DR-039) との共設計段階にあり、全域で破壊的変更を許容する。確定版 (JSON Schema) の発行手続きは本仕様ではまだ定めない。

### 0.2 4層アーキテクチャ

```
人間 → UsefulAST (各言語 DX、クロージャあり)
            ↕ export/import
       UsefulAST JSON (クロージャ部分は $required)
            ↓ parse_definition()
       AtomicAST (シリアライズ可能な正規形)
            ↓ bounded path-search パース
       パース結果 (ParserContext と 結果オブジェクト)
```

### 0.3 結果の2層取り出し

```
パース → ParserContext (詳細状態: value, committed, selected, source, ...)
           ↓ convert
         結果オブジェクト (シンプルなビュー)
```

通常は結果オブジェクトで値だけ取る。`committed` / `selected` / `source` 等のメタ情報は ParserContext のみ。

---

## 1. 基本構造

### 1.1 ノードは葉か枝か

ノードには2系統:

- **葉ノード** (プリミティブ、children なし): 自分でトークンを消費する
  - 値プリミティブ: `string` / `number` / `int` / `float` / `bool` / `path` / `file` / `dir` / `datetime` / カスタム
  - `exact`: トークンを照合消費するプリミティブ。値は持っても持たなくてもよい (照合専用 or literal 値発生)
- **枝ノード** (構造、children 必須): 子に消費を委ね、結果を畳む
  - `or`: 子から1つ選ぶ (排他)
  - `seq`: 子を順に消費

葉と枝はノードのフィールド構成で区別される (葉は children を持たず type を持つ、枝は逆)。

### 1.2 構造記法 (糖衣)

裸の JSON 値は対応する node 形への糖衣として展開される (DR-026):

```
"x"          → {exact: "x"}      裸文字列 = exact 糖衣
[...]        → {seq: [...]}      裸配列 = seq 糖衣
{or: [...]}  → 選択 (or のキー形)
{seq: [...]} → 順次 (name 等を付けたい時の明示形)
{type: ...}  → 値プリミティブ (葉)
```

`or` / `seq` キーは name / multiple / value_name 等の通常フィールドと同居可能:

```json
{"name": "color", "or": [
  [{"type":"number","name":"r"},{"type":"number","name":"g"},{"type":"number","name":"b"}],
  {"type":"string"}
]}
```

### 1.3 配置で役割が決まる (DR-018)

要素の役割は所属する配列で決まる:

- **options[]**: ハイフン起動 (`--`/`-`)、順不同
- **positionals[]**: 位置消費される要素群
- **commands[]**: サブコマンド糖衣 (詳細は §4)

option/positional は所属配列で役割が定まるので type フィールドは省略可。command 等の構造的に特別な要素のみ type 必須。

### 1.4 ノードの基本形

ノードは name で結果スコープを作り (DR-025/033)、配置と属性の組合せで CLI 上の役割が決まる。下記は出現しうるフィールドの一覧であって全部書く必要はない:

```json
{
  "name": "<各名前軸のデフォルト供給源>",
  "id": "<参照識別子 (未指定なら name)>",
  "type": "<type 参照>",

  "long": [...],
  "short": "<chars>",

  "value": ...,
  "default": ...,
  "values": [...],
  "multiple": ...,
  "repeat": ...,
  "optional": false,

  "filters": [...],
  "pre_filters": [...],
  "post_filters": [...],

  "options": [...],
  "positionals": [...],
  "commands": [...],

  "export_key": "<結果キー名。null (または \"\") で透過>",

  "required": true,
  "exclusive_group": ["<group>"],
  "conflicts_with": ["<other-name>"],
  "requires": ["<other-name>"],

  "ref": "<name>",
  "link": "<name>",
  "alias": "<name>",
  "inherit": true,
  "inheritable": true,

  "value_name": "<help の値プレースホルダ>",
  "display_name": "<help の説明ラベル>",
  "help": "<説明>",
  "hidden": false,

  "config": {...}
}
```

パース側の契約は bounded path-search で入力を全消費する完全解決経路がちょうど1本ある時のみ成功 (DR-038、§15 参照)。

---

## 2. 名前とスコープ

### 2.1 3つの名前 (DR-024)

ノードに関わる名前は3層に分離:

| 名前 | 場所 | 役割 | 結果露出 |
|---|---|---|---|
| **key name** | `name` (入口配置時) | 結果オブジェクトのキー、スコープを作る | する |
| **def name** | `definitions` のキー | 参照・テンプレ名 (ref/link 対象) | しない |
| **value_name** | `value_name` | help/usage の値プレースホルダ表示 | しない (表示のみ) |

`name` フィールドは1つ。役割は配置で決まる:
- definitions 配下に置けば def name
- options/positionals/commands に置けば key name

名前の軸は `id` (参照識別子、結果非露出・スコープ非生成) と `display_name` (help の説明ラベル) を加えて一般化されており、**name は各軸のデフォルト供給源** (DR-046)。nameless の要素に ref/link したい場合は id だけを付ける。

### 2.2 value_name のデフォルトと上書き

- 指定なし → uppercase で導出 (key name / type 名 / def name を大文字化)。大文字化は ASCII 英字のみ、非 ASCII 文字はそのまま (ロケール変換しない)
- 明示 → そちらを採用
- ref 継承 + 上書き可: definitions 側の `value_name: "COLOR"` を入口側で `value_name: "FG_COLOR"` で上書きできる

表示メタ (`help` / `display_name` / `value_name`) は **UsefulAST 専用**で AtomicAST に搬送しない (パース挙動に影響しない、DR-046 §3)。`help` の型は string。多言語対応は UsefulAST 層 (各言語 DX) の関心であり、AtomicAST レベルではサポートしない。

### 2.3 name が結果スコープを作る (DR-025)

- **name を持つノード** = 結果スコープ (結果オブジェクトのキー) を作る
- **name 無しノード** = 透過 (値の畳み方だけ効かせて値を親に流す)

children の有無ではなく **name の有無**で結果スコープが決まる。

### 2.4 露出規則: 最も浅い name 層

結果への露出は以下の規則で決まる:

1. 根から降りていって、最も浅い (祖先側の) name 層で止める
2. その層にある name 持ちノードを**全て**結果キーにする (同じ層の name 兄弟は全部拾う)
3. それより深い name は、止めた層のノードが作る子スコープに属する (再帰)

`name` 無しノードは結果に痕跡を残さず、値の畳み方 (配列 or kv) だけ効かせる。

結果キーは `export_key` で明示できる (未指定 = name 由来、DR-046/052): 文字列でキー名を上書き、**null (または "") で結果キー軸なし** — name 無しノードと同じ透過挙動になる (kv 文脈では現れず、seq 文脈では値が親の配列要素として残る)。露出規則では export_key: null の層を結果キー層と数えず、子の結果キー持ちが昇格露出する。lexical スコープ (§2.7) と id (ref/link) は export_key と直交で不変。

### 2.5 object は独立構造でなく露出の帰結

kv (object 的な結果) は専用構造を持たない。**name を持つ子が並べば結果が自然に kv になる**:

```
[{name:"r",type:"number"},{name:"g",type:"number"},{name:"b",type:"number"}]
→ 結果は {r:..., g:..., b:...}
```

混在 (name 持ちと name 無し) も問題ない: name 無しは消えるだけ、kv には name 持ちだけ現れる。

### 2.6 値の無い要素は結果に出ない (absent、DR-051)

値源ラダー (§11.4) を回しても値が無い要素は、結果オブジェクトに**キー自体が現れない** (in-band の null は使わない)。absent が起きるのは値源を持たない非反復要素のみ — 反復系 (repeat / multiple) は 0 回発火でも `[]` が出る (§6.1)、flag / count は default を同梱、required 要素は値が無ければ経路不成立 (§9.1)。**結果キーを持つスコープ生成要素 (command 含む) は、選ばれたら子が全部 absent でも空 kv `{}` を持つ** (スコープ生成 = 値の発生、反復系の `[]` と同型)。選ばれなければ absent (DR-052)。言語バインディングの型導出: required / default あり / 反復系 → `T`、それ以外 → `T?`。**null は kuu の値空間に存在しない** — config の JSON null は「供給なし」(DR-050)、明示的な取り消しは unset 効果 (DR-045)。absent 要素のメタ (committed / selected / source) は ParserContext から引ける (§0.3)。

### 2.7 lexical スコープ = name が作るスコープ (DR-033)

ref/link の解決スコープは command に限らない。**name を持つ任意のノードがスコープ単位**になる:

```
rgb の中で r/g/b を DRY に定義:
rgb: [
  {name:"r", type:"number"},
  {ref:"r", name:"g"},  // 同じスコープ内の r を参照
  {ref:"r", name:"b"}
]
```

解決順: 現在スコープ → 外側のスコープへ順に → 見つからなければ definitions (DR-032)。

---

## 3. type と参照糖衣

### 3.1 type は definitions/registry への参照糖衣 (DR-028)

`type: X` は「定義済みの型 X を参照する糖衣」。組み込み型もユーザ定義型も同じ `type:` で指定:

```
type: "number"   → 組み込み (registry の value_parser)
type: "color"    → ユーザ定義 (definitions の構造テンプレ)
type: "cssColor" → ユーザ定義型 + value_parser (両方持ちうる)
```

definitions.types 内の構造テンプレにも記法糖衣 (§5.3 の values → or 展開等) は同様に適用される (A 群は配置文脈非依存、LOWERING §A.4/§C.4)。`type: X` 参照は展開済み構造を継承する (§3.5 の合成順)。enum 的テンプレ (`{values: [...]}`) への未定義値は or 全枝の綴り不一致 (Reject) となり完全経路 0 本で失敗する — 候補提示の素材は tried_triggers (§15.12)。value_parser による受理制限とは別経路 (values は構造、value_parser は葉の字句)。

### 3.2 解決順 (前方互換)

```
definitions.types.X → registry.types.X → warn+string フォールバック
```

ユーザのローカル定義が組み込みを shadow する。組み込み型の追加がユーザ定義を壊さない (前方互換)。未登録の場合は warn を出して string にフォールバック (DR-021 の「warn はする、reject はしない」と整合)。

### 3.3 type の語彙

**値プリミティブ (葉)**: `string` / `number` / `int` / `float` / `bool` / `path` / `file` / `dir` / `datetime` / `exact` / カスタム

数値 3 種の関係: `number` は汎用数値 (JSON number と同型、整数も小数も受理)。`int` は整数制約付き (非整数は Error)。`float` は小数を明示する意図の別名で、受理域は number と同じ。**整数を意図する要素には int を使う** — config の JSON number が非整数なら Error になり、文字列化の表現揺れ (DR-050 §4) も生じない。

bytes / binary 型は組み込みに持たない。必要なら拡張 type (registry 登録) で提供する。

**糖衣プリセット**: `flag` / `count` / `command` / `help` 等
- `flag` = bool + default:false + 起動で true
- `count` = number + default:0 + increment mapper
- `command` = name でスコープを作り、name の完全一致でトリガ
- `help` = 起動時アクション

これらは独立の type ではなく、属性プリセットへの名前。version は専用 type ではなく単なる flag。

### 3.4 type の方言と canonical default (DR-040)

プリミティブ型 (number/bool/...) も方言を持つ。3層の上書き構造:

```
canonical default (kuu core 提供、最も寛容な仕様)
  ← 言語DX default (各言語慣習に合わせた差分)
  ← ユーザ差し替え (ローカル definitions / registry 上書き)
```

方言の軸は2系統:

- **寛容 default + pre フィルタで狭める/正規化**: canonical の寛容 parser を使い、入力前段で正規化や受理範囲制限を入れる方向。
- **value_parser 差し替え**: registry の types[X] そのものを置き換えて狭い仕様にする方向。

バイナリサイズは各言語 DX の tree-shake で削る (使われない方言は同梱されない)。再現性は (1) 単一ホスト内の moving target ロック (2) クロスホストでの canonical 参照、の2段階で担保する。

### 3.5 type と multiple は同じ属性平面への参照 (DR-034)

`type` と `multiple` は包含関係でなく、同じ属性平面の異なる断面への参照。両方書けば合成順:

```
1. プリセットなしの初期値
2. type プリセットで上書き
3. multiple プリセットで上書き
4. ユーザの直接書き (最優先)
```

後ろほど優先。DR-007 の ref 継承+差分上書きと同じ流儀。

---

## 4. options / positionals / commands

### 4.1 配置で役割分け (DR-018)

- **options**: ハイフン起動、順不同
- **positionals**: 順序で消費
- **commands**: サブコマンド糖衣 (下記)

### 4.2 commands は positionals 内 or への糖衣

```json
"commands": [
  {"type": "command", "name": "commit", ...},
  {"type": "command", "name": "clone", ...}
]
```

展開 (内部正規形):

```json
"positionals": [
  {"or": [
    {"type": "command", "name": "commit", ...},
    {"type": "command", "name": "clone", ...},
    ...original_positionals
  ]}
]
```

- commands と original_positionals が or で排他
- commands が先、original_positionals が後 (name の完全一致で command にマッチすればそちらを選ぶ。最終的には DR-038 の「完全経路の一意性」契約で曖昧さを判定)
- commands 不在時は or で包まない

### 4.3 command 一級扱い、内部正規形は同型 (DR-017)

定義時は command を1級として扱う (commands[]、`type: "command"`)。パース時 (AtomicAST) は同型要素 (exact + or/seq) に展開され、パースループは「name でトリガしうる要素」という同型表現で動く。

### 4.4 復帰・途中分岐は構造プリミティブで組む (DR-020)

「サブコマンド消費後に親へ復帰」「途中分岐」「再帰」などの専用概念は持たない。これらは構造プリミティブ (or/seq/exact/multiple) の組み合わせでユーザが組む:

```
type: multiple, children: [
  {exact: "--command"},
  {or: [...サブコマンド群]}
]
```

パース成否は DR-038 の完全経路一意性で判定される。

### 4.5 「実体だけノード」 (DR-030)

入口属性 (long/short/positional 位置) を持たないノードは、CLI 引数では起動されないが結果に出る「実体だけ」のノード。

```json
{"name": "timeout", "type": "number", "value": 30}
{"name": "apiKey", "type": "string", "env": "API_KEY"}
```

用途:
- link のプレースホルダ実体
- 環境変数専用
- ハードコード設定/マジックナンバー
- 結果オブジェクトを appconfig 統合ストアとして使う

---

## 5. 構造記法と値

### 5.1 構造プリミティブ

| プリミティブ | 役割 | 値の伝搬 |
|---|---|---|
| `exact` | name の完全一致でトリガ | value あれば literal、なければ値なし |
| `or` | 子から1つ選択 (排他) | 選ばれた子の値 |
| `seq` | 子を順に消費 | 子の値の配列 (単独要素なら単独) |
| primitive (`string`/`number`/...) | 引数1個消費 or value literal | 自身の値 |

### 5.2 裸リテラルは照合消費の糖衣 (DR-015)

構造位置に現れた裸リテラルは「トークンを照合消費し、literal 値を産出する」ノードへの糖衣:

```
"red"   → {"exact": "red"}     (消費 1、値 "red" を産出)
255     → 数値 255 の照合消費  (トークンを number として照合、値 255 を産出)
true    → bool として同様
```

**消費しない literal** は `value:` / `default:` フィールドで書く (`{"type": "number", "value": 30}` は消費 0 の実体だけノード)。消費数は Accept の報告値であり、value の有無から導出しない (DR-041 §3)。

### 5.3 values は or のショートハンド

```json
{"name": "color", "values": ["red", "green", "blue"]}
```

正規形 (各要素は照合消費の exact — 非消費の literal では enum にならない):

```json
{"name": "color", "or": [
  {"exact": "red"},
  {"exact": "green"},
  {"exact": "blue"}
]}
```

values の中に配列があれば seq ブランチ:

```json
"values": [
  "red", "green", "blue",
  [{"name":"r","type":"number"},{"name":"g","type":"number"},{"name":"b","type":"number"}]
]
```

### 5.4 「あと勝ち」mutation (DR-015)

値プレースホルダは型のゼロ値/null で初期化、CLI 入力順に mutation:

```
--since A --timerange 'X..Y' --since B
1. since_value = A
2. timerange セット → since_value=X, until_value=Y
3. since_value = B (最後勝ち)
最終: since=B, until=Y, timerange=[B,Y]
```

複雑な競合解決ルール不要、入力順がそのまま勝者。

---

## 6. multiple とその構造

### 6.1 multiple は複数値経路のスイッチ (DR-034)

multiple フィールドの値が「複数値経路を起動するか、起動するならどう積むか」を決める。multiple が担うのは**値の畳みのみ**で、出現の反復構造 (個数 min/max) は `repeat` が担う (DR-043、repeat installer が ref 再帰へ lowering する)。

repeat / multiple を宣言した要素の結果は max の値に依らず**配列**になる (`optional: true` = repeat {min:0, max:1} 糖衣も `[]` / `[x]`、DR-044)。scalar が欲しい場合は collector で畳む (unwrap_single、§6.3)。

```
multiple: "append"
multiple: "merge"
multiple: {mapper: "append", collector: "to_set"}
```

multiple registry (DR-036) からプリセットを引く。

### 6.2 multiple 経路の構造 (DR-034)

```
入力: raw_string
  ↓ separator (任意、String → String[])
[piece1, piece2, ...]
各 piece に対して peaceProcessor:
  piece (String)
    ↓ pre_filters (FilterChain[String, String])
    ↓ parse (types registry の value_parser、String → T)
    ↓ post_filters (FilterChain[T, T]、各 piece 検証)
  T
accumulator で累積:
  (piece, processor, prevs: T[]) → T[]
collector で最終形へ:
  T[] → U
```

- **separator**: 発火 1 回の 1 引数を分割 (例: `","`)、指定なければ分割しない
- **accumulator**: 発火ごとの piece の積み方。`+/-/...` 等の修飾子はここで剥がして合成 (mergeable など)
- **collector**: 全発火終了後の蓄積列への最終変換 1 回 (filters registry から引く、例: `to_set`、`from_entries`)

### 6.3 multiple 無しは縮退ケース

multiple を書かないノードは内部的に上記モデルの特殊ケース:

- separator: なし (常に長さ1の `[piece]`)
- mapper: override (prevs 無視、`[processor(piece)]`)
- collector: unwrap_single (`[t] → t`)

結果として peaceProcessor 一本で終わる。仕様の説明・実装が1本で済む (最適化として fast path は可)。

### 6.4 multiple registry の組み込みプリセット (DR-036)

| 名前 | accumulator | collector | separator | 用途 |
|---|---|---|---|---|
| `append` | append | identity | なし | リスト累積 |
| `merge` | merge (+/-/...) | identity | "," | DR-023 マージリスト |
| `set` | append | to_set | なし | 重複排除 |
| `map` | append (要素は entries か {k,v}) | from_entries | なし | kv 累積 (DR-044) |

ユーザが独自プリセットを作るなら definitions.multiple に登録。

---

## 7. CLI 起動 (long / short / variant)

`long` / `short` / dd / `env` などの特殊語彙はコア文法ではなく installer (registry 装置) の所有語彙であり、parse_definition 時に糖衣展開される (DR-042)。本章の記法は canonical installer セットが提供する語彙。

### 7.1 long / short

```json
{
  "name": "verbose",
  "long": [],         // → --verbose
  "short": "v"        // → -v
}
```

- `long` 配列が書かれていれば `--<name>` 生成
- `long` 未指定なら `--name` 生成しない
- `short` 文字列の各文字が個別ショートオプション

### 7.2 long_prefix / short_prefix (config)

階層継承可能な設定として `config` フィールドに:

```json
{
  "name": "mycli",
  "config": {
    "long_prefix": "--",
    "short_prefix": "-",
    "env_prefix": "MYAPP",
    "auto_env": false,
    "allow_equal_separator": true,
    "short_combine": true
  }
}
```

子要素は親の config を継承、上書き可能。

### 7.3 variant DSL (DR-011)

`long` の variant (`--no-X` のような同 opt の別入口):

**文字列 DSL**:
```
"<prefix>:<effect>[:<arg1>...]"
```

例:
- `"no:set:false"` — `--no-<name>` で false セット
- `"no:set:none"` — `--no-<name>` で "none" セット
- `"no:default"` — default に戻す (committed=true)
- `"no:unset"` — default に戻す (committed=false)
- `"reset:empty"` — 配列/Map を空に
- `"red:set:rgb:255:0:0"` — 複合値

**オブジェクト形式**:
```json
{"prefix": "red", "effect": "set", "args": ["rgb", "255", "0", "0"]}
```

args は全て string (CLI 引数パースと同じ手順を通る)。

### 7.4 effect 語彙 (4種)

| effect | args | 意味 |
|---|---|---|
| `set` | 1個以上 | 固定値セット |
| `default` | なし | default に戻す (committed=true) |
| `unset` | なし | default に戻す (committed=false) |
| `empty` | なし | 配列/Map を空に |

toggle / not は採用しない (CLI 慣習として薄い)。`"no"` 単独のようなショートハンドも入れない (アプリごとに意味が違う)。

### 7.5 variant は AtomicAST で消える

variant 構造は parse_definition() の時点で `or + exact + literal value` に展開され、AtomicAST には残らない。

---

## 8. filter chain

### 8.1 filter の役割

filter は値の変換と検証を担う純粋関数:

```
FilterChain[A, B] = A → B raise ParseError | raise ParseReject
```

- 入力: 値 (string or T)
- 出力: 値 (string or T)
- レスポンス: 成功 / Reject (他枝を試して) / Error (この枝のつもりだが不正)

### 8.2 Reject と Error の区別 (DR-037)

- **Reject**: 「この枝ではない、他枝を試して」→ エラー保持せず脱落
- **Error**: 「この枝のつもりだが値が不正」→ エラーを保持

or の枝選択時、filter Reject は静かに脱落、Error は全体失敗時の表示候補に。

### 8.3 filter の位置 (DR-034 のパイプライン参照)

filter は2箇所に乗る:

- **peaceProcessor 内**: 各 piece に対する変換・検証
  - pre_filters: `FilterChain[String, String]` (trim 等)
  - parse: `String → T` (types registry の value_parser、暗黙)
  - post_filters: `FilterChain[T, T]` (in_range 等、各 piece に効く)
- **multiple 経路の後**: 累積結果に対する最終変換
  - collector / post_filters: `T[] → U` (to_set、to_map 等、累積後に効く)

両者は位置が違うので自然な順序で合成 (type post → 各 piece、multiple post → 累積後)。

### 8.4 DSL 文法

variant と同じ `<name>:<arg>:...` 形式:

```
"trim"                   引数なし
"in_range:1:65535"
"regex_match:^[a-z]+$"
```

args は全て string、filter registry 側でキャスト。複雑な引数はオブジェクト形式:

```json
[{"name": "complex_validator", "args": ["abc", "with:colon"]}]
```

### 8.5 `@base` sentinel

type/ref 元のデフォルト filter chain を継承する sentinel:

```json
"filters": ["@base", "non_empty"]
```

解決順:
1. ref が指定されていれば → ref 元のそのフィールド
2. なければ → type registry のデフォルト
3. どちらもなければ → 空配列

---

## 9. 制約

### 9.1 required

```json
{"name": "filename", "required": true}
```

boolean のみ。充足判定は**最終状態の値の有無** (default / env 等の値源込み、DR-047)。`required: true` + `default` は常に充足する — required の実質は「値源を持たない要素への明示強制」と「結果に必ず値がある」という型保証。グループ的必須は or + required:

```json
{"or": [...], "required": true}
```

### 9.2 exclusive_group

```json
{"name": "json", "exclusive_group": ["format"]}
{"name": "yaml", "exclusive_group": ["format"]}
```

同じグループ名の要素群が排他 (最大1つ起動)。string[] で複数グループ所属可。3+ 要素の相互排他はこちら (グループ命名の N 者排他)。

### 9.3 requires

```json
{"name": "decrypt", "requires": ["key-file"]}
```

自分が起動された時、列挙された name の要素群も起動されている必要がある (正の依存)。required との対比: required は自分の話 (私には値が要る)、requires は相手の話 (私を使うなら彼らも要る)。

**値依存の制約は値の枝への requires 合成で書く** (DR-055、専用の条件 DSL は持たない):

```json
{"name": "format", "or": [
  {"exact": "json", "requires": ["schema"]},
  {"exact": "yaml"}
]}
```

値の枝は exact 要素 (§5.3) なので制約属性がそのまま付く。json 枝が committed の経路でのみ述語が立ち、requires は lexical 解決なので対象要素の場所を問わない。

### 9.4 conflicts_with (DR-055)

```json
{"name": "foo", "conflicts_with": ["bar"]}
```

名指しのペア排他 (負の依存)。**意味は対称** — 片側に書けば両方向に効く。2 要素のペア排他はこちらが手軽 (3+ 要素は exclusive_group)。同じペアを exclusive_group と重複宣言した冗長は両方評価され (正しさは不変)、指摘は lint の関心。

### 9.5 group_rules は作らない (DR-012)

「グループ全体に対するルール」を別場所 (`group_rules` 等) に書く設計はしない。各要素属性で表現できる範囲に限定。「どれか 1 つ必須」(oneof) は `{"required": true, "or": [...]}` の既存合成で足りる。

### 9.6 制約の評価 (DR-047)

required / requires / exclusive_group / conflicts_with は**遅延述語**であり、完全解決経路の成立条件として評価される (事後検証層は無い)。conflicts_with は exclusive_group と同じ指定述語 (committed 同士の衝突)。詳細は §15.9。requires / exclusive_group / conflicts_with は constraint installer の所有語彙 (席宣言型、§13.1)。

---

## 10. 参照 (ref / link)

### 10.1 ref は name 参照 (構造継承)

```json
{
  "ref": "color_template",
  "name": "fg"
}
```

- ref 元の構造を全継承
- 差分フィールドだけ書く

### 10.2 link は値同期 (DR-029)

```json
{"name": "log-level", "type": "number"}        // 実体
{"short": "v", "type": "count", "link": "log-level"}  // 参照
```

`-vvv --log-level 5 -v` → log-level セルに 0→3→5→6 と順次適用。1実体: N参照。

link 先は固定パス DSL: `.name` と `[int]` (負インデックス含む):
```
link: "log_level"
link: "timerange.since"
link: "color.rgb[0]"
link: "color.rgb[-1]"
```

解決は遅延 (実行時)。datetime のように内部構造を AST が知らないケースがあるため。解決失敗 = その経路のパース失敗 (DR-021)。

### 10.3 ref/link は name 参照、type は型参照 (DR-032)

| 参照 | 指すもの | 解決順 |
|---|---|---|
| `type: X` | 型 | definitions.types.X → registry.types.X → warn+string |
| `ref: Y` | name (ノード) | スコープ内 → definitions |
| `link: Z` | name (値セル) | スコープ内 → definitions |

ref/link と type は指す対象が違うため統合不能。

### 10.4 definitions 領域

トップレベル/各 scope に `definitions` フィールド。registry と同じ区分の名前空間 (DR-035):

```json
{
  "definitions": {
    "types": {
      "color": {"type": "string", "values": ["red", "green", "blue"]}
    },
    "accumulators": {
      "my_merge": {...}
    }
  },
  "options": [
    {"type": "color", "name": "fg"}
  ]
}
```

- definitions 内の要素は CLI 上で直接消費されない
- デフォルトで結果オブジェクトに出ない
- 区分は必須 (糖衣で省略しない)

---

## 11. スコープと継承

### 11.1 スコープは name で自動 (DR-025, DR-033)

name を持つノードが結果スコープ = lexical スコープを作る。children の有無は無関係。

### 11.2 inherit (default の取得先)

```json
{"name": "ttl", "type": "number", "inherit": true}
```

自身に値がなければ祖先 scope chain で同 name を探す。default と排他 (inherit を書いたら default は祖先で持つ)。

### 11.3 inheritable (祖先スコープからも書ける)

```json
{"name": "ttl", "type": "number", "inheritable": true, "default": 60}
```

- 自スコープでは `--ttl`
- 祖先スコープでは `--<定義スコープ名>-ttl` (例: socket 配下なら `--socket-ttl`)。**全祖先で同じ綴り** (深さで変わらない、DR-059)。綴りの衝突は実行時 ambiguous が検出し (§15.1)、別綴りは alias (§14.5) で opt-in
- 各 scope で書かれた値が、その scope 配下のインスタンスのデフォルトに
- lowering は inheritable installer が祖先スコープへ prefix 付き入口宣言をコピーする (global の逆方向、祖先の自前宣言優先)。祖先 help での見せ方はレンダラの関心

### 11.4 値源の優先順位 (DR-031)

```
1. CLI 明示 / link    (パース時操作、最優先)
2. 環境変数            (DR-049)
3. config ファイル     (DR-050、§14.3)
4. inherit (祖先 scope)
5. default / value    (最終フォールバック)
```

順序は固定 (設定可能にしない、暗黙の罠を避ける)。

---

## 12. 環境変数

```json
{"name": "port", "env": "PORT"}
```

- env_prefix が設定されていれば自動連結 (`MYAPP_PORT`)。prefix を付けたくない完全指定は要素の `config` で `env_prefix: ""` を上書きする (DR-049)
- 値の優先度: §11.4 を参照
- **env_provider** は registry の単一スロット。シグネチャは `(key: string) → string | null` — null = 未設定、空文字列は「設定されている」。受け取る key は prefix 連結済みの最終名 (導出は installer 側に閉じる、DR-049)
- env 値は string として peaceProcessor (pre_filters → parse → post_filters) を通る。multiple 要素なら separator 分割も効く (CLI 入力と同じ手順、DR-049)
- **auto_env**: `config.auto_env: true` で、`env:` 未指定の値セル持ち要素に env 席を自動宣言する。env 名は `UPPER(env_prefix)_UPPER(スコープパス)_UPPER(name)` のフル修飾 (例: serve 配下の port → `MYAPP_SERVE_PORT`)。明示 `env:` が優先 (DR-049)
- 複数環境のプロファイル切替 (dev / prod / test) は本仕様の関心外。実体ノード (§4.5) と config ファイル側の構成で表現する

---

## 13. 外部レジストリ

### 13.1 レジストリ区分 (DR-010 + DR-036)

現役の区分は以下の6つ。フィールド名で registry が暗黙決定される (§13.2)。

| レジストリ | 役割 | 引かれるフィールド |
|---|---|---|
| `types` | 値型のプリセット (peaceProcessor 中心) | `type` |
| `filters` | 純粋 FilterChain (collector も含む) | `filters`, `pre_filters`, `post_filters` |
| `accumulators` | accumulator の属性セット | `multiple` のサブフィールド |
| `multiple` | mapper+collector+separator の糖衣プリセット | `multiple` (文字列指定時) |
| `env_provider` | 環境変数解決 | `env` (env installer の lookup が利用) |
| `config_provider` | config ファイル読込 (パス → JSON 同型の階層オブジェクト。フォーマット・探索・マージは provider の関心、DR-050) | `config_key`, `type: "config_file"` (config installer の lookup が利用) |
| `installers` | 特殊語彙の展開装置 (糖衣展開 + 実行時能力の植え付け、DR-042) | `long`, `short`, `env`, `type:"dd"`, `commands[]`, `global`, `inherit`, `repeat`, `multiple`, `config_key`, `requires` / `exclusive_group` / `conflicts_with`, `alias` 等の特殊語彙 |

### 13.2 フィールド名で registry が暗黙決定

```json
{
  "type": "int",                   → types["int"]
  "filters": ["trim"],              → filters["trim"]
  "multiple": "append",            → multiple["append"]
  "env": "PORT"                    → env_provider
}
```

### 13.3 解決順 (全区分一様、DR-028 + DR-035)

```
definitions.X.name → registry.X.name → warn+フォールバック
```

ユーザのローカル定義が組み込みを shadow (前方互換)。

### 13.4 階層化された組み込み

- **コア**: 言語実装に絶対必要な最小セット (常に同梱)
- **標準**: よく使う機能 (デフォルト同梱、opt-out 可)
- **拡張**: 特定ユースケース (デフォルト未登録、明示 import が必要)

例: `mergeable` accumulator は拡張、明示 import で登録。

### 13.5 未登録の挙動

未登録の参照に対して:
- types: warn + string フォールバック (DR-021 と整合)
- 他: ランタイムエラーで「次の手」を明示

```
RuntimeError: Type "my-uuid" not registered.
Hint: Register: kuu(ast, { types: { "my-uuid": { parse: (s) => ... } } });
```

### 13.6 type 方言の上書き構造 (DR-040)

プリミティブ型を含む全 type は canonical → 言語DX → ユーザの3層で上書きされる:

- **canonical default**: kuu core が提供する最も寛容な仕様
- **言語DX default**: 各言語の慣習に合わせた狭め直し (registry レベル)
- **ユーザ差し替え**: definitions / registry のローカル上書き

方向性は2軸: 寛容 default を pre_filter で狭める方向、value_parser そのものを差し替える方向。バイナリサイズは tree-shake、再現性は単一ホスト内ロック + クロスホスト canonical 参照の2段で担保。

### 13.7 diagnose モード

`kuu.diagnose(ast)` で AST 走査時に未実装を全列挙する仕組み。

### 13.8 case 変換 (pluggable、DR-022)

wire format は snake_case 固定。各言語バインディングへの case 変換は pluggable:

- Python / Rust: snake のまま (ネイティブ)
- TS / MoonBit: camelCase 変換可 (差し替え可能)

「言語ごとに変換を固定」は新たな暗黙ルールになるため避ける。デフォルト変換器を置くが固定はしない。

### 13.9 AtomicAST レベルで未予約の周辺概念

以下は実装側で必要になりうるが、本仕様では予約フィールド名も挙動も持たない。AtomicAST はこれらの実体を直接運ばず、必要なら別 DR で確定する:

- **command の実行フック**: `type: command` の選択時に呼ばれる handler。フィールド名・registry 区分名は未予約。
- **動的補完生成**: 補完候補を動的に出す completer。フィールド名・registry 区分名は未予約。
- **default の動的生成**: 関数で default を返す機構。`default` フィールドに静的値を入れる用法のみ予約済みで、関数バリアントは未予約。
- **失敗時アクション属性**: 機構は DR-048 / §15.10 で確定済みだが、属性のフィールド名・installer 区分は未予約 (help / completion installer の設計と同時に確定する)。

installer が宣言語彙に関わる形は 2 種類ある (DR-056): **所有** (lowering 責務、1 語彙 1 所有者で排他) と**参照** (advisory read、自由 — help / completion installer が alias / hidden / deprecated を読んで表示・補完データを作る等)。参照読みの成果はパースの観測挙動 (効果列) に影響してはならない (副次成果物の構築のみ)。参照が許されるのは宣言層であって他 installer の lowered 産物ではない。

以下は未予約ではなく**責務外** (本仕様は将来も直接扱わない — 実装層・呼び出し側・外部ツールの関心):

- **サブコマンドツリーの動的拡張**: サブコマンドは定義に書かれた静的閉包の or のみ。`git foo` → git-foo バイナリ委譲のような plugin pattern・wildcard・catch-all は持たない。
- **post-parse validator**: cross-field 検証 (「--start は --end より前」等の任意ロジック) の AtomicAST フックは持たない。宣言的制約 (§9 の 4 種) はコアの遅延述語、それを超える検証はアプリが ParserContext を受け取って行う。
- **sensitive / secret**: AST は機微情報の概念を持たない。値のマスキングは実装層 (logger / diagnose 実装) の責務。
- **TTY / カラー / interactive**: AtomicAST は端末状態を知らない。出力レンダリングは実装側の責務。

これらは UsefulAST 上で各言語 DX がクロージャを保持する経路では既に実装可能だが、JSON シリアライズ可能な AtomicAST に対応する正規形は持たない。

---

## 14. ヘルプと特殊 type

### 14.1 help

```json
{"name": "help", "type": "help", "long": [], "short": "h", "global": true}
```

- type が `help` の要素は組み込み実装
- 起動時に ParserContext の help フラグを立てる
- パーサが完了時に help フラグを見て出力切替
- パース失敗時 (完全経路 0 本) も、候補経路で help が selected だったなら保持 Error に代えて help を表示する (失敗時アクション、DR-048 / §15.10)

### 14.2 version

```json
{"name": "version", "type": "flag", "long": [], "global": true}
```

- ただのフラグ
- 結果オブジェクトの `result.version` を見てアプリがバージョン出力
- AST にバージョン文字列を持たせない
- パース失敗時には何も出ない (結果がアプリに渡らないため)。失敗時にも version を出したいアプリは失敗時アクション属性を opt-in する (DR-048 / §15.10)

### 14.3 config_file (DR-050)

```json
{"name": "config", "type": "config_file", "long": [], "env": "MYAPP_CONFIG", "default": "~/.myapp.toml"}
```

- config ファイルのパスを取る要素の配線宣言。パス要素は普通の要素で、パス自体が値源ラダー (CLI > env > default) で解決される
- 読み込んだ階層オブジェクトが値源ラダーの config 席 (§11.4 の 3) に供給される。**対応付けはデフォルトで同型対応** (name スコープ階層 ↔ config 階層)、明示 `config_key` (link の固定パス DSL、ルートからの絶対パス) で上書き
- **config 値の期待型は要素の type**: string は CLI/env と同一の全段 pipeline (number/bool 要素へは parse 試行)、scalar (number/bool) は型一致なら post_filters のみ・**string 要素へは JSON 文字列化で受理** (寛容の双方向対称、数値は最短表現 `1.0` → `"1"`)、bool↔number の意味変換と構造不一致 (array/object ↔ scalar) は Error、array は分割済み pieces、object は同型再帰 (DR-050 §4)
- 依存順序: 経路確定 → config_file 値確定 → provider 読込 → config 席有効化 → 最終値確定 → 遅延述語。**config は構造 (matcher / 経路探索) に影響しない**。config_file 要素自身は config 席を持てない (循環禁止)
- committed なパス (CLI/env 明示) の読込失敗は Error、default 由来のパス不在は黙認
- 要素の `config` フィールド (§7.2 の階層継承設定) とは**別物**

### 14.4 visibility / deprecated (DR-058)

```json
"hidden": true       // help 一覧・補完候補の両方から除外。受理は不変
"deprecated": true   // 受理 + 起動時に ParserContext.warnings へ構造化警告。表示・文言はレンダラ
```

パース挙動 (CLI からの受理可否) には影響しない。deprecated の値は bool のみ。alias 要素 (§14.5) に付けばその入口限定で、「use <canonical> instead」の素材は alias の指す先から自動導出される。filter の warn (パース中の解釈警告、DR-021) とは別層。「--help-all で hidden も表示」等はレンダラの関心。

### 14.5 alias (DR-057)

```json
{"name": "port", "type": "int", "long": [], "short": "p"}     // canonical
{"alias": "port", "short": "n"}                                // -n → port の別入口
{"alias": "paths", "name": "files"}                            // --files (canonical の long/variant を files で再導出)
{"alias": "checkout", "type": "command", "name": "co"}         // git co
```

- `alias` は ref (構造継承) / link (値同期) に続く**参照ファミリーの 3 人目** (別入口になる)。独立要素として書き、入口形式は自分の宣言で決まる
- 効果は canonical の実体セルへ (link 同型)。**結果キーは canonical のみ**。発火入口は ParserContext.selected_names / 内部 id で特定
- **継承原理**: name から導出される入口 (long 配列 = variant 込み、command の name 照合) は alias の name で再導出される。明示綴り (short) は継承しない (自分で書いたものだけ)。値源・結果キー・制約は実体側のまま
- help では canonical の行に併記 (独立一覧しない)。表示活用は help / completion installer の参照 (§13.9 の所有/参照)

---

## 15. パース挙動

### 15.1 パース意味論の契約 (DR-038)

**パーサの成功条件は「入力を全消費する完全解決経路がちょうど1本ある」こと。**

- 0本 → パース失敗 (保持された Error を表示。失敗時アクションが観測されていればそちらを発火、§15.10)
- 1本 → その経路で確定
- 2本以上 → ambiguous エラー

「解決」には遅延述語 (制約) の充足を含む (§15.9、DR-047)。「最長一致」をプリミティブな規則として持たない。長い経路が短い経路を抑える挙動は、入力を全消費する経路のうち短いものが「未消費トークンが残るため失敗」となる結果として創発するだけで、規則ではない。

経路の同一性は**実体への観測可能な効果列**で判定する (どのエントリ経由かは問わない。道順が違っても効果が同一なら 1 本と数える。DR-038)。

### 15.2 実装契約: bounded path-search (DR-038)

上の意味論を素直に実装する経路は、AtomicAST 上を bounded path-search する形になる:

- 候補経路を列挙し、入力を全消費して成功する経路を集める
- 集めた経路数 (0 / 1 / 2+) で結末を決める
- 探索コストは AtomicAST の構造で bounded (option/positional/commands の組合せは有限)

旧 greedy-commit ループ (枝内消費の最長一致で commit → 後戻りなし) は本契約の置換対象。

### 15.3 解けた枝の数による結末 (DR-037)

or 等の選択構造での結末は §15.1 と整合する形:

| 解けた枝の数 | 結末 |
|---|---|
| 0個 | 全体失敗 (保持された Error を表示) |
| 1個 | その枝で確定 (他枝の Reject/Error は捨てる) |
| 2個以上 | ambiguous エラー |

「解けた」= filter Error 含めて全段が通った枝。filter Reject は静かに脱落 (エラー保持しない)、filter Error は失敗時の表示候補に保持。

### 15.4 ambiguous の例

option と positional の境界をまたぐ複数経路が同じ入力を全消費できる場合は ambiguous:

```
入力: --color 255 0 0 ("0" が実在ファイル)
経路A: --color R G B (option 3消費) + positional 0個 → 全消費成功
経路B: --color <name> (option 1消費) + positional 2個 → 全消費成功
両方とも全引数消費 → ambiguous
```

枝内の消費長違いも同様: 短い経路で全消費できれば候補、長い経路でも全消費できればもう1候補、どちらか1本に絞れなければ ambiguous。

### 15.5 露出キーの一意性検査は実行時 (DR-021)

定義時に潰さず、入力経路として解決できる限り許す。実際に同一入力で両方が露出して衝突した時のみ ambiguous エラー。

露出キーの型不一致は union (嫌うなら export_key で分離、強制せず指針)。

### 15.6 静的バリデータは warn のみ、実行場所は開発時 lint (DR-021)

潜在的な問題は静的に検出して warn できるべきだが reject はしない:

- 露出キーが衝突しうる構造 → warn
- 背骨なし内部で無制限の string repeat の後にトリガ付き構造が続く → 丸呑みの潜在を warn

warn はする、reject はしない、の二段構え (利用者を信頼)。実行場所は開発時ツール (kuu linter / §13.7 diagnose) であり、実行時 bundle には同梱しない。停止条件の設計は利用者の設計領域 (kuu は部品・example・lint を提供し、定義の自動補正はしない)。

### 15.7 AtomicAST の同定は垂直スライスで (DR-039)

AtomicAST はボトムアップ kuu エンジンのノードグラフを宣言的にシリアライズした形として削り出す。三層アーキテクチャ (ノード ADT / 評価器 / 結果ビルダー) と name 駆動の結果ビルダーが本契約を支える。AtomicAST の正規形・JSON Schema は実装と同時に詰める (単独確定しない)。

### 15.8 トークン読みと先食い (DR-041)

`--key=value` 分解や連結 short (`-abc`) のようなトークン境界の再解釈は、installer (DR-042) が植え付ける matcher の実行時意味論として定義される:

- **読みは枝**: matcher は 1 トークンの解釈候補 (読み) を全列挙し、絞り込まない。§15.1 の完全経路一意性は読みの選択を含む全空間に適用される
- **規則はスコープ従属**: matcher の構成はスコープごと。argv 全域の前処理パスは存在しない (`--` の前後で挙動が変わるのは経路上の位置依存だから)
- **背骨と先食い**: greedy は構造位置に縛られず、宣言スコープの背骨 (positional 進行の消費点列) 上のどこでも発火できる (出現回数は repeat の軸で直交)。背骨上で greedy に読めるトークンは素通し読みの枝を生成しない。command 部分木は新しい背骨 (祖先の greedy は届かない、越境は global installer の構造コピー)、greedy 内部と dd 継続は背骨なし (一体消費、getopt 同型)
- **同一トリガは最小スコープ優先**: global コピー等で衝突したら内側の宣言が食う (lexical 解決のパース時適用、判定は要素名でなくトリガ literal)。shadow は配下 subtree 全体に及ぶ — 中間 command が shadow したトリガは孫スコープにもコピーされない (lexical 連鎖)。同一スコープ内の重複は静的 warn + 実行時 ambiguous
- **早閉じ抑制**: 背骨を持つスコープは、自分の背骨で読めるトークンが次に控えている間は完了できない (= 読める最内スコープが勝つ)。command 部分木の完了後は親の背骨が再開する (sever 規則は持たない)
- **repeat の取り分は宣言的選好で確定**: greedy (既定、長い方から) / `lazy: true` (短い方から) の順に試し、最初に完全経路へ到達した取り分で確定 (regex 量指定子と同型、下流失敗で後退)。複数の閉包が並ぶ場合は先の閉包の選好から。選好は取り分次元の中だけで働き、構造の異なる完全経路との ambiguous 検出は保存される (DR-043)
- **prefix ガードなし**: 未定義の `-x` は素通しで positional に落ちる。形が option 風であることを理由に拒否しない (拒否したい場合は方言で opt-in)
- **dashdash**: dd は greedy 面のトリガ兼消費者 (matcher は素の exact 一致) に lowering される。`--` が値に食われないのは先食いから、以降の option 抑制は内部一体則から導出される (特別規則ゼロ、DR-041/042)

### 15.9 制約評価のレイヤリング (DR-047)

制約の検証は 2 レイヤに分かれる:

- **即時述語**: トークン単体で判定可能な検証 (型パース、regex、in_range 等)。filter (§8、DR-037) の領域
- **遅延述語**: 経路全体の最終状態を見る検証 (required / requires / exclusive_group)

遅延述語は**完全解決経路の成立条件**である (§15.1 の「解決」に含まれる)。制約を満たさない経路は完全経路と数えず、事後検証層は持たない。述語違反は Error (DR-037 の「全段」に遅延述語を含める) としてエラーを保持し、完全経路 0 本時に表示する。評価対象は値源ラダー (§11.4) 充填後の最終状態 (空 argv も特別扱いなし)。

判定入力は制約の意味論から決まる:

| 制約 | 述語の種類 | 判定入力 |
|---|---|---|
| `required` | 値述語 (「アプリは値を必要とする」) | 最終状態の値の有無 (default 込み) |
| `exclusive_group` | 指定述語 (「同時に指定するな」) | committed (同グループで最大 1 つ) |
| `conflicts_with` | 指定述語 (名指しのペア排他、対称、DR-055) | committed 同士の衝突 |
| `requires` | 混合 | トリガ側 = committed、目的語側 = 値の有無 |

帰結: 構造の異なる複数の完全経路のうち制約を満たすものが 1 本だけなら、ambiguous ではなくその経路で確定する — 先食い・早閉じ抑制・shadowing と同じ「経路間の優先規則でなく成立条件の精密化で 1 本に絞る」原理 (DR-047)。unset (`--no-x`、DR-045) で取り消した要素は exclusive の衝突にも requires のトリガにも数えない。

### 15.10 失敗時アクション (DR-048)

early-exit は存在しない — パースは常に完走し (§15.1)、help 等の挙動は完了後の表示選択として定義される:

- **成功時**: 結果 / ParserContext を見てアプリ (または kuu の help 実装) が動く。`--help --version` が両方 committed でも衝突はない (どちらに反応するかはアプリの領分)
- **失敗時** (完全経路 0 本): 候補経路のいずれかで失敗時アクション持ち要素が selected だったなら、保持 Error の表示に代えて発火する (help なら help 表示)。**候補経路は dead end (途中で失敗した partial 経路) を含む** — `mytool --help abc` (abc が型失敗) でも help が発火する。複数観測されたら **argv 上の消費位置が最小のもの** (先勝ち、効果列 = DR-045 の順序。DR-015 のあと勝ち mutation と同じ時計)。枝の深さ・走査順は座標にしない
- **ambiguous (2+ 本) では発火しない**: ambiguous の本体は競合解釈の提示であり、help で画面を流さない。help 入口が定義されていれば、0 本 / ambiguous 両方のエラー末尾に `--help` への誘導行 (1 行) を出す — 表示の大きさで発火範囲が変わる 2 段構え (誘導行の具体仕様はエラー報告 F-043 / help installer の関心)

失敗時アクションは汎用属性で、`type: "help"` プリセットが同梱する (属性のフィールド名は §13.9 で未予約)。

### 15.11 parse_definition の失敗挙動 (DR-054)

定義時検査の境界基準: **lowering が構成できない / 全入力で壊れる = Error (parse_definition 失敗)、一部入力で驚きうるだけ = warn (定義は通す)**。

- Error: 未知の特殊語彙 (DR-042①)、不正な値域、不在・循環の ref/link、ゼロ進捗再帰 (DR-043)、config 循環 (DR-050)。v1 の Error 検査は構文・値域・参照の単純検査まで — 制約間の意味矛盾 (制約グラフ解析を要するもの) は warn (lint) に置く
- warn: 露出キー衝突の可能性・同一トリガ重複・丸呑み構造 (§15.6 のとおり開発時 lint / diagnose の関心、実行時 bundle 非同梱)。DR-021 の「warn はする、reject はしない」は warn 層にのみ適用される
- 返値: `{outcome: "success", atomic} | {outcome: "definition-error", errors: [{element, kind, message, hint}, ...]}` — エラーは全列挙、hint は §13.5 の「次の手」型

### 15.12 パース結末の構造 (DR-053)

parse() の返値は `outcome` タグ付きの discriminated union (言語 DX が例外等へ変換するのは自由):

```
{outcome: "success",   result: {...}, context: <ParserContext>}
{outcome: "failure",   errors: [...], fired_action?, help_entry?, tried_triggers?}
{outcome: "ambiguous", interpretations: [...], help_entry?}
```

- **errors は全保持の配列** `{element, argv_pos, kind: parse|filter|constraint, message}`。primary = argv 位置最深 (furthest failure、同深は全て)。表示本数はレンダラの関心
- **interpretations は全解釈の列挙**、各解釈は結果オブジェクト形のビュー (効果列は詳細モードの関心)
- `help_entry` (誘導行の素材、§15.10) / `tried_triggers` (Did you mean の素材、近接マッチは DX 層) はフィールドとして載せ、文言はレンダラ
- failure への partial ParserContext は optional 予約 (中身の形は未確定)
- 定義時のエラーは §15.11 の definition-error であり、本節の failure (実行時パース失敗) とは別レイヤ

---

## 16. 用語

| 用語 | 説明 |
|---|---|
| **UsefulAST** | 人間が書く層 (各言語 DX コード) |
| **AtomicAST** | パーサ正規形 (シリアライズ可能) |
| **parse_definition()** | UsefulAST → AtomicAST 変換 |
| **scope** | name で作られる結果スコープ = lexical スコープ |
| **key name** | 結果オブジェクトのキー (DR-024) |
| **def name** | definitions のキー (参照名) |
| **value_name** | help/usage の値プレースホルダ表示 |
| **committed** | ユーザが明示指定したか (ParserContext のメタ) |
| **selected** | この要素のいずれかの入口がマッチしたか |
| **inheritable** | 祖先 scope からも CLI 上で書ける |
| **`@base`** | フィールドのベース値展開 sentinel |
| **peaceProcessor** | 各 piece を T に変換するチェーン (pre+parse+post) |
| **accumulator** | 発火ごとの piece の積み方 ((piece, processor, prevs) → T[])。registry 区分 accumulators と同語 |
| **id** | 参照識別子の軸。ref/link の解決対象、結果に出ずスコープも作らない。未指定なら name が兼ねる (DR-046) |
| **collector** | 累積後の最終変換 (T[] → U) |
| **separator** | 1引数を分割する区切り文字 |
| **Reject** | filter/枝が「私のものではない」と返す (脱落、保持なし) |
| **Error** | filter/枝が「私のつもりだが値が不正」と返す (保持、表示候補) |
| **ambiguous** | 入力を全消費する完全解決経路が2本以上ある状態 |
| **bounded path-search** | DR-038 の実装契約。AtomicAST 上で候補経路を有限列挙し、全消費経路の本数で結末を決める |
| **canonical default** | type の3層上書き構造 (DR-040) の最寛容ベース |
| **installer** | 特殊語彙 (long/short/env/dd 等) を所有し、糖衣展開と実行時能力を植え付ける registry 装置 (DR-042) |
| **matcher** | greedy 面のエントリがトークンを読む機構。素の exact 一致が最小形 (DR-041) |
| **再解釈 matcher** | トークン境界を再解釈して複数の読みを生成する matcher (eq-split / cluster 等)。installer が名前付きデータとして植える (DR-041/042) |
| **読み (reading)** | matcher が 1 トークンに対して列挙する解釈候補。各読みは path-search の枝 (DR-041) |
| **先食い** | 背骨上で greedy に読めるトークンの素通し読みの枝を生成させない規則 (DR-041) |
| **背骨 (spine)** | スコープの positional 進行の消費点列。greedy は宣言スコープの背骨でのみ発火する (DR-041) |
| **repeat** | 構造閉包 (反復)。min/max は枝生成に効く構造制約、取り分は greedy 既定 / `lazy: true` の宣言的選好。repeat installer が ref 再帰へ lowering する (DR-043) |
| **greedy 面 / positional 面** | スコープ内の順不同トリガ要素群 / 位置消費要素群。positional 面は多孔質、greedy 内部は一体消費 (DR-041) |
| **即時述語** | トークン単体で判定可能な検証。filter の領域 (DR-037 / DR-047) |
| **遅延述語** | 経路全体の最終状態を見る検証 (required / requires / exclusive_group)。完全解決経路の成立条件 (DR-047) |
| **失敗時アクション** | 完全経路 0 本の失敗時、候補経路で selected なら保持 Error に代えて発火する表示動作 (help 等)。early-exit は存在しない (DR-048) |
| **config_provider** | config ファイル読込の registry 単一スロット。(path) → JSON 同型の階層オブジェクト \| null。フォーマットは provider の関心 (DR-050) |
| **config_key** | config 階層への明示対応 (link の固定パス DSL、ルート絶対)。未指定なら name スコープ階層との同型対応 (DR-050) |
| **absent** | 値の無い要素は結果オブジェクトにキー自体が出ない (in-band null 不使用)。反復系・default 持ち・required は absent にならない (DR-051) |
| **export_key** | 結果キー軸の明示指定 (未指定 = name 由来)。null / "" = 結果キー軸なし → nameless 同化の透過。値の伝搬は止まらない (DR-052) |
| **alias** | canonical 実体への別入口 (参照ファミリー: ref = 構造継承 / link = 値同期 / alias = 別入口)。結果キーは canonical のみ (DR-057) |
| **所有 / 参照** | installer が宣言語彙に関わる 2 形。所有 = lowering 責務 (排他)、参照 = advisory read (自由、観測挙動に影響不可) (DR-056) |
