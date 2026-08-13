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

- [ ] CFM-Q3-β-a: 配列 default (`default:[...]`) の意で書くのが既存語彙的に素直
- [ ] CFM-Q3-β-b: `values` に「multiple の既定供給列」の用法を持たせる (values 糖衣の意味論拡張)

### DNR-Q1: 宣言名重複の definition-error に使う kind

kuu.mbt の m3 修正 (2026-08-12) の過程で顕在化 (kuu.mbt issue 2026-08-12-duplicate-element-name-not-rejected)。
同一スコープの宣言名重複 (例: config_file "user" + option "user") は DR-006 / DR-003 の重複禁止 (現役規範)
に反するが、参照実装は decode を通してしまい、binding 層で 2 要素が 1 identity に潰れる実害がある
(`--user alice` が config path として消費され読込エラー)。検査の実装は明確に必要だが、報告に使う kind が
DR-054 の正式列挙に無い。

**DR-135 (2026-08-14) による前提の変化**: 起票時の「export-key-collision は露出キー軸で、config_file
(非占有、DR-120 §4) との同名はそこに掛からない」は成立しなくなった。config_file は通常要素として
露出キー衝突検査に**占有子として参加**する ([DR-135](decisions/DR-135-config-file-is-a-normal-element.md) §4)
ので、由来の主実害ケース (config_file `user` + option `user`) は両方が露出キー `user` を名乗る 2 セルとして
`export-key-collision` で捕まる。

**それでも DNR-Q1 は残る** — 露出キー軸で掛からない宣言名重複が書けるため:

- 一方に `export_key` を書いて露出キーをずらすと (config_file `user` + option `user` + `export_key: "u"`)、
  露出キーは別なので衝突しないが**宣言名 `user` は重複したまま**。link / ref / observes の参照アドレス
  (宣言名軸、DR-046 の id 軸) が 2 要素のどちらを指すか曖昧になる
- 両方に `export_key: null` を書く形も同様 (露出キーを持たないので検査対象外)

したがって射程は「露出キー軸で掛からない宣言名重複」へ狭まったが、kind の選定 (下記の選択肢) は
そのまま生きている。

- [ ] DNR-Q1a: **新 kind `duplicate-name` を DR-054 列挙 + schema enum へ追加 (統括推し)** — 宣言名軸の
  一意性違反 (DR-006) は露出キー軸 (export-key-collision) と別軸で、既存 kind への相乗りは意味の希釈。
  追加後、spec fixture (definition-error/) + kuu.mbt 実装
- [ ] DNR-Q1b: 既存 kind に相乗り (invalid-range 等) — 列挙は増えないが「構成の組合せの値域外」の意味から外れる
- [ ] DNR-Q1c: その他

## 確認待ち

(現在なし)
