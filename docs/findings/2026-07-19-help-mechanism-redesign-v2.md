# help 機構の再設計プラン (v2) — DR-112 撤回とゼロベース設計

> 由来: kawaz 原発題 (2026-07-17)「実装がない奴として help_installer が無くないですか？必要な機能やそれを実現するための語彙や展開方などの設計プランからまず立てる必要があるのでは」+ 2026-07-19 の HIP-META-Q1〜Q6 全裁定 (mid=14/15/17/18/20/21/23)。
>
> DR-112 (「help installer は存在しない、help は query である」) は kawaz 未承認の worker 解釈拡大が spec に land した状態。**HIP-META-Q1 = a 裁定で DR-112 §1 全体撤回**、原発題「help_installer が必要、設計プランから立て直せ」に沿ってゼロベース設計する。本 finding は新 DR (次番号) の下敷き、統括 (Opus 4.7) が中心で起草 (worker 解釈拡大の再発を防ぐため)。

## 1. 判明した事実 — DR-112 の drift 内訳と kawaz 裁定の確定分

### 1.1 DR-112 の撤回対象 (worker 解釈拡大、kawaz 未承認)

| DR-112 節 | 記述 | drift の性質 | 処理 |
|---|---|---|---|
| §1 | 「help_installer は存在しない、help は query である」 | 原発題「installer が必要」を worker が真逆に読み拡張 | **撤回** (meta-Q1=a) |
| §7 type:"help_all" | 「hidden 込み全表示の意図メタ」 | kawaz 原意「全 category を見せる」と乖離 | **撤回 + 再設計** (meta-Q5) |
| §3 (help model 全体) | help model schema の詳細 | 部分的に kawaz 承認、部分的に worker 起草 | **再設計** (meta-Q4 で value_structure tree + type_ref + types 追加) |

### 1.2 撤回しない (kawaz 承認済み or 齟齬なし)

| DR-112 節 | 記述 | 承認根拠 |
|---|---|---|
| §2 depth | `depth?: "scope" | "all"` の 2 値、数値 depth 不採用 | meta-Q3 承認 |
| §4 | help_long (HELP-Q4=a) | 原裁定 findings 明記 |
| §4 | help_epilog | meta-Q2 承認 (mid=15 の "epilog のことか、理解。ok") |
| §5 | help_group_name / help_group_title / help_group_description | HELP-Q3 原裁定明記 |
| §5-6-6 前半 | 同名グループの別設定重複は definition-error | HELP-Q3 原裁定明記 |
| §5-6-6 後半 | 「同一設定の再宣言は冪等で合法」 | **撤回** (HIP-Q3 drift、原裁定に無い後段追加) |
| §6 | help_order / help_group_order / help_after (order 関連) | meta-Q2 承認 (mid=14 で「明確に話したはず」+ 詳細規定) |
| §7 type:"help_category" | 特定 category に絞る (string 値) | meta-Q5 承認 (help_all_category と併存) |
| §8 | on_failure / help_on_failure | meta-Q2 承認 (HELP-Q1 由来) |
| §9 | help_meta installer (語彙所有座席) | worker 起草だが「基本よさそう」承認 (meta-Q3)。ただし meta-Q1=a 裁定に伴い help_installer との関係を再整理 |
| §10 | hidden: bool 1 本、面別は ref&link で分割 | HELP-Q12=a 原裁定明記 |
| §11 | 5 プロファイル green を v1 発行条件 | HELP-Q7=a 原裁定明記 |

### 1.3 HIP-META-Q 裁定 (meta-Q1〜Q6) — 新設計に組み込む

- **meta-Q1 = a**: help_installer 必要、DR-112 §1 撤回、設計プランから立て直し
- **meta-Q2**: help_epilog + order 関連 + display_name + value_name + help_on_failure = 承認 (§1.2)
- **meta-Q3**: depth = "scope" | "all" 承認、他 worker 起草部分 (help_meta installer など) も「基本よさそう」
- **meta-Q4**: value_structure tree (options entry に or/seq/repeat/single/type_ref の tree ノード) + type_ref ノード + model トップの types セクション。レンダラ側の表現 (pipe 曖昧回避 / 集約 vs inline / 詳細説明) は canonical レンダラ設計 issue に持ち越し + レンダラ policy 指定オプション語彙で選択可能に
- **meta-Q5**: 5 直交 type 構成 — `help` / `help_all_category` (旧 help_all の名前変更 + 意味論訂正、絞りなし) / `help_category` / `help_show_hidden` (独立軸) / `help_tree` (独立軸)。hidden は独立、混合概念回避
- **meta-Q6 = A**: default_fn 汎用機構 (fn registry 引き + DSL `"fn_name[:arg...]"`、filter/variant DSL と対称)。専用属性 (default_from/default_for) 廃案

## 2. 中心設計 — help_installer の実装

kawaz 原発題「実装がない、必要な機能・語彙・展開方の設計プラン」に応える設計:

### 2.1 help_installer の 3 役 (DR-042 installer 3 役に当てはめる)

| 役 | help_installer の実体 |
|---|---|
| 回収 | 表示メタ語彙 (help / help_long / help_epilog / display_name / value_name / help_group_name / help_group_title / help_group_description / help_group_order / help_order / help_after) を宣言層から取り込む |
| 植え付け | **type:"help"/"help_all_category"/"help_category"/"help_show_hidden"/"help_tree" の 5 型 preset を canonical 展開**。各 preset は long/short/env の入口 + 内部セル link + 固定値供給 + on_failure 展開 + help_on_failure 糖衣 + values 制約 (help_category のみ) |
| 能力提供 | help_query capability (spec 内 helper であって別 query ではない)。宣言層寄与適用後の断面から model を組む純関数、implementation は installer が担う |

**DR-112 §1 との対比**: DR-112 は「help_installer は存在しない、query 分解が正しい」= 3 役のうち「能力提供」だけを取り出して query 化。新設計は 3 役全てを help_installer に統合し、query capability も installer が提供する組み込み関数として扱う (別立ての query 語彙は spec 外の kuu-cli サブコマンド `kuu help` として残るが、これは kuu-cli の関心層)。

### 2.2 5 直交 type の canonical 展開 (help_installer が担う lowering)

**type:"help"** (基本 help、bool):
- 入口: long/short/env が使える (flag preset と同型)
- 内部セル: `#help` (help 機構管理の内部単一セル、bool)
- 発火: 固定 true 供給
- on_failure: help_on_failure=true (糖衣、既定 true) → on_failure=true (汎用属性へ展開)
- lint warn: 露出手段 (name 経由) が無い help 系構成のみ warn

**type:"help_all_category"** (全 category 絞りなし、bool):
- 入口: 同上
- 内部セル: `#help` + `#help_all_category` (共通の help 内部セル + 独立フラグセル)
- 発火: `#help` に true + `#help_all_category` に true
- on_failure: help_on_failure=true (糖衣)
- 意味論: レンダラは `#help_all_category` を見て「category 絞りなし = 全 category を並べる」を選ぶ (DR-058 §1「--help-all で hidden も表示」ではなく、mid=18 で kawaz 修正)

**type:"help_category"** (特定 category、string):
- 入口: 同上、値スロット (string) or or 展開で bool 枝と string 枝の 2 経路
- 内部セル: `#help` + `#help_category` (string 全体単一セル)
- 発火: `#help` に true + `#help_category` に指定 category 文字列 (last-wins for multiple)
- values 制約: descriptor で category 名の enum (spec §5 の help_group_name と同名前空間)
- on_failure: help_on_failure=true

**type:"help_show_hidden"** (hidden 露出、独立軸、bool):
- 入口: 同上
- 内部セル: `#help_show_hidden` (bool、独立)
- 発火: `#help_show_hidden` に true。**`#help` は立てない** (kawaz mid=18 独立軸方針、hidden 露出は help 発火とは別軸)
- ただし単独で意味を持たないため、他 help 系 type と or 合成 or 別 flag の default_fn で連動させる想定 (定義側の設計)
- on_failure: help_on_failure=false (デフォルト、他 help 系 flag に紐付いて発火するのが自然)

**type:"help_tree"** (サブコマンド tree 全展開、独立軸、bool):
- 入口: 同上
- 内部セル: `#help` + `#help_tree` (共通 help + 独立フラグ)
- 発火: `#help` に true + `#help_tree` に true
- 意味論: レンダラは `#help_tree` を見て「depth = all を暗黙採用、サブコマンド tree 全展開」を選ぶ
- on_failure: help_on_failure=true

### 2.3 5 直交 type の合成 (mid=19 発題、meta-Q6=A で default_fn で解決)

```json
{
  "options": [
    {"name": "help", "long": true, "short": "h", "type": "help"},
    {"name": "help-all-category", "long": true, "type": "help_all_category"},
    {"name": "help-category", "long": true, "type": "help_category"},
    {"name": "help-show-hidden", "long": true, "type": "help_show_hidden"},
    {"name": "help-tree", "long": true, "type": "help_tree"},
    {"name": "help-all", "long": true, "type": "flag",
     "default_fn": "constant:true", "for": ["help-all-category", "help-show-hidden"]},
    {"name": "help-full", "long": true, "type": "flag",
     "default_fn": "constant:true", "for": ["help-all-category", "help-show-hidden", "help-tree"]}
  ]
}
```

**default_fn の実際の設計** (mid=21 対案、meta-Q6=A):
- 各 help_*_category / help_show_hidden / help_tree 側の default_fn: "borrow:help-all" 等が本命
- 上記 `--help-all` / `--help-full` は「for: [...]」で default_for 相当を示唆した簡略記法だが、実装は「被参照側で `default_fn: "borrow:help-all"` を書く」形が meta-Q6=A の裁定
- 正確な JSON (裁定案 A 採用):

```json
{
  "options": [
    {"name": "help-all", "long": true, "type": "flag"},
    {"name": "help-full", "long": true, "type": "flag"},
    {"name": "help-all-category", "long": true, "type": "help_all_category",
     "default_fn": "borrow:help-all"},
    {"name": "help-show-hidden", "long": true, "type": "help_show_hidden",
     "default_fn": "borrow:help-all"},
    {"name": "help-tree", "long": true, "type": "help_tree",
     "default_fn": "borrow:help-full"}
  ]
}
```

= `--help-all` → all-category + show-hidden 立つ / `--help-full` → tree のみ立つ (help-all を default にしないと "full" は "all" を含まない構成)。「full = all + tree」にしたいなら:

```json
{"name": "help-full", "long": true, "type": "flag", "default_fn": "borrow:help-all"}
```

を追加して help-full → help-all → all-category + show-hidden、= 二段継承。

## 3. help model schema (meta-Q4 反映、value_structure tree + type_ref + types + origin)

DR-112 §3 の options entry (spellings / value_name 1 個の限界) を刷新:

```json
{
  "command_path": ["prog", "remote", "add"],
  "usage": {"has_options": true, "positionals": [...], "has_subcommands": true, "has_dd": true},
  "description": "...", "description_long": "...", "epilog": "...",
  "types": [
    {"id": "color_value", "value_structure": {...}, "help": "...", "used_as": ["COLOR", "INFO", "WARN", "DEBUG"]}
  ],
  "commands": [
    {"name": "run", "aliases": ["r"], "help": "...", "help_long": "...",
     "hidden": false, "deprecated": false, "origin": "local"}
  ],
  "options": [
    {"group": {"name": "net", "title": "Network options", "description": "..."}},
    {
      "spellings": ["--port", "-p"],
      "alias_spellings": ["-n"],
      "value_structure": {"single": {"value_name": "PORT", "type": "number"}},
      "display_name": "ポート番号",
      "help": "...", "help_long": "...",
      "help_group_name": "net",
      "default": 8080, "env": "PORT",
      "required": false, "multiple": false,
      "hidden": false, "deprecated": false,
      "origin": "local"
    },
    {
      "spellings": ["--fg"],
      "value_structure": {"type_ref": "color_value"},
      "help": "...",
      "origin": "local"
    }
  ],
  "positionals": [...],
  "help_entry": "--help"
}
```

**変更点** (DR-112 §3 との差分):
- `value_name` (単一 1 個) → `value_structure` (tree: or/seq/repeat/single/type_ref の任意ネスト)
- `types` セクション新設 (definitions で参照される共有型を集約射影、参照回数 ≥ 2 の場合)
- `origin` フィールド新設 (options / commands entry、値: "local" | {"kind": "global", "declared_at": [...]} | {"kind": "inheritable", ...} | {"kind": "alias", "of": "..."})

## 4. default_fn 汎用機構の設計 (meta-Q6=A)

### 4.1 DSL

```
default_fn: "fn_name[:arg[:arg...]]"
```

filter/variant DSL と同じ書式。args は string、fn descriptor 側でキャスト。

### 4.2 builtin default_fn (kuu ns、canonical)

| fn | args | 用途 |
|---|---|---|
| `borrow` | `<other_option_name>` | 同 scope 他 option 値借用 |
| `inherit` | `<name>?` (省略時は自 name) | 祖先 scope 継承の明示形 (現 `inherit: true` の対称、汎用化) |
| `env` | `<VAR_NAME>` | 環境変数 |
| `constant` | `<value>` | 定数 (現 `default: value` の 1 対 1 対応、糖衣自動変換候補) |
| `computed` | `<key>` | 動的計算 (registry 拡張、system 提供 = `git_branch` / `hostname` / `date_now` 等) |
| `uuid` | `<v1|v4|v7>` | UUID 生成 (例、拡張候補) |

### 4.3 descriptor 設計 (DR-061 と対称)

```json
{
  "id": "borrow", "ns": "builtin", "kind": "default_fn",
  "owns": ["borrow"],
  "args": [{"name": "source", "type": "string"}],
  "returns": {"type": "same_as_target"}
}
```

引数の型宣言に **kuu の positionals 定義式**を使う (kawaz mid=21 追補) — `values` みたいに enum 制約もかけられる。

### 4.4 既存 default との関係

- `default: value` (静的定数) = 現行維持、糖衣として保持
- `default_fn: "fn:args"` (動的) = 新設
- **相互排他**: 併用は definition-error (`invalid-range`)

## 5. help_all_category / help_category の内部セルモデル

DR-112 §7 の内部セルモデル (「help の値セル実体は help 系要素のどれでもなく、help 機構が管理する内部セル」) は骨格として維持。ただし kawaz mid=18 の「hidden 独立軸」を反映して、複数の内部セルを持つ:

- `#help` (bool、共通、type:"help" / help_all_category / help_category / help_tree の発火で立つ)
- `#help_all_category` (bool、独立、type:"help_all_category" の発火で立つ)
- `#help_category` (string、独立、type:"help_category" の発火値)
- `#help_show_hidden` (bool、独立、type:"help_show_hidden" の発火で立つ、#help は立てない)
- `#help_tree` (bool、独立、type:"help_tree" の発火で立つ)

**result への露出**: 各 type の name (export_key) 経由。内部セルは `#` 予約 namespace の実装細部、wire にも result にも直接現れない。

## 6. lint warn の観測手段判定 (DR-112 §7 の kawaz 追補を維持)

「help 系要素はあるが、どれも結果面に露出していない = 発火をアプリが観測する手段が無い」構成のみ warn。help 不在でも name 露出があれば warn 不要。

## 7. conformance — fixture format と v1 発行条件

DR-112 §11 の骨格 (query:"help" fixture format + 順序込み比較 + 5 プロファイル green) は骨格として維持。ただし新 DR で **query:"help" は spec の別 query として立てず、kuu-cli の `kuu help` サブコマンドの入力/出力 fixture として位置づけ**。conformance runner は definition + args から出力を組む標準経路の一環として help fixtures を回す。

**v1 発行条件**: 5 プロファイル green (parse-core / lowering / definition-error / completion / help)。DR-108 §3 の 4→5 プロファイル改訂は維持。

## 8. help_epilog / order 関連 / hidden / group の維持

meta-Q2/Q3 承認済みの語彙は現行 DR-112 の記述をほぼそのまま維持:

- `help_long` / `help_epilog` (§4)
- `help_group_name` / `help_group_title` / `help_group_description` / グループ宣言エントリ (§5)
- `help_order` / `help_group_order` / `help_after` (§6、mid=14 で kawaz 詳細規定確認)
- `hidden: bool` 1 本、面別は ref&link (§10)
- `on_failure` / `help_on_failure` (§8)

**変更**:
- §5-6-6 後半「同一設定の再宣言は冪等で合法」を削除 (HIP-Q3 drift)、同名グループの重複宣言は無条件 definition-error

## 9. 段階的実現パス

| 段階 | 内容 |
|---|---|
| **P0** | 本 finding を kawaz レビュー、微修正 |
| **P1** | 新 DR (DR-113 「help 機構の再設計 (v2) — help_installer + 5 直交 type + value_structure tree + default_fn」) を起草。DR-112 を "Superseded by DR-113" 状態に |
| **P2** | fixtures/help/ の書き直し (5 直交 type の合成例 + value_structure tree + type_ref 例 + default_fn 例)。既存 13 fixture の drift 分 (help_all の意味論、同一設定冪等の記述) を訂正 |
| **P3** | kuu.mbt 実装のロールバック + 再実装。既存 help query 実装 3 コミット (7576ae0b M1 / 5547f383 M2 / cd37433d M3) は撤回、help_installer + 5 直交 type + value_structure tree + default_fn を新規実装 |
| **P4** | kuu-cli の追随 (`kuu help` サブコマンド、canonical レンダラ設計 issue) |
| **P5** | v1 発行条件 (5 プロファイル green) 達成 |

## 10. スコープ外 (別 issue / 別 DR)

- **canonical レンダラ設計 issue** (別立て): pipe 曖昧回避 / 集約 vs inline / 詳細説明形式 / レンダラ policy 指定オプション語彙 / version binding 等
- v1.0.0 発行そのもの (DR-108 §6 のまま)
- default_fn の 3rd party registry (拡張 ns 経由、DR-094)
- help_category の multiple 合成 (last-wins のみ v1)

## 11. リスク・悪い面

- **DR-112 land 済みの spec 波及** (DESIGN.md §14.1 / §14.6 / §15.15 / CONFORMANCE §5 / schema/wire.schema.json 等) を巻き戻す必要
- **kuu.mbt 実装コミット群 (5 コミット) のロールバック**: TRI-Q4 (4 コミット) は独立で維持、help query 実装 (3 コミット) は撤回。ロールバックは jj で新 commit として書き戻す (履歴 rewrite でなく forward rewrite)
- **fixtures/help/ 13 本の書き直し**: 既存 fixture の意味論が worker 起草仕様に依存している箇所を訂正、5 直交 type + value_structure tree + type_ref + default_fn の例を追加
- **conformance が一時的に red になる**: P3 実装ロールバック中は pin bump が同期する必要 (spec と kuu.mbt の lockstep 窓を厳密に管理)

## 12. 関連

- DR-112 (撤回対象、"Superseded by DR-113" にする)
- DR-042 (installer 3 役)、DR-057 (alias)、DR-058 (hidden / deprecated)、DR-059 (inheritable)、DR-063 (wire form)、DR-076 (プリセット属性展開)、DR-094 (namespace)、DR-098 (default 解決規則)、DR-099 (tty preset)、DR-109 (semantic sections)、DR-111 (accumulator/completer descriptor)
- docs/findings/2026-07-17-help-mechanism-design-plan.md (原設計プラン、drift 検出の物証)
- docs/findings/2026-07-17-cli-help-vocab-survey.md (12 系統ライブラリ調査)
- docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md (実 CLI 20+ 調査、4 方式 + 2 メタ軸)
- docs/findings/2026-07-19-kuu-help-display-expressibility-check.md (12 系統ライブラリ + 現 kuu 表現力チェック + origin 提案)
- docs/QUESTIONS.md の HIP-META-Q1〜Q6 (裁定履歴)
