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

### 👺 LINKPATH-Q1: link 固定パス DSL — 2 相分解を規範に置くか (重心)

下敷き: [research/2026-07-28-link-fixed-path-dsl-design.md](research/2026-07-28-link-fixed-path-dsl-design.md) §3 (案 1-3)、DR-029。
`link:"timerange.since"` のパスを「セル空間の接頭辞 (定義時静的、宣言構造で降下) + 値空間の残余 (発火時遅延、introspection)」の 2 相に分解する案 1 が推し。effects の cell 単位規範 (CONFORMANCE §3)・DR-122 shadow tree・DR-032 name 参照と無矛盾で、セルに当たる限り既存 link 意味論 (ladder/accumulator/1実体:N参照) が無傷。難点は「同じ綴りでセル同期か値書きかの厚みが変わる」暗黙性 — ただしこれは「スコープ kv はパース時に存在せず、不透明値の内部にセルは無い」という構造的事実の写像 (研究ノート §3 案 1 の難点欄)。

- [ ] a: 案 1 (2 相分解) を規範に置く (推し)
- [ ] b: 値残余のみに絞る (案 3 系 — v1 完備主義に反するため非推奨)
- [ ] c: 保留 (追加検討の指示を添えて)

### 👺 LINKPATH-Q2: 値残余の解決先が発火時 absent のときの挙動 (UX 承認)

導出は「その枝の Reject」一択 (DR-029 解決失敗=Reject + DR-037/038 の系、研究ノート §2/§4-Q2)。UX 帰結の承認が要る: `--since` (部分書き) を使うには、同一解釈内で実体 (`--timerange X`) が**先に**発火する構造を書き手が組む、という要件ごと pin する。

- [ ] a: 枝 Reject + 書き手要件ごと pin (推し、導出どおり)
- [ ] b: 異議あり (方向を添えて)

### 👺 LINKPATH-Q4: value_parser 産の不透明複合値は shadow tree 上で何座か

前提確認済み (2026-07-31 統括実施): sources が構造分解されている fixture は全て**宣言構造由来** (repeat rows / nameless seq tuple / or branch rows) で、value_parser 産複合値・kv-map 合成 map の sources pin は corpus に **0 件** = 白紙で裁定可能 (既存 pin への波及なし)。
推しは構造分解側 — DR-122 §3「タグの決定単位は値の座」の一般適用。leaf 1 タグ案は link 部分書き (`.since` だけ cli) の由来を表現できない。

- [ ] a: 構造分解 (座ごとにタグ、部分書きは当該座のみ `link`) (推し)
- [ ] b: leaf 1 タグ (複合値は 1 座、部分書きで座全体が `link` に化ける)
- [ ] c: 保留

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

### 👺 EXKC-Q1: 露出キー衝突 (option × command) を ambiguous に昇格させるか

出所: [issue/2026-07-25-expose-key-collision-option-command-silent-loss.md](issue/2026-07-25-expose-key-collision-option-command-silent-loss.md) (dogfooding D4 発見の bug、裁定点 a/b は同 issue 記載)。
統括の導出: DESIGN §2.6「command 選択 = 露出 (`{}` kv)」+ DESIGN §15.5 / DR-073「同一露出キーの共露出 = ambiguous」から **(a) 実装バグとして option × command も検出対象** が一意に導かれる (spec に command 除外規定は無い)。実害とされた `kuu help --help` は、kuu-cli が result キー越しに help を判定している経路が原因で、DR-113 help preset (内部セル `#help`、result キー非経由) へ移行すれば衝突ごと消える — (b) で spec 側を歪める必要はないという読み。

- [ ] a: 実装バグ — 衝突検出を option × command へ拡大 + fixture 断面追加。kuu-cli は help preset 移行 (推し)
- [ ] b: spec 側で commands を衝突検出から除外 + result マージ規則を新設
- [ ] c: 保留

## 確認待ち

(現在なし)
