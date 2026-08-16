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

## 👺 TYF-Q1: value カプセル内 `type` の object 呼び出し形 (移送ブロッカー)

DR-140 §1 は wire の `value.type` を「常に registry 識別子の string」と規定。一方、型が引数 (config) を取る場合の書き場所が未裁定。collector は object 呼び出し形 (DR-139 の表 — 引数を取る collector は object 形が canonical) を既に持つ。

- [ ] a: **`"type": {"name": "int", "config": {...}}` の object 呼び出し形を許す (string は無引数の縮退)** — collector と同じイディオム (DR-044 §2) で対称。引数付き型を definitions.types で命名せず直書きできる
- [ ] b: type は常に string、引数付きは definitions.types で命名必須 — wire は単純だが、単発利用でも命名を強制
- [ ] c: 保留 (移送は b 相当の現状形で進め、後日拡張)

## 👺 CDT-Q1: command の脱 type 化 (kawaz mid=78 発題への統括提案)

`type:"command"` が type 座を占有し「値持ち command (version 等、DR-134) の値型を書く場所が無い」歪みがある。

- [ ] a: **`"command": true` bool マーカー化 (統括推し)** — commands[] 配置時は省略可、positionals 内のみ必須。dd も `"dd": true` へ対称。type は値の型 (カプセル内) 専用に純化。GA-Q1=a (種別マーカーは要素直下) の綴りをこの形で確定
- [ ] b: `type:"command"` を維持し、値持ち command の値型は別 field で書く
- [ ] c: 別案 (自由文で)

## 確認待ち

(現在なし)











## 👺 GA-Q1: 値なし preset (dd / command / help) のカプセル射影

DR-140 §3 は要素直下 type を無条件に value へ送るが、dd/command/help は値の宣言でなく構造・入口系の種別マーカー。DR 監査で 3 束が独立検出した未規定。

- [ ] a: **dd / command / help の type は value カプセルへ送らず要素直下の種別マーカーとして残す (統括推し)** — 「value 不在 = 値空間なし」の判別と整合し、command の値担体 (DR-134) は別途 value を持てる形が自然
- [ ] b: 一律 value へ送る (`"value": "command"`) — 判別式に例外が増える

## 👺 GA-Q2: help model の CLI 表面綴りの軸

help の command entry name / command_path / program_name が raw name 直取りのまま (DR-113/117)。TRG バッチは effects/errors/origin しか裁いておらず空白。

- [ ] a: **trigger_name 軸 (CLI 表面綴り) — 統括推し**。help は CLI 表面を見せる文書なので、ユーザーが打つ綴りと一致すべき
- [ ] b: raw name のまま (宣言 provenance)
