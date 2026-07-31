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

> **LINKPATH-Q1 / Q2 はチャット裁定で確定済み (2026-07-31)**: Q1 = 2 相分解 + **record 型追加による静的化** (descriptor value-type 体系に closed record を新設、DR-107 §3 精密化)。Q2 改 = record 宣言あり → 器 `{}` auto-vivify で部分書き成立 / 宣言なし (map・value) → 枝 Reject の 2 層。record は キー語彙 closed・presence-optional (null 不使用)、乖離 Error は宣言外キー存在 + フィールド値型違いの 2 種、フィールド横断 invariant は final_filters の領分。詳細は research ノート追記 → DR 起草へ。

### 👺 RECP-Q1: record フィールド presence の T 導出 — 宣言信頼か経路保守か

出所: DR-127 敵対レビュー M1 (2026-07-31) — 「指定通り (mid=14/18)」と「経路間の保守側 (mid=16 起点の統括 framing)」が併記され、答えが割れるケースが未調停: 定義片 leaf に `required` / `default` が付いていても、string 形 parser 経路 (部分 range を正規に産む) や organic 部分書き (無橋) では立つ保証が無い。

- [ ] a: **宣言信頼** — `required` 宣言があれば `T` 導出。全経路 (string 形 parser 産出含む) との整合は型作者・定義作者の責任 (乖離検査対象外、lint ヒント候補)。「定義次第」の素直な読み (推し — 導出が型宣言だけで閉じ、利用側定義の事情に依存しない)
- [ ] b: **経路保守** — 当該フィールドを書かない供給経路が定義上可能なら `T?` へ落とす (導出が定義単位になり、link path 入口の有無で型導出が変わる)
- [ ] c: 保留

<details>
<summary>具体例 (a/b で答えが割れる最小ペア)</summary>

題材の型 (完全形しか受けない版の timerange — string 形なし、2 トークン形のみ):

```json
type "strict_timerange":
  input_structure: [
    {"name": "since", "type": "timestamp", "required": true},
    {"name": "until", "type": "timestamp", "required": true}
  ]
  out: {"record": {"since": "number", "until": "number"}}
```

**ケース 1 — 素直な利用定義** (`{"name": "tr", "type": "strict_timerange"}` のみ、link path 入口なし):
供給経路は 2 トークン sub-parse だけで、required により両フィールド必ず立つ。
→ **a も b も `since: number` / `until: number` (T)。一致、問題なし。**

**ケース 2 — 同じ定義に link path 入口を足す** (`{"name": "until", "link": "tr.until"}` を並置):
`--until X` 単独の organic 部分書きで `tr = {until: X}` が成立しうる (vivify、無橋 — fragment の
required は sub-parse 内の消費規則であって organic 経路には効かない)。since が absent の正当値が発生。
→ **a: `since: number` (T) のまま** — 宣言を信頼。実際には absent になり得るので「T が嘘になる」
リスクは、「required 宣言の型に link path 部分書き入口を足した定義」の作者責任とし、lint で警告
(「link 入口が required フィールドの presence 保証を破る」)。
→ **b: `since: number?` (T?) に落ちる** — 導出器が利用側定義を解析し、since を書かない経路
(organic) の存在を検出して防衛。**型導出の結果が利用側定義の書き方で変わる**。

**ケース 3 — 本来の timerange (string 形 `-5m..` が部分 range を正規に産む型、mid=16)**:
型作者はそもそも required を**付けない**のが正しい書き方。
→ a: 付けなければ両案一致で T?。誤って付けた場合は「string 経路と矛盾する宣言」で、a では嘘 T
(作者責任 + lint)、b では無視されて T?。

**判断の芯**: 宣言と実挙動の乖離リスクを誰が背負うか — a は型作者 (+lint の支援)、
b は導出器 (定義解析で防衛、その分導出が型単体で閉じない)。
</details>

## 確認待ち

(現在なし)
