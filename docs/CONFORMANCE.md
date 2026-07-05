# kuu conformance fixture 仕様

> conformance fixture は kuu 仕様準拠の正本であり、全言語実装が共有する言語非依存のテストデータ集合である (ROADMAP)。「移植の定義 = fixture を pass させること」。本書はフォーマットと比較規約の現役仕様。判断経緯は DR-065 (および DR-063 / DR-053 / DR-045) を参照。

## 1. fixture ファイル

1 ファイル = 1 定義 + 複数 case。素の JSON (コメント構文なし、意図は `why` フィールドで持つ):

```json
{
  "why": "<このファイルが固定する仕様輪郭。DR 根拠を文中に書く>",
  "query": "parse",
  "definition": { ... },
  "cases": [
    {"why": "<なぜこの入力で、なぜこの期待か>", "argv": ["..."], "expect": { ... }}
  ]
}
```

| フィールド | 必須 | 内容 |
|---|---|---|
| `why` | ✓ | file / case の両レベルで必須。仕様意図と DR 根拠。lint は why 欠落を検出する |
| `query` | ✓ | `"parse"`。`"lower"` / `"complete"` / `"definition_error"` は予約 (フォーマット未確定、後続で定義) |
| `definition` | ✓ | **wire form** (DR-063: 純構文正規化 (LOWERING §C.4) 適用済み + installer 語彙 inert + type 参照はそのまま) |
| `cases[].argv` | ✓ | 前処理済みトークン列 (`Array[String]`、DESIGN §0.1) |
| `cases[].expect` | ✓ | §2 の outcome union |

## 2. expect — DR-053 の outcome union

### success

```json
{"outcome": "success",
 "effects": [{"entity": "a", "op": "set", "operand": true, "source": "cli"}],
 "result": {"a": true}}
```

- **`effects` が判定の正本** (主 oracle、LOWERING §C.5)。要素は `{entity, op, operand?, source}`。**配列順 = 適用順** (効果列の順序は同一性成分、DR-038/045)
  - `entity`: 実体 (値セル) の name / id
  - `op`: `set` / `default` / `unset` / `empty` (DR-045。通常の値バインドは set)
  - `operand`: op が要求する場合のみ。JSON 表現は canonical 規約 (数値は最短形 `1.0` → `1`、DR-050 §4)
  - `source`: 値源タグ (DR-031)。parse fixture では `cli` のみ登場する (下記)
- **effects に載るのは cli / link 由来のパース時効果のみ** — 値源ラダー充填 (env / config / inherit / default) は完走後の値確定であり argv 順の全順序を持たないため、その結果は `result` 側で検証する (例: 未発火 flag の `false` は result に現れ、effects には現れない)。source 検証つきの effects 拡張は値源系 fixture (フェーズ 2) で確定する
- **`result` は最終結果オブジェクト** (ラダー充填込みの確定値、DR-051 の absent 規則適用後)。runner は effects / result の両方を検証する

### failure

```json
{"outcome": "failure",
 "errors": [{"element": "x", "argv_pos": 2, "kind": "parse", "reason": "missing_operand"}],
 "fired_action": "help"}
```

- `errors`: 全保持の配列 (DR-053/066)。**message は仕様でない** (文言はレンダラ) ため fixture に書かず比較しない
- `reason`: 機械可読な失敗理由の識別子 (DR-066)。**fixture では optional 検証** — 書けば検証、書かなければ kind まで。発生源の emit しうる reason は descriptor の `reasons` 宣言 (DR-061/066) に列挙され、「定義に登場する全パーツの reasons の和 vs fixture のカバー」の完備チェックに使える
- `argv_pos` は 0-based。トークンが尽きて要求が満たせない失敗は `argv.length` (= 次に要求した位置) を指す
- `element` の**省略 = 特定要素に紐付かないスコープレベルの躓き** (残余トークン等)
- `kind` の割当 (DR-065 §3):
  - `parse` — 型照合・経路構築の失敗。**構造的必須の不成立** (required 属性なしの positional がトークンを得られない、reason: `missing_operand`) と**残余トークン** (element 省略、argv_pos = 残余先頭、reason: `unexpected_token`) を含む
  - `filter` — filter chain の Error (DR-037)。reason は filter の descriptor 宣言 (例: in_range の `too_small` / `too_large`)
  - `constraint` — 遅延述語の違反 (DR-047)。reason: `required_violated` / `requires_violated` / `exclusive_group_violated` / `conflicts_with_violated` (`<属性名>_violated` で統一、DR-066 §3)
- `fired_action`: 失敗時アクション (DR-048) が発火した場合のみ

### ambiguous

```json
{"outcome": "ambiguous",
 "interpretations": [{"n": 1, "f": true}, {"n": 1}]}
```

- `interpretations`: 全解釈の列挙、各解釈は結果オブジェクト形のビュー (DR-053)

## 3. 比較規約

- **構造等価** (DR-063 §4): key 順序非規範、フィールド省略 = default 値と等価。byte 一致は要求しない
- effects は配列順込みの完全一致 (順序が同一性成分)
- result / interpretations は構造等価
- errors は集合比較 (element, argv_pos, kind, reason の組。**reason は fixture 側に書かれている要素でのみ比較対象** (§2 の optional 検証)、message は常に無視)

## 4. ディレクトリ構成

```
fixtures/<機能領域>/*.json     例: fixtures/dd/ fixtures/repeat/ fixtures/constraints/
fixtures/lowering/<installer>/  lowering 段階別 fixture (query: "lower"、フォーマットはフェーズ 2 で確定)
```

DR への遡及は各 `why` 内の DR ref で辿る (機能領域は複数 DR の合成で決まるため、DR 番号をディレクトリ名にしない)。

## 5. runner の契約

各言語実装の fixture runner は:

1. `definition` (wire form) を parse_definition に通す (definition-error になったらその fixture は fail)
2. 各 case の `argv` で parse を実行し、outcome を §2 の JSON 形へ射影する
3. `expect` と §3 の規約で比較する

効果列の観測 (effects の出力) は実装の内部表現から §2 の形へ射影できれば足り、内部表現自体は自由 (DR-041/042 の「観測挙動が同一なら実装表現は自由」)。

## 関連

- DR-065 (本フォーマットの判断記録) / DR-063 (wire form) / DR-053 (outcome union) / DR-045 (効果記述子) / DR-047 (制約評価)
- LOWERING §C.5 (二段比較戦略)
- ROADMAP (フェーズ 2 = slice 167 テストからの蒸留)
