# record 産出 builtin type の設計 — conformance 面に複合値を導入するビークル (DR 起草前の下敷き)

> **裁定確定 (2026-08-02、kawaz mid=48〜54 + 統括)**: RECB-Q1〜Q6 は **DR-132** として確定した。
> 正本は `docs/decisions/DR-132-fixture-namespace-conformance-residents.md`。本ファイル以下の本文は
> 当時の検討記録であり、確定形は次の点で本文の推し案と異なる:
>
> - **住人は 2 つ** — `fixture/int_range` (record `{start: int, end: int}`、string 形あり) +
>   `fixture/json`。§3 の 3 住人案 (timestamp / timerange / json) は置き換え —
>   専用フィールド型住人 (`fixture/timestamp`) は立てず、フィールド型は既存 registry type `int` の
>   直参照 (判別可能性は int ≠ number の輪郭差が担保、DR-132 §根拠)
> - **string 形はカンマ区切り** `A,B` / `A,` / `,B` の 3 形のみ受理。`,` 単体 (空 record) と
>   単独 `A` は reject (RECB-Q4 の (a) から変更 — 空 record の pin 素材は将来住人の関心へ)
> - RECB-Q5 = a (`schema/builtin-descriptors.json` の types 区分に fixture ns 収載)、
>   RECB-Q6 = a (提供義務は conformance 実行文脈の解決可能性のみ)、reason は
>   `not_an_int_range` / `not_json`
> - §5 の綴り例は 2 点誤りがあった — link 参照ノードは結果キーを占有しない (DR-120 §4) ので
>   result / sources にトップレベルキーは現れず、link 越し効果の source は `cli` でなく `link`
>   (DR-031、`fixtures/link-parse/basic.json` の pin)。正しい綴りは DR-132 §4

> 由来: kuu.mbt W2-5 の実装記録 (`kuu.mbt docs/findings/2026-08-02-w2-5-producer-and-divergence.md` §5)
> が可視化した欠落 — conformance の定義が使える type は builtin factory のみで、record を名乗る住人が
> 1 つも無いため、DR-127 波及の fixture (2) 値残余書き / (4) 値残余 absent Reject / (5) 時系列上書き /
> (6) sources 座 re-tag が conformance 面に書けない。W2-7/W2-8/W2-9 の fixture 前提。
> 裁定候補は §8 (RECB-Q1〜Q6)。裁定後に DR へ昇格し、本ファイルは経緯資料として残る。

## 0. TLDR

**新しい機構は発明しない。** DR-128 §12 (SPL-Q2 = a+b) が conformance ビークルを既に 2 系統で裁定済み
— `builtin/struct` (identity factory、splice 機構の pin) と **`fixture/*` residents** (fixture 専用
namespace の変換系 parser)。本設計はこのうち後者の**最初の住人を具体化する**だけである。推しは具象
住人 3 つ (`fixture/timestamp` / `fixture/timerange` / `fixture/json`、§3) で、docs 全編の設計例
(timerange) がほぼそのまま fixture になる。`builtin/struct` は splice (DR-128) の実装が前提なので、
link path (DR-127) の fixture を splice に人質へ取らないためにも変換系住人が正しい入口である。
併せて conformance の複合値綴り (result / sources / effects operand) を §5 で確定させる — いずれも
既存規範 (DR-127 §6 / DR-130 §4/§5 / CONFORMANCE §3) からの導出で、新規約はほぼ要らない。

## 1. 欠落の輪郭 (何が書けないのか)

conformance fixture の定義が使える type は builtin factory だけである。`definitions.types` は
builtin factory の config を差し替えるだけの機構で (`fixtures/value-typing/int-hex-value-space.json`
が実例)、新しいパース挙動を wire から作ることはできない。`schema/builtin-descriptors.json` の
`types` は `number_parser` / `int_parser` / `bool_parser` / `tty` の 4 つで、output はすべて
number か bool — **record (または map / value) を名乗る住人が 1 つも無い**。

したがって次がすべて conformance 面に出せない:

- DR-127 §波及の fixture (2) 値残余 (不透明複合値のフィールド書き) / (5) 時系列上書き /
  (6) sources の座 re-tag — record を out に名乗るセルが立てられない
- 同 (4) 値残余の absent → 枝 Reject → 他枝勝ち — こちらは record では**書けない** (record 宣言は
  vivify するので Reject にならない、DR-127 §3)。担い手は `map` / `value` を out に名乗る住人である
- DR-130 §4.1 の record null 補形 (kuu.mbt `docs/issue/2026-08-02-record-null-fill-missing-in-projection.md`
  が実装欠落として起票済み — pin が無いから欠落が観測されなかった)
- 複合値の fixture 綴りそのもの (kuu.mbt W2-3 findings §9-2/9-3 — 実装側 render は綴りを決めても
  住人が居なければ case が書けない)

## 2. 既裁定の骨格 (何が決まっていて、何が残っているか)

| 既裁定 | 内容 | 本設計への効き |
|---|---|---|
| DR-128 §12 (SPL-Q2=a+b) | conformance ビークルは `builtin/struct` + `fixture/*` residents の 2 系統、役割直交 | 住人の置き場 (`fixture/*` ns) と役割 (変換系 parser の挙動 pin) は決定済み |
| DR-126 §1 | record の value_type、フィールドは type 参照 (registry 空間のみ解決)、型依存グラフ | timerange → timestamp の依存がそのまま書ける |
| DR-126 §4 + DR-130 §4.1 | 乖離検査は生出力、(c) 欠落フィールドは正常で射影層が null 補形 | 部分 range の産出が正規の pin 素材になる |
| DR-127 §2.2/§3/§4 | 値空間降下の遷移表、record は vivify 可 / map・value は Reject、時系列適用 | fixture (2)(4)(5) の期待値がすべて導出できる |
| DR-127 §6 | sources は座単位の構造分解、effects は `path` segment 配列 | fixture (6)(7) の綴りの正本 |
| DR-130 §8/§8.1 | fixture は全キー逐語、missing key と explicit null の区別保持 | 生出力 (effects operand) と射影 (result) の差がそのまま観測できる |
| DR-126 §4 末尾 | 壊れた parser は注入できないので乖離 Error の pin は実装側テストの領分 | 乖離 Error (a)(b) は本設計でも conformance 対象外のまま (不変) |

残っているのは: `fixture/*` の最初の住人を何にするか (§3/§4)、複合値の fixture 綴りの確定 (§5)、
CONFORMANCE / schema への収載形 (§7)。

## 3. 案 A (推し): `fixture/*` ns に具象変換系住人 3 つ

DR 群の設計例 (timerange) をそのまま実体化する 2 住人 + 実行時解決系 (`map` / `value` 行) を担う
1 住人。いずれも construction: static (config ダイヤルなし)、通常の 1 トークン string 消費
(`input_structure` なし = DR-128 §2 の縮退形なので **splice 実装に依存しない**)。

### 3.1 `fixture/timestamp` — number への精密化

- `io_type`: `{ "input": "string", "output": "number" }`、output_mode: transform、fallibility: reject
- **受理輪郭は canonical 10 進整数のみ** (負数可、小数・基数 prefix・指数は reject)。
  reason は `not_a_timestamp` (新設 1 綴り)
- 存在理由は 2 つ。(1) record フィールドの type 参照が **primitive 綴りでない registry 住人**を指す
  形 (DR-126 §1 の本丸) を pin する。(2) 受理輪郭を number_parser より狭くすることで、link 注入時に
  **入口セルの type ではなくフィールドの type がパースする** (DR-127 §3.2) ことが fixture で判別可能に
  なる — 入口が `type: "string"` でも operand `1.5` が `not_a_timestamp` で落ちれば、パースを担ったのが
  フィールド側だと観測できる。輪郭が number_parser と同じだとこの判別が消える

### 3.2 `fixture/timerange` — record 産出の本丸

- `io_type.output`: `{ "record": { "since": "fixture/timestamp", "until": "fixture/timestamp" } }`
- input は string 1 トークン。文法は `A..B` / `A..` / `..B` / `..` (A/B は timestamp の受理輪郭で読む)。
  部分 range は**欠落フィールドの生出力**を正規に産む (`5..` → `{"since": 5}`、DR-127 §3.1 の
  「parser string 経路の部分 presence は普通の値」の実体)。`..` 単独は空 record `{}` (DR-126 §1 の
  「フィールド 0 個座り」も座れる)。range 形に読めない綴りは reason `not_a_timerange`
- docs 全編 (research 2026-07-28 / 2026-07-31、DR-126/127/128) の設計例と同じ型なので、DR の例示が
  ほぼそのまま fixture に写せる。**ただし例の `-5m..now` はそのまま使えない** — conformance fixture は
  決定的でなければならず、相対時刻・`now` は実時刻依存になる。文法を絶対 timestamp の決定的サブセットに
  絞るのはこの制約の帰結であり、DR にも明記する (docs 例との差分は文法だけで、型の形と経路は同一)

### 3.3 `fixture/json` — `value` 産出 (実行時解決系の担い手)

- `io_type`: `{ "input": "string", "output": "value" }`。入力を JSON として読み、その値をそのまま返す。
  JSON として読めない綴りは reason `not_json`
- fixture (4) の担い手: `value` 宣言の座への link パス残余は全て実行時解決 (DR-127 §2.2 の表) なので、
  「セル未確定 → 枝 Reject → 他枝が勝つ」「キー不在 → Reject」「vivify しない (器の形が定義時に
  言えない)」が書ける。`map` 行は同表で `value` と同挙動 (以降の segment は全て実行時) なので、
  `value` で代表 pin して map out の住人は立てない
- 副産物として「複合値が config 経由でなく CLI トークンから座る」一般ケースの入口にもなる

### 提供義務の範囲

`fixture/*` ns は **CONFORMANCE が宣言する fixture 専用 namespace** (DR-128 §12) であり、規範として
要求するのは「conformance 実行文脈で解決可能であること」だけにする。通常実行の registry に載せるかは
実装裁量で、載せても安定性保証 (builtin と同じ後方互換の期待) の対象外 — fixture 都合で受理輪郭を
変えうる、と明記する。

## 4. 対案の比較

### 案 B: 汎用 configurable factory (`fixture/record` — config で out record とフィールドを注入)

`definitions.types` の config 差し替え慣行に乗り、1 住人で任意の record (ネスト含む) が作れる。
棄却推しの理由は 3 つ:

1. **パース文法の発明が要る**。任意フィールド構成の record を string 1 トークンから組むには
   「カンマ区切りで宣言順」等の汎用文法を新設することになり、その文法自体は何の設計例とも対応しない
2. **`builtin/struct` (既裁定) と重複する第 2 の汎用機構になる**。out を config で注入する汎用 type は
   DR-128 §12 が `builtin/struct` として既に持っており、splice 実装後には役割が丸被りする。既存 4 factory
   の config が「out は固定、方言ダイヤルのみ」なのに対し out を動かす config は新パターンで、その新パターンを
   導入する判断は builtin/struct 側で 1 回だけ払うべき
3. fixture の why が「この config でこの文法でこの out」の多段説明になり、変換系挙動の pin
   (string 正規化・部分 range) としては固定文法の具象住人より読みにくい

表現力 (ネスト record を config で即席に作れる) は案 B の実利だが、v1 完備主義が要求するのは**規範の
完備**であって fixture 住人の先行網羅ではない。ネスト record の pin が必要になった時点で `fixture/*` に
住人を足せばよい (ns は本設計で開く)。

### 案 C: `builtin/struct` を前倒しで入れる

conformance ビークルとしては既裁定なので新裁定が最小、という利点がある。棄却推しの理由は時期 —
`builtin/struct` は identity 系で、値の組み上げが定義片 (input_structure) の splice に依存する。
W2 (link path) の fixture がそれを使うと **DR-128 の splice 実装一式が DR-127 fixture の前提**になり、
実装順序が逆転する。DR-128 §12 の 2 系統が「役割直交」とされた所以そのもの: 機構の pin
(builtin/struct) と変換系挙動の pin (fixture/*) は別の乗り物である。

## 5. conformance の複合値綴り

すべて既存規範からの導出で、CONFORMANCE §3 の比較規約 (result/sources はキー集合込み完全一致、
missing ≠ null、effects operand は present-required) に新設は要らない。確認的に固定する点は 3 つ:

1. **result**: record 値は JSON object。DR-130 §4 の全フィールド列挙 + null 補形の**適用後**を書く
2. **sources**: DR-127 §6 の座単位分解 + DR-130 §5 の null 座。parser 丸ごと産出なら産んだ座だけ
   発火タグ、産まなかった座は null。link 部分書きは当該座だけ `link`
3. **effects の operand は補形前の生出力** — 効果はセルに座った値の観測であり、null 補形は射影層の
   仕事 (DR-130 §4.1) なので effects には届かない。欠落フィールドは operand でも欠落のまま書く。
   DR-130 §8.1 の decoder 要件 (missing key と explicit null の区別保持) が operand の object 内部にも
   そのまま及ぶ、と明文化する (規約新設ではなく §8.1 の適用範囲の確認)

綴り例 (`--tr "5.."` → link で `--until 9` を後置した場合):

```json
"effects": [
  {"entity": "tr", "op": "set", "operand": {"since": 5}, "source": "cli"},
  {"entity": "tr", "path": ["until"], "op": "set", "operand": 9, "source": "cli"}
],
"result":  {"tr": {"since": 5, "until": 9}, "until": null},
"sources": {"tr": {"since": "cli", "until": "link"}, "until": null}
```

(link 入口 `until` 自身の結果キーは値を持たないので null — DR-121 §4 / DR-031 の既存規則。
2 本目の effect の `source` は自入口からの消費なので `cli`、着地座の sources タグが `link` になる)

CONFORMANCE §2 の shadow tree 規則 1 (「kv / scope はタグの kv」) は record 複合値の座も読めるが、
「value_parser 産の複合値も座単位で分解する (DR-127 §6)」の 1 文を追記して誤読を塞ぐ。

## 6. fixture (2)(4)(5)(6) の被覆確認

| fixture | 書けるか | 使う住人 / 期待値の導出元 |
|---|---|---|
| (2) 値残余のフィールド書き | ✓ | timerange。`--until X` 単独 → vivify `{until: X}` → 射影 `{since: null, until: X}` (DR-127 §3 + DR-130 §4)。operand が timestamp のパーサを通る判別込み (§3.1) |
| (4) 値残余 absent → 枝 Reject → 他枝勝ち | ✓ | **json** (record では書けない — vivify するため)。`value` 宣言座のセル未確定 / キー不在 → Reject → or の他枝 (DR-127 §2.2/§3/§4) |
| (5) 時系列上書き (両順) | ✓ | timerange。`--until X --tr Z` → parser 産出が丸ごと置換 / 逆順 → 産出の上に座だけ更新 (DR-127 §4 の表そのまま) |
| (6) sources の座 re-tag | ✓ | timerange。`{"tr": {"since": "cli", "until": "link"}}` (DR-127 §6) |

追加で書けるようになるもの (fixture 起草時の同乗候補): record null 補形 (部分 range → 射影、
kuu.mbt issue の可視化)、空 record `{}` の射影 (`{since: null, until: null}`)、複合セル値への
`value_requires` (operand は wire string なので複合とは常に不一致 — kuu.mbt W2-5 §4 の挙動の pin)、
ns 付き type 直参照 (`type: "fixture/timerange"`) の初 pin。書けないまま残るもの: 乖離 Error (a)(b)
— DR-126 §4 の裁定どおり実装側テストの領分 (不変、設計不足ではない)。

## 7. 波及 (DR 起草時の確認リスト)

- **schema/builtin-descriptors.json または新ファイル**: 3 住人の descriptor 収載 (置き場は RECB-Q5)
- **docs/CONFORMANCE.md**: `fixture/*` ns の宣言 (DR-128 §12 波及と合流)、§2 shadow tree への複合値
  1 文 (§5)、§7 runner 契約に「fixture ns の解決可能性」
- **docs/REFERENCE.md §7.3**: reason 3 綴り (`not_a_timestamp` / `not_a_timerange` / `not_json`) の追補
- **schema/fixture.schema.json**: effects operand / result / sources の値に object が座ること自体は
  既に JSON として表現可能 — schema 変更は不要の見込み (要確認)
- **kuu.mbt**: conformance render の複合対応 (W2-3 A-6 の abort 解除)、3 住人の TypeExt 実装、
  record null 補形 (issue 済み) — lockstep push の対象

## 8. 裁定候補 (RECB-Q1〜Q6)

- **RECB-Q1: ビークルの構成** — (a) 推し: `fixture/*` ns に具象住人 3 つ (timestamp / timerange /
  json、§3)。根拠: DR-128 §12 の役割分担そのまま、splice 非依存、docs 例と同型 / (b) 汎用
  configurable factory 1 つ (§4 案 B) / (c) `builtin/struct` 前倒し (§4 案 C)
- **RECB-Q2: timerange のフィールド型** — (a) 推し: `fixture/timestamp` を立てて参照。根拠: 型依存
  グラフとフィールド型パーサ行使 (DR-127 §3.2) の判別可能な pin (§3.1) / (b) `"number"` 直参照
  (住人 1 つ減るが、フィールド型がどちらでパースされたか fixture から観測不能になる)
- **RECB-Q3: timestamp の受理輪郭** — (a) 推し: canonical 10 進整数のみ (判別可能性が根拠、§3.1) /
  (b) number_parser と同域 (狭める理由の説明が不要になるが Q2(a) の価値が消える)
- **RECB-Q4: timerange の文法** — (a) 推し: `A..B` / `A..` / `..B` / `..`、単独 `A` は
  `not_a_timerange`。根拠: 部分 range が補形 pin の素材、決定的、docs 例の `..` 区切りを踏襲 /
  (b) `..` 単独は reject (空 record の pin 素材を失う) / (c) 単独 `A` を `{since: A}` に読む
  (1 トークン省略形の暗黙化 — DR-128 §2 の「暗黙枝を足さない」姿勢と不整合なので非推奨)
- **RECB-Q5: descriptor の置き場** — (a) 推し: `schema/builtin-descriptors.json` に `fixture ns` の
  区分を追加 (descriptor 集約 1 ファイルの現行運用維持、$comment で conformance 専用と明記) /
  (b) `schema/fixture-descriptors.json` 新設 (builtin との境界が物理で立つが、lint / pin 台帳 /
  参照経路の分岐が増える)
- **RECB-Q6: 提供義務の範囲** — (a) 推し: conformance 実行文脈での解決可能性のみ要求、通常 registry
  への収載は実装裁量かつ安定性保証外 (§3 末尾) / (b) builtin 同様の常設 (fixture 都合の輪郭変更が
  できなくなる)

確認事項 (裁定不要の導出、DR に確認文として書く予定): effects operand は補形前の生出力 (§5-3、
DR-130 §4.1 からの導出) / fixture (4) の担い手が record でなく value 宣言であること (§6、DR-127 §3
からの導出) / 乖離 Error が conformance 対象外のまま不変であること (DR-126 §4)。

## 関連

- DR-128 §12 (conformance ビークル 2 系統の既裁定 — 本設計は fixture/* 側の具体化)
- DR-126 §1/§3/§4 (record 型・型依存・乖離検査 — timerange の out 宣言の正本)
- DR-127 §2.2/§3/§4/§6 (値空間降下・vivify・時系列・観測面 — fixture 期待値の導出元)
- DR-130 §4/§4.1/§5/§8.1 (null 補形・sources の null・decoder 要件)
- docs/CONFORMANCE.md §2/§3/§7 (綴りと比較規約・runner 契約 — §5/§7 の波及先)
- kuu.mbt docs/findings/2026-08-02-w2-5-producer-and-divergence.md §5 (欠落の一次観測)
- kuu.mbt docs/findings/2026-08-02-w2-3-value-composite-inventory.md §9 (綴りと住人の申し送り)
- kuu.mbt docs/issue/2026-08-02-record-null-fill-missing-in-projection.md (補形の実装欠落)
- fixtures/value-typing/int-hex-value-space.json (definitions.types の config 差し替え慣行の実例)
