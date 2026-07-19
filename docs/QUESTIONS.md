# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> **⚠ 2026-07-19 HIP-META-Q バッチ裁定 (mid=14, mid=15)**:
> - **meta-Q1 = a**: help_installer が必要、DR-112 §1 撤回、設計プランから立て直し。実装ロールバック計画へ
> - **meta-Q2**: order 関連 / display_name / value_name / help_on_failure 齟齬なし承認。**help_epilog = a 採用** (mid=15 の "epilog のことか、理解。ok" で確定)
> - **meta-Q3**: depth = "scope" | "all" 承認、数値 depth 不要。他 worker 起草部分も「基本よさそう」。**ただし mid=15 で type:"help_all" の意味論齟齬発覚 → 下記 HIP-META-Q5**
> - **meta-Q4**: 他 CLI パーサに前例無しの kuu 独自の悩みと確認、value_structure tree = a 相当を暫定推し。レンダラ 3 案 (`--color <COLOR_NAME|R G B>` 1 行 / 2 行分離 / 詳細説明付き) は canonical レンダラ設計時に決定

## HIP-META-Q5: type:"help_all" の意味論齟齬 + サブコマンド全展開 type 新設 (mid=15)

### 齟齬の内容

現 DR-112 §7 (worker 起草) と kawaz 原意 (mid=15 で発覚) が乖離:

- **現 DR-112 §7 の type:"help_all"**: 「hidden 込み全表示の意図メタ」= hidden な要素も含めて表示 (worker 起草解釈)
- **kawaz 原意**: 「全 category を見せるフラグ」= 全オプションに暗黙的に all カテゴリが付与されてそれを選ぶ = カテゴリを絞らない help

つまり kawaz 原意の「help_all」は **「カテゴリ絞りなしの help」 = 現行 type:"help" と重なる領域** で、実 CLI で `-h` (要約) vs `--help` (詳細) のような**詳細度差**を category という機構で表現する構想。「hidden 込み」の意味は原意に無い。

### kawaz 追補 (mid=15 の追加提案)

> 「よく考えたら、サブコマンド等含めた全展開モードという見方もあるね、君らはこっちのイメージで話してたから少しズレを感じてたのか。そして全展開モードはあって良いと思うのでそのトリガとしての type も新設して良いかもですね」

= サブコマンド tree 全展開モード (depth:all + hidden 込みの全開示) は別 type として新設して良い。**別々の 2 種の意図を、別々の type で分ける方向**。

### 整理表 (kawaz 原意 + 新 type)

| type | 意味論 (kawaz 原意 + 追補) | 補足 |
|---|---|---|
| `type:"help"` | 基本 help (bool、現スコープ、絞りなし) | 承認済み |
| `type:"help_all"` | **全 category を見せる (絞りなし)** — 現 DR-112 §7「hidden 込み」記述は撤回、kawaz 原意に修正 | 「よく使うもの」と「詳細」を category で分けたアプリで、`--help-basic` (絞り) と `--help-all` (絞りなし) の 2 段運用を素材化 |
| `type:"help_category"` | 特定 category に絞る (string 値) | 承認済み |
| **新 type (未命名)** | **サブコマンド tree 全展開 + hidden 込み** (depth:all + hidden 露出) | サブコマンド階層を再帰的に一挙開示 (man 生成や `--help-full` 相当) |

### 選択肢

**選択肢 1: 新 type の命名 (statiに 4 択)**

- **候補 a (推し)**: `type:"help_tree"` — サブコマンド tree 展開の意。最も意味論に近く、depth:"all" (「全層再帰 = tree 全開」) と紐付けが明確
- 候補 b: `type:"help_full"` — 完全形の意。汎用だが「何が full か」が読み手依存
- 候補 c: `type:"help_expand"` — 展開の意。tree/all 意味論に近いが英単語として微妙
- 候補 d: `type:"help_recursive"` — 再帰の意。長くて他 kuu 語彙と綴りバランス悪

**選択肢 2: hidden 露出の紐付け先**

kawaz 原意で「help_all は hidden 込みではない」なので、「hidden 露出」の意図メタは新 type (help_tree 相当) に紐付ける、あるいは独立フラグとして持つか:

- **候補 α (推し)**: 新 type (help_tree) が hidden 露出を含む (depth:all + hidden 込みの複合意味論)。「サブコマンド全展開の時は hidden も見たい」は自然な運用直感
- 候補 β: hidden 露出は独立 (別 type or 独立属性)。help_tree は hidden を出さない、hidden 露出は別途 `--help-hidden` 等で

**選択肢 3: type:"help_all" の記述修正**

- **候補 A (推し)**: DR-112 §7 の type:"help_all" 節を「hidden 込み」から「全 category 絞りなし」に**書き換え** (kawaz 原意への訂正)
- 候補 B: type:"help_all" を廃止し type:"help" と統合 (「基本 help = 全 category 絞りなし」で 1 本に)。help_all という名前を捨てる

### 参照

- DR-112 §7 (現記述、worker 起草解釈)
- DR-112 §5 (グループ = category、help_group_name)
- mid=15 (kawaz 原意 + 追補の一次資料)

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

## HIP-Q バッチ (発生順)

> **注**: HIP-META-Q1 = a 裁定に伴う DR-112 全体撤回 + 立て直しを待つため、HIP-Q1〜Q4 の議論は保留。新 DR (help_installer 設計プラン起草後の正本) の記述に応じて再定式化する。旧 HIP-Q1〜Q7 のうち Q2/Q5/Q6/Q7 は実装追随 issue に、Q3 は drift 訂正、Q1/Q4 は新 DR に取り込みで消化される見込み。
