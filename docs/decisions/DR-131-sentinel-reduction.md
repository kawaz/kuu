# DR-131: Sentinel を default 1 つへ縮小する — unset は null 返し、empty は空値を返す Value fn

> **更新 (2026-08-02、EMP-Q1=a): `empty` の Value fn 化を差し戻し、`Sentinel(Empty)` を返す cell fn に残す。**
> Sentinel の住人は `default` / `empty` の 2 つになる。観測 op `empty` の温存、対象型に依存する空値決定、
> 空値を運ぶための `abi.Value` 複合化依存という 3 つの特別視が残り、値化の利得が立たなかったためである。
> `unset` の null Value 化と `set(null) = unset` は不変。
>
> 由来: kawaz チャット裁定 2026-08-01 (ccmsg r98 mid=32〜40)、NUL-Q2=a / NUL2-Q1=a、
> 2026-08-02 EMP-Q1=a。正本ノートは `docs/research/2026-08-01-null-projection-inversion.md` §3 / §5c。
> **前提は DR-130** — `null` が値空間の住人に昇格したことで、`unset` は普通の値返し fn として書ける。
> cell fn の返り値型 `Value | Sentinel` (DR-113 §5.3 / DR-114 §7) の Sentinel 側は `default` / `empty` の
> 2 住人に縮む。

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

DR-045 §2 の「committed は効果が明示制御する」という規範は不変である。`set` operation では制御の担い手が
op から operand の null 性へ移る。`default` / `empty` operation は引き続き op 自体が committed=true を規定する。

| 効果 | committed | 値源ラダーへの作用 |
|---|---|---|
| `set` (operand ≠ null) | **true** | ユーザの明示指定としてロック |
| `set` (operand = null) | **false** | 下段 (env / config / default) へ開放 |

`unset` が「触っていないことにする」(DR-045 §1) 意味論は、`null` が「この文脈に存在するが値が無い」を
語る値である (DR-130 §1) ことから直に出る。**値が無いのだから commit する対象も無い**。

`empty` は `Sentinel(Empty)` を返し、対象 collection を committed=true で空にする (§3)。DR-045 が
`unset` と `empty` の違いを committed フラグで説明していた区別は、null Value によるラダー開放と Sentinel による
明示クリアの違いとして保存される。effects では `empty` の観測 op をそのまま使う (§6)。

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

### 3. `empty` は `Sentinel(Empty)` を返す cell fn のまま残る

`empty` は値を供給する fn ではなく、**対象 collection を空にするセル操作の指示語**である。
`Sentinel(Empty)` を返し、cell 適用時に committed=true で対象を空にする。`unset` が null Value を返して
committed=false でラダーを開放するのとは、値供給とセル操作の層で区別される (§2)。

#### 3.1 `empty` の target 域

`empty` を適用できる target は閉じている。適用できない target に `empty` を置くのは
**definition-error `invalid-range`** (DR-054 §4) である:

| target の型 | `empty` のセル操作 |
|---|---|
| array | `[]` にする |
| map | `{}` にする |
| record (DR-126) | `{}` にする — 射影で全フィールドが `null` になる (DR-130 §4/§4.1) |
| scalar (number / string / bool 等) / union / その他 | **definition-error `invalid-range`** |

scalar に「空」は無い。ゼロ値 (`0` / `""` / `false`) を空と読む暗黙ルールは導入しない。「値を取り除きたい」
意図は `unset` (= `null` 返し、§1) が担う。

`default_fn` の席は Value 返し fn だけを受け入れるため、target 型にかかわらず `default_fn: "empty"` は
**definition-error `invalid-range`** になる。空配列を既定値にする場合は `default: []` と書けるので、
表現力は失われない。

### 4. `empty` は値を運ばず、セル操作と観測 op が一対一に対応する

```
{name:"numslist", type:"number", repeat:2, multiple:"append",
 long: [":set", "no:empty"]}
```

- `:set` の値スロットは **accumulator への行供給の座**。`--numslist 5 5` は行 `[5,5]` を積んで `[[5,5]]`
- `no:empty` は **セル操作の座**。`--no-numslist` は `Sentinel(Empty)` によりセル値を丸ごと `[]` にする
- 続けて `--numslist 2 3` を書けば行供給の座へ戻り `[[2,3]]` になる

セル操作の `empty` 発火は `{"op":"empty"}`、行供給の `[]` は `{"op":"set","operand":[]}` と観測する。
観測 op `empty` の温存 (NUL2-Q1=a) は、`empty` が普通の Value fn ではなくセル操作の指示語であることと一致する。
同じ座の区別は §2.1 の `null` にも効き、セル操作の座へ着地した `null` はラダーを開放し、行供給の座へ
着地した `null` は行を積まない。

### 5. Sentinel は `default` / `empty` の 2 住人に縮小する

`default` (`use_default`) は、遅延解決される default placeholder を選ぶ指示子であり、発火時点に Value として
書けないため Sentinel に残る。`empty` は、対象 collection を空にするセル操作の指示語であり、値供給へ畳むと
§根拠の 3 つの特別視が残るため Sentinel に残る。

`unset` だけが null Value へ畳まれ、Sentinel union は `default` / `empty` の 2 住人になる。

### 6. effects の op 語彙から `unset` のみ廃止し、`empty` は温存する (NUL-Q2=a / NUL2-Q1=a)

`unset` は operand で表し、クリアは専用の観測 op を保つ。

| 発火 | 旧 (DR-045 §1) | 新 |
|---|---|---|
| unset | `{"op":"unset"}` | `{"op":"set","operand":null}` |
| empty | `{"op":"empty"}` | `{"op":"empty"}` |

CONFORMANCE §2 の op 表は **6 op から 5 op** (`set` / `default` / `remove` / `splice` / `empty`) へ縮む
(`remove` / `splice` は merge accumulator の piece op で本 DR の対象外、DR-080 §2)。

**観測の非単射は生じない** — unset と empty は `set(null)` / `empty` の op で区別でき、accumulator セルの
クリアと `[]` 行供給も `empty` / `set([])` で区別できる。committed は §2 の規則どおり、set は operand が
null なら false・それ以外なら true、empty は Sentinel operation として true になる。`fixtures/multiple-parse/filters-cell-ops.json` が「両者の最終値はともに `[]` で sources も
同形なので、区別を担うのは effects の op である」と pin していた対比は、**unset 側だけ `set(null)` へ
移し、empty 側の op を残す**形で保存される。

同 fixture が pin するもう 1 つの規範 (「値を書かない cell 操作は value_filters を通らないので reject の
対象にすらならない」) は次の 2 経路で保存される:

- `set(null)` は operand を運ぶが、DR-130 §3 の **null 素通し**により filter は null に触れない
- `empty` は Sentinel を返して値を運ばないため、filter の対象 piece が生じない

いずれも filter が reject を出さない。

### 7. Sentinel を前提にした特例群は 2 住人へ縮小する

- **DR-113 §5.4 / DR-114 §2**「default 席で Sentinel fn を指定 → definition-error `invalid-range`」— 弾く
  対象は `default` / `empty` の 2 つになる。`unset` は null Value を返すため default 席に書ける。
  空コレクションを既定値にする場合は `default: []` / `default: {}` と書く
- **DR-127 §4.1**「値残余の座に許すのは set と Value 返し fn のみ、Sentinel 返しは発火時 Reject」— Reject
  対象は `default` / `empty` の 2 つになる。link パスの座へ `null` を書く (= その座を空ける) ことは §1 により
  通常の set として成立する
- **DR-127 §3 の「空の座への適用は Reject」を精密化する** — Value 返し fn で Reject になるのは
  **`ctx.old` を要する fn** (`incr` 等) に限る。`set` と `null` 返し (`unset`) は現在の座の値を必要としないので、
  座に値が無くても成立する。Sentinel 返しの `default` / `empty` は前項により Reject となる
- **DR-114 §8** の `cell_fns` 代表住人は、「`Value` を返す」群に `unset` が移り、「`Sentinel` を返し
  effect mode だけで使える」群が `default` / `empty` になる

## 根拠

### null が値空間に居るなら、Sentinel の `unset` は同じ意味を持つ重複住人になる

DR-045 が `unset` を Sentinel (値を書かない cell 操作) にしたのは、「値が無い」を表す値が kuu に無かった
からである。「default 値へ戻して committed=false にする」という操作としてしか書けなかった。

DR-130 で `null` が「この文脈に存在するが値が無い」を語る値になった以上、同じことを値として書ける。
`unset` を Sentinel のまま残すと、**同じ意味を持つ住人が値空間と Sentinel 空間に 1 つずつ**居ることに
なり、両者の相互作用 (`set(null)` の後に `unset` が来たら? など) を規定する必要が新たに生まれる。
統一すればその規定は要らない。DR-125 が `inherit` を `borrow` の重複住人として畳んだのと同型の判断である。

### `empty` を Value fn 化しても 3 つの特別視が残る

1. **観測 op `empty` の温存** — fn の素性を見て通常の `set` から op を差し替える必要があり、普通の Value fn
   と同じ射影にならない
2. **対象型に依存する空値決定** — `FnCtx` へ target 型を供給し、array / map / record ごとの空値を組み立てる
   必要がある
3. **`abi.Value` の複合化依存** — `[]` / `{}` を fn の返り値として運ぶため、値表現の拡張が前提になる

観測 op を温存した判断は、クリアと `[]` 行供給を同じ `set([])` へ写す非単射を避けるためであり、`empty` が
値ではなくセル操作の指示語であることを認めている。3 つを残したまま返り値の型だけを Value に替えても、
Sentinel を外す利得は立たない。

### Sentinel に残す条件は、値供給へ畳んだ時に特別視が消えること

| Sentinel | Value への表現 | 判定 |
|---|---|---|
| `unset` | `null`。通常の `set(null)` として全経路を共有できる | 畳む |
| `empty` | 空値へ写しても前節の 3 特別視が残る | 残す |
| `default` | placeholder の実体化は最終相で、発火時に値が決まらない (DR-087) | 残す |

この軸により Sentinel は `default` / `empty` の 2 住人へ縮小する。

## 波及

### DR

- **DR-045**: §1 の op 表から `unset` のみ削除し 3 op (`set` / `default` / `empty`) + DR-077 の `update`
  の記述へ縮小。§2 の committed の説明を「op が制御する」から「set の operand が `null` かどうかが
  制御する」へ改める (§2)。§旧実装からの継承の「旧 Variation の Reset / Unset が本 DR の default / unset に
  対応する」という考古学の記述は、対応先が `default` / `set(null)` になる
- **DR-113 §5.4**: failure semantics 表の「default 席で Sentinel fn を指定」行の対象が `default` / `empty`
  の 2 つになることを追補 (§7)。同表の「`borrow:X` の source が最終的に不在 / unset → fn reason `absent-source`」の
  行は**削除する** — 参照先の座は `null` になり、borrow の `null` 返しと `set(null) = unset` の伝播が
  同じ観測を produce する (§1.1)。`absent-source` の reason 語彙も併せて廃止される
- **DR-114 §2 / §8**: §2 末尾の「default 席は `Value` を返す fn だけを受け入れ、`Sentinel` を返す fn の
  指定は definition-error `invalid-range`」は文言不変で、対象は `default` / `empty`。§8 の `cell_fns`
  代表住人リストで `unset` を `Value` 返し群へ移し、`empty` は Sentinel 群に残す (§7)
- **DR-127 §4.1**: 「Sentinel を返す fn (`unset` / `default` / `empty`) の適用は発火時の Reject」の列挙を
  `default` / `empty` の 2 つへ (§7)
- **DR-081 §2/§3**: op=default の意味 (現在の default を明示 set、committed=true) は不変。§3 の
  「op=unset = uncommitted 化」を `set(null)` の形へ書き換える
- **DR-077**: `update` op を追加した DR。CONFORMANCE §2 が既に「`incr` 等が `ctx.old` から返した新値も
  `set` として観測し、専用 `update` op は持たない」と書いており、本 DR の「Value 返しは通常 `set`、
  ただしクリアは非単射回避のため `empty`」と整合する。**DR-045 §更新が `update` を 5 語目の op として記述している食い違いは本 DR の対象外**で、
  **独立の issue として起票して処理する** (本 DR の op 表改定に混ぜない — 転換とは無関係な既存の不整合で
  あり、同じ commit に載せると本 DR の波及範囲が読めなくなる)
- **DR-011**: variant DSL の effect 4 種が op 語彙の出所。wire の綴り (`reset:unset` / `no:empty`) は
  不変。`unset` の lowering 先だけが Sentinel から null Value fn invocation へ変わり、`empty` は
  Sentinel/direct-op lowering のまま

### docs 本体

- **docs/CONFORMANCE.md §2**: op 表を 6 op から 5 op へ (§6)。「variant effect (effect mode): cell fn の
  `Value` 返却は通常の `set`、Sentinel 返却の `default` / `empty` は同名 op として effects に射影する」へ
  改定。「default_fn (default mode): default 席は `Value` を返す cell fn だけを
  受け入れ」は文言不変
- **docs/DESIGN.md §8.3 / docs/PIPELINE.md §2 段 5**: `unset` は null 素通し (DR-130 §3)、`default` / `empty`
  は Sentinel で値を運ばないため filter chain の対象 piece が生じない、と記述する (§6)
- **docs/CONFORMANCE.md §2 (`sources` の空コレクション)**: 「ユーザが明示的に空にした / 何も来なかった の
  区別は `effects` の op (`empty` / `unset`) が担う」を **`empty` / `set(null)` が担う**形へ (§6)
- **docs/REFERENCE.md**: `cell_fns` 住人一覧の返り値型 (`unset` は null `Value`、`empty` は `Sentinel(Empty)`)

### schema

- `schema/fixture.schema.json`: `effects[].op` の enum から `unset` のみ削除し、`empty` は温存。
  `operand` を `null` 許容へ
- `schema/builtin-descriptors.json`: `cell_fns` の `unset` の `io_type.output` を tagged `Sentinel` から
  `Value` (`"null"`) へ。`empty` は tagged `Sentinel` のまま

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

- **kuu.mbt**: cell fn の返り値型から `Sentinel::unset` を削除し、`unset` は `Value::null` を返す住人へ。
  `Sentinel::empty` は残す。効果適用側は `set` の operand が `null` かで committed を分ける (§2)。effects の
  serialize と conformance decoder は 5 op へ
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
- DR-011 (variant DSL の effect 4 種 — wire の綴りは不変、`unset` の lowering 先だけが null Value fn invocation へ変わる)
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
