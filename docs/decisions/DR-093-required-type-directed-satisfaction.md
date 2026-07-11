# DR-093: required / requires の充足は型委譲 — none 要素は発火 (committed) で充足

> 由来: issue `docs/issue/2026-07-07-dd-required-marker-fire-constraint.md` — kawaz/die の `--` (dd) を必須にできない (dd は値セルを持たないため DR-047 §5 の「値の有無」判定に乗らない) ギャップ。PoC (kuu.mbt エンジン直構築、2026-07-11) で「`--` 必須は greedy Seq の構造で表現可能」を検証したうえで、kawaz が required の判定を type (値空間) への委譲として一様定式化する裁定 (DD3 バッチ、2026-07-11)。

## 決定

### 1. required / requires の充足は型 (値空間) への委譲

required は「解決後の充足」の保証であり、**充足の定義は type (値空間) が与える** — 特例列挙ではなく型委譲として一様に書く:

- **値空間を持つ要素** (通常の type): 値が在ること (default / env 等の値源込み、DR-047 §5 不変)
- **値空間が空の要素** (`type: "none"`、dd 含む、DR-089 §2): 発火したこと (committed)

先例: DR-047 §5 の明確化 (2026-07-09) が「requires 目的語が bool 型なら充足 = 解決後の値が true」という type-directed dispatch を既に導入していた。本 DR はこれを bool 型の充足定義として同じ枠に位置づけ直し、値空間なし (none) 型の分岐を第 3 の型委譲として完備化する。

### 2. 判定入力は committed (DD3-Q1)

none 要素の「発火」判定は **committed**。DR-047 §5 が selected を診断メタに留め exclusive_group / requires トリガと同軸に committed を採った線を維持する。DR-089 §4 が none node の committed 基準制約への参加を明文済みであり、本 DR はその上に required / requires の目的語という新しい参加先を追加するだけで新語彙・新軸を要さない。

### 3. requires の目的語も型委譲に含める (DD3-Q2)

`A requires B` の B が値空間なし要素 (none) の場合、「B が発火した (committed)」で充足する。これにより **DR-089 §4 の「値充足を要求される席 (requires の目的語等) には値空間が無いため立てない → definition-error」を置換する** (§4 の committed 基準制約参加の記述自体は不変、値充足席の扱いのみ置換)。

根拠: `A requires B` で B がマーカー (値を運ばず発火事実だけを持つ要素) であることは意味を持つ宣言であり、definition-error として弾く理由がない。

### 4. dd の宣言経路書き換え案 (DD2) は不採用のまま idea 降格 (DD3-Q3)

PoC (kuu.mbt エンジン直構築、2026-07-11 実測) で、DD2 が提案した「dd → greedy Seq への opt-in lowering 書き換え」を検証した。`Seq([Exact("--"), Ref(...)])` を greedy 面に直接構築すると `["msg"]` は failure、`["--","msg"]` は success になり、sever 相当の挙動が得られることを確認した。この結果は **sever 相当が DESIGN §15.8「greedy 内部は背骨なし一体消費」の構造的性質であり、dd 固有の機構ではない**ことを裏付ける。

しかし現行の JSON wire (`dec_option` 等) にはこの Seq 構造を直接宣言する語彙が無く、この形を使うには新規宣言語彙 (または lowering 専用の記法) の追加が要る。本 DR の型委譲アプローチは **新規 wire 語彙ゼロ** (`required: true` の既存属性をそのまま none 要素に使うだけ) で同じ結果 (`die msg` の failure 化) が得られるため低侵襲であり、DD2 案は不採用のまま idea へ降格する。PoC で得た知見 (sever は greedy Seq の構造的性質) は記録として本 DR に残す。宣言経路そのものの需要 (「Seq 構造を直接宣言したい」ユースケース) が `corpus/real-cli` で複数実在すれば再訪する。

### 5. 帰結

`{"type": "dd", "required": true}` (canonical では `{"name": "--", "type": "dd", "required": true}` の一部、DR-064 §5 の name デフォルト供給と合成) で「マーカーの無条件必須」が表現できる — 未発火は制約 `required_violated` の failure。

kawaz/die の忠実表現は **§3 の requires 側** — die は `die --help` / `die --version` を `--` なしで受けるため `--` の必須は無条件でなく「args を消費するときだけ」であり、`positionals: [{"name": "args", ..., "requires": ["--"]}]` (args がトークンを食って committed になったときだけ dd の発火を要求、help 単独は args 不発でトリガ不発火) がそれを表す。`die msg` は `requires_violated` の failure になる。無条件 required と条件付き requires のどちらも本 DR の型委譲から出る 2 つの表現である。

### 6. 型保証の一様性

required の効能「明示強制 + 型保証」は none でも崩れない — 型保証の中身が型ごとに違うだけ:

- 値空間ありの型: 結果に値 T が必ず在る
- none: 結果にフィールドは生成されない (DR-051、binding 側は不変) が、「発火した」という事実が ParserContext 層の committed として必ず観測可能

### 7. none の充足経路は CLI 発火のみ

none 要素には値空間が無いため default / env / config / inherit の値源席が存在しない (DR-089 は none に値源を与えていない)。したがって none 要素の required / requires 充足経路は **CLI 上での発火 (committed) のみ** — 「充足 = 型が定義する存在」の型委譲原理から自動的に導かれる帰結であり、追加の特例規定ではない。

## 採用しなかった案

### dd → greedy Seq lowering の宣言語彙化 (DD2)

§4 参照。PoC で機構としては動作を確認したが、新規宣言語彙が要るため低侵襲性で型委譲案に劣る。

### none 要素を requires 目的語にした場合は definition-error のまま (DD3-Q2 の b 案)

「値充足席に立てない」を字義通り維持する保守案。しかし `A requires B` (B = マーカー) は自然な宣言であり、型委譲の一様性 (§1) からも B の充足を「発火」と定義するのが直接的。definition-error 側に倒す実用ユースケースが見当たらない。

## 射程外

- 条件付き requires (値依存の制約) は or 構造への誘導方針 (DR-047 射程外) のまま、本 DR で変更しない
- none 以外の「値空間はあるが特殊な充足定義を要る型」が将来必要になった場合の一般化方針は、必要になった時点で本 DR の型委譲原理の枠内で個別判断する

## 関連

- DR-047 (§5 制約評価のレイヤリング — required / requires の判定入力テーブルを本 DR が型委譲として精密化)
- DR-089 (type 省略 = none — §2 none の第一級定義、§4 committed 基準参加が本 DR の土台。§4 の値充足席 definition-error は本 DR が requires 目的語について置換)
- DR-064 (dd の宣言配置 — 本 DR の適用対象の具体例)
- DR-051 (absent — none 要素は元々結果にフィールドを持たない、本 DR の充足判定はこの absent/not-absent の軸とは独立)
- DR-083 §5 (静的既知は定義時に倒す — DR-089 §4 の definition-error 判断の由来筋、本 DR が requires 目的語について部分的に覆す)
- issue `docs/issue/2026-07-07-dd-required-marker-fire-constraint.md` (経緯、PoC 詳細)
