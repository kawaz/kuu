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
    {"id": "<安定 slug>", "why": "<なぜこの入力で、なぜこの期待か>", "args": ["..."], "expect": { ... }}
  ]
}
```

| フィールド | 必須 | 内容 |
|---|---|---|
| `why` | ✓ | file / case の両レベルで必須。仕様意図と DR 根拠。lint は why 欠落を検出する |
| `cases[].id` | ✓ | case の安定 slug (DR-072)。kebab-case (`[a-z0-9]` と `-`)、**fixture 内 unique**、意図を表す 2〜4 語 (通し番号禁止)。case オブジェクトの先頭キーに置く。参照表記は `rel::slug` (例 `dd/basic::empty-args`)。lint は id 欠落・重複を fixture 不備として検出する。parse 入力ではない (メタ) ため §2/§3 の比較には影響しない。**`cases[]` を持つ fixture 固有** — lower fixture (`query: "lower"`, DR-070) は単一トップレベル expect 形式で `cases[]` を持たず、参照は `rel`(`::lower`) で位置非依存のため id 対象外 |
| `query` | ✓ | `"parse"` (本書 §2) / `"lower"` (lowering 断面、DR-070 — `installers` 列挙 (省略 = 全登録、順序非規範)、expect は DR-063 §3 の面構造を緩比較、順列検査は runner 組み込みで fixture に順列を列挙しない) / `"definition_error"` (静的検査、本書 §2「definition-error」、DR-082 — `parse_definition()` の返値をそのまま転用、`cases[].args` は不要) / `"complete"` (補完クエリ、本書 §4、DR-104) |
| `definition` | ✓ | **wire form** (DR-063: 純構文正規化 (LOWERING §C.4) 適用済み + installer 語彙 inert + type 参照はそのまま) |
| `cases[].args` | | 前処理済みトークン列、プログラム名 ($0) を含まない (`Array[String]`、DESIGN §0.1)。`query:"parse"` は必須、`query:"definition_error"` は定義の静的検査のみで実行しないため省略 (DR-082 §1) |
| `cases[].env` | | 値源系 fixture の環境変数供給: key → 値のマップ。runner が env_provider (DR-049) に注入する |
| `cases[].config` | | config_provider (DR-050) が返す階層オブジェクト。`cases[].config_files` (パス → オブジェクトのマップ) でパス別供給も可 |
| `cases[].tty` | | 値源系 fixture の tty 判定値供給: stream (`stdin`/`stdout`/`stderr`) → `{terminal, cygwin}` の生観測 2 値のマップ (DR-099。DR-098 の bool 単一値から改訂)。runner が tty_provider に注入する。省略キーは provider が null (提供なし) を返したものとして扱う。`builtin/tty` preset 型の暗黙 default が `terminal || (tty_cygwin && cygwin)` で fold する |
| `cases[].expect` | ✓ | `query:"parse"` は §2 の outcome union、`query:"definition_error"` は §2「definition-error」の `{outcome:"definition-error", errors}`、`query:"complete"` は §4 の `{outcome:"complete", candidates}` |

## 2. expect — DR-053 の outcome union (+ definition-error, DR-082)

### success

```json
{"outcome": "success",
 "effects": [{"entity": "a", "op": "set", "operand": true, "source": "cli"}],
 "result": {"a": true}}
```

- **`effects` が判定の正本** (主 oracle、LOWERING §C.5)。要素は `{entity, op, operand?, source, transform?, args?}`。**配列順 = 適用順** (効果列の順序は同一性成分、DR-038/045)
  - `entity`: 実体 (値セル) の name / id
  - `op`: DR-045 §4 の 4 op (`set` / `default` / `unset` / `empty`) + DR-077 §1 の `update` (5 番目、old→transform の書き戻し) + DR-080 §2 の merge accumulator piece op のうち集合演算系 2 種 (`remove` / `splice`。add piece は通常の set として現れる、DR-080 §4)。計 7 op:

    | op | 意味 | operand | 実例 (fixture::case) |
    |---|---|---|---|
    | `set` | 通常の値バインド | 値 | `fixtures/multiple-parse/merge-basic.json::no-marker-overwrites-cell` |
    | `default` | 明示 default 選択、committed=true (DR-045) | なし | `fixtures/multiple-parse/default-cell-ops.json::default-with-no-declared-default-resets-to-empty` |
    | `unset` | default 値へ戻す、committed=false でラダー開放 (DR-045) | なし | `fixtures/multiple-parse/filters-cell-ops.json::unset-after-set-resets-to-empty-without-filter` |
    | `empty` | コレクションを決定論的に空にする、committed=true (DR-045) | なし | `fixtures/multiple-parse/filters-cell-ops.json::empty-after-set-resets-to-empty-with-cli-source` |
    | `update` | old へ transform を適用して書き戻す `cell = f(old)` (DR-077 §1) | なし (`transform`/`args` フィールドで変換を指定) | `fixtures/count-parse/basic.json::long-single-fire-one` |
    | `remove` | merge accumulator: operand と等価な要素を全削除 (DR-080 §2) | 除去対象の値 | `fixtures/multiple-parse/merge-splice-remove.json::implicit-at-then-remove-only` |
    | `splice` | merge accumulator: old をその位置に展開 (DR-080 §2) | なし | `fixtures/multiple-parse/merge-basic.json::bare-splice-is-identity` |
  - `operand`: op が要求する場合のみ (set の値 / remove の除去対象)。JSON 表現は canonical 規約 (数値は最短形 `1.0` → `1`、DR-050 §4)
  - `transform`: `op: "update"` 限定 (DR-077 §1/§2)。filters registry の Transform シグネチャを持つエントリ名 (ns 付き識別子、DR-094)。組み込みは `increment`
  - `args`: `op: "update"` の transform に渡す追加引数 (optional、DR-077 §2「args 付き transform は filters の既存 colon 規約のネスト」)。0-arg transform (`increment` 等) では省略
  - `source`: 値源タグ (DR-031)。parse fixture では `cli` のみ登場する (下記)
- **effects に載るのは cli / link 由来のパース時効果のみ** — 値源ラダー充填 (env / config / inherit / default) は完走後の値確定であり args 順の全順序を持たないため、effects には載せない (例: 未発火 flag の `false` は result に現れ、effects には現れない)。ラダー充填の**値**は `result` で、**由来**は `sources` フィールドで検証する (effects への source 拡張は「充填同士の順序が非規範で全順序規約を汚す」ため不採用 — DR-065)
- **`result` は最終結果オブジェクト** (ラダー充填込みの確定値、DR-051 の absent 規則適用後)。runner は effects / result の両方を検証する
- **`sources` (optional)**: entity → 値源タグ (`cli` / `env` / `config` / `inherit` / `tty` / `default`) のマップ。最終値の由来 (ParserContext の source メタ、DR-031) を検証する — 値源系 fixture で使用。effects が cli / link 効果のみである規約は不変 (ラダー充填の順序を effects に持ち込まず、由来の検証は本フィールドが担う)。**キーは scope-path 修飾** (root 直下は `"ttl"`、入れ子 scope 内のセルは `"sub.ttl"`) — 同名セルが複数 scope に存在するケース (inheritable の祖先 write-target 等) の一意化
- **`warnings` (optional)**: 起動された deprecated 入口 (DR-058 §2) が積む構造化警告の配列、各要素 `{element, kind}`。`element` は canonical セル参照 (どの入口が deprecated かでなく代替すべき canonical、DR-058 §2)、`kind` は機械可読識別子 (v1 は `"deprecated"`)。ParserContext (DR-016) の warnings — DR-058 §2 による拡張フィールド — の projection であり、effects が cli / link 効果のみである規約は不変 (deprecated 警告はパース成功後の利用推奨であって args 順の効果ではない、filter warn とは別層)。比較は element の集合比較 (順序非規範)、`kind` は fixture 側に書かれた要素でのみ比較する (`errors.reason` と同じ optional 検証、§3)

### failure

```json
{"outcome": "failure",
 "errors": [{"element": "x", "args_pos": 2, "kind": "parse", "reason": "missing_operand"}],
 "fired_action": "help"}
```

- `errors`: 全保持の配列 (DR-053/066) — 別候補経路の Error に加え、可変長取り分 (DR-043) が全滅した場合の各取り分 dead-end の躓きも積む (DR-053 §2)。**message は仕様でない** (文言はレンダラ) ため fixture に書かず比較しない
- `reason`: 機械可読な失敗理由の識別子 (DR-066)。**fixture では optional 検証** — 書けば検証、書かなければ kind まで。発生源の emit しうる reason は descriptor の `reasons` 宣言 (DR-061/066) に列挙され、「定義に登場する全パーツの reasons の和 vs fixture のカバー」の完備チェックに使える
- `args_pos` は 0-based で、**失敗が帰属する args トークンの位置**を指す。piece 単位の失敗 (piece_filters / type.parse / value_filters、DR-034 pieceProcessor) は piece が由来する値トークンの位置。**どのトークンにも帰属しない失敗は `args.length`** を指す — トークンが尽きて要求が満たせない (= 次に要求した位置)、env / config 由来の値の失敗 (`args: []` なら 0)、`final_filters`/`accum_filters` の reject (multiple 有無を問わず、確定した最終値・累積配列全体への一括検証であり特定トークンに帰属しない、DR-102 §4) がこれに当たる
- `element` の**省略 = 特定要素に紐付かないスコープレベルの躓き** (残余トークン等)
- `kind` の割当 (DR-065 §3):
  - `parse` — 型照合・経路構築の失敗。**構造的必須の不成立** (required 属性なしの positional がトークンを得られない、reason: `missing_operand`) と**残余トークン** (element 省略、args_pos = 残余先頭、reason: `unexpected_token`) を含む。**value_parser の型照合失敗**は reason: `not_a_number` (number / float の構文不一致) / `not_an_integer` (int が非整数入力を弾く、DR-066 §3)
  - `filter` — filter chain の Error (DR-037)。reason は filter の descriptor 宣言 (例: in_range の `too_small` / `too_large`)
  - `constraint` — 遅延述語の違反 (DR-047)。reason: `required_violated` / `requires_violated` / `exclusive_group_violated` / `conflicts_with_violated` (`<属性名>_violated` で統一、DR-066 §3)
- `fired_action`: 失敗時アクション (DR-048) が発火した場合のみ
- **`help_entry` (optional, String)**: 定義に help 入口があれば、その綴り (例: `"--help"`) を failure に載せる (DR-053 §4)。DR-048 の誘導行 (`Try 'prog --help' for more information.` 型) の素材であり、文言生成はレンダラの関心。**fixture では optional 検証** — 書かれた時のみ比較。例: `"help_entry": "--help"`
- **`tried_triggers` (optional, Array[String])**: 失敗位置で試行された exact 綴りのリストを failure に載せる (DR-053 §4)。Did you mean (F-016) の素材であり、近接マッチ計算は DX 層の関心 (AtomicAST にフックは持たない)。**fixture では optional 検証** — 書かれた時のみ比較 (§3 の集合比較、順序非規範)。空配列は「exact trigger が1個も無い」ことの明示検証。例: `"tried_triggers": ["--verbose", "--version"]`

### ambiguous

```json
{"outcome": "ambiguous",
 "interpretations": [{"s": "ax"}, {"s": "a", "x": true}]}
```

- `interpretations`: 全解釈の列挙、各解釈は結果オブジェクト形のビュー (DR-053)。ビューは解釈の結果オブジェクトを直書きする (result 単独フィールドの省略形、DR-053 §3)
- **`claimants` (optional、露出キー衝突の解釈区別、DR-073)**: 露出キー衝突 (DESIGN §15.5) による ambiguous では、値が退化して両解釈とも同一ビュー (例: 両者 flag で共に `{x:true}`) になりうるため、解釈ごとに claimants 面 (露出キー → その解釈で当該キーを占める実体 entity の name の写像) を添えて区別する。claimants を持つ解釈は `{"result": <ビュー>, "claimants": {"x": "a"}}` の組で書く (DR-053 §3 の canonical `{result:...}` 形 + `claimants` sibling)。claimants を持たない解釈は従来どおりビュー直書き。**順序非依存**: interpretations は集合比較 (§3) なので claimants をその解釈と同じ要素に束ね、(view, claimants) を 1 単位として突き合わせる — expect 直下の並行配列にすると集合の並べ替えで対応が切れるため採らない (DR-073)
- **`help_entry` (optional, String)**: failure と同じ意味論 (DR-053 §4) — 定義に help 入口があれば、その綴りを ambiguous にも載せる (誘導行素材)。`tried_triggers` は DR-053 §4 が failure 専用に規定するため ambiguous には無い。**fixture では optional 検証** — 書かれた時のみ比較

### definition-error (`query: "definition_error"`、DR-082)

```json
{"outcome": "definition-error",
 "errors": [{"element": "tags", "kind": "invalid-range"}]}
```

`query: "definition_error"` は `success`/`failure`/`ambiguous` (DR-053 の実行時 outcome union) とは別レイヤ — `parse_definition()` (定義そのものの静的検査、DR-054 §4) の返値をそのまま転用する。`cases[].args` は書かない (定義の静的検査であり実行しない、DR-082 §1)。

- `errors`: `parse_definition()` が検出した全定義エラーの配列。`element` (該当要素、省略可) と `kind` の組で構成される
- `kind` の語彙 (DR-054 §4、DR-085 訂正で `invalid-argument` 追加): `vocab-intersection` / `unknown-vocab` (綴りが registry の owns 集合に無い) / `invalid-range` (構文上は書けるが構成として不成立、DR-082 §2) / `absent-ref` / `circular-ref` / `zero-progress` / `config-cycle` / `invalid-argument` (装置引数の値そのものが不正、DR-085 訂正)
- **`message`/`hint` は比較しない** (parse fixture の `errors[].message` と同じ流儀、文言はレンダラの関心)

## 3. 比較規約

- **構造等価** (DR-063 §4): key 順序非規範、フィールド省略 = default 値と等価。byte 一致は要求しない
- effects は配列順込みの完全一致 (順序が同一性成分)
- result は構造等価
- interpretations は集合比較 (各解釈は構造等価、**列挙順は非規範**) — 完全経路間に優先がない (DR-038) ため順序は同一性成分でない (effects の順序規範性と対照的、errors と同じ集合扱い)。重複解釈の dedup 可否は「解釈の同一性」定義に従属し本書では定めない (DR-053 §3)。claimants を持つ解釈は `{result, claimants}` の組を 1 単位として構造等価で突き合わせる (DR-073) — claimants がその解釈と束ねられているため集合比較が順序に依存しない
- errors は集合比較 (`query:"parse"` の failure outcome: element, args_pos, kind, reason の組。**reason は fixture 側に書かれている要素でのみ比較対象** (§2 の optional 検証)、message は常に無視)
- `query:"definition_error"` の errors は element + kind の組の集合比較 (`args_pos`/`reason` は definition-error 構造に存在しない、DR-082 §1)。message/hint は比較しない
- warnings は集合比較 (element の組。**kind は fixture 側に書かれている要素でのみ比較対象** (§2 の optional 検証))
- `help_entry` は構造等価 (**fixture 側に書かれている場合のみ比較する opt-in**、§2)
- `tried_triggers` は集合比較 (**fixture 側に書かれている場合のみ比較する opt-in**、§2。順序非規範 — 近接マッチ計算が DX 層の関心である以上、綴りの列挙順に規範性はない)
- `candidates` (`query: "complete"`、§4) は**順序非依存の multiset 比較** (重複を保持したまま一対一対応。DR-060 §1 の「和集合」はスペリングの和集合であり順序を課さない、DR-104 §4) — `interpretations` (集合比較、重複解釈の dedup 可否は本書で定めない) との非対称に注意: `candidates` の dedup は DR-104 §3 により producer 側 (実装) の規範として既に確定しているため、actual 側の候補列に同一性 6 フィールドの重複があれば expect と一致せず mismatch になる。各候補は `spelling`/`is_value`/`ty`/`origin`/`term`/`meta` の構造等価で比較する。**`meta` (`is_alias`/`hidden`/`deprecated`) は候補同一性の成分であり必須検証** (省略 = default 値 `{false,false,false}` と等価という §3 冒頭の一般規約をそのまま適用すると省略時に検証が骨抜きになるため、`candidates[].meta` は常に書く運用とする、COMP-Q2)。**`completer` (値位置候補の completer 名) は opt-in 検証** — 書けば比較、書かなければ未検証 (`errors.reason` と同じ optional 検証パターン、COMP-Q3)。`path` は候補構造の wire に含めない (DR-104 §2/§3)。

  `candidates[]` 各フィールドの分類 (DR-104 §2/§3、codex レビュー #2 C-3/M-4 の反映):

  | フィールド | 分類 | 規定 |
  |---|---|---|
  | `spelling` | normalization-default | `is_value:false` で実質必須、`is_value:true` では省略 = `""` と等価に正規化 |
  | `is_value` | required-no-default | 常に必須 |
  | `origin` | required-no-default | 常に必須 |
  | `term` | required-no-default | 常に必須 (`word_end`/`cont`) |
  | `meta` | required-no-default | 常に必須・省略不可 (候補同一性の成分、default 読み替えなし) |
  | `ty` | normalization-default (実質必須) | `is_value:true` で実質必須、`is_value:false` では意味を持たない |
  | `completer` | opt-in-untested | 書けば比較、書かなければ未検証 (未実装のため fixture では書かない) |

## 4. 補完クエリ (`query: "complete"`、DR-104)

`query: "complete"` の fixture は、`definition` に対する `args_before` (必須) / `args_after` (optional) を入力に `candidates` の期待集合を検証する。`word_before`/`word_after` (カーソル単語内の前後半) は v1 未使用可のまま予約されており fixture では書かない (DR-104 §1)。**case オブジェクトに `word_before`/`word_after` が書かれていた場合、runner は fixture 不備として明示的に reject する** (silent ignore はしない、codex レビュー #2 m-4 の反映)。**本節は §2 の 7 op 表 (`effects[].op`) とは独立の語彙体系である** — complete は値セルへの副作用を持たない候補集合クエリであり、7 op 表と混同しない (COMP-Q5)。

```json
{
  "why": "...",
  "query": "complete",
  "definition": { ... },
  "cases": [
    {
      "id": "...",
      "why": "...",
      "args_before": ["--port"],
      "args_after": ["5"],
      "expect": {
        "outcome": "complete",
        "candidates": [
          {"spelling": "--port", "is_value": false, "origin": "port", "term": "word_end", "meta": {"is_alias": false, "hidden": false, "deprecated": false}},
          {"is_value": true, "ty": "number", "origin": "port", "term": "word_end", "meta": {"is_alias": false, "hidden": false, "deprecated": false}}
        ]
      }
    }
  ]
}
```

- `cases[].args_before`: 必須。前処理済みトークン列、カーソル前 (DR-104 §1)。**カーソル前で確定した完全トークンのみを含み、カーソルが単語内にある場合も進行中の部分単語は含めない** (DR-060 §2 の `before`/`word` フィールド分離設計の帰結、DR-104 §1 明確化 note) — 単語内カーソル時の candidates は単語頭カーソル時と同一集合になる
- `cases[].args_after`: optional。前処理済みトークン列、カーソル後。与えられると after 整合フィルタ (§4 下記) が働く。**省略と明示的な空配列 `[]` の供給は同値** (length ベース判定、DR-104 §5 明確化 note)
- `expect.outcome`: `"complete"` 固定
- `expect.candidates`: `Cand` 構造の直訳 (DR-104 §2)。各要素は `{spelling?, is_value, ty?, origin, term, meta, completer?}`。`spelling` は `is_value:false` で実質必須 (`is_value:true` では省略可、省略 = `""` と等価)。`ty` は `is_value:true` で実質必須。`meta` は常に書く (§3)
- **制約 (遅延述語) は `args_before` のみの候補生存判定に不参加**: `required`/`required_group`/`requires`/`exclusive_group`/`conflicts_with` はいずれも候補から除外する判定に使われない — 排他相手が committed 済みでもその候補は返る (DR-104 §5)。**`args_after` が与えられた場合、exact かつ `term:"word_end"` の候補に限り** 候補採用後の完全経路判定 (遅延述語込みの `parse()` フル実行) が間接的に働く — 値位置候補・`term:"cont"` の候補はこのフィルタの対象外 (ユーザ入力を発明できないため無条件で通る)

## 5. ディレクトリ構成

```
fixtures/<機能領域>/*.json     例: fixtures/dd/ fixtures/repeat/ fixtures/constraints/
fixtures/lowering/<installer>/  lowering 段階別 fixture (query: "lower"、フォーマットは DR-070)
fixtures/complete/              補完クエリ fixture (query: "complete"、フォーマットは DR-104)
```

DR への遡及は各 `why` 内の DR ref で辿る (機能領域は複数 DR の合成で決まるため、DR 番号をディレクトリ名にしない)。

## 6. runner の契約

各言語実装の fixture runner は:

1. `definition` (wire form) を parse_definition に通す。`query:"parse"`/`"complete"` では definition-error になったらその fixture は fail (定義自体が不正)。`query:"definition_error"` では逆に definition-error になることが期待される正常系 — `parse_definition()` の返す `DefError` 列を §2「definition-error」の `errors` 形へ射影し、args を使わず (DR-082 §1) そのまま `expect` と比較する
2. `query:"parse"` は各 case の `args` で parse を実行し、outcome を §2 の JSON 形へ射影する。`query:"complete"` は各 case の `args_before`/`args_after` で `complete()` を実行し、候補集合を §4 の `candidates` 形へ射影する
3. `expect` と §3 の規約で比較する

効果列の観測 (effects の出力) は実装の内部表現から §2 の形へ射影できれば足り、内部表現自体は自由 (DR-041/042 の「観測挙動が同一なら実装表現は自由」)。

## 関連

- DR-065 (本フォーマットの判断記録) / DR-063 (wire form) / DR-053 (outcome union) / DR-045 (効果記述子) / DR-047 (制約評価)
- DR-104 (補完クエリ fixture format — §4 の正本) / DR-060 (補完クエリの意味論)
- LOWERING §C.5 (二段比較戦略)
- ROADMAP (フェーズ 2 = slice 167 テストからの蒸留)
