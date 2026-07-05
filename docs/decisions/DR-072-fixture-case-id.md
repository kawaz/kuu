# DR-072: fixture case の安定 id (slug) — 位置非依存の自己記述参照

> 由来: 台帳・issue・DR から個別 case を参照する需要が phase 2 の fixture 実食で常態化し、現行の暗黙参照 `rel::case#N` (配列位置) が case の挿入・削除で全参照を silent に壊すことが露呈した。位置に依存しない自己記述的な case 参照を導入する (kawaz 裁定 2026-07-06)。

## 決定

### 1. 各 case は required の "id" フィールドを持つ

fixture (`query: "parse"` / `"lower"` 等いずれも) の `cases[]` の各要素は、安定 slug となる `"id"` を必須で持つ。可読性のため **case オブジェクトの先頭キー**として書く。

```json
{"id": "empty-argv", "why": "...", "argv": [], "expect": { ... }}
```

### 2. slug 規約

- kebab-case (`[a-z0-9]` と `-`)、**fixture ファイル内で unique**
- case の意図を表す 2〜4 語 (why コメント・argv・expect から採る)。例: `empty-argv` / `missing-destination` / `env-overrides-config`
- **通し番号 (`case-1` 等) や位置依存の名前は禁止** — 挿入・削除に耐える安定 ID が目的
- 参照表記は `rel::slug` (例 `dd/basic.json::empty-argv`)。拡張子は文脈で省略可 (`dd/basic::empty-argv`)

### 3. 一意性検査の位置づけ

DR-067 の well-formedness 3 層 (構文 / 語彙 / 参照) は **`definition` (wire form) の合法性**を判定する層であり、fixture の封筒メタ (`why` / `id` 等) はその対象外。case id の一意性は **fixture フォーマット自身の well-formedness** に属し、`why` 必須と同じく fixture loader / lint が検査する (DR-065 の lint 層) — parse_definition の 3 層とは disjoint。

性格としては DR-067 §2 の構文層 invariant (構造的整合の静的検査) に最も近いが、検査対象が wire ノードでなく fixture メタである点で層が異なる。「id 欠落」「id 重複」はいずれも fixture 不備 (parse 対象の定義エラーではない)。

### 4. conformance runner への影響

- runner / 台帳 / DR / issue からの case 参照表記は `rel::slug` に統一する
- **id 欠落は fixture 不備** — runner はロード時に検出して当該 fixture を fail 扱いにする (`why` 欠落と同じ lint 失格)
- fixture 内 slug 重複も同様に fixture 不備
- id は fixture メタであり parse 入力ではないため、outcome 射影・比較規約 (CONFORMANCE §2/§3) には一切影響しない

## 採用しなかった案

### 通し番号 (`case-1` / 位置ベース ID)

`rel::case#N` の暗黙参照と同じく **配列位置に縛られ**、case の挿入・削除で番号がずれるか抜け番管理が必要になる。自己記述性もゼロ (`case-3` から意図が読めない) で、slug 化の目的 (安定・自己記述) を両方満たさない。

### id を optional にする

参照の安定化が目的なので、一部 case にしか id が無いと「参照したい case に id が無い」欠落が常態化する。`why` と同じく required にして全 case を参照可能に保つ。

### id を case オブジェクトの任意位置に置く

機能上は順不同 (JSON object のキー順は非規範、CONFORMANCE §3) だが、可読性のため先頭固定を規約とする。

## 関連

- DR-065 (conformance fixture フォーマット — `cases[]` 構造と `why` 必須 lint。本 DR は id 必須を追加) / docs/CONFORMANCE.md (現役仕様の正本)
- DR-067 (wire well-formedness 3 層 — id 一意性が「どの層でもない」= fixture メタ層である根拠)
- DR-070 (lower fixture フォーマット — `query: "lower"` も cases を持つため id 対象)
