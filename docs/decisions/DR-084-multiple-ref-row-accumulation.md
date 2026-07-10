# DR-084: multiple×ref — 発火値 row を単位とする累積

> 由来: issue ref-nested-consumption-fixture-gap 論点 3 (multiple×ref の row 累積意味論が fixture 未整備) + kuu.mbt issue multiple-ref-accum-gap (accumulator 未配線で decoder 受理入力が scalar last-wins に落ちる)。ref-template-result-shape サイクルの codex レビュー (2026-07-09) が検出。既存 DR の合成から一意に導出可能なため、導出を DR として記録する (kawaz の「推奨順でどんどん進めて」指示による自律起草、2026-07-10)。

## 決定

### 1. multiple×ref は合法で、累積単位は発火値 = row

multiple の畳み単位は**発火値** (DR-034: multiple = 複数発火の値折り。fixtures/multiple-parse/append.json が scalar で pin 済み)。ref 要素の発火値は **row** (or 枝の row 形、DR-078 §1 / DESIGN §2.4-2.5。fixtures/multiple-parse/last-wins-repeat-rows.json が「multiple 無し = セル上書き」側を pin 済み)。よって:

```json
{"name": "hlcolors", "ref": "color", "long": true, "multiple": "append"}
```

- 発火ごとに row を append: `--hlcolors red --hlcolors 0 128 255` → `[{"colorname":"red"}, {"r":0,"g":128,"b":255}]`
- 1 発火でも要素 1 件のリスト、0 発火でも `[]` (DR-044 一様配列 / DR-051 §2 — リスト形はセルの属性であって発火回数由来ではない)
- effects は row の leaf entity ごとの set が消費順に並ぶ (last-wins-repeat-rows.json と同じ見え方)。multiple の有無は effects を変えない — 変わるのは result 確定時の fold だけ (DR-045 の collapse 機序と同型)

### 2. ref×repeat×multiple は発火境界を保存する (row 配列の配列)

repeat 持ち ref 要素の発火値は「repeat 1 発火分の row 配列」(T[]、last-wins-repeat-rows.json の上書き単位と同一)。multiple の畳み単位は §1 のとおり発火値なので、append の結果は **T[][]** — 発火境界が外側の配列に保存される:

```
--hlcolors red blue --hlcolors green
→ [[{"colorname":"red"},{"colorname":"blue"}], [{"colorname":"green"}]]
```

flatten は採らない。DR-034/043 の軸分離 (repeat = 1 発火内の構造反復、multiple = 発火間の累積) を fold で混ぜない。**両形は宣言で選べる**: 平坦な row リストが欲しければ repeat を外して multiple のみ (発火 1 回 = row 1 個、§1 の形)、発火単位のグルーピングが欲しければ repeat×multiple — 表現力が重複しないことが軸分離の実利である。

### 3. merge accumulator × ref は definition-error

DR-080 §2 のマーカー語彙は separator 分割された string piece 列が前提 (piece 全体一致、operand は要素 type で parse)。ref 要素の発火値は消費文法の産物である row で、piece 列を持たない — マーカーの認識対象が構造上存在しない。宣言時に静的に既知の不成立構成なので definition-error (kind=invalid-range、DR-082 §2 / DR-083 §5 の「静的に既知は定義時に倒す」と同筋)。

## 採用しなかった案

### repeat×multiple の flatten (発火境界を捨てて row を平坦連結)

§2 のとおり multiple のみで平坦形が表現できるため、flatten は repeat×multiple を multiple 単独の冗長表記にする (表現力の重複)。発火境界の保存は repeat×multiple でしか表現できず、こちらを捨てると帰結の非対称が生じる。

### merge×ref をマーカー不活性の上書きとして許容

DR-080 §3 の「マーカーなし発火 = 上書き」に落とすと merge 宣言が恒久に無意味 (old 参照経路が構造上使えない) なまま静かに動く。無意味な宣言を黙って受理するより定義時に落とす (DR-083 §5 と同じ判断)。

## 波及

- fixtures: multiple-parse/ に §1 (ref-rows-append)・§2 (ref-repeat-rows-nested) の pin、definition-error/ に §3 (merge-ref) の pin
- kuu.mbt: issue multiple-ref-accum-gap の解消 — ref 要素 (ref_target 持ち) にも accumulator を配線 (installer の entity 登録スキップの解除)、repeat×multiple の発火境界保存、merge×ref の decode 時 definition-error
- issue ref-nested-consumption-fixture-gap は論点 3 の fixture 追従完了時に close

## 関連

- DR-034 (multiple = 複数発火の値折り) / DR-043 (repeat と multiple の軸分離) / DR-044 (一様配列) / DR-051 §2 (0 発火 = [])
- DR-078 §1 (templates / ref、row の由来) / DR-080 §2-3 (merge マーカー語彙の前提) / DR-082 / DR-083 §5 (静的既知の definition-error)
- fixtures/multiple-parse/append.json / last-wins-repeat-rows.json (両側の既存 pin)
- issue ref-nested-consumption-fixture-gap / kuu.mbt issue multiple-ref-accum-gap (経緯)
