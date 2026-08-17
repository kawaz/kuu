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

## 👺 CDT-Q1: command の脱 type 化 (kawaz mid=78 発題への統括提案)

`type:"command"` が type 座を占有し「値持ち command (version 等、DR-134) の値型を書く場所が無い」歪みがある。

command:true は内定 (kawaz mid=85)。残る論点は **dd の対称化の要否**。

### dd の現行形と可能な全オプション (spec 実物からの採取)

宣言例 (fixtures/dd/ の実物):

```jsonc
{"name": "--", "type": "dd"}                                    // 基本形 (basic.json)
{"name": "++", "type": "dd"}                                    // 方言綴り (dialect-name.json)
{"name": "utility_marker", "type": "dd",
 "match": "^[^\\-]", "self": "keep"}                            // pattern dd = xargs 型 (match-self-keep.json)
{"name": "--", "type": "dd", "required": true}                  // 発火強制 (required-fire.json)
{"name": "--", "type": "dd", "export_key": "marker"}            // export_key は inert (export-key-inert.json)
```

dd が持てる属性の全リスト:

| 属性 | 意味 | 根拠 |
|---|---|---|
| `name` | トリガ綴り (literal 直値、文字写像を通さない特例。省略時 `--` 供給)。`match` があるときは同一性・表示軸のみ | DR-136 §2 / DR-064 §5 |
| `type: "dd"` | 種別マーカー (現行) | DR-064 |
| `match` | regex トリガ (dd 専用) | DR-090 §2 |
| `self` | `"drop"` 既定 / `"keep"` (dd 専用) | DR-090 §2 |
| `required` | 発火 (committed) で充足 (型委譲判定) | DR-093 |
| `export_key` | **inert** (dd は露出キーを占有しない) | DR-130 |
| 表示メタ (`help` / `hidden` 等) | 共通 inert 属性 | DR-046 §3 |

**dd は値空間を持たない** (値セルなし・子なし・result 全キー列挙にも出ない)。つまり command と違い「type 座を占有されて値型が書けない」歪みは **dd では発生しない** — dd 対称化の動機は綴りの一貫性 (種別マーカーは全部 bool) だけで、必要性由来ではない。

- [ ] a: command / dd とも bool マーカー化 (`"command": true` / `"dd": true`) — 種別マーカーの綴りが一貫。dd 側は美観のみの変更
- [ ] b: **command のみ `"command": true`、dd は `type:"dd"` 維持 (統括推し格上げ)** — 変更を必要性のある所に限る。dd は値空間がなく type 座と衝突しない。「type = 値の型」の純化からは外れるが、dd の type は none 系 (値空間なし) の宣言とも読める
- [ ] c: 別案 (自由文で)

## 確認待ち

(現在なし)
