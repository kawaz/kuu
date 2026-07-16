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
- **入力は前処理済み `Array[String]`**: `@file` (レスポンスファイル) の展開や stdin 読込は呼び出し側の責務。kuu は args をトークン列として受け取る。
- **補完スクリプト生成は本仕様の射程外** (kuu プロダクトとしては標準提供): 各 shell 向け補完関数と登録コマンドの出力 (`app completion bash` 等) は kuu の completion 生成器の責務で、shell ごとの作法はそこに封じる。本仕様が確定するのは生成器の下請け契約 (complete API と候補構造、§15.13) まで (DR-060)。
- **仕様の成熟度**: 本仕様は垂直スライス実装 (DR-039) との共設計段階にあり、全域で破壊的変更を許容する (ドラフト期)。確定版発行の手続き・条件は DR-068 (lifecycle) / DR-069 (準拠プロファイル) / DR-108 (spec リリースプロセス) が定める — ドラフト期の間も `VERSION` ファイルによる `0.x.y` バージョンを発行する (GitHub Release は prerelease、DR-108 §2)。

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
  "env": "<環境変数名>",
  "global": true,

  "value": ...,
  "default": ...,
  "values": [...],
  "multiple": ...,
  "repeat": ...,
  "optional": false,

  "value_filters": [...],
  "piece_filters": [...],
  "final_filters": [...],
  "accum_filters": [...],

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
  "deprecated": false,

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

値源ラダー (§11.4) を回しても値が無い要素は、結果オブジェクトに**キー自体が現れない** (in-band の null は使わない)。absent が起きるのは値源を持たない非反復要素のみ — 反復系 (repeat / multiple / `optional: true` 糖衣を含む — optional は repeat {min:0, max:1} なので反復系そのもの) は 0 回発火でも `[]` が出る (§6.1)、flag / count は default を同梱、required 要素は値が無ければ経路不成立 (§9.1)。**結果キーを持つスコープ生成要素 (command 含む) は、選ばれたら子が全部 absent でも空 kv `{}` を持つ** (スコープ生成 = 値の発生、反復系の `[]` と同型)。選ばれなければ absent (DR-052)。言語バインディングの型導出: required / default あり / 反復系 → `T`、それ以外 → `T?`。**null は kuu の値空間に存在しない** — config の JSON null は「供給なし」(DR-050)、明示的な取り消しは unset 効果 (DR-045)。absent 要素のメタ (committed / selected / source) は ParserContext から引ける (§0.3)。

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
type: "css_color" → ユーザ定義型 + value_parser (両方持ちうる)
```

definitions.types 内の構造テンプレにも記法糖衣 (§5.3 の values → or 展開等) は同様に適用される (A 群は配置文脈非依存、LOWERING §A.4/§C.4)。`type: X` 参照は展開済み構造を継承する (§3.5 の合成順)。enum 的テンプレ (`{values: [...]}`) への未定義値は or 全枝の綴り不一致 (Reject) となり完全経路 0 本で失敗する — 候補提示の素材は tried_triggers (§15.12)。value_parser による受理制限とは別経路 (values は構造、value_parser は葉の字句)。

### 3.2 解決順 (前方互換)

```
definitions.types.X → registry.types.X → warn+string フォールバック
```

ユーザのローカル定義が組み込みを shadow する。組み込み型の追加がユーザ定義を壊さない (前方互換)。未登録の場合は warn を出して string にフォールバック (DR-021 の「warn はする、reject はしない」と整合)。

### 3.3 type の語彙

**値プリミティブ (葉)**: `string` / `number` / `int` / `float` / `bool` / `path` / `file` / `dir` / `datetime` / `exact` / カスタム

数値 3 種の関係: `number` は汎用数値 (整数も小数も受理)。`int` は整数制約付きで **値空間判定** (DR-075): トークンを number として parse し **値**が整数なら受理する (`"3.0"`→3 / `"1e3"`→1000、整数構文に限らない)。真に fractional な値 (`"2.5"` 等) の帰結は `int_parser` (= `builtin/int_parser`、DR-094) factory の config キー `int_round` が決める — canonical default `error` (reason `not_an_integer`)、丸めモード (`floor`/`ceil`/`trunc`/`away` × {非 half, half} + `half_even` の 10 種、DR-075) を opt-in で選べる。`float` は小数を明示する意図の別名で、**受理域は `number` + inf** (number は inf を受けず float だけが受ける、下記 inf 規定)。**整数を意図する要素には int を使う** — config の JSON number が非整数なら int_round に従い、文字列化の表現揺れ (DR-050 §4) も生じない。

canonical の数値字句は **言語中立で再現可能な実用寛容の 10 進固定字句** (DR-074、「最小」でも「JSON number 同型」でもない):

- 先頭符号 `[+-]` 両方受理 (leading `+` 可、`+5`=5)。先頭 0 は **decimal** (`007`→7、octal 化は opt-in のみ)。小数点のみ `.5` / 末尾小数点 `1.` を受理。指数 `1e3`/`1E3`。桁区切り `_` を **default で受理** (config `number_thousand_sep` default `["_"]`)。
- 基数 prefix (`0x`/`0o`/`0b`) と hex float (`0x1.8p3`) は **`number_allow_base_prefix` の統合 opt-in** — canonical (default false) では `0x1F` も `0x1.8p3` も Error。有効時は `p`/`P` 任意 (`0xff`→255 も可)。`int` 型は値空間判定 (DR-075) なので opt-in 時 `0x1.8p3`=12 は整数値として受理、`0x1.8p0`=1.5 は fractional 値として int_round に従う (10 進の `2.5` と同じ規則)。
- **inf**: `float` 型のみ受理 (`inf`/`infinity`/`Inf` を case-insensitive で kuu 固定)、`number` 型では Error。言語 DX が float の inf 非対応を選ぶのは許容。**nan**: 両型 Error (opt-in も置かない)。**型 suffix (`1.0f`/`100n`) は非採用** (float/double は type で、Big 系は bigxx 型で)。`,` 系桁区切りは方言、単位 suffix は型の領分 (duration/size 等)。
- **inf の JSON serialize (DR-092)**: report に書けるすべての float 値位置 (result / effects / config 由来値) で、inf は値本来の位置に **文字列 sentinel** `"Infinity"` / `"-Infinity"` を置く (protobuf3 canonical JSON と同型、`+Infinity` のように先頭符号は付けない)。parse 受理語彙 `{inf, infinity}` (case-insensitive) は `Infinity` を variant として既に含むため、serialize と parse の語彙差は round-trip を壊さない。非整数 float 一般の canonical serialize は **shortest round-trip 表現** (Ryu/Grisu 系、Rust `f64::to_string` / Go `strconv` default / Python `repr` / JS `Number.toString` と整合)。境界値の実装間差は fixture で precision-critical な値を直接 pin しない運用で回避する。
- **anchored 契約**: value_parser は **token 全体一致**であり prefix 消費 (C `strtod` の endptr 式 = 読めるところまで読んで残りを返す) を **しない** (DR-074 §5、DR-041 §5 の prefix ガード非採用と対)。負数・文字系値 (`-5`/`-inf`/`-1e3`) の消費は **arity 駆動** (宣言から arity を知るので次トークンを無条件に値消費)、short cluster 読みとの衝突は matcher の枝生成 + 完全経路一意化 (DR-038/041) で決着し読みモード指定は持たない。

**bool** の canonical 受理語彙 (DR-074、config キー名は DR-100 で `bool_` prefix 化): `bool_true_values` default `["true","1"]` / `bool_false_values` default `["false","0",""]` / `bool_case_insensitive` default `true`。空文字 `""` は false 側 (env の `FLAG=` 対応、`bool_false_values` の要素として表現)。`yes`/`no`/`on`/`off` は canonical 外 (Norway problem 回避、config で opt-in 追加可)。不正 bool 文字列は Error (silent 変換しない)。**bool↔number**: 文字列 `"1"`/`"0"` の parse (String→bool) は可だが、number 型の値 `1` からの型変換 (config native number→bool) は Error (DR-050 の非強制規定は不変)。

exact 照合は **codepoint 単位・正規化なし** (NFC は方言)。path / file / dir はバイト列受理 (検証は filters opt-in)。

bytes / binary 型は組み込みに持たない。必要なら拡張 type (registry 登録) で提供する。

**糖衣プリセット**: `flag` / `count` / `count_or_set` / `command` / `help` / `dd` / `tty` 等
- `flag` = bool + default:false + 起動で true
- `count` = number + default:0 + increment accumulator (値は取らない — `--verbose=3` は読みが立たず素通し)
- `count_or_set` = count + optional 値スロット (repeat {min:0,max:1})。`-v` は increment、`-v 3` / `--verbose=3` は set。set / increment の別は取り分選好 (DR-043) が確定する。標準層 (DR-040)
- `command` = name でスコープを作り、name の完全一致でトリガ
- `help` = 起動時アクション
- `tty` (= `builtin/tty`、DR-099) = bool + 暗黙 default = tty 観測の fold。configurable factory config は `tty_stream` (`"stdin"｜"stdout"｜"stderr"`、必須 — 未指定は definition-error) / `tty_cygwin` (bool、既定 true)。long/short/env 席の宣言可否・multiple・filters・required 充足は素の bool と完全に同一 — preset が同梱するのは暗黙 default のみ (詳細は §12b)

これらは独立の type ではなく、属性プリセットへの名前。version は専用 type ではなく単なる flag。

### 3.4 type の方言と canonical default (DR-040)

プリミティブ型 (number/bool/...) も方言を持つ。3層の上書き構造:

```
canonical default (kuu core 提供、言語中立で再現可能な固定字句)
  ← 言語DX default (各言語慣習に合わせた差分)
  ← ユーザ差し替え (ローカル definitions / registry 上書き)
```

canonical は「最も寛容」でも「最小」でもなく、**言語中立で再現可能な、実用寛容を含む固定字句** (DR-074、G8 の文言矛盾解消)。number は §3.3 の実用寛容 10 進字句、bool は §3.3 の `true/1` ↔ `false/0/""`。方言はこの固定点からの逸脱 (狭める / 広げる) を config で表す。

方言の軸は2系統:

- **寛容 default + pre フィルタで狭める/正規化**: canonical の寛容 parser を使い、入力前段で正規化や受理範囲制限を入れる方向。
- **value_parser 差し替え**: registry の types[X] そのものを置き換えて狭い仕様にする方向。

方言バリエーションは value_parser クロージャの量産でなく **configurable factory** で表現する (DR-061): registry 登録値を `{"name": "<factory名>", "config": {...}}` の形にし、動作差分を純データ config で与える (`number_parser`: `number_thousand_sep` default `["_"]` / `number_allow_base_prefix` default `false` / `number_leading_zero` default `"decimal"`。`bool_parser`: `bool_true_values` default `["true","1"]` / `bool_false_values` default `["false","0",""]` / `bool_case_insensitive` default `true`。`int_parser` (= `builtin/int_parser`、DR-094): `int_round` default `"error"` (非整数値の丸めモード 10 種、DR-075)。DR-074 §4)。**canonical default = factory の default config** であり、標準層 opt-in・方言は config キーの列挙になる。config は純データなので定義とともにシリアライズされ、方言構成の再現性が wire 上で担保される。factory config が調整するのは parse 相 (String → T) の内部のみで、相の間の変換・検証は filter の領分 (§8.3、DR-061 §5 の「相」線引き)。**config キーの命名規約 (DR-100)**: canonical のキー名は factory 名由来の prefix を持つ (`number_*` / `int_*` / `bool_*`)。綴りの好み (prefix 外し等) は正準を動かさず、ユーザランドの語彙糖衣 alias 機構 (vocab_alias installer 構想) が吸収する。

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

- **options**: ハイフン起動、順不同。dd (`{"type": "dd"}` — name はプリセットが `"--"` を供給し明示で上書き可、DR-064 §5) もここに置くのが canonical (DR-064 — 順不同・greedy 面住人という分類の一致。配置は挙動に影響せず、usage の `[--]` を operands 直前に出すのはレンダラの慣習)
- **positionals**: 順序で消費
- **commands**: サブコマンド糖衣 (下記)

### 4.2 commands は糖衣 (command installer が展開)

```json
"commands": [
  {"type": "command", "name": "commit", ...},
  {"type": "command", "name": "clone", ...}
]
```

- commands と素の positionals は排他。command 名の完全一致でマッチすればそちらが選ばれる — 排他は専用規則ではなく完全経路の一意性 (§15.1) と先食い (§15.8) から創発する
- 具体的な lowering は command installer (§13.1、LOWERING §B.5): greedy マーク付き exact トリガ衛星 + 新しい背骨を宣言する部分木
- commands 不在時は何も展開しない

### 4.3 command 一級扱い、内部正規形は同型 (DR-017)

定義時は command を1級として扱う (commands[]、`type: "command"`)。パース時 (AtomicAST) は同型要素 (exact + or/seq) に展開され、パースループは「name でトリガしうる要素」という同型表現で動く。

### 4.4 復帰・途中分岐は構造プリミティブで組む (DR-020)

「サブコマンド消費後に親へ復帰」「途中分岐」「再帰」などの専用概念は持たない。これらは構造プリミティブ (exact/or/seq/primitive) と repeat (構造閉包、§6.1) の組み合わせでユーザが組む:

```
repeat: true の要素, children: [
  {exact: "--command"},
  {or: [...サブコマンド群]}
]
```

パース成否は DR-038 の完全経路一意性で判定される。

### 4.5 「実体だけノード」 (DR-030)

入口属性 (long/short/positional 位置) を持たないノードは、CLI 引数では起動されないが結果に出る「実体だけ」のノード。

```json
{"name": "timeout", "type": "number", "value": 30}
{"name": "api_key", "type": "string", "env": "API_KEY"}
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

values (or 展開) は §7.1 (入口宣言 long/short) / §11.4 (値源ラダー default/env/config、DR-031) と直交する軸であり、同一 node に同居できる — long/short は入口の有無、値源ラダーは値の充填元、values/or は消費構造そのものを決めるという別レイヤの関心事であり、排他になる理由がない。

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
multiple: {accumulator: "append", collector: "to_set"}
```

multiple registry (DR-036) からプリセットを引く。

### 6.2 multiple 経路の構造 (DR-034)

```
入力: raw_string
  ↓ separator (任意、String → String[])
[piece1, piece2, ...]
各 piece に対して pieceProcessor:
  piece (String)
    ↓ piece_filters (FilterChain[String, String])
    ↓ parse (types registry の value_parser、String → T)
    ↓ value_filters (FilterChain[T, T]、各 piece 検証)
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
- accumulator: override (prevs 無視、`[processor(piece)]`)
- collector: unwrap_single (`[t] → t`)

結果として pieceProcessor 一本で終わる。仕様の説明・実装が1本で済む (最適化として fast path は可)。

separator も §6.2 のパイプライン内にのみ存在する部品であり、multiple を宣言しないノードには separator が無い — **bare separator は仕様概念として存在しない** (wire form も separator を multiple object の中にのみ持つ、DR-034/036 / schema/wire.schema.json の multiple 詳細形)。単一トークンを分割して積む canonical form は `multiple: {accumulator: "append", separator: ","}` (詳細形 object は accumulator を明示する、DR-036 / schema/wire.schema.json は object 形を `{accumulator, collector?, separator?}` と規定)。

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
  "long": true,       // → --verbose (糖衣 = [":set"])
  "short": "v"        // → -v
}
```

`long` は二形 (DR-071): **bool 糖衣 | variant DSL 配列 (正規形)**。

- 正規形は配列で、**各要素が long 入口を 1 個生む**: `:set` (prefix 空) = 主入口 `--<name>` (値スロット)、`"no:set:false"` 等 = variant 入口 (§7.3)
- `long: true` = `[":set"]` の糖衣。**absent = `false` = `[]` = 入口なし (全て同義)** — presence を absent/空の区別に載せない (省略 = default の構造等価、DR-063 §4)
- 主入口なしで variant のみ (`long: ["no:set:false"]` → `--no-verbose` だけ) も表現できる
- `short` 文字列の各文字が個別ショートオプション (short は variant 概念を持たず不変)

### 7.2 long_prefix / short_prefix (config)

階層継承可能な設定として `config` フィールドに:

```json
{
  "name": "mycli",
  "config": {
    "long_prefix": "--",
    "long_eq_sep": "allow",
    "short_prefix": "-",
    "short_attached_value": "allow",
    "short_combine": true,
    "env_prefix": "MYAPP",
    "env_auto": false
  }
}
```

子要素は親の config を継承、上書き可能。子要素は command scope に限らない — 個々の `options` / `positionals` 要素自身も `config` オブジェクトを持て、その要素だけスコープの値を上書きできる (要素単位 override、DR-049 §4 の `env_prefix: ""` 例と同機構)。

`long_eq_sep` (`"require"｜"allow"｜"deny"`、既定 `"allow"`、DR-096 §1): long の eq 分割形 (`key=value`) と space 分割形 (`key value`) の入口をダイヤルする。`"require"` は eq 分割形のみを受理し別引数での値供給を拒否 (DR-091 §3)、`"allow"` は両方を受理、`"deny"` は eq 分割 matcher を生成せず space 分割形のみを受理する。`long_prefix: ""` (空 prefix) は無条件に合法 — bare な名前一致トリガ (`height 168.5` 型) と素の operand の衝突は先食い規定 (DR-041、トリガとして読めるトークンに positional 素通し枝は立たない) が option 優先で決定的に解決する。リテラル渡しは dd (`--`)。`"require"` は衝突を定義側で排除したい場合の解決手段の一つ (eq 必須なら `=` を含むトークンだけが long 候補) であって合法性の条件ではない (DR-096 §3.3)。3 値 enum のため「eq 必須かつ eq 禁止」のような矛盾する組合せはそもそも構文的に表現できない (illegal states unrepresentable、DR-096 §1)。

`short_attached_value` (`"require"｜"allow"｜"deny"｜"last_only"`、既定 `"allow"`、DR-096 §2): 値持ち short の付着形 (`-O2`) と space 分割形 (`-O 2`) の入口をダイヤルする。`"require"` は付着形のみを受理し space 分割形の読み枝が立たない (gcc/clang の `-O` / `-W` 型)、`"allow"` は両方を受理 (DR-041 §4 の値スロット一般規則)、`"deny"` は付着読みの枝を生成せず space 分割形のみを受理する。`"last_only"` は付着読みを「残り全部を丸取りする形」だけに制限し (付着の分割点を列挙しない、GNU getopt 慣習の strict 再現)、space 形は生きる。ダイヤルが制御するのは当該 entry の 2 形の読み生成だけで、単独発火かクラスタ内か・クラスタ内の位置は条件にならない (DR-096 §3.1)。クラスタ読みがトークン末尾に達した entry は次トークンから space 供給を受けられる (`-abp 80` の `p` が `"80"` を取る) — これは space 形の定義の帰結であって位置条件ではない。値スロットを持たない要素 (flag/count) にはダイヤルが届いても inert (DR-096 §3.2)。gcc/clang は per-option でこのダイヤルが分かれる (`-O2`/`-Wall` は attach-only、`-I`/`-l` は両対応) ため、scope 既定とは別に要素単位 config override (DR-049 §4 と同機構) で個々のオプションに指定する。

`short_combine` (bool、既定 `true`): 複数 short オプションを 1 トークンに束ねるクラスタ読み (`-ab` = `-a -b`) を枝として列挙するか。`false` はクラスタ読みのみを禁止し、単独発火と値の直接付着 (`-p80`) には影響しない — 値付着の制限は独立した方言パラメータ `short_attached_value` (DR-096 §2) の管掌であり、`short_combine` はあくまで複数 entry が同一トークンを分け合う行為だけを指す (DR-014「-abc の結合許可」)。gcc の `-O2` / `-Wall` 型 (値付着はするがクラスタリングはしない) を表す方言パラメータ。`short_attached_value` はクラスタ内でも同一に効く — ダイヤルは entry の付着読み / space 形読みの生成だけを制御し、クラスタ内の位置は条件にならない (DR-096 §3.1)。

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
| `set` | **なし** = 値スロット (主入口 `:set`。非消費 type では type 相応の固定値供給、DR-071) / 1個以上 = 固定値セット | 値の書き込み |
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

- **pieceProcessor 内**: 各 piece に対する変換・検証
  - piece_filters: `FilterChain[String, String]` (trim 等)
  - parse: `String → T` (types registry の value_parser、暗黙)
  - value_filters: `FilterChain[T, T]` (in_range 等、各 piece に効く)
- **確定した最終セル値 / 累積結果に対する変換** (DR-102): accum 要素 (`multiple`/`repeat`/`separator` のいずれかを宣言、DR-102 §1 の `is_accum_elem` 判定) かどうかで対象が分かれる
  - `final_filters`: `FilterChain[T, T]` (非 accum 要素、確定した最終値に一様に効く)
  - `accum_filters` (collector 相当): `FilterChain[T[], T[]]` (accum 要素、累積後の配列に効く)

両者は位置が違うので自然な順序で合成 (parse 後 → 各 piece の value_filters、確定後 → final_filters/accum_filters)。

**filter 名の未登録は definition-error** (kind=`unknown-vocab`、DR-101): `value_filters` / `piece_filters` / `final_filters` / `accum_filters` の 4 属性に指定された filter 名 (§8.4 DSL の `<name>`、DR-094 の ns 付き識別子 / bare は `builtin` ns の糖衣) が filters registry の descriptor `owns` 集合 (DR-061 / DR-094) に載らない場合、`parse_definition` が静的に reject する (runtime reason `unknown_filter` は持たない)。1 属性 1 registry の対応 (`final_filters` は scalar filter registry T→T、`accum_filters` は ARRAY filter registry Acc→Acc) なので判定は自 registry の owns 集合のみで完結し、層違いの 2 段判定は無い (DR-102 §2)。非 accum 要素への `accum_filters`、accum 要素への `final_filters` はいずれも definition-error kind=`invalid-range` (DR-102 §3)。filter 装置内の失敗 (例: `regex_match` の pattern compile 失敗) は kind=`invalid-argument` (DR-085) で別層。

**効果 op と `value_filters` (each 相、T→T) の関係**: `value_filters` は cell に書かれる実値に乗る。
効果 op のうち実値を運ぶ / 生むもの — `set` の operand と `update` の適用結果 (update は old に
transform を適用して書く set の変種、DR-077) — が対象で、**cell 操作** (`unset` / `default` /
`empty` の発火) は **operand (新しい実値) を運ばない**ため、発火に伴って `value_filters` の適用対象と
なる piece が生じず通らない。リセット操作の発火が reject される、という事態は起きない
(2026-07-09 裁定、kuu.mbt issue accum-filters-non-set-op-semantics)。本段は効果 op 側の規定 —
`default` / `unset` の発火で書き戻される default 席の値や、開放後に供給される下位席の値が
どの chain を通るかは値源席の規定 (DR-049 / DR-050) の管轄 (非 multiple 要素の宣言 default 値も
同じ型依存規則に従う、DR-102 §5)。なお `piece_filters`
(String→String) は消費した raw string に乗るため、値トークンを消費しない cell 操作の発火には
そもそも走る場面が無く (帰結は同じ、理由が異なる)、`final_filters`/`accum_filters` は発火単位でなく
確定後の最終値・累積配列に乗るため本規定の対象外。

### 8.4 DSL 文法

variant と同じ `<name>:<arg>:...` 形式。`<name>` は registry 識別子 (ns 付き、bare は `builtin` ns の糖衣、§13.1 / DR-094):

```
"trim"                   引数なし
"in_range:1:65535"
"regex_match:^[a-z]+$"
```

args は全て string、filter registry 側でキャスト。複雑な引数はオブジェクト形式:

```json
[{"name": "complex_validator", "args": ["abc", "with:colon"]}]
```

### 8.5 filter chain の継承 (二形表記、DR-062)

`value_filters` / `piece_filters` / `final_filters` / `accum_filters` は 2 つの形を取る (multiple / variant と同じ string 短縮形 | object 詳細形のイディオム):

```json
"piece_filters": ["trim"]                                   // 配列 = 差し替え (継承なし)
"piece_filters": {"prepend": ["trim", "normalize_width"]}   // 継承 chain の前に足す
"piece_filters": {"append": ["non_empty"]}                  // 後ろに足す
"piece_filters": {"prepend": [...], "append": [...]}        // 両方。合成順は prepend ++ 継承 chain ++ append
```

継承元の解決順:
1. ref が指定されていれば → ref 元のそのフィールド
2. なければ → type registry のデフォルト
3. どちらもなければ → 空配列

ref 継承との合成はフィールド単位の後勝ち上書き (§3.5 の合成順、累積しない)。継承 chain の中間への挿入は表現しない — 必要なら definitions で type を shadow して chain ごと差し替える。

継承 chain 中に含まれる filter 名が filters registry に未登録なら、合成 chain 全体が構成不能で definition-error (kind=`unknown-vocab`、DR-101) — prepend / append で追加する名前も、ref 元 / type registry から継承される名前も判定入力に含まれる。

---

## 9. 制約

### 9.1 required

```json
{"name": "filename", "required": true}
```

boolean のみ。充足判定は**「解決後の充足」の保証であり、充足の定義は type (値空間) が与える** (DR-093、DR-047 の判定を型委譲として精密化):

- **値空間を持つ要素** (通常の type): 最終状態の値の有無 (default / env 等の値源込み、DR-047)
- **値空間が空の要素** (`type: "none"`、dd 含む、DR-089): 発火したこと (committed)

`required: true` + `default` は常に充足する — required の実質は「値源を持たない要素への明示強制」と「結果に必ず値がある」という型保証であり、none でも崩れない (none の保証は「発火した事実が必ずある」)。none には default / env 等の値源が無いため、none 要素の充足経路は CLI 上の発火のみ。値充足が構造的に保証される要素 (`type:"flag"` の暗黙 `default:false`、`default` 宣言、`tty` preset 等) では required は常に充足する — 宣言は合法、無意味の指摘は lint の関心 (DR-103 §7)。**値選択型の oneof** (1 つのトリガ発火後にどの値文法で読むかを選ぶ形) は or + required で表現する:

```json
{"or": [...], "required": true}
```

これは「共有トリガ後の値文法分岐」にのみ有効 — 独立した複数トリガ (flag 群など) からの「少なくとも 1 つ必須」は §9.3 `required_group` (DR-103) が担う (or の枝は独自のトリガ/ref を持てないため)。

dd (`--`) に `required: true` を付けると「`--` の出現が必須」を表現できる (DR-093):

```json
{"type": "dd", "required": true}
```

### 9.2 exclusive_group

```json
{"name": "json", "exclusive_group": ["format"]}
{"name": "yaml", "exclusive_group": ["format"]}
```

同じグループ名の要素群が排他 (最大1つ起動)。string[] で複数グループ所属可。3+ 要素の相互排他はこちら (グループ命名の N 者排他)。

### 9.3 required_group (DR-103)

```json
{"name": "create",  "type": "bool", "long": [":set:true"], "required_group": ["mode"], "exclusive_group": ["mode"]}
{"name": "extract",  "type": "bool", "long": [":set:true"], "required_group": ["mode"], "exclusive_group": ["mode"]}
```

グループ `g` に属する member のうち少なくとも 1 つが値充足 (§9.1 の型委譲、DR-093) を満たしていなければ違反 — `required` の単項判定をグループの論理和に持ち上げた形 (判定入力は値述語、`exclusive_group` の指定述語とは別軸)。`exclusive_group` と**名前空間は独立** (同名文字列でも別々に評価される 2 述語) — 同名で併用すると「最大 1 つ (exclusive_group)」+「少なくとも 1 つ (required_group)」の合成で **exactly-one** (tar のモード必須 `-c`/`-x`/`-t` 等) が表現できる。単独 member の `required_group` は `required: true` と等価に縮退する。definition/scope 側に「グループ規則」を宣言する専用座席 (`groups` 等) は新設しない — グループ判定は評価側 (constraint installer) が group ラベルを集約すれば足りる (DR-012 の「制約は要素属性」という核判断の延長)。member は plain bool (`type:"flag"` でなく `type:"bool"` + 明示 `long:[":set:true"]`) で書く — flag preset (暗黙 `default:false`) を member にすると常に値充足しグループ判定が vacuous に成立する (§9.1、DR-103 §7)。

### 9.4 requires

```json
{"name": "decrypt", "requires": ["key-file"]}
```

自分が起動された時、列挙された name の要素群も起動されている必要がある (正の依存)。required との対比: required は自分の話 (私には値が要る)、requires は相手の話 (私を使うなら彼らも要る)。

目的語の充足判定も required と同じ型委譲の枠 (DR-093) に統一される:

- **値空間を持つ通常型の目的語**: 値の有無 (default 込み)
- **目的語が bool 型** (flag preset 含む): 解決後の値が true であること (値源不問 — cli / env / config / inherit / default のどれ経由でも true なら充足)。値の有無判定だと、flag preset が同梱する暗黙 default:false (§3.3/LOWERING §A.5) により vacuous に充足してしまうため、この dispatch (「値の有無」でなく「解決後値が true か」) を採る。dispatch 自体は plain bool にも一様に適用されるが、**plain bool は暗黙 default を持たない** — 未発火・値源なしなら他の値型と同様に absent (LOWERING §A.5 の default:false は flag preset 固有の展開、DR-099 §2 の `resolved_default = fold(観測) ?? 宣言 default ?? absent` 終端が同じ教義を preset 型の側から裏づける) (DR-047 明確化 2026-07-09、bool 型の充足定義として DR-093 の型委譲に統合)
- **目的語が値空間なし** (`type: "none"`、dd 含む): 目的語が発火した (committed) こと (DR-093、DR-089 §4 の definition-error 判定を置換)

**値依存の制約は値の枝への requires 合成で書く** (DR-055、専用の条件 DSL は持たない):

```json
{"name": "format", "or": [
  {"exact": "json", "requires": ["schema"]},
  {"exact": "yaml"}
]}
```

値の枝は exact 要素 (§5.3) なので制約属性がそのまま付く。json 枝が committed の経路でのみ述語が立ち、requires は lexical 解決なので対象要素の場所を問わない。

### 9.5 conflicts_with (DR-055)

```json
{"name": "foo", "conflicts_with": ["bar"]}
```

名指しのペア排他 (負の依存)。**意味は対称** — 片側に書けば両方向に効く。2 要素のペア排他はこちらが手軽 (3+ 要素は exclusive_group)。同じペアを exclusive_group と重複宣言した冗長は両方評価され (正しさは不変)、指摘は lint の関心。

### 9.6 group_rules は作らない (DR-012)

「グループ全体に対するルール」を別場所 (`group_rules` 等) に書く設計はしない。各要素属性で表現できる範囲に限定。値選択型の「どれか 1 つ必須」(oneof) は `{"required": true, "or": [...]}` の既存合成で足りるが、独立トリガ群 (flag 群) からの「少なくとも 1 つ必須」は §9.3 `required_group` (DR-103) が担う — いずれも「グループ全体のルールを別座席に書く」のではなく、既存の要素属性の組み合わせ (or+required) または新規の要素属性 (required_group) で表現し、`groups` 型の専用座席は依然として作らない。

### 9.7 制約の評価 (DR-047)

required / required_group / requires / exclusive_group / conflicts_with は**遅延述語**であり、完全解決経路の成立条件として評価される (事後検証層は無い)。判定入力は 2 種に分かれる: **値述語** (required / required_group — 値充足の型委譲、DR-093) と **指定述語** (exclusive_group / conflicts_with — committed 同士の衝突)。requires は混合 (トリガ側 committed、目的語側 値述語)。conflicts_with は exclusive_group と同じ指定述語。詳細は §15.9。requires / required_group / exclusive_group / conflicts_with は constraint installer の所有語彙 (席宣言型、§13.1)。

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
- 祖先スコープの write-target セルは要素の name を共有する (DR-059 §5) ため、そこで書かれた値は §2.3 の帰結として**その祖先スコープの結果キーにも露出する** (name が結果スコープを作る)。子孫へは inherit 席経由で流下する。祖先キーと子孫キーは別スコープ・別 provenance (由来は sources で判別、§2.6 / DR-031) であり同名でも重複ではない。global installer (親→子孫、親に書けば親キーに出る) との鏡像対称。祖先で書いた値を結果に出さず子孫へ流すだけの「導管のみ」(per-copy export_key opt-out) は現機構に無く、必要になればフェーズ2 で継続検討

### 11.4 値源の優先順位 (DR-031)

```
1. CLI 明示 / link    (パース時操作、最優先)
2. 環境変数            (DR-049)
3. config ファイル     (DR-050、§14.3)
4. inherit (祖先 scope)
5. default / value    (最終フォールバック)
```

順序は固定 (設定可能にしない、暗黙の罠を避ける)。`default` 席で何を返すかは型ごとの解決規則に委ねられる — 通常の型は宣言 `default` の静的値をそのまま返すが、`tty` preset 型はここで tty 観測の fold を優先し宣言 default へフォールバックする独自規則を持つ (DR-099、§12b)。ラダー自体はこの型依存を意識しない 5 段固定のままであり、tty のための専用席は持たない。

---

## 12. 環境変数

```json
{"name": "port", "env": "PORT"}
```

- env_prefix が設定されていれば自動連結 (`MYAPP_PORT`)。prefix を付けたくない完全指定は要素の `config` で `env_prefix: ""` を上書きする (DR-049)
- 値の優先度: §11.4 を参照
- **env_provider** は registry の単一スロット。シグネチャは `(key: string) → string | null` — null = 未設定、空文字列は「設定されている」。受け取る key は prefix 連結済みの最終名 (導出は installer 側に閉じる、DR-049)。このシグネチャの機械可読宣言 (`role:"provider"` descriptor) の正本は `schema/builtin-descriptors.json` の `env_provider` (DR-107 §6)
- env 値は string として pieceProcessor (piece_filters → parse → value_filters) を通る。multiple 要素なら separator 分割も効く (CLI 入力と同じ手順、DR-049)
- **env_auto** (DR-100): `config.env_auto: true` で、`env:` 未指定の値セル持ち要素に env 席を自動宣言する。env 名は `UPPER(env_prefix)_UPPER(スコープパス)_UPPER(name)` のフル修飾 (例: serve 配下の port → `MYAPP_SERVE_PORT`)。明示 `env:` が優先 (DR-049)
- 複数環境のプロファイル切替 (dev / prod / test) は本仕様の関心外。実体ノード (§4.5) と config ファイル側の構成で表現する

---

## 12b. tty 判定値 (DR-099)

`tty` は §3.3 の糖衣プリセット (`builtin/tty`) — bool を値空間の土台にする preset 型として `type:` フィールドで選択する。`tty_stream` が必須の config キーなので、bare `type: "tty"` は definition-error になり、通常は definitions.types 経由でストリームを指定した局所名を作って参照する:

```json
{
  "definitions": {
    "types": {
      "stdout_tty": {"name": "builtin/tty", "config": {"tty_stream": "stdout"}}
    }
  },
  "options": [
    {"name": "use_color", "type": "stdout_tty", "long": true, "env": "CLICOLOR_FORCE", "default": true}
  ]
}
```

- **preset が同梱するのは「暗黙 default = tty 観測の fold」だけ**。long/short/env 席の宣言可否・multiple・filters・required 充足 (値空間あり判定) は素の bool と完全に同一に振る舞う — bool 以外の型や値なし要素・flag/count プリセットに「tty を付与する」という操作自体が存在しない (`type:` は単一選択のため、DR-098 が必要とした definition-error 3 分類は構文的に発生しない)
- **configurable factory config**: `tty_stream` (`"stdin"｜"stdout"｜"stderr"`、必須 — 未指定は definition-error kind=`invalid-range`) / `tty_cygwin` (bool、既定 true — cygwin pty を terminal 扱いに含めるダイヤル)
- **`default` 席の解決規則** (§11.4 のラダーは 5 段固定のまま、この席の中身が型依存): `resolved_default = fold(観測) ?? 宣言 default ?? absent`。`fold(観測) = terminal || (tty_cygwin && cygwin)`。観測が得られる限り宣言 default より優先する (「明示 (CLI/env/config) > 継承 (inherit) > 観測 (tty) > 宣言既定 (default)」という序列は DR-098 §5 のまま維持、実装位置が独立ラダー席から型の解決規則へ移っただけ)
- **source タグ**: 最終値が fold 由来なら `source: "tty"`、宣言 default へフォールバックしたなら `source: "default"` (観測由来 vs 宣言 default 由来の診断区別、`effects` には現れない — 完走後の値確定)
- **tty_provider** は registry の単一スロット。シグネチャは `(stream: "stdin"|"stdout"|"stderr") → {terminal: bool, cygwin: bool} | null` — null = 提供なし。env_provider (§12) / config_provider (§14.3) と同列 (DR-099。DR-098 の `bool | null` から改訂 — fold の方言 `tty_cygwin` を spec 側の純データ計算として保つため)。このシグネチャの機械可読宣言 (`role:"provider"` descriptor) の正本は `schema/builtin-descriptors.json` の `tty_provider` (DR-107 §6、入出力の enum/struct 精密化は io_type の型体系の外なので description に注記)
- 供給値 (`terminal`/`cygwin`) は native bool (string でない) なので、fold で計算した値の pieceProcessor 通過は `piece_filters` / `parse` (String→T の相) が型の帰結でスキップされ、`value_filters` / `final_filters` (T→T の相) のみ通過する (DR-050 §4 の config scalar と同じ原理)
- 評価器の純粋性は不変: パーサ自身が `isatty()` を呼ぶことはなく、ambient probe の実行は provider 実装 (ホスト言語 DX) の責務に閉じる (DR-098 §2、DR-099 でも不変)

---

## 13. 外部レジストリ

### 13.1 レジストリ区分 (DR-010 + DR-036)

現役の区分は以下の7つ。フィールド名で registry が暗黙決定される (§13.2)。

| レジストリ | 役割 | 引かれるフィールド |
|---|---|---|
| `types` | 値型のプリセット (pieceProcessor 中心) | `type` |
| `filters` | 純粋 FilterChain (collector も含む) | `value_filters`, `piece_filters`, `final_filters`, `accum_filters` |
| `accumulators` | accumulator の属性セット | `multiple` のサブフィールド |
| `multiple` | accumulator+collector+separator の糖衣プリセット | `multiple` (文字列指定時) |
| `env_provider` | 環境変数解決 | `env` (env installer の lookup が利用) |
| `config_provider` | config ファイル読込 (パス → JSON 同型の階層オブジェクト。フォーマット・探索・マージは provider の関心、DR-050) | `config_key`, `type: "config_file"` (config installer の lookup が利用) |
| `tty_provider` | tty 判定値解決 (stream → `{terminal, cygwin}` \| null、ambient probe は provider 実装に閉じる、DR-099) | `builtin/tty` factory の config `tty_stream` (`types` registry 経由、`tty` installer は持たない) |
| `completers` | 補完候補の供給名 (標準 files/dirs 等は生成器が shell 機能へマップ、DR-060) | `completer` |
| `installers` | 特殊語彙の展開装置 (糖衣展開 + 実行時能力の植え付け、DR-042) | `long`, `short`, `env`, `type:"dd"`, `commands[]`, `global`, `inherit`, `repeat`, `multiple`, `config_key`, `requires` / `exclusive_group` / `conflicts_with`, `alias` 等の特殊語彙 |

installer / registry 住人は自身を説明する **descriptor** を持つ (DR-061): installer は所有語彙 (`owns`、排他 = DR-042 不変則③)・観測語彙 (`observes`、表示・補完等の副次成果物にのみ影響)・自身が読む config キー・emit しうる失敗理由 (`reasons`、DR-066) を宣言する。宣言された所有集合の和が、直列化された定義上の語彙の正当性判定 (誰も所有しない語彙 = DR-054 の unknown-vocab Error) と completeness 検査の判定入力になる。observes は lint / diagnose の素材であり実行時強制はしない。

**registry 識別子の namespace (DR-094)**: filter 名・configurable factory 名・type 参照名・reason 語彙のすべてに namespace (ns) を通す。`builtin` ns は spec が管掌する closed set (組み込み語彙)、拡張 ns (ホスト DX パッケージ・ユーザ拡張が名乗る任意の ns、例 `contrib_python`) は open set。**bare 名は `builtin` ns の糖衣** (`trim` = `builtin/trim`、`in_range` = `builtin/in_range`) — 既存記述は全て無傷のまま再解釈される。区切り文字は `/` (`:` は filter/variant DSL の引数区切りと、`.` は link 固定パス DSL のフィールドアクセス (§10.2) と衝突するため不採用)。definitions 領域のローカル識別子 (§13.3 の `definitions.X` 側キー) は ns の対象外 — ns が扱うのは registry 側の共有語彙プールの衝突のみ。

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

プリミティブ型を含む全 type の canonical → 言語DX → ユーザ 3層上書き構造・2軸の方向性・tree-shake・再現性の担保は **§3.4 を参照**。registry の観点では、「言語DX default」層が types[X] の registry レベル狭め直しに、「ユーザ差し替え」層が definitions / registry のローカル上書きに対応する。

### 13.7 diagnose モード

`kuu.diagnose(ast)` で AST 走査時に未実装を全列挙する仕組み。

### 13.8 case 変換 (pluggable、DR-022)

wire format は snake_case 固定。各言語バインディングへの case 変換は pluggable:

- Python / Rust: snake のまま (ネイティブ)
- TS / MoonBit: camelCase 変換可 (差し替え可能)

「言語ごとに変換を固定」は新たな暗黙ルールになるため避ける。デフォルト変換器を置くが固定はしない。

### 13.9 AtomicAST レベルで未予約の周辺概念

以下は実装側で必要になりうるが、本仕様では予約フィールド名も挙動も持たない。AtomicAST はこれらの実体を直接運ばず、確定は本仕様の射程外とする:

- **command の実行フック**: `type: command` の選択時に呼ばれる handler。フィールド名・registry 区分名は未予約。
- **動的補完生成**: `completer: "<名前>"` と registry 区分 `completers` は確定済み (DR-060、名前参照のみで実行はしない)。クロージャ completer の AtomicAST 表現は引き続き持たない (UsefulAST / DX 層の関心)。
- **default の動的生成**: 関数で default を返す機構。`default` フィールドに静的値を入れる用法のみ予約済みで、関数バリアントは未予約。
- **失敗時アクション属性**: 機構は DR-048 / §15.10 で確定済みだが、属性のフィールド名・installer 区分は未予約 (help / completion installer の設計と同時に確定する)。

installer が宣言語彙に関わる形は 2 種類ある (DR-056): **所有** (lowering 責務、1 語彙 1 所有者で排他) と**参照** (advisory read、自由 — help / completion installer が alias / hidden / deprecated を読んで表示・補完データを作る等)。参照読みの成果はパースの観測挙動 (効果列) に影響してはならない (副次成果物の構築のみ)。参照が許されるのは宣言層であって他 installer の lowered 産物ではない。

以下は未予約ではなく**責務外** (本仕様は将来も直接扱わない — 実装層・呼び出し側・外部ツールの関心):

- **サブコマンドツリーの動的拡張**: サブコマンドは定義に書かれた静的閉包の or のみ。`git foo` → git-foo バイナリ委譲のような plugin pattern・wildcard・catch-all は持たない。
- **post-parse validator**: cross-field 検証 (「--start は --end より前」等の任意ロジック) の AtomicAST フックは持たない。宣言的制約 (§9 の 5 種) はコアの遅延述語、それを超える検証はアプリが ParserContext を受け取って行う。
- **sensitive / secret**: AST は機微情報の概念を持たない。値のマスキングは実装層 (logger / diagnose 実装) の責務。
- **カラー / interactive / 出力レンダリング / 端末制御**: AtomicAST は端末を操作しない。レンダリングは実装側の責務。**tty 判定値そのもの**は §12b/DR-098 で注入値源 (tty_provider) として射程内化 — ただし ambient probe (isatty 呼び出し) は依然として評価器の外 (provider 実装の責務) であり、評価器が端末状態を能動的に知ることはない。

これらは UsefulAST 上で各言語 DX がクロージャを保持する経路では既に実装可能だが、JSON シリアライズ可能な AtomicAST に対応する正規形は持たない。

---

## 14. ヘルプと特殊 type

### 14.1 help

```json
{"name": "help", "type": "help", "long": true, "short": "h", "global": true}
```

- type が `help` の要素は組み込み実装
- 起動時に ParserContext の help フラグを立てる
- パーサが完了時に help フラグを見て出力切替
- パース失敗時 (完全経路 0 本) も、候補経路で help が selected だったなら保持 Error に代えて help を表示する (失敗時アクション、DR-048 / §15.10)

### 14.2 version

```json
{"name": "version", "type": "flag", "long": true, "global": true}
```

- ただのフラグ
- 結果オブジェクトの `result.version` を見てアプリがバージョン出力
- AST にバージョン文字列を持たせない
- パース失敗時には何も出ない (結果がアプリに渡らないため)。失敗時にも version を出したいアプリは失敗時アクション属性を opt-in する (DR-048 / §15.10)

### 14.3 config_file (DR-050)

```json
{"name": "config", "type": "config_file", "long": true, "env": "MYAPP_CONFIG", "default": "~/.myapp.toml"}
```

- config ファイルのパスを取る要素の配線宣言。パス要素は普通の要素で、パス自体が値源ラダー (CLI > env > default) で解決される
- 読み込んだ階層オブジェクトが値源ラダーの config 席 (§11.4 の 3) に供給される。**対応付けはデフォルトで同型対応** (name スコープ階層 ↔ config 階層)、明示 `config_key` (link の固定パス DSL、ルートからの絶対パス) で上書き。読込元は **config_provider** (registry の単一スロット、シグネチャ `(path: string) → object | null`、§13.1)。このシグネチャの機械可読宣言 (`role:"provider"` descriptor) の正本は `schema/builtin-descriptors.json` の `config_provider` (DR-107 §6)
- **config 値の期待型は要素の type**: string は CLI/env と同一の全段 pipeline (number/bool 要素へは parse 試行)、scalar (number/bool) は型一致なら T 域の座席のみ (value_filters / 確定後の final_filters・accum_filters — multiple 有無で対応する属性が決まる、DR-102。string 域の piece_filters / parse は型の帰結でスキップ)・**string 要素へは JSON 文字列化で受理** (寛容の双方向対称、数値は最短表現 `1.0` → `"1"`)、bool↔number の意味変換と構造不一致 (array/object ↔ scalar) は Error、array は分割済み pieces、object は同型再帰 (DR-050 §4)
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
{"name": "port", "type": "int", "long": true, "short": "p"}     // canonical
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

衝突の本質は結果キーの provenance (どの実体がキーを占めるか) の曖昧さであって値の相違ではない。値が退化しても (例: 両者 flag で共に `{x:true}`) 各解釈の claimants 面 (露出キー → 占有する実体 entity、DR-073) が解釈を区別する。ambiguous の分類自体は変えず、interpretations に診断可能な担体を添える (§15.12 / DR-073)。

「実際の共露出」に数えるのは発火 (cli / link) と default より上の席の充填 (env / config / inherit) — 上位席の値は意思表示であり、結果 cell が他実体の値で埋まっていても共露出として成立する。未発火実体の default は数えない: default 注入の充填判定は export_key 適用後の結果 cell 単位で行われ (DR-031 追記 note)、cell が埋まっていれば注入自体が起きない。

露出キーの型不一致は union (嫌うなら export_key で分離、強制せず指針)。

### 15.6 静的バリデータは warn のみ、実行場所は開発時 lint (DR-021)

潜在的な問題は静的に検出して warn できるべきだが reject はしない:

- 露出キーが衝突しうる構造 → warn
- 共露出キーに異なる宣言 default が並ぶ構造 → warn (両者未発火だと実行時 ambiguous になる、DR-031 EXP-Q1 追記 note)
- 背骨なし内部で無制限の string repeat の後にトリガ付き構造が続く → 丸呑みの潜在を warn

warn はする、reject はしない、の二段構え (利用者を信頼)。実行場所は開発時ツール (kuu linter / §13.7 diagnose) であり、実行時 bundle には同梱しない。停止条件の設計は利用者の設計領域 (kuu は部品・example・lint を提供し、定義の自動補正はしない)。

### 15.7 AtomicAST の直列形 (DR-039 / DR-063)

AtomicAST はボトムアップ kuu エンジンのノードグラフを宣言的にシリアライズした形 (DR-039、三層アーキテクチャ = ノード ADT / 評価器 / 結果ビルダー)。直列形は DR-063 で確定した:

- **wire form (実装間交換形) = 宣言層のみ**: A 群糖衣 (LOWERING §A) 適用済み + installer 所有語彙は inert のまま。lowered 産物 (greedy 衛星 / matcher / 席宣言) は載せず、決定的 lowering (DR-042 の不動点) による再導出に委ねる。wire 上の語彙の正当性は登録済み descriptor の所有集合の和で判定する (DR-061、§13.1)
- **lowered 断面の表記** (lowering 段階別 fixture の期待値用) は 5 面構造 `{greedy, positionals, entities, constraints, templates}` (空面は省略、入れ子 scope も再帰的に同構造) / matcher `{matcher: kind, entries}` / 効果記述子 (§7.4、DR-045)。golden の消費点は ref + link の宣言形で統一。比較は構造骨格 + matcher 種別・エントリ表の緩比較 (LOWERING §C.5)
- 比較はすべて構造等価 (key 順序非規範、省略 = default)。byte 一致は要求しない

wire の well-formedness は 3 層 (構文 = DR-067 の invariant / 語彙 = descriptor 所有集合 / 参照 = DR-054 の解決検査) で判定する。JSON Schema と spec バージョンの lifecycle は DR-068 (確定版 v1.0.0 の発行 = 4 プロファイル全 green のフェーズ 3 完了時、それまでドラフト期。§15.14 参照)。

### 15.8 トークン読みと先食い (DR-041)

`--key=value` 分解や連結 short (`-abc`) のようなトークン境界の再解釈は、installer (DR-042) が植え付ける matcher の実行時意味論として定義される:

- **読みは枝**: matcher は 1 トークンの解釈候補 (読み) を全列挙し、絞り込まない。§15.1 の完全経路一意性は読みの選択を含む全空間に適用される
- **規則はスコープ従属**: matcher の構成はスコープごと。args 全域の前処理パスは存在しない (`--` の前後で挙動が変わるのは経路上の位置依存だから)
- **背骨と先食い**: greedy は構造位置に縛られず、宣言スコープの背骨 (positional 進行の消費点列) 上のどこでも発火できる (出現回数は repeat の軸で直交)。背骨上で greedy に読めるトークンは素通し読みの枝を生成しない。command 部分木は新しい背骨 (祖先の greedy は届かない、越境は global installer の構造コピー)、greedy 内部と dd 継続は背骨なし (一体消費、getopt 同型)
- **同一トリガは最小スコープ優先**: global コピー等で衝突したら内側の宣言が食う (lexical 解決のパース時適用、判定は要素名でなくトリガ literal)。shadow は配下 subtree 全体に及ぶ — 中間 command が shadow したトリガは孫スコープにもコピーされない (lexical 連鎖)。同一スコープ内の重複は静的 warn + 実行時 ambiguous (ambiguous になるのは重複読みが異なる効果を生む場合 — 効果列が同一なら経路同一性 (§15.1) により 1 本に合流する。例: 値効果を持たない dd の重複宣言、DR-064)
- **早閉じ抑制**: 背骨を持つスコープは、自分の背骨で読めるトークンが次に控えている間は完了できない (= 読める最内スコープが勝つ)。command 部分木の完了後は親の背骨が再開する (sever 規則は持たない)
- **「読める」の精密化 (DR-097)**: 先食い・早閉じ抑制が共有する述語「読める」は、トリガ一致ではなく**読み自身の成立** — トリガ発火に加え、その entry の値スロット消費を確保でき値空間照合 (parse 相) を通ること — を指す。値照合失敗・値トークン枯渇で成立する読みが無い消費点は読みゼロと同じ扱いになり、素通し枝 (positional raw 消費) が生きる。生きた素通しから完全経路が立てば採用され、greedy 側の held Error は他ルートが通るぶん捨てられる (DR-037)。下流の帰結 (制約未充足・他要素の欠落) は判定に参加しない — 素通し枝の生成は parse 相で決まり、生成後の裁定は §15.1 の完全経路契約が司る
- **repeat の取り分は宣言的選好で確定**: greedy (既定、長い方から) / `lazy: true` (短い方から) の順に試し、最初に完全経路へ到達した取り分で確定 (regex 量指定子と同型、下流失敗で後退)。複数の閉包が並ぶ場合は先の閉包の選好から。選好は取り分次元の中だけで働き、構造の異なる完全経路との ambiguous 検出は保存される (DR-043)
- **prefix ガードなし**: 未定義の `-x` は素通しで positional に落ちる。形が option 風であることを理由に拒否しない (拒否したい場合は方言で opt-in)
- **dashdash**: dd は greedy 面のトリガ兼消費者 (matcher は素の exact 一致) に lowering される。`--` が値に食われないのは先食いから、以降の option 抑制は内部一体則から導出される (特別規則ゼロ、DR-041/042)

### 15.9 制約評価のレイヤリング (DR-047)

制約の検証は 2 レイヤに分かれる:

- **即時述語**: トークン単体で判定可能な検証 (型パース、regex、in_range 等)。filter (§8、DR-037) の領域
- **遅延述語**: 経路全体の最終状態を見る検証 (required / required_group / requires / exclusive_group / conflicts_with)

遅延述語は**完全解決経路の成立条件**である (§15.1 の「解決」に含まれる)。制約を満たさない経路は完全経路と数えず、事後検証層は持たない。述語違反は Error (DR-037 の「全段」に遅延述語を含める) としてエラーを保持し、完全経路 0 本時に表示する。評価対象は値源ラダー (§11.4) 充填後の最終状態 (空 args も特別扱いなし)。

判定入力は制約の意味論から決まる:

| 制約 | 述語の種類 | 判定入力 |
|---|---|---|
| `required` | 値述語 (「アプリは値を必要とする」) | 型委譲の充足 (DR-093): 値空間あり = 最終状態の値の有無 (default 込み) / 値空間なし (`type: "none"`) = 発火 (committed) |
| `required_group` | 値述語 (「グループのうち誰かは値を必要とする」、DR-103) | グループ member のいずれかが `required` と同じ型委譲充足を満たすこと (論理和) |
| `exclusive_group` | 指定述語 (「同時に指定するな」) | committed (同グループで最大 1 つ) |
| `conflicts_with` | 指定述語 (名指しのペア排他、対称、DR-055) | committed 同士の衝突 |
| `requires` | 混合 | トリガ側 = committed、目的語側 = 型委譲の充足 (DR-093): 値空間あり = 値の有無 (**bool 型は「解決後の値が true」、値源不問** — DR-047 明確化 2026-07-09) / 値空間なし = 発火 (committed) |

帰結: 構造の異なる複数の完全経路のうち制約を満たすものが 1 本だけなら、ambiguous ではなくその経路で確定する — 先食い・早閉じ抑制・shadowing と同じ「経路間の優先規則でなく成立条件の精密化で 1 本に絞る」原理 (DR-047)。unset (`--no-x`、DR-045) で取り消した要素は exclusive の衝突にも requires のトリガにも数えない。

### 15.10 失敗時アクション (DR-048)

early-exit は存在しない — パースは常に完走し (§15.1)、help 等の挙動は完了後の表示選択として定義される:

- **成功時**: 結果 / ParserContext を見てアプリ (または kuu の help 実装) が動く。`--help --version` が両方 committed でも衝突はない (どちらに反応するかはアプリの領分)
- **失敗時** (完全経路 0 本): 候補経路のいずれかで失敗時アクション持ち要素が selected だったなら、保持 Error の表示に代えて発火する (help なら help 表示)。**候補経路は dead end (途中で失敗した partial 経路) を含む** — `mytool --help abc` (abc が型失敗) でも help が発火する。複数観測されたら **args 上の消費位置が最小のもの** (先勝ち、効果列 = DR-045 の順序。DR-015 のあと勝ち mutation と同じ時計)。枝の深さ・走査順は座標にしない
- **ambiguous (2+ 本) では発火しない**: ambiguous の本体は競合解釈の提示であり、help で画面を流さない。help 入口が定義されていれば、0 本 / ambiguous 両方のエラー末尾に `--help` への誘導行 (1 行) を出す — 表示の大きさで発火範囲が変わる 2 段構え (誘導行の具体仕様は §15.12 の help_entry (DR-053) / help installer の関心)

失敗時アクションは汎用属性で、`type: "help"` プリセットが同梱する (属性のフィールド名は §13.9 で未予約)。

### 15.11 parse_definition の失敗挙動 (DR-054)

定義時検査の境界基準: **lowering が構成できない / 全入力で壊れる = Error (parse_definition 失敗)、一部入力で驚きうるだけ = warn (定義は通す)**。

- Error: 未知の特殊語彙 (DR-042①)、不正な値域、不在・循環の ref/link、ゼロ進捗再帰 (DR-043)、config 循環 (DR-050)。現状の Error 検査は構文・値域・参照の単純検査まで — 制約間の意味矛盾 (制約グラフ解析を要するもの) は warn (lint) に置く
- warn: 露出キー衝突の可能性・同一トリガ重複・丸呑み構造 (§15.6 のとおり開発時 lint / diagnose の関心、実行時 bundle 非同梱)。DR-021 の「warn はする、reject はしない」は warn 層にのみ適用される
- 返値: `{outcome: "success", atomic} | {outcome: "definition-error", errors: [{element, kind, message, hint}, ...]}` — エラーは全列挙、hint は §13.5 の「次の手」型

### 15.12 パース結末の構造 (DR-053)

parse() の返値は `outcome` タグ付きの discriminated union (言語 DX が例外等へ変換するのは自由):

```
{outcome: "success",   result: {...}, context: <ParserContext>}
{outcome: "failure",   errors: [...], fired_action?, help_entry?, tried_triggers?}
{outcome: "ambiguous", interpretations: [...], help_entry?}
```

- **errors は全保持の配列** `{element, args_pos, kind: parse|filter|constraint, reason, message}`。primary = args 位置最深 (furthest failure、同深は全て)。表示本数はレンダラの関心。**reason は機械可読な失敗理由の識別子** (DR-066) — kind (層) と message (文言、レンダラ) の間の仕様語彙で、組み込み発生源は必ず emit する。発生源の emit しうる reason は descriptor の `reasons` 宣言 (§13.1) に列挙され、reason → 文言マップがローカライゼーションの実装単位になる
- **interpretations は全解釈の列挙**、各解釈は結果オブジェクト形のビュー (効果列は詳細モードの関心)
- `help_entry` (誘導行の素材、§15.10) / `tried_triggers` (Did you mean の素材、近接マッチは DX 層) はフィールドとして載せ、文言はレンダラ
- failure への partial ParserContext は optional 予約 (中身の形は別途確定、本節では定めない)
- 定義時のエラーは §15.11 の definition-error であり、本節の failure (実行時パース失敗) とは別レイヤ

### 15.13 補完クエリ (DR-060)

**complete = カーソル前のトークン列を消費できた全生存 partial 経路 (dead end 除外) の、次の消費点で読めるものの和集合。** 全消費も一意性も課さない (§15.1 の契約の緩和ではなく別クエリ)。

```
complete(atomic, {args_before, args_after?, word_before?, word_after?}) → candidates 構造
```

- `args_before` (カーソル前のトークン列、必須) / `args_after` (カーソル後のトークン列、optional)。`word_before`/`word_after` (カーソル単語の前半/後半) は v1 未使用可のまま予約 (DR-104、参照実装未着手)
- `args_after` が**非空**なら、exact かつ term:word_end の候補に限り「候補採用後に args_after も消費して完全経路に到達できる」もので絞る (after 整合フィルタ — 全解決モデルならではの精度)。値位置候補・term:cont の候補はユーザ入力を発明できないため対象外で無条件に生存する。この完全経路判定は遅延述語 (制約、§15.9) を含む — DR-047 の「遅延述語は完全経路の成立条件」の一様適用 (DR-104 §5)。`args_after` の省略と明示的な空配列供給は同値 (length ベース判定、どちらも非発火)
- **`args_before` のみの補完 (行末補完) では遅延述語は候補生存判定に一切不参加**: dead end 判定は parse 相、制約評価は resolve 相という相区分を固定する (DR-104 §5)。排他制約の相手が committed 済みでも、その候補は普通に返る — 実行時に選んでしまえば `exclusive_group_violated` 等の reason つきエラーで教える方針 (早期に隠すより打たせて教える UX 判断)
- 候補 = exact 綴り (メタ: canonical/alias・hidden・deprecated・終端ヒント word_end/continue) + 値位置の型情報 / completer 名。**素材とメタのみ返し、絞り込みポリシー (tab-tab 切替等)・置換・着地は生成器と shell の領分**。候補の同一性は `spelling`/`is_value`/`ty`/`origin`/`term`/`meta` の完全一致 (`path` は同一性に関与しない、DR-104 §3)
- 標準 completer (files/dirs 等) は生成器が shell 既存機能へマップ (クォート・変数展開は shell の責任領域)。動的候補は素の値文字列で返しクォートは shell/生成器
- 責務 4 層: complete API (本仕様) / completion 生成器 (標準提供、shell 作法を封じる) / アプリ開発者 (サブコマンドに繋ぐだけ) / エンドユーザ (source するだけ)

### 15.14 準拠プロファイル (DR-069)

実装は spec バージョン + 準拠プロファイルの組を宣言する。プロファイルは §15.1〜15.13 の各 API に対応し、conformance fixture の `query` タグ (CONFORMANCE.md) と 1 対 1:

| プロファイル | 内容 | fixture (`query`) |
|---|---|---|
| `parse-core` | wire を読み parse を実行、outcome を再現 (§15.1〜15.12) | `"parse"` |
| `lowering` | `parse_definition` の決定的 lowering を再現 (§15.7 の AtomicAST 直列形) | `"lower"` |
| `definition-error` | 定義時検査を再現 (§15.11) | `"definition_error"` |
| `completion` | complete クエリを再現 (§15.13) | `"complete"` |

**`parse-core` は全実装必須の最小プロファイル** — wire が宣言層 (§15.7) である以上、parse の実行には lowering 実装が要るため lowering を内包する。他 3 つ (`lowering` / `definition-error` / `completion`) は opt-in。「kuu 準拠」を名乗る最小条件は `parse-core` green。

conformance の成立に必須な descriptor 軸は **owns (unknown-vocab 判定) と reasons (fixture の reason 検証) の 2 軸のみ**。`observes` と configurable factory の一般適用 (`type` 以外) は canonical 実装の装備であり、準拠実装には要求しない (lint / diagnose / L10n 素材は品質の関心であって準拠の関心ではない)。

本節の「実装が準拠を名乗る条件」と、spec バンドル自体が v1.0.0 として確定する条件 (4 プロファイル全 green を要求) は別軸 (DR-068/DR-069/DR-108)。

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
| **wire form** | 実装間で交換される AtomicAST JSON。宣言層のみ (A 群適用済み + installer 語彙 inert)、lowered 産物は決定的 lowering で再導出 (DR-063) |
| **reason** | 実行時エラーの機械可読な失敗理由の識別子。kind (層) と message (文言) の間の仕様語彙、発生源が descriptor の reasons で宣言 (DR-066) |
| **descriptor** | installer / registry 住人の自己記述。owns (所有語彙、排他)・observes (観測語彙)・config キーを宣言する (DR-061) |
| **observes** | descriptor の観測語彙宣言。あれば副次成果物 (表示・補完) に影響するが効果列には影響しない。DR-056 の「参照」のデータ化 (DR-061) |
| **configurable factory** | registry 住人の `{name, config}` 参照形。方言バリエーションを純データ config の差分で表現、canonical default = default config (DR-061) |
| **pieceProcessor** | 各 piece を T に変換するチェーン (pre+parse+post) |
| **accumulator** | 発火ごとの piece の積み方 ((piece, processor, prevs) → T[])。registry 区分 accumulators と同語 |
| **id** | 参照識別子の軸。ref/link の解決対象、結果に出ずスコープも作らない。未指定なら name が兼ねる (DR-046) |
| **collector** | 累積後の最終変換 (T[] → U) |
| **separator** | 1引数を分割する区切り文字 |
| **Reject** | filter/枝が「私のものではない」と返す (脱落、保持なし) |
| **Error** | filter/枝が「私のつもりだが値が不正」と返す (保持、表示候補) |
| **ambiguous** | 入力を全消費する完全解決経路が2本以上ある状態 |
| **bounded path-search** | DR-038 の実装契約。AtomicAST 上で候補経路を有限列挙し、全消費経路の本数で結末を決める |
| **canonical default** | type の3層上書き構造 (DR-040) の固定字句ベース (言語中立で再現可能な実用寛容字句、DR-074) |
| **installer** | 特殊語彙 (long/short/env/dd 等) を所有し、糖衣展開と実行時能力を植え付ける registry 装置 (DR-042) |
| **matcher** | greedy 面のエントリがトークンを読む機構。素の exact 一致が最小形 (DR-041) |
| **再解釈 matcher** | トークン境界を再解釈して複数の読みを生成する matcher (eq-split / cluster 等)。installer が名前付きデータとして植える (DR-041/042) |
| **読み (reading)** | matcher が 1 トークンに対して列挙する解釈候補。各読みは path-search の枝 (DR-041) |
| **先食い** | 背骨上で greedy に読めるトークンの素通し読みの枝を生成させない規則 (DR-041) |
| **背骨 (spine)** | スコープの positional 進行の消費点列。greedy は宣言スコープの背骨でのみ発火する (DR-041) |
| **repeat** | 構造閉包 (反復)。min/max は枝生成に効く構造制約、取り分は greedy 既定 / `lazy: true` の宣言的選好。repeat installer が ref 再帰へ lowering する (DR-043) |
| **greedy 面 / positional 面** | スコープ内の順不同トリガ要素群 / 位置消費要素群。positional 面は多孔質、greedy 内部は一体消費 (DR-041) |
| **即時述語** | トークン単体で判定可能な検証。filter の領域 (DR-037 / DR-047) |
| **遅延述語** | 経路全体の最終状態を見る検証 (required / required_group / requires / exclusive_group / conflicts_with)。完全解決経路の成立条件 (DR-047) |
| **失敗時アクション** | 完全経路 0 本の失敗時、候補経路で selected なら保持 Error に代えて発火する表示動作 (help 等)。early-exit は存在しない (DR-048) |
| **config_provider** | config ファイル読込の registry 単一スロット。(path) → JSON 同型の階層オブジェクト \| null。フォーマットは provider の関心 (DR-050) |
| **config_key** | config 階層への明示対応 (link の固定パス DSL、ルート絶対)。未指定なら name スコープ階層との同型対応 (DR-050) |
| **tty_provider** | tty 判定値解決の registry 単一スロット。(stream: "stdin"\|"stdout"\|"stderr") → `{terminal: bool, cygwin: bool}` \| null。`builtin/tty` preset 型 (`type:` 経由) の暗黙 default が fold (`terminal \|\| (tty_cygwin && cygwin)`) して消費する。ambient probe (isatty 呼び出し) は provider 実装に閉じ評価器の純粋性を崩さない (DR-099、DR-098 から signature 改訂) |
| **absent** | 値の無い要素は結果オブジェクトにキー自体が出ない (in-band null 不使用)。反復系・default 持ち・required は absent にならない (DR-051) |
| **export_key** | 結果キー軸の明示指定 (未指定 = name 由来)。null / "" = 結果キー軸なし → nameless 同化の透過。値の伝搬は止まらない (DR-052) |
| **alias** | canonical 実体への別入口 (参照ファミリー: ref = 構造継承 / link = 値同期 / alias = 別入口)。結果キーは canonical のみ (DR-057) |
| **所有 / 参照** | installer が宣言語彙に関わる 2 形。所有 = lowering 責務 (排他)、参照 = advisory read (自由、観測挙動に影響不可) (DR-056) |
