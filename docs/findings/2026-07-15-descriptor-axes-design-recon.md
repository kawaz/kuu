# descriptor 軸再整理の設計調査 (role / construction / invocation / effect × fallibility / io_type)

> 由来: docs/issue/2026-07-14-descriptor-schema-declaration-axis-separation.md (VISION §4
> による動機格上げ済み)。codex #3 レビュー A-M1/M3/M4 の未消化指摘を、`schema/descriptor.schema.json`
> の宣言軸の構造的な棚卸し + 設計案比較として整理する。本 findings は **設計フェーズの調査記録**
> であり、DR/schema/fixture の normative 変更は含まない (受け入れ条件の DR 起票は別作業)。
>
> 対象:
> - `schema/descriptor.schema.json` (kind 別 oneOf 分岐は既実装)
> - `schema/builtin-descriptors.json` (builtin 13 住人 = filter 7 + collector 2 + factory 4)
> - DR-061 §1/§3/§5 (原型)、DR-095 §3 (reasons 宣言)、DR-105 §5 明確化 note (definition-time 検査規則)、
>   DR-106 (kind=collector、domain 軸、A-C1 反映済み)
> - docs/VISION.md §4 (可搬性要件 — 4 段フロー: 独自 filter の descriptor → import 先で
>   interface/struct/モック生成 → 型エラー駆動で埋める)
>
> **本 findings が扱わない**:
> - export JSON への descriptor 同梱の wire 形式 (issue `from-entries-nonconforming-input-wire-form` の
>   射程、将来 DR)
> - configurable factory の言語横断展開 (kuu-ux / kuu-cli 実装側の関心)
> - completers registry の具体実体化 (別 issue、本作業と同時に軸再整理する予定の駆動源)
>
> スコープ・アンカー ([[design-priority]] §「全体を直す」のスコープ制御):
> - **完了条件**: 3 案の比較、推し案の根拠、DAX-Q 抽出、実装影響見積の 4 点を書き切る
> - **やらないこと**: descriptor 以外の宣言軸 (constraint 系 reason、`fixture.schema.json`、
>   `wire.schema.json` の分岐) の再整理は本 findings 外
> - **検証方法**: 案ごとに in_range / from_entries / 仮想独自 filter の 3 例を書き下し、
>   descriptor 単体で VISION §4 の 4 段フローが機械駆動できるか (interface / モックまで一意に
>   落とせるか) を突合する

## 判明した事実

### 現状 descriptor 軸のフィールドとその責務

`schema/descriptor.schema.json` (2026-07-14 時点) が持つ 8 フィールドと、`kind` 別の可否:

| フィールド | 値 | 意味論 | installer | factory | filter | collector | 由来 |
|---|---|---|---|---|---|---|---|
| `name` | ns 付き識別子 | registry 上の呼び名 (= filter/collector の実質所有語彙) | 必須 | 必須 | 必須 | 必須 | DR-094 |
| `kind` | installer / factory / filter / collector | 「4 軸を 1 enum に混載した discriminator」 | 必須 | 必須 | 必須 | 必須 | DR-061 §1/§3 + DR-106 |
| `domain` | scalar / array | 入力 carrier (T か T[] か) | 禁止 | 禁止 | 必須 | 禁止 | DR-106 §2 |
| `signature` | Validate / Transform | fallibility × 入力保持の複合軸 | 禁止 | 禁止 | 必須 | 禁止 | DR-095 §3 |
| `owns` | 語彙配列 | lowering 責務を持つ wire 語彙集合 (排他) | 任意 | 実質不使用 | 禁止 | 禁止 | DR-042 不変則③ / DR-061 §1 |
| `observes` | 語彙配列 | advisory read の機械可読化 | 任意 | 実質不使用 | 禁止 | 禁止 | DR-056 / DR-061 §1 |
| `config` | オブジェクト | デプロイ時の方言設定キーの列挙 | 任意 | 実質必須 | **誤用注記あり** | 実質不使用 | DR-061 §1/§4 |
| `reasons` | reason 配列 | emit しうる実行時 reason (`空 = total`) | 必須 | 必須 | 必須 | 必須 | DR-066 §2 / DR-095 §3 |

「実質不使用」= 対応 branch では `not { anyOf [ required ] }` で明示禁止していないが、
現存 builtin では未使用。「誤用注記あり」= `in_range` / `length_range` の `config` が
「これは config でなく DSL 引数の注記」と自認 (背景節 2)。

### builtin 13 住人の軸分布 (`schema/builtin-descriptors.json`)

**scalar filter (5)**: `trim` (Transform, reasons: [])、`non_empty` (Validate, `empty_value`)、
`in_range` (Validate, `too_small`/`too_large`、**config に DSL 引数 min/max を注記同居**)、
`regex_match` (Validate, `pattern_no_match`、**config に DSL 引数 pattern を注記同居**)、
`increment` (Transform, reasons: [])。

**array filter (2)**: `unique` (Transform, reasons: [])、`length_range` (Validate,
`too_short`/`too_long`、**config に DSL 引数 min/max を注記同居**)。

**collector (2)**: `unwrap_single` (reasons: [])、`from_entries` (reasons: []、
**object 形 args を持つが descriptor に呼び出し形の宣言軸なし**)。

**factory (4)**: `builtin/number_parser`、`builtin/int_parser`、`builtin/bool_parser`、
`builtin/tty` (いずれも kind=factory、config は方言キーが正しい用法、reasons あり)。

### 現状の宣言力ギャップ (codex #3 A-M1/M3/M4 の未消化部分)

1. **A-M1 role vs construction の混線**: `kind` の 4 値のうち `installer` / `filter` / `collector`
   は「役割 (処理相の中での位置)」だが `factory` は「生成方式 (config を取って何かを作る)」で
   別次元の軸。configurable filter (= 役割 filter × 構築 factory) を descriptor で表せない
2. **A-M3 invocation の不在**: `in_range` / `length_range` の DSL 引数 (min/max) が `config`
   欄に「これは config でなく DSL 引数の注記」と但し書き付きで同居。descriptor 自身が
   自認する構造的な歪み。`from_entries` の object 形引数は descriptor に登場すらしない
   (`multiple.collector` の宣言から導出、DR-106 §4 参照)。M-18 の definition-time 検査
   (arity / 型 / bound) を機械化するには invocation 専用の宣言軸が必要
3. **A-M4 signature の複合軸**: `Validate` = 入力保持 × 失敗可能 / `Transform` = 入力変換 ×
   常に成功、の 4 象限中 2 象限のみを命名した簡易分類。「変換しつつ reject しうる filter」
   (= 変換 × 失敗可能) を宣言できない (DR-106 §「明確化 (c)」は限界だけ明記して未解決)
4. **VISION §4 の要件**: 独自 filter の descriptor だけから import 先で interface / struct
   / モックコードまで生成するには、入出力の値型 (`Value` の内訳: 文字列 / 数値 / bool / …)
   と invocation.parameters (名前 + 型 + 必須性) が機械可読で揃っている必要がある。現状
   `domain` は carrier (scalar/array) だけを表し、入力要素型 (VStr か VNum か) と出力要素型
   の情報は descriptor には無い

### VISION §4 の生成フローが要求する情報の内訳

`import` 先の言語で 4 段フロー (§4-(1)〜(4)) を **機械駆動** するために descriptor 単体
から取り出せなければならない情報を列挙する:

| 情報 | 段 | 用途 |
|---|---|---|
| filter/collector の名前 (ns 付き) | 1-3 | 生成する interface/型の名前空間 |
| 入力の value 型 (`string`/`number`/`bool` 等) | 2-3 | interface の入力パラメータ型 |
| 入力の carrier (単一値 / 配列) | 2-3 | 引数が T か T[] か |
| 出力の value 型 | 2-3 | 戻り値の型 |
| 出力の carrier | 2-3 | 戻り値が T か T[] か |
| effect (入力保持 / 変換) | 2-3 | 戻り値を `void` 系 (validate) にするか `T` (transform) にするか |
| fallibility (total / reject) | 2-3 | 戻り値を `Result<T, Reason>` にするか `T` にするか |
| reasons (`Reason` 型の値集合) | 3 | `Reason` enum の要素列挙 (import 先で型として生成) |
| invocation.parameters (名前 + 型 + 必須性 + 制約) | 2-3 | 呼び出しごとの引数の interface パラメータ + validation stub |
| invocation.encoding (colon_args / object_args / none) | 2 | wire → runtime へ引数を渡す形状 |
| config の宣言 (キー名 + 型 + default) | 2 | factory 構築時のパラメータ |

現行 descriptor は「fallibility × 入力保持」の 2 軸を `signature` 1 フィールドに、carrier
1 軸を `domain` に、reasons を 1 フィールドに、config を 1 フィールドに、invocation を
**持たない** (代わりに `config` に注記同居)。VISION §4 が要求する情報のうち **入力/出力の
値型 (VStr か VNum か)**・**effect と fallibility の独立扱い**・**invocation.parameters**・
**invocation.encoding** の 4 情報が descriptor から機械的に取り出せない。

## 実用的な示唆 (推し案の根拠を先に示す)

**推し案は「案 A + case-by-case scale-down」**: 直交軸への完全分離を骨格にし、descriptor は
役割 / 構築 / 入出力 / effect × fallibility / invocation の独立フィールドを持つ。ただし
入出力の値型 (VStr か VNum か) の宣言軸は VISION §4 生成に不可欠な情報として初めて足し、
scalar/array の担体 (`domain`) と別軸に置く。

主根拠は次の 4 点:

1. **VISION §4 が要求する情報量に対する適合度が最高** (案 B は不足、案 C は概念オーバーヘッド
   と DR-036 の namespace 判断への衝突を伴う)
2. **既存 DR 群の直交軸志向と整合**: DR-106 が既に「複合 enum より独立フィールド」を明文化
   (`domain` を `signature` と統合しないと決めている §「採用しなかった案」)。案 A はこの方針の
   延長で、`signature` 自身にも同じ分離を適用する
3. **kuu.mbt の実装型が既に分離を反映**: `FilterDescriptor` (scalar) と `ArrayFilterDescriptor`
   (array) が別 struct、`FilterSignature` enum が Validate/Transform の 2 値、Result 型で
   fallibility を型で表現、collector は `apply_collector` で独立 dispatch (`filters.mbt` L436
   のコメント参照)。descriptor 側 (仕様) が実装より粗い分類をしているのが逆転している
4. **後戻りコストの評価**: builtin 13 は既に軸分離済みの実装型 (kuu.mbt) と整合しており、
   descriptor 側の宣言だけ書き直せば済む (builtin.json の書き換えは機械的、fixture 影響は
   小 = kind:collector の追加時と同型パターン)。将来の completers registry や configurable
   filter を "後で足せる" 余地を残すためには先に軸分離しておく方が総コストが低い

案 B (最小差分) を推さない理由: invocation 軸だけ足しても、`kind` の混線 (A-M1) と signature
の複合軸 (A-M4) は残り、VISION §4 の生成情報 (入出力の値型) も足りない。案 B は「今の
`config` 誤用の言い訳を作るだけ」に近く、descriptor が VISION §4 の中核前提条件になった
今 (issue 動機格上げ、2026-07-14) では不十分。

案 C (相 = phase 中心) を推さない理由: pieceProcessor の相構造 (DR-034) を descriptor
軸に昇格すると、DR-036 が確立した「collectors registry は新設しない、filters namespace で
代替」の判断と衝突する (相を軸に立てると seat = 相となり、namespace 分離と実質同型)。
また相の粒度は kuu 内部の実装関心であり、独自 filter の作者 (VISION §4 の想定利用者) が
知る必要のない概念オーバーヘッドが生じる。

## 検証の詳細

### 3 案の骨格と比較

以下は本 findings の中心的な比較。3 例 (`in_range`, `from_entries`, 仮想の独自 filter
`app/valid_json` = 「文字列をパースして JSON にする + max_depth 引数で深さ制約 + 失敗しうる」
と想定) を各案で descriptor に書き下す。

#### 案 A — 独立軸への完全分離 (直交化)

`kind` を role 純化し、construction / invocation / effect / fallibility / io_type を独立
フィールド化する:

```jsonc
// フィールド軸 (概念スキーマ)
{
  "name": "…",              // ns 付き識別子
  "role": "installer | filter | collector | type_parser | accumulator | completer",
  "construction": "static | factory",  // factory なら + config フィールド
  "domain": "scalar | array",           // 入力担体
  "io_type": { "input": "string | number | bool | value | array<T>", "output": "…" },
  "effect": "preserve | transform",     // 入力を保持するか
  "fallibility": "total | reject",      // 失敗しうるか
  "invocation": {
    "encoding": "colon_args | object_args | none",
    "parameters": [ { "name": "…", "type": "…", "required": true, "min": …, "max": … } ]
  },
  "owns": [ … ],       // installer 限定
  "observes": [ … ],   // installer 限定
  "config": { … },     // construction=factory 限定
  "reasons": [ … ]     // fallibility=reject なら非空
}
```

3 例:

```jsonc
// (1) in_range — scalar Validate、DSL 2 引数
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
      { "name": "min", "type": "number", "required": true },
      { "name": "max", "type": "number", "required": true, "constraint": "min <= max" }
    ]
  },
  "reasons": ["too_small", "too_large"]
}

// (2) from_entries — collector、object 形 args
{
  "name": "from_entries",
  "role": "collector",
  "construction": "static",
  "domain": "array",
  "io_type": { "input": "array<value>", "output": "map<string, value>" },
  "effect": "transform",
  "fallibility": "total",
  "invocation": {
    "encoding": "object_args",
    "parameters": [
      { "name": "key", "type": "string", "required": false, "description": "key 昇格用のフィールド名" }
    ]
  },
  "reasons": []
}

// (3) app/valid_json — 仮想独自 filter (VISION §4 想定ユーザ、configurable filter)
{
  "name": "app/valid_json",
  "role": "filter",
  "construction": "factory",   // ← 案 A の中核: filter × factory を第一級で表現
  "domain": "scalar",
  "io_type": { "input": "string", "output": "value" },  // string→JSON value に変換
  "effect": "transform",
  "fallibility": "reject",   // ← 変換 × 失敗可能 (現行 signature では表現不能)
  "invocation": { "encoding": "colon_args", "parameters": [] },
  "config": {
    "max_depth": { "type": "number", "default": 32, "description": "パース許容深さ (host 保護)" }
  },
  "reasons": ["invalid_json", "max_depth_exceeded"]
}
```

- **VISION §4 適合**: 4 段全て機械駆動できる。入出力の値型 (`io_type`) と effect × fallibility
  が独立なので `Result<Value, Reason>` / `Value` / `void` 系のシグネチャが decision table で
  決まる。`invocation.parameters` から interface のメソッド引数を機械生成できる
- **DR-106 との関係**: `kind` → `role` の rename + 意味論 refine (installer/filter/collector
  は role に純化、factory は construction へ移動)、`domain` 維持、`signature` を `effect`
  + `fallibility` に split。DR-106 は **Superseded by 新 DR** で明示。DR-105 §5 明確化 note の
  invocation.parameters による表現は refine (既存規則は保持、宣言軸に昇格)
- **builtin 13 の移行影響**:
  - 全 13 に `role` (旧 kind から機械マップ) と `construction` を付与
  - filter 7 の `signature` を `effect` / `fallibility` に分解 (Validate → preserve + reject、
    Transform → transform + total、機械的な 1:1 マップ、変換 × 失敗の第 3 象限は builtin では未使用)
  - filter 7 と collector 2 に `io_type` と `invocation` を追加 (今の config 誤用注記を分離)
  - factory 4 の `config` は正しい位置のまま (方言キー)、`role` は具体化する必要あり
    ("type_parser" 等) — 例: `builtin/number_parser` は `role: "type_parser"`,
    `construction: "factory"`
- **conformance への影響**: descriptor は現状 schema 適合のみで runtime conformance に
  乗っていない (fixture の pin 対象外)。案 A の宣言力があれば、独自 filter の宣言 → 実装
  ラップの型整合を conformance runner が事前検査できるようになる (VISION §4 の 4 段目)。
  ただし本 findings では conformance への昇格は **推奨するが射程外** (別 DR)
- **弱点**: フィールド数増加でスキーマの複雑度が上がる (現 8 → 12〜13)。builtin 全書き換えが
  発生。DR-106 の supersede が必要 (追記 note では収まらない)

#### 案 B — 最小差分 (invocation だけ新設、他は現状維持)

現行 `kind` / `domain` / `signature` を維持し、`invocation` フィールドだけ足す:

```jsonc
{
  "name": "in_range",
  "kind": "filter", "domain": "scalar", "signature": "Validate",
  "invocation": {
    "encoding": "colon_args",
    "parameters": [
      { "name": "min", "type": "number", "required": true },
      { "name": "max", "type": "number", "required": true, "constraint": "min <= max" }
    ]
  },
  "reasons": ["too_small", "too_large"]
}
```

3 例のうち `in_range` / `from_entries` は上記形で書ける。**`app/valid_json` (仮想独自) は
書けない** — 「変換 × 失敗可能」を signature が 2 値 (Validate/Transform) しか持たないため
分類不能。configurable filter (filter × factory) も表現できない (kind が排他)。

- **VISION §4 適合**: 部分適合。invocation.parameters は interface 引数を生成できるが、
  入出力の値型が descriptor に無いため型シグネチャの生成は依然 host 側の追加情報に依存
  (「文字列に対する filter」までしか分からず、`Result<string, Reason>` を生成できない)
- **DR-106 との関係**: 完全上位互換 (追記のみ、既存フィールドと enum は不変)。Superseded 不要
- **builtin 13 の移行影響**: `in_range` / `length_range` / `regex_match` から config 注記を
  移動、`from_entries` に invocation の object_args 宣言を追加。他 8 (config 誤用なし) は
  空 invocation または omit
- **conformance への影響**: なし (現状維持)
- **弱点**: A-M1 (role vs construction) と A-M4 (signature 複合軸) が未解消のまま。
  configurable filter を将来第一級化する時に **もう一度** 破壊的変更が要る。VISION §4 の
  生成が完結せず「型は生成できるが shape だけ」の中途半端な状態になり、この issue の
  「VISION §4 が中核前提」という格上げに対する回答として足りない

#### 案 C — pieceProcessor 相 (phase) 軸中心

`kind` を廃止し、descriptor が属する相 (phase) を軸に立てる:

```jsonc
{
  "name": "in_range",
  "phase": "value_filter | piece_filter | final_filter | accum_filter | collector | parse | install",
  "construction": "static | factory",
  "signature": { "in": "T", "out": "Result<T, Reason>" },  // 型で fallibility/effect を表現
  "invocation": { … },  // 案 A と同型
  "config": { … },
  "reasons": [ … ]
}
```

3 例:

```jsonc
// (1) in_range
{ "name": "in_range", "phase": "value_filter", "construction": "static",
  "signature": { "in": "number", "out": "Result<number, Reason>" },
  "invocation": { … }, "reasons": ["too_small", "too_large"] }

// (2) from_entries
{ "name": "from_entries", "phase": "collector", "construction": "static",
  "signature": { "in": "array<value>", "out": "map<string, value>" },
  "invocation": { … }, "reasons": [] }

// (3) app/valid_json
{ "name": "app/valid_json", "phase": "value_filter", "construction": "factory",
  "signature": { "in": "string", "out": "Result<value, Reason>" },
  "invocation": { … }, "config": {…}, "reasons": ["invalid_json", "max_depth_exceeded"] }
```

- **VISION §4 適合**: 型が signature に埋め込まれ、生成には最も直接的。ただし
  「Result<T, Reason>」のような複合型を descriptor の値として書く形になり、独自 filter 作者は
  Result 型のシリアライズ規約を知る必要がある (concept overhead が案 A/B より大きい)
- **DR-106 との関係**: 全面書き換え (`kind` → `phase`、`domain`/`signature` の意味論変更)。
  DR-036 の「collectors namespace は分離しない」判断とも衝突する可能性 (相を軸に昇格すると
  相 = seat = namespace という捉え方に近づく)
- **builtin 13 の移行影響**: 全 13 の書き換え + 相 (phase) 語彙の追加。DR-034 の相構造が
  descriptor 上でも露出することで、pieceProcessor の実装詳細がユーザ側 API に流出する
- **conformance への影響**: signature の型シリアライズが必要になり、fixture 側にも影響
  (相 seat の合法性検査、DR-106 明確化 (b) の owns 集合検査を signature の型整合検査で
  置換する可能性)
- **弱点**: 概念オーバーヘッドが最大、DR-036 との衝突リスク、pieceProcessor の相構造が
  ユーザ側にも露出、builtin 全書き換え + 実装追随コスト最大

### 3 案の比較サマリ

| 軸 | 案 A (直交軸分離) | 案 B (invocation だけ) | 案 C (相中心) |
|---|---|---|---|
| VISION §4 生成の駆動 | 全 4 段機械化 | 部分適合 (型情報不足) | 全 4 段機械化 (型直接) |
| A-M1 (role vs construction) 解消 | ○ | × | ○ (phase 軸に置換) |
| A-M3 (invocation の不在) 解消 | ○ | ○ | ○ |
| A-M4 (signature 複合軸) 解消 | ○ | × | ○ (型で表現) |
| configurable filter 表現 | ○ (filter × factory) | × | ○ (value_filter × factory) |
| 変換 × 失敗の第 3 象限 | ○ (effect + fallibility 独立) | × | ○ (out=`Result<T', Reason>`) |
| DR-106 の Supersede/追記 | Supersede 要 | 追記のみ | Supersede 要 (広範) |
| DR-036 との衝突 | なし | なし | あり (相 = namespace 化) |
| builtin 全書き換え | 要 (機械マップ可) | 一部のみ | 要 (相語彙 + 型) |
| 概念オーバーヘッド | 中 (フィールド増) | 小 | 大 (相 + 型シリアライズ) |
| kuu.mbt 側の追随 | 小 (実装は既に分離済み) | 極小 | 大 (相を型層に露出) |
| conformance への昇格見込み | 中 (別 DR で乗せられる) | 低 | 高 |

### DAX-Q ラベル (裁定が必要な分岐、案 A 推し前提)

以下は DR 体系から一意に導出できず、kawaz 裁定が要る分岐:

- **DAX-Q1**: role 語彙の初期集合。builtin だけを覆う最小 (installer / filter / collector /
  type_parser) にするか、拡張余地込みで広めに宣言する (+ accumulator + completer) か。
  - (a) 最小: `installer / filter / collector / type_parser` の 4 値 (推し) — 現存 builtin
    を完全に覆い、accumulators / completers は登場時に追加すれば済む。DR-061 §3 の
    「configurable factory を横断適用」の思想と整合しつつ、初期宣言力を絞る
  - (b) 広め: 上記 + `accumulator` + `completer` を最初から enum に載せる — 将来の
    completers registry 実体化 (本 issue の駆動源) 時の enum 拡張手続きを省ける
  - (c) 更に広め: 上記 + `matcher` (DR-042) 等の内部 装置も列挙 — 内部装置を descriptor
    体系に載せる価値は薄く不採用側
  - 推し: **(a) 最小**。根拠: [[default-convergence-guard]] の「将来仮定的要件のために今の
    複雑さを増やしていないか」チェック。completers 実体化時に role enum を 1 値追加する
    のは非破壊 (追記のみ)、事前予約の必要は無い

- **DAX-Q2**: `construction` の値語彙。
  - (a) `static` / `factory` の 2 値 (推し) — 現存の kind=factory を construction 軸に
    移し、他は static。configurable filter (filter × factory) を第一級に扱う道筋
  - (b) `static` / `factory` / `derived` — derived = 他 descriptor からの派生 (DR-062 の
    filter inherit 想定)。DR-062 が inherit の実体化に着手していないため要件不明のまま
    予約するのは default-convergence-guard の警戒対象
  - 推し: **(a)**。derived は必要になったら追記でよい

- **DAX-Q3**: `io_type` (入出力の値型) の粒度。descriptor 単体から VISION §4 の生成に足りる
  情報量にするための追加軸。
  - (a) 値型を扱う: `string` / `number` / `bool` / `value` (any) の 4 種類程度を許容する
    小さな enum + `array<T>` / `map<string, T>` 等の parameterized 型 — kuu の `Value` の
    variants (VStr/VNum/VBool + 集約型) を写す (推し)
  - (b) 型を扱わず domain 軸 (scalar/array) のみ維持 — 案 B と同型、VISION §4 の生成が
    途半端に終わる
  - (c) 相 (phase) を経由して型を導出 — 案 C 相当、概念オーバーヘッドが増える
  - 推し: **(a)**。根拠: VISION §4 の 4 段フローは「host 言語で `Result<string, Reason>`
    のような正確な型を生成する」ことが利益の源泉。入出力の値型を descriptor に持たないと
    生成された interface が実装ラップ時に「string を渡すのか value を渡すのか」を追加情報
    無しに決められず、幻影コマンド体験の限界緩和にならない

- **DAX-Q4**: `signature` の分解方向。
  - (a) `effect: preserve | transform` + `fallibility: total | reject` の 2 独立フィールド
    に分解 (推し) — DR-106 §「採用しなかった案」の「複合 enum より独立フィールド」原則の
    延長。第 3 象限 (変換 × 失敗) を第一級に表現できる
  - (b) `signature` を 4 値 enum に拡張 (`ValidateTotal / ValidateReject / TransformTotal /
    TransformReject` 等) — 直交軸の複合 enum 化で DR-106 §「採用しなかった案」の逆パターン、
    3 本目の軸拡張時に組み合わせ爆発
  - (c) `signature` を維持し「第 3 象限は future work」で凍結 — VISION §4 が現在の中核前提
    である以上、future work 送りは実質 v1 スコープからの脱落
  - 推し: **(a)**。3 本目の軸 (例: side_effect の有無、referential transparency) を将来足す
    余地を残せる

- **DAX-Q5**: `invocation.encoding` の値集合。
  - (a) `colon_args` / `object_args` / `none` の 3 値 (推し) — 現存の filter DSL (DR-009)、
    collector object 形 (DR-044)、installer (呼び出し = wire 語彙、直接引数なし) を覆う
  - (b) 上記 + `positional` — CLI 風の positional args を持つ将来住人向け予約
  - (c) 上記 + `keyword` — 名前付き keyword args を持つ将来住人向け予約
  - 推し: **(a)**。(b)/(c) は要件があるまで追加不要。現存住人を完全カバーする

- **DAX-Q6**: descriptor を conformance runtime に載せるかの方針。
  - (a) 別 DR で先送り (推し) — 本 DR (案 A 化) は schema と builtin.json の書き換えに
    集中、conformance 昇格は独立 DR。案 A の情報量が入ってから初めて意味を持つ
  - (b) 本 DR で同時に conformance 昇格 — スコープ膨張、issue 発注の射程外
  - (c) 昇格を永続的に不要と宣言 — VISION §4 の 4 段目 (実装ラップの型整合検査) を
    conformance で確認する道筋を最初から閉ざす
  - 推し: **(a)**。DR-068 (ドラフト期) の間に案 A を land、conformance 昇格の DR は
    独自 filter の実装ラップが language DX で必要になった段階で起こす

- **DAX-Q7**: `kind` フィールドの rename 是非。
  - (a) `kind` → `role` へ rename (推し) — 案 A の意味論変更を名前にも反映、DR-106 §「採用
    しなかった案」の「役割軸」語との整合。既存 fixture / doc の grep 追随はメカニカル
  - (b) `kind` のまま意味論だけ refine — 名前と意味論の乖離が残り、後から読む人が混乱する
    危険 ([[interface-wording]] の「利用者の語彙で命名」原則に反する)
  - 推し: **(a)**。ただし kawaz の「良い名前 > 防衛可能な名前」判断次第で `role` 以外の
    候補もあり得る (例: `species`, `layer`)。**この rename 是非と語自体の選定は
    セットで裁定**が要る

### 実装影響の見積もり (kuu.mbt 側の変更)

推し案 (A + case-by-case scale-down) を採用した場合の kuu.mbt 側変更点:

- **`FilterDescriptor` (`filters.mbt`) の型追加**: 現在 `name` / `signature` (Validate|Transform)
  / `reasons` / `run` の 4 フィールド。案 A 化で追加する概念:
  - `role: FilterRole` (現状 filter 固定なので実質不要、コメント言明のみで足りる可能性)
  - `construction: Construction` (static/factory)、static のみなら enum を持たなくていい
  - `io_type: IoType` — input/output の value 型を格納 (VStr/VNum/VBool/VAny)。VISION §4
    の生成に必要だが **kuu.mbt 自身の runtime には現状必須ではない** (実装内では既に型で
    分岐)。宣言のみで実行時挙動は変わらない
  - `effect: Effect` (preserve/transform)、`fallibility: Fallibility` (total/reject) —
    現在の `signature` から機械マップ、実装挙動不変
  - `invocation: InvocationSpec` — DSL args の parameters を宣言化。runtime の
    `apply_filter_chain` 側 (`filters.mbt` L309-330 相当) が **定義時検査に活用** できる
    (現状 `in_range` の arg-count check は runtime、案 A 化で `parse_definition` 時に前倒し)
  - `config: Map[String, ConfigKey]` — construction=static なら空、factory なら通常のキー宣言
- **`ArrayFilterDescriptor` の統合検討**: scalar/array の descriptor 型が現在別 struct
  (`FilterDescriptor` / `ArrayFilterDescriptor`) だが、`domain` フィールドで軸表現するなら
  1 型に統合し `run` を `Result<Value, Reason>` / `Result<Array<Value>, Reason>` の
  union に持たせるか、あるいは 2 型のまま保つか。**現状の 2 型維持を推す** (実装型は元々
  分離できているので触らない)。descriptor 側 (spec) だけ論理的 1 型に統合する立て付け
- **collector の descriptor 化**: kuu.mbt には現状 collector 用 struct が存在しない
  (`apply_collector` は `filters.mbt` L436 コメント参照のみで実体は resolve 側)。案 A で
  `role: collector` を第一級化する時、`CollectorDescriptor` 型を新設して io_type と
  invocation を持たせる (現状 hardcode 済みの unwrap_single / from_entries を descriptor
  登録形式に整理)
- **factory descriptor の実体化**: 現在 factory は wire 側の decode (`json_conformance_wbtest.mbt`
  L2616 の `dec_types`) が扱っており、descriptor struct は不在。案 A で `role: type_parser`
  + `construction: factory` に整理する時、`FactoryDescriptor` 型の新設が必要 (config キー
  検証を型で表現)。ただし **本作業は kuu.mbt の front_door.mbt 完了後** に着手する
  順序 (発注書 §「着手順序」)、本 findings では計画のみ
- **fixtures 影響**: descriptor 自身は現状 fixture でランタイム検証されない (schema 適合
  のみ) ため fixture 影響は小。`schema/builtin-descriptors.json` の書き換えと
  `just lint-reference` の追随のみ。ただし新設した definition-time 検査 (invocation.parameters
  から派生) が `fixtures/definition-error/in-range-argument-count.json` 等の期待値を
  変える可能性があり、その検討は DR land 時に個別に確認する

### 対極確認 (self-blindspot)

[[self-written-rule-blind-spots]] の観点で本 findings が漏らしうる論点:

- **統合論への警戒 (推し案の分離が本当に排他制約由来か)**: 案 A は `effect` と `fallibility`
  を分ける理由を「builtin では未使用の第 3 象限がある」と説明したが、独自 filter (VISION §4
  想定) で **実際に第 3 象限が必要になる具体例が乏しい** — `app/valid_json` は仮想例で、
  現存 corpus に実例がない。ただし [[feedback-no-corpus-absence-excuse]] に従い、
  「corpus が無いから統合してよい」の論拠にはならない。VISION §4 の生成が「第 3 象限の
  filter を書けるユーザ」を想定する以上、descriptor が分離しておくのは正
- **案 A で書けなくなるパターンの探索**: 案 A は現状の全 builtin と将来の configurable
  filter を書けることを確認したが、「同じ役割で異なる construction を持つ複数バージョン」
  (例: static in_range と factory in_range を **同時に** 登録する) を descriptor で
  discriminate する軸を明示していない。name が違えば区別可能、同名は不可 (registry の
  1 name 1 装置原則) — 実質的な限界ではないが、fixture 想定は要確認
- **案 A で必要以上に軸を増やしていないか**: 現 8 フィールドから 12〜13 に増える。IoType
  の宣言軸は VISION §4 の 4 段目 (型シグネチャ生成) が **本当に必要とするか** を DR 起票時に
  再確認する余地あり — もし host 側の型が「値は全て `Value` 型」で十分なら io_type は
  Value 固定でよい。ただし文字列 filter (trim) と数値 filter (in_range) の interface が
  同じ `Value → Result<Value, Reason>` に統合されると、独自 filter 作者が「自分の filter が
  受け取る値の期待型」を descriptor から読めない — 分離を推す
- **案 B を過小評価していないか (段階移行の道筋)**: 案 B (invocation だけ足す) を **中間
  段階** として先に land し、案 A への昇格を **後続 DR** で行う分割案もあり得る。
  ただし本 findings は「issue の VISION §4 動機格上げに対する回答」を書くのが射程で、
  部分実装で満たす形は次善策 (kawaz 判断で採用の余地はある)

## 関連

- docs/issue/2026-07-14-descriptor-schema-declaration-axis-separation.md (本 findings の発注書)
- docs/VISION.md §4 (可搬性要件の初出)
- schema/descriptor.schema.json / schema/builtin-descriptors.json (現状スキーマの正本)
- docs/findings/2026-07-14-codex-review3-dr106-conformance.md A-M1/M3/M4 (課題の出所、triage 済)
- DR-061 §1/§3/§5 (registry descriptor の 4 宣言軸の原型)
- DR-095 §3 (builtin filter の reasons 宣言、signature の Validate/Transform 由来)
- DR-105 §5 明確化 note (invocation.parameters に相当する definition-time 検査の初出)
- DR-106 (kind=collector 追加 + domain 軸新設、案 A では Superseded 予定)
- kuu.mbt `src/core/filters.mbt` L25-54, L392-397 (FilterDescriptor / ArrayFilterDescriptor
  の実装型 — descriptor 側の軸分離を先取りしている実装的裏付け)
- kuu.mbt `src/core/front_door.mbt` (parse_definition の正面玄関、案 A 化で descriptor 由来の
  definition-time 検査を組み込む対象)
