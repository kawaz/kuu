# DR-075: int の値空間判定と int_round (小数入力の丸めモード)

> 由来: DR-074 §2 の暫定注記 (「10 進 int を値空間で判定する読みは kawaz 裁定待ち」= M2) と、issue `2026-07-05-distill-spec-gaps` 論点 #5 派生の「int の String parse が構文判定か値空間判定か」。3 本の言語横断調査を突き合わせた統合 (scratchpad `int-round-synth.md`) を踏まえた kawaz 裁定 (2026-07-06) で、int の受理判定を値空間判定に確定し、小数入力の丸めモード `int_round` を新設する。

## 決定

### 1. int は値空間判定 — 整数「値」を受理する (M2 の確定)

`int` 要素の String トークン受理は **構文判定でなく値空間判定**とする。トークンを number として parse し、その **値**が整数なら受理する:

- `"3.0"` → 3 / `"1e3"` → 1000 / `"1_000"` → 1000 / (opt-in `number_allow_base_prefix` 時) `"0x1.8p3"` → 12 は、いずれも **整数値**なので全モードで丸めなしに受理する。
- 真に fractional な値 (`"2.5"` 等) のみが「非整数値」であり、その帰結は §2 の `int_round` が決める。

これは DR-074 §2 の「10 進 int も値空間で判定する読み」を採用し、DR-050 §4 の「JSON string は整数構文のみ parse 受理」(構文判定寄りの読み) を **supersede** する。int の受理域は number の受理字句 (DR-074 §1) を基盤に、値が整数であることを制約として重ねたものになる。

### 2. int_round — 非整数値の帰結を決める config キー

非整数値 (`"2.5"` 等) を int 要素がどう扱うかを、`kuu_int_parser` factory (DR-061 configurable factory) の config キー `int_round` で選ぶ。**canonical default = `error`**。

語彙は **10 種で体系完備**。方向丸め 4 × {非 half, half} + `half_even` + `error`:

| 種別 | モード | 意味論 |
|---|---|---|
| 方向 (tie 概念なし・全 fractional に一律) | `floor` | →−∞ |
| | `ceil` | →+∞ |
| | `trunc` | →0 方向 (小数部を捨てる) |
| | `away` | →0 の反対方向 (絶対値を切り上げ) |
| tie 解決 (round-to-nearest、`.5` ちょうどの向き) | `half_floor` | tie→−∞ |
| | `half_ceil` | tie→+∞ |
| | `half_trunc` | tie→0 方向 |
| | `half_away` | tie→0 の反対方向 (学校四捨五入) |
| tie→偶数 | `half_even` | banker's rounding |
| 拒否 | `error` | 非整数値は Error (reason `not_an_integer`) |

- `floor`/`ceil`/`trunc`/`away` は tie でない入力も含め全 fractional 値に一律方向を適用する。`half_*` は最近接整数へ丸め、`.5` ちょうどの tie のみを各方向で解決する。
- **canonical default = `error`** の根拠は §4。丸めは明示 opt-in。

### 3. 命名は kuu 独自の一貫系 (HALF_UP/HALF_DOWN 罠の回避)

方向語 4 語 (`floor`/`ceil`/`trunc`/`away`) を軸に、tie 解決は `half_<方向>` で機械的に導く一貫系を採る。`away` は IEEE 754 roundTiesToAway / Intl `expand`・`halfExpand` 由来 (0 から遠ざかる) で、`half_away` = 学校四捨五入。

Java `RoundingMode` / Python `decimal` の **`HALF_UP` / `HALF_DOWN` は採らない**。これらの "UP"/"DOWN" は「0 から away」/「0 へ toward」の意味で、「+∞ 方向」/「−∞ 方向」ではない (`-2.5` に `HALF_UP` は -3 = away、+∞ 方向の -2 ではない)。この分野で最も誤解を生む語を kuu の語彙から排除する。kuu では 0 起点の向きを `away`/`trunc` で、無限起点の向きを `ceil`/`floor` で表し、"up"/"down" の多義を持ち込まない。

### 4. canonical default = error — 外部慣習との整合

int に fractional を silent 変換しない (= `error` を既定にする) 根拠:

- **スキーマ/交換層**: JSON Schema (zero fractional part のみ integer) / GraphQL (`1.2` は execution error) / protobuf / OpenAPI はいずれも「int に fractional は error」。
- **文字列→int parse 層 (CLI パーサ)**: argparse / clap / click / yargs / oclif / picocli の 6 パーサ全てが int への小数入力を **error のみ**にする。丸めモードを config 選択できるパーサは観測されず。
- silent trunc/round を既定にすると両層の全慣習に反し「精度を黙って落とす驚き」を生む。丸めは明示 opt-in が最も整合。

**CLI パーサ界に int 丸めモードの前例は無い** (調べた 6 パーサはいずれも error のみ)。kuu の `int_round` はこの分野で前例のない機能であり、語彙は丸めライブラリ (IEEE 754 / Python decimal / Java RoundingMode) から借りる。

### 5. binary64 非経由の厳密判定を spec 必須要件とする

String トークンに対する int_round 判定 (整数性判定・tie 判定を含む) は **binary64 を経由せず、字句スキャン or host の decimal / 有理数で厳密に行う**ことを spec 必須要件とする。`parseFloat` → `round` 系の実装は **不適合**。

根拠 (実測、findings `2026-07-06-number-parsing-cross-language.md`):

- `float("0.4999999999999999999") == 0.5` が真になり、10 進では < 0.5 の値を half 系が誤側に倒す (偽 tie 化、Python/Node/C の 3 処理系一致)。
- 2^53 超の大整数で `n.5` の `.5` が binary64 で表現不能 (`"9007199254740992.5"`)。
- 破綻は half 系に限らず floor/ceil も整数境界で起きる (`float("1.9999999999999999") == 2.0`) — 本質は「文字列→binary64 で値が変わる」こと。
- 整数丸めの tie 判定に必要なのは小数部の `<0.5` / `=0.5` / `>0.5` の 3 分類のみで、これは文字列の字句スキャンで厳密に決まる (先頭桁 <5 / >5 / =5 かつ以降非ゼロ / =5 かつ以降全 0)。字句スキャン参照実装は decimal 正解と 20 万件ファズで mismatch 0、負数含む全語彙で一致を実証済み。全 host 言語で実装可能 (Python `decimal` / Java `BigDecimal` / C# `decimal` / Rust `rust_decimal` / Go `math/big.Rat` or 字句スキャン自作)。IEEE 754 decimal64/128 型に依存する設計は移植性が悪く採らない。

**source 別の非対称を明記**: String 源 (CLI / env / config string) は本要件で **binary64 非経由の厳密判定**。一方 config native JSON number → int (DR-050 §4) は JSON が既に binary64 化した値が来る (ECMA-404 は整数/小数を区別せず元の 10 進は復元不能) ため、この経路の整数判定は **原理的に binary64 ベース**であり本要件の保証対象外。ただし fractional native number は int_round に従う (canonical default `error` では非整数 native を拒否するため、fractional の binary64 露出は default 構成で最小)。「string 源は厳密 / native-number 源は JSON 由来 binary64」の非対称を採る。

### 6. 配置と reason — 新機構ゼロ

- `int_round` は `kuu_int_parser` factory の config キー (平坦キー、DR-061 §4)。int が fractional 入力をどう扱うかは **parse 相 (String → int) の内部調整**であり、相間変換 (filter) でも float→int cast でもない (kuu の型モデルに暗黙 cast は無く、int 要素はトークンを直接 int に parse する)。number の `number_thousand_sep` と同型。
- **新規 reason は不要** (DR-066 §3 不変)。`int_round:error` のときのみ `not_an_integer` を emit する。丸めモード (`floor` 等) では非整数値も丸めて **成功**するので `not_an_integer` を emit しない。number として全く読めない入力 (`"abc"`) は従来どおり `not_a_number`。
- `kuu_int_parser` descriptor の `reasons` 宣言 (DR-066 §2) は `not_an_integer` / `not_a_number` を列挙。

## 他標準との対応表

kuu モードと各標準の対応。`away`/`half_away` は 0 起点の向き、`floor`/`ceil` は無限起点の向きで、標準の "UP"/"DOWN" 多義を kuu では持ち込まない。

| kuu | Java RoundingMode | Python decimal | C# MidpointRounding | Intl (roundingMode) | IEEE 754 |
|---|---|---|---|---|---|
| `floor` | FLOOR | ROUND_FLOOR | ToNegativeInfinity | floor | roundTowardNegative |
| `ceil` | CEILING | ROUND_CEILING | ToPositiveInfinity | ceil | roundTowardPositive |
| `trunc` | DOWN | ROUND_DOWN | ToZero | trunc | roundTowardZero |
| `away` | UP | ROUND_UP | (directed away は無) | expand | (無) |
| `half_floor` | (無) | (無) | (無) | halfFloor | (無) |
| `half_ceil` | (無) | (無) | (無) | halfCeil | (無)★JS `Math.round` |
| `half_trunc` | **HALF_DOWN** | ROUND_HALF_DOWN | (無) | halfTrunc | (無) |
| `half_away` | **HALF_UP** | ROUND_HALF_UP | AwayFromZero | halfExpand (既定) | roundTiesToAway |
| `half_even` | HALF_EVEN | ROUND_HALF_EVEN | ToEven (既定) | halfEven | roundTiesToEven (既定) |
| `error` | UNNECESSARY | (無、明示例外) | (無) | (無) | (無) |

**命名罠の警告**: Java/Python の `HALF_UP` は kuu `half_away` (0 から away)、`HALF_DOWN` は kuu `half_trunc` (0 へ toward) に対応する。"UP"="away"・"DOWN"="toward 0" であって "+∞"/"−∞" 方向ではない。kuu が `half_up`/`half_down` を採らず `half_away`/`half_trunc`/`half_ceil`/`half_floor` に分解したのはこの多義の排除が目的。

## 期待値表 (負数判別ベクタ)

判別ベクタ `-3.7 / -2.5 / 2.5 / 3.5` に対する全 10 モードの期待値 (本表が fixture の正本):

| モード | `-3.7` | `-2.5` (tie) | `2.5` (tie) | `3.5` (tie) |
|---|---|---|---|---|
| `floor` | -4 | -3 | 2 | 3 |
| `ceil` | -3 | -2 | 3 | 4 |
| `trunc` | -3 | -2 | 2 | 3 |
| `away` | -4 | -3 | 3 | 4 |
| `half_floor` | -4 | -3 | 2 | 3 |
| `half_ceil` | -4 | -2 | 3 | 4 |
| `half_trunc` | -4 | -2 | 2 | 3 |
| `half_away` | -4 | -3 | 3 | 4 |
| `half_even` | -4 | -2 | 2 | 4 |
| `error` | Error | Error | Error | Error |

読み方の要点:

- `-3.7` は tie でない (最近接は -4)。方向モードのみ分岐し (`floor`/`away`→-4、`ceil`/`trunc`→-3)、全 half モードは最近接 -4 に一致。`error` は非整数値なので拒否。
- tie 3 点 (`-2.5`/`2.5`/`3.5`) が half モードの判別力の核。`half_even` は偶数側 (`-2.5`→-2 / `2.5`→2 / `3.5`→4)、`half_away` は 0 から遠い側 (`-2.5`→-3 / `2.5`→3 / `3.5`→4)。
- `half_ceil` と `half_floor` は正負で非対称 (`half_ceil`: `-2.5`→-2 / `2.5`→3、`half_floor`: `-2.5`→-3 / `2.5`→2)。負数を含めないと `half_ceil`/`half_away` や `half_floor`/`half_trunc` が区別できない — 判別に負数 tie が必須。

## M2 との表裏関係 (丸めモードが値空間判定を強制する)

M2 (int の String parse が構文判定か値空間判定か) と int_round は一見直交だが **非独立**。丸めモード (非 error) は値空間判定を **論理的に強制する**:

> 構文判定では `"2.5"` は整数構文でないので **構文層で弾かれ**、int_round が見る前に消える。`"2.5"`→2 に丸めるには、まず `"2.5"` を number として parse (値空間) してから丸める必要がある。→ int_round に `floor`/`ceil`/`half_*` を持たせるなら M2 は値空間判定でなければならない。

帰結として `int_round:error` は「構文判定」と等価でなく **「値空間判定・整数値のみ受理」**と等価になる (= DR-074 §2 の読み)。`"3.0"`→3 / `"1e3"`→1000 を受理し、非整数値のみ Error。これは DR-050 §4 の「string は整数構文のみ」からの挙動変更 (`"3.0"` string が従来 Error → 3 に) であり、§1 で DR-050 §4 を supersede する所以。`"3.0"`/`"1e3"`/`"1_000"` は整数値なので int_round のどのモードでも丸めは発生せず素通りする — int_round が実際に働くのは真に fractional な `"2.5"` 系のみ。

## int の値域は実装定義 (kawaz 裁定 2026-07-08)

int が表現できる**値域** (magnitude の上限) は kuu では固定せず**実装定義** (参照実装なら Int64、host 言語の整数幅に従う) とする。言語移植間で値域に差異が出ることは許容する。ここで「値域」は **その実装の整数表現が正確に表せる範囲** を指す — 例えば JS の素の number を使う実装なら 2^53 (safe integer 境界) が値域であり、それを超えて精度が劣化した値を返すのは silent wrap と同罪で不可 (Error にする)。

- 値域を超えた入力 (整数「値」としては読めるが host 幅に収まらない、例 `"1e300"`・Int64 実装での `"9223372036854775808"`) は **silent wrap ではなく Error** — reason は `int_out_of_range` (DR-066 §3 に追加)
- 厳密な値域が要件のユーザの逃げ道は 2 つ: (1) registry に自作 type を登録する、(2) `^[0-9]+$` のような regex 系の雑マッチで **string として受け**、アプリケーション側で処理する。kuu が bigint 等を canonical に抱え込むことはしない (DR-074 §1 の型 suffix 不採用と同じスタンス)
- int_round (本 DR) は「整数でない値の丸め」の関心であり値域とは直交 — 丸め後の値が値域を超える場合も `int_out_of_range`

## 採用しなかった案

### 構文判定を維持 (M2 = 構文判定、int_round を導入しない — 選択肢 Q)

int を整数構文のみ受理に保ち (`"3.0"` も `"2.5"` も string では Error)、丸めが要るアプリは pre_filter で String を前段整形する (DR-074 §5 の既定経路)。int の canonical 意味論を「fractional→Error」で純粋に保ち factory config を増やさない案。**不採用理由**: int の丸めを型の一級概念にする方が、通貨・カウント等の実務で頻出する「小数入力を整数に寄せる」需要に config 1 つで応えられ、方言構成が wire にシリアライズされて再現可能になる (pre_filter クロージャは wire に残しにくい)。P と Q はハイブリッド不能 (`"2.5"` string を「受理して丸める」か「構文で弾く」かの排他的制約から両者の長所が出ている) ため、M2 と int_round 採否を 1 決定として P に倒した。

### `half_05up` を語彙に含める

Python `decimal` 専用の特異仕様 (`ROUND_05UP`)。他標準に対応が無く CLI 文脈で実需ゼロ。10 種の体系完備 (方向 4 × {非 half, half} + half_even + error) から外れる異物なので採らない。

### 丸めを pre_filter への退避のみで表現する

DR-074 §5 の pre_filter 経路は「アプリ都合の狭め・広げ」の受け皿として併存するが、int_round を **型の一級概念**にする本 DR では丸めを factory config に置く。pre_filter だけに委ねると (1) 丸めモードが wire に構造化されず再現性が落ちる (2) 各アプリが tie 解決を自前実装し binary64 経由の誤実装 (§5) を招く。canonical に厳密な丸め語彙を持たせる方が安全。pre_filter は丸め以外の前段整形 (suffix 除去等) に限る。

### `HALF_UP` / `HALF_DOWN` 系命名

§3 の通り "UP"/"DOWN" が「away/toward 0」の意味で「+∞/−∞ 方向」と誤読される。この分野で最も事故を生む語なので `half_away`/`half_trunc` に分解して排除した。

## 関連

- DR-074 (canonical number/bool 字句 — §2 暫定注記 (M2) を本 DR が値空間判定で解消、§4 config 表に `kuu_int_parser` / `int_round` 追加) / DESIGN §3.3-3.4 (int の値空間判定 + int_round + default error を反映、§3.4 factory config 例に kuu_int_parser)
- DR-050 (config 値源 — §4 「JSON string は整数構文のみ parse 受理」を値空間判定へ改訂、native-number→int の binary64 由来を明記) / DR-061 (configurable factory — `kuu_int_parser` + `int_round` config キー、parse 相内部調整) / DR-066 (reason — `not_an_integer` は int_round=error のときのみ emit、新 reason 不要)
- DR-040 (type 方言 3 層 — int_round は canonical default config の 1 キー、3 層構造は不変) / DR-028 (type は definitions/registry 参照糖衣 — 方言 int type の名前付き shadow が流用)
- findings `2026-07-06-number-parsing-cross-language.md` (binary64 破綻域・字句スキャン厳密性の実測根拠)
- issue `2026-07-05-distill-spec-gaps` 論点 #5 派生 (M2 決着) / `2026-07-06-value-typing-s7-fixtures` (残モードの fixture 化追跡)
