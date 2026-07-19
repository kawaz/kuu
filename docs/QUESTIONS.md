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
> - **meta-Q4** (mid=13/16/17 で継続議論): 他 CLI パーサに前例無しの kuu 独自の悩みと確認、value_structure tree = a 相当を暫定推し。type_ref ノード + model トップ types セクション拡張 (mid=17 の共有型実用例) 提示済み。レンダラ 3 案 (pipe 曖昧回避、canonical レンダラ設計に持ち越し)
> - **meta-Q5** (mid=18 確定): **5 個の直交 type 構成** — `help` / `help_all_category` (旧 help_all 名前変更 + 意味論訂正、「全 category 絞りなし」) / `help_category` / `help_show_hidden` (独立軸新設、hidden 表示) / `help_tree` (独立軸新設、サブコマンド tree 全展開)。hidden は独立軸で分離 (混合概念回避)、現行 DR-112 §7 の type:"help_all" は完全撤回。各 type は or で組合せ可 (kuu 背骨の or 表現力そのまま)

## HIP-META-Q6: 他 option の値借用機構 (default_from / default_for) の追加 (kawaz 発題 mid=19)

### 背景説明

HIP-META-Q5 で確定した 5 直交 type (`help` / `help_all_category` / `help_category` / `help_show_hidden` / `help_tree`) を実際に使う場面で、「1 個の flag で複数の type を同時発火する宣言」を書きたい:

```
--help-all  = --help-all-category + --help-show-hidden
--help-full = --help-all-category + --help-show-hidden + --help-tree
```

現 kuu 精査結果:

- **variant DSL の effect** (DESIGN §7.4) は 4 種 (`set` / `default` / `unset` / `empty`)、1 入口 1 effect
- **link** (DESIGN §10.2) は 1 対 N (1 実体、N 参照)、逆方向 (1 入口 N 実体) は無い
- **inherit** (DESIGN §11.2) は「祖先 scope の同 name 借用」、同 scope の他 name 借用は無い
- **or** は 1 path で 1 発火、複数 cell 同時 set にはならない
- **同一トリガ重複宣言** は静的 warn + 実行時 ambiguous、不安定

**現 kuu では書けない**。kawaz 示唆の「default 注入で他 option 値借用」機構は kuu に無く、追加設計として提案価値あり。

### 選択肢 (追加設計の方向)

**案 α (推し) — 被参照側で宣言する `default_from` 属性**:

```json
{
  "options": [
    {"name": "help-all", "long": true, "type": "flag"},
    {"name": "help-all-category", "long": true, "type": "help_all_category", "default_from": "help-all"},
    {"name": "help-show-hidden", "long": true, "type": "help_show_hidden", "default_from": "help-all"}
  ]
}
```

- `--help-all` を打つと `help-all-category` / `help-show-hidden` の default に `help-all` 値が借用される
- 個別に `--help-all-category` だけ / `--help-show-hidden` だけ発火も可能 (default より CLI 明示が優先、値源ラダー §11.4)
- 既存 `inherit` の意味論拡張 (「祖先 scope 」を「同 scope 他 option」に一般化) に近い

**案 β — 参照側で宣言する `default_for` 属性**:

```json
{
  "options": [
    {"name": "help-all", "long": true, "type": "flag",
     "default_for": ["help-all-category", "help-show-hidden"]}
  ]
}
```

- 「この値をリストされた他 option の default に流し込む」= 逆方向宣言
- 「fullest help」の 1 flag で 3 直交軸を立てる: `default_for: ["help-all-category", "help-show-hidden", "help-tree"]`
- 記述の凝集度: 案 α は複数 option に分散、案 β は 1 option にまとめる

**案 γ — 両方向を許容 (`default_from` と `default_for` の双対)**:

- 使い分け: 「複数の source を持つ target」= 案 α 側で書く (target ごとに source を宣言)、「1 個の source が複数 target」= 案 β 側で書く (source ごとに target 群を宣言)
- 実装は同じ (裏で双方向解決)、記述の凝集度で使い分け

**案 δ — 採用しない (現 kuu で書けない状態を維持、5 直交 type の合成は諦め)**:

- ユーザは `--help-all-category --help-show-hidden` と手動で複数 flag を打つ (合成 flag を提供しない)
- 5 直交 type の意味は活きるが、UX 上の合成ショートカットが書けない

### 統括推し

**候補 α (default_from)** — 既存 `inherit` との対称性、値源ラダーへの自然な載り、記述の直感 (「この option の default は他 option の値から借用」の宣言的読み)。案 γ は将来拡張として open、案 β は α の逆方向で追加コストありに対して記述凝集度の利得はやや薄い、案 δ は「v1 完備主義」違反 (欲しい表現が書けない状態を放置)。

### kuu 全体への波及

これは help 機構専用の追加設計でなく、**汎用の option 間値借用機構**。他ユースケース:

- 汎用 verbose 系: `--verbose` の値を `--log-level` / `--progress` / `--dry-run-detail` に借用
- 集約 flag: `--strict` の値を `--strict-types` / `--strict-imports` / `--strict-runtime` に借用
- テーマ系: `--theme=dark` の値を複数の色 option の default に借用

汎用機構として設計する価値あり (help 専用でなく)。

### 参照

- DESIGN §7.4 (effect 語彙 4 種、現機構の限界)
- DESIGN §10.2 (link は 1 対 N)
- DESIGN §11.2 (inherit は祖先 scope 参照、同 scope 他 name は無い)
- DESIGN §11.4 (値源ラダー、default 席の位置)
- HIP-META-Q5 (5 直交 type、本 Q の需要源)

## HIP-META-Q4: 複合値構造 option の help model 表現

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
