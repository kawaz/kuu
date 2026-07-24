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
> 機械検査の対象は wire 正規形の語彙のみ。UsefulAST 専用の糖衣属性 `values` は wire の properties に
> 持たないため機械検査の対象外だが、定義 JSON を書く上で必要なので §2.3 に手動転記する。
> `hidden` は wire node property として §2.1 の双方向検査対象に含まれる。

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
| `definitions{}` | object | 参照・テンプレの名前空間 (`types`/`accumulators`/`filters`/`cell_fns`/`multiple`/`completers` 等の区分、区分名は open) | DESIGN §10.4, DR-035 |
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
| `$schema` | string | なし | トップレベル definition 直下のみ (JSON Schema エコシステム annotation、inert、DR-068 §4) |
| `accum_filters` | filterChain (array \| {prepend?,append?}) | 空 | accum 要素専用 (`multiple`/`repeat`/`separator` のいずれか、DR-102) |
| `alias` | string | なし | 独立要素 (canonical への別入口) |
| `commands` | array[node] | なし | 任意ノード |
| `completer` | registryIdentifier | なし | 値要素 (補完クエリの値位置候補生成) |
| `config` | object | 親から継承 | 任意ノード |
| `config_key` | array[string\|integer] | name スコープ階層と同型対応 | 値要素 |
| `conflicts_with` | array[string] | なし | 任意要素 |
| `default` | any | なし | 値要素 |
| `default_fn` | string \| array[string] | なし | 値要素 (default 席の cell_fns 呼び出し、DR-114) |
| `definitions` | object | なし | 任意ノード |
| `deprecated` | boolean | false | 任意要素 / alias 要素 |
| `display_name` | string | name 由来 | 任意ノード (表示メタ) |
| `env` | string | なし | 値要素 |
| `exact` | string \| boolean \| number | なし | 葉ノード |
| `exclusive_group` | array[string] | なし | 任意要素 |
| `export_key` | string \| null | name 由来 | name を持つノード |
| `final_filters` | filterChain (array \| {prepend?,append?}) | 空 | 非 accum 値要素専用 (DR-102) |
| `global` | boolean | false | options/positionals 配下の要素 |
| `help` | string | なし | 任意ノード (表示メタ) |
| `help_after` | string | なし | options/commands の entry (相対配置) |
| `help_epilog` | string | なし | スコープ要素 (表示メタ) |
| `help_group_description` | string | なし | グループ宣言エントリ |
| `help_group_name` | string | なし | options の通常 entry / グループ宣言エントリ |
| `help_group_order` | number | 宣言 index | グループ宣言エントリ |
| `help_group_title` | string | グループ名 | グループ宣言エントリ |
| `help_long` | string | なし | 任意ノード (表示メタ) |
| `help_on_failure` | boolean | preset 依存 | 5 help preset 専用 (`help_show_hidden` は false、他 4 種は true) |
| `help_order` | number | 宣言 index | options/commands の通常 entry |
| `help_render` | object ({template?, value_structure_style?, types_style?, origin_style?}) | なし | ルート definition / command 要素 (canonical レンダラ指示、DR-115 §1.1) |
| `help_value_structure_style` | string (enum: `"auto"` \| `"inline"` \| `"detail"`) | 一括席から継承 | 任意 entry (entry 個別席、DR-115 §1.2) |
| `hidden` | boolean | false | 任意要素 (表示 policy 用メタ、受理は不変) |
| `id` | string (`#` 禁止) | name を兼ねる | 全ノード |
| `inherit` | boolean \| {from:string} | false | 値要素 (inherit ラダー席) |
| `insert_form` | string (`"space"` \| `"eq"`) | `"space"` | `type:"completion_script"` 要素 (DR-117 §2.6) |
| `inheritable` | boolean | false | 値要素 |
| `link` | string | なし | 任意ノード |
| `long` | boolean \| array[longItem] | false (`[]`) | option 要素 |
| `match` | string (regex) | なし (未指定 = exact `"--"`) | `type:"dd"` の要素 |
| `multiple` | string \| object | なし (縮退) | 値要素 |
| `name` | string (非空、`#` 禁止) | なし | 全ノード |
| `on_failure` | boolean | false | 任意要素 (失敗時アクション) |
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
| `value_name` | string | uppercase 導出 | 値要素 (表示メタ) |
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

**`completer`**
`definitions.completers` / `registry.completers` への completer 名参照 (値位置候補の生成器配線)。
実行はせず名前だけを返す — 標準 completer (files/dirs 等) は生成器が shell 既存機能へマップし、
アプリ固有の動的候補は生成器が completer 名からアプリ提供関数へ配線する。
最小例: `{"name": "path", "type": "string", "completer": "files"}`
正本: DESIGN §15.13, DR-060 §4

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
参照・テンプレの名前空間。区分 (`types` / `accumulators` / `collectors` / `filters` / `cell_fns` /
`multiple` / `completers` 等) → 名前 → 定義。区分名は open、区分は必須 (糖衣で省略しない)。
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
値源ラダー (§11.4) の default 席に固定値を供給する糖衣。canonical では native JSON value を保持した typed internal `set(value)` 呼び出しになり、string DSL へ serialize しない。
最小例: `{"name": "port", "type": "int", "default": 8080}`
正本: DESIGN §11.4, DR-114 §4

**`default_fn`**
値源ラダーの default 席を `cell_fns` 呼び出しで遅延実体化する。colon-string (`"borrow:base"`) と 1 段 array of string (`["borrow", "base"]`) は同じ呼び出し。上位席の解決後も cell が空なら `observes` 依存グラフの位相順で呼ばれ、default 席では `Value` を返す fn だけを指定できる。
最小例: `{"name": "ttl", "type": "number", "default_fn": "borrow:base-ttl"}`
正本: DESIGN §11.4, DR-087/088, DR-114 §4/§6

**`inherit`**
自身に値がなければ祖先 scope chain で同 name を探す値源ラダー第 4 段。default / default_fn は別の下位席なので同一要素で共存できる。同じ default 席への `default` と `default_fn` の併用だけが definition-error `invalid-range`。
最小例: `{"name": "ttl", "type": "number", "inherit": true, "default": 60}`
正本: DESIGN §11.2, §11.4, DR-114 §4.1

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
long 入口。`true` = `[":set"]` の糖衣 (主入口のみ)。variant の各 item は colon-string または 1 段 array of string で、`["no","set","false"]` と `"no:set:false"` は同じ `cell_fns` 呼び出し。2 部品目が fn 名、後続部品が args となり、`set` / `default` / `unset` / `empty` に限らず任意の適合 cell fn を呼べる。同じ列で string / array を混在でき、array of array は受け入れない。`absent = false = [] = 入口なし` は全て同義。
最小例: `{"name":"verbose","long":true}` / `{"name":"label","long":[["tag","set","a:b"]]}`
正本: DESIGN §7.1, §7.3〜7.5, DR-071, DR-114 §2/§6

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
反復構造は `repeat` が担う。プリセット名 (string) または `{accumulator, collector?, separator?, flatten?}`
の詳細形。`collector` は引数なし resident 名 (string)、または resident 名を唯一のキーとして canonical
引数を値に持つ object。`from_entries` は bare string では指定できず、3 形は `{"from_entries":"entries"}` /
`{"from_entries":["key","value"]}` / `{"from_entries":"key"}` (DR-044)。`flatten` は
`accumulator: "append"` 専用のダイヤル (既定 false) — true で発火値が配列ならその要素を 1 段展開
して積む。他 accumulator への宣言は definition-error kind=invalid-range。
最小例: `{"name": "tag", "type": "string", "multiple": "append"}` /
`{"name": "src", "type": "string", "multiple": {"accumulator": "append", "collector": {"from_entries": "key"}}}`
正本: DESIGN §6.1〜6.4, DR-034/036/044/105

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
合成順は `prepend ++ 継承 chain ++ append`) の二形を取る (DR-062)。各呼び出しは `"name:arg"` または同値の `["name", "arg"]` を受理し、共通 args decode 後に `filters` registry の住人を統一 `FnCtx` (`mode:"filter"`) で呼ぶ。runtime 参照を持つ filter は descriptor の `observes` で依存を宣言する。registry と Reject / Error pipeline は `filters` のまま維持する (DR-114 §3/§6/§7)。

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

#### 失敗時アクション

**`on_failure`**
型: boolean。既定: false。適用対象: 任意要素。
意味論: 完全経路 0 本の失敗時、候補経路 (dead end 込み) で selected なら自分を発火する
(保持 Error に代えて表示動作)。version を失敗時にも出したいアプリが flag に opt-in する等、
help 以外にも汎用。所有は on_failure installer (構造衛星なしの能力宣言型)。
最小例: `{"name": "version", "type": "flag", "long": true, "on_failure": true}`
正本: DESIGN §15.10, DR-048, DR-113 §7.2

**`help_on_failure`**
型: boolean。適用対象: `type:"help"` 系要素専用。help_installer が汎用属性 `on_failure` へ展開する。`help` / `help_all_category` / `help_category` / `help_tree` の既定は true、`help_show_hidden` の既定は false。help type 以外への宣言は definition-error (kind: `invalid-range`)。
最小例: `{"name": "help", "type": "help", "long": true, "help_on_failure": false}`
正本: DESIGN §15.10, DR-113 §7.2

#### 表示メタ (help_installer 所有)

宣言層の inert 属性群 — パース挙動に影響せず、help_installer の help_query capability (DESIGN §15.15) が参照で読む。「AtomicAST 非搬送」(DR-046 §3) は「lowered 産物・評価器へ運ばない」の意で、宣言層 (wire) には載る (DR-113 §1)。

**`help`**
型: string。適用対象: 任意ノード。
意味論: 短い説明文言。**`type: "help"` (糖衣プリセット、§3.1) とは別概念** — こちらはフィールド名
としての説明文言、`type:"help"` は組み込み help アクションを選択する type 参照。多言語対応は
UsefulAST 層 (各言語 DX) の関心。
最小例: `{"name": "port", "type": "int", "help": "listen port"}`
正本: DESIGN §1.4, §2.2, §14.6, DR-046 §3, DR-113 §7.1

**`help_long`**
型: string。適用対象: 任意ノード。
意味論: 長い説明文言 (`help` との 2 本立て、clap の about/long_about 相当)。`-h`/`--help` での
出し分けはレンダラ。未設定側の相互フォールバックは model に持ち込まない (レンダラの推奨 policy)。
最小例: `{"name": "port", "type": "int", "help": "listen port", "help_long": "TCP port to listen on. ..."}`
正本: DESIGN §14.6, DR-113 §7.1

**`help_epilog`**
型: string。適用対象: スコープ要素 (ルート / command)。
意味論: 選択スコープのオプション一覧後に出す自由テキスト素材 (連絡先・注意事項・例の手書き等)。ルート / command のスコープ要素に付ける。
最小例: `{"help_epilog": "Report bugs to <bugs@example.com>."}`
正本: DESIGN §14.6, DR-113 §7.1

**`display_name`**
型: string。適用対象: 任意ノード。
意味論: help でその引数を指す人間可読な説明ラベル (例: 「ポート番号」)。名前の 4 軸
(id/export_key/value_name/display_name) の 1 つで、`name` がデフォルト供給源。
最小例: `{"name": "port", "type": "int", "display_name": "port number"}`
正本: DESIGN §2.1, DR-046 §1/§3

**`value_name`**
型: string。適用対象: 値要素。
意味論: help/usage の値プレースホルダ表示 (`<PLACEHOLDER>`)。指定なしなら key name / type 名 /
def name を uppercase 化 (ASCII 英字のみ、非 ASCII はそのまま) して導出。ref 継承 + 入口側での
上書きが可能。
最小例: `{"name": "port", "type": "int", "value_name": "PORT"}`
正本: DESIGN §2.1〜2.2, DR-024, DR-046 §1/§3

**`help_group_name`** / **`help_group_title`** / **`help_group_description`**
型: いずれも string。適用対象: `options[]` の通常 entry (所属参照) / グループ宣言エントリ (宣言)。commands はグループ化しない。
意味論: 表示グループ。`options[]` で `name` / `id` / `type` / 入口系属性をいずれも持たない entry に `help_group_name` を書くと**グループ宣言エントリ** — グループの表示順 (= 宣言順) と表示メタ (title / description) が一箇所で完結する。それ以外の option entry の `help_group_name` は所属参照。同名グループの重複宣言は設定が同一か否かを問わず definition-error (kind: `invalid-range`、DR-113 §8.1)。
最小例: `{"help_group_name": "net", "help_group_title": "Network options"}` を `options[]` の先頭に
置き、メンバー要素に `"help_group_name": "net"` を付ける。
正本: DESIGN §14.6, DR-113 §8.1

**`help_order`** / **`help_group_order`**
型: number。既定: 宣言 index (0-based)。適用対象: help_order = 通常 entry、help_group_order =
グループ宣言エントリ (座席違いは definition-error kind: `invalid-range`)。
意味論: 表示順の明示。実効 order の昇順で安定ソート (同値は宣言順維持)。`help_after` との同時指定は
definition-error (kind: `invalid-range`)。positional への指定は lint warn + 無視。
最小例: `{"name": "help", "type": "help", "long": true, "help_order": 10001}`
正本: DESIGN §14.6, DR-113 §8.2

**`help_after`**
型: string (同一スコープ・同一 entries 列内の他要素 name)。適用対象: options/commands の entry。
意味論: 相対配置 — target の直後に表示配置する (deprecated alias を canonical の直後に置く等)。
循環は definition-error (kind: `circular-ref`)、不在 name 参照は lint warn + fallback (order
ソート結果の位置に留まる)。target はグループ宣言エントリを指せない。
最小例: `{"alias": "port", "name": "old-port", "deprecated": true, "help_after": "port"}`
正本: DESIGN §14.6, DR-113 §8.2

**`help_render`**
型: object。既定: なし (継承がある場合は親の実効値)。適用対象: ルート definition / command 要素。
意味論: canonical レンダラへの表示様式指示 (一括席、3 段 override の 1 段目)。キーは
`template` (プレースホルダ文字列テンプレ、置換 + `{{` エスケープのみ・制御構造なし・セクション
識別子は閉集合 8 種) / `value_structure_style` (`"auto"` \| `"inline"` \| `"detail"`) /
`types_style` (`"auto"` \| `"aggregate"` \| `"inline"`) / `origin_style` (`"merge"` \|
`"separate_section"` \| `"reference"` \| `"omit"`)。階層継承はキー単位で、子 command は親の実効値を
継承し書いたキーだけ上書きする (DR-014 と同機構)。実効値は help model トップレベル `render` へ射影。
command / ルート definition 以外への宣言、enum 値域外、template 構文不正はいずれも
definition-error (kind: `invalid-range`)。文言位置 (help / help_long / help_epilog) の
`{name}` 補間は本語彙とは別 (DR-115 §3、文言位置は寛容)。
最小例: `{"help_render": {"origin_style": "merge", "value_structure_style": "detail"}}`
正本: DR-115 §1, §2, §5, DR-113 §1

**`help_value_structure_style`**
型: string (`"auto"` \| `"inline"` \| `"detail"`)。既定: 一括席 `help_render.value_structure_style` の
実効値。適用対象: 任意 entry (options / positionals、entry 個別席)。
意味論: 当該 entry の value_structure 表記だけを一括席の実効値から上書きする。値空間を持たない
entry への付与は vacuous だが合法 (required の vacuous 前例、DR-047 / DR-093 と同扱いで lint の領分)。
値域外は definition-error (kind: `invalid-range`)。help model の entry 側 `value_structure_style`
に射影される。
最小例: `{"name": "color", "type": "string", "help_value_structure_style": "detail"}`
正本: DR-115 §1.2, §1.4, §5.1

**`hidden`**
型: boolean。適用対象: 任意要素。
意味論: wire 上の表示メタ。help model / 補完候補へ `hidden` フラグとして射影され、既定の renderer / completion policy が表示から除外する。`help_show_hidden` は help 側の独立 policy 入力。パース挙動 (CLI からの受理可否) には影響しない。
最小例: `{"name": "internal_flag", "type": "flag", "long": true, "hidden": true}`
正本: DESIGN §14.4/§15.15, DR-058, DR-113 §4.4/§7.3

### 2.3 UsefulAST 糖衣属性 (lint 対象外・手動転記)

`values` は UsefulAST 層 (人間が書く層、DESIGN §0.2) で parse_definition() の A 群構文正規化を受ける糖衣であり、`schema/wire.schema.json` の `$defs.node.properties` には持たない。additionalProperties が開いているため構文検査は通るが、§2.1 の `just lint-reference` 対象にはできない。本節が定義 JSON を書くアプリ開発者向けの手動カタログとなる。`hidden` を含む表示メタは wire 正規形の §2.1/§2.2 を参照。

**`values`**
型: array。適用対象: 値要素 (name を持つノードに同居可)。
意味論: `or` のショートハンド糖衣。各要素は照合消費の `exact` に展開される (非消費の literal では
enum にならない)。要素に配列があれば `seq` ブランチに展開される。`long`/`short` (入口の有無) や
値源ラダー (default/env/config) とは直交する軸で同一ノードに同居できる。
最小例: `{"name": "color", "values": ["red", "green", "blue"]}` は
`{"name": "color", "or": [{"exact":"red"},{"exact":"green"},{"exact":"blue"}]}` の糖衣。
正本: DESIGN §5.3

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
| `int` | 値プリミティブ | number 字句 + 値空間判定で整数のみ受理 (`int_round`)。保証精度は 2^53 — string 源で超過する整数値は Error (`int_out_of_range`)、任意精度は言語実装側の拡張 type の関心 | DESIGN §3.3, DR-075 |
| `float` | 値プリミティブ | number + inf 受理の別名 (number 自体は inf 非受理) | DESIGN §3.3, DR-074 |
| `bool` | 値プリミティブ | true/false 語彙 (`builtin/bool_parser`) | DESIGN §3.3, DR-074 |
| `path` | 値プリミティブ | バイト列受理、検証は filters opt-in | DESIGN §3.3 |
| `file` | 値プリミティブ | 同上 | DESIGN §3.3 |
| `dir` | 値プリミティブ | 同上 | DESIGN §3.3 |
| `datetime` | 値プリミティブ | canonical 字句仕様は未確定 | DESIGN §3.3, DR-095 射程外 |
| `exact` | 値プリミティブ | codepoint 単位・正規化なしの照合消費 | DESIGN §3.3 |
| `none` | 値空間なし | dd 等。充足判定は発火 (committed) のみ | DR-089, DESIGN §9.1 |
| `flag` | 糖衣プリセット | bool + `default:false` + 起動で true | DESIGN §3.3 |
| `count` | 糖衣プリセット | number + `default:0` + 起動時に `cell_fns.incr` (`ctx.old + 1`) を呼ぶ。値は取らない | DESIGN §3.3, DR-114 §2/§6.1 |
| `count_or_set` | 糖衣プリセット | count + optional 値スロット。`-v` は `incr`、`-v 3` は `set` | DESIGN §3.3, DR-040/114 |
| `command` | 糖衣プリセット | name でスコープを作り name 完全一致でトリガ | DESIGN §3.3, §4.2 |
| `help` | 糖衣プリセット | `#help` へ true を供給する基本 help。`help_on_failure` 既定 true | DESIGN §3.3, §14.1, DR-113 §2.1 |
| `help_all_category` | 糖衣プリセット | `#help` + `#help_all_category`。category 絞りなし、hidden 表示は含意しない | DESIGN §14.1, DR-113 §2.2 |
| `help_category` | 糖衣プリセット | `#help` + string の `#help_category`。bool 枝との出し分けは `or`、複数指定は last-wins | DESIGN §14.1, DR-113 §2.3 |
| `help_show_hidden` | 糖衣プリセット | `#help_show_hidden` だけを立てる独立軸。単独では表示要求にならず、`help_on_failure` 既定 false | DESIGN §14.1, DR-113 §2.4 |
| `help_tree` | 糖衣プリセット | `#help` + `#help_tree`。capability 入力を `depth:"all"` にする | DESIGN §14.1, DR-113 §2.5 |
| `completion_script` | 糖衣プリセット | 必須の shell 名 string を `#completion_script` へ供給し、completion_script capability を発火する。値域は自由入力、候補は実装対応 shell 名 | DESIGN §15.13, DR-117 §2 |
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
| filter | role | domain | output_mode | fallibility | reasons | 意味論 |
|---|---|---|---|---|---|---|
| `trim` | filter | scalar | transform | total | (空) | 文字列前後の ASCII 空白除去。非 string 入力は素通し |
| `non_empty` | filter | scalar | preserve | reject | `empty_value` | 空文字列を拒否 |
| `in_range` | filter | scalar | preserve | reject | `too_small`, `too_large` | 数値の範囲検証 (value_filters/final_filters 両方で使用可) |
| `regex_match` | filter | scalar | preserve | reject | `pattern_no_match` | pattern への部分一致検証 (unanchored、全体一致は `^$` で表現)。compile 失敗は definition-error (実行時 reason ではない) |
| `increment` | filter | scalar | transform | total | (空) | number→number の total transform。filters seat から明示参照し、入力を 1 増加させる |
| `unique` | filter | array | transform | total | (空) | 累積後の配列 (`Acc→Acc`、accum_filters 相) から重複要素を除去 (先勝ち順序保持) |
| `length_range` | filter | array | preserve | reject | `too_short`, `too_long` | 累積後の配列長の範囲検証 (`Acc→Acc`、accum_filters 相、DR-105) |
| `unwrap_single` | collector | array | transform | total | (空) | 累積結果 (`T[]→U`、collector 相) — 長さ 1 配列を要素へ再帰的に畳む、0/2+ 個は不変 (`multiple` プリセット `override` の default_collector) |
| `from_entries` | collector | array | transform | total | (空) | 累積結果 (`T[]→U`、collector 相) — entries 配列形/指名 2 フィールド形/key 昇格形を object へ変換。非適合形は total pass-through (DR-044 §2/§3) |
<!-- kuu-lint:end -->

filter DSL は DR-114 の universal fn specialization で、`"regex_match:..."` と `["regex_match", "..."]` は共通 args decode 後に同一呼び出しとなる。呼び出し時の `FnCtx.mode()` は `"filter"`。runtime 参照を持つ住人は descriptor の `observes` で宣言する。filter pipeline、Reject / Error、物理 registry は `filters` のまま維持する。

`domain` (`role:"filter"`/`role:"collector"` の carrier 軸、DR-106 由来・DR-107 で collector にも
適用拡張) は `output_mode`/`fallibility` (旧 `signature`) と直交する — `in_range` (scalar) と
`length_range` (array) は同じ `preserve`/`reject` だが入力の型 (`T` か `T[]` か) が異なる。
`role:"collector"` (`unwrap_single`/`from_entries`) は `filters.*` namespace を共有するが filter
chain の colon-DSL args とは呼び出し規約が異なる (`invocation.encoding: object_args`、DR-106)。
`domain`/`output_mode`/`fallibility` はいずれも collector では常に `array`/`transform`/`total` に
const 固定される (DR-105 §4「構造畳み装置は total」の Schema 強制、DR-107 §7)。

`output_mode`/`fallibility` (旧 `signature` の分解、DR-107 §4) が reasons の有無を機械的に決める:
**`fallibility:total` (常に成功) は `reasons: []`**、**`fallibility:reject` (拒否しうる) のみ
非空の reasons を持つ** (DR-095 §3 の原則を継承)。「変換しつつ reject しうる」第 3 象限
(`output_mode:transform` + `fallibility:reject`) は builtin corpus には実例が無いが descriptor
体系としては表現可能 (DR-107 §4、`app/valid_json` 仮想例)。

### filter/collector の invocation 引数

<!-- kuu-lint:vocab filter-config-keys -->
| 引数 | filter/collector | 意味論 |
|---|---|---|
| `min` | `in_range` | DSL 第 1 引数、下限 (含む)。対象型の canonical number、負数・小数に制約なし |
| `max` | `in_range` | DSL 第 2 引数、上限 (含む)。対象型の canonical number |
| `pattern` | `regex_match` | DSL 唯一引数、host 方言準拠の正規表現。compile 失敗は definition-error (実行時 reason ではない) |
| `min` | `length_range` | DSL 第 1 引数、下限 (含む)。非負整数限定 (DR-105 §5(a)) |
| `max` | `length_range` | DSL 第 2 引数、上限 (含む)。非負整数限定 |
| `key` | `from_entries` | 指名 2 フィールド用法の key フィールド名、または key 昇格用法の昇格フィールド名 (DR-044) |
| `value` | `from_entries` | 指名 2 フィールド用法の value フィールド名。`key` と組で指定する (DR-044) |
<!-- kuu-lint:end -->

これらは descriptor の `invocation.parameters` 宣言 (DR-107 §5) — filter chain の colon-DSL
引数 (`"in_range:1:65535"` の `1`/`65535`) と collector の object 形引数の意味論注記であり、
construction=factory の `config` キー宣言 (デプロイ時の方言設定) とは別の相 (DR-061 §5)。

最小例: `{"value_filters": ["in_range:1:65535"]}` / `{"piece_filters": [{"name": "regex_match",
"args": ["^[A-Za-z_][A-Za-z0-9_]*="]}]}`

正本: DESIGN §8, `schema/builtin-descriptors.json`, DR-095/114

---

## 6b. builtin cell_fns カタログ

`cell_fns` は default 値供給と発火時 cell operation を担う `role:"fn"` の registry。variant DSL と `default_fn` が同じ住人を呼ぶ。

<!-- kuu-lint:vocab cell-fns -->
| cell fn | role | fallibility | observes | 用途 |
|---|---|---|---|---|
| `set` | fn | total | (空) | 1 個以上の logical value を返す。effect mode では通常 set、`default` 糖衣では native JSON value の typed internal call |
| `default` | fn | total | (空) | `use_default` Sentinel を返し default placeholder へ戻す effect-mode operation |
| `unset` | fn | total | (空) | unset Sentinel を返す effect-mode operation |
| `empty` | fn | total | (空) | empty Sentinel を返し array / map cell を空にする effect-mode operation |
| `incr` | fn | total | (空) | `ctx.old` を参照して `old + 1` の number Value を返す。count preset が使用 |
| `borrow` | fn | reject | `option:<source>` | 他 option の値を返す。decoded source から依存 edge を concrete 化 |
| `env` | fn | reject | `env:<var>` | 明示した環境値を返す。値源ラダーの env 席とは別の fn 呼び出し |
| `inherit` | fn | reject | `option:<source>` | 祖先 scope の明示 source から値を返す。inherit ラダー席とは別の fn 呼び出し |
| `uuid` | fn | total | (空) | registry 実装が UUID string を生成して返す |
| `computed` | fn | reject | `system:<key>` | system key に対応する計算値を返す |
<!-- kuu-lint:end -->

概念 ABI は `(args: string[], ctx: FnCtx) → Result<Value | Sentinel, Reason>` の 1 種。`ctx.mode()` は `"default" | "effect" | "filter"` を返し、`as_default()` / `as_effect()` / `as_filter()` で位相固有 context を取得する。`ctx.old()` は対象 cell の内在状態であり `observes` edge ではない。外部 option / env / system 参照は descriptor の `observes` に宣言し、concrete edge だけを `ctx.observes()` 経由で読める。

`Value` 返却は effect mode では通常の set operand、default mode では default 値になる。`Sentinel` は `use_default` / unset / empty の cell operation で、default 席には指定できない。colon-string と 1 段 array of string は同じ name + args に decode される。

正本: DESIGN §7/§11.4/§13.1, DR-114, `schema/builtin-descriptors.json`

---

## 6c. builtin completer カタログ

`completers` は値位置の補完を名前参照で供給する registry。builtin 住人は実行実体を持たず、canonical 補完生成器が shell 既存機能へ翻訳する。

<!-- kuu-lint:vocab completers -->
| completer | role | invocation | 意味論 |
|---|---|---|---|
| `files` | completer | none | ファイルとディレクトリの一般補完を shell 既存機能へ委譲 |
| `dirs` | completer | none | ディレクトリのみの補完を shell 既存機能へ委譲 |
<!-- kuu-lint:end -->

両 descriptor は `construction:"static"`、`reasons:[]` で、`io_type` を宣言しない。`path` は `files` と shell 委譲粒度で同義になるため builtin には収載しない。builtin 集合は拡張 completer の追加を閉じない。

正本: DESIGN §13.1/§15.13, DR-111 §5, DR-117 §7/§8.3, `schema/builtin-descriptors.json`

---

## 7. failure reason 語彙

### 7.1 outcome (DR-053)

`parse()` の返値は 3 種の discriminated union: `success` / `failure` / `ambiguous`
(パース成功条件は「入力を全消費する完全解決経路がちょうど 1 本」、DR-038)。`failure` の
`errors[]` が本節の reason 語彙を持つ。

### 7.2 kind (層) と reason (機械可読識別子)

`{element, args_pos, kind, reason, message}` の `kind` は 3 値、`reason` は kind の中の細分:

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
| `too_short` | `length_range` | 累積後の配列長が下限未満 |
| `too_long` | `length_range` | 累積後の配列長が上限超過 |
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

### 7.6 builtin cell fn が emit する reason

cell fn reason は runtime の値取得失敗であり、filter reason や definition-error kind と混ぜない。

<!-- kuu-lint:vocab cell-fn-reasons -->
| reason | cell fn | 意味 |
|---|---|---|
| `absent-source` | `borrow`, `env`, `inherit`, `computed` | 宣言した参照先から値を取得できない。default 席では呼び出し元も unset のまま落ち、探索を再演しない |
<!-- kuu-lint:end -->

`builtin/tty` は `reasons: []` — 本 factory 固有の失敗は definition-error (`tty_stream` 必須違反)
のみで実行時 reason を持たない。

正本: DR-066, DR-095, DR-114 §11, `schema/builtin-descriptors.json`, `docs/CONFORMANCE.md` §2

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
