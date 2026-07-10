# DR-086: variant 枝競合 — 値スロットが食える読みは食う (引数なし枝への譲り禁止)

> 由来: issue values-variant-branch-competition の残論点 (string positional 同居時の `--color always` の帰結が positional の required/optional 宣言で分かれ、既存規定から一意導出できないと判明)。kawaz 裁定 (2026-07-10):「追加規定なんてそもそもなくても食える分は食うで良い。`--color always` が食えるのに引数なしを採用してポジショナルに残すなんてありえない」— 経路の完全性による救済ではなく消費優先で読みを固定する。

## 決定

### 1. 値スロット枝が現在トークンを照合消費できるなら、その読みが引数なし枝に優先する

同一トリガの variant 競合 (値スロット枝 `:set` vs 引数なし枝 `:set:always` 等) において、値スロットが直後トークンを**照合消費できる** (型 parse / values の or 照合が通る) なら、その読みを採用する。**後続文法 (positional 等) の充足可能性を理由に引数なし枝へ再解釈しない**。

- これは選好ではなく **cut** (確定): 消費読みの先で経路が不成立になっても引数なし枝へ backtrack しない
- 「食えない」場合 (直後トークン不在 / 型 parse 失敗 / values の or 全枝不一致) は従来どおり引数なし枝が生きる (DR-081 §4 の裸 `--color` / `--color --verbose` の帰結は不変)

### 2. 帰結 (positional 同居時)

定義: DR-081 §4 の canonical 例 + string positional が同居する場合の `--color always`:

- **positional が暗黙必須 (plain)**: `:set` が always を食い、positional は供給トークンを失って **missing_operand の failure**。「引数なし枝 + positional が always を食う」完全経路が存在しても採用しない (cut)
- **positional が明示 optional (`repeat:{min:0,max:1}`)**: `:set` が always を食い、positional は 0 反復 `[]` で **success**。両経路成立による ambiguous は生じない (cut が variant 内の読みを一意化する)

### 3. DR-038 (完全経路 ambiguity) との関係

DR-038 の「完全経路がちょうど 1 本で成功」は経路空間全体の判定原理として不変。本 DR はその**手前**で variant 内の読みを消費優先で一意化する局所規則であり、経路空間に投入される読みの数を減らす。DR-041 §4 (発火した greedy の値スロット raw 消費) の「発火したら食う」という方向性の、variant 競合面への延長にあたる。

## 採用しなかった案

### 完全経路の成立可能性で枝を選ぶ (救済つき解釈)

positional の required/optional 宣言というトリガから遠い属性で `--color always` の意味が変わる。ユーザの直感 (option の直後の値は option のもの) に反し、定義の遠隔変更が挙動を非局所的に変える。

### 両経路成立時を ambiguous とする

optional positional 同居で `--color always` が常にエラーになり、正当な用法が書けなくなる。cut による一意化の方が実用に整合する。

## 波及

- fixtures/value-sources/set-always-variant-branch.json に positional 同居 2 case (required → missing_operand failure / optional → success + `[]`) を追加
- 既存 4 case の帰結は不変 (why の導出根拠に本 DR を追記して整合させる)
- kuu.mbt: values decode 対応 (issue values-decode-support) の実装時に本 DR の cut 意味論を含めて追従

## 関連

- DR-081 §4 (canonical 例) / DR-038 (完全経路 ambiguity) / DR-041 §4 (greedy raw 消費) / DR-071 (variant 記法)
- issue values-variant-branch-competition (経緯、残論点の決着)
