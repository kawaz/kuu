# 裁定・確認待ち一覧 (ユーザ用)

## 運用規約

<details>
<summary>ゼロコンテキストエージェント向け（本セクションは消さない）</summary>

- 裁定/確認待ち項目を 1項目=1ラベル=1セクション で記載
- ラベル形式: XX-Q1（バッチやセッション内で一意な短プレフィクス、Qn単独の使い回し禁止、長期一意性は不要)
- 依頼形式: 「👺XX-Q1 の裁定お願いします」（参照用途ではラベルに👺を付けない。誤陽性がユーザのハイライト/アラームを汚す）
- チャット提示と同一ターンで本ファイルに記録 + path 指定 commit (push はリリース窓に同乗)
- 裁定が下りたら該当セクションを即削除し、内容は正規の記録先 (DR / issue / journal / close_reason) へ反映。本ファイルは常に「現在待ち」だけを持つ
- 参照は[]()で提示（リポ内は相対、リポ外はフルパス）
- 初版質問/依頼は長文で書かない（ユーザが説明を求めらたら本ファイルに説明を追加し、チャットで👺ラベルで再依頼）
- **選択肢・確認項目は `- [ ] a: …` 形式（チェックボックス + ラベル）で書く**。
  Q / C で記法を分けない。回答は「チェックを付ける」でも「XX-Q1a」と言葉で返すでも通る
  （複数まとめてチェックし「チェックしたよ」の一言で済ませる運用を想定）

</details>

## 裁定待ち

### SRCELEM-Q1: 配列要素ごとの provenance を公開するか

[issue](issue/2026-07-26-array-element-provenance-sources-addressing.md) の論点 1。調査順 1 (到達可能例の実在) は完了した — or/seq 子の消費 0 literal の実装により、`{"name":"pair","seq":[{"type":"string"},{"type":"string","value":"fallback"}]}` + `--pair x` → `pair=["x","fallback"]` (要素ごとの由来 = cli と default) が実機で動き、[fixtures/seq-parse/literal-child-zero-consumption.json](../fixtures/seq-parse/literal-child-zero-consumption.json) で pin 済み (DR-121 §3.2 の断面そのもの)。

残る判断は「**消費者が要素単位の由来で何をするか**」— 到達可能なだけでは公開理由にならない (issue の調査順 3)。named 子に倒せば cell provenance で書けること ([fixtures/seq-parse/literal-child-named-kv-sources.json](../fixtures/seq-parse/literal-child-named-kv-sources.json) で pin 済み) も判断材料。

- [ ] a: 公開しない (cell-level provenance で閉じる。nameless 配列は wrapper に 1 タグ。issue close、DR-121 §3.2 の「要素ごと entry」規定は named 子経路に限定する改訂)
- [ ] b: 公開する (addressing 形式の設計に進む — 形式は次バッチで α/β 分割して諮る)
- [ ] c: 保留 (実利用からの要求が出るまで現状維持。DR-121 §3.2 は「addressing 裁定待ち」のまま)

統括推し: **a**。根拠: (1) 消費者ユースケースが現状挙がっていない (link の deprecated 警告のような具体用途が無い)、(2) 要素由来を区別したい定義は named 子で書けば cell provenance で足りる (kv 経路、pin 済み)、(3) nameless 子は「結果キー軸を持たない = 透過」(DR-052/DR-120 §4) という既定線と、要素 addressing を持たないことが整合する。懸念: DR-121 §3.2 の「複数値 = 要素ごと entry」(SRCADDR-Q2-β=c) を部分的に狭める改訂になる — β 裁定の「席が N 個」という原理は named 経路では生きるので、全面撤回ではない。

## 確認待ち

(現在なし)
