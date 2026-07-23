# DR-111: accumulator / completer role の descriptor 宣言軸確定 — DR-107 §7 の未確定 2 行の解消

> 由来: issue `2026-07-16-completer-accumulator-descriptor-axes` (DR-109 §5 UX-Q5=a「早めにやりたい」で次サイクル先行着手が裁定された spec 先行宿題)。DR-107 §7 が「実例なし、owns/observes 禁止のみ、他軸は未確定のまま非制約」と残していた `accumulator` / `completer` の role 別マトリクス行を、既存 DR (DR-036/DR-060/DR-105/DR-107) と参照実装 (kuu.mbt) の実態から**導出**で確定する。DR-109 骨子柱 3 の `$required` (named capability marker が completer 名を指す) の前提整備。新規の裁定分岐は生じなかった — 全軸が既存決定の帰結として一意に決まる。

## 決定

### 1. accumulator 行の確定 — collector と同じ「構造畳み装置」の勢力図を適用

DR-107 §7 マトリクスに以下の行を確定する:

| role | domain | io_type | output_mode | fallibility | invocation | owns/observes | config | 備考 |
|---|---|---|---|---|---|---|---|---|
| `accumulator` | 禁止 | 必須 (`io_type.input` は常に array ラップ) | 必須 (`transform` 固定) | 必須 (`total` 固定) | 必須 (`object_args` 固定、`construction:static` 固定) | 禁止 | 禁止 | DR-105 §4 の勢力図 (構造畳み装置は total) を collector と同様に Schema で強制 |

各 const 固定の導出根拠:

- **`fallibility:"total"` 固定**: DR-105 §4 が確立した勢力図「filter 席は fallible 優勢 / 構造畳み装置 (accumulator/collector) は total が全員」の機械的強制 — collector の total 固定 (DR-107 §7) と同一の論拠。`kv_map` の reject (`=` を含まない piece の拒否、DR-091 §2) は matcher 手前ゲート (accumulator 到達前の構造検査) であって accumulator 自体の fallibility とは別軸である (DR-105 §4 が明記済み) — 参照実装でもこのゲートは node 層 (kv resident の `contains_eq` 判定、kuu.mbt `src/builtins/node_residents.mbt`) にあり、accumulator の畳み関数には失敗経路が無い
- **`output_mode:"transform"` 固定**: accumulator は累積 piece 値列から新しい結果構造を計算する装置であり、入力を変えずに検証する preserve の座席が構造上存在しない (collector の transform 固定と同じ帰結)
- **`construction:"static"` 固定**: builtin 住人 (§3) は全て構築時パラメータを持たない固定実装であり、`config` が常に禁止であることの帰結 (collector の static 固定と同じ論理、DR-107 §7)。configurable accumulator の実需が実体化した場合の緩和は当該拡張の DR の関心 (`derived` を予約しなかった DR-107 §2 と同じ路線)
- **`domain` 禁止**: `domain` の意味論は「registry lane (scalar/ARRAY filter registry) との一致義務」(DR-106 明確化 (a)、DR-107 §7) であり、accumulator は filter chain のどの座席にも立たない — installer/type_parser/provider と同じ無関係軸

### 2. io_type の対象は collect 相 — cell 解決プロトコルは宣言対象外

accumulator の `io_type` は**畳み相 (collect)** のシグネチャ「累積 piece 値列 → 結果構造」を宣言する:

```
io_type: { input: {"array": T}, output: <畳み結果の型> }
```

- `append` / `merge`: `{ input: {"array": "value"}, output: {"array": "value"} }`
- `kv_map`: `{ input: {"array": "string"}, output: {"map": "string"} }` (piece は `k=v` 形の string、最初の `=` で分割した rest が Map の値になる — DR-091 §2)

参照実装の accumulator ABI (kuu.mbt `src/engine/accumulator_ext.mbt` の `AccumulatorExt` trait) は 2 相を持つ — cell 解決相 `resolve_cli(name, cli, include_default, lower) → Result[Array[Binding], ParseError]` と畳み相 `collect(Array[Value]) → RVal`。このうち **cell 解決相は descriptor の宣言対象外**とする:

- cell 解決相の入出力 (`Binding` 列・値源ラダーの下位席 lowering) は評価器内部の cell 操作プロトコルであり、wire 上に現れる概念ではない — provider の「呼び出しは評価器内部のランタイム参照であり wire 上の DSL args を持たない」(DR-107 §6) と同じ線引き
- `resolve_cli` が `Result` を返すのは**下位席 lowering (`lower(...)`) のエラーを伝播するチャンネル**であって accumulator 自身の失敗ではない — 参照実装の全 builtin accumulator (`src/builtins/accumulator_residents.mbt`) で `Err` は例外なく `lower()` の `Err` の素通しであり、accumulator 固有の reject 経路は存在しない。この観測が §1 の `fallibility:"total"` 固定と整合する (ABI の `Result` を根拠に accumulator を fallible と読むのは伝播チャンネルの誤読)

VISION §4 の生成フロー (拡張 accumulator の descriptor から import 先で interface を生成する) が必要とするのは畳み相のシグネチャであり、cell 解決相は各言語実装のエンジン内部 API に属する。

### 3. builtin accumulator 3 種の収載 — increment / override は収載しない

`schema/builtin-descriptors.json` に `accumulators` 区分を新設し、参照実装の registry 登録全員 (kuu.mbt `src/builtins/install.mbt` の `register_accumulator` 3 件) を収載する: **`append` / `merge` / `kv_map`**。

DR-036 の属性セット表に居た他のエントリを収載しない判断:

- **`flatten`**: DR-105 §3 で廃止済み (`append` の `flatten:true` ダイヤルに統合)
- **`increment`**: DR-077 §3 が「count から退役、accumulators registry から除くかは Schema 実体化時に判断 (使用者が count のみなら除く)」と保留していた宿題を本 DR で決着 — **除く**。使用者は count のみであり、count は update 効果 (`:update:increment`、filters registry の `increment` transform) への正規化 (DR-077 §3) で accumulator 経路を離れた。参照実装にも registry 登録・fixture 使用実績が無い。filters registry の `increment` (transform filter、`schema/builtin-descriptors.json` の `filters.increment`) は不変
- **`override`**: DESIGN §6.3 が「multiple 無しは縮退ケース (accumulator: override 相当)」と説明する**概念モデル上の名前**であって registry 住人ではない — 参照実装は multiple 無し要素を accumulator 経路に乗せず (accum 名 None の fast path)、`override` の実装実体・登録・fixture 使用実績のいずれも無い。descriptor 体系の対象は「宣言される registry 住人」(DR-107 §1) であり対象外

### 4. flatten は append の invocation.parameters — wrong-seat 判定の機械可読化

`append` の descriptor は `invocation.parameters` に `flatten` を宣言する:

```jsonc
{
  "name": "append",
  "role": "accumulator",
  "construction": "static",
  "io_type": { "input": { "array": "value" }, "output": { "array": "value" } },
  "output_mode": "transform",
  "fallibility": "total",
  "invocation": {
    "encoding": "object_args",
    "parameters": [
      { "name": "flatten", "type": "bool", "required": false, "default": false }
    ]
  },
  "reasons": []
}
```

- **`encoding:"object_args"` の適用範囲を一般化する**: DR-107 §5 の定義「`multiple.collector` の宣言から導出される object 形引数」を「**`multiple` 宣言 (object 形) から導出される object 形引数**」に広げ、`role:"collector"` に加えて `role:"accumulator"` でも固定とする。collector の `from_entries` が multiple 宣言の collector 指定から `key` parameter (FromEntriesSpec) を導出するのと同型に、accumulator は multiple object 形の `flatten` キーから引数を導出する — 両者は「wire の multiple 宣言 → 住人の引数」という同一経路であり、新しい encoding 値は不要
- **wrong-seat 判定の判定入力になる**: DR-105 §2 の「`flatten` キーの宣言自体が `append` 以外の accumulator では invalid-range (その accumulator にそもそも存在しない属性)」という存在ベース判定は、「どの accumulator がどの属性を持つか」の宣言を前提とする。`append` だけが `parameters` に `flatten` を持ち `merge`/`kv_map` は空、という descriptor 宣言がこの判定の機械可読な根拠になる — DR-105 §1 の kawaz の言語化「どの累積装置に展開ダイヤルを乗せるかが宣言的に見える」の descriptor 上の実現
- **`separator` / `default_collector` / `default_separator` は宣言軸に載せない**: `separator` は piece 分割 (node 層の separated resident) の wire 語彙であり、畳み相 (§2 の io_type 対象) に現れない — separator の有無・既定は multiple 宣言側の関心。DR-036 の属性セットが持つ `default_collector` は `override` の退場 (§3) により全住人 `identity` (collector 省略 = 素の配列のまま) で一様となり、descriptor 単位で書き分ける余地が無い。`default_separator` も現役 corpus に住人が居ない (`merge` の separator 省略は「分割しない」に縮退する — `fixtures/multiple-parse/merge-no-separator.json` が pin 済みで、DR-036 表の `merge: default_separator ","` は multiple registry の**プリセット** `"merge"` (string 形) の糖衣内容であって accumulator 自体の属性ではない)。DR-036 の意味論 (省略時の既定解決) は不変 — descriptor への昇格を見送るのみで、実需が出れば追記でよい

### 5. completer 行の確定 — capability marker としての最小形

DR-107 §7 マトリクスに以下の行を確定する:

| role | domain | io_type | output_mode | fallibility | invocation | owns/observes | config | 備考 |
|---|---|---|---|---|---|---|---|---|
| `completer` | 禁止 | **禁止** | 禁止 | 禁止 | 必須 (`none` 固定、`construction:static` 固定) | 禁止 | 禁止 | `reasons` は常に空。DR-117 §8.3 により glue ↔ binary ABI 確定後も io_type を追加しない |

宣言できるのは `name` / `role` / `construction` (`static` 固定) / `invocation` (`{encoding:"none", parameters:[]}` 固定) / `reasons` (`[]` 固定) / `description` のみ:

- **`invocation:"none"` 固定**: completer の呼び出しは要素の `completer: "<名前>"` 名前参照のみで wire 上の DSL args を持たない (DR-060 §4「クロージャ completer の AtomicAST 表現は持たない — 名前参照のみ」)。type_parser/provider の none 固定と同じ導出
- **`io_type` 禁止**: completer 関数の**出力**契約は DR-060 §4 が確立済み (「候補は素の値文字列 (unquoted の実体) で返し、挿入時のクォートは shell / 生成器が付ける」= `{"array": "string"}` 相当)。DR-117 が確定する runtime 問い合わせ ABI は glue ↔ binary 間の契約であり、形態 A はホスト言語クロージャを直呼びし形態 B は custom completer を実行しないため、completer 関数自体の入力形を descriptor に宣言する実需はない (DR-117 §8.3)。入力形を descriptor 側から発明する「実例・実需が無い軸の事前予約」は行わない
- **`fallibility`/`output_mode` 禁止・`reasons:[]` 固定**: 補完チャンネルには reason を表面化する経路が無い — completer の失敗は「候補ゼロ」への縮退が唯一の表現であり (補完は素材の提供であって診断ではない、DR-060 §3 の素材とポリシーの分離)、filter の reject/reason 機構とは別の意味論。provider の「`null` 返却は reasons の対象外」(DR-107 §6) と同型の整理
- **`construction:"static"` 固定**: 標準 completer (files/dirs 等) もアプリ固有 completer も「名前 → 関数」の固定登録であり、`name + config → 実装` の factory 構築の実需が無い。`config` 禁止の帰結

この最小形が DR-109 骨子柱 3 の `$required` (named capability marker) の前提として十分である: export 時の未解決フック検出・import 側の要求 capability 報告に必要なのは **completer 名による同定** (name + role) であり、シグネチャの機械可読化 (io_type) は capability の充足判定ではなく実装生成 (VISION §4) の関心である。

> **DR-117 §8.3 note:** glue ↔ binary ABI の確定後も completer 関数自体の入力形は機械可読宣言を要しないため、`io_type` 禁止と最小 descriptor 形を維持する。

### 6. builtin completer は `files` / `dirs` を収載する

標準 completer 名の**閉集合は確定しない**。補完生成器の shell 委譲表に実在する最小集合として、DR-117 §7 が `files` / `dirs` の 2 descriptor を確定する。`path` は `files` と shell 委譲粒度で差が立たないため収載しない。

`schema/builtin-descriptors.json` と descriptor envelope は `completers` 区分を持ち、`files` / `dirs` の完備性を required で強制する。拡張 completer の追加は引き続き open である。

## 採用しなかった案

### accumulator の invocation を `encoding:"none"` にする (flatten を descriptor 対象外に置く)

`flatten` を multiple 宣言 (wire 語彙層) の属性として installer/definition-error 側の関心に閉じ、accumulator descriptor は名前参照のみ (`none`) とする案。DR-105 §2 の wrong-seat 判定自体は既に definition-error として確立しており descriptor 宣言なしでも壊れない。しかし collector が同じ「multiple 宣言由来の引数」(`from_entries` の `key`) を `object_args` の `parameters` として宣言している以上、accumulator の `flatten` だけを対象外にすると同一経路の引数が role によって載ったり載らなかったりする非対称が生まれる。「どの accumulator がどの属性を持つか」が descriptor から読めることは wrong-seat 判定の宣言的根拠 (§4) と VISION §4 の生成フローの両方に効く。不採用。

### io_type を cell 解決相込みの複合シグネチャで表す

`resolve_cli` の `Array[Binding] → Result[Array[Binding], ParseError]` を io_type や追加軸で表現する案。`Binding`/`LowerSeat` は評価器内部の概念で wire に現れず、DR-107 §3 の value_type 体系 (JSON 表現可能な値型) で表現できない。表現するには descriptor に評価器内部型の語彙を持ち込むことになり、「descriptor 体系は宣言される registry 住人を対象とし、評価器内部の実装装置は対象外」(DR-107 §1) に反する。不採用 (§2 の相限定が正)。

### completer の io_type を output のみ宣言する変形形

`io_type` の `input` を省略可にして `output: {"array": "string"}` だけ宣言する案。DR-060 §4 の出力契約は機械可読化できるが、`io_type` の構造 (input/output 両必須、DR-107 §3) を completer だけ崩すことになり、value_type 体系の一様性を壊す。出力契約は §5 の通り description で十分であり、構造の非対称を導入してまで載せる実需が無い。DR-117 §8.3 の glue ↔ binary ABI も completer 関数自体の input/output 宣言を要求しないため不採用。

### 標準 completer 名 (files/dirs/path 等) の閉集合を今確定する

provider の 3 スロット enum (DR-107 §6) と同様に builtin completer 名を enum 固定する案。provider は DESIGN §12/§12b/§14.3 が既に固定 3 スロットを規定済みの機械可読化だったのに対し、標準 completer の集合は DR-060 §4 が「等」で開いたまま生成器層 (層 2) に委ねている — spec 側で先に閉じるのは生成器設計の先取りになる。不採用 (§6)。

## 波及

- **DR-107**: §7 マトリクス直後に追記 note (accumulator/completer 行の確定は本 DR、射程外節の当該項目の解消)
- **DR-077**: 「increment を accumulators registry から除くかは Schema 実体化時に判断」の宿題決着 note を追記 (§3)
- **schema/descriptor.schema.json**: `role:"accumulator"`/`role:"completer"` の条件分岐を実体化 (旧「owns/observes 禁止のみ」の合同分岐を置換)、`invocation.encoding:"object_args"` の適用範囲記述を更新、envelope に `accumulators` 区分追加 (append/merge/kv_map の required 完備)
- **schema/builtin-descriptors.json**: `accumulators` 区分新設、`append`/`merge`/`kv_map` の 3 descriptor を収載
- **scripts/lint-descriptors.py**: 走査区分に `accumulators` を追加 (key/name 一致・preserve 不変量の対象化)
- **docs/REFERENCE.md**: §multiple / §definitions の accumulator 記述への descriptor 正本参照の追記は別コミットの追随課題 (`just lint-reference` は accumulators 区分を検査対象にしていないため機械検査への影響なし)
- **kuu.mbt**: 追随不要 — 本 DR は宣言軸の確定のみで実装挙動を変えない (DR-061 §4「descriptor は validator ではない」の継承)。completers registry の実体化 (runtime 問い合わせ ABI) は引き続き別 issue の射程

## 関連

- docs/issue/2026-07-16-completer-accumulator-descriptor-axes.md (発注書)
- DR-107 §7 (role 別マトリクス — 本 DR が未確定 2 行を確定)
- DR-105 §4 (「構造畳み装置は total」の勢力図 — accumulator の total/transform 固定の根拠)、§1/§2 (flatten ダイヤルと wrong-seat 判定 — §4 の宣言化の対象)
- DR-036 (accumulators registry の属性セット — default_collector/default_separator の昇格見送り判断の対象)
- DR-091 §2 (kv_map — io_type と matcher 手前ゲートの出所)
- DR-080 (merge — マーカー語彙は cell 解決相の関心で descriptor 対象外)
- DR-077 §3 (increment の count 退役 — §3 の宿題決着の出所)
- DR-060 §4/§5 (completer の名前参照・出力契約・責務 4 層 — §5/§6 の根拠)
- DR-109 §1 骨子柱 3/柱 6・§5 (\$required = named capability marker、runtime 問い合わせ、本 DR の駆動源)
- DR-104 §2(d)/§3 (candidate の completer フィールド — 候補側の座席、本 DR の registry 側と対)
- kuu.mbt `src/engine/accumulator_ext.mbt` (AccumulatorExt trait — 2 相 ABI の実体)、`src/builtins/accumulator_residents.mbt` (builtin 3 種 + Err 伝播の観測)、`src/builtins/install.mbt` (registry 登録全員)
