# DR-122: sources は result の shadow tree — 値の構造をそのまま写す

> 由来: DR-121 (structured path entry の配列) の運用初日に kawaz が指摘 (2026-07-26)。
> 「シンプルに値の構造そのままで何でダメなの? pair[0] の source が cli って方がどう考えても
> 正確な表現でしょ」。配列要素 provenance の addressing 設計
> (issue `2026-07-26-array-element-provenance-sources-addressing`) を検討する過程で、
> フラット化 + アドレス語彙という中間発明そのものが不要と判明した。

## 決定

### 1. sources は result と同型の shadow tree

`sources` は **`result` と同じ構造**を持ち、値の座だけを source タグに置き換えたオブジェクトである:

- スカラー値の座 → source タグ (string、DR-031 の 8 語彙)
- 配列 → タグの配列 (**要素対応**。`result` の i 番目の要素の由来が `sources` の i 番目)
- kv / scope → タグの kv (キーは `result` と同じ露出キー)

```json
result:  {"pair": ["x", "fallback"]}      → sources: {"pair": ["cli", "const"]}
result:  {"xs": [{"k": "a", "v": "b"}]}   → sources: {"xs": [{"k": "cli", "v": "cli"}]}
result:  {"timeout": 30}                  → sources: {"timeout": "const"}
result:  {"sub": {"ttl": "30"}}           → sources: {"sub": {"ttl": "env"}}
```

### 2. キー集合は result と完全一致 (result の射影)

`result` に現れないキーは `sources` にも現れない。**死んだ枝 (未選択 scope / absent) は
成立しなかった構造であり、source を語る対象が存在しない** (kawaz 裁定 2026-07-26:
「result に出てこないのは他の死んだ枝であって構造も何もかも違う。そもそも成立しない枝に
意味ない」)。逆に `result` にある値の座は必ず `sources` に対応するタグを持つ。

- scope 生成要素の空 kv `{}` (presence marker、DR-052 §3) は `sources` でも `{}` — 値の座が
  無いので置き換えるタグも無い
- accumulator の 0 発火 `[]` (DR-044) は `sources` でも `[]` — 要素が無いので要素タグも無い。
  DR-121 §2.2 の「0 発火 accum に default entry を 1 件」は本 DR で廃止する
  (「発火していない」ことは空配列そのものが表現しており、タグの捏造は要らない)

#### 2.1 空コレクションの由来は表現しない (SHADOW-Q1、kawaz 2026-07-27)

`[]` / `{}` に値の座が無いということは、**「ユーザが明示的に空にした」と「何も来なかった」が
`sources` 上で同形になる**ということでもある。DR-121 §2.2 の形は 0 発火 `[]` に `default`、
`empty` op (committed=true) で空にした `[]` に `cli` を載せてこの 2 つを区別していた
(`fixtures/multiple-parse/filters-cell-ops.json` は `unset` (committed=false、`default` になる) と
`empty` (committed=true、`cli` になる) の対比そのものを固定していた)。

本 DR はこの区別を `sources` から落とす。理由は 2 つ:

- **`sources` は値の由来を写す面であり、committed 軸を持たない** (DR-031「committed/selected との
  直交性」)。空という結果を誰が作ったかは committed 軸の情報であって、値の由来ではない
- **情報自体は失われない** — `effects` が `op: "unset"` / `op: "empty"` で既に区別を pin している
  (DR-045 §4)。観測経路が消えるわけではなく、担当する面が `sources` から `effects` へ移るだけ

空配列だけタグを許す (`"ports": "cli"` のように座の型と違う形を置く) 案は、shadow tree の
「値の構造そのまま」が崩れ schema と比較規約に分岐が増えるため不採用。cell 単位のタグを別フィールドで
併記する案は、本 DR が退けたフラット化 + アドレス語彙の再来なので不採用。

### 3. タグの決定単位は「値の座」

各座のタグは DR-031 の source 確定ルール (最終値を確定させた効果 / 充填の由来) をその座に
適用した結果である:

- nameless `seq` の tuple: 各要素が自分の由来を持つ (`["cli", "const"]`) — DR-121 §3.2 の
  「wrapper に 1 タグ」は shadow tree の縮退表示だった。フラット化を止めたので要素ごとに
  正確に書ける
- accumulator の各 row / 各要素: その要素を産んだ発火の source
- named 子: 自分の座のタグ (従来の cell provenance と同じ)

## 採用しなかった案

### structured path entry の配列 (DR-121 §1、本 DR で置き換え)

`[{"path": [...], "key": "...", "source": "..."}]` の形。`.` 連結の非単射を潰すために
導入したが、shadow tree は**そもそもフラット化しない**ので、あの欠陥は構造的に発生しない。
DR-121 §1.1 の「path と key を結合した文字列を規範面で作らない」という禁則も、結合する
動機ごと消える。

### 配列要素の addressing 語彙 (`tags.#0` / JSON Pointer 等)

issue `2026-07-26-array-element-provenance-sources-addressing` の (a)/(b) 案。フラットな
entry 列に要素を刺すための語彙で、shadow tree では不要 (同 issue の (c) 案「別構造で持つ」の
最終形が本 DR)。内部 sentinel (`#k` / `#row` / `#fire`) は引き続き公開面に出さない。

## 波及

- **CONFORMANCE §2**: sources 節を本 DR の形へ書き換え (entry 導出 6 手順 → shadow tree 構築規則)
- **schema/fixture.schema.json**: sources を entry 配列から再帰構造 (タグ | タグ配列 | タグ kv) へ
- **fixture**: `expect.sources` を持つ全 file を機械変換 (entry 配列 → shadow tree)。
  変換器は使い捨て (DR-121 §6 の教訓を継承)
- **DR-121**: §1 (structured path) / §2.2 (0 発火 default entry) / §3 (structural aggregate の
  席論) を本 DR が置き換え。§4 (`link` は独立タグ) / §5 (effects との軸の違い) は不変で存続
- **実装 (kuu.mbt)**: `result_sources` を entry 収集から shadow tree 構築へ。result を組む走査と
  同じ構造を辿るので、露出キー軸の再計算 (`walk_export_path`) は流用できる
- **kuu-cli**: sources の JSON 出力形を追随

## 関連

- DR-031 (source タグの語彙と確定ルール — タグの決定単位は不変)
- DR-121 (前形。§4/§5 は存続、他は本 DR が置き換え)
- DR-044 (uniform array) / DR-051 (absent) / DR-052 §3 (presence marker)
- issue `2026-07-26-array-element-provenance-sources-addressing` (本 DR で解消)
