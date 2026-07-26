# DR-121: sources の結果アドレス — structured path と席の単位

Status: Accepted (SRCADDR-Q1=d / Q2-α=a / Q2-β=c、kawaz 2026-07-26)

## 1. sources は structured path の配列で表す (Q1=d)

`sources` は「キー → 値源タグ」の flat map をやめ、**結果アドレスを構造として持つ entry の配列**にする:

```json
"sources": [
  {"path": [], "key": "ttl", "source": "cli"},
  {"path": ["sub"], "key": "ttl", "source": "inherit"}
]
```

- `path` は root から cell の所有スコープまでの **露出キー segment の列**。root 直下の cell は `[]`
- `key` は cell 自身の露出キー
- `source` は値源タグ (`cli` / `link` / `env` / `config` / `inherit` / `tty` / `default`、DR-098 §6)

### 1.1 付随規範

- **entry 配列の順序は非規範**。比較は `(path, key, source)` の集合として行う
- **`(path, key)` は一意**。重複 entry は不適合 (DR-120 の結果アドレス一意性の射影)
- `path` は scope の露出キーのみを含む。`export_key: null` の scope segment は現れない (子が親へ昇格、DR-052 §2)
- **`path` と `key` を結合した文字列を規範面で作らない**。比較・照合・fixture の canonical form の
  いずれでも連結形を経由してはならない

### 1.2 なぜ flat map をやめたか

`.` 連結が非単射だった。`export_key` は任意 string で `.` の禁止も escaping も無いため、
区別すべき 2 つの結果アドレスが同じキーに潰れる:

```json
定義: dotted(export_key:"a.b") + command a 配下の b
result:  {"a.b": true, "a": {"b": true}}   ← 2 セルを区別している
sources: {"a.b": "cli"}                     ← 1 エントリしか持てない
```

この定義は DR-120 上**合法** (別 result scope なので露出キー衝突ではない) なので
definition-error でも弾けず、`result` が表現できる状態を `sources` が表現できない。
DR-109 §3 の「消費者が値の出所を機械判別できる」が破れる。

区切り文字の禁止 (名前空間を狭める)、escaping、JSON Pointer 等の既知 encoding も検討したが、
**符号化を決めるのでなく符号化を不要にする**方を採った。escaping / encoding は消費者に復号を要求し、
復号を忘れた実装が静かに壊れる (テストは通る)。structured path は曖昧性が構造的に発生しない。

## 2. 席を持つのは値源ラダーで確定した値セルに限る

`sources` の entry が対応するのは、**結果アドレスを持ち値源ラダー (DR-031) が最終値を確定させた
cell** である。構文上の node 種別では判定しない。

### 2.1 席を持たないもの

- **スコープの presence marker** — 選ばれた command / name を持つ `or` / `seq` が子を持たず
  空 kv `{}` を作る場合。スコープ生成要素は結果キーを占有する 1 セルとして数えるが (DR-120 §4)、
  その占有はスコープの存在自体であってラダーが確定する値ではない
- **透過セル** (`export_key: null` の値セル) — 結果キー軸を持たないので `result` の kv にも現れない
- **内部セル** — `type: "none"` (DR-089) / `config_file` (DR-050) / dd trigger (DR-064) は
  `effects` / `result` / `sources` のいずれにも現れない

### 2.2 席を持つもの

- 通常の値セル (leaf)
- **accumulator セル** — 0 回発火でも `result` に `[]` を持つ (DR-044 uniform array) ので、
  結果アドレスに `source: "default"` の entry を 1 件持つ (DR-031 の default 席 × DR-044 の合成)

## 3. structural aggregate の席 (Q2-α / Q2-β)

`name` を持つ `seq` / `or` の子が nameless のとき、値は wrapper の結果アドレスに畳まれるが、
その結果アドレスに対応する**値セルは存在しない** (child に entity が無く `effects` も空)。
この structural aggregate をどう扱うかは、**畳まれる値が 1 つか複数か**で分かれる。

### 3.1 単一値 = union 席 (Q2-α=a)

`or` の nameless 枝が選ばれた場合、席は **1 つ**で値の型が枝ごとに変わる (union type)。
消費者から見れば `mode: number | string` であり、union を扱えない言語では
`getInt()` / `getString()` の形で取り出す。

**席が 1 つなので entry も 1 件**。潰れる情報が無く、cell provenance の自然な拡張として閉じる。

```json
定義: {"name":"mode","or":[{"type":"int"},{"type":"string"}]}
--mode warm → result={"mode":"warm"}
              sources=[{"path":[],"key":"mode","source":"cli"}]
```

### 3.2 複数値 = tuple の席 (Q2-β=c)

`seq` の nameless 子が並ぶ場合、結果は **tuple** (積型) であり、**席は N 個**ある。
1 つの entry に畳むと N 個の由来を 1 つに潰すことになる。

**要素ごとに entry を持つ。** 要素の addressing 形式は配列要素 provenance の設計に従う
(`docs/issue/2026-07-26-array-element-provenance-sources-addressing.md`)。

`or` の枝が `seq` を持つ場合 (枝が tuple) も本項の扱いになる。

#### 異なる値源の共存は到達可能

nameless `seq` の子に「CLI 消費 leaf」と「消費 0 の literal」を並べると、
要素ごとの provenance が `[cli, default]` になる:

```json
{"name":"pair","seq":[{"type":"string"},{"type":"string","value":"fallback"}]}
--pair x → pair=["x","fallback"]、provenance は [cli, default]
```

DESIGN §5.1 (seq は子の値の配列) / §5.2 (`value:` は消費しない literal) /
`schema/wire.schema.json` の node 同型規定 / DR-031 の席分離から導出される。
したがって「常に全 child が同じ席」を前提にした 1 タグ化は誤報になる。

## 4. effects との軸の違い

`effects[].entity` は**射影前の canonical entity name / id** であり `export_key` を適用しない
(DR-045: 効果は cell 単位で記録する。entity は値セルであって露出パスではない)。

したがって `effects` は宣言名軸、`result` / `sources` は結果アドレス軸であり、
同じ cell でも綴りが異なる:

```json
定義: {"name":"verbose","export_key":"v"} に --verbose

effects: [{"entity":"verbose", ...}]                       ← 宣言名
result:  {"v":true}                                         ← 露出キー
sources: [{"path":[],"key":"v","source":"cli"}]            ← 露出キー
```

## 5. 波及

- `docs/CONFORMANCE.md` §2 success の `sources` 規定を本 DR の形へ書き換える
- `schema/fixture.schema.json` の `sources` を object から array へ
- `expect.sources` を持つ fixture (53 files / 126 cases / 173 entries) を機械変換で移行。
  現 corpus に literal dot key・特殊文字は無く、変換不能ケースは 0 件。
  **変換器は使い捨てとし、`split(".")` を恒久コードに残さない** (本 DR §1.2 の欠陥を再生産する)
- conformance runner の比較は集合比較を継続できるが、**canonical form で連結形を使わない**
  (canonical JSON 1 行を sort する)。`(path, key)` の重複検査を追加する
- 実装 (`OutputView.sources`) は既に `Array[SourceEntry]` なので、wire の組み立てと
  kuu-cli の JSON 出力を追随させる
- §3.2 の要素 addressing は配列要素 provenance の設計に従うため、その裁定まで実装しない
