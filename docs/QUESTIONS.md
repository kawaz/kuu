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

### RECB-Q1〜Q6: record 産出 builtin (conformance 複合値ビークル)

DR-127 波及の fixture (2)(4)(5)(6) と W2-7/W2-8/W2-9 の conformance 露出には「複合値を産む conformance 住人」が必要だが現存しない。設計正本: [docs/research/2026-08-02-record-builtin-type-design.md](docs/research/2026-08-02-record-builtin-type-design.md) (§8 が裁定候補の詳細)。新機構は発明せず **DR-128 §12 (SPL-Q2=a+b) の `fixture/*` residents 系統**に乗せる設計。

- [ ] RECB-Q1a: **ビークル = `fixture/*` ns に具象 3 住人 (timestamp / timerange / json) (推し)** — json は fixture (4) 用 (record は vivify するので absent Reject が起きず、value out 住人が別途要る)
- [ ] RECB-Q1b: 汎用 record_parser factory (builtin/struct と二重の汎用機構になるため非推奨)
- [ ] RECB-Q1c: builtin/struct 前倒し (splice 実装が前提になり順序逆転)
- [ ] RECB-Q2a: **timerange フィールド型 = `fixture/timestamp` 参照 (推し)** — 型依存グラフ + 「フィールド type がパースする」(DR-127 §3.2) の判別 pin が立つ
- [ ] RECB-Q2b: `"number"` 直参照
- [ ] RECB-Q3a: **timestamp 受理輪郭 = canonical 10 進整数のみ (推し)** — number_parser より狭くして入口/フィールドのパーサ行使を判別可能に
- [ ] RECB-Q3b: number 同域 (Q2a の価値が消える)
- [ ] RECB-Q4a: **timerange 文法 = `A..B` / `A..` / `..B` / `..`、単独 A は reject (推し)** (相対時刻 `-5m..now` は決定性のため対象外)
- [ ] RECB-Q4b: `..` も reject
- [ ] RECB-Q4c: 単独 A を `{since:A}` (DR-128 §2 と不整合なので非推奨)
- [ ] RECB-Q5a: **descriptor 置き場 = builtin-descriptors.json に fixture ns 区分追加 (推し)**
- [ ] RECB-Q5b: 新ファイル分離
- [ ] RECB-Q6a: **提供義務 = conformance 実行文脈での解決可能性のみ、通常 registry は実装裁量 + 安定性保証外 (推し)**
- [ ] RECB-Q6b: builtin 同格の常設

## 確認待ち

(現在なし)
