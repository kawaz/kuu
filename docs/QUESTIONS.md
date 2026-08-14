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

### CFM-Q3-β: mid=8 の 1 例目 `values:[...]` の読み

同バッチの CFM-Q3a (複数 config_file 要素の並置は definition-error) は裁定済みで、
[DR-133](decisions/DR-133-config-path-list-fold.md) の再改稿として反映済み。本項だけが未回答。

mid=8 の 1 例目に出てきた `values:[...]` の綴りをどう読むか:

- [x] CFM-Q3-β-a: 配列 default (`default:[...]`) の意で書くのが既存語彙的に素直
- [ ] CFM-Q3-β-b: `values` に「multiple の既定供給列」の用法を持たせる (values 糖衣の意味論拡張)

### DNR-Q1: 宣言名重複 — id 軸分離による再整理 (mid=16)

kawaz mid=16 (2026-08-14) で方向転換: name の多義性 (各軸のデフォルト供給源、DR-046) は保ち、参照
identity が要る場面は既存の `id` 軸 (DR-046 §2、参照識別子、未指定なら name が兼ねる) で分離する。
**name 重複そのものは禁止しない** (旧 DNR-Q1a の新 kind `duplicate-name` は統括撤回)。実害 (binding 層の
identity 潰れ) は id 軸での解決 + 下記規則で解消する。残る規定は 1 点:

- [ ] DNR-Q1-α: **id 無しで name が重複する要素へ参照 (link/ref/observes/borrow) が向いたとき、一意に
  解決できない参照は definition-error。kind は既存 `absent-ref` の意味を「解決できない参照 (不在 + 曖昧)」
  へ広げる (統括推し)** — 黙った先勝ちは DR-062 §1 が @base を退けた発見不能性と同じ罠。列挙も増えない
- [ ] DNR-Q1-β: 曖昧参照に別 kind を立てる (ambiguous-ref 等、列挙が増える)
- [ ] DNR-Q1-γ: その他

参照が無い name 重複は完全に無害 (露出キーは export_key 衝突検査が既に守る) — inert/vacuous の線。


## 確認待ち

(現在なし)
