# canonical help レンダラの設計プラン — レイヤ分類・テンプレ語彙・help_xx config 統合

> 由来: issue `docs/issue/2026-07-18-help-renderer-design.md` (kawaz 発題 2026-07-18「ヘルプ出力の微調整のためのテンプレやクロージャ導入やパーツのレイヤー分類などとかはどうします？」)。DR-113 (help model の確定形) / DR-114 (universal fn) land 後の層 2 (レンダラ) 設計プラン。本 finding は REND-Q バッチの裁定素材であり、裁定後に DR 化して canonical レンダラの spec 関与範囲を確定する。

## 0. 前提の地図 (ゼロコンテキスト読者向け)

- **help model** (レンダラの入力) は確定済み: DR-113 §4。表示文言でなく構造素材 (`value_structure` tree / `type_ref` + `types` / `origin` / group entry / order 適用済み並び / hidden・deprecated・default・env 等の注記素材) を返す。usage の一行文字列を持たない。version 文字列を持たない。プログラム名は呼び出し側が供給する (DR-113 §4.4)
- **共通化の上限** は確定済み: DR-109 §1 柱 4「help/error は semantic model + policy まで共通、renderer は言語側」。docopt の轍 (usage text を正本にすると翻訳・rewrap が死ぬ) の回避が根拠
- **canonical レンダラ** = kuu プロダクトが標準提供するテキストレンダラ。completion 生成器 (DR-060 §5 の層 2「kuu 標準提供、shell 作法を封じる」) の help 版に当たる。spec (規範) の住人ではなくプロダクトの住人であり、最初の consumer は kuu-cli の `--help` self-hosting (kuu-cli の `kuu help` は現在 model JSON を emit するのみ — kuu-cli リポ `impl/mbt/cli/src/main.mbt` の `run_help`)
- **仕様外の明言済み範囲**: 文言・翻訳・幅・折返し・色・ページング・stdout/stderr・exit code・man / Markdown 生成 (`docs/findings/2026-07-17-help-mechanism-design-plan.md` §7、DR-113 射程外節)。本プランはこの線引きを維持した上で「レンダラへの指示語彙」だけを spec の関心に加えるかを設計する

## 1. レイヤ分類の確定案 — 3 層と spec 関与範囲の線引き

issue の 3 層足場 (テンプレート層 / 部品関数層 / プリミティブ層) を DR-113 の model 素材と突き合わせて精緻化する。

### 1.1 各層の責務

| 層 | 責務 | 入力 → 出力 |
|---|---|---|
| **テンプレート層** | セクションの選択・並び・有無。usage / description / types / commands / options (group 見出し込み) / positionals / epilog をどの順でどれだけ出すか | help model → セクション列 |
| **部品関数層** | 1 セクション / 1 entry の組み立て。option 行 (`--fg, -f <COLOR>  前景色を指定する [default: green] [env: FG_COLOR]`) の組み方、`value_structure` tree → usage 表記 / 詳細説明形式への落とし方、`types` 集約の組み方、origin 注記の付け方 | model の entry / tree → 行 (群) |
| **プリミティブ層** | 文字列整形の物理: 2 カラム整列・折返し・インデント・端末幅・色 (ANSI)・パディング | 行 (群) → 最終テキスト |

### 1.2 spec 関与範囲の線引き (本プランの背骨)

原則: **spec が持つのは「レンダラへの指示語彙」の名前・受理・搬送・model への射影まで。指示に従った表示結果 (テキスト) は一切規範化しない**。conformance が検証するのは語彙の搬送 (wire → model) までで、canonical レンダラの出力は fixture pin しない (docopt の轍の回避を出力側にも貫く)。

| 層 | spec (wire / model) が持つ | canonical レンダラ (kuu 標準提供) が持つ | 言語側 DX の自由 |
|---|---|---|---|
| テンプレート層 | セクション識別子の語彙 + 並び・有無の指示席 (§3) | 既定のセクション順・組み立て | セクション関数の差し替え (picocli sectionMap 型、クロージャ) |
| 部品関数層 | 表示様式の enum 語彙 (value_structure 表記形式 / types 集約 / origin 方式、§4) | 各 enum 値の表記実装と既定値 | 部品関数の差し替え・追加 |
| プリミティブ層 | 無し (完全に仕様外) | 既定実装 (幅検出・折返し・整列) | 全部自由 |

この線引きは DR-060 §5 (completion の責務 4 層) の相似形: 「complete API + 候補構造 = spec / 生成器 = kuu 標準提供 / アプリは繋ぐだけ」の「生成器」席に canonical レンダラが入り、shell 作法の代わりに「テキスト整形の作法」を封じる。

### 1.3 レンダラへの入力は 2 種の policy に分かれる (精緻化)

DR-113 §2 の orchestration 写像を読むと、レンダラへの入力は由来の異なる 2 種に分かれる。この区別を設計語彙として固定する:

1. **表示要求 (パース結果由来、実行のたびに変わる)**: `category_mode` (`"default"` / `"all"` / `{"named": name}`) と `show_hidden` (bool)。DR-113 §2 で確定済み — `#help_show_hidden` は「model 取得条件を変えず、hidden entry を表示する renderer policy 入力」、`category_mode` の `"default"` / `"all"` は「model 素材を変えない表示 policy 指示」。`#help_tree` は query の `depth: "all"` に写って model 側に再帰が入るため、レンダラは model を見るだけでよい (レンダラ入力ではない)
2. **表示様式 (定義 / アプリ由来、実行間で安定)**: セクション並び、value_structure の表記形式、types 集約、origin 方式など。kawaz 示唆 (2026-07-18)「レンダラの調整やテンプレ指定なんかも help_xx (属性) で config 一括と個別調整併用」の対象はこちら

canonical レンダラの概念シグネチャ:

```
render_help(model, {
  program_name?: string,          // DR-113 §4.4「定義に無いプログラム名は呼び出し側が供給」
  category_mode?, show_hidden?,   // 表示要求 (アプリが内部セルから写す、DR-113 §2)
  bindings?: {name: value, ...},  // §5 の binding 補間
  style?: {...}                   // 表示様式の override (§3-4 の語彙、wire 由来の値に上書き)
}) → text
```

失敗 envelope (query-error `absent-path` / `absent-category`、DR-113 §1) はレンダラの入力ではない — アプリが query 呼び出しの分岐で処理する。canonical レンダラ製品が「query-error → 人間向け文言」の補助部品を持つのは自由 (部品関数層の任意部品、spec 関与なし)。

## 2. テンプレ語彙 vs クロージャ — 二大パターンの裁定素材

`docs/findings/2026-07-17-cli-help-vocab-survey.md` の実測から、カスタマイズ API は二大パターンに分かれる:

| パターン | 実例 | 形 | 言語非依存に載るか |
|---|---|---|---|
| **プレースホルダタグ型** | clap `help_template` (`{name}` `{usage}` `{all-args}` `{options}` ...) | 文字列テンプレート 1 本にタグを埋める | 載るが、**テンプレ言語の発明を要求** (タグ文法・エスケープ・条件分岐・ループ… 拡張要求が際限なく続く沼) |
| **セクション差し替え型** | picocli `sectionKeys` (固定セクション ID 列の並べ替え) + `sectionMap` (ID → 関数) | 宣言的な ID 列 + 手続き的な関数 map | ID 列は載る (ただの enum 配列)。関数 map は載らない (クロージャ = 言語側) |

### 2.1 kuu の設計原則への当てはめ

- kuu は言語非依存 spec であり、wire に載せた語彙は全実装が受理・搬送する義務を負う。**プレースホルダ文字列テンプレを wire に載せると、テンプレ文法そのものが spec の一部になる** — 「素材はフィールド、文言はレンダラ」(DR-053/054、DR-109 柱 4) の分離を自ら破る
- picocli 型は 2 つに分解できて、宣言的な半分 (セクション ID の並び・有無) だけが wire に載り、手続き的な半分 (関数差し替え) は各言語 DX (UsefulAST 層) に自然に落ちる。**この分解線が DR-109 柱 4 の「policy まで共通、renderer は言語側」とちょうど一致する**
- 沼の回避装置として、**セクション識別子は発明せず help model のトップレベルキーから導出する** (§3.2)。「テンプレ語彙の設計」を「model 射影の命名」に還元し、独立したテンプレ言語を作らない

### 2.2 裁定素材の整理

- **推し**: セクション差し替え型の宣言的半分のみ spec 収載 (= セクション識別子の配列)。プレースホルダ文字列テンプレは v1 で導入しない。クロージャ (セクション関数・部品関数の差し替え) は各言語レンダラ実装の API 設計に完全委任 (spec は関与も禁止もしない)
- 対極 (clap 型テンプレ文字列) を採らない理由: タグ集合の確定・条件分岐の要求 (clap 自身 `{bin}` 非推奨化などタグの改廃を経験している)・エスケープ規則、の 3 点がそれぞれ独立の仕様論点になり、all-in の沼。version binding のユースケース (§5) は文言内の変数参照だけで満たせ、テンプレ全体の制御構造は要らない

## 3. help_xx config 統合の形 — 一括 config と個別調整の併用

kawaz 示唆 (issue 背景、2026-07-18): 「レンダラの調整やテンプレ指定なんかも help_xx (属性) で config 一括と個別調整併用とかで書く流れですよねきっと」。具体形の設計:

### 3.1 座席の設計 — 3 段の override 連鎖

```
wire の一括席 (definition / command 要素)   … 定義者の既定
  ← wire の個別席 (entry 単位の help_xx 属性) … 要素単位の上書き
    ← レンダラ API の style 引数              … アプリ実行時の上書き
```

- **一括席**: command 要素 (ルート含む) に置くオブジェクト属性。階層継承 + 子で上書き — 既存 `config` (DESIGN §7.2 の long_prefix 等) と同じ継承機構に載せるが、**座席は別に立てる**。理由: `config` はパース方言 (受理挙動に影響) の席であり、レンダラ様式は inert 表示メタ (パース挙動に影響しない、DR-113 §1「宣言層に inert 属性として残り、lowered 産物や評価器へ運ばない」)。位相の違う語彙を同じ席に混ぜない
- 座席名の候補 (省略形を使わない原則に従い完全語): `help_render` (renderer への指示であることが直截) / `help_display` (既存 `display_name` と語幹が揃う) / `help_style`。統括提案は `help_render`
- **個別席**: 既存の個別 help_xx 属性 (`help_order` / `help_after` / `help_group_name` / `hidden` ...) の系列に、表示様式の entry 単位上書き (例: この option だけ value_structure を詳細説明形式で出す) を必要最小限追加する
- **所有**: help_installer が回収する表示メタ語彙 (DR-113 §1) に追加。unknown-vocab 正当化・definition-time 検査 (enum 値の invalid-range) も help_installer の既存責務に乗る

### 3.2 一括席の中身 (キー案 — DR 化時の具体設計、値は §6 の既定 policy と対)

| キー案 | 型 | 意味 |
|---|---|---|
| `sections` | array of string | セクション識別子の並びと有無。**識別子は help model のトップレベルキー由来** (`"usage"` / `"description"` / `"types"` / `"commands"` / `"options"` / `"positionals"` / `"epilog"`) — 発明ゼロの原則 (§2.1)。省略 = canonical 既定順 |
| `value_structure_style` | enum | `"auto"` / `"inline"` / `"detail"` (§6.1) |
| `types_style` | enum | `"auto"` / `"aggregate"` / `"inline"` (§6.2) |
| `origin_style` | enum | `"merge"` / `"separate_section"` / `"reference"` / `"omit"` (§6.3) |

### 3.3 model への射影

DR-113 の設計 (help model = 「定義を読み直さずに一覧が組める」素材) を守るため、**一括席の実効値 (階層継承の適用後) を help model に射影する**。model トップに射影席 (例: `render`) を 1 つ足す形。hidden が model に載って除外はレンダラ policy、と同じ構図 — 様式指定も「定義者の意図」という素材である。wire 受理 → model 射影の搬送だけが conformance の検証対象で、レンダラがそれにどう従ったかは検証しない (§1.2)。

## 4. issue の反映素材 7 点の層マッピング

issue 「レンダラ設計への反映素材」7 点が、それぞれどの層のどの論点になるか:

| # | 素材 | 層 | 論点への写り |
|---|---|---|---|
| 1 | 5 直交 type → category_mode contract (HIP-META-Q10-α) | テンプレート層 | 表示要求入力 (§1.3-1)。`"default"` / `"all"` の canonical 差分が未充足 — **REND-Q4** (§6.4) |
| 2 | query-error envelope (HIP-META-Q10-β) | (レンダラ入力外) | アプリ側分岐で処理 (§1.3 末尾)。canonical レンダラの補助部品は任意 |
| 3 | value_structure (tree + type_ref + types + origin) | 部品関数層 | tree → 表記の落とし方 (§6.1)。model は表現力を保存済み、表記だけが論点 |
| 4 | pipe 曖昧回避 (HIP-META-Q4 付録 1) | 部品関数層 | `<COLOR_NAME\|R G B>` の 2 読み排除。表記形式の既定 policy — **REND-Q5** (§6.1) |
| 5 | レンダラ policy 指定語彙 (HIP-META-Q4 付録 2、kawaz mid=20「後日レンダラポリシー指定オプション語彙追加で 1 行表現も選択可能」) | 全層 | §3 の help_xx config そのもの — **REND-Q1/Q2** |
| 6 | version binding (kawaz mid=11「パーサ外から binding を与えてテンプレで使う仕組みは設計としてありうる」) | 部品関数層 + API | §5 — **REND-Q3** |
| 7 | types 共有型集約表示 (HIP-META-Q4 付録 2、kawaz mid=17 例) | テンプレート層 + 部品関数層 | `Types:` セクションの有無と集約閾値 (§6.2) — **REND-Q5** に同梱 |

## 5. version binding — 文言内の変数参照 (最小テンプレ)

kawaz mid=11 の承認 signal (「設計としてありうる」、当時の統括回答 F で cobra `{{.Version}}` 型と整理済み) を具体化する:

- **binding の供給はレンダラ API 引数** (`bindings: {version: "1.0.0", build_date: ...}`)。kuu-cli では `kuu help ... --binding version=1.0.0` の形に写る。spec (model) は version 文字列を持たない原則 (DR-113 §4.4) は不変 — binding は model の外からレンダラに入る
- **文言側の参照は `{name}` 変数参照のみ** (`help` / `help_long` / `help_epilog` の文字列中)。エスケープは `{{` → literal `{`。条件分岐・ループ・フィルタは持たない — §2.2 の沼の線引きをここで確定する (「変数参照 1 機能だけの最小テンプレ」と「テンプレ言語」の境界を明言し、将来の拡張議論を意図的に閉じる)
- 未解決 binding の扱い (そのまま残す / 空にする / warn) は canonical レンダラの実装判断 (spec 関与なし)。統括推しは「そのまま残す」(定義者が typo に気づける)
- **位相の注意**: `{name}` 参照は wire の help 文言に書かれるため、レンダラを通さない consumer (help model の JSON を直接読む script) には生のまま見える。これは「文言はレンダラの関心」の帰結として許容する (model は素材、補間は表示時)

## 6. canonical レンダラの既定 policy 案 (裁定素材)

### 6.1 value_structure の表記形式 (pipe 曖昧回避を含む)

kawaz mid=16 指摘: `--color <COLOR_NAME|R G B>` は「COLOR_NAME 単独 or R G B」(or 分岐) と「(COLOR_NAME|R) G B」(seq 内 or) の 2 通りに読める。model は tree (or/seq 明示) なので曖昧は表記だけの問題。既定 policy 案 (HIP-META-Q4 付録 1 の統括推しを維持):

- **`"auto"` (既定)**: tree の複雑度で使い分ける — 葉が single のみの単純 or は 1 行明示括弧 `<COLOR_NAME | <R G B>>` (or の各分岐を `<...>` で括り precedence を表記に反映)、seq/repeat のネスト混在は詳細説明形式:

  ```
  --color <VALUE>
    VALUE:
      <COLOR_NAME>       色名 (red, green, ...)
      <R> <G> <B>        RGB (0-255 の数値 3 個)
  ```

- `"inline"`: 常に 1 行 (kawaz mid=20「1 行表現も選択可能に」の受け皿)。`"detail"`: 常に詳細説明形式
- kawaz mid=14 案 3 (2 行分離) は不採用側 (or であることが表記から読めない)

### 6.2 types 共有型の集約 (kawaz mid=17 例)

- **`"auto"` (既定)**: `used_as` の参照回数 ≥ 2 の共有型は usage 行を value_name 短縮表記にし、末尾 `Types:` セクションで詳細展開 (`COLOR, INFO, WARN, DEBUG:` の集約見出し)。参照回数 1 は inline 展開して `Types:` に載せない
- `"aggregate"`: 参照回数によらず type_ref は常に `Types:` へ。`"inline"`: 常に inline 展開 (`Types:` セクションなし)
- model は両方に必要な素材を保持済み (DR-113 §4.2「inline 表示か Types: 集約表示かはレンダラ policy が決める」) — ここは既定値の裁定だけが残っている

### 6.3 origin (global / inheritable 由来 entry) の表示方式

実 CLI 実測 (`docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md`) の 4 方式が model の `origin` で全部組める (DR-113 §4.3)。canonical 既定の候補:

- `"merge"` (cargo 型): 由来を出さず通常 options に混在 — 驚き最小だが継承の事実が消える
- `"separate_section"` (gh `INHERITED FLAGS` 型): 継承 entry だけ独立見出しで分離 — 4 方式で唯一「継承であることを明示しつつ値も見せる」
- `"reference"` (kubectl 型): 値を出さず案内文のみ。`"omit"` (rustup / docker 型): 出さない
- **統括推し = `"separate_section"`**: origin 素材を model に載せた判断 (HIP-Q1 → DR-113 §4.3) の価値が表示に現れる唯一の方式であり、情報の欠落もない。merge は origin が無くても組める = 素材を活かさない既定になる

### 6.4 category_mode `"default"` / `"all"` の canonical 差分 (未充足の設計点)

DR-113 §1 は「`"default"` / `"all"` は model の entry 集合は同一。値は renderer への表示 policy 指示」と定めるが、**canonical レンダラが default で何を絞るのかの素材が現行語彙に無い**。named category しか絞り軸が無い現状では default = all (vacuous) になる:

- **案 a**: v1 canonical では default = all (差分なし)。vacuous でも合法 (required の vacuous 前例と同型)。`help_all_category` preset は搬送され、独自レンダラ・将来語彙で差が生まれる
- **案 b**: **グループ宣言 entry への `hidden` を許可**し (wire 小拡張 + model の group entry へ射影)、canonical は「hidden group とその所属 entry を default で省略 (グループ名の入口注記だけ残す)、all で表示」とする。cargo `-Z` 型「グループ丸ごと隠して入口だけ露出」(実測済みパターン) の直接の受け皿。旧 HIP-Q バッチの「グループ hidden」論点 (DR-112 撤回時に再定式化のまま消えた) の回収でもある
- **統括推し = b**: v1 完備主義 (必要なものは今設計し切る) と、`help_all_category` を canonical で vacuous にしない実質を両立する。悪い面: DR-113 §8.1 (グループ宣言 entry は「グループ属性だけを持つ」) の小改訂と fixture 追加が要る。entry 個別の hidden (show_hidden 軸) との独立性は保たれる (hidden group ⊥ hidden entry、直交)

### 6.5 表示要求の反映 (確定済み写像の確認 — 裁定不要)

DR-113 §2 から一意に導出でき、新規判断は無い: `show_hidden` = hidden entry (および §6.4-b 採用時は hidden group) を表示する。`category_mode {"named": name}` = model 素材が絞られて届くのでそのまま描く。`#help_tree` → `depth: "all"` の再帰 model は command entry の `scope` (DR-113 §4.4) を再帰レンダリング。`help` / `help_long` の相互フォールバック (未設定側はもう一方、clap 型) と `-h` / `--help` の出し分けは canonical レンダラの既定 (DR-113 §4.4「相互フォールバックはレンダラ policy」)。

### 6.6 exit class ガイドライン (裁定不要の導出)

DR-109 柱 4 の「exit class」policy 推奨 (help / version は exit 0、usage error は exit 2 級) は、レンダラ DR 化時に**規範でなく推奨のガイドライン節**として書く。spec の規範 (受理・搬送) には触れないため裁定不要。

## 7. completion 生成器の表示 policy — 本サイクルに含めるかの判断素材

issue の隣接論点 (kawaz 発題 2026-07-18: zsh `_describe` の候補説明、deprecated マーカーの自動表示等)。issue の見立て「素材 (meta) は搬送済みで、canonical 生成器の既定 policy として決めれば足りる = レンダラ『層』の仕様化までは不要寄り」の検証:

- **検証結果: 見立ては妥当**。根拠: (1) completion 側は DR-060 §5 で既に「生成器 = 層 2、shell 作法を封じる」の座席が確定しており、レンダラ層の新設計を待つ依存が無い。(2) 本プランのテンプレート層語彙 (sections 等) は shell 補完の表示に流用できない — 表示の自由度が shell 側機能 (zsh compadd / fish sort) に律速され、セクションという概念自体が無い。(3) 候補順序の論点は既に独立 issue (`docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md`) があり、order 系語彙の意味論 (DR-113 §8.2) 確定済みの今、そちらで扱える
- 唯一の交点は「候補への help 文字列同梱の要否」(現行は origin 経由で定義を引き直す前提) だが、これは complete query の出力契約 (DR-104) の論点でありレンダラ層ではない
- **統括推し**: 本サイクルから除外し、completion ordering issue 側に「生成器の既定表示 policy (候補説明・deprecated マーカー)」を追記して一緒に扱う

## 8. 発明と規範化の区別 (執筆規約に基づく明示)

| 区分 | 項目 |
|---|---|
| **既存 DR から導出 (裁定不要)** | 表示要求 2 入力の写像 (§6.5、DR-113 §2)。program_name の呼び出し側供給 (DR-113 §4.4)。exit class 推奨 (§6.6、DR-109 柱 4)。model が素材を保持し表記はレンダラ、の分離自体 (DR-113 §4 全体)。query-error がレンダラ入力でないこと (DR-113 §1 の位相分離) |
| **新規設計判断 (REND-Q で裁定)** | レンダラ指示語彙の wire 収載と座席名 (§3)。セクション指定の形 (§2)。binding 補間の採否と文法 (§5)。既定 policy 値 (§6.1-6.3)。default/all の canonical 差分とグループ hidden (§6.4)。completion の扱い (§7) |
| **DR 化時の具体設計 (裁定後、Q 不要)** | 一括席のキー名一覧と enum 値の正式名 (§3.2)。model 射影席の名前 (§3.3)。help_installer descriptor の owns 追加。fixture (搬送検証) の形 |

## 9. リスク・悪い面

- **語彙を wire に載せる = 全実装に受理・搬送義務が生じる**。レンダラを持たない実装 (parse だけ欲しい consumer) にも inert 属性の搬送コストが付く。緩和: 表示メタ全般 (help / help_group_name 等) が既に同じ性質であり、増分は一括席 1 つ + enum 数個
- **enum 値が canonical レンダラの実装語彙に引っ張られる危険**: `"detail"` 等の値名は canonical の表示形式に由来する。独自レンダラが同じ enum をどう解釈するかは非規範のため、実装間で見た目が揃わない (これは仕様として許容する設計だが、「同じ定義なら同じ help」を期待するユーザには驚き)
- **§6.4 案 b はスコープ増**: DR-113 の小改訂 (グループ宣言 entry の hidden) + wire/fixture schema + kuu.mbt の追随が lockstep 窓に入る。案 a なら増分ゼロだが canonical の default/all が vacuous になる
- **最小テンプレ (`{name}` 補間) は「最初の一歩」リスク**: 変数参照だけと明言しても、条件分岐の要求は将来必ず来る (clap の轍)。§5 で境界を DR 本文に明記し、拡張要求は reject する前提を固定する必要がある
- **canonical レンダラの出力を pin しないことの対極リスク**: kuu-cli の `--help` 出力が実装都合で揺れても conformance は検知しない。品質担保は kuu-cli / kuu.mbt 側の通常テスト (spec 外) に置く、という割り切りを DR に明記しないと将来「render プロファイルを足せ」の議論が再燃する

## 10. REND-Q バッチ素案

各 Q: 選択肢 + 起草者の推し + 根拠 1 文。提示時は `docs/QUESTIONS.md` 運用規約 (👺 マーカー、バッチ一意プレフィクス) に従う。

- **REND-Q1: レンダラ指示語彙の座席** — (a) wire の一括席 (command 要素のオブジェクト属性、階層継承) + entry 個別席 + レンダラ API override の 3 段 (§3.1)、座席名は `help_render` / (b) 同 3 段で座席名 `help_display` / (c) wire に載せずレンダラ API 引数のみ。**推し = a**: kawaz 示唆「help_xx で config 一括と個別調整併用」の直接の具体化で、定義ファイルだけで表示意図が完結する (c は多言語で同じカスタマイズが移植できない)
- **REND-Q2: セクション骨格の指定形** — (a) セクション識別子の配列 (`sections`、識別子は help model トップレベルキー由来、picocli sectionKeys 型の宣言的半分) / (b) プレースホルダ文字列テンプレ (clap help_template 型) / (c) v1 は指定不可 (canonical 固定順のみ)。**推し = a**: テンプレ言語の発明 (b の沼) を避けつつ並べ替え・省略の実需を満たし、識別子発明ゼロで沼の入口を封じる
- **REND-Q3: 文言内 binding 補間** — (a) `{name}` 変数参照のみ許す (エスケープ `{{`、制御構造なし、binding はレンダラ API / kuu-cli `--binding` から) / (b) 補間なし (binding は epilog 等の文字列をアプリが組んでから渡す)。**推し = a**: version binding の kawaz 承認 signal (mid=11) を最小機構で満たし、「変数参照 1 機能だけ」の境界明言で沼を閉じられる
- **REND-Q4: category_mode default/all の canonical 差分** — (a) v1 は差分なし (vacuous、将来語彙で差が生まれる) / (b) グループ宣言 entry への `hidden` を許可し、default = hidden group 省略 (入口注記のみ)、all = 表示 (cargo `-Z` 型の受け皿、DR-113 §8.1 小改訂)。**推し = b**: v1 完備主義 — `help_all_category` を canonical で意味を持つ軸にし、旧 HIP-Q バッチで消えた「グループ hidden」論点を回収する
- **REND-Q5: 部品表記の canonical 既定値** — value_structure = `"auto"` (単純 or は 1 行明示括弧 `<COLOR_NAME | <R G B>>`、ネスト混在は詳細説明形式) + types = `"auto"` (参照回数 ≥ 2 で `Types:` 集約) を既定とするか (a: する / b: 常に詳細説明形式 / c: 常に 1 行)。**推し = a**: kawaz mid=14 の 3 案と mid=17 の集約例を「複雑度で自動切替 + 語彙で明示選択可能」の形で両立する (HIP-META-Q4 付録の統括推しを維持)
- **REND-Q6: origin の canonical 既定表示** — (a) `"merge"` (cargo 型、混在) / (b) `"separate_section"` (gh INHERITED 型) / (c) `"omit"`。**推し = b**: 4 方式で唯一「継承の明示と値の表示」を両立し、origin を model に載せた設計判断の価値が既定で現れる
- **REND-Q7: completion 生成器の表示 policy の扱い** — (a) 本サイクルから除外し `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` へ統合 / (b) 本サイクルに含める。**推し = a**: レンダラ層の語彙が shell 補完表示に流用できず (§7)、独立 issue の側に order 語彙確定済みの受け皿がある

## 関連

- `docs/issue/2026-07-18-help-renderer-design.md` (発題 issue、反映素材 7 点の出所)
- DR-113 (help model の確定形 — 本プランの入力契約) / DR-114 (universal fn) / DR-109 §1 柱 4 (共通化の上限) / DR-060 §5 (責務 4 層の先例) / DR-058 (hidden) / DR-053/054 (素材とレンダラの分離)
- `docs/findings/2026-07-17-cli-help-vocab-survey.md` (clap help_template / picocli sectionKeys の実測)
- `docs/findings/2026-07-17-help-mechanism-design-plan.md` §7 (仕様外の明言範囲)
- `docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md` (origin 4 方式・cargo -Z 型の実測)
- `docs/findings/2026-07-19-help-mechanism-redesign-v2.md` (v2 プラン — DR-113 の下敷き)
- `docs/QUESTIONS.md` の HIP-META-Q4 付録 1/2・回答 F (git 履歴 `b49c673` / `a680029` 時点、pipe 曖昧・types 集約・version binding の裁定原文)
