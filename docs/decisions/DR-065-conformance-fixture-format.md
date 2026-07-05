# DR-065: conformance fixture フォーマット — parse fixture の構造と比較規約

> 由来: フェーズ 1 の C 群議論 (docs/issue/2026-07-04-phase1-serialization-design-agenda.md C-1〜C-8)。conformance fixture は仕様準拠の正本 (ROADMAP) であり、そのフォーマット自体が仕様の一部になる。現役仕様の正本は docs/CONFORMANCE.md、本 DR は判断記録。

## 決定

### 1. fixture の構造

1 ファイル = 1 定義 + 複数 case:

```json
{
  "why": "<このファイルが固定する仕様輪郭 (DR 根拠込み)>",
  "query": "parse",
  "definition": { ...wire form (DR-063)... },
  "cases": [
    {"why": "<なぜこの入力で、なぜこの期待か>",
     "argv": ["..."],
     "expect": { ... }}
  ]
}
```

- **definition は wire form (宣言層、DR-063)** — 糖衣展開・installer lowering の検証は lowering 段階別 fixture が専任し、parse fixture は評価器 (+ 決定的 lowering) の検証に純化する。糖衣込み定義を混ぜると「糖衣展開の差」と「評価の差」が 1 つの fail に混ざる
- **`why` は file / case の両レベルで必須** — テスト = 真の仕様書の原則 (意図コメントの省略は禁則) を fixture でも維持する。コメント構文でなくデータなので、runner のレポート表示や lint (why なし検出) の機械利用ができる
- **`query` タグ**: `"parse"` を本 DR で定義。`"lower"` (lowering 段階別) / `"complete"` (DR-060) / `"definition_error"` (DR-054) は**予約** — フォーマット破壊なしに後続追加できる拡張点。lower はフェーズ 2 の蒸留開始時に確定する

### 2. expect は DR-053 の outcome union をそのまま転用

fixture 専用の簡略形は作らない (公理を増やさない — 仕様の返値構造がそのまま fixture 語彙になるのが spec-as-core として最も素直):

```json
{"outcome": "success", "effects": [...], "result": {...}}
{"outcome": "failure", "errors": [{"element": ..., "argv_pos": ..., "kind": ...}], "fired_action": ...}
{"outcome": "ambiguous", "interpretations": [{...}, {...}]}
```

- **effects (効果列) が判定の正本** (LOWERING §C.5 の主 oracle)。要素は `{entity, op, operand?, source}`、**配列順 = 適用順** (DR-045/063)。operand の JSON 表現は canonical 規約 (数値最短形等、DR-040/050)
- **`sources` (optional、2026-07-05 拡張)**: entity → 値源タグのマップで最終値の由来 (DR-031 ラダーの決着) を検証する。値源系 fixture の主語彙。ラダー充填を effects に載せる案は「充填同士の順序が非規範で effects の全順序規約を汚す」ため不採用 — 由来はマップ (順序なし) で検証するのが意味論に忠実
- **result (結果オブジェクト) は可読性のための併記** (効果列から導出可能)。runner は両方検証してよい
- **エラー message 文字列は比較対象外** — kind / element / argv_pos が仕様、文言はレンダラ (DR-053/054)
- 比較はすべて構造等価 (DR-063 §4)

### 3. error kind の割当 (DR-053 の 3 値の適用精密化)

- 明示 `required: true` の未充足 = **constraint** (DR-047 の値充足述語、slice 第 13 弾実測)
- **構造的必須の不成立** (required 属性なしの positional がトークンを得られない) = **parse**。required は default で充足しうる「最終状態の値述語」なのに対し、構造的不足は経路が組めない段階の話で層が違う
- **残余トークンによる不成立** (全要素消費後にトークンが余る) = **parse**、element は行き詰まったスコープ、argv_pos は残余先頭位置。古典 CLI の「unexpected argument」に相当する情報を errors で表現する

### 4. ディレクトリ構成は機能領域別

`fixtures/<領域>/*.json` (`fixtures/dd/` / `fixtures/repeat/` / `fixtures/constraints/` 等)。1 つの挙動は複数 DR の合成で決まる (dd = DR-041 + 042 + 064) ため DR 番号ベースでは置き場が一意にならない。DR への遡及は `why` 内の DR ref で辿る。lowering 段階別は `fixtures/lowering/<installer>/` の別枝 (フォーマットはフェーズ 2)。

## 採用しなかった案

### fixture 専用の期待値簡略形

DR-053 union との二重語彙になり、fixture 読者が仕様と別の形を学ぶことになる。

### JSON5 / JSONC / 隣接 .md によるコメント

JSON5/JSONC は「各言語の JSON パーサがそのまま読める」制約を破る (パーサ依存の追加)。隣接 .md は fixture と意図が物理分離して乖離する (テスト = 真の仕様書に反する)。

### definition を UsefulAST (糖衣込み) にする

lowering の検証と評価の検証が 1 つの fail に混ざり切り分けが濁る。lowering は段階別 fixture の専任。

### DR 番号ベースのディレクトリ

複数 DR 合成の挙動の置き場が一意に決まらない。

## 射程外

- `"complete"` / `"definition_error"` の各フォーマット詳細 (query タグは予約済み、確定は後続。`"lower"` は DR-070 で確定済み)
- byte 厳密比較の明示タグ (exact 照合の codepoint 規約等は canonical 規約側で担保済み。fixture 側タグは実需が出た時に定義)
- fixture runner の実装 (契約は CONFORMANCE.md、実装はフェーズ 2-3)
- JSON Schema による fixture スキーマの機械化 (F-042/F-048 と同時)

## 関連

- docs/CONFORMANCE.md (現役仕様の正本 — 本 DR の決定を規範として記述)
- DR-063 (wire form — definition の形式)
- DR-053 (outcome union — expect の語彙)
- DR-045 (効果記述子 — effects の要素)
- DR-047 (required の値充足 — §3 の constraint 側)
- DR-040 / DR-050 (canonical 値規約 — operand の JSON 表現)
- LOWERING §C.5 (二段比較戦略 — effects 正本の出所)
- docs/issue/2026-07-04-phase1-serialization-design-agenda.md (C 群の議論経緯)
