# codex レビュー (gpt-5.6-sol) — DR-104 (complete fixture format) / DR-105 (accumulator flatten + ARRAY filter fallibility) / fixtures/complete

> DR-104/DR-105 サイクル成果 (DR 本文・CONFORMANCE/schema 追随・fixtures/complete) に対する codex (gpt-5.6-sol) の全方位レビュー全文。以下は無改変転記。

## 総評

**DR-104 は現状のままでは conformance 契約として release blocker 相当の穴が残っています。** 特に、候補同一性・集合比較・旧 `word` 入力の扱いが互いに噛み合っておらず、複数実装が異なる結果を返しても双方が「仕様準拠」と主張できる状態です。

**DR-105 は設計方向自体は妥当**ですが、`flatten` をどの段階の値に適用するか、および ARRAY filter の fallible ABI が未確定です。fixture/実装未追随そのものは既知事項として指摘しませんが、追随前に DR 側を固めないと fixture が実装依存になります。

> 注: 提示物には `fixture.schema.json` / `wire.schema.json` / `descriptor.schema.json` の本文がないため、schema の keyword 単位の監査はできません。以下では、DR・CONFORMANCE・fixture 間から確定できる schema 不整合と、schema が必ず enforce すべき条件を指摘します。行番号の代わりに節・表の行・JSON path・該当文をアンカーにしています。

---

# Critical

## C-1. `word` の「改名」ではなく、必須入力の削除になっている

**根拠**

- DR-104 §1、文頭  
  > `DR-060 §2 のシグネチャ {before, word, word_suffix?, after?} を…改名する`
- 同節の新シグネチャ  
  > `{args_before, args_after?, word_before?, word_after?}`
- 同節  
  > `word_before/word_after は v1 では未実装のまま予約する`
- DR-104「関連」  
  > `本 DR は fixture format の確定であり意味論自体は変更しない、語彙のみ改名`
- CONFORMANCE §4  
  > `word_before/word_after ... fixture では書かない`

旧 `word` は必須でしたが、新 `word_before` は optional かつ v1 では入力されません。これは改名ではなく、**現在編集中の単語を query に渡す能力の削除**です。

その結果、以下が未定義です。

- カーソルが `--po|` にあるとき、`args_before` は `[]` なのか `["--po"]` なのか
- v1 complete はトークン境界専用なのか
- prefix filtering は core が行うのか、生成器が行うのか
- カーソルが単語内にある入力を runner が reject すべきか、全候補を返すべきか

fixture はすべてトークン境界しか扱っておらず、この差を隠しています。

**修正要求**

次のどちらかを明示的に選ぶ必要があります。

1. **境界専用 v1**
   - DR-060 の旧 `word` 契約を明示的に supersede
   - `args_before` は「カーソルより前で完全に確定したトークンのみ」
   - 単語内カーソルは v1 非対応
   - `word_before` / `word_after` は v1 schema で禁止し、silent ignore しない
2. **旧意味論維持**
   - `word_before` を v1 で実装・fixture 化
   - 旧 `word` と同じ必須性・prefix semantics を定義

現状の「意味論は変えず、未実装の optional へ改名」は成立しません。

---

## C-2. 候補同一性が三つの異なる規則を同時に主張している

**根拠**

- DR-104 §3、太字文  
  > `spelling/is_value/ty/origin/term/meta の 6 フィールドが完全一致する場合に限る`
- 同節  
  > `"union of what's readable" is a union over SPELLINGS`
- DR-104 §4  
  > `和集合は経路の和集合ではなくスペリングの和集合`
- `fixtures/complete/dedup.json`、`$.cases[0].why`  
  > `同じ綴りが 2 回出る ... 契約違反`
- DR-104 §2  
  > `spelling` は `is_value:true` では意味を持たない  
  > `ty` は `is_value:true` の時のみ意味を持つ
- 同節  
  > `completer` は wire に持たせる
- ただし §3 の同一性キーには `completer` がない

これは以下のケースで破綻します。

### 例1: 同じ綴り、異なる `origin`

```json
{"spelling":"--x","is_value":false,"origin":"a",...}
{"spelling":"--x","is_value":false,"origin":"b",...}
```

- 「スペリングの和集合」なら 1 件
- 6 フィールド一致規則なら 2 件

重複トリガが合法である以上、実在するケースです。

### 例2: 同一値候補、異なる `completer`

```json
{"is_value":true,"ty":"string","origin":"x","completer":"files",...}
{"is_value":true,"ty":"string","origin":"x","completer":"dirs",...}
```

6 フィールドでは同一なので dedup されますが、どちらの `completer` を残すか未定義です。しかも fixture が `completer` を opt-in すると結果が観測可能になります。

### 例3: 「意味を持たない」フィールドが同一性に参加する

`is_value:true` に非空 `spelling` が入った場合、意味を持たないはずなのに別候補になります。exact 候補の `ty` も同様です。

**修正要求**

「表示上の綴り集合」と「候補レコードの同一性」を分離してください。最低限、次を normative に定義すべきです。

- exact 候補の identity key
- value 候補の identity key
- `completer` が identity 成分か否か
- 同じ spelling で `origin` / `meta` / `term` が異なる場合の merge・併存規則
- 意味のないフィールドは schema で禁止するか、比較前に正規化して無視するか

また、§3 の見出し「wire 表現の構造等価」は不正確です。`completer` を除外しているため、実際には wire 全体の構造等価ではありません。

---

## C-3. `candidates` の集合比較では dedup 契約を検証できない

**根拠**

- DR-104 §4  
  > `candidates は集合比較`
- CONFORMANCE §3、`candidates` 行  
  > `candidates ... は集合比較`
- `fixtures/complete/dedup.json`  
  期待値は候補 1 件

実装が次を返しても、

```json
[candidate, candidate]
```

数学的な集合へ正規化すれば、

```json
[candidate]
```

と同じになり、dedup fixture は green になります。つまり、**dedup が normative なのに conformance runner が重複を観測不能にしています。**

JSON Schema の `uniqueItems: true` だけでも不十分です。`uniqueItems` は JSON オブジェクト全体で判定するため、DR の 6 フィールド identity と異なり、`completer` だけ違う重複などを検出できません。

**修正要求**

比較を次の二段階にしてください。

1. actual の候補列に、normative identity key の重複がないことを検証する
2. その後、順序非依存の一対一比較を行う

または「順序非依存 multiset 比較 + identity 重複は即 fail」と明記してください。

`集合比較` という語だけでは、重複を無視する set と、順序だけ無視して多重度を保持する multiset のどちらか判別できません。

---

## C-4. DR-105 の `flatten` は適用段階が未定義で、旧 accumulator と等価か判断できない

**根拠**

- DR-105 §1  
  > `発火値が配列なら、その要素を 1 段だけ積む`
- DR-105 §3、旧 descriptor の引用  
  > `{accumulator: (piece, processor, prevs) → T[], default_collector: "identity"}`
- 同節  
  > `同じ意味論は {"accumulator":"append","flatten":true} で表現`
- 「波及」  
  > `multiple` object に `flatten?: bool` を追加

旧 signature には `piece`、`processor`、`prevs` がありますが、新ダイヤルについて次が決まっていません。

- 配列判定は raw `piece` に対して行うのか
- `processor(piece)` の結果に対して行うのか
- `cell_filters` 後なのか
- `prevs` への結合式は何か
- 空配列は 0 要素追加なのか
- 非配列は `[v]` として追加するのか
- 旧 `flatten` の `default_collector:"identity"` を新 `append` が本当に継承するのか
- 現行 accumulator ABI に `flatten` 設定をどう届けるのか

特に raw piece と processed value のどちらを判定するかで、processor が配列を生成・変換する場合の観測結果が変わります。

**修正要求**

少なくとも観測意味論を式で固定すべきです。例えば、意図がこれなら明記してください。

```text
v = processor(piece)

next =
  if flatten == true and v is Array
  then prevs ++ elements(v)
  else prevs ++ [v]
```

さらに、

- `accum_filters` は `next` に対して走る
- nested array は保持される
- `[]` は何も追加しない
- non-array は通常 append と同じ
- collector は旧 `flatten` と同じく identity

まで必要です。内部 ABI は自由でも、観測式は自由にできません。

---

# Major

## M-1. `args_after` の「省略」と「空配列」が矛盾している

**根拠**

- DR-104 §5  
  > `args_after が供給された場合は ... フル parse()`
- CONFORMANCE §4  
  > `与えられると after 整合フィルタが働く`
- `fixtures/complete/after-filter.json`、case `no-after-both-triggers-survive` の `why`  
  > `args_after.length()==0 は無条件通過`

次の二つが同じか違うか決まっていません。

```json
// omitted
{"args_before":[]}
```

```json
// supplied but empty
{"args_before":[],"args_after":[]}
```

存在判定なら後者はフル parse 対象、長さ判定なら両者ともフィルタなしです。遅延述語や必須 positional があると結果が変わります。serializer が optional field を常に `[]` で出す実装もあるため、これは単なる表記差ではありません。

**修正要求**

- `args_after == null/omitted` と `args_after == []` を同値にするのか
- presence-sensitive にするのか

を明記し、fixture を対にしてください。現状の参照実装に寄せるなら「空配列は省略と同値」が自然です。

---

## M-2. `origin` 必須規則と公式例が直接矛盾している

**根拠**

- DR-104 §2、表 `origin` 行  
  > `必須`
- DR-104 §2 冒頭の exact 候補例  
  `{"spelling":"--port", ...}` に `origin` がない
- CONFORMANCE §4 の例、`expect.candidates[0]`  
  同じく exact `--port` 候補に `origin` がない
- 実 fixture はすべて exact 候補にも `origin` を書いている

したがって、

- schema が `origin` を required にすれば公式例が schema-invalid
- schema が optional にすれば DR の「必須」に違反

のどちらかになります。

**修正要求**

両方の公式例に `"origin":"port"` を追加してください。

---

## M-3. candidate schema が tagged union になっていない

**根拠**

- DR-104 §2 表  
  > `spelling` は exact で実質必須  
  > `ty` は value で実質必須
- CONFORMANCE §4  
  > `{spelling?, is_value, ty?, origin, term, meta, completer?}`

「実質必須」は conformance 契約として弱すぎます。現在の記述では以下が schema-valid になり得ます。

```json
{"is_value":false,"origin":"x","term":"word_end","meta":{...}}
```

```json
{"is_value":true,"origin":"x","term":"word_end","meta":{...}}
```

逆に、意味を持たないフィールドも排除されていません。

**修正要求**

`candidate` は `oneOf` で分けるべきです。

- exact:
  - `is_value: false`
  - `spelling`, `origin`, `term`, `meta` required
  - `ty`, `completer` は禁止
- value:
  - `is_value: true`
  - `ty`, `origin`, `term`, `meta` required
  - `spelling` は禁止、または `""` のみ許可
  - `completer` optional

少なくとも identity に参加するフィールドは canonical shape を持つ必要があります。

---

## M-4. 「省略 = default」と「省略 = 未検証」が同じ比較規約に混在している

**根拠**

- CONFORMANCE §3 冒頭  
  > `フィールド省略 = default 値と等価`
- 同節 `errors.reason` / `warnings.kind` / `help_entry` / `tried_triggers` / `completer`  
  > 省略時は未検証
- `meta` の説明  
  > 省略を default とすると検証が骨抜きになるので常に書く

省略には少なくとも二つの意味があります。

1. default 値を明示したものとして比較
2. fixture 側 wildcard、比較対象外

この二つを「構造等価」の一語で処理すると runner ごとに解釈が割れます。特に `completer` 付き候補の集合マッチングで問題になります。

**修正要求**

比較規約を次のように分離してください。

- normalization default
- fixture-side opt-in field
- required field
- ignored field

候補については、どのフィールドがどの分類かを表にするべきです。

---

## M-5. `completer` が現行 wire 契約なのか将来予約なのか不明

**根拠**

- DR-104 §2  
  > `wire には持たせる`
  > `書けば検証`
- 同節  
  > `参照実装の Cand にはまだ ... 存在せず`
- fixture には `completer` が一件もない
- §3 の identity からも除外

現在の文章では、fixture 作者が今日 `completer` を書けば、すべての現行実装を正当に fail させられます。一方で「まだ未実装なので書いてはいけない」とする規則はありません。

**修正要求**

どちらかに統一してください。

- v1 reservation: schema で禁止、比較対象外
- v1 normative: 実装必須、少なくとも 1 fixture で pin
- capability/version gated opt-in: fixture 側に必要 feature を宣言

加えて、`completer` を identity に含めるか、同じ core identity に異なる completer が来た場合の規則が必要です。

---

## M-6. `term:"cont"` が一件も conformance されていない

**根拠**

- DR-104 §2  
  > `word_end` / `cont` の二値
- DR-104 §5  
  > `term:"cont"` は after filter 対象外
- `basic-boundary.json` は明示的に `long_eq_sep:"deny"` として `cont` を排除
- 全 10 fixture の期待値はすべて `term:"word_end"`

wire enum の半分、および after-filter の明示的例外が未検証です。

**必要 fixture**

最低でも以下が必要です。

1. `long_eq_sep:"allow"` で `--key=` 相当の exact `term:"cont"`
2. `args_after` があっても `cont` 候補が無条件生存するケース
3. 同じ origin から `word_end` と `cont` が併存する場合の identity/dedup

---

## M-7. 遅延述語 5 種を一括規定しているが、fixture は `exclusive_group` のみ

**根拠**

- DR-104 §5  
  > `required / required_group / requires / exclusive_group / conflicts_with` の全て
- `constraint-non-participation.json`  
  `exclusive_group` のみ

これらは単なる同義語ではありません。

- `required`: 候補自身が requirement を満たす場合がある
- `required_group`: group 単位
- `requires`: 方向性がある
- `conflicts_with`: 二項関係
- `exclusive_group`: group cardinality
- `unset`: committed 取消しとの相互作用

特に after-filter では、候補が述語を満たす側か壊す側かで結果が変わります。

**修正要求**

全 5 種について最低 1 対ずつ、before-only 生存と after-filter 除外を pin してください。少なくとも `requires` と `required` は `exclusive_group` から導出できません。

---

## M-8. constraint fixture が「同じ flag の再指定」を混ぜており、関心を隔離できていない

**根拠**

- `constraint-non-participation.json`
- case `exclusive-partner-excluded-by-after-consistency-check`
- `--verbose` 候補を採用した完全経路  
  `["--json","--verbose","--verbose"]`
- `why`  
  > `2 回目の --verbose は committed の冪等な再確認`

この fixture の green は、exclusive semantics だけでなく「非-multiple flag の重複入力が成功し、冪等である」ことにも依存します。重複規則が別 DR で完全に固定済みでも、fixture の関心が不要に複合しています。

**修正要求**

after token を別の unconstrained option、または必須 positional にして、候補自身との重複を避けてください。

---

## M-9. after-filter の見出しが実際の意味論を過大に表現している

**根拠**

- DR-104 §5 見出し  
  > `args_after 供給時は完全経路判定が働く`
- 同節末尾  
  > 値位置候補・`term:"cont"` は対象外で無条件通過
- CONFORMANCE §4 も同様

実際に完全経路判定されるのは **exact かつ `term:"word_end"` の候補だけ**です。値候補は、その候補と `args_after` を合わせて完全経路が絶対に成立しなくても残ります。

**修正要求**

見出しと本文を次のように限定してください。

> `args_after` 供給時、exact/word_end 候補に限り完全経路フィルタを行う

現在の「args_after なら完全経路判定」という一般命題は偽です。

---

## M-10. after-filter の `Ambiguous` 生存規則が fixture されていない

**根拠**

- DR-104 §5  
  > `Success/Ambiguous` なら残し、`Failure` なら除外
- after fixture は Success と Failure のみ

`Ambiguous` を成功側として扱うのは独立した設計判断です。実装が `Ambiguous` を除外しても現在の 10 fixture では検出できません。

---

## M-11. dedup fixture が負側の同一性境界を検証していない

**根拠**

- `dedup.json` は 6 フィールドがすべて同じ候補を 1 件にする positive case のみ
- DR-104 §3 は「完全一致する場合に限る」と規定

不足しているのは以下です。

- 同じ spelling、異なる origin は 1 件か 2 件か
- 同じ spelling/origin、異なる meta
- 同じ origin、異なる term
- 値候補で ty が異なる
- 同じ 6 フィールド、異なる completer
- path だけ異なる

特に最初と最後は DR の中心判断そのものです。現在の fixture は C-2 の矛盾を露呈させません。

---

## M-12. ancestor scope の和集合を直接 pin する fixture がない

**根拠**

- DR-104 §3  
  > `異なる祖先 scope 経由で供給された`
- `command-scope.json` は親に候補要素がなく、入場前後の切替だけ
- `dedup.json` は同一親に同名 command を二つ置く構成

親 option と子 option、あるいは複数祖先から同時に読める候補の union は直接検証されていません。`Cand.path` を wire から落とす判断の中心軸なので、単なる command 入場 fixture では不足です。

---

## M-13. `ty` 語彙が開いたままで conformance enum になっていない

**根拠**

- DR-104 §2、表 `ty` 行  
  > `"string"/"number"/"int"/"float"/"bool"/"flag"/"count"/"none" 等`

`等` は wire contract では使用できません。

さらに、`flag` / `count` / `none` が値位置候補として実際に出るのかも不明です。値スロットを取らない型なら enum に挙げる理由がありません。

**修正要求**

- `definition.type` と完全に同じ enum を参照するなら schema `$ref` を共有
- custom type があるなら拡張規則を定義
- value candidate に出現可能な型を限定
- 大文字小文字と canonical spelling を固定

---

## M-14. `origin` の canonicalization が不足している

**根拠**

- DR-104 §2  
  > `由来要素名`
- alias fixture では canonical name `port`
- dd fixture では `"--"`
- command fixture では command name
- path/entity id は除外

次が未定義です。

- alias 自身の名前と canonical target のどちらか
- ref/link 越しでは参照元か参照先か
- unnamed/generated element
- repeat installer など lowered/generated element
- 同名要素が scope ごとに存在する場合
- canonical element の rename が wire compatibility に与える影響

alias の 1 例だけでは一般規則になっていません。少なくとも「lowering 後の owner element の wire `name`」など、抽出関数として定義すべきです。

---

## M-15. `meta` 必須化が「運用」に留まっている

**根拠**

- DR-104 §2  
  > `meta 必須 — 省略不可`
- CONFORMANCE §3  
  > `常に書く運用とする`
- 一般規約  
  > 省略 = default

normative requirement なら「運用」では足りません。schema と runner の双方で enforce すべきです。

また、`meta` object 内の三フィールドも required なのか、欠落時 false default なのか明示されていません。

**修正要求**

- `candidate.required` に `meta`
- `meta.required` に三 boolean、または各 default false を明示
- `additionalProperties:false`
- runner は schema validation を conformance 前提にする

---

## M-16. DR-105 の `flatten:false` を他 accumulator に書いた場合が未定義

**根拠**

- DR-105 §2 見出し  
  > `flatten は append 専用 — 他 accumulator への宣言は definition-error`
- 同節本文  
  > `flatten:true を append 以外 ... に宣言することは ... reject`
- §1  
  > 既定 false

次がどちらか決まりません。

```json
{"accumulator":"merge","flatten":false}
```

- `flatten` 属性自体が append 専用なので definition-error
- false は既定値と同じなので許可・正規化
- schema は許可するが意味論で無視

**修正要求**

属性の**存在**を禁止するのか、`true` だけを禁止するのか明記してください。構造不一致という論拠なら、false でも禁止する方が一貫します。

---

## M-17. 廃止された `"accumulator":"flatten"` の失敗契約がない

**根拠**

- DR-105 §3  
  > registry の独立エントリ `flatten` を削除
- fixture 波及  
  > 既存 fixture を書き換える

既存 wire に旧名が残った場合、

- unknown accumulator
- invalid-range
- deprecated warning
- migration alias
- schema rejection

のどれになるか未定義です。

definition-error の kind 語彙を重視する体系なので、削除後の旧名の扱いも pin すべきです。単なる registry miss なら、その kind を明記してください。

---

## M-18. `length_range` の DSL 定義が不足している

**根拠**

- DR-105 §5  
  > `length_range:min:max`
  > `min 未満` / `max 超過`

境界が inclusive であることは読み取れますが、宣言妥当性が未定義です。

- `min` / `max` は非負整数か
- `min <= max` 必須か
- `length_range:1.5:5`
- `length_range:-1:5`
- `length_range:5:1`
- `length_range:1`
- `length_range:1:5:7`
- overflow
- 空 bound を許すか
- malformed parameter は definition-error の何 kind か

DR-082 的な方針なら、これらは runtime reject ではなく definition-error になるはずですが、明記がありません。

**修正要求**

パラメータ grammar と definition-error kind を表で固定してください。

---

## M-19. ARRAY filter の fallible ABI が規範化されていない

**根拠**

- DR-105 §4  
  > `Validate/Transform の二分法`
  > `reject を返せる`
- 採用しなかった案  
  > 旧 `Array[Value] → Array[Value]` を維持しない
- ただし採用後の正確な signature が本文にない

最低限、次が必要です。

```text
Transform: Array[Value] -> Array[Value]
Validate:  Array[Value] -> Result[Array[Value], Reason]
```

または全 entry を、

```text
Array[Value] -> Result[Array[Value], Reason]
```

へ lift するのか。

未定義事項:

- Validate 成功時は入力配列をそのまま返すのか
- Transform は絶対に reject しないのか
- filter 列の途中で reject したら short-circuit か
- reject 前の transform 結果はエラー観測に影響するか
- 複数 reject を集約するのか最初の 1 件か
- element 帰属は owner element か filter 名か

DR-102 から継承するなら、継承範囲を明示的に参照すべきです。

---

## M-20. descriptor の二軸「carrier × fallibility」が schema 上見えない

**根拠**

- DR-105 §4  
  > scalar filter registry と ARRAY filter registry
  > Validate/Transform の二分法
- 波及  
  > `filters.unique`
  > `filters.length_range`
- `signature` は Validate/Transform を表すとされる

Validate/Transform は fallibility 軸しか表しません。別途、

- Scalar → Scalar
- Array → Array
- collector
- accumulator

の carrier/role 軸が必要です。

registry namespace 自体が carrier を表すなら、`builtin-descriptors.json` 上でそれが明確でなければなりません。単一 `filters.*` namespace なら `signature:"Validate"` だけでは `in_range` と `length_range` の入力型を区別できません。

**修正要求**

例えば以下のように二軸化してください。

```json
{
  "kind": "filter",
  "domain": "array",
  "signature": "validate"
}
```

または scalar/array registry を schema 上も完全に分離してください。

---

## M-21. `filters.unwrap_single` / `filters.from_entries` は語彙上 collector と衝突している

**根拠**

- DR-105「波及」`schema/builtin-descriptors.json`
  > `filters.unwrap_single` / `filters.from_entries` (collector、DR-036/DR-044)

collector なのに `filters.*` と記されています。

これが単なる文書 typo なのか、descriptor namespace が role を表さない設計なのか判別できません。後者なら M-20 の問題がさらに強くなります。

**修正要求**

- collector registry なら `collectors.unwrap_single` 等へ修正
- flat namespace なら、descriptor に `kind:"collector"` を必須化
- `reasons:[]` を全 descriptor 共通に持たせる理由も明記

---

# Minor

## m-1. hidden の説明が「返す」と「除外する」を同時に言っている

**根拠**

- `fixtures/complete/meta.json`、top-level `why`
  > `complete API 自体は ... 除外せず素直に候補として返す`
  > `『既定で除外だがメタには残す』直接実演`

後者は生成器表示層についての説明だと思われますが、fixture 自体は core complete の観測です。

**修正案**

> core complete は常に返す。生成器の既定表示ポリシーは hidden 候補を表示対象から除外できる

と層を分けてください。

---

## m-2. `word_end` の「スペース可」が hint なのか義務なのか曖昧

**根拠**

- DR-104 §2、`term` 行  
  > `word_end (確定、スペース可)`

「可」は生成器がスペースを挿入してよいという hint なのか、必ず挿入すべきなのかが不明です。`cont` も「スペース不可」が validator 制約なのか表示 hint なのか明記するとよいです。

---

## m-3. `args.length` と `args_pos` の関係を明記した方がよい

**根拠**

- DR-105 §4  
  > reject 時の位置帰属は `args.length`

outcome wire のフィールド名は通常 `args_pos` なので、

```text
error.args_pos = input args の要素数
```

と書く方が明確です。0-based index の one-past-end であることも併記すべきです。

---

## m-4. 「予約」フィールドの受理動作が曖昧

**根拠**

- DR-104 §1  
  > `word_before/word_after は将来予約`
  > `fixture では書かない`

予約フィールドを受理して無視するのか、v1 schema で reject するのか未指定です。forward compatibility 上、silent ignore は危険です。

---

# fixture 輪郭の主要な欠落

DR-104 の 10 本は、基本境界・dead end・dd・command 入場・meta・DR-097 を押さえている点はよいです。しかし、conformance の独立軸として最低限、以下が不足しています。

| 欠落軸 | 必要な理由 |
|---|---|
| 部分単語 / cursor-inside-word | 旧 `word` 契約との断絶を解決するため |
| `term:"cont"` | wire enum の半分と after-filter 例外が未検証 |
| `args_after` omitted vs `[]` | presence/length semantics の差 |
| after-filter で `Ambiguous` 生存 | Success とは独立した outcome |
| same spelling / different origin | 「スペリング集合」と 6-field identity の境界 |
| same identity / different completer | completer の identity 非参加を検証 |
| path だけ異なる候補 | `Cand.path` 除外判断の直接検証 |
| ancestor と child の同時可視性 | scope union の直接検証 |
| `required` | candidate が requirement を満たすケース |
| `required_group` | group cardinality |
| `requires` | 方向性 |
| `conflicts_with` | group ではない二項関係 |
| unset を挟む制約 | DR-104 が単調性不採用理由に明記 |
| candidate actual 重複の runner rejection | 集合比較だけでは dedup を検証不能 |
| completer opt-in | 現行契約に残すなら必須 |

---

# 修正優先順位

1. **候補 identity を一本化する**
   - spelling set なのか record set なのか決める
   - exact/value 別 key
   - completer の扱い
2. **集合比較を「重複検査 + 順序非依存一対一比較」に変更**
3. **旧 `word` を本当に supersede するか実装するか決定**
4. **`args_after` omitted / empty の意味を固定**
5. **candidate schema を tagged union 化し、公式例の `origin` を修正**
6. **`term:"cont"`、identity 負側、制約 5 種の fixture を追加**
7. **DR-105 の flatten を観測式で定義**
8. **ARRAY filter の carrier/fallibility ABI と `length_range` grammar を定義**
9. **descriptor namespace の filter/collector 混線を解消**

現状で最も危険なのは、単なる fixture 不足ではなく、**同じ fixture を通す runner の比較実装自体が複数通り成立すること**です。特に C-2/C-3 を直さない限り、4 プロファイル green になっても候補 dedup の conformance は証明できません。

---

**本レビューは未トリアージ (統括検証前)。対応は issue codex-review-dr104-dr105-triage が追跡 — 指摘には DR-060 の既存規定 (word 系の v1 未使用可) との突き合わせが必要なものが含まれる可能性があり、鵜呑みにしないこと。**
