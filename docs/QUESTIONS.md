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





## 👺 VC-Q1: 値カプセルの射程 (research ノート §7.2 の分岐①)

カプセルに入れる宣言の範囲。詳説はチャット 2026-08-16 参照 (具体例つき)。

- [ ] a: 変換 field だけ (piece/type/each/settled/collected の 5 field) — 供給系 (default/env/config_key/completer) は要素直下に残る
- [ ] b: **供給宣言も含む (統括推し)** — default/env/config_key/completer もカプセルへ。要素直下は構造・名前系だけになり「要素 = 構造属性 + 値カプセル」の 2 分。ただし**解決 (ラダー優先順・席テーブル) はカプセルの外** (宣言は入れる/解決は外、ノート §4.5)
- 付随確定 (どちらでも): value_name は**カプセルに入れない** — DR-136 で名前系 5 軸の一員になったため、要素直下の名前軸が座 (入れると二席化 = opus M6 の指摘が DR-136 で自然解消)


## 👺 UC-Q1: tuple 枝の表現 (union 淘汰の前提材)

確定済みの color 例 ([int,int,int] | string) は tuple 前提だが、現行 value_type に tuple は無い (DR-126 §1、DR-128 案(a) で「入力側は seq で足りる」として棄却済み)。出力側の部分構築 (--r で [0,null,null] を作る) には器の形が定義時に確定している必要があり、前提が変わった。詳細: research/2026-08-16-union-culling-settlement.md §1b

- [ ] a: **value_type に tuple を第一級追加 (推し)** — 固定アリティで器の形が定義時確定、record vivify と同じ安全性論拠。DR-126/128 の該当箇所を supersede 申告つきで改稿
- [ ] b: 固定長 array + 注釈で近似 — bare array 記法との union 衝突と vivify 特例が要るため非推奨

## 👺 UC-Q2: 生存ゼロエラーの kind 綴り

union 全枝が未完成で淘汰された (書き込みはあった) 場合の Error の kind。

- [ ] a: `no-complete-branch` (worker 推し)
- [ ] b: 別綴り (例: `incomplete-union` / その他あれば指定を)

## 👺 UC-Q3: tie の裁き (複数枝が同時完成・同一最終書き込み位置)

- [ ] a: **同値なら成功・異値なら ambiguous (推し)** — DR-031 EXP-Q1「同値 default は競合なし」の直接同型 + DR-038 の観測基準
- [ ] b: 無条件 ambiguous (sol reviewer 推し) — 保守的だが同値ケースを不必要に落とす
