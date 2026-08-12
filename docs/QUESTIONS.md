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

### CFL-Q1: config_file の committed 判定に link 経由の明示供給を含めるか

実測 (2026-08-12、kuu.mbt issue [command-definition-error-parity-review-followup](https://github.com/kawaz/kuu.mbt) の (2) 節に再現記録) で顕在化。
link は config_file セルを target にでき (decode / lint / parse / resolve すべて通過)、CLI で明示した値が
link 経由で config path として効く。ただし binding の source は Link になるため、DR-133 §3 の committed
判定 (現行実装 = source が cli/env のときのみ Error) から漏れ、**CLI で指定したのに読込失敗が黙認される**。

DR-031 は CLI / link を同順位の明示操作と規定し、DR-121 §4 は Link を独立 source タグとして維持する。
一方 DR-133 §3 は committed を「cli / env 明示」とだけ列挙しており、link の位置づけが未規定。

- [ ] CFL-Q1a: **committed 判定は link を透過し、値の源席の cli/env 性で判定する (統括推し)** — committed の
  意味は「利用者が明示したのに読めないのは失敗」(DR-050 §2) であり、link は明示供給の搬送路にすぎない
  (DR-031 の同順位規定と整合)。sources の観測タグは Link のまま (DR-121 §4 不変) で、committed 判定
  (内部) だけ由来を辿る
- [ ] CFL-Q1b: committed は文字どおり cli/env 直のみ (link 経由は常に黙認) — 現実装の追認。「CLI 指定
  したのに黙認」の観測が残る
- [ ] CFL-Q1c: config_file セルを link target にすること自体を definition-error にする (経路ごと塞ぐ)

### DNR-Q1: 宣言名重複の definition-error に使う kind

kuu.mbt の m3 修正 (2026-08-12) の過程で顕在化 (kuu.mbt issue 2026-08-12-duplicate-element-name-not-rejected)。
同一スコープの宣言名重複 (例: config_file "user" + option "user") は DR-006 / DR-003 の重複禁止 (現役規範)
に反するが、参照実装は decode を通してしまい、binding 層で 2 要素が 1 identity に潰れる実害がある
(`--user alice` が config path として消費され読込エラー)。検査の実装は明確に必要だが、報告に使う kind が
DR-054 の正式列挙に無い — export-key-collision は露出キー軸で、config_file (非占有、DR-120 §4) との
同名はそこに掛からない。

- [ ] DNR-Q1a: **新 kind `duplicate-name` を DR-054 列挙 + schema enum へ追加 (統括推し)** — 宣言名軸の
  一意性違反 (DR-006) は露出キー軸 (export-key-collision) と別軸で、既存 kind への相乗りは意味の希釈。
  追加後、spec fixture (definition-error/) + kuu.mbt 実装
- [ ] DNR-Q1b: 既存 kind に相乗り (invalid-range 等) — 列挙は増えないが「構成の組合せの値域外」の意味から外れる
- [ ] DNR-Q1c: その他

### CVQ-Q1: value 持ち command の配列 value は合法か

DR-133/134 実装レビュー (2026-08-12、fable5-high) で顕在化。[DR-134](decisions/DR-134-command-value-or-scope.md) §1 は
「値を名乗る command は『フィールド名 + JSON scalar / array』」と書くが、参照実装の担体セルは非 accum
(単値) で、配列 value (`{"type":"command","name":"x","value":[1,2]}`) は decode を通った後に単値へ縮む
(黙殺)。既存の definition-error 群では「scalar 要素への配列 default」は invalid-range。

- [ ] CVQ-Q1a: **配列 value は invalid-range (統括推し)** — 担体は scalar literal のみ。§1 の「array」は
  「スコープ (map) でなく値」の対比表現であり array を積極的に約束した文ではない、と読み直して DR-134 に
  1 行明確化。既存の「scalar 要素への配列 default」線と整合
- [ ] CVQ-Q1b: 配列 value を合法にする (担体を accum 化 or 配列 literal 許容 — 実装・意味論の追加設計が要る)

### CVQ-Q2: 透過 (export_key: null) の value 持ち command

同レビュー M3。透過 command (DR-052 §2 で合法) に value を書くと、値の座るキーが無く選択時に値が
無言で消える (現実装)。既存には「宣言定数の置き場が無い構成は definition-error」の線がある
(DR-083 §5 筋の collect_const_on_valueless_wrapper)。

- [ ] CVQ-Q2a: **透過 command への value/default/default_fn は definition-error kind=invalid-range (統括推し)**
  — 置き場の無い宣言定数の既存線と同型。DR-134 §2 の表へ 1 行追加
- [ ] CVQ-Q2b: 合法のまま別の座を定義する (透過の意味論拡張が要る、v1 では過剰の感触)

## 確認待ち

(現在なし)
