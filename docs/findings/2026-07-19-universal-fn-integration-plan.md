# universal fn 統合の設計プラン — variant DSL effect + filter DSL + default_fn の 1 機構集約

> 由来: kawaz 発題 (mid=29)「long DSL の :区切り 2 個目以降の仕様って default_fn のデスクリプタと同じと言えるのでは? そう考えるとむしろ long に値源としての default_fn を持って来ることもできそう」+ HIP-META-Q8=A 裁定 (mid=32) の受け入れ + Q7-α+一本化 (mid=28+32) の完成形。
>
> 統括 (Opus 4.7) が起草、universal fn 機構を kuu の背骨に組み込む設計プラン。範囲精査 + 波及 + 実装コスト見積 + v1 スコープ判断を kawaz レビュー用に整理する。DR-113 修正 (or 新 DR-114 起草) の下敷き。

## 1. 統合の骨格 — kuu の背骨に fn 機構を立てる

### 1.1 現状の 3 種 DSL

現 kuu spec には表面的に類似した 3 種の DSL が並立している:

| DSL | 用途 | 場所 | 例 |
|---|---|---|---|
| **variant DSL** | 発火時 cell operation (effect 4 種 = set/default/unset/empty) | `long: [...]` / `short: [...]` の各要素 (DESIGN §7.3-7.4、DR-011) | `":set:X"` / `"no:set:false"` / `"red:set:rgb:255:0:0"` |
| **filter DSL** | 値の変換・検証 | `piece_filters` / `value_filters` / `final_filters` / `accum_filters` の各要素 (DESIGN §8.4) | `"trim"` / `"in_range:1:65535"` / `"regex_match:^[a-z]+$"` |
| **default_fn DSL** (HIP-META-Q6=A で新設、Q7-α で fn 名 `set` 統一) | default 席の値計算 | 要素の `default_fn: ...` 属性 (糖衣: `default: value` / `env: "VAR"` / `inherit: true`) | `"set:60"` / `"borrow:help-full"` / `"env:LOG_FILE"` |

3 種とも書式 (`"name[:arg...]"`) が同型、意味論も「fn 呼び出しで結果を得る」の点で近い。**統合可能性の設計プラン**を本 finding で示す。

### 1.2 統合案 — universal fn 機構

**universal fn = 「name で registry から fn 実体を引き、colon-args + FnCtx を渡して呼び出し、結果を得る」の 1 種類の機構**。3 種の DSL は universal fn の specialization として位置づける:

| specialization | universal fn 呼び出しの解釈 | 結果の使い方 |
|---|---|---|
| **variant DSL** (発火時 cell operation) | 発火時に fn を呼び、返り値を cell operation として cell に適用 | set 系 = 値供給、default 系 = default 席参照、unset 系 = cell クリア、empty 系 = 配列/Map 空に |
| **filter DSL** (値の変換・検証) | 値を fn に渡し、変換後の値 or reject を得る | pipeline の各段で fn 適用 |
| **default_fn DSL** (default 席の値計算) | default 席で fn を呼び、結果を default 値として供給 | 値源ラダーの default 席 (DESIGN §11.4) |

### 1.3 統合のメリット (v1 完備主義準拠)

1. **DSL 集約**: 3 種の書式・意味論的重複を 1 種に統一、学習コスト減
2. **descriptor 集約**: 3 種の registry (variant effect / filter / default_fn) を統一 descriptor 群で扱える (DR-107 の直交軸を universal fn 用に拡張)
3. **DR-088 kawaz 裁定原文の完成形**: 「値源は全て default_fn」= universal fn の統合形
4. **kuu 背骨 (or/seq/repeat/link/ref) との整合**: 「機構を統一する思想」の延長
5. **3rd party 拡張の対称性**: サードパーティ fn が variant effect / filter / default_fn のいずれとしても使える (DR-094 namespace で名前空間分離)
6. **循環チェックの universal 化**: DR-087 遅延解決グラフに全 fn が乗る (FnCtx.observes 軸で依存グラフ構築)

### 1.4 統合の懸念 (v1 スコープ判断の材料)

1. **範囲膨大**: variant DSL / filter DSL / default_fn の 3 機構を統合、DESIGN 4 節 / DR 5 本以上 / fixtures 大部分に波及
2. **実装 (kuu.mbt) の広範書き直し**: 3 種 DSL の parser / lowering / evaluator を統合機構に集約
3. **既存 wire form 記法の互換性**: 糖衣として維持する記法と、統合 DSL で新設される記法の混在
4. **descriptor 直交軸の拡張範囲**: DR-107 §3 の型体系 (現 "value" 近似) を拡張するか、統一 role の追加、observes 軸の追加

**v1 完備主義 (memoried) に沿えば今統合すべき**が、範囲を考慮した段階的な組み込み計画 (§4 で提示) を経て kawaz 最終裁定を仰ぐ。

## 2. 3 種 DSL の fn 化マッピング

### 2.1 variant DSL effect の fn 化

現 variant DSL (DESIGN §7.4 の effect 4 種):

| variant effect | 現形 | fn 化 (universal fn 呼び出し) |
|---|---|---|
| `set` (値なし) = 値スロット | `":set"` (主入口、値スロット) | 値スロット準備 = 発火時ユーザ引数を受けて fn を呼ぶ準備 (fn 呼び出しでなく「値供給待ち」の宣言) |
| `set` (1 個以上引数、固定値供給) | `"no:set:false"` / `"red:set:rgb:255:0:0"` | **`fn:"set"` を呼ぶ**、args = 引数配列。set fn は「渡された値をそのまま返す」= constant 同型 |
| `default` (default に戻す、committed=true) | `":default"` | **`fn:"default"` を呼ぶ**、default 席の default_fn を呼び出す (default 席参照) |
| `unset` (default に戻す、committed=false) | `":unset"` | **`fn:"unset"` を呼ぶ**、cell を unset に |
| `empty` (配列/Map を空に) | `":empty"` | **`fn:"empty"` を呼ぶ**、配列/Map を空に |

**帰結**: variant DSL の effect 部分は universal fn 呼び出しに集約。**`long: [":set:X"]` は `long: [":fn:set:X"]` の糖衣** (`:` の 2 個目が fn 名、それ以降が args) と読める。ただし DSL 書式は現行 `:set:X` のまま維持 (糖衣、破壊的でない)。

**発火時 cell operation**: fn の返り値を cell に書く形。set fn は value を返す → cell に set operation、default fn は default 席参照値を返す → cell に set operation (default 値で書く)、unset fn は sentinel を返す → cell に unset operation、empty fn は空配列/Map sentinel を返す → cell に empty operation。**fn 返り値の型 (Value / Sentinel) が cell operation の種類を決める**設計 (or fn descriptor の output_mode で明示的に区別)。

### 2.2 filter DSL の fn 化

現 filter DSL (DESIGN §8.4、4 属性: piece_filters / value_filters / final_filters / accum_filters):

| 現形 | fn 化 |
|---|---|
| `"trim"` | `fn:"trim"` を呼ぶ、args = []、pipeline 内で値を変換 |
| `"in_range:1:65535"` | `fn:"in_range"` を呼ぶ、args = ["1", "65535"] |
| `"regex_match:^[a-z]+$"` | `fn:"regex_match"` を呼ぶ、args = ["^[a-z]+$"] |

**帰結**: filter DSL は既に universal fn 呼び出しに近い形。「fn を pipeline の各段で適用」の意味論。DR-107 の `role: "filter"` 軸をそのまま universal fn の specialization として扱う (統合後は `role` に filter / default_fn / effect などが並ぶ、または `role: "fn"` に統一して `fn_kind` サブ軸で分ける)。

### 2.3 default_fn DSL の完成形

Q7-α+一本化 (mid=28+32) 確定の形:

| 糖衣 (wire form 不変) | universal fn 呼び出し |
|---|---|
| `default: value` | `default_fn: "set:<value>"` = `fn:"set"`, args=[value] |
| `env: "VAR"` | `default_fn: "env:VAR"` = `fn:"env"`, args=[VAR] |
| `inherit: true` | `default_fn: "inherit"` = `fn:"inherit"`, args=[] |
| `inherit: {"from": "other"}` | `default_fn: "inherit:other"` = `fn:"inherit"`, args=[other] |
| `default_fn: "fn:args"` (明示) | そのまま |

### 2.4 long DSL への default_fn 引き込み (kawaz mid=29 提案)

現 variant DSL は「long/short の入口宣言」に閉じている。kawaz 提案:

- `long: ["ttl:set:60"]` = 発火時に `fn:"set"`, args=["60"] を呼ぶ = 現 `":set:60"` と同型
- `long: ["ttl:env:TTL"]` = 発火時に `fn:"env"`, args=["TTL"] を呼び、結果を cell に set
- `long: ["ttl:borrow:other-ttl"]` = 発火時に他 option 値を borrow して cell に set

**帰結**: variant DSL の effect が universal fn になった段階で、long DSL は自動的に default_fn を発火時にも呼べる (「発火時 fn 呼び出し」= universal fn 統合の帰結)。**default_fn は「default 席で呼ぶ fn」だが、long DSL からも同じ fn を呼び出せる**。

これは「fn は呼び出し文脈 (default 席 / 発火時 / filter 段) を問わず同じ実体を再利用できる」の対称性で、kuu 背骨 (機構統一) と整合。

### 2.4b args 値の colon 含む問題 — array 記法の導入 (kawaz mid=34 発題)

**問題**: colon-args DSL (`"fn:arg1:arg2"`) は args に colon (`:`) を含む値を書けない。例: `env: "PATH:LOCAL"` を borrow したい時、`"env:PATH:LOCAL"` は fn=env, args=["PATH", "LOCAL"] と読まれる。

**エスケープ案の却下** (kawaz 懸念): `\:` の暗黙知要求 (どの文字要エスケープ / 不要文字にエスケープつけたらどうなるかの不安)、事故源になる。導入しない。

**採用案 — array 記法** (kawaz mid=34 提案、統括推し 1 段限定):

wire form 上、colon-string と array of string を**同じ位置で受け入れる**混在配列を許容:

```json
long: [
  "no:set:false",              // 従来の string (colon 区切り済み)
  ":set",                       // 従来の string
  ["", "set", "a:b"],           // array 記法: prefix="" / fn="set" / args=["a:b"] (colon 含む)
  ["debug", "env", "LOG:PATH"]  // array 記法: prefix="debug" / fn="env" / args=["LOG:PATH"]
]
```

**規約 (1 段限定)**:
- 各要素は string or array of string の**どちらか**
- **array 要素の中身は string のみ** (array of array は不許可 = 1 段限定、際限なし化を回避)
- string 記法と array 記法は**意味論的に等価** (`"no:set:false"` = `["no", "set", "false"]`)
- 混在配列 OK: 同じ `long: [...]` 内で string と array が混ざってよい

**利点**:
- エスケープ不要、書き手は「colon 含む値」を意識せず自然に書ける
- 既存 wire form (string 配列) は不変 (糖衣として維持、破壊的でない)
- schema 更新: `oneOf: [{type: "string"}, {type: "array", items: {type: "string"}}]` の追加のみ
- parser 更新: string 要素は colon で split (既存)、array 要素はそのまま部品配列として扱う

**適用範囲**: universal fn DSL の全席 (variant DSL の long/short/env、filter DSL の各段、default_fn 属性) で同じ規約を採用。統一感 + 混乱回避。

### 2.5 統合後の fn 呼び出し ABI (Q7-γ-45=b + kawaz mid=35 + mid=38 反映、統一 FnCtx + mode 判別)

kawaz mid=38 指摘: 2 種類の ctx を fn signature で受けるのは対称性を欠く、**統一 FnCtx + mode 判別 + 個別 ctx 取得** の設計に変更:

```
fn signature (統一): (args: string[], ctx: FnCtx) → Result<Value | Sentinel, Reason>

FnCtx API (mode 判別 + 個別 ctx 取得、kawaz mid=38 案):
- ctx.mode() → "default" | "effect" | "filter"  (呼び出し文脈の識別)
- ctx.as_default() → DefaultCtx | null   (mode="default" 時のみ非 null、逆は null)
- ctx.as_effect()  → EffectCtx | null    (mode="effect" 時のみ非 null)
- ctx.as_filter()  → FilterCtx | null    (mode="filter" 時のみ非 null)
- 共通 API (mode 非依存):
  - ctx.env(var)
  - ctx.system(key)
  - ctx.observes() → 自 fn が宣言した observes 集合の runtime 参照

言語別実装:
- Rust: enum FnCtx { Default(DefaultCtx), Effect(EffectCtx), Filter(FilterCtx) } + shared env/system
- Kotlin/MoonBit: sealed class + when 分岐
- 動的言語: dict/hash + mode key

observes 軸 (descriptor 側で宣言): ["option:<name>", "env:<var>", "system:<key>", ...]
```

**fn 内部の使い方**:
- 特定 mode 前提: `let ctx_d = ctx.as_default()?; ctx_d.borrow_option(name)` (null なら error)
- mode 分岐: `match ctx.mode() { "default" => ..., "effect" => ..., "filter" => ... }`

**逆 mode 呼び出しの防御**: descriptor の返り値型 (Value/Sentinel) と呼び出し側の期待型で spec 側の静的検証で除外、runtime error は defensive check としてのみ意味を持つ (通常は到達しない)。

**共通機構は「DSL 書式 (colon-args + array 記法 §2.4b) + observes 軸 + 統一 FnCtx」の 3 点**。fn signature は 1 種類 (対称性)。「際限がなくなるリスク」(kawaz mid=34 懸念) の完全回避。

**observes 軸** (descriptor 側で宣言、Q7-γ-45=b 承認):

```
observes: ["option:<name>", "env:<var>", "system:<key>", ...]
```

- 静的 name 参照 (constant/env/borrow with literal name) は observes 集合が確定 → 依存グラフ static 構築
- 動的 name 参照 (稀、runtime で name 決定) は observes に載らない → runtime エラー扱い
- 循環チェックは observes edge で構築、DR-087 の遅延解決 (位相順) に載せる、循環は definition-error kind = `circular-ref` (Q7-γ 4)

**次の commit で §3 descriptor 拡張 + §4 実装コスト見積 + v1 スコープ判断を書く** (context 節約のため分割)。

## 3. descriptor 直交軸の統合拡張 (DR-107 拡張)

### 3.1 role enum + registry の整理 (kawaz mid=35 の質問反映)

現 DR-107 §1 role enum = 7 値 (installer / filter / collector / type_parser / accumulator / completer / provider) + Q7-α で追加された default_fn = 8 値 + variant_effect = 9 値。

**統合案** (統括推し、kawaz mid=35 質問反映):

- **`role: "fn"` に統一しない**、`role` は現状の役割分類を並列で保持
- **registry も別々に分ける** (kawaz mid=35 質問 = 別 registry 派 (i) 推し)
- 現 kuu の既存構造 (registry 1 個 = role 1 個の 1:1 対応) と整合

**registry 一覧** (統合後、kawaz mid=36 反映で default_fn と variant_effect を 1 registry に統合):

| registry | role | 用途 | 新設? |
|---|---|---|---|
| `filters` | `filter` | pipeline に載る値変換 fn (T → T、Reject/Error 2 種の失敗) | 既存 (DR-036) |
| **`cell_fns`** (仮命名、kawaz mid=38 で `fns` は不明瞭指摘、統括推し = cell_fns / kawaz 案 = source_fns / 他候補 = value_fns / supply_fns) | `fn` | 値供給 fn + cell operation fn (default 席 / 発火時 の両方で使える。Sentinel を返す fn は発火時のみ) | **新設** |
| `types` | `type_parser` | 型 parser (既存) | 既存 (DR-107) |
| `providers` | `provider` | env/config/tty (既存) | 既存 (DR-107) |
| `installers` | `installer` | wire 語彙展開装置 | 既存 (DR-042) |
| `accumulators` / `collectors` / `completers` | 各役割 | 既存 | 既存 (DR-036/DR-111) |

**`fns` registry の内容**:
- **Value を返す fn** (default 席 + 発火時 両方で使える): `set` / `borrow` / `env` / `inherit` / `computed` / `uuid` 等
- **Sentinel を返す fn** (発火時のみ、cell operation): `unset` / `empty` 等
- fn descriptor の返り値型 (`io_type.output`) で「値」vs「cell operation (Sentinel)」を区別
- 呼び出し側 (default 席 / 発火時 cell operation) は fn の返り値型を静的検査、default 席は Value を返す fn のみ受ける

**「使い分けの制約」= 呼び出し側の関心**:
- **default 席** は Value を返す fn のみ受ける (Sentinel は default 席で意味を持たない → definition-error kind = `invalid-range` 相当)
- **発火時 cell operation** は Value or Sentinel どちらも受ける
- **filter 段** は `filters` registry から引く (Value → Value 変換)

**ctx は呼び出し側が渡す** (mid=35 の役割固有 ctx 継承):
- default 席 → `DefaultFnCtx` (他 option 参照 / env / system)
- 発火時 cell operation → `EffectFnCtx` (cell/trigger 情報)
- filter 段 → `FilterFnCtx` (pipeline 入力値)、既存機構
- fn は「必要な情報を ctx から取る」の対称 interface (observes 軸で静的宣言)

**同じ fn (set/borrow/env 等) が両文脈で使える** (universal fn の真の意味):
- `long: ["ttl:set:60"]` = 発火時に set fn (Value 60 を返す) → cell に set operation
- `default_fn: "set:60"` = default 席で set fn (Value 60 を返す) → default 値
- **fn 自体は 1 個、呼び出し側が用途を決める**

**variant_effect の descriptor 化**: 現状 variant DSL の effect (set/default/unset/empty) は spec の暗黙 registry で管理されているが、統合後は `fns` registry の canonical descriptor として登載。3rd party 拡張 (`role: "fn", ns: "myapp"`) も可能に。

**名前衝突**: `filters` registry の `in_range` と `fns` registry の `set` は別 registry で衝突なし。fns registry 内の bare 名は builtin ns 前提 (DR-094)、拡張は ns 明示。

### 3.2 observes 軸の追加 (Q7-γ-45=b)

DR-107 の installer 軸 `observes` (DR-061) は「installer が観測する属性の宣言」。**default_fn / filter / variant_effect の全 fn にも `observes` 軸を適用**:

```
observes: ["option:<name>", "env:<var>", "system:<key>"]
```

- 静的 name 参照 (constant/env/borrow with literal name) は observes 集合が静的確定 → 依存グラフ静的構築
- 動的 name 参照 (稀、runtime 決定) は observes に載らず runtime エラー
- **DR-107 の role 別マトリクス (§7) を拡張**: 新 role に observes 軸の必須/禁止を宣言 (default_fn は任意、filter は禁止、variant_effect は任意、等)

### 3.3 construction / io_type / output_mode / fallibility / invocation の適用

現 DR-107 の 5 軸を fn 統合後にどう適用するか:

| 軸 | 現 DR-107 (filter/type_parser/provider) | fn 統合後 (default_fn / variant_effect) |
|---|---|---|
| `construction` | static/factory の 2 値、既存通り | 同左、fn descriptor でも static/factory を宣言 |
| `io_type` | input/output の値型 | fn の args と返り値の型。**args は colon-DSL で string 配列 (現 filter DSL と同じ)**、返り値は fn ごとに (set fn = arg[0] の型、env fn = string、borrow fn = target option の型 = ジェネリクス T 必要?) |
| `output_mode` | preserve/transform | default_fn では transform 固定 (新規値供給)、variant_effect では op 種類 (set/unset/empty) で異なる → **output_mode を op 語彙に拡張** or `role` の下位軸で分岐 |
| `fallibility` | total/reject | default_fn は fn ごと (set=total, borrow=reject, env=reject) 自由、variant_effect も同様 |
| `invocation` | `colon_args` / `object_args` / `none` | default_fn / variant_effect は `colon_args` 固定 (現 DSL 形式) |

### 3.4 ジェネリクス T の必要性 (kawaz mid=29 提案)

現 DR-107 §3 io_type の値型は `"string" | "number" | "bool" | "null" | "value" | array/map/union`。**generics T が無い**。

「set fn の返り値型は arg[0] の型 (arg[0] が string なら string、number なら number)」を精密に書きたい場合、T が必要。現行 kuu 哲学 (DR-107 §3 の「値域を型宣言に持たない」= filter で検証) からは:

- **選択 (i) T 不要**: `io_type: {input: "value", output: "value"}` で近似、実際の型は呼び出し文脈 (target option の type) で決まる。DR-107 §3 の「呼び出し先の文脈に依存しうる、standalone descriptor だけで decode が完結するとは主張しない」路線をそのまま default_fn にも適用
- **選択 (ii) T 追加**: DR-107 §3 の型体系に `"T"` (or `{"generic": "T"}`) を追加。fn descriptor で「input=T, output=T」と書けるように

**統括推し = (i) T 不要**。理由:
1. 現 kuu 哲学「精密さは型でなく filter で」と整合
2. T 追加は DR-107 §3 の全面拡張 (union / array / map / T の 4 種を扱う必要)、範囲が広い
3. 実運用で「set fn の返り値型」は target option の type と一致するのが自明、descriptor で精密に書く必要が薄い

### 3.5 統合後の統一 descriptor 例

`fn:set` descriptor (variant_effect + default_fn の両方で使える、role でどちらに乗せるか区別する if 必要):

```json
{
  "name": "set", "ns": "builtin", "role": "default_fn",
  "construction": "static",
  "io_type": {"input": "value", "output": "value"},
  "output_mode": "transform",
  "fallibility": "total",
  "invocation": {
    "encoding": "colon_args",
    "parameters": [{"name": "value", "type": "value", "required": true}]
  },
  "observes": [],
  "reasons": []
}
```

`fn:borrow` descriptor:

```json
{
  "name": "borrow", "ns": "builtin", "role": "default_fn",
  "construction": "static",
  "io_type": {"input": "string", "output": "value"},
  "output_mode": "transform",
  "fallibility": "reject",
  "invocation": {
    "encoding": "colon_args",
    "parameters": [{"name": "source", "type": "string", "required": true}]
  },
  "observes": ["option:<source>"],
  "reasons": ["absent-source"]
}
```

## 4. 実装コスト見積 + v1 スコープ判断

### 4.1 kuu.mbt の変更範囲

現 kuu.mbt (main = 79b54cf7) の実装は以下の 3 機構が独立実装:

- **variant DSL parser + lowering** (`src/builtins/installer.mbt` / `src/kuu/wire_decode.mbt` 等)
- **filter DSL parser + pipeline** (`src/engine/filter.mbt` / `src/builtins/pkg_filter.mbt` 等)
- **default 席の解決** (`src/engine/resolve.mbt` 等、DR-087/088 の遅延解決)

統合実装で以下の書き直しが必要:

1. **universal fn parser** (colon-args を parse する共通機構、既に各 DSL で類似実装)
2. **fn registry** (filter registry / default_fn registry / variant_effect registry を統合、DR-094 namespace で分離)
3. **FnCtx ABI** (parse context 参照用、observes 軸に基づく依存グラフ構築)
4. **循環チェック** (DR-087 遅延解決に fn 依存を組み込む)
5. **variant DSL / filter / default_fn の lowering** (universal fn 呼び出しに集約)
6. **既存 descriptor の統合** (現 filter descriptor 13 個 + type_parser + provider を DR-107 の統一軸で書き直し)

**見積**: 中〜大規模 (5-10 コミット、既存機構の refactor + 新機構追加、conformance regression リスクあり)。TRI-Q4 (OutputView 一本化、4 コミット) 級 or それ以上。

### 4.2 fixtures の書き直し範囲

- **variant DSL 関連** (`fixtures/name-surface/` / `fixtures/lowering/alias/` 等、~30 fixture): 記法は不変 (糖衣として維持) だが lowering 結果 (AtomicAST) に fn 呼び出しが載る場合の期待値変更
- **filter 関連** (`fixtures/piece-filters/` / `fixtures/value-typing/` 等、~40 fixture): 記法不変、期待値変更
- **default 関連** (`fixtures/value-sources/` 等、~20 fixture): default_fn 糖衣として lowering、記法不変、期待値変更
- **新規 fixture**: universal fn の合成 (long への default_fn 引き込み、cross-registry 参照等)、10-20 追加想定

**見積**: 中規模、既存 fixture の期待値更新 (mismatches 発生 → 訂正) + 新 fixture 追加。

### 4.3 spec 側の波及

- **DESIGN.md**: §7 (variant DSL) / §8 (filter) / §11 (default 席) の統合再記述、universal fn 節新設
- **CONFORMANCE.md**: fn 呼び出しの conformance 規約
- **schema/**: wire.schema / fixture.schema / descriptor.schema / builtin-descriptors の全面更新
- **DR**: 新規 DR (DR-114 「universal fn 統合」) 起草、DR-011 (variant DSL) / DR-034 (multiple) / DR-036 (filter chain) / DR-102 (filter パイプライン) / DR-087/088 (default) の関連注記追加

### 4.4 v1 スコープ判断

**選択肢**:

- **選択 A (統合を v1 で完遂、統括推し)**: universal fn 統合を v1 発行前に完成。DR-113 (help 再設計) は universal fn 統合を前提として書き直し、DR-114 (universal fn) を並行 or 先行して起草。**v1 完備主義に厳密に沿う**、後で追加互換で入れる縮小推しを避ける
- 選択 B (universal ABI だけ先行、DSL 集約は v2): universal fn ABI (fn registry + FnCtx + observes 軸) だけ先行、DSL 集約 (variant DSL / filter / default_fn の統合表記) は v2 で。default_fn 一本化 (Q7-α+一本化) と最低限の互換だけ v1、統合 DSL の恩恵は後で
- 選択 C (現状維持で v1、統合は v2 検討): 3 種 DSL を維持したまま v1 発行、universal fn 統合は v2 で全面検討

**選択 A の推し理由**:
1. v1 完備主義 = 後で入れる縮小推しを繰り返さない (memoried feedback-v1-completeness-principle)
2. help 再設計 (DR-113) と universal fn 統合は密接に関わる (default_fn + effect が help 系 type の合成で使われる) = 分離すると再検討コスト大
3. 実装コスト大だが 1 回で済む (v2 で再統合するコスト > v1 統合コスト)

**選択 A のリスク**:
1. v1 発行が遅延 (統合実装 + 全 fixture 追随)
2. universal fn の設計に regression があると波及大 (v1 の骨格の不良)
3. kawaz の他優先事項との競合

**選択 A の推奨実現順**:
1. **Phase U-1** (spec): DR-114 「universal fn 統合」起草、DR-113 (help 再設計) を DR-114 前提で書き直し。schema 更新 (array 記法 §2.4b 含む)
2. **Phase U-2** (spec): DR-011 / DR-034 / DR-036 / DR-087 / DR-088 / DR-102 / DR-107 の関連注記追加、DESIGN §7/§8/§11 の統合再記述
3. **Phase U-3** (fixtures): 既存 fixture の記法不変性を確認 (糖衣として維持)、期待値更新、新規 fixture 追加 (array 記法 / 統合合成例)
4. **Phase U-4** (kuu.mbt): universal fn parser (string/array 混在) + registry + FnCtx + 循環チェックの新規実装、既存 3 種 DSL の lowering を universal fn 経由に refactor
5. **Phase U-5** (kuu-cli): universal fn の consumer 追随 (canonical レンダラは別 issue)
6. **Phase U-6**: v1 発行条件 (5 プロファイル green) 達成

**kawaz 裁定要**: 選択 A / B / C のいずれか。統括推し = A。

### 4.5 filter 系統合の見積 (kawaz mid=34 問い) — 成立可能、ただし role 分離戦略

**成立する部分** (v1 で統合可能):
- filter DSL 書式 (`"trim"` / `"in_range:1:65535"`) は universal fn DSL と既に同型 = **DSL 統一の恩恵はゼロコストで得られる**
- descriptor は DR-107 の `role: "filter"` を universal fn の specialization として維持 = 既存 filter descriptor 13 個は refactor 不要 (role 名維持)
- registry 統一 (fn registry の中に filter/default_fn/variant_effect の各 role が並ぶ)、ns 分離 (DR-094) で衝突なし
- array 記法 (§2.4b) は filter 属性でも同じ規約で適用可能

**問題になりそうな点**:

| 問題 | 内容 | 統合戦略での回答 |
|---|---|---|
| **返り値の意味論違い** | variant_effect は cell operation、default_fn は値、filter は値。pipeline 内での使い方が違う | **role 固有**: role で pipeline 位置を識別、返り値の型は role の output_mode で分岐 |
| **FnCtx の役割違い** | filter 段の ctx (pipeline 入力値) / default_fn の ctx (他 option 参照) / variant_effect の ctx (cell/trigger 情報) が違う | **role 固有 ctx**: `FnCtx` を base、role ごとに `FilterCtx` / `DefaultFnCtx` / `EffectCtx` extends の形。共通機構は observes 軸 (静的宣言) のみ |
| **failure semantics** | filter は Reject / Error 2 種 (DR-037)、default_fn は absent-source で unset (DR-088) | **fallibility 軸は共通** (total/reject)、reason 語彙は role 固有 (filter の reasons registry と default_fn の reasons registry は別 registry) |
| **既存 fixture 追随** | filter fixture ~40 個の期待値変化 (universal fn 経由で lowering が変わる) | 記法は不変 (糖衣として維持)、lowering (AtomicAST) が universal fn 呼び出し形になる場合の期待値更新 |

**統合戦略の要**:
- **共通機構は「registry + DSL 書式 + observes 軸 + universal ABI の骨格 (name + args + ctx)」まで**
- **role 固有**: FnCtx の内容、failure reason 語彙、pipeline での位置
- 「際限がなくなるリスク」(kawaz mid=34 懸念) の回避 = 共通機構を最小限に、role 固有は既存機構を尊重

**成立可能性の結論**: **v1 で filter 系統合も含めて完遂可能、実装コストは激減**。kawaz mid=35 の指摘 (registry と ctx は role で分離) を反映すると、Q8 統合の「真の姿」は:

- **共通機構は「DSL 書式 (colon-args + array 記法) + observes 軸」の 2 点だけ**
- **registry も ctx も failure reason も role 固有** (filter は既存機構をそのまま維持、default_fn / variant_effect は新設)

= filter 系の「統合」の実質は「observes 軸を filter descriptor に追加する + array 記法をパーサで受ける」だけ。既存 filter 機構 (registry / descriptor / pipeline / FilterFnCtx) は refactor 不要。

**実装コスト再見積** (kawaz mid=35 反映後):

| 作業 | コスト | 内訳 |
|---|---|---|
| DSL パーサ (string/array 混在) の追加 | 小 | 既存 colon-string parser に array 分岐追加、1 モジュール ~100 行 |
| observes 軸 (schema 追加 + parser 拡張 + 依存グラフ構築) | 中 | DR-107 role 別マトリクスに軸追加、DR-087 遅延解決に統合 |
| default_fns registry + 6 builtin fn (borrow/inherit/env/set/computed/uuid) の実装 | 中 | 新規 registry と fn 実装 |
| variant_effects registry + 4 fn (set/default/unset/empty) の descriptor 化 | 小 | 既存暗黙 registry を descriptor 化するだけ、実装は既存 |
| filter 系: observes 軸追加のみ (既存 refactor 不要) | 小 | descriptor に observes フィールド追加 |
| long DSL への default_fn 引き込み | 中 | variant DSL parser を universal fn parser に集約 (or 並列で受ける) |
| fixtures 追随 | 中 | 記法不変、期待値変化 (universal fn 経路の lowering) |
| DR-114 起草 + DR-113 の DR-114 前提書き直し | 中 | codex-sol 起草、統括レビュー |

**総合**: TRI-Q4 (OutputView 一本化、4 コミット) 級 or それ以下。「範囲膨大」の懸念は kawaz mid=35 の役割分離戦略の精緻化で解消。

**v1 スコープに filter 系統合を含める推し** (統括推し):
- **選択 A' (推し、更新版)**: variant DSL / filter / default_fn の 3 種を universal fn として統合、ただし role 分離で共通機構は最小限。v1 完備主義準拠、full 統合
- 選択 A (前案): filter 系は v2 に回す — 統括推し撤回、更新版 A' に集約
- 選択 B / C: 変更なし

## 5. リスク・悪い面

- **範囲膨大**: v1 発行遅延 (数週間〜1 ヶ月級?)
- **regression リスク**: variant DSL / filter / default_fn の統合実装で既存 fixture が化ける
- **kuu.mbt 実装ロールバックの拡大**: 現 help query 実装 3 コミット (TRI-Q4 除く) + variant / filter 大規模 refactor
- **観測手段の変化**: fn 呼び出しの副作用 (FnCtx.borrow_option 経由の他 option 参照) が既存 debug 手段 (fired_action / tried_triggers 等) にどう見えるか要検討
- **DR-107 拡張のリスク**: role enum / observes / io_type ジェネリクス T の判断が universal fn 統合に依存 = 統合設計が固まらないと DR-107 拡張も固まらない

## 6. スコープ外 (別 issue / 別 DR)

- **canonical レンダラ設計**: 別 issue (DR-113 波及節)
- **v1 発行タイミング**: DR-108 §6 (kawaz 判断)
- **3rd party fn registry の運用**: DR-094 namespace の拡張 (既定路線)
- **help_category の multiple 合成**: v1 で last-wins 固定 (DR-112 §7 元記述、DR-113/DR-114 でも維持)

## 7. 関連

- DESIGN §7.3-7.4 (variant DSL / effect 4 種)
- DESIGN §8.4 (filter DSL)
- DESIGN §11.4 (値源ラダー)
- DR-011 (variant DSL)、DR-034 (multiple)、DR-036 (filter chain)、DR-102 (filter パイプライン)
- DR-087 (default 遅延解決)、DR-088 (default_fn 概念既出)
- DR-094 (namespace)
- DR-107 (descriptor 直交軸、role enum、io_type 型体系)
- DR-111 (accumulator/completer descriptor)
- HIP-META-Q6 (default_fn 汎用機構、mid=28 で一本化承認)
- HIP-META-Q7 (default_fn descriptor 軸 + failure semantics、mid=32/33 で完全裁定)
- HIP-META-Q8 (universal fn 統合、mid=32 で A 承認)
- kuu 背骨 (or/seq/repeat/link/ref の任意ネスト、機構統一思想)
- docs/findings/2026-07-19-help-mechanism-redesign-v2.md (help 再設計、DR-114 前提で書き直し必要)
