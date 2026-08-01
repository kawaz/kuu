# DR-051: 結果の欠落表現 — 値の無い要素は absent、null は値空間に持たない

**Status: Superseded by DR-130 (2026-08-01)**

> DR-130 が意味論を反転させた — 成功 result は宣言上出うる全キーを必ず持ち、値の無い座は `null` になる。
> absent (キー自体が現れない) は成功 result から消え、`null` が値空間の住人へ昇格する。以下の本文の
> §1 (値の無い要素は absent) と §4 (null は値空間に存在しない) は覆っており、§3 の型導出は
> `T?` → `T | null` へ読み替わる。§2 の「absent にならない条件」(反復系 / flag・count / required) は
> 「null にならない条件」として不変、§5 の 2 層分離 (result と ParserContext) も不変で DR-130 が継承する。
>
> §4 の 3 項の行き先は個別に分かれる:
>
> - **第 1 項**「『明示的に取り消す』は unset 効果が担う、null 値のセットは持たない」— **DR-131 §1 が
>   置換する**。`unset` は Sentinel をやめて `null` を返す Value fn になり、`set(null) = unset` になった
>   ので、「null のセット」と「取り消し」は同じものになった
> - **第 2 項**「config ファイルの JSON null は供給なし」— **裁定不変** (入力側の別軸、DR-050)。
>   provider 境界の `| null` を Maybe として読む一般則は DR-130 §9.1
> - **第 3 項**「`value: null` / `default: null` は書けない」— **DR-130 §3.1 が根拠を替えて存続させる**。
>   定義側に null リテラルを書けない禁止は維持され、違反は definition-error `invalid-range`。
>   ただし `default_fn` が実行時に `null` を返すのは合法
>
> 逐条の対応は DR-130 §1〜§9 と同 §波及。

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-022 (optional の semantics — unset / null / default の区別)。slice PoC 第 6 弾の「0 回発火の repeat 要素は `{x: []}`」観測が材料。本セッションで確定。

## 決定

### 1. 値の無い要素は absent (キーなし)

値源ラダー (DR-031) を回しても値が無い要素は、結果オブジェクトに**キー自体が現れない** (absent)。「値が無い」ことを in-band の null で表現しない。

### 2. absent が起きる条件は閉じている

absent が起きるのは「**値源を 1 つも持たない非反復要素が、どの値源からも供給されなかった**」場合のみ:

- **反復系 (repeat / multiple) は absent にならない**: 0 回発火でも蓄積列 `[]` という値が常にある (DR-044 の一様配列、slice PoC 第 6 弾で実測)。「値が無い」状態が反復系には存在しない

  > **精密化 (DR-123 §3)**: 本項の判断は有効だが、根拠が配置換えされた。`[]` はセルに最初から居るのではなく**ラダー最下段の暗黙 default** であり (反復セルの値セルは初回発火まで空席、DR-123 §1)、本項は独立規則でなく §2a (default 持ちは absent にならない) の系である。宣言 default があれば暗黙 `[]` を置き換える (DR-083 §1)。「反復系は absent にならない」という帰結と §3 の型導出は不変。

- **flag / count は absent にならない**: プリセットが default (false / 0) を同梱する (LOWERING §A.5)
- **required 要素は absent にならない**: 値が無ければその経路自体が不成立 (DR-047 の値充足述語) で、成功した結果に required 要素は必ず値を持つ

### 3. 言語バインディングの型導出規則

結果オブジェクトの型生成 (TS / MoonBit 等の DX 層) の指針:

```
required ∨ default あり ∨ 反復系 → T   (non-optional)
それ以外                         → T?  (absent 許容)
```

「反復系」は repeat / multiple に加えて **`optional: true` を含む** — optional は `repeat: {min: 0, max: 1}` の糖衣 (DR-043) であり反復系そのものなので、結果は常に配列 (`[]` / `[x]`、DR-044 の一様配列) で T (= 配列型) に落ち、absent にならない。T? に落ちるのは「required なし・default なし・非反復 (optional 糖衣も含まない)」の要素のみ。

> **精密化 (DR-113 §5.4 / DR-114)**: 本項の「default あり」は **native な `default:` 値**を指し、**可謬な `default_fn` (例: `borrow:<source>` — 参照先の最終不在で fn reason `absent-source` となり呼び出し元も unset のまま落ちる) は数えない**。default_fn しか持たない要素は absent になりうるので `T?` に落とす (観測 fixture: `value-sources/default-fn-borrow-ladder.json::borrow-source-absent`)。DR-088 の経路完全性判定 (「宣言された値源」に default_fn を数える) とは別軸 — あちらは探索時の presence、こちらは結果型の保証。

required の「結果に必ず値がある」型保証 (DR-047) はこの導出規則として実を結ぶ。

> **追補 (DR-126 §3、2026-08-01)**: 同じ導出は descriptor の `record` 型 (固定フィールドを持つ値) の
> 内側にも降りる。フィールドの型は参照先 type の `out` を再帰的に辿って求め、**presence は全フィールドが
> `T?`** になる — record のフィールドは presence-optional で、「このフィールドは常に立つ」を機械可読に
> 主張する手段を v1 は持たないため。値セルの型導出の正本は `io_type.output` の record 宣言だけで、
> 型が持つ入力定義片は CLI トークンの消費文法を語る入力側の機構なので導出には関与しない。
> 上の表の「required ∨ default あり ∨ 反復系」は結果オブジェクトの**要素**の軸であり、record の内側には
> 対応物が無い (器そのものが立つかどうかは、その要素自身が上の規則で判定される)。§1 の absent = キー無しと
> §4 の null 不在は record の内側でもそのまま成り立つ。

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

null を値空間に入れると全 type が nullable 化し、pieceProcessor / filter / 効果記述子の全域に null 分岐が増える。「明示的に無い」は unset (committed=false、ParserContext で観測可能) が既に表現しており、3 区別の実体は committed / source のメタで足りている。

### 全キーを型のゼロ値で埋める (常に present)

「型のゼロ値」という暗黙ルールが増える (§0.1 に反する)。ゼロ値と「ユーザが 0 を指定した」の区別も消える。

## 射程外

- 結果キー軸の表現の一本化は DR-052 で確定済み (`export` bool 廃止 → `export_key: string|null`)。本 DR は「値が無い時」の表現のみを扱う
- 数値型の字句仕様全体 (ロケール等、F-017) は DR-040 拡張で別途

## 関連

- DR-016 (2 層分離 — absent は結果オブジェクト側のみ、メタは ParserContext)
- DR-031 (値源ラダー — 全滅時が absent)
- DR-044 (一様配列 — 反復系は 0 回でも `[]`、slice PoC 第 6 弾)
- DR-045 (unset 効果 — 「明示的に取り消す」の既存表現)
- DR-047 (required = 値充足 — 型導出規則の根拠)
- DR-050 (config の JSON null = 供給なし)
- DR-052 (結果キー軸の表現一本化 — `export_key: string|null`、本 DR 射程外の確定先)
- findings `2026-06-29-ast-missing-pieces.md` F-022 (解消)、F-017 (射程外)
