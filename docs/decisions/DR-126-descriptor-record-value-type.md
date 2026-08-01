# DR-126: descriptor value-type 体系への record 型追加 — closed record、フィールド型は kuu type 参照、presence-optional、宣言との乖離は Error

> 由来: kawaz チャット裁定 2026-07-31 (ccmsg r98 mid=2〜7) および 2026-08-01 (mid=21/22)、正本は
> `docs/research/2026-07-28-link-fixed-path-dsl-design.md` §4b と
> `docs/research/2026-07-31-type-input-structure-splice.md` §2c (フィールド型 = type 参照、
> 型導出の正本は out.record)。発端は「type パーサが descriptor で
> 構造も宣言できる方向に寄れば、棚上げしていた (link 固定パスの) 定義時解決ができるのでは」という指摘。
> DR-107 §3 が「固定フィールドを持つ struct 型は本体系では正確に表現できず map<string,value> で近似する」と
> 明記した部分の精密化にあたる。record は補完・help・言語バインディングの型導出にも独立に効くため、
> link 固定パス DSL の DR とは分離して起草する (§4b の「新規の裁定不要事項」)。

## 決定

### 1. `value_type` に `record` を追加する

DR-107 §3 の再帰体系に、固定フィールドを持つ object 型を第一級で追加する:

```
value_type :=
    "string" | "number" | "bool" | "null" | "value"
  | { "array": value_type }
  | { "map": value_type }                                  // map<string, T> (キーは常に string)
  | { "record": { <field_name>: <type 参照>, ... } }        // 本 DR で追加
  | [value_type, value_type, ...]                          // union (2 要素以上)
```

**フィールドの型は kuu の type 参照で書く** (kawaz 裁定 2026-08-01)。`{"record": {"since": "timestamp",
"until": "timestamp"}}` のように、`type` registry / `definitions.types` の住人を DR-094 の ns 付き識別子
(bare 名は builtin ns の糖衣) で指す。**解決は registry 空間のみ** — 使用側 definition の
`definitions.types` には shadow されない (kawaz 裁定 2026-08-01 SPL-Q3=a)。descriptor は registry の
住人であり、その意味が使用側定義の書き方で変わってはならない (型同一性の保証)。wire の `type:` 属性
(使用側解決文脈 definitions → registry = DR-035) とは解決空間が違う点に注意しつつ、綴りの鍵空間としては
同じ鍵空間であり (DR-032「type は型参照」)、record は「このフィールドはどの kuu 型か」を名乗る。

`"number"` / `"string"` / `"bool"` をフィールドに書けるのは、これらが**組み込みで提供される普通の
registry type** だからであって、value-type primitive の綴りがそのまま通っているからではない。record の
フィールド位置に特別扱いの語彙は無い — bool と string しか使わない定義から number 型を tree-shaking で
落としても、その定義は動くべきである。

この体系には 2 つの語彙が並ぶ。**value_type** は「JSON としてどう表現されるか」を語る軸で、
`io_type` の primitive / `array` / `map` / union / record タグの宣言に使う。**type 参照**は「kuu の型
レジストリの住人」を指す軸で、record のフィールドだけがこちらを使う。record 自身は value_type の一員の
ままなので、`{"array": {"record": {...}}}` のように value_type の内側へネストできる。フィールド側の
入れ子構造は、参照先 type の out が record / array / map であることによって生じる (下記の再帰導出)。

**型は依存グラフを成す。** `timerange` の record が `timestamp` を参照するなら、`timestamp` が型
レジストリに解決できない descriptor で `timerange` は使えない — 未登録の type 参照は unknown-vocab 系の
definition-error である (filter 名未登録を静的 reject する DR-101 と同型)。wire の `type:` 属性が
未解決時に warn + string フォールバックへ倒す (DR-028、ユーザ定義の前方互換) のとは扱いが異なる —
record のフィールドは型を名乗る側の宣言であり、解決できない参照を string と読み替えると名乗りが
別の型を語ることになる。

**このグラフは非循環でなければならない。** record フィールドの type 参照は DR-067 の参照層が検査する
type edge に含まれ、自己参照 (`Node.out = {"record": {"next": "Node"}}`) を含む循環は definition-error
`circular-ref` である。再帰型は v1 では許さない — JSON 形の再帰導出 (§1) と codegen が有限で止まることを
単純に保つためである。

**JSON 形は再帰導出する。** record を読む消費者 (codegen / lint / 言語バインディング) は、各フィールドの
type の `out` を再帰的に辿って JSON 形を得る (`timestamp` → `number`)。したがって record の JSON 形を
知るには registry 解決が前提になる。descriptor を持たない未知 ns の type に当たった消費者は、その
フィールドを `value` に縮退して読み進めるのが自然な逃げ道である (縮退は消費者側の読みの話であって、
その descriptor を解決すべき kuu 実装にとって未登録参照が definition-error であることは変わらない)。

フィールド 0 個の record (`{"record": {}}`) は「常に `{}`」という完全に定まった型であり構文上は合法。
記法上 map / array と同じく object タグ形なので、DR-107 §3 が指摘した bare array union 記法と将来の
tuple 型の構文衝突とは無関係 (tuple は本 DR の射程外、DR-107 の射程外扱いのまま)。

**これは定義域の拡張ではなく精密化である。** DR-107 §3 の「JSON 表現可能な型のみを扱う」閉域は不変で、
record が指す値集合は `{"map": "value"}` の部分集合にすぎない。固定幅整数を持たない (`number` が
int/float 双方の精密化元、値域制約は filter の領分) という DR-107 §3 の裁定も不変 — record が精密化するのは
**構造**であって値域ではない。

### 2. record は closed — キー語彙が閉じている

宣言に無いキーは、その record 型の値として現れてはならない。open record (宣言キーは保証するが未宣言キーの
併存を許す形) は採らない。

理由は**リフレクションを持たない言語での struct 直訳の保証**である。closed であれば descriptor から
生成した struct / class / record 型がその値を余さず受けられる。open だと「宣言外キーをどこへ入れるか」の
受け皿 (逃がし用の map フィールド) を全言語の生成物が常に持つことになり、直訳が壊れる。

アプリ内部型そのものを持ち込む必要はない — type パーサが名乗るのは JSON 表現までで、アプリ固有型への
翻訳はアプリ側の関心 (DR-107 §3 の「ネイティブオブジェクトへの変換は各言語パーサ実装の自由」が不変)。

### 3. フィールドは presence-optional、`null` は使わない

kuu の値空間に `null` は無い (DR-051 §4)。したがって record の「値が無いフィールド」は
ゼロ値 `{"since": null, "until": null}` ではなく、**器 `{}` があり座った座だけキーが立つ**形で表す
(`{"until": "2026-01-01"}`)。DR-051 §1 の absent = キー無しがそのまま record の内側へ降りる。

**closed はキー語彙の閉域であって全フィールド必須ではない。** 「どのキーが現れうるか」は宣言で閉じ、
「そのキーが現に立っているか」は値ごとに変わる。この 2 つは別の軸である。

言語バインディングの型導出 (DR-051 §3) は record の内側にも同じ形で降りる — 常に立つと保証できない
フィールドは `T?` に落ちる。**値セルの型導出の正本は `io_type.output` の record 宣言だけである**
(kawaz 裁定 2026-08-01)。型が入力定義片 (`input_structure`、research 2026-07-31) を持っていても、定義片は
CLI トークンの消費文法を語る入力側の機構であって型導出には関与しない — 定義片 leaf の `required` /
`default` から `T` を導く経路は設けない。したがって record のフィールドは presence-optional のまま、
型導出では全フィールドが `T?` になる。

「このフィールドは実際には常に立つ」を機械可読に主張する手段は v1 に持たない。実態の注記が要るなら
`description` の領分である。

### 4. 宣言と実産出の乖離は Error であって Reject ではない

type パーサが返した値が自身の record 宣言と食い違う場合、それは Error (DR-037) として扱う。
presence-optional (§3) の帰結として乖離は 2 種に精密化される:

| 乖離 | 扱い |
|---|---|
| (a) 宣言に無いキーが値に存在する | Error |
| (b) 宣言済みキーの値が**フィールドの type が名乗る `out`** と合わない | Error |
| (c) 宣言済みキーが値に存在しない | **正常** (§3 の presence-optional) |

分界文 (本 DR が置く規範):

> **「入力 → 値」の失敗は Reject、「返した値 vs 自己宣言」の矛盾は Error。**
> 前者はユーザの世界の話で、入力を変えれば回避できる (`--serve foo` が `not_a_number` で
> その枝から落ち、他の解釈が試される — DR-037 の Reject そのもの)。後者は実装者の世界の話で、
> ユーザがどう入力しても回避できない。回避不能な失敗を Reject にすると、
> 「バックトラックの末に全解釈が静かに消えて、原因の分からないパース失敗だけが残る」ことになる。

(a)/(b) は descriptor が「実装挙動を変えない宣言」である (DR-061 §4「descriptor は validator ではない」)
という位置づけと矛盾しない — 宣言が実挙動を変えるのではなく、**宣言と実挙動が食い違ったこと自体が
実装の不具合として報告される**。検査は規範である (乖離を検出したら Error)。ただし conformance fixture は
壊れた builtin parser を注入できないため、この Error の pin は実装側テスト (wbtest 等) の領分になる。

本節の乖離検査は type パーサに限らず、**io_type (または invocation.parameters / config の型注釈) に
record を名乗る registry 住人一般** (provider / filter / cell_fns / collector) に適用する。Reject 機構を
持たない住人 (provider は reasons / fallibility を使わない、DR-107 §6) でも Error 側は共通に存在する
(config_provider の committed パス読込失敗 = Error の前例と同型)。分界文の Reject 側はその住人が
Reject 機構を持つ場合にのみ意味を持つ。

Error は kuu の失敗意味論どおり held-error の扱いに従う (path-search/held-errors 系) — 他の解釈枝が
成立すればそちらが選ばれる。§「根拠」の「バグ報告」動機が直接効くのは全枝不成立の場面だが、
Reject と違い Error は保持されて failure report に原因として現れるので、偽装 (ユーザ入力の失敗への
見せかけ) は起きない。

### 5. record で書けないものは従来どおり近似して実行時に倒す

キー語彙が実行時にしか決まらない object (ユーザ入力由来のキー、外部データの生 JSON 等) は
`{"map": "value"}` / `"value"` で宣言する。これは従来どおりで、record の追加は近似の道を塞がない。
record を名乗った以上は §2/§4 の義務が生じる、というだけの関係である。

## 根拠

### 近似が「意図的な簡略化」でいられたのは、読み手が人間だけだった間

DR-107 §3 は struct の map 近似を「値域制約と同様、構造の精密化は型宣言の外」という原則の帰結として
正当化し、フィールド構成は `description` に注記することにした (実例: `tty_provider` の
`{terminal: bool, cygwin: bool}`)。この扱いは descriptor の読み手が人間である限り成立する。

しかし descriptor は VISION §4 の生成フロー (import 先で interface / モックを生成する) と
DR-109 の型導出の入力でもある。散文注記は機械が読めないので、生成物は `map<string, value>` で止まり、
構造を知っている人間が手で書き足すことになる。「構造の精密化は型宣言の外」を貫くなら、
構造を必要とする消費者に対して descriptor は常に情報不足になる。record はこの穴を、
値域制約の原則 (filter の領分) に一切触れずに塞ぐ。

### 静的化の前提として構造宣言が要る

link 固定パス DSL (`link: "timerange.since"`) の第 2 相 — 値空間残余の解決 — は、
値の内部構造が実行時にしか分からない前提では実行時解決にしかできない。record 宣言があれば
「そのパスがそのフィールドに当たるか」は定義時に決まり、`absent-ref` 系の definition-error へ昇格できる
(research §4b「Q1 の確定形」)。同じ理屈が補完 (どのフィールドが存在しうるか) と help にも効く。
record は link path DR の従属物ではなく、複数の消費者を持つ独立した機能である。

### closed / presence-optional / Error は 1 つの姿勢の 3 面

3 つの裁定はいずれも「type パーサは自分が返す値の形を名乗り、名乗った内容に責任を持つ」という
同じ姿勢から出ている。closed でなければ名乗りは値を尽くさず (直訳できない)、
null ゼロ値を使えば名乗りが kuu の値空間 (DR-051) と別の空間を語り、
乖離を Reject にすれば名乗り違反がユーザ側の失敗として偽装される。

## 波及

- **DR-107**: §3 に更新注記を追記 (「固定フィールドを持つ struct 型は本体系では正確に表現できず
  `{"map": "value"}` で近似する」を本 DR が覆す)。§6 の provider 例の同旨記述も同じ注記の射程。
  DR-107 の他の裁定 (固定幅なし・`value` の定義域・union 記法・role 条件分岐) は不変
- **value_type の全消費面への開放**: `$defs.value_type` は `io_type` だけでなく
  `invocation.parameters[].type`・factory `config` の型注釈・cell_fns の output-only io_type (DR-114) からも
  共有参照されるため、record はこれら全てで一斉に書けるようになる (意図した帰結 — 体系は 1 つ)
- **schema/descriptor.schema.json**: `$defs.value_type` の `anyOf` に `{"record": {...}}` 分岐を追加。
  フィールド値は value_type への `$ref` ではなく **type 参照の string** (`definitions.types` /
  registry の ns 付き識別子、wire の `type:` と同じパターン) を受ける `additionalProperties` 形になる。
  同 `$defs` の `description` にある「固定フィールドを持つ struct 型は本体系では正確に表現できず
  map<string,value> で近似する (DR-107 §6 の provider 例)」の一文を差し替える。
  参照先の存在検査は Schema では書けない — 未登録参照の definition-error (§1) は参照層の関心である
- **schema/builtin-descriptors.json**: `providers.tty_provider` の `io_type.output` が現在
  `[{"map": "value"}, "null"]` で、DR-099 の `{terminal: bool, cygwin: bool}` を近似している。
  record で正確に書けるようになる (`[{"record": {"terminal": "bool", "cygwin": "bool"}}, "null"]` —
  ここの `"bool"` は組み込み registry type への参照であり、value_type primitive と同綴りなだけである)。
  `config_provider` の `[{"map": "value"}, "null"]` は真に開いた map なので不変

  > **追補 (DR-129 §4、2026-08-01): この record 化は不要になった。** cygwin 観測の削除により
  > `tty_provider` の出力は `["bool", "null"]` の単一 bool になり、近似すべき struct 自体が無くなった。
  > record 型の裁定 (§1〜§5) は link 固定パス DSL の静的化・codegen・help という他の消費者を持つため不変で、
  > `config_provider` の map も不変。builtin descriptor に record の実例が現在いないという事実は、
  > record を宣言した住人が現れたときに §4 の乖離検査と参照解決が効くこととは独立である。
- **docs/DESIGN.md §12b**: tty_provider のシグネチャ記述末尾の「入出力の enum/struct 精密化は io_type の
  型体系の外なので description に注記」が record 導入で成立しなくなる (struct 側のみ。enum 精密化は
  引き続き型体系の外)。§13.1 の descriptor 軸の列挙は軸名を並べるだけで型体系の中身を書いていないため変更不要
- **scripts/lint-descriptors.py**: envelope の JSON Schema 検証は schema 追随で自動的に record を通す。
  semantic 検査のうち `output_mode:"preserve"` ⇒ `io_type.input == io_type.output` の等価判定は
  現在も JSON 構造比較なので record でもそのまま成立する。追加が要るのは record フィールドの type 参照が
  解決するかの検査 (§1 の未登録参照 = definition-error に対応する lint 側の検出)
- **docs/REFERENCE.md**: value_type 記法の表は REFERENCE に存在しない (§3 は kuu の `type` カタログ、
  §6 の filter カタログは `role`/`domain`/`output_mode`/`fallibility`/`reasons` 列で `io_type` 列を持たない)。
  記法の正本は本 DR + DR-107 §3 + `schema/descriptor.schema.json` のままで、REFERENCE への追記は
  tty_provider を record 化する編集に伴う注記が要るかの確認に留まる
- **DR-051**: §3 の言語バインディング型導出規則が record の内側にも適用される (§3 の追記対象) —
  フィールドの型は参照先 type の `out` を辿って求め、presence は全フィールド `T?` になる。
  §1/§4 (absent とnull 不在) は本 DR が record 内へ引き継ぐだけで不変
- **link 固定パス DSL (research 2026-07-28 §4b)**: 第 2 相の静的化と器 `{}` の auto-vivify が本 DR の
  record を前提にする。DSL 側の裁定 (Q1 確定形・Q2 の 2 層・vivify で組んだ値が value_parser を通らない
  代償を final_filters が受ける) は**別 DR で起草する** — 本 DR は record 型そのものの規定に閉じる
- **kuu.mbt / kuu-cli**: descriptor の value_type 表現に record を追加する追随 (spec 側 pin 更新後)

## 採用しなかった案

### (a) open record — 宣言キーを保証しつつ未宣言キーの併存を許す

wire 拡張に強く、type パーサが将来フィールドを増やしても宣言が古いまま壊れない。棄却理由は §2 のとおり
リフレクションを持たない言語での struct 直訳が保証できなくなること (kawaz 裁定 mid=4)。
未宣言キーの受け皿を生成物が常に持つ形は、record を導入する目的 (構造をそのまま型にする) を失う。
フィールドを増やしたいときは宣言を増やせばよく、宣言を古いまま使い続けられることは利点ではない。

### (b) フィールドを bare value-type だけで書く (type 参照を許さない)

`{"record": {"since": "number"}}` のようにフィールドも `io_type` と同じ value-type 体系に閉じれば、
record の JSON 形が registry 解決なしで読め、体系が 1 本で済む。棄却理由は 3 つある。

第 1 に、**link 注入時のパースの置き場が失われる**。`link: "tr.until"` の operand は文字列として
座に届き、座る前にパースされる必要がある (DR-127 §3.2)。そのパーサを持つのはフィールドの type であり、
フィールドが「JSON 形」しか名乗らないと、この経路のパースを担う宣言がどこにも無くなる。入口側
(`--until` の `type`) は別のセルの宣言であって、link で直接書かれる座には届かない。

第 2 に、**型依存を表現できない**。`timerange` が `timestamp` に依存するという事実が descriptor から
消え、「このフィールドは timestamp である」は `description` の散文に戻る。record を導入した目的
(構造を機械可読にする) が半分残されたままになる。

第 3 に、JSON 閉域 (DR-107 §3) の制約は**値**が JSON 表現可能であることの要求であって、フィールドの
**語彙**を value-type に限る要求ではない。type 参照を書いても、その type の `out` を辿って得られる形は
JSON の内側に留まる (§1 の再帰導出)。registry 解決を要求する点は棄却理由にならない — descriptor の
世界では registry 解決は既に前提であり (wire の `type:` / `filter` / `accumulator` すべてが名前参照)、
descriptor を持たない未知 ns の type は消費者側で `value` に縮退できる。

### (c) 値の無いフィールドを `null` のゼロ値で埋める

`{"since": null, "until": null}` の器を常に返す形なら、全フィールドが常に立つので消費者側の presence 判定が
不要になり、closed record と「全フィールド必須」が一致して型導出も単純になる。棄却理由は DR-051 違反 —
kuu の値空間に `null` は無く、「値が無い」を in-band の null で表現しないという規定が record の内側だけ
例外になる。結果オブジェクトの外側は absent、record の内側は null、という二重規範は消費者に
2 つの欠落表現の扱いを強いる。

## 関連

- DR-107 §3/§6 (descriptor の直交軸化・`io_type` の値型体系 — 本 DR が §3 の struct 近似規定を精密化)
- DR-051 (absent / null — §1 の absent 意味論が record の内側へ降り、§4 が (c) の棄却根拠)
- DR-037 (filter の Reject / Error — §4 の分界文が本 DR の乖離扱いの上位規範)
- DR-061 §4 (descriptor は validator ではない — §4 の位置づけとの整合)
- DR-094 (registry 語彙の namespace — §1 の record フィールドが指す type 参照の識別子体系)
- DR-032 (ref/link は name 参照、type は型参照 — フィールドの型参照が乗る鍵空間)
- DR-099 / DESIGN §12b (tty_provider の `{terminal, cygwin}` — 近似が record で解消される実例)
- docs/research/2026-07-28-link-fixed-path-dsl-design.md §4b (裁定の正本、link path 側の波及)
- docs/research/2026-07-31-type-input-structure-splice.md §2c (フィールド型 = type 参照・型依存グラフ・
  型導出の正本が out.record である裁定の正本)
- DR-127 §3.2 (link 注入時のパースをフィールドの type が担う — (b) 棄却の第 1 理由の行き先)
