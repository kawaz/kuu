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

### RECB: conformance 複合値ビークル (int_range 仮想型)

DR-127 波及の fixture (2)(4)(5)(6) と W2-7〜W2-9 の conformance 露出に「複合値を産む conformance 住人」が必要 (現存しない)。設計正本: [docs/research/2026-08-02-record-builtin-type-design.md](docs/research/2026-08-02-record-builtin-type-design.md)。kawaz 方向付け (mid=48〜52): timespec 級の実用型でなく**シンプルな仮想型**、かつ「string 1 個受け入れ」の複雑さを持つ **`int_range: {start:int, end:int}` (string 形 `0..2`)** を実験台に。DR-128 §12 (SPL-Q2=a+b) の `fixture/*` residents 系統に乗せる。

- [ ] RECB-Q1a: **住人 = `fixture/int_range` + `fixture/json` (→value、fixture (4) 用) の 2 つ (推し)** — int_range は record + string 形 + 部分形 + int フィールド参照 (型依存グラフ・パーサ帰属 pin) を 1 型で覆う。json は record が vivify する (absent Reject が起きない) ため value out 住人が別途要る分
- [ ] RECB-Q1b: 他の構成 (自由記述で)
- [ ] RECB-Q2a: **string 形 = `A..B` / `A..` / `..B` を受理、`..` 単体と単独 `A` は reject (推し)** — 部分形は `{start:A, end:null}` 系の部分 presence を産出 (DR-130 null 補形の conformance 素材)。単独 A の暗黙 since 扱いは DR-128 §2 (string 固定の縮退) と不整合なので不採用
- [ ] RECB-Q2b: `..` 単体も受理 (両フィールド null の空 range)
- [ ] RECB-Q2c: 単独 `A` = `{start:A, end:null}` として受理
- [ ] RECB-Q3a: **descriptor 置き場 = builtin-descriptors.json に fixture ns 区分追加 (推し)**
- [ ] RECB-Q3b: 新ファイル分離
- [ ] RECB-Q4a: **提供義務 = conformance 実行文脈での解決可能性のみ、通常 registry は実装裁量 (推し)**
- [ ] RECB-Q4b: builtin 同格の常設義務

(補足: timespec 系実用型 (timestamp/timerange/duration) は本ビークルと独立に、将来 `timespec/*` ns の実型として別 DR で検討 — duration の内部表現 (ms+subms) が固まってからで良い)

## 確認待ち

(現在なし)
