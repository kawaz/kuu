# DR-046: name の軸分解 — 目的別名前と、デフォルト供給源としての name

> 由来: 本セッションの議論 (`--kv <KEY> <VALUE>` の表示、nameless 要素への ref/link 不能、name の多義性の整理)。DR-024 の 3 層分離の一般化であり、DR-003 の「3 軸兼任」を再解釈する。

## 決定

### 1. 名前は目的別の軸の集合、name はデフォルト供給源

ノードの「名前」は単一概念ではなく**目的別の軸**に分解される。`name` は各軸が未指定のときの**デフォルト供給源**であり、それ以上の特別な地位を持たない:

| 軸 | フィールド | 役割 | 結果露出 | デフォルト |
|---|---|---|---|---|
| 参照識別子 | `id` | ref / link の解決対象 | しない | name |
| 結果キー | export 系 (issue `2026-07-03-export-result-semantics` で一本化検討) | 結果オブジェクトのキー、スコープ生成 | する | name |
| 値プレースホルダ | `value_name` (既存、DR-024) | help / usage の `<PLACEHOLDER>` | しない | upper(name) |
| 説明ラベル | `display_name` | help でその引数を指す人間可読名 (例: ポート番号) | しない | name |

export_key と value_name は既にこのパターンの実例であり、本 DR は新設 2 軸 (id / display_name) を加えて全体を一般化する。

### 2. id はスコープを生成せず、結果にも出ない

スコープ生成 (DR-025) と結果露出は**結果キー軸の責務のまま**。id は参照解決のためだけに存在し、解決は lexical スコープ連鎖 (DR-032 / DR-033) で name と同じ空間を使う。id 未指定なら name が id を兼ねる (後方互換)。

これにより **name の無い要素にも ref / link できる**:

```json
[{"type": "string", "id": "width"}, {"type": "string"}]
```

結果は配列のまま (name が無いので object 化しない)、`link: "width"` で第 1 要素の値セルを参照できる。

### 3. 表示系の軸は UsefulAST 専用

display_name / value_name は help 層の表示メタであり、AtomicAST には搬送しない (findings F-012 の方針)。パース挙動に影響しない。

### 4. 匿名要素の内部 id

明示 id の無いノードにも、実装は内部識別子を振ってよい (診断、alias のどの入口が発火したかの特定 — issue `2026-07-03-alias-normalization-help-completion-installer` 参照 — 、conformance の構造比較)。内部 id の形式・安定性は仕様の関心外 (直列形は DR-039 の垂直スライスで確定)。

## 採用しなかった案

### name の全軸兼任を固定 (DR-003 原型)

nameless 要素への参照が不可能になり、目的間の namespace 被りに逃げ場がない。

### 軸ごとの完全独立 (デフォルト供給なし)

日常ケース (name 1 個で 4 軸を賄う) の書き味を壊す。デフォルト供給源としての name は維持する。

## 射程外

結果キー軸の表現の一本化 (`export: <名前> | false` 案) は issue `2026-07-03-export-result-semantics` で別途確定する。本 DR は軸の分解と id / display_name の新設まで。

## 関連

- DR-003 (name 3 軸兼任の原型 — 本 DR で「デフォルト供給源」に再解釈、Superseded 注記)
- DR-024 (key name / def name / value_name の 3 層分離 — 一般化元)
- DR-025 / DR-033 (スコープ生成は結果キー軸の責務)
- DR-029 / DR-032 (ref / link の解決 — 対象は id 軸、解決順は不変)
- issue `2026-07-03-export-result-semantics` (結果キー軸)
- issue `2026-07-03-alias-normalization-help-completion-installer` (内部 id の利用先)
- findings F-012 (help メタは AtomicAST 非搬送)
