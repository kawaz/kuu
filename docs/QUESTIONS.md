# 裁定・確認待ち一覧 (ユーザ用)

## 運用規約

<details>
<summary>ゼロコンテキストエージェント向け（本セクションは消さない）</summary>

- 裁定/確認待ち項目を 1項目=1ラベル=1セクション で記載
- ラベル形式: XX-Q1（XXは2-3文字程度、バッチやセッション内で一意な短プレフィクス、Qn単独の使い回し禁止、長期一意性は不要)
- 依頼形式: 「👺XX-Q1 の裁定お願いします」（参照用途ではラベルに👺を付けない。誤陽性がユーザのハイライト/アラームを汚す）
- チャット提示と同一ターンで本ファイルに記録 + path 指定 commit (push はリリース窓に同乗)
- 裁定が下りたら該当セクションを即削除し、内容は正規の記録先 (DR / issue / journal / close_reason) へ反映。本ファイルは常に「現在待ち」だけを持つ
- 参照は[]()で提示（リポ内は相対、リポ外はフルパス）
- 初版質問/依頼は長文で書かない（ユーザが説明を求めらたら本ファイルに説明を追加し、チャットで👺ラベルで再依頼）
- **選択肢・確認項目は `- [ ] a: …` 形式（チェックボックス + ラベル）で書く**。
  Q / C で記法を分けない。回答は「チェックを付ける」でも「XX-Q1a」と言葉で返すでも通る
  （複数まとめてチェックし「チェックしたよ」の一言で済ませる運用を想定）

</details>

> 🔍 **fixture UI**: [kuu-fixtures.kawaz-mbp16-20211217.kawaz.jp](https://kuu-fixtures.kawaz-mbp16-20211217.kawaz.jp) (tailnet 内限定 / ローカルは [localhost:5757](http://localhost:5757)、`just fixture-ui` で起動)

## 裁定待ち

> **LINKPATH-Q1 / Q2 はチャット裁定で確定済み (2026-07-31)**: Q1 = 2 相分解 + **record 型追加による静的化** (descriptor value-type 体系に closed record を新設、DR-107 §3 精密化)。Q2 改 = record 宣言あり → 器 `{}` auto-vivify で部分書き成立 / 宣言なし (map・value) → 枝 Reject の 2 層。record は キー語彙 closed・presence-optional (null 不使用)、乖離 Error は宣言外キー存在 + フィールド値型違いの 2 種、フィールド横断 invariant は final_filters の領分。詳細は research ノート追記 → DR 起草へ。

### 👺 SPL-Q1: 定義片内の constraint 4 種 (requires / conflicts_with / exclusive_group / required_group)

二重設計の相違点 (詳細: [research/2026-07-31-type-input-structure-splice.md](research/2026-07-31-type-input-structure-splice.md) §2d)。`required` は両案とも可 (arity 表現に必須)。

- [ ] a: 可 — sealed 内で名前解決し sub-parse 経路のみで評価。string 形 / organic 経路との整合は型作者責任 (定義片 default の無橋と同じ整理) (fable 案、統括推し)
- [ ] b: 禁止 (`invalid-range`) — 経路差を増やす軸を v1 で持たない (sol 案)

### 👺 SPL-Q2: conformance の検証ビークル

builtin に input_structure 持ち type が無く、fixture は value_parser 実装を注入できない。

- [ ] a: **`builtin/struct` を新設** — config で `input_structure` と out record を受け、sub-parse 産 Value を素通しする identity parser の configurable factory。conformance の参照住人 + 「宣言だけで構造型を作る」ユーザ価値の副産物 (fable 案、統括推し)
- [ ] b: fixture 専用 residents (`fixture/*` ns) を CONFORMANCE に宣言し全 runner が登録 (sol 案 — builtin を汚さないが test 専用名前空間の維持コスト)

### 👺 SPL-Q3: descriptor 内の型参照 (input_structure leaf / out.record フィールド) の解決空間

- [ ] a: **registry のみ** — 使用側の definitions.types に shadow されない。descriptor (型) の意味が使用側定義に依存しない = 型同一性の保証 (sol 案、統括推し。採用なら DR-126 §1 の「definitions → registry (DR-035)」文言を修正)
- [ ] b: 使用側解決文脈 (definitions → registry、DR-035 の既存順) — wire の type: と完全対称 (fable 案)

### 👺 MISC-C1: 小確認 2 点 (異議なければ採用)

- [ ] DR-029 追補文の一般化 — LINKPATH-C1 で承認した分界文は「record を宣言していれば」だが、sol レビュー反映で array/union にも静的判定が広がったため「**構造を名乗っていれば**」へ書き換えたい (承認済み文言の変更なので確認)
- [ ] TTYCYG — tty_provider の cygwin 観測削除 (チャットで賛成評価済み・確定の一言待ちのまま)。チェックで確定扱いにします

## 確認待ち

(現在なし)
