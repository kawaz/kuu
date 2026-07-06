# DR-073: export-key 衝突の担体 — ambiguous 維持 + 解釈ごとの optional claimants 面

> 由来: issue `2026-07-05-distill-spec-gaps` の論点 7。`fixtures/export-key/collision.json` の co-exposure-collision case で両解釈が `{x:true}` に退化し ambiguous 期待が弱かった (露出キー衝突時の interpretations 表現が未詰め)。衝突解釈を何で区別するかを確定する (kawaz 裁定 2026-07-06)。

## 決定

### 1. 担体は ambiguous 維持 + 解釈ごとの optional claimants 面

露出キー衝突 (DESIGN §15.5、同じ export_key へ解決する相異なる 2 要素が同一入力で共露出) は **ambiguous のまま**扱う (DR-021 のオントロジー継続、下記 §5)。interpretations の各解釈は結果オブジェクト形のビュー (DR-053 §3 の骨格温存) のままとし、衝突解釈を区別するため解釈ごとに optional の **`claimants` 面** (露出キー → その解釈で当該キーを占める実体 entity の name の写像) を添える。

- 衝突しない通常の ambiguous (構造的に異なる複数の完全経路) は claimants を持たない — ビューだけで解釈が区別できる (例: `{n:1,f:true}` vs `{n:1}`)
- 衝突による ambiguous では、値が退化 (両者 flag で共に `{x:true}`) しても claimants が解釈を区別する

### 2. 識別子は実体 entity (値でも source でも区別不能)

衝突の本質は「**どちらの要素が結果キー x を占めるか**」= 結果キーの provenance の曖昧さであって、値の相違ではない:

- **値では区別不能**: 両者 flag なら共に `true`、同型の値を持つ要素同士なら値が一致する
- **source でも区別不能**: 両者とも同じ値源タグ (例: `cli`) になりうる

値の実体セルは 1 値につき 1 つで、他の入口 (alias / link) はその実体へ束ねられる (DR-052 の結果キー軸一本化 / DR-029 の link = 値同期 / DR-030 の実体ノード)。したがって **実体 entity の name が解釈間で一意な識別子**になる。claimants はこの entity name を露出キーに対応づける (`{"x": "a"}` = 解釈内でキー x を実体 a が占有)。

### 3. fixture 表現の順序非依存性 (設計判断)

interpretations は集合比較 (CONFORMANCE §3、完全経路間に優先がない DR-038 ため列挙順は同一性成分でない)。claimants を解釈に対応づける表現は、集合の並べ替えで対応が切れてはならない。

- **不採用: 並行配列** (`interpretations: [...]` と対の `claimants: [...]` を expect 直下に置き位置で対応): interpretations が集合として並べ替わると位置 → claimants の対応が silent に切れる。退化ビュー (両解釈とも `{x:true}`) では位置以外に対応の手がかりが無いため特に危険
- **採用: 解釈に claimants を束ねた組**: claimants を持つ解釈を `{"result": <ビュー>, "claimants": <写像>}` の 1 要素として書く (DR-053 §3 の canonical `{result:...}` 形 + `claimants` sibling)。集合比較が (view, claimants) の対を単位として突き合わせるため順序に依存しない。退化ビューでも claimants が異なれば組として distinct になり、2 解釈が集合比較で保たれる
- claimants を持たない解釈は従来どおりビュー直書き `{...}` (result 単独フィールドの省略形)。既存の ambiguous fixture (衝突でないもの) はこの形のまま無変更

**ビュー温存との両立**: claimants を別面 (`result` の sibling) に分離することで、ビュー自身は素の結果オブジェクトのまま保たれる (キー x の値は素の `true`、provenance だけ claimants に切り出す)。値をオブジェクト化して provenance を混ぜる案 (§採用しなかった案) と違い、下流が「このキーは素値かオブジェクトか」を場所ごとに判定せずに済む。

### 4. lint: 別綴り co-export には link 提案

同一の実体を 2 つの export_key へ流したいだけの co-export 宣言 (= 同じ値を別綴りのキーでも受けたい) には、**「link (alias) で足りる」と提案する** (§15.6 の静的 warn の精密化)。link なら 1 実体を複数入口が共有し、結果キーは canonical のみで衝突しない (DR-057)。

ただし hiragana/katakana → furigana のように **別実体・別制約を同じ結果キーへ co-export したい正当な用例**もある (2 つの独立した入力を 1 つの結果キーへ寄せる意図)。したがって lint は **提案止まり** — reject しない (DR-021 の「warn はする、reject はしない」を継承)。

### 5. DR-021 のオントロジー (衝突 = ambiguous) 継続

「露出キー衝突 = 実行時 ambiguous、静的は warn どまり」という DR-021 の位置づけはそのまま。claimants は ambiguous の中身を診断可能にする面の追加であって、衝突の分類 (ambiguous) 自体は変えない。衝突は「入力を全消費する解決経路が複数あって 1 本に絞れない」(露出段で解釈が分岐) の一種であり、ambiguous の既存意味に収まる。

## 採用しなかった案

### 独立 outcome `"collision"` (4 値目)

層分離としては正しい (衝突は「解釈の多重性」ではなく「provenance 競合」) が、DR-053 の 3-outcome discriminated union (success / failure / ambiguous) を破って 4 値目を増やす。衝突は全消費する完全経路が複数立つ ambiguous の一種であり、DR-021 の既存オントロジーに収まる。新 outcome を足す設計コスト (全実装・全 fixture・全レンダラの分岐追加) に見合わない。claimants 面の追加で ambiguous 内に診断材料を持てるので独立 outcome は不要。

### 値のオブジェクト化 (ビューに provenance を混ぜる)

衝突キーの値を `{value: true, claimant: "a"}` のようにオブジェクト化して provenance を埋め込む案。ビューの型が場所依存になる (衝突キーだけオブジェクト、他キーは素値) ため、下流 (result を消費するコード) が「このキーはオブジェクトか素値か」を場所ごとに判定する羽目になり、DR-053 §3 のビュー温存 (結果オブジェクト形で差分が読める) を壊す。claimants を別面に分離すればビューは素のまま保たれる。

### failure 化 (衝突を failure outcome に倒す)

parse は成功している (完全経路が立っている) のに failure にすると意味論が濁る。衝突は「解決経路が複数あって 1 本に絞れない」= ambiguous であって「解決経路が無い」= failure ではない。errors 構造 (躓きの記録) に載せるべきものでもない (どこでも躓いていない)。

## 関連

- DR-053 (パース結末の構造 — interpretations の結果オブジェクト形ビュー、§3 骨格温存。本 DR は claimants 面を追加) / docs/CONFORMANCE.md §2 ambiguous・§3 (現役仕様の正本)
- DR-021 (露出キー一意性検査は実行時、衝突 = ambiguous のオントロジー — §5 で継続)
- DR-038 (完全経路の一意性・優先なし — interpretations 集合比較 / 順序非依存性の根拠、§3)
- DR-052 (結果キー軸の一本化 — export_key、実体セルは 1 値 1 つ / 識別子に entity を使う根拠、§2)
- DR-029 (link = 値同期、1 実体:N 参照) / DR-030 (実体ノード) — link/alias が入口を実体へ束ねる (§2/§4)
- DR-057 (alias — 別入口・canonical 結果キー、lint の link 提案先、§4)
- DESIGN §15.5 (露出キー衝突の実行時検出 — claimants 言及を追加) / §15.6 (静的 warn — link 提案の精密化、§4)
- issue `2026-07-05-distill-spec-gaps` 論点 7 (解消)
