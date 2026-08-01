# DR-131: Sentinel を default 1 つへ縮小する — unset は null 返し、empty は空値を返す Value fn

> 由来: kawaz チャット裁定 2026-08-01 (ccmsg r98 mid=32〜40)、NUL-Q2=a で effects の op 語彙も確定。
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

### 2. `set` の committed は operand が `null` かどうかで決まる

DR-045 §2 の「committed は効果が明示制御する」という規範は不変だが、その制御の担い手が op から
operand へ移る。

| 効果 | committed | 値源ラダーへの作用 |
|---|---|---|
| `set` (operand ≠ null) | **true** | ユーザの明示指定としてロック |
| `set` (operand = null) | **false** | 下段 (env / config / default) へ開放 |

`unset` が「触っていないことにする」(DR-045 §1) 意味論は、`null` が「この文脈に存在するが値が無い」を
語る値である (DR-130 §1) ことから直に出る。**値が無いのだから commit する対象も無い**。

`empty` が `set([])` になっても committed=true である点 (§3) は、`[]` が null ではない普通の値だから
そのまま従う — DR-045 が `unset` と `empty` の違いを committed フラグで説明していた区別は、operand の
違いとして保存される。

### 3. `empty` は対象型の空値を返す普通の Value fn になる

`empty` はコレクションを空にする特別な cell 操作をやめ、**対象セルの型に応じた空値を返す Value fn**に
なる。配列セルなら `[]`、map セルなら `{}` を返し、その値が通常の `set` として適用される。

対象型の参照は既存の ABI で足りる — `EffectCtx` は対象 cell を提供し (DR-114 §7)、`DefaultCtx` は
default 値の target を提供する。`set` / `borrow` が既に target 依存で振る舞う fn である以上、`empty` が
target の型を見て空値を組み立てるのは新しいパターンではない。

committed=true の意味論は不変である。「ユーザが明示的に空にした」は `[]` という値の明示 set であって、
ラダーを開放する `unset` とは引き続き区別される (§2)。

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
ない。同じ `[]` という値が両方の座に現れうるが、混ざる場面は無い。

### 5. `default` だけが Sentinel として残る

`default` (`use_default`) は Sentinel のまま残す。**値として書けないため**である。

op=default が意味するのは「現在の (書き換え済みの) default を明示 set する」(DR-081 §2) であり、その
実値は発火時点では決まっていない — default は placeholder として設置され、依存順で最終相に実体化する
(DR-087 §2/§3)。発火時に `Value` を返す fn へ畳もうとすると、fn の中で default 席を先に解決することに
なり DR-087 の遅延解決モデルを壊す。

したがって `default` は「**定義注入された cell_fn を拾ってこい**」という指示子であり続ける。Sentinel union
は実質この 1 住人に縮小する。

### 6. effects の op 語彙は `set` に統一する (NUL-Q2=a)

観測面から `unset` / `empty` の op を廃止し、operand で表す。

| 発火 | 旧 (DR-045 §1) | 新 |
|---|---|---|
| unset | `{"op":"unset"}` | `{"op":"set","operand":null}` |
| empty | `{"op":"empty"}` | `{"op":"set","operand":[]}` (target が map なら `{}`) |

CONFORMANCE §2 の op 表は **6 op から 4 op** (`set` / `default` / `remove` / `splice`) へ縮む
(`remove` / `splice` は merge accumulator の piece op で本 DR の対象外、DR-080 §2)。

**この統一で観測が失われる箇所は無い** — `unset` と `empty` の区別は operand (`null` か `[]` か) が
担い、committed の区別は §2 の規則で operand から導ける。`fixtures/multiple-parse/filters-cell-ops.json`
が「両者の最終値はともに `[]` で sources も同形なので、区別を担うのは effects の op である」と書いて
pin していた対比は、**op ではなく operand が担う対比**として保存される。

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

- **DR-045**: §1 の op 表から `unset` / `empty` を削除し 2 op (`set` / `default`) + DR-077 の `update`
  の記述へ縮小。§2 の committed の説明を「op が制御する」から「set の operand が `null` かどうかが
  制御する」へ改める (§2)。§旧実装からの継承の「旧 Variation の Reset / Unset が本 DR の default / unset に
  対応する」という考古学の記述は、対応先が `default` / `set(null)` になる
- **DR-113 §5.4**: failure semantics 表の「default 席で Sentinel fn を指定」行の対象が `default` 1 つに
  なることを追補 (§7)。同表の「`borrow:X` の source が最終的に不在 / unset → fn reason `absent-source`」の
  行は**要裁定** (下記の「裁定にかけるなら」)
- **DR-114 §2 / §8**: §2 末尾の「default 席は `Value` を返す fn だけを受け入れ、`Sentinel` を返す fn の
  指定は definition-error `invalid-range`」は文言不変で対象が縮む。§8 の `cell_fns` 代表住人リストで
  `unset` / `empty` を `Value` 返し群へ移す (§7)
- **DR-127 §4.1**: 「Sentinel を返す fn (`unset` / `default` / `empty`) の適用は発火時の Reject」の列挙を
  `default` 1 つへ (§7)
- **DR-081 §2/§3**: op=default の意味 (現在の default を明示 set、committed=true) は不変。§3 の
  「op=unset = uncommitted 化」を `set(null)` の形へ書き換える
- **DR-077**: `update` op を追加した DR。CONFORMANCE §2 が既に「`incr` 等が `ctx.old` から返した新値も
  `set` として観測し、専用 `update` op は持たない」と書いており、本 DR の「Value 返しは全部 `set`」と
  整合する。**両者の食い違い (DR-045 §更新は `update` を 5 語目の op として記述) は本 DR の対象外だが、
  op 表を触る際に併せて整理する**
- **DR-011**: variant DSL の effect 4 種が op 語彙の出所。wire の綴り (`reset:unset` / `no:empty`) は
  不変で、lowering 先が Sentinel から Value 返し fn へ変わる点を追補

### docs 本体

- **docs/CONFORMANCE.md §2**: op 表を 6 op から 4 op へ (§6)。「variant effect (effect mode): cell fn の
  `Value` 返却は通常の `set`、Sentinel 返却は `default` / `unset` / `empty` として effects に射影する」の
  一文を `default` のみへ。「default_fn (default mode): default 席は `Value` を返す cell fn だけを
  受け入れ」は文言不変
- **docs/DESIGN.md §8.3 / docs/PIPELINE.md §2 段 5**: 「unset / default / empty は値を書かないので filter
  chain を通らない」の根拠を、null 素通し (DR-130 §3) と空コレクションに each 相の適用対象が無いこと の
  2 本へ差し替える (§6)。`default` については従来の根拠が残る
- **docs/REFERENCE.md**: `cell_fns` 住人一覧の返り値型 (`unset` / `empty` が `Value` 返しへ)

### schema

- `schema/fixture.schema.json`: `effects[].op` の enum から `unset` / `empty` を削除、`operand` を
  `null` 許容へ
- `schema/builtin-descriptors.json`: `cell_fns` の `unset` / `empty` の `io_type.output` を
  tagged `Sentinel` から `Value` (`unset` は `"null"`、`empty` は target 依存) へ

### fixture

`op` が `unset` / `empty` の effects を持つ全 case が対象。確認済みの本丸は次の 3 ファイルで、
いずれも why が op による対比を教義として説明しているため**文面の書き換えが必須**:

- `fixtures/multiple-parse/filters-cell-ops.json` (3 case すべて。unset / empty × accumulator × value_filters の
  対比が主題で、§6 の「op ではなく operand が対比を担う」「filter 素通りの根拠が 2 本になる」を反映する)
- `fixtures/variant-effects/empty-clear.json` (2 箇所)
- `fixtures/export-key/accum-under-nested-command.json` (1 箇所)
- `fixtures/multiple-parse/default-cell-ops.json` / `fixtures/value-sources/unset-ladder.json` /
  `fixtures/multiple-parse/unset-env-fallback.json` (DR-081 §波及が既に挙げている unset 系。op 形の追随)

`op: "default"` の case は本 DR で変化しない (§5)。

### 実装

- **kuu.mbt**: cell fn の返り値型から `Sentinel::unset` / `Sentinel::empty` を削除し、`unset` は
  `Value::null` を返す住人へ、`empty` は対象セル型から空値を組み立てる住人へ。効果適用側は
  `set` の operand が `null` かで committed を分ける (§2)。effects の serialize と conformance decoder も
  4 op へ
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

### (c) effects の op に `unset` / `empty` を観測語彙として残す (NUL-Q2=b 相当)

内部表現は `set(null)` / `set([])` へ統一しつつ、effects への射影では従来の op 名を維持する案。fixture の
書き換えが要らず、diff が読みやすいという利点がある。棄却理由は、**effects が「値セルへの操作の正本」で
ある** (CONFORMANCE §2「effects が判定の正本」) 以上、内部で 1 つになった操作を観測面で 2 つに割ると、
射影規則そのものが新たな規定として必要になること。`op` は操作の種類を語る軸であって committed の軸では
なく、committed を知りたい消費者は operand から導ける。観測語彙を実体より豊かに保つのは、DR-045 が
op で語っていた区別への後方互換であって設計上の優位ではない。

## 関連

- DR-130 (**前提** — `null` の値空間への昇格・素通し規則。本 DR はその上で Sentinel を畳む)
- DR-045 §1/§2 (効果記述子の op 語彙と committed の制御 — §2/§6 で改定)
- DR-011 (variant DSL の effect 4 種 — wire の綴りは不変、lowering 先が変わる)
- DR-113 §5.3/§5.4 (cell fn ABI `Value | Sentinel` と failure semantics — §7 で対象が縮む)
- DR-114 §2/§7/§8 (universal fn 統合・`FnCtx` / `EffectCtx` / `DefaultCtx`・`cell_fns` 住人分類 — §3/§7)
- DR-087 §2/§3 (default の遅延解決 placeholder — §5 で `default` を残す理由)
- DR-081 §2/§3 (op=default の意味と op=unset の uncommitted 化 — 前者不変、後者を `set(null)` へ)
- DR-127 §4.1 (link 値残余の座への Sentinel 返し Reject — §7 で対象が縮む)
- DR-080 §2 (merge accumulator の `remove` / `splice` — 本 DR の対象外、op 表に残る)
- DR-125 (`inherit` を `borrow` の重複住人として畳んだ先例 — 根拠の第 1 節と同型)
- CONFORMANCE §2 (effects の op 表 — §6 で 4 op へ)
- docs/research/2026-08-01-null-projection-inversion.md §3 (本 DR の正本ノート、mid=32〜40)
