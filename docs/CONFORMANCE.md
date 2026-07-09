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
    {"id": "<安定 slug>", "why": "<なぜこの入力で、なぜこの期待か>", "argv": ["..."], "expect": { ... }}
  ]
}
```

| フィールド | 必須 | 内容 |
|---|---|---|
| `why` | ✓ | file / case の両レベルで必須。仕様意図と DR 根拠。lint は why 欠落を検出する |
| `cases[].id` | ✓ | case の安定 slug (DR-072)。kebab-case (`[a-z0-9]` と `-`)、**fixture 内 unique**、意図を表す 2〜4 語 (通し番号禁止)。case オブジェクトの先頭キーに置く。参照表記は `rel::slug` (例 `dd/basic::empty-argv`)。lint は id 欠落・重複を fixture 不備として検出する。parse 入力ではない (メタ) ため §2/§3 の比較には影響しない。**`cases[]` を持つ fixture 固有** — lower fixture (`query: "lower"`, DR-070) は単一トップレベル expect 形式で `cases[]` を持たず、参照は `rel`(`::lower`) で位置非依存のため id 対象外 |
| `query` | ✓ | `"parse"` (本書 §2) / `"lower"` (lowering 断面、DR-070 — `installers` 列挙 (省略 = 全登録、順序非規範)、expect は DR-063 §3 の面構造を緩比較、順列検査は runner 組み込みで fixture に順列を列挙しない)。`"complete"` / `"definition_error"` は予約 |
| `definition` | ✓ | **wire form** (DR-063: 純構文正規化 (LOWERING §C.4) 適用済み + installer 語彙 inert + type 参照はそのまま) |
| `cases[].argv` | ✓ | 前処理済みトークン列 (`Array[String]`、DESIGN §0.1) |
| `cases[].env` | | 値源系 fixture の環境変数供給: key → 値のマップ。runner が env_provider (DR-049) に注入する |
| `cases[].config` | | config_provider (DR-050) が返す階層オブジェクト。`cases[].config_files` (パス → オブジェクトのマップ) でパス別供給も可 |
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
- **effects に載るのは cli / link 由来のパース時効果のみ** — 値源ラダー充填 (env / config / inherit / default) は完走後の値確定であり argv 順の全順序を持たないため、effects には載せない (例: 未発火 flag の `false` は result に現れ、effects には現れない)。ラダー充填の**値**は `result` で、**由来**は `sources` フィールドで検証する (effects への source 拡張は「充填同士の順序が非規範で全順序規約を汚す」ため不採用 — DR-065)
- **`result` は最終結果オブジェクト** (ラダー充填込みの確定値、DR-051 の absent 規則適用後)。runner は effects / result の両方を検証する
- **`sources` (optional)**: entity → 値源タグ (`cli` / `env` / `config` / `inherit` / `default`) のマップ。最終値の由来 (ParserContext の source メタ、DR-031) を検証する — 値源系 fixture で使用。effects が cli / link 効果のみである規約は不変 (ラダー充填の順序を effects に持ち込まず、由来の検証は本フィールドが担う)。**キーは scope-path 修飾** (root 直下は `"ttl"`、入れ子 scope 内のセルは `"sub.ttl"`) — 同名セルが複数 scope に存在するケース (inheritable の祖先 write-target 等) の一意化
- **`warnings` (optional)**: 起動された deprecated 入口 (DR-058 §2) が積む構造化警告の配列、各要素 `{element, kind}`。`element` は canonical セル参照 (どの入口が deprecated かでなく代替すべき canonical、DR-058 §2)、`kind` は機械可読識別子 (v1 は `"deprecated"`)。ParserContext (DR-016) の warnings — DR-058 §2 による拡張フィールド — の projection であり、effects が cli / link 効果のみである規約は不変 (deprecated 警告はパース成功後の利用推奨であって argv 順の効果ではない、filter warn とは別層)。比較は element の集合比較 (順序非規範)、`kind` は fixture 側に書かれた要素でのみ比較する (`errors.reason` と同じ optional 検証、§3)

### failure

```json
{"outcome": "failure",
 "errors": [{"element": "x", "argv_pos": 2, "kind": "parse", "reason": "missing_operand"}],
 "fired_action": "help"}
```

- `errors`: 全保持の配列 (DR-053/066) — 別候補経路の Error に加え、可変長取り分 (DR-043) が全滅した場合の各取り分 dead-end の躓きも積む (DR-053 §2)。**message は仕様でない** (文言はレンダラ) ため fixture に書かず比較しない
- `reason`: 機械可読な失敗理由の識別子 (DR-066)。**fixture では optional 検証** — 書けば検証、書かなければ kind まで。発生源の emit しうる reason は descriptor の `reasons` 宣言 (DR-061/066) に列挙され、「定義に登場する全パーツの reasons の和 vs fixture のカバー」の完備チェックに使える
- `argv_pos` は 0-based で、**失敗が帰属する argv トークンの位置**を指す。piece 単位の失敗 (pre_filters / type.parse / filters、DR-034 pieceProcessor) は piece が由来する値トークンの位置。**どのトークンにも帰属しない失敗は `argv.length`** を指す — トークンが尽きて要求が満たせない (= 次に要求した位置)、env / config 由来の値の失敗 (`argv: []` なら 0)、累積後の post_filters reject (特定トークンに帰属しない) がこれに当たる
- `element` の**省略 = 特定要素に紐付かないスコープレベルの躓き** (残余トークン等)
- `kind` の割当 (DR-065 §3):
  - `parse` — 型照合・経路構築の失敗。**構造的必須の不成立** (required 属性なしの positional がトークンを得られない、reason: `missing_operand`) と**残余トークン** (element 省略、argv_pos = 残余先頭、reason: `unexpected_token`) を含む。**value_parser の型照合失敗**は reason: `not_a_number` (number / float の構文不一致) / `not_an_integer` (int が非整数入力を弾く、DR-066 §3)
  - `filter` — filter chain の Error (DR-037)。reason は filter の descriptor 宣言 (例: in_range の `too_small` / `too_large`)
  - `constraint` — 遅延述語の違反 (DR-047)。reason: `required_violated` / `requires_violated` / `exclusive_group_violated` / `conflicts_with_violated` (`<属性名>_violated` で統一、DR-066 §3)
- `fired_action`: 失敗時アクション (DR-048) が発火した場合のみ

### ambiguous

```json
{"outcome": "ambiguous",
 "interpretations": [{"s": "ax"}, {"s": "a", "x": true}]}
```

- `interpretations`: 全解釈の列挙、各解釈は結果オブジェクト形のビュー (DR-053)。ビューは解釈の結果オブジェクトを直書きする (result 単独フィールドの省略形、DR-053 §3)
- **`claimants` (optional、露出キー衝突の解釈区別、DR-073)**: 露出キー衝突 (DESIGN §15.5) による ambiguous では、値が退化して両解釈とも同一ビュー (例: 両者 flag で共に `{x:true}`) になりうるため、解釈ごとに claimants 面 (露出キー → その解釈で当該キーを占める実体 entity の name の写像) を添えて区別する。claimants を持つ解釈は `{"result": <ビュー>, "claimants": {"x": "a"}}` の組で書く (DR-053 §3 の canonical `{result:...}` 形 + `claimants` sibling)。claimants を持たない解釈は従来どおりビュー直書き。**順序非依存**: interpretations は集合比較 (§3) なので claimants をその解釈と同じ要素に束ね、(view, claimants) を 1 単位として突き合わせる — expect 直下の並行配列にすると集合の並べ替えで対応が切れるため採らない (DR-073)

## 3. 比較規約

- **構造等価** (DR-063 §4): key 順序非規範、フィールド省略 = default 値と等価。byte 一致は要求しない
- effects は配列順込みの完全一致 (順序が同一性成分)
- result は構造等価
- interpretations は集合比較 (各解釈は構造等価、**列挙順は非規範**) — 完全経路間に優先がない (DR-038) ため順序は同一性成分でない (effects の順序規範性と対照的、errors と同じ集合扱い)。重複解釈の dedup 可否は「解釈の同一性」定義に従属し本書では定めない (DR-053 §3)。claimants を持つ解釈は `{result, claimants}` の組を 1 単位として構造等価で突き合わせる (DR-073) — claimants がその解釈と束ねられているため集合比較が順序に依存しない
- errors は集合比較 (element, argv_pos, kind, reason の組。**reason は fixture 側に書かれている要素でのみ比較対象** (§2 の optional 検証)、message は常に無視)
- warnings は集合比較 (element の組。**kind は fixture 側に書かれている要素でのみ比較対象** (§2 の optional 検証))

## 4. ディレクトリ構成

```
fixtures/<機能領域>/*.json     例: fixtures/dd/ fixtures/repeat/ fixtures/constraints/
fixtures/lowering/<installer>/  lowering 段階別 fixture (query: "lower"、フォーマットは DR-070)
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
