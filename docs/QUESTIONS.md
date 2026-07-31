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

### 👺 LINKPATH-Q5: effects への path の載せ方 (新フィールド)

パス付き link の効果を effects でどう書くか。導出寄りは structured な `path` フィールド (segment 配列) の **optional 追加** — 結合文字列 (`"timerange.since"` を entity に混ぜる) は DR-121 §1.1 の禁則で除外済み。新フィールドの追加なので裁定必須 (研究ノート §4-Q5)。

- [ ] a: `path`: segment 配列の optional フィールドを effects entry に追加 (推し)
- [ ] b: effects は cell 単位のまま path を載せない (部分書きの観測は sources 側のみ)
- [ ] c: 保留

### 👺 LINKPATH-C1: 導出系 3 点の一括確認 (異議なければ採用)

いずれも既存規範からの導出 (研究ノート §4 の Q3/Q6/Q7)。個別に異議があるものだけ指摘を:

- [ ] Q3 系: 値残余の座に許す操作 = `set` + Value 返し fn のみ (sentinel 返し unset/default/empty は発火時 Reject)
- [ ] Q6 系: DSL 表層 — `.`/`[`/`]` を含む name はパス起点に書けない (definition-error) / 負 index は発火時点の現在長で確定 / `[int]` のセル空間解釈は「値の座を持つ透過子の並び」
- [ ] Q7 系: DR-029 追補 — 「name 参照 (セル空間) は定義時に束縛 (fixtures/link-parse/absent-target.json が既に pin)、値構造の降下だけが遅延」の分界文を DR-029 に注記

### 👺 RECFLD-Q1: record フィールドに required (presence 保証) マーカーを持たせるか

出所: DR-126 敵対レビュー M2 (2026-07-31)。presence-optional 一律 (チャット裁定 mid=6) の帰結として、(i) 言語バインディング型導出は**全フィールド無条件 T?** に落ちる (presence を保証する宣言手段が無い)、(ii) tty_provider の `{terminal, cygwin}` のような「常に両方立つ」実態を機械可読に書けず description 注記のまま、(iii) 「required 宣言済みキーの不在」を乖離 Error として検出できない。
統括推しは**マーカー導入** (既定 optional、明示 required のみ presence 保証): closed の目的 (struct 直訳) が presence 次元でも完成し、DR-051 §3 の T / T? 導出が record 内でも生きる。乖離 Error に「required キーの不在」が 1 種増えるが §4 の姿勢 (名乗った内容に責任) と同型。反対面: 宣言語彙が 1 つ増える、v1 で必要かは tty_provider 1 例のみ。

- [ ] a: required マーカー導入 (既定 optional) (推し)
- [ ] b: v1 はマーカーなし (全フィールド T?、presence 保証は description 注記) — 後方互換的に足せる
- [ ] c: 保留

## 確認待ち

(現在なし)
