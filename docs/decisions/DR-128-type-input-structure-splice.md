# DR-128: 型入力構造の splice — `input_structure` で type が自分の CLI 消費文法を kuu 定義片として宣言する

> 由来: kawaz チャット議論・裁定 2026-07-31 (ccmsg r98 mid=8〜16) および 2026-08-01 (mid=21/22/26 +
> checkbox 裁定 SPL-Q1〜Q3 / MISC-C1)、正本は
> `docs/research/2026-07-31-type-input-structure-splice.md` (§1 骨格、§2 help 整合、§2b link path 分界、
> §2c 型参照・レジストリ継承、§2d 二重独立設計の収束 13 点)。発端は「`--timerange TIMERANGE` が
> string (`5m..now`) と pair (`[since, until]`) のどちらでも受けられる構造を descriptor でどう書くか」で、
> tuple 型を value-type 体系に足す案 (統括提示) を kawaz が「pair は kuu の positionals で書けばよい」と
> 反転させたのが本 DR の機構。DR-126 (record) が本機構の**出口**の型宣言を規定するのに対し、本 DR は
> **入口**の消費文法を規定する。§2d の収束点は fable5-high と codex-sol-worker に独立設計させた 2 案が
> 独立に同結論へ到達した箇所であり、導出として採用確定した。

## 決定

### 1. `input_structure` — descriptor の新軸

`type_parser` role の descriptor に、optional なトップレベル軸 `input_structure` を追加する。
`io_type` と並ぶ独立軸であり、type が**自分の CLI トークン消費文法**を kuu の定義片で宣言する。

```json
{
  "name": "app/timerange",
  "role": "type_parser",
  "input_structure": {
    "or": [
      {"seq": [{"name": "range", "type": "string"}]},
      {"seq": [{"name": "since", "type": "timestamp"}, {"name": "until", "type": "timestamp"}]}
    ]
  }
}
```

値は **wire の正規形 node** である — 記法糖衣 (A 群: 裸文字列 → exact / 裸配列 → seq / 裸リテラル →
照合消費 / `values` → or、LOWERING §A) を**適用済みの形**を書く。descriptor は registry 住人の自己記述で
あって wire 定義の入力ではなく、糖衣を展開する段 (A 群) を通らないためである。この帰結として
`wire.schema.json` の `$defs.node` への `$ref` がそのまま成立し (node は object 形なので、糖衣形の
裸配列・裸文字列・裸リテラルは Schema 検証の時点で座れない)、descriptor を読む側は展開段を持たずに構造を読める。

その上で値は **wire 構造語彙の閉じた部分集合**である。語彙の制限 (§5 の外部界面語彙の排除) は Schema でなく
定義時検査層が担う — 「wire の一部である」ことは参照で表現し、「どの語彙が座れるか」は role 依存の判断だからである。

`io_type` と `input_structure` は別軸として並ぶ。`io_type` は**供給値の形** (どんな値が入って何が出るか) を
語り、`input_structure` は **CLI トークン文法** (どう読むか) を語る。config / env の供給は文法を通らない
(§6) ため、この 2 軸は互いに置き換えられない。

### 2. 定義片なしは 1 トークン string 消費への縮退

`input_structure` を持たない type は従来どおり値スロット 1 つ = 1 トークンを消費する。定義片は opt-in であり、
本 DR は既存 type (string / number / bool / 各 preset) の挙動を一切変えない。

**暗黙の raw-string 枝は足さない。** 定義片を書いた type が 1 トークン形も受けたいなら、その枝を
`or` に明示する (冒頭例の `range` 枝がまさにそれ)。暗黙枝があると「定義片が語る文法」と「実際に読まれる
文法」が食い違い、help 射影 (§7) が実挙動を語れなくなる。

### 3. 展開は lowering 時の splice、判定は外側の path-search が持つ

値スロットに定義片持ち type が現れたら、lowering 時に定義片をその位置へ splice する。type preset が既に
構造を注入している前例 — flag → bool + default、`config_file` → config 配線、`tty` → default 席の解決規則 —
の一般化であり (LOWERING §A.5、DR-028)、新しい相を作らない。

**位相**: splice は **A 群 (純構文正規化、LOWERING §C.4) の後、B 群 installer 不動点の前に走る型展開段**である。
A 群でない理由は、どの定義片を差し込むかの決定に **registry 解決 (type 名 → descriptor) が要る**ためで、
A 群は「入力にも registry にも依存せず決定的に確定する純構文変換」という性質で定義されている (§C.4)。
B 群より前である理由は、splice が installer の見る要素木を作る側だからである。定義片は §1 のとおり
正規形なので、splice 後に A 群を再走させる必要はない。

**sub-parse は独立したパーサではない。** 実体は「splice で展開されたグラフを**外側の path-search が直接歩く**」
ことであり、nested continuation を返す別の解析器を立てるのではない。この帰結として:

- 完全経路 0 / 1 / 2+ の最終判定は外側が行う (DR-038 不変)。定義片は消費候補を外へ出すだけで、局所で
  outcome を確定しない。1 トークン形と 2 トークン形の曖昧性解決は既存の or 枝選択 / Reject / バックトラック /
  variable-arity 機構がそのまま担い、新しい曖昧性規則を持ち込まない
  (既存 pin: `fixtures/path-search/variable-arity-ambiguous.json`)
- **positional 配置での interleave は外側機構がそのまま持つ** — 定義片が背骨に載れば、その内部要素の間に
  外側の option が割り込みうる (§8 の greedy 規則はこの帰結の一面である)。直接歩く以上、割り込みを
  禁じる機構は存在しない

**合流 ABI**: sealed scope の**完了遷移** — 定義片の全体が 1 つの完全な形として読み切られた瞬間 — で、
枝ローカルに組み上がった構造化 Value (or → 選ばれた枝、seq → kv) を value_parser へ渡し、その産出を
外側の値セルへ **1 回 set する**。value_parser の呼び出し点はこの完了遷移であって、内部 leaf の消費ごとではない。
value_parser は宣言済みの出力型 (`io_type.output`、record なら DR-126) の JSON を返す。value_parser の ABI は
文字列 1 本でなく **Value を受ける**形になる。

内部の組み上げが枝ローカルであることは、path-search がバックトラックする以上の要請である — 死んだ枝の
組み上げ途中の Value が生きた枝や外側セルに漏れてはならない。

**splice は 2 位相に分かれる。** 同じ type が複数箇所で使われても定義片の**形**は 1 つだが、
**実体**は使用箇所ごとに別でなければならない。

1. **template 生成** — descriptor の `input_structure` を正規形 node から展開済みの immutable な
   fragment template にする位相。型依存 DAG の展開 (ネスト splice、§8)、語彙・産出形の検査 (§11)、
   `min_tokens` の算出 (§8) はここに属する。入力にも使用箇所にも依存しないので **descriptor 単位で
   memoize できる** — 同じ type が n 箇所に現れても template の構築は 1 回である
2. **occurrence ごとの fresh instance 化** — splice occurrence (定義片持ち type が座る値スロット 1 つ) ごとに
   template から実体を起こす位相。**scope identity** (どの sealed scope に属するか)、**内部セル**
   (定義片 leaf の値セル、§10 の内部セル族)、**内部完結 `ref` / `link` の binding 解決先** (§4-2) は
   occurrence ごとに別の実体を指す

2 の分離が要るのは、同一 type が同じコマンドに 2 回現れたとき (`--from TIMERANGE --to TIMERANGE`)、
両者の内部セルが同一だと後の消費が前の値を踏むためである。sealed scope が「隔離された小世界」(§4) である
という性質は、**template ではなく instance の性質**である。

### 4. sealed scope — 定義片は隔離された小世界である

定義片は「そのまま展開」ではなく隔離小世界であり、唯一の出力は value_parser へ渡る構造化 Value である。

**規則 4 点:**

1. **lexical chain は定義片 root で終端する** — 外から内、内から外のいずれも不可視。定義片内の要素は
   外側の要素を名前で参照できず、外側からも定義片内の名前は見えない
2. **内部完結の `ref` / `link` は可** — 定義片内の名前空間で閉じる限り既存機構がそのまま使える
3. **`definitions` は持てない** — 共有構造が要るなら registry の type として切り出す (定義片の中に
   もう 1 つの定義域を作ると、型の同一性が使用文脈で変わる余地が生まれる)
4. **`export_key` は内部消費専用** — value_parser への入力を組み上げるための鍵であり、外側の result /
   sources には漏れない

**閉じるのは名前・binding 空間であって type レジストリは継承される** (kawaz 裁定 2026-08-01 mid=22)。
部分パースは「パーサを派生させ binding をクリアしたもので読む」機構であり、派生先は type レジストリを
引き継ぐ。したがって定義片 leaf は `timestamp` のような registry 型を普通に名乗れる。

**leaf の値源ラダーは「CLI 消費 > default」の 2 段に縮退する。** env / config / inherit / link の席は
定義片内に存在しない (§6 のとおり供給界面が定義片を通らないため)。

**定義片内の universal fn (`default_fn` を含む) は、observes が定義片内の option edge に閉じるものだけが合法**
である。参照の解決が sealed scope 内で完結することに加えて、**ambient 観測 (env / system / tty のような
定義片の外にある世界の観測) を持つ fn は definition-error `invalid-range`** になる。名前解決だけを閉じても
ambient を観測する fn を許すと、「CLI トークンだけが定義片を通る」(§6) という分界が観測面から破れるためである。
sealed scope の外を名前で指した場合は従来どおり `absent-ref` で、両者は違反の面が異なる
(前者は観測域、後者は名前解決域)。

**要素間制約 4 種 (`requires` / `conflicts_with` / `exclusive_group` / `required_group`) は定義片内で使える**
(SPL-Q1 = a)。DESIGN §9 の 5 種のうち単項の `required` を除いた 4 種であり、解決は sealed scope 内、
評価は sub-parse 経路の中でのみ行われる。

**制約違反の outcome は「その内部枝が Reject される」ことである** — 候補として外へ出ない。args_pos は
違反のトリガとなったトークンに帰属する (§10 の失敗帰属と同じ規範)。「外側の経路成立条件には合流しない」の
真意は、**定義片内の制約が外側の constraint graph・名前解決と空間を共有しない**ことであって、内部枝の
生死が外側に効かないという意味ではない — 枝が死ねば外側から見える候補が減るのは、or 枝が値の型で死ぬ場合と
同じ、直接歩く機構 (§3) の当然の帰結である。

単項の `required` は定義片内でも既存の経路完全性の意味論どおりに働く (2 段ラダーの下で、default を持たない
required leaf はトークン供給が必須 = 供給されなければその枝が成立しない)。

定義片 default と string 枝の整合が型作者の責任である (§6 の無橋) のと同じく、これらの制約の妥当性も
型作者の責任である。

### 5. 語彙の合法・不法

語彙は §1 のとおり**正規形で書いた場合の語彙**として読む。糖衣 (裸配列 / 裸文字列 / 裸リテラル / `values`) は
合法・不法のどちらでもなく**表の対象外**である — descriptor は A 群を通らないので、糖衣形は語彙判断に
到達する前に Schema の node 形 (object) に反して弾かれる。

| 合法 (定義片内で書ける) | 不法 (書けば definition-error `invalid-range`) |
|---|---|
| 構造: `or` / `seq` / `repeat` / `exact` | 外部界面: `long` / `short` / `env` / `config_key` |
| 値: `name` / `type` / `default` / `default_fn` / `filters` | 配置・伝播: `global` / `alias` / `commands` / `type: "dd"` |
| 反復・畳み: `repeat` / `multiple` / `accumulator` | 完走後の表示選択: `on_failure` |
| 制約: `requires` / `conflicts_with` / `exclusive_group` / `required_group` / `required` | 定義域: `definitions` |
| 内部消費: `export_key` / 内部完結の `ref` / `link` | |

外部界面語彙は wrong-seat 系の `invalid-range` として弾く。**inert 許容にしない** — 「書いても効かない」
にすると型作者の bug が黙って埋まる。DR-054 の kind 語彙 (`invalid-range` = 構文上は書けるが構成の
組合せとして不成立) にそのまま乗る分類である。

**定義片 leaf の `type` が未解決なら `unknown-vocab`** の definition-error になる。wire の `type:` 属性が
未解決時に warn + string フォールバックへ倒す (DR-028) のとは非対称だが、これは DR-126 §1 が
record フィールドの type 参照に置いたのと同じ非対称であり、同じ理由による — 定義片は type が自分の文法を
**名乗る側**の宣言であって、名乗りの一部を string と読み替えると別の文法を語ることになる。

**descriptor 内の型参照は registry 空間のみで解決する** (SPL-Q3 = a)。使用側 definition の
`definitions.types` には shadow されない — descriptor は registry の住人であり、その意味が使用側の
書き方で変わってはならない。これは DR-126 §1 が record フィールドに置いた規則と同一で、wire の `type:`
属性の解決順 (definitions → registry、DR-035 / DESIGN §13.3) とは解決空間が異なる。

### 6. 供給界面 — 定義片を通るのは CLI トークンだけ

| 供給源 | 経路 |
|---|---|
| CLI | 定義片を splice した文法でトークンを消費 → sub-parse 結果を value_parser へ |
| env | **string 1 本が value_parser へ直行** (sub-parse を通らない)。パース不能なら Reject |
| config | **構造化 JSON が value_parser の入力へ直行** (sub-parse を通らない) |
| link | 出力側の座への書き込み。入力世界とは交わらない (DR-127 §5) |

sub-parse は「トークン列をどう区切って読むか」の概念であり、トークン列を持たない供給源には適用対象が無い。
env が string 1 本なのは env 値がそもそも 1 文字列であるため、config が直行するのは config が既に構造を
持っているためである。

**供給値が `io_type.input` の宣言域に収まるかの扱いは、供給源によらず Reject 系である。**

- **env**: string を value_parser へ渡し、受理できなければ Reject (既存規則)。`io_type.input` が string を
  含まない type への env 席宣言は静的に死んだ席になるが、これは definition-error にしない (§7)
- **config**: 供給値が `io_type.input` の宣言域外であっても **Reject 系**であり Error にしない。config の
  供給値はユーザ世界の入力であって定義の宣言ではない。宣言域内でも value_parser が拒否すれば同じく Reject
- config 由来の失敗の帰属は既存の config 失敗規則どおりで、`args_pos` は持たない (原因トークンが無いため)

**link path による部分書きは入力側へ注入しない** (DR-127 §5 が規定済み、本 DR は交差しないことを確認する
だけである)。「入力が揃うまでパースを保留する」第 3 の状態は作らない — Reject の発火時点が原因操作から
遅延して args_pos 帰属 (DR-037) が壊れるためである。

**定義片 default と organic 部分書きの間に橋は無い。** 各経路は自分の既存規則どおりに動く —
sub-parse 経路は定義片セルのラダー (§4 の 2 段) が普通に回り default 充填がある / string 枝は parser の
産出がすべて / organic 部分書きは vivify の器 `{}` だけで default 橋を持たない (DR-127 §3.1)。
定義片 default と string 枝の整合は型作者の責任であり、DR-126 §4 の乖離検査の対象外である (lint ヒント候補)。

**契約は type 自身に住み、それを指す場所が 3 箇所ある。** `timestamp` (in: string|number → out: number) の
in / out 契約が住むのは registry の住人である `timestamp` 型そのものであって、参照側ではない。同じ type を
指す場所は 3 つある:

1. `--until` 単体入口の `type: "timestamp"` (値スロットの型宣言)
2. 定義片 leaf `until` の `type: "timestamp"` (`input_structure` 内の型宣言)
3. out record のフィールド宣言 `{"until": "timestamp"}` の型参照 (DR-126 §1)

3 は「フィールドに parser 名を書く」ことではない — フィールドの型は kuu type 参照で書くのが正であり
(DR-126 §1)、その参照先の型が**持っている**パーサが link 注入時に行使される (DR-127 §3.2 — 座への set 時に
operand がフィールド宣言型のパイプラインを通る)。一方、**record 側の型導出が見るのは参照先 type の `out` だけ**
である (JSON 形は out を再帰的に辿って得る)。

「until 単体でも timerange 一発でも、パースも out 契約も同じ」は、3 箇所が**同じ type を指している**ことで
成立する。合流点は record の out 型である。

### 7. `io_type.input` の string 固定を撤廃し、産出形の整合を静的に検査する

DR-107 §7 の role マトリクスは `type_parser` の `io_type.input` を `string` 固定としているが、これを撤廃する。
`input_structure` を持つ type の value_parser は string でなく構造化 Value を受けるためである。

`io_type.input` は **定義片の産出形・env の string・config の供給形の和**を宣言する。定義片から導出される
産出形が `io_type.input` の宣言域に含まれない場合、definition-error `invalid-range` である。

この検査は**「宣言 vs 宣言」の定義時静的検査**であり、DR-126 §4 の「返した値 vs 自己宣言」の runtime Error
とは位相が違う。前者は descriptor 2 軸の内部矛盾で、descriptor を読んだ時点で分かる。後者は実際の産出値を
見るまで分からない。

#### 産出形の導出規則

産出形は定義片そのものからではなく、**lowering 後の cell pipeline の最終 value_type** から導出する
(定義片の見た目でなく、その定義片が実際に組み上げるセルの型を見る)。規則は既存の値型体系の適用であり、
本 DR は新しい型構築子を持ち込まない:

| 定義片の要素 | 産出形への寄与 |
|---|---|
| leaf の `type` | 参照先 type の `out` (registry 解決、DR-126 §1 と同じ空間) |
| `filters` | 各 filter の `io_type` どおりに変換した後の型 (DR-107 §3) |
| `repeat` | 要素型の array |
| `multiple` | accumulator / collector の出力型 (畳み先が宣言する型) |
| `name` / `export_key` | kv のキー (値の型は当該セルの型) |
| `or` | 各枝の産出形の union |
| `default` | 型を変えず **presence にのみ影響**する (default 持ちのキーは常在) |

`io_type.input` の宣言域への包含 (containment) は成分ごとに判定する:

- **union** は成分ごとに包含を要求する (どれか 1 成分が域内なら可、ではない — 死ぬ枝を静的に許すことになる)
- **record** は `map<string, value>` に包含される
- **`value`** は全域を包含する (宣言が `value` なら常に成立する)

**env 席が静的に死ぬ場合は lint 警告**であって definition-error にしない。`io_type.input` が string を
含まない type に env 席を宣言すると、その席は何を供給しても Reject にしかならないが、定義としては
成立している (§6)。常に充足する `required` を definition-error にしないのと同じ整理で、「書いても
挙動を変えない宣言」は定義の不成立ではなく品質の問題である。

### 8. ネスト・循環・反復

- **ネスト splice は可、深さ上限を持たない** — 定義片 leaf の type がさらに定義片を持てば再帰的に splice する
- **`input_structure` 経由の型依存が循環したら `circular-ref`** の definition-error。DR-126 §1 が
  out.record 側の型参照循環に置いた規則 (v1 全面禁止) と同型で、入力側にも同じ検査が要る
- **`repeat` / `multiple` / `accumulator` は定義片内で使える** — 既存の lowering 機構がそのまま動く。
  sealed scope が制限するのは名前空間と外部界面であって構造表現力ではない
- **定義片持ち type は `zero-progress` 検査の入力になる**。DR-043 / DR-054 のゼロ進捗ガード
  (repeat の再帰 1 周が 1 トークン以上を消費すること) は、定義片持ち type が値スロットに座ったとき
  **型依存 DAG を展開したあとの定義片の最小消費トークン数** `min_tokens(input_structure)` を見る。
  定義片が 0 消費でも成立しうる (全枝が 0 トークンで完走できる、`repeat {min: 0}` だけで構成される等) 型を
  無制限 repeat の 1 周に置く定義は definition-error `zero-progress` である。
  `min_tokens` は DR-119 §6 の `consumes_zero_tokens` 宣言と同じ静的判定の位置にあり、型依存が循環していれば
  そちらが先に `circular-ref` で落ちるので、DAG 展開後の計算は常に停止する
- **greedy の割り込みは配置の既存規則そのまま** — option の値スロットに splice された定義片は option 値として
  一体に消費され、positional 配置に splice された定義片は背骨に載るので greedy の割り込みを受ける
  (DR-041 / DR-043 / DR-097)。定義片であることを理由にした新規則は持たない

### 9. help — 既存の `value_structure` へ完全委譲する

splice された構造は DR-113 §4.1 の `value_structure` としてそのまま help model へ射影する。写像は
定義片の構造語彙と model の node 語彙の同名対応 — `or` → `or`、`seq` → `seq`、`repeat` → `repeat`、
leaf → `single` (`value_name` / `type` / `values_enum`)、定義片持ち type の leaf → `type_ref` — であり、
新しい model 語彙を追加しない。

**この位相の pin**: help_query が読む断面には `input_structure` 由来の構造が乗る。これは DR-113 §2.3 の
`help_category` preset が確立した規範 (「type descriptor 由来で注入された構造が `value_structure` として
help model に射影される」) の一般化であり、splice はその先例に乗るだけである。

1 行合成 `<RANGE | <SINCE UNTIL>>` は DR-115 §5.1 の `value_structure_style: "auto"` の既定挙動として
規定済みで、本 DR は表示規則を足さない。sealed scope が閉じるのは ref / link / export_key / result への
露出であって、表示メタ (`value_name`、name からの uppercase 導出) は元々結果非露出であるため、定義片
leaf の name を usage プレースホルダに使うことは既存規範と無矛盾である。

**`types` 集約には registry 宣言 type も載せる** (DR-113 §4.2 の `types` は definitions の共有型のみを
想定していた)。`id` は次のように正規化する:

- **registry 型は canonical な ns 付き id** — bare 名で参照されていても `builtin/foo` の形に正規化する
  (bare 名は builtin ns の糖衣であり、DR-094 §1 のとおり同一の住人を指すため)
- **definitions ローカル型は bare のまま** (ns 対象外、DR-094 §6)

「解決に使った参照綴りをそのまま id にする」と、同じ registry 住人が参照綴りの違いで 2 エントリに割れ、
逆に registry の bare 参照と definitions ローカル型が同綴りで衝突する。canonical 化はこの両方を同時に
解消する。`value_structure` の `type_ref` が指す identity も同じ正規化に従う (model 内で `types[].id` と
突き合わせられるため)。**descriptor の `description` は `types[].help` へ写さない** —
descriptor の description は実装者向けの自己記述であって、エンドユーザ向け help 文言ではない。

### 10. 観測面 — 定義片内のセルは外へ出ない

- 定義片内のセルは**内部セル族**であり、`effects` / `result` / `sources` のいずれにも現れない
  (DR-113 §6 の `#` 内部セルと同じ位置づけ)
- 外側の値セルには **1 回の set** が起きる。`source` は入口どおり (CLI 消費なら `cli`)
- sub-parse 中の失敗は**原因トークンの `args_pos`** に帰属する (DR-037 の args_pos 規範がそのまま効く)
- `errors[].element` は**外側の entity** — 定義片内の名前を外へ漏らさない
- **補完**: 候補の origin は外側の値セル entity、候補そのもの (type / completer) は定義片 leaf の宣言由来。
  内部名は候補にも origin にも現れない

**内部枝の identity は外側の path identity に含まれない。** 経路が同一かどうかは、value_parser 適用後の
**外側の効果列**で判定する (DR-038 の完全経路の一意性はこの粒度のまま不変)。したがって、内部の枝の取り方が
違っても外側の効果列が同一に畳まれる内部枝は、**外側からは 1 経路**である — 曖昧 (2+ 経路) にはならない。

これは §3 の合流 ABI の帰結である。外側に出るのは value_parser の産出を 1 回 set した効果だけであり、
その手前の内部枝は外側の観測面 (§10 冒頭) に現れない以上、経路の同一性判定にも参加できない。

### 11. definition-time 検査の一覧

| 検査 | kind |
|---|---|
| 外部界面語彙が定義片内に座っている (§5 の不法列) | `invalid-range` |
| 定義片内に `definitions` がある | `invalid-range` |
| 定義片から導出した産出形が `io_type.input` の宣言域外 (§7) | `invalid-range` |
| 定義片 leaf の `type` が registry に無い (§5) | `unknown-vocab` |
| 定義片内の `ref` / `link` / `default_fn` が sealed scope の外を指す | `absent-ref` |
| 定義片内の fn の `observes` が定義片外の ambient (env / system 等) を含む (§4) | `invalid-range` |
| `input_structure` 経由の型依存が循環 (§8) | `circular-ref` |
| 0 消費でも成立しうる定義片が無制限 `repeat` の 1 周に座る (§8) | `zero-progress` |

定義時検査ではないが同じ面の pin として、**定義片内の制約 4 種の違反 (実行時)** は内部枝の Reject であり
(§4)、`invalid-range` 等の definition-error ではない。

### 12. conformance ビークルは 2 系統で、役割が直交する

`input_structure` は type descriptor の軸なので、conformance fixture から挙動を pin するには
定義片を持つ registry 住人が要る。**両方を採る** (SPL-Q2 = a + b)。

- **`builtin/struct`** — identity 系 type_parser の configurable factory。splice **機構そのもの**の pin
  (or 枝選択・seq の kv 組み上げ・sealed scope・観測面) を担い、同時に「構造を持つ値をアプリが自前 parser
  なしで受け取る」ユーザ機能でもある

**`builtin/struct` の config が受ける semantic shape** は 2 つである (綴りと Schema の詳細だけが射程外):

- **`input_structure`** — descriptor 軸と**同じ wire 正規形 node** (§1)。factory config 経由でも糖衣は
  受けない
- **out record 宣言** — この type が産出する record の形 (フィールド名 → type 参照、DR-126 §1 の語彙)。
  identity factory なので、産出値は定義片が組み上げた kv がそのまま out record に一致する

したがって **descriptor 軸 (`input_structure`) と factory config の 2 経路が、同じ定義片語彙を受ける**。
2 経路が別語彙を持つと定義片の意味が経路依存になり、§5 の語彙検査・§7 の産出形検査も二重化する。
- **`fixture/*` residents** — CONFORMANCE が宣言する fixture 専用 namespace の住人。**変換系 parser の
  挙動**の pin (string 形の正規化、部分 range、DR-126 §4 の乖離 Error 近傍) を担う

2 者は役割が直交する。前者は機構が正しく動くことを、後者は機構の上に載る変換系 type が正しく振る舞うことを
固定する。identity factory だけでは変換系の挙動が pin できず、fixture 専用住人だけでは機構の pin が
ユーザから見えない機能に閉じてしまう。

## 根拠

### 入力の構造は「型体系に足す」より「既にある文法で書く」ほうが小さい

発端の課題 (`--timerange` が 1 トークンでも 2 トークンでも受かる) を value-type 体系で解こうとすると
tuple 型が要り、DR-107 §3 が射程外にした bare array union 記法との構文衝突を抱えることになる。
一方 kuu は既に or / seq / repeat / variable-arity という**トークン消費文法の表現力**を持っている。
pair は「tuple 型」ではなく「2 つの positional」であり、それを書く語彙は最初からあった。
本 DR は表現力を足していない — 既存の表現力を type の内側から使えるようにしただけである。

### splice が新しい相を作らないことが、機構全体の予算を決めている

type preset は既に構造を注入している (flag / count / help 系 / completion_script / tty)。splice が
lowering 同位相であることで、曖昧性解決 (DR-038)・greedy (DR-041/097)・repeat (DR-043)・
値源ラダー・観測面のいずれも既存規則が流用され、本 DR が新設する規範は「sealed scope の 4 規則」
「産出形の整合検査」「定義片内 fn の観測域の制限」に絞られた。sub-parse が独立したパーサでなく
**展開グラフを外側が直接歩く**ことである (§3) のはこの姿勢の核で、独立パーサにすると path-search の
一意性契約 (DR-038) の外にもう 1 つの判定主体が生まれ、interleave も別途規定し直すことになる。

### sealed scope は「型の同一性は使用文脈に依存しない」の帰結

定義片が外を参照できると、同じ type が使用側の定義次第で別の文法を持つことになる。`definitions` を
持てないこと (§4-3)、型参照が registry 空間のみで解決すること (§5) も同じ 1 つの要求から出ている。
DR-126 §1 が record フィールドの解決空間に置いた規則と同根であり、両 DR は descriptor の意味が
registry 側で閉じるという同じ姿勢の入口側 / 出口側の現れである。

### 入力と出力は交わらないほうが観測が壊れない

link path (出力側) と sub-parse (入力側) を交差させると、「入力が揃うまで保留」という状態が要る。
その状態は effects の時系列にも値源ラダーにも席が無く、Reject の発火が原因トークンから遅延して
args_pos 帰属が壊れる (DR-127 §5)。両者を交わらせないことで、時系列適用だけで全ケースが決まる
(DR-029 / DR-127 §4) 性質が保たれる。

## 波及

- **DR-107**: §7 の role マトリクス `type_parser` 行を更新 — `io_type.input` の `string` 固定を撤廃 (§7)、
  `input_structure` 列 (optional、type_parser のみ) を追加。他 role では禁止。§3 の value-type 体系自体は不変
- **schema/descriptor.schema.json**: `descriptor` に `input_structure` プロパティを追加し、
  `wire.schema.json` の node へ `$ref` する。role 条件分岐で `type_parser` 以外は禁止、`type_parser` では
  optional。語彙制限 (§5) と産出形整合 (§7) は Schema では書けず定義時検査層 / lint の関心
- **schema/wire.schema.json**: 定義片が参照する node 定義の共有 — descriptor 側から `$ref` される前提で、
  `$defs.node` の切り出し粒度が参照可能かを確認する (現状 `$defs.node` は存在する)
- **schema/builtin-descriptors.json**: `builtin/struct` (§12) を `types` に新規収載
- **docs/DESIGN.md**: §3 (type と参照糖衣) に定義片持ち type の節を追加、§13.1 のレジストリ区分表の
  `types` 行に定義片の存在を反映。§9 の制約語彙は定義片内でも使える旨の注記 (§4)
- **docs/LOWERING.md**: splice の段を新設する — §3 の位相確定 (A 群の後・B 群 installer 不動点の前に走る
  **型展開段**) を §C.4 の A 群 / B 群の分離記述と整合する形で書く。A 群の一員ではない (registry 解決を要する)
  ので §A.6 として A 群に加えるのではなく、A 群と B 群の間の段として置く
- **docs/CONFORMANCE.md**: §6 のディレクトリ構成に splice 領域を追加、`fixture/*` namespace の宣言 (§12)
- **docs/REFERENCE.md**: §3.3 factory config キー表に `builtin/struct` の config を追加 (綴りは §射程外)
- **DR-113**: §4.2 の `types` 集約が definitions の共有型に加えて registry 型も受ける (§9)
- **DR-126**: §1 の型参照解決順は既に registry のみへ改訂済み (SPL-Q3 = a) で、本 DR は入力側にも
  同じ規則が及ぶことを確認する
- **fixtures 新設** — 定義片の骨格・sealed scope・供給界面・観測面・検査の各面を pin する:

  | 領域 | pin する内容 |
  |---|---|
  | 定義片の基本形 | or 枝選択 (1 トークン形 vs 2 トークン形)、seq の kv 組み上げ |
  | 曖昧性 | variable-arity との合流が既存規則どおりであること (DR-038 の外側判定) |
  | 配置差 | option 値スロット = 一体消費 / positional = 背骨 (greedy 割り込み) |
  | sealed scope | 内部完結 ref/link の成立、外向き参照の `absent-ref`、同一 type 2 箇所出現で内部セルが独立 (§3 の instance 化) |
  | 語彙検査 | 外部界面語彙・`definitions` の `invalid-range` |
  | 型検査 | leaf type 未解決の `unknown-vocab`、循環の `circular-ref`、産出形整合の `invalid-range`、ゼロ進捗の `zero-progress` |
  | 実行時制約 | 定義片内の制約 4 種の違反が**内部枝の Reject** であること (外側の候補数への効き方・args_pos がトリガトークン) |
  | 供給界面 | env string 直行 / config 直行 (定義片を通らないこと) |
  | 観測面 | 外側 1 set・source タグ・args_pos 帰属・errors[].element が外側 entity |
  | help / 補完 | value_structure 射影と types 集約、補完候補の origin |

- **kuu.mbt / kuu-cli**: value_parser ABI が string でなく **Value を受ける**形へ (§3)。splice の lowering 実装、
  sealed scope の派生パーサ (binding クリア + type レジストリ継承)、§11 の definition-time 検査群
- **実装契約 (実装リポが満たすべき性質)** — §3 の 2 位相と直接歩く機構から出る:
  - **template レベル (形・lowering・産出形・`min_tokens`) は descriptor 単位で memoize してよい** —
    入力にも使用箇所にも依存しないため
  - **path-search の memo は外側の状態を key に含める** — 定義片が外側の探索から独立した部分問題ではない
    (直接歩く) ので、memo key は外側の argv 位置・spine / greedy 状態・枝ローカル効果を含む「意味的に同一の
    state」でなければならない。定義片 root と argv 位置だけを key にすると別文脈の結果を誤って再利用する
  - **resource 上限への到達は semantic な parse failure と区別して報告する** — ネスト splice は深さ上限を
    持たない (§8) ため、実装は探索の資源上限を持ちうる。上限到達を「経路が無い」と同じ Reject にすると、
    定義の意味と実装の限界が観測面で混ざる

## 採用しなかった案

### (a) tuple 型を value-type 体系に足す

`[since, until]` を型として書けるようにする案 (統括が最初に提示し kawaz が反転させた)。棄却理由は
§根拠のとおり、kuu が既に持つトークン消費文法で書ける構造のために型体系を拡張することになり、
DR-107 §3 が射程外にした bare array union との構文衝突も引き受けることになる。tuple 型は本 DR で
**不要になった** — pair は定義片の `seq` がそのまま表す。

### (b) 定義片を持つ type にも暗黙の raw-string 枝を足す

1 トークンでそのまま渡す枝を暗黙に持たせれば、既存 type からの移行が滑らかになり、定義片で書き漏らした
形も救われる。棄却理由は §2 のとおり、定義片が語る文法と実挙動が食い違い、help 射影 (§9) が実挙動を
語れなくなること。救済のつもりの暗黙枝は「なぜかパースが通る形」を生む。

### (c) 定義片内の外部界面語彙を inert 許容にする

`long` / `env` 等を書いても黙って無視する扱い。LOWERING §C.1 (元要素は実体だけノードに降格し、宣言属性は
inert に残る) との類推が効きそうに見える。棄却理由は §5 のとおり、それらは型作者の bug であって
互換性のための残置ではないため。inert 許容は「効くと思って書いた宣言が黙って効かない」を作る。

### (d) 定義片内で constraint を全面禁止する (SPL-Q1 の非採用肢、sol 案)

sealed scope 内の制約は外側の経路成立条件と合流しないので、書けても効果が読みにくいという理由で
禁止する案。棄却理由は、定義片内の制約は sealed scope 内で解決でき評価も sub-parse 経路に閉じるため
機構的な穴が無く、禁止する側が新しい規則を足すことになるため。定義片 default と string 枝の整合と
同じく、型作者の責任として扱う (kawaz 裁定 SPL-Q1 = a)。

### (e) splice された定義片を greedy に対して常に一体消費とする (sol 案)

配置によらず定義片を 1 単位として扱えば、greedy の割り込みで定義片が途中で切れる事態を防げる。
棄却理由は、これが**新規則**であること — 既存の配置規則 (option 値スロットは一体、positional は背骨) を
そのまま適用すれば同じ場面が既存語彙で説明でき、新規則ゼロで済む (kawaz 承認済みの統括判断)。

### (f) conformance ビークルをどちらか一方に絞る

`builtin/struct` だけ / `fixture/*` residents だけ。棄却理由は §12 のとおり役割が直交しているため。
identity factory は機構を pin するがそれ自身は値を変換しないので変換系 parser の挙動を固定できず、
fixture 専用住人は変換を pin するがユーザから見える機能を伴わない。

## 射程外

- `builtin/struct` の config **キーの綴りと Schema 上の書き方**。受ける semantic shape は §12 で確定して
  いる (`input_structure` の wire 正規形 + out record 宣言) ので、残るのは綴りの決めだけであり
  schema 起草時に合わせて決める
- 定義片内で使える `filters` の相 (piece / value / final のどれが定義片 leaf に効くか) は既存の
  値パイプライン規則の適用問題として扱い、本 DR は新規則を置かない

## 関連

- DR-126 (record 型 — 本機構の出口の型宣言。§4/§5 の解決空間規則が入口側と対をなす)
- DR-107 §3/§7 (descriptor の直交軸・role マトリクス — §1 が軸を足し §7 が `io_type.input` 固定を外す)
- DR-127 §5 (入力側への部分注入はしない — §6 の link 非交差の正本)
- DR-113 §2.3/§4.1/§4.2 (help_category preset の構造注入先例、`value_structure` / `types` — §9 の射影先)
- DR-115 §5.1 (`value_structure_style: "auto"` — 1 行合成の既定挙動)
- DR-038 (完全経路の一意性 — §3 の「局所で outcome を確定しない」の上位規範)
- DR-041 / DR-043 / DR-097 (greedy・repeat・「読める」の精密化 — §8 の配置既存規則)
- DR-037 (Reject / Error と args_pos — §10 の失敗帰属)
- DR-054 (definition-error の kind 語彙 — §11 の分類)
- DR-043 / DR-119 §6 (ゼロ進捗ガードと `consumes_zero_tokens` — §8 の `min_tokens` が入力になる先)
- DR-127 §3.2 (link 注入時にフィールドの type がパーサを行使する — §6 の契約 3 箇所の 3 番目)
- DR-094 §1/§6 (registry 識別子の ns — §9 の `types[].id` 正規化の根拠)
- LOWERING §C.4 (A 群 / B 群の分離 — §3 の位相確定が接続する先)
- DR-035 / DR-028 (type 参照の解決順 — §5 の非対称の対比元)
- DR-061 §4 (descriptor は validator ではない — §7 の検査が宣言同士の整合であることの位置づけ)
- DR-094 (registry 語彙の namespace — `fixture/*` / `builtin/struct` の識別子体系)
- LOWERING §A.5 (type 糖衣プリセット — splice の同位相の先例)
- docs/research/2026-07-31-type-input-structure-splice.md (本 DR の正本)
- fixtures/path-search/variable-arity-ambiguous.json (可変 arity 曖昧性の既存 pin)
