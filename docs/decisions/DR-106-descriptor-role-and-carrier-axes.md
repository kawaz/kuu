# DR-106: descriptor の役割軸 (`kind`) と担体軸 (`domain`) の機械可読化

> 由来: 統括検証 (2026-07-14、`docs/findings/2026-07-14-codex-review2-triage-verdicts.md` M-20/M-21 の反映)。codex レビュー #2 が指摘した 2 点 — (1) `unwrap_single`/`from_entries` は description で「collector 相」と自認しながら `kind:"filter"` で登録されており namespace が role を表さない、(2) `in_range` (scalar filter registry、T→T) と `length_range` (ARRAY filter registry、T[]→T[]、DR-105 §5) が `kind`/`signature` の組だけでは区別不能 — をいずれも `schema/descriptor.schema.json` の宣言軸不足として確認し、`kind` enum への `collector` 追加と `domain` (scalar|array) 軸の新設で解消する。

## 決定

### 1. `kind` enum に `collector` を追加 (役割軸)

`descriptor.schema.json` の `kind` enum を `["installer", "factory", "filter"]` から `["installer", "factory", "filter", "collector"]` に拡張する。`schema/builtin-descriptors.json` の `unwrap_single`/`from_entries` を `kind:"filter"` から `kind:"collector"` に修正する。

両者はいずれも累積結果の変換 (`T[] → U`、DR-036/DR-044) を担う住人であり、description は既に「collector 相」と明記していたが、機械可読な `kind` フィールドではこれまで判別できなかった (`filter` を name していた)。`kind:"collector"` により、descriptor を読む tooling (lint/doc 生成/型付きクライアント) が filter chain (colon-DSL args を取る `T→T`/`T[]→T[]` の変換列、DR-009) と collector (累積結果の最終変換、DR-036) を機械的に区別できる。

### 2. `filter` kind 限定の `domain` (scalar|array) を新設 (担体軸)

`descriptor.schema.json` に `domain: "scalar" | "array"` を新設する。`kind:"filter"` の全エントリに付与する:

| filter | domain | signature |
|---|---|---|
| `trim` | scalar | Transform |
| `non_empty` | scalar | Validate |
| `in_range` | scalar | Validate |
| `regex_match` | scalar | Validate |
| `increment` | scalar | Transform |
| `unique` | array | Transform |
| `length_range` | array | Validate |

`signature` (Validate/Transform) は fallibility 軸のみを表す — `in_range` と `length_range` は同じ `kind:"filter"`/`signature:"Validate"` の組だが、入力の型 (`T` か `T[]` か) が異なる。`domain` はこの carrier の違いを機械可読にする 2 本目の軸で、`signature` と直交する。

`installer`/`factory`/`collector` descriptor には `domain` は無関係 (出現しない) — carrier 軸は `kind:"filter"` (scalar filter registry / ARRAY filter registry、DR-102 §1) の内部でのみ意味を持つ。

### 3. carrier の正本は wire 属性位置、descriptor は非区別を補う機械可読ヒント

DR-102 §3 は「正規のゲートは `parse_definition`、`schema/wire.schema.json` の `if/then` は補助であり必須ではない」と既に規定している。本 DR の `domain` フィールドも同じ位置づけ — `value_filters`/`piece_filters`/`final_filters` (scalar registry) と `accum_filters` (ARRAY registry、DR-102 §1) のどちらの属性に書かれているかが carrier の正本であり、`domain` は descriptor 単体を読む場面 (lint/doc 生成) での機械可読ヒントに過ぎない。`domain` の値と、その filter 名が実際に置かれる属性位置が食い違う定義は、`parse_definition` の 1 属性 1 registry 判定 (DR-102 §2) が正規に reject する。

### 4. collector の呼び出し規約は filter chain の colon-DSL args とは異なる

`kind:"collector"` の住人 (`unwrap_single`/`from_entries`) は `filters.*` namespace を共有するが (DR-036「collectors registry は新設しない、filters で代替」、下記「関連」参照)、実際の呼び出し規約は filter chain (`piece_filters`/`value_filters`/`final_filters`/`accum_filters` が使うコロン区切り DSL、DR-009) とは別軸である:

- filter chain の呼び出しは `"in_range:1:65535"` のような colon-DSL 文字列で、args は全て string (DR-009)
- collector の呼び出しは `multiple.collector` の宣言 (プリセット名または `{accumulator, collector, separator}` のオブジェクト形、DR-036) から導出される。`from_entries` は特に entries 配列形・指名 2 フィールド形・key 昇格形の 3 用法を持つ `FromEntries` spec (object 形から導出、DR-044) を引数に取り、colon-DSL の args 列とは形が異なる

`filters.unwrap_single`/`filters.from_entries` という namespace 上の命名 (DR-036 の「filters で代替」方針) はそのまま維持する — namespace を分離すると DR-036 の「新規 registry を立てない」判断を覆すことになり、本 DR の射程 (機械可読性の追加) を超える。`kind:"collector"` フィールドが役割を区別する責務を担う。

## 採用しなかった案

### `collectors` を独立 namespace に分離する

codex レビュー #2 M-21 は「`collectors.unwrap_single` 等へ修正」も代替案として提示したが、これは DR-036 が「`T[] → U` の最終変換は filters registry の延長で扱える、新規 registry は立てない」と既に確定させた判断を覆す。`kind:"collector"` フィールドで役割を区別すれば namespace 分離と同等の機械可読性が得られ、DR-036 の決定を尊重しつつ codex の指摘を解消できる。

### `domain` を `signature` と統合した複合 enum にする

`signature` の enum を `["ScalarValidate", "ScalarTransform", "ArrayValidate", "ArrayTransform"]` のように複合値にする案も検討候補だが、fallibility (Validate/Transform) と carrier (scalar/array) は直交する独立の軸であり、複合 enum にすると将来 3 本目の軸が必要になった際にさらに組み合わせ爆発する。2 本の独立フィールドに分けるほうが `descriptor.schema.json` 全体の設計 (`kind`/`signature`/`owns`/`observes`/`config`/`reasons` の宣言軸分離、DR-061 §1) と整合する。

## 波及

- **schema/descriptor.schema.json**: `kind` enum に `collector` 追加、`domain` (`scalar`|`array`、filter kind 限定) を新設
- **schema/builtin-descriptors.json**: `trim`/`non_empty`/`in_range`/`regex_match`/`increment` に `domain:"scalar"`、`unique`/`length_range` に `domain:"array"` を付与。`unwrap_single`/`from_entries` を `kind:"collector"` に変更 (`domain` は付与しない)
- **DR-105 §4**: ARRAY filter registry の fallibility 確立 (`signature` の Validate/Transform 二分法) は本 DR の `domain` 軸と直交して不変 — `signature` は fallibility、`domain` は carrier を表す

## 関連

- DR-036 (multiple registry / accumulators / collectors — 「collectors registry は新設しない、filters で代替」の出所、本 DR は namespace 方針を維持したまま `kind` で役割を区別する)
- DR-044 (`from_entries` の 3 用法 — collector の呼び出し規約が colon-DSL と異なる根拠)
- DR-061 (registry descriptor の自己記述 — `kind`/`signature`/`owns`/`observes`/`config`/`reasons` の宣言軸分離の原型、本 DR はこの体系に `domain` を追加)
- DR-095 (builtin descriptor の reasons 宣言集合 — `schema/builtin-descriptors.json` の正本、本 DR が `domain`/`kind:collector` を追記)
- DR-102 (`final_filters`/`accum_filters` の属性分割 — carrier の正本が wire 属性位置にあるという §3 の規定、本 DR の `domain` はこれを補う機械可読ヒント)
- DR-105 §4 (ARRAY filter registry の fallibility 確立 — `signature` の Validate/Transform 二分法、本 DR の `domain` 軸と直交)
- `docs/findings/2026-07-14-codex-review2-triage-verdicts.md` M-20/M-21 (由来となった指摘)
