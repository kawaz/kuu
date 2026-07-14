# codex レビュー #3 (DR-106 / conformance fixtures) — トリアージ結果と原文

## 判明した事実

codex レビュー #3 は 2 通に分かれる — レビュー A (`docs/decisions/DR-105`/`DR-106`/`DR-104` の note を対象、以下「A」) とレビュー B (`docs/CONFORMANCE.md` / `schema/*.json` / `fixtures/complete/*.json` を対象、以下「B」)。統括検証 (2026-07-14) によるトリアージ結果は以下のとおり。

### トリアージ表

| 指摘 ID | 判定 | 対応先 |
|---|---|---|
| A-C1 (kind/domain が Schema で強制されていない) | 成立 | `schema/descriptor.schema.json` (kind 必須化 + kind 別 oneOf 分岐) |
| A-C2 (kind:collector 導入後の seat compatibility 未定義) | 成立 | DR-106 note (b)、`schema/descriptor.schema.json` |
| A-C3 (`from_entries` の引数付き呼び出し形が wire で表現不能) | issue 化済み (触らない) | issue `from-entries-nonconforming-input-wire-form` |
| A-C4 (`flatten:false` の存在ベース reject が構造等価規約と衝突) | 成立 (B-C1 として統合処理) | DR-105 note (b)、`schema/wire.schema.json` |
| A-C5 (`accum_filters`=ARRAY registry と `kv_map`=Map の型矛盾) | 成立 | DR-105 note (d)、`fixtures/multiple-parse/kv-map-length-range.json` |
| A-M1 (`kind` は役割軸になっていない、factory は別次元) | issue 化済み (触らない) | issue `descriptor-schema-declaration-axis-separation` |
| A-M2 前半 (`domain` と実 registry 登録の drift) | 成立 | DR-106 note (a) |
| A-M2 後半 (`domain` を `value\|accumulation` へ改名) | 却下 | (`scalar\|array` を維持) |
| A-M3 (呼び出し引数を `config` に偽装) | issue 化済み (触らない) | issue `descriptor-schema-declaration-axis-separation` |
| A-M4 (`signature` を「fallibility 軸」と呼ぶのは誤り) | issue 化済み (触らない) | issue `descriptor-schema-declaration-axis-separation`。DR-106 note (c) で射程限定のみ明記 |
| A-M5 (`length_range`/`in_range` の引数規則の混同) | 成立 (B-M1 として統合処理) | DR-105 note (a)、fixtures 4 本 |
| A-M6 (`from_entries` を total とする根拠不足) | issue 化済み (触らない) | issue `from-entries-nonconforming-input-wire-form` |
| A-M7 (DR-104 内に意味論変更と語彙のみ変更が併存) | 却下 (DR 本文直接編集の要求) | 対応せず — 本リポは DR 本文 push 後不変・追記 note のみが規約 |
| A-M8 (`args_after` の発火条件が presence でなく non-empty) | 成立 (living doc 分のみ) | `docs/CONFORMANCE.md` §4、`docs/DESIGN.md` §15.13 (DR 本文自体の書き換えは却下) |
| A-M9 (`origin` 必須契約が anonymous 候補を表現できない) | issue 化済み (触らない) | issue `lowering-generated-element-origin-rule` |
| A-m1 (誤りと認定した exact 候補例をそのまま残置) | 却下 (DR 本文直接編集の要求) | 対応せず |
| A-m2 (「集合比較」と「multiset 比較」の用語不一致) | 成立 (B-M6 として統合処理) | DR-104 §4 note、`docs/CONFORMANCE.md` §3、`schema/fixture.schema.json` |
| A-m3 (`term` を「hint」と呼びながら実際は MUST 制約) | 成立 | `docs/CONFORMANCE.md` §4 |
| A-m4 (「namespace 分離と同等」は過大主張) | 却下 | 対応せず |
| A-m5 (DR-105 の fixture 保留記述が実施済みなのに未更新) | 成立 | DR-105 note (c) |
| A-m6 (descriptor Schema の title/description が collector 未追随) | 成立 | `schema/descriptor.schema.json` title/description |
| B-C1 (`flatten:false` の存在ベース reject が wire 構造等価規約と衝突) | 成立 | DR-105 note (b)、`schema/wire.schema.json` |
| B-M1 (`length_range` の非負整数規定を `in_range` にまで誤って遡及) | 成立 | DR-105 note (a)、`fixtures/value-typing/in-range-negative-decimal-bounds.json`、`fixtures/definition-error/{in-range-min-max,in-range-argument-count,length-range-non-integer-argument,length-range-negative-argument}*.json` |
| B-M2 (fixture schema が query と case 形を結び付けていない) | 成立 | `schema/fixture.schema.json` (`parseCase`/`definitionErrorCase`/`completeCase` の分離) |
| B-M3 (vacuous required_group fixture が vacuous 性を検証していない) | 成立 | `fixtures/complete/constraint-required-group-vacuous-flag.json` |
| B-M4 (dedup-value-candidates fixture が単一フィールド差を検証していない) | 成立 | `fixtures/complete/dedup-value-candidates.json` |
| B-M5 (`length_range` の上限 inclusive が fixture で未検証) | 成立 | `fixtures/multiple-parse/length-range-reject.json` (長さ 3 の success case 追加) |
| B-M6 (set/multiset/「スペリングの和集合」の用語不一致) | 成立 | DR-104 §4 note、`docs/CONFORMANCE.md` §3、`schema/fixture.schema.json` |
| B-m1 (全 green 後も「未実機検証」文言が陳腐化したまま残置) | 成立 | `fixtures/complete/*.json` 10 本 |
| B-m2 (case id の「2〜4 語」規約に実 fixture が大量違反) | 成立 | `docs/CONFORMANCE.md` §1 (規約を「簡潔な kebab-case」へ緩和) |
| B-m3 (現役 fixture に旧語 `argv.length` が残置) | 成立 | `fixtures/multiple-parse/length-range-reject.json` |
| B-m4 (DR-104 冒頭 exact 候補例が schema-invalid のまま) | 却下 (DR 本文直接編集の要求) | 対応せず |

### 実装観測 (kuu.mbt、読み取り専用)

- **`accum_filters` と `kv_map` の適用順**: `kuu.mbt` の `src/core/resolve.mbt` (`apply_entity_filters`、L2220 以降) は `apply_accum_filter_chain` を CLI 発火の piece 値配列 (`vals`) に対して resolve 時に適用する。`kv_map` の Map 化 (`build_result` の `ACCUMULATE` 分岐が行う `RObj` への畳み込み) はこれより後段の別ステップ。したがって `accum_filters` は常に「Map 形成前の生 piece 配列」を見る — `fixtures/multiple-parse/kv-map-length-range.json` の `duplicate-key-piece-count-exceeds-even-though-map-collapses` case (3 piece・2 distinct key で reject) がこれを実測で pin する。
- **`accum_filters` への collector 綴りの挙動**: ARRAY filter registry (`array_filters_registry()`、`kuu.mbt` `src/core/filters.mbt`) は `unique`/`length_range` のみを持ち `unwrap_single`/`from_entries` を含まない。`accum_filters: ["unwrap_single"]` は `collect_unknown_filter` (`lookup_array_filter` が `None` を返す) により単純な `unknown-vocab` になる — `fixtures/definition-error/accum-filters-collector-spelling-unknown-vocab.json` で pin 済み。
- **`multiple.collector` への未知綴りの挙動 (未対応、fixture 化見送り)**: `kuu.mbt` の `installer.mbt` を検索した限り、`ElemDef.collector`/`Entity.collector` の文字列値そのものを registry の owns 集合と照合する definition-time 検査は存在しない (decode 時にそのまま保持されるのみ、`collect_unknown_filter`/`collect_unknown_vocab` のいずれも `multiple.collector` を対象にしていない)。したがって `multiple.collector: "in_range"` のような未登録綴りは現状 silent に受理される可能性が高い。この挙動は spec 側で確定した規範ではなく実装のギャップと見られるため、本サイクルでは fixture を新設しなかった (推測に基づく definition-error fixture を書いて実装と食い違う red を生む方が有害と判断)。実装側の追随課題として残る。

### 実機検証結果 (kuu.mbt, 2026-07-14)

`just test` (KUU_FIXTURES = 本リポ) 実行結果: `decoded=263 ran_cases=644 skipped=0 mismatches=2`。mismatch はいずれも新設した `length_range` の非負整数制約 fixture 2 本 (`length-range-non-integer-argument-invalid-argument.json` / `length-range-negative-argument-invalid-argument.json`) — kuu.mbt 側の `collect_invalid_numeric_filter_args` (`installer.mbt`) が現状「数値として parse 可能か」のみを検査しており、非負整数限定の追加検査を未実装のため (spec が先行し実装が追随する順序、DR-105 §5 明確化 note の既定パターン)。それ以外の新規/変更 fixture (in_range 負数小数境界、in_range min>max、in_range 引数個数、accum_filters の collector 綴り unknown-vocab、kv_map + length_range の適用順、length_range 上限 inclusive の長さ3 case) は全て green。

## 実用的な示唆 / ベストプラクティス

- `flatten` のように「宣言の有無自体が意味を持つ属性」は、`schema/wire.schema.json` の `default` キーワードが decode 時の補完値ではなく「選択後の意味既定」であることを `$comment` で明示しておかないと、構造等価規約 (DR-063 §4) との衝突と誤読されやすい。
- descriptor の `kind`/`domain`/`signature` のような役割・軸フィールドは、Schema の `oneOf`/`allOf`+`if/then` で kind 別に必須/禁止を強制しないと「書けるが検証されない」状態になり、本来の目的 (機械可読化) を達成できない。
- fixture の `query` タグと `cases[]` の形は、fixture.schema.json 側で `if/then` により `cases.items` の `$ref` を query 別に固定する (`parseCase`/`definitionErrorCase`/`completeCase`) ことで、schema-invalid な組み合わせ (complete case に `args` を書く等) を機械的に弾ける。

## 検証の詳細

### schema 適合検証 (jsonschema, Draft 2020-12)

`uv run --with jsonschema` で `fixture.schema.json` (wire.schema.json を registry 登録) に対し `fixtures/**/*.json` 全 263 本を検証、および `descriptor.schema.json` に対し `builtin-descriptors.json` の filters/types 全エントリを検証: いずれも 0 件エラー。

negative test (意図的に不正な fixture/descriptor を検証器に通す) で新設した制約が実際に機能することを確認:

| ケース | 結果 |
|---|---|
| complete case に `args` (args_before の代わり) | 2 エラー (`args_before` 必須違反 + `additionalProperties` 違反) |
| complete case に `word_before` | 1 エラー (`additionalProperties` 違反) |
| definition_error case に `args` | 1 エラー (`additionalProperties` 違反) |
| filter descriptor が `domain`/`signature` を欠く | 2 エラー |
| collector descriptor が `domain` を持つ | 1 エラー |
| descriptor が `kind` を欠く | 3 エラー |

### `just lint-reference` (kuu リポ)

全項目 OK (node properties / scope config keys / builtin filters / builtin type factories / filter config keys / factory config keys / filter reasons / factory reasons)。

### kuu.mbt 実機検証 (`just test`, KUU_FIXTURES 注入)

`decoded=263 ran_cases=644 skipped=0 mismatches=2`。mismatch 2 件の詳細は上記「実機検証結果」節のとおり。

---

## レビュー原文 A (DR notes: DR-104/DR-105/DR-106)

## 総評

**現状のままは Reject。**
方向性自体――collector の役割明示、scalar/array registry の識別、`word_before` 必須契約の訂正、range 引数の definition-time 検査――は妥当です。しかし、今回の文書は「機械可読化」を掲げながら、その不変条件を Schema と `parse_definition` 契約に閉じ切れていません。

特に問題なのは次の三点です。

1. `kind` / `domain` を追加しただけで、役割・registry・呼び出し規約の整合性が規定されていない。
2. DR-105 の `flatten` と ARRAY filter は、既存の wire 正規化・accumulator 型契約と衝突している。
3. DR-104 の明確化は正しい訂正を含む一方、訂正前の誤った現役文言を残し、文書内に相反する規範を併存させている。

以下では、指定された既知残余――**ref/link 越し origin、custom type の `ty`、completer 実装追随**――は再指摘していません。

---

## Critical

### C-1. `kind` / `domain` の「機械可読化」が Schema 上まったく強制されていない

**根拠:** DR-106 §1、§2、§「波及」／`schema/descriptor.schema.json`

現行 Schema は以下を許します。

- `kind` 自体の省略
- `kind:"filter"` での `domain` 省略
- `kind:"collector"` への `domain:"array"` 付与
- filter での `signature` 省略
- installer/factory への `signature` 付与

実際、`required` は `name` / `reasons` だけであり、`domain` は説明文上の「実質必須」に留まっています。また DR-106 は collector に `signature` は無関係とする一方、builtin の `unwrap_single` / `from_entries` には引き続き `signature:"Transform"` が残っています。

これは descriptor を「間違っていても Schema に通る自由文付き JSON」にしており、DR-106 の主目的を否定します。DR-061 の「descriptor は config validator ではない」は、descriptor 自身の discriminated union を検査しなくてよい理由にはなりません。

**修正要求:**

- `kind` を必須化する。
- `oneOf` 等で kind ごとの形を分岐する。
  - `filter`: `domain` と `signature` を必須
  - `collector`: `domain` を禁止し、`signature` を残すか削除するか決定
  - `installer`: `owns` 等の必要条件を明示
  - `factory`: factory 固有条件を明示
- 「無関係な既知フィールド」は単に optional にせず、該当 branch で禁止する。
- builtin collector の `signature` を残すなら、DR-106 §2 の「collector には無関係」を撤回する。

---

### C-2. `kind:"collector"` 導入後の seat compatibility が未定義で、DR-036 と両立しない

**根拠:** DR-106 §1、§4／DR-036 §「collectors registry は新設しない」、§「multiple の書き方」

DR-036 は collector を通常の filter として扱い、`FilterChain[A,B]` なら collector 席でも使用可能としています。一方 DR-106 は collector を filter と別役割・別呼び出し規約として区別します。

この結果、次が未定義です。

- `accum_filters:["unwrap_single"]` は unknown-vocab か invalid-range か、それとも合法か
- `multiple.collector:"unique"` は合法か
- `multiple.collector:"in_range"` は合法か
- `kind:"filter", domain:"array"` の住人を collector として使えるか
- custom descriptor が filter と collector の両役を持つことは可能か

`kind` が排他的役割なら DR-036 の「filters の延長」は意味論上 supersede されています。単なる表示用ヒントなら、DR-106 §4 の「呼び出し規約を区別できる」という主張が成立しません。

**修正要求:**

`seat × kind × domain` の合法性表を追加してください。最低限、次を確定する必要があります。

| seat | 許容 kind/domain | 不適合時の kind |
|---|---|---|
| `piece_filters` / `value_filters` / `final_filters` | filter/scalar | unknown-vocab または invalid-range |
| `accum_filters` | filter/array | 同上 |
| `multiple.collector` | collector のみか、array filter も可か | 同上 |

あわせて DR-036 の「collector は filter として登録可能」が、**namespace 共有だけを意味するのか、seat 間の代入可能性も意味するのか**を明示的に supersede してください。

---

### C-3. `from_entries` の引数付き呼び出し形が現行 wire で表現できない

**根拠:** DR-106 §4／DR-044 §2／`schema/wire.schema.json` の `multiple`

DR-106 は `from_entries` が `FromEntries` spec を object 形から受け取ると説明します。しかし現行の `multiple` 詳細形は実質、

```json
{
  "accumulator": "...",
  "collector": "...",
  "separator": "...",
  "flatten": false
}
```

であり、`collector` は string です。DR-044 の、

```json
{
  "multiple": {
    "preset": "map",
    "from_entries": {"key": "path"}
  }
}
```

という形は、現行 Schema の規範的プロパティにも、DR-036 の詳細形にも統合されていません。`additionalProperties:true` によって JSON Schema が通ることは、そのフィールドに wire 意味論があることを意味しません。

したがって `from_entries()` 以外の二用法――指名二フィールド形と key 昇格形――について、言語非依存の直列形が存在しない状態です。

**修正要求:**

collector 呼び出しの canonical wire form を確定してください。例えば次のいずれかです。

```json
"collector": {
  "name": "from_entries",
  "args": {"key": "path"}
}
```

または、

```json
"collector": "from_entries",
"collector_args": {"key": "path"}
```

そのうえで、以下を同一サイクルで更新してください。

- DR-036
- DR-044
- DR-106
- `wire.schema.json`
- lowering 断面
- definition-error 規則
- 3 用法それぞれの fixture

---

### C-4. `flatten:false` の存在ベース reject は「省略 = default」と正面衝突する

**根拠:** DR-105 §1、§2 明確化 note／DR-063 §4／`wire.schema.json` の `flatten.default:false`

DR-105 は、

```json
{"accumulator":"merge"}
```

を合法としつつ、

```json
{"accumulator":"merge","flatten":false}
```

を invalid-range とします。

しかし `flatten` の default は `false` であり、DR-063 §4 は「フィールド省略 = default 値と等価」と規定しています。したがって、意味的に等価な二つの wire の一方だけが definition-error になります。

これは単なる説明不足ではなく、wire 正規化規則と妥当性判定の矛盾です。

**修正要求:**

次のどちらかに統一してください。

1. `flatten:false` は非 append accumulator でも省略形と等価として許容する。
2. `multiple` を accumulator ごとの discriminated union にし、`flatten` の default は append branch 内にのみ置く。merge branch には `flatten` 自体が存在せず、グローバル default も付けない。

後者を採るなら、Schema も `accumulator:"append"` branch とそれ以外に明示分岐させてください。

---

### C-5. `accum_filters = ARRAY registry` と `kv_map accumulator = Map` が型矛盾している

**根拠:** DR-106 §2、§3／DR-102 §1／DR-091 §2／DR-036 の accumulator 表

DR-102 は `multiple` 等を持つ全 accum 要素に `accum_filters` を許し、その型を ARRAY registry の `T[]→T[]` としています。DR-106 もこれを `domain:"array"` として固定します。

一方、`kv_map` accumulator は累積結果を Map にすると規定されています。したがって、

```json
{
  "multiple": {"accumulator":"kv_map"},
  "accum_filters":["length_range:1:5"]
}
```

について、属性位置だけを見る DR-102/106 の規則では ARRAY filter として合法になりますが、実際の accumulator 出力は Map です。

`domain` の不一致を `parse_definition` が防ぐという DR-106 §3 の説明は、このケースでは成立しません。属性位置だけでは accumulator ごとの Acc 型を判定できないからです。

**修正要求:**

次のいずれかを決めてください。

- `kv_map` を accumulator ではなく「array accumulator + map collector」へ再構成する。
- `accum_filters` を append/merge 等の array Acc を持つ accumulator に限定し、他では invalid-range とする。
- ARRAY registry をやめ、`Acc` の型を descriptor で表現して accumulator/filter 間の型適合を検査する。

少なくとも accumulator ごとの `accum_filters` 適格性を definition-time の表として固定する必要があります。

---

## Major

### M-1. `kind` は「役割軸」になっていない。`factory` だけ別の次元である

**根拠:** DR-106 表題、§1／DR-061 §3

`installer` / `filter` / `collector` は処理上の役割ですが、`factory` は生成方式です。DR-061 §3 自身が configurable factory を types / filters / accumulators / completers 等へ横断適用できるとしています。

つまり、configurable filter や configurable collector は、

- 役割としては filter/collector
- 構築方式としては factory

の両方です。単一 enum の `kind` では表現できません。特に type factory の descriptor を単体で読んでも、それが type parser を生成するのか completer を生成するのか判別できません。

**修正要求:**

少なくとも次の軸へ分離してください。

- `role`: installer / type_parser / filter / collector / accumulator / completer …
- `construction`: static / factory
- 必要なら `registry`: types / filters / accumulators / completers …

`kind` を維持するなら「役割軸」という説明を撤回し、その非直交性を明記すべきです。

---

### M-2. `domain` と実 registry 登録の drift を防ぐ規則がない

**根拠:** DR-106 §3

§3 は wire 属性位置を正本、descriptor の `domain` をヒントとします。しかし属性位置が示すのは「その seat が要求する registry」であり、住人の実装がどの registry に登録されたかではありません。

例えば host が `foo` を ARRAY registry に登録し、descriptor に `domain:"scalar"` と誤記しても、

- `accum_filters:["foo"]` は parse_definition で通る
- doc/lint は scalar と表示する

という矛盾が残ります。

**修正要求:**

registry 登録時の不変条件として、

> descriptor の `domain` は、実際に登録された registry lane と一致しなければならない。不一致は登録失敗または conformance failure。

を追加してください。あるいは descriptor を正本にして、registry lane 自体を `domain` から構築してください。

また `domain` は実値の JSON 型ではなく registry lane を表しているため、`scalar|array` より `value|accumulation` 等の名称の方が安全です。

---

### M-3. 呼び出し引数を `config` に偽装しており、definition-time 検査を機械化できない

**根拠:** DR-106 §4／DR-061 §3〜§5／DR-105 §5／`builtin-descriptors.json`

`in_range` / `length_range` の `min` / `max` は descriptor の `config` に記載されていますが、説明文自身が「descriptor config ではない」と否定しています。

これは DR-061 の、

- config = デプロイ時・factory 構築時の設定
- filter args = 呼び出しごとの値

という区別に反します。また DR-106 §4 が filter/collector の呼び出し規約差を重視しているのに、descriptor にはその ABI を表す軸がありません。

**修正要求:**

`config` と別に、例えば次を導入してください。

```json
"invocation": {
  "encoding": "colon_args",
  "parameters": [
    {"name":"min","type":"number","required":true},
    {"name":"max","type":"number","required":true}
  ]
}
```

collector には object args を表現できる別 encoding を許容してください。definition-time の arity/type/range 検査は、この invocation 宣言または住人固有 validator のどちらが正本かも決める必要があります。

---

### M-4. `signature` を「fallibility 軸」と呼ぶのは誤り

**根拠:** DR-106 §2、§「`domain` を `signature` と統合した複合 enum」／DR-095 §3

`Validate` / `Transform` は、失敗可能性だけでなく、

- 入力値を保持するか
- 値を変換するか

も同時に表しています。

現在の体系では「変換しつつ reject しうる filter」を表現できません。したがって「fallibility と carrier は直交するので分離する」という DR-106 の論拠は半分しか成立していません。`signature` 自体がすでに二軸を複合しています。

**修正要求:**

次のどちらかを行ってください。

- `signature` を「filter behavior class」と呼び、fallibility 単独軸という説明を撤回する。
- `effect: preserve|transform` と `fallibility: total|reject` に分離する。

後者なら DR-106 の直交軸設計という主張と整合します。

---

### M-5. `length_range` / `in_range` の引数規則が一文に潰され、意味とエラー分類が壊れている

**根拠:** DR-105 §5 明確化 note

次の文は文法上、`in_range` にも「min/max は非負整数」を適用しています。

> `length_range` (および同型の `in_range`) … 境界は inclusive、`min`/`max` は非負整数。

これは `in_range` を number/float に使う設計と衝突します。また以下が未分類です。

- 負数
- 小数
- 空文字引数
- `NaN` / `inf`
- host 値域外
- 引数 0/1/3 個
- object 詳細形 `{"name":"in_range","args":[...]}`

「非数値は invalid-argument」だけでは、数値だが非負整数ではない `-1` や `1.5` の kind が決まりません。短縮 DSL だけを記述すると、object 詳細形で検査を迂回できる実装も生じます。

**修正要求:**

filter ごとに表で固定してください。

- arity
- lexical grammar
- 数値域
- inclusive/exclusive
- `min > max`
- 負数・小数の可否
- malformed ごとの definition-error kind
- string 短縮形と object 詳細形を正規化した後に同一検査を行うこと

`length_range` は非負整数、`in_range` は対象型に応じた数値、という別規則に分けるのが最低限必要です。

---

### M-6. `from_entries` を total とする根拠が足りない

**根拠:** DR-105 §4、§「波及」／DR-044 §2

DR-105 は collector 全員を total としますが、次のような入力に対する `from_entries` の結果が定義されていません。

- entries 用法に `["x"]` が来る
- 2 要素でない entry
- 指名フィールドが欠ける
- key が string でない
- 同一 key が重複する
- key 昇格後の残余 object が空になる

`multiple:{accumulator:"append",collector:"from_entries"}` を任意の scalar 要素に書けるなら、これらは普通に到達可能です。言語ごとの Object/Map API に委ねると、throw、string coercion、last-wins 等に分裂します。

**修正要求:**

- 不適合を definition-time に全て証明できるなら、その静的型検査を規定する。
- 動的にしか判定できないなら、collector total の主張を撤回し、runtime failure の reason と位置帰属を規定する。
- total を維持するなら、全不適合入力に対する決定的な変換結果を明記する。

---

### M-7. DR-104 内に「意味論変更」と「語彙のみ変更」が併存している

**根拠:** DR-104 §1 明確化 note、§「波及」、§「関連」／DR-060 §2 の二つの note

追加 note は、`word` 必須契約を supersede した意味論変更だと正しく訂正しています。しかし DR-104 の末尾には依然として、

- 「意味論自体は変更しない、語彙のみ改名」
- 「fixture format の確定」

という記述が残っています。DR-060 側も、最初の note が「意味論不変」と言い、直後の note がそれを訂正しています。

訂正 note を読まない tooling・要約・INDEX 生成では、古い記述がそのまま現役規範として拾われます。

**修正要求:**

追記だけで済ませず、現役文を直接更新してください。

- DR-104 の波及・関連を「命名変更 + `word_before` 必須契約の v1 supersede」に修正
- DR-060 の最初の明確化 note に superseded 表示を付ける
- INDEX / DESIGN の説明も「語彙のみ」を残さない

---

### M-8. `args_after` の発火条件は presence ではなく non-empty なのに、現役本文が presence 条件のまま

**根拠:** DR-104 §5 本文と明確化 note (b)／DR-060 §2

本文は、

> `args_after` が供給された場合は after 整合フィルタが…

と規定しますが、note (b) は明示的な `[]` を省略と同値、すなわちフィルタ非発火とします。

したがって正しい条件は「供給された場合」ではなく「非空の場合」です。note で補足しても、本文の一般命題は依然として偽です。

**修正要求:**

見出し・本文・DESIGN・Schema description を全て、

> `args_after.length > 0` の場合に限り

へ変更してください。「presence を見ない」こともアルゴリズム規範として本文へ昇格させるべきです。

---

### M-9. `origin` 必須契約は、name を持たない合法な候補を表現できない

**根拠:** DR-104 §2／DR-060 §1／DR-063 §1 の裸文字列→exact 正規化

これは既知の ref/link 越し origin 問題とは別です。

kuu は name を持たない exact primitive や値 primitive を合法に持てます。DR-060 は positional 面の exact/values も候補対象に含めます。しかし DR-104 は exact/value を問わず `origin` を必須の「由来要素名」とします。

name が存在しない候補に対して、

- `origin:""` を使うのか
- フィールドを省略するのか
- synthetic id を生成するのか

が未定義です。これは候補同一性にも直結します。

**修正要求:**

次のいずれかを規定してください。

- anonymous 候補では `origin:null`
- anonymous 候補では `origin` 省略
- 予約 namespace の安定 synthetic origin

空文字を採るなら、それを明記し、候補同一性と fixture で固定してください。

---

## Minor

### m-1. 誤りと認定した exact 候補例をそのまま残している

**根拠:** DR-104 §2 冒頭例、§2 明確化 note (a)

note は exact 候補例の `origin` 欠落を誤記と認定していますが、例自体を修正していません。規範文書のコード例は note より先にコピーされます。

**修正要求:**

例を直接、

```json
{"spelling":"--port","is_value":false,"origin":"port", ...}
```

へ修正してください。誤記 note は履歴節へ移すか削除してください。

---

### m-2. 「集合比較」と「multiset 比較」の用語が一致していない

**根拠:** DR-104 §4／CONFORMANCE §3

DR-104 は `candidates` を集合比較としますが、CONFORMANCE は producer の重複違反を検出するため multiset 比較としています。数学的な set 比較なら重複は消えるため、両者は同じではありません。

**修正要求:**

DR-104 §4 を、

> 順序非依存の multiset 比較。ただし producer は §3 の同一候補を重複出力してはならない。

へ変更してください。

---

### m-3. `term` を「hint」と呼び続けながら、実際には MUST 制約に変えている

**根拠:** DR-104 §2 表、明確化 note (e)／DR-060 §3

`cont` 後の空白禁止を仕様制約とした以上、「終端ヒント」という名称は弱すぎます。生成器が無視可能な advisory 情報に読めます。

**修正要求:**

`termination mode`、`spacing mode` 等へ用語を改めるか、少なくとも次を明記してください。

- `cont`: 生成器は空白を挿入してはならない
- `word_end`: 空白を挿入してもよいが、必須ではない

---

### m-4. 「namespace 分離と同等の機械可読性」は過大主張

**根拠:** DR-106 §「collectors を独立 namespace に分離する」

namespace 分離は役割判別だけでなく、

- 同名 filter/collector の共存
- lookup の型分離
- 呼び出し ABI の分離
- wrong-seat を lookup failure として表現

も提供します。単一 flat namespace + `kind` metadata はこれらと同等ではありません。

**修正要求:**

「現行 builtin の役割識別という限定された目的には足りる」程度へ主張を弱めてください。独立 namespace と一般に同等とは書かないでください。

---

### m-5. DR-105 の fixture 保留記述が現役規範と実体に追随していない

**根拠:** DR-105 §「波及」fixtures 項

`flatten:false`、旧 accumulator 名、range malformed 等を規範化しているのに、「本サイクルでは fixture 変更は保留」と残っています。現在の corpus に該当 fixture があるなら単純な stale text です。無いなら、今回の新規裁定が conformance で pin されていないことになります。

**修正要求:**

実施済み fixture の一覧へ更新し、少なくとも以下を明記してください。

- `flatten:true/false` × 非 append
- 旧 `"accumulator":"flatten"`
- `length_range` の両境界と reject 両側
- `in_range` / `length_range` の arity/type/min>max
- string 短縮形と object 詳細形の同値性

---

### m-6. descriptor Schema 自身の title/description が collector 追加に追随していない

**根拠:** DR-106 §「波及」／`descriptor.schema.json` の title、root description、`$defs.descriptor.description`

enum には collector が増えていますが、Schema の自己説明は依然として installer / configurable factory / filter の三者を列挙しています。

**修正要求:**

title、root description、descriptor description、関連コメントを全て collector 込みに更新してください。また、`factory/filter/collector` の関係を M-1 の修正後の語彙に合わせて書き直してください。

---

## レビュー原文 B (conformance / fixtures)

## 総評

候補の tagged union 化、`meta` の完全必須化、`term:"cont"`・旧 accumulator 語彙・ARRAY filter reject の追加は、前回までの穴をかなり埋めています。特に exact/value で不要フィールドを禁止した点は妥当です。

ただし、**全 green は参照実装と fixture のロックステップ整合を示すだけで、言語非依存契約としての一意性までは保証していません**。現状は以下が残っています。

- `flatten:false` の存在依存判定が、wire の「省略 = default」規約と正面衝突
- query と case schema が結び付いておらず、不正 fixture を schema が受理
- 新設 fixture の一部が、説明している仕様差を実際には検出できない
- `in_range` への遡及規定が scalar range の型を誤って狭めている
- set / multiset / 「spelling の和集合」の語がまだ一本化されていない

`ref/link` 越し origin、custom type の `ty`、completer 追随については、指示どおり再指摘していません。

---

## Critical

### C-1. `flatten:false` の「キー存在で invalid」は wire の構造等価規約と両立しない

**根拠**

- DR-063 §4:
  - フィールド省略は default 値と構造等価
- `schema/wire.schema.json`
  - `#/$defs/node/properties/multiple/oneOf[1]/properties/flatten/default`
  - `false`
- DR-105 §2:
  - `flatten` キーは値を問わず、`append` 以外では存在しただけで `invalid-range`
- `fixtures/definition-error/merge-flatten-false-invalid-range.json`
  - `$.definition.options[0].multiple.flatten = false`
  - 省略形とは異なり definition-error を期待

したがって次の二つは、一方では「省略 = default:false で構造等価」、他方では「片方だけ definition-error」です。

```json
{"accumulator": "merge"}
{"accumulator": "merge", "flatten": false}
```

これは単なる文言問題ではありません。省略フィールドを default で埋める decoder/codegen は、`parse_definition` 前に両者を区別できなくなります。参照実装が raw JSON のキー存在を保持して green でも、それは仕様に明記されていない実装依存です。

**修正要求**

次のどちらかを明示的に選択してください。

1. **値ベースへ戻す**
   - `append` 以外では `flatten:true` のみ `invalid-range`
   - `flatten:false` は省略と同値
2. **存在ベースを維持する**
   - `flatten` を validation 完了まで `absent | false | true` の三状態として保持することを wire 契約に明記
   - DR-063 §4 の「省略 = default」から、宣言有無が意味を持つ属性を明示的に除外
   - schema の `default:false` を削除するか、少なくとも「append 選択後の意味 default であり、decode 時の補完値ではない」と限定
   - `merge` について「省略は valid / 明示 false は invalid」の対 fixture を同一箇所に置く

現状のままでは、正常な default 補完を行う実装とキー存在を保持する実装で挙動が割れます。

---

## Major

### M-1. `length_range` の規定を `in_range` に遡及した結果、scalar range の引数型が矛盾している

**根拠**

- DR-105 §5 明確化:
  - `length_range` および同型の `in_range`
  - `min`/`max` は非負整数
  - 裁定を `in_range` にも遡及
- `schema/builtin-descriptors.json`
  - `$.filters.in_range.config.min.type = "number"`
  - `$.filters.in_range.config.max.type = "number"`
  - scalar `in_range` は number 範囲として記述
- 同 schema:
  - `$.filters.length_range.config.min/max.type` も `"number"` で、非負整数規定を反映していない
- `fixtures/definition-error/in-range-malformed-argument-invalid-argument.json`
  - 非数値 `abc` しか検証せず、負数・小数の扱いを固定していない

配列長である `length_range` の bound が非負整数なのは当然ですが、scalar 数値範囲の `in_range` まで同じ制約にすると、例えば `in_range:-1.5:2.5` を表現できません。これは「DSL の検査時期を遡及する」ことと「値域型を遡及変更する」ことの混同です。

**修正要求**

共通規則と個別規則を分離してください。

- 共通:
  - 引数はちょうど 2 個
  - 各引数を対象 filter の bound 型として parse
  - `min <= max`
  - 境界は inclusive
  - malformed は definition-time `invalid-argument`
- `length_range`:
  - 非負整数
- `in_range`:
  - canonical number。負数・小数を許す
    もし整数限定を本当に意図するなら、後方非互換変更として明記し descriptor も変更する

追加 fixture が必要です。

- `in_range:-1.5:2.5` の正常系
- `length_range:-1:5` の不正系
- `length_range:1.5:5` の不正系
- 引数不足・過剰
- `in_range` 側の `min > max`

---

### M-2. fixture schema が `query` と case 形を結び付けていない

**根拠**

- `schema/fixture.schema.json`
  - `#/$defs/fixture/allOf[3]/then` は `query:"complete"` に対して `"cases"` を要求するだけ
  - `#/$defs/case/required` は `["id","why","expect"]` のみ
  - `args_before` は schema 上必須でない
  - `#/$defs/case/properties/expect/oneOf` は parse / definition-error / complete の全 expect を無条件に許す
  - `#/$defs/case/additionalProperties = true`
- CONFORMANCE §4:
  - complete の `args_before` は必須
  - `word_before`/`word_after` があれば runner は reject

そのため、少なくとも以下が schema-valid になり得ます。

- `query:"complete"` なのに `args_before` がない
- complete case に `args` を書く
- complete fixture の expect が `{"outcome":"success"}`
- complete case に `word_before`/`word_after` を書く
- `query:"definition_error"` に実行用 `args` を書く

runner が拒否するとしても、**schema と runner で fixture 妥当性の判定面が割れています**。

**修正要求**

`parseCase` / `definitionErrorCase` / `completeCase` を分離し、トップレベルの query 分岐から `cases.items` を対応する schema に固定してください。

complete case では最低限:

- `args_before` required
- `expect` は `completeExpect` 固定
- `args` 禁止
- `word_before`/`word_after` 禁止
- `args_after` のみ optional
- `cases.minItems: 1`

さらに malformed fixture の schema-negative test を追加してください。candidate だけ tagged union にしても、外側の query union が未分岐では不十分です。

---

### M-3. vacuous required_group fixture は、vacuous 性を一度も判定させていない

**根拠**

- `fixtures/complete/constraint-required-group-vacuous-flag.json`
- `$.cases[0]`
  - before-only では CONFORMANCE §4 により、そもそも全遅延述語が候補生存判定に不参加
  - vacuous か否かにかかわらず同じ結果になる
- `$.cases[1]`
  - exact 候補は `--verbose` しかない
  - after-filter が検査する経路は CONFORMANCE §4 により
    `args_before + ["--verbose"] + args_after`
  - つまり実際の検査経路は `["--verbose","x"]`
  - group の唯一 member `verbose` は候補自身によって発火済み
- 同 case の `why`
  - `--verbose` を採用しない経路 `["x"]` を論じているが、after-filter はその経路を検査しない
- positional `target` は値候補なので after-filter 対象外

したがって、complete 側が `required_group` を誤って非 vacuous と扱っていても、

- `--verbose`: 自身が発火するので充足
- `target`: 値候補なので無条件通過

となり、この fixture は green のままです。

**修正要求**

group と無関係な exact 候補を追加してください。例えば:

```json
{"name":"verbose","type":"flag","long":true,"required_group":["mode"]}
{"name":"quiet","type":"flag","long":true}
```

`args_after:["x"]` で `--quiet` を採用した経路 `["--quiet","x"]` を検査させます。

- 正しい vacuous 実装: `--quiet` が生存
- 誤った非 vacuous 実装: `--quiet` が除外

この一フィールド差がなければ、fixture 名と実際の検証内容が一致しません。

---

### M-4. value candidate dedup fixture が `origin` も `ty` も個別には検証していない

**根拠**

- `fixtures/complete/dedup-value-candidates.json`
- `$.cases[0].expect.candidates[0]`
  - `ty:"int"`, `origin:"num"`
- `$.cases[0].expect.candidates[1]`
  - `ty:"bool"`, `origin:"flag"`

2 候補は `ty` と `origin` の両方が同時に違います。

そのため:

- dedup key から `origin` を誤って除外しても、`ty` 差で 2 件残る
- dedup key から `ty` を誤って除外しても、`origin` 差で 2 件残る

つまり fixture の説明が主張する「origin が異なれば畳まれない」は検証されていません。確認できるのは「`ty` と `origin` が両方違う候補は畳まれない」だけです。

**修正要求**

一度に変える identity field を 1 個にしてください。

最低限:

- 同一 `ty`、異なる `origin`
  - 例: 両 branch を `int` にし、name のみ `num_a` / `num_b`
- 可能なら同一 `origin`、異なる `ty`
  - definition で構成困難なら comparator 単体の conformance test を設ける
- `meta` についても、他の identity field を固定した一フィールド差を用意する

eq-split fixture の `term` 差は一フィールド差になっており良好です。同じ粒度を他の identity field にも要求します。

---

### M-5. `length_range` の上限 inclusive が fixture されていない

**根拠**

- DR-105 §5:
  - 境界は inclusive
- `fixtures/multiple-parse/length-range-reject.json`
  - `length_range:2:3`
  - `within-range-accumulates`: 長さ 2
  - `under-min-length-rejected`: 長さ 1
  - `over-max-length-rejected`: 長さ 4
  - 長さ 3 の case がない

現在の fixture は、上限を exclusive と誤実装して `len >= 3` を reject しても全て通ります。

**修正要求**

長さ 3 の success case を追加してください。

```json
["--tags","a","--tags","b","--tags","c"]
```

期待値は `["a","b","c"]`。これにより:

- min=2 の inclusive
- max=3 の inclusive
- min 未満
- max 超過

の四境界が初めて閉じます。

---

### M-6. set / multiset / 「spelling の和集合」の規範語がまだ矛盾している

**根拠**

- CONFORMANCE §3:
  - candidates は順序非依存の **multiset 比較**
- DR-104 §4:
  - candidates は「集合比較」
- `schema/fixture.schema.json`
  - `#/$defs/completeExpect/properties/candidates/description`
  - 「集合比較、順序非規範」
- DR-104 §3/§4 および CONFORMANCE §3:
  - 「スペリングの和集合」
- `fixtures/complete/eq-split-cont.json`
  - 同じ `spelling:"--port"` が `term` 差で 2 件併存

同一 spelling が2件存在してよい以上、「スペリングの和集合」は字義どおりには偽です。実際に union しているのは、`path` を射影除外した candidate record です。

また、set 比較なら actual `[A,A]` と expect `[A]` が一致し得ますが、multiset 比較なら不一致です。参照 runner が後者でも、別言語実装は DR-104/schema の「集合」を根拠に前者を実装できます。

**修正要求**

規範を次の二段階に一本化してください。

1. producer output は、正規化済み 6-field identity key に重複を持ってはならない
2. その後、候補列を順序非依存の一対一対応で比較する

用語は例えば以下に統一すべきです。

> `path` を除いた正規化 candidate record の和集合。producer の identity 重複は禁止し、比較は順序非依存・多重度保持で行う。

DR-104 §4、CONFORMANCE §3、schema description の三箇所を同時に修正し、「spelling の和集合」という表現は撤去してください。

---

## Minor

### m-1. 全 green 後も「未実機検証」と書かれており、fixture の来歴説明が事実に反している

**根拠**

代表例:

- `fixtures/complete/eq-split-cont.json::$.why`
- `fixtures/complete/constraint-required-group-vacuous-flag.json::$.why`
- `fixtures/complete/dedup-value-candidates.json::$.why`

リポジトリ全体では complete fixture 10 本に同文言が残っています。本レビューの前提は `decoded=256 / ran_cases=632 / mismatches=0` なので、「complete() 呼び出し確認は行っていない」は現在時点では偽です。

**修正要求**

この注意書きは削除してください。作成時の導出経緯を残すなら journal/finding に移し、normative fixture の `why` には恒常的な仕様根拠だけを残すべきです。テスト実行状況を fixture 本体へ埋めると必ず陳腐化します。

---

### m-2. representative 6 本の case ID が 2〜4語規約に大量違反している

**根拠**

CONFORMANCE §1 は `cases[].id` を「意図を表す 2〜4 語」と規定していますが、例えば:

- `word-end-and-cont-coexist-same-origin`
- `vacuous-required-group-never-excluded-by-after-consistency-check`
- `or-branch-value-candidates-distinct-origin-not-deduped`
- `flatten-false-on-merge-is-invalid-range`
- `legacy-flatten-accumulator-name-is-unknown-vocab`

はいずれも 5 語を大幅に超えています。代表 10 case 中 7 case が違反です。

`schema/fixture.schema.json::$defs/case/properties/id/pattern` も語数上限を強制していません。

**修正要求**

- ID を 2〜4 語に短縮する
- または 2〜4 語規約を廃止し「簡潔な kebab-case」程度へ緩和する
- 規約を維持するなら schema/lint で実際に強制する

文書だけ厳しく、正本 fixture が従わない状態は避けてください。

---

### m-3. 現役 fixture に旧語 `argv.length` が残っている

**根拠**

- `fixtures/multiple-parse/length-range-reject.json::$.why`
  - `DR-102 §4 の reject 位置帰属規定 (argv.length...)`
- 同文中の後半では `args.length` を使用

**修正要求**

現役 fixture では `args.length` に統一してください。歴史記録中の旧称と違い、fixture の `why` は現在仕様の説明です。

---

### m-4. DR-104 の冒頭 exact candidate 例が、schema-invalid のまま残っている

**根拠**

- DR-104 §2 冒頭:
  - exact candidate 例に `origin` がない
- DR-104 §2 明確化 note:
  - その例は誤記であり `origin` 必須と自認
- `schema/fixture.schema.json`
  - `#/$defs/exactCandidate/required` に `origin`
- CONFORMANCE §4 の例は既に修正済み

誤記だと注記するだけで、copy-paste 対象の JSON 自体を直していません。

**修正要求**

DR の例にも `"origin":"port"` を追加してください。歴史的決定本文を温存する方針でも、schema-invalid なコード例を先に置き続ける利益はありません。
