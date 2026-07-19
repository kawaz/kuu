# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> **⚠ 2026-07-19 HIP-META-Q バッチ裁定 (mid=14, mid=15, mid=18, mid=23)**:
> - **meta-Q1 = a**: help_installer が必要、DR-112 §1 撤回、設計プランから立て直し。実装ロールバック計画へ
> - **meta-Q2**: order 関連 / display_name / value_name / help_on_failure 齟齬なし承認。**help_epilog = a 採用** (mid=15 の "epilog のことか、理解。ok" で確定)
> - **meta-Q3**: depth = "scope" | "all" 承認、数値 depth 不要。他 worker 起草部分も「基本よさそう」
> - **meta-Q4** (mid=13/16/17/20 で継続議論・確定): value_structure tree = a **承認**。type_ref ノード + model トップ types セクション拡張 (mid=17 の共有型) = **承認 (mid=20)**。レンダラ側は「趣味もある、後日レンダラ policy 指定オプション語彙追加で 1 行表現も選択可能に」(canonical レンダラ設計 issue に持ち越し、集約表示 vs 1 行 inline vs 詳細説明形式の選択可能化)。pipe 曖昧回避 (mid=16) も同 issue に持ち越し
> - **meta-Q5** (mid=18 確定): **5 個の直交 type 構成** — `help` / `help_all_category` (旧 help_all 名前変更 + 意味論訂正、「全 category 絞りなし」) / `help_category` / `help_show_hidden` (独立軸新設、hidden 表示) / `help_tree` (独立軸新設、サブコマンド tree 全展開)。hidden は独立軸で分離 (混合概念回避)、現行 DR-112 §7 の type:"help_all" は完全撤回。各 type は or で組合せ可 (kuu 背骨の or 表現力そのまま)
> - **meta-Q6 = A** (mid=23 確定): **default_fn 汎用機構**。fn registry 引き + DSL `"fn_name[:arg...]"` (filter/variant DSL と対称)。builtin fn = borrow / inherit / env / constant / computed / uuid。descriptor 引数の型宣言に kuu の positionals 定義式 (kawaz mid=21 追補)。**DR-088 で kawaz 裁定原文に「default_fn」の語が既出** (「env 指定があるってことは env から遅延解決する default_fn が設定されてるようなもん」) = 概念は既存、DSL 実装が新設分。専用属性 (default_from / default_for) 廃案

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
