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

(現在なし)

## 確認待ち

(現在なし)


## 👺 TRG-Q1: completion candidate の origin は raw name か id か

名前系整理 (trigger_name 軸新設) 後、DR-104 の candidate 同一性 6 フィールドの `origin` (現規定:「由来要素名の文字列」= raw name) の意味が分岐する。明示 id/export_key で分離した同 trigger の合法 ambiguous ケースで、origin が name の書き方 (`dry_run` vs `dry-run`) に依存してよいか。

- [ ] a: **origin = raw name のまま (宣言 provenance)** — 「どの宣言由来か」を示す表示・dedup 用メタと割り切る。DR-104 無改変
- [ ] b: **origin = 参照識別子 (id)** — 実体 identity に揃える (name はここでも値源にすぎない、の一貫)。DR-104 改稿 + dedup 挙動の再導出が必要
- 付随: alias 経由候補の origin は canonical 側か alias 入口側か (どちらの案でも要明記)

## 👺 TRG-Q2: 英数を含まない name (dd の "--" 等) への供給変換

snake(name) を dd の name "--" に当てると id が "__" になり、`requires: "--"` (fixtures/constraints-parse/requires-dd-target.json) が absent-ref で壊れる。

- [ ] a: **英数字を 1 文字も含まない name には変換を掛けない (統括推し)** — 変換の定義を「英数字を含む name の underscore↔hyphen 置換」に限定。dd は素通しで無傷、規則がシンプル
- [ ] b: 掛ける (参照側 fixture も "__" へ追随)
- [ ] c: dd の name は綴り軸専用で id 軸へ供給しない (DR-120 §4 の「dd の name はトリガ綴り軸にのみ効く」の延長) — ただし requires:"--" の解決根拠を別途規定する必要が生じる

## 👺 TRG-Q3: effects[].entity / errors[].element はどの軸の綴りか

CONFORMANCE §2 は「name / id」の両論併記のまま。ハイフン名許容で name と id (snake 変換後) が分岐するため確定が要る。影響 7 fixture。

- [ ] a: **参照識別子 (id) で綴る (統括推し)** — entity/element の目的は「どの実体か」の名指し = identity 軸。ハイフン名でも比較が安定
- [ ] b: raw name (宣言 provenance) — TRG-Q1 の origin と同じ側に寄せる場合

## TRG-C1: 結果キー breaking の確認 (export_key ← snake(name) の帰結)

- [ ] 確認: `{"name":"help-full"}` の結果キーが `help_full` になる (ハイフン名利用者の結果キーが変わる)。裁定明文どおり実行して良いか。fixture 影響 1 件

## 👺 TRG-Q4: lexical スコープを作る条件の正本 (name 純化の徹底範囲)

「name を持つノードがスコープを作る」(DR-025/DR-033) は name 純化後どう言い直すか。`export_key: null` の named 要素 (例: 非露出 config_file) がスコープを作るかで帰結が分岐 — 作らないなら、その子は外側スコープの兄弟として duplicate-id 判定に参加する。レビュー (sol Major1) と fixture 起草の双方が独立に検出した読み割れ。

- [ ] a: **resolved export_key 軸の占有がスコープを作る** — name 純化の徹底 (sol 推し)。`{id:"x", export_key:"box"}` (name 無し) はスコープを作り、`{name:"box", export_key:null}` は透過
- [ ] b: **name presence のまま (現行維持を明文化)** — スコープは書き手が name を書いた構造の反映で、露出の有無 (export_key: null) と独立。「export_key を null にしたら子の参照が外に漏れる」驚きを避ける
- [ ] c: 参照識別子 (id 軸) の占有がスコープを作る — ただし DR-046 §2「id はスコープを生成しない」の既裁定と衝突するので要 supersede

統括推し: **b**。lexical スコープは参照解決の構造で、結果形 (露出) と直交していてほしい。a は「露出を消しただけで子の名前空間が外に合流する」挙動になり、値源純化の趣旨 (name の特別扱い排除) と スコープ構造の安定は別問題と考えるため。
