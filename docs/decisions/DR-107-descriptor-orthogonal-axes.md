# DR-107: descriptor の直交軸化 — role / construction / io_type / effect / fallibility / invocation

> 由来: DAX-Q1〜Q7 裁定バッチ (kawaz 2026-07-15、`docs/QUESTIONS.md` 経由) の実施。
> `docs/findings/2026-07-15-descriptor-axes-design-recon.md` (以下「本 findings」) が
> 比較した 3 案 (直交軸分離 / invocation 最小差分 / pieceProcessor 相中心) のうち
> 「案 A + case-by-case scale-down」を骨格として採用し、`schema/descriptor.schema.json` /
> `schema/builtin-descriptors.json` を全面改訂する。直接の駆動源は
> `docs/issue/2026-07-14-descriptor-schema-declaration-axis-separation.md`
> (docs/VISION.md §4 の可搬性要件による動機格上げ) と codex レビュー #3 の A-M1/A-M3/A-M4
> (`docs/findings/2026-07-14-codex-review3-dr106-conformance.md`、DR-106 明確化 (c) が
> 限界のみ明記し未解決のまま残していた論点)。

## 決定

### 1. `kind` → `role` へ rename、初期集合は 7 値 (DAX-Q1=b, DAX-Q7=a)

`kind` フィールドを `role` に rename する。旧値との対応は `installer`/`filter`/`collector` は直接 map、`factory` は enclosing registry (`filters` か `types` か) と生成物の役割に基づき `role + construction:"factory"` へ分解する (旧 descriptor 単体からは判別できず、`filters` 配下なら `role:"filter"`、`types` 配下なら `role:"type_parser"` — 現 corpus はいずれも enclosing registry から一意に決まる、codex レビュー #4 A-M8 の反映)。初期 enum は builtin 実装済みの役割に加え、将来 completers registry 実体化 (本 issue の駆動源) 時の enum 拡張手続きを省くため広めに宣言する:

```
role: "installer" | "filter" | "collector" | "type_parser" | "accumulator" | "completer" | "provider"
```

- `installer` / `filter` / `collector`: DR-042/DESIGN §8/DR-036 の既存役割 (rename のみ、意味論不変)
- `type_parser`: 旧 `kind:"factory"` のうち configurable factory で型 (`types` registry) を構築する住人。`builtin/number_parser` 等 4 種がここに移る (§6)
- `accumulator` / `completer`: `accumulators`/`completers` registry 住人の役割。**本 DR では実例を収載しない** (現行 builtin にこれらの descriptor 実体が無い — accumulators registry の属性セットは DR-036 の散文記述のまま、completers の具体実体化は別 issue、本 findings §「本 findings が扱わない」の射程外)。enum に載せるのは将来追加時の非破壊性のためで、role 条件分岐 (§7) は最小限に留める
- `provider`: 新設。`env_provider` / `config_provider` / `tty_provider` (DESIGN §12/§12b/§14.3、DR-049/DR-050/DR-099) の 3 種を本 DR で新規収載する (§6)。`matcher` (DR-042) 等の内部装置は role に載せない — descriptor 体系は「宣言される registry 住人」を対象とし、評価器内部の実装装置は対象外 ([[default-convergence-guard]] のスコープ)。`multiple` registry の preset 住人 (append/merge/set/map 等) も role 対象外 — これらは他 registry (accumulator 名 + collector 名 + separator) への参照バンドルであり、独自実装者がホスト言語で実装しうる runtime callable ABI を持たない (role 軸の対象は独立実装者が host 言語で実装しうる runtime callable ABI を持つ住人、DR-036 の参照バンドル構造がその対象外である根拠)

installer / factory / filter / collector を「役割」に純化し、旧 `kind:"factory"` が「役割 (filter/type_parser/…) × 構築方式 (static/factory)」の 2 軸を 1 値に混線させていた問題 (本 findings A-M1) を解消する。

### 2. `construction` 新設 — 2 値 (DAX-Q2=a)

```
construction: "static" | "factory"
```

- `static`: registry に固定実装として登録される住人 (builtin filter の大半、collector 2 種、provider 3 種)
- `factory`: `name + config → 実装` で構築される住人 (DR-061 §3 の configurable factory)。`config` フィールドが必須になる (§7)

`derived` (DR-062 の filter inherit 想定の派生構築) は予約しない — 要件が実体化していない段階での事前予約は [[default-convergence-guard]] の「将来仮定的要件のために今の複雑さを増やしていないか」に抵触する。必要になれば追記でよい (issue `default-lexical-scope-borrow` が関連する代替構想の記録先)。

これにより「filter × factory」(configurable filter) が role と construction の直積として第一級に表現できるようになる — 旧 `kind` enum では `filter` と `factory` が排他的な値だったため表現不能だった (本 findings A-M1)。

`config` フィールド (§7) が指す installer の config (DR-061 §1、AST の階層 config から要素ごとに読む所有キー、`schema/wire.schema.json` の node の properties に直接乗る) と、`construction:"factory"` の config (DR-061 §3、`name + config → 実装` を definitions 領域の named singleton として構築する configurable factory の構築引数) は、束縛スコープ (element-local vs named-definition) とライフサイクル (要素ごと vs 定義 1 回) が異なる別物である (codex レビュー #4 A-C6 の反映)。両者を descriptor 上で構造的に分離すること自体は本 DR の射程外 (`construction` 軸の新設は static/factory の分離のみを扱う) — 分離が必要になった場合は別途 issue で扱う。

### 3. `io_type` 新設 — JSON 表現可能な値型の再帰体系 (DAX-Q3=a + 型体系裁定)

```
io_type: { input: <value_type>, output: <value_type> }

value_type :=
    "string" | "number" | "bool" | "null" | "value"      // value = any
  | { "array": value_type }                                // array<T>
  | { "map": value_type }                                   // map<string, T> (キーは常に string)
  | [value_type, value_type, ...]                           // union (2 要素以上)
```

**値域は `int`/`uint`/`u8`/`u64` 等の固定幅を持たない** (kawaz 裁定、統括推し): `number` は int/float 双方の精密化元であり、DR-075「int の値域は実装定義」との衝突を避ける。幅制約・値域制約は filter の領分 (`in_range`/`length_range` 等) であって型宣言の領分ではない — この切り分けは DR-075 の「value_parser は構文、値域検査は filter」の原則を descriptor の型軸にも一様適用したものである。ネイティブオブジェクト/クラスへの変換は各言語パーサ実装の自由 (パーサ外)。

union (`[T1, T2, ...]`) は主に「値が無い」を表す `null` との組合せに使う (provider の `T | null` 返却、§6)。固定フィールドを持つ struct 型 (例: tty_provider の `{terminal: bool, cygwin: bool}`) は本体系では正確に表現できない — `{"map": "value"}` (map<string, value>) で近似し、フィールド構成は `description` に注記する (§6 で明記)。これは値域制約と同様「構造の精密化は型宣言の外」という原則の帰結であり、意図的な簡略化である (codex レビュー #4 A-C3/B-Maj5 が指摘する record/tuple/literal-enum/型変数の不足は、この裁定を再確認しただけで新規欠陥ではない)。

`value = "value"` の定義域は JSON value 全体 (kuu Value 相当の string/number/bool/null/array/object) であり、host native object は含まない — パーサ実装が host 言語のネイティブ型へ変換するのは実装の自由 (§ 上記) だが、`value_type` 自身が指す定義域は常に JSON 表現可能な範囲に閉じる。union の bare array 記法 (`[value_type, ...]`) は、将来 tuple 型を導入する場合に構文が衝突しうる (`["string", "number"]` が union か 2 要素 tuple か構文上曖昧になる) — 本 DR の射程では tuple 型を導入しないため現時点で衝突は発生しないが、将来 tuple 導入時は union を `{"union": [...]}` 等のタグ付き形へ移行する必要がある (射程外、上記「射程外」節に追記)。

VISION §4 の生成フロー (独自 filter の descriptor から import 先で interface/モックを生成する) がこの軸を必要とする根拠は本 findings §「VISION §4 の生成フローが要求する情報の内訳」に詳しい — 入出力の値型が descriptor に無いと「string を渡すのか value を渡すのか」を追加情報無しに決められない。

### 4. `signature` を `effect` + `fallibility` に分解 (DAX-Q4=a)

```
effect: "preserve" | "transform"        // 入力を変えずに検証するか、新しい値を計算するか
fallibility: "total" | "reject"         // 常に成功するか、reject しうるか
```

旧 `signature` (`Validate`/`Transform`) は「入力保持 × 失敗可否」の複合軸で、2 象限 (`Validate` = preserve+reject、`Transform` = transform+total) しか名前を持たず「変換しつつ reject しうる」第 3 象限を表現できなかった (DR-106 明確化 (c) が指摘し未解決のまま残した限界)。2 独立フィールドへの分解により全 4 象限が表現可能になる — 第 4 象限 (preserve+total、「何もしない filter」相当) も禁止しない (無意味に見えるが構造上排除する理由がない)。

旧値との機械マップ: `Validate` → `preserve` + `reject`、`Transform` → `transform` + `total`。既存 builtin 13 は全て 2 象限のいずれかに属し、マップは 1:1 で曖昧性がない。

`fallibility:"reject"` は「この住人が呼び出し時に失敗しうるか」という descriptor 単体で決まる唯一の軸を表す。DR-037 が規定する Reject (静かに枝を脱落) / Error (全体失敗時に保持・表示) の二分は、filter descriptor 側の宣言事項ではなく、AST 評価時の枝解決 (or の兄弟枝の成否によってどちらに実現するかが決まる、DR-037「解けた枝の数」規則) に委ねられる — kuu.mbt 参照実装は単一 `Result[Value, (String, String)]` チャンネルのみを持ち、Reject/Error 用の別チャンネルを持たない (`Held` が両方の DR-037 outcome を realize する)。したがって `fallibility` は Reject/Error の manifestation を区別する軸ではなく、区別する必要もない (codex レビュー #4 A-C1、REJECTED — 既存設計の誤解に基づく過剰一般化)。

`effect:"preserve"` は入力値をそのまま返す (成功時に同じ値を返す) ことを意味し、`io_type.input == io_type.output` を伴う — この不変量は §7 の role 別マトリクスで Schema の if/then により強制する (codex レビュー #4 A-M6(2)/B-C4 の反映、JSON Schema の再帰型比較の限界により厳密な型等価の強制はできないため、`io_type.input`/`io_type.output` の value_type 表現が構造的に一致することを検査する semantic lint の対象と位置づける)。

`role:"collector"` は本 DR §7 の role 条件分岐により `effect:"transform"` + `fallibility:"total"` に固定される (DR-105 §4「filter 席は fallible 優勢、構造畳み装置 (accumulator/collector) は total」の勢力図の descriptor 上での機械的強制)。

### 5. `invocation` 新設 — 呼び出し形の宣言化 (DAX-Q5=a)

```
invocation: {
  encoding: "colon_args" | "object_args" | "none",
  parameters: [
    { name: string, type: <value_type>, required: bool,
      constraint?: string, description?: string, default?: <any> }
  ]
}
```

- `colon_args`: filter chain の colon-DSL (`"in_range:1:65535"`、DR-009)。`role:"filter"` で固定。DESIGN §8.4 が持つコロンを含む値の JSON エスケープ形 (`{"name": "complex_validator", "args": ["abc", "with:colon"]}`) も同一の呼び出し規約 (位置引数を string のまま registry 側でキャストする) の JSON 表現違いであり、`colon_args` はこの両方の wire リテラル (文字列 DSL / `{name,args}` オブジェクト形) を含む (codex レビュー #4 A-M3 の反映)
- `object_args`: `multiple.collector` の宣言 (プリセット名または `{accumulator, collector, separator}` のオブジェクト形) から導出される object 形引数 (DR-036/DR-044)。`role:"collector"` で固定
- `none`: 直接引数を取らない (installer は wire 語彙経由の呼び出し、type_parser/provider は名前参照のみで DSL args を持たない)。`role:"type_parser"`/`role:"provider"` で固定

実呼び出しシグネチャは `io_type.input` (第 1 引数の値) と `invocation.parameters` (`fn(value: io_type.input, ...invocation.parameters 宣言順)`) を合成して得る。戻り値は `fallibility` に応じて `T` (total、`T` は `io_type.output`) または `Result<T, reason>` (reject、`reason` は `reasons` の要素) になる (codex レビュー #4 A-C2(1) の反映、provider 引数名の喪失に関する付随指摘は VISION §4 が「独自フィルタ (registry 拡張住人)」限定でありスコープ外、A-C2(2) 却下)。

`invocation.parameters[].type` は decode 後の意味論型 (semantic type) を表す — colon-DSL の実引数は wire 上すべて string (DR-009) であり、`type:"number"` はその decode 後の型に過ぎない。実際の decode 規則 (どの number 方言でパースするか) は呼び出し先の文脈 (対象 type factory とその config) に依存しうる — 例えば `in_range` の bound は「対象型の canonical number」(DR-105 §5(a)) であり、同じ `in_range` descriptor でも適用対象が int 型フィールドか float 型フィールドかで decode 規則が変わりうる。本 DR は standalone descriptor だけで decode が完結するとは主張しない (codex レビュー #4 A-M10 の反映)。

`parameters` の `constraint` は自由記述の informative フィールド (DR-061 §4「型注釈は任意、書けば lint が読む」の路線を踏襲、強制検証はしない)。

**DR-105 §5 明確化との対応**: `length_range`/`in_range` の DSL 引数検査規則 (「共通規則: ちょうど 2 個・definition-time 検査・型不一致は kind=invalid-argument・`min > max` は kind=invalid-range・境界は inclusive」「個別規則: `length_range` は非負整数限定、`in_range` は対象型の canonical number」) は、この `invocation.parameters` 宣言の `constraint` フィールドに **informative な自由記述として転記する** (DR-061 §4「型注釈は任意、書けば lint が読む。強制検証はしない」の位置づけをそのまま継承する — codex レビュー #4 A-M4/B-Maj3 の反映、「機械可読化する」という旧文言は構造化 IR による強制検証を含意し過ぎていたため訂正)。DR-105 §5 が確立した definition-time 検査の**規則そのもの**は不変 — 本 DR は宣言軸を追加するのみで、検査の実施箇所やタイミングを変更しない。

`from_entries` の `invocation.parameters` (§6/§7 の該当エントリ) は 3 用法 (無引数 / `{key,value}` / `{key}`、DR-044 §2) のうち 1 用法の代表引数を宣言したものであり、3 用法の完全な表現ではない。この不完全さと関連する不適合入力 (単一要素 entry・指名フィールド欠落・非 string key・重複 key 等) の決定的な変換結果の pin は `docs/issue/2026-07-14-from-entries-nonconforming-input-wire-form.md` が既に追跡している (codex レビュー #4 A-C5/B-C5/A-M3(b) の反映、新規欠陥ではなく既知・追跡中の未解決事項)。

### 6. provider 3 種の descriptor 新規収載

DESIGN §12/§12b/§14.3 が散文で定義していた 3 provider のシグネチャを `role:"provider"` の descriptor として機械可読化する:

| provider | 散文シグネチャ (DESIGN 該当節) | io_type |
|---|---|---|
| `env_provider` | `(key: string) → string \| null` (§12) | `{ input: "string", output: ["string", "null"] }` |
| `config_provider` | `(path: string) → object \| null` (パス→JSON 同型階層オブジェクト、§14.3、DR-050) | `{ input: "string", output: [{"map": "value"}, "null"] }` |
| `tty_provider` | `(stream: "stdin"\|"stdout"\|"stderr") → {terminal: bool, cygwin: bool} \| null` (§12b、DR-099) | `{ input: "string", output: [{"map": "value"}, "null"] }` |

`tty_provider` の入力は本来 3 値 enum (`"stdin"|"stdout"|"stderr"`) だが、`io_type` の値語彙にリテラル enum 制約を表現する手段がない (§3 の型体系は値域を持たない) ため `"string"` で近似し、`description` に許容値を明記する。出力の固定フィールド struct (`{terminal, cygwin}`) も同様に `{"map": "value"}` で近似する。

3 provider はいずれも `construction:"static"` (registry の単一スロットに固定実装として登録される、DESIGN §12/§12b/§14.3)、`invocation:{encoding:"none", parameters:[]}` (呼び出しは評価器内部のランタイム参照であり wire 上の DSL args を持たない)、`reasons:[]` (`null` 返却は「情報なし」であって filter の reject/reason 機構とは別の意味論 — provider の失敗可能性は `io_type.output` の union に `null` を含めることで表現し、`reasons`/`fallibility` 軸は使わない、§7)。

`role:"provider"` の `name` は上記 3 スロット名 (`env_provider`/`config_provider`/`tty_provider`) の閉じた集合に固定される (Schema 上も `enum` で強制、codex レビュー #4 B-Maj7 の反映) — provider は拡張可能な registry ではなく、DESIGN §12/§12b/§14.3 が定義する固定 3 スロットの機械可読化である。`schema/builtin-descriptors.json` の JSON key (`filters.<name>`/`types.<name>`/`providers.<name>`) は descriptor 自身の `name` フィールドと常に一致しなければならない (§7 の envelope schema + lint で強制)。

### 7. role 別の宣言軸マトリクス (Schema の role 条件分岐で強制)

`descriptor.schema.json` は旧 `kind` 別 role 条件分岐 (DR-106、codex レビュー #3 A-C1 の「分岐を Schema で強制することが Schema の目的そのもの」) を継承し、`role` 別に必須・禁止フィールドを拡張する。分岐の実装は `allOf` + `if`/`then` (排他的な `oneOf` ではない — role 間の重複を許さない前提が既に `role` フィールド自体の `const` 一致で保証されるため、`if`/`then` で十分。codex レビュー #4 B-Min3 の反映、旧文言「oneOf 分岐」は本節を含め本 DR 全体で「role 条件分岐」に統一する):

| role | domain | io_type | effect | fallibility | invocation | owns/observes | config | 備考 |
|---|---|---|---|---|---|---|---|---|
| `filter` | 必須 (scalar\|array 自由、io_type.input のラップ有無と一致) | 必須 | 必須 | 必須 | 必須 (`colon_args` 固定) | 禁止 | `construction:factory` なら必須、`static` なら禁止 | |
| `collector` | 必須 (`array` 固定、io_type.input も常に array ラップ) | 必須 | 必須 (`transform` 固定) | 必須 (`total` 固定) | 必須 (`object_args` 固定、`construction:static` 固定) | 禁止 | 禁止 | DR-105 §4 の勢力図を Schema で強制。construction は static 固定 (config 常時禁止の帰結、codex レビュー #4 A-M1) |
| `type_parser` | 禁止 | 必須 (`io_type.input` は `string` 固定) | 必須 (`transform` 固定) | 必須 (自由: total/reject) | 必須 (`none` 固定) | 禁止 | `construction:factory` なら必須、`static` なら禁止 (旧版は construction 非依存で無条件必須だった、codex レビュー #4 B-C2) | parse 相 (String→T) は失敗しうる |
| `provider` | 禁止 | 必須 | 禁止 | 禁止 | 必須 (`none` 固定、`construction:static` 固定) | 禁止 | 禁止 | `null` 返却は `io_type.output` の union で表現。`name` は 3 スロット名の閉じた enum (codex レビュー #4 B-Maj7)。`reasons` は常に空 |
| `installer` | 禁止 | 禁止 | 禁止 | 禁止 | 禁止 | 任意 | 任意 | DR-061 §1 の宣言軸のまま不変 |
| `accumulator` / `completer` | — | — | — | — | — | 禁止 | — | 実例なし、owns/observes 禁止のみ role 条件分岐で強制、他軸は未確定のまま非制約 (将来 issue で具体化、codex レビュー #4 B-Maj1 の反映 — 「共通軸のみ強制」で owns/observes すら未強制だった穴を埋める) |

`domain:"array"` (collector) と `effect:"transform"`/`fallibility:"total"` (collector) を const 固定するのは、これらが DR-036/DR-044 (collector の入力は常に累積後配列) と DR-105 §4 (構造畳み装置は total) から構造的に導かれる不変量であり、descriptor 単位で書き分ける余地がないため。`provider` の `effect`/`fallibility` 禁止は、`null` 返却が filter の reject/reason 機構と異なる意味論 (§6) であることの Schema 上の反映。

`domain` は `io_type.input` が `{"array": T}` の形かどうかから 100% 導出可能な冗長フィールドである (`filter`/`collector` の全 builtin 実例で `domain:"array"` ⟺ `io_type.input` が array ラップ、という 1:1 対応が例外なく成立する) — `domain` 自身の意味論は「値の shape」ではなく DR-106 明確化 (a) が規定する「registry lane (scalar filter registry か ARRAY filter registry か) との一致義務」であり、`io_type` (値の shape) とは別の軸だが、builtin corpus では両者が常に一致するため Schema の if/then で `domain` ⟺ `io_type.input` の array ラップ有無を強制する (codex レビュー #4 A-M2/B-C4 の反映、§7 の Schema 実装で対応)。

### 8. DR-105 §5・DR-061 §1 との関係 (不変)

- DR-105 §5 の definition-time 検査規則 (`length_range`/`in_range` の DSL 引数検査) は不変 — 本 DR は `invocation.parameters.constraint` として宣言軸に昇格させるのみ (§5)
- DR-061 §1 の installer 4 宣言軸 (`owns`/`observes`/config キー/`reasons`) は不変 — `role:"installer"` の role 条件分岐 (§7) がそのまま維持する
- DR-095 の reasons 宣言集合の正本性 (spec 側が正本、実装は宣言集合の部分集合を emit) は不変 — `role`/`domain`/`io_type`/`effect`/`fallibility`/`invocation` いずれも「実装挙動を変えない宣言」という DR-061 §4「descriptor は validator ではない」の位置づけを継承する

## 4 例 (schema 形の具体化)

### (1) `in_range` — scalar filter、DSL 2 引数

```jsonc
{
  "name": "in_range",
  "role": "filter",
  "construction": "static",
  "domain": "scalar",
  "io_type": { "input": "number", "output": "number" },
  "effect": "preserve",
  "fallibility": "reject",
  "invocation": {
    "encoding": "colon_args",
    "parameters": [
      { "name": "min", "type": "number", "required": true,
        "constraint": "対象型の canonical number、負数・小数に制約なし (DR-105 §5(a))" },
      { "name": "max", "type": "number", "required": true,
        "constraint": "min <= max は definition-time 検査 (kind=invalid-range)、対象型の canonical number (DR-105 §5(a))" }
    ]
  },
  "reasons": ["too_small", "too_large"]
}
```

### (2) `from_entries` — collector、object 形 args

```jsonc
{
  "name": "from_entries",
  "role": "collector",
  "construction": "static",
  "domain": "array",
  "io_type": { "input": { "array": "value" }, "output": { "map": "value" } },
  "effect": "transform",
  "fallibility": "total",
  "invocation": {
    "encoding": "object_args",
    "parameters": [
      { "name": "key", "type": "string", "required": false,
        "description": "key 昇格用のフィールド名 (entries 配列形・指名 2 フィールド形・key 昇格形の 3 用法のうち 1 用法の代表引数、DR-044)" }
    ]
  },
  "reasons": []
}
```

### (3) `app/valid_json` — 仮想の独自 filter (VISION §4 想定ユーザ、第 3 象限の実例)

```jsonc
{
  "name": "app/valid_json",
  "role": "filter",
  "construction": "factory",
  "domain": "scalar",
  "io_type": { "input": "string", "output": "value" },
  "effect": "transform",
  "fallibility": "reject",
  "invocation": { "encoding": "colon_args", "parameters": [] },
  "config": {
    "max_depth": { "type": "number", "default": 32, "description": "パース許容深さ (host 保護)" }
  },
  "reasons": ["invalid_json", "max_depth_exceeded"]
}
```

「変換しつつ reject しうる」第 3 象限 (旧 `signature` では表現不能、§4) の実例。builtin corpus には実在しないが、[[feedback-no-corpus-absence-excuse]] の通り corpus 不在は表現力を削る論拠にならない — VISION §4 が「第 3 象限の filter を書ける独自作者」を想定する以上、descriptor は分離しておくのが正。

### (4) `env_provider` — provider、シグネチャの機械可読化

```jsonc
{
  "name": "env_provider",
  "role": "provider",
  "construction": "static",
  "io_type": { "input": "string", "output": ["string", "null"] },
  "invocation": { "encoding": "none", "parameters": [] },
  "reasons": [],
  "description": "環境変数解決 (DESIGN §12)。key は prefix 連結済みの最終名 (導出は installer 側に閉じる、DR-049)。null=未設定、空文字列は「設定されている」。registry の単一スロット。"
}
```

## DR-106 との関係 (Superseded)

DR-106 の `kind` enum 拡張 (`collector` 追加) と `domain` 軸新設は本 DR に**吸収**される — `kind` は `role` に rename、`domain` は継続するが適用範囲が `filter` 限定から `filter`/`collector` 両方に広がる (findings 案 A、collector の入力は常に累積後配列なので `domain:"array"` 固定)。DR-106 明確化 (c) が「軸の分離は issue `descriptor-schema-declaration-axis-separation` で追跡する」と明記していた課題 (第 3 象限の表現不能) が本 DR §4 で解消される。DR-106 本文には「## Superseded (歴史)」節を追記する (別コミット、DR-106 本体の記述は変更しない)。

DR-106 明確化 (a)(b) (`domain` と registry 登録の一致義務、合法性判定は自 registry の owns 集合のみ) は本 DR の対象外 (`domain` 軸の意味論そのものではなく registry lookup の挙動規定) — 不変のまま `role`/`domain` の新構造にそのまま適用される。

## 採用しなかった案

### 案 B — invocation だけ新設、他は現状維持 (本 findings 案 B)

`kind`/`domain`/`signature` を維持し `invocation` フィールドだけ追加する最小差分案。`in_range`/`from_entries` は書けるが、`app/valid_json` (変換×失敗可能) も configurable filter (filter×factory) も表現できない。DR-106 との関係は追記のみで済み Supersede 不要という利点はあるが、VISION §4 が「中核前提」に格上げされた (issue 動機格上げ、2026-07-14) 現状では、A-M1 (role vs construction 混線) と A-M4 (signature 複合軸) が未解消のまま残り、「型は生成できるが shape だけ」の中途半端な状態になる。将来の破壊的変更を先送りするだけで不採用。

### 案 C — pieceProcessor 相 (phase) 軸中心

`kind` を廃止し、`phase: value_filter | piece_filter | final_filter | accum_filter | collector | parse | install` を軸に立て、型を `signature: {in: T, out: Result<T,Reason>}` のような複合型で直接表現する案。VISION §4 の型生成には最も直接的だが、pieceProcessor の相構造 (DR-034) を descriptor 軸に昇格すると DR-036 の「collectors registry は新設しない、filters namespace で代替」という既存判断と衝突しうる (相を軸に立てると相=namespace という捉え方に近づく)。相の粒度は kuu 内部の実装関心であり、独自 filter 作者 (VISION §4 の想定利用者) が知る必要のない概念オーバーヘッドが生じる。`Result<T,Reason>` のような複合型のシリアライズ規約を独自 filter 作者に強いる点も案 A より concept overhead が大きい。不採用。

### DAX-Q1 の非採用肢

- (a) 最小 4 値 (`installer`/`filter`/`collector`/`type_parser`): completers 実体化時に enum 拡張が要る。本 DR は (b) 広めの 7 値を採用し、この手続きを事前に省いた
- (c) `matcher` 等の内部装置も列挙: 内部装置を descriptor 体系に載せる価値が薄く不採用

### DAX-Q2 の非採用肢

- (b) `static`/`factory`/`derived`: `derived` (DR-062 の filter inherit 想定) は要件が実体化しておらず事前予約は [[default-convergence-guard]] 抵触。issue `default-lexical-scope-borrow` が代替構想の記録先

### DAX-Q3 の非採用肢

- (b) 型を扱わず `domain` のみ維持: 案 B と同型、VISION §4 の生成が型情報不足で完結しない
- (c) 相 (phase) を経由して型を導出: 案 C 相当、概念オーバーヘッド増

### DAX-Q4 の非採用肢

- (b) `signature` を 4 値 enum に拡張: 直交軸の複合 enum 化で DR-106 §「採用しなかった案」の逆パターン、3 本目の軸拡張時に組合せ爆発
- (c) `signature` 維持・第 3 象限は future work: VISION §4 が中核前提の今、future work 送りは v1 スコープからの実質脱落

### DAX-Q5 の非採用肢

- (b)(c) `positional`/`keyword` の追加予約: 要件があるまで追加不要、現存住人 (colon_args/object_args/none) を完全カバー済み

### DAX-Q6 — conformance 昇格は射程外 (先送り)

descriptor 宣言と実装実体の整合を conformance で機械検証する query/profile の新設は、本 DR (schema/builtin 書き換え) の射程外とする。独自 filter の実装ラップが言語 DX で必要になった段階、または多言語展開 (2 言語目) 着手時に再検討する — issue `descriptor-conformance-promotion-revisit` が追跡する。

## 波及

- **schema/descriptor.schema.json**: 全面改訂 (`kind`→`role`、`construction`/`io_type`/`effect`/`fallibility`/`invocation` 新設、role 別条件分岐拡張)
- **schema/builtin-descriptors.json**: 既存 13 住人 (filter 7 + collector 2 + type_parser 4) を新軸へ migration、provider 3 種を新規収載 (計 16 住人)
- **docs/REFERENCE.md**: §6 builtin filter カタログの `kind`/`domain`/`signature` 列を `role`/`domain`/`effect`/`fallibility` に更新 (filter 名一覧そのものは不変、`just lint-reference` はフィールド名を直接検査しないため機械検査への影響なし)
- **docs/DESIGN.md**: §12/§12b/§14.3 の provider 散文定義に「signature の機械可読宣言は descriptor 正本 (本 DR)」の相互参照を追記。散文定義自体 (`(key: string) → string | null` 等) は残す
- **DR-106**: 「## Superseded (歴史)」節を追記 (本体不変)

## 射程外

- descriptor の conformance 昇格 (DAX-Q6、issue `descriptor-conformance-promotion-revisit` が追跡)
- `accumulator`/`completer` role の具体的な宣言軸確定 (実例が無いため owns/observes 禁止以外の条件分岐は設けない、将来 issue)
- kuu.mbt 側の型追随 (`FilterDescriptor`/`ArrayFilterDescriptor`/`CollectorDescriptor`/`FactoryDescriptor` 等の実装型変更、本 findings §「実装影響の見積もり」が既に見積済み — front_door.mbt 完了後の別作業)
- export JSON への descriptor 同梱の wire 形式 (issue `from-entries-nonconforming-input-wire-form` の射程)
- `default` の lexical-scope 借用構想 (issue `default-lexical-scope-borrow`、DAX-Q2 の派生論点)

## 関連

- docs/findings/2026-07-15-descriptor-axes-design-recon.md (3 案比較・DAX-Q 抽出の正本)
- docs/issue/2026-07-14-descriptor-schema-declaration-axis-separation.md (発注書、VISION §4 の動機格上げ)
- docs/VISION.md §4 (独自フィルタの可搬性要件、descriptor によるシグネチャ export 構想)
- docs/DESIGN.md §12 (env_provider シグネチャ)、§12b (tty_provider シグネチャ、DR-099)、§14.3 (config_provider シグネチャ、DR-050)
- DR-061 §1/§3/§5 (registry descriptor の宣言軸の原型 — owns/observes/config/reasons、configurable factory)
- DR-066 §2 (reasons を descriptor の宣言軸に追加した先行 DR)
- DR-094 (registry 語彙の namespace 分離)
- DR-095 (builtin descriptor の reasons 宣言集合の正本性)
- DR-105 §4/§5 (ARRAY filter registry の fallibility 確立 — collector の `total` 固定の根拠、definition-time 検査規則の出所)
- DR-106 (`kind`/`domain` 軸の原型、本 DR が Superseded)
- DR-042 (installer 5 不変則、`role:"installer"` の宣言軸が継承する原則)
- DR-036/DR-044 (collector の入力形、DR-105 §4 の勢力図)
- kuu.mbt `src/core/filters.mbt` L25-54, L392-397 (実装型の軸分離、descriptor 側が後追いした先行例)
- `docs/findings/2026-07-14-codex-review3-dr106-conformance.md` A-M1/A-M3/A-M4 (本 DR が解消する未消化指摘)
