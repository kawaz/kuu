# DR-131: Sentinel を default 1 つへ縮小する — unset は null 返し、empty は空値を返す Value fn

> 由来: kawaz チャット裁定 2026-08-01 (ccmsg r98 mid=32〜40)、NUL-Q2=a / NUL2-Q1=a で effects の op 語彙も確定。
> 正本ノートは `docs/research/2026-08-01-null-projection-inversion.md` §3。
> **前提は DR-130** — `null` が値空間の住人に昇格したことで、「値を書かない cell 操作」として Sentinel に
> 追い出されていた `unset` / `empty` が普通の値返し fn として書けるようになる。cell fn の返り値型
> `Value | Sentinel` (DR-113 §5.3 / DR-114 §7) の Sentinel 側は `default` 1 つに縮む。

## 決定

### 1. `unset` は Sentinel をやめ、`null` を返す Value fn になる

fn が `null` を返すことが unset 効果そのものになる。**`set(null) = unset`** であり、Sentinel としての
`unset` は消える。

`cell_fns` の住人としての `unset` は名前ごと残り、返り値が `Sentinel::unset` から `Value::null` へ
変わるだけである。wire 側の綴り (`long: ["reset:unset"]` 等、DR-011 の variant DSL) は不変で、定義を
書く人から見た語彙は変わらない。

#### 1.1 値の不在は borrow でも同じ規則で説明される — `absent-source` は消える

この一般規則は `borrow:<source>` の参照先が埋まっていない場合も覆う。DR-130 の下では**参照先の座は
不在にならず `null` になる**ので、borrow はその `null` を普通に返し、`set(null) = unset` が呼び出し元へ
伝播する — 呼び出し元の座もラダー開放されて `null` に落ちる。

したがって DR-113 §5.4 の「`borrow:<source>` の source が最終的に不在 / unset なら fn reason
`absent-source` を出し、呼び出し元も unset のまま落ちる」という個別規定は**削除される**。観測 (呼び出し
元が値を得ない) は保存され、担うのが専用 reason ではなく §1 の一般規則になる。`default_fn: "borrow:X"`
しか値源を持たない要素の座が `null` になる帰結も同じで、DR-130 §7 の型導出 (`T | null`) はこの経路から
再導出される。

**`absent-ref` (定義時の名前解決失敗、DR-127 第 1 相 / DR-032) は別概念で不変**である。綴りが似ている
だけで、あちらは「名前が引けない」、こちらは「値が無い」を語る。

### 2. `set` の committed は operand が `null` かどうかで決まる

DR-045 §2 の「committed は効果が明示制御する」という規範は不変だが、その制御の担い手が op から
operand へ移る。

| 効果 | committed | 値源ラダーへの作用 |
|---|---|---|
| `set` (operand ≠ null) | **true** | ユーザの明示指定としてロック |
| `set` (operand = null) | **false** | 下段 (env / config / default) へ開放 |

`unset` が「触っていないことにする」(DR-045 §1) 意味論は、`null` が「この文脈に存在するが値が無い」を
語る値である (DR-130 §1) ことから直に出る。**値が無いのだから commit する対象も無い**。

`empty` が返す空値を適用しても committed=true である点 (§3) は、`[]` / `{}` が null ではない普通の値だから
そのまま従う — DR-045 が `unset` と `empty` の違いを committed フラグで説明していた区別は、適用値が
null か空値かの違いとして保存される。effects では `empty` の観測 op を温存する (§6)。

この規則から、反復セルへの `set(null)` の帰結が導ける: ラダーが開放されてセルは**空席へ戻り** (DR-123
§1 の「反復セルは初回発火まで空席」)、下位席が無ければラダー最下段の暗黙 default である `[]` に落ちる
(DR-123 §3)。`unset` 後の反復セルが `[]` になるという既存 pin は、専用規則ではなく §1 + DR-123 から
再導出される。

#### 2.1 行供給の座への `null` は「供給なし」

`set(null) = unset` の一規則は全座に貫くが、**accumulator への行供給の座**では「その発火は行を積まない」
という形で現れる。null の行 (`[null]`) を産むことはない。

**行供給の `null` は効果を出さない** — 供給がゼロである以上、`effects` に載せるべき観測対象が無い。
`{"op":"set","operand":null}` として観測されるのは**セル操作の座**に着地した `null` (= ラダー開放) だけで
ある。座の区別は §4 が定める。

### 2b. `null` の位相と順序

`null` が値空間の住人 (DR-130 §3) になったことで、「どの相の `null` を見ているのか」を 1 か所で
確定させておく必要がある。順序は次の 1 本である:

```
fn が null を返す
  → 素通し (bypass): filter chain は null に触らない (DR-130 §3)
  → 効果として観測される: {"op":"set","operand":null}
  → cell へ適用される時点で unset 化 (committed=false、ラダー開放、§2)
```

`null` が「値」から「セルのメタ状態」へ変わるのは**最後の 1 段だけ**である。それより前の相では `null` は
普通の値として運ばれ、`effects` にもそのまま現れる — 観測面に立つのは値としての `null` であって、
unset というセル状態ではない (だから op 語彙に `unset` が要らない、§6)。

**素通しが適用される単位は「filter 適用単位の入力」**である:

- **whole-value 相** (`final_filters` 等、値全体を 1 つ受け取る相) の入力が `null` なら、その chain 全体を
  素通しする
- **each 相** (`value_filters` 等、要素ごとに適用される相) では、**`null` の要素が個別に**素通しする。
  chain 全体が止まるのではなく、その要素だけが変換を受けずに通る
- **コンテナの内側の `null` は値の一部**である。`[null, 2]` や `{until: X, since: null}` を whole-value 相へ
  渡すとき、入力は `null` ではなくコンテナなので素通しは起きない。chain は通常どおり走り、each 相へ
  降りたところで `null` 要素が個別に素通しする

link の値残余の座 (DR-127 §4) への `set(null)` は、他の座と同じく**その座を `null` へ戻す**。器ごと
消すのでも、器を再生成するのでもない — 座の値が `null` になり、DR-130 §1 の射影でそのまま `null` として
現れる。

### 3. `empty` は対象型の空値を返す普通の Value fn になる

`empty` はコレクションを空にする特別な cell 操作をやめ、**対象セルの型に応じた空値を返す Value fn**に
なる。配列セルなら `[]`、map セルなら `{}` を返し、その値が通常の `set` として適用される。

対象型の参照は既存の ABI で足りる — `EffectCtx` は対象 cell を提供し (DR-114 §7)、`DefaultCtx` は
default 値の target を提供する。`set` / `borrow` が既に target 依存で振る舞う fn である以上、`empty` が
target の型を見て空値を組み立てるのは新しいパターンではない。

committed=true の意味論は不変である。「ユーザが明示的に空にした」は `[]` という値の明示 set であって、
ラダーを開放する `unset` とは引き続き区別される (§2)。

#### 3.1 `empty` の target 域

「対象型の空値」が定義できる target は閉じている。定義できない target に `empty` を置くのは
**definition-error `invalid-range`** (DR-054 §4) である:

| target の型 | `empty` の返り値 |
|---|---|
| array | `[]` |
| map | `{}` |
| record (DR-126) | `{}` — 射影で全フィールドが `null` になる (DR-130 §4/§4.1) |
| scalar (number / string / bool 等) / union / その他 | **definition-error `invalid-range`** |

scalar に「空値」は無い。ゼロ値 (`0` / `""` / `false`) を空値と読むのは「型のゼロ値」という暗黙ルールの
導入であり、DR-051 が「全キーを型のゼロ値で埋める」案を蹴ったのと同じ理由で採らない — ゼロ値と
「ユーザが `0` を指定した」の区別が消える。「値を取り除きたい」が意図なら `unset` (= `null` 返し、§1) が
その住人である。

この検査は `default_fn: "empty"` の席にも同じく適用される — scalar target の要素に
`default_fn: "empty"` を書けば definition-error になる。§7 が「`empty` は default 席に書けるようになる」と
言うのは、target が空値を持つ型である場合の話である。

### 4. 「行としての `[]`」と「クリアとしての `[]`」は適用の座が区別する — 値では混ざらない

`empty` が普通の値を返すようになると、accumulator セルで「`[]` という行を 1 つ append する」のか
「セル全体を `[]` にする」のかが値だけでは決まらない、という懸念が生じる。これは**座 (seat) の区別**が
既に配管側にあるので生じない。

```
{name:"numslist", type:"number", repeat:2, multiple:"append",
 long: [":set", "no:empty"]}
```

- `:set` の値スロットは **accumulator への行供給の座**。`--numslist 5 5` は行 `[5,5]` を積んで `[[5,5]]`
- `no:empty` は **セル操作の座**。`--no-numslist` はセル値を丸ごと `[]` にする
- 続けて `--numslist 2 3` を書けば行供給の座へ戻り `[[2,3]]` になる (mid=37/38)

fn の返り値がどちらの座へ着地するかを決めるのは、その fn を呼んだ**入口の配管**であって返り値の形では
ない。同じ `[]` という値が両方の座に現れうるが、**セルへの適用として混ざる場面は無い**。

同じ座の区別が §2.1 の `null` にも効く — セル操作の座へ着地した `null` はラダーを開放し、行供給の座へ
着地した `null` は行を積まない。どちらも `set(null) = unset` の一規則の、座ごとの現れ方である。

**effects の観測面では `empty` をクリア専用 op として温存する (NUL2-Q1=a、2026-08-01)**。
accumulator セルの「セルを空にした」と「`[]` という行を 1 つ積んだ」を、どちらも
`{"op":"set","operand":[]}` へ写すと `entity` / `op` / `operand` / `source` がすべて一致し、適用の座が
持つ区別を観測面で復元できない。`append` は accumulator registry の住人名であって `effects[].op` ではなく、
座を写す別成分も無い。

したがってセル操作の `empty` 発火は従来どおり `{"op":"empty"}`、行供給の `[]` は
`{"op":"set","operand":[]}` と観測する。fn の返り値型はどちらも Value であり、適用時の配管も §4 の座で
区別するが、effects 射影だけは非単射を避けるため op を分ける。これは `.` 連結によるアドレス衝突を観測面へ
持ち込まなかった DR-121 §1.2 と同じ判断である。

### 5. `default` だけが Sentinel として残る

`default` (`use_default`) は Sentinel のまま残す。**値として書けないため**である。

op=default が意味するのは「現在の (書き換え済みの) default を明示 set する」(DR-081 §2) であり、その
実値は発火時点では決まっていない — default は placeholder として設置され、依存順で最終相に実体化する
(DR-087 §2/§3)。発火時に `Value` を返す fn へ畳もうとすると、fn の中で default 席を先に解決することに
なり DR-087 の遅延解決モデルを壊す。

したがって `default` は「**定義注入された cell_fn を拾ってこい**」という指示子であり続ける。Sentinel union
は実質この 1 住人に縮小する。

### 6. effects の op 語彙から `unset` のみ廃止し、`empty` は温存する (NUL-Q2=a / NUL2-Q1=a)

`unset` は operand で表し、クリアは専用の観測 op を保つ。

| 発火 | 旧 (DR-045 §1) | 新 |
|---|---|---|
| unset | `{"op":"unset"}` | `{"op":"set","operand":null}` |
| empty | `{"op":"empty"}` | `{"op":"empty"}` |

CONFORMANCE §2 の op 表は **6 op から 5 op** (`set` / `default` / `remove` / `splice` / `empty`) へ縮む
(`remove` / `splice` は merge accumulator の piece op で本 DR の対象外、DR-080 §2)。

**観測の非単射は生じない** — unset と empty は `set(null)` / `empty` の op で区別でき、accumulator セルの
クリアと `[]` 行供給も `empty` / `set([])` で区別できる。committed は §2 の規則どおり、適用値が null か
空値かから導ける。`fixtures/multiple-parse/filters-cell-ops.json` が「両者の最終値はともに `[]` で sources も
同形なので、区別を担うのは effects の op である」と pin していた対比は、**unset 側だけ `set(null)` へ
移し、empty 側の op を残す**形で保存される。

同 fixture が pin するもう 1 つの規範 (「値を書かない cell 操作は value_filters を通らないので reject の
対象にすらならない」) も観測は不変だが、**根拠が変わる**:

- `set(null)` は operand を運ぶが、DR-130 §3 の **null 素通し**により filter は null に触れない
- `set([])` は空コレクションなので、each 相の value_filters には適用対象の要素が 1 つも無い

いずれも filter が reject を出さない結果に落ちる。「operand を運ばないから piece が生じない」という
DESIGN §8.3 の説明は、この 2 本の根拠へ差し替える必要がある。

### 7. Sentinel を前提にした特例群が縮小する

Sentinel が `default` 1 つになることで、「Sentinel かどうか」で分岐していた規定が単純化する。

- **DR-113 §5.4 / DR-114 §2**「default 席で Sentinel fn を指定 → definition-error `invalid-range`」— 検査
  そのものは残るが、弾く対象は `default` fn ただ 1 つになる。`unset` / `empty` は `Value` を返すので
  default 席に書けるようになる (`default_fn: "empty"` = 空コレクションを既定値にする、が素直に通る)
- **DR-127 §4.1**「値残余の座に許すのは set と Value 返し fn のみ、Sentinel 返しは発火時 Reject」— 同じく
  Reject 対象が `default` 1 つに縮む。link パスの座へ `null` を書く (= その座を空ける) ことは §1 により
  通常の set として成立する
- **DR-127 §3 の「空の座への適用は Reject」を精密化する** — Reject になるのは **`ctx.old` を要する fn**
  (`incr` 等) に限る。`set` と `null` 返し (`unset`) は現在の座の値を必要としないので Reject 側ではなく、
  座に値が無くてもそのまま成立する。`ctx.old` を要する fn を `null` の座へ適用した場合は DR-130 §3 の
  素通しが先に効き、fn は呼ばれずに `null` が通る (= vivify されていない器の座を指した場合の Reject と
  は別の経路である)
- **DR-114 §8** の `cell_fns` 代表住人の 3 分類は 2 分類になる — 「`Value` を返す」群に `unset` / `empty` が
  移り、「`Sentinel` を返し effect mode だけで使える」群は `default` のみになる

## 根拠

### null が値空間に居るなら、Sentinel の `unset` は同じ意味を持つ重複住人になる

DR-045 が `unset` を Sentinel (値を書かない cell 操作) にしたのは、「値が無い」を表す値が kuu に無かった
からである。「default 値へ戻して committed=false にする」という操作としてしか書けなかった。

DR-130 で `null` が「この文脈に存在するが値が無い」を語る値になった以上、同じことを値として書ける。
`unset` を Sentinel のまま残すと、**同じ意味を持つ住人が値空間と Sentinel 空間に 1 つずつ**居ることに
なり、両者の相互作用 (`set(null)` の後に `unset` が来たら? など) を規定する必要が新たに生まれる。
統一すればその規定は要らない。DR-125 が `inherit` を `borrow` の重複住人として畳んだのと同型の判断である。

### 型依存の空値は、既存の target 依存 fn パターンで書ける

`empty` を Sentinel に置いた理由は「空値が対象型に依存する」ことだった — 配列なら `[]`、map なら `{}` で、
発火時に値を 1 つ決め打ちできない。

しかしこれは `set` / `borrow` が既に持っている性質である。両者とも target セルの型に適合する値を供給する
fn であり、そのための context (`EffectCtx` の対象 cell、`DefaultCtx` の target) は DR-114 §7 の ABI に
最初から用意されている。`empty` だけを別空間へ追い出す理由にはならない。

### Sentinel に残す条件は「値として書けないこと」であり、`default` だけが満たす

3 つの Sentinel を並べると、残す/畳むの判定軸が 1 本に見える。

| Sentinel | 発火時に値が決まるか | 判定 |
|---|---|---|
| `unset` | 決まる (`null`) | 畳む |
| `empty` | 決まる (target 型の空値) | 畳む |
| `default` | **決まらない** (placeholder の実体化は最終相、DR-087) | 残す |

Sentinel は「値を返せない fn のための逃げ道」であって、機構として好まれる形ではない。逃げ道を必要と
する住人が 1 つに減ったことは、逃げ道を消せという主張ではなく、**逃げ道の存在理由が明確になった**という
ことである。`default` の Sentinel は「遅延解決される席を指す」という機構的役割を持ち、値の一種ではない。

## 波及

### DR

- **DR-045**: §1 の op 表から `unset` のみ削除し 3 op (`set` / `default` / `empty`) + DR-077 の `update`
  の記述へ縮小。§2 の committed の説明を「op が制御する」から「set の operand が `null` かどうかが
  制御する」へ改める (§2)。§旧実装からの継承の「旧 Variation の Reset / Unset が本 DR の default / unset に
  対応する」という考古学の記述は、対応先が `default` / `set(null)` になる
- **DR-113 §5.4**: failure semantics 表の「default 席で Sentinel fn を指定」行の対象が `default` 1 つに
  なることを追補 (§7)。同表の「`borrow:X` の source が最終的に不在 / unset → fn reason `absent-source`」の
  行は**削除する** — 参照先の座は `null` になり、borrow の `null` 返しと `set(null) = unset` の伝播が
  同じ観測を produce する (§1.1)。`absent-source` の reason 語彙も併せて廃止される
- **DR-114 §2 / §8**: §2 末尾の「default 席は `Value` を返す fn だけを受け入れ、`Sentinel` を返す fn の
  指定は definition-error `invalid-range`」は文言不変で対象が縮む。§8 の `cell_fns` 代表住人リストで
  `unset` / `empty` を `Value` 返し群へ移す (§7)
- **DR-127 §4.1**: 「Sentinel を返す fn (`unset` / `default` / `empty`) の適用は発火時の Reject」の列挙を
  `default` 1 つへ (§7)
- **DR-081 §2/§3**: op=default の意味 (現在の default を明示 set、committed=true) は不変。§3 の
  「op=unset = uncommitted 化」を `set(null)` の形へ書き換える
- **DR-077**: `update` op を追加した DR。CONFORMANCE §2 が既に「`incr` 等が `ctx.old` から返した新値も
  `set` として観測し、専用 `update` op は持たない」と書いており、本 DR の「Value 返しは通常 `set`、
  ただしクリアは非単射回避のため `empty`」と整合する。**DR-045 §更新が `update` を 5 語目の op として記述している食い違いは本 DR の対象外**で、
  **独立の issue として起票して処理する** (本 DR の op 表改定に混ぜない — 転換とは無関係な既存の不整合で
  あり、同じ commit に載せると本 DR の波及範囲が読めなくなる)
- **DR-011**: variant DSL の effect 4 種が op 語彙の出所。wire の綴り (`reset:unset` / `no:empty`) は
  不変で、lowering 先が Sentinel から Value 返し fn へ変わる点を追補

### docs 本体

- **docs/CONFORMANCE.md §2**: op 表を 6 op から 5 op へ (§6)。「variant effect (effect mode): cell fn の
  `Value` 返却は通常の `set`、クリアの `empty` だけは非単射回避のため同名 op、Sentinel 返却は `default`
  として effects に射影する」へ改定。「default_fn (default mode): default 席は `Value` を返す cell fn だけを
  受け入れ」は文言不変
- **docs/DESIGN.md §8.3 / docs/PIPELINE.md §2 段 5**: 「unset / default / empty は値を書かないので filter
  chain を通らない」の根拠を、null 素通し (DR-130 §3) と空コレクションに each 相の適用対象が無いこと の
  2 本へ差し替える (§6)。`default` については従来の根拠が残る
- **docs/CONFORMANCE.md §2 (`sources` の空コレクション)**: 「ユーザが明示的に空にした / 何も来なかった の
  区別は `effects` の op (`empty` / `unset`) が担う」を **`empty` / `set(null)` が担う**形へ (§6)
- **docs/REFERENCE.md**: `cell_fns` 住人一覧の返り値型 (`unset` / `empty` が `Value` 返しへ)

### schema

- `schema/fixture.schema.json`: `effects[].op` の enum から `unset` のみ削除し、`empty` は温存。
  `operand` を `null` 許容へ
- `schema/builtin-descriptors.json`: `cell_fns` の `unset` / `empty` の `io_type.output` を
  tagged `Sentinel` から `Value` (`unset` は `"null"`、`empty` は target 依存) へ

### fixture

`op` が `unset` / `empty` の effects を持つ全 case が対象。確認済みの本丸は次の 3 ファイルで、
いずれも why が op による対比を教義として説明しているため**文面の書き換えが必須**:

- `fixtures/multiple-parse/filters-cell-ops.json` (3 case すべて。unset / empty × accumulator × value_filters の
  対比が主題で、§6 の「unset は `set(null)`、empty は観測 op を温存」「filter 素通りの根拠が 2 本になる」を反映する)
- `fixtures/variant-effects/empty-clear.json` (2 箇所)
- `fixtures/export-key/accum-under-nested-command.json` (1 箇所)
- `fixtures/multiple-parse/default-cell-ops.json` / `fixtures/value-sources/unset-ladder.json` /
  `fixtures/multiple-parse/unset-env-fallback.json` (DR-081 §波及が既に挙げている unset 系。op 形の追随)

`absent-source` の廃止 (§1.1) に伴う対象:

- `fixtures/value-sources/default-fn-borrow-ladder.json::borrow-source-absent` — 期待値を borrow の
  `null` 返し形へ (case id と why 文も `absent-source` 語彙から離す)
- `fixtures/constraints-parse/requires-bool-target-default-fn-borrow.json` — 同じ経路の追随

`op: "default"` の case は本 DR で変化しない (§5)。

### 実装

- **kuu.mbt**: cell fn の返り値型から `Sentinel::unset` / `Sentinel::empty` を削除し、`unset` は
  `Value::null` を返す住人へ、`empty` は対象セル型から空値を組み立てる住人へ。効果適用側は
  `set` の operand が `null` かで committed を分ける (§2)。effects の serialize と conformance decoder も
  5 op へ
- **kuu-cli**: 追随のみ

## 採用しなかった案

### (a) Sentinel 機構ごと廃止し、`default` も値として表現する

Sentinel union が 1 住人になるなら機構ごと畳めるのではないか、という案。`default` を「現在の default 値を
返す Value fn」として書けば `Value` 一本になる。棄却理由は根拠の第 3 節 — default の実値は発火時点で
決まっておらず、placeholder として設置して依存順で実体化する (DR-087)。fn の中で default 席を先に解決
させると遅延解決モデルが壊れ、`default_fn` が別の `default_fn` を参照する構成で評価順の循環が新たに
生じる。逃げ道が 1 つ残ること自体は、その 1 つに明確な機構的役割があるので不健全ではない。

### (b) `unset` を Sentinel のまま残し、`empty` だけを Value fn 化する

`empty` の Sentinel 化は型依存の空値という技術的理由だったのに対し、`unset` は「ラダー開放」という
制御の意味を持つので値に落とすべきでない、という切り分け。棄却理由は根拠の第 1 節 — `null` が値空間に
居る以上、`set(null)` と Sentinel の `unset` が同じ意味を持つ 2 住人として併存し、両者の相互作用を
規定する義務が生じる。制御の意味は operand から導ける (§2) ので、住人を分ける理由にならない。

### (c) effects の op に `unset` も観測語彙として残す (NUL-Q2=b 相当)

内部表現を `set(null)` へ統一しつつ、effects への射影では `unset` を維持する案。棄却理由は、`set(null)` と
`unset` の区別は operand から一意に復元でき、観測語彙を分ける意味が無いこと。`empty` の温存 (§4/§6) は
accumulator セルのクリアと `[]` 行供給が同じ `set([])` へ潰れて復元不能になるためであり、unset には同じ
非単射が存在しない。

## 関連

- DR-130 (**前提** — `null` の値空間への昇格・素通し規則。本 DR はその上で Sentinel を畳む)
- DR-045 §1/§2 (効果記述子の op 語彙と committed の制御 — §2/§6 で改定)
- DR-011 (variant DSL の effect 4 種 — wire の綴りは不変、lowering 先が変わる)
- DR-113 §5.3/§5.4 (cell fn ABI `Value | Sentinel` と failure semantics — §7 で対象が縮み、
  `absent-source` の行は §1.1 で削除)
- DR-114 §2/§7/§8 (universal fn 統合・`FnCtx` / `EffectCtx` / `DefaultCtx`・`cell_fns` 住人分類 — §3/§7)
- DR-087 §2/§3 (default の遅延解決 placeholder — §5 で `default` を残す理由)
- DR-081 §2/§3 (op=default の意味と op=unset の uncommitted 化 — 前者不変、後者を `set(null)` へ)
- DR-123 §1/§3 (反復セルの空席と暗黙 bottom default `[]` — §2 で `set(null)` の帰結が再導出される)
- DR-126 (record — §3.1 の `empty` target 域で `{}` を返す型)
- DR-127 §3/§4.1 (link 値残余の座 — §7 で Sentinel Reject の対象が縮み、空座 Reject が
  `ctx.old` を要する fn に精密化される)
- DR-080 §2 (merge accumulator の `remove` / `splice` — 本 DR の対象外、op 表に残る)
- DR-125 (`inherit` を `borrow` の重複住人として畳んだ先例 — 根拠の第 1 節と同型)
- CONFORMANCE §2 (effects の op 表 — §6 で 5 op へ)
- docs/research/2026-08-01-null-projection-inversion.md §3 (本 DR の正本ノート、mid=32〜40)
