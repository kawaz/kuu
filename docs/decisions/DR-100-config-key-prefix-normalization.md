# DR-100: config 語彙の整理 — env_auto リネームと factory config キーの prefix 正準化

> 由来: config 語彙の綴り一貫性の見直し。DR-096 の軸別再編 (`long_` / `short_` prefix) で option 表面 config は軸ごとの prefix 規律が確定した一方、env 軸の `auto_env` だけが軸 prefix 後置 (`env_` が先頭でなく後置) のまま未整合だった。加えて factory config キー (DR-061 configurable factory) は `number_*` / `int_*` が factory 名 prefix 付きなのに `kuu_bool_parser` (DR-094 §9 リネーム後は `builtin/bool_parser`) の config キー 3 つ (`true_values` / `false_values` / `case_insensitive`) だけ bare のままという非対称があった。kawaz 裁定 (2026-07-12)。

## 決定

### 1. `auto_env` → `env_auto`

scope config の bool キー `auto_env` を `env_auto` へ改名する (機能・意味論は不変)。

DR-096 は option 表面 config を軸別 (`long_eq_sep` / `short_attached_value` 等) に再編し、「軸 prefix が先頭に立つ」規律を確定させた。env 軸のキーは `env_prefix` と並ぶのに `auto_env` だけ軸 prefix が後置で、DR-096 の規律が env 軸だけ未適用のまま取り残されていた。`env_auto` への改名で `env_prefix` / `env_auto` が同じ軸 prefix 先頭の並びに揃う。

v1 前の破壊的変更であり、互換 alias は持たない (DR-068 §3 のドラフト期方針)。

### 2. factory config キーの canonical は「factory 名 prefix あり」と規約化

**config キーの正準は factory 名由来の prefix を持つ** (kawaz 裁定: 「canonical は prefix あり」)。既存の `number_parser` (`number_thousand_sep` / `number_allow_base_prefix` / `number_leading_zero`) と `int_parser` (`int_round`) は既にこの規約に準拠しており変更なし。唯一準拠していなかった `bool_parser` の config キー 3 つを追随リネームする:

| 旧キー | 新キー |
|---|---|
| `true_values` | `bool_true_values` |
| `false_values` | `bool_false_values` |
| `case_insensitive` | `bool_case_insensitive`|

default 値・意味論は DR-074 §3/§4 のまま不変 (`bool_true_values` default `["true","1"]` / `bool_false_values` default `["false","0",""]` / `bool_case_insensitive` default `true`)。

DESIGN.md の factory config 記述 (§3.4、configurable factory 段落) に「config キーは factory 名由来の prefix を持つ」規約文を 1 文追記する。

### 3. 綴りの好み (bare 統一等) は正準を動かさず、語彙糖衣 alias 機構に委ねる

「`bool_` prefix を外して他の factory も含め bare に統一する」案が検討されたが、**正準語彙のリネームでこの種の綴り好みを解決しない**。統括からの bare 統一提案に対し、kawaz が「正準のリネームでなく alias 機構で好きにできる形が筋、canonical は prefix あり」と裁定 (2026-07-12)。

bare 綴りが欲しいユーザランドは、`docs/issue/2026-07-12-vocab-alias-installer.md` で構想されている **vocab_alias installer** (wire 語彙の糖衣 alias を `Map<alias, canonical>` 一個で追加する installer) が対応する。正準語彙・fixtures・conformance は本 DR の prefix ありの形で単一のまま揺れない。

## 採用しなかった案

### bare 統一 (prefix 外し)

factory config キー全体を bare (`thousand_sep` / `allow_base_prefix` / `round` / `true_values` 等) に統一する案。§3 の通り、正準語彙の綴りを好みで動かすのではなく alias 機構がユーザランドで吸収する形が筋という裁定により不採用。

### dd 専用キー `match` / `self` への `dd_` prefix 付与 (VOC-Q3)

DR-090 の dd 語彙 (`{"type": "dd", "match": "...", "self": "keep"}`) のキー名にも `dd_` prefix を付ける案が検討されたが、見送り。kawaz 見解 (2026-07-12): 「dd は内部語彙っぽすぎる。定義を書く人からするとどうでもいい知識で、prefix にする価値がない。良い代名も浮かばないので現状維持」。将来良い名前が出たら再訪。

## 波及

- DESIGN.md: §3.3 (bool canonical 受理語彙の記述)・§3.4 (factory config 例示・prefix 規約文の追記)・§7.2 (config 例示 JSON の `auto_env`)・§12 (auto_env 段落)
- schema/wire.schema.json: `auto_env` property → `env_auto`
- schema/builtin-descriptors.json: `builtin/bool_parser` の config キー 3 つ
- fixtures: `fixtures/value-typing/bool-dialect-config.json` (config キー実体 + why 文中の言及)・`fixtures/value-typing/bool-canonical.json` (why 文中の言及)
- corpus: 該当なし (grep 実施済み、`auto_env` / `true_values` / `false_values` / `case_insensitive` の出現なし)
- DR-049 / DR-074: 本体は無傷 (判断当時の記録として保持)、末尾に Superseded 節を追記して新語彙への誘導を残す

旧キー名 (`auto_env` / `true_values` / `false_values` / `case_insensitive`) は現行仕様 (DESIGN.md / schema / fixtures / corpus) から一掃する。DR 本文・journal・issue archive 内の言及は判断記録として不変。

## 関連

- DR-096 (scope config 軸別再編 — `long_` / `short_` prefix 規律の先例、本 DR は env 軸にも同規律を適用)
- DR-049 (env lookup contract — `auto_env` の導入元、本 DR §1 でリネーム、末尾に Superseded 節)
- DR-074 (canonical number/bool lexicon — bool config キー 3 つの導入元、本 DR §2 でリネーム、末尾に Superseded 節)
- DR-061 (registry 装置の自己記述 — configurable factory の config キー所有、本 DR §2 の prefix 規約の適用対象)
- DR-094 (registry 語彙の namespace — `builtin/bool_parser` 等の factory 名 ns 化、本 DR は同 factory の config キー側を整理)
- docs/issue/2026-07-12-vocab-alias-installer.md (§3 の代替経路 — 綴りの好みを吸収する installer 構想)
