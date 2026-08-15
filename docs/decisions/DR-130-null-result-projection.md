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

**値述語における `null` は「値なし」である**。`required` / `required_group` の充足判定 (DR-047 / DR-103)、
および DR-088 の「解決後に値が無ければ落ちる」判定において、座が `null` であることは**不充足**として
扱う。キーが立っていることは充足の証拠にならない — 述語が見るのは座の値であって、キーの presence では
ない。これは DR-051 下で「absent = 不充足」だった観測をそのまま保存する。

### 1b. 「宣言上出うる全キー」の導出面

§1 が言う「宣言上出うるキー」は、DR-120 が既に定めた 2 つの規定の合成であり、本 DR は新しい判定を
足さない。

- **面**: **全 installer の宣言層寄与を適用し終えた宣言層** (DR-120 §5) — `commands` / `global` /
  `inheritable` / `alias` の宣言的コピーを含み、**lowered 産物は見ない**。結果キーが決まるのはこの面で
  あり、露出キー衝突検査 (DR-120) や help_query capability (DESIGN §15.15) が読む面と同一である
- **どの要素がキーを立てるか**: DR-120 §4 の占有 / 非占有の規則をそのまま使う。占有する = 露出キーを
  持ち値セルを持つ要素 (入口なしの実体だけノードを含む)、露出キーを持つスコープ生成要素 (command を
  含む — 1 キーとして数える)、`inheritable` が祖先スコープへ置く write-target。占有しない = `link` /
  `alias` の参照ノード (値は canonical のセルへ流れる)、結果キー軸を持たない要素 (`export_key: null` は
  透過し、その子が親スコープで参加する)、値セルも子も持たない `dd` (DR-064 §5)、`#` 予約 namespace の
  内部セルと `definitions` 配下、`type: "none"` (値空間を持たない = 露出キーを持たない、DR-089)、
  `global` installer の入口コピー

`build_result` と `source_shadow` は**同一のキー集合**を使う。§5 が要求する result と sources の同型は、
両者が別々に「出うるキー」を数えないこと (= 本節の導出を 1 か所で共有すること) によって保証される。

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

**素通しの責務は共通 dispatcher が負う**。個々の filter / parser が「まず null を見て早期 return する」
実装を各自書くのではなく、fn を呼び出す共通の配管が「入力が null なら fn を呼ばずに null を返す」を
1 か所で実施する。責務を住人側に置くと、拡張 ns の住人が null 分岐を書き忘れた瞬間に規則が破れる
(= 規範が実装の善意に依存する)。素通しが適用される単位と、null が観測されるまでの順序は DR-131 §2b が
定める。

この昇格により、**配列の穴が値として表現可能**になる。nameless tuple の部分書きは `[null, 2]` と書ける。
LNK2-Q1=a (全座が埋まるまで tuple ごと absent) は本転換で obsolete になる — 全座成立判定のロジックは
そのまま転用し、判定結果の挙動を「tuple ごと落とす」から「埋まらない座を null で埋める」へ差し替える。

#### 3.1 定義側に null リテラルは書けない

null が値空間の住人になっても、**定義 (UsefulAST / wire descriptor) の `default:` / `value:` 席に
`null` を書くことはできない**。書いた場合は definition-error `invalid-range` (DR-054 §4) である。
DR-051 §4 第 3 項の禁止は、根拠を替えて存続する。

理由は 2 つある。`null` は「値なし」を語る値なので、`default: null` は「既定値は無い」= **席の省略と
同義**であり、明示形が別に存在する意味がない。さらに §7 の型導出は「`default` あり → `T`」で分岐する
ため、`default: null` を許すと「default があるのに座が null になりうる」要素が生まれて導出規則が破れる。
禁止することで、定義に現れる `default` 席は常に「非 null の値を供給する」と読める。

**`default_fn` が実行時に `null` を返すのは合法**である。これは「この default は今回供給しない」を
語る通常の値返し (DR-131 §1) であり、座は `null`、`sources` も `null` になる。定義時に書けないのは
リテラルであって、実行時の返り値ではない — §7 が `default_fn` を「default あり」に数えないのはこの
可謬性そのものが理由であり、両者は同じ判断の裏表である。

### 4. 静的宣言キーは全列挙、動的キー構造は present のみ (NUL-Q3)

全列挙の対象は「**宣言から出うるキーが静的に分かる**」構造に限る。実行時にキーが決まる構造は
従来どおり present のみを載せる。

| 構造 | 射影 |
|---|---|
| nameless 枝の `or` 席 | **セル単位で 1 キー**。unset なら `cell: null`。枝ごとのキーを同時列挙することはない (DR-120 §2 の「露出キーに対応する値セルはちょうど 1 つ」の帰結) |
| named 枝の `or` 席 (NULOR-Q1=a) | 選択された枝の内側で**全枝キーを列挙**し、非選択枝は `null` にする。例: `{name:"mode", or:[{name:"fast",type:"string"},{name:"slow",type:"int",default:7}]}` に `--mode x` → `{"mode":{"fast":"x","slow":null}}`。セル未発火なら枝を展開せず `{"mode":null}`。未選択枝の default は充填せず、枝の default はその枝が選択された場合だけ生きる |
| `repeat` の行 | 行の内側の静的宣言キーは null 埋め。tuple の `[null, x]` と同型 |
| `seq` の nameless tuple | 各座を全列挙、埋まらない座は `null` (§3) |
| record (DR-126) | **内側も反転** — closed な語彙なので全フィールド列挙 + `null` |
| 動的キー構造 (`from_entries` / merge accumulator / kv-map / config 由来 map) | **present のみ**。宣言に語彙が無く、出うるキーの集合が静的に定まらない |

#### 4.1 record の補形は射影層で行い、parser の出力は書き換えない

record の反転は DR-126 §3 (「フィールドは presence-optional で `null` 不使用」) の改定である。closed =
キー語彙の閉域という裁定はむしろ全列挙の前提として効き、「宣言済みフィールドの不在は正常」という
presence 軸は「宣言済みフィールドの値が null なのは正常」へ読み替わる。

ただし**全フィールド列挙は結果射影層の仕事**であり、type パーサ (および record を名乗る registry 住人
一般) の**出力そのものは書き換えない**。パーサが宣言済みフィールドを 1 つ落として返すのは従来どおり
正常であり、射影の段でそのフィールドに `null` が補われる。

この分離により **DR-126 §4 の乖離検査は生出力に対して行う**。同 §4 の表 (c) 行「宣言済みキーが値に
存在しない」は「**正常** — 射影層が `null` を補う」へ改定される (扱いは不変で根拠が替わる)。(a)
「宣言に無いキーが値に存在する」/ (b)「フィールドの値がその type の名乗る `out` と合わない」の 2 種が
Error である点は不変である — 補形の前に生出力を見るからこそ、パーサの逸脱が射影に埋もれない。

値空間側の読み (DR-127 の値降下) は物理的な補形を待たずに「**record の宣言済み座で欠落しているものは
`null` と読む**」で統一する。物理的にキーを立てるのは射影時の 1 回だけだが、論理的にはどの相から見ても
同じ値が読める。

#### 4.2 `ambiguous` の interpretations は sparse のまま

全キー列挙は **resolve 相の成果物 (`result` / `sources`) に対する規範**である。`ambiguous` outcome の
`interpretations` は従来どおり **parse 相 + DR-118 §3 の 2 規則を適用した差分ビュー**であり、
値源ラダーを回さない (DR-118 §3 / DR-109)。**null による全キー列挙は行わない**。

理由は位相である。interpretations が示すのは「どの解釈が、どのトークンをどう食べたか」であり、
その解釈で**触られた座だけ**が載ることに意味がある (`{"s": "ax"}` と `{"s": "a", "x": true}` の対比が
そのまま解釈の違いを語る)。ここに未確定の座を `null` で敷き詰めると、解釈間の差分が null の海に
埋もれて対比が読めなくなる。ラダーを回していない以上、そこに置く `null` は「値が無い」ではなく
「まだ決めていない」であり、§1 の `null` とは意味が違う。

> **追補 (DR-138 §5、2026-08-16): union セルの tie による ambiguous は例外で、各解釈を枝の
> 結果ビュー (§4.1 の null 補形適用後の形) で載せる。** この ambiguous は parse 相の消費差分
> ではなく確定相の**形の差**であり、variant の `null` 座は「まだ決めていない」ではなく
> 「この variant では座が在って null」という形の主張である — 形の違いこそが曖昧の内容なので、
> null 補形を省くと解釈間の差 (`{a:1}` vs `{a:1,b:null}`) 自体が消える。sparse 規範は
> 消費差分ビュー (本節の本文) に閉じる。

### 5. sources も null を持ち、result との同型を保つ (NUL-Q4)

`sources` は `result` の shadow tree であり、**キー集合が result と完全一致する** (DR-122 §1/§2) という
規範を維持する。したがって result で `null` になった座は、sources でも `null` になる。

```
result:  {"name": null, "port": 5}      sources: {"name": null, "port": "default"}
```

`sources` の `null` は「**その座の値を確定させた主体が存在しない**」を意味する。

DR-122 の shadow tree 規範は、本 DR の下では次の 2 文で直接述べられる (「result に現れないキーは
sources にも現れない」という消去法の言い回しは、absent が消えた以上もはや読み手に何も教えない):

> **`sources` のキー集合は `result` のキー集合と完全に一致する。`result` で `null` の座は `sources`
> でも `null` である。**

キー集合の導出は §1b が定める 1 か所を共有する。

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

「default あり」が native な `default:` 値を指し可謬な `default_fn` を数えない点 (DR-114) は不変で、
根拠だけが替わる — 従来は「`borrow:<source>` が `absent-source` で落ちうる」ことが可謬性の中身だったが、
本 DR の下では **`default_fn` は `null` を返しうる** (§3.1) ことがそのまま可謬性である。返り値が `null` の
default_fn しか持たない要素の座は `null` になるので `T | null` に落ちる。「反復系」が `optional: true`
糖衣を含む点 (DR-043 / DR-044) も不変である。

record (DR-126) の内側も同じ読み替えで、**全フィールドが `T | null`** になる。「このフィールドは常に立つ」
を機械可読に主張する手段を v1 が持たない点は変わらない。

言語バインディングにとっては `T | null` が `T?` (presence-optional) より自然な写像になる — TS の
`{name: string | null}`、MoonBit の `String?` はいずれも値の欠落を値で表す形であり、キーの有無を
問い合わせる形ではない。消費側の presence check も `obj.k === null` の 1 本になる。

### 8. fixture は全キーを逐語で書く (NUL-Q1=b)

conformance fixture の `expect.result` / `expect.sources` は、**null の座も含めて全キーを逐語で書く**。
runner が宣言から null を自動補完する方式は採らない。

理由 (kawaz mid=40): 記述コストの恒常増は大した量ではなく、全列挙は case 同士の比較がしやすい。初回の
書き換え (~578 case) は一度きりの投資である。

この帰結として **CONFORMANCE §3 の比較規約を改定する**。現行の「フィールド省略 = default 値と等価」を
`result` / `sources` へそのまま適用すると、キーの省略が「null と等価」に読めて検証が骨抜きになる。
`result` / `sources` はキー集合込みの完全一致 (省略の読み替えを行わない) とする。`candidates[].meta` を
「省略時に検証が骨抜きになるため常に書く運用」とした先例 (COMP-Q2) と同じ整理である。

#### 8.1 conformance decoder への要件

比較規約が成り立つには、fixture の JSON を読む側が「キーが無い」と「キーがあって値が `null`」を
**別の状態として保持できる**必要がある。素朴な「JSON object → map、値が null なら未設定扱い」の
decode はこの区別を潰すので使えない。要件は 3 つ:

- **`expect.result` / `expect.sources` の decode は missing key と explicit null を区別して保持する**
  (両者を同じ内部表現へ畳まない)
- **`result` / `sources` は「省略 = default 値と等価」の一般規約から明示的に除外する** — 他フィールド
  (`outcome` / `errors.reason` 等) の省略読み替えは従来どおりで、除外はこの 2 フィールドに限る
- **`effects[].operand` は present-required (値として `null` を許す) の schema 形にする** — `set` の
  operand は常に書かれ、`null` は「書かれなかった」ではなく「null を operand とする set」を意味する
  (DR-131 §6)

### 9. 転換対象でない absent (誤爆注意)

以下は「値が無い」ではなく「**参照先が存在しない**」を指す別概念であり、本 DR の対象外である。機械置換を
かけてはならない:

- `absent-ref` — 名前解決の失敗 (DR-127 第 1 相、DR-032)。**定義時**に名前が引けないことであり、値の
  有無とは層が違う
- `absent-path` / `absent-category` — help クエリの照会先不在 (DR-112)
- `fixtures/link-parse/absent-target.json` — link の参照先不在を pin する fixture
- DESIGN §2.4 の「absent = 入口なし」系記述 / LOWERING の wire 入力側 presence — 入力側にキーが無いことの
  記述であり、出力射影の話ではない

**`absent-source` はここに含まれない — 本転換で廃止される**。`borrow:<source>` の参照先の座は本 DR の
下では不在にならず `null` になるので、borrow は `null` を返し `set(null) = unset` が呼び出し元へ伝播
する (DR-131 §1)。DR-113 §5.4 の「参照先が最終的に不在なら fn reason `absent-source` で呼び出し元も
unset のまま落ちる」という個別規定は、DR-131 の一般規則に吸収されて消える。NUL-C1 が `absent-source` を
「転換対象外」と書いたのは**機械置換の誤爆を防ぐ意図**であって意味論を温存する指示ではない (正本ノート
§5b)。`absent-ref` (定義時の名前解決失敗) と綴りが似ているだけの別物なので、一括置換は依然として禁止で
ある。

#### 9.1 別軸の `null` (kuu の値空間へ流入しない)

以下の `null` は本 DR の `null` と綴りが同じだけで、住む層が違う:

- **`export_key: null`** — 結果キー軸のメタ (「このノードは結果キーを持たない」の明示、DR-052 §2/§4)。
  §6 のとおり改名も統合もしない
- **provider 境界の `| null`** — `tty_provider` の `(stream) → bool | null` (DESIGN §12b / DR-099 /
  DR-129)、`env_provider` / `config_provider` の lookup 失敗も同型。これは「**その provider は情報を
  持たない**」を語る Maybe であって、`null` という値の供給ではない。**provider の `null` が kuu の値空間へ
  `null` として流入することはなく**、供給なしとして値源ラダーの次段へ落ちる (config の JSON null を
  「供給なし」と読む DR-050 も同じ扱いで、こちらは裁定不変)

この非対称から 1 つ帰結する: **result JSON は config JSON への round-trip 形ではない**。result の
`"port": null` は「値が無い」を語る出力側の表現であり、同じ JSON を config として食わせると DR-050 の
「供給なし」として読まれる。両者が同じ綴りで違う意味を持つことは意図的であり、result を設定ファイルへ
書き戻す用途は v1 の射程にない。

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

### 出力量の増加は意図したトレードオフであり、上限は規定しない

本 DR が規範として要求するのは、**O(実現スコープの宣言幅の総和 + closed record の展開幅)** の出力を
産むことである。absent 射影の「湧いた値だけ」に比べれば出力は増え、それは発見性 (前節) と穴の表現
(次節) を買うために意図して払うコストである。

規範はここまでで、**出力サイズの上限も、lazy serialization のような実装技法も定めない**。「巨大な宣言で
result が大きくなりすぎる」問題は §2 の 1 段停止が構造的に抑えており (未選択サブツリーは `null` 1 つに
畳まれる)、それ以上の抑制が要るかは消費者と実装の事情に属する。conformance が pin するのは値であって
生成の仕方ではないので、ストリーミング出力や遅延構築を選ぶのは実装の裁量である。

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
- **DR-103**: 未選択 scope の遅延述語不参加は**裁定不変**、根拠の付け替えのみ (本 DR §2)。§5 明確化注記の
  「DR-051 §3 の unselected scope = absent (キー消失) と整合」の一文を本 DR の `null` 畳みへ差し替える
- **DR-126 §3 / §4**: §3 の「フィールドは presence-optional で `null` は使わない」を反転 — 全フィールド
  列挙 + `null`、型導出は `T | null` (本 DR §4/§7)。§4 の表 (c) 行「宣言済みキーが値に存在しない」は
  **「正常 — 射影層が `null` を補う」**へ根拠を替える (扱いは不変)。乖離検査が **type パーサの生出力**に
  対して行われる点を明記する (本 DR §4.1)。§2 の closed 裁定・§4 の乖離 Error 2 種 (a)/(b) は不変
- **DR-113 §5.4**: 「`borrow:<source>` の参照先が最終的に不在 → fn reason `absent-source`、呼び出し元も
  unset のまま落ちる」規定を**削除**する。参照先の座は本 DR の下で `null` になるので、borrow は `null` を
  返し `set(null) = unset` が伝播する (DR-131 §1 に吸収、本 DR §9)。同 §5.4 の「default 席で Sentinel
  fn を指定」行は DR-131 §7 が別途縮小する
- **DR-127**: 値残余の座への部分書きが `[null, 2]` / `{until: X, since: null}` を産みうる点を追補。
  §3 の record auto-vivify は「宣言済みだが書かれていないフィールドは null」で閉じる (器の形が定義時に
  確定するという裁定は不変)。§4.1 の Sentinel 返し Reject は DR-131 が別途改定する

### DR (注記のみ — 裁定は不変、absent への言及を null へ読み替え)

DR-016 (2 層分離) / DR-031 (値源ラダー枯渇時) / DR-044 (一様配列) / DR-045 (unset の committed=false) /
DR-050 (config の JSON null = 供給なし — **入力側の別軸なので裁定不変**、DR-051 §4 への参照だけ付け替え) /
DR-064 §5 (`dd` は値セルも子も持たないので露出キーを占有せず、全列挙の対象外 — 本 DR §1b) /
DR-087 (default の遅延解決) / DR-088 (宣言された値源 = default の存在、解決後に値が無ければ落ちる。
`null` 座は不充足として扱う点を本 DR §1 が明示) /
DR-089 (`type: "none"` は**値空間を持たない = 露出キーを持たない**ので全列挙の対象外、本 DR §1b) /
DR-093 (required の型委譲) / DR-114 (FnCtx の `old: Value | absent`) の計 11 本。

### docs 本体 (27 箇所、正本ノート §4 の実測)

- **DESIGN §2.6** (L214-216 が本丸): 節タイトルと本文を全面書き換え。「値の無い要素は結果に出ない
  (absent)」→「値の無い座は null」。null 不在の宣言・presence marker の記述・型導出表を本 DR §1〜§7 へ
  差し替える
- **CONFORMANCE §2**: `result` の説明 (「DR-051 の absent 規則適用後」)、`sources` の shadow tree 説明
  (キー集合が result の射影である点は維持、null 座の追加)、空コレクションの由来の項
- **CONFORMANCE §3**: 比較規約の改定 (本 DR §8) — `result` / `sources` をキー集合込みの完全一致にし、
  「省略 = default 値と等価」の一般規約から除外する。outcome 別まとめ表の該当行も追随。decode 側の要件は
  本 DR §8.1
- **DESIGN §12b**: `tty_provider` の `→ bool | null` を「provider が情報を持たない」の Maybe として
  読む点を明示し、宣言 default へフォールバックする解決規則の記述にある「absent へ落ちる」
  (`resolved_default = 観測 ?? 宣言 default ?? absent`) を `null` 形へ更新する (本 DR §9.1)
- **DESIGN §2.4** (L545 付近の「absent = 入口なし」) / **LOWERING L122 / L215** (行番号): **対象外** —
  wire 入力側の presence を語る別軸 (本 DR §9)

### fixture

件数は 2026-08-01 の実測。**着手時 (サイクル 3) に再集計する**前提で読むこと:

- `expect.result` を持つ success case **578 件**が逐語全列挙化の対象 (NUL-Q1=b)。ディレクトリ単位で
  並列化できるが、`export-key` (43) / `value-typing` (31) は露出規則そのものを pin しているので目視枠
- `sources` 付き **217 case** に null 座を追加
- `why` 文で absent に言及する **78 ファイル / 107 case** は文面の書き換えパスであり、期待値の書き換えとは
  別に走らせる
- **`fixtures/absent/` ディレクトリ 4 ファイルは `fixtures/null-projection/` へ改称する**。absent 意味論
  そのものを pin する専用領域なので期待値の差し替えでは済まず (`no-source-and-default.json` /
  `repeat-empty.json` / `required-positional.json` / `selected-scope-empty.json`)、null 射影を pin する
  領域として書き直す。ディレクトリ名に `absent` を残すと後続の grep で誤爆源になるため領域名も現行化
  する。台帳・pin からの参照有無はサイクル 3 で確認する
- **`fixtures/value-sources/default-fn-borrow-ladder.json::borrow-source-absent` は更新対象**へ移る —
  `absent-source` の廃止 (本 DR §9 / DR-131 §1) により、期待値が borrow の `null` 返し形になる。
  `fixtures/constraints-parse/requires-bool-target-default-fn-borrow.json` も同じ経路の追随
- **対象外** (誤爆注意、本 DR §9): `fixtures/link-parse/absent-target.json` (参照先不在を pin)

### schema

- `schema/fixture.schema.json`: `expect.result` / `expect.sources` の値に `null` を許す
- `schema/descriptor.schema.json`: `io_type` の値型体系に null が値として載る点の反映 (本 DR §3)

### 実装

- **kuu.mbt**: `resolve.mbt` の `build_result` (L580-909) が中心 — 「値があれば入れる」から「宣言キーを
  歩いて埋まらない座に null を置く」へ反転。§1b のキー導出は 1 か所に置き、`build_result` と
  `source_shadow` (L1568-1754) が同じ集合を読む。`default_cells` 系も追随。conformance decoder は §8.1 の
  3 要件 (missing key と explicit null の区別保持 / `result`・`sources` の省略読み替え除外 /
  `operand` の present-required) を満たす形へ
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

fixture の記述コストを抑え、既存 578 case の書き換えを回避する案。棄却理由は kawaz mid=40 の裁定 —
記述コストの恒常増は大した量ではなく、**全列挙は case 同士の比較がしやすい**。加えて runner が宣言を
読んで期待値を組み立てると、fixture が pin しているはずの射影規則を runner 側が再実装することになり、
「fixture は実装から独立した期待値である」という conformance の前提が崩れる。初回書き換えは一度きりの
投資である。

## 関連

- DR-051 (**superseded by 本 DR** — absent 射影・null 不在・型導出の元)
- DR-052 §2/§3/§4 (`export_key: null` の軸メタ / presence marker — §6 で marker を廃止、軸メタは残置)
- DR-120 §2/§4/§5 (露出キー 1 セル — §4 の or 席射影の根拠、§4 の占有判定と §5 の宣言層の面が §1b の導出元)
- DR-121 §2 / DR-122 §1/§2 (sources の席と shadow tree — §5 で null 座を持つ)
- DR-123 §3 (反復セルの暗黙 bottom default `[]` — null にならない族)
- DR-126 §2/§3/§4 (record — §4 で内側も反転、§4.1 で補形は射影層のみ、closed と乖離 Error (a)/(b) は不変)
- DR-127 §3/§4.1 (link 固定パス DSL の部分書き — 穴の表現が値になる)
- DR-118 §3 / DR-109 (interpretations は parse 相の差分ビュー — §4.2 で sparse 維持)
- DR-103 §5 (未選択 scope の述語不参加 — 裁定不変、根拠付け替え)
- DR-047 / DR-088 (required の値充足・宣言された値源 — `null` 座は不充足、§1)
- DR-113 §5.4 (`absent-source` — §9 で廃止、DR-131 §1 の一般規則へ吸収)
- DR-064 §5 / DR-089 (`dd` / `type: "none"` — 露出キーを占有しない = 全列挙の対象外、§1b)
- DESIGN §2.6 (absent 射影の正本記述 — 全面書き換え対象)
- DESIGN §12b / DR-050 (provider 境界の `| null` と config の JSON null — §9.1 の別軸、値空間へ流入しない)
- CONFORMANCE §2/§3 (`result` / `sources` の規定と比較規約 — §8 で改定)
- docs/research/2026-08-01-null-projection-inversion.md (本 DR の正本ノート、NUL-Q1〜Q4 / NUL-C1)
- DR-131 (Sentinel 縮小 — 本 DR の null を前提に unset を Value fn へ畳む。empty は Sentinel に残り、effects の empty op を担う)
