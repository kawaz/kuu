# registry 装置語彙の全棚卸し — signature / 座席 / タイミング (「type と filter 類の一新」議論の土台資料)

> 由来: kawaz 発題「type と filter 類を一新したい」(2026-08-12) の判断材料。
> **非正本**: 本書は導出物であり、規範記述の正本は `schema/builtin-descriptors.json` /
> `schema/descriptor.schema.json` / `docs/DESIGN.md` / `docs/decisions/DR-*.md` にある。
> 食い違いを見つけたら正本が勝つ。
>
> **記述規約**: 全ての事実に出典 (descriptor JSON のパス / DR 番号 + 節 / fixture パス) を付す。
> 正本が規定していない事項は推測で埋めず **「未規定」** と書き、正本間で食い違う事項は
> **「DR 間で曖昧」** と書いて §8 に集約する (それ自体が一新議論の材料になる)。
> 実地確認は `fixtures/` / `corpus/` への grep 結果として明記する。

対象は `schema/builtin-descriptors.json` が収載する **32 住人** —
filters 9 / cell_fns 9 / types 6 / accumulators 3 / completers 2 / providers 3。

---

## 1. 全体マップ — 区分名と role は別軸

`builtin-descriptors.json` のトップレベル 6 区分は **DESIGN §13.1 の registry 区分名 (= 呼ばれる
フィールド名の単位)** であり、descriptor の `role` (DR-107 §1) とは独立の軸である
(`schema/builtin-descriptors.json` の `$comment`)。両者は 1:1 ではない。

| JSON 区分 | 収載数 | 住人の `role` | 完備性強制 (envelope) |
|---|---|---|---|
| `filters` | 9 | `filter` 7 + `collector` 2 | なし (open) |
| `cell_fns` | 9 | `fn` 9 | `required` で 9 名を強制 |
| `types` | 6 | `type_parser` 6 | なし (open) |
| `accumulators` | 3 | `accumulator` 3 | `append`/`merge`/`kv_map` を強制 |
| `completers` | 2 | `completer` 2 | `files`/`dirs` を強制 |
| `providers` | 3 | `provider` 3 | 3 スロット名を強制 |

正本: `schema/descriptor.schema.json` の `$defs.envelope`。
`role` enum は 8 値 (`installer` / `filter` / `fn` / `collector` / `type_parser` / `accumulator` /
`completer` / `provider`、同 schema `$defs.descriptor.properties.role`) だが、
**`installer` role の descriptor は builtin-descriptors.json に 1 件も収載されていない**
(DR-095 §射程外: installer 発生源はエンジン構造の発生源で宣言軸が未実体化)。

### 1.1 role 別の宣言軸マトリクス (Schema が強制する形)

正本: DR-107 §7 + DR-111 §1/§5 (accumulator/completer 行の確定)、実装は
`descriptor.schema.json` の `allOf` + `if`/`then` role 条件分岐。

| role | domain | io_type | output_mode | fallibility | invocation | owns / observes | config |
|---|---|---|---|---|---|---|---|
| `filter` | 必須 (scalar\|array、`io_type.input` の array ラップと一致) | 必須 | 必須 | 必須 | `colon_args` 固定 | owns 禁止 / observes 任意 | factory なら必須、static なら禁止 |
| `collector` | 必須 (`array` 固定) | 必須 (input は array ラップ) | `transform` 固定 | `total` 固定 | `object_args` 固定 | 両方禁止 | 禁止 (`construction:static` 固定) |
| `fn` | 禁止 | 必須 (**output-only**、input 禁止) | 禁止 | 必須 | `colon_args` 固定 | owns 禁止 / observes 任意 | factory なら必須 |
| `type_parser` | 禁止 | 必須 (`input` は `string` 固定) | `transform` 固定 | 自由 (total/reject) | `none` 固定 | 両方禁止 | factory なら必須、static なら禁止 |
| `accumulator` | 禁止 | 必須 (input は array ラップ) | `transform` 固定 | `total` 固定 | `object_args` 固定 | 両方禁止 | 禁止 |
| `completer` | 禁止 | **禁止** | 禁止 | 禁止 | `none` 固定 | 両方禁止 | 禁止 |
| `provider` | 禁止 | 必須 | 禁止 | 禁止 | `none` 固定 | 両方禁止 | 禁止 |
| `installer` | 禁止 | 禁止 | 禁止 | 禁止 | 禁止 | 両方任意 | 任意 |

`fallibility:total` ⇔ `reasons: []`、`fallibility:reject` ⇔ `reasons` 1 件以上は
role 横断のトップレベル `allOf` が強制する (DR-095 §3、descriptor.schema.json 冒頭 allOf)。

---

## 2. 座席カタログ — どの wire 属性がどの区分を引くか

正本: DESIGN §13.1 / §13.2 (フィールド名で registry が暗黙決定)、REFERENCE §2.1 (属性一覧)。

| wire 属性 / 席 | 引く区分 | 要求する語彙集合 | 正本 |
|---|---|---|---|
| `piece_filters` | filters (scalar lane) | scalar filter registry の owns 集合 | DR-102 §1, DR-079 §1 座席 B |
| `value_filters` | filters (scalar lane) | 同上 | DR-102 §1, DR-079 §1 座席 C |
| `final_filters` | filters (scalar lane) | 同上。**非 accum 要素専用** | DR-102 §1/§3 |
| `accum_filters` | filters (ARRAY lane) | ARRAY filter registry の owns 集合。**accum 要素専用** | DR-102 §1/§3 |
| `multiple.collector` | filters (collector lane) | collector 住人。`object_args` 呼び出し規約 | DR-036, DR-044 §2 |
| `multiple` (string) | multiple registry (プリセット) | プリセット名 | DR-036, DESIGN §6.4 |
| `multiple.accumulator` | accumulators | accumulator 住人 | DR-036, DR-111 §3 |
| `type:` | types (+ `definitions.types`) | type_parser / 糖衣プリセット / 値プリミティブ | DESIGN §3.1〜3.2, DR-028 |
| `default_fn` | cell_fns | **`Value` を返す fn のみ** (Sentinel は invalid-range) | DR-114 §2/§4 |
| `long` / `short` の variant 部品 | cell_fns | 任意の適合 cell fn (4 呼称に限らない) | DR-114 §2/§5, REFERENCE §2.2 |
| `default:` | cell_fns (内部) | typed internal `set(value)` へ縮退 | DR-114 §4 |
| `completer` | completers | completer 名 (閉集合ではない) | DR-060 §4, DR-117 §7 |
| `env:` / `config.env_auto` | env_provider | 単一スロット | DESIGN §12, DR-049 §1 |
| `config_key` / `type:"config_file"` | config_provider | 単一スロット | DESIGN §14.3, DR-050 §2 |
| `builtin/tty` factory の config `tty_stream` | tty_provider | 単一スロット (`tty` installer は無い) | DESIGN §12b/§13.1, DR-099 §4 |

**`filters` 区分は 1 つの JSON マップだが owns 集合は 3 つに割れる。** 各席は自分の lane の
owns 集合だけを見て `unknown-vocab` を一意判定する (DR-102 §2 の「1 属性 1 registry」)。
実地の pin:

- `fixtures/definition-error/final-filters-array-only-unknown-vocab.json` — ARRAY-only 綴り
  (`unique`) を `final_filters` に書くと単純 unknown-vocab
- `fixtures/definition-error/accum-filters-scalar-only-unknown-vocab.json` — scalar-only 綴り
  (`in_range`) を `accum_filters` に書くと単純 unknown-vocab
- `fixtures/definition-error/accum-filters-collector-spelling-unknown-vocab.json` — collector 綴り
  (`unwrap_single`) を `accum_filters` に書いても wrong-role にはならず unknown-vocab
  (`role`/`domain` メタデータは lookup に影響しない、DR-106 明確化 (b))

したがって collector 2 名は **filter 席のどれからも参照できず**、`multiple.collector` 席だけが
入口になる (§3.3 参照)。

### 2.1 座席の非対称 (継承・排他)

- `piece_filters` / `value_filters` の既定値は **type 継承**、`final_filters` / `accum_filters` の
  既定値は **空** (REFERENCE §2.1 の既定値欄)。継承元解決順は ref → type registry のデフォルト →
  空配列 (DESIGN §8.5, DR-062)
- accum 要素該当性 (`multiple` / `repeat` / `separator` のいずれか = `is_accum_elem`) で
  `final_filters` / `accum_filters` の座席が排他に切り替わる。誤った側への宣言は
  definition-error `invalid-range` (DR-102 §1/§3)。**綴りの解釈より wrong-seat 判定が先行**し、
  二重報告は起きない (DR-102 §3 の codex M-6 明確化)
- 座席 A `raw_filters` (分割前の生文字列、string→string、cell 単位) は **名前だけ予約され配線
  されていない** (DR-079 §3)。multiple 無し要素では座席 B が A を兼ねる縮退
- filterChain の二形: 配列 = 差し替え (継承なし) / `{prepend?, append?}` = 継承 chain への合成
  (合成順は `prepend ++ 継承 chain ++ append`)。中間への挿入は表現しない (DESIGN §8.5, DR-062)

---

## 3. タイミング軸の定義

以下の相ラベルを §4 以降で使う。正本: `docs/PIPELINE.md` §2 (字句層 7 段) / §1 (値の一生)、
DR-034 (pieceProcessor)、DR-031 (値源ラダー)、DR-102 (段 7 の分岐)。

| 相 | 内容 | 対応する段 (PIPELINE §2) |
|---|---|---|
| 供給 | 値源ラダーの各席が値を出す (CLI/link > env > config > default の 4 段固定) | §1.1 の 4 値源 |
| string 域 | 分割後 piece への string→string | 段 3 (`piece_filters`) |
| parse | string→T (types registry の value_parser) | 段 4 |
| T 域 | parse 済み値への T→T (piece 単位) | 段 5 (`value_filters`) |
| 累積 | (Acc, T) → Acc の畳み | 段 6 (accumulator) |
| 累積後 | Acc→Acc / T[]→U | 段 7b (`accum_filters`) + collector |
| 確定後 | 確定した最終セル値への T→T | 段 7a (`final_filters`) |
| 遅延 | default 席の実体化 (`observes` 依存グラフの位相順) | PIPELINE §1.1 default 行, DR-087 |
| 射影 | 結果オブジェクト / `sources` / help model への写像 | PIPELINE §1.2 e |

### 3.1 値源による通過段の違い

**「どの段を通るか」は値源の種別ではなく値の JSON 型が決める** (DR-050 §4 の一般規則、
DR-102 §5 が非 accum 要素の宣言 default へも適用範囲を拡張)。

| 値源 | string 域 (段 3) | parse (段 4) | T 域 (段 5) | 累積 (段 6) | 出典 |
|---|---|---|---|---|---|
| CLI args (消費した生文字列) | 通る | 通る | 通る | 通る | PIPELINE §2 |
| env (常に string) | 通る | 通る | 通る | separator 分割も効く | DR-049 §2, DESIGN §12 |
| config: JSON string | 通る | 通る | 通る | 通る | DR-050 §4 |
| config: 型一致の非 string (number/bool) | スキップ | スキップ | 通る | — | DR-050 §4 (型の帰結であって特別規則ではない) |
| config / 宣言 default の array | piece が JSON string なら通る | 同左 | 各 piece に適用 | **分割済み pieces** として accumulator へ (separator は登場しない) | DR-050 §4, DR-083 §2 |
| tty 観測値 (native bool) | スキップ | スキップ | 通る (`value_filters`/`final_filters`) | — | DESIGN §12b |
| 宣言 default: JSON string | 通る | 通る | 通る | 通る | DR-102 §5 |
| 宣言 default: 型一致の非 string | スキップ | スキップ | 通る | — | DR-102 §5 |
| cell fn が返す型付き `Value` | **再通過しない** | **再通過しない** | 通る (通常の set operand) | 通る | DR-114 §6.1, PIPELINE §2 段 1/段 5 |
| cell fn が返す `null` Value | — | — | **共通 dispatcher が filter を呼ばず素通し** | — | DR-131 §1.1, DESIGN §8.3 |
| `Sentinel` (`default` / `empty`) | — | — | 対象 piece が生じない | — | DESIGN §8.3, DR-130 §3 |

### 3.2 reject 位置の帰属 (argv_pos)

| 席 | 帰属 | 出典 |
|---|---|---|
| `piece_filters` | piece 実位置がある場合はそこ (入力源を問わない) | DR-102 §4 codex M-7 明確化 |
| `value_filters` | CLI 由来 piece は piece 実位置、**非 CLI 由来 (env/config/宣言 default) は `argv.length`** | DR-102 §4 codex M-7 明確化 |
| `final_filters` / `accum_filters` | 常に `argv.length` (特定トークンに帰属しない一括検証) | DR-102 §4 (実測 2 fixture) |

---

## 4. filters 区分 (9 住人)

### 4.1 signature 一覧

| 名前 | role | domain | io_type | output_mode | fallibility | invocation | reasons |
|---|---|---|---|---|---|---|---|
| `trim` | filter | scalar | string→string | transform | total | colon_args, 引数なし | — |
| `non_empty` | filter | scalar | string→string | preserve | reject | colon_args, 引数なし | `empty_value` |
| `in_range` | filter | scalar | number→number | preserve | reject | colon_args `min`,`max` (両方 required, number) | `too_small`, `too_large` |
| `regex_match` | filter | scalar | string→string | preserve | reject | colon_args `pattern` (required, string) | `pattern_no_match` |
| `increment` | filter | scalar | number→number | transform | total | colon_args, 引数なし | — |
| `unique` | filter | array | array\<value\>→array\<value\> | transform | total | colon_args, 引数なし | — |
| `length_range` | filter | array | array\<value\>→array\<value\> | preserve | reject | colon_args `min`,`max` (非負整数限定) | `too_short`, `too_long` |
| `unwrap_single` | **collector** | array | array\<value\>→value | transform | total | **object_args**, 引数なし | — |
| `from_entries` | **collector** | array | array\<value\>→map\<value\> | transform | total | **object_args** `key`?,`value`? | — |

正本: `schema/builtin-descriptors.json` の `filters` 区分。REFERENCE §6 が同じ表を手動転記
(`just lint-reference` が双方向検査)。

### 4.2 座席とタイミング (filter 7 住人)

| 名前 | 立てる座席 | 相 | 備考 |
|---|---|---|---|
| `trim` | `piece_filters` / `value_filters` / `final_filters` | string 域 (代表)、原理上は T 域/確定後にも書ける | 非 string 入力は素通し (kuu.mbt の defensive 実装、descriptor description)。実地: `piece_filters` 1 件のみ |
| `non_empty` | 同上 (scalar 3 席) | string 域 | 実地: `final_filters` 3 件 |
| `in_range` | 同上 (scalar 3 席) | T 域 / 確定後 | count の上限もここ (DR-040)。実地: `final_filters` 6 / `value_filters` 1 |
| `regex_match` | 同上 (scalar 3 席) | string 域 | compile 失敗は definition-error `invalid-argument` で実行時 reason ではない (DR-085 §1)。実地: `piece_filters` 3 件 |
| `increment` | 同上 (scalar 3 席) | T 域 / 確定後 | **fixtures / corpus に使用実績ゼロ** (grep 実地確認)。DR-077 §3 で count の update 効果から正規化された名残 |
| `unique` | `accum_filters` のみ | 累積後 | 先勝ち順序保持 |
| `length_range` | `accum_filters` のみ | 累積後 | ARRAY lane 最初の Validate 系住人 (DR-105 §4/§5) |

**scalar 3 席のどれに書けるかは descriptor が区別していない。** `domain` は「registry lane との
一致義務」(DR-106 明確化 (a)) を表すだけで、`io_type` と座席の入力型 (段 3 は string、段 5/7a は T)
の整合は Schema でも lint でも検査されない — descriptor は validator ではない (DR-061 §4)。
`increment` (number→number) を `piece_filters` (string→string 契約) に書いた場合の扱いは **未規定**。

### 4.3 collector 2 住人 — 座席が 1 つしかない

| 名前 | 座席 | 相 | 呼び出し形 |
|---|---|---|---|
| `unwrap_single` | `multiple.collector` のみ | 累積後 (accum_filters の後) | `"unwrap_single"` (bare string 可) |
| `from_entries` | `multiple.collector` のみ | 累積後 (accum_filters の後) | **bare string 不可**。`{"from_entries":"entries"}` / `{"from_entries":["key","value"]}` / `{"from_entries":"key"}` の 3 形 (DR-044 §2) |

- 適用順は **accumulator → `accum_filters` → collector** で、型整合から一意に導出される
  (`fixtures/multiple-parse/accum-filters-before-collector.json` が pin)。
  **この collector 段は PIPELINE §2 の 7 段図に現れない** (§8 の観察 O-6)
- `from_entries` の bare string は definition-time `invalid-argument`
  (`fixtures/definition-error/from-entries-bare-collector-invalid-argument.json`)
- `from_entries` は total collector で、不適合入力は Error/Reject にせず配列形のまま通し、子要素へ
  再帰適用する (DR-044 §3)
- descriptor の `parameters` は flat な `key`/`value` 2 個で、wire の 3 形の排他的 union を表現
  できていない (descriptor description が自認、完全宣言は issue
  `descriptor-conformance-promotion-revisit` の射程)

---

## 5. cell_fns 区分 (9 住人)

### 5.1 signature 一覧

`role:"fn"` は **output-only の `io_type`** を持ち、args は `invocation.parameters` が担う
(DR-114 §9)。全 9 住人が `construction:static` / `fallibility:total` / `reasons:[]`。

| 名前 | io_type.output | invocation.parameters | observes |
|---|---|---|---|
| `set` | `value` | `value` (required, repeat min:1) | — |
| `default` | `{sentinel:"use_default"}` | なし | — |
| `unset` | `{sentinel:"unset"}` ← **正本間で食い違う (§8 の D-1)** | なし | — |
| `empty` | `{sentinel:"empty"}` | なし | — |
| `incr` | `number` | なし | — (`ctx.old` は内在状態で edge ではない) |
| `borrow` | `value` | `source` (required, string) | `option:<source>` |
| `env` | `value` | `var` (required, string) | `env:<var>` |
| `uuid` | `string` | `version` (required, string) | — |
| `computed` | `value` | `key` (required, string) | `system:<key>` |

`set` だけが `invocation_parameter_expression` の `repeat` を使う (descriptor.schema.json
`$defs.fn_invocation_parameter`)。ABI は 1 種類:
`(args: string[], ctx: FnCtx) → Result<Value | Sentinel, Reason>`、`ctx.mode()` は
`"default" | "effect" | "filter"` (DR-114 §7)。

### 5.2 座席とタイミング

| 座席 | 受け入れる住人 | 相 | 出典 |
|---|---|---|---|
| `default_fn` (default 席) | **`Value` を返す 7 名** (`set`/`unset`/`incr`/`borrow`/`env`/`uuid`/`computed`) | 遅延 (上位席解決後も cell が空なら `observes` 位相順で呼ぶ) | DR-114 §4/§2, DR-087/088 |
| `default:` 糖衣 | `set` のみ (typed internal call、native JSON value を保持) | 遅延 (同上) | DR-114 §4 |
| `long` / `short` の variant 部品 | 全 9 名 (適合する限り) | 発火時 (effect) | DR-114 §2/§5 |
| `env` 入口の variant | 同上 | 発火時 | DR-114 §5 |

- **Sentinel 返し (`default` / `empty`) を default 席に書くと definition-error `invalid-range`**
  (`fixtures/help/def-error-default-fn.json` が `default_fn:"default"` で pin)
- default mode の `ctx.old` は「上位ラダー席まで解決した現在値」、effect mode は「発火直前の cell 値」
  (DR-114 §7)
- `observes` の `<parameter>` template は definition-time に decoded args と束縛して concrete edge 化
  する。literal に確定しない参照は runtime error、循環は definition-error `circular-ref`
  (DR-114 §10)
- 参照先不在は失敗ではなく **null Value** を返し、`set(null)` の一般規則でラダーを開放する
  (DR-131 §1.1) — これが 9 住人すべて `total` である根拠

### 5.3 実地の使用実績 (fixtures / corpus grep)

| 住人 | `default_fn` 席 | variant 席 |
|---|---|---|
| `set` | — (`default:` 糖衣経由) | 73 件 (`:set` 23 / `:set:…` 50) |
| `empty` | (不可) | 2 件 (`clear:empty`) |
| `incr` | — | 2 件 (`:incr`) |
| `borrow` | 14 件 | — |
| `computed` | 2 件 | — |
| `uuid` | 1 件 (negative fixture 内) | — |
| `default` | negative fixture のみ | — |
| `unset` | — | — |
| `env` | — | — |

`unset` と cell fn の `env` は positive/negative いずれの fixture にも現れない。

---

## 6. types 区分 (6 住人)

### 6.1 signature 一覧

全住人が `role:"type_parser"` / `io_type.input:"string"` 固定 / `output_mode:"transform"` /
`invocation.encoding:"none"` / `fallibility:"reject"`。

| 名前 | construction | output | config キー | reasons |
|---|---|---|---|---|
| `builtin/number_parser` | factory | `number` | `number_thousand_sep` (array\<string\>, `["_"]`) / `number_allow_base_prefix` (bool, false) / `number_leading_zero` (enum decimal\|octal, decimal) | `not_a_number` |
| `builtin/int_parser` | factory | `number` | `int_round` (enum 10 種, `error`) | `not_a_number`, `not_an_integer`, `int_out_of_range` |
| `builtin/bool_parser` | factory | `bool` | `bool_true_values` (`["true","1"]`) / `bool_false_values` (`["false","0",""]`) / `bool_case_insensitive` (true) | `not_a_bool` |
| `builtin/tty` | factory | `bool` | `tty_stream` (enum stdin\|stdout\|stderr, **required**) | `not_a_bool` |
| `fixture/int_range` | static | `{record:{start:int,end:int}}` | — | `not_an_int_range` |
| `fixture/json` | static | `value` | — | `not_json` |

config キー名は factory 名 prefix が正準 (DR-100)。

### 6.2 座席とタイミング

| 住人 | 座席 | 相 |
|---|---|---|
| `builtin/*` (factory 4 種) | `definitions.types` で config 束縛してローカル名を作り、`type:` から参照 | parse (段 4) |
| `fixture/*` (2 種) | `type: "fixture/int_range"` の ns 付き参照で直接 | parse (段 4) |

- factory の定義側参照形は `{"name":"<factory名>","config":{...}}`。canonical default =
  factory の default config (REFERENCE §3.2)
- `tty_stream` が必須なので **bare `type:"tty"` は definition-error `invalid-range`**
  (要素名からの推測はしない、DR-099 §3 / TTY-Q2=(c))。実地: `"name":"builtin/tty"` 3 件が
  `definitions.types` 経由、bare `"type":"tty"` は
  `fixtures/definition-error/tty-stream-missing.json` の 1 件のみ (negative)
- `fixture/*` は conformance 専用 namespace (DR-128 §12 / DR-132)。提供義務は conformance 実行
  文脈での解決可能性のみで、通常 registry への常設は実装裁量かつ安定性保証外 (DR-132 §1)
- `builtin/tty` だけが **provider を経由する type** — parse 相自体は素の bool と同一で、
  値の由来 (tty_provider の観測 → 宣言 default) は値源ラダー §11.4 の default 席の
  **型依存解決規則** (`resolved_default = 観測 ?? 宣言 default ?? null`)。ラダーは 4 段固定のまま
  tty 専用席を持たない (DESIGN §12b, DR-130 §9.1)

### 6.3 「構文 parse」と「値空間判定」の混在 (DR-075)

`builtin/int_parser` は **構文判定ではなく値空間判定** — トークンを number として parse し、その
**値**が整数なら受理する (`"3.0"`→3 / `"1e3"`→1000 / `"1_000"`→1000、DR-075 §1)。
真に fractional な値だけが `int_round` の対象になる。したがって:

- `not_a_number` は number 字句として読めない入力 (`builtin/number_parser` と共有 emit)
- `not_an_integer` は **`int_round:"error"` のときだけ** emit (丸めモードでは丸めて成功するため、
  descriptor の reasons 宣言はモード依存で over-approximate)
- 判定は **binary64 を経由しない厳密判定が spec 必須要件** (DR-075 §5)。ただし config の native
  number 源は JSON が既に binary64 化した値が来るため保証対象外 (DR-050 §4 の非対称)

reason 語彙は排他所有ではないグローバル語彙で、`not_a_number` は number_parser と int_parser、
`not_a_bool` は bool_parser と tty が共有 emit する (descriptor.schema.json の `reasons` description)。

### 6.4 descriptor を持たない type

REFERENCE §3.1 が列挙する type カタログのうち descriptor 実体を持つのは上の 6 種だけで、
**値プリミティブ `string` / `path` / `file` / `dir` / `exact` / `datetime`、値空間なしの `none`、
糖衣プリセット 12 種 (`flag` / `count` / `count_or_set` / `command` / `help` 系 5 種 /
`completion_script` / `dd` / `config_file`) は descriptor を持たない** (`reasons:[]` が自明な型は
descriptor 化しない、DR-095 §射程外)。REFERENCE §3.1 は「本表が唯一のカタログ」と自認しており、
**機械検査の対象外**。

また、`type:"int"` が `builtin/int_parser` を使うという対応関係自体は散文
(REFERENCE §3.1 / §3.3 の factory 欄) にしか無く、機械可読な宣言が存在しない (§8 の観察 O-4)。

---

## 7. accumulators / completers / providers

### 7.1 accumulators (3 住人)

全住人が `construction:static` / `output_mode:transform` / `fallibility:total` / `reasons:[]` /
`invocation.encoding:"object_args"` (const 固定、DR-111 §1)。

| 名前 | io_type | parameters | 座席 | 相 |
|---|---|---|---|---|
| `append` | array\<value\>→array\<value\> | `flatten` (bool, optional, default false) | `multiple.accumulator` (プリセット `append`/`set`/`map` の中身) | 累積 (段 6) |
| `merge` | array\<value\>→array\<value\> | なし | 同上 (プリセット `merge`) | 累積 |
| `kv_map` | array\<string\>→map\<string\> | なし | 同上 | 累積 |

- `io_type` が宣言するのは **畳み相 (collect) だけ**。参照実装の ABI が持つ cell 解決相
  (`resolve_cli`) は評価器内部プロトコルで宣言対象外 (DR-111 §2)
- `flatten` は `append` 専用ダイヤル。他 accumulator へ書くと **キーの存在自体が**
  definition-error `invalid-range` (存在ベース wrong-seat 判定、DR-105 §2)。`append` だけが
  `parameters` に `flatten` を持つという descriptor 宣言がその機械可読な根拠 (DR-111 §4)
- `kv_map` の「`=` を含まない piece の拒否」は **matcher 手前ゲート (node 層)** であって
  accumulator の fallibility ではない (DR-105 §4, DR-111 §1)
- `merge` のマーカー語彙 (remove `-x` / splice `@` / escape `+`) 認識は cell 解決相の関心で
  descriptor の io_type に現れない。`merge` × `ref` は definition-error (DR-084 §3)
- 廃止・非収載: `flatten` accumulator は DR-105 §3 で廃止 (旧名を書くと unknown-vocab、
  `fixtures/definition-error/accumulator-flatten-legacy-unknown-vocab.json`)、`increment` は
  DR-111 §3 で除外、`override` は概念モデル上の名前で registry 住人ではない (同 §3)
- `separator` / `default_collector` / `default_separator` は宣言軸に載せない (DR-111 §4)

### 7.2 completers (2 住人)

| 名前 | 宣言軸 | 座席 | 相 |
|---|---|---|---|
| `files` | name / role / construction:static / invocation:none / reasons:[] のみ | `completer:` | 補完クエリ (射影相の外、DR-060) |
| `dirs` | 同上 | `completer:` | 同上 |

- **`io_type` は禁止** — 出力契約 (素の値文字列の列) は DR-060 §4 が散文で確立済みだが、
  glue ↔ binary ABI 確定後 (DR-117 §8.3) も descriptor へ昇格しない
- `fallibility`/`reasons` も禁止/空 — 補完チャンネルに reason を表面化する経路が無く、失敗は
  「候補ゼロ」への縮退が唯一の表現 (DR-111 §5)
- builtin 集合は **閉じない**。実地の fixtures には wire 席に app 定義の completer 名
  `hosts` (`fixtures/complete/completer-positional.json`) / `urls`
  (`fixtures/complete/completer-merge-conflict.json`) が現れる。`path` は `files` と shell 委譲
  粒度で差が立たないため非収載 (DR-117 §7)
- 候補の merge で completer が食い違うと **completer なしへ畳む** (期待値側に `"completer": ""`
  が現れる、`fixtures/complete/completer-merge-conflict.json`、DR-104 §3)

### 7.3 providers (3 住人)

`construction:static` / `invocation:none` / `reasons:[]` 固定。`output_mode`/`fallibility` は
**禁止** — `null` 返却は `io_type.output` の union で表し、filter の reject/reason 機構とは
意味論が異なる (DR-107 §6)。

| 名前 | io_type | 座席 (引かれ方) | 相 |
|---|---|---|---|
| `env_provider` | string → \[string, null\] | `env:` / `config.env_auto` (env installer の lookup) | 供給 (ラダー第 2 段) |
| `config_provider` | string → \[map\<value\>, null\] | `config_key` / `type:"config_file"` (config installer の lookup) | 供給 (ラダー第 3 段、経路確定後) |
| `tty_provider` | string → \[bool, null\] | `builtin/tty` factory の config `tty_stream` 経由 (**installer を持たない**) | 供給 (default 席の型依存解決) |

- `env_provider` が受け取る key は **prefix 連結済みの最終名**。null = 未設定、空文字列は
  「設定されている」(DR-049 §1)
- `config_provider` の input は path、output は JSON 同型の階層オブジェクト。フォーマット・探索・
  マージは provider の関心 (DR-050 §2)。config は **構造に影響しない値源に徹する** — 経路探索は
  config なしで完走できることが不変条件 (DR-050 §5)
- `tty_provider` の input は本来 3 値 enum だが、io_type の値語彙にリテラル enum 制約が無いため
  `string` で近似し許容値は description に書いている (descriptor description、DR-107 §6)
- ambient probe (`isatty` 呼び出し) は provider 実装の責務に閉じ、評価器は純データ返却のみを見る
  (DR-098 §2, DR-099)
- **IO を持つ装置は providers 3 スロットだけ** で、値の検証・選択に IO を伴う語彙
  (readable / exists / dir 等) の座席は未裁定 (issue `2026-08-12-io-predicate-vocabulary-seat.md`、
  選択肢は (a) filter 語彙に IO 系を追加し descriptor へ IO 観測タグ / (b) role 軸に IO 検証系の
  装置区分を新設)

---

## 8. 横断的な構造の観察 — 「一新するならここが継ぎ目」

改善案は書かない。事実ベースの構造線と、正本間の食い違いだけを列挙する。

### 8.1 構造の観察 (O)

**O-1. 1 区分に 2 role が同居している (`filters`)。**
`filters` 区分は role `filter` 7 + `collector` 2 で、呼び出し規約も違う
(`colon_args` vs `object_args`)。同居の根拠は DR-036 の「collectors registry は新設しない、
filters で代替」。結果として §2 のとおり **1 つの JSON マップの中に owns 集合が 3 つ** (scalar
lane / ARRAY lane / collector lane) あり、どの lane に属するかは `domain` + `role` の組み合わせ
から読者が導出する構造になっている。

**O-2. 座席の数と装置の数が対応していない。**
scalar filter 5 名は 3 席 (`piece_filters`/`value_filters`/`final_filters`) のどれにも書けるが、
ARRAY filter 2 名は 1 席、collector 2 名も 1 席 (`multiple.collector`) しか無い。
座席と装置の対応が「1 対多」「多対 1」「1 対 1」の 3 種混在。

**O-3. 座席名が accum 有無で変わる非対称 (DR-102)。**
同じ「確定後の値に効く」意図でも、要素が `multiple`/`repeat`/`separator` を持つかどうかで
書くべき属性名が `final_filters` / `accum_filters` に切り替わり、誤った側は
definition-error `invalid-range`。分割の根拠は型の違い (T→T vs Acc→Acc) と argv_pos 帰属では
なく型そのもの (DR-102 §1)、および「違うものを違うものとして扱え」という kawaz 裁定
(DR-102「採用しなかった案」)。既定値も非対称で、type 継承があるのは B/C 席だけ (§2.1)。

**O-4. type の「解決」は descriptor 体系の外にある。**
`type:"int"` → `builtin/int_parser`、`type:"number"`/`"float"` → `builtin/number_parser` という
対応は REFERENCE §3.1/§3.2 の散文だけが持ち、機械可読な宣言が無い。
さらに **type registry のデフォルト filter chain** は継承元として現役の仕様
(DESIGN §8.5, DR-062, DR-009 第 5 段階、PIPELINE §4 の types 行が
「parse + default filters + config キー」と明記) なのに、`descriptor.schema.json` には
それを宣言する軸が存在せず、builtin type で宣言している住人も 0 件。

**O-5. 糖衣プリセットは type の座に居るが descriptor 体系の住人ではない。**
`flag` / `count` / `count_or_set` / `command` / `help` 系 5 種 / `completion_script` / `dd` /
`config_file` は `type:` から引かれるが descriptor を持たず (§6.4)、installer が回収する。
`tty` だけが「糖衣プリセット かつ factory」という両属性を持つ (REFERENCE §3.1 の種別欄が
「糖衣プリセット / factory」と併記)。

**O-6. collector 段が値パイプライン図から抜けている。**
PIPELINE §2 の 7 段図は 段 7a/7b で終わり、`T[]→U` の collector 段が現れない。実際の適用順
`accumulator → accum_filters → collector` は fixture
(`fixtures/multiple-parse/accum-filters-before-collector.json`) と DESIGN §6.2 のパイプライン記述
だけが持つ。

**O-7. cell_fns 区分は「値供給」と「cell 操作 (Sentinel)」の混在。**
9 住人のうち 7 名が `Value` を返す値供給系、2 名 (`default` / `empty`) が Sentinel を返す
effect 専用の cell operation。両者は同じ registry・同じ ABI を共有するが、**受け入れられる座席が
違う** (default 席は Value 返しのみ)。区別は descriptor の `io_type.output` が
tagged Sentinel かどうかだけで表現されており、`role` は両者とも `fn`。
DR-131 (sentinel reduction) が `unset` を Sentinel 群から Value 群へ移した経緯があり、
その反映漏れが D-1。

**O-8. 同じ機能への入口が 2 つある (env)。**
env 値の取得は (a) 値源ラダーの env 席 (`env:` 属性 → `env_provider`、供給相) と
(b) cell fn の `env`(`default_fn:"env:VAR"` / variant、遅延・発火時) の 2 経路がある。
descriptor は明示的に「値源ラダーの env 席とは別の universal fn 呼び出し」と書いている
(`cell_fns.env` の description)。同様に `borrow` は削除された `inherit` 席の役割を default 席で
肩代わりしている (DR-125 §3)。

**O-9. filterChain の二形 (`array` / `{prepend,append}`) は 4 属性すべてに一様。**
合成順は `prepend ++ 継承 chain ++ append`、中間挿入は表現しない (DESIGN §8.5)。
一方 filter の呼び出し形は 3 表記ある — colon-string `"in_range:1:65535"` / 1 段 array
`["regex_match","..."]` / オブジェクト形 `{"name":...,"args":[...]}` (colon を含む引数用、
DR-085 §3)。エスケープ規則は持たない。

**O-10. 「宣言」と「検査」の境界が装置ごとに違う。**
descriptor は validator ではない (DR-061 §4) が、descriptor の宣言内容を definition-time 検査の
**入力**として使う箇所がある (`append.parameters.flatten` の存在ベース wrong-seat 判定、
DR-111 §4)。一方 `invocation.parameters[].constraint` は informative で強制検証しない
(descriptor.schema.json)、`output_mode:"preserve"` ⇒ `input == output` は Schema では強制せず
semantic lint 送り (DR-107 §4 / codex #4 A-M6(2))、座席の入力型と `io_type` の整合は
どこも検査していない (§4.2)。

**O-11. reason 語彙はグローバルで、装置は排他所有しない。**
`not_a_number` は 2 住人、`not_a_bool` は 2 住人が共有 emit する。一方 `reasons` は
over-approximate を許す (`int_parser` の `not_an_integer` は `int_round:"error"` 時だけ emit、
§6.3)。fallibility ⇔ reasons の cardinality だけが機械強制される。

**O-12. IO の所在が providers 3 スロットに閉じている。**
値の検証・選択に IO を伴う語彙の座席は未裁定 (§7.3、issue
`2026-08-12-io-predicate-vocabulary-seat.md`)。config 探索 (DR-133 再改稿) と cd 型補完の 2
ユースケースが待っている。

### 8.2 未規定 (U)

| # | 内容 | 出典 |
|---|---|---|
| U-1 | 座席 A `raw_filters` (分割前の生文字列、string→string、cell 単位) は名前だけ予約され配線されていない。エスケープ / splitter との責務分担も配線時に裁定 | DR-079 §3 |
| U-2 | scalar filter の `io_type` と座席の入力型の整合 (例: `increment` を `piece_filters` に書く) の扱い | §4.2、検査主体が存在しない |
| U-3 | `incr` の詳細契約 (`old` が absent の場合) は「P3 の kuu.mbt 実装時に確定」の暫定契約 | `cell_fns.incr` の descriptor description |
| U-4 | `uuid` の `version` 許容集合は「P3 の kuu.mbt 実装時に確定」の暫定契約 | `cell_fns.uuid` の descriptor description |
| U-5 | `from_entries` の wire 3 形 (排他的 union) は現 descriptor schema の flat parameters で表現できず、簡略形に留まる | `filters.from_entries` の descriptor description |
| U-6 | `type:"none"` 要素への `value_filters`/`piece_filters` 宣言の可否 (`final_filters`/`accum_filters` は invalid-range と確定済み) | DR-102 §3 codex M-9 明確化が「本明確化の対象外」と明示 |
| U-7 | `datetime` type の canonical 字句仕様 | REFERENCE §3.1 (「未確定」)、DR-095 射程外 |
| U-8 | IO 述語系語彙 (readable / exists / dir) の座席 | issue `2026-08-12-io-predicate-vocabulary-seat.md` |
| U-9 | installer role の descriptor は宣言軸が未実体化のまま (role enum には居るが収載 0 件) | `builtin-descriptors.json` $comment、DR-095 §射程外 |
| U-10 | constraint 系 reason (`required_violated` 等) は constraint installer 側で別途宣言が必要だが未実体化 | 同上 |

### 8.3 正本間で食い違う / ドリフトしている点 (D)

| # | 内容 | 食い違いの両側 |
|---|---|---|
| **D-1** | **`unset` の出力型**。`builtin-descriptors.json` は `io_type.output: {"sentinel":"unset"}`、`descriptor.schema.json` の `fn_output_type` も sentinel enum に `"unset"` を持つ。一方 DR-131 / DR-114 冒頭更新 / DR-114 §9 の例 (`"output":"null"`) / PIPELINE §1.1・§3.1 / REFERENCE §6b はいずれも「`unset` は **null Value** を返し、Sentinel は `use_default` / `empty` の 2 つ」と規定。schema 側が sentinel enum に `"unset"` を残しているため `just lint-descriptors` は OK で通り、この食い違いは機械検査に掛からない (実行して確認、32 件全 OK) | descriptor 実体 + schema vs DR-131/DR-114/PIPELINE/REFERENCE |
| **D-2** | **cell_fns の住人数**。`descriptor.schema.json` の envelope description は「canonical **10** 住人の完備性を強制」と書くが、`required` 配列は 9 名 | 同一ファイル内 (description vs required) |
| **D-3** | **`int_out_of_range` の値域**。REFERENCE §7.5 は「実装定義の値域 (参照実装は Int64)」、REFERENCE §3.1 と `builtin/int_parser` descriptor は「canonical 値域 = 絶対値 2^53 inclusive、旧『実装定義』規定は superseded (AP2-Q1=a)」 | REFERENCE 内部 (§7.5 vs §3.1) + descriptor |
| **D-4** | **registry 区分の数と顔ぶれ**。DESIGN §13.1 は「現役の区分は 10 個」(types/filters/cell_fns/accumulators/multiple/env_provider/config_provider/tty_provider/completers/installers)、PIPELINE §4 は「registry 8 区分」で `handlers` を含み config_provider/tty_provider/installers を欠く | DESIGN §13.1 vs PIPELINE §4 |
| **D-5** | **座席名のドリフト**。DR-049 §2 / DR-050 §4 は `pre_filters` / `post_filters` の旧名で書かれている (DR-079 §2 で `piece_filters` / `cell_filters` へ改名、さらに DR-102 で `final_filters`/`accum_filters` へ分割済み) | DR-049/DR-050 vs DR-079/DR-102 |
| **D-6** | **config キー名のドリフト**。DR-049 §3 は `config.auto_env`、現行 canonical は `env_auto` (REFERENCE §4、DESIGN §12、DR-100) | DR-049 vs REFERENCE/DESIGN |
| **D-7** | **`unwrap_single` の存在理由**。descriptor description と REFERENCE §6 は「multiple プリセット `override` の default_collector」と書くが、DR-111 §3 は `override` を「概念モデル上の名前であって registry 住人ではない」と確定し、§4 で「`default_collector` は override の退場により全住人 `identity` で一様」と書く。実地でも `unwrap_single` は明示 `multiple.collector` 経由でのみ使われる (`fixtures/multiple-parse/collector-unwrap-single.json`) | descriptor + REFERENCE vs DR-111 §3/§4 |
| **D-8** | **multiple プリセットが参照する collector の実在**。DESIGN §6.4 のプリセット表は `set` → collector `to_set`、`append`/`merge` → `identity` を規定するが、`to_set` / `identity` はいずれも `builtin-descriptors.json` の住人ではない (収載 collector は `unwrap_single` / `from_entries` の 2 名) | DESIGN §6.4 / DR-036 vs builtin-descriptors.json |
| **D-9** | **DESIGN §6.3 の縮退モデル**。「multiple 無しは accumulator: `override` / collector: `unwrap_single` の縮退」と書くが、DR-111 §3 は参照実装が multiple 無し要素を accumulator 経路に乗せない (accum 名 None の fast path) と記録 | DESIGN §6.3 vs DR-111 §3 |
| **D-10** | **fixture why 文中の owns 集合**。`fixtures/definition-error/value-filters-unknown-vocab.json` の why は scalar 席の owns 集合を「trim / non_empty / in_range / regex_match / unique / increment」と列挙するが、`unique` は ARRAY lane 専用で scalar 席の owns には無く (DR-102 §2、同ディレクトリの `final-filters-array-only-unknown-vocab.json` が逆向きに pin)、`length_range` が欠けている | fixture why vs DR-102/DR-105 |
| **D-11** | **DR-036 の registry 内容表**。accumulators registry として `override` / `increment` / `flatten` / `to_set` / `sum` / `identity` を列挙するが、`flatten` は DR-105 §3 で廃止、`increment` / `override` は DR-111 §3 で非収載と確定済み (DR-036 側に Superseded 注記なし) | DR-036 vs DR-105/DR-111 |

---

## 9. 実地確認の記録 (grep 由来の一次データ)

`fixtures/` + `corpus/` に対する grep の生の結果。§4〜§7 の「実地」記述の裏付け。

- filter 座席別出現: `piece_filters` = trim 1 / regex_match 3、`value_filters` = in_range 1、
  `final_filters` = non_empty 3 / in_range 6 / unique 1 (negative) 、
  `accum_filters` = length_range 4 / unique 1 / in_range 1 (negative) / unwrap_single 1 (negative)
- `increment` filter の使用実績 = 0 件 (言及は
  `fixtures/definition-error/value-filters-unknown-vocab.json` の why 文中のみ)
- `multiple.collector`: `unwrap_single` 2 件 / `from_entries` 1 件
- `multiple.accumulator`: append 39 / merge 10 / kv_map 2 / flatten 1 (negative)
- `completer:` の全出現 10 件 (wire 席と期待値の両方を含む): `files` 6 /
  `hosts` 2 (wire 1 + 期待値 1) / `urls` 1 (wire) / `""` 1 (期待値のみ)
- type 参照: `"name":"builtin/tty"` 3 (definitions.types 経由) / `"type":"fixture/int_range"` 2 /
  `"type":"fixture/json"` 2 / bare `"type":"tty"` 1
  (`fixtures/definition-error/tty-stream-missing.json`、negative)
- variant 席の grep は `fixtures/` のみ (`":set"` 23 / `":set:…"` 50 / `":incr"` 2 /
  `clear:empty` 2)、`default_fn` の grep は `fixtures/` + `corpus/`
- cell_fn 席: §5.3 の表を参照

---

## 関連

- 装置の宣言軸: DR-061 (descriptor 原型) / DR-095 (builtin descriptor reasons) /
  DR-106 (role/carrier 軸) / DR-107 (直交軸) / DR-111 (accumulator/completer 行) /
  DR-114 (fn role + observes)
- 座席とパイプライン: DR-009 / DR-034 / DR-062 / DR-079 / DR-102 / DR-105 / docs/PIPELINE.md
- 値源: DR-031 / DR-049 / DR-050 / DR-081 / DR-087 / DR-088 / DR-098 / DR-099 / DR-125 / DR-131
- 累積と整形: DR-036 / DR-043 / DR-044 / DR-080 / DR-084 / DR-091 / DR-123
- 型: DR-040 / DR-074 / DR-075 / DR-076 / DR-089 / DR-126 / DR-128 / DR-132
- 補完: DR-060 / DR-104 / DR-117
- 未裁定: issue `2026-08-12-io-predicate-vocabulary-seat.md`
