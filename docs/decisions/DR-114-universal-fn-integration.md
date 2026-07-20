# DR-114: universal fn 統合 — variant effect・filter・default_fn の共通呼び出し機構

> 由来: kawaz 発題 (mid=29)「long DSL の `:` 区切り 2 個目以降の仕様は default_fn の descriptor と同じと言えるのでは。long に値源としての default_fn を持って来ることもできそう」と、`docs/QUESTIONS.md` の HIP-META-Q7 / Q8 裁定 (mid=28〜41)。Q8=A により universal fn 統合、Q8-α=a により 1 段限定 array 記法、Q8-γ=i-2 により `filters` + `cell_fns` の 2 registry、Q8-δ により `cell_fns` 命名、Q8-ε と Q7-γ-45=b により統一 `FnCtx` + `mode` 判別 + `observes` 軸を確定した。下敷きは `docs/findings/2026-07-19-universal-fn-integration-plan.md`。DR-113 の default_fn と help type 合成は本 DR を前提とする。

## 決定

### 1. 3 種の DSL を universal fn 呼び出しとして統合する

universal fn は、**name で registry から fn 実体を引き、colon args または同値の array args と `FnCtx` を渡して呼び出し、結果を得る共通機構**である。現行の 3 種 DSL は次の specialization とする。

| specialization | 呼び出しの位相 | 結果の使い方 | registry / role |
|---|---|---|---|
| variant DSL effect | long / short / env 入口の発火時 | `Value` は cell へ set、`Sentinel` は対応する cell operation | `cell_fns` / `fn` |
| filter DSL | piece / value / final / accum pipeline の各段 | 入力値を変換するか reject する | `filters` / `filter` |
| default_fn DSL | 値源ラダーの default 席の実体化時 | `Value` を default 値として供給する | `cell_fns` / `fn` |

統合するのは、呼び出し書式、descriptor の直交軸、`FnCtx` ABI、`observes` による依存宣言である。呼び出し位相と結果の適用先は specialization ごとに保つ。`filters` と `cell_fns` は別 registry とし、filter pipeline と cell 値供給・操作を一つの registry に混在させない。

この構造により、3 種の DSL は同じ `name + args + FnCtx` の背骨を共有しつつ、filter の Reject / Error 意味論、default の遅延実体化、発火時 cell operation の各責務を保つ。

統合の帰結:

1. 3 種の書式と parser を 1 個の呼び出し規約へ集約する
2. DR-107 の descriptor 軸を registry 横断で共有する
3. DR-088 の「宣言値源は default_fn と同型」を具体的な ABI にする
4. or / seq / repeat / link / ref と同じく、差を specialization に閉じて機構を統一する
5. 3rd party は namespace 付き住人を適切な registry へ登録し、同じ ABI で拡張できる
6. 全 fn の runtime 参照を `observes` edge として DR-087 の循環検査へ載せる

### 2. variant DSL の effect は `cell_fns` 呼び出しへ lowering する

「variant effect」は long DSL 上の 4 呼称であり、実体は `cell_fns` registry に登録される 4 個の builtin fn descriptor である。

| builtin fn | wire form | 意味 |
|---|---|---|
| `set` | `":set"` / `"no:set:false"` / `"red:set:rgb:255:0:0"` | 引数なし形は値スロット準備、引数あり形は args を `Value` として返して cell へ set |
| `default` | `":default"` | `use_default` sentinel を返し、default placeholder へ戻す |
| `unset` | `":unset"` | unset sentinel を返す |
| `empty` | `":empty"` | array / map を空にする sentinel を返す |

4 fn は variant 専用の閉じた effect enum ではない。他の `cell_fns` 住人と同じ descriptor / registry / ABI を使う。

| 他の cell fn | 呼び出し例 | 意味 |
|---|---|---|
| `incr` | `":incr"` / `default_fn: "incr"` | `ctx.old` を参照し、old + 1 を新しい `Value` として返す |
| `borrow` | `"ttl:borrow:other-ttl"` / `default_fn: "borrow:other-ttl"` | 他 option の値を参照して返す |
| `env` | `"ttl:env:TTL"` / `default_fn: "env:TTL"` | 環境値を返す。wire の `env` ラダー席とは別の明示 fn 呼び出し |
| `uuid` / `computed` | `default_fn: "uuid:v4"` 等 | registry の実装が生成・取得した値を返す |

現行の `prefix:fn:arg...` 記法を維持し、2 個目の部品が fn 名、3 個目以降が args となる。4 variant 呼称以外の cell fn も同じ位置から呼べる。

発火時呼び出しは `Result<Value | Sentinel, Reason>` を返す。`Value` は set operation、`Sentinel` は descriptor の出力型が表す `use_default` / unset / empty 等の operation として cell に適用する。`use_default` は DR-087 の placeholder 操作であり、発火時に default_fn を評価しない。実値は値源解決の最終相で依存順に実体化する。default 席は `Value` を返す fn だけを受け入れ、`Sentinel` を返す fn の指定は definition-error `invalid-range` とする。

DR-077 の `update` effect は廃止する。現在値を使う更新は `incr` 等の独立 cell fn が `ctx.old` を任意参照して新しい `Value` を返すことで表現する。`filters` registry の transform を effect 側から特殊呼び出しする経路は設けない。

### 3. filter DSL は既存 registry と pipeline を保った universal fn specialization とする

filter DSL は既に `name[:arg...]` の呼び出し形を持つ。

| wire form | universal fn 呼び出し |
|---|---|
| `"trim"` | name=`trim`, args=[] |
| `"in_range:1:65535"` | name=`in_range`, args=[`"1"`, `"65535"`] |
| `"regex_match:^[a-z]+$"` | name=`regex_match`, args=[`"^[a-z]+$"`] |

`piece_filters` / `value_filters` / `final_filters` / `accum_filters` の座席、`filters` registry、`role: "filter"`、pipeline、DR-037 の Reject / Error 意味論は維持する。filter 統合はこれらを `cell_fns` へ移すことではなく、共通 DSL 書式、array 記法、統一 `FnCtx`、descriptor の `observes` 軸へ参加させることである。

filter descriptor は `role: "filter"` のまま、呼び出し時の `FnCtx.mode()` は `"filter"` となる。filter が観測可能な runtime 参照は descriptor の `observes` で宣言する。

### 4. default 席は default_fn 1 本へ統合する

DR-087 / DR-088 の default_fn 概念を明示 DSL とし、**default 席だけ**の値供給を `cell_fns` 呼び出しへ統一する。env / config / inherit のラダー席は DR-031 の既存機構を維持する。

| 糖衣 (wire form は維持) | canonical default_fn |
|---|---|
| `default: value` | typed internal call `set(value)`。native JSON value を保持し、string DSL へ serialize しない |
| `default_fn: "fn:args"` | そのまま |
| `env: "VAR"` | env ラダー席を維持。default_fn 糖衣ではない |
| `inherit: true` / `inherit: {"from": "other"}` | inherit ラダー席を維持。default_fn 糖衣ではない |

`set` は variant DSL と default 席で同じ fn 実体を使う。`borrow` / `env` / `inherit` / `computed` / `uuid` も `cell_fns` の住人であり、descriptor の出力型が `Value` なら default 席と発火時の両方から呼べる。

`set` は 1 個以上の logical value を受ける。variant 入口の複数 args は target の seq / repeat 構造に従う値列、default 糖衣の native JSON value は文字列へ再 serialize せず typed internal call `set(value)` として保持する。明示 DSL の string / array args は descriptor と target type に従って decode する。

同じ値源席にユーザが複数の供給宣言を置くことはできない。同じ席の糖衣と明示 `default_fn` の併用は definition-error `invalid-range` とする。ただし type preset が canonical 展開で補う default はユーザ宣言ではなく、同じ席の明示 `default` / `default_fn` があれば置換される。これにより `type: "flag"` の暗黙 `default:false` と help 合成の明示 `default_fn` は競合しない。値源ラダー上の異なる席の共存規則は §4.1 に従う。

評価時点は DR-087 に従う。宣言時には fn 参照を placeholder として置き、上位値源の解決後も cell が空である場合に、依存グラフの位相順で default_fn を呼ぶ。DR-088 に従い、default_fn の宣言は探索中の静的な「default あり」判定へ参加し、解決後に値が得られなければ unset のまま落ち、経路探索を再演しない。

#### 4.1 値源ラダーの席と precedence は維持する

fn への統合は値源の共存を廃止しない。DR-031 / DR-081 の CLI / link > env > config > inherit > default の席と precedence、`source` タグを維持する。

- `env: "VAR"` は env 席に `env(VAR)` の placeholder を宣言する
- config は既存の config 席と `config_provider` を維持し、`cell_fns` の対象にしない
- `inherit` は inherit 席に `inherit(name)` の placeholder を宣言する
- `default` と明示 `default_fn` は default 席を宣言する

異なる席は同一要素で共存でき、上位席から順に解決して最初に得た値を採る。同じ席への複数宣言だけを §4 の `invalid-range` とする。「default 席は default_fn 1 本」とは、各席の供給実体を共通 cell fn ABI で表すことであり、値源ラダー全体を単一 slot に潰すことではない。

### 5. long / short / env 入口から値供給 fn を呼べる

variant effect を universal fn として読む帰結として、入口は `cell_fns` の値供給 fn を直接呼べる。

- `long: ["ttl:set:60"]`: `set("60")` の返り値を cell へ set
- `long: ["ttl:env:TTL"]`: `env("TTL")` の返り値を cell へ set
- `long: ["ttl:borrow:other-ttl"]`: `borrow("other-ttl")` の返り値を cell へ set

同じ fn 実体を default 席で呼ぶか発火時に呼ぶかは、呼び出し側と `FnCtx.mode()` が決める。fn 名ごとに default 用・effect 用の重複実装を作らない。

### 6. colon を含む args のため、1 段限定 array 記法を全席で受け入れる

colon-string と array of string は同じ呼び出しの二つの wire 表現とする。

```json
{
  "long": [
    "no:set:false",
    ":set",
    ["", "set", "a:b"],
    ["debug", "env", "LOG:PATH"]
  ]
}
```

規約:

1. variant DSL の各要素は string または array of string のどちらか
2. array の要素は string のみ。array of array は受け入れない
3. string と array は意味論的に等価。`"no:set:false"` と `["no", "set", "false"]` は同じ呼び出し
4. 同じ列で string と array を混在できる
5. default_fn では `"set:a:b"` と `["set", "a:b"]`、filter 席では `"regex_match:..."` と `["regex_match", "..."]` のように、各席の先頭部品を fn 名として同じ規約を使う

array 記法は variant DSL、filter DSL、default_fn DSL の全席に適用する。string は colon split、array は部品列をそのまま使う。`\:` 等のエスケープ規則は導入しない。

#### 6.1 lowered fn invocation carrier の canonical JSON 表記

lowering 断面で greedy 面の effect が `cell_fns` の fn 呼び出しを表す場合、effect carrier を次の形に固定する。

```json
{"fn": "<name>", "args": ["<arg>"]}
```

- `fn`: `cell_fns` registry に登録された fn descriptor 名。DR-094 の namespace を使用できる (`"incr"` / `"my-app/custom"` 等)
- `args`: descriptor の `invocation.parameters` に従う string 配列。arity 0 は必ず `[]`
- carrier の座席は greedy 面 entry の `effect` フィールドであり、cell fn 呼び出しの時だけ使う

count preset の `long: true` が `incr` を呼ぶ canonical lowering 例:

```json
{
  "exact": "--count",
  "link": "count",
  "effect": {"fn": "incr", "args": []}
}
```

lowering 断面の 3 形を区別する。

1. set 縮退形: `{exact, value, link}`。operand が lowering 時点で確定する
2. 直接 op: `{exact, link, effect: {op: "default" | "unset" | "empty"}}`
3. cell fn invocation: `{exact, link, effect: {fn: "<name>", args: [...]}}`。operand は fn 実行時に確定する

fn descriptor が `Value` を返した場合、その値を通常の set operand として cell に適用する。`Sentinel` を返した場合は §2 の対応 operation を適用する。上例の `incr` は発火時に `ctx.old + 1` を返し、その `Value` が count cell へ set される。

#### 6.2 count preset の wire 糖衣規則

count preset の long 糖衣は差し替えのみで規範化する (HIP-META-Q14=a 2026-07-20)。

- `{type: "count", long: true}` は、count preset が type-independent の `[":set"]` 糖衣を `[":incr"]` に差し替える。flag preset の `long: true → [":set:true"]` 差し替え (DR-076 §2 規則 1) と同じ機構・対称形
- 展開は 0-token 発火のみ。主入口も eq_split も立たない
- 等価: `{type: "count", long: true}` ≡ `{type: "number", default: 0, long: [":incr"]}`
- 非空明示リストへの補完規則は設けない。count に値形が無く補完対象が存在しないため、明示リストはそのまま各要素を §6 の DSL として解釈する

### 7. fn ABI は統一 `FnCtx` + mode 判別とする

fn の概念シグネチャを 1 種類に統一する。

```
(args: string[], ctx: FnCtx) → Result<Value | Sentinel, Reason>
```

`FnCtx` は呼び出し位相を判別し、位相固有 context を取得する API を持つ。

```
ctx.mode()       → "default" | "effect" | "filter"
ctx.as_default() → DefaultCtx | null
ctx.as_effect()  → EffectCtx | null
ctx.as_filter()  → FilterCtx | null

ctx.old()          → Value | absent
ctx.env(var)
ctx.system(key)
ctx.observes()
```

- `as_default()` / `as_effect()` / `as_filter()` は mode が一致する時だけ非 null
- `DefaultCtx` は default 値の target と依存先参照を提供する
- `EffectCtx` は対象 cell と trigger を提供する
- `ctx.old()` は cell fn 呼び出し時点の対象 cell の現在値を返し、値が無ければ absent。`set` 等は参照せず、`incr` 等の更新 fn だけが任意に使う
- default mode では上位ラダー席まで解決した現在値、effect mode では発火直前の cell 値が `old` となる
- `old` は同じ target cell の内在状態であり `observes` edge ではない。外部 cell 依存や循環グラフを追加しない
- `FilterCtx` は pipeline の現在入力値を提供する。filter は `FilterCtx.input()` を `io_type.input` として読み、返り値は `io_type.output` の `Value` に限る
- 特定位相を要求する fn は対応する `as_*()` を使う
- 複数位相で再利用できる fn は `mode()` で分岐するか、共通 API だけを使う
- descriptor の出力型と呼び出し席の期待型により逆 mode の不適合を definition-time に除外する。runtime の mode 不一致は defensive error であり、適合した定義からは到達しない

ホスト言語では enum / sealed class / tagged object 等で表現してよい。必要なのは 1 個の公開 ABI と mode 判別の観測等価性である。

### 8. descriptor registry は `filters` と `cell_fns` の 2 個に分ける

DR-107 の `role` enum に `"fn"` を追加する。`role: "fn"` は default 席の値供給と発火時 cell operation の両方で使える `cell_fns` registry 住人を表す。filter は既存の `role: "filter"` を維持する。

| registry | role | 用途 |
|---|---|---|
| `filters` | `filter` | pipeline の値変換・検証 |
| `cell_fns` | `fn` | default 値供給と発火時 cell operation |

`cell_fns` の代表住人:

- `Value` を返し default / effect 両 mode で使える: `set` / `borrow` / `env` / `inherit` / `computed` / `uuid`
- `ctx.old` を参照して新しい `Value` を返す更新 fn: `incr` 等
- `Sentinel` を返し effect mode だけで使える: `default` (`use_default`) / `unset` / `empty`

bare 名は DR-094 に従い `builtin` namespace の糖衣とする。拡張住人は `myapp/name` のように namespace を明示する。registry が分かれるため、同じ bare 名が filter と cell fn に存在しても衝突しない。

### 9. DR-107 の直交軸を `fn` role と `observes` へ拡張する

`role: "fn"` の descriptor は DR-107 の軸を次のように使う。

| 軸 | `fn` role の規約 |
|---|---|
| `construction` | `static` または `factory` |
| `io_type` | **output-only で必須**。`io_type.input` は禁止し、args の型・個数は `invocation.parameters` が担う。output は既存 value_type または tagged sentinel type (`{"sentinel":"use_default"}` / `{"sentinel":"unset"}` / `{"sentinel":"empty"}`) |
| `output_mode` | 禁止。入力保持 / 変換の filter 軸であり、入力を持たない値供給 fn と cell operation へ別義で流用しない |
| `fallibility` | 必須。`total` または `reject` |
| `invocation` | 必須。`colon_args` 固定。array 記法も同じ positional args の別 wire 表現。`parameters` は kuu の positionals 定義式を使い、seq / or / repeat を表せる |
| `owns` | 禁止 |
| `observes` | 任意。runtime 参照を静的宣言 |
| `config` | `factory` なら必須、`static` なら禁止 |
| `reasons` | `reject` なら宣言集合、`total` なら空 |

filter descriptor にも `observes` を許可し、全 universal fn specialization が同じ依存宣言軸を使えるようにする。installer の `observes` は宣言語彙観測、fn の `observes` は runtime 値参照であり、role 条件分岐が意味を分ける。

`io_type` は DR-107 の既存 `value` 近似を使い、target option の型に依存する `set` / `borrow` を表す。本 DR ではジェネリクス `T` を型体系へ追加しない。descriptor 単体で decode が完結するとは主張せず、target の type と呼び出し文脈が実型を決める DR-107 の方針を維持する。

`set` と `borrow` の概念 descriptor:

```json
{
  "name": "set",
  "ns": "builtin",
  "role": "fn",
  "construction": "static",
  "io_type": {"output": "value"},
  "fallibility": "total",
  "invocation": {
    "encoding": "colon_args",
    "parameters": [
      {"name": "value", "type": "value", "required": true, "repeat": {"min": 1}}
    ]
  },
  "observes": [],
  "reasons": []
}
```

```json
{
  "name": "borrow",
  "ns": "builtin",
  "role": "fn",
  "construction": "static",
  "io_type": {"output": "value"},
  "fallibility": "reject",
  "invocation": {
    "encoding": "colon_args",
    "parameters": [
      {"name": "source", "type": "string", "required": true}
    ]
  },
  "observes": ["option:<source>"],
  "reasons": ["absent-source"]
}
```

無引数 cell operation fn は output-only `io_type` と空の `parameters` で表す。

```json
{
  "name": "default",
  "ns": "builtin",
  "role": "fn",
  "construction": "static",
  "io_type": {"output": {"sentinel": "use_default"}},
  "fallibility": "total",
  "invocation": {"encoding": "colon_args", "parameters": []},
  "observes": [],
  "reasons": []
}
```

```json
{
  "name": "unset",
  "ns": "builtin",
  "role": "fn",
  "construction": "static",
  "io_type": {"output": {"sentinel": "unset"}},
  "fallibility": "total",
  "invocation": {"encoding": "colon_args", "parameters": []},
  "observes": [],
  "reasons": []
}
```

```json
{
  "name": "empty",
  "ns": "builtin",
  "role": "fn",
  "construction": "static",
  "io_type": {"output": {"sentinel": "empty"}},
  "fallibility": "total",
  "invocation": {"encoding": "colon_args", "parameters": []},
  "observes": [],
  "reasons": []
}
```

### 10. `observes` から依存グラフを構築する

fn が runtime に参照する対象を descriptor で宣言する。

```
observes: ["option:<name>", "env:<var>", "system:<key>"]
```

- `observes` の `<parameter>` は同じ descriptor の `invocation.parameters[].name` を参照する template。未定義 parameter 名は descriptor 不備
- definition-time に decoded args を parameter へ束縛し、`option:<source>` + `borrow:help-full` を `option:help-full` の concrete edge に実体化する
- literal な option / env / system 名と、template 束縛で concrete になった名を static edge として依存グラフへ載せる
- args が literal に確定せず concrete edge を作れない参照は dynamic reference であり、runtime error とする
- default 解決は DR-087 の位相順で行う
- 循環は definition-error `circular-ref`
- 依存先が最終的に unset なら、呼び出し元も `absent-source` として unset のまま落ちる。DR-088 に従い探索を再演しない

`ctx.observes()` は concrete 化済みの宣言集合に制限された参照面を返す。`ctx.env()` / `ctx.system()` / 位相固有 ctx の参照 API はこの集合に無い対象を読めない。

### 11. definition-time と runtime の失敗を分離する

共通失敗規約:

| 失敗 | outcome / kind |
|---|---|
| registry に無い fn | definition-error `unknown-vocab` (DR-101) |
| arity / argument type 不正 | definition-error `invalid-argument` (DR-085) |
| 呼び出し席と出力型の不適合 | definition-error `invalid-range` |
| `observes` 依存循環 | definition-error `circular-ref` (DR-082) |
| 参照先不在 | fn reason `absent-source`。default 席では unset のまま落ちる |
| filter の reject | DR-037 の枝解決に従う |

namespace 解決と bare builtin 糖衣は DR-094、reason 宣言集合は DR-066 / DR-095 の規約に従う。

### 12. 実装コストと変更範囲

kuu.mbt では次の変更が要る。

1. colon-string / 1 段 array を共通部品列へ decode する parser
2. `cell_fns` registry と builtin fn
3. 統一 `FnCtx` + mode 判別 + `old: Value | absent` + concrete `observes` 面
4. DR-087 の依存グラフと循環検査への fn edge 統合
5. variant DSL / filter DSL / default_fn DSL の specialization 別 lowering
6. descriptor と conformance runner の追随

filter は既存 registry / pipeline / descriptor role を維持するため、全面 refactor は不要である。filter 側の主な変更は共通 args decode、`FnCtx`、`observes` となる。全体は中規模で、TRI-Q4 級またはそれ以下を見込む。

fixture は variant 関連約 30、filter 関連約 40、default 関連約 20 の記法不変性と期待値を監査し、universal fn の合成・array 記法・cross-registry 呼び出しを 10〜20 case 追加する。実際の変更件数は lowering 断面が fn 呼び出しを露出する範囲で決まる。

spec 側は DESIGN §7 / §8 / §11、LOWERING、CONFORMANCE、schema 3 種、builtin descriptors、関連 DR へ波及する。

### 13. v1 で 3 specialization の統合を完遂する

v1 スコープは、variant DSL / filter DSL / default_fn DSL の 3 種を universal fn の共通機構へ載せる full 統合とする。ただし物理的な registry と位相固有の意味論は分離し、filter pipeline を `cell_fns` へ移さない。

実装コストを抑える境界:

- filter は既存 `filters` registry、descriptor、pipeline、Reject / Error 意味論を維持する
- filter 側の追随は array 記法、統一 `FnCtx`、`observes` 軸が中心
- `cell_fns` を新設し、default_fn と variant effect を同じ住人へ lowering する
- variant / filter / default の wire string 記法は糖衣として維持する

これにより、v1 後に 3 機構を再統合する破壊的変更を残さず、role ごとの責務境界も保つ。

## 採用しなかった案

### 3 種 DSL を別機構のまま維持する

書式、descriptor、依存解決、拡張 ABI が重複し、DR-088 の「値源は default_fn と同型」というモデルと long DSL の値供給が別実装になる。kuu の機構統一の背骨に反するため採らない。

### `update` effect から filters transform を特殊呼び出しする

variant effect だけが別 registry の transform を呼ぶ特例になり、fallibility の写像も追加で必要になる。現在値は統一 `FnCtx.old` で渡し、`incr` 等を通常の cell fn として登録する。

### filter / default_fn / variant effect を 1 registry に入れる

pipeline の値変換と cell 値供給・operation は lookup の座席と失敗意味論が異なる。`filters` と `cell_fns` の 2 registry に分け、共通 ABI と descriptor 軸だけを共有する。

### default_fn と variant effect を別 registry にする

`set` / `borrow` / `env` 等の同じ値供給 fn を default 席と発火時で重複登録することになる。出力型 `Value | Sentinel` と呼び出し席の静的検査で区別できるため、両者は `cell_fns` に統合する。

### registry 名を `fns` / `source_fns` / `value_fns` / `supply_fns` とする

`fns` は対象が不明瞭で、source / value / supply は unset / empty の cell operation を覆わない。値供給と cell operation の両方を表す `cell_fns` を採る。

### `CellFnCtx` または `DefaultFnCtx` / `EffectFnCtx` / `FilterFnCtx` を公開 ABI として分ける

同じ fn 実体を複数位相から呼ぶ対称性を壊し、将来 registry 境界を見直す時に context 名の変更を強いる。公開 ABI は統一 `FnCtx` と mode 判別にし、位相固有 context は `as_*()` で取得する。

### `borrow` だけを組み込み特殊扱いする

3rd party fn が option / env / system を観測できず、循環検査も builtin の特例になる。全 fn が `FnCtx` を受け、descriptor の `observes` で静的依存を宣言する。

### colon args にエスケープ規則を導入する

どの文字を escape するか、不要 escape をどう扱うかという暗黙知と事故源を増やす。部品列を直接書ける 1 段限定 array 記法を採る。

### array を任意深さにネスト可能にする

fn 呼び出しの positional args は string 列であり、ネストした呼び出し構造を wire 部品列へ持ち込む要件がない。array of string 1 段に限定する。

### help 合成専用の `default_from` / `default_for`

help 専用の値連動語彙を増やすと、他の集約 flag や値源で同じ機構を再発明する。`default_fn: "borrow:<source>"` を target 側へ書く一方向の汎用機構で表す。

### default の固定値 fn を `constant` と呼ぶ

variant DSL の `set` と同じ「引数値を供給する」fn に別名を付ける必要がない。`set` に一本化する。

### DR-107 の型体系へジェネリクス `T` を追加する

`set` / `borrow` の実型は target option の type と呼び出し文脈から決まる。既存の `value` 近似で表現でき、`T` を追加すると union / array / map と型変数の組合せ規約まで必要になる。本 DR では追加しない。

### universal ABI だけを v1 に入れ、DSL 統合を後続版へ送る

v1 後に variant / filter / default の lowering と fixture を再度破壊的に書き換えることになる。v1 完備主義に従い、3 specialization を同じ実現波で統合する。

## 波及

本 DR の追随は次の Phase で行う。本 change は DR-114、DR-113、INDEX の設計記録だけを更新し、schema / fixture / 実装は変更しない。

### Phase U-1: DR と schema

- DR-114 を追加し、DR-113 を本 DR 前提で書き直す
- `schema/wire.schema.json`: variant / filter / default_fn の string + 1 段 array 記法、`default_fn`、5 help type を反映
- `schema/fixture.schema.json`: universal fn lowering と help model の期待形、`query: "help"` 分岐を反映
- `schema/descriptor.schema.json`: `role: "fn"`、`cell_fns` envelope、`observes` の role 条件分岐、`Value | Sentinel` 出力、FnCtx の `old: Value | absent` 契約を反映
- `schema/builtin-descriptors.json`: variant 4 fn、`incr` 等の `ctx.old` 参照 fn、その他 cell fn の descriptor と filter の `observes` を反映

### Phase U-2: spec 本文と関連 DR

- `docs/DESIGN.md` §7 / §8 / §11: variant effect、filter、default 席を universal fn の共通呼び出しとして再記述
- `docs/DESIGN.md` の registry / descriptor / 遅延解決節: `cell_fns`、`FnCtx`、`observes` を追加
- `docs/LOWERING.md`: 3 DSL の common parse、specialization 別 lowering、§6.1 の `{fn,args}` effect carrier を追加
- `docs/CONFORMANCE.md`: fn 呼び出し、array 記法、依存循環、失敗分類を規定
- DR-011 / DR-034 / DR-036 / DR-045 / DR-077 / DR-087 / DR-088 / DR-094 / DR-102 / DR-107 / DR-111 に本 DR との関係を追記

### Phase U-3: fixtures

- variant / filter / value-source の既存 wire 記法が糖衣として不変であることを確認
- lowering 期待値を §6.1 の `{fn,args}` carrier へ更新
- string / array 混在、colon を含む args、long からの env / borrow、default / effect の同一 fn、`incr` + `ctx.old` による count 更新、registry 分離、unknown-vocab / invalid-argument / invalid-range / circular-ref を追加
- help fixture に default_fn 合成を追加

### Phase U-4: kuu.mbt

- string / array を受ける universal fn parser
- `cell_fns` registry と builtin 住人
- 統一 `FnCtx` + mode 判別 + `old: Value | absent` + `observes` 制限面
- DR-087 の依存グラフへの fn edge 統合
- variant effect と default_fn の `cell_fns` lowering
- filter pipeline の共通 ABI 追随
- conformance runner の schema / fixture 追随

### Phase U-5: kuu-cli

- universal fn を実装した kuu.mbt assembly へ consumer を追随
- help 側は DR-113 の help_installer capability 接続だけを行う

### Phase U-6: v1 発行条件

DR-108 に従い、parse-core / lowering / definition-error / completion / help の 5 プロファイルを指定参照実装 kuu.mbt で green にする。

## 射程外

- canonical help レンダラの具体設計と policy
- v1.0.0 の発行時期と発行操作
- 3rd party fn registry の配布・登録・運用規約
- help_category の multiple 合成。v1 の規範は last-wins

## リスク・悪い面

- variant / filter / default の 3 面へ同時に波及し、schema・fixture・参照実装の lockstep を外すと conformance が一時的に red になる
- `FnCtx` を通じた参照が既存の debug 素材 (`fired_action` / `tried_triggers` 等) にどう見えるかを fixture で pin する必要がある
- `observes` 宣言漏れは依存グラフの欠落になるため、descriptor と実装参照の整合検査が必要になる
- `Value | Sentinel` と呼び出し席の適合検査を不十分にすると、default 席へ cell operation が混入する
- array 記法が 3 DSL 全席へ入るため、schema と parser の一方だけを更新すると同じ呼び出しの受理差が生じる

## 関連

- DR-011 (variant DSL)
- DR-031 / DR-081 (値源ラダーと default 席書き換え)
- DR-034 / DR-036 / DR-102 (filter / multiple pipeline)
- DR-042 (installer 3 役と variant 語彙所有)
- DR-045 / DR-077 (cell operation descriptor と、`update` を `ctx.old` 参照 fn へ置換する対象)
- DR-082 / DR-085 / DR-101 (definition-error kind)
- DR-087 / DR-088 (default 遅延解決と default_fn 概念)
- DR-094 (registry namespace)
- DR-107 / DR-111 (descriptor 直交軸)
- DR-113 (help_installer と default_fn による help type 合成)
- `docs/findings/2026-07-19-universal-fn-integration-plan.md`
- `docs/findings/2026-07-19-help-mechanism-redesign-v2.md`
- `docs/QUESTIONS.md` の HIP-META-Q7 / Q8 裁定
