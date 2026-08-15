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

(現在なし)

## 確認待ち

(現在なし)


## 👺 TRG-Q1: completion candidate の origin は raw name か id か

名前系整理 (trigger_name 軸新設) 後、DR-104 の candidate 同一性 6 フィールドの `origin` (現規定:「由来要素名の文字列」= raw name) の意味が分岐する。明示 id/export_key で分離した同 trigger の合法 ambiguous ケースで、origin が name の書き方 (`dry_run` vs `dry-run`) に依存してよいか。

- [ ] a: **origin = raw name のまま (宣言 provenance)** — 「どの宣言由来か」を示す表示・dedup 用メタと割り切る。DR-104 無改変
- [ ] b: **origin = 参照識別子 (id)** — 実体 identity に揃える (name はここでも値源にすぎない、の一貫)。DR-104 改稿 + dedup 挙動の再導出が必要
- 付随: alias 経由候補の origin は canonical 側か alias 入口側か (どちらの案でも要明記)
