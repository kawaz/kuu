# help 機構の設計プラン — help query + 表示メタ + レンダラ層への分解

> 由来: kawaz 発題「実装がない奴として help_installer が無くないですか？必要な機能やそれを実現するための語彙や展開方などの設計プランからまず立てる必要があるのでは」(2026-07-17)。DR-048 §3 / DESIGN §13.9 が「help / completion installer の設計と同時に確定する」と保留した失敗時アクション属性の座席確定を含む。completion 側の同保留は DR-060 / DR-104 で解消済みであり、本プランはその対称形として help 側を解く。

## 1. 判明した事実 — 既に決まっていること (棚卸し)

help に関する仕様断片は散在しているが、読み合わせると**骨格はほぼ確定済み**で、未確定は「素材を束ねる構造 (help model) と座席名」に絞られる。

### 確定済み (再裁定不要)

| 事項 | 内容 | 正本 |
|---|---|---|
| 表示メタ 3 種 | `help` (string) / `display_name` / `value_name` は **UsefulAST 専用、AtomicAST 非搬送**。パース挙動に影響しない | DR-046 §3、DESIGN §2.2 |
| i18n | 多言語対応は UsefulAST 層 (各言語 DX) の関心。**AtomicAST レベルではサポートしない** | DESIGN §2.2 |
| `type: "help"` プリセット | 入口 lowering は long/short と同型。help フラグを立て、完了時に出力切替。失敗時アクション属性を同梱 | DESIGN §14.1、LOWERING §A.5 |
| 失敗時アクションの機構 | early-exit なし、完走後の表示選択。dead end 込み候補経路で selected なら発火、ambiguous 非発火、args 位置最小の先勝ち。`fired_action` で報告 | DR-048、DR-053 §2 |
| 誘導行の素材 | `help_entry` (help 入口の綴り) を failure/ambiguous に載せる。文言 (`Try 'prog --help' ...`) はレンダラ | DR-053 §4、CONFORMANCE §2 (実装・fixture pin 済み) |
| version | ただの flag。AST にバージョン文字列を持たせない。失敗時に出したいアプリは失敗時アクション属性を opt-in | DESIGN §14.2、DR-048 §3 |
| hidden / deprecated | hidden = help 一覧・補完候補から除外 (受理不変)。deprecated = canonical 導出の警告素材。「--help-all で hidden も表示」等はレンダラの関心 | DR-058 |
| alias の表示帰属 | canonical の行に併記、独立一覧しない。具体レイアウトはレンダラの関心 (DR-057 射程外宣言済み) | DR-057 §表示帰属 |
| inheritable / dd の見せ方 | 祖先 help での prefix 入口の見せ方・usage の `[--]` 位置はレンダラの慣習 | DESIGN §11.3 / §4 options 節 |
| 所有 vs 参照 | help の表示データ構築は**参照 (advisory read)**: 宣言層を読んで副次成果物を作る。パースの観測挙動に影響禁止。読めるのは宣言層のみ (lowered 産物は不可) | DR-056 |
| 共通化の上限 | help/error は **semantic model + policy まで共通、renderer は言語側**。上限リスト: error category / exit class / usage を添える条件 / suggestion 有無 / semantic sections。docopt の轍 (usage text 正本 → 翻訳・rewrap が死ぬ) の回避 | DR-109 §1 柱 4 |
| 責務 4 層の先例 | completion: (1) API + 候補構造 = spec / (2) 生成器 = kuu 標準提供・shell 作法を封じる / (3) アプリは繋ぐだけ / (4) ユーザは source するだけ | DR-060 §5 |
| 参照実装の現況 | `fail_action: Bool` が wire decode 済み (kuu.mbt `src/kuu/wire_decode.mbt:95`)、入口 lowering が failure resident を植える (`src/builtins/installer.mbt:1578` 付近)。fixture は `type: "help"` 経由でのみ発火を pin (`fixtures/failure-actions/help-basic.json` 等 7 本) | kuu.mbt、fixtures/failure-actions/ |

### 未確定 (本プランが解く対象)

1. **失敗時アクション属性の正式フィールド名と installer 区分** (DR-048 §3 / DESIGN §13.9 の未予約。参照実装は内部名 `fail_action` で先行)
2. **help の表示データ (help model) の構造** — DR-109 柱 4 の「semantic sections」の具体形が未定義
3. **help model の露出経路** — conformance fixture 化 (query タグ) と kuu-cli サブコマンドの有無
4. **「help installer」の要否** — DR-056 の呼称は構想段階の名前であり、装置としての実体をどう置くか
5. 語彙の増分 — 長文説明・グループ化等を v1 に入れるか

## 2. 中心提案 — 「help installer」は installer ではなく query である

**completion が既に同じ問題を解いた**: issue `2026-07-03-alias-normalization-help-completion-installer` の時点では「補完も installer になりそう」と構想されていたが、確定形 (DR-060/104) に "completion installer" は存在しない。分解先は:

- **complete query** (spec の関心: API + 候補構造)
- **completers registry** (動的候補の名前参照)
- **生成器** (層 2、kuu 標準提供、shell 作法を封じる)

help も同じ分解が正しい。help の構成要素は installer 的なもの (語彙を所有して lowering する装置) を**一つも必要としない**:

| 構成要素 | 座席 | 状態 |
|---|---|---|
| 表示メタ (`help`/`display_name`/`value_name`/`hidden`/`deprecated`/`alias`) | 宣言層の inert 属性 (既存) | 確定済み |
| `type: "help"` プリセット | types 側のプリセット (flag/count と同格、LOWERING §A.5) | 確定済み (アクション部の属性名のみ未予約) |
| 失敗時アクション属性 | 汎用属性。区分は §4 で確定させる | 本プラン §4 |
| **help query** (表示データの組み立て) | complete query と同格の**別クエリ**。宣言層 → help model の純関数 | 本プラン §5 |
| help レンダラ | 層 2 (DX 層、VISION §2 層 4)。文言・幅・折返し・色・ソート・翻訳・ページング全部ここ | 仕様外を明言 (§7) |

この分解により DESIGN §13.9 の「help / completion installer の設計と同時に確定」の宿題は「completion と同じく installer は不要だった」という形で閉じる。DR-042 の canonical installer 表への追加も不要 (§4 の失敗時アクションのみ検討対象)。

**根拠**: help model の構築はパース実行を伴わない宣言層の読み取りであり、lowering (糖衣 → AtomicAST 変換) にも実行時能力 (matcher / lookup) にも関与しない。installer の 3 役 (回収・植え付け・能力提供、DR-042) のどれにも該当しない。DR-056 の「help installer が参照読み」という文は「help の表示データを作る装置が参照読みで動く」の意で読み替え、その装置の正体が query である — と整理する。

## 3. 必要機能の列挙

エンドユーザが `prog --help` で得る画面を分解すると:

1. **usage 行**: `Usage: prog [OPTIONS] <FILE>... [-- <ARGS>...]` — 定義構造の一行要約
2. **説明文**: プログラム / サブコマンドの description
3. **サブコマンド一覧**: name + alias 併記 + 一行説明 (+ deprecated 表示)
4. **オプション一覧**: 綴り群 (long variants + short + alias 併記) + value_name + 説明 + default / env / required の注記 (+ deprecated 表示、hidden は既定除外)
5. **positional 一覧**: value_name + 説明 + repeat/optional 表示
6. **誘導行**: エラー時の `Try 'prog --help'` (確定済み、help_entry)
7. **発火経路**: 成功時 (help フラグ → 出力切替) / 失敗時 (DR-048) — 確定済み
8. **サブコマンドの help**: `prog sub --help` は sub スコープの help (global コピーされた --help 入口が発火)

1〜5 が「素材の構造 = help model」の中身であり、spec が確定すべき範囲。6〜8 は確定済み機構との接続のみ。

## 4. 失敗時アクション属性の座席 (未予約の解消)

### フィールド名: `fail_action` (bool) を追認する (HELP-Q1)

参照実装が `fail_action? : Bool = false` で先行しており、意味 (「完全経路 0 本の失敗時、selected なら自分を発火する」) と一致した簡潔な名。wire schema / DESIGN §1.4 / §13.9 に正式収載する。

### installer 区分: constraint installer と同型の「能力宣言型」

`fail_action` の lowering は構造衛星を足さず、**要素に失敗時発火マーカー能力を宣言する**だけ (kuu.mbt の failure resident は encoding の自由)。これは constraint installer (`requires` 等 → 遅延述語の宣言、構造衛星なし、DR-042 表) と同型。選択肢は 2 つ:

- **a. `failure_action` installer を canonical セットに追加** — `fail_action` を所有し、要素に発火マーカーを宣言する。1 語彙 1 所有者 (不変則③) が素直に立つ
- **b. 入口系 installer (long/short/command) の共通規則にする** — 「自要素の宣言のみから決まる決定的下降」(不変則②第 3 形) として各入口 lowering が自分の衛星にマーカーを同伴する

推しは **a**。b は「1 つの語彙を複数 installer が解釈する」形になり不変則③との整合説明が毎回必要になる。a なら descriptor (`owns: ["fail_action"]`、DR-061) も素直に書ける。実装 (入口 lowering がマーカーを埋め込む) は a の観測等価な encoding として正当化される。

## 5. help model — 語彙 (wire 属性) と構造の設計案

### 5.1 入力: help query

complete query (DR-060/104) と同格の別クエリとして定義する:

```
help(definition, {path?: ["<サブコマンド名>", ...]}) → help model
```

- `definition` は wire form (宣言層)。**パース実行なし・args 不要** — complete よりさらに軽い静的クエリ
- `path` はサブコマンドスコープの選択 (`prog remote add --help` → `["remote", "add"]`)。省略 = ルート。存在しない path は definition-error 系のエラー
- **読む層の精密化 (本プランの要点)**: help query が読むのは「**installer の宣言層寄与を適用し終えた宣言層**」である。global (DR-042) / alias (DR-057) / inheritable (DR-059) は宣言層へ**宣言的コピー**を足す installer であり、サブコマンドスコープの help に `--help` (global コピー) や `parent-verbose` (inheritable prefix 入口) が載るのはこのコピーを読むから。lowered 産物 (greedy 衛星・matcher・席宣言) は読まない — DR-056 の「参照が許されるのは宣言層」と正確に一致する。help query の実装は parse_definition の不動点反復を宣言層寄与まで回した断面を使えばよく、専用の走査を発明しない

### 5.2 出力: help model の wire 形 (素案)

DR-109 柱 4 の「semantic sections」を具体化する。**全フィールドが素材であり、文言・整形・並べ替えを含まない**:

```json
{
  "usage": {
    "has_options": true,
    "positionals": [
      {"value_name": "FILE", "repeat": {"min": 1}, "optional": false}
    ],
    "has_subcommands": true,
    "has_dd": true
  },
  "description": "<ルート/選択スコープ要素の help 文字列>",
  "commands": [
    {"name": "run", "aliases": ["r"], "help": "...", "hidden": false, "deprecated": false}
  ],
  "options": [
    {
      "spellings": ["--port", "-p"],
      "alias_spellings": ["-n"],
      "value_name": "PORT",
      "display_name": "ポート番号",
      "help": "...",
      "default": 8080,
      "env": "PORT",
      "required": false,
      "multiple": false,
      "hidden": false,
      "deprecated": false
    }
  ],
  "positionals": [
    {"value_name": "FILE", "help": "...", "repeat": {"min": 1}, "hidden": false, "deprecated": false}
  ],
  "help_entry": "--help"
}
```

設計判断のポイント:

- **hidden はメタとして残し、既定除外はレンダラの policy**。complete API と同型 (`schema/fixture.schema.json` の hidden 注記: 「complete API 自体はこの値に関わらず候補を返す — 既定除外は生成器の関心」)。model が hidden を落とすと DR-058 §1 が予告する「--help-all で hidden も表示」をレンダラが作れなくなる
- **alias は canonical entry に `alias_spellings` として併記** (DR-057 の「canonical の行に併記、独立一覧しない」の構造化)。variant 入口 (`--no-ssl` 等) の見せ方は `spellings` に全 long 入口を列挙する形で素材化 (variant DSL の解釈は long 属性の値読みで得られる — 宣言層読みの範囲内)
- **`default` / `env` / `required` は注記素材**。clap の `[default: 8080]` / `[env: PORT]` 相当をレンダラが組むための値。deprecated の「use X instead」素材は DR-058 確定済み (canonical 自動導出)
- **usage は構造素材のみ、一行文字列は含めない** (HELP-Q5)。kuu の定義は or/seq/repeat の任意ネストを持て、任意構造の忠実な一行化は docopt の逆問題 (沼)。素材は「positional 進行の要約 + has_options/has_subcommands/has_dd」に留め、一行化・ネスト構造の丸め (`<ARGS>...` への縮退) はレンダラの判断。将来、構造をより忠実に運ぶ拡張 (usage tree) は追加互換
- **prog 名は model に含めない** (HELP-Q6)。args は $0 非包含 (DESIGN §0.1) で定義にプログラム名は存在しない。usage 行の `prog` はレンダラ / 呼び出し側の供給 (kuu-cli はレンダラを兼ねるので `--prog <name>` 相当の入力を持てばよい — CLI の関心)
- **version 文字列は載らない** (DESIGN §14.2 の帰結)

### 5.3 新規 wire 語彙は実質ゼロ

上の model は**既存の宣言語彙 (help / display_name / value_name / hidden / deprecated / alias / default / env / required / repeat / multiple / long / short / commands) だけから導出できる**。v1 で新設する要素属性は無し (`fail_action` の正式化は §4 で、これは表示でなく発火機構)。グループ化 (`help_group`) と長文分離 (`help_long`) は見送り候補 (HELP-Q3/Q4) — 追加互換な純表示メタなので、後から足しても既存定義・fixture を壊さない。

> **改訂 (HELP-Q3 裁定、kawaz 2026-07-18): グループ語彙は「グループ先頭宣言スタイル」で v1 導入する。** 12 系統リサーチ (`2026-07-17-cli-help-vocab-survey.md`) の「表示順の明示 API はほぼ皆無・宣言順が主流」の観測を受けた kawaz の設計: (1) **既定の順序は宣言順** (kuu の wire form は JSON で宣言順が保存される)。(2) 要素属性 `help_group_name` (グループ名参照) を新設。(3) さらに **type も name も無い、グループ属性だけを持つ「グループ宣言エントリ」を options 配列に置ける** — `{"help_group_name": "g", "help_group_title": "...", "help_group_description": "..."}` のような entry を options 先頭に並べておくスタイル。これによりグループの表示順 (= 宣言順) と表示メタ (title/description) が一箇所で完結し、kong 型の「別座席の groups リスト」を作らずに同じ表現力が得られる (メンバー要素の 1 人がグループ設定も受け持つ不均衡も、先頭宣言スタイルで解消)。(4) title/description は「同時に書かれた group_name に紐付く追加属性」で、指定なしでも困らない (見出し = name)。(5) 同じグループ名に対する別設定の重複宣言は definition-error。(6) 大きめのコマンド定義の example でこのスタイルをショールーム的に示す (パターン参考用)。正式な語彙名・definition-error の kind・model 上の射影は help DR (P1) で確定する。

> **追補 (kawaz 2026-07-18、同日 2 信目): 明示順序語彙 (`help_group_order` / `help_order`) も併存させる — 「好きにすれば?」スタイル。** 表示順は内部的に現実に存在する値なので、ユーザが明記することも可能にしておく (使えなくする必要はない)。規則: **明示 order と宣言順の合成は「同じインデックスが出た場合は定義順優先で insert-after 的に割り込む」再配置** — 宣言順一貫性との整合をこの 1 規則で取る。ユースケース: 全指定スタイルを好む人が `--help` / `--help-full` / `--version` に 10001/10002/10003 のような大きい order を付けてコピペで使い回す、等。さらに **`help_after: "<他オプション name>"` (相対配置) を新設** — 定義の管理上は後方にまとめた deprecated alias 群のうち一部を、canonical オプションの直後にヘルプ配置して「deprecated だから xx を使ってね」の簡潔な説明を添える、が代表ユースケース。

> **help_after の意味論 4 点の裁定 (kawaz 2026-07-18、同日 3 信目):**
> 1. **不在 name 参照 = lint 警告 + fallback (definition-error にしない)**。裁定理由: 「何らかの事情で修正できないがその定義ファイルを使わなければいけない」場面があり得る — 動作不能になる論理矛盾ではないので、動くものはエラーにせず動作させる。並び順が変なのは見れば気づくし、気づかないならその配置の重要度は高くなかったということ。fallback の具体位置 (宣言順の位置に留まる、が自然) は DR で明文化
> 2. **連鎖 (A after B, B after C) = 問題なし** (単純解決可能、そのまま許容)
> 3. **循環 = definition-error** (検出は容易)
> 4. **order との同時指定 (同一要素に help_order と help_after の両方) = definition-error**
> 5. **同一 target への複数 after (B も C も after: A) = B, C の定義順** で A の後ろに並ぶ

## 5.5 4 巡目裁定の反映 (kawaz 2026-07-18)

- **Q4=a**: 説明文は `help` (短、既存) + `help_long` (長、新設) の 2 本立て。相互フォールバック (未設定側はもう一方を使う = clap 型)。model には両方載せ、-h/--help の出し分けはレンダラ。セクション拡張席 (epilog/examples 等) の扱いは help DR 起草時に語彙案を提示
- **Q5=b**: help query の既定出力は選択 scope の 1 層分 (kawaz 案 = 既定)、加えて **depth 引数の opt-in で全層 (再帰) 出力も可能にする** — 「要求自体は現実に存在する」(man 生成等の一括消費者)。既定 1 層 + opt-in 全層の 2 段
- **Q6=a**: help model に `command_path` (トップ command name + path の連鎖) を含める。構築者は help query の実装
- **Q8=a**: type:help = bool セル + 全体単一セル構想 + `help_onfail` で設計を詰める (詳細は §5.4 と DR で)。範囲出し分け (--help-full / --help [category]) は HELP-Q10 として裁定中
- **Q9 裁定 (kawaz 2026-07-18)**: (1) **version への反応は成功・失敗ともアプリ責務** — 「flag を見て kuu のヘルプレンダラを実行する定型コードをアプリが書く」形 (help も同型: kuu が出力まで肩代わりするのではなく、model/レンダラを部品として提供しアプリが接続する)。(2) **失敗時発火の基盤は汎用属性** (旧 fail_action、DR-048 §3 の「help/version を特別扱いしない」を維持 — 正式名は help DR で確定、version にも任意の要素にも付く)。(3) **`help_onfail` は type:help プリセットの糖衣として採用** — ユーザに分かりやすく、**type config (preset の属性プリセット展開、DR-076 の枠) で汎用属性へ全展開できるのが優位点**。type:help の lowering が help_onfail (糖衣) を汎用の失敗時アクション属性に落とす、という 2 層 (糖衣 = ユーザ語彙 / 汎用属性 = 機構語彙) で確定

> **語彙統一の検討 (kawaz 指示 2026-07-18「on_fail にするか failure なのか他との統一感を確認」)。** 既存 wire 属性の複合語は全て **snake_case + 完全語** (`conflicts_with` / `required_group` / `exclusive_group` / `export_key` / `short_attached_value` 等) で、略語・連結語 (onfail のような無区切り) は 1 つも無い。「失敗」の既存語彙は wire の outcome 値 `"failure"` (CONFORMANCE §2) と報告フィールド `fired_action` (DR-048 の発火報告)、参照実装内部名 `fail_action` の 3 つ。この慣習に照らした統一案: **汎用属性 = `on_failure`** (「パースが failure に終わった時の挙動」を表す — outcome 語彙 `failure` と正確に一致し、snake_case 完全語。値は当面 bool だが、将来 action 種別を持たせたくなった場合に `on_failure: "show"` のような値拡張の余地も名前が損なわない)、**糖衣 = `help_on_failure`** (help_onfail の無区切り `onfail` を慣習に合わせて `on_failure` に正規化)。対案は `fail_action` 追認 (実装先行名、「fail」は outcome 語彙と綴りが揃わない) と `failure_action` (完全語だが「action」の語が fired_action と紛れる — fired_action は報告側、こちらは宣言側で位相が違う)。**推し: on_failure / help_on_failure の対** — 宣言側 (on_failure) と報告側 (fired_action) が別語幹になることで位相の混同も避けられる。最終確定は help DR (P1) で。

## 6. 露出経路と conformance

### query: "help" の fixture 化 (HELP-Q2)

CONFORMANCE の query 語彙 (`parse` / `lower` / `complete` / `definition_error`) に `"help"` を追加し、`fixtures/help/` で pin する:

```json
{
  "query": "help",
  "definition": {...},
  "cases": [
    {"id": "root-basic", "path": [], "expect": {"outcome": "help", "usage": {...}, "options": [...]}}
  ]
}
```

- 多言語実装間で「同じ定義から同じ help 素材が出る」ことを機械検証できる。docopt の轍の対極 — 文言でなく素材を pin するから翻訳・整形の自由を奪わない
- kuu-cli には `kuu help <definition.json> [--path sub...]` として写る (VISION §3 「query 語彙がそのままサブコマンドに写る」)。極小バンドルモード (DR-109 §6) では、アプリの help 表示自体を kuu-cli への問い合わせで賄える — help query の JSON 出力 + アプリ側の薄いレンダラ、という構図が completion の runtime 問い合わせ (柱 6) と揃う
- 比較規約: options/commands/positionals の entries は**定義順を保存する列**として順序比較を推す (宣言順は定義者の意図であり、alphabetical 等への並べ替えはレンダラ policy)。ここは CONFORMANCE §3 での明文化事項

### プロファイル

DR-069 の準拠プロファイルは query と 1 対 1 なので、`help` プロファイルが増える。v1 発行条件 (V1-Q1 = 4 プロファイル green) に help を含めるかは v1 スコープの裁定 (HELP-Q7)。

## 7. 沼の線引き — 仕様外を明言する範囲

help は無限に凝れる。以下は**レンダラ (層 2) / アプリの関心であり spec は将来も規定しない** (DESIGN §13.9 の「責務外」リストへの追記候補):

- 文言・言語 (翻訳): 定義の `help` 文字列をそのまま運ぶ。message catalog / キー参照の i18n 機構は持たない (DESIGN §2.2 の既定を維持。やりたい言語 DX は UsefulAST 層で definition を差し替えてから export する)
- 幅・折返し・インデント・色・ページング (`less` 起動等)・端末検出 (tty 判定値の利用はアプリの自由)
- ソート順・グルーピングの既定・hidden の既定除外の override (`--help-all`)
- exit code・stdout/stderr の振り分け (DR-053 射程外の維持。ただし「help/version は exit 0、usage error は exit 2」級の **policy 推奨**は DR-109 柱 4 の「exit class」として層 2 のガイドラインに書く余地あり — 規範ではなく推奨)
- man / Markdown 生成 (Cobra の cobra/doc 相当): help model の消費者として層 2 以降で自由に作れる。spec は関与しない

## 8. 段階的実現パス

| 段階 | 内容 | 依存 |
|---|---|---|
| **P1: 座席確定 DR** | `fail_action` の正式化 (§4) + help query と help model の構造 (§5) + query:"help" fixture format (§6) を DR 1〜2 本で確定。DESIGN §13.9 の未予約 2 件 (失敗時アクション / help installer) を解消し、§14.1 と CONFORMANCE を更新 | HELP-Q 裁定 |
| **P2: 参照実装 + fixture** | kuu.mbt に help query 実装 (宣言層寄与適用後の断面読み)。`fixtures/help/` の初期セット: ルート基本形 / サブコマンド path / global コピーの可視性 / alias 併記 / hidden・deprecated メタ / inheritable prefix 入口 / variant 複数入口の spellings | P1 |
| **P3: kuu-cli** | `kuu help` サブコマンド (JSON 出力)。conformance runner の help プロファイル対応 | P2、kuu-core 3 層再編 (DR-110) の玄関 |
| **P4: canonical レンダラ (層 2)** | kuu プロダクト標準のテキストレンダラ (GNU/clap 風)。kuu-cli の `--render text` なり別コマンドなりで提供し、kuu-cli 自身の `--help` を self-hosting (最初の dogfooding、DR-109 柱 7 と同じ流儀) | P3 |
| **P5: 充実 (需要駆動)** | `help_group` / `help_long` / usage tree / man 生成。いずれも追加互換 | 実需 |

P1-P2 が「引数パースの次にユーザが必要とする」最小線。completion (DR-104 で fixture 10 本) と同規模感で見積もれる。

## 9. リスク・悪い面

- **usage 素材の粒度は妥協である**: §5.2 の `usage` は構造を大きく丸めており、`prog [-x | -y] <a> <b>` 級の忠実な usage を組みたいレンダラには素材不足。忠実案 (定義構造そのものを usage tree として運ぶ) は「wire form が既にその情報を持っている」ため、レンダラが definition を直接読めば済む — help model はあくまで「定義を読み直さずに一覧が組める要約」と割り切る。この割り切り自体を DR に明記しないと将来「usage tree を model に足せ」の議論が再燃する
- **順序比較の縛り**: entries の定義順保存を conformance で縛ると、実装内部で map を使う言語実装に順序保持の実装義務が生じる。ただし effects 列 (DR-045) で既に順序規範の前例があり、新規の負担ではない
- **help query の「宣言層寄与適用後」断面**: parse_definition の途中断面を公開 API にする形であり、DR-110 の 3 層再編で engine がこの断面をどう公開するかに軽く依存する。P2 実装時に接続を確認する (breaking ではない — 不動点反復の停止後に宣言層だけ取り出せば良い)
- **表示メタは AtomicAST 非搬送 (DR-046 §3) との整合**: help query の入力は wire form (宣言層) であって AtomicAST ではないので矛盾しない。ただし「AtomicAST だけ持っている実装は help を出せない」ことは含意される — これは既定 (表示メタ非搬送) の帰結であり本プランで変えない
