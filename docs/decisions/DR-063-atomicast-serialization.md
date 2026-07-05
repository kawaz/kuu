# DR-063: AtomicAST 直列形の確定 — 宣言層 wire と lowered 断面表記

> 由来: フェーズ 1。DR-039 が「実装と同時に詰める」と defer した直列形を、slice PoC (第 1〜18 弾、167 テスト) の実測を背骨に確定する。議論経緯は docs/issue/2026-07-04-phase1-serialization-design-agenda.md (A-0〜A-5)。

## 決定

### 1. wire form = 宣言層のみ (A 群糖衣適用済み + installer 語彙 inert)

実装間で交換される AtomicAST JSON (wire form) は**宣言層のみ**を載せる:

- 切り口: A 群糖衣のうち**純構文正規化 (LOWERING §C.4 の列挙 = A.1〜A.4: 裸文字列 → exact、裸配列 → seq、裸リテラル → 照合消費、values → or) は適用済み**。type プリセット参照 (§A.5 の flag / count / help 等) は**展開せず `type:` 参照のまま残る** (registry 参照糖衣の解決は parse_definition の関心)。installer 所有語彙 (`long` / `short` / `env` / `repeat` 等) は **inert のまま残る**
- lowered 産物 (greedy 衛星 / matcher データ / 席宣言) は**載せない** — lowering は決定的 (不動点、DR-042) なので宣言層から常に再導出可能
- 受信側 parse_definition の仕様準拠は lowering 段階別 fixture (フェーズ 2、conformance の一部) が担保する

根拠: installer 不動点反復の最中は**宣言層が正本**である (他 installer の語彙を観測するタイプの installer — DR-056 の参照 / DR-061 の observes — は宣言層を読むことで成立する)。評価器は installer 語彙を見ない (LOWERING §C.1 の「見えないレンズ」) ため、宣言層が inert に同乗していても評価に影響しない。

**DR-039 テーゼとの関係**: 「AtomicAST = エンジンのノードグラフを宣言的にシリアライズした形」は維持され、「宣言的に」が文字通り強化される — 宣言層 + 決定的 lowering がノードグラフを一意に定めるため、wire は宣言層への射影で足りる。概念としての AtomicAST は宣言層 + lowered 産物の共存体 (DR-042 不変則①') であり、wire はその宣言層射影である。

### 2. wire 上の追加語彙の許容範囲

登録済み installer descriptor (DR-061) の所有集合の和に含まれる語彙のみ。誰も所有しない語彙は DR-054 の unknown-vocab Error (typo 検出を保つ)。

### 3. lowered 断面の表記 (段階別 fixture 用)

wire ではないが、lowering 段階別 fixture の期待断面として lowered 形の表記を定める。比較は常に緩比較 (LOWERING §C.5: 構造骨格の一致 + matcher は種別とエントリ表の一致):

- **scope 断面は面構造**: `{greedy: [...], positionals: [...], entities: {...}, constraints: [...]}` の **4 面**。greedy マークは**配置で表現**し、専用フィールド (`greedy: true`) を持たない。根拠: PoC の Scope 実測 (matcher も exact 衛星も greedy 配列の同列市民)、DR-041 の仕様語彙「greedy 面 / positional 面」との一致、ノード属性方式では「positional 配列内の greedy ノード」という不正状態が表現可能になる。**constraints 面**は遅延述語 (DR-047/055) のデータ形 — 要素は `{kind: "requires" | "requires_if" | "conflicts_with" | "exclusive_group", element/group, targets/members, value?}` (constraint installer の回収結果、slice 第 15 弾の Constraint 4 値と同型)
- **greedy 衛星の値スロットは ref + link の宣言形が正規**: `{seq: [{exact: "--port"}, {ref: "port", link: "port"}]}` (LOWERING §B 冒頭の標準パターン。ref は name 参照 = 実体の構造継承であり template 専用の語ではない)。実装が ref 解決を済ませた inline 形 (値プリミティブ直埋め) を内部に持つのは自由で、緩比較は両者を同一骨格として扱う
- **matcher entries のキーの語義は matcher kind が定義する**: `eq_split` = prefix 畳み込み済みのトリガ綴り (`{"--port": "port"}`)、`short_combine` = cluster 内の 1 文字 (`{"p": "port"}`)。prefix は断面に独立フィールドとして現れない (畳み込み済みキー、または種別の意味論に内包)
- **entities は最小投影が canonical**: 意味を持つフィールド (type / default / 席宣言 / accumulator 名) のみを書く。省略 = default 値と等価 (§4 の構造等価) なので情報は失われない
- **entities は値セルの表**: 実体だけノード (DR-030) の置き場。type / default / 値源ラダーの席宣言 (env 席・inherit 席・config 席、DR-042 不変則④) / accumulator 名を持つ。効果列 (DR-045) の「実体」はここの住人
- **matcher**: `{matcher: "<kind>", entries: {"<トリガ/文字>": "<実体 name/id>"}}`。kind は open set (方言 matcher は registry + descriptor で増える) なので専用ノード型の閉じた列挙にしない。**entries の値は実体への name / id 文字列参照** — 構造埋め込みは実体の複製になり link 合流 (同一セル前提) の同一性を壊す
- **効果記述子**: set は縮退形 `{exact, value, link}`、非 set は `{exact, link, effect: {op}}` (DR-045 / LOWERING §B.1 のとおり)。複数 args の set variant (`"red:set:rgb:255:0:0"`、DR-011) は **value に配列を沈める** (`{exact: "--red", value: ["rgb", "255", "0", "0"], link: "color"}`、args は全 string で CLI 入力と同じ手順を通る)
- **repeat unfold の内部 id**: cons の再帰尾部は自己参照 (`{seq: [head, {ref: "file#geq1", optional: true}]}`) のため id が必要。規範は「**一意であること + `#` を含む id はユーザ定義 id と衝突しない予約名前空間** (DR-046 §4 の内部 id)」まで。具体的な命名 (`#geq1` 等) は非規範であり、緩比較が綴り差を吸収する

### 4. 比較は構造等価、byte 一致は要求しない

key 順序は非規範 (JSON object は unordered)、フィールド省略 = default 値と等価。JSON canonical form (JCS 等) は、ハッシュ・署名等の実需が出るまで導入しない。

## 採用しなかった案

### lowered 込み wire

「宣言と lowered の整合」という新しい不変条件が wire に生まれる。lowered は宣言層から再導出可能なので冗長であり、受信側の検証責務が増えるだけ。

### greedy: true のノード属性

不正状態 (positional 面内の greedy ノード) が型上表現可能になる。配置表現なら make invalid states unrepresentable が成立。

### matcher 種別ごとの専用ノード型

方言 matcher の追加のたびに schema が変わる。kind 文字列 + descriptor で開いた集合として扱う。

### entries への実体構造の埋め込み

実体の複製が生じ、複数入口の link 合流 (`--port 80 -p 90` が同一セルにあと勝ちで積まれる) の同一性が壊れる。

### byte 厳密比較 / canonical JSON の規範化

DR-041/042 が「観測挙動が同一なら自由」とした実装内部の自由度 (dd の severed フラグ vs 継続参照の encoding 等) を殺す。

## 射程外

- JSON Schema の実体化 (F-042 invariant / F-048 lifecycle — フェーズ 1 の後続作業として別途)
- conformance fixture のフォーマット (定義 + argv + 期待値のスキーマ — 別途)
- pending 状態 (トリガ消費・値待ち) の枝表現 — 評価器契約 (フェーズ 3) の論点。DR-060 の complete が別走査で成立することは slice 第 18 弾で実測済み

## 関連

- DR-039 (合流テーゼ — 直列形の範囲を本 DR が確定。テーゼ自体は維持)
- DR-042 (installer 不変則 — 決定的 lowering が §1 の再導出可能性の根拠、①' が共存体の根拠)
- DR-045 (効果記述子 — §3 の効果表記の意味論)
- DR-046 (内部 id — `#` 予約名前空間の出所)
- DR-056 / DR-061 (observes — 宣言層が正本である根拠、descriptor — 追加語彙の判定)
- DR-062 (filters 二形 — 宣言層 wire に載る filters フィールドの形)
- DR-068 (lifecycle — canonical default の変更が再導出可能性を暗黙に変える変更は「同じ wire の解釈が変わる」= major として捕捉される)
- LOWERING §C.3 (未確定範囲 — 本 DR で解消) / §C.5 (緩比較 — §3 の比較規約)
- docs/issue/2026-07-04-phase1-serialization-design-agenda.md (A-0〜A-5 の議論経緯)
