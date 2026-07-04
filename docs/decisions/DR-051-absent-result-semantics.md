# DR-051: 結果の欠落表現 — 値の無い要素は absent、null は値空間に持たない

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-022 (optional の semantics — unset / null / default の区別)。slice PoC 第 6 弾の「0 回発火の repeat 要素は `{x: []}`」観測が材料。本セッションで確定。

## 決定

### 1. 値の無い要素は absent (キーなし)

値源ラダー (DR-031) を回しても値が無い要素は、結果オブジェクトに**キー自体が現れない** (absent)。「値が無い」ことを in-band の null で表現しない。

### 2. absent が起きる条件は閉じている

absent が起きるのは「**値源を 1 つも持たない非反復要素が、どの値源からも供給されなかった**」場合のみ:

- **反復系 (repeat / multiple) は absent にならない**: 0 回発火でも蓄積列 `[]` という値が常にある (DR-044 の一様配列、slice PoC 第 6 弾で実測)。「値が無い」状態が反復系には存在しない
- **flag / count は absent にならない**: プリセットが default (false / 0) を同梱する (LOWERING §A.5)
- **required 要素は absent にならない**: 値が無ければその経路自体が不成立 (DR-047 の値充足述語) で、成功した結果に required 要素は必ず値を持つ

### 3. 言語バインディングの型導出規則

結果オブジェクトの型生成 (TS / MoonBit 等の DX 層) の指針:

```
required ∨ default あり ∨ 反復系 → T   (non-optional)
それ以外                         → T?  (optional / absent 許容)
```

required の「結果に必ず値がある」型保証 (DR-047) はこの導出規則として実を結ぶ。

### 4. null は kuu の値空間に存在しない

- 「明示的に取り消す」は unset 効果 (DR-045: default へ戻して committed=false) が既に担う。null 値のセットという第 3 の状態は持たない
- config ファイルの JSON null は「**供給なし**」として扱う (provider の lookup が値を返さないのと同義、DR-050)。null という値が config 席から要素に流れることはない
- UsefulAST の `value: null` / `default: null` は未定義 (書けない)。値の無さはフィールドの不在で表現する

### 5. ParserContext は absent 要素のメタも保持する

absent は結果オブジェクト (シンプルモード) の表現であり、ParserContext (DR-016) には全要素のメタ (committed=false / selected / source なし) が残る。「なぜ無いのか」を知りたい消費者は詳細モードを使う — 2 層分離 (DR-016) の帰結であり、結果オブジェクト側に欠落理由の in-band 表現を足さない。

## 採用しなかった案

### present-null (キーを出して null)

言語バインディングが `T | null` と optional の 2 重表現になり、JSON 消費側も「キーがあるが null」と「キーが無い」の区別を強いられる。absent 一本の方が構造で語れる。

### explicit-null の 3 区別 (findings F-022 の原案: unset=absent / 明示null / default適用)

null を値空間に入れると全 type が nullable 化し、peaceProcessor / filter / 効果記述子の全域に null 分岐が増える。「明示的に無い」は unset (committed=false、ParserContext で観測可能) が既に表現しており、3 区別の実体は committed / source のメタで足りている。

### 全キーを型のゼロ値で埋める (常に present)

「型のゼロ値」という暗黙ルールが増える (§0.1 に反する)。ゼロ値と「ユーザが 0 を指定した」の区別も消える。

## 射程外

- 結果キー軸の表現の一本化 (`export` / `export_key`) は issue `2026-07-03-export-result-semantics` で別途確定する (本 DR は「値が無い時」の表現のみ)
- 数値型の字句仕様全体 (ロケール等、F-017) は DR-040 拡張で別途

## 関連

- DR-016 (2 層分離 — absent は結果オブジェクト側のみ、メタは ParserContext)
- DR-031 (値源ラダー — 全滅時が absent)
- DR-044 (一様配列 — 反復系は 0 回でも `[]`、slice PoC 第 6 弾)
- DR-045 (unset 効果 — 「明示的に取り消す」の既存表現)
- DR-047 (required = 値充足 — 型導出規則の根拠)
- DR-050 (config の JSON null = 供給なし)
- findings `2026-06-29-ast-missing-pieces.md` F-022 (解消)、F-017 (射程外)
- issue `2026-07-03-export-result-semantics` (結果キー軸、隣接)
