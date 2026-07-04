# DR-053: パース結末の構造 — 3 値 discriminated union、errors 全保持 + 最深 primary、ambiguous は全解釈列挙

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-043 (ambiguous エラー / パース失敗時の戻り値 JSON 構造)。DR-037 が未確定と明記した「競合経路のダンプ本数」と、DR-048 が射程外にした誘導行の置き場を確定する。本セッションの議論で確定。

## 決定

### 1. 返値は discriminated union の 3 値 (例外ではない)

parse() の返値は `outcome` タグ付きの構造とする:

```
{outcome: "success",   result: {...}, context: <ParserContext>}
{outcome: "failure",   errors: [...], fired_action?: ..., help_entry?: ..., tried_triggers?: [...]}
{outcome: "ambiguous", interpretations: [...], help_entry?: ...}
```

言語非依存仕様として canonical は構造で定義する。言語 DX が例外・Result 型等へ変換するのは自由 (DR-016 の「canonical は構造、見せ方は DX」の分離と同じ)。

### 2. failure: errors は全保持の配列、primary は argv 位置最深

保持 Error (DR-037、遅延述語違反 DR-047 を含む) は複数ありえる (別候補経路の別 Error)。構造は全部を配列で持つ:

```
errors: [{element: <要素参照>, argv_pos: <int>, kind: "parse" | "filter" | "constraint", message: <string>}, ...]
```

- **primary の定義: argv 位置が最深の Error** (furthest failure)。「最も深く進んだ解釈がどこで躓いたか」が利用者にとって最も情報量が高い、というパーサの定石。複数が同深なら全てが primary
- どれを何本表示するかは**レンダラの関心** (構造は全保持、表示は自由)
- DR-048 の失敗時アクション選択 (argv 位置**最小**の先勝ち) と向きが逆なのは目的の違いによる: アクションは「ユーザが最初に求めた意図」、primary は「最も深く進んだ解釈の躓き」。不整合ではない
- 失敗時アクションが発火した場合は `fired_action` にその要素参照を載せる (発火とエラー構造の保持は両立する — 表示がアクションに置換されるだけで、構造としての errors は残る)

### 3. ambiguous: 全解釈を列挙、各解釈は結果オブジェクト形のビュー

```
interpretations: [{result: {...}}, ...]
```

- **全列挙が canonical** (DR-037 の「2 本か 1 本か」への答え: 全部)。取り分選好 (DR-043) が取り分次元を代表 1 本に確定済みなので、残る ambiguous は構造的に異なる解釈のみ = 本数は実際上少ない。表示上限はレンダラの関心
- 各解釈は**結果オブジェクト形のビュー**で表す (解釈 A: `{n: "1.0f"}` / 解釈 B: `{n: "1.0", f: true}` — 差分が一目で分かる)。効果列そのものは詳細モード (ParserContext 相当) の関心で、canonical の interpretations には載せない

### 4. 誘導行・suggest の素材はフィールド、文言はレンダラ

- `help_entry`: 定義に help 入口があれば、その綴り (例: `"--help"`) を failure / ambiguous 両方に載せる。DR-048 の誘導行 (`Try 'prog --help' for more information.` 型) の素材であり、文言生成はレンダラの関心
- `tried_triggers`: 失敗位置で試行された exact 綴りのリストを failure に載せる。Did you mean (F-016) の素材であり、近接マッチ計算は DX 層の関心 (AtomicAST にフックは持たない — findings F-016 の最小案の採用)

### 5. partial ParserContext は optional 予約 (中身は本 DR の射程外)

failure に partial な ParserContext (どこまで解釈できたかの部分状態、F-039) を載せる optional フィールドを予約する。中身の形 (WithHeld の複数候補経路のどれを載せるか) は**本 DR では確定しない (射程外)**。失敗時アクションの selected 判定 (DR-048) が同じ partial state を使うため、行き先を分散させず **DR-048 実装フェーズで両者を同時に確定する** (追跡: findings F-039)。

## 採用しなかった案

### 例外 / 言語固有 Result 型を canonical にする

言語非依存仕様に書けない。構造が canonical、変換は DX。

### primary 1 本だけを構造に載せる (残りは捨てる)

レンダラ・診断ツール・conformance test が全 Error を必要とする。捨てるのは構造の仕事ではない。

### ambiguous の代表 2 本ダンプ

「なぜ 2 本か」に原理がない。全列挙 + 表示はレンダラ、で責務が切れる。

### interpretations に効果列を載せる

効果列は経路同一性の判定座標 (DR-038/045) であって利用者向け表現ではない。結果オブジェクト形の方が差分が読める。詳細は ParserContext 側。

## 射程外

- exit code・stdout/stderr の振り分けは kuu の関心外 (アプリ / DX 層)
- message の文言・多言語化はレンダラの関心
- partial ParserContext の中身の形 (§5、F-039 の残り、確定は DR-048 実装フェーズ)
- JSON Schema 上のフィールド正式名は DR-039 の直列形確定と同時 (本 DR は構造と意味論)

## 関連

- DR-037 (Reject/Error — 「ダンプ本数」未確定の解消)
- DR-038 (結末 3 値 — その構造化)
- DR-047 (遅延述語違反 = Error — kind: "constraint" として合流)
- DR-048 (失敗時アクション・誘導行 — fired_action / help_entry の座席。argv 最小 vs 最深の目的差。§5 partial state の確定先)
- DR-045 (効果列 — interpretations に載せない判断)
- DR-016 (2 層分離 — 詳細は ParserContext 側)
- findings `2026-06-29-ast-missing-pieces.md` F-043 (解消) / F-016 (tried_triggers の素材化) / F-039 (§5 の optional 予約、残りは DR-048 実装フェーズで確定)
