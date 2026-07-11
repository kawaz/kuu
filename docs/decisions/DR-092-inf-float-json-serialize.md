# DR-092: inf / 非整数 number の JSON serialize 規約 — 文字列 sentinel + protobuf3 canonical 語彙 + shortest round-trip

> 由来: issue `2026-07-08-inf-json-serialize-convention.md` (distill-spec-gaps close 時の切り出し、旧 #3 派生)。JSON に inf リテラルが無いため、float の inf 値を result / effects / config 等の値位置にどう直列化するかが未確定だった。DR-050 §4 の数値 stringification (`1.0` → `"1"`、config→string 要素の文字列化) と同族の serialize 論点を、report に書けるすべての float 値位置へ一般化する。kawaz 裁定 (2026-07-11) で確定する。

## 決定

### 1. inf の wire 表現は文字列 sentinel

JSON に `Infinity` / `NaN` のリテラルは存在しない (ECMA-404 は number を有限小数のみと定義)。kuu は float 値位置の inf を **JSON string で表す** (float 値が本来乗る位置に、number でなく string を置く)。protobuf3 の canonical JSON encoding (`google.protobuf.DoubleValue` / `FloatValue` が inf/nan を文字列で表す) と同型。

タグ付き object (`{"$float": "inf"}`) や JSON5 的な bare literal 拡張 (`Infinity` を構文として許す) は不採用 — 理由は「採用しなかった案」参照。

### 2. canonical 語彙は `"Infinity"` / `"-Infinity"` (protobuf3 準拠スペル)

serialize 側の canonical 文字列は次の 2 語に固定する:

- 正の無限大: `"Infinity"`
- 負の無限大: `"-Infinity"`

先頭に `+` は付けない (`"+Infinity"` は serialize しない、DR-074 §1 の「先頭符号は入力側の受理規則」であって出力側の規範ではない)。

**parse-serialize 非対称の正当化**: serialize 語彙 (`Infinity`/`-Infinity`) と parse 受理語彙 (DR-074 §7: `{inf, infinity}` の 2 語、case-insensitive、先頭符号 `[+-]` 合成可) は綴りが異なるが、対称性は破れない。`Infinity` は `infinity` の case variant として parse 側に既に含まれる (DR-074 §7 で「別語として列挙しない」と明記済みの受理集合の要素)。**「パース側の寛容さが対称性の責務を負う」** — serialize は生態系慣例 (protobuf3) に従い、parse はその出力を含む widerな語彙を受理することで round-trip を保証する。serialize 側だけを狭い語彙に固定しても、parse 側の受理域がそれを包含していれば非対称にならない。

小文字 `"inf"` を canonical serialize に採る案 (parse 語彙の代表選抜) は不採用 — protobuf3 / 主要言語生態系との整合を優先する (詳細は「採用しなかった案」)。

### 3. 適用範囲は一律

本規約は **report に書けるすべての float 値位置**に一律適用する — result オブジェクトの値、effects (効果列の value)、config 起因で float 要素に流れた値、いずれも同じ表現 (`"Infinity"` / `"-Infinity"`) で serialize する。値位置ごとに表現を変える特殊規則は置かない。

### 4. 非整数 float の canonical serialize = shortest round-trip

inf でない非整数 float 値の JSON serialize は **shortest round-trip 表現** (Ryu / Grisu 系アルゴリズムが生成する最短の10進表現、parse して同じ binary64 値に戻る最短文字列) を canonical とする。Rust `f64::to_string()` / Go `strconv.FormatFloat(-1)` / Python `repr(float)` / JS `Number.prototype.toString()` の出力スタイルと整合する。

- 整数値の float (`3.0`) は DR-050 §4 の最短表現規則 (`1.0` → `"1"`) と同じ扱い — 小数点なしの整数表記になる
- **境界値 (subnormal・非常に大きい/小さい指数域等) の実装間の微差は許容する**。shortest round-trip アルゴリズムは仕様として決定的だが、実装 (言語標準ライブラリ) によって出力形式の細部 (指数表記の閾値、`1e+21` vs `1e21` 等) が割れうる。これを spec レベルで一意化しない
- **precision-critical な値は fixture で直接 pin しない**運用で境界値の実装間差を回避する。値の厳密な一致検証が必要な場面向けに、将来 opt-in で曖昧さを回避できる仕組み (例: 許容 ULP 差での比較、または byte 厳密比較を要求する明示モード) を用意する余地を残すが、その **具体形は本 DR では確定しない** (方向付けに留める — 発明しすぎない)。fixture 運用は既存の「構造等価・byte 一致不要」原則 (DR-063 §4) と整合する

### 5. config JSON 値位置の `"Infinity"` 供給は既存経路で自動成立 (確認的明記)

config ファイルの JSON 値位置に `"Infinity"` / `"-Infinity"` (または DR-074 §7 の受理語彙に含まれる他の case variant) を文字列として書いた場合、float 要素への供給は **DR-050 §4 の既存経路** (config 値が string なら CLI/env と同一の全段 pipeline を通り、parse で inf を受理) で**自動的に成立**する。本 DR はこの経路に新規の規約を追加しない — 確認のためここに明記するのみ。

## 採用しなかった案

### タグ付き object (`{"$float": "inf"}`)

値位置の型が `{"$float": string} | number` の union になり、消費側の分岐が増える。protobuf3 の実績ある単純な「文字列 sentinel」で十分に表現でき、余分な構造を持ち込む理由がない。

### JSON5 的な bare literal `Infinity` (構文拡張)

JSON5 は `Infinity` / `NaN` / `+5` / `.5` 等を JSON の構文レベルで拡張するが、kuu の wire form は標準 JSON (RFC 8259) パーサで読める必要がある (DR-063 の wire 形が実装間交換を前提とする以上、JSON5 専用パーサへの依存は持ち込めない)。文字列 sentinel なら標準 JSON の範囲で表現できる。

### 小文字 `"inf"` を canonical serialize 語彙に採る (parse 側代表選抜案)

parse 受理語彙 `{inf, infinity}` (DR-074 §7) の一方 (`inf`) を serialize 語彙として選ぶ案。対称性は既に parse 側の寛容 (case-insensitive + `Infinity` を variant として受理) で成立しているため、serialize 側をあえて `inf` に倒す理由がない。むしろ protobuf3 / 主要言語生態系で既に確立している `Infinity` / `-Infinity` の綴りに合わせる方が、外部ツールとの相互運用 (JSON を他エコシステムのツールが消費する場面) で驚きが少ない。「類似慣例ですでにあるならあえて外す必要もない。変な略語とか独自用語というわけでもない」(kawaz 裁定理由)。

### 入力 case の保存 (parse された綴りをそのまま serialize)

CLI から `-INF` と入力されたら結果 JSON も `"-INF"` として出す案。DR-063 §4 の「構造等価、byte 一致不要」原則とは相性が悪く、同じ論理値でも入力経路によって serialize 結果が変わり byte 厳密比較に耐えない (DR-063 の緩比較方針とも矛盾はしないが、conformance fixture の期待値が「入力そのまま」では正本になりにくい)。canonical な固定語彙に正規化する方が結果の再現性が高い。

## 射程外

- 非整数 float の shortest round-trip 表現における precision-critical 値の opt-in 曖昧さ回避の具体形 (§4) — 別途 issue で追跡可能
- nan の serialize 表現 — DR-074 で nan は両型 Error (opt-in も置かない) と確定済みのため、nan 値が result / effects に現れることはなく、本 DR の射程に入らない

## 関連

- DR-074 (canonical number/bool 字句 — §1/§7 inf の受理語彙 `{inf, infinity}` と符号合成、本 DR の parse-serialize 対称性の根拠)
- DR-050 (config 値源 — §4 string 経路の全段 pipeline、数値の最短表現 `1.0`→`"1"` の先例、本 DR §5 は同経路の確認的明記)
- DR-063 (AtomicAST 直列形 — §4 構造等価・byte 一致不要の比較方針、本 DR §4 の precision-critical fixture 運用と整合)
- DR-075 (int の値域は実装定義・binary64 非経由の厳密判定 — int は本 DR の射程外、float の非整数値のみが対象)
- issue `2026-07-08-inf-json-serialize-convention.md` (本 DR で決着)
