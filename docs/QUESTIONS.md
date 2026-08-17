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

## 👺 CDT-Q1: installer 所有プリセットの type 座返上 (command / dd / help)

### 問題の体系的な位置

`type:` はプリセット選択の座 (DR-028、DESIGN §3.3「独立の type ではなく属性プリセットへの名前」)。ただしプリセットには**所有者の違い**があり、flag / count / tty は**値平面** (カプセルの中身) を構成するプリセット、command / dd は **installer 所有の構造・入口語彙** (DR-042、DESIGN §13.1 installers 行)、help 系 5 種は help_installer 所有。値カプセル移送 (DR-140 §3) で値平面のプリセットは `value` 内に移るが、構造・入口系プリセットは値でないため行き場が無い — GA-Q1=a (要素直下の種別マーカーとして残す) が暫定裁定だが、その**綴り**が未確定。加えて値持ち command (DR-134) は `type:"command"` が座を占有するため値型を書けない歪みがある (kawaz mid=78 発題)。

### CDT-Q1α: command のマーカー化 (mid=85 で内定済みの確認)

- [ ] α-a: **(統括推し、mid=85 で前向き反応)** `"command": true` bool マーカー。commands[] 配置時は省略可、positionals 内は必須。値持ち command は `{"command": true, "value": "string"}` と書けて歪み解消
- [ ] α-b: 現状維持 (`type:"command"` を要素直下に残す)

### CDT-Q1β: dd の対称化と綴りの座

dd は値空間を持たない (DR-130) ので type 座との衝突は起きないが、installer 語彙が値の座を借りている点は command と同族。また現行の name によるトリガ綴り供給は DR-136 §2 の literal 直値特例 (文字写像を通さない) を背負っている。

dd 専用語彙 (`match` / `self`) は dd 以外の要素が読まないのに要素直下の共通名前空間に裸の一般名で座っており、単体で意味が読めない (kawaz mid=97 指摘)。dd object 形はこれも同時に解消する。

- [ ] β-a: **`"dd": true | object` の二形 (統括推し)** — dd 専用語彙を器の中に収める: `{"dd": true}` (marker 既定 `"--"`) / `{"dd": {"marker": "++"}}` / `{"dd": {"match": "^[^\\-]", "self": "keep"}}`。DR-136 §2 の name literal 特例が消え、要素直下から dd 専用語が消滅。string | object 二形は確立イディオム (DR-011/062)
- [ ] β-b: β-a + 器に入れるついでに `self` を自明な名に改名 (`keep_marker: true` bool 化 等 — 具体名は追って設計)
- [ ] β-c: dd は `type:"dd"` 維持 (変更を必要性のある所に限る。match/self の裸置きも現状のまま)

### CDT-Q1γ: help 系 5 preset の扱い

同じ「installer 所有プリセットが type 座に居る」族。値担体は内部セル側なので command ほどの歪みは無い。

- [ ] γ-a: 同時に裁く (`"help": true | {...}` 等 — 具体形は追って設計)
- [ ] γ-b: **後続の別バッチに切り出す (統括推し)** — command/dd と違い緊急の歪みが無く、5 preset × on_failure 既定の設計量が大きい

## 確認待ち

(現在なし)
