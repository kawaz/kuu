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

### CNV-Q1: command node の `value` 属性は合法か

issue 棚卸し (2026-08-03) で浮上。schema の node 共通属性と DESIGN は `value` を全 node 位置で合法としているが、実装の CommandDef は carrier を持たず decoder が reject する。DR-120 (command = 結果スコープ) / DR-130 (未選択 command = 親キー null) の下で「command 自身が値を持つ」意味論は定義されていない。

> kawaz 裁定方向 (mid=60): b — command が値を持つのは help/version 等でよく見る形。スコープ生成は
> command 特有でなく (named or も作る)、スコープ = 値が map というだけ。親から見ればどちらも
> フィールド名 + JSON 値であり拒否理由が無い。統括も (a) 推しを撤回し同意。

- [ ] CNV-Q1b 確定待ちの残設計点: **value 持ち command と結果キー占有子の共存規則** — 統括推し:
  「command は値かスコープのどちらかを名乗る」= value 持ち command に結果キー占有子は definition-error
  (非占有子は共存可)。未選択時は従来どおり null で一様。value 供給は既存 node 意味論 (value:/default/fn) のまま。
  異議なければこの形で DR 起草へ

### CFM-Q1: config_file の複数指定の意味論

同棚卸しで浮上。DR-050 は複数 config_file を射程外としており、現実装は宣言順の最後勝ち。

- [x] CFM-Q1a: **複数指定を合法とし「後勝ち (宣言順で後が優先)」を規範化 (統括推し)** — 現実装挙動の追認 + fixture pin。config レイヤの慣習 (後のファイルが上書き) とも整合
- [ ] CFM-Q1b: 逆順 (先勝ち)
- [ ] CFM-Q1c: 複数指定は definition-error (単一のみ合法)
- [ ] CFM-Q1d: マージ意味論 (深いマージ等) を設計 (v1 では過剰の感触)

## 確認待ち

(現在なし)
