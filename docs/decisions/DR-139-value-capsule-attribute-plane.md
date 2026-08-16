# DR-139: 値カプセルの属性平面 — DR-034 の実体化 (field 全列挙・合成・cardinality 導出・外部界面)

> 由来: kawaz 裁定 VC-Q1=b + 2026-08-16 の系 (ccmsg mid=32-50、AP-Q1〜Q6 / UC-Q4 確定)。
> 導出の正本は `docs/research/2026-08-16-attribute-plane-settlement.md` と
> `docs/research/2026-08-13-value-capsule-design.md` §2.9〜§2.15 / §3。
> **DR-034 §「type と multiple は同じ属性平面への参照」が概念として持ち wire が実体を
> 持たなかった属性平面を、本 DR が実体化する。** wire 射影 (綴り・入れ子形・縮退形) は
> DR-140 が規定し、本 DR は平面そのもの (field・型・時点・合成・界面) に閉じる。
> 前提 DR: DR-126 / DR-137 (value_type)、DR-138 (union 値の確定)。

## 決定

### 1. カプセルの field 全列挙

要素の「値がどう作られるか」の宣言は 1 個の**値カプセル**に集約される。field は
供給 6 + 変換 5 + 収集 3 の 14 で尽きる。

#### 1.1 供給の宣言 — 宣言だけを持ち、解決はセル外 (VC-Q1=b)

| field | 型 | 席 / 位相 |
|---|---|---|
| `default` | any (JSON) | ラダー 4 段目の席宣言 (DR-031) |
| `default_fn` | string \| array[string] | default 席の fn 宣言 (DR-114 / DR-125 `borrow:` 込み)。`default` と同席・排他 (既存規定のまま) |
| `env` | string | ラダー 2 段目の席宣言 (DR-049) |
| `config_key` | array[string \| int] | ラダー 3 段目の席宣言 (DR-050) |
| `completer` | registryIdentifier | 補完クエリの値位置候補 (DR-104 / DR-117) |
| `const` | any (JSON) | **セル初期化位相** — ラダー席ではない (DR-031「const は値セルに最初からいる」)。現行 wire の `value:` 属性 (消費 0 の宣言定数、DR-030) の平面上の座で、綴りの移動は DR-140 §2 |

**解決機構は変えない** — 席テーブル・結果セル構築は engine のまま (DR-110 §6 #10/#11)、
provider 契約 (DR-049/DR-050) も不変。カプセル化は宣言の置き場を 1 段深くするだけである。
`const` (初期化位相) とラダー席宣言が 1 オブジェクトに同居するが、**位相の区別は field の
意味として保たれる** — const は席でなく初期値であり、序列に参加しない (DR-031 不変)。

**カプセル外に残るもの** (包含側列挙): 名前系 5 軸 (`name` / `trigger_name` / `id` /
`export_key` / `value_name` / `display_name` — DR-136。`value_name` をカプセルに降ろすと
名前軸だけが 2 箇所に散るため外)、入口 (`long` / `short` / `alias` / `exact` / `match` /
`self`)、構造 (`or` / `seq` / `options` / `positionals` / `commands` / `ref` / `link` /
`optional` / **`repeat`**)、制約 (`required` / `requires` / `conflicts_with` /
`exclusive_group` / `required_group`)、表示メタ (`help*` / `hidden` / `deprecated`)、
スコープ設定 (`config` / `definitions` / `global` / `on_failure` / `insert_form`)。

#### 1.2 変換 field — 命名は type (parse) 基準の位置語 + 役割語 (AP-Q1)

| field | io 型 | 時点 / 単位 | 現行 wire 属性 |
|---|---|---|---|
| `pre_filters` | string → string | parse **前**、piece ごと (座席 B) | `piece_filters` |
| `type` | 境界マーカー + 内包プリセット参照 (string → T の parse を担う registry 参照) | piece → 値の境界 | `type` |
| `post_filters` | T → T | parse **後**、piece ごと (座席 C) | `value_filters` |
| `final_filters` | T → T | 確定した最終セル値へ 1 回 (**非 accum 専用**、綴り不変) | `final_filters` (座席 D1) |
| `collected_filters` | Acc → Acc | 累積後の配列へ 1 回 (**accum 専用**) | `accum_filters` (座席 D2) |

- **命名軸の整合 (DR-079 §2 の部分再裁定)**: DR-079 §2 が `pre`/`post` を全廃した理由は
  「pre は parse 基準・post は accumulator 基準という**別の軸**が対に見えた」非対称である。
  本裁定の `pre_filters` / `post_filters` は**両方とも type (parse) 基準**に統一されており、
  DR-079 が排除した欠陥そのものは再来しない。`final` / `collected` は値の様態語で、
  位置対 (pre/post) と様態 (final/collected) の役割が field の並び (カプセル内はライフ
  サイクル順) から読める。座席 A (`raw_filters`、分割前) の**名前予約と未配線は DR-079 §3
  のまま不変** — カプセル内の座 (separator の手前) として予約が引き継がれる
- chain field 4 つの二形 (`array` = 差し替え / `{prepend, append}` = 継承合成) は
  DR-062 §2 のまま。`type` が string 域 / T 域の境界に位置として置かれることで、DR-050 §4
  の「供給値が string ならカプセル先頭から、T 一致なら `type` の直後から」が構造的に読める
  (直書き時の可視性 — preset 合成後の可視化は help / lowered 断面の関心)

#### 1.3 収集の座 — accum 専用

| field | 型 | 時点 |
|---|---|---|
| `separator` | string | 分割 — `pre_filters` の手前 |
| `accumulator` | string \| `{name, flatten?}` (`flatten` は `append` のダイヤルで accumulator に従属 — DR-105 §1/§2 / DR-111 §4 不変、他 accumulator への宣言は invalid-range のまま) | 累積 — `post_filters` と `collected_filters` の間 |
| `collector` | registryIdentifier (filters registry の Acc → U — DR-036「collectors registry は新設しない」不変)。省略時は accumulator の `default_collector` | 最終整形 — `collected_filters` の後 |

代表 4 パターン (kawaz 確認済み、2026-08-16 mid=50 が例の正本):
`accumulator: "append"` (list) / `accumulator: {name: "append", flatten: true}` (repeat の
cons 平坦化) / `accumulator: "increment"` (count 系 → number) /
`accumulator: "append", collector: "from_entries"` (map 化)。

### 2. 外部界面は型シグネチャのみ

カプセルの外 — engine の構造層、制約、隣接要素 — がカプセルに依存してよいのは
**結果型 T (union なら枝の型集合) と cardinality (Acc かどうか) だけ**である。
フィルタ構成・供給の詳細は評価時にカプセル内で閉じ、外から覗く規範を持たない。
help / completion が純データとしてメタを読むのは関心の分離であって境界破りではない
(DR-113 / DR-104 が既に宣言層を読む立場)。cardinality = Acc の外部像は **`array<T>` 包み**
が既定で、collector が別の外形 (map 等) を取る場合はその出力型 U が外部型になる。

#### 2.1 cardinality の導出は一方向

> **cardinality は `repeat` (カプセル外) または収集トリガ 3 field (`separator` /
> `accumulator` / `collector`) のいずれかの宣言から導出する。`collected_filters` と
> `final_filters` は導出に参加しない被判定側である。**

- DR-102 §1 の `is_accum_elem` (multiple ∨ repeat ∨ separator) はこの導出式に置き換わる —
  束ね名 `multiple` の単独宣言が `accumulator` 宣言に写る等価変形であり、適格集合は
  保存される
- wrong-seat は DR-102 §3 の継承: 非 accum カプセルの `collected_filters` / 収集座、
  accum カプセルの `final_filters` は definition-error `invalid-range`。トリガ集合から
  `collected_filters` を外すことで「collected_filters が書けるかを適格判定に使う」自己参照は
  構造的に発生しない
- **判定の入力は registry 解決・カプセル合成後の平面である (AP-Q5=b)** — type プリセットは
  収集座を注入できる (count preset の `increment` accumulator が既存実例 — DR-105 §1/§3、
  LOWERING §A.5) ため、直書き属性だけを見る判定では適格が決まらない。DR-102 §2
  (unknown-vocab は自 registry の owns のみ) と §3 の「wrong-seat 成立時は中身を一切解釈
  しない」は不変で、動くのは判定の入力面だけ。type 解決は元から definition-time なので
  検査時点が実行時に遅れることはない

#### 2.2 「空」と「不成立 ⊘」

カプセルは全 field を一様に持たない。非 accum カプセルに収集座と `collected_filters` は
「空」でなく**存在しない** (⊘) — wrong-seat の definition-error が構造から導出できる。
`type: "none"` 要素は**カプセル自体が ⊘** である (DR-089 の「値空間なし」のカプセル語彙
での言い換え — none への変換 field 宣言は DR-102 §3 明確化の invalid-range のまま)。

### 3. 2 層構造 — セルカプセル 1 組 + 枝別は type プリセット

カプセルの field は**セル単位で 1 組**とし、枝ごとの細工は type プリセット参照
(DR-034 §合成の「type = カプセル平面のプリセット」の一般化) で表現する。淘汰 (DR-138) は
セルカプセルの確定相の仕事、枝内の変換は各プリセットの仕事 — 役割が層で分かれる。
union の descriptor 露出は**構造の分岐 (`input_structure` の or) まで** (AP-Q4=a) —
string 内の字句分岐は parser の関心のままで、宣言に出さない (DR-128 §2 / DR-132 の
現行線と一致。字句まで出すと二重管理)。

### 4. 合成は field 単位・深さ 1 段

優先順 (低 → 高): 組み込み初期値 → type プリセットのカプセル → ref 元の field
(DR-062 §3) → 要素直書き (DR-062 §4 の後勝ち丸ごと上書き)。

- **マージの深さは 1 段 (field 単位) のみ**。field の中身 (chain 配列・accumulator object)
  は丸ごと上書きで内側を混ぜない。chain field の `{prepend, append}` は例外ではなく
  明示的に宣言された演算子 (DR-062 §2/§5 — 中間挿入は表現しない)
- **DR-133 §3 (深いマージはしない) との書き分け**: あちらは config **値** の fold で、
  深いマージを退ける理由は「配列は連結か置換か」のダイヤルの忌避。こちらは**宣言の
  構成要素**で、field ごとの合成規則が型で決まっている (chain は二形演算子、スカラ field は
  後勝ちのみ) ためダイヤルが発生する余地がそもそも無い — 理由が違う 2 つの「深さ 1 段」
- `link` = インスタンス共有 (合成なし)、`borrow` = default 席の fn (`default_fn` の値)。
  合成が起きるのは ref + type / プリセットだけ (DESIGN §10.2/§10.3 / DR-029 / DR-125 不変)

### 5. `multiple` 束ね名と multiple registry の廃止 (AP-Q3=b)

- wire 属性 `multiple` は廃止する。4 装置 (separator / accumulator / collector / flatten) は
  §1.3 の座に時点順で座り、「複数値経路のスイッチ」の意味は §2.1 の cardinality 導出に
  還元される
- **multiple registry (DR-036) も廃止する**。プリセットの実質は DR-036 自身が accumulators
  registry の属性セット拡張 (accumulator + default_collector + default_separator) へ既に
  移しており、残余は「2 field を 1 語にする」糖衣のみ — `"append"` 相当は
  `accumulator: "append"` の 1 field で等価、`"set"` は `accumulator: "append",
  collector: "to_set"` の 2 field。よくある組合せに 1 語が欲しい場合は definitions の
  type プリセット (§3 / DR-034 §合成の一般枠) で作る。registry 区分は 1 つ減る
- `repeat` は**カプセル外に残る** — 消費構造の属性 (何回発火できるか、DR-043 の分離のまま)
  であり、カプセルへの寄与は §2.1 の導出式に 1 入力として入るだけ。repeat lowering が
  `accumulator: {name: "append", flatten: true}` を値セルへインストールする形 (DR-105 §3)
  は不変で、installer の書き先がカプセルの座になるだけである

### 6. 時点は静的骨格ではない — 値源 × 型の動的分岐 (確認規定)

field の並びは「静的な通過経路」ではなく「**この段に来た値に適用するものの宣言**」であり、
どの段から入るかは値の型が決める (DR-050 §4 の一般規則の確認 — 新規裁定なし):

| 供給 | `pre_filters` (string 域) | parse (`type`) | `post_filters` (T 域) | 累積 |
|---|---|---|---|---|
| CLI args / env (string) / config・default の JSON string | 通る | 通る | 通る | 通る (env は separator 分割も効く — DR-049 §2) |
| config・default の型一致の非 string / tty 観測値 | スキップ | スキップ | 通る | — |
| config・default の array (accum) | piece が string なら通る | 同左 | 各 piece に | 分割済み pieces として accumulator へ (DR-083 §2) |
| 型一致 array (tuple / union の完全値) | スキップ | スキップ | 通る (完成判定込み — 完成値でなければ型不適合、DR-137 §2) | — |
| cell fn の型付き Value | 再通過しない | 再通過しない | 通る | 通る (DR-114 §6.1) |
| cell fn の null Value / Sentinel | — | — | 素通し / 対象 piece なし (DR-130 §3 / DR-131) | — |

`final_filters` / `collected_filters` は供給単位でなく確定相 1 回 (argv_pos 帰属 =
args.length を含め DR-102 §4 不変)。DR-050 §4 の寛容 coercion (string 要素への JSON 数値の
文字列化) は型一致判定から導けない別規則のまま残る — 本 DR は解消を主張しない。

## 根拠

### 一次アンカーの実体化であって新提案ではない

DR-034 §「type と multiple は同じ属性平面への参照」は「属性平面 (全属性): processor /
default / accumulator / separator / collector / 入力消費数 / …」と 4 段合成順を既に規定して
いた — kuu は概念として値カプセルを持っており、wire がフラットに展開していただけである。
本 DR の field 列挙・合成順は DR-034 の言い直しで、新設は cardinality 導出の一方向規則
(§2.1) と界面規律 (§2) に限られる。

### 界面を型シグネチャに絞るから解体が成立する

`multiple` 解体 (§5) に対する「判定がカプセル内外をまたぐ」懸念 (レビュー 3 系統一致) は、
またぐ情報を型シグネチャ (cardinality) に限定する §2 の規律で畳まれる — 外はカプセルの
中身が変わっても判定が変わらない。

## 波及

- **DR-034**: 本 DR が実体化 (更新注記)。属性平面・4 段合成の裁定は本 DR に引き継がれ生存
- **DR-036**: multiple registry の新設と `multiple` の書き方が superseded (accumulators の
  属性セット拡張・collectors 統合・DR-044 from_entries は生存)
- **DR-079**: §2 の「pre/post 全廃」が部分 superseded (§1.2 — type 基準で対称に再アンカー。
  §1 の座席格子・§3 raw_filters 予約・§4 registry 純化は生存)
- **DR-102**: §1 の `is_accum_elem` 導出式が §2.1 へ置換、§2/§3 の判定入力が合成後平面へ
  (AP-Q5=b)。§3 の構造ゲート先行・§4 の argv_pos 帰属・§5 は生存
- **DR-062**: 継承インターフェース (二形・後勝ち・中間挿入なし) は本 DR §4 が適用範囲を
  カプセル field へ広げる形で生存 (supersede ではない)
- **DR-031 / DR-049 / DR-050 / DR-110 / DR-114 / DR-125 / DR-133**: 不変 (§1.1/§4/§6)
- **wire 射影・const 吸収・schema / REFERENCE / fixture の追随**: DR-140 と移送台帳
  (`docs/research/2026-08-16-value-capsule-migration-ledger.md`) へ
- **kuu.mbt / kuu-cli**: 移送サイクルの lockstep 窓

## 採用しなかった案

### 時点軸の field 名 (`piece` / `each` / `settled` / `collected`)

検討段の素描 (カプセルノート §2.15)。適用単位 (each)・様態 (settled/collected)・作用対象
(piece) の 3 軸が混在し、DR-079 §2 が解消した非対称の別形になる。AP-Q1 裁定で type 基準の
位置語 + 様態語へ統一。

### 作用対象アンカーの維持 (`piece_filters` / `value_filters`)

DR-079 §2 を動かさない保守側。`value` がカプセル名 (DR-140 §1) になるため
`value_filters` の字面衝突が新たに生じ、piece / value / final / accum の 3 語目・4 語目が
位置語と様態語の混在のまま残る。

### 枝ごとのカプセル / 枝別ラダー

DR-138 §3 (ラダーはセル単位) / §2.11 の 2 層構造と矛盾。枝別の細工は type プリセットで
表現できる。

### multiple registry の温存 (断片プリセット参照 field の新設)

参照 field が 1 つ増え「同じ構成が 2 通りの綴りで書ける」二形が残る。糖衣の実質は
accumulators の属性セット拡張が既に担っている (§5)。

## 関連

- DR-034 (属性平面と 4 段合成 — 一次アンカー、本 DR が実体化)
- DR-140 (wire 射影 — カプセル名 `value`・入れ子形・縮退形・const 吸収)
- DR-036 / DR-044 / DR-105 / DR-111 (収集装置の語彙 — §1.3/§5)
- DR-062 (継承の二形 — §4)、DR-079 (座席格子と命名 — §1.2)
- DR-102 (座席の帰属と wrong-seat — §2.1/§2.2)
- DR-031 / DR-049 / DR-050 / DR-083 / DR-114 / DR-125 / DR-130 / DR-131 (供給と解決 — §1.1/§6)
- DR-110 (席テーブル = engine — 解決を外に置く根拠)
- DR-126 / DR-137 / DR-138 (value_type と union 値の確定 — §2/§3 の前提)
- DR-136 (名前系 5 軸 — カプセル外の線引き)
- docs/research/2026-08-16-attribute-plane-settlement.md (導出の正本)
- docs/research/2026-08-13-value-capsule-design.md §2.9〜§2.15 (裁定の記録)
