# DR-055: 制約語彙の拡充 — conflicts_with 追加、値依存は値の枝への requires 合成、constraint installer

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-028 (条件付き制約) の再検討 (「or 構造への誘導」では離れた要素間の値依存が表現できないという指摘) から、制約語彙全体の設計議論に発展して確定。DR-012 (制約は要素属性) / DR-047 (評価意味論) の語彙面の補完。

## 決定

### 1. 値依存の制約は「値の枝への requires」合成で書く (新語彙ゼロ)

「format が json のときだけ schema 必須」のような値依存の制約は、専用の条件 DSL を持たず、**値の枝 (exact 要素) に requires を付ける**合成で表現する:

```json
{"name": "format", "or": [
  {"exact": "json", "requires": ["schema"]},
  {"exact": "yaml"}
]}
```

- §5.3 の values / or 展開で各値は exact **要素**になり、要素なら制約属性 (DR-012) が付く — 既存 2 機構の合成であり新語彙はゼロ
- json 枝が committed になった経路でのみ requires 述語が立つ (DR-047 の遅延述語は最終状態評価なので自然に動く)
- requires は id / name 参照 (lexical 解決) なので、対象要素がどこにいても届く — 「or 構造への誘導」が抱えていた「離れた場所の要素に効かない」問題は存在しない

F-028 の「専用フィールドは追加しない」は維持し、誘導先を「or による構造ねじれ」から本合成パターンに差し替える。

### 2. conflicts_with の追加 (片側名指しのペア排他)

```json
{"name": "foo", "conflicts_with": ["bar"]}
```

- **意味は対称**: a conflicts b = b conflicts a。片側に書けば両方向に効く
- 評価は DR-047 の指定述語 (committed 同士の衝突 = Error)。unset で取り消した要素は衝突に数えない — exclusive_group と同一の評価規則
- **exclusive_group と併存**する使い分け: 3+ 要素の相互排他はグループ型 (片側型では N(N-1)/2 ペアの列挙になる)、2 要素のペア排他は片側型が手軽。clap の conflicts_with / ArgGroup と同じ役割分担
- 語彙を conflict 系にするのは、グループ命名の N 者排他 (exclusive_group) と名指しのペア排他を語彙レベルで区別するため (同語根 2 表記 exclusives / exclusive_group の紛らわしさを避ける)
- 同じペアを conflicts_with と exclusive_group の両方に書いた冗長は**両方評価** (同じ違反を 2 述語が報告) で正しさは保たれる。冗長の指摘は lint (DR-054 の warn 層) の関心

### 3. requires の語彙は維持 (depends_on 不採用)

- requires は clap で確立された CLI パーサ語彙 (既存公開語彙の優先)
- required との対比は「**required は自分の話 (私には値が要る)、requires は相手の話 (私を使うなら彼らも要る)**」で覚えられる
- 負正ペアの整理: **requires = 正の依存、conflicts_with = 負の依存**

### 4. oneof は既存合成で足りる

「どれか 1 つ必須」は `{"required": true, "or": [...]}` (DESIGN §9.1 のグループ的必須) がそのまま表現する。専用語彙は持たない。

### 5. constraint installer

requires / exclusive_group / conflicts_with は **constraint installer** の所有語彙とする (DR-042 の canonical セットに追加)。回収した制約を遅延述語 (DR-047) として宣言する席宣言型 (構造衛星は足さない)。required は制約 3 種と同じ遅延述語だが、値充足という値セル側の性質 (DR-047 §5) であり所有はコア骨格に残る。

## 採用しなかった案

### 専用の条件 DSL (`when:` / 値条件付き requires)

§1 の合成で表現でき、条件言語という新しい公理面を持ち込む理由がない。

### depends_on への改名

方向は明確だが、値源依存 (env / config) とも読める別の曖昧さを持ち込む。既存語彙 requires の慣習を優先。

### 片側型の語彙を exclusives にする

exclusive_group との同語根 2 表記になり、グループ型と片側型の区別が語彙から読めない。conflict 系に分離。

### 片側型のみ / グループ型のみに一本化

片側型のみでは N 者排他が列挙地獄、グループ型のみでは 2 要素ペアに命名の儀式が要る。両方持つのは clap の実績形。

## 射程外

- 制約違反のエラー報告の構造は DR-053 (kind: "constraint") で確定済み、文言はレンダラ
- at_least_one 等の追加語彙は必要時に DR-047 の枠組み (値述語 / 指定述語) で分類して検討

## 関連

- DR-012 (制約は要素属性 — 語彙面の拡充)
- DR-047 (評価意味論 — conflicts_with は指定述語として合流)
- DR-042 (installer — constraint installer の追加)
- DR-054 (warn 層 — 冗長指摘は lint)
- DR-052 (露出とは直交)
- DESIGN §5.3 (values/or 展開 — 値依存合成の足場) / §9
- findings `2026-06-29-ast-missing-pieces.md` F-028 (解消 — 誘導先を合成パターンへ差し替え)
