# DR-062: filters の継承インターフェース — @base sentinel の廃止と二形表記

> 由来: フェーズ 1 議論での `@base` sentinel (DR-009) の再評価。インターフェースの型面 (string[]) から sentinel の存在が発見できない点と、sentinel パターンが仕様中 1 箇所だけの孤立語彙である点。議論経緯は docs/issue/2026-07-04-phase1-serialization-design-agenda.md (A-8 の filter 線引き議論からの派生)。

## 決定

### 1. `@base` sentinel を廃止する (DR-009 の @base 節を覆す)

- **発見不能性**: `filters: string[]` という型面から `@base` の存在は見えない。インターフェースだけを見て使い方が分かる状態を壊す in-band 特殊値 (値空間への特殊文字列の混入)
- **孤立語彙**: sentinel パターンは仕様中この 1 箇所だけ。variant DSL / filter DSL は「文字列 DSL」であって値空間への特殊値混入ではない。1 箇所のための特殊規則は公理を増やさない方針に反する

### 2. string 短縮形 | object 詳細形の二形 (既存イディオムの再適用)

`filters` / `pre_filters` / `post_filters` の各フィールドは二形を取る (`multiple: "append" | {accumulator: ...}` / variant の文字列 DSL | オブジェクト形式と同族):

```json
"pre_filters": ["trim"]                                   // 配列 = 差し替え (継承なし)
"pre_filters": {"prepend": ["trim", "normalize_width"]}   // 継承 chain の前に足す
"pre_filters": {"append": ["non_empty"]}                  // 後ろに足す
"pre_filters": {"prepend": [...], "append": [...]}        // 両方。合成順は prepend ++ 継承 chain ++ append
```

相名 (pre / post) と操作名 (prepend / append) が直交するため、フィールド増殖型 (`pre_filters_before` 等) が招く語彙混乱 (「pre の前 = prepre」問題) を避けられる。object 形のキーが自己記述的で、型面から発見できる。

### 3. 継承元の解決順は不変 (DR-009 から継承)

```
1. ref が指定されていれば → ref 元のそのフィールド
2. なければ → type registry のデフォルト
3. どちらもなければ → 空配列
```

変わるのは「継承点を値の中に sentinel で書く」から「値の形 (object 形) で表す」だけで、継承元の探索規則は不変。

### 4. ref 継承との合成は後勝ち上書き

ref 元が `{prepend: ["a"]}` を持ち、参照側が `{prepend: ["b"]}` を書いた場合は**フィールド単位の丸ごと上書き** (b だけが効く、累積しない) — DR-034 の合成順 (DESIGN §3.5、後ろほど優先) の流儀。sentinel 方式でも潜在していた挙動を本 DR で明示的に固定する。

### 5. 中間挿入は表現しない

継承 chain の**中間**に挿す形は持たない。必要なら definitions で type を shadow して chain ごと差し替える (差し替え軸、DR-040)。実需が出るまで公理を増やさない。

## 採用しなかった案

### @base sentinel の維持

決定 §1 の 2 点 (発見不能性・孤立語彙)。

### フックポイントのフィールド分割 (pre_filters_before / pre_filters_after 等)

相名と操作名が 1 つのフィールド名に結合し、「pre の前」を表す語彙が prepre 型の混乱を招く。フィールド数も 3 相 × 2 で増殖する。

### 中間挿入対応

継承 chain の内部構造 (どの filter が何番目か) への依存を生み、type 側の chain 変更が利用側を壊す結合になる。差し替えで足りる。

## 関連

- DR-009 (filter chain 初期形 — 本 DR が @base sentinel 節を覆す。解決順・純粋関数性・DSL 文法は不変)
- DR-034 (pieceProcessor 相構造・合成順 — §4 の上書き流儀の出所)
- DR-061 (configurable factory — factory config と filter の「相」線引き。本 DR は filter 側の継承表記)
- DR-011 (variant の文字列 DSL | オブジェクト形式 — 二形イディオムの先行例)
- docs/issue/2026-07-04-phase1-serialization-design-agenda.md (議論経緯)
