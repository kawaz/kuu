# DR-048: 失敗時アクション — early-exit は持たず、完走後の表示選択で help を救う

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-037 (help/version の early-exit と bounded path-search の整合、critical) と LOWERING G-6 の後半 (early-exit 整合)。本セッションの議論で確定。F-037 が同時確定を提案していた F-007 (global) は DR-042 で確定済みのため、本 DR は F-037 単独を解く。

## 決定

### 1. early-exit という概念を持たない

パースは常に完走する (成功 / 失敗 / ambiguous、DR-038)。走査途中で打ち切って成功扱いにする「early exit」は、どの時点で exit するかが評価器の走査戦略 (枝の探索順) に依存して非決定的になり、全消費契約と両立しないため採用しない。help の成功時挙動は DESIGN §14.1 の既定路線 (完了時に ParserContext の help フラグを見て出力切替) を維持する — 確定が必要だったのは**失敗時**の挙動だけである。

### 2. 失敗時アクション (完走後の表示選択)

完全経路 0 本で失敗したとき、候補経路のいずれかで**失敗時アクションを持つ要素が selected** であったなら、保持 Error (DR-037) の表示に代えてそのアクションを発火する (help なら help 表示):

- `mytool --help --typo` → help 表示 (逐次走査で `--help` 到達時に exit する古典 CLI と同じ観測挙動)
- 先食い (DR-041 §4) が誤発火を防ぐ: `prog -- --help` の `--help` は dd の内部消費 (raw) なので selected にならない

### 3. 汎用属性 + type: "help" プリセット同梱 (help を特別にしない)

- 失敗時アクションは任意要素に付けられる**汎用属性**とする。属性のフィールド名・installer 区分は本 DR では確定しない (DESIGN §13.9 の未予約リストに登録。help / completion installer の設計 — issue `2026-07-03-alias-normalization-help-completion-installer` — と同時に確定する)
- `type: "help"` プリセット (DESIGN §3.3) がこの属性を同梱する。help の特別さはプリセットの中身に閉じる
- **version は「ただの flag」(DESIGN §14.2) を維持**する。ただの flag のままでは失敗時に何も出ない (パース失敗ではアプリに結果が渡らない)。失敗時にも version を出したいアプリはこの属性を opt-in する — 「help/version の 2 つを特別扱いしない」の実質

### 4. 衝突は argv 位置の先勝ち

- **成功時に衝突は存在しない**: `--help --version` が両方 committed なら結果に両方現れ、どちらに反応するかはアプリの領分 (kuu は決めない)
- **失敗時**に複数の失敗時アクションが観測された場合は、**argv 上の消費位置が最小のものを発火する** (先勝ち)。順序の座標は効果列 (DR-045) の argv 順であり、DR-015 の「あと勝ち mutation」と同じ時計を使う (値は後勝ち・失敗時アクションは先勝ちと向きは逆だが、座標は同一)
- 経路をまたぐ選択も同じ規則で閉じる: 枝の深さ・走査タイミングは実装の探索構造であって意味論の座標ではない。いずれかの候補経路で観測されたもののうち argv 位置最小

### 5. 「候補経路で selected」の精密定義は本 DR で確定しない

失敗時にどの partial 経路の selected を数えるか (partial 経路の範囲。findings F-039 の失敗時部分状態と接続) の精密な定義は本 DR の射程外とする。issue `2026-07-03-failure-action-selected-scope` でトラッキングし、垂直スライス実測を経て確定する。

## 採用しなかった案

### 真の early exit (走査中断)

getopt 系の逐次モデルでは自然だが、全体解決モデルでは「どこまで走査した時点か」が非決定的。DR-038 の契約と両立しない。kuu で意味を保てるのは完走後の表示選択だけ。

### help/version の専用ハードコード

機構は汎用属性に、特別さはプリセットに閉じる (DESIGN §0.1 の暗黙ルール最小化)。version を help と同格の組み込みに昇格する案は DESIGN §14.2 (version はただの flag) を覆すため不採用。

### 「help フラグが立ったら残トークンの消費エラーを緩和する」モード

評価器に mode 状態が増える。prefix ガードを却下した判断 (DR-041 §5 — mode 状態は dd の純糖衣性を壊す) と同じ問題を持ち込むため不採用。

### 枝の深さ / 走査順による衝突解決

実装の探索構造依存で非決定的。argv 位置基準に統一。

## 射程外

- 失敗時アクション属性のフィールド名・installer 区分 (§13.9 未予約、issue `2026-07-03-alias-normalization-help-completion-installer` の installer 設計と同時)
- アクション部の一般形 (「help フラグを立てる」を超える実行フック) の AtomicAST 表現 — DESIGN §13.9 の未予約を維持 (LOWERING G-6 の前半)
- 「候補経路で selected」の精密定義 — issue `2026-07-03-failure-action-selected-scope`
- 失敗時のエラー報告 JSON 構造 — F-043 (DR-059 候補)

## 関連

- DR-038 (完走契約 — early exit を持たない根拠)
- DR-037 (保持 Error の表示 — 失敗時アクションはその置換)
- DR-045 (効果列の argv 順 — 衝突解決の座標)
- DR-015 (あと勝ち mutation — 同一の時計、向きは逆)
- DR-041 (先食いによる誤発火防止、mode 状態を増やさない同族判断)
- DR-042 (installer — 属性語彙の将来の所有者)
- DESIGN §14.1 / §14.2 / §15.10 / §13.9
- LOWERING §A.5 (help プリセット — G-6 後半の解消)
- findings `2026-06-29-ast-missing-pieces.md` F-037 (解消) / F-039 (接続) / F-043 (射程外)
- issue `2026-07-03-failure-action-selected-scope` / `2026-07-03-alias-normalization-help-completion-installer`
