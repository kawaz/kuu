# codex レビュー #4 (DR-107/schema) トリアージ結果

DR-107 (descriptor 直交軸化) 起草直後に依頼した codex レビュー #4 は 2 本に分割して実施した。A は
DR-107 本文への意味論レビュー、B は `schema/descriptor.schema.json` / `schema/builtin-descriptors.json`
の強制力レビュー。以下は全 34 件 (A 17 件、B 17 件) の統括検証済みトリアージ結果と、レビュー原文の
無改変転記。

## トリアージ結果表

| ID | verdict | 対応 |
|---|---|---|
| A-C1 | REJECTED | 対応なし (fallibility の Reject/Error 二分要求は DR-037/kuu.mbt 参照実装の既存設計を誤解した過剰一般化) |
| A-C2 | PARTIAL | io_type/invocation の合成規則を DR-107 §5 に追記。provider 引数名喪失の指摘は VISION §4 射程外として却下 |
| A-C3 | PARTIAL | tty_provider の型近似は DAX-Q3 裁定の既知トレードオフ (対応なし)。value=any の定義域・union/tuple 構文衝突は DR-107 §3 に 1 行追記 |
| A-C4 | CONFIRMED | builtin/tty を fallibility:"reject"、reasons:["not_a_bool"] に修正 |
| A-C5 | PARTIAL | from_entries は既知 issue (2026-07-14-from-entries-nonconforming-input-wire-form) 追跡中。DR-107 §7 に issue 相互参照を追記 |
| A-C6 | CONFIRMED | installer config と factory config のライフサイクル差異を DR-107 §2/§6 に明記 (分離自体は別 issue) |
| A-M1 | CONFIRMED | schema/descriptor.schema.json の強制力強化 (§5 参照) |
| A-M2 | CONFIRMED | domain が io_type から導出可能な冗長フィールドである旨を DR-107 §7 (または §2/§6) に明記 + schema の if/then で一致強制 |
| A-M3 | PARTIAL | colon_args が {name,args} エスケープ形も含む旨を DR-107 §5 に追記。from_entries 3 用法の代表引数問題は A-C5/B-C5 と重複対応 |
| A-M4 | PARTIAL | 「機械可読化する」の文言を DR-107 §5 で「informative な自由記述として転記する (DR-061 §4 の位置づけ継承)」に訂正。構造化 IR 要求は却下 (DR-061 §4 の既定路線を覆す) |
| A-M5 | PARTIAL | accumulator/completer 先行予約は DAX-Q1=b 裁定済み (対応なし)。multiple preset 除外理由を DR-107 §1 に 1 文追記。provider 統合は問題なし |
| A-M6 | PARTIAL | effect フィールドの rename は VE-Q1 裁定待ち (別 commit で対応、本 commit ではしない)。preserve の型不変量は schema の if/then で強制。第 4 象限許容は裁定済み (対応なし) |
| A-M7 | PARTIAL | name の2種の識別子規則は provider name を enum 固定することで実質解消 (B-Maj7 と共通対応)。owns={name} 導出規則は既に schema 記述済みで却下。collection key と name の一致義務は envelope schema + lint で対応 |
| A-M8 | PARTIAL | migration 文の訂正 (factory は enclosing registry で分岐) を DR-107 §1 に反映。schema versioning 要求は DR-068 のドラフト期方針を覆すため却下 |
| A-M9 | CONFIRMED | config を config_parameter_spec 共有形式に統一 (schema + builtin-descriptors.json 書き換え) |
| A-M10 | CONFIRMED | parameter.type が呼び出し先文脈依存でありうる旨を DR-107 §5 に注記として追記 (schema 変更は不要、decode 規則自体の変更ではない) |
| A-M11 | CONFIRMED | envelope schema 新設 + lint-descriptors task |
| B-C1 | CONFIRMED | descriptor root に unevaluatedProperties 相当の締め (config 内のみ自由) |
| B-C2 | CONFIRMED | construction⇔config 連動を role 非依存の allOf で強制 |
| B-C3 | CONFIRMED | fallibility⇔reasons cardinality 制約を if/then で追加 |
| B-C4 | CONFIRMED | domain⟺io_type.input の array ラップ整合を if/then で強制 (A-M2 と共通対応) |
| B-C5 | CONFIRMED | A-C5/A-M3 と共通対応 (from_entries は issue 追跡、descriptor 側の表現力向上はスコープ外) |
| B-C6 | CONFIRMED | A-C4 と共通対応 (builtin/tty 修正で解消) |
| B-Maj1 | CONFIRMED | accumulator/completer の allOf/if-then 分岐を新設 (owns/observes 禁止のみ、他軸は非制約) |
| B-Maj2 | CONFIRMED | encoding=none⇒parameters 空、parameter.name に minLength+pattern 追加 |
| B-Maj3 | PARTIAL | A-M4 と同根 (対応: 文言訂正のみ、構造化 IR は却下) |
| B-Maj4 | CONFIRMED | A-M9 と共通対応 (config_parameter_spec 導入) |
| B-Maj5 | PARTIAL | A-C3 と同根 (対応なし、DAX-Q3 裁定済みトレードオフ) |
| B-Maj6 | CONFIRMED | A-M11 と共通対応 (envelope schema + lint) |
| B-Maj7 | CONFIRMED | provider name を enum ["env_provider","config_provider","tty_provider"] に固定 |
| B-Min1 | CONFIRMED | reasons/owns/observes/value_type union に uniqueItems 追加 |
| B-Min2 | CONFIRMED | parameter.name に minLength:1 + name と同 pattern 追加 |
| B-Min3 | CONFIRMED | 「oneOf 分岐」表記を「role 条件分岐 (allOf+if/then)」に統一 |
| B-Min4 | CONFIRMED | DR-106 Superseded 節を superseded/retained で構造的に分離 |

**却下 (対応なし) の裁定根拠**: A-C1 は既存設計の誤解と実機裏取りで判定。A-C3/B-Maj5 (型体系の粗さ)、
A-M5 の accumulator/completer 先行予約、A-M6 の第 4 象限許容、A-M4/B-Maj3 の constraint 構造化 IR、
A-M8 の schema versioning は、いずれも DAX-Q1〜Q7 で既に裁定済みか、DR-061/DR-068 等の既存 DR が
確定させた設計判断の再蒸し返しであり、新たな構造的根拠が示されていないため却下。`effect` の rename
(A-M6 の語彙衝突指摘) は VE-Q1 として `docs/QUESTIONS.md` に登録済みで裁定待ち — 本トリアージでは
対応を保留し、裁定後に別コミットで反映する。

---

## レビュー原文 A (DR-107 本文レビュー)

## 総評

**判定: Request changes。現状のまま多言語可搬性の基盤として正本化するのは不可。**

`kind` の混線を `role` / `construction` に分解し、`signature` を `effect` / `fallibility` に分ける方向自体は妥当です。しかし、現在の案は**分類軸を直交化しただけで、言語間で共有できる callable ABI を定義できていません**。

特に、次の反例だけで「descriptor から interface / struct / mock を一意生成できる」という中心主張が崩れます。

- `tty_provider` は本来 enum 入力・固定 record 出力なのに、descriptor 上は `string → map<string, any> | null`
- `builtin/tty` は type parser ではなく bool ベースの preset factory であり、実効的には bool parse が失敗しうるのに `total`
- filter の失敗は現役仕様上 `Reject` と `Error` が別なのに、`fallibility:"reject"` しかない
- `unique` / `unwrap_single` / `from_entries` は型変数間の関係を失って `value` に退化
- provider は実行時引数を取るのに `invocation.encoding:"none"`、`parameters:[]`
- `constraint` は自由文であり、definition-time 検査を機械生成できない

したがって必要なのは、フィールド追加ではなく、最低でも次の4層の分離です。

1. **identity / registry binding**
2. **factory construction**
3. **runtime callable signature / outcome**
4. **wire invocation encoding**

指定どおり、descriptor の実装 conformance 昇格と default lexical-scope 借用構想は再指摘していません。

---

## Critical

### C-1. `fallibility` が現役仕様の `Reject` / `Error` 二分を消している

- **根拠:** DR-107 §4、§7、DR-037 §「filter は Reject と Error を区別する」、DESIGN §8.1–8.2
- **問題:**
  `total | reject` では、「静かに枝を脱落させる Reject」と「全体失敗時に保持・表示される Error」を区別できません。DR-037 はこの差が経路選択結果を変えると明記しています。
  また、`reasons` が Reject 用なのか Error 用なのかも不明です。独自 filter が入力によって Reject と Error の両方を返す場合も表現不能です。`Result<T, Reason>` だけを生成しても、reason を保持すべきか捨てるべきか決まりません。
- **修正要求:**
  `fallibility` を撤回し、抽象 outcome を明示してください。例えば:
  - `success`
  - `reject` — reason の有無・集合
  - `error` — reason 集合
  少なくとも `may_reject` と `may_error` を独立に持たせ、各 `reason` の disposition を機械判定可能にしてください。`reject` を全 role 共通の「失敗一般」の意味で流用してはいけません。

### C-2. `invocation` が runtime ABI と wire encoding を混同している

- **根拠:** DR-107 §3、§5、§6、例 (4)
- **問題:**
  `invocation` は実際には filter DSL や `multiple` における**wire 上の束縛形式**です。一方、`io_type` は runtime callable の入出力らしきものです。この2つをどう結合して関数型を生成するかが規定されていません。

  典型的な自己矛盾が provider です。

  ```text
  env_provider: (key: string) → string | null
  invocation: { encoding: "none", parameters: [] }
  ```

  `none` は「呼び出し引数なし」ではなく「wire DSL args なし」を意味しています。にもかかわらず名称は `invocation` です。provider の `key` / `path` / `stream` の名前も descriptor の構造上失われています。
- **修正要求:**
  次を別フィールドに分離してください。
  - `call_signature`: runtime 引数、戻り値、outcome
  - `construction`: factory の config と生成結果
  - `wire_binding` または `encoding`: colon DSL、object form、名前参照等
  その上で、filter の値入力、filter invocation args、provider 引数、factory config をどう host interface に写すか、言語非依存の決定表を normative に定義してください。

### C-3. `value_type` は目的である interface / struct 生成に必要な型情報を意図的に捨てている

- **根拠:** DR-107 §3、§6、例 (2)–(4)
- **問題:**
  「struct と literal enum を description に逃がす」は、本 DR の中心目的と正面衝突します。`tty_provider` から生成できるのは意図した

  ```text
  Stream -> TtyObservation?
  ```

  ではなく、せいぜい

  ```text
  String -> Map<String, Any>?
  ```

  です。これは interface/struct 生成ではなく untyped adapter 生成です。

  さらに不足しています。

  - `integer` がなく、`builtin/int_parser` の出力が `number` に潰れる
  - tuple がなく、`from_entries` の `[K,V]` を表せない
  - record がなく、`{terminal, cygwin}` を表せない
  - literal/enum がなく、stream 3値を表せない
  - 型変数がなく、`unique: T[] → T[]` の同一性を表せない
  - `unwrap_single` の入出力関係を表せない
  - `value = any` が JSON Value なのか host native object まで含むのか未定義
  - bare JSON array を union に使っているため、将来 tuple と衝突する
- **修正要求:**
  最低でも tagged な型代数を導入してください。

  - `integer` と `number` の分離。固定幅は不要
  - `literal`
  - `union`
  - `tuple`
  - `record` — required/optional/additional fields
  - `array`
  - `map`
  - `var` と型変数制約
  - named type / type reference
  - closed recursive `json_value`

  enum/record を「値域制約」と一括して filter の領分へ追い出す主張は撤回すべきです。これらは callable の静的型そのものです。

### C-4. `type_parser` への再分類が `builtin/tty` で破綻している

- **根拠:** DR-107 §1、§7、DR-099 §1–§4、`schema/builtin-descriptors.json` の `builtin/tty`
- **問題:**
  `builtin/tty` は parser 実装ではなく、bool を土台に default 解決規則を追加する**preset type factory**です。DR-099 が明示しています。

  現 descriptor は `String → bool`、`fallibility:"total"`、`reasons:[]` ですが、素の bool と同じ CLI/env parse を行う以上、不正 bool 文字列では `not_a_bool` が発生しえます。

  ここで解釈が二択になり、どちらも破綻します。

  1. descriptor が生成物の実効シグネチャを表す
     → `total` は虚偽
  2. descriptor がその factory 自身の追加寄与だけを表す
     → `io_type: String → bool` は実効 interface ではなく、VISION §4 の生成に使えない
- **修正要求:**
  descriptor が何を記述するのかを固定してください。
  - factory 自体
  - factory が生成する type preset
  - preset の実効 parser
  - 他 descriptor への差分・委譲
  を混同してはいけません。`type_parser` ではなく `type_preset` / `type_factory` 等への再分類を検討し、委譲先と実効 reasons を合成する規則を定義してください。

### C-5. collector 全体の `fallibility:"total"` const 化は根拠不足で、`from_entries` と衝突する

- **根拠:** DR-107 §4、§7、例 (2)、DR-044 §2、issue `from-entries-nonconforming-input-wire-form`
- **問題:**
  DR-105 の「現存する構造畳み装置は全員 total」という観測を、collector role の存在論的不変量へ昇格しています。しかし `from_entries` は次の入力に対する挙動が未確定です。

  - 1要素 entry
  - 指名フィールド欠落
  - 非 string key
  - 重複 key
  - key 昇格後の空 object

  しかも descriptor の入力型は `{array: value}` なので、これらの不適合入力を型で排除できません。total と宣言するなら、全入力に対する決定的出力が先に必要です。
- **修正要求:**
  - collector role 全体の `total` const を外す
  - `from_entries` の入力型を tuple/record/union で精密化する
  - 静的排除できない失敗は `reject` / `error` と reasons に載せる
  - 本件の既知 issue 解決前に role-wide invariant を固定しない
  のいずれか、または組合せを要求します。

### C-6. `config` が異なるライフサイクルを再び一つに混線させている

- **根拠:** DR-107 §2、§5、§7、§8、DR-061 §1・§3–§5
- **問題:**
  同じ `config` が少なくとも2種類の別物を表しています。

  1. installer が AST の階層 config から読む所有キー
  2. configurable factory を構築する definition/registration-time config

  これは scope、束縛時点、未知キー検査、default の適用時点、生成コードの配置が全部異なります。`construction` を追加したのに、最も重要な lifecycle 軸が `config` 内に残っています。

  また provider はホストから差し替え注入される装置なのに「固定実装」の意味で `static` とされており、`static` の説明も正確ではありません。
- **修正要求:**
  少なくとも以下を分離してください。

  - `factory_config`
  - `owned_ast_config` または `observed_config_keys`
  - `call_args`
  - 必要なら `registration_mode: instance | factory`

  各々について、束縛時点・validator・default・生成先 struct を定義してください。`static` は `instance` / `direct` 等、実際の意味に合わせて改名すべきです。

---

## Major

### M-1. §7 のマトリクスと実際の Schema が一致していない

- **根拠:** DR-107 §2、§7、`schema/descriptor.schema.json` の `$defs.descriptor/allOf`
- **問題:**
  現行 Schema は、DR が不変量として主張する次の不正 descriptor を受理します。

  - `role:"filter", construction:"factory"` なのに `config` なし
  - collector が `construction:"factory"`
  - collector に `config`
  - `fallibility:"total"` なのに非空 `reasons`
  - `fallibility:"reject"` なのに空 `reasons`
  - `encoding:"none"` なのに非空 `parameters`
  - `domain` と `io_type.input` の明白な矛盾
  - accumulator/completer に任意の既知フィールド全部
  - typo を含む未知フィールド。`additionalProperties:true`

  「Schema で強制することが目的」と書きながら、主要な関係制約が実装されていません。
- **修正要求:**
  role × construction の全合法組合せを列挙し、`if/then` で以下を強制してください。

  - factory ⇒ factory config 必須
  - config の許可 scope
  - total ⇒ reasons 空
  - reject/error ⇒ reasons 規則
  - none ⇒ parameters 空
  - provider ⇒ reasons 空
  - 全 role の必須・禁止フィールド
  - `unevaluatedProperties:false`
  拡張余地が必要なら、無制限 open ではなく namespaced extension point を設けてください。

### M-2. `domain` は `io_type` と直交しておらず、実際には registry lane を表している

- **根拠:** DR-107 §3、§7、DR-106 明確化 (a)(b)
- **問題:**
  `domain:"scalar"|"array"` は JSON 値型ではなく、「scalar filter registry lane か ARRAY filter registry lane か」を表しています。配列値そのものを一つの scalar cell として処理する custom filter は理論上あり得るため、`domain:"scalar"` と `io_type.input:{array:T}` は必ずしも矛盾ではありません。

  したがって、`domain` を「入力 carrier」と呼びつつ `io_type` にも array を持たせる現在の説明は二重化か誤分類です。
- **修正要求:**
  `domain` を `lane` / `seat` / `registry_class` 等へ改名し、値の shape と registry lookup lane を明確に分離してください。不要なら `io_type` から導出するのではなく、registry target フィールドへ吸収してください。

### M-3. `invocation.encoding` が実際の wire 形を正しく表現していない

- **根拠:** DR-107 §5、DESIGN §8.4、DR-044 §2
- **問題:**
  filter は colon DSL だけでなく、colon を含む引数用の object 詳細形 `{name,args}` も既に持ちます。したがって `role:"filter"` で `colon_args` const は事実と違います。

  また `from_entries` は次の3 alternatives を持つのに、

  - 引数なし
  - `{key, value}`
  - `{key}`

  descriptor は `key?` 一個の flat parameter list に退化しています。「代表引数」は callable schema ではありません。
- **修正要求:**
  - logical argument style
  - wire encoding の複数形
  - shorthand と canonical form
  - overload / tagged union / mutually exclusive fields
  を別々に表現してください。`encodings` は単数 const でなく集合になり得ます。

### M-4. 自由文 `constraint` を「機械可読化」と呼んではいけない

- **根拠:** DR-107 §5、§8
- **問題:**
  `constraint: "min <= max は definition-time..."` は人間可読な注記であり、機械可読な制約ではありません。型生成はできても validation stub、error kind、inclusive bound、整数限定を生成できません。
- **修正要求:**
  次のような structured constraint IR を定義してください。

  - `minimum` / `maximum`
  - `integer`
  - `enum`
  - `relation: {op:"<=", left:"min", right:"max"}`
  - `inclusive`
  - `decode`
  - 違反時の definition-error kind

  それをしない場合は「機械可読化」「lint が読む」「validation stub 生成」の主張を削除し、informative description に格下げしてください。

### M-5. role 集合の選定基準が一貫していない

- **根拠:** DR-107 §1、§7、DESIGN §13.1、DR-036
- **問題:**
  「宣言される registry 住人」が対象なら、現存する `multiple` registry の preset 住人が欠けています。一方で実例も profile もない `accumulator` / `completer` は先行予約されています。

  さらに accumulator は既に現存 registry なのに「descriptor 実例なし」を理由に profile 未定、provider は単一スロット3種を一つの role に束ねています。分類基準が「registry 区分」「実行時 callable role」「将来予定」の間で揺れています。
- **修正要求:**
  現役 registry 全数を棚卸しし、descriptor 対象・対象外の基準を明記してください。profile 未定の role は:
  - enum から外す
  - または schema 上で使用禁止にする
  のどちらかにすべきです。意味未定の値を許可しても将来非破壊にはなりません。

### M-6. `effect` の意味論と不変量が不足し、既存の「effect」語彙とも衝突する

- **根拠:** DR-107 §4、DR-045
- **問題:**
  `preserve` なら少なくとも次を定義する必要があります。

  - input/output 型は同じか
  - 成功時に同じ値を返すのか
  - 同一性か値等価か
  - generated interface の戻り値は unit か input 型か

  純粋 filter で `preserve + total` を許すなら、観測上は恒等写像です。「構造上排除する理由がない」ではなく、意味上冗長です。隠れた副作用があるなら filter の純粋性と衝突します。

  また kuu では `effect` が既に cell operation descriptor の語として使われています。
- **修正要求:**
  `effect` を `result_mode` / `value_effect` 等へ改名し、preserve の型・値不変量と生成 ABI を定義してください。`preserve+total` は禁止するか、明示的な identity として正規化規則を設けてください。

### M-7. canonical identity、registry target、ownership の関係が未定義

- **根拠:** DR-107 §1、§6、§7、DR-106 との関係、DR-094
- **問題:**
  `name` は bare 名を許し、bare は builtin ns の糖衣です。一方 provider の `env_provider` は registry entry 名ではなく単一 slot 名です。この2種類を同じ identifier 規則に載せています。

  また filter/collector では `owns` を禁止しつつ、保持するとした DR-106 明確化 (b) は registry の owns 集合で lookup すると述べています。`name` から `owns={name}` を導く規則が normative に書かれていません。
- **修正要求:**
  次を明示してください。

  - canonical fully-qualified descriptor ID
  - registry 区分または slot target
  - bare 名の正規化時点
  - provider slot と namespaced registry entry の違い
  - filter/collector/type の derived ownership 規則
  - collection key と descriptor ID の一致義務

### M-8. 破壊的 rename に versioning と正確な migration 規則がない

- **根拠:** DR-107 §1、DR-106 との関係、Superseded 追記
- **問題:**
  `kind:"factory"` の migration は機械的ではありません。新 enum に `factory` はなく、旧 descriptor 単体からは生成物の role を決められません。現 corpus では enclosing registry が `types` だから `type_parser` と判断できるだけです。

  また `kind` / `signature` 版と `role` / `effect` / `fallibility` 版を外部 importer が識別する version 選択機構がありません。
- **修正要求:**
  - descriptor schema version を定義
  - 旧→新 migration table に「enclosing registry が必要」を明記
  - 変換不能時の扱いを規定
  - DR-106 冒頭に `status: superseded` 相当を置く
  - supersede 範囲と保持範囲を節単位で列挙
  してください。

### M-9. config schema が `value_type` と別の未定義方言になっている

- **根拠:** DR-107 §2、§5、例 (3)、`schema/builtin-descriptors.json`
- **問題:**
  invocation では `bool` / `{array:T}` を使う一方、config の実例は `boolean` / `{type:"array",items:"string"}` という JSON Schema 風の別方言です。しかも descriptor schema は config 値を完全に自由 JSON としています。

  これでは generator が config struct の型・required・enum・default を安定して読めません。
- **修正要求:**
  `parameter_spec` を共通定義し、factory config と invocation args の双方で同じ `value_type`、required、default、constraint 語彙を使用してください。default の型適合も検証対象にしてください。

### M-10. colon DSL 引数の lexical decode 規則が足りない

- **根拠:** DR-107 §5、例 (1)、DESIGN §8.4
- **問題:**
  colon DSL の実体は全て string ですが、descriptor の parameter type は `number` です。これは wire type なのか decode 後 type なのか不明です。

  特に `in_range` の「対象型の canonical number」は、利用先の type factory とその config に依存します。filter descriptor 単体では、int、float、number 方言のどの parser で bound を読むか決まりません。
- **修正要求:**
  parameter ごとに lexical type と semantic type、decoder/reference を分けてください。利用先 type に依存するなら型変数または call-site binding として明示し、standalone descriptor だけで検査可能という主張を修正してください。

### M-11. builtin descriptor 集合自体を Schema で検証する形がない

- **根拠:** DR-107 波及、`schema/descriptor.schema.json`、`schema/builtin-descriptors.json`
- **問題:**
  `descriptor.schema.json` は単一 descriptor を検証しますが、`builtin-descriptors.json` は `filters/types/providers` の独自 envelope を持ち、`"$schema-ref"` は標準 JSON Schema の参照ではありません。現状の gate は REFERENCE の語彙 lint だけです。

  これは実装 conformance 昇格とは別問題で、正本 JSON 自体の構文整合性の問題です。
- **修正要求:**
  collection 用 schema を追加し、全 entry を descriptor schema に通してください。加えて以下を lint してください。

  - map key と descriptor.name の一致
  - canonical ID 重複
  - registry 区分と role の合法組合せ
  - bare/canonical 名の重複

### M-12. 波及範囲が不足し、現役文書が旧体系のまま残っている

- **根拠:** DR-107 波及、VISION §4、PIPELINE §4、DESIGN §13.1
- **問題:**
  本 DR の直接の動機である VISION §4 が、依然として `installer / factory / filter / collector` と `signature: Validate|Transform` を現役記述として持っています。PIPELINE も descriptor が `signature` を宣言すると書き、DESIGN §13.1 も旧4軸の説明です。

  波及節に VISION / PIPELINE の更新が含まれていないのは重大な抜けです。
- **修正要求:**
  active docs 全体を grep し、少なくとも VISION §4、PIPELINE registry 表・IO 表、DESIGN §13.1・用語集を更新してください。旧 DR 内の歴史記述は残してよいですが、必要なら更新 note を付けてください。

---

## Minor

### m-1. §1 の旧値 migration 説明が事実誤認

- **根拠:** DR-107 §1
- **問題:**
  「`installer`/`factory`/`filter`/`collector` はそのまま `role` の値になる」とありますが、`factory` は role enum に存在しません。
- **修正要求:**
  「installer/filter/collector は直接 map、factory は enclosing registry と生成物 role に基づき `role + construction:"factory"` へ分解」と書き直してください。

### m-2. type parser の参照先節番号が誤っている

- **根拠:** DR-107 §1
- **問題:**
  `builtin/number_parser` 等が「§6 に移る」とありますが、§6 は provider 3種の節です。
- **修正要求:**
  正しい節への参照に直すか、migration table を独立節として設けてください。

### m-3. 「oneOf 分岐」と実体の `allOf + if/then` が不一致

- **根拠:** DR-107 §7、`schema/descriptor.schema.json`
- **問題:**
  概念上の排他分岐を指しているにしても、Schema 技術用語としては誤解を招きます。
- **修正要求:**
  DR 側を「role 条件分岐」に修正するか、実際に `oneOf` profile schema へ再構成してください。

### m-4. Superseded 追記の配置と文言が曖昧

- **根拠:** DR-106 Superseded 追記
- **問題:**
  ファイル末尾で「以下は覆された」と書く構造では、DR 全体の status が先に分かりません。また「現役仕様の理解には不要」としつつ明確化 (a)(b) は保持すると書いており、読者への指示が矛盾します。
- **修正要求:**
  DR-106 冒頭に superseded banner を置き、次のように明示してください。

  - superseded: kind/domain/signature の宣言形
  - retained: registry lookup の明確化 (a)(b)
  - replaced by: DR-107 の該当節

---

**結論:** 軸分離の方向は採用可能ですが、DR-107 はまだ「descriptor のメタデータ整理」であって、「多言語間で interface / struct / mock を生成できる signature AST」には達していません。少なくとも C-1〜C-6 を解消し、抽象 callable ABI・型代数・失敗 outcome・construction lifecycle を normative に固定してから採択すべきです。

---

## レビュー原文 B (schema/descriptor.schema.json + schema/builtin-descriptors.json レビュー)

## 総評

軸分解の方向自体は妥当です。しかし現状は「直交軸を独立フィールドにした」段階で止まっており、**軸間の不変条件と role 別の合法な組合せを Schema が閉じていません**。そのため、散文上は矛盾する descriptor が大量に Schema を通ります。

辛口に言えば、現状は人間向けカタログとしては読めますが、掲げている以下の用途にはまだ耐えません。

- typo 検出
- role 別の必須・禁止フィールド強制
- descriptor 単体からの interface / mock 生成
- definition-time 検査の機械駆動
- `fallibility` / `reasons` の整合検証

代表 9 件では `in_range` / `regex_match` / `unique` / `length_range` / `unwrap_single` / `number_parser` / `env_provider` は局所的には概ね整合しています。一方、**`from_entries` は意図的に不完全な宣言、`builtin/tty` は descriptor の意味論境界そのものが破綻**しています。

## Critical

1. **ルートの `additionalProperties: true` が typo 検出という目的を破壊している**

   旧フィールドや誤記が無警告で残ります。例えば次は installer descriptor として通ります。

   ```json
   {
     "name": "x",
     "role": "installer",
     "construction": "static",
     "reasons": [],
     "kind": "filter",
     "signature": "Validate",
     "falliblity": "reject"
   }
   ```

   `kind` / `signature` は移行漏れ、`falliblity` は typo ですが、すべて未知プロパティとして受理されます。「分岐を Schema で強制することが目的」「typo 検出」という説明と正面衝突しています。

   descriptor 本体は `additionalProperties: false` または `unevaluatedProperties: false` に閉じるべきです。自由形を許すのは `config` の内部だけで十分です。

2. **`construction` と `config` の不変条件が実装されていない**

   `construction:"factory"` の説明は「`config` が必須」と断言していますが、Schema はそれを強制しません。

   - `filter + factory` で `config` なしが通る
   - `installer + factory` で `config` なしが通る
   - `collector + factory` も通る
   - 逆に `type_parser + static` が通るのに `config` は無条件必須
   - collector に `config` を付けても通る

   これは configurable filter を第一級化したという中核目的の未実装です。特に collector について config 禁止を意図するなら `construction:"static"` も固定しないと、`factory` なのに構築情報を持てない descriptor が成立します。

   role × construction ごとに少なくとも次を明示すべきです。

   - factory なら config 必須
   - static で config を許す role と禁止する role
   - collector/type_parser で static/factory の双方を本当に許すのか
   - installer の config は「factory 構築引数」なのか「static installer が読む ambient config」なのか

3. **`fallibility` と `reasons` が完全に切断されている**

   散文では「reasons が空か非空かが機械的判定根拠」とありますが、以下がすべて通ります。

   ```json
   {"fallibility": "total",  "reasons": ["oops"]}
   {"fallibility": "reject", "reasons": []}
   ```

   collector は `fallibility:"total"` に固定されても非空 reasons を持てます。provider も fallibility を禁止されながら非空 reasons を持てます。

   少なくとも次が必要です。

   - `total` → `reasons.maxItems = 0`
   - `reject` → `reasons.minItems = 1`
   - provider → `reasons.maxItems = 0`
   - fallibility を持たない他 role で reasons が何を意味するかを明文化

   このままでは `fallibility` は単なる自己申告であり、reason enum のコード生成も信用できません。

4. **`domain` / `io_type` / `effect` の間に整合制約がない**

   以下のような構造的矛盾が通ります。

   - collector なのに `io_type.input:"string"`
   - `domain:"array"` なのに入力が `"number"`
   - `effect:"preserve"` なのに `string → number`
   - type_parser なのに入力が `"bool"`
   - array filter なのに入出力が scalar

   特に `effect:"preserve"` は「同じ値を返す」という意味なので、少なくとも output は input と互換でなければなりません。現在は完全に非交差な型でも通ります。

   直交軸とは「互いに無関係」という意味ではありません。独立に記述できても、導出される不変条件は必要です。標準 JSON Schema だけで再帰型同士の等価・部分型判定を行うのが難しいなら、次のいずれかが必要です。

   - preserve 用には型を一つだけ書き、output を導出する
   - role/domain ごとに `io_type` の形を分ける
   - Schema 外の明示的な semantic lint を設ける

5. **`from_entries` の宣言が、自ら不完全だと認めている**

   説明されている呼び出しは次の 3 形です。

   - 引数なし
   - `{key, value}`
   - `{key}`

   しかし descriptor は optional な `key` 一つしか宣言せず、`value` を欠いています。しかも description 内で「1 用法の代表」「簡略化」と認めています。

   これは invocation 軸の導入目的である「descriptor 単体から interface/mock を生成する」に対する明白な違反です。生成される interface は実装の受理形と一致しません。

   `parameters` の平坦配列ではなく、例えば次のような variant/`oneOf` を表現できる invocation 型が必要です。

   ```text
   none
   | { key: string }
   | { key: string, value: string }
   ```

   外部の FromEntries spec に依存させるなら、少なくとも機械可読な `$ref` 相当が必要であり、description に逃がすべきではありません。

6. **`builtin/tty` の `fallibility:"total"` は散文と両立しない**

   descriptor は次を同時に主張しています。

   - `io_type: string → bool`
   - parse は `builtin/bool_parser` と同一経路
   - `fallibility:"total"`
   - `reasons:[]`

   bool parser と同じ経路なら、canonical bool 語彙外の文字列は `not_a_bool` で reject しうるはずです。「reason は bool_parser 側に帰属する」は self-description の説明になっていません。`builtin/tty` を選んだ利用者から見た**推移的な失敗可能性**は消えないからです。

   逆に descriptor が tty 固有の default 解決だけを説明しているなら、`role:"type_parser"` と `string → bool` が間違っています。TTY preset の本質である provider 観測・fold・宣言 default fallback が `io_type` に全く現れません。

   必要なのは次のどちらかです。

   - `builtin/tty` を rejectable とし、推移的 reasons に `not_a_bool` を含める
   - `type_preset` 等の別 role と、`uses/delegates_to: builtin/bool_parser` のような合成関係を導入し、local/transitive fallibility を区別する

   現状は「registry 住人全体」と「内部の一部分」のどちらを descriptor が説明するのかが不定です。

## Major

1. **`accumulator` / `completer` を enum に入れたまま分岐を設けないのは、将来予約ではなく現在の穴**

   両 role は共通必須 4 項目だけで成立し、`domain` / `io_type` / `effect` / `fallibility` / `invocation` / `owns` / `observes` を任意の組合せで持てます。

   「将来 enum 追加を避ける」ために、現在意味の定まらない descriptor を valid にするのは本末転倒です。特に role 表では owns/observes 禁止とされているのに Schema は許しています。

   仕様が決まるまでは enum から外すか、少なくとも現時点で許す最小形を branch で閉じるべきです。

2. **`invocation.encoding` ごとの形状制約がない**

   `encoding:"none"` でも非空 parameters が通ります。

   ```json
   {
     "encoding": "none",
     "parameters": [
       {"name": "impossible", "type": "string", "required": true}
     ]
   }
   ```

   そのほかにも次を許します。

   - 空文字の parameter name
   - 同名 parameter の重複
   - colon_args で optional parameter の後に required parameter
   - `required:true` と `default` の併記
   - object_args の相互依存・排他的 variant を表現できない

   少なくとも `none` は `parameters.maxItems:0`、parameter 名は非空識別子、名前の一意性は semantic lint が必要です。

3. **M-18 の「機械化」を名乗りながら、重要部分が自由記述のまま**

   `length_range` の「非負整数」、`min <= max`、inclusive、error kind はすべて `constraint` の文章です。Schema/生成器が読めるのは `type:"number"` と required だけなので、例えば `1.5` を型上は合法と判断します。

   `regex_match` の compile 可否や dialect も同様です。

   これは「注記として収録」なら問題ありませんが、「definition-time 検査を機械駆動」「validation stub 生成」とは言えません。少なくとも以下は構造化候補です。

   - integer / nonnegative
   - minimum / maximum / inclusive
   - parameter 間関係
   - definition-error kind
   - pattern dialect / compile policy

4. **`config` が未定義の疑似スキーマ言語になっている**

   builtin は以下のような構造を使っています。

   ```json
   {"type":"array","items":"string","default":["_"]}
   {"type":"string","enum":["stdin","stdout"],"required":true}
   ```

   しかし `config` の値は完全自由で、`type` / `items` / `enum` / `required` の文法も型も定義されていません。`required:"yes"`、`enum:42`、型に合わない default も通ります。

   特に `tty_stream.required:true` は実質的に規範情報として使われているのに、その意味論を Schema が一切認識していません。型ヒントを portable codegen/lint に使うなら、`config_parameter` の meta-schema が必要です。使わないなら、コード生成可能という主張を下げるべきです。

5. **`value_type` は正確な interface 生成には粗すぎる**

   意図的簡略化とはいえ、以下を表せません。

   - record/struct のフィールド
   - literal enum
   - tuple
   - integer と一般 number の差
   - 制約付き union
   - provider の入力値域

   したがって tty_provider のような型は、正確な

   ```text
   ("stdin" | "stdout" | "stderr")
     → {terminal: bool, cygwin: bool} | null
   ```

   ではなく、`string → Map<String, Any>|null` にしかなりません。これは「型付き mock 生成」ではなく「粗い ABI skeleton 生成」です。どちらを保証する仕様なのかを明確にすべきです。

6. **提示された builtin の aggregate 形を、この Schema で直接検証できない**

   descriptor schema のルートは単一 descriptor ですが、builtin JSON のルートは `filters/types/providers` の map です。そのまま validator に渡せば descriptor として不適合です。

   外部 runner が全 leaf に個別適用する前提なら、その手続き自体が規範・CI になっている必要があります。そうでなければ「各エントリは schema に適合する」は単なるコメントです。

   また aggregate レベルでは次も未検証です。

   - map key と descriptor の `name` の一致
   - `types` 配下が `role:"type_parser"` であること
   - `providers` 配下が `role:"provider"` であること
   - 同名 descriptor の重複
   - provider 3 スロットの完備性

   専用の `builtin-descriptors.schema.json` と、key/name 一致用の semantic lint が必要です。

7. **provider が「固定 3 スロット」という説明に対して開きすぎている**

   role の説明では provider は `env_provider/config_provider/tty_provider` の 3 スロットですが、Schema は任意の名前・任意の io_type を許します。例えば `env_provider: bool → number` でも通ります。

   provider role を拡張可能にしたいなら「3 スロット限定」という説明が誤りです。固定スロットなら builtin aggregate 側で name ごとの signature を条件分岐させるべきです。

## Minor

1. **集合として扱う配列に `uniqueItems` がない**

   `reasons`、`owns`、`observes`、union 型で重複を許します。

   ```json
   ["too_small", "too_small"]
   ["string", "string"]
   ["value", "string"]
   ```

   特に `["value","string"]` は意味的に冗長です。union は flatten・重複排除・`value` 吸収などの canonicalization 規則が必要です。

2. **識別子制約が一貫していない**

   `name` と reason には pattern がありますが、以下は任意文字列です。

   - `invocation.parameters[].name`
   - `owns[]`
   - `observes[]`
   - config の property name

   空文字列や空白入り識別子も通ります。少なくとも `minLength:1` と、語彙種別ごとの命名 pattern が必要です。

3. **説明は `oneOf` 分岐と呼ぶが、実装は `allOf + if/then`**

   現状の role 必須条件下では機能上大きな問題はありませんが、設計文書と実装の用語がずれています。レビュー時に「排他的 branch がある」と誤読させるため修正した方がよいです。

4. **「禁止」と「通常省略」が混在しており規範強度が曖昧**

   例えば config は collector には「通常出現しない」と書かれる一方、role matrix の意図は「禁止」です。owns/observes も「installer 以外では省略可」という説明ですが、実際には複数 role で明示禁止されています。

   descriptor の説明では `MUST NOT` 相当の禁止と、単なる慣例を明確に分けるべきです。
