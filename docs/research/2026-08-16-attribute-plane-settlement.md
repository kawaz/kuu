# 属性平面の詰め所 — DR-034 の実体化 (B' カプセルの field 全列挙・合成・射影) の DR 起草前整理

> 由来: `docs/research/2026-08-13-value-capsule-design.md` (以下 **カプセルノート**) §7.1 の
> 進行順序 (1)「属性平面 (DR-034) を確定させる」の設計起草。確定裁定 VC-Q1=b と 2026-08-16 の
> 系 (カプセルノート §2.9〜§2.15)、および union 淘汰の確定
> (`docs/research/2026-08-16-union-culling-settlement.md` / DR-137 / DR-138) を前提とする。
> **非正本** — 規範の正本は `docs/decisions/DR-*.md`。
>
> **確定裁定 (覆さない)**:
>
> | # | 内容 | 出典 |
> |---|---|---|
> | C1 | カプセルの射程 = 供給宣言込み (`default` / `env` / `config_key` / `completer`)。**解決は外**。`value_name` は名前系 5 軸 (DR-136) の一員としてカプセル外 | VC-Q1=b、ノート §2.9 |
> | C2 | 外部界面は**型シグネチャのみ** (結果型 T + cardinality)。help / completion の純データ読みは関心の分離として可 | ノート §2.10 |
> | C3 | 2 層構造 — field はセル単位 1 組、枝別の細工は type プリセット参照に畳む | ノート §2.11 |
> | C4 | cardinality = Acc の外部像は `array<T>` 包み (collector で別外形も可、既定 array) | ノート §2.12 |
> | C5 | null 残りの責務 2 層 — 完成判定はカプセル内部工程 (型の意味で決まる)、required・制約はできた値への述語 | ノート §2.13、DR-138 §1 |
> | C6 | union 淘汰は確定 (DR-137 / DR-138) | ノート §2.14 |
> | C7 | 全部入り例のライフサイクル順 field 並び (piece / type / each / settled / collected + 供給 4 + 収集 3) | ノート §2.15 (kawaz 提示) |
>
> 各項の型は前回 settlement ノートと同じ: 「推し / 根拠 / 代替案 / 裁定要否」。
> 裁定要は §7 の AP-Q1〜Q5 に集約する。

---

## 1. field の完全な列挙と型

カプセルの field 全 13 + 1 (const 吸収案込み)。**io 型 / 時点 / 空と不成立の区別**を列挙する。
現行 wire 属性との対応 (= 移送元) を併記するが、命名は AP-Q1 (§7) の裁定待ちで、本表は
C7 の kawaz 例示名を仮置きする。

### 1.1 供給の宣言 (C1 — 宣言だけ。解決はセル外の席テーブル = engine、DR-110 #10/#11 不変)

| field (仮) | 型 | 席 / 位相 | 現行属性 | 空の意味 |
|---|---|---|---|---|
| `default` | any (JSON) | ラダー 4 段目の席宣言 (DR-031) | `default` | 席なし (充填しない) |
| `default_fn` | string \| array[string] | default 席の fn 宣言 (DR-114 / DR-125 `borrow:` 込み)。`default` と同席・排他 (既存の排他規定のまま) | `default_fn` | 席なし |
| `env` | string | ラダー 2 段目の席宣言 (DR-049) | `env` | 席なし |
| `config_key` | array[string \| int] | ラダー 3 段目の席宣言 (DR-050。パス文法の借用は DR-127 波及の分界のまま) | `config_key` | 席なし (階層同型対応の既定は現行どおり) |
| `completer` | registryIdentifier | 補完クエリの値位置候補 (DR-104 / DR-117)。供給でなく観測系だが VC-Q1=b が明示的に内側へ | `completer` | 既定 completer |
| `const` (吸収案) | any (JSON) | **セル初期化位相** — ラダー席ではない (DR-031「const は値セルに最初からいる」)。opus m3 のとおり、席宣言と初期化位相が 1 オブジェクトに同居することの位相注記を DR に明記する | `value` | 初期値なし |

`default_fn` を含めるのは C1 の列挙 (`default`) からの導出 — default 席の宣言の 2 形
(literal / fn) であり、片方だけカプセル外に残すと供給宣言の同席 2 形が別の場所に割れる。

**カプセル外に残るもの** (対比のための包含側列挙): 名前系 5 軸 (`name` / `trigger_name` /
`id` / `export_key` / `value_name` / `display_name` — DR-136、C1)、入口 (`long` / `short` /
`alias` / `exact` / `match` / `self`)、構造 (`or` / `seq` / `options` / `positionals` /
`commands` / `ref` / `link` / `optional` / **`repeat`**)、制約 (`required` / `requires` /
`conflicts_with` / `exclusive_group` / `required_group` — C5 の「できた値への述語」)、
表示メタ (`help*` / `hidden` / `deprecated`)、スコープ設定 (`config` / `definitions` /
`global` / `on_failure` / `insert_form`)。

### 1.2 変換 field (ライフサイクル順、C7)

| field (仮) | io 型 | 時点 / 単位 | 現行属性 (DR-079/102 座席) |
|---|---|---|---|
| `piece` | string → string | 分割後の piece ごと (座席 B) | `piece_filters` |
| `type` | **境界マーカー + 内包プリセット参照** (string → T の parse を担う registry 参照。カプセルノート §3.3/§5.4) | piece → 値の境界 | `type` |
| `each` | T → T | parse 済みの値ごと (座席 C) | `value_filters` |
| `settled` | T → T | 確定した最終セル値へ 1 回 (**非 accum 専用**) | `final_filters` (座席 D1) |
| `collected` | Acc → Acc | 累積後の配列へ 1 回 (**accum 専用**) | `accum_filters` (座席 D2) |

- chain field (`piece` / `each` / `settled` / `collected`) の二形 (`array` = 差し替え /
  `{prepend, append}` = 継承合成) は DR-062 §2 のまま
- `type` が string 域 / T 域の境界に**位置として**置かれることで、DR-050 §4 の
  「供給値が string ならカプセル先頭から、T 一致なら type の直後から」が構造的に読める
  (カプセルノート §3.3 の中核利得)。preset 合成後の可視性の限定 (fable M-5 — 直書き時のみ、
  合成後の可視化は help / lowered 断面の関心) を DR に注記する
- 座席 A (`raw_filters`) は **DR-079 §3 の予約のまま配線しない** — カプセル化はこの予約を
  動かさない (AP-Q1 で時点軸名 (b) を採る場合のみ予約名の再裁定が要る — opus m4)

### 1.3 収集の座 (accum 専用)

| field (仮) | 型 | 時点 | 現行 |
|---|---|---|---|
| `separator` | string (区切り) \| registry 呼び出し形 | 分割時点 — `piece` の手前 | `multiple.separator` / `separator` |
| `accumulator` | string \| `{name, flatten?}` (二形 — `flatten` は `append` のダイヤルで accumulator に従属、DR-105 §1/§2 / DR-111 §4 不変。他 accumulator への `flatten` は invalid-range のまま) | 累積時点 — `each` と `collected` の間 | `multiple.accumulator` / `multiple.flatten` |
| `collector` | registryIdentifier (filters registry の Acc → U、DR-036「collectors registry は新設しない」不変) | 最終整形 — `collected` の後。省略時は accumulator の `default_collector` (DR-036) | `multiple.collector` |

**外部像との関係 (C2/C4)**: 外に出るのは `T` と cardinality だけ。collector が外形を
変える場合 (map 化等) の外部型は collector の出力型 U — descriptor の型導出で決まり、
外は内部手順に触れない。

### 1.4 「空 []」と「不成立 ⊘」の解決 (カプセルノート §3.5 の宿題)

accum 適格性 (cardinality = Acc) の導出を**一方向の規則**で固定する (sol M-6 の受理):

> **cardinality は `repeat` (カプセル外) または 収集トリガ 3 field (`separator` /
> `accumulator` / `collector`) のいずれかの宣言から導出する。`collected` と `settled` は
> 導出に参加しない被判定側である。**

- 導出後の wrong-seat 検査は DR-102 §3 の継承: 非 accum 要素の `collected` /
  収集トリガなしの `collected` 単独宣言、accum 要素の `settled` は definition-error
  `invalid-range`。sol M-6 の自己参照 (「collected が書けるか」を適格判定に使う循環) は
  トリガ集合から `collected` を外すことで構造的に発生しない
- **⊘ (不成立) の表現**: カプセルは全 field を一様に持たない — 非 accum カプセルに
  収集座・`collected` は「空」でなく**存在しない** (wrong-seat が構造から導出できる、
  §3.5 の要求どおり)。schema 上は if/then 補助 + parse_definition が正規ゲート
  (DR-102 §3 の現行構図のまま)
- `type:"none"` 要素はカプセル自体が ⊘ (fable m-3 の受理 — DR-089「値空間なし」の
  カプセル語彙での言い換え。none への変換 field 宣言は DR-102 §3 明確化の invalid-range
  のまま)

**導出の入力面 — opus C4 の二択は (ii) で解く (AP-Q5、裁定要)**: type プリセットが
収集座を注入する実例が既にある (count preset の increment accumulator — DR-105 §1/§3、
LOWERING §A.5) ため、「カプセルプリセットは accum 適格性に寄与できない」(opus C4 の (i))
は既存 builtin と矛盾する。推しは **(ii) cardinality 導出と wrong-seat 検査の入力を
「registry 解決・カプセル合成後の平面」に移す** — DR-102 §2 (unknown-vocab は自 registry
のみ) と §3 の「wrong-seat 成立時は中身を一切解釈しない」は不変で、動くのは**判定の入力**
(直書き属性 → 合成後カプセル) だけ。詳細は §7 AP-Q5。

---

## 2. `multiple` 束ね名の解体の再定式

### 2.1 解体の中身 (導出 — 確定裁定 C7 の帰結)

- wire 属性 `multiple` は消滅する。4 装置 (separator / accumulator / collector / flatten)
  は §1.3 の座に時点順で座り、「複数値経路のスイッチ」の意味は §1.4 の cardinality 導出に
  還元される
- 「判定が局所化する」という B' 初期の過大主張 (レビュー 3 者一致) は **C2 で畳まれた** —
  判定はカプセル内外をまたぐ (repeat は外) が、またぐ情報は型シグネチャ (cardinality)
  に限定される。DR-102 §1 の `is_accum_elem` (multiple ∨ repeat ∨ separator) は
  §1.4 の導出式 (repeat ∨ separator ∨ accumulator ∨ collector) に置き換わる —
  トリガが 3 → 4 になるのは束ね名 `multiple` 単独宣言 (`multiple: "append"`) が
  `accumulator: "append"` に写るための等価変形であり、適格集合は保存される
- `settled` × `collected` の排他は §1.4 の wrong-seat で裁く (fable M-3 の「同時宣言の
  新しい矛盾形」への回答 — 新 kind は不要、invalid-range の既存パターン)

### 2.2 multiple registry (DR-036) の去就 — 裁定要 (AP-Q3)

束ね名の消滅で `multiple: "append"` / `"set"` / `"map"` の**参照綴りが失われる**。
DR-036 のプリセット (accumulator + collector + separator のセット) をどう残すかは
確定裁定から導出できない分岐:

- **(a) 断片プリセット参照 field をカプセルに新設** (例: `collect: "set"`) — DR-036 の
  糖衣を 1 語で温存。コスト: field が 1 つ増え、「同じ構成が 2 通りの綴りで書ける」
  (直書き vs プリセット) の二形が残る
- **(b) multiple registry を廃止し、組合せは直書き or definitions の type プリセットへ**
  — `"append"` 相当は `accumulator: "append"` 1 field で既に等価 (accumulators registry の
  属性セット拡張 — default_collector / default_separator 連動 — が DR-036 で済んでいる)。
  `"set"` は `accumulator: "append", collector: "to_set"` の 2 field。よくある組合せに
  1 語が欲しければ definitions の type プリセット (DR-034 §合成の一般枠) で作れる。
  DR-034 の 4 段合成が 3 段 (組み込み → type プリセット → 直書き) に縮む単純化
- **推し: (b)**。根拠: (i) DR-036 の存在意義の大半は accumulators の属性セット拡張側に
  既に移っており、multiple registry 固有の残余は「2 field を 1 語にする」糖衣だけ、
  (ii) 束ね名 `multiple` の解体理由 (時点の異なる装置の同居) は「束ねプリセット registry」
  にも半分当たる、(iii) registry 区分と参照 field を 1 つずつ減らせる。
  対極材料: DR-036 の kawaz 発言「multiple レジストリを置いて…構造的にはこうなってると
  見せておく」は registry の展示価値を認めており、(b) はこれを覆す — **裁定要**

### 2.3 repeat がカプセル外に残る形 (導出)

`repeat` は**消費構造の属性** (何回発火できるか — 入口・背骨の関心、DR-043 の分離のまま)
であり、値の作られ方の宣言ではない。カプセルへの寄与は §1.4 の cardinality 導出式に
1 入力として入るだけで、これは C2 の「外がカプセルに渡すのは型シグネチャの材料」の
逆向き版 — 要素レベルの導出であってカプセル内部の判定ではない。repeat lowering の
cons 平坦化が `accumulator: {name:"append", flatten:true}` を値セルへインストールする形
(DR-105 §3) は不変で、installer が書き込む先がカプセルの座になるだけである。

---

## 3. 合成規則 — field 単位・深さ 1 段

### 3.1 規則 (導出 — DR-034 §合成順 + DR-062 の流儀の合成、カプセルノート §4.6)

カプセルの合成は **field 単位の後勝ち**で、優先順 (低 → 高):

```
1. 組み込み初期値
2. type プリセットのカプセル (DR-034 §合成の 2 段目、§5.4 の内包プリセット)
3. (AP-Q3=(a) の場合のみ) 断片プリセット
4. ref 元の field (DR-062 §3 の継承元解決 — ref 指定時)
5. 要素直書き (DR-062 §4 の後勝ち丸ごと上書き)
```

- **マージの深さは 1 段 (field 単位) のみ**。field の中身 (chain 配列・accumulator object)
  は丸ごと上書きで、**内側を混ぜない**
- 唯一の例外に見える chain field の `{prepend, append}` は例外ではない — 明示的に宣言
  された**演算子** (DR-062 §2/§5) であり、暗黙マージではない。合成順は
  `prepend ++ 継承 chain ++ append`、中間挿入は表現しない (DR-062 §5 不変 — A 報告が
  警告した「入れ子の暗黙累積」はこの規定で構造的に起きない)

### 3.2 DR-133 §2 との書き分け (⑤ の宿題 — 「深さ 1 段」線の明示)

| | config 値の fold (DR-133 §3) | カプセル合成 (本節) |
|---|---|---|
| 対象 | **値** (実行時に読んだオブジェクト) | **宣言の構成要素** (定義時の field) |
| 深いマージ | しない — 「配列は連結か置換か」のダイヤルを呼び込むため忌避 | しない — ただし理由が違う: **field ごとの合成規則が型で決まっている** (chain は二形演算子、スカラ field は後勝ちのみ) ので、ダイヤルが発生する余地がそもそも無い |
| 1 段目の単位 | トップレベルキー | カプセル field |

DR 起草時にこの対比を明文の 1 節として置く (「深さ 1 段のマージだけ許す」線を DR-133 との
一貫性の問いに先回りして答える形)。**裁定不要** — ⑤ は (c-1) 推しのまま B' 報告・統括・
レビュー 3 者に異論がなく、確定裁定 C3 (セル単位 1 組 + 枝別はプリセット) とも整合する。

### 3.3 link / borrow は合成に参加しない (導出 — カプセルノート §4.7 の再確認)

`link` = インスタンス共有 (合成なし)、`borrow` = default 席の fn (DR-125、合成でなく
`default_fn` field の値)。合成が起きるのは `ref` (+ type / プリセット) だけ。

---

## 4. 時点の動的分岐 — 「値源 × 型」の経路表 (導出)

カプセルの field 並びは**静的な通過経路ではなく「この段に来た値に適用するものの宣言」**
であり、どの段から入るかは値の型が決める (カプセルノート §3.6 の再定式 + DR-137/138 の
行を加えた完全表)。field 名は §1.2 の仮置き:

| 供給 | `piece` (string 域) | parse (`type`) | `each` (T 域) | 累積 (`collected`) | 出典 |
|---|---|---|---|---|---|
| CLI args | 通る | 通る | 通る | 通る | PIPELINE §2 |
| env (常に string) | 通る | 通る | 通る | separator 分割も効く | DR-049 §2 |
| config: JSON string | 通る | 通る | 通る | 通る | DR-050 §4 |
| config / 宣言 default: 型一致の非 string | スキップ | スキップ | 通る | — | DR-050 §4 (型の帰結) |
| config / 宣言 default の array (accum 要素) | piece が string なら通る | 同左 | 各 piece に | 分割済み pieces として accumulator へ | DR-050 §4 / DR-083 §2 |
| **型一致 array (tuple / union の完全値)** | スキップ | スキップ | 通る (完成判定込み — 完成値でなければ型不適合) | — | DR-137 §2 / DR-138 §3 |
| **CLI/link の union セル書き込み** | (書き込み単位で通常経路) | 同左 | 同左 | — | 着地後は枝並行構築 → 確定相淘汰 (DR-138 §2) |
| tty 観測値 (native bool) | スキップ | スキップ | 通る | — | DESIGN §12b |
| 宣言 default: JSON string | 通る | 通る | 通る | 通る | DR-102 §5 |
| cell fn が返す型付き Value | 再通過しない | 再通過しない | 通る (通常の set operand) | 通る | DR-114 §6.1 |
| cell fn の `null` Value | — | — | dispatcher が素通し | — | DR-131 §1.1 / DR-130 §3 |
| Sentinel (`default` / `empty`) | — | — | 対象 piece が生じない | — | DESIGN §8.3 / DR-130 §3 |
| `settled` / `collected` の適用 | — | — | — | — | 供給単位でなく確定相 1 回 (DR-102 §4 の argv_pos 帰属 = args.length も不変) |

残る既知の穴 (B' 報告 観点 2-a): DR-050 §4 の寛容 coercion (string 要素への JSON `1.5` を
`"1.5"` 化して head から) は型一致判定から導けない別規則のまま残る — カプセル化で
解消しない旨を DR に注記する (解消を主張しない)。

argv_pos 帰属は field 名の写像で不変 (カプセルノート §3.7): `piece` → piece 実位置、
`each` → CLI 由来は piece 実位置・非 CLI 由来は args.length (DR-102 §4 明確化)、
`settled` / `collected` → args.length。

---

## 5. wire 射影の判断材料 (§7.1 (2) の論点整理 — 決定は次段)

### 5.1 射影の 3 案と入れ子税 (opus M2)

fixture 実測 (opus 再実測 2026-08-14): `type` を持つ要素は 407/411 本、4 座席属性を持つのは
43 本 (≈10%)。散らばりの痛みは 10% に集中し、入れ子税は 407 本全体にかかる。

| 案 | 形 | 評価 |
|---|---|---|
| (a) フル入れ子 | `"<capsule>": {"type": "string"}` | 平面と射影が同型 (C7 の kawaz 例示はこの形)。税は type 1 個だけの要素に最も重い |
| (b) フル入れ子 + **string 縮退形** | `"<capsule>": "string"` (= `{"type": "string"}` の縮退) | **推し**。string \| object の二形は `multiple: "append"` / DR-062 / DR-011 の確立イディオムで、「カプセル名の下の縮退」なのでフラット座席の二形再生産 (opus M2 の警告対象 — トップレベル `type:` 糖衣の温存) には当たらない。407 本の税が 1 token 差まで縮む |
| (c) トップレベル `type:` 糖衣の温存 | `"type": "string"` も可 | 同じ宣言が 2 か所に書ける二形になり、発題の「散らばり」を再生産 (opus M2)。不採用推し |
| (d) フラット wire 維持 (平面はモデル層のみ) | 現行 wire | 案 A の再来 — wire 読者の問題を解けない (カプセルノート §4.10 で棄却済みの構図)。不採用推し |

### 5.2 判別式・断面の連動改訂 (要改訂リストの更新)

- **グループ宣言 entry の判別式 (opus M7)**: DR-113 §8.1 / `schema/wire.schema.json` の
  「`type` を持たず」が「**カプセル field を持たず**」へ読み替え必須 — **DR-113 を
  カプセルノート §4.1 の要改訂表へ追加する** (opus M7 の指摘どおり)
- **実体だけノード (DR-030)**: `{"name":"timeout","value":30}` は const 吸収 (AP-Q2) で
  `{"name":"timeout","<capsule>":{"const":30}}`。(b) の縮退形は type にのみ効くので
  const には効かない — 税は残る。対極として「const 吸収をやめ `value:` を外に残す」と
  カプセル名に `value` が使えなくなる (§7 AP-Q2 の連動)
- **lowered 断面 (opus M8)**: DR-063 §3 の entities 表は同じ平面の別射影として wire と
  同時に決めるのが筋。断面へのカプセル表記導入は v1.0.0 前に DR-063 §3 改訂 + golden 更新
  (影響 8 箇所 / 6 ファイル、A 報告実測) — 判断は wire 射影の裁定 (次段) と同時に
- **DR-135 §1 の分界** (「その要素が値を持つか」) は**カプセルの presence で構造的に
  言える**ようになる (opus の支持材料) — M7 の逆向き波及とセットで改訂

### 5.3 要改訂 DR リスト (カプセルノート §4.1 の更新版)

| DR | 理由 |
|---|---|
| DR-034 + DESIGN §3.5 | 一次アンカーの実体化 (本ノート全体) |
| DR-079 §2 | AP-Q1=(b) の場合のみ supersede (+ §3 raw_filters 予約名の再裁定) |
| DR-102 §1 | `is_accum_elem` の導出式置換 (§1.4)。§2/§3 は AP-Q5=(ii) の場合に判定入力の移動 |
| DR-036 | AP-Q3=(b) の場合 multiple registry 廃止 / (a) の場合参照 field の付け替え |
| DR-062 §3/§4/§5 | 明示的踏襲 (§3.1 — supersede でなく適用範囲のカプセル化) |
| DR-113 §8.1 | グループ判別式 (§5.2) |
| DR-135 §1 | 値持ち分界のカプセル presence 化 (§5.2) |
| DR-030 / DR-031 | const 吸収 (AP-Q2=吸収の場合) — `value:` 属性の廃止と初期化位相の座の移動 |
| DR-063 §3 | 断面表記 (§5.2、wire 射影と同時) |
| schema/wire.schema.json | 全面 (座席 4 属性 + multiple + type + 供給宣言の入れ子化、§8.1 判別式) |

改訂不要 (カプセルノート §4.1 の判定を維持): DR-031 (順序固定) / DR-049 / DR-050
(provider 契約) / DR-110 (席テーブル = engine、C1 の「解決は外」が担保) / DR-114 / DR-107 /
DR-111 / DR-133 (§3.2 の書き分けで足りる) / DR-128。

---

## 6. fixture 観測点 (wire 射影裁定後の移送 + 新規 pin)

移送 (機械変換、expect 不変 — B' 報告実測の再確認が前提): 座席 4 属性を使う 43 本の
入れ子化、`multiple:` 使用 46+9 本の解体書き換え (こちらは **expect 不変が未実測** —
fable M-3 の指摘どおり移送時に実測してから主張する)。

新規 pin:

| # | 観測点 | 出典 |
|---|---|---|
| 1 | cardinality 導出 4 トリガ (separator / accumulator / collector 単独宣言、repeat のみ) の各々で accum 適格になる | §1.4 (現行 `accum-filters-repeat-only-success.json` の族の拡張) |
| 2 | `collected` 単独宣言 (トリガなし) = invalid-range — 導出の一方向性 | §1.4 (sol M-6) |
| 3 | `settled` × 収集トリガの同時宣言 = invalid-range (両方向 2 本 — DR-102 波及 fixture の構図) | §2.1 |
| 4 | type プリセット (count) 由来の accumulator で accum 適格になる (AP-Q5=(ii) の pin) | §1.4 |
| 5 | 合成順: type プリセットの chain を直書き `{append: [...]}` が拡張し、`ref` + field 単位追記が type / piece を継承したまま `each` だけに足せる (カプセルノート §4.6 の代表例) | §3.1 |
| 6 | ref 元の field を直書きが丸ごと上書き (累積しない — DR-062 §4) | §3.1 |
| 7 | 型一致 array 供給の parse スキップ + 完成判定 (既存 `fixtures/union-parse/declared-default-*` が既に pin — カプセル化後も expect 不変の確認) | §4 |
| 8 | wire 射影 (b) の string 縮退形 = object 形と観測同値 | §5.1 (裁定後) |
| 9 | const 吸収後の実体だけノード (source: const の既存 pin の移送) | §5.2 |
| 10 | グループ宣言 entry の判別式がカプセル不在で成立 (help fixture の移送) | §5.2 |

---

## 7. 裁定要の集約

確定裁定から導出できない分岐は 5 点である:

| # | 分岐 | 選択肢 | 推し | 根拠の要約 |
|---|---|---|---|---|
| AP-Q1 | **命名軸** (⑦.③) | (a) 作用対象アンカー維持 (`piece`/`value`/`final`/`accum` — DR-079 §2 不変、`_filters` 接尾辞は落とす) / (b) C7 の kawaz 例示名 (`piece`/`each`/`settled`/`collected` — DR-079 §2 supersede + §3 予約名再裁定) | **(b) 寄り、ただし軸混在の指摘 (§4.4 — piece = 対象・each = 単位・settled/collected = 様態の 3 軸) への kawaz の裁定が要る**。(b) の実質根拠は C7 で kawaz 自身がこの名で全部入り例を書いたこと — ただし例示は裁定ではないので確認必須。(a) は DR-079 の裁定を動かさない保守側 | カプセルノート §4.4 (2 裁定に分ける提言は「カプセル化 vs 命名」であり、カプセル化確定済みの今、残るのは命名のみ) |
| AP-Q2 | **カプセル名 + const 吸収** (⑦.④) | 候補: `value` (const を `const` field に吸収して空ける) / 他の新語 | **`value` + const 吸収**。利用者語彙 (「この要素の値」の作られ方) として最自然で、`cell` は kawaz 棄却済み・省略形不可。対極材料: `values` (or 糖衣) との字面近接は DR-079 が `typed_filters` を退けた理由の最強形 (fable m-2)、吸収で DR-030/031 の `value:`/`const` 規定の移動が波及 | カプセルノート §4.8 |
| AP-Q3 | **multiple registry の去就** (§2.2) | (a) 断片プリセット参照 field 新設 / (b) registry 廃止・直書き + type プリセットへ | **(b)** — accumulators の属性セット拡張が実質を既に担い、残余は 2 field → 1 語の糖衣のみ。対極: DR-036 の kawaz 発言 (展示価値) を覆す | §2.2 |
| AP-Q4 | **union の descriptor 露出範囲** (⑦.⑥) | 統括の線引き案: 構造の分岐 (`input_structure` の or) は宣言に出す / string 内の字句分岐は parser の関心のまま | **統括案のまま**。DR-128 §2 (暗黙 raw-string 枝の禁止) と DR-132 (字句 3 形は description) の現行線と一致し、help 射影 (DR-128 §9) に必要な粒度が揃う。字句まで出すと二重管理 (カプセルノート §5.5) | カプセルノート §5.5 |
| AP-Q5 | **cardinality 導出・wrong-seat 検査の入力位相** (opus C4) | (i) カプセルプリセットは accum 適格性に寄与できない (明文化) / (ii) 判定入力を registry 解決・合成後の平面へ移す | **(ii)** — count preset の increment accumulator が既に (i) の反例。DR-102 §2 (自 registry のみ) と §3 (成立時は中身不解釈) は不変で、動くのは判定の入力面だけ。observability: definition-error の発火が registry 解決後になる (現行も type 解決は definition-time なので実行時に遅れるわけではない) | §1.4 |

wire 射影 (§5.1 の (b) 推し) は「判断材料の整理」までが本ノートの射程 — Q 化は §7.1 (2)
の段で統括が行う (材料は §5 に揃えた)。

---

## 関連

- カプセルノート: `docs/research/2026-08-13-value-capsule-design.md` §2.9〜§2.15 (確定裁定) /
  §3.3〜§3.7 / §4.4〜§4.8 / §7.1〜§7.2
- union 淘汰: `docs/research/2026-08-16-union-culling-settlement.md` / DR-137 / DR-138
- 一次アンカー: DR-034 (属性平面・4 段合成) / DR-028 (type = 参照糖衣)
- 座席と装置: DR-036 / DR-062 / DR-079 / DR-102 / DR-105 / DR-111
- 値源: DR-031 / DR-049 / DR-050 / DR-083 / DR-114 / DR-125 / DR-130 / DR-133
- 界面: DR-110 (席テーブル = engine) / DR-113 §8.1 (グループ判別式) / DR-135 §1 /
  DR-136 (名前系 5 軸) / DR-104 / DR-117 (completer)
- 射影: DR-030 (実体だけノード) / DR-063 §3 (lowered 断面) / DESIGN §3.5 / §6 / §8
