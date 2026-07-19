# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> **⚠ 2026-07-19 HIP-META-Q バッチ裁定 (mid=14, mid=15, mid=18)**:
> - **meta-Q1 = a**: help_installer が必要、DR-112 §1 撤回、設計プランから立て直し。実装ロールバック計画へ
> - **meta-Q2**: order 関連 / display_name / value_name / help_on_failure 齟齬なし承認。**help_epilog = a 採用** (mid=15 の "epilog のことか、理解。ok" で確定)
> - **meta-Q3**: depth = "scope" | "all" 承認、数値 depth 不要。他 worker 起草部分も「基本よさそう」
> - **meta-Q4** (mid=13/16/17/20 で継続議論・確定): value_structure tree = a **承認**。type_ref ノード + model トップ types セクション拡張 (mid=17 の共有型) = **承認 (mid=20)**。レンダラ側は「趣味もある、後日レンダラ policy 指定オプション語彙追加で 1 行表現も選択可能に」(canonical レンダラ設計 issue に持ち越し、集約表示 vs 1 行 inline vs 詳細説明形式の選択可能化)。pipe 曖昧回避 (mid=16) も同 issue に持ち越し
> - **meta-Q5** (mid=18 確定): **5 個の直交 type 構成** — `help` / `help_all_category` (旧 help_all 名前変更 + 意味論訂正、「全 category 絞りなし」) / `help_category` / `help_show_hidden` (独立軸新設、hidden 表示) / `help_tree` (独立軸新設、サブコマンド tree 全展開)。hidden は独立軸で分離 (混合概念回避)、現行 DR-112 §7 の type:"help_all" は完全撤回。各 type は or で組合せ可 (kuu 背骨の or 表現力そのまま)

## HIP-META-Q6: default_fn 汎用機構の追加 (kawaz 発題 mid=19 → 対案 mid=21)

### 背景説明

HIP-META-Q5 で確定した 5 直交 type (`help` / `help_all_category` / `help_category` / `help_show_hidden` / `help_tree`) を実際に使う場面で、「1 個の flag で複数の type を同時発火する宣言」を書きたい (`--help-all` = `--help-all-category` + `--help-show-hidden` 等)。

**現 kuu 精査結果 (私の spec 読み込み範囲)**:

- variant DSL の effect (DESIGN §7.4) は 4 種、1 入口 1 effect
- link (DESIGN §10.2) は 1 対 N、逆方向は無い
- inherit (DESIGN §11.2) は祖先 scope 参照、同 scope の他 name 参照は無い
- or は 1 path で 1 発火、複数 cell 同時 set にはならない
- **default 席は宣言値 (定数) のみ、動的計算 / 他 option 参照 / 環境変数取得の機構は無い**
- default_fn の registry / シグネチャ機構も無い

現 kuu では書けない。追加設計が要る。

### kawaz 対案 (mid=21) — default_fn 汎用機構

専用属性 (`default_from` / `default_for`) を毎回増やすとキリがない。**汎用の `default_fn` 属性** で fn registry 引き + DSL:

```
default_fn: "fn_name[:arg[:arg...]]"
```

**具体 DSL 例** (filter/variant DSL と同じ書式):

```json
{"name": "help-all-category", "type": "help_all_category",
 "long": true, "default_fn": "borrow:help-all"}

{"name": "log-file", "type": "path",
 "long": true, "default_fn": "env:LOG_FILE"}

{"name": "branch", "type": "string",
 "long": true, "default_fn": "computed:git_branch"}

{"name": "session-id", "type": "string",
 "long": true, "default_fn": "uuid:v4"}
```

**builtin default_fn 候補** (kuu ns):

| fn | args | 用途 |
|---|---|---|
| `borrow` | `<other_option_name>` | 同 scope 他 option 値借用 (mid=19 発題用途) |
| `inherit` | `<name>?` (省略時は自 name) | 祖先 scope 継承の明示形 (現 `inherit: true` の対称、汎用化) |
| `env` | `<VAR_NAME>` | 環境変数 |
| `constant` | `<value>` | 定数 (現 `default: value` の 1 対 1 対応、糖衣で自動変換候補) |
| `computed` | `<key>` | 動的計算 (registry で拡張、system 提供 = git_branch / hostname / date_now 等) |
| `uuid` | `<v1\|v4\|v7>` | UUID 生成 (例) |

**descriptor 設計** (DR-061 と対称):

```json
{
  "id": "borrow", "ns": "builtin", "kind": "default_fn",
  "owns": ["borrow"],
  "args": [{"name": "source", "type": "string"}],  // kawaz 追補: kuu の positionals 定義式そのまま
  "returns": {"type": "same_as_target"}
}
```

引数の型宣言に **kuu の positionals 定義式**を使えるのが大きい (kawaz 追補) — `values` みたいに enum 制約もかけられる (既存機構の再利用)。

**既存 default との関係**:

- `default: value` (静的定数) = 現行維持、糖衣として保持
- `default_fn: "fn:args"` (動的) = 新設
- **相互排他**: 併用は definition-error (`invalid-range`)、fn は「関数呼び出しで default 値を計算」の位相、value は「宣言値」で位相違い

**他機構との類似性 (kuu 骨格と対称)**:

- filter DSL (`"trim"`, `"in_range:1:65535"`, `"regex_match:^...$"`) と同じ書式
- variant DSL (`":set"`, `"no:set:false"`, `"red:set:rgb:255:0:0"`) と同じ書式
- completer 参照 (`completer: "files"`) と同じ registry 参照
- filter registry / factory registry / completer registry と対称の default_fn registry

### 選択肢

- **候補 A (推し、kawaz 対案 mid=21)**: `default_fn` 汎用機構 + builtin fn 5〜6 個。専用属性を毎回増やさず、汎用 registry で全ユースケース吸収。DSL 書式と descriptor は既存機構 (filter / variant / completer) と対称
- 候補 B (mid=19 の旧提案): `default_from` / `default_for` 専用属性。用途特化で読みやすいが、他ケース (env / computed / uuid) ごとに新語彙が要り増殖する
- 候補 C: 採用しない (5 直交 type の合成は諦め、ユーザが手動で複数 flag を打つ)。v1 完備主義違反

### 統括推し

**候補 A (default_fn 汎用機構)** — kawaz 対案。理由:

1. kuu 骨格 (registry + DSL + descriptor + values) と完全に対称
2. 汎用性: help 専用でなく env / computed / uuid / borrow / inherit を 1 機構で吸収
3. 拡張性: 3rd party ns の descriptor で新 fn を足せる (拡張 ns 経由、DR-094)
4. v1 完備主義に整合 (専用語彙で埋め尽くさず、1 汎用機構で拡張性確保)

### kuu 全体への波及 (default_fn の他ユースケース)

- 汎用 verbose 系: `--verbose` の値を `--log-level` / `--progress` / `--dry-run-detail` の default_fn "borrow:verbose" で借用
- 集約 flag: `--strict` の値を `--strict-types` / `--strict-imports` / `--strict-runtime` の default_fn "borrow:strict" で借用
- テーマ系: `--theme=dark` の値を複数色 option の default_fn "borrow:theme" で借用
- 動的値: `--branch` の default_fn "computed:git_branch" で現在ブランチを自動取得
- 環境: `--config` の default_fn "env:APP_CONFIG"
- 現 `inherit: true` の汎用化: `default_fn "inherit"` (省略引数)、または `default_fn "inherit:parent_name"` で名前指定

**現 `inherit: true` との整合**: default_fn "inherit" は既存 `inherit: true` の関数形。糖衣として `inherit: true` を残すか、`default_fn: "inherit"` に統一するかの裁定は追加論点 (裁定 A の後で議論)。

### 参照

- DESIGN §7.4 (effect 語彙、現機構の限界)
- DESIGN §7.3 / §8.4 (variant DSL / filter DSL の書式、default_fn の書式基盤)
- DESIGN §10.2 (link 1 対 N)
- DESIGN §11.2 (inherit 祖先 scope 参照)
- DESIGN §11.4 (値源ラダー、default 席の位置)
- DR-061 (descriptor 骨格、default_fn descriptor の設計基盤)
- DR-094 (namespace、ns 経由の拡張)
- DR-055 §5.3 (values enum、descriptor args の positionals 定義式の類似)
- HIP-META-Q5 (5 直交 type、本 Q の需要源)

## HIP-META-Q4: 複合値構造 option の help model 表現 (裁定確定 mid=20)

**裁定サマリ**: 本体 = a (value_structure tree) 承認、付録 2 (共有型 type_ref + types セクション) mid=20 で承認。レンダラ側 (pipe 曖昧回避 / 集約 vs inline / 詳細説明) は canonical レンダラ設計 issue に持ち越し、「レンダラ policy 指定オプション語彙」を追加して選択可能に (kawaz mid=20 落とし所)。以下は議論の記録 (次のセッション参照用)。

### kawaz 追補 (mid=13)

`--color` の 3 引数 (`--color r g b`) だけでなく、`colorname` との or (`--color red` or `--color 255 0 0`) も kuu 背骨 (or/seq/repeat 任意ネスト) で書ける仕様。help model で表現できないと素材不足。

### kawaz 提示 (mid=14)

他 CLI パーサに前例が無い kuu 独自の悩みと確認 (統括の他 CLI 調査でも or 分岐値 option を model schema で扱う CLI パーサは無し、全て custom parser 内に隠蔽)。

kawaz レンダラ表示案 (canonical レンダラの候補):

1. `--color <COLOR_NAME|R G B>` (1 行 pipe 分岐)
2. `--color <COLOR_NAME>` / `       <R G B>` (2 行、value_name のみ)
3. `--color <COLOR_NAME|RGB>` / `        COLOR_NAME:  cssカラー名` / `        RGB: R G B  RGBカラー0-255の数字3つ。e.g. 255 0 0` (usage 名 + 詳細説明)

### 選択肢

- **候補 a (推し)**: options entry に `value_structure` フィールドを追加、tree 形は AST の or/seq/repeat と同型で表現力を保存。レンダラは tree を再帰的にトラバースして usage/help を組む。kawaz 3 案はレンダラ policy の候補 = **model は素材のみ、canonical レンダラで既定案を決める**

  ```json
  {
    "spellings": ["--color"],
    "value_structure": {
      "or": [
        {"single": {"value_name": "COLOR_NAME", "values_enum": ["red", "green", ...]}},
        {"seq": [
          {"single": {"value_name": "R", "type": "number"}},
          {"single": {"value_name": "G", "type": "number"}},
          {"single": {"value_name": "B", "type": "number"}}
        ]}
      ]
    }
  }
  ```

- 候補 b: `value_names: [...]` 平坦 list (単純複数値のみ、or 分岐は非対応) — kuu spec の or 表現力を model が捨てる**縮小推し (v1 完備主義違反)**、不採用側
- 候補 c: 現状維持 (value_name 1 個)、複雑構造はレンダラが AST を直接読む — 素材と policy 分離の原則を破る、DR-112 骨格違反

### 付録: レンダラ usage 表記の曖昧回避 (kawaz 指摘 mid=16)

kawaz 懸念: `<COLOR_NAME|R G B>` は 2 通りに読める曖昧表記 (pipe の precedence 不明示):

- **意図 A** (or 分岐): `<COLOR_NAME> | <R G B>` = COLOR_NAME 単独 or R G B の seq 3 個
- **意図 B** (seq 内 or): `<<COLOR_NAME|R> <G> <B>>` = 1 個目 (COLOR_NAME or R) + G + B の seq 3 個

これは **model 側** (value_structure tree、or/seq/repeat 明示) の話**ではなく**、**canonical レンダラが tree を usage 表記に落とす際の表記法** の議論。model 自体は or/seq ノードが明示されているので曖昧を排除できる。

canonical レンダラ設計 issue (別立て、DR-112 波及節「canonical レンダラ」で提示予定) で以下の policy を定める:

- **候補 1 (明示括弧強制)**: `<COLOR_NAME | <R G B>>` — or の各分岐を `<...>` で明示、tree 構造を表記に反映。単純 or (葉が single のみ) の推し
- **候補 2 (詳細説明形式、kawaz mid=14 案 3)**:

  ```
  --color <VALUE>
    VALUE:
      <COLOR_NAME>       色名 (red, green, ...)
      <R> <G> <B>        RGB (0-255 の数値 3 個)
  ```

  曖昧さゼロ、複雑な value_structure (seq/repeat のネスト混在) の推し
- 候補 3 (2 行分離、kawaz mid=14 案 2): `--color <COLOR_NAME>` / `       <R G B>` — シンプルだが「or」であることが表記から読みにくい (連続の意 or 分岐の意 が不明)

統括推し (canonical レンダラ既定 policy): **tree の複雑度で使い分ける** — 単純 or は候補 1、複雑ネストは候補 2。3 は不採用側 (or が読めない)

**本付録は HIP-META-Q4 の model 側裁定 (value_structure tree = a) に影響しない** — model は tree で表現力保存、レンダラ policy は canonical レンダラ設計 issue で決める。ここは統括の推しを記録するにとどめる。

### 付録 2: definitions で構造型を共有する場合の model + レンダラ設計 (kawaz 提示 mid=17)

kawaz が示した実用例: kuu の既存機構 (`definitions` + `ref`) で構造型を定義し、複数の option がそれを参照する。共有型は help でも集約表示するのが自然:

```
--fg COLOR
--bg COLOR
--level-colors INFO WARN DEBUG

Types:
  COLOR, INFO, WARN, DEBUG:
    <COLOR_NAME>       色名 (red, green, ...)
    <R> <G> <B>        RGB (0-255 の数値 3 個)
```

定義側 (推測形):

```json
{
  "definitions": {
    "color_value": {
      "value_name": "COLOR",
      "or": [
        {"value_name": "COLOR_NAME", "values": ["red", "green", ...]},
        {"seq": [{"value_name": "R", "type": "number"}, {"value_name": "G", "type": "number"}, {"value_name": "B", "type": "number"}]}
      ]
    }
  },
  "options": [
    {"name": "fg", "long": true, "ref": "color_value"},
    {"name": "bg", "long": true, "ref": "color_value"},
    {"name": "level-colors", "long": true, "seq": [
      {"ref": "color_value", "value_name": "INFO"},
      {"ref": "color_value", "value_name": "WARN"},
      {"ref": "color_value", "value_name": "DEBUG"}
    ]}
  ]
}
```

これは value_structure tree 設計を **type_ref ノード + model トップの types セクション** に拡張する必要:

**model 側の追加**:

1. **value_structure tree に `type_ref` ノード追加**:

   ```json
   {"type_ref": "color_value", "value_name": "INFO"}
   ```

   - `type_ref` は definitions への参照 (kuu 既存 `ref` 機構)
   - `value_name` は**参照箇所固有の名前**の上書き (`level-colors` の 3 引数を `INFO WARN DEBUG` と個別命名する用)。省略時は type 定義側の value_name (`COLOR`) を使う

2. **help model のトップに `types` セクション追加** (参照されている definitions を集約射影):

   ```json
   {
     "command_path": [...],
     "usage": {...},
     "types": [
       {
         "id": "color_value",
         "value_structure": {
           "or": [...]
         },
         "help": "...",
         "used_as": ["COLOR", "INFO", "WARN", "DEBUG"]  // 参照箇所の value_name 一覧
       }
     ],
     "options": [...],
     ...
   }
   ```

**レンダラ policy** (canonical レンダラ設計 issue で決定):

- type_ref ノードの**参照回数**を集計 (types セクションの `used_as` で判別可能)
- **参照回数 ≥ 2**: usage 行は value_name 短縮表記 (`COLOR`, `INFO WARN DEBUG`)、末尾 `Types:` セクションで詳細展開。**共有型の重複展開を防ぐ**
- **参照回数 1**: `types` セクションに載せず、value_structure を inline 展開する (統一感重視、統括推し) or type_ref のまま表示 (省略統一)
- kawaz 例の `COLOR, INFO, WARN, DEBUG:` は 4 名前を集約表示するパターン (canonical レンダラの既定 policy)

**HIP-META-Q4 との整合**:

value_structure tree = a (Q4 の推し) に **type_ref ノード対応** を追加する形で拡張。model schema の骨格 (value_structure が or/seq/repeat/single/type_ref の 5 種ノードの tree) は同じ。types セクションは model トップの新規フィールド。

**kuu の既存機構 (definitions + ref) との整合**:

kuu spec は既に definitions (DR-063 §1) と ref を持つ = help model の type_ref はこれの直接射影。**新規語彙は「model 側の type_ref ノード名 + types セクション」のみ**、definition 側の wire form 側は既存機構をそのまま使う。

## HIP-Q バッチ (発生順)

> **注**: HIP-META-Q1 = a 裁定に伴う DR-112 全体撤回 + 立て直しを待つため、HIP-Q1〜Q4 の議論は保留。新 DR (help_installer 設計プラン起草後の正本) の記述に応じて再定式化する。旧 HIP-Q1〜Q7 のうち Q2/Q5/Q6/Q7 は実装追随 issue に、Q3 は drift 訂正、Q1/Q4 は新 DR に取り込みで消化される見込み。
