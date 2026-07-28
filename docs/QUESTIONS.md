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

### 👺 INH-Q1: inheritable の祖先 write-target への `export_key: null` の効き方

projection gaps 洗い直し (2026-07-28) で浮上。`inheritable: true` の要素は祖先スコープに write-target コピーを持ち (DR-059 §5、name を共有)、[DESIGN §11.3](../docs/DESIGN.md) 末尾は「祖先で書いた値を結果に出さず子孫へ流すだけの『導管のみ』(**per-copy** の export_key opt-out) は現機構に無い」と明記している。未規定なのは、**単一の `export_key` 宣言が宣言スコープと祖先コピーの両方にどう効くか**。

- rename (`export_key: "x"`) は「name 共有ゆえ両スコープ一律」が素直な導出で裁定不要 (fixture 化可能)
- **`export_key: null` だけが割れる**: 透過は「その結果キー軸を落とす」操作だが、祖先コピーは葉セルなので「子の昇格」が無く、単に結果から消える = その要素は**全スコープで導管化**する

- [ ] a: **統括推し** — null も一律に効く (全コピー一括の導管化)。export_key は要素の属性でありコピーはそれを共有する (rename と同じ系)。§11.3 が否定しているのは per-copy の**差別化**であって、全体 opt-out は「露出しない値の継承チェーン」として意味が立つ
- [ ] b: inheritable + `export_key: null` は definition-error (露出ゼロの inheritable は書き損じの公算が高い)
- [ ] c: null は宣言スコープのみに効き、祖先コピーは name で露出 (= per-copy 差異を暗黙に作る — §11.3 の設計方針と衝突するため統括は非推奨)

裁定後: fixture pin (inheritable-parse/ に rename 側と合わせて) + DESIGN §11.3 に 1 文追記。

## 確認待ち

(現在なし)
