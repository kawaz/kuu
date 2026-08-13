# DR-134: command は値かスコープのどちらかを名乗る — command node の `value` 合法化と占有子の排他

> 由来: kawaz 裁定 CNV-Q1 = b (2026-08-12、mid=60) と、残設計点 CNV-Q1b の承認
> (docs/QUESTIONS.md の CNV-Q1 節)。発端は issue 棚卸し (2026-08-03) で浮上した spec と参照実装の
> 食い違い — schema と DESIGN は `value` を全 node 位置で合法としているのに、参照実装の CommandDef は
> 値の担体を持たず decoder が reject する。前提は DR-120 (露出キーに対応する値セルはちょうど 1 つ /
> §4 の占有・非占有) / DR-130 (結果射影は宣言キーの全列挙、未選択 scope は親キー `null`) /
> DR-122 (sources は result の shadow tree) / DR-031 (値源ラダー、`value:` = const)。

## 決定

### 1. command node の `value` は合法

`type: "command"` の node に `value` を書いてよい。command が値を持つ形は help / version のような
「名乗ったらそれ自体が答えになる」サブコマンドでよく見るものであり、拒否する理由が無い:

- **スコープ生成は command 特有の性質ではない** — 名前付き `or` も名前付き `seq` もスコープを作る。
  スコープとは「その座の値が map である」というだけのことで、command だけが持つ特権的な構造ではない
- **親から見れば同じもの** — 親スコープの結果から見て、スコープを名乗る command は「フィールド名 +
  JSON object」、値を名乗る command は「フィールド名 + JSON scalar / array」であり、どちらも
  フィールド名 + JSON 値である。射影の形が違うだけで、キーを 1 つ占有する 1 セルであることは変わらない

**この「array」は担体の約束ではない** (CVQ-Q1a、kawaz 2026-08-14)。上の対比が言っているのは
「その座の値が **map (スコープ) か、そうでない値か**」であって、配列 literal を積極的に許した文ではない。
**値持ち command の担体は scalar literal のみ**であり、配列 `value` / 配列 `default` は definition-error
**kind = `invalid-range`** になる:

```json
{"type": "command", "name": "x", "value": [1, 2]}   ← invalid-range
{"type": "command", "name": "x", "default": [1, 2]} ← invalid-range
```

これは **非 multiple のスカラー要素に配列 default を書けない**既存の線 (DR-083 §5、
`fixtures/definition-error/scalar-array-default-invalid-range.json`) と同族である。値持ち command は
`multiple` 宣言を持たない単値セルなので、要素の値空間 (scalar) と literal の構造 (配列) の不一致が
定義時点で静的に既知になる — §5 のとおり値の供給規則に command 専用の特例は無く、通常の値セルと同じ
検査が掛かるという帰結にすぎない。

### 2. command は値かスコープのどちらかを名乗る — 占有子との共存は definition-error

`value` を持つ command の内側に**結果キー占有子** (DR-120 §4 の「占有する (検査に参加する)」側の要素) を
置くことはできない。置いた場合は definition-error **kind = `invalid-range`**、`element` は当該 command の
name。**非占有子は共存してよい**:

| 内側の要素 | 可否 | 根拠 |
|---|---|---|
| 露出キーを持ち値セルを持つ通常要素 / 実体だけノード | definition-error | DR-120 §4 占有側 |
| 露出キーを持つスコープ生成要素 (子 command、名前付き or / seq) | definition-error | DR-120 §4 占有側 |
| `link` 参照ノード / `alias` | 共存可 | 値は canonical のセルへ流れ自前のセルを持たない |
| `dd` / `type: "none"` | 共存可 | 値セルも子も持たず結果に痕跡を残さない |
| `#` 予約 namespace の内部セル (help preset 等) | 共存可 | 結果に現れない |
| 結果キー軸を持たない透過ノード | 占有する子を持たなければ共存可 | 透過ノードの子は親スコープ (= この command のスコープ) で参加するため、その子が占有子なら上段の行に落ちる |

理由は DR-120 §1 の中核規範そのものである。**1 つの露出キーに対応する値セルはちょうど 1 つ**であり、
1 つのセルが持てる値は 1 つである。占有子が居れば選択時の射影は宣言キーを全列挙した kv になり
(DR-130 §1)、`value` はその同じセルに座を要求する。2 つの値を 1 セルへ入れる形は表現できないので、
どちらを名乗るかを定義時に決めさせる。

kind に `invalid-range` を採るのは、「その席に置けない属性の組合せ」を表す既存の kind だからである
(`default` と `default_fn` の併用、非 multiple 要素への `accum_filters`、scalar 要素への配列 default など、
同居不可の組合せは一貫してこの kind で報告されている)。

### 3. 選択された value 持ち command は、親スコープのキーに値そのものが座る

選択時の射影は kv ではなく値である:

```json
{"commands": [{"type": "command", "name": "version", "value": "1.2.3"}]}
```

```
引数 ["version"] → result {"version": "1.2.3"}   sources {"version": "const"}
```

- **占有子が居ないので列挙すべき宣言キーが無い** (§2)。スコープとして射影すれば `{}` にしかならない座に、
  値が座る。DR-130 §1 の「宣言上出うる全キーを持つ」はキーの数え方の規定であり、この command が
  親スコープで 1 キーを占有することは変わらない
- **sources は値を確定させた席のタグ**である (DR-122 の shadow tree)。`value:` 由来なら `const`
  (DR-031 CONST-Q1=a — const は値セルに最初からいる初期値)
- command のスコープ自体は消えない。トリガとして token を消費し、非占有子 (dd / none / 内部セル) は
  従来どおりそのスコープで働く。消えるのは**結果への kv 射影**だけである

### 4. 未選択なら `null` — 値持ちでも一様

未選択の value 持ち command は、親スコープのキーとして `null` を持つ (DR-130 §2 のまま)。sources も
同じ座で `null` になる (DR-130 §5)。`default` / `default_fn` を持っていても未選択なら `null` である —
値源ラダーが走るのは実現したセルに対してであり、成立しなかった座は「値を確定させた主体が存在しない」
座になる。これは未選択の `or` 枝が `default` を持っていても `null` になる既存の規範と同じ形である
(`fixtures/or-parse/unselected-branch-default-null.json`)。

### 5. 値の供給は既存の node 意味論のまま

`value:` (const) / `default` / `default_fn` / cell fn — 値をどう供給するかについて command 専用の規則は
足さない。command であることが効くのは「セルが実現するのは選択されたときだけ」という §4 の一点だけで、
実現したセルの中の値源ラダーは通常の値セルと同じである。

### 6. 露出キーの占有と衝突検査は不変

value を名乗ろうとスコープを名乗ろうと、command は親スコープで**1 つの露出キーを占有する 1 セル**である
(DR-120 §4)。露出キー衝突検査への参加も、`export_key` による改名も従来どおりで、本 DR は §4 の
占有 / 非占有の判定表を変更しない。

透過 (`export_key: null`、DR-052 §2) の value 持ち command も**合法**である (kawaz 裁定 2026-08-14)。
値の座るキーが無いので value は結果に射影されない — 射影しないと明示宣言した通りの動作であり、
`dd` への `export_key` (inert) や常時充足要素への `required` (vacuous) と同じ「無意味だが無害な宣言」
の線に従う。誤解への気づかせは lint の領分。

### 7. schema 変更は無い

`schema/wire.schema.json` は `commands` の要素を `#/$defs/node` として再帰参照しており、`value` は
node 共通属性である。spec 側は最初から合法であり、本 DR が変えるのは**規範の明示と共存規則の追加**だけ
である。乖離していたのは参照実装 (「波及」節)。

## 根拠

### 「command = スコープ」は実装の都合であって、利用者の見ている形ではない

利用者が書く `version` サブコマンドは「名乗ったら版が答え」であり、そこにフィールドの入れ物を要求する
理由は無い。スコープを作る要素は他にもある (名前付き or / seq) のだから、command だけが値を持てない
制約は語彙の非対称でしかない。

### 排他は「1 セル 1 値」の帰結であって、新しい禁止ではない

§2 は新しい検査軸を持ち込んでいない。DR-120 §4 が既に定めた占有 / 非占有の線をそのまま使い、
占有子が 1 つでも居れば kv 射影が確定するので value と席を争う、というだけである。判定に必要な情報は
すべて宣言層 (DR-120 §5 の検査面) に揃っており、検査の時点も面も既存の definition-error 検査と同じで
よい。

## 波及

### fixture

- `fixtures/command-scope/value-command.json` (新規) — 選択時に値が親キーへ座る / 未選択は `null` /
  `default` 由来の value 持ち command / スコープを名乗る兄弟 command との併存
- `fixtures/definition-error/command-value-occupying-child.json` (新規) — 値持ち command に占有子
  (通常要素 / 子 command) を置く形が `invalid-range`
- `fixtures/command-scope/value-command-non-occupying-children.json` (新規) — 非占有子 (`type: "none"` /
  `dd`) との共存が合法で、結果は値のまま
- `fixtures/definition-error/command-carrier-default-fn-unknown-vocab-invalid-range.json` (新規) —
  §5 の帰結として command 担体の default 席にも element 系の検査が効く (同一席の `default` +
  `default_fn` 二重宣言と Sentinel `default` が `invalid-range`、registry に無い fn 名が
  `unknown-vocab`)

### 実装 (参照実装の乖離)

参照実装 (kuu.mbt) の `CommandDef` は `{name, body, export_key}` で値の担体を持たず、`dec_command` の
`allowed_keys` に `value` / `default` / `default_fn` が無いため、値持ち command を含む定義は decode 段で
reject される。本 DR の fixture は実装が追随するまで通らない。issue
`docs/issue/2026-08-12-command-value-carrier.md` を参照。

## 採用しなかった案

### command node の `value` を definition-error にする (CNV-Q1a)

実装の現状 (担体なし) に spec を合わせる案。schema と DESIGN が全 node 位置で `value` を合法として
いるところへ command だけの例外を彫ることになり、「スコープ生成は command 特有ではない」(§1) に反する。
help / version 型の需要を語彙から締め出す見返りも無い。

### value と占有子の共存を許し、value を別のキーへ逃がす

値持ち command の値を `{"version": {"#value": "1.2.3", ...}}` のような予約キーへ入れる案。結果オブジェクトに
kuu 由来の予約キーが現れ、「結果は利用者が宣言したキーだけを持つ」(DR-130 §1) が崩れる。

### 配列 value を合法にする — 担体を accum 化する / 配列 literal を許容する (CVQ-Q1b)

値持ち command が配列を名乗れるようにする案。担体セルを accumulator にするか、単値セルに配列 literal を
そのまま座らせるかのどちらかが要る。**どちらも意味論の追加設計を呼び込む**:

- **accum 化**: `multiple` を宣言していないセルが accumulator になる特例が生まれ、`accum_filters` /
  供給順 / 0 発火の `[]` といった反復系の規則が「宣言していないのに効く」形で付いてくる (DR-102 の
  1 属性 1 registry や DR-044 の uniform array と噛み合わない)
- **配列 literal の許容**: 単値セルの値空間に配列を入れることになり、DR-083 §5 が非 multiple 要素への
  配列 default を静的に倒している線と正面から食い違う。command だけ例外にする理由が無い

配列を返したい需要は、`multiple` を宣言した通常要素を command のスコープ内に置くか、値持ち command を
やめてスコープを名乗る形にすれば既存語彙で書ける。担体を scalar literal に留めるのは、command に
専用の値空間規則を作らないためである。

### 値と kv をマージする

`value` が object のときだけ子の kv と合成する案。値の型で射影規則が変わるうえ、キーの衝突規則を
別途決める羽目になる。§2 の「どちらかを名乗る」は、この分岐自体を作らないための線である。

## 関連

- DR-120 (1 結果スコープ・1 露出キー・1 値セル / §4 占有・非占有の判定表 — 本 DR の排他の根拠)
- DR-130 (結果射影の全列挙、未選択 scope の `null`、sources の `null` 同型)
- DR-122 (sources は result の shadow tree — 値の座のタグ)
- DR-031 (値源ラダー / `value:` = const 席)
- DR-054 (definition-error の kind 列挙と全列挙原則)
