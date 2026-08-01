# DR-130: 結果射影は宣言キーの全列挙 — 値の無い座は null、absent (キー無し) は成功 result から消える

> 由来: kawaz 提案 2026-08-01 (ccmsg r98 mid=30〜40)、裁定は NUL-Q1〜Q4 / NUL-C1 checkbox で全確定。
> 正本ノートは `docs/research/2026-08-01-null-projection-inversion.md`。発端は LNK2-Q1 (nameless tuple の
> 部分書きで配列の穴が表現できない) の再考 —「逆に undefined を null に寄せるのはどうだろう」(mid=30)。
> **DR-051 (結果の欠落表現 — 値の無い要素は absent、null は値空間に持たない) を全面 supersede する**。
> DR-051 が「値の無さは構造 (キーの不在) で語る」を選んだのに対し、本 DR は「値の無さは値 (null) で語り、
> 構造は宣言どおり常に立つ」へ反転させる。

## 決定

### 1. 成功 result の各実現スコープは、宣言上出うる全キーを必ず持つ

成功した result の各スコープには、**そのスコープで宣言された露出キーが漏れなく現れる**。値源ラダー
(DR-031) を回しても値が確定しない座には `null` が入る。**absent (キー自体が現れない) は成功 result から
消える**。

```
{options: [{name:"name", type:"string", long:true},
           {name:"port", type:"number", long:true, default:5}]}

引数なし → {"name": null, "port": 5}      (DR-051 では {"port": 5})
```

DR-051 §2 が列挙した「absent にならない条件」は、そのまま「null にならない条件」として不変である —
反復系は 0 発火でも `[]` を持ち (DR-044 / DR-123 §3)、flag / count はプリセット同梱の default を持ち
(LOWERING §A.5)、required 要素は値が無ければ経路自体が不成立 (DR-047)。変わるのはこの 3 族**以外**の
帰結だけで、以前 absent だった座が `null` になる。

キーの列挙単位は**実現したスコープ**である。実現していないスコープの内側は §2 が定める。

### 2. 未選択の子 command scope は親レベルに `subcmd: null` と出るだけで、再帰は 1 段で止まる

未選択の子 command (および未成立の scope 生成要素) は、親スコープのキーとして `null` を持つ。
**null がサブツリーの展開ごと置き換える**ので、その内側のキーを列挙する必要はない。

```
commands: [{name:"add", ...}, {name:"rm", ...}]

`add` を選択 → {"add": {<add スコープの全宣言キー、埋まらない座は null>}, "rm": null}
```

選択された scope の内側は §1 の規則が再帰的に適用され、全キー列挙 + null になる。この「1 段で止まる」
性質により、宣言全体が巨大でも result の大きさは**実現した経路の宣言幅**に比例するにとどまる。

DR-103 の「未選択 command scope に宣言された遅延述語 (required / required_group) は評価に参加しない」
という裁定は不変である。根拠が「存在しない結果部分木に値述語を課せない」(DR-051 §3 の unselected =
absent) から「未選択 scope は `null` で畳まれ内側の座が実現しない」へ付け替わるだけで、観測は変わらない。

### 3. null は値空間の住人であり、パイプラインは null 素通しの 1 規則で済む

`null` は結果射影層だけの表示形ではなく、**kuu の値空間に属する値**である。したがって filter /
value_parser / cell fn / link の値降下といった値を扱う面はすべて `null` を見うる。ただし規則は 1 本で
足りる:

> **null 素通し**: 値を変換・検証する住人 (filter・pieceProcessor・value_parser) は `null` に触れず
> そのまま通す。

Option monad の `map` と同型で、各住人が null 分岐を持つ必要はない。DR-051 「採用しなかった案」の
explicit-null が懸念した「全 type が nullable 化し全域に null 分岐が増える」は、この 1 規則で回避される
(根拠の第 2 節)。

この昇格により、**配列の穴が値として表現可能**になる。nameless tuple の部分書きは `[null, 2]` と書ける。
LNK2-Q1=a (全座が埋まるまで tuple ごと absent) は本転換で obsolete になる — 全座成立判定のロジックは
そのまま転用し、判定結果の挙動を「tuple ごと落とす」から「埋まらない座を null で埋める」へ差し替える。

### 4. 静的宣言キーは全列挙、動的キー構造は present のみ (NUL-Q3)

全列挙の対象は「**宣言から出うるキーが静的に分かる**」構造に限る。実行時にキーが決まる構造は
従来どおり present のみを載せる。

| 構造 | 射影 |
|---|---|
| `or` 席 | **セル単位で 1 キー**。unset なら `cell: null`。枝ごとのキーを同時列挙することはない (DR-120 §2 の「露出キーに対応する値セルはちょうど 1 つ」の帰結) |
| `repeat` の行 | 行の内側の静的宣言キーは null 埋め。tuple の `[null, x]` と同型 |
| `seq` の nameless tuple | 各座を全列挙、埋まらない座は `null` (§3) |
| record (DR-126) | **内側も反転** — closed な語彙なので全フィールド列挙 + `null` |
| 動的キー構造 (`from_entries` / merge accumulator / kv-map / config 由来 map) | **present のみ**。宣言に語彙が無く、出うるキーの集合が静的に定まらない |

record の反転は DR-126 §3 (「フィールドは presence-optional で `null` 不使用」) の改定である。closed =
キー語彙の閉域という裁定はむしろ全列挙の前提として効き、「宣言済みフィールドの不在は正常」という
presence 軸は「宣言済みフィールドの値が null なのは正常」へ読み替わる。DR-126 §4 の乖離 Error 2 種
(宣言外キーの存在 / フィールドの type が名乗る out との値型違い) は不変である。

### 5. sources も null を持ち、result との同型を保つ (NUL-Q4)

`sources` は `result` の shadow tree であり、**キー集合が result と完全一致する** (DR-122 §1/§2) という
規範を維持する。したがって result で `null` になった座は、sources でも `null` になる。

```
result:  {"name": null, "port": 5}      sources: {"name": null, "port": "default"}
```

`sources` の `null` は「**その座の値を確定させた主体が存在しない**」を意味する。DR-122 §2 が
「result に現れないキーは sources にも現れない」と書いた規範は文言としては不変で、result 側のキー集合が
広がった分だけ sources も広がる。

空コレクションの由来を表現しない規定 (DR-122 §2.1) は不変である — `[]` / `{}` は値の座を持たないので
置き換えるタグも無く、`null` を置く座も無い。

### 6. presence marker は概念ごと廃止する

DR-052 §3 の「結果キーを持つスコープ生成要素は、選ばれたら子が全部 absent でも空 kv `{}` を持つ」という
規則は廃止する。§1 により、選ばれたスコープは宣言キーを全列挙するので**空になりようがない**。子を 1 つも
宣言していないスコープが `{}` になるのは、空のキー集合を全列挙した結果であって marker ではない。

「選ばれたかどうか」は §2 の `{...}` と `null` の対比が語る。marker という別概念を持つ必要はない。

`export_key: null` は**別軸の null** であり本 DR の対象外である。あちらは結果キー軸のメタ (「このノードは
結果キーを持たない」の明示、DR-052 §2/§4 で `string | null`)、こちらは値である。両者は住む層が違うので
改名も統合もしない。

### 7. 型導出は `T` / `T | null` の 2 分岐になる

DR-051 §3 の導出規則を機械的に読み替える:

```
required ∨ default あり ∨ 反復系 → T          (不変)
それ以外                         → T | null   (旧: T?)
```

「default あり」が native な `default:` 値を指し可謬な `default_fn` を数えない点 (DR-113 §5.4 / DR-114)、
「反復系」が `optional: true` 糖衣を含む点 (DR-043 / DR-044) はいずれも不変である。

record (DR-126) の内側も同じ読み替えで、**全フィールドが `T | null`** になる。「このフィールドは常に立つ」
を機械可読に主張する手段を v1 が持たない点は変わらない。

言語バインディングにとっては `T | null` が `T?` (presence-optional) より自然な写像になる — TS の
`{name: string | null}`、MoonBit の `String?` はいずれも値の欠落を値で表す形であり、キーの有無を
問い合わせる形ではない。消費側の presence check も `obj.k === null` の 1 本になる。

### 8. fixture は全キーを逐語で書く (NUL-Q1=b)

conformance fixture の `expect.result` / `expect.sources` は、**null の座も含めて全キーを逐語で書く**。
runner が宣言から null を自動補完する方式は採らない。

理由 (kawaz mid=40): 記述コストの恒常増は大した量ではなく、全列挙は case 同士の比較がしやすい。初回の
書き換え (~560 case) は一度きりの投資である。

この帰結として **CONFORMANCE §3 の比較規約を改定する**。現行の「フィールド省略 = default 値と等価」を
`result` / `sources` へそのまま適用すると、キーの省略が「null と等価」に読めて検証が骨抜きになる。
`result` / `sources` はキー集合込みの完全一致 (省略の読み替えを行わない) とする。`candidates[].meta` を
「省略時に検証が骨抜きになるため常に書く運用」とした先例 (COMP-Q2) と同じ整理である。

### 9. 転換対象でない absent (誤爆注意)

以下は「値が無い」ではなく「**参照先が存在しない**」を指す別概念であり、本 DR の対象外である。機械置換を
かけてはならない:

- `absent-ref` — 名前解決の失敗 (DR-127 第 1 相、DR-032)
- `absent-source` — `borrow:<source>` の参照先が最終的に不在 (DR-113 §5.4)
- `absent-path` / `absent-category` — help クエリの照会先不在 (DR-112)
- `fixtures/link-parse/absent-target.json` — link の参照先不在を pin する fixture
- DESIGN §2.4 の「absent = 入口なし」系記述 / LOWERING の wire 入力側 presence — 入力側にキーが無いことの
  記述であり、出力射影の話ではない

## 根拠

### DR-051 が null を蹴った 3 つの理由は、反転によっていずれも成立しなくなる

DR-051 は 3 つの理由で null を退けた。反転はその 3 つを個別に無効化する。

**(1)「present-null は `T | null` と optional の二重表現になる」** — これは null を absent に**足した**場合の
批判である。本 DR は足すのではなく置き換える: absent が成功 result から消えるので、二重表現の片方が
存在しない。残るのは `T | null` の 1 系統だけで、消費側が「キーがあるが null」と「キーが無い」を区別する
場面自体が生じない。

**(2)「null を値空間に入れると全 type が nullable 化し全域に null 分岐が増える」** — §3 の素通し規則 1 本で
畳める。各住人が個別に null 分岐を書くのではなく、値を変換する面の共通契約として「null は触らず通す」を
置けばよい。Option monad の `map` が各関数を書き換えずに Option を通すのと同じ構造である。

**(3)「『明示的に無い』は unset (committed=false) が既に表現している」** — この指摘自体は正しいが、
unset が語るのは**セルのメタ状態**であって結果射影の形ではない。結果に現れる値としての「無い」を担う
住人が居なかったために、射影層が構造を削る (absent) しかなかった。null がその住人になることで、
Sentinel としての unset を「null を返す」へ畳める道が開く — それが DR-131 である。

### 全列挙はスキーマ発見性を生む

DR-051 の absent 射影では、result を 1 つ見ても「このコマンドレベルで出うるキーは何か」が分からない。
たまたま値が湧いたキーだけが並ぶので、消費者は宣言を別途読むか、複数の実行結果を突き合わせるしかない。

全列挙では、成功 result の 1 つが**そのスコープのスキーマそのもの**を見せる。JSON を目で読む人にとっても、
codegen にとっても、キー集合が実行ごとに揺れないことが効く。§2 の 1 段停止により、この発見性は
「実現した経路の宣言幅」というコストで買える。

### 構造で語ると穴が開けられない

LNK2-Q1 の発端はここである。nameless tuple の座を部分的に書いたとき、absent は「キーを消す」ことしか
できないが、配列の**途中の**座は消せない (消すと後続の添字がずれる)。結果として「全座が埋まるまで
tuple ごと落とす」という不自然な規則を置くしかなかった。

値で語れば `[null, 2]` と書けて、添字は宣言どおりに保たれる。同じ問題は record のフィールドにも repeat 行の
内側にも現れており、値による表現はそれらを 1 つの規則で覆う。

## 波及

### DR (全面 supersede)

- **DR-051**: 本 DR が全面 supersede する。ファイル冒頭に Superseded 注記を置き、INDEX の行にも
  **superseded by DR-130** を明記する。§2 の「absent にならない 3 族」と §3 の型導出の骨格は本 DR §1/§7 が
  読み替えて継承、§4「null は値空間に存在しない」と §1「値の無い要素は absent」は反転、§5 (ParserContext の
  2 層分離) は不変で本 DR にも引き継ぐ

### DR (部分改定)

- **DR-052 §3**: presence marker の一般規則を削除 (本 DR §6)。§4「DR-051 との整理 (null の区別)」は
  `export_key: null` が軸メタである点を維持しつつ、対比相手が「値空間に null が無い」から
  「値の null とは層が違う」へ変わる (本 DR §6)
- **DR-120 §4**: 「露出キーを占有する要素」の判定は不変だが、スコープ生成要素の根拠として引く
  「子が全部 absent でも空 kv `{}`」(DESIGN §2.6 / DR-052 §3) が消えるので、「選ばれたら宣言キーを全列挙した
  kv を持つ」へ差し替える。§2 の「露出キーに対応する値セルは 1 つ」は本 DR §4 の or 席の射影規則の根拠と
  して引かれる側になる (不変)
- **DR-121 §2**: 「席を持つのは値源ラダーで確定した値セルに限る」に null 座の扱いを追補 — null 座は
  ラダーが確定させなかった座なので、sources 側は `null` を持つ (本 DR §5)。§2.1 の presence marker の項目は
  marker の廃止 (本 DR §6) に追随
- **DR-122 §2**: 「キー集合は result と完全一致 (result の射影)」の文言は不変だが、根拠として引いている
  「result に現れないのは死んだ枝」の例示 (未選択 scope / absent) を、未選択 scope が `null` になる形へ
  更新する。§2.1 の空コレクションは不変 (本 DR §5)
- **DR-123 §3**: 反復セルの `[]` がラダー最下段の暗黙 default である点は不変。DR-051 §2 への参照を
  本 DR §1 へ付け替える
- **DR-081**: op=unset が committed=false へ戻す規定は不変だが、その結果ラダーが枯渇した座の**観測**が
  absent から `null` になる。§4 canonical 例と §波及の fixture 期待値に追随が要る
- **DR-103**: 未選択 scope の遅延述語不参加は**裁定不変**、根拠の付け替えのみ (本 DR §2)。§1 明確化注記の
  「DR-051 §3 の unselected scope = absent (キー消失) と整合」の一文を本 DR の `null` 畳みへ差し替える
- **DR-126 §3**: 「フィールドは presence-optional で `null` は使わない」を反転 — 全フィールド列挙 +
  `null`、型導出は `T | null` (本 DR §4/§7)。§2 の closed 裁定・§4 の乖離 Error 2 種は不変
- **DR-127**: 値残余の座への部分書きが `[null, 2]` / `{until: X, since: null}` を産みうる点を追補。
  §3 の record auto-vivify は「宣言済みだが書かれていないフィールドは null」で閉じる (器の形が定義時に
  確定するという裁定は不変)。§4.1 の Sentinel 返し Reject は DR-131 が別途改定する

### DR (注記のみ — 裁定は不変、absent への言及を null へ読み替え)

DR-016 (2 層分離) / DR-031 (値源ラダー枯渇時) / DR-044 (一様配列) / DR-045 (unset の committed=false) /
DR-050 (config の JSON null = 供給なし — **入力側の別軸なので裁定不変**、DR-051 §4 への参照だけ付け替え) /
DR-087 (default の遅延解決) / DR-088 (宣言された値源 = default の存在、解決後に値が無ければ落ちる) /
DR-089 (`type: "none"` は結果に現れない — **内部セルは全列挙の対象外**) / DR-093 (required の型委譲) /
DR-113 §5.4 (`absent-source` は別概念) / DR-114 (FnCtx の `old: Value | absent`) の計 12 本。

### docs 本体 (27 箇所、正本ノート §4 の実測)

- **DESIGN §2.6** (L214-216 が本丸): 節タイトルと本文を全面書き換え。「値の無い要素は結果に出ない
  (absent)」→「値の無い座は null」。null 不在の宣言・presence marker の記述・型導出表を本 DR §1〜§7 へ
  差し替える
- **CONFORMANCE §2**: `result` の説明 (「DR-051 の absent 規則適用後」)、`sources` の shadow tree 説明
  (キー集合が result の射影である点は維持、null 座の追加)、空コレクションの由来の項
- **CONFORMANCE §3**: 比較規約の改定 (本 DR §8) — `result` / `sources` をキー集合込みの完全一致にし、
  「省略 = default 値と等価」の一般規約から除外する。outcome 別まとめ表の該当行も追随
- **DESIGN §2.4** (L545 付近の「absent = 入口なし」) / **LOWERING §122 / §215**: **対象外** — wire 入力側の
  presence を語る別軸 (本 DR §9)

### fixture

- `expect.result` を持つ success case **560 件**が逐語全列挙化の対象 (NUL-Q1=b)。ディレクトリ単位で
  並列化できるが、`export-key` (43) / `value-typing` (31) は露出規則そのものを pin しているので目視枠
- `sources` 付き **199 case** (うち result 側にキー欠落があるもの 20) に null 座を追加
- `why` 文で absent に言及する **87 ファイル / 105 case** は文面の書き換えパスであり、期待値の書き換えとは
  別に走らせる
- **`fixtures/absent/` ディレクトリ 4 ファイル**は absent 意味論そのものを pin する専用領域であり、
  期待値の差し替えでは済まない (`no-source-and-default.json` / `repeat-empty.json` /
  `required-positional.json` / `selected-scope-empty.json`)。null 射影を pin する領域として書き直す。
  ディレクトリ名の改称是非は裁定待ち (下記)
- **対象外** (誤爆注意、本 DR §9): `fixtures/link-parse/absent-target.json` /
  `fixtures/value-sources/default-fn-borrow-ladder.json` 等の `absent-source` 系 /
  `fixtures/constraints-parse/requires-bool-target-default-fn-borrow.json`

### schema

- `schema/fixture.schema.json`: `expect.result` / `expect.sources` の値に `null` を許す
- `schema/descriptor.schema.json`: `io_type` の値型体系に null が値として載る点の反映 (本 DR §3)

### 実装

- **kuu.mbt**: `resolve.mbt` の `build_result` (L580-909) が中心 — 「値があれば入れる」から「宣言キーを
  歩いて埋まらない座に null を置く」へ反転。`default_cells` 系と `source_shadow` (L1568-1754) が
  result と同型を保つよう追随。conformance decoder の result / sources 比較も §8 の完全一致へ
- **kuu-cli**: dispatch / `as_object` 経路のみで影響は小さい

## 採用しなかった案

### (a) 現行の absent 射影を維持する (DR-051 の継続)

「値の無さは構造で語る」姿勢を保つ案。棄却理由は根拠の第 3 節 — 配列の途中の座は構造では消せないため、
tuple・record・repeat 行のそれぞれに「全座が埋まるまで丸ごと落とす」型の特例規則を置くことになる。
LNK2-Q1 で実際にその特例が必要になった時点で、構造による表現の限界が露出していた。スキーマ発見性
(根拠の第 2 節) も absent では得られない。

### (b) null を結果射影層だけの表示形にする (値空間に入れない)

射影の直前に「値の無い座を null に変換する」段を置き、パイプライン内部は従来どおり absent で通す案。
値空間を汚さないという利点がある。棄却理由は、これでは **DR-131 の Sentinel 統一ができない** こと —
unset を「null を返す」に畳むには null が fn の返り値として値空間に居る必要があり、射影層限定では
「射影の直前に現れる特別な値」という位相の異なる住人が 1 つ増えるだけで、Sentinel は Sentinel のまま残る。
値空間に入れる (§3) 場合の懸念であった全域 nullable 化は素通し規則 1 本で畳めるので、避けるべきコストが
そもそも大きくない。

### (c) fixture の null 座を runner が宣言から自動補完する (NUL-Q1=a)

fixture の記述コストを抑え、既存 560 case の書き換えを回避する案。棄却理由は kawaz mid=40 の裁定 —
記述コストの恒常増は大した量ではなく、**全列挙は case 同士の比較がしやすい**。加えて runner が宣言を
読んで期待値を組み立てると、fixture が pin しているはずの射影規則を runner 側が再実装することになり、
「fixture は実装から独立した期待値である」という conformance の前提が崩れる。初回書き換えは一度きりの
投資である。

## 関連

- DR-051 (**superseded by 本 DR** — absent 射影・null 不在・型導出の元)
- DR-052 §2/§3/§4 (`export_key: null` の軸メタ / presence marker — §6 で marker を廃止、軸メタは残置)
- DR-120 §2/§4 (露出キー 1 セル — §4 の or 席射影の根拠、§4 の占有判定に追随)
- DR-121 §2 / DR-122 §1/§2 (sources の席と shadow tree — §5 で null 座を持つ)
- DR-123 §3 (反復セルの暗黙 bottom default `[]` — null にならない族)
- DR-126 §2/§3/§4 (record — §4 で内側も反転、closed と乖離 Error は不変)
- DR-127 §3/§4.1 (link 固定パス DSL の部分書き — 穴の表現が値になる)
- DR-103 §1 (未選択 scope の述語不参加 — 裁定不変、根拠付け替え)
- DR-047 / DR-088 / DR-113 §5.4 (required の値充足・宣言値源・`absent-source` — null にならない条件と誤爆注意)
- DESIGN §2.6 (absent 射影の正本記述 — 全面書き換え対象)
- CONFORMANCE §2/§3 (`result` / `sources` の規定と比較規約 — §8 で改定)
- docs/research/2026-08-01-null-projection-inversion.md (本 DR の正本ノート、NUL-Q1〜Q4 / NUL-C1)
- DR-131 (Sentinel 縮小 — 本 DR の null を前提に unset / empty を畳む)
