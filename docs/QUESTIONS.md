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








## 👺 CR-Q1: final_filters の座の扱い (5 系統レビューの帰結)

mid=57 の「collector 後の共通最終座」に 4 系統 (sonnet/luna/fable/opus) が異議 — U 依存の 2 型内包は DR-102 が解体した構造欠陥の再来、map への filter 語彙も不在。

- [ ] a: **mid=55 の形へ戻す (統括推し)** — final_filters = 非 accum の確定値 (T→T) / post_accum_filters = accum の collector 前 (array→array) の排他 2 座。collector 後 U への検証需要が将来実在したら「カプセル外の値述語席 (制約側)」で受ける旨を DR に注記 (opus 新視点)
- [ ] b: 共通座を維持し DR-102 を部分 supersede (U 依存 registry 選択 + map 語彙空集合の扱いの追加裁定が必要)

## 👺 CR-Q2: default 畳みの縮退形

`"default": {"env": "X"}` が「畳み object」と「record リテラル既定値」で原理的に曖昧 (3 系統一致)。

- [ ] a: **縮退なし — 値は常に `{"value": ...}` の下 (統括推し)**。default 持ちは実測 12 エントリ規模で税は軽微
- [ ] b: 非 object 値に限り縮退可 (条件付き規則が 1 個増える)

## 👺 CR-Q3: default 畳み (bundle) の合成則

type preset が default.config を持ち、使用側が default.env だけ書いた場合。

- [ ] a: **bundle 内 field 単位の後勝ち (統括推し)** — preset の config は保持され env だけ差し替わる。「合成の深さ 1 段」の例外として default に限り深さ 2 を明文化 (DR-081 の源ごと書き換えモデルと一致)
- [ ] b: bundle 丸ごと置換 — preset の供給宣言が直書き 1 個で全消えする
