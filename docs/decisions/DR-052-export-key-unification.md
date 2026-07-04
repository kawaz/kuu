# DR-052: 結果キー軸の一本化 — export_key: string | null、export (bool) は廃止

> 由来: issue `2026-07-03-export-result-semantics` (DR-046 が射程外にした結果キー軸の表現)。slice PoC 第 4 弾の presence marker 観測 (起動された空コマンドが `{}`) が材料。本セッションの議論で確定。

## 決定

### 1. export_key 1 フィールドへの一本化 (export bool は廃止)

結果キー軸のフィールドを `export_key` の 1 本にする:

| 値 | 意味 |
|---|---|
| 未指定 | name 由来のキーで露出 (デフォルト供給、DR-046) |
| `"<名前>"` | そのキー名で露出 |
| `null` (または `""` — null に正規化) | **結果キー軸なし** (下記 §2 の透過) |

- `export` (bool) フィールドは廃止する
- bool 値は書けない (定義時検査で invalid、F-035 の領域)
- フィールド名が `export_key` であるのは意味論との一致による: 本フィールドは「出す / 出さない」のスイッチではなく**結果キーの指定**であり、null は「キーが無い」。値の伝搬は止まらない — 「export しない」のではなく「名前が無くなるだけ」

### 2. export_key: null = nameless 同化の透過

結果キー軸を持たない要素の露出挙動は、**name 無しノードと同一** (DESIGN §2.3〜2.5 の既存規則がそのまま適用され、新しい特例を持たない):

- kv 文脈 (options 直下等) では値ごと現れない (「kv には結果キー持ちだけ現れる」)
- seq 文脈では値が親の配列要素として残る (配列の形は変わらない — from_entries の 2 要素 seq 等の下流を壊さない)
- 露出規則 (§2.4 の「最も浅い name 層」) では export_key: null の層を結果キー層と数えない — 子の結果キー持ちが昇格して露出する
- **lexical スコープ (name、DR-033) と id (ref/link、DR-046) は不変** (直交)。「color テンプレを非露出で定義し bg/fg から ref する」用例 (DR-043) は保たれる

### 3. presence marker の一般規則: name スコープは選ばれたら空でも `{}`

結果キーを持つスコープ生成要素 (command 含む) は、**選ばれたら子が全部 absent でも空 kv `{}` という値を持つ** — スコープ生成 = 値の発生であり、反復系が 0 回でも `[]` を持つ (DR-044 / DR-051) のと同型。選ばれなければ absent (DR-051)。「command が選ばれた」という情報は値の形で結果に残る。export_key: null のスコープは選ばれてもキーが無い (子が昇格露出するのみ)。

### 4. DR-051 との整理 (null の区別)

DR-051 の「null は kuu の値空間に存在しない」は**値セルに流れる値**の話であり、export_key: null は**軸メタの「無指定の明示」**である。null という値がパイプラインや結果オブジェクトに流れることは依然としてない。`""` を null に正規化するのは、キー名として空文字が無意味であることと、null を書けないフォーマット経由の UsefulAST 生成への逃げ道を兼ねる。

## 採用しなかった案

### export: string | false への一本化 (議論の当初案)

false が「出力の on / off」を示唆するが、確定した意味論は透過 (値は流れる、キーが無くなるだけ)。seq 文脈で値が残ることが「export しないのに残る」という名前起因の驚きになる。単一の意味 (結果キーの指定) には export_key: string | null が素直。

### export (bool) + export_key の 2 フィールド維持 (旧形)

矛盾組合せ (`export: false` + `export_key: "x"`) が書けて未定義になる。DR-046 の軸モデル (id / value_name / display_name は軸ごと 1 フィールド) との非対称も残る。

### 完全消滅 (subtree ごと値も結果から消す)

露出規則への新特例になり、seq の配列の形が変わって下流 (from_entries の 2 要素 seq 等) を壊しうる。透過は既存規則 1 本で閉じる。

### 値域を string のみ ("" だけで「無し」を表す)

AST 全体で「null を書かない」が一様にはなるが、「空文字 = 無し」という規約の暗黙度が上がる。null は JSON の直観に沿う (空文字は正規化で同義に受ける)。

## 射程外

- definitions 内要素の露出 opt-in はしない (export_key を付けても definitions はテンプレ置き場のまま結果に出ない、DESIGN §10.4)
- help / エラー表示上の名前は display_name / value_name の軸 (DR-046) であり本 DR の対象外

## 関連

- DR-046 (名前の軸分解 — 結果キー軸のフィールドが本 DR で確定、射程外の解消)
- DR-025 / DR-033 (露出規則・lexical スコープ — 透過の導出元、スコープ生成は name のまま不変)
- DR-016 (結果オブジェクトの構造化 — export (bool) の出所、Superseded 注記)
- DR-051 (absent / null 非採用 — presence marker との両立、値空間と軸メタの null の区別)
- DR-043 (非露出テンプレ用例 — 直交性で保たれる)
- DR-044 (反復系の `[]` — presence marker の同型)
- DESIGN §15.5 (露出キーの一意性検査 — 変更なし、export_key の値にそのまま適用)
- issue `2026-07-03-export-result-semantics` (解消)
- slice PoC 第 4 弾 (presence marker の観測)
