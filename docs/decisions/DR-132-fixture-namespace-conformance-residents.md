# DR-132: conformance 複合値ビークル — `fixture/*` namespace の仮想型 2 住人 (`fixture/int_range` / `fixture/json`)

> 由来: kawaz チャット裁定 2026-08-02 (mid=48〜54 + 統括確定)。下敷きは
> `docs/research/2026-08-02-record-builtin-type-design.md` (RECB-Q1〜Q6 — 本 DR が確定形。
> 下敷きの推し案「timestamp / timerange / json の 3 住人」は 2 住人構成へ置き換えて裁定された)。
> 発端は kuu.mbt W2-5 の実装記録が可視化した欠落 — conformance fixture の定義が使える type は
> builtin factory のみで record / value を名乗る住人が 1 つも無く、DR-127 §波及の fixture
> (2) 値残余のフィールド書き / (4) 値残余 absent → 枝 Reject / (5) 時系列上書き /
> (6) sources の座 re-tag が conformance 面に書けない。
> 機構は DR-128 §12 (SPL-Q2 = a+b) が既に裁定済み — conformance ビークルは `builtin/struct` と
> **`fixture/*` residents** の 2 系統で役割直交。本 DR は後者の最初の住人を具体化する。
> 前提 DR は DR-126 (record 型) / DR-127 (link 固定パス DSL) / DR-130 (null 射影)。

## 決定

### 1. `fixture/*` は conformance 専用 namespace — 提供義務は conformance 実行文脈での解決可能性のみ

`fixture/*` は CONFORMANCE が宣言する fixture 専用 namespace (DR-128 §12) であり、DR-094 の
拡張 ns 側の識別子体系に乗る (bare 糖衣は無い — bare 名は builtin ns 専用、DR-094 §3)。
wire からは `type: "fixture/int_range"` のように ns 付き type 参照で直接指せる。

規範が要求するのは **conformance 実行文脈で `fixture/*` の住人が type registry に解決できること**
だけである (RECB-Q6 = a)。通常実行の registry への常設は実装裁量であり、載せても builtin と同じ
後方互換の期待 (安定性保証) の対象外 — fixture の pin 都合で受理輪郭を変えうる。住人は
**conformance の pin のための仮想型**であって実用型ではない。実用の複合値型 (timespec 系等) の
カタログ収載は将来の別 DR の関心である。

descriptor の置き場は `schema/builtin-descriptors.json` の `types` 区分に fixture ns の住人として
収載する (RECB-Q5 = a — descriptor 集約 1 ファイルの現行運用を維持し、conformance 専用である旨を
`$comment` / 各 `description` に明記する)。envelope (`types` 配下 = `role:"type_parser"`) と
semantic lint (`scripts/lint-descriptors.py` の record フィールド参照解決) はそのまま適用される。

### 2. `fixture/int_range` — record 産出の pin 住人

```json
{
  "role": "type_parser",
  "construction": "static",
  "io_type": { "input": "string", "output": { "record": { "start": "int", "end": "int" } } },
  "output_mode": "transform",
  "fallibility": "reject",
  "reasons": ["not_an_int_range"]
}
```

フィールドは `start` / `end` の 2 つ、型はともに registry type `int` への参照である (DR-126 §1 —
bare 綴り `"int"` は builtin ns の糖衣であって value_type primitive ではない)。JSON 形は `int` の
`out` を辿って `{start?: number, end?: number}` に導出される。construction は static で方言ダイヤルを
持たない — 構成部の受理輪郭は canonical default の `int` (`int_round: "error"`、DR-075) に固定される。

#### 2.1 string 形の文法

入力 1 トークンを **カンマちょうど 1 個で分割した全体一致形** として読む。受理するのは 3 形:

| 入力形 | 産出 (生出力) | 意味 |
|---|---|---|
| `A,B` | `{"start": A, "end": B}` | 完全形 |
| `A,` | `{"start": A}` | start のみの部分形 |
| `,B` | `{"end": B}` | end のみの部分形 |

`A` / `B` の部分文字列は **`int` の受理輪郭** (canonical number 字句 + 整数値空間判定、anchored —
DR-074/075) でそのまま読む。trim 等の前処理はしない。負数は int 字句の一部としてそのまま書ける
(`int` の字句にカンマは現れないため、区切りの一意性は崩れない)。

range 形に読めない綴り — カンマ無し (単独 `A` を含む)、カンマ 2 個以上、`,` 単体 (両側欠落)、
構成部が `int` の輪郭で読めない (`1.5,2` / `x,2` 等) — はすべて reason `not_an_int_range` の
Reject である。

#### 2.2 パースの担い手と reason の帰属

構成部のパースを担う契約は **フィールドの type 参照 (`int`) が指す registry 住人**である
(DR-127 §3.2 の 3 箇所目の参照位置 — out record フィールドの type 参照はその型のパーサを行使する)。
経路によって発生源と reason が変わる:

- **string 形 (本住人の parse 相)** — 構成部の失敗も含め、トークン全体が range 型として読めなかった
  という 1 事実に畳み、発生源 `fixture/int_range` の `not_an_int_range` で Reject する
  (`builtin/number_parser` が構文不一致を全て `not_a_number` に帰着させる既存慣行と同型)
- **link 注入経路 (`link: "r.end"` の operand)** — operand はフィールドの type `int` の
  pieceProcessor が読む (DR-127 §3.2)。発生源は `builtin/int_parser` であり、その reasons
  (`not_a_number` / `not_an_integer` / `int_out_of_range`) がそのまま emit される

この非対称は判別可能性をそのまま pin 素材にする — 同じ座に届く operand でも、どの経路で
どのパーサが読んだかが reason の綴りで観測できる。`int` の受理輪郭が `number` より狭い
(`1.5` は number 可 / int 不可) ことも同じ目的に効く: 入口セルが `type: "string"` の link 入口でも
operand `1.5` が `not_an_integer` で落ちれば、パースを担ったのがフィールド側だと fixture から
観測できる。

#### 2.3 部分形は部分 presence を産出し、補形は射影層が行う

部分形の生出力は欠落フィールドをキーごと持たない (`5,` → `{"start": 5}`)。これは DR-127 §3.1 の
「parser string 経路の部分 presence は普通の値」の実体であり、DR-126 §4 の乖離検査では (c) 行
(宣言済みキーの不在 = 正常) に落ちる。結果射影で `end` 座が `null` に補形される (DR-130 §4.1) のは
射影層の仕事で、生出力は書き換えられない。

### 3. `fixture/json` — `value` 産出の pin 住人 (実行時解決系の担い手)

```json
{
  "role": "type_parser",
  "construction": "static",
  "io_type": { "input": "string", "output": "value" },
  "output_mode": "transform",
  "fallibility": "reject",
  "reasons": ["not_json"]
}
```

入力 1 トークンを JSON テキスト (RFC 8259) として読み、その値をそのまま返す。JSON として
読めない綴りは reason `not_json` の Reject である。値域は kuu Value の閉域 (JSON 表現可能な範囲、
DR-107 §3) にそのまま一致する。

`value` 宣言の座への link パス残余は全て実行時解決 (DR-127 §2.2 の遷移表) なので、本住人が
「セル未確定 → 枝 Reject → 他枝が勝つ」「キー不在 → Reject」「vivify しない (器の形が定義時に
言えない)」の pin を担う。`map` 行は同表で `value` と同挙動 (以降の segment は全て実行時) のため
`value` で代表して pin し、map を out に名乗る住人は立てない。

fixture で使う JSON 値は host 差の出ない範囲 (安全整数・string・bool・null・object / array) に
限る — regex fixture を方言安全パターンに限る DR-085 §3 と同じ姿勢であり、number の精度縁
(2^53 超・非整数の serialize 形) を本住人の fixture で pin しない (その規範は DR-075 / DR-092 が
既に持ち、pin の乗り物も number 系 fixture である)。

### 4. 複合値の conformance 綴り — 既存規範からの導出の確認 (新規約なし)

複合値が fixture の expect に現れるときの綴りは、すべて既存規範からの導出で決まる。
確認的に固定する 3 点:

1. **`result` は補形適用後** — record 値は JSON object で、DR-130 §4 の全フィールド列挙 +
   null 補形の**適用後**を書く
2. **`sources` は座単位の構造分解** — value_parser 産の複合値も shadow tree 上で座ごとに
   分解する (DR-127 §6 / DR-122 §3)。link 部分書きは当該の座だけ `link` タグ、産出発火の座は
   発火タグを保つ。result で `null` の座は sources でも `null` (DR-130 §5)
3. **`effects` の operand は補形前の生出力** — 効果はセルに座った値の観測であり、null 補形は
   射影層の仕事 (DR-130 §4.1) なので effects には届かない。欠落フィールドは operand でも
   欠落のまま書く。missing key と explicit null を区別保持する decoder 要件 (DR-130 §8.1) は
   operand の object 内部にもそのまま及ぶ

綴り例。定義は `{"name": "r", "type": "fixture/int_range", "long": true}` と link 入口
`{"name": "end", "long": true, "link": "r.end"}` の 2 要素とする:

- `--r "5,"` 単独:

  ```json
  "effects": [{"entity": "r", "op": "set", "operand": {"start": 5}, "source": "cli"}],
  "result":  {"r": {"start": 5, "end": null}},
  "sources": {"r": {"start": "cli", "end": null}}
  ```

- `--r "5," --end 9`:

  ```json
  "effects": [
    {"entity": "r", "op": "set", "operand": {"start": 5}, "source": "cli"},
    {"entity": "r", "path": ["end"], "op": "set", "operand": 9, "source": "link"}
  ],
  "result":  {"r": {"start": 5, "end": 9}},
  "sources": {"r": {"start": "cli", "end": "link"}}
  ```

  link 参照ノード `end` は結果キーを占有しない (DR-120 §4) ので result / sources に `end` の
  トップレベルキーは現れず、link 越しの効果の source は `link` である (DR-031、
  `fixtures/link-parse/basic.json` の pin と同じ規則)。operand `9` はフィールド型 `int` の
  パース後の値である。

operand の生出力 (`{"start": 5}`) と result の補形後 (`{"start": 5, "end": null}`) の対比が
上記 3 点をそのまま観測面に写す。

### 5. DR-127 波及 fixture との対応

DR-127 §波及が挙げた新設 fixture 8 種のうち、複合値の住人を要する 4 種を本 DR の 2 住人が覆う:

| DR-127 fixture | 担い手 | 期待値の導出元 |
|---|---|---|
| (2) 値残余のフィールド書き | `fixture/int_range` | `--end X` 単独 → vivify `{end: X}` → 射影 `{start: null, end: X}` (DR-127 §3 + DR-130 §4)。operand がフィールド型 `int` のパーサを通る判別込み (§2.2) |
| (4) 値残余 absent → 枝 Reject → 他枝勝ち | `fixture/json` | record では書けない (record 宣言は vivify するため Reject にならない、DR-127 §3)。`value` 宣言座のセル未確定 / キー不在 → Reject → or の他枝 (DR-127 §2.2/§4) |
| (5) 時系列上書き (両順) | `fixture/int_range` | `--end X --r Z` → parser 産出が丸ごと置換 / 逆順 → 産出の上に座だけ更新 (DR-127 §4 の表そのまま) |
| (6) sources の座 re-tag | `fixture/int_range` | `{"r": {"start": "cli", "end": "link"}}` (DR-127 §6) |

(7) effects の `path` 表記の値残余側も (2)(5)(6) の case に同乗して書ける。同乗候補として
record null 補形 (部分形 → 射影) と ns 付き type 直参照 (`type: "fixture/int_range"`) の初 pin も
本住人で書けるようになる。乖離 Error (DR-126 §4 の (a)(b)) は conformance では引き続き書けない —
壊れた parser を fixture から注入できないため実装側テストの領分 (DR-126 §4 の裁定のまま不変)。

**fixture の追加自体は本 DR と同窓ではない** — 実装 (kuu.mbt の 2 住人 + conformance 実行文脈の
fixture ns 解決) が無い状態で fixture を足すと conformance が壊れるため、fixture 追加は kuu.mbt
実装と同じ lockstep 窓で行う (§波及)。

## 根拠

### 仮想型 2 住人で欠落の全種が閉じる

書けなかった 4 種 (§5) の担い手は「record を out に名乗る住人」と「`value` を out に名乗る住人」の
2 つで尽きる — (2)(5)(6) は record の座と射影の話、(4) は実行時解決 (`map` / `value` 行) の話で、
遷移表 (DR-127 §2.2) 上この 2 行以外に固有挙動は無い。住人を実用型として設計する必要はどこにも
無く、pin に必要な最小の受理輪郭だけを持つ仮想型が正しい大きさである。

### int_range が pin として過不足ない

- **決定的**: 構成部が canonical int なので実時刻・環境に依存しない (下敷きの timerange 案が
  `-5m..now` を捨てて絶対値サブセットへ絞ったのと同じ制約を、最初から型の形で満たす)
- **依存が既存で閉じる**: フィールド型 `int` は既存 registry 住人で、専用のフィールド型住人を
  立てずに「フィールドの type 参照が registry を指す」(DR-126 §1) と「フィールド側の型が
  パースを担う」(DR-127 §3.2) の両方が pin できる。判別可能性は int ≠ number の輪郭差が担保する
  (§2.2)
- **部分形が本丸の素材**: `A,` / `,B` が部分 presence (DR-127 §3.1) と null 補形 (DR-130 §4.1) の
  pin 素材をパーサ経路から正規に供給する

### 提供義務を conformance 文脈に絞るのは、住人が pin の道具だから

builtin 同様の常設 (RECB-Q6 = b) にすると、fixture の pin 都合で受理輪郭を変えることが
後方互換違反になり、道具の改良が実用 API の破壊と同じ重さを持ってしまう。conformance 実行文脈での
解決可能性だけを要求すれば、通常 registry に載せる実装 (デバッグ用途等) を妨げずに、仕様側は
fixture の必要に応じて住人を育てられる。

## 波及

- **schema/builtin-descriptors.json**: `types` 区分に `fixture/int_range` / `fixture/json` の
  2 descriptor を収載 (本 DR と同時に反映)。`$comment` に fixture ns 区分 (conformance 専用) を明記
- **docs/REFERENCE.md**: §3.1 の「descriptor 実体を持つのは configurable factory 4 種のみ」の
  記述を更新、§3.2 の descriptor 収載 type 表に 2 住人を追加、§7.5 の type descriptor reason 表に
  `not_an_int_range` / `not_json` を追加 (いずれも lint-reference の双方向検査対象、本 DR と同時に反映)
- **docs/CONFORMANCE.md**: §2 sources 規則 3 に value_parser 産複合値の座分解 (§4-2) の 1 文、
  §2 effects operand の記述に補形前生出力 (§4-3) の 1 文、§7 runner 契約に fixture ns の
  解決可能性 (§1) を追加 (本 DR と同時に反映)
- **schema/fixture.schema.json**: effects operand / result / sources に object が座ることは既に
  JSON として表現可能で変更不要 (`$defs.effect.operand` は型制約を持たない)
- **kuu.mbt**: 2 住人の TypeExt 実装 + conformance 実行文脈での fixture ns 解決 +
  conformance render の複合値対応。**fixture 新設 (§5 の 4 種 + 同乗候補) はこの実装と同じ
  lockstep 窓で行う** — spec 側 fixture 先行は VANISHED SKIP を作るため不可
- **DR-128 §12**: `fixture/*` residents 系統の「最初の住人」が本 DR で実体化。`builtin/struct`
  側 (splice 機構の pin) は DR-128 の射程のまま別途
- **docs/research/2026-08-02-record-builtin-type-design.md**: 冒頭に裁定確定の追記 (本 DR が正本、
  旧 3 住人案は当時の記録として残置)

## 採用しなかった案

### (a) `fixture/timestamp` / `fixture/timerange` / `fixture/json` の 3 住人 (下敷き §3 の推し)

docs 全編の設計例 (timerange) がそのまま fixture になる読みやすさがあった。棄却理由は 2 つ。
第 1 に、判別可能性のためだけの専用フィールド型住人 (`fixture/timestamp`) は不要 — 既存の `int` が
number より狭い輪郭を既に持っており、同じ判別が住人 1 つ少なく手に入る (§根拠)。第 2 に、
timerange の名は実用型の連想を持ち、「実用 type カタログの先行確定」と誤読される — 仮想型で
あることが名前から読める `int_range` の方が、住人の位置づけ (§1) と一致する。実用の timespec 系は
将来の別 DR で改めて設計する。

### (b) 汎用 configurable factory (`fixture/record` — config で out record とフィールドを注入)

1 住人で任意の record が作れる表現力があるが、任意フィールド構成を string 1 トークンから組む
汎用文法の新設が要り、out を config で動かす新パターンは `builtin/struct` (DR-128 §12 既裁定) と
役割が丸被りする。その新パターンの導入判断は builtin/struct 側で 1 回だけ払うべきである。
ネスト record 等の pin が必要になったら `fixture/*` に住人を足せばよい (ns は本 DR で開いた)。

### (c) `builtin/struct` の前倒し

conformance ビークルとしては既裁定で新裁定が最小になるが、`builtin/struct` は identity 系で
値の組み上げが定義片 (`input_structure`) の splice に依存する。link path (DR-127) の fixture が
それを使うと DR-128 の splice 実装一式が前提になり実装順序が逆転する。DR-128 §12 の「役割直交」の
所以そのもの — 機構の pin と変換系挙動の pin は別の乗り物である。

### (d) `,` 単体を空 record `{}` として受理する

「フィールド 0 個座り」(DR-126 §1) の pin 素材になる利点があった。棄却 — 両側欠落の `,` は
range について何も言っていない入力であり、受理する動機が「pin 素材が欲しい」しか無い。部分 presence の
pin は部分形 2 つで足り、空 record の pin は将来それを自然に産む住人 (または `builtin/struct`) の
関心へ送る。

### (e) 単独 `A` を `{start: A}` に読む

1 トークン省略形の暗黙化であり、DR-128 §2 の「暗黙枝を足さない」姿勢と不整合 (下敷き RECB-Q4
起草時から非推奨)。

## 関連

- DR-128 §12 (conformance ビークル 2 系統の既裁定 — 本 DR は `fixture/*` 側の具体化)
- DR-126 §1/§3/§4 (record 型・型依存・乖離検査 — `fixture/int_range` の out 宣言の正本)
- DR-127 §2.2/§3/§4/§6 (値空間降下・vivify・時系列・観測面 — §5 の fixture 期待値の導出元)
- DR-130 §4/§4.1/§5/§8.1 (null 補形・sources の null・decoder 要件 — §4 の確認 3 点の正本)
- DR-094 (registry 語彙の namespace — `fixture/*` の識別子体系、bare 糖衣は builtin のみ)
- DR-095 / DR-107 (descriptor の宣言軸 — 2 住人の収載形)
- DR-074 / DR-075 (int の受理輪郭 — §2.1 の構成部字句の正本)
- docs/CONFORMANCE.md §2/§3/§7 (綴りと比較規約・runner 契約 — §4 の波及先)
- docs/research/2026-08-02-record-builtin-type-design.md (下敷き — 欠落の輪郭と対案比較の記録)
- kuu.mbt docs/findings/2026-08-02-w2-5-producer-and-divergence.md §5 (欠落の一次観測)
