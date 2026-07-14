# kuu 定義リファレンス

> **対象読者**: kuu の定義 JSON (wire form / UsefulAST) を書くアプリ開発者。
> 目的は逆引き・一覧性であって仕様の説明ではない。
>
> **非正本**: 本書は導出物であり、規範記述の正本は `docs/DESIGN.md` / `docs/decisions/DR-*.md` /
> `schema/*.json` にある。本書と正本が食い違う場合は正本が勝つ — 発見したら本書を直す。
> 各エントリは「型 / 既定値 / 適用対象 / 意味論 (1〜2 文) / 最小例 / 正本 ref」の定型で書く。
>
> **網羅性の機械検査**: `<!-- kuu-lint:vocab ... -->` で囲んだ語彙表は
> `just lint-reference` (`scripts/lint-reference.sh`) が `schema/wire.schema.json` /
> `schema/builtin-descriptors.json` と突き合わせ、双方向 (漏れ / 幽霊語彙) を検査する。
> 機械検査の対象は wire 正規形の語彙のみ — UsefulAST 専用の糖衣属性 (`values` / `help` /
> `display_name` / `value_name` / `hidden` 等、正本上 wire に載らないため機械検査は対象外) も
> 定義 JSON を書く上では必須語彙なので、§2.3 に手動転記のカタログとして掲載する。

---

## 1. 定義のトップレベル

kuu の定義 (wire form) はノード 1 個 (通常は root コマンドノード) を JSON で表す。root ノードも
`or`/`seq` の子も command 部分木も同型 (DR-017)。トップレベルでよく使う配置フィールドは以下の 5 つ
(フィールドとしての詳細は §2 の属性一覧に統合済み、ここでは配置としての役割だけを示す):

| フィールド | 型 | 役割 | 正本 |
|---|---|---|---|
| `options[]` | array[node] | ハイフン起動・順不同の要素群 | DESIGN §4.1, DR-018 |
| `positionals[]` | array[node] | 位置消費される要素群 | DESIGN §4.1, DR-018 |
| `commands[]` | array[node] | サブコマンド糖衣。command installer が exact 衛星 + 新背骨へ展開 | DESIGN §4.2〜4.3 |
| `definitions{}` | object | 参照・テンプレの名前空間 (`types`/`accumulators`/`filters`/`multiple`/`completers` 等の区分、区分名は open) | DESIGN §10.4, DR-035 |
| `config{}` | object | installer/factory の config パラメータ、階層継承 (子は親を継承・上書き可) | DESIGN §7.2, DR-061 |

最小骨格:

```json
{
  "options": [
    {"name": "verbose", "type": "flag", "long": true, "short": "v"}
  ],
  "positionals": [
    {"name": "file", "type": "string"}
  ]
}
```

要素の役割は所属する配列で決まる (DR-018) — `type` フィールドは option/positional では省略可、
command 等の構造的に特別な要素のみ `type` が必須。

---

## 2. 要素共通属性

### 2.1 属性一覧 (A〜Z)

wire 正規形のノードが持ちうる全属性。型・既定値・適用対象は最小限、意味論の詳細は §2.2 の
カテゴリ別解説を参照。

<!-- kuu-lint:vocab node-properties -->
| キー | 型 | 既定値 | 適用対象 |
|---|---|---|---|
| `accum_filters` | filterChain (array \| {prepend?,append?}) | 空 | accum 要素専用 (`multiple`/`repeat`/`separator` のいずれか、DR-102) |
| `alias` | string | なし | 独立要素 (canonical への別入口) |
| `commands` | array[node] | なし | 任意ノード |
| `config` | object | 親から継承 | 任意ノード |
| `config_key` | array[string\|integer] | name スコープ階層と同型対応 | 値要素 |
| `conflicts_with` | array[string] | なし | 任意要素 |
| `default` | any | なし | 値要素 |
| `definitions` | object | なし | 任意ノード |
| `deprecated` | boolean | false | 任意要素 / alias 要素 |
| `env` | string | なし | 値要素 |
| `exact` | string \| boolean \| number | なし | 葉ノード |
| `exclusive_group` | array[string] | なし | 任意要素 |
| `export_key` | string \| null | name 由来 | name を持つノード |
| `final_filters` | filterChain (array \| {prepend?,append?}) | 空 | 非 accum 値要素専用 (DR-102) |
| `global` | boolean | false | options/positionals 配下の要素 |
| `id` | string (`#` 禁止) | name を兼ねる | 全ノード |
| `inherit` | boolean | false | 値要素 |
| `inheritable` | boolean | false | 値要素 |
| `link` | string | なし | 任意ノード |
| `long` | boolean \| array[longItem] | false (`[]`) | option 要素 |
| `match` | string (regex) | なし (未指定 = exact `"--"`) | `type:"dd"` の要素 |
| `multiple` | string \| object | なし (縮退) | 値要素 |
| `name` | string (非空、`#` 禁止) | なし | 全ノード |
| `optional` | boolean | false | 任意要素 |
| `options` | array[node] | なし | 任意ノード |
| `or` | array[node] | なし | 枝ノード |
| `piece_filters` | filterChain | type 継承 | 値要素 |
| `positionals` | array[node] | なし | 任意ノード |
| `ref` | string | なし | 任意ノード |
| `repeat` | boolean \| object ({min?,max?,lazy?}) | なし | 任意要素 |
| `required` | boolean | false | 任意要素 |
| `required_group` | array[string] | なし | 任意要素 |
| `requires` | array[string] | なし | 任意要素 |
| `self` | `"drop"` \| `"keep"` | `"drop"` | `type:"dd"` の要素 |
| `seq` | array[node] | なし | 枝ノード |
| `short` | string | なし | option 要素 |
| `type` | registryIdentifier | なし | 葉ノード / 任意ノード (糖衣プリセット選択) |
| `value` | any | なし | 実体だけノード |
| `value_filters` | filterChain | type 継承 | 値要素 |
<!-- kuu-lint:end -->

正本: `schema/wire.schema.json` の `$defs.node.properties` (本表と 1:1 対応、`just lint-reference`
が機械検査)。

### 2.2 カテゴリ別詳細

#### 名前・識別子

**`name`**
名前軸 (key name / def name) のデフォルト供給源。配置で役割が決まる — `options[]`/`positionals[]`/
`commands[]` に置けば key name (結果キー + lexical スコープを作る)、`definitions` 配下に置けば
def name (ref/link 対象、結果非露出)。
最小例: `{"name": "verbose", "type": "flag", "long": true}`
正本: DESIGN §2.1, §2.3, DR-024, DR-025

**`id`**
参照識別子。ref/link の解決対象になるが、結果には露出せずスコープも作らない。nameless 要素に
ref/link したい場合に単独で付与する。
最小例: `{"id": "color_template", "type": "string"}`
正本: DESIGN §2.1, DR-046

**`type`**
`definitions.types` / `registry.types` への型参照糖衣。解決順は `definitions.types.X →
registry.types.X → warn+string フォールバック`(ユーザ定義が組み込みを shadow する前方互換)。
最小例: `{"name": "port", "type": "int"}`
正本: DESIGN §3.1〜3.2, DR-028

**`export_key`**
結果キー名の明示上書き。`null` または `""` で結果キー軸なし (透過) — name 無しノードと同じ挙動
になる。
最小例: `{"name": "verbose", "type": "flag", "export_key": "v"}`
正本: DESIGN §2.4, DR-046/052

#### 構造プリミティブ

**`or`**
子から 1 つ選ぶ (排他)。空配列 (恒不成立)・1 児 (退化) とも合法。
最小例: `{"name": "color", "or": [{"exact":"red"},{"exact":"green"},{"exact":"blue"}]}`
正本: DESIGN §1.1, §5.1, DR-067

**`seq`**
子を順に消費する。値は子の値の配列 (単独要素なら単独)。
最小例: `{"seq": [{"type":"number","name":"r"},{"type":"number","name":"g"},{"type":"number","name":"b"}]}`
正本: DESIGN §1.1, §5.1

**`options` / `positionals` / `commands`**
配置で役割を決める 3 配列 (§1 参照)。

**`definitions`**
参照・テンプレの名前空間。区分 (`types`/`accumulators`/`collectors`/`filters`/`multiple`/
`completers` 等) → 名前 → 定義。区分名は open、区分は必須 (糖衣で省略しない)。
最小例: `{"definitions": {"types": {"color": {"type":"string","values":["red","green","blue"]}}}}`
正本: DESIGN §10.4, DR-035

**`exact`**
トークン照合消費プリミティブ。裸リテラル (`"red"` / `255` / `true`) の展開先。
最小例: `{"exact": "red"}`
正本: DESIGN §5.1〜5.2

**`value`**
非消費の literal 値。入口属性 (long/short/positional 位置) を持たない「実体だけノード」を作る
(link のプレースホルダ・環境変数専用・ハードコード設定などに使う)。
最小例: `{"name": "timeout", "type": "number", "value": 30}`
正本: DESIGN §4.5, §5.2

#### 値源

**`default`**
値源ラダー (§11.4) の第 5 段、最終フォールバック。
最小例: `{"name": "port", "type": "int", "default": 8080}`
正本: DESIGN §11.4, DR-031

**`inherit`**
自身に値がなければ祖先 scope chain で同 name を探す (値源ラダー第 4 段)。`default` と排他。
最小例: `{"name": "ttl", "type": "number", "inherit": true}`
正本: DESIGN §11.2

**`inheritable`**
祖先スコープからも `--<定義スコープ名>-<name>` の綴りで書き込み可能にする (全祖先で同じ綴り、
DR-059)。祖先で書いた値はその祖先スコープの結果キーにも露出する。
最小例: `{"name": "ttl", "type": "number", "inheritable": true, "default": 60}`
正本: DESIGN §11.3, DR-059

**`env`**
環境変数名 (値源ラダー第 2 段)。`env_prefix` (§4) があれば自動連結。
最小例: `{"name": "port", "env": "PORT"}`
正本: DESIGN §12, DR-049

**`config_key`**
config 階層への明示対応パス (link と同じ固定パス DSL、ルートからの絶対パス)。未指定なら
name スコープ階層と同型対応。
最小例: `{"name": "port", "config_key": ["server", "port"]}`
正本: DESIGN §14.3, DR-050

**`global`**
宣言スコープの要素をコマンド部分木の全子孫スコープの greedy 面へ構造コピーする (不動点反復で
孫まで多段伝播)。コピーは新セルを作らず祖先 (宣言元) の実体へ link 同期する衛星 — 子内で発火
しても値は宣言元セルに書かれ、結果は宣言元スコープのキーに現れる (子スコープは `{}`)。中間
command が同トリガを shadow すると、それより先の子孫にはコピーが届かない (shadow は subtree
全体に及ぶ)。中間 command 自身も `global: true` なら、そこから独立に再伝播が始まる (`fixtures/
command-scope/mid-global-repropagation.json`)。`inheritable` (子孫→祖先方向に書ける) の鏡像対称。
最小例: `{"name": "verbose", "type": "flag", "long": true, "global": true}`
正本: DESIGN §11.3 (鏡像対称の記述), §13.1, §14.1〜14.2, DR-042, `fixtures/command-scope/global.json`

#### CLI 起動

**`long`**
long 入口。`true` = `[":set"]` の糖衣 (主入口のみ)。配列は variant DSL の一級リストで、各要素が
入口を 1 個生む (`:set` = 主入口、`"no:set:false"` 等 = variant)。`absent = false = [] = 入口なし`
は全て同義。
最小例: `{"name": "verbose", "long": true}` / `{"name": "color", "long": ["no:set:false"]}`
正本: DESIGN §7.1, §7.3〜7.5, DR-071, DR-011

**`short`**
文字列の各文字が個別 short オプションになる (variant 概念を持たない)。
最小例: `{"name": "verbose", "short": "v"}`
正本: DESIGN §7.1

**`alias`**
canonical 実体への別入口参照 (参照ファミリーの 3 人目: `ref` = 構造継承 / `link` = 値同期 /
`alias` = 別入口)。効果は canonical の実体セルへ、結果キーは canonical のみ。name から導出される
入口 (long 配列・command 名照合) は alias の name で再導出されるが、明示綴り (`short` 等) は
継承しない。
最小例: `{"alias": "port", "short": "n"}`
正本: DESIGN §14.5, DR-057

**`deprecated`**
非推奨マーカー。受理は不変 (パース挙動に影響しない)、起動時に `ParserContext.warnings` へ構造化
警告を積む。値は bool のみ。
最小例: `{"name": "old_flag", "type": "flag", "long": true, "deprecated": true}`
正本: DESIGN §14.4, DR-058

#### 多値 (multiple / repeat)

**`multiple`**
複数値経路のスイッチ。担うのは値の畳み方 (accumulator/collector/separator) のみで、出現回数の
反復構造は `repeat` が担う。プリセット名 (string) または `{accumulator, collector?, separator?}`
の詳細形。組み込みプリセット: `append` / `merge` / `set` / `map` (DESIGN §6.4)。
最小例: `{"name": "tag", "type": "string", "multiple": "append"}`
正本: DESIGN §6.1〜6.4, DR-034/036

**`repeat`**
構造閉包 (出現回数の反復)。`true` または `{min?, max?, lazy?}`。宣言した要素の結果は max の値に
依らず配列になる。取り分選好は既定 greedy (長い方から) / `lazy: true` (短い方から)。
最小例: `{"name": "file", "type": "string", "repeat": {"min": 0}}`
正本: DR-043

**`optional`**
`repeat {min:0, max:1}` の糖衣。
最小例: `{"name": "file", "type": "string", "optional": true}`
正本: DR-044

#### filter chain

**`value_filters`**
parse 済みの値 (T) の T→T 変換・検証チェイン (piece 単位)。継承元は ref → type registry の
デフォルト → 空配列の順で解決。
最小例: `{"name": "port", "type": "int", "value_filters": ["in_range:1:65535"]}`
正本: DESIGN §8.3, DR-062

**`piece_filters`**
separator 分割後の piece に対する String→String チェイン (parse 直前)。
最小例: `{"piece_filters": ["trim"]}`
正本: DESIGN §8.3, DR-062

**`final_filters`**
確定した最終値への T→T チェイン (非 accum 値要素専用、`multiple`/`repeat`/`separator` のいずれも
持たない要素)。accum 要素への宣言は definition-error kind=invalid-range。
最小例: `{"name": "verbose", "type": "count", "final_filters": ["in_range:0:2"]}`
正本: DESIGN §8.3, DR-102

**`accum_filters`**
累積後 (accumulator 後) の Acc→Acc チェイン (accum 値要素専用、`multiple`/`repeat`/`separator` の
いずれかを持つ要素、cell 単位)。非 accum 要素への宣言は definition-error kind=invalid-range。
最小例: `{"multiple": "append", "accum_filters": ["unique"]}`
正本: DESIGN §8.3, DR-102

filter chain は全て配列 (差し替え・継承なし) / `{prepend?, append?}` (継承 chain への合成、
合成順は `prepend ++ 継承 chain ++ append`) の二形を取る (DR-062)。

#### 制約

**`required`**
充足の強制。判定は型委譲 (DR-093): 値空間を持つ要素は最終状態の値の有無 (default 込み)、値空間
なしの要素 (`type:"none"`、dd 含む) は発火 (committed) したこと。
最小例: `{"name": "filename", "type": "string", "required": true}`
正本: DESIGN §9.1, DR-093

**`exclusive_group`**
同じグループ名の要素群が排他 (最大 1 つ起動)。string[] で複数グループ所属可。3+ 要素の相互排他
はこちら。
最小例: `{"name": "json", "exclusive_group": ["format"]}`
正本: DESIGN §9.2

**`required_group`**
グループ member のうち少なくとも 1 つが `required` と同じ型委譲充足を満たすこと (論理和)。
`exclusive_group` とは名前空間が独立 (同名文字列でも別々に評価) — 同名併用で exactly-one を
合成できる。単独 member は `required: true` と等価に縮退する。
最小例: `{"name": "create", "exclusive_group": ["mode"], "required_group": ["mode"]}`
正本: DESIGN §9.3, DR-103

**`conflicts_with`**
名指しのペア排他。意味は対称 — 片側に書けば両方向に効く。2 要素のペア排他が対象。
最小例: `{"name": "foo", "conflicts_with": ["bar"]}`
正本: DESIGN §9.5, DR-055

**`requires`**
自分が起動された時、列挙された name の要素群も起動されている必要がある (正の依存)。目的語の
充足判定も `required` と同じ型委譲 (DR-093): 値空間ありは値の有無、bool 型は解決後の値が
true であること (値源不問)、値空間なしは発火 (committed)。
最小例: `{"name": "decrypt", "requires": ["key-file"]}`
正本: DESIGN §9.4, DR-093

#### 参照

**`ref`**
name 参照 (構造継承)。ref 元の構造を全継承し、差分フィールドだけ書く。
最小例: `{"ref": "color_template", "name": "fg"}`
正本: DESIGN §10.1, DR-032

**`link`**
値セル参照の固定パス DSL (`.name` / `[int]`、負インデックス含む)。1 実体・N 参照の値同期。
解決は遅延 (実行時)。
最小例: `{"short": "v", "type": "count", "link": "log-level"}`
正本: DESIGN §10.2, DR-029

#### dd 専用 (`type: "dd"`)

**`match`**
pattern トリガ (正規表現、host 実装準拠の照合方言、DR-085 §2 と同じ宣言)。未指定なら exact
`"--"` の従来 dd。`match` があるとき name はトリガ綴りに使われず、要素の同一性・表示軸のみに効く。
最小例: `{"type": "dd", "match": "^[^\\-]", "self": "keep"}` (xargs 型: 最初の非ハイフン operand
で発火)
正本: DR-090

**`self`**
マーカー自身の扱い。`"drop"` (既定) = 消費 1・捨てる (従来 dd)。`"keep"` = 消費 0 で Accept し、
判定基準となったトークン自身を含めて以降を positional 域へ流す。
正本: DR-090

#### config

**`config`**
installer/factory の config パラメータ。階層継承可能 (子要素は親の config を継承・上書き可能。
継承は command scope に限らず個々の option/positional 要素単位でも上書きできる)。標準の scope
config キーは §4、factory config キーは §3 を参照。
最小例: `{"config": {"long_prefix": "--", "short_combine": true}}`
正本: DESIGN §7.2, DR-061

### 2.3 UsefulAST 糖衣属性 (lint 対象外・手動転記)

以下は UsefulAST 層 (人間が書く層、DESIGN §0.2) の糖衣属性で、parse_definition() の A 群構文正規化
または表示メタの非搬送規約 (DR-046 §3) により **wire 正規形には現れない** — `schema/
wire.schema.json` の `$defs.node.properties` に持たず、additionalProperties が開いているため
構文検査は通るが機械的な網羅性検査 (§2.1 の `just lint-reference`) の対象にはできない。**本表が
これらの糖衣属性の唯一のカタログ**であり、audience (定義 JSON を書くアプリ開発者) にとっては
§2.1/§2.2 と同格の必須語彙。

**`values`**
型: array。適用対象: 値要素 (name を持つノードに同居可)。
意味論: `or` のショートハンド糖衣。各要素は照合消費の `exact` に展開される (非消費の literal では
enum にならない)。要素に配列があれば `seq` ブランチに展開される。`long`/`short` (入口の有無) や
値源ラダー (default/env/config) とは直交する軸で同一ノードに同居できる。
最小例: `{"name": "color", "values": ["red", "green", "blue"]}` は
`{"name": "color", "or": [{"exact":"red"},{"exact":"green"},{"exact":"blue"}]}` の糖衣。
正本: DESIGN §5.3

**`help`**
型: string。適用対象: 任意ノード。
意味論: 説明文言 (表示メタ)。`display_name`/`value_name` と同じく UsefulAST 専用で AtomicAST に
搬送しない (パース挙動に影響しない)。多言語対応は UsefulAST 層 (各言語 DX) の関心。**`type:
"help"` (糖衣プリセット、§3.1) とは別概念** — こちらはフィールド名としての説明文言、`type:"help"`
は組み込み help アクションを選択する type 参照。
最小例: `{"name": "port", "type": "int", "help": "listen port"}`
正本: DESIGN §1.4, §2.2, DR-046 §3

**`display_name`**
型: string。適用対象: 任意ノード。
意味論: help でその引数を指す人間可読な説明ラベル (例: 「ポート番号」)。名前の 4 軸
(id/export_key/value_name/display_name) の 1 つで、`name` がデフォルト供給源 (未指定なら name
をそのまま使う)。表示メタなので AtomicAST 非搬送。
最小例: `{"name": "port", "type": "int", "display_name": "port number"}`
正本: DESIGN §2.1, DR-046 §1/§3

**`value_name`**
型: string。適用対象: 値要素。
意味論: help/usage の値プレースホルダ表示 (`<PLACEHOLDER>`)。指定なしなら key name / type 名 /
def name を uppercase 化 (ASCII 英字のみ、非 ASCII はそのまま) して導出。ref 継承 + 入口側での
上書きが可能。表示メタなので AtomicAST 非搬送。
最小例: `{"name": "port", "type": "int", "value_name": "PORT"}`
正本: DESIGN §2.1〜2.2, DR-024, DR-046 §1/§3

**`hidden`**
型: boolean。適用対象: 任意要素。
意味論: help 一覧・補完候補の両方から除外する。パース挙動 (CLI からの受理可否) には影響しない
(受理は不変)。`deprecated` (wire 正規形の属性、§2.1) と同じ「挙動と表示の分離」の流儀だが、
`hidden` 自体は表示メタとして wire に載らない。
最小例: `{"name": "internal_flag", "type": "flag", "long": true, "hidden": true}`
正本: DESIGN §14.4, DR-058

---

## 3. type カタログと factory config

### 3.1 type 一覧

値プリミティブ (葉) と糖衣プリセットの総覧。**本節は正本 (DESIGN §3.3) からの手動転記であり、
機械検査の対象外** — `schema/builtin-descriptors.json` に descriptor 実体を持つのは §3.2 の
configurable factory 4 種のみで (`reasons: []` が自明な型は descriptor 化されていない、
DR-095 射程外)、それ以外の type は本表が唯一のカタログになる。

| type | 種別 | 意味論 | 正本 |
|---|---|---|---|
| `string` | 値プリミティブ | 任意バイト列受理、検証は filters opt-in | DESIGN §3.3 |
| `number` | 値プリミティブ | 汎用数値 (整数・小数)。canonical 寛容 10 進字句 | DESIGN §3.3, DR-074 |
| `int` | 値プリミティブ | number 字句 + 値空間判定で整数のみ受理 (`int_round`) | DESIGN §3.3, DR-075 |
| `float` | 値プリミティブ | number + inf 受理の別名 (number 自体は inf 非受理) | DESIGN §3.3, DR-074 |
| `bool` | 値プリミティブ | true/false 語彙 (`builtin/bool_parser`) | DESIGN §3.3, DR-074 |
| `path` | 値プリミティブ | バイト列受理、検証は filters opt-in | DESIGN §3.3 |
| `file` | 値プリミティブ | 同上 | DESIGN §3.3 |
| `dir` | 値プリミティブ | 同上 | DESIGN §3.3 |
| `datetime` | 値プリミティブ | canonical 字句仕様は未確定 | DESIGN §3.3, DR-095 射程外 |
| `exact` | 値プリミティブ | codepoint 単位・正規化なしの照合消費 | DESIGN §3.3 |
| `none` | 値空間なし | dd 等。充足判定は発火 (committed) のみ | DR-089, DESIGN §9.1 |
| `flag` | 糖衣プリセット | bool + `default:false` + 起動で true | DESIGN §3.3 |
| `count` | 糖衣プリセット | number + `default:0` + increment アキュムレータ (値は取らない) | DESIGN §3.3 |
| `count_or_set` | 糖衣プリセット | count + optional 値スロット。`-v`=increment、`-v 3`=set | DESIGN §3.3, DR-040 |
| `command` | 糖衣プリセット | name でスコープを作り name 完全一致でトリガ | DESIGN §3.3, §4.2 |
| `help` | 糖衣プリセット | 起動時アクション (失敗時も候補経路で selected なら発火) | DESIGN §3.3, §14.1 |
| `dd` | 糖衣プリセット | greedy 面のトリガ兼消費者 (`--`)。§2.2「dd 専用」参照 | DESIGN §3.3, DR-064/090 |
| `tty` (`builtin/tty`) | 糖衣プリセット / factory | bool を土台に、暗黙 default = tty 観測の fold | DESIGN §3.3, §12b, DR-099 |
| `config_file` | 特殊 type | config ファイルパスの配線宣言 | DESIGN §14.3, DR-050 |

### 3.2 configurable factory カタログ

<!-- kuu-lint:vocab type-factories -->
| factory | kind | 意味論 |
|---|---|---|
| `builtin/number_parser` | factory | number/float 共通の value_parser。構文不一致は全て `not_a_number` |
| `builtin/int_parser` | factory | int の値空間判定 value_parser (number として読み、値が整数かで判定) |
| `builtin/bool_parser` | factory | bool の value_parser |
| `builtin/tty` | factory | bool を値空間の土台にする preset 型 — 暗黙 default = tty 観測の fold (§3.1 の tty 行・DR-099) |
<!-- kuu-lint:end -->

定義側での参照形は `{"name": "<factory名>", "config": {...}}` (canonical default = factory の
default config)。`type:` から直接 bare 名で参照する場合は `definitions.types` 経由でローカル名を
作ってから使う (`tty_stream` 必須のため bare `type: "tty"` は definition-error、§3.3 参照)。

最小例:

```json
"definitions": {
  "types": {
    "stdout_tty": {"name": "builtin/tty", "config": {"tty_stream": "stdout"}}
  }
}
```

正本: DESIGN §3.4, §12b, DR-061, DR-094, DR-099

### 3.3 factory config キー

<!-- kuu-lint:vocab factory-config-keys -->
| キー | factory | 型 | 既定値 | 意味論 |
|---|---|---|---|---|
| `number_thousand_sep` | `builtin/number_parser` | array[string] | `["_"]` | 桁区切り文字集合。canonical は underscore のみ |
| `number_allow_base_prefix` | `builtin/number_parser` | boolean | `false` | `0x`/`0o`/`0b` + hex float の統合 opt-in |
| `number_leading_zero` | `builtin/number_parser` | `"decimal"`\|`"octal"` | `"decimal"` | 先頭 0 の解釈。octal は移植ロック用 opt-in |
| `int_round` | `builtin/int_parser` | enum (10 種、下記) | `"error"` | 非整数値の丸めモード |
| `bool_true_values` | `builtin/bool_parser` | array[string] | `["true","1"]` | true と解釈する文字列集合 |
| `bool_false_values` | `builtin/bool_parser` | array[string] | `["false","0",""]` | false と解釈する文字列集合 (空文字含む、env の `FLAG=` 対応) |
| `bool_case_insensitive` | `builtin/bool_parser` | boolean | `true` | 大小無視で照合するか |
| `tty_stream` | `builtin/tty` | `"stdin"`\|`"stdout"`\|`"stderr"` | **必須** (未指定は definition-error) | `tty_provider` へ渡すストリーム識別子 |
| `tty_cygwin` | `builtin/tty` | boolean | `true` | Cygwin/MSYS pty を terminal 扱いに含めるダイヤル |
<!-- kuu-lint:end -->

`int_round` の 10 種: `floor` / `ceil` / `trunc` / `away` / `half_floor` / `half_ceil` /
`half_trunc` / `half_away` / `half_even` / `error` (非 half 4 種 × half 4 種 + half_even + error)。

**config キーの命名規約 (DR-100)**: canonical のキー名は factory 名由来の prefix を持つ
(`number_*` / `int_*` / `bool_*` / `tty_*`)。bare 綴り (prefix 外し) が欲しい場合は正準語彙の
リネームでなく、ユーザランドの語彙糖衣 alias 機構 (vocab_alias installer 構想、
`docs/issue/2026-07-12-vocab-alias-installer.md`) が対応する。

正本: DESIGN §3.4, DR-074, DR-075, DR-099, DR-100

---

## 4. scope config ダイヤル

`config` フィールド (階層継承、§2.2) が持つ標準の option/env 表面ダイヤル 7 キー。

<!-- kuu-lint:vocab config-keys -->
| キー | 型 | 既定値 | 意味論 |
|---|---|---|---|
| `long_prefix` | string | `"--"` | long 入口の前置文字列。空文字列 (`""`) も無条件に合法 (bare long) |
| `long_eq_sep` | `"require"`\|`"allow"`\|`"deny"` | `"allow"` | long の eq 分割形 (`key=value`) と space 分割形 (`key value`) の入口ダイヤル |
| `short_prefix` | string | `"-"` | short 入口の前置文字列 |
| `short_attached_value` | `"require"`\|`"allow"`\|`"deny"`\|`"last_only"` | `"allow"` | 値持ち short の付着形 (`-O2`) と space 分割形 (`-O 2`) の入口ダイヤル |
| `short_combine` | boolean | `true` | 複数 short オプションを 1 トークンに束ねるクラスタ読み (`-ab`=`-a -b`) の可否 |
| `env_prefix` | string | なし | env 名の前置連結 (要素単位で `""` に上書きし prefix なしを明示可) |
| `env_auto` | boolean | `false` | `env:` 未指定の値セル持ち要素へ env 席を自動宣言 (`UPPER(env_prefix)_UPPER(スコープパス)_UPPER(name)`) |
<!-- kuu-lint:end -->

`short_attached_value` の 4 値の意味論:

| 値 | 付着形 (`-O2`) | space 形 (`-O 2`) |
|---|---|---|
| `require` | 全分割点を列挙 (1 文字以上必須) | 読み枝なし |
| `allow` (既定) | 全分割点を列挙 | 読み枝あり |
| `deny` | 読み枝なし | 読み枝あり |
| `last_only` | 丸取り形 1 通りのみ (GNU getopt 慣習) | 読み枝あり |

ダイヤルは要素単位でも上書きできる (`{"config": {"short_attached_value": "require"}}`、
DR-049 §4 と同機構) — gcc/clang のように `-O`/`-W` は attach-only、`-I`/`-l` は両対応、という
per-option 差を表現する (§8 の `gcc.json` 参照)。

正本: DESIGN §7.2, DR-096, DR-100

---

## 5. dd (`--` および pattern dd)

dd は「効果が値セルへの書き込みでなく severed 化 (発火以降 greedy 面 off、全トークンが raw) で
ある特殊な flag」。canonical 配置は `options[]` (DR-064)。

| 属性 | 型 | 既定値 | 意味論 |
|---|---|---|---|
| `type` | `"dd"` | — | 必須。dd installer が回収する糖衣プリセット |
| `name` | string | `"--"` (プリセット供給) | トリガ綴り軸にのみ効く。dd は値セルを持たないため export_key を設定しても結果には現れない |
| `match` | string (regex) | なし | pattern トリガ。指定時は name でなく pattern がトリガになる |
| `self` | `"drop"`\|`"keep"` | `"drop"` | マーカー自身を消費して捨てる (drop) か、消費 0 で自身を positional 域へ残す (keep) |

2 つの canonical な組合せ:

```json
{"type": "dd"}
```
従来 dd。exact `"--"` の完全一致で発火、消費 1・捨てる。

```json
{"type": "dd", "match": "^[^\\-]", "self": "keep"}
```
xargs 型。最初の非ハイフン operand (utility 名) で発火、そのトークン自身から positional 域が
始まる (`self:"keep"` で消費 0)。severed の効果 (greedy 面 off) だけが働き、positional 席の
構造消費 (型・順序・必須) はそのまま生きる — utility 名を型付き positional として残せる。

`--` の発火有無を知りたい場合、結果オブジェクトへ出す道は無い (dd は値セルを持たないため) —
正規解は `ParserContext.selected`。

正本: DR-064, DR-090, `fixtures/dd/*.json`

---

## 6. builtin filter カタログ

<!-- kuu-lint:vocab filters -->
| filter | signature | reasons | 意味論 |
|---|---|---|---|
| `trim` | Transform | (空) | 文字列前後の ASCII 空白除去。非 string 入力は素通し |
| `non_empty` | Validate | `empty_value` | 空文字列を拒否 |
| `in_range` | Validate | `too_small`, `too_large` | 数値の範囲検証 (value_filters/final_filters 両方で使用可) |
| `regex_match` | Validate | `pattern_no_match` | pattern への部分一致検証 (unanchored、全体一致は `^$` で表現)。compile 失敗は definition-error (実行時 reason ではない) |
| `increment` | Transform | (空) | count 要素の update transform (0-arg、`old+1`) |
| `unique` | Transform | (空) | 累積後の配列 (`Acc→Acc`、accum_filters 相) から重複要素を除去 (先勝ち順序保持) |
<!-- kuu-lint:end -->

`signature` が reasons の有無を機械的に決める: **Transform (常に成功) は `reasons: []`**、
**Validate (拒否しうる) のみ非空の reasons を持つ** (DR-095 §3)。

### filter の config キー

<!-- kuu-lint:vocab filter-config-keys -->
| キー | filter | 意味論 |
|---|---|---|
| `min` | `in_range` | DSL 第 1 引数、下限 (含む) |
| `max` | `in_range` | DSL 第 2 引数、上限 (含む) |
| `pattern` | `regex_match` | DSL 唯一引数、host 方言準拠の正規表現 |
<!-- kuu-lint:end -->

これらは filter *呼び出し* の DSL 引数 (`"in_range:1:65535"` の `1`/`65535`) の意味論注記であり、
descriptor の config キー宣言そのものではない (呼び出しごとの `args` と、factory のデプロイ時
config は別の相、DR-061 §5)。

最小例: `{"value_filters": ["in_range:1:65535"]}` / `{"piece_filters": [{"name": "regex_match",
"args": ["^[A-Za-z_][A-Za-z0-9_]*="]}]}`

正本: DESIGN §8, `schema/builtin-descriptors.json`, DR-095

---

## 7. failure reason 語彙

### 7.1 outcome (DR-053)

`parse()` の返値は 3 種の discriminated union: `success` / `failure` / `ambiguous`
(パース成功条件は「入力を全消費する完全解決経路がちょうど 1 本」、DR-038)。`failure` の
`errors[]` が本節の reason 語彙を持つ。

### 7.2 kind (層) と reason (機械可読識別子)

`{element, argv_pos, kind, reason, message}` の `kind` は 3 値、`reason` は kind の中の細分:

| kind | 意味 |
|---|---|
| `parse` | 型照合・経路構築の失敗 (構造的必須の不成立・残余トークン・value_parser の型照合失敗) |
| `filter` | filter chain の Error (DR-037) |
| `constraint` | 遅延述語 (`required`/`required_group`/`requires`/`exclusive_group`/`conflicts_with`) の違反 |

`reason` は fixture では optional 検証 (書けば比較、書かなければ kind までの検証、DR-066 §5)。

### 7.3 エンジン構造発生源の reason (v1 語彙、DR-066)

installer 発生源 (下表) は `schema/builtin-descriptors.json` の descriptor 化対象外
(DR-095 §射程外) — 本節は DR-066 §3 の v1 表からの手動転記であり、**機械検査の対象外**。

| kind | reason | 意味 |
|---|---|---|
| `parse` | `missing_operand` | トークンが尽きて要素の消費要求が満たせない |
| `parse` | `unexpected_token` | 消費者の居ないトークンが残る (残余トークン) |
| `constraint` | `required_violated` | `required` の値充足 (DR-047) 失敗 |
| `constraint` | `required_group_violated` | `required_group` 内のいずれの member も値充足しない (DR-103) |
| `constraint` | `requires_violated` | `requires` の目的語不足 |
| `constraint` | `exclusive_group_violated` | `exclusive_group` 内の committed 衝突 |
| `constraint` | `conflicts_with_violated` | `conflicts_with` の committed 衝突 |

constraint 系は `<属性名>_violated` で機械的に統一されている。

### 7.4 builtin filter が emit する reason

<!-- kuu-lint:vocab filter-reasons -->
| reason | filter | 意味 |
|---|---|---|
| `empty_value` | `non_empty` | 空文字列を拒否 |
| `too_small` | `in_range` | 下限未満 |
| `too_large` | `in_range` | 上限超過 |
| `pattern_no_match` | `regex_match` | 有効にコンパイルされた pattern に対象文字列が不一致 (compile 失敗は definition-error 側の `kind` で扱い、本語彙には含まない) |
<!-- kuu-lint:end -->

### 7.5 builtin type factory が emit する reason

<!-- kuu-lint:vocab factory-reasons -->
| reason | factory | 意味 |
|---|---|---|
| `not_a_number` | `builtin/number_parser`, `builtin/int_parser` | number/float の構文不一致 (int も number 字句で判定するため、number として全く読めない入力はここに落ちる) |
| `not_an_integer` | `builtin/int_parser` | number としては読めるが整数でない入力。`int_round:"error"` の時のみ emit (丸めモードでは丸めて成功するため emit しない) |
| `int_out_of_range` | `builtin/int_parser` | 整数値としては読めるが実装定義の値域 (参照実装は Int64) を超える |
| `not_a_bool` | `builtin/bool_parser` | canonical 語彙外の入力 (例 `"yes"`) |
<!-- kuu-lint:end -->

`builtin/tty` は `reasons: []` — 本 factory 固有の失敗は definition-error (`tty_stream` 必須違反)
のみで実行時 reason を持たない。

正本: DR-066, DR-095, `schema/builtin-descriptors.json`, `docs/CONFORMANCE.md` §2

---

## 8. 付録: corpus/real-cli への逆引き

`corpus/real-cli/` (非正本・実験用、`corpus/real-cli/README.md`) は実在コマンドを kuu で書いた
表現力検証コーパス。kuu の機能がどの実世界パターンに対応するかの逆引きに使える。

| 実世界パターン | corpus ファイル | 対応する kuu 機能 |
|---|---|---|
| short オプションへの値の直接付着のみ、クラスタ結合なし (gcc/clang 型) | `gcc.json` | `short_combine:false` (scope 既定) + 要素単位 override `short_attached_value:"require"` (`-O`/`-W` のみ attach-only、`-I`/`-l` は scope 既定 `"allow"` のまま両対応) |
| GNU getopt 慣習のクラスタ末尾値 short 丸取り (BSD tar 実機) | `tar.json` | 要素単位 override `short_attached_value:"last_only"` |
| 素の短縮オプション混在 (bool short flag 群 + 値付き `-A`/`-B`/`-C num` + `--context=num` の eq 連結) | `grep.json` | `short_combine:true` (既定) のクラスタ読み、`long_eq_sep:"allow"` (既定) の eq-split matcher |
| dd 越しの variadic string 収集 + enum 選択 (`--trim each/all/none`) + stdin の TTY 分岐 | `die.json` | 従来 dd (`{"type":"dd"}`) + `requires:["--"]` (DR-093) + `or`/`exact` 糖衣 + `type:"stdin_tty_t"` (`builtin/tty`、`definitions.types` 経由) |
| 最初の非ハイフン operand (utility/destination/image 名) 以降を丸ごと子コマンドへ委譲 (xargs/ssh/docker) | `xargs.json`, `ssh.json`, `docker.json` | pattern dd + `self:"keep"` (`{"type":"dd","match":"^[^\\-]","self":"keep"}`、DR-090) — severed 化は greedy 面のみ off、utility/destination/image 自体は positional 側で型付き必須消費を継続 |
| 前置 `KEY=VALUE` 代入列 + 後続コマンド委譲 (`env FOO=bar cmd`) | `env.json` | pattern dd の合成形 `^[^\-][^=]*$` (代入トークンを pattern から除外) + `piece_filters: [{"name":"regex_match","args":["^[A-Za-z_][A-Za-z0-9_]*="]}]` (DR-090 §4, DR-091) |
| 固定綴りの primary が有限集合の long_prefix 選択型 (`find -name` 等) | `find.json` | `long` + `values` (or 糖衣)。ただし find の論理演算子・括弧による述語ツリー・`-exec ... \;` 終端子は表現力の限界として `find.json` の `why` に明記 (kuu の平坦な近似が届かない領域) |
| bare な名前一致トリガ (`height 168.5` 型、prefix なし long) | `fixtures/matcher-readings/long-empty-prefix*.json` | `config: {"long_prefix": ""}` (無条件合法、DR-096 §3.3)。素の operand との衝突は、**読みが成立する限り**先食い (DR-041) が option 優先で決定的に解決。読みが成立しない (値照合失敗・operand 枯渇) トークンは素通しで positional に落ちる (DR-097 — `long-empty-prefix-typed.json` の `height height` 型がその境界例) |

正本: `corpus/real-cli/README.md` (位置づけ = 非正本・conformance 実食対象外)、各ファイルの `why`
フィールド (DR 根拠を文中に持つ)
