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

> **kawaz 方向付け (mid=48、2026-08-02)**: timestamp / timerange / duration を kawaz/timespec.mbt 風の
> self 3rd type として追加する構想 — duration 内部 ms、timestamp 内部 epoch_ms、
> timerange = record{since: timestamp, until: timestamp}。以下はこの方向を反映した改稿版。

- [ ] RECB-Q1a: **住人 = timestamp / timerange + fixture (4) 用の json→value 型の 3 つ。duration は v1 見送り (推し)** — 実用型のプレビューとして定義。duration は内部表現が暫定 ms で major 変更含み (ms+subms 構造化、mid=50) のため今 pin しない。json 型は record が vivify する (absent Reject が起きない) ため value out の住人が別途要る分
- [ ] RECB-Q1b: duration も number(ms) で今入れる (将来の subms 構造化が conformance 破壊になるリスク)
- [ ] RECB-Q2a: **timerange フィールド型 = timestamp 型参照 (推し)** — 型依存グラフ + 「フィールド type がパースする」(DR-127 §3.2) の判別 pin。内部表現: timestamp = epoch_ms、duration = ms (out は number への精密化)
- [ ] RECB-Q2b: `"number"` 直参照
- [ ] RECB-Q3a: **受理文法は spec が正本として定義 (相対形込み)、range 区切りは `..` (シェル HOME 展開問題を避ける、mid=50)。決定性は factory config での now 固定注入で確保 (推し)** — timespec.mbt は一実装例 (parse_timespec/parse_range が now~/epoch~/tz~ 注入可、実機確認済み)。`definitions.types` の config 差し替え慣行で now を固定すれば相対形も conformance で決定的に pin できる
- [ ] RECB-Q3b: 型自体を決定的サブセットに絞る (実用型としての価値が下がる)
- [ ] RECB-Q4: **ns と正本の帰属 (要裁定)** — kawaz/timespec.mbt の型を conformance 前提にすると他言語実装も同じ受理文法を再実装する義務を負う
  - [ ] RECB-Q4a: **ns は 3rd 風 (例 `timespec/*`)、正本 descriptor + 受理文法規定は spec 側が持ち、kawaz/timespec.mbt は参照実装 (統括推し)**
  - [ ] RECB-Q4b: builtin ns に昇格 (bare 名で参照可)
  - [ ] RECB-Q4c: 別の整理 (自由記述で)
- [ ] RECB-Q5a: **descriptor 置き場 = builtin-descriptors.json に ns 区分追加 (推し)**
- [ ] RECB-Q5b: 新ファイル分離
- [ ] RECB-Q6a: **提供義務 = conformance 実行文脈での解決可能性のみ、通常 registry は実装裁量 (推し)**
- [ ] RECB-Q6b: builtin 同格の常設義務

## 確認待ち

(現在なし)
