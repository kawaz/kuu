# DR-127: link 固定パス DSL の実装可能化 — セル空間 / 値空間の 2 相分解、record 宣言による静的化、器の auto-vivify

> 由来: kuu.mbt issue `2026-07-27-link-fixed-path-dsl-unimplemented` を起点にした設計検討 (2026-07-28) と、
> kawaz チャット裁定 2026-07-31 (ccmsg r98 mid=2〜16)。正本は
> `docs/research/2026-07-28-link-fixed-path-dsl-design.md` (§3 案 1 が採用案、§4b が record 導入後の
> 確定形、「残 Q への波及」が Q3〜Q7 の裁定) と `docs/research/2026-07-31-type-input-structure-splice.md` §2b
> (入力側 splice との分界)。DR-029 が定めた固定パス DSL は文法と「遅延解決」の方針だけを持ち、
> 実装可能な意味論を欠いていた (参照実装は bare name のみ対応)。本 DR はその意味論を与え、
> 併せて DR-029 の「解決は遅延」に分界の追補を置く。前提 DR は DR-126 (record 型)。

## 決定

### 1. パス文法と表層規則

文法は DR-029 のまま:

```
path := name ('.' name | '[' int ']')*
```

`link` の String をこの AST (root name + segment 列) にパースする。**bare name は segment 列が空の縮退形**であり、
既存の link 意味論との後方差分は無い。構文として解釈できない綴りは decode 時の definition-error である。

表層の細部 3 点 (LINKPATH-C1 承認分):

- **`.` / `[` / `]` を含む name はパスに書けない** (起点・中間 segment とも) — 区切り文字の
  escaping を導入せず、そのような name を持つ実体は link パスから参照できない (definition-error)。
  名前空間を狭める規定ではなく、パス表記が届く範囲の宣言である
- **負 index の「発火時点の現在長で確定」は値空間 segment の規定である** — 配列値の長さは実行時に
  しか決まらないため。`[-1]` は「そのときの最後の要素」で、範囲外は解決失敗 (§4)。
  一方**セル空間 segment の `[int]` は定義時静的に決まる** — 透過子の並びは宣言で確定しているので、
  負 index も範囲外も定義時に判定でき、解決不能は definition-error (`absent-ref` 系、§2.1)。
  C1 裁定の「発火時現在長」の文言は値空間前提であり、本項はその適用範囲の精密化である
- **`[int]` のセル空間解釈は「値の座を持つ透過子の並び」の位置** — nameless `seq` の子のうち
  結果に値の座を持つものを順に数える (DESIGN §2.4 の透過、DR-121 §3.2 の tuple)

### 2. パスは「セル空間の接頭辞 + 値空間の残余」の 2 相に分解する

#### 2.1 第 1 相 — セル空間 (定義時静的)

root name を lexical スコープ chain → `definitions` で解決する (DESIGN §2.7 / DR-032、現行どおり)。
以降の segment も**宣言構造で辿れる限りセルを降下する** — `.name` は当該スコープの子セルの宣言 name (または id)、
`[int]` は §1 の透過子位置。この相の解決不能は definition-error `absent-ref` の系である
(`fixtures/link-parse/absent-target.json::link-target-not-defined` が既に pin)。

**降下がセルに当たって残余が空なら、bare link と完全に同一のセル同期**である。
現行の `LinkTarget` 意味論がそのまま生き、accumulator・`cell_fns`・値源ラダーのすべてが従来どおり働く。
兄弟スコープの子セルへの合流 (`link: "timerange.since"` の `timerange` がスコープの場合) はこの相で成立する —
bare name では lexical 外で見えない対象に、root を lexical 解決してから降下することで届く。

#### 2.2 第 2 相 — 値空間 (残余の解決)

セル降下が葉セルに到達してなお segment が残る場合、残余は**そのセルが持つ値の内部構造**を指す
(`type: "datetime"` が産む `{since, until}` の `since`、配列値の `[0]` 等)。

残余の解決は宣言の有無で 2 通りに分かれ、**判定は segment ごとに宣言を辿って適用する**:

- **record 宣言が続く限り定義時静的** (DR-126) — 各 segment が宣言フィールドに当たるかは定義時に
  決まる。当たらなければ definition-error `absent-ref` (第 1 相と同じ系)。実行時に残るのは値読みと
  presence 判定だけである
- **`map` / `value` 宣言 (または宣言なし) のフィールドに入った以降は実行時** — その segment から先は
  従来どおり発火時に枝ローカルの現在値を辿る。解決失敗 (セル未確定 / キー不在 / index 範囲外) は
  その枝の Reject (§4)

record のフィールドが `{"map": "value"}` を宣言している場合、record 段までのパスは静的に検査され、
map の内側を指す segment 以降が実行時に落ちる — 静的 / 動的の切替深度は宣言がそのまま決める。

パスは**宣言名軸**である (DR-032 / DR-121 §5) — `export_key` の綴りでは辿らない。
ただし第 2 相に入った後の segment が指すのは value_parser 産オブジェクトの生キー (record のフィールド名) であり、
宣言名軸とも結果アドレス軸とも別の第 3 の鍵空間になる。これは「不透明値の内部に kuu のセルは存在しない」という
構造的事実の帰結であって、回避できる設計上の選択ではない。

#### 2.3 二相性は発明した規則ではない

同じ綴り `timerange.since` が、`timerange` がスコープなら子セル同期 (ラダーあり)、
不透明値の葉セルなら値の座への書き (ラダーなし) になる。この意味論の厚みの差は
**「スコープの kv はパース時に存在せず、不透明値の内部にはセルが存在しない」という構造の写像**である。

### 3. 部分書きは 2 層 — record 宣言があれば器を auto-vivify する

link パスの残余が値空間の座を指すとき、その座への書きが「セルにまだ値が無い」状態で起きうる
(`--until X` だけが与えられ、`--timerange` が未発火)。扱いは宣言の有無で分かれる:

| 葉セルの値型宣言 | 部分書きの扱い |
|---|---|
| record (DR-126) | **器 `{}` を auto-vivify** し、当該フィールドに座らせる (`{until: X}` が成立値) |
| `map` / `value` / 宣言なし | **その枝の Reject** (解決先が未確定) |

vivify が届くのは **record 宣言が続く深さまで**である (§2.2 の切替深度と同じ規則) — record 内の
`map` フィールドの内側を指す座への書きは、セルに値がありその座が実在すれば書けるが、
無ければ Reject (map の器は vivify しない — closed でないため生成する器の形が定義時に言えない、
§根拠の非対称そのまま)。また **vivify は `set` (部分書き) 専用**であり、Value 返し fn (§4.1) は
現在の座の値 (`ctx.old`) を必要とするため、空の座への適用は解決失敗 = その枝の Reject である。

record での vivify が安全なのは closed record だからである — キー語彙が定義時に閉じているため、
生成される器がどの形になりうるかが定義時に決まる。`{until: X}` で終わっても
presence-optional (DR-126 §3) の適合値であり、`since` は absent としてキーごと現れない。
「`since` が無いと困る」はアプリ制約の領分 (`requires` / `final_filters`) であって型の領分ではない。

**vivify で組み上がった値は value_parser を通らない。** フィールド横断の invariant
(`since < until` の検査、逆転の自動補正等) は `final_filters` が受ける。

#### 3.1 無橋 — 各経路は自分の既存規則で動く

定義片 (`input_structure`、research 2026-07-31) の `default` と organic な部分書きの間に橋は架けない:

- **sub-parse 経路** — 定義片セルの値源ラダーが普通に回る (`default` 充填あり)
- **parser string 経路** — 産出がすべて (timerange の string 形は `-5m..` のような部分 range を正規に産む。
  部分 presence は parser 産出として普通の値である)
- **organic 部分書き経路** — vivify するのは器 `{}` だけで、`default` 橋は無い

言語バインディングの型導出は経路間の保守側を採る (全経路で立つと保証できる宣言だけ `T`、素の宣言は `T?`)。
定義片の `default` と string 経路の整合は型作者の責任であり、DR-126 §4 の乖離検査の対象外である
(lint ヒントの候補)。

#### 3.2 organic 値の二重保証

vivify で組んだ値も parser が産んだ値も、closed record 宣言への適合という一点では無差別に扱う。
保証の経路が違うだけである:

- **parser 産** — DR-126 §4 の乖離検査 (宣言外キー / フィールド型違いは Error)
- **link 組み上げ** — 宣言外キーへの set は §2.2 の静的パス検査で definition-error、
  座への set 時に operand が**フィールド宣言型の pieceProcessor を通る** (既存の値パイプラインの自然な延長)

どちらの経路でも「closed record 宣言に適合する値しかセルに座れない」が成立する。

### 4. 解決失敗は Reject、時系列適用が全ケースを決める

パス残余の解決失敗は**その枝の Reject** であって Error ではない (DR-029 + DR-037)。
他に成立する解釈があればそれが選ばれ、無ければ全体パース失敗になる。`or` の枝をまたぐパスも静的には禁じない。

セルへの書きは出現順の操作列である (DR-029「操作の時系列適用」)。パス付きでもこの規則がそのまま効き、
組み合わせは追加の裁定なしに決まる:

| 入力 | 結果 |
|---|---|
| `--until X` | vivify で `{until: X}`。value_parser は起動しない |
| `--until X --since Y` | 座ごとに set 更新 (`{until: X, since: Y}`) |
| `--until X --timerange Z` | Z の parser 産出がセル値を丸ごと置換 (部分書きは消える) |
| `--timerange Z --until X` | parser 産出の上に、当該の座だけ更新 |
| `unset` を含む列 | DR-045 の既存規則どおり (record 専用規則は設けない) |

#### 4.1 値残余の座に許す操作は set と Value 返し fn のみ

到達した座は「退化セル」として扱う — `set` (override) と Value を返す cell fn (`incr` 等、`ctx.old` は現在の座の値)
だけを受け付ける。Sentinel を返す fn (`unset` / `default` / `empty`) の適用は発火時の Reject である。
器の vivify (§3) はこの語彙の拡張ではない — set が座る前段階の器生成にすぎない。

#### 4.1b 未選択枝のセルへの着地

第 1 相の束縛は名前と宣言の対応であって、対象セルの**枝が選択されるか**は従来どおり消費だけが決める。
`or` の未選択枝内のセルに link パスで書いた場合、書き自体は通常のセル書きとして成立するが、
未選択枝のセルの値は結果に表面化しない (`fixtures/or-parse/unselected-branch-default-absent.json` が
default 持ちセルについて既に pin している一般規則の適用)。**書きが枝の選択を強制することはなく、
書けないことを理由に枝が Reject されることもない** — 選択は消費構造の関心、値は席の関心という
既存の分離を保つ。

#### 4.2 完全経路の系 — 裁定は枝ローカルの効果列 fold の後に来る

実装は**裁定の前に、枝ローカルの効果列を fold してパス解決の可否を判定**しなければならない (DR-038)。
裁定後に解決失敗が発覚して全体が失敗する順序では、DR-029 の「解決できない枝は落ち、他の解釈が選ばれる」が
実現できない。第 2 相が実行時解決になる経路 (`map` / `value` 宣言) で最も効く要求である。

### 5. 入力側への部分注入はしない

link パスの書き先は**常に出力側の座**である。「入力が揃うまでパースを保留する」中間状態
(`[undefined, until]` のような in 候補バッファ) は作らない。

理由は 3 つとも既存規範に触れる: 効果の時系列 (§4) に席が無い、値源ラダーに席が無い、
そして Reject の発火時点が原因操作から遅れて `args_pos` 帰属 (DR-037) が壊れる。
sub-parse (`input_structure` の定義片、research 2026-07-31) は CLI トークン消費という入力世界に閉じており、
link パス (出力世界) とは交わらない。

### 6. 観測面 — sources は座単位、effects は `path` セグメント配列

- **sources**: value_parser 産の複合値は shadow tree 上で**構造分解**される (LINKPATH-Q4=a)。
  DR-122 §3「タグの決定単位は値の座」の一般適用であり、複合値を leaf 1 タグに潰さない。
  link による部分書きは**当該の座だけが `link` タグ**を持ち、他の座は産出発火のタグを保つ
  (`{"timerange": {"until": "link", "since": "cli"}}`)。merge accumulator が 1 配列内で由来を混在させる
  (DR-122 §3) のと同型である。既存 corpus に複合値 leaf の sources を pin した fixture は 0 件のため、
  この裁定による既存 pin の変更は無い
- **effects**: entry に **structured な `path` フィールド (segment 配列) を optional 追加**する (LINKPATH-Q5=a)。
  セル着地 (残余が空) の効果は従来どおり `path` を持たず、値残余のある効果だけが持つ —
  **省略は既定値 `[]` (= セル着地) と等価**であり、CONFORMANCE §3 の一般省略規約 (省略 = default 値)
  から特例を作らない。segment は name (string) と index (int) が並ぶ配列で、`entity` は残余の起点となる
  値セルの canonical name / id である (`effects[].entity` が宣言名軸である DR-121 §5 は不変)。
  **index segment は解決済みの非負 index を載せる** — effects は観測記録であり、字面の `-1` を
  載せると消費者はどの座か判別できない。sources 側 (位置対応で自然に解決済み) との表現も揃う。
  **path と entity を結合した文字列を規範面で作らない** — 連結が非単射になる問題は
  DR-121 §1.2 が sources について論じたものと同一であり、effects の path にもそのまま効く
- **nameless 透過子へのセル着地の観測** (`pair[0]`、DR-029 用途 4): nameless 子は自前の entity を
  持たない (CONFORMANCE §2) が、その座は**最寄りの named 祖先セルの値構造の座** (DR-121 §3.2 の tuple)
  である。link パスでここに着地した効果は `entity` = named 祖先セル + `path` = 位置 (`entity: "pair",
  path: [0]`) で観測する — sources の構造分解 (座単位) と同じ統一で、セル空間 / 値空間の segment が
  path 上で混ざるが、境界は宣言から一意に導けるため区別印は置かない

### 7. DR-029 への追補 — 何が定義時に束縛され、何が遅延するか

DR-029「解決は遅延 (実行時)。静的解決はしない」に、以下の分界文を追補する (LINKPATH-Q7):

> **name 参照 (セル空間) は定義時に束縛され、値構造の降下だけが遅延する。**
> さらに、降下先の値型が record を宣言していれば (DR-126)、その降下のパス妥当性も定義時に決まる。

DR-029 の「遅延が必然」という論拠 (「datetime は型の構造を知らないので実行時にしか解決できない」) は
**型が構造を名乗らない前提**の下でのみ成立する。record 宣言はその前提を外すので、遅延の射程が狭まる。
DR-029 の字面と `absent-ref` の静的検査 pin が食い違って見えていたのは、この分界が明文化されていなかったためである。

## 根拠

### 2 相分解は既存規範の交点にしか置けない

link パスに要求される 4 つの用途 — 不透明複合値の部分同期 / 配列要素への合流 / 他スコープの子セルへの合流 /
nameless 子への位置指定 — のうち、後ろ 2 つは**セルが実在する**空間の話で、前 2 つは**セルが実在しない**空間の話である。
1 つの解決機構でこれを覆おうとすると、どちらかの空間の規範を侵す:

- 全部をセル空間として静的に解くと、value_parser が実行時に作る構造には届かない (DR-029 の原意図が消える)
- 全部を値空間として実行時に解くと、書きを子セルの効果へ逆写像しないと effects の cell 単位規範 (DR-045) が保てない。
  逆写像は `export_key` 透過と nameless 畳み込みが絡んで一意にならない

2 相分解が「2 つの機構の折衷」に見えないのは、分界が**構造の実在**という観測可能な事実に一致しているからである。
セルがある所ではセル降下、無い所では値降下、という以上の規則を導入していない。

### record は 2 相目を静的化するが、2 相目を消すわけではない

DR-126 の record 宣言があれば第 2 相のパス妥当性は定義時に決まる。それでも第 2 相は残る —
記録されるのは「どのフィールドに当たるか」であって「そのフィールドに値が座っているか」ではないからである。
presence は値ごとに変わる (DR-126 §3) ので、presence 判定と値読みは実行時のままである。
静的化されたのは**構造の妥当性**であって、値の存在ではない。

### vivify を許すのは、closed record が「器の形」を定義時に確定させるから

`--until X` 単独で `{until: X}` を成立させる操作は、器 `{}` を勝手に作ることを意味する。
これが安全なのは closed record (DR-126 §2) だけである — キー語彙が閉じているので、
生成した器がどのフィールドを持ちうるかが定義時に尽くされ、宣言外の座が生えることがない。
`map` / `value` の宣言では器の形が実行時にしか分からないため、vivify すると
「何を作ったのか誰にも言えない値」がセルに座る。Reject に倒すのはこの非対称の帰結である。

## 波及

- **DR-029**: §「解決は遅延 (実行時)」に本 DR §7 の分界文を追補注記として入れる。
  文法 (`name ('.' name | '[' int ']')*`)・1 実体:N 参照・操作の時系列適用・解決失敗 = パース失敗の
  各裁定は不変であり、本 DR はそれらに意味論を与える側である
- **docs/DESIGN.md §10.2** (`link` は値同期): 固定パス DSL の例示列 (`link: "timerange.since"` /
  `"color.rgb[0]"` / `"color.rgb[-1]"`) に 2 相分解の記述を足す。**§2.7** (lexical スコープ chain) は
  第 1 相の root 解決規則の正本として現状のままだが、パス起点にのみ効く旨の言及が要る。
  §10.3 の「ref/link は name 参照」(DR-032) は第 1 相について不変
- **docs/CONFORMANCE.md §2**: `effects` 要素の記述 `{entity, op, operand?, source}` に optional な
  `path` を追加する。§3 の比較規約では `path` を持つ effect と持たない effect を区別する
  (省略は「セル着地」の意味であり、既定値による補完はしない)
- **schema/fixture.schema.json**: `$defs.effect` の `properties` に `path`
  (`{"type": "array", "items": {"anyOf": [{"type":"string"},{"type":"integer"}]}}`) を optional 追加。
  `required` は `["entity", "op", "source"]` のまま
- **schema/wire.schema.json**: `link` の description は既に「固定パス DSL (.name / [int]、DR-029)」を
  名乗っており文言の残変更は小さい。残る判断は構文検査を Schema の `pattern` に持ち込むか
  (実装追随時の判断に委ねる — 現行どおり参照層で解いてもよい)
- **config_key との分界**: `config_key` は link の固定パス DSL の**文法だけを借用**している
  (DESIGN / REFERENCE の該当節)。本 DR の 2 相意味論・vivify・Reject 規則は config_key には
  適用されない (config 席の解決は DR-050 の関心) — この分界の注記を DESIGN 側編集時に添える
- **lint 候補**: record 静的化により「sentinel 返し fn の値残余座への適用」(§4.1) は常に Reject に
  なることが定義時に分かる — 死に定義として lint の警告対象候補 (definition-error にはしない、
  DR-126 §5 の null フィールドと同じ整理)
- **fixtures/link-parse/**: 現行 3 本 (`basic.json` / `absent-target.json` / `export-key-address.json`) は
  すべて第 1 相の pin であり不変。新設が要るのは 7 種 —
  (1) セル降下 (兄弟スコープの子への合流) / (2) 値残余 (不透明複合値のフィールド書き) / (3) 負 index /
  (4) 値残余の absent → 枝 Reject → 他枝が勝つ / (5) 時系列上書き (部分書き→parser 産出、逆順の両方) /
  (6) sources の座 re-tag (部分書きした座だけ `link`) / (7) effects の `path` 表記 /
  (8) nameless 透過子への位置指定着地 (`pair[0]`、entity + path の観測面込み — DR-029 用途 4)
- **DR-121**: §4 (`link` は独立した値源タグ) と §5 (effects は宣言名軸) は本 DR の観測面規定の前提として現役。
  §4.2 が記録する参照実装の乖離 (`Source` enum に `Link` が無い) は、本 DR の追随でも解消対象になる
- **DR-122**: §3 (タグの決定単位は値の座) を複合値の内部へ一般適用するのが本 DR §6 の sources 規定である。
  §2 (キー集合は result の射影) は vivify した器にもそのまま効く — 座っていないフィールドは
  result に無いので sources にも現れない
- **DR-126**: 本 DR の前提。record の closed 性が vivify の安全性を、presence-optional が
  部分書きの正当性を、乖離 Error が organic 値の保証 (§3.2) の片側を担う
- **kuu.mbt / kuu-cli**: 追随 3 点 — decode で `link` を path AST にパースする /
  `LinkTarget` の target を (cell, path_residual) へ拡張する / 枝の成立判定にパス解決可否を含める (§4.2)。
  introspection ABI への要求は「Value に対する get / set (field / index)」で尽き、
  value_parser への追加要求は「Value を返すこと」以上に増えない

## 採用しなかった案

### (a) 全遅延・値一元 — パスを常に値空間として実行時に解く

2 相分解の暗黙性 (同じ綴りで意味論の厚みが変わる) が無く、規則が 1 本で済む。棄却理由は effects の規範との衝突である。
スコープの kv は結果の組み立て時にしか存在しないため、発火時の観測値を枝ローカルの binding 列から都度 fold し、
書きを子セルの効果へ**逆写像**しなければ effects の cell 単位・宣言名軸 (DR-045 / DR-121 §5) が保てない。
逆写像は `export_key` 透過と nameless 畳み込みが絡んで一意に定まらない。
また「result の形を辿る」なら鍵空間が露出キーになり、link = name 参照 (DR-032) と正面から衝突する。
統合の見かけの下で排他的な制約を侵害する型の案である。

### (b) 値残余を leaf 限定 / セル降下限定に絞る

実装の段階分けとしては有効で、初手の射程を小さくできる。棄却理由は v1 完備主義 —
DR-029 が挙げた 4 用途のうち、どちらに絞っても半分が書けないまま残る。
段階的に実装すること自体は妨げないが、**規範を段階に合わせて縮めない**。

### (c) effects の path を結合文字列で表す

`"timerange.since"` の 1 文字列で持てば新しい構造を持ち込まずに済む。棄却理由は DR-121 §1.2 と同じ非単射性である。
record のフィールド名にも nameless 子の name にも `.` の禁止は無く、区別すべき 2 つのアドレスが同じ綴りに潰れる。
escaping / encoding は消費者に復号を要求し、復号を忘れた実装が静かに壊れる (テストは通る)。
符号化を決めるのでなく符号化を不要にする側を採る。

### (d) 入力側へ部分注入し、入力が揃うまでパースを保留する

`--since` / `--until` を入力世界の候補バッファに積み、揃った時点で value_parser を一度だけ通す。
value_parser が必ず通るので `final_filters` への依存が減る、という利点がある。棄却理由は §5 のとおり —
効果の時系列にもラダーにも席が無く、Reject の発火時点が原因操作から遅延して `args_pos` 帰属 (DR-037) が壊れる。
入力世界 (sub-parse) と出力世界 (link パス) の分界を保つ方が、機構の総量としても小さい。

## 関連

- DR-029 (link の見直し — 固定パス DSL の文法・時系列適用・解決失敗の扱いの正本。§7 が分界を追補)
- DR-031 (値源の優先順位 — §2.1「値源ラダーのすべてが従来どおり」と link/cli の効果順位の正本)
- DR-126 (record 型 — 第 2 相の静的化と vivify の前提)
- DR-032 (ref/link は name 参照、type は型参照 — 第 1 相の鍵空間)
- DR-033 / DESIGN §2.7 (lexical スコープ chain — root name の解決規則)
- DR-037 (Reject と Error の分界 — パス解決失敗が Reject 側である根拠)
- DR-038 (完全経路の一意性 — §4.2 の「裁定前に枝ローカルで解決可否を判定する」要求の出所)
- DR-045 (cell operation と effects の cell 単位規範 — (a) 棄却の根拠)
- DR-051 (absent / null — vivify した器の presence 表現)
- DR-087 (default の遅延解決 — 値源ラダーの遅延実体化。link パスの遅延とは別軸)
- DR-121 §4/§5 (`link` タグの独立性・effects の宣言名軸)
- DR-122 (sources shadow tree — §3 のタグ決定単位を複合値内部へ一般適用)
- docs/research/2026-07-28-link-fixed-path-dsl-design.md (案の比較と裁定の正本)
- docs/research/2026-07-31-type-input-structure-splice.md §2b (入力側 splice との分界)
