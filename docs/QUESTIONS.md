# 裁定・確認待ち一覧 (ユーザ用)

## 運用規約

<details>
<summary>ゼロコンテキストエージェント向け（本セクションは消さない）</summary>

- 裁定/確認待ち項目を 1項目=1ラベル=1セクション で記載
- ラベル形式: XX-Q1（バッチやセッション内で一意な短プレフィクス、Qn単独の使い回し禁止、長期一意性は不要)
- 依頼形式: 「👺XX-Q1 の裁定お願いします」（参照用途ではラベルに👺を付けない。誤陽性がユーザのハイライト/アラームを汚す）
- チャット提示と同一ターンで本ファイルに記録 + path 指定 commit (push はリリース窓に同乗)
- 裁定が下りたら該当セクションを即削除し、内容は正規の記録先 (DR / issue / journal / close_reason) へ反映。本ファイルは常に「現在待ち」だけを持つ
- 参照は[]()で提示（リポ内は相対、リポ外はフルパス）
- 初版質問/依頼は長文で書かない（ユーザが説明を求めらたら本ファイルに説明を追加し、チャットで👺ラベルで再依頼）
- **選択肢・確認項目は `- [ ] a: …` 形式（チェックボックス + ラベル）で書く**。
  Q / C で記法を分けない。回答は「チェックを付ける」でも「XX-Q1a」と言葉で返すでも通る
  （複数まとめてチェックし「チェックしたよ」の一言で済ませる運用を想定）

</details>

## 裁定待ち

### 👺 REPDEF-Q1: repeat 宣言セルと `default:` の相互作用

Phase 1 (child repeat fixture 先行) で fixture 化を保留した論点。repeat 宣言セルの 0 発火は `[]` (DR-051 §2b) だが、`default:` が同居するときラダーが埋めるのか。

**既存 pin の状況** (裁定材料):

- [fixtures/multiple-parse/declared-default-array-ladder.json](../fixtures/multiple-parse/declared-default-array-ladder.json) — **multiple (accum セル) では未発火時に宣言 default 配列がセル全体を供給** (source=default、DR-083 §4)
- [fixtures/multiple-parse/unset-env-fallback.json](../fixtures/multiple-parse/unset-env-fallback.json) — ラダー開放 + 下位供給なし → `[]` (= `[]` は「無源 terminal」)
- [fixtures/value-sources/positional-default-presence.json](../fixtures/value-sources/positional-default-presence.json) — root positional の `default:` は空席のまま完全経路 (DR-088)

**α (供給の有無・形)**:

- [ ] a: **統括推し** — repeat セルも accum セルと同じラダー規則。0 発火 = uncommitted でラダー開放、`default:` がセル全体を供給 (宣言 default は構造化済み値、配列で書く。DR-083 §2 と同じ)。供給が無ければ `[]`。「`[]` が常に居るので default は影」説 (c) は DR-083 §4 の既存 pin と非対称になるため不採用推し
- [ ] c: default は影 (repeat セルは常に `[]` が先に居る、repeat+default は恒常無意味 = lint 領分)

**β (min との相互作用、α=a のときのみ)**:

- [ ] a: **統括推し** — `repeat:{min:1}` + `default:` の 0 発火も DR-088 の宣言 presence が救って完全経路 (root positional default と同型、位置非依存の系)
- [ ] b: min は枝生成に効く構造制約 (DR-043) なので救わない → missing_operand (default が効くのは min:0 のみ)

裁定後: 採択形を fixture 化して pin + 必要なら DESIGN §5.2 / DR-083 に追記。

## 確認待ち

(現在なし)
