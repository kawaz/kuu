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


### 👺 DNR2-Q1: `duplicate-name` の判定軸 — 生の name か、参照識別子 (id 軸) か

DNR-Q1=a (新 kind `duplicate-name` 追加) は確定。残るのは述語で、素材だけでは決まらない。
DR-046 §1/§2 は「参照識別子 = `id` 軸、未指定なら name が供給、解決は lexical 連鎖」と軸を分けており、
DR-006 の重複禁止の根拠 2 つ (ref/link 解決の曖昧化 / 結果キー衝突) のうち後者は DR-120 が
`export-key-collision` として引き取り済み。残っているのは前者 = 参照識別子軸だけ。

- [ ] DNR2-Q1a: **参照識別子 (id 軸) の重複**で判定 (統括推し) — 明示 `id` を割れば同名でも合法。
  `fixtures/dd/duplicate-decl.json` (name `--` が 2 本、2 本目に `id: "dd2"`) が既にこの形で green
- [ ] DNR2-Q1b: 生の `name` 文字列の重複で判定 — 上記 dd fixture が definition-error に反転する
- [ ] DNR2-Q1c: その他

### 👺 DNR2-Q2: 参加する面 — command は `duplicate-name` に掛かるか

DR-006/DR-003 の明文は「options + positionals」で command に言及が無い。一方 DR-033 は
「command は name を持つ多くのノードの一つにすぎない」とし、DR-120 §4 は結果キー軸では command を
参加させている。**掛ける側に倒すと現行の明文・green fixture と衝突する**:

- DR-120 §7「残す」末尾: 「同名 command 2 本は綴り軸では合法で、結果キー軸で衝突する
  (**相異なる `export_key` を割れば両立する**)」
- `fixtures/export-key/same-name-distinct-keys.json` — option `x` + command `x` (export_key 分割) が
  errors 無しで green。why に「同名の option と command が併存すること自体は合法 (DR-120 §7)」と明記
- `fixtures/complete/dedup.json` / `completer-merge-match.json` / `completer-merge-conflict.json` —
  同名 command `build` 2 本 (export_key 分割) を DR-067 §1「同一スコープ内のトリガ重複は合法」で green

- [ ] DNR2-Q2a: **command は参加しない** (統括推し) — 上記 4 fixture と DR-120 §7 が無傷
- [ ] DNR2-Q2b: command も参加する — DR-120 §7 の当該文を覆し、上記 4 fixture の期待値を書き換える
- [ ] DNR2-Q2c: その他

### 👺 DNR2-Q3: alias 要素 / or・seq の子は参加するか

- alias 要素 (DR-057) は自前の実体を持たず、DR-120 §4 では非占有側。`fixtures/constraints-parse/requires-bool-target.json`
  と `fixtures/failure-actions/ambiguous-non-firing.json` が **同名 alias 要素 `v` を 2 本** 置いて green
- or/seq の子は同一 name スコープの兄弟。参加させると `fixtures/export-key/collision-or-branch-siblings.json`
  (`level` の or 直下に leaf `amount` が 2 本) の expect に `duplicate-name` 2 件の追記が要る

- [ ] DNR2-Q3a: **alias は不参加 / or・seq の子は参加** (統括推し。collision-or-branch-siblings.json を改訂)
- [ ] DNR2-Q3b: alias も or/seq の子も不参加 (= options/positionals 直下のみ)
- [ ] DNR2-Q3c: その他

### 👺 DNR2-Q4: DR-120 §3 の 4 行目 (`{name:"x"}` + `{name:"x", export_key:"y"}` = 合法) の扱い

DNR2-Q1/Q2 をどう裁定しても、この行が「合法」のままだと `duplicate-name` と正面衝突する
(同一スコープ・同名・export_key 分割は `duplicate-name` の中心 case)。

- [ ] DNR2-Q4a: **DR-120 §3 の判定列は「露出キー軸の判定」と明確化** (統括推し) — 当該行に
  「露出キー軸では合法。宣言名軸は DR-054 更新 5 の `duplicate-name` が別途掛かる」を追記
- [ ] DNR2-Q4b: 当該行を definition-error に書き換える (kind 併記)
- [ ] DNR2-Q4c: その他

### 👺 DNR2-Q5: 同名 option 2 本は 2 kind を全列挙するか

`{name:"x"}` + `{name:"x"}` (export_key 無し) は DR-120 §3 の 1 行目で `export-key-collision` 確定。
`duplicate-name` も掛かるなら、DR-054 §4 の全列挙原則からは要素ごとに 2 kind = 計 4 件になる
(集合比較なので抑制規則を置かない限りこうなる)。抑制規則は現行 spec に無い。

- [ ] DNR2-Q5a: **両 kind を全列挙** (統括推し。抑制規則を新設しない)
- [ ] DNR2-Q5b: `duplicate-name` が立つ要素では `export-key-collision` を抑制する
- [ ] DNR2-Q5c: その他


## 確認待ち

(現在なし)
