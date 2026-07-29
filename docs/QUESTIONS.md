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

### 👺 INH2-Q1: inherit (値源ラダー 4 段目) 自体の扱い

inheritable 削除 (DR-124) の際の kawaz コメント「消すんだよね inherit 自体」を受けた確認。今回削除したのは inheritable (子の定義から祖先に**書き込み入口**を生やす、書き方向) のみで、inherit ([DESIGN §11.2](../docs/DESIGN.md)、値源ラダー 4 段目 — 子が祖先の値を default として**読む**) は存置している。「ref+name+defaultborrow で済む」の borrow の実体を統括は `inherit: {"from": ...}` と解釈し、代替 fixture (fixtures/value-sources/inherit-from-ladder.json、spec 先行 pin) を作成済み。

- [ ] a: inherit も丸ごと削除 — ラダーは CLI/env/config/default の 4 段に。祖先値の借用手段は当面なし (将来の明示機構まで)。inherit-ladder / inherit-from-ladder / DR-123 の関連記述も削除対象
- [ ] b: **統括推し** — 暗黙チェーン (`inherit: true` = 同名祖先の自動探索) だけ削除し、明示 from (`{"from": ...}`) だけ残す。defaultborrow 構想 (issue 2026-07-15、「勝手に増やすより明示宣言」) の方向と一致、暗黙ルール最小化 (§0.1) にも沿う。socket-ttl ユースケースも書ける
- [ ] c: 両形とも存置 (現状)

裁定後: (a/b なら) DR-124 の追補 or 新 DR + fixture/DESIGN §11.2/DR-031 ラダー段の追随。

## 確認待ち

(現在なし)
