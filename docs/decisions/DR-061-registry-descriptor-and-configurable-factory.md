# DR-061: registry 装置の自己記述 — installer descriptor と configurable factory

> 由来: フェーズ 1 (直列形) 議論。wire form を宣言層のみとする方針 (A-0) の帰結として追加語彙の正当性を機械判定する基盤が必要になったこと、および registry 住人の方言バリエーション作成が value_parser クロージャの量産になる問題。議論経緯は docs/issue/2026-07-04-phase1-serialization-design-agenda.md (A-7 / A-8)。

## 決定

### 1. installer descriptor — 所有語彙・観測語彙・config キーの宣言

installer は自身を説明する descriptor を持ち、以下を宣言する:

- **`owns`** (所有語彙): lowering 責務を持つ語彙集合。排他 (DR-042 不変則③の交差検査) であり、DR-054 completeness 検査 (unknown-vocab) の判定入力。
- **`observes`** (観測語彙): あれば副次成果物 (表示・補完等) に影響するが、効果列 (観測挙動) には影響しない語彙。DR-056 の「参照 (advisory read)」の機械可読化。例: help installer の observes = alias / deprecated / long / short。
- **config キーの所有**: installer が読む config パラメータ (long installer の `long_prefix` / `allow_equal_separator`、short の `short_combine`、env の `env_prefix` / `auto_env` 等)。語彙所有と同型の構造で、config キーの所有者が機械可読になる。

observes の宣言は lint / diagnose / wire 判定の**素材**であり、実行時強制 (宣言なき読みの禁止) はしない (DR-021 の「warn はする、reject はしない」の流儀)。

### 2. wire 追加語彙の正当性判定

wire (AtomicAST 直列形) 上の語彙の正当性は「**登録済み installer descriptor の所有集合の和に含まれるか**」で機械判定する。誰も所有しない語彙は DR-054 の unknown-vocab Error (typo 検出を保つ)。評価器は installer 語彙を見ない (LOWERING §C.1 の「見えないレンズ」) ため、所有者が居る追加語彙が wire に載っていても評価には影響しない。

### 3. configurable factory — registry 参照の「名前 + config」化

registry 住人の登録を「名前 → 実装」から「**名前 + config → factory**」へ一般化する:

```json
"definitions": {"types": {"number": {
  "name": "kuu_number_parser",
  "config": {"thousand_sep": [",", "_"],
             "base_prefix": {"0x": 16, "0o": 8, "0b": 2},
             "float_suffix": ["f"], "int_suffix": ["i"]}}}}
```

- バリエーションごとに value_parser を作るのではなく、動作調整可能な factory + 純データ config で表現する
- **wire に現れるのは definitions 側のみ** (DR-035 の区別: definitions = ユーザが書くポータブルな上書き機構、registry = ホスト言語側が注入する非ポータブル名前空間)。registry 層 (言語 DX default) も同じ `{name, config}` 形で登録するが、それはホスト側コードであって wire ではない。解決順 (definitions.X → registry.X → warn+フォールバック、DR-035) は不変
- **canonical default = factory の default config**。DR-040 の標準層 opt-in (桁区切り `_`・基数 prefix)・方言 (`,` 系・NFC) は config キーの列挙になる
- config は純データなので wire に載る = **方言構成がシリアライズ可能**。DR-040 の再現性課題 (クロスホストの canonical 参照 / moving target ロック) の実装手段になる (クロージャ差し替えでは原理的に不可能だった)
- types (value_parser) を筆頭に、filters / accumulators / completers / installer 自身の config (§1) にも一様に適用できる
- 「クロージャをデータ化」同族原理 (matcher = DR-042、効果記述子 = DR-045、descriptor = 本 DR §1) の registry への適用

### 4. config スキーマ — キーは平坦、値は自由 JSON

descriptor の config 宣言は:

- **キー名の列挙は必須** (未知キー検出 = typo 検出、DR-054 と同族。名前空間のみ平坦)
- **値は任意 JSON** (ネスト自由 — `base_prefix` の map 形のように)
- **型注釈は任意** (書けば lint が読む。強制検証はしない)

config 値の検証は descriptor でなく **factory 自身の責務**: 不正 config は parse_definition 時に「次の手」hint 付き Error (DESIGN §13.5 の流儀)。descriptor は validator ではなく、typo 検出 + lint/diagnose 素材 + ドキュメントである。

### 5. factory config と filter の線引きは「相」で切る

pieceProcessor の相構造 (DR-034) を境界にする:

- **factory config = parse 相 (String → T) の内部調整**。「parse が何を T に読めるか」— thousand_sep / base_prefix はこちら
- **filter = 相の間の変換・検証** (pre_filters = String → String、post_filters = T → T)。全角→半角 normalize はこちら

「受理域 vs 変換」のような意味論的な切り方は全角 normalize 等で両義的になるため採らない。相で切れば機械的に振り分けられ、同じ結果を 2 経路で書ける redundancy が最小化される。

## 採用しなかった案

### 観測語彙の名称に depends (依存)

順序制約を連想させる。installer 適用は不動点で順序非依存 (DR-042) であり、観測は宣言層を読む (lowered 産物は読まない、DR-056) ので順序問題は原理上発生しない — その安全性が名前から見えるべき。

### 観測語彙の名称に references

DR-056 の「参照」の直写しだが、ref / link / alias の参照ファミリー (要素間参照) と語が衝突する。observes は「観測のみ・効果列に影響不可」の制約が名前に乗る。

### config 値の平坦強制

`base_prefix_16: "0x,\\x"` のようなカンマ区切りフラット化は、実質 string[] を要求しながらフラット契約の体裁だけ整える偽装であり、構造として悪化する。

### 宣言なき観測の実行時禁止

言語ごとに読み追跡機構が必要で重い。宣言は lint / diagnose / wire 判定の素材に留める。

### バリエーションごとの value_parser クロージャ量産

直列化不能 (方言構成が wire に残らない)、tree-shake 単位が parser 全体になりコード増殖する。旧実装の「操作は不透明クロージャ」(DR-045 の反省) と同じ限界の再生産。

## 射程外

- descriptor 自身の完全な JSON Schema 化 (F-042 / F-048 の Schema 実体化と同時に詰める)
- 宣言なき観測の静的検出ツール (lint の実装課題)
- 組み込み factory の config キー全列挙 (DR-040 の canonical 字句仕様を config 語彙へ写像する作業はフェーズ 1 の Schema 実体化で行う)

## 関連

- DR-042 (installer 5 不変則 — owns は不変則③・completeness 検査の形式化)
- DR-054 (parse_definition の失敗挙動 — unknown-vocab 判定入力)
- DR-056 (所有 / 参照 — observes は「参照」のデータ化)
- DR-040 (type 方言 3 層 — canonical = default config、config = 方言のシリアライズ形)
- DR-045 (効果記述子 — データ化同族原理)
- DR-034 (pieceProcessor 相構造 — §5 の線引きの境界)
- DR-062 (filters の継承インターフェース — filter 側の表記)
- DR-066 (reason コード層 — descriptor の 4 つ目の宣言軸 `reasons` を追加)
- docs/issue/2026-07-04-phase1-serialization-design-agenda.md (A-7 / A-8 の議論経緯)
