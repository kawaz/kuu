# DR-121: sources の結果アドレス — structured path と席の単位

Status: Accepted (SRCADDR-Q1=d / Q2-α=a / Q2-β=c / LINKSRC-Q1=a、kawaz 2026-07-26)

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

### 3.2 複数値 = tuple の席 (Q2-β=c、2026-07-26 kawaz 再裁定で適用範囲を精密化)

`seq` の nameless 子が並ぶ場合、結果は **tuple** (積型) である。「席が N 個」という Q2-β=c の
原理は、**子が独立の値源を持ちうる場合**に効く — その代表は named 子で、各子が自分の結果キーを
持つため通常の cell provenance (要素ごとの entry) がそのまま書ける。

**nameless tuple の wrapper セルは entry 1 件で、source は発火経路 (`cli` / `link`)。**
消費 0 literal (`value:`、DESIGN §5.2) を含む tuple でも由来は混在しない:

```json
{"name":"pair","seq":[{"type":"string"},{"type":"string","value":"fallback"}]}
--pair x → pair=["x","fallback"]、sources は pair に cli の 1 entry
```

literal 成分は独立の値源ではなく、**発火が産出する形の一部** (kawaz: 「pair は x のみから
決まっている。これは只の x の写像 (`x → [x,"fallback"]`)」— 静的な定数であって、
default のような動的な値源装置ではない)。未発火なら pair ごと absent であり、literal だけが
着席することはない。named literal 子は自分の結果キーを持つので、そのセルの source は
`const` (DR-031 の語彙追加、「const は値セルに最初からいる。default は無い時に埋める」)。

`or` の枝が `seq` を持つ場合 (枝が tuple) も本項の扱いになる。

> 初版の本節は「要素ごとの provenance が `[cli, default]` になる」を到達可能例として挙げ、
> 配列要素 addressing の裁定に送っていたが、これは誤導出 (literal は値源ラダーを通らない)。
> nameless 配列内で source が混在する構成は、この例からは生じない。

## 4. `link` は独立した値源タグ (LINKSRC-Q1=a)

`link` (他要素の入口から link で飛んできた効果) は `cli` に畳まず、独立したタグとして報告する。
DR-031 の source 確定ルール (「自分の入口からの効果 = `cli`、link 越しの効果 = `link`。
両者はラダー同順位で、区別は経路の違いのみ」) と DR-098 §6 の 7 語彙をそのまま採る。

### 4.1 用途

**どの入口から入ったかを消費者が判別するため。** 典型は alias の deprecated ペア:
canonical 入口と deprecated 入口が link で結ばれていて、どちらから入っても結果は同じだが、
deprecated な入口を使った場合に警告を出したい。値が同じでも経路が違うので、
`sources` で区別できないとアプリ側が判定できない。

(spec 内蔵の deprecated 警告は `warnings[].element` が担う (DR-058 §2) が、
そちらは「どの canonical を使うべきか」を指す宣言面の情報であり、
「どの経路で入ったか」を値ごとに引く軸ではない。)

### 4.2 実装の現状

参照実装 (kuu.mbt) は `Source` enum に `Link` を持たず `Cli` に畳んでいる
(`src/abi/value.mbt` の `Cli // CLI explicit / link`)。また `link` 属性自体も parse 面では
decode されない。**本 DR は spec 側の規範であり、実装追随は別途行う** (kuu.mbt の issue)。
corpus に `link` を source 値として pin する fixture が 0 件だったため、
この乖離が長く検出されていなかった。

## 5. effects との軸の違い

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

## 6. 波及

- `docs/CONFORMANCE.md` §2 success の `sources` 規定を本 DR の形へ書き換える
- `schema/fixture.schema.json` の `sources` を object から array へ
- `expect.sources` を持つ fixture (53 files / 126 cases / 173 entries) を機械変換で移行。
  現 corpus に literal dot key・特殊文字は無く、変換不能ケースは 0 件。
  **変換器は使い捨てとし、`split(".")` を恒久コードに残さない** (本 DR §1.2 の欠陥を再生産する)
- conformance runner の比較は集合比較を継続できるが、**canonical form で連結形を使わない**
  (canonical JSON 1 行を sort する)。`(path, key)` の重複検査を追加する
- 実装 (`OutputView.sources`) は既に `Array[SourceEntry]` なので、wire の組み立てと
  kuu-cli の JSON 出力を追随させる
- §3.2 の nameless tuple wrapper は entry 1 件 (発火経路の source)。named 子は通常の cell provenance で書けるため、配列要素 addressing の新設計は不要になった (2026-07-26 再裁定)
- §4 の `link` は参照実装が `Cli` に畳んでいるので追随が要る (`Source` に `Link` を足す /
  `link` 属性の parse 面 decode)。`link` を source 値として持つ fixture も corpus に無いので追加する
