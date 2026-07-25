# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。**本質だけを簡潔に**書く — 背景の詳細は findings / issue / DR 側に置き参照で示す (kawaz 指摘 2026-07-25「Q 内では本質だけをもう少し簡潔に。不足を感じた時にはより詳細説明を求める」)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺OR-Q1: `or` を持つ要素が結果スコープを作るか — 既存 fixture 4 件 (10 case) の期待値を更新してよいか

### 現象

option 直下に `or` を書くと結果キーが消えていた。

```
{"options":[{"name":"color","long":true,"or":[{"type":"string"},{"type":"number"}]}]}
--color red → 実測 "red"   (root が object ですらない)
```

他 option 併存だと `{"v":true}` で color が丸ごと消える。`export_key` / `multiple` / `=` 形も無視されていた。同じ body を `definitions.templates` + `ref` で書くと**以前からネストしていた** (`{color:{cname:"red"}}`) ので、直書きと ref で結果形が割れていた。

### spec 側の根拠 (統括が逐語確認済み)

- DESIGN §2.3 「name を持つノード = 結果スコープを作る」/ §2.4 露出規則 / §1.2 は `{"name":"color","or":[...]}` を**例示**し「`or`/`seq` キーは name / multiple / value_name 等と同居可能」と明記
- **DR-025 の「--color の 4 パターン」表は現役節** (Superseded 節より前)。パターン D が `color: {r,g,b} | string` を明示
- CONFORMANCE 「`result` は最終結果オブジェクト」— root が素の scalar になるのはこれ単独でも違反
- 「or を持つ要素は透過」という規定は spec に**存在しない**

### 何が争点か

**既存 fixture 4 件 / 10 case が「平坦露出」(= 壊れた形) を pin している**。実装を spec 側へ寄せると、この 10 case が divergence になる。

対象: `constraints-parse/required-structural-or-branch.json` (2) / `constraints-parse/required-group-structural-or-branch.json` (2) / `value-typing/or-leaf-factory-config.json` (4) / `path-search/variable-arity-ambiguous.json` (2)

ただし `required-structural-or-branch.json` の `why` **自身が**「DR-025 の C 型と字面上食い違って見えるが、既存 fixture が pin している確立済みの実装挙動」「必要なら別途 DR-025 とこの既存確立挙動の整合を issue 化する」と未解決を明記している。そして DR-070 §1b は「**golden fixture は仕様の正本であり、参照実装の現状挙動の写しではない**」と規定している。

### 選択肢

- (a) **fixture を更新する** — 実装が spec 準拠側、fixture が DR-070 §1b 違反の実装写しだったという判断。10 case の期待値を入れ子形へ (`{"num":5}` → `{"level":{"num":5}}` 等)。検証済みで、更新すると凍結中の divergence 10 件が全て解消し完全 green に戻る
- (b) **fixture が正** — 実装修正を revert し、DESIGN §2.3/§1.2 と DR-025 の 4 パターン表を「or は例外」と書き換える DR を起こす
- **統括推し: (a)** — (b) では説明できないものが 3 つある: ①ref 経由と直書きの非対称 (DR-007「ref は構造定義全てを引き継ぐ」違反) ②§1.2 の同居規定が死ぬ (wrapper に着地セルが無く `multiple`/`export_key`/`default` が無言で捨てられる) ③root が scalar になる CONFORMANCE 違反
