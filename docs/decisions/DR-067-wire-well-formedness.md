# DR-067: wire form の well-formedness — 合法性の 3 層と構文 invariant

> 由来: findings F-042 (AtomicAST の合法構造 invariant が未定義 — property-based test の合法性判定根拠が不在)。DR-063 で wire form が宣言層に確定したため、invariant は「宣言層 wire の well-formedness」として定義できるようになった。

## 決定

### 1. wire 合法性は 3 層で判定する

| 層 | 判定内容 | 違反の扱い |
|---|---|---|
| **構文層** | 本 DR §2 の構造 invariant (葉/枝の排他、children の形 等) | definition Error (DR-054) |
| **語彙層** | 全フィールド語彙が登録済み descriptor の所有集合の和に含まれる (DR-061/063) | unknown-vocab Error (DR-054) |
| **参照層** | ref / link / type / alias の解決可能性、循環・ゼロ進捗の不在 (DR-054 §1) | absent-ref / circular-ref / zero-progress Error |

JSON Schema (機械可読ファイル) が写像するのは主に構文層。語彙層は descriptor 集合に対して相対的 (登録 installer で変わる)、参照層はグラフ検査であり、いずれも Schema の表現力の外 — parse_definition の検査として実装する。

### 2. 構文層の invariant (F-042 の 4 項目への回答を含む)

- **葉と枝の排他**: 葉は `children` (or / seq) を持たず値プリミティブとして振る舞い、枝は or / seq を持つ (DESIGN §1.1)。**`exact` は葉であり、同一ノードでの or / seq との同居は非合法** (or / seq の「子」に exact ノードが入るのは正常 — values → or 展開の枝等。非合法なのは 1 ノードが exact と children を兼ねる形で、A 群正規化はこの形を生成しない)。or と seq の同居も非合法 (choice か sequence のどちらか)。`type` (参照糖衣) は葉・枝どちらとも同居できる (§3.5 の合成順で解決 — type テンプレの構造を直書きが上書き)
- **or / seq の children 数**: **0 個・1 個とも合法** (Error にしない)。意味論は定義済み — `or: []` は恒不成立 (選べる枝ゼロ)、`seq: []` は 0 消費の成功 (unit — repeat lowering の `Opt(X) = Or([X, Seq([])])` が内部利用する正規の形)、1 個は単体と等価 (退化、正規化はしない)。ユーザが直接書いた空 or / 空 seq は書き損じの公算が高いため**静的 warn** (lint、DR-021 の「warn はする、reject はしない」)
- **multiple / repeat の配置制約**: **持たない** (or / seq の children 内の要素が multiple / repeat を持つのは合法)。multiple は値セルの畳み設定であり構造位置と直交する (DR-034/043)
- **name / id の値**: **非空 string**。文字種・長さの制限は課さない (非 ASCII name は正規のユースケース、DESIGN §2.2)。唯一の予約は **`#` を含む id はユーザ定義で禁止** (unfold 内部 id の予約名前空間、DR-063 §3 / DR-046 §4)。`export_key: ""` は null と同義 (DR-052) であり name の非空制約とは別物
- **同一スコープ内のトリガ重複**: **合法** (Error にしない)。静的 warn + 実行時 ambiguous が既定の扱い (DR-041 / DESIGN §15.5-15.6 の再確認)
- **フィールドの型**: 各フィールドの JSON 型は DESIGN / 各 DR の定義に従う (二形フィールド (filters = 配列 | object、multiple = 文字列 | object 等) は両形が合法)

### 3. property-based test の生成器契約

合法 wire の生成器は §2 の構文層を満たす値を生成すればよい (語彙層は生成器が使う installer セットを固定して充足、参照層は生成時に構成的に保証する — 存在する name への ref、head 位置に消費ノード)。空 or / 空 seq / 1 児 / トリガ重複は**合法入力として生成対象に含める** (warn 対象と Error 対象の区別自体が検証対象)。

## 採用しなかった案

### 空 or / 空 seq を definition Error にする

`seq: []` は lowering 産物として正規に登場する (unit)。宣言層で禁止して lowered 断面で許すのは層間の非対称を生む。「全入力で壊れる」(DR-054 の Error 基準) にも該当しない — 空 or は局所不成立なだけで、optional 文脈では定義全体は生きる。

### name の snake_case 強制・ASCII 制限

DR-022 の snake_case は**仕様のフィールド名** (long / short / export_key 等) の話であり、ユーザの name 値は自由。制限は i18n CLI (非 ASCII サブコマンド名等) を殺す。

### 長さ制限

実装・環境の関心 (シェルや OS の制限が実効上限)。仕様が数値を持つと根拠のない magic number になる。

## 射程外

- JSON Schema ファイル (schema/*.json) の実体書き出し — 本 DR の構文層を写像する機械的作業。発行条件は DR-068
- lint (warn 層) の検査項目全列挙 — 開発時ツールの関心 (DESIGN §15.6)

## 関連

- findings 2026-06-29-ast-missing-pieces.md F-042 (解消)
- DR-063 (wire form — invariant の対象定義)
- DR-054 (definition Error / warn の境界 — 3 層の違反の扱い)
- DR-061 (descriptor — 語彙層の判定基盤)
- DR-046 / DR-063 (`#` 予約名前空間)
- DR-021 / DR-041 (トリガ重複の warn + 実行時 ambiguous)
