# DR-121: sources の結果アドレス — structured path と席の単位

Status: Accepted (SRCADDR-Q1=d / Q2-α=a / Q2-β=c / LINKSRC-Q1=a、kawaz 2026-07-26) —
**§1 / §2.2 / §3 は DR-122 が置き換え** (§4 / §5 は現役、末尾「Superseded (歴史)」節参照)

> **更新 (DR-130、2026-08-01): 現行の `sources` は `result` と同じ宣言キー集合を持ち、値が確定しない座は両方で `null` になる。** §2 の「値源ラダーが確定した値セルだけが席を持つ」は、値が確定しなかった宣言座にも `null` の席が立つ形へ変わる。presence marker は廃止され、未選択 scope は親キーの `null` で内側を畳む。空コレクションに source タグを置かない規則は不変 (DR-122 §2 / DR-130 §5)。

> **更新 (DR-135、2026-08-14): §2.1 の内部セルから `config_file` が抜けた。** 内部セルとして残るのは `type: "none"` (DR-089) と dd trigger (DR-064) の 2 者で、いずれも値セルを持たない構造マーカーである。`config_file` は string のパス値を自分のラダーで確定させる通常の値セル (DR-050 §1) なので、`effects` / `result` / `sources` に通常要素と同じ規則で現れ、露出キー衝突検査にも占有子として参加する。結果に出したくない定義は `export_key: null` か nameless で書く (DR-135 §5)。

> **更新 (DR-125、2026-07-29): `sources` のタグ語彙から `inherit` が抜けた。** §1 の例の
> `{"path": ["sub"], "key": "ttl", "source": "inherit"}` と §1.1 の語彙列挙
> (`cli` / `link` / `env` / `config` / `inherit` / `tty` / `default`) は対象を失っている。
> 現行の語彙は `cli` / `link` / `env` / `config` / `tty` / `default` / `const` の 7 語彙
> (CONFORMANCE §2 が正本) — `inherit` が抜けた一方で `const` (消費 0 literal 由来、2026-07-26 裁定)
> が入っており、旧列挙とは中身が別物である。なお §1 の entry 配列という形自体は DR-122 が
> `result` 同型の shadow tree へ置き換えている。

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
- **内部セル** — `type: "none"` (DR-089) / dd trigger (DR-064) は
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

### 3.2 複数値 = tuple の席 (Q2-β=c、SRCELEM-Q1 の 2026-07-26 kawaz 再裁定で適用範囲を精密化)

`seq` の nameless 子が並ぶ場合、結果は **tuple** (積型) である。「席が N 個」という Q2-β=c の
原理は、**子が独立の値源を持ちうる場合**に効く — その代表は named 子で、各子が自分の結果キーを
持つため通常の cell provenance (要素ごとの entry) がそのまま書ける。

nameless tuple の sources は **shadow tree の要素対応** (DR-122 §1/§3) で表す — `result` の
配列の i 番目の要素の由来が `sources` の同位置のタグになる:

```json
{"name":"pair","seq":[{"type":"string"},{"type":"string","value":"fallback"}]}


> **更新 (DR-140 §2、2026-08-16): 上の例の `value: "fallback"` は移送後の綴りでは
> `"value": {"const": "fallback"}` になる。** 要素直下の `value` が値カプセルの席になるため、
> 旧綴りのままだと**カプセルの縮退形として合法にパースされ意味が変わる** (DR-140 §2 が警告する
> ハザード)。本 DR は DR-122 / DR-130 から現役規範として参照されるので読み替えを明示する。--pair x → result: {"pair":["x","fallback"]}、sources: {"pair":["cli","const"]}
```

`value:` の literal 成分は独立の値源装置ではなく発火が産出する定数 (source タグは `const`、
DR-031 —「const は値セルに最初からいる。default は無い時に埋める」)。未発火なら pair ごと
absent であり、literal だけが着席することはない。named 子は自分の結果キーを持つので、
通常の cell provenance (kv の座のタグ) で書ける。

`or` の枝が `seq` を持つ場合 (枝が tuple) も本項の扱いになる。

`default:` を持つ子は消費 0 literal ではなく値源ラダーの席を持つ通常の消費子であり
(DR-031 / DESIGN §5.2)、トークンを得られずに空席のまま完走した座は resolve 相で default が
埋める — nameless 配列の要素ごと provenance が `["cli", "default"]` になる構成は到達可能で
ある (`value:` 版が `["cli", "const"]` になるのと位相が違うだけで、どちらも 1 発火が産む
配列内の混在であり、shadow tree がそのまま表現する)。

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

参照実装 (kuu.mbt) は `Source` enum に `Link` を持ち (`src/abi/value.mbt`)、`link` 属性の
decode と独立タグとしての emit を実装済み (DR-127 第 1 波で追随、2026-08 確認)。

## 5. effects との軸の違い

`effects[].entity` は**射影前の canonical entity name / id** であり `export_key` を適用しない
(DR-045: 効果は cell 単位で記録する。entity は値セルであって露出パスではない)。

したがって `effects` は **id 軸**、`result` / `sources` は結果アドレス軸であり、
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
- §3.2 の nameless tuple の sources は shadow tree の要素対応 (DR-122)。配列要素の addressing 語彙の新設計は不要 (フラット化しないため)
- §4 の `link` は参照実装が `Cli` に畳んでいるので追随が要る (`Source` に `Link` を足す /
  `link` 属性の parse 面 decode)。`link` を source 値として持つ fixture も corpus に無いので追加する

## Superseded (歴史)

本節は DR-122 (sources は result の shadow tree) との関係を **superseded (覆された部分)** と
**retained (現役のまま適用される部分)** に分けて明示する。判断内容自体は変更しない。

### Superseded — §1 / §2.2 / §3 (structured path entry を前提とする規定)

> **現役仕様の理解には不要、判断経緯としてのみ残す。**

`sources` の wire 形が structured path entry の配列から **`result` と同型の shadow tree** へ変わった
(DR-122 §1)。これに伴い以下が置き換わる:

- **§1 全体** (entry 配列の形、`(path, key)` の一意性、順序非規範、連結文字列の禁止) — shadow tree は
  そもそもフラット化しないので、entry も結果アドレスの符号化も存在しない。§1.1 の「`path` と `key` を
  結合した文字列を規範面で作らない」という禁則は、結合する動機ごと消える。§1.2 が挙げた `.` 連結の
  非単射という欠陥は、構造をそのまま写す形では**構造的に発生しない**
- **§2.2 の accumulator 規定** — 0 回発火 `[]` に `source: "default"` の entry を 1 件持つ規定は廃止。
  `sources` 側も `[]` になる (「発火していない」ことは空配列そのものが表現しており、タグの捏造は要らない、
  DR-122 §2)。副作用として、`empty` op (committed=true) で明示的に空にした `[]` と未発火の `[]` が
  `sources` 上で区別できなくなる — この区別は `effects` の op が担う (DR-122 §2 / CONFORMANCE §2)
- **§3 の structural aggregate の席論** — 「nameless tuple の wrapper は entry 1 件」(§3.2) は
  フラット化に由来する**縮退表示**だった。shadow tree では tuple の各要素が自分の由来を持てるので
  `["cli", "const"]` と正確に書ける (DR-122 §3)。§3.1 の union 席 (`or` の枝が単一値) は、値の座が
  1 つである以上 shadow tree でもタグ 1 つであり、結論は変わらないが「席」という中間概念を経由しなくなる

### Retained — §4 / §5 は不変で現役

> **以下は覆されていない。**

- **§4 (`link` は独立した値源タグ)** — LINKSRC-Q1=a はタグの**語彙**の裁定であり、タグをどう配置するか
  (entry 配列 / shadow tree) とは独立。実装追随は §4.2 のとおり完了済み
- **§5 (effects との軸の違い)** — `effects[].entity` が **id 軸**、`result` / `sources` が結果アドレス軸

> **更新 (TRG-Q3=a、2026-08-15): §5 で「宣言名軸」と呼んでいた軸の綴りは参照識別子 (id) に確定した。** `effects[].entity` / `errors[].element` は明示 `id` があればその値、無ければ name に id 軸の文字写像 (DR-136 §3) を掛けた値を綴る (生の name ではない)。結果アドレス軸との対比という §5 の主張自体は不変。正本は CONFORMANCE §2。
  である対比は不変。§5 の例に出る `sources` の綴りだけが shadow tree 形 (`{"v": "cli"}`) になる
