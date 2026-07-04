# DR-019: repeat を multiple に統合、構造プリミティブは4つ、可変長 positional の表現

> **注記: 本 DR の「repeat と multiple を multiple 一本に統合する (= repeat を multiple 属性に吸収して消滅させる)」決定は DR-043 で覆された。現役では repeat (構造閉包) と multiple (値の畳み) は分離している (詳細は末尾 [Superseded (歴史)](#superseded-歴史) 参照)。本 DR で現役なのは次の2点: (1) 構造プリミティブは exact/or/seq/primitive の4つ、(2) 反復を独立した構造プリミティブ (`{type:"repeat", child}` のような要素) にはせず、要素側の性質として表す。以下の本文に残る「multiple 一本に統合」「repeat は属性に昇格 = 消滅」という表現は当時の決定であり、現役仕様ではない。**

## 決定

### 構造プリミティブは4つ

```
exact / or / seq / primitive
```

当初 `repeat` を5つ目の構造プリミティブとして導入しかけたが却下し、**反復は独立した構造プリミティブではなく要素側の性質として表す**方針にした。(当時はこれを「要素属性 `multiple` に統合して消滅させた」と表現したが、この同名統合は後に DR-043 で分離された → Superseded。)

### 反復は独立した構造要素ではなく要素の性質で表す

「同じ要素を不定回」という反復は、独立した構造要素ではなく **要素に付く属性**で表す (当時の表現では `multiple` 属性、現役では repeat 属性として分離):

```json
// 可変長 positional: rm path...
// ※ 下記 JSON は当時の「multiple 一本統合」表現。現役では repeat/multiple 分離 (DR-043)
{"name": "path", "multiple": {"min": 1}}

// mv a b c dst
"positionals": [
  {"name": "path", "multiple": {"min": 1}},
  {"name": "dir"}
]
```

当時は、option の複数回累積 (DR-008) と positional の複数個を **どちらも「複数値属性 = multiple」** で対称に表現していた (この対称統合は DR-043 で覆された → Superseded)。起動方式 (位置 vs name) は配置で既に決まっているので、属性側で区別しない、という判断自体は現役。

- positional 文脈: 個数制約が主に効く
- option 文脈: 累積戦略が主に効く
- 効く要素が文脈で変わるだけ

### 値の伝搬表 (DR-015 + primitive 補完)

| type | 値の発生 | 親への伝搬 |
|---|---|---|
| primitive (string/number/...) | value 持つなら literal、無いなら CLI から1引数消費 | 自身の値 |
| exact | value 持つなら literal、無いなら値なし | 値があれば伝搬 |
| or | 選ばれた子の値 | 子の値をそのまま |
| seq | 子の値の配列 (単独要素なら単独) | 配列 or 単独 |

反復する要素は、上記の単一値が複数回畳まれる。

## 経緯

### repeat の発見

前回までのプリミティブ (exact/or/seq/primitive) では **`rm path...` すら定義できなかった**。seq は「決まった数の子を順次」、or は「1つ選ぶ」だけで、「同じ要素を不定回」が穴だった。

kawaz:
> リピート要素が前のだと定義できてなかったからね。rm path... すら定義できなかったと思う。

### repeat を独立要素にする誤り

Claude は当初 `{type: "repeat", child: ...}` という独立構造要素を提案。kawaz が却下:

> それはオプションの話じゃなくて? ポジショナルで定義するにはその path の定義を配列にする必要が出るのでは? ポジショナルにそれがいても意味がわからない。

positional 列の中に「repeat という名前の要素」がいても何を繰り返すのか不明。正しくは **positional 要素そのものが「繰り返す」性質を持つ** = 要素の性質。この「独立構造要素にしない」判断は現役。

### multiple との統合 (※ DR-043 で覆された当時の決定)

当時は repeat (positional の個数) と multiple (option の累積) を**実質同じもの**——「同じ要素が複数回 → 値を畳む」——とみなした。違いは起動方式だけで、それは配置で決まる、と整理した。

kawaz:
> 確かにリピートとマルチプルは同じかもね。ポジショナルで使ったらリピートの意味になる感じか。

→ 当時は属性を `multiple` 一本に統合した (フィールドを安易に増やす反省パターンを回避する意図)。**この同名一本統合は後に DR-043 で分離された (→ Superseded)。**

## 効果

- 構造プリミティブが4つに確定 (repeat を5つ目の構造プリミティブにはしない)。※ 当時は「repeat は属性に昇格 = 消滅」と表現したが、repeat 自体は DR-043 で multiple と分離した独立概念として現役 (→ Superseded)。
- `rm path...` / `mv a b c dst` / `cp src... dst` が書けるようになった (前回の穴を完全に塞いだ)。
- (当時) positional の個数と option の累積が対称に表現される、とした ——この対称統合は DR-043 で覆された (→ Superseded)。

## 関連

- DR-005 (type は要素単位の型)
- DR-008 (multiple フィールド) — 本 DR で個数概念を統合
- DR-015 (値の伝搬) — primitive 行を補完
- DR-027 (seq への改名、`serial` は廃止語、`seq` が canonical)
- DR-034 (multiple の内部構造再編成)
- DR-038 (bounded path-search による曖昧性解決)
- DR-043 (repeat と multiple を分離) — 本 DR の同名統合を覆す

## Superseded (歴史)

> 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。

### multiple との同名統合 (DR-043 で分離)

> **更新: DR-043 により「repeat (positional の個数) と multiple (option の累積) を multiple 一本に統合する」決定は覆された。現役は repeat (構造閉包、min/max、repeat installer が ref 再帰へ lowering) と multiple (値の畳み、multiple installer) の分離。本 DR の「repeat を独立構造要素にせず要素の性質で表す」判断は引き続き有効。**

### multiple のフィールド一覧 (DR-034 で再構成)

> **更新: DR-034 により本 DR の「multiple が min/max/kind/on_repeat/item_separator/key_value_separator/key_from を直接持つ」設計は撤回。現役は DR-034 の `pieceProcessor` / `separator` / `accumulator` / `collector` の4要素分解 + 個数制約を別軸に分離する形に再編成された。本 DR の「repeat を multiple に統合する」決定自体は引き続き有効。**

統合当初の multiple は以下のフィールドを直接持つ設計だった:

| フィールド | 主に効く文脈 | 役割 |
|---|---|---|
| `min` / `max` | positional | 個数 |
| `kind` | 両方 | list / set / map (値の構造) |
| `on_repeat` | option | append / override / ... |
| `item_separator` / `key_value_separator` | 両方 | 1引数内分割 |
| `key_from` | map | キー源 |

DR-034 でこれらは `pieceProcessor` / `separator` / `accumulator` / `collector` の4要素に再構成され、個数制約 (`min` / `max`) は multiple 内部に同居させず**別軸として分離**する方針に変わった。

### 「最長一致」前提での ambiguous 解決 (DR-038 で更新)

> **更新: DR-038 により「最長一致」を成功条件とする規則は廃止。現役の契約は「完全経路の一意性 (bounded path-search で唯一の経路に確定すること)」。本 DR の `mv a b c dst` が解けるという結論自体は変わらないが、根拠は「最長一致だから」ではなく「全 positional 列を満たす経路が唯一だから」に置き換わる。**

`mv a b c dst` は `{path, multiple:{min:1}}` + `{dir}` で書ける。`dir` が multiple なし = ちょうど1個と確定しているので、`path` の取り分 (末尾1個を残す) が一意に決まる ——この帰結を当初は「最長一致で曖昧さなく解決できれば成功 (DR-021)」と表現していた。

帰結として残る性質は DR-038 の語彙で同様に表現される:

> 同一 positional 列に上限なしの multiple が複数あると、取り分の経路が一意に決まらず ambiguous になりうる。

これは定義として書けてしまうが実行時 ambiguous。静的バリデータが「上限なし multiple が列内に複数 → 潜在 ambiguous」を warn できる。
