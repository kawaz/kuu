---
title: フェーズ1 (AtomicAST 直列形 + conformance fixture フォーマット) 設計叩き台
status: open
category: design
created: 2026-07-04T20:58:55+09:00
last_read:
open_entered: 2026-07-04T20:58:55+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (ROADMAP.md フェーズ1、docs/journal/2026-07-04-repo-restructure-handoff.md 残作業4)
---

# フェーズ1 (AtomicAST 直列形 + conformance fixture フォーマット) 設計叩き台

## 概要

ROADMAP.md フェーズ1「直列形の確定 + fixture フォーマット設計」の論点ツリーと選択肢を整理した議論用ドキュメント。まだ何も決定しない。次セッションの議論の出発点として、既存 DR / findings / LOWERING に散らばる未確定事項を1箇所に集約し、依存関係と選択肢を可視化する。

## 背景

- ROADMAP.md のフェーズ構成: 0 (cleanup, 完了) → **1 (本件)** → 2 (fixture 蒸留) → 3 (参照実装)。
- フェーズ1 の宿題は ROADMAP.md 本文で次の3点と明示されている:
  1. AtomicAST の concrete JSON (greedy マーク・matcher データ・効果記述子の直列形 = DR-039 の宿題)
  2. JSON Schema の実体化 (findings F-042 invariant / F-048 lifecycle をここで解消)
  3. conformance fixture のフォーマット (定義 + argv + 期待効果列/結果。期待値の厳密度 — byte 厳密 vs 意味論 — が主論点、DR-040 の方言 spec 精度問題と接続)
- LOWERING.md §C.3 が「greedy マークと再解釈 matcher データの直列形は未確定」と明記しており、本フェーズの直接の入力。
- docs/findings/2026-06-29-ast-missing-pieces.md の F-042 / F-048 が本フェーズで解消すべき2件として指名されている。

## 論点ツリー

### A. AtomicAST 直列形の確定 (LOWERING §C.3 の宿題) — **決着済み (2026-07-05)**

> A-0〜A-5 は **DR-063** として ink (wire = 宣言層のみ、lowered 断面表記は面構造 + 緩比較)。A-6 は評価器契約 = フェーズ 3 の論点と整理 (fixture 側は C-5 で扱う)。A-7 / A-8 は **DR-061** (descriptor + configurable factory)、filter 継承は **DR-062**。DR-039 注記・LOWERING §C.3・DESIGN §15.7 / §8.5 / §3.4 / §13.1 / 用語表も反映済み。以下の各節は議論経緯の記録。

#### A-0. wire form の範囲 — 宣言層のみか、lowered 産物込みか (最初の分岐)

宣言層は inert に完全保持され (DR-042 ①'、LOWERING §C.1)、lowering は決定的 (不動点、§C.2) — つまり **lowered 産物は宣言層から常に再導出可能**。すると直列形 (wire form) に 2 つの選択肢が生まれる:

- 選択肢 (a) **宣言層のみを wire に載せる** (受信側が再 lowering)。正規形が小さく可読性・バンドルサイズ有利。conformance は「lowering の決定性」自体を fixture で検証する形になる
- 選択肢 (b) **lowered 込みを載せる**。DR-039 の字義 (「エンジンのノードグラフのシリアライズ形」) に近い。受信側の lowering 実装が不要になるが、「宣言と lowered の整合」という新しい不変条件が wire に生まれる

判断材料: (a) は「AtomicAST」の語の再定義に近い判断 (DR-039 テーゼとの関係を整理する必要)。LOWERING §C.5 の二段緩比較 (効果列 oracle + lowered 骨格の緩比較) はどちらでも生きる。**C-1 (fixture の定義形式が UsefulAST か AtomicAST か) と同型の判断が wire form 側に現れた構図**であり、両者は連動して決めるべき。A-1〜A-5 の各論点の重みも本分岐で変わる ((a) なら greedy マーク / matcher データの直列形は「lowered 骨格の緩比較用語彙」に格下げされ、(b) なら wire の正規語彙になる)。

**合意 (2026-07-04 nod 済み)**: 宣言層の切り口 = **A 群糖衣適用済み + installer 語彙 inert** を wire とする。

**議論の現在地 (2026-07-04)**: kawaz 初期意見は (a) 寄り — installer 不動点反復の最中は宣言層が正本でないと、他 installer の語彙を参照するタイプの installer (help が alias/deprecated/long/short を読む等、DR-056 の「参照」) が成立しない。AtomicAST 段階では installer 語彙は「見えないレンズ」を通したものを処理する (= C.1 の「評価ループは installer 所有語彙を見ない」)。(a) の残る設計点: ①「宣言層」の切り口 (A 群糖衣適用済みを wire とするか — その場合 UsefulAST JSON との差は「糖衣が剥がされている + クロージャ由来部分がない」)、② (a) は受信側 parse_definition の仕様準拠が前提になるため **C-8 (lowering 段階別 fixture) とセット採用**になる、③ 追加語彙の許容範囲は「登録済み installer の所有語彙の和」に閉じる (誰も所有しない語彙は DR-054 の unknown-vocab Error = typo 検出を保つ) — この機械判定の基盤が A-7 の descriptor。

#### A-1. greedy マークの直列形

`«greedy»` 注記 (LOWERING 全体で説明用に使われている疑似記法) を実際の JSON でどう表現するか。

- 選択肢 (a) ノード自体に `"greedy": true` の bool フィールドを持たせる
- 選択肢 (b) greedy 面のエントリ集合をノードとは別レイヤ (スコープ単位の index 配列) として持つ (out-of-band)
- 選択肢 (c) 背骨上の位置 (宣言スコープの positional 進行順) から暗黙的に導出し、専用フィールドを持たない

関連: DR-041 §4 (背骨・先食い・早閉じ抑制)、DR-042 不変則⑤ (背骨の切替は構造で表現)。判断材料: greedy 判定は評価器のホットパスで頻繁に参照される (先食み判定の毎回)。専用フィールド無し (c) は直列形を小さくするが評価器側の再導出コストとバグ余地を増やす。

**A-0 (a) 確定後の位置づけ**: greedy マークは wire の正規語彙ではなく、**段階別 fixture (C-8) の期待 AST 断面の表記**。

**推奨 (2026-07-04)**: **(b) 配置表現** — scope の断面を `{greedy: [...], positionals: [...], entities: {...}}` の面構造で書く。根拠: (1) PoC の Scope 構造そのまま (matcher も exact 衛星も greedy 配列の同列市民、先食い述語が一様に扱えた実測)、(2) DR-041 の仕様語彙「greedy 面 / positional 面」と直交せず一致、(3) ノード属性 (a) だと「greedy: true な子が positional 配列に居る」という不正状態が表現可能になる (make invalid states unrepresentable に反する)、(4) (c) 暗黙導出は installer 出力の再現を fixture 読者に要求し断面の独立性を壊す。

#### A-2. 再解釈 matcher データの直列形

LOWERING で `{matcher: "<種別>", entries: {...}}` と便宜表記されている、eq_split / short_combine / dd 素exact の実データ構造。

- ノード形: 選択肢 (a) matcher 種別ごとに専用ノード型 (`eq_split_matcher` / `short_combine_matcher`) を分ける、選択肢 (b) 汎用 `{matcher: <kind文字列>, entries: {...}}` に統一
- エントリ表の値参照方式: 選択肢 (a) 実体への name 文字列参照、選択肢 (b) ref 構造への直接埋め込み (実体を指す構造をエントリ内に複製)
- DR-042 「matcher の座席と表現」節が既に「再解釈 matcher は greedy 面のエントリ、クロージャでなく名前付きデータ (種別 + 回収エントリ表)」まで確定済み — 本論点はその**具体フィールド語彙**を詰めるだけで、座席・データ性の再議論ではない

関連: DR-041 (installer が植え付ける matcher の実行時意味論)、DR-042 (matcher の座席と表現、既に slice PoC で座席は実証済み)。

**推奨 (2026-07-04)**: ノード形は **(b) 汎用 `{matcher: "<kind>", entries: {...}}`** — matcher 種別は open set (Unicode short 等の方言 matcher が registry で増える、DR-041) なので、専用ノード型の閉じた列挙にすると拡張のたびに schema が変わる。kind 文字列 + descriptor (DR-061) で開いた集合として扱う。エントリ表の値は **(a) 実体への name / id 文字列参照** — PoC の entry 表 (`{p: port, v: version}`) の実測どおり。構造埋め込み (b) は実体の複製になり、link 合流 (同一セル前提) の同一性を壊す。

#### A-3. 効果記述子の直列形

DR-045 が意味論 (`{exact, link, effect: {op, operand?}}`、op ∈ {set, default, unset, empty}) を確定済み。本フェーズでの残作業は JSON key 名・ネスト形の fix のみか、それとも additional な直列上の決定 (例: operand の型付け、順序フィールドの明示) が要るかの確認。

関連: DR-045、DR-038 (効果列 = 経路同一性の判定キー)。

**確認結果 (2026-07-04)**: wire 語彙は実質確定済み — set は縮退形 `{exact, value, link}` (LOWERING §B.1)、非 set は `{exact, link, effect: {op}}` (DR-045 §1)。残る詰めは 1 点のみ: **複数 args の set variant** (`"red:set:rgb:255:0:0"`、DR-011) の operand 直列形 — `value: ["rgb", "255", "0", "0"]` と配列を沈める形で足りるかの確認 (args は全 string で CLI と同じ手順を通る規約との整合)。

#### A-4. repeat unfold の匿名ノード識別子の直列形

LOWERING B.8 の `file#geq1` (unfold が要求する再帰尾部の内部識別子) は「実装が匿名ノードに振る内部 id、直列形は DR-039 で確定する」と明記されたまま未確定。

- 選択肢 (a) 内部専用 id 文字列をノードに持たせる (`"id": "file#geq1"`)
- 選択肢 (b) 完全無名 (親ノードの子として構造的に埋め込むのみ、参照の必要がないなら id 自体不要)

判断材料: この id は ref (§10) から参照される必要があるか？ unfold は同一 name への自己再帰なので、id が外部から参照されるユースケースがあるかを先に確認する必要がある。

**A-0 (a) 確定後の位置づけ**: repeat unfold は lowered 産物なので wire に載らない。本論点も段階別 fixture (C-8) の断面表記の問題。

**推奨 (2026-07-04)**: 断面表記では **(a) id を持たせる** — cons の再帰尾部は自己参照 (`{seq: [head, {ref: "file#geq1", optional: true}]}`) であり、ref ターゲットとして名前がないとそもそも書けない (外部参照の有無に依らず内部参照で必要)。ただし規範化するのは「一意であること + `#` サフィックスはユーザ定義 id と衝突しない予約名前空間 (DR-046 §4 の内部 id)」まで — `#geq1` 等の具体的な命名規則は規範にせず、緩比較 (C.5) では id の綴り差を構造骨格の一致で吸収する。

#### A-5. AtomicAST の直列形一意性の要否

installer の適用は不動点反復で構造的には収束するが (DR-042 §C.2)、JSON の syntactic な面 (key 順序、フィールド省略 vs null 明示等) まで一意にするか。conformance の構造比較 (LOWERING §C.5 の「緩比較」) に必要な粒度がどこまでかを本フェーズで判断する。

**推奨 (2026-07-04)**: **構造等価を規範とし、byte 一致は要求しない** — key 順序は非規範 (JSON object は unordered)、フィールド省略 = default 値と等価。A-0 (a) 確定後、wire は宣言層 (A 群適用済み) なので一意性問題は小さく、比較はすべて構造等価 + C.5 の緩比較で足りる。JSON canonical form (JCS 等) の導入は、ハッシュ・署名等の実需が出るまで持たない (公理を増やさない)。

#### A-6. pending 状態の枝表現 (docs/journal/2026-07-04-repo-restructure-handoff.md 残作業4 で名指しされた入力)

DR-060 の補完クエリで観測された「parse の枝列挙が『トリガ消費・値pending』を中間状態として表現するか」という設計軸。slice PoC 第18弾の実測結論: PoC の Branch 表現 (Accept/Held) では pending 状態が表現不能で、補完は境界収集の専用走査に分離するのが正しい形だった (共有した抽象は「打ち切り位置での期待集合の収集」という 1 公理のみ)。pending を一級の枝として持つか否かは**評価器契約 = フェーズ3 の主要な実装設計論点**であり、AtomicAST 直列形 (本フェーズ A 群) 自体が pending を持つ必要はない可能性が高い。フェーズ1への効き方は「fixture が complete クエリをカバーするか (C-5)」経由が本線。A-2 のエントリ表設計時に前提として確認しておく。

#### A-7. installer descriptor — 所有語彙 + 観測語彙の宣言形式化 (2026-07-04 追加) → **DR-061 として ink 済み**

DR-056 の「所有 / 参照」二分を機械可読な descriptor に落とす。matcher-as-data (DR-042) / effect-as-data (DR-045) と同族の「暗黙をデータ化」原理の installer 自身への適用。installer が自身の descriptor で宣言する:

- **所有語彙** (owns): lowering 責務を持つ語彙集合 (排他、不変則③の交差検査・DR-054 completeness 検査の判定入力。PoC の `owned_vocab` の形式化)
- **観測語彙** (名称未定): あれば動作 (表示・補完等の副次成果物) に影響するが、効果列には影響しない語彙。例: help installer にとっての alias / deprecated / long / short
- **config キーの所有** (2026-07-04 追加): installer は既に暗黙の config パラメータを読んでいる (long installer の `long_prefix` / `allow_equal_separator`、short の `short_combine`、env の `env_prefix` / `auto_env` — LOWERING §B.1/B.2、DESIGN §7.2)。現状 §7.2 に平場列挙で「どのキーがどの installer の関心か」が暗黙。descriptor に config キーの所有を宣言させれば語彙所有と同型の構造で閉じる (A-8 の factory config 宣言と同じ形式)

論点:

- 観測側のフィールド名: **`observes` で合意 (2026-07-04 nod 済み)** — 「観測のみ・効果列に影響不可」の制約が名前に乗り、ref/link/alias の参照ファミリーとの語衝突も避けられる。「依存 (depends)」は不採用 — 順序制約を連想させ、不動点の順序非依存 (参照は宣言層を読むので順序問題は原理上出ない) と誤読が衝突する。`references` (DR-056 の「参照」直写し) は語衝突の点で見送り
- 宣言の強制度: 実行時強制 (宣言なき読みの禁止) はせず、「wire 拡張語彙の正当性判定 + lint/diagnose の素材」に留める方向 (DR-021 の「warn はする、reject はしない」の流儀)
- 記録先: DR-042/056 の拡張か、新 DR か

関連: A-0 ③ (wire 追加語彙の許容範囲の機械判定基盤)、DR-054 (unknown-vocab)、DR-056 (所有/参照)、§13.7 (diagnose)、A-8 (config 宣言の形式)。

#### A-8. registry 住人の configurable factory 化 (2026-07-04 追加、kawaz 提案) → **DR-061 として ink 済み。filter 継承 (@base 廃止 → prepend/append 二形) は DR-062 として ink 済み**

registry 参照を「名前 → クロージャ」から「名前 + config → factory」へ一般化する:

```json
registry.types.number = {
  "name": "kuu_number_parser",
  "config": {"thousand_sep": [",", "_"], "base_prefix": {"0x": 16, "0o": 8, "0b": 2},
             "float_suffix": ["f"], "int_suffix": ["i"]}
}
```

バリエーションごとに value_parser クロージャを量産するのでなく、動作調整可能な factory + 純データ config で表現する。

賛成材料 (既存仕様との接続):

- **DR-040 の 3 層方言構造の実装手段**: 「value_parser 差し替え」軸の細分化。標準層 opt-in (桁区切り `_`・基数 prefix)・方言 (`,` 系・NFC) は config キーの列挙になり、**canonical default = factory の default config** という整理が立つ
- **方言構成のシリアライズ可能性**: config は純データなので wire に載る → DR-040 の再現性課題 (クロスホスト canonical 参照 / moving target ロック) の実装手段になる。クロージャ差し替えでは原理的に不可能だった
- **「クロージャをデータ化」同族原理の 4 例目** (matcher / effect / descriptor / factory config)
- **tree-shake の単位が factory になる** (バリエーション = config 差分、コード増殖が起きない)

論点:

- **config スキーマの宣言形 — 「キーは平坦、値は自由 JSON」方針 (2026-07-04 提案)**: 平坦値強制 (`base_prefix_16: "0x,\\x"` のカンマ区切り等) は「string[] をフラット契約の体裁で偽装」する悪化なので不採用。descriptor の目的は (1) 未知キー検出 (typo 検出、DR-054 同族) (2) lint/diagnose 素材 (3) ドキュメント であって validator ではない — **キー名の宣言は必須 (名前空間のみ平坦)、値は任意 JSON (ネスト自由)、型注釈は任意 (lint が読む、強制検証はしない)**。config 値の検証は factory 自身が parse_definition 時に「次の手」hint 付き Error で行う (§13.5 の流儀、DR-021 の「warn はする、reject はしない」と整合)
- **pre_filter との線引き — 「相」で切る (2026-07-04 提案)**: 「受理域 vs 変換」の切り方は全角 normalize 等で両義的になるため、pieceProcessor の相 (DR-034) で切る: **factory config = parse 相 (String → T) の内部調整** (thousand_sep / base_prefix = 「parse が何を T に読めるか」)、**filter = 相の間の変換・検証** (pre = String→String、post = T→T)。全角→半角は迷わず pre_filter に落ちる。type デフォルト chain への前置/後置は当初 `@base` sentinel (§8.5) の想定だったが、**`@base` は廃止方向で概ね合意 (2026-07-04)**: (1) string[] の型面から sentinel の存在が発見できない (in-band 特殊値)、(2) sentinel パターンは仕様中この 1 箇所だけの孤立語彙。代替は既存イディオム「string 短縮形 | object 詳細形」(multiple / variant と同族) の再適用 — `pre_filters: [...]` (配列 = 差し替え、継承なし) / `pre_filters: {prepend: [...], append: [...]}` (type chain への前置/後置、順序は prepend ++ base ++ append)。相名 (pre/post) と操作名 (prepend/append) が直交するので「prepre」型の語彙混乱も起きない。中間挿入は非対応のまま (要るなら definitions で type を shadow して chain ごと差し替え — 公理を増やさない)。**ref 継承との合成は後勝ち上書き** (§3.5、ref 元の {prepend:[a]} を参照側の {prepend:[b]} が丸ごと上書き、累積しない) を同時に固定する
- **適用範囲**: types (value_parser) 以外の registry 区分 (filters / accumulators / completers / installer 自身の config = A-7) にも一様適用するか

関連: DR-040 (方言 3 層 / 2 軸)、DR-010/035 (registry 解決順)、A-7 (descriptor の config 所有宣言)、B 群 (schema の再帰)。

### B. JSON Schema 実体化

#### B-1. F-042: AtomicAST の合法構造 (invariant) 定義

property-based test 用の合法 AtomicAST 生成器に必要な invariant。未確定項目 (findings 原文どおり):

- seq/or の children 最小数 (0個・1個は合法か)
- multiple を持つノードを or/seq children に入れる制約
- name の文字種・長さ制限
- 同一 seq 内の同名 long option 重複の合法性

DR-039 は「JSON Schema は実装と同時に詰める (単独確定しない)」と defer 条件を明記しているが、slice PoC が 18 弾・167 テストで実装済みの現状、defer 条件 (「垂直スライス後」) は実質満たされているとみなせるかが前提論点 (下記メタ論点も参照)。

#### B-2. F-048: JSON Schema lifecycle と breaking change 手続き

未確定項目 (findings 原文どおり):

- 確定版として発行するタイミング (フェーズ2 fixture 蒸留完了時 / フェーズ3 実装完了時 / 他)
- フィールド追加・削除・改名時の更新手続き
- `$schema` URI 埋め込み有無
- 複数言語バインディングのバージョン参照管理
- breaking change の定義 (フィールド追加=後方互換か、削除=破壊的か、意味論変更の扱い)

findings が提案する暫定処置 (「現在は共設計中=破壊的変更許容」を DESIGN.md §0 に partial fix として先行追加) は DESIGN.md §0.1 に「本仕様は垂直スライス実装 (DR-039) との共設計段階にあり、全域で破壊的変更を許容する」として反映済み — 本フェーズで詰めるのは lifecycle の**その先** (確定版発行条件・手続き) のみ。

### C. conformance fixture フォーマット

#### C-1. fixture 1件の構造

`定義 + argv + 期待値` の3つ組の具体スキーマ。最初の分岐点: **definition は UsefulAST (糖衣込み) か AtomicAST (lowering 済み) か**。

- UsefulAST を fixture の定義とする場合: 各実装の lowering (parse_definition) 実装力も同じ fixture でテストできる。ただし lowering の直列形一意性 (A-5) が前提として要る
- AtomicAST を fixture の定義とする場合: lowering は別の (LOWERING.md 準拠の) conformance test 群に切り出し、fixture は評価器のみを対象にできる。lowering 未確定 (A群) でも先に fixture 設計に着手できる利点

#### C-2. 期待値の厳密度 — byte 厳密 vs 意味論 (ROADMAP.md 本文が名指しする主論点)

LOWERING §C.5 の2段比較戦略 (主 oracle = 効果列、lowered中間形 = 構造骨格 + matcher種別/エントリ表の緩比較) を fixture の expected 表現にどう反映するか。

- 選択肢 (a) expected を「効果列」(実体, op, operand, source, 順序) の列で持つ — 直列形非依存、実装間の意味論一致を厳密に判定できる (LOWERING §C.5 の主 oracle と直結)
- 選択肢 (b) expected を「結果オブジェクト」(shallow view、§0.3) で持つ — 利用者に近い形だが optional semantics (F-022/DR-052) の3区別を表現しきれるかが要検証
- 選択肢 (c) 両方持つ (効果列を正本、結果オブジェクトは導出値としてテストの読みやすさ用に併記)
- byte 厳密比較が必須なケース (exact 照合の codepoint 単位・正規化なし = DR-040、NFC は方言。canonical default 数値字句 = 10進最小構文・整数値 float の最短形 "1" も DR-040/DR-050 §4 で確定済み) は fixture 側で明示タグ付けし、それ以外は意味論比較に倒す、という DR-040 の「canonical/標準/拡張3層」構造との接続方針も要確認

#### C-3. fixture runner の契約

- 効果列 oracle (LOWERING §C.5) を判定器として使う場合のインターフェース: 各実装がどの形式 (JSON配列 / 独自形式) で効果列を出力する契約にするか
- ambiguous / failure ケースの fixture 表現: DR-053 の `outcome` discriminated union (`success` / `failure` / `ambiguous`) をそのまま fixture の期待値スキーマに転用するか、fixture 専用の簡略形を作るか

#### C-4. fixture の意図コメント埋め込み

`tdd-and-test-design` (テスト = 真の仕様書) の原則を fixture にも適用する ROADMAP.md の明言 (「fixture の意図コメント (なぜこの入力・なぜこの期待、DR 根拠) は fixture データに同梱する」) をどう実現するか。JSON はコメント不可のため:

- 選択肢 (a) JSON5 / JSONC (コメント許容の JSON 方言) を fixture フォーマットに採用
- 選択肢 (b) 素の JSON + `"_comment"` 相当の予約フィールドを各 fixture に持たせる
- 選択肢 (c) fixture ファイルと1:1対応する隣接 `.md` に意図を書き、fixture 本体は素の JSON のまま

言語非依存 (定義の一部 = 各言語の JSON パーサがそのまま読める) という制約とコメント表現力のトレードオフ。

#### C-5. fixture がカバーするクエリの範囲 (parse だけか)

fixture の期待値は parse (DR-038/053) が本丸だが、仕様は他に 2 つの入口を持つ:

- **complete クエリ (DR-060)**: `complete(atomic, {before, word?, after?}) → 候補構造`。slice 第18弾で実装・9項目実測済み。fixture に `{before, after?, expected_candidates}` 形のケースを含めるなら、候補構造 (spelling / is_value / 型情報 / メタ / 終端ヒント) の直列形確定が本フェーズの追加宿題になる
- **parse_definition の失敗 (DR-054)**: definition-error の fixture ({不正定義, expected DefError 列 (element, kind, hint 有無)})。message 文字列は仕様でない (kind/element が仕様、文言はレンダラ) ため比較対象から外す規約が要る

選択肢: (a) フェーズ1 で 3 クエリ全部のフォーマットを確定 / (b) parse fixture のみ確定し complete / definition-error は後続フェーズで拡張 (フォーマットに拡張余地だけ確保)。

#### C-6. fixture のディレクトリ構成・命名規則

DR 番号ベース (`fixtures/dr-038-path-search/*.json`) か機能領域別 (`fixtures/multiple/*.json`) か。C-1 の definition 形式・C-7 の蒸留単位と整合させる必要がある。

#### C-7. 蒸留元 (slice 167テスト) からの変換方針

slice PoC の 167 テスト (kuu.mbt slice 枝、フェーズ2 の蒸留元) を 1:1 で fixture 化するか、意味論単位 (DR 単位 / 領域単位) で再編するかは本フェーズでなくフェーズ2の主題だが、C-1/C-6 の設計がフェーズ2の変換コストを左右するため、フェーズ1側で「蒸留のしやすさ」を設計基準に含めるかどうかは論点として明記しておく。

#### C-8. lowering の段階別 fixture (2026-07-04 追加、kawaz 提案)

installer 適用が順序非依存 (不動点、§C.2) であることの帰結として、**installer 部分集合の適用結果も well-defined** になる。これを利用し、lowering の概念確認・エッジケース固定のための段階別 fixture を仕様資産にする:

- **粒度の例**: A 群糖衣のみ (values → or 展開だけ確認) / 単独 installer (long installer だけ登録して long シュガー展開を確認) / installer 組合せ / 全 installer 収束形 (= AtomicAST)
- **比較の厳密度**: byte 厳密でなく §C.5 の緩比較 (構造骨格 + matcher 種別/エントリ表) — 中間形を byte 厳密にすると DR-041/042 が「観測挙動同一なら自由」とした実装内部の自由度 (dd の severed フラグ encoding 等) を殺すため
- **ref は展開段階の軸に乗せない**: repeat lowering は ref 再帰 (cons) なので展開したら無限。ref は AtomicAST の一級住人で、展開は評価器の実行時関心 (slice 第2弾 F-6 の実測)。段階の軸は「A 群 → installer 部分集合 → 収束」の lowering 次元のみ
- fixture 量は大量になってよい (概念確認・エッジケース固定のためにブレないことが優先)

A-0 (a) 採用時はこのカテゴリが「受信側 parse_definition の仕様準拠」を担保する主力になる (A-0 ②)。

## メタ論点: フェーズ1着手の前提整理

DR-039 は「AtomicAST は単独で仕様確定せず、実装と同時に削り出す (垂直スライス)」と明言し、JSON Schema は「実装と同時に詰める」と defer 条件を置いている。この「実装との共設計」は既に **slice PoC (kuu.mbt slice 枝、第1〜18弾、167テスト)** で実質充足されており、フェーズ1は白紙設計ではない — **PoC 実測形と LOWERING 疑似表記が背骨**になる。

ただし「格上げ・確定作業」と框えるのは縮小リスクがある。PoC が答えていない**直列形固有の新規判断**が最低 4 つ残る:

1. PoC の MoonBit enum は直列形の**証拠**であって直列形そのものではない (concrete JSON のフィールド語彙・構造は新規決定。A-0 の wire form 範囲もその一部)
2. fixture 期待値の厳密度 (byte 厳密 vs 意味論) — DR-040 の方言 spec 精度と絡む新規議論 (C-2)
3. 効果列の直列形 (conformance oracle として実装間比較可能な canonical 形) も新規の設計対象 (C-3)
4. F-048 (JSON Schema lifecycle、breaking change 手続き) は純粋に新規 (B-2)

したがって提案する框は: 「**背骨は PoC 実測形。ただし直列形固有の新規論点 (上記 4 点 + A-0) は通常の a/b 提示 → nod → ink で議論する**」。この位置づけの合意を最初の合意事項とする。

## 参考: 隣接する既決定事項 (本フェーズで再検討しない)

- DR-045 (効果記述子の意味論)
- DR-046 (name 軸分解)
- DR-060 (補完クエリ意味論、responsibility 4層)
- DR-042 (installer 5不変則、matcher の座席)
- DR-038 (bounded path-search のパース意味論契約)
- DESIGN.md §15 (パース挙動全般)

## 受け入れ条件

- [x] A群 (wire form 範囲 (A-0) / greedy マーク / matcher データ / 効果記述子 / repeat 匿名id / 一意性 / pending 状態 / installer descriptor (A-7) / configurable factory (A-8)) の各論点に決定が付き、新規 DR (DR-061 以降を想定) または既存 DR 拡張として記録される — **DR-061 / DR-062 / DR-063 で ink 済み (pending 状態はフェーズ 3 送りで決着)**
- [ ] B群 (F-042 invariant、F-048 lifecycle) が解消され、findings 2026-06-29-ast-missing-pieces.md の該当2件がクローズ可能になる
- [ ] C群 (fixture フォーマット) が確定し、フェーズ2 (fixture 蒸留) に着手可能な仕様書 (DESIGN.md 追記 or 新規 docs/ ファイル) が揃う
- [x] メタ論点 (DR-039 defer 条件充足の確認) に決着が付く — **DR-063 の DR-039 注記で確定 (defer 条件は slice PoC で充足、框は「背骨 + 新規論点は通常議論」)**
