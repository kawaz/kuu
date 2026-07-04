# DR-057: alias — 独立要素の別入口、参照ファミリーの 3 人目、name 導出入口の再導出継承

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-008 (コマンドエイリアス) と issue `2026-07-03-alias-normalization-help-completion-installer` の alias 正規化。本セッションの議論で確定 (short alias の貼り方の検討から独立要素形と継承原理が定まった)。

## 決定

### 1. alias は独立要素で書く (canonical 側リストではない)

```json
{"name": "port", "type": "int", "long": [], "short": "p"}     // canonical
{"alias": "port", "short": "n"}                                // -n
{"alias": "paths", "name": "files"}                            // --files (+ 継承 variant、§3)
{"alias": "checkout", "type": "command", "name": "co"}         // git co
{"alias": "port", "short": "o", "deprecated": true}            // 旧入口 -o (この入口限定の警告)
```

- **入口形式は alias 要素自身の宣言で決まる** (short:"n" と書いたから -n)。canonical 側リスト (`aliases: ["n"]`) だと option 文脈で「--n か -n か」の入口軸曖昧さが生まれる — 独立要素形は構造的にこれを持たない
- deprecated 等の属性が要素属性としてそのまま乗る (混在配列のような特別な形が要らない)

### 2. alias は参照ファミリーの 3 人目

`ref` (構造を継承する) / `link` (値セルへ同期する) / **`alias` (別入口になる)** — いずれも「指す先を書く」参照フィールド。フィールド名は単数 `alias` (動詞的に「port を alias する」)。複数形 aliases は「私の別名一覧」(canonical 側リスト) を連想させ、既存パーサ (clap 等) でその意味に使われているため不採用。

意味論は **link + 表示帰属**:

- 効果は canonical の実体セルへ (link 同型)。alias 経由の起動も実体の committed を立てる — 実体側の制約 (requires / conflicts_with 等) は自然に効く
- **結果キーは canonical のみ** (alias は結果スコープを作らない)。どの入口が発火したかは ParserContext の selected_names (DR-016) と内部 id (DR-046 §4)
- **表示帰属**: help では canonical の行に別名として併記し、独立要素として一覧しない。deprecated な alias で起動されたら「use <canonical の入口> instead」を警告できる (canonical は alias の指す先から自動導出)。これらは help / completion installer の参照 (DR-056) の実例

### 3. 継承原理: name 導出型の入口は新 name で再導出、明示綴りは非継承

alias は canonical の宣言を継承する (ref と同じ) が、入口宣言の扱いは綴りの由来で決まる:

> **name から導出される入口 (long 配列 = variant DSL 込み、command の name 照合) は、alias 要素の name で再導出される。明示綴りの入口 (short) は継承されない。**

- `{"alias": "paths", "name": "files"}` → canonical の `long: ["no:set:..."]` が files で再導出され、**--files も --no-files も効く**
- 再導出は **variant の affix 構造 (DR-011 の prefix) と name の合成**で行う — 具象綴りの文字列置換ではない (lowered 表現は affix を保持する必要がある。具象 trigger からの substring 復元は退化ケースで誤判定する、slice PoC 第 16 弾の flag)
- `long: []` を明示すると差分上書き (DR-007 と同じ) — variant が切れて素の --files のみ。書かないのが基本形
- short を継承しないのは衝突回避の必然 (継承すると canonical の -p を alias も生成し同一スコープ重複トリガになる)。alias 側で自分で書いた short だけが立つ
- **値源 (env / default)・結果キー・制約は実体側のまま** — alias は入口だけの存在で、これらを継承・再宣言しない

### 4. alias installer (所有) と lowering

`alias` 属性は **alias installer** の所有語彙 (DR-042 canonical セット)。lowering は既存パターンの再利用で閉じる:

- alias 要素の宣言 (自 name + 継承 long / 自 short 等) から入口衛星の宣言を作り、canonical 実体への ref/link 衛星として宣言層に追加する (global installer の宣言的コピーと同型)。実際の衛星展開は long / short / command installer が不動点反復で行う — alias installer は入口形式を知らない
- 表示メタ (canonical への帰属、deprecated) は宣言層に inert に残り、help / completion installer が参照する (DR-056)

## 採用しなかった案

### canonical 側リスト (`aliases: ["co", "ck"]`)

option 文脈の入口軸曖昧さ (§1)。command のような一義文脈に限れば成立するが、2 形を持つ価値が薄い (独立要素形は全文脈で一義)。将来必要なら「各綴りを独立要素へ展開する糖衣」として追加検討。

### exact の文字列配列拡張 (F-008 選択肢 B)

exact は照合プリミティブであり、alias の関心 (表示帰属・deprecated・結果キー統合) を運べない。プリミティブを太らせない。

### aliases (複数形) / alias_of

複数形は canonical 側リストの語 (誤読リスク)。alias_of は一義だが ref / link と接尾辞の流儀が揃わない。

### deprecated の混在配列 (`aliases: ["co", {"name": "ck", "deprecated": true}]`)

独立要素形なら要素属性で一様に書ける。特別な配列形は不要。

## 射程外

- help 表示の具体レイアウト (canonical 行への併記形式) は canonical help レンダラの関心 (AST 契約ではない)
- 補完での alias 展開切替 (未入力 tab-tab は canonical のみ、途中入力は alias も) は補完 DR (partial parse と同時) で確定する

## 関連

- DR-042 (installer — 宣言的コピーの同型パターン、canonical セット追加)
- DR-056 (所有 vs 参照 — alias 語彙の所有は alias installer、表示活用は参照)
- DR-007 (ref の継承 + 差分上書き — §3 の原理の親)
- DR-029 (link — 効果の同型)
- DR-016 (selected_names) / DR-046 §4 (内部 id — 発火入口の特定)
- DR-052 (結果キー軸 — alias は結果キーを作らない)
- findings `2026-06-29-ast-missing-pieces.md` F-008 (解消)
- issue `2026-07-03-alias-normalization-help-completion-installer`
