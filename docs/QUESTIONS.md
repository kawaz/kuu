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

### 👺 NUL-Q1: conformance 比較規約 — fixture の null キーを runner が自動補完するか (最大の分岐)

null 反転で result は「宣言キー全列挙 + null」になる。fixture の期待値に関心外キーの null を全部書かせるか、runner が定義から宣言キーを導出して「期待側に無いキーは null」と読むか。書き換え量が 108 case (自動補完) vs 560 case (逐語) に分かれる。

- [ ] a: **runner 自動補完** — 期待 result は関心キーのみ書き、無いキーは null と解釈 (導出は同一 fixture の定義から決定的。fixture の可読性も保つ) (統括推し)
- [ ] b: 逐語で全キー書く (厳密一致主義の純形 — 560 case 書き換え + 以降の fixture 記述コスト恒常増)

### 👺 NUL-Q2: effects の op 語彙 — unset/empty は set に統一するか

- [ ] a: **統一** — unset 発火は `{"op":"set","operand":null}`、empty 発火は `{"op":"set","operand":[]}` (Sentinel 縮小の帰結を effects 面まで貫く。op 語彙が減る) (統括推し)
- [ ] b: op=unset / op=empty の観測語彙は残す (値は変わるが操作の意図を op で読める)

### 👺 NUL-Q3: 静的/動的構造の null 埋め境界 (or 枝・repeat 行・record 内側)

統括推し (一括、導出ベース): **or はセル単位で 1 キー** (セルが unset なら `cell: null` 1 個 — 枝は同時列挙しない。DR-120 §2「セルは or 席の 1 つ」の帰結) / **repeat 行の内側も静的宣言キーは null 埋め** (tuple の `[null, x]` と同型) / **動的キー構造 (from_entries / merge / kv-map / config 由来 map) は present のみ** / **record 内側も反転** (closed 語彙なので全フィールド列挙 + null、型導出は `T | null`、DR-126 §3 改定)。

- [ ] a: 上記一括で採用 (推し)
- [ ] b: 個別に異議 (どれかを指摘)

### 👺 NUL-Q4: sources の null 座

- [ ] a: **sources も null** — result と同型のキー集合を維持 (DR-122 §1 の座対応を優先。null 座 = 確定主体なし) (統括推し)
- [ ] b: sources は値のある座だけ (キー集合が result と乖離)

### 👺 NUL-C1: 導出系の一括確認 (異議なければ採用)

- [ ] presence marker (DR-052 §3 の空 kv) は概念ごと廃止 — 選択は null でない kv が語る
- [ ] `export_key: null` (結果キー軸を持たない透過宣言) は**別軸の null** として残置 — 説明の書き分けのみ、命名変更しない
- [ ] 型導出は T / T? を T / T | null へ機械読み替え (DR-051 §3 の系)
- [ ] DR-103 の未選択 scope 述語不参加は裁定不変・根拠の付け替えのみ
- [ ] `absent-ref` / `absent-source` / link-parse/absent-target.json は別概念 (参照先不在) で転換対象外
- [ ] Sentinel 転換 (unset→null / empty→Value fn / default 残留) は null 反転 DR と**別 DR** に分けて起草

## 確認待ち

(現在なし)
