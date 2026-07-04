# kuu 糖衣展開 (lowering) カノニカルカタログ

> 本書は parse_definition (UsefulAST → AtomicAST) の canonical lowering を規範として列挙する。
> DESIGN.md と各 DR が正本であり、本書はそこに散在する変換対を 1 箇所へ集約したものである。
> 同じ UsefulAST 断片から異なる lowered 形を出す実装が両方仕様準拠に見える状態を潰し、
> 将来の conformance test の種とすることを目的とする (findings F-041 への回答)。

## 0. 記法と前提

- 各項は **入力断片 (JSON)** → **出力断片 (疑似 JSON)** + **規則** + **由来 DR** の形で示す。各変換対は
  self-contained に読めるよう規則を文章で添える (由来 DR は補助 marker であって、対だけ読んで再現できる)。
- **出力断片は DR の疑似 JSON 記法を用いる**。とくに **greedy マークと再解釈 matcher データの直列形
  (シリアライズ表記) は未確定** (DR-039 の垂直スライスで確定する)。本書ではそれらを次の便宜表記で示すが、
  この表記自体は規範ではない (§C.3):
  - `«greedy»` … その衛星が greedy 面の住人であることを示す注記
  - `{matcher: "<種別>", entries: {...}}` … 名前付きデータとしての再解釈 matcher (DR-042)。実際の
    フィールド語彙は未確定
- **消費モデル**: 読みは外向き消費数 (背骨・path-search の世界の通貨) と効果 (DR-045) を報告する。消費数は
  Accept の報告値であり、**value の有無から導出しない** (消費 0 の literal 産出も、消費 2 の外側借用もある)。
  再解釈 matcher の内部断片消費は matcher 内に閉じる — eq-split の `--k=v` は外向き 1 トークンを内部 2 断片に割り、
  short の値付着は外側の次トークンを借りて外向き 2 になる (両方向、DR-041 §3)。exact の canonical 記法は
  `{exact: "x"}` であり、pre matcher が Accept(消費数) / Reject を返す最小分解の直列形は DR-039 の垂直スライスで
  詰める (§C.3)。
- 「衛星」「実体だけノード」「背骨」「先食い」「早閉じ抑制」等の用語は DESIGN.md §16 に従う。

---

## A. 構造記法の糖衣 (installer 以前の記法展開)

裸の JSON 値を node 形へ正規化する層。DR-026 / DR-015 に由来し、installer が語彙を回収する前段の
surface 正規化として働く。

### A.1 裸文字列 → exact (照合消費 + 値産出)

```
入力:  "x"
出力:  {exact: "x"}
```

**規則**: 構造 (children / seq / positional / values 要素) 位置に置かれた裸文字列は **常に** exact に展開される
(配置文脈に依存しない)。exact は綴り "x" を照合してトークンを 1 つ消費し、照合した
literal 値 "x" を産出する (消費 1、DESIGN §5.2)。非消費の literal (トークンを照合せず値だけ持つ) が要るときは exact
ではなく value: / default: フィールドに書く (A.3)。消費数は Accept の報告値であり value の有無から導出しない
(DR-041 §3)。UsefulAST での canonical 記法は `{exact: "x"}` (§0 の消費モデル参照)。

**由来**: DR-026, DR-015, DESIGN §5.2

### A.2 裸配列 → seq

```
入力:  [a, b, c]
出力:  {seq: [a, b, c]}
```

**規則**: 裸の配列は「子を順に並べて消費する」seq に展開される。name / multiple / value_name 等の修飾を
付けたくなったら、裸配列を明示形 `{seq: [...]}` に展開してからフィールドを足す。

**由来**: DR-026

### A.3 裸リテラル (数値・bool) → 照合消費ノード

```
入力:  255          出力:  トークンを number として照合し値 255 を産出するノード (消費 1)
入力:  true         出力:  bool として照合し値 true を産出するノード (消費 1)
```

**規則**: 構造位置に置かれた裸の数値・bool も、裸文字列 (A.1) と同じく **照合消費 + literal 値産出** ノードへの
糖衣である (綴り照合の exact に対し、数値・bool は型照合)。配置文脈で展開先は変わらない (DESIGN §5.2)。
**非消費の literal は value: / default: フィールド経由でのみ書く** — `{type: "number", value: 30}` は消費 0 の
実体だけノードであり、トークンを照合しない。数値・bool 照合ノードの直列形 (concrete JSON) は exact と同じく
DR-039 の垂直スライスで詰める (§C.3)。

**由来**: DR-015, DESIGN §5.2

### A.4 values → or 展開

```
入力:
  {name: "color", values: ["red", "green", "blue"]}
出力:
  {name: "color", or: [
    {exact: "red"},
    {exact: "green"},
    {exact: "blue"}]}
```

入れ子配列は seq 枝になる:

```
入力:
  {name: "color", values: [
    "red", "green", "blue",
    [{name: "r", type: "number"}, {name: "g", type: "number"}, {name: "b", type: "number"}]]}
出力:
  {name: "color", or: [
    {exact: "red"},
    {exact: "green"},
    {exact: "blue"},
    {seq: [{name: "r", type: "number"}, {name: "g", type: "number"}, {name: "b", type: "number"}]}]}
```

**規則**: `values` は or のショートハンド。各スカラ要素は照合消費の exact 枝 (A.1) へ、各配列要素は seq 枝 (A.2) へ
展開され、まとめて 1 つの `or` の子になる。**非消費の literal では enum にならない** — 綴りを入力と照合するのは
exact であり、`value:` だけの literal は入力を検査しない (DESIGN §5.3)。`or` の枝選択・結末は DR-038 の完全経路
一意性で判定される。本展開は **definitions.types 内の型テンプレにも同様に適用される** (A 群は配置文脈非依存、
§C.4)。`type: X` 参照は展開済み構造を継承し (DR-028 / DR-034 の合成順)、未定義値は or 全枝の綴り不一致 (Reject)
→ 完全経路 0 本の失敗になる。候補提示の素材は tried_triggers (DR-053)。

**由来**: DR-015, DESIGN §5.3

### A.5 type 糖衣プリセット (flag / count / help)

`type` の値のうち、独立した値プリミティブではなく「属性プリセットへの名前」であるもの。value_parser 中心の
組み込み型 (string / number / ...) と同じ `type:` で書くが、展開先は属性の束である (DR-028)。

**flag** = bool + default:false + 起動で true:

```
入力:  {name: "verbose", type: "flag", long: []}
出力:  値セルは {name: "verbose", type: "bool", default: false} (実体だけノード)。
       入口衛星は long / short installer が植える exact で、発火時に literal true を産出し値セルへ link する:
         {exact: "--verbose", value: true, link: "verbose"}
       (variant の set effect と同型 = DR-045 の op:set の縮退形、DR-015)。
```

**count** = number + default:0 + increment accumulator:

```
入力:  {name: "verbose", type: "count", short: "v"}
出力:  値セルは {name: "verbose", type: "number", default: 0, multiple: {accumulator: "increment"}}。
       入口衛星は short installer が植える exact で、発火ごとに値セルの increment accumulator を回す:
         {exact: "-v", link: "verbose"}
```

increment は accumulators registry の住人 (発火ごとに 1 を寄与、default_collector は sum、DR-036) であり、
multiple registry のプリセットではないため object 形で accumulator を直指定する。count は構造的セマンティクスでは
表せない (現在値依存の increment は accumulator の仕事) が、`type: "count"` の糖衣として隠蔽される (DR-015)。

**help** = 起動時アクション:

```
入力:  {name: "help", type: "help", long: [], short: "h"}
出力:  入口部 (long / short 衛星) は §B.1 / B.2 と同型に展開。
       「起動時に ParserContext の help フラグを立てる」アクション部の
       canonical AtomicAST 形は未予約 (DESIGN §13.9、下記 規則 参照)。
```

**規則**: 各プリセットは値プリミティブ + default + 挙動の束を `type:` で参照する糖衣。flag / count の値・default・
累積は上記のとおり確定する。help のアクション部の AtomicAST 形は DESIGN §13.9 で未予約だが、パースとの整合は
early-exit ではなく**完走後の表示選択** (失敗時アクション、DR-048 / DESIGN §15.10) として確定済み — help は
パース失敗時 (完全経路 0 本) も候補経路で selected なら発火する。失敗時アクションは汎用属性 (フィールド名は
§13.9 で未予約) で、help プリセットがそれを同梱する。version は専用 type ではなく単なる flag (§14.2)、失敗時
にも出したい場合は同属性を opt-in する。

**由来**: DR-028, DR-015, DR-036, DESIGN §3.3

---

## B. canonical installer の lowering

installer は特殊語彙 (属性名・type 値) の所有者であり、parse_definition 時に (1) 所有語彙の回収 (削除しない)、
(2) 糖衣展開の植え付け、(3) 実行時能力の提供、の 3 役を担う (DR-042)。展開の標準パターンは **ref (構造継承)
+ link (値同期) の衛星を greedy 面 / 値セルに足し、元要素は実体だけノード (DR-030) に降格する**。

以下の例では、共通の実体を次のように置く:

```
{name: "port", type: "number", long: [], short: "p", env: "PORT"}
```

### B.1 long installer

```
所有語彙: long 属性 (variant DSL の値語彙 DR-011 を含む)
入力:  {name: "port", ..., long: []}
出力 (greedy 衛星 + 実体だけノード):
  «greedy» {or: [
    {seq: [{exact: "--port"}, {ref: "port", link: "port"}]}]}
  {matcher: "eq_split", entries: {"--port": port}}   // --port=80 の読み生成
```

**規則**: long installer は `long` を回収し、greedy 面に「exact 綴り + 値スロット」の衛星を足す。値スロットは
`ref` で実体の構造を継承し `link` で実体の値セルへ同期する。`--key=value` 用に eq-split 再解釈 matcher を足す
(config `long_prefix` / `allow_equal_separator` がパラメータ)。`long: []` は空配列でも `--<name>` を生成する
(未指定なら生成しない)。

variant DSL (`long: ["no:set:false"]`) は long 属性内の語彙なので long installer の内部で展開される。別入口として
greedy exact 衛星をもう 1 本足し、値セルへの操作を効果記述子 (DR-045) として載せて同じ値セルへ link する。
set は `value:` の縮退形で書ける:

```
入力:  {name: "ssl", type: "bool", default: true, long: ["no:set:false"]}
出力 (主入口 + variant 入口):
  «greedy» {or: [
    {seq: [{exact: "--ssl"}, {ref: "ssl", link: "ssl"}]},
    {exact: "--no-ssl", value: false, link: "ssl"}]}   // set の縮退形 (literal を沈める)
```

非 set の effect は効果記述子 `effect: {op: ...}` で明示する:

```
入力:  {name: "color", long: ["no:unset"]}   (--no-color で color を「触っていない」ことにする)
出力 (variant 入口):
  {exact: "--no-color", link: "color", effect: {op: "unset"}}
```

op 語彙は 4 種で、値セルへの操作と committed は DR-045 の表による: `set` (operand を書く / committed=true) /
`default` (default へ / committed=true) / `unset` (default へ / committed=false — env 等の後段が上書き可) /
`empty` (コレクションを空に / committed=true)。通常の値バインドは set の縮退形であり、効果列 (DR-038) の要素は
一様に (実体, op, operand, source, 順序) となる。args は全て string で CLI 入力と同じ手順を通る (value 型パース・
filter が variant にも効く)。variant 構造は AtomicAST に残らず exact + 効果記述子に展開される。

**由来**: DR-042, DR-011, DR-015, DR-045

### B.2 short installer

```
所有語彙: short 属性
入力:  {name: "port", short: "p"}, {name: "version", type: "flag", short: "v"}
出力 (greedy 衛星 + 再解釈 matcher):
  «greedy» {seq: [{exact: "-p"}, {ref: "port", link: "port"}]}
  «greedy» {seq: [{exact: "-v"}, ...]}
  {matcher: "short_combine", entries: {"p": port, "v": version}}
```

**規則**: short installer は `short` を回収し、各文字を個別の greedy exact 衛星にする。加えて cluster 分解 (`-pv`)
と値付着 (`-p80`) の全読みを枝として列挙する再解釈 matcher を足す (config `short_prefix` / `short_combine` が
パラメータ)。回収したエントリ表 `{p: port, v: version}` が matcher の構成データである。分割単位は **canonical では
ASCII 単一文字**とし、Unicode (grapheme) short は方言として扱う (DR-041)。曖昧になる定義 (`-cv` 問題) は DR-038 の
完全経路一意性により正しく ambiguous になる。

**由来**: DR-042, DR-041

### B.3 env installer

```
所有語彙: env 属性
入力:  {name: "port", env: "PORT"}
出力 (構造出力なし、席宣言のみ):
  port の値セル → 値源ラダー (DR-031) の env 席に lookup を宣言
```

**規則**: env installer は `env` を回収し、構造衛星を足さずに、エンジンが所有する値源優先順位ラダー (DR-031) の
env 席へ lookup を宣言する (不変則④)。lookup は `(value, source)` を返し、ParserContext の source タグを保存する。
ラダーの順序 (CLI/link → env → config → inherit → default) は installer から動かせない。env_prefix が config に
あれば連結する (`MYAPP_PORT`)。

**由来**: DR-042 (不変則④), DR-031

### B.4 dd installer

```
所有語彙: type: "dd"
入力:  {name: "--", type: "dd"}   (positionals[] に書かれる)
出力 (greedy 面の exact 衛星、matcher は素の exact 一致):
  «greedy» {exact: "--"}          // 発火・マーカー 1 トークン消費・値なし
                                  // 発火後は以降の positional 継続を内部消費として引き継ぐ
```

**規則**: dd installer は `type: "dd"` を回収し、greedy 面のトリガ兼消費者として exact 衛星を足す。`--` の完全一致で
発火し、マーカー 1 トークンを消費し値を生まず、以降の positional 継続を自分の内部消費として引き継ぐ。dd の matcher
は **素の exact 一致であり、トークン境界の再解釈をしない** (再解釈 matcher が要るのは long の eq-split と short の
cluster だけ)。以降の option 抑制 (sever) は「greedy の内部消費は一体」という DR-041 §4 の既存規則から導出され、
dd 専用の特別規則はゼロである。`--` が寛容な positional に値として食われないのも先食い (greedy が読めるトークン
だから) から導出される。

**由来**: DR-042, DR-041

### B.5 command installer

```
所有語彙: commands[] / type: "command"
入力:
  {commands: [
    {type: "command", name: "commit", options: [...], positionals: [...]},
    {type: "command", name: "clone", ...}]}
出力 (greedy トリガ衛星 + 新しい背骨の部分木):
  «greedy» {exact: "commit"} → 部分木 (commit の options/positionals を新しい背骨として宣言)
  «greedy» {exact: "clone"}  → 部分木 (clone の options/positionals を新しい背骨として宣言)
```

**規則**: command installer は `commands[]` / `type: "command"` を回収し、greedy 面に「greedy マーク付き exact
(name 完全一致)」のトリガ衛星を植え、各コマンドの部分木を **新しい背骨** として宣言する (祖先の greedy はそこに
届かない、DR-041 §4)。素の positional との排他は完全経路の一意性から、「commands が先」は先食いから、それぞれ
創発する (専用の順序規則を持たない)。command の配置位置に制約は課さない — 曖昧さなく完全経路で一意に解ける限り
positionals / options の要素として command を直接置いてよい。

**由来**: DR-042, DR-018 (現役形は末尾 Superseded 注記), DR-041

### B.6 global installer

```
所有語彙: global 属性
入力:  {name: "help", type: "help", long: [], short: "h", global: true}
出力 (子孫 command スコープへの宣言的コピー):
  各子孫 command スコープの宣言層へ help の ref/link 衛星宣言をコピー
  (コピー先は不動点反復で long/short installer が展開する)
```

**規則**: global installer は `global` を回収し、子孫の各 command スコープの宣言層へ ref/link 衛星の **宣言的コピー**
を追加する。判定単位は要素名ではなく **トリガ literal** — 同じトリガ literal を持つ宣言をコピー先スコープが自前で
持つ場合はコピーを省略する (= shadowing、最小スコープ優先 = lexical 解決 DR-032/033 のパース時適用)。**shadow は
配下 subtree 全体に及ぶ**: 中間 command が shadow したトリガは、その配下の孫スコープ (自前宣言なし) にもコピー
されない — per-scope の独立判定ではなく lexical 連鎖である。宣言層への追加だけが後続 installer の回収対象になる
ため、global が置いたコピーを long/short が展開するという見かけの依存は不動点反復で解ける。

**由来**: DR-042

### B.7 inherit installer

```
所有語彙: inherit 属性
入力:  {name: "ttl", type: "number", inherit: true}
出力 (構造出力なし、席宣言のみ):
  ttl の値セル → 値源ラダー (DR-031) の inherit 席に
                「最近祖先の同名実体の値セル参照」lookup を宣言
```

**規則**: inherit installer は `inherit` を回収し、構造衛星を足さずに、値源ラダー (DR-031) の inherit 席へ「最近
祖先の同名実体の値セルを参照する」lookup を宣言する。inherit は default と排他であり、値は祖先 scope が持つ
(DESIGN §11.2)。

**由来**: DR-042, DR-031

### B.8 repeat installer

```
所有語彙: repeat 属性
入力:  {name: "file", type: "string", repeat: {min: 1}}
出力 (ref 再帰の cons 構造 + 平坦化 accumulator):
  {name: "file", seq: [{type: "string"}, {ref: "file", optional: true}]}
```

ref 要素にもそのまま付く:

```
入力:  {name: "hlcolors", ref: "color", repeat: {min: 1}}
出力:  {name: "hlcolors", seq: [{ref: "color"}, {ref: "hlcolors", optional: true}]}
```

下限が 2 以上・上限が有限の repeat も unroll で書き下す:

```
入力:  {name: "file", type: "string", repeat: {min: 2}}   (必須 2 段 + 0 個以上の尾部)
出力:  {name: "file", seq: [
         {type: "string"},                          // 必須 1 段目
         {type: "string"},                          // 必須 2 段目
         {ref: "file#geq1", optional: true}]}       // 尾部 (0 個以上)
       file#geq1 = {seq: [{type: "string"}, {ref: "file#geq1", optional: true}]}   // 1 個以上の cons

入力:  {name: "file", type: "string", repeat: {min: 1, max: 3}}   (3 段で打ち止め、再帰尾部なし)
出力:  {name: "file", seq: [
         {type: "string"},                                  // 1 段目 (必須)
         {seq: [{type: "string"},                           // 2 段目 (任意)
                {seq: [{type: "string"}], optional: true}], // 3 段目 (任意)
          optional: true}]}
```

`file#geq1` は unfold が要求する再帰尾部の内部識別子 (実装が匿名ノードに振る内部 id、DR-046 §4)、直列形は DR-039
で確定する。max 有限では再帰尾部を持たず、上限段数だけ optional をネストして打ち止める。

**規則**: repeat installer は `repeat` を回収し、**ref を使った再帰リスト構造 (cons)** へ lowering する。`[T, T[]]`
の cons であり、3 引数なら `[T, [T, [T]]]` と unfold される。min は必須段の unroll、max は unroll 段数の上限、
上限なしは再帰尾部で表現する。平坦化 (`[T,[T,…]]` → `T[]`) の accumulator は組み込み名 **`flatten`** (accumulators
registry、DR-036) を同時にインストールする。**`optional: true` は `repeat: {min: 0, max: 1}` の糖衣**であり閉包に
還元される (独立概念ではない、DR-043)。ゼロ進捗ガード (再帰 1 周で 1 トークン以上消費すること) は静的検査で保証する。
unfold は現在の背骨に留まるため、反復間の greedy 割り込み (`cp src... --verbose dst`) は保たれる。

取り分の選好: 同一列に複数の閉包が並ぶと取り分の切り方だけが異なる完全経路が複数生じる。これは「効果の異なる別
解釈」ではなく **同一解釈の切り方の自由**であり、閉包自身の宣言的選好で代表 1 本に確定する — **greedy (既定、長い
取り分から)** / **`lazy: true` (短い取り分から)**。選好順に取り分を試し、最初に完全経路へ到達した取り分で確定し、
下流が失敗すれば次へ後退する (regex バックトラッキングと同型)。複数閉包が並ぶ場合は先 (左・外) の閉包の選好から
試す。選好は取り分次元の中だけで働き、or 枝違い・読み違いなど構造の異なる完全経路との ambiguous 検出は保存される。

**由来**: DR-043, DR-020, DR-038, DR-046

### B.9 multiple installer

```
所有語彙: multiple 属性
入力:  {name: "tag", type: "string", multiple: "append"}
出力 (構造出力なし、値セルへの pipeline 構成):
  tag の値セル → separator / accumulator / collector の pipeline を構成
                multiple registry["append"] = {accumulator: append, collector: identity, separator: なし}
```

**規則**: multiple installer は `multiple` を回収し、要素の値セルに pipeline (separator → accumulator →
collector、DR-034 / DR-036) を構成する (env と同型の席・能力宣言型 installer、構造は足さない)。`multiple` を文字列
で書けば multiple registry からプリセットを引き (append / merge / set / map)、オブジェクト `{preset?, separator?,
accumulator?, collector?, ...}` で書けば preset を先に適用してから各フィールドで個別に上書きする。多重発火・separator
分割片が生む値列を畳むのが責務であり、出現回数・位置の制約は持たない (回数は repeat、位置は greedy の軸)。

反復グループの結果整形 (DR-044): 発火ごとに蓄積される要素は既定で **配列** になる (name スコープなら配列オブジェクト、
scalar なら配列スカラ)。map 形にするには `from_entries` collector を使う。3 用法があり、蓄積要素の作り (無名 = 配列 /
named = object) に応じて使い分ける:

```
入力:  {name: "upstreams", multiple: {preset: "map", from_entries: {key: "path"}}, ...}

from_entries()                        // [[k, v], ...] (無名 2 要素 seq の配列) → そのまま object 化
from_entries({key: "k", value: "v"})  // [{k, v}, ...] (named フィールドの object 配列) → 指名 2 フィールドを key/value に
from_entries({key: "path"})           // object 配列 → key フィールドが昇格・除去され、残りのオブジェクト全体が値

規則:  from_entries は反復グループ (name スコープ) ごとに付与し、入れ子の各段が独立に配列 / map を選べる。
       collector は filters registry の住人であり、新しい registry 区分は作らない (DR-036)。
```

**由来**: DR-043, DR-034, DR-036, DR-044

---

## C. 横断規則

個別の糖衣・installer を越えて全 lowering に効く規則。

### C.1 元要素は実体だけノードに降格し、宣言属性は inert に残る

installer 展開後、所有語彙が付いていた元要素は、マッチ能力を衛星に移譲した **実体だけノード (DR-030)** として
振る舞う。評価ループは installer 所有語彙をそもそも見ないため、宣言属性 (`long` / `short` / `env` / `repeat` 等) は
削除されず **inert に残る** (非削除、DR-042 不変則①')。これにより help 生成・diagnose・再シリアライズが元の宣言情報を
保持できる。衛星は ref (構造継承) + link (値同期) で実体に接続し、使う語彙は既存プリミティブ (exact / or / seq /
primitive + ref/link) のみである (AtomicAST スキーマ不変)。

**由来**: DR-030, DR-042 (不変則①)

### C.2 適用は順序非依存 (不動点反復)、寄与は add-if-absent

installer の適用順は非意味である。寄与は lowered 層への決定的な追加であり、同一寄与の再追加は no-op (add-if-absent)
なので冪等が出る。installer 間の見かけの依存 (例: global が置いた宣言的コピーを long が展開する) は、**寄与が増えなく
なるまで全 installer を繰り返す不動点反復**で解ける。停止性は「寄与は要素 × スコープで有限、コピーのコピーは同一実体への
ref なので add-if-absent が止める」から、合流性は不変則①② (読み取り専用の宣言層 + 追加的寄与) から出る。priority
フィールドや配列順への依存は持ち込まない (順序が必要に見えるのは不変則違反の徴候)。

**由来**: DR-042 (5 つの不変則)

### C.3 直列形の未確定範囲

本書の出力断片のうち、**greedy マークと再解釈 matcher データの直列形 (シリアライズ表記) は未確定**である。DR-039 の
垂直スライス実装との共設計で確定する。したがって `«greedy»` 注記・`{matcher: "<種別>", entries: {...}}` 表記は
説明用の疑似 JSON であって規範ではない。同様に、「dd の継続を内部消費として引き継ぐ」の実装表現 (継続参照の構造 /
経路局所の sever フラグ + 純マーカー) も、観測挙動が同一であれば自由である。AtomicAST の正規形・JSON Schema は
実装と同時に詰める (単独確定しない、DESIGN §15.7)。

**由来**: DR-039, DR-041, DR-042, DESIGN §15.7 / §15.8

### C.4 記法糖衣 (A 群) は installer 不動点の前段の純構文正規化

§A の構造記法の糖衣 (裸文字列 → exact、裸配列 → seq、裸リテラル → 照合消費、values → or) は、§B の installer が
語彙を回収する **前段の純構文正規化**である。installer の不動点反復 (§C.2) に入る前に適用され、argv を見ず・値源
ラダーに触れず・経路依存を持たないため、入力に依存せず決定的に確定する。したがって A 群と B 群は時間的にも責務的
にも分離でき、A 群は installer 適用の有無に関わらず同じ lowered 形を出す。

**由来**: DR-026, DR-015, DR-042

### C.5 conformance の比較戦略

本書の変換対を conformance test の種にするとき、比較は緩さの異なる二段で行う:

- **主 oracle は効果列** (DR-038): 同一 argv を与えたとき同一の結果 (効果列 = 各要素が (実体, op, operand, source,
  順序) の列) を出すことが第一の一致基準。直列形が未確定 (§C.3) でも観測可能な効果列は確定しているため、実装間の
  等価性は効果列で判定できる。
- **lowered 中間形は二段の緩比較**: 直列形の細部に踏み込まず、**構造骨格の一致** + **matcher は種別 (eq_split /
  short_combine / 素の exact 等) と回収エントリ表の一致**で照合する。greedy マークや matcher データのシリアライズ
  表記 (§C.3) の違いはこの緩比較が吸収する。
- **順列一致の property test は直列形確定前から書ける**: 「同じ効果集合を与える argv 順列は同じ結果へ収束する」性質
  は効果列 oracle だけで検証でき、AtomicAST の直列形が定まる前から着手できる。

**由来**: DR-038, DR-039, DR-045
