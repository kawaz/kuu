# DR-139: 値カプセルの属性平面 — DR-034 の実体化 (field 全列挙・defaults 配列・合成・cardinality 導出・二面界面)

> 由来: kawaz 裁定 VC-Q1=b + 2026-08-16 の系 (ccmsg mid=32-65、AP-Q2〜Q6 / UC-Q4 /
> CR-Q1〜Q3 確定)。導出の正本は `docs/research/2026-08-16-attribute-plane-settlement.md` と
> `docs/research/2026-08-13-value-capsule-design.md` §2.9〜§2.16。
> **DR-034 §「type と multiple は同じ属性平面への参照」が概念として持ち wire が実体を
> 持たなかった属性平面を、本 DR が実体化する。** wire 射影 (綴り・入れ子形・縮退形) は
> DR-140 が規定し、本 DR は平面そのもの (field・型・時点・合成・界面) に閉じる。
> 前提 DR: DR-126 / DR-137 (value_type)、DR-138 (union 値の確定)。

## 決定

### 1. カプセルの canonical field は 11

要素の「値がどう作られるか」の宣言は 1 個の**値カプセル**に集約される。canonical field は
**供給系 3 + 変換 5 + 収集 3 の 11** で尽きる (defaults 配列の**要素**は field ではなく
provider fn 呼び出し — 数え分けに注意)。

カプセル内 field の並びに全順序の規範は無い — 変換主鎖 (pre_type → type → post_type →
final / post_accum) とラダー宣言 (defaults の試行順) という **2 本の順序付き軸を持つ DAG の
正規線形化**として「ライフサイクル順に読める」だけである。この並びは宣言の読み方の話で
あって、実行時にどの段を通るかは §6 (値源 × 型の動的分岐) が別に決める。

#### 1.1 供給系 — canonical は `defaults` 配列 + `const` + `completer`

| field | 型 | 位相 |
|---|---|---|
| `defaults` | array — **default provider fn の試行列** | 値源ラダーの CLI/link 未満の全席を一般化した宣言。**順序 = 試行順、最初に成立した供給が勝つ** (DR-081 の書き換えモデルと等価) |
| `const` | any (JSON) | セル初期化位相 — ラダー席ではない (DR-031「const は値セルに最初からいる」不変)。現行 wire の `value:` 属性の平面上の座 (綴りの移動は DR-140 §2) |
| `completer` | registryIdentifier | 補完クエリの値位置候補 (DR-104 / DR-117)。**供給でなく観測系** — カプセル内に置くのは値の宣言との同居のためで、パース時の値決定に関与しない |

`defaults` の要素は universal fn の部品列 (DESIGN §8.4 / DR-114 の既存文法):

```jsonc
"defaults": [
  "env:HTTP_HEADERS",          // env provider fn
  "config:http.headers",       // config provider fn
  "borrow:base_headers",       // 祖先値 (DR-125 §3 — defaults 要素の一形へ一般化)
  {"value": []}                // literal は typed object (DR-114 §4 — string DSL へ serialize しない)
]
```

- **open set** である (DR-094 の ns 付き識別子) — ユーザ定義 provider も同じ口で書ける
- **wire 表層の `env:` / `config_key:` / `default:` / `default_fn:` は糖衣として残る**
  (DR-140 §3)。lowering が既定試行順 (env → config → default — DR-031 の固定順) で
  `defaults` へ展開する。`long: true` = `[":set"]` と同じ string | array の二形イディオム
- **糖衣等価性の帰結として観測は不変** — 各 provider fn は自分の source タグを宣言する
  (env 系 = `env`、config 系 = `config`、それ以外 = `default`)。糖衣で書かれた既存定義の
  sources / effects は展開前後で変わらない (DR-031 の source 語彙は不変)
- **auto 系 (env_auto 等) は「defaults へ要素を自動注入する installer」**として再定式される。
  明示の対応要素があれば注入しない (明示優先)
- **合成は filter chain と同じ配列イディオム** — 既定は丸ごと置換、`{prepend, append}` で
  継承合成 (DR-062 §2 の二形)。type プリセットが供給宣言を持つ場合 (実用上は縁の少ない形、
  CR-Q3=a) も同じ規則で受ける
- **DR-031 への波及**: ラダーの席順序は「糖衣の既定展開順」として固定のまま生存するが、
  canonical の `defaults` では**宣言順がそのまま試行順**であり、順序は書ける (DR-031
  「順序は固定 (設定可能にしない)」の部分 supersede)。CLI / link がラダー最上位であることは
  不変 — `defaults` は CLI/link の committed 供給が無い場合の試行列である (DR-138 §3 の
  セル単位 gate も不変)

**カプセル外に残るもの** (包含側列挙): 名前系 5 軸 (`trigger_name` / `id` / `export_key` /
`value_name` / `display_name`) **と、それらへの供給源である `name`** (DR-136 §1 — `name` は
軸ではなく各軸のデフォルト供給源なので軸の数には入らない。`value_name` を降ろすと名前軸だけが
2 箇所に散るため外)、入口 (`long` / `short` / `alias` / `exact` / `match` / `self`)、構造
(`or` / `seq` / `options` / `positionals` / `commands` / `ref` / `link` / `optional` /
**`repeat`**)、制約 (`required` / `requires` / `conflicts_with` / `exclusive_group` /
`required_group`)、表示メタ (`help*` / `hidden` / `deprecated`)、スコープ設定 (`config` /
`definitions` / `global` / `on_failure` / `insert_form`)。

供給の**解決機構は変えない** — 席テーブル・結果セル構築は engine のまま (DR-110 §6
#10/#11)、provider 契約 (DR-049/DR-050 の `(key)→string|null` / `(path)→object|null`) も
不変。カプセル化と defaults 配列化は**宣言の置き場と形**の話である。

#### 1.2 変換 field — アンカー全明示 + 様態語 (CR-Q1=a)

| field | io 型 | 時点 / 単位 | 現行 wire 属性 |
|---|---|---|---|
| `pre_type_filters` | string → string | parse 前、piece ごと (座席 B) | `piece_filters` |
| `type` | 境界マーカー + 内包プリセット参照 (string → T の parse を担う registry 参照) | piece → 値の境界 | `type` |
| `post_type_filters` | T → T | parse 後、piece ごと (座席 C) | `value_filters` |
| `final_filters` | T → T | 確定した最終セル値へ 1 回 (**非 accum 専用**、綴り不変) | `final_filters` (座席 D1) |
| `post_accum_filters` | array → array | 累積後・collector 前の配列へ 1 回 (**accum 専用**) | `accum_filters` (座席 D2) |

- **これは DR-079 採用しなかった案「アンカー全明示」の再採用である**。DR-079 が棄却した
  理由は「完全自己記述だが冗長で、wire に書く名前として重い」— 要素直下にフラットに並ぶ
  前提の判断であり、**カプセル入れ子化で無効化された** (カプセルの中では文脈が
  「値の作られ方」に閉じており、`pre_type` / `post_type` / `post_accum` のアンカー明示が
  そのまま読み順の地図になる)。DR-079 §2 が排除した「別軸が対に見える非対称」は、全て
  アンカー (type / accum) を明示することで構造的に再来しない
- **`final_filters` だけ様態語で残る**のは終端座の固有価値による — この座の意味は
  「何かの後」ではなく「確定した最終値への一回」であり、位置アンカーで書くと
  (post_settle 等) かえって新しい軸を導入する。綴り不変は移送コストも消す
- 座席 A (`raw_filters`、分割前) は **DR-079 §3 の名前予約・未配線のまま** — 配線時に
  本体系のアンカー明示 (該当座は separator の手前) へ揃える
- chain field 4 つの二形 (`array` = 差し替え / `{prepend, append}` = 継承合成) は
  DR-062 §2 のまま。`type` が string 域 / T 域の境界に位置として置かれることで、DR-050 §4
  の「供給値が string ならカプセル先頭から、T 一致なら `type` の直後から」が構造的に読める

#### 1.3 収集の座 — accum 専用、separator は第一級

| field | 型 | 時点 |
|---|---|---|
| `separator` | string | 分割 — `pre_type_filters` の手前 |
| `accumulator` | string \| `{name, flatten?}` (`flatten` は `append` のダイヤルで accumulator に従属 — DR-105 §1/§2 / DR-111 §4 不変) | 累積 — `post_type_filters` と `post_accum_filters` の間 |
| `collector` | registryIdentifier \| **object 呼び出し形** (DR-044 §2 — 引数を取る collector (`from_entries`) は object 形が canonical で bare string は invalid-argument。引数なし (`to_set` 等) は bare 可)。省略時は accumulator の `default_collector` (DR-036 の属性セット — 生存)。**collector 単独宣言時の accumulator 既定は `append`** — 収集トリガとして accum 経路を選んだ以上、発火値を順に積む最汎用の累積だけが追加の入力形前提 (merge のマーカー、kv_map の `=`、increment の無値) を持たない | 最終整形 — `post_accum_filters` の後 |

**separator の第一級化は新規範である** — DESIGN §6.3「bare separator は仕様概念として
存在しない (wire form も multiple object の中にのみ持つ)」を supersede する。カプセルでは
separator は独立 field であり、cardinality のトリガ (§2.1) を兼ねる。

代表 4 パターン (kawaz 確認済み、2026-08-16 mid=50 が例の正本):

```jsonc
{"accumulator": "append"}                                        // list
{"accumulator": {"name": "append", "flatten": true}}             // repeat の cons 平坦化
{"accumulator": "increment"}                                     // count 系 → number
{"accumulator": "append", "collector": {"from_entries": "entries"}}  // map 化
```

### 2. 外部界面は 2 面の契約

カプセルの外がカプセルに依存してよいのは、次の 2 面の契約だけである:

- **値の界面** — 結果型 U (collector 適用後の外部型。union なら枝の型集合。cardinality =
  Acc で collector 省略なら `array<T>` 包みが既定) と **cardinality** (Acc かどうか)。
  制約 (requires 等)・隣接要素・言語バインディングが見るのはこちら
- **背骨の界面** — **消費トークン数** (DR-034 の属性平面が type の断面に「入力消費数」を
  含む規定の継承)、**受理ガード面** (どの座の reject が経路探索に参加するか — positional の
  値スロットでは pre_type / post_type / parse の reject が経路不成立として path-search に
  参加する、DR-079 §1「filter は処理であると同時に背骨側では受理ガードでもある」)、
  **宣言済み fallback の有無** (defaults / const の存在は空席で完全経路に含めてよいかの
  静的充足判定に効く — DR-088 の系)。経路探索 (engine) が見るのはこちら

フィルタ構成・供給の詳細それ自体は評価時にカプセル内で閉じ、上記 2 面の外から覗く規範を
持たない。**help / completion のメタ読みはこの規律の例外ではなく別経路である** — 許される
のは DR-113 (help model) / DR-104 / DR-117 (補完) の 2 経路と、パースの判断に使わない
読み取りに限る。

#### 2.1 cardinality の導出は一方向

> **cardinality は `repeat` (カプセル外) または収集トリガ 3 field (`separator` /
> `accumulator` / `collector`) のいずれかの宣言から導出する。`post_accum_filters` と
> `final_filters` は導出に参加しない被判定側である。**

- DR-102 §1 の `is_accum_elem` (multiple ∨ repeat ∨ separator) はこの導出式に置き換わる —
  束ね名 `multiple` の単独宣言が `accumulator` 宣言に写る等価変形であり、適格集合は
  保存される
- wrong-seat は DR-102 §3 の継承: 非 accum カプセルの `post_accum_filters` / 収集座、
  accum カプセルの `final_filters` は definition-error `invalid-range`。トリガ集合から
  `post_accum_filters` を外すことで自己参照は構造的に発生しない
- **判定の入力は registry 解決・カプセル合成後の平面である (AP-Q5=b)** — type プリセットは
  収集座を注入できる (count preset の `increment` accumulator が既存実例 — DR-105 §1/§3、
  LOWERING §A.5)。DR-102 §2 (unknown-vocab は自 registry の owns のみ) と §3 の
  「wrong-seat 成立時は中身を一切解釈しない」は不変で、動くのは判定の入力面だけ。
  type 解決は元から definition-time なので検査時点が実行時に遅れることはない
- **カプセル内の未知 field 名は語彙層の unknown-vocab である** (DR-067) — installer の
  `owns` が「トップレベル属性名の集合」から「**カプセル内パスを含む集合**」(defaults 配列
  への注入口を含む) へ一般化される (DR-042 不変則④ / DR-061 §1 の更新、波及節)。
  なお、この owns の**パス**は wire 宣言の属性アドレスであり、link 固定パス DSL
  (DR-127 — 値セル・値構造のアドレス) とは別物の表記系である

#### 2.2 「空」と「不成立 ⊘」

カプセルは全 field を一様に持たない。非 accum カプセルに収集座と `post_accum_filters` は
「空」でなく**存在しない** (⊘) — wrong-seat の definition-error が構造から導出できる。
`type: "none"` 要素は**カプセル自体が ⊘** である (DR-089 の「値空間なし」のカプセル語彙
での言い換え — none への変換 field 宣言は DR-102 §3 明確化の invalid-range のまま。
none を「カプセル不在」そのものへ畳む案は issue
`2026-08-16-type-none-as-capsule-absence` の別検討)。

### 3. 2 層構造 — セルカプセル 1 組 + 枝別は type プリセット

カプセルの field は**セル単位で 1 組**とし、枝ごとの細工は type プリセット参照
(DR-034 §合成の「type = カプセル平面のプリセット」の一般化) で表現する。淘汰 (DR-138) は
セルカプセルの確定相の仕事、枝内の変換は各プリセットの仕事。union の descriptor 露出は
**構造の分岐 (`input_structure` の or) まで** (AP-Q4=a) — string 内の字句分岐は parser の
関心のままで宣言に出さない (DR-128 §2 / DR-132 の現行線。字句まで出すと二重管理)。

### 4. 合成は field 単位・深さ 1 段

優先順 (低 → 高): 組み込み初期値 → type プリセットのカプセル → ref 元の field
(DR-062 §3) → 要素直書き (DR-062 §4 の後勝ち丸ごと上書き)。

- **マージの深さは 1 段 (field 単位) のみ**。field の中身 (chain 配列・`defaults` 配列・
  accumulator object) は丸ごと上書きで内側を混ぜない。chain / defaults の
  `{prepend, append}` は例外ではなく明示的に宣言された演算子 (DR-062 §2/§5 — 中間挿入は
  表現しない)
- **DR-133 §3 (深いマージはしない) との書き分け**: あちらは config **値**の fold で、深い
  マージを退ける理由は「配列は連結か置換か」のダイヤルの忌避。こちらは**宣言の構成要素**で、
  field ごとの合成規則が型で決まっているためダイヤルが発生する余地がそもそも無い
- `link` = インスタンス共有 (合成なし)、`borrow` = defaults 要素の一形 (§1.1)。合成が
  起きるのは ref + type / プリセットだけ (DESIGN §10.2/§10.3 / DR-029 / DR-125 不変)

### 5. `multiple` 束ね名と multiple registry の廃止 (AP-Q3=b)

- wire 属性 `multiple` は廃止する。装置は §1.3 の座に時点順で座り、「複数値経路の
  スイッチ」の意味は §2.1 の cardinality 導出に還元される
- **multiple registry (DR-036) も廃止する**。プリセットの実質は accumulators registry の
  属性セット拡張 (accumulator + default_collector + default_separator — 生存) が既に担い、
  残余は「2 field を 1 語にする」糖衣のみ。よくある組合せに 1 語が欲しい場合は
  definitions の type プリセット (§3) で作る
- `repeat` は**カプセル外に残る** — 消費構造の属性 (DR-043 の分離のまま) で、カプセルへの
  寄与は §2.1 の導出式に 1 入力として入るだけ。repeat lowering が
  `accumulator: {name: "append", flatten: true}` を値セルへインストールする形 (DR-105 §3)
  は不変で、installer の書き先がカプセルの座になるだけである

### 6. 時点は静的骨格ではない — 値源 × 型の動的分岐 (確認規定)

field の並びは「静的な通過経路」ではなく「**この段に来た値に適用するものの宣言**」であり、
どの段から入るかは値の型が決める (DR-050 §4 の一般規則の確認 — 新規裁定なし)。§1 冒頭の
「正規線形化」は宣言の読み方、本節は実行時経路 — 両者を混同しない:

| 供給 | `pre_type_filters` (string 域) | parse (`type`) | `post_type_filters` (T 域) | 累積 |
|---|---|---|---|---|
| CLI args / env (string) / config・default の JSON string | 通る | 通る | 通る | 通る (env は separator 分割も効く — DR-049 §2) |
| config・default の型一致の非 string / tty 観測値 | スキップ | スキップ | 通る | — |
| config・default の array (accum) | piece が string なら通る | 同左 | 各 piece に | 分割済み pieces として accumulator へ (DR-083 §2) |
| 型一致 array (tuple / union の完全値) | スキップ | スキップ | 通る (完成判定込み — 完成値でなければ型不適合、DR-137 §2) | — |
| cell fn の型付き Value | 再通過しない | 再通過しない | 通る | 通る (DR-114 §6.1) |
| cell fn の null Value / Sentinel | — | — | 素通し / 対象 piece なし (DR-130 §3 / DR-131) | — |

`final_filters` / `post_accum_filters` は供給単位でなく確定相 1 回 (argv_pos 帰属 =
args.length を含め DR-102 §4 不変)。DR-050 §4 の寛容 coercion は型一致判定から導けない
別規則のまま残る — 本 DR は解消を主張しない。

## 根拠

### 一次アンカーの実体化であって新提案ではない

DR-034 §「type と multiple は同じ属性平面への参照」は属性平面 (processor / default /
accumulator / separator / collector / 入力消費数 / …) と 4 段合成順を既に規定していた。
本 DR の field 列挙・合成順はその言い直しで、新設は defaults 配列 (§1.1)、cardinality
導出の一方向規則 (§2.1)、二面界面 (§2) に限られる。

### defaults 配列はラダーの一般化であって別機構ではない

「順序付きの試行列、最初に成立した供給が勝つ」は DR-031 のラダー下位席と DR-081 の
書き換えモデルが既に持っていた意味論で、defaults はそれを **1 個の宣言可能な列**として
見せる。DR-125 が `inherit` 席を廃して borrow を default 席の fn に寄せた路線の完成形 —
env / config も「席」ではなく「provider fn の呼び出し」として同じ列に並ぶ。

### 界面を 2 面に限るから解体が成立する

`multiple` 解体への「判定がカプセル内外をまたぐ」懸念 (レビュー 3 系統一致) は、またぐ
情報を §2 の 2 面に限定する規律で畳まれる — 外はカプセルの中身が変わっても判定が変わらない。

## 波及

- **DR-034**: 本 DR が実体化 (更新注記)。平面概念・4 段合成の裁定は引き継がれ生存
- **DR-036**: multiple registry と `multiple` の書き方が superseded (accumulators の属性
  セット拡張・collectors 統合・DR-044 from_entries は生存)
- **DR-031**: 席順序の固定が部分 superseded (§1.1 — 糖衣の既定展開順として生存、canonical
  `defaults` は宣言順試行)。source 語彙・CLI/link 最上位・const の位相は不変
- **DR-079**: §2 の命名が部分 superseded (§1.2 — 採用しなかった案「アンカー全明示」の
  再採用、棄却理由はカプセル入れ子化で無効)。§1 の座席格子・§3 raw_filters 予約・§4 は生存
- **DR-102**: §1 の導出式置換・§2/§3 の判定入力の移動 (§2.1)。§3 構造ゲート先行・§4
  argv_pos・§5 は生存
- **DR-042 不変則④ / DR-061 §1**: installer の `owns` を「カプセル内パス (defaults 配列
  への注入口を含む) を含む集合」へ一般化 (§2.1)。不変則③ (交差禁止) はパス単位で保たれる
- **DR-049 / DR-050**: provider 契約は不変。env / config の**宣言側**が defaults 要素の
  fn 呼び出しへ一般化される (auto 系 installer の注入先も defaults)
- **DR-081 / DR-114 / DR-125**: defaults の試行意味論・fn 部品列文法・borrow の位置づけの
  正本として生存 (§1.1)
- **DR-062 / DR-110 / DR-133**: 不変 (§1.1/§4)
- **DESIGN §6.3**: 「bare separator は仕様概念として存在しない」が superseded (§1.3)
- **wire 射影・const 吸収・糖衣 4 属性・schema / REFERENCE / fixture の追随**: DR-140 と
  移送台帳 (`docs/research/2026-08-16-value-capsule-migration-ledger.md`)
- **kuu.mbt / kuu-cli**: 移送サイクルの lockstep 窓

## 採用しなかった案

### collector 後の共通 filter 座 (mid=57 案)

`final_filters` を collector 適用後の U に効く共通座とし accum / 非 accum を 1 本化する案。
U は collector ごとに型が変わるため 1 属性 1 registry (DR-102 §1) が崩れ、旧 `cell_filters`
(1 属性に 2 型を内包する構造的欠陥 — DR-102 が解体した形) の再来になる。kawaz 未承認。
collector 後の U への検証需要が将来実在した場合は、カプセル内の座ではなく**カプセル外の
値述語席 (制約側 — DR-047 の系)** で受ける。

### 時点軸の field 名 (`piece` / `each` / `settled` / `collected`) / 作用対象アンカーの維持

前者は 3 軸混在 (DR-079 §2 が解消した非対称の別形)、後者は `value` カプセル名 (DR-140 §1)
との字面衝突と位置語・様態語の混在が残る。CR-Q1=a のアンカー全明示 + final の様態語で解決。

### 枝ごとのカプセル / 枝別ラダー

DR-138 §3 (ラダーはセル単位) / §3 の 2 層構造と矛盾。枝別の細工は type プリセットで書ける。

### multiple registry の温存 (断片プリセット参照 field の新設)

参照 field が増え「同じ構成が 2 通りの綴りで書ける」二形が残る。実質は accumulators の
属性セット拡張が担っている (§5)。

## 関連

- DR-034 (属性平面と 4 段合成 — 一次アンカー、本 DR が実体化)
- DR-140 (wire 射影 — カプセル名 `value`・入れ子形・縮退形・const 吸収・糖衣 4 属性)
- DR-036 / DR-044 / DR-105 / DR-111 (収集装置の語彙 — §1.3/§5)
- DR-062 (継承の二形 — §4)、DR-079 (座席格子と命名 — §1.2)
- DR-102 (座席の帰属と wrong-seat — §2.1/§2.2)
- DR-031 / DR-049 / DR-050 / DR-081 / DR-083 / DR-114 / DR-125 / DR-130 / DR-131
  (供給と解決 — §1.1/§6)
- DR-110 (席テーブル = engine)、DR-042 / DR-061 / DR-067 (owns と語彙層 — §2.1)
- DR-126 / DR-137 / DR-138 (value_type と union 値の確定 — §2/§3 の前提)
- DR-136 (名前系 5 軸 — カプセル外の線引き)
- issue 2026-08-16-type-none-as-capsule-absence (none とカプセル ⊘ の別検討)
- docs/research/2026-08-16-attribute-plane-settlement.md /
  docs/research/2026-08-13-value-capsule-design.md §2.9〜§2.16 (導出と裁定の記録)
