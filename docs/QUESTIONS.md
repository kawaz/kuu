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

### 👺 NULOR-Q1: named 枝 or の null 射影 (NUL-Q3 の裁定が nameless union 前提で覆っていなかった穴)

実例 `{name:"mode", or:[{name:"fast",type:"string"},{name:"slow",type:"int",default:7}]}` — named 枝は入れ子 kv になる (`--mode x` → 現行 `{"mode":{"fast":"x"}}`)。NUL-Q3 の「or はセル単位 1 キー」は枝が値 (union) の場合の話で、named 枝の**内側キー集合**をどうするか未裁定。

- [ ] a: **全枝列挙** — `{"mode":{"fast":"x","slow":null}}`、セル未発火なら `{"mode":null}`。排他は「非選択枝 = null」で表現 (null = 立っていない、の一貫適用。キー集合が常に安定 = 発見性の完遂)。未選択枝の default (slow の 7) は充填しない — 枝の default は選択された枝の中でだけ生きる (既存裁定の null 版) (統括推し)
- [ ] b: 選択枝のみ (sparse — 現行に近いがキー集合が実行ごとに揺れ、発見性と自己矛盾)
- [ ] c: 保留 / 別案

### 👺 NUL2-Q1: accum セルの「クリア」と「[] 行供給」の effects 同形問題 (NUL-Q2 の部分修正)

NUL-Q2=a (empty→set 統一) を effects まで貫くと、accumulator セルでは「クリア (旧 empty、セル操作)」と「`[]` の行供給 (値バインド — 行供給の effects はもともと op:set)」が `entity/op/operand/source` 全一致の wire 同形になる (実物確認: effects の op enum に append は無く、区別は empty op が担っていた)。適用先の意味は座 (セル操作 vs accumulator 供給) で違うが、観測面で潰れる。

- [ ] a: **クリアの観測 op として `empty` を温存** — fn は Value fn 化 (DR-131) しつつ、effects 語彙は `set / default / remove / splice / empty` とする (unset だけ消える)。観測の非単射を規範に持ち込まない (DR-121 §1.2 の思想) (統括推し)
- [ ] b: 同形を容認 (区別が要る消費者は ParserContext を読む)
- [ ] c: 保留 / 別案

## 確認待ち

(現在なし)
