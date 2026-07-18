# DR-112: help 機構 — help query・help model・表示メタ語彙・型プリセット群・on_failure の確定

> 由来: kawaz 発題「実装がない奴として help_installer が無くないですか？必要な機能やそれを実現するための語彙や展開方などの設計プランからまず立てる必要があるのでは」(2026-07-17)。設計プラン `docs/findings/2026-07-17-help-mechanism-design-plan.md` (HELP-Q1〜Q12 の裁定記録込み) と 12 系統リサーチ `docs/findings/2026-07-17-cli-help-vocab-survey.md` を正本とし、DR-048 §3 / DESIGN §13.9 が「help / completion installer の設計と同時に確定する」と保留した失敗時アクション属性の座席、DR-109 柱 4 の「semantic sections」の具体形、DR-056 が構想名で言及した「help installer」の正体を確定する。completion 側の同保留は DR-060 / DR-104 で解消済みであり、本 DR はその対称形として help 側を閉じる。

## 決定

### 1. 「help installer」は存在しない — help は query である

completion が同じ問題を先に解いた (DR-060 確定形に "completion installer" は存在せず、complete query + completers registry + 生成器へ分解された)。help も同じ分解が正しい:

| 構成要素 | 座席 |
|---|---|
| 表示メタ (`help` / `help_long` / `help_epilog` / `display_name` / `value_name` / グループ・順序語彙) | 宣言層の inert 属性 (§4〜§6、所有は §9) |
| `type: "help"` / `"help_all"` / `"help_category"` プリセット | types 側のプリセット (flag/count と同格、LOWERING §A.5 の枠、§7) |
| 失敗時アクション属性 `on_failure` | 汎用属性 (§8) |
| **help query** (表示データの組み立て) | complete query と同格の**別クエリ**。宣言層 → help model の純関数 (§2〜§3) |
| help レンダラ | 層 2 (DX 層)。文言・幅・折返し・色・ソート・翻訳・ページングは全部ここ (射程外) |

help model の構築はパース実行を伴わない宣言層の読み取りであり、lowering (糖衣 → AtomicAST 変換) にも実行時能力 (matcher / lookup) にも関与しない — installer の 3 役 (回収・植え付け・能力提供、DR-042) のどれにも該当しない。DR-056 の「help installer が参照読み」という文は「help の表示データを作る装置が参照読みで動く」の意で読み替え、その装置の正体が query である。DESIGN §13.9 の「help / completion installer の設計と同時に確定」の宿題は「completion と同じく installer は不要だった」という形で閉じる (語彙の所有座席としての installer は §9 で別途立てる — lowering 装置としての "help installer" とは別物)。

**表示メタと宣言層の関係の明確化**: DR-046 §3 / DESIGN §2.2 の「表示メタは AtomicAST 非搬送」は「**lowered 産物・評価器へ運ばない** (パース挙動に影響しない)」の意であり、宣言層 (wire form、DR-063 §1) には inert 属性として載る。help query の入力は宣言層なので矛盾しない。ただし「lowered 断面だけ持っている実装は help を出せない」ことは含意される — これは既定の帰結であり本 DR で変えない (設計プラン §9)。`schema/wire.schema.json` の description 文言 (「表示メタは wire に載らない」) はこの明確化と食い違うため改訂対象 (波及)。

### 2. help query — シグネチャと読む層

complete query (DR-060/104) と同格の別クエリとして定義する:

```
help(definition, {
  path?: ["<サブコマンド名>", ...],   // 選択スコープ。省略 = ルート
  depth?: "scope" | "all",           // 既定 "scope" = 選択スコープの 1 層分。"all" = 全層再帰
  category?: "<グループ名>",          // 指定グループの entries に絞る
}) → help model
```

- `definition` は wire form (宣言層)。**パース実行なし・args 不要** — complete よりさらに軽い静的クエリ
- `path` はサブコマンドスコープの選択 (`prog remote add --help` → `["remote", "add"]`)。存在しない path は definition-error 系のエラー (kind: `absent-ref`)
- `depth` は既定で選択スコープの 1 層分 (サブコマンドは一覧 entry のみで中身は載せない)。`"all"` で全層再帰 (HELP-Q5=b: man 生成等の一括消費者の要求は現実に存在するが、既定は 1 層)。中間の数値 depth は実需不明のため持たない (追加互換で足せる)
- `category` は §5 のグループ名を指し、model の entries を該当グループ所属のもの (+ 当該グループ宣言エントリ) に絞る。`type: "help_category"` (§7) の発火値を受けてアプリがカテゴリ別 help を組む入口。存在しないグループ名は `absent-ref`
- **読む層**: help query が読むのは「**installer の宣言層寄与を適用し終えた宣言層**」である。global (DR-042) / alias (DR-057) / inheritable (DR-059) は宣言層へ宣言的コピーを足す installer であり、サブコマンドスコープの help に `--help` (global コピー) や prefix 入口 (inheritable) が載るのはこのコピーを読むから。lowered 産物 (greedy 衛星・matcher・席宣言) は読まない — DR-056 の「参照が許されるのは宣言層」と正確に一致する。実装は parse_definition の不動点反復を宣言層寄与まで回した断面を使えばよく、専用の走査を発明しない

### 3. help model — wire 形と順序規約

DR-109 柱 4 の「semantic sections」を具体化する。**全フィールドが素材であり、文言・整形・並べ替えを含まない** (DR-053 の「素材はフィールド、文言はレンダラ」の一貫適用):

```json
{
  "command_path": ["prog", "remote", "add"],
  "usage": {
    "has_options": true,
    "positionals": [
      {"value_name": "FILE", "repeat": {"min": 1}, "optional": false}
    ],
    "has_subcommands": true,
    "has_dd": true
  },
  "description": "<選択スコープ要素の help 文字列>",
  "description_long": "<同 help_long 文字列>",
  "epilog": "<同 help_epilog 文字列>",
  "commands": [
    {"name": "run", "aliases": ["r"], "help": "...", "help_long": "...", "hidden": false, "deprecated": false}
  ],
  "options": [
    {"group": {"name": "net", "title": "Network options", "description": "..."}},
    {
      "spellings": ["--port", "-p"],
      "alias_spellings": ["-n"],
      "value_name": "PORT",
      "display_name": "ポート番号",
      "help": "...",
      "help_long": "...",
      "help_group_name": "net",
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

- **`command_path`** (HELP-Q6=a): ルート定義要素の name (あれば) を先頭に、path の連鎖を続けた列。構築者は help query の実装。ルートに name が無い定義では path のみ — プログラム名 ($0) は args 非包含 (DESIGN §0.1) で定義に存在しないため、usage 行の `prog` はレンダラ / 呼び出し側の供給 (HELP-Q6 と HELP-Q6 裁定注記の両立)
- **`hidden` はメタとして残し、既定除外はレンダラの policy**。complete API と同型 (DR-104 の `meta.hidden`)。model が hidden を落とすと DR-058 §1 が予告する「--help-all で hidden も表示」をレンダラが作れなくなる
- **alias は canonical entry に `alias_spellings` として併記** (DR-057 の「canonical の行に併記、独立一覧しない」の構造化)。variant 入口 (`--no-ssl` 等) は `spellings` に全 long 入口を列挙する形で素材化 (variant DSL の解釈は long 属性の値読みで得られる — 宣言層読みの範囲内)
- **`default` / `env` / `required` / `multiple` は注記素材** (clap の `[default: 8080]` / `[env: PORT]` 相当をレンダラが組むための値)。deprecated の「use X instead」素材は DR-058 確定済み (canonical 自動導出)
- **usage は構造素材のみ、一行文字列は含めない** (HELP-Q5 系裁定)。kuu の定義は or/seq/repeat の任意ネストを持て、任意構造の忠実な一行化は docopt の逆問題。素材は「positional 進行の要約 + has_options / has_subcommands / has_dd」に留め、一行化・ネスト構造の丸め (`<ARGS>...` への縮退) はレンダラの判断。**この粒度は意図的な妥協である** — `prog [-x | -y] <a> <b>` 級の忠実な usage を組みたいレンダラには素材不足だが、忠実案 (定義構造そのものを usage tree として運ぶ) は wire form が既にその情報を持っているため、そのレンダラは definition を直接読めば済む。help model はあくまで「定義を読み直さずに一覧が組める要約」と割り切る。usage tree の将来拡張は追加互換 (この割り切りの明記により再燃時は本 DR を supersede する形を取る)
- **version 文字列は載らない** (DESIGN §14.2 の帰結、§10)
- **`depth: "all"` の再帰形**: 各 command entry に `scope` フィールド (その command を選択スコープとした help model の再帰埋め込み) を足す。命名は DR-063 §3 の attach 表記 (`{"exact": ..., "scope": {...}}`) と揃える
- **entries の順序は規範**: `options` / `commands` は「宣言順に §6 の並べ替え規則を適用した後の順序」を保存する列であり、conformance は順序込みで比較する (§11)。`positionals` は定義順 (= 消費構造順) 固定。宣言順は定義者の意図であり、alphabetical 等への並べ替えはレンダラ policy (実装内部で map を使う言語には順序保持義務が生じるが、effects 列 (DR-045) で既に順序規範の前例があり新規の負担ではない)
- **フォールバックは model に持ち込まない**: `help` / `help_long` は未設定側を省略しそのまま載せる。相互フォールバック (未設定側はもう一方を使う、clap 型) は**レンダラの既定 policy として推奨**する (規範ではない) — 素材と policy の分離 (DR-060 §3 と同じ流儀)

### 4. 説明文の座席 — help / help_long / help_epilog

- **`help` (短、既存) + `help_long` (長、新設) の 2 本立て** (HELP-Q4=a)。12 系統中、短/長 2 本立ては多数派 (clap about/long_about・cobra Short/Long・thor desc/long_desc・Swift AP abstract/discussion・oclif summary/description、survey 統合サマリ 1)。`-h` / `--help` での出し分けはレンダラ
- **`help_epilog` (新設)**: 選択スコープ要素 (ルート / command) に付く、オプション一覧の後に出す自由テキスト素材 (連絡先・注意事項・例の手書き等)。セクション拡張席は survey で「普遍的」と観測されたが、その中で過半数が持つのは末尾テキスト (argparse / click / typer / commander / yargs の epilog) のみであり、**v1 のセクション拡張席は `help_epilog` 1 本に絞る**。before-help / header 系 (clap / picocli / bpaf の少数派) と構造化 examples (yargs 単独) は導入しない — いずれも純表示メタで追加互換なため、実需が出てから足せる。綴りは多数派実装の `epilog` に合わせる
- 3 語彙とも任意要素に付く string。パース挙動に影響しない inert 属性 (`help_epilog` は葉要素に付いても合法だが model へ射影されるのはスコープ要素のもののみ — 葉の epilog は捨てずに保持されるが v1 の model に座席が無い。lint が「射影されない席への指定」を warn できる)

### 5. グループ語彙 — help_group_name とグループ宣言エントリ

HELP-Q3 裁定 (グループ先頭宣言スタイル) を正式化する:

1. **既定の表示順は宣言順** (kuu の wire form は JSON で宣言順が保存される)。survey の観測 (「グループ順序の明示 API はほぼ皆無・宣言順が主流」、唯一の例外は Go kong) を踏まえた既定
2. **要素属性 `help_group_name` (string)**: entry が属する表示グループの名前参照。`options[]` / `commands[]` の entries に付く
3. **グループ宣言エントリ**: `type` も `name` も無い、グループ属性だけを持つ entry を `options[]` に置ける:

   ```json
   {"help_group_name": "net", "help_group_title": "Network options", "help_group_description": "..."}
   ```

   グループの表示順 (= 宣言順) と表示メタ (title / description) が一箇所で完結し、kong 型の「別座席の groups リスト」を作らずに同じ表現力が得られる (メンバー要素の 1 人がグループ設定も受け持つ不均衡も、先頭宣言スタイルで解消 — kawaz 裁定の言語化)
4. **判別規則**: entry が `help_group_name` を持ち、かつ `name` / `id` / `type` / 入口系属性 (long / short / env 等) をいずれも持たない場合にグループ宣言エントリとする。それ以外の `help_group_name` は所属参照。帰結として「name も type も無い匿名 none 要素にグループ所属だけ付ける」構成は表現できないが、name 無し要素は結果にも help 一覧にも実質現れないため実害はない
5. **`help_group_title` / `help_group_description`** は同時に書かれた `help_group_name` に紐付く追加属性。指定なしでも困らない (見出し = グループ名)
6. **同じグループ名に対する別設定の重複宣言は definition-error** (kind: `invalid-range` — 構文上書けるが構成として不成立、DR-082 §2 の既存分類)。同一設定の再宣言は冪等で合法
7. **model 上の射影**: グループ宣言エントリは `options` 列に定義順 (並べ替え適用後) のまま `{"group": {"name", "title", "description"}}` entry として載る (§3 の例)。グループへの束ね (見出しの下へのメンバー集約) はレンダラの仕事 — model は「並べ替え済みフラット列 + 各 entry の help_group_name」を素材として渡す。レンダラが束ねる場合、グループ見出しの順序 = 列中のグループ宣言エントリの相対順、グループ内メンバー順 = 列中のメンバーの相対順
8. 大きめのコマンド定義の example でこのスタイルをショールーム的に示す (P2、波及)

commands のグループ化 (cobra の Group 相当) は v1 では持たない — グループ宣言エントリの座席を `options[]` に限る (裁定原文どおり)。必要になれば追加互換で `commands[]` にも開ける。

### 6. 順序語彙と合成規則 — 宣言順 / help_order / help_group_order / help_after

明示順序語彙も併存させる (kawaz 追補「好きにすれば?」スタイル — 表示順は内部的に現実に存在する値なので、ユーザが明記することも可能にしておく):

- **`help_order` (number)**: 通常 entry (name / type を持つ要素) の表示順明示。ユースケース: 全指定スタイルを好む人が `--help` / `--help-full` / `--version` に 10001/10002/10003 のような大きい order を付けてコピペで使い回す等
- **`help_group_order` (number)**: グループ宣言エントリの表示順明示 (help_order のグループ宣言エントリ用の座席。意味論は同一で、座席で語彙を分ける)。座席違い (通常 entry に help_group_order、グループ宣言エントリに help_order) は definition-error (kind: `invalid-range`)
- **`help_after` (string)**: 相対配置 — 同一スコープ・同一 entries 列内の他要素 name を参照し、その直後に表示配置する。代表ユースケース: 定義の管理上は後方にまとめた deprecated alias 群のうち一部を、canonical オプションの直後に配置して「deprecated だから xx を使ってね」の簡潔な説明を添える。target はグループ宣言エントリを指せない (name を持たないため)

**合成規則 (決定的)**。並べ替えは `options` / `commands` の各 entries 列 (グループ宣言エントリ込みのフラット列) に対して独立に、次の 2 段で適用する:

1. **order による安定ソート**: 各 entry の実効 order = 明示値 (`help_order` / `help_group_order`)、無ければ宣言 index (0-based)。実効 order の昇順で**安定ソート**する。安定ソートの同値規則 (同じ実効 order の entry は元の相対順 = 宣言順を保つ) が、kawaz 裁定の「同じインデックスが出た場合は定義順優先で insert-after 的に割り込む」をそのまま実現する
2. **help_after の後処理適用**: `help_after` を持つ entry を段 1 の結果列から取り出し、target の直後へ移動する。規範は結果で定める:
   - **同一 target への複数 after は定義順で target の後ろに並ぶ** (B も C も after: A なら結果は A, B, C — B, C の定義順)
   - **連鎖 (A after B, B after C) はそのまま解決する** (C の後ろに B、B の後ろに A)。単純解決可能であり許容
   - **循環は definition-error** (kind: `circular-ref` — 参照の循環の既存分類)
   - **不在 name 参照は lint warn + fallback** — definition-error にしない。「何らかの事情で修正できないがその定義ファイルを使わなければいけない」場面があり得る。動作不能になる論理矛盾ではないので、動くものはエラーにせず動作させる。並び順が変なのは見れば気づくし、気づかないならその配置の重要度は高くなかったということ (kawaz 裁定理由の原文言語化)。**fallback は段 1 の結果位置に留まる** (= help_after を無視した位置)
   - **同一要素への `help_order` (`help_group_order`) と `help_after` の同時指定は definition-error** (kind: `invalid-range`)
- **positionals は並べ替え対象外**: 表示順 = 定義順 = 消費構造順で固定 (clap も positional の display_order を無効とする — 順序が意味論に直結する面に表示順指定は成立しない)。positional への help_order / help_after / help_group_name は lint warn + 無視 (不在 target と同じ「動くものは動作させる」哲学)

### 7. 型プリセット群 — type:"help" / "help_all" / "help_category" と内部セルモデル

#### 内部セルモデル (HELP-Q8 / Q10 設計点 (1) の裁定)

**help の値セル実体は help 系要素のどれでもなく、help 機構が管理する内部セルである。各 help 系要素 (type:help / help_all / help_category) はそこへ link される** (kawaz 裁定の認識モデル)。帰結:

- どのサブコマンドスコープで発火しても同じセルに立つ (全体単一セル)。global + link の合成 (既存機構) を「help 機構管理の内部セルへの合流」として実現する
- 内部セルは `#` 予約名前空間 (DR-046 §4) の実装細部であり、wire にも result にも直接現れない。**result への露出は各 help 系要素自身の name (export_key) 経由** — link の既存意味論 (値セル共有、露出は各入口の export_key) の素直な適用で、新しい露出規約を発明しない。`{"name": "help", "type": "help"}` が発火すれば result に `help: true`、`{"name": "help_category", "type": "help_category"}` なら発火カテゴリ文字列が `help_category` キーに出る
- パーサ完了時の出力切替 (DESIGN §14.1 の「help フラグを見て」) は内部セルの真偽の観測。`fired_action` (DR-053 §2) は発火した具体要素の name のまま不変
- **help_category のみ存在 (type:help 露出なし) でも help の bool 充足自体は成立する** (内部セルに立つ) — type:help の露出は前提条件ではない

#### type:"help"

- 入口 lowering は long / short と同型 (LOWERING §A.5 既定路線)。bool を土台にする flag 同族の糖衣プリセット (DR-076 の枠) で、値セルは内部セルへの link、発火は固定 true 供給
- **`help_on_failure` (bool、既定 true) を type config 糖衣として同梱** (§8)

#### type:"help_all"

- type:help と同じ preset 族 (入口・内部セル link・help_on_failure 同梱まで同一)。異なるのは**意図メタ**のみ: 「hidden 込み全表示」の要求をアプリ / レンダラに伝える (DR-058 §1 が予告した「--help-all で hidden も表示」の定義側座席)。model 側の変化は不要 — model は hidden をメタとして常に残す (§3) ため、レンダラが help_all 発火を見て hidden 表示を選ぶだけで足りる

#### type:"help_category"

HELP-Q10 裁定 (値スロット案でなく型化) を正式化する:

- 内部的には string の**全体セル 1 つ** (type:help の内部セルモデルと同型、link 合成)
- **発火時に help の内部 bool セルもトリガする** — preset が bool セルへの固定 true 供給 (link + variant) を同梱する。「カテゴリ指定 = help 表示要求」が 1 発火で両セルに立つ
- **`or` で type:help と出し分け** — bool 枝 (`--help` 裸) と string 枝 (`--help net`) の or で引数有無の両対応を表現する。「次のトークンが category か positional か」の曖昧さを or の経路成立で解決するのは kuu の背骨モデルそのもの (optional 値スロット案より構造的、kawaz 裁定)
- **`values` で指定可能カテゴリを制限できる** — 既存の value-enum (DR-055 §5.3) がそのまま効く。カテゴリの名前空間は §5 のグループ名と同一とし、values とグループ宣言の整合 (values に無いグループ / グループに無い values) は lint の関心
- **`--help-command` のような引数なし入口に固定文字列充足を担わせられる** — 既存の variant DSL (`[":set:command"]` 固定値 set) がそのまま効く。カテゴリ別ヘルプの専用入口が語彙追加ゼロで組める
- **複数 category 指定** (`--help net --help io`) は string 全体セルの last-wins (DR-015 のあと勝ち) が既定。multiple 宣言との合成は v1 で規定しない (実需が出たら別 DR — 規定しないことの明記であり禁止ではない。ただし conformance が pin するのは last-wins のみ)

#### lint warn の条件 (発火の観測手段)

**type:help の露出が無い定義での help_all / help_category は原則 lint warn 対象** (definition-error にはせず受け入れる)。**warn の判定は name (export_key) 露出の有無で決まる**: help 不在でも name 露出があれば warn 不要 — help_all も help_category も、それ自体が「help を引く入口 + 結果面の露出」を兼ねられる (help_category 単独なら、アプリは result の help_category の有無で分岐すれば良い)。warn になるのは「**help 系要素はあるが、どれも結果面に露出していない = 発火をアプリが観測する手段が無い**」構成のみ (kawaz 追補の判定精密化)。

### 8. 失敗時アクションの正式化 — on_failure (汎用属性) と help_on_failure (糖衣)

DR-048 §3 / DESIGN §13.9 の未予約を解消する:

- **汎用属性 = `on_failure` (bool、既定 false)**: 任意要素に付く。「完全経路 0 本の失敗時、候補経路 (dead end 込み) で selected なら自分を発火する」(意味論は DR-048 で確定済み、本 DR は名前と座席のみ)。version を失敗時にも出したいアプリはただの flag に `on_failure: true` を opt-in する — 「help / version の 2 つを特別扱いしない」(DR-048 §3) の実質はこの汎用性
- **命名根拠 (kawaz 裁定 2026-07-18)**: 既存 wire 属性の複合語は全て snake_case + 完全語 (`conflicts_with` / `export_key` 等) で略語・無区切り連結は無い。`on_failure` は outcome 語彙 `"failure"` (CONFORMANCE §2) と正確に一致する snake_case 完全語であり、宣言側 (`on_failure`) と報告側 (`fired_action`) が別語幹になることで位相の混同も避けられる。値は当面 bool だが、将来 action 種別を持たせたくなった場合の値拡張 (`on_failure: "show"` 等) を名前が損なわない。参照実装の内部名 `fail_action` は実装フェーズで改名追随する
- **糖衣 = `help_on_failure` (bool、既定 true)**: type:help 系プリセット (help / help_all / help_category) が同梱する要素属性。**type config (プリセットの属性プリセット展開、DR-076 の枠) で汎用属性 `on_failure` へ全展開される** — 糖衣 (ユーザ語彙) と汎用属性 (機構語彙) の 2 層 (HELP-Q9 裁定)。`help_on_failure: false` で失敗時発火を切れる。type:help 系以外の要素への `help_on_failure` は definition-error (kind: `invalid-range`) — 糖衣の座席はプリセットに閉じる
- **installer 区分 = 専用 installer `on_failure` を canonical セットに追加する** (設計プラン §4 の案 a を採用)。所有語彙 `on_failure`、植え付けは構造衛星を足さず**要素に失敗時発火マーカー能力を宣言する**だけ — constraint installer (遅延述語の宣言、構造衛星なし) と同型の能力宣言型。descriptor は `owns: ["on_failure"]` で素直に書ける (DR-061)。対案 b (入口系 installer の共通規則にする) は「1 つの語彙を複数 installer が解釈する」形になり不変則③ (1 語彙 1 所有者) との整合説明が毎回必要になるため不採用。参照実装 (入口 lowering が failure resident を植える形) は案 a の観測等価な encoding として正当化される

### 9. 語彙の所有座席 — help_meta installer (純所有)

wire 上の語彙の正当性は「登録済み installer descriptor の owns 集合の和」で判定される (DR-063 §2、誰も所有しない語彙は unknown-vocab)。§1 で「lowering 装置としての help installer は不要」と整理したが、**表示メタ語彙にも unknown-vocab 検査上の所有者は必要**である。この空白を埋める:

- **`help_meta` installer を canonical セットに追加する**。所有語彙: `help` / `help_long` / `help_epilog` / `display_name` / `value_name` / `help_group_name` / `help_group_title` / `help_group_description` / `help_group_order` / `help_order` / `help_after`
- lowering 寄与は**ゼロ** (宣言層に inert のまま残し、何も植えない — installer 3 役の「回収」のみの部分集合)。定義時検査 (§5 のグループ重複・§6 の循環 / 同時指定・座席違い) はこの installer の parse_definition 寄与として実装する — 検査は lowering ではないので「寄与ゼロ」と矛盾しない
- help query はこれらの語彙を**参照** (advisory read、DR-056) で読む。所有 (unknown-vocab の正当化 + 定義検査) と参照 (model 構築) が分離される — long installer の語彙 (`long`) を help query が参照して spellings を組むのと同じ関係が、help 自前の語彙にも成り立つ
- `hidden` / `deprecated` の所有座席は既存の空白 (DR-058 は挙動のみ規定) のまま本 DR では触れない — installer descriptor 群の実体化 (`schema/builtin-descriptors.json` が「installer は未実体化」と注記済み) の際に一括で埋める

### 10. hidden / version の確認

- **`hidden: bool` 1 本を維持** (HELP-Q12=a)。9 系統実測で bool 1 本が圧倒的多数派 (段階制 visibility は Swift AP のみ、部分 hide は clap のみ)。clap の「-h では隠すが --help では出す」相当の非対称が欲しい場合は、**ref & link で分割定義すれば良い** — 同じ実体へ link で値を合流させる別入口要素を hidden 有無違いで立てれば (構造の継承は ref、値セルの同期は link)、面別の見せ方が既存機構で組める (kawaz 裁定理由)。面別 hidden 語彙 (`hidden: ["help"]` 等) は導入しない
- **version はアプリ責務を維持** (HELP-Q9 裁定): version への反応は成功・失敗ともアプリの仕事 — flag を見て kuu のヘルプレンダラ相当を実行する定型コードをアプリが書く (help も同型: kuu が出力まで肩代わりするのではなく、model / レンダラを部品として提供しアプリが接続する)。AST にバージョン文字列は持たせない (DESIGN §14.2 不変)。失敗時にも出したいアプリは §8 の `on_failure` を opt-in する

### 11. conformance — query:"help" と v1 発行条件の改訂

#### fixture format

CONFORMANCE の query 語彙に `"help"` を追加し、`fixtures/help/` で pin する:

```json
{
  "why": "...",
  "query": "help",
  "definition": { ... },
  "cases": [
    {"id": "root-basic", "why": "...", "path": [], "expect": {"outcome": "help", "usage": {...}, "options": [...]}}
  ]
}
```

- `cases[].path` (optional、省略 = ルート) / `cases[].depth` (optional、省略 = "scope") / `cases[].category` (optional) — §2 の query 入力の直訳。`args` は無い (パース実行なし)
- `expect.outcome`: `"help"` 固定。他フィールドは §3 の help model の直訳
- 不在 path / category の case は `{"outcome": "definition-error", "errors": [{"kind": "absent-ref"}]}` を expect する (DR-082 の definition-error 転用と同じ流儀)
- **比較規約**: `options` / `commands` の entries は**順序込み比較** (並べ替え適用後の定義順保存が §3 の規範であるため — candidates の集合比較 (DR-104 §4) と対照的に、順序それ自体が仕様)。`positionals` も順序込み (定義順)。その他のフィールドは構造等価 (省略 = default と等価)。多言語実装間で「同じ定義から同じ help 素材が同じ順序で出る」ことを機械検証する — docopt の轍の対極で、文言でなく素材を pin するから翻訳・整形の自由を奪わない

#### プロファイルと v1 発行条件

- DR-069 の準拠プロファイルは query と 1 対 1 なので、**`help` プロファイル (opt-in) が加わり 5 プロファイルになる**
- **v1.0.0 発行条件を「5 プロファイル全 green」に改訂する** (HELP-Q7=a)。DR-108 §3 の「4 プロファイル (parse-core / lowering / definition-error / completion) 全ての green」は「5 プロファイル (+ help) 全ての green を指定参照実装 kuu.mbt で満たすこと」と読み替える (DR-108 §3 / DR-069 に明確化 note を追記)
- kuu-cli には `kuu help <definition.json> [--path sub...]` として写る (VISION §3 「query 語彙がそのままサブコマンドに写る」)。極小バンドルモード (DR-109 §6) では、アプリの help 表示自体を kuu-cli への問い合わせで賄える — help query の JSON 出力 + アプリ側の薄いレンダラ、という構図が completion の runtime 問い合わせ (DR-109 柱 6) と揃う

## 採用しなかった案

### help installer (lowering 装置) を立てる

help model の構築は宣言層の読み取りで、lowering にも実行時能力にも関与しない — installer 3 役のどれにも該当しない (§1)。completion が既に「installer は不要だった」形で閉じた前例 (DR-060/104) と同じ分解を採る。

### fail_action の追認 / failure_action

`fail_action` は実装先行の内部名で、「fail」が outcome 語彙 `"failure"` と綴りが揃わない。`failure_action` は完全語だが「action」の語が報告側の `fired_action` と紛れる (あちらは報告、こちらは宣言で位相が違う)。`on_failure` は outcome 語彙と一致し、宣言側と報告側が別語幹になる (kawaz 裁定、§8)。

### on_failure を入口系 installer の共通規則にする (案 b)

「自要素の宣言のみから決まる決定的下降」(不変則②第 3 形) として各入口 lowering がマーカーを同伴する形。1 つの語彙を複数 installer が解釈する形になり、不変則③ (1 語彙 1 所有者) との整合説明が毎回必要になる。専用 installer (案 a) なら descriptor も素直に書ける (§8)。

### usage の一行文字列 / usage tree を model に含める

一行文字列は docopt の逆問題 (任意ネスト構造の忠実な一行化) で、文言をレンダラに残す本設計の原則にも反する。usage tree は wire form が既に同じ情報を持つため二重化になる — 忠実な usage が要るレンダラは definition を直接読む (§3 の割り切りの明記)。

### prog 名を model に含める

args は $0 非包含 (DESIGN §0.1) で定義にプログラム名が存在しない。無い情報を model が発明することになる。レンダラ / 呼び出し側の供給 (kuu-cli なら `--prog <name>` 相当の入力) が正しい座席。

### kong 型の別座席 groups リスト

グループの一覧・順序・メタを definition の別フィールド (`help_groups: [...]` 等) で管理する形。宣言順 = 表示順の一貫性が崩れ (グループだけ別の順序源を持つ)、options 列との二重管理になる。グループ宣言エントリ (先頭宣言スタイル) なら順序とメタが一箇所で完結する (§5)。

### 面別 hidden 語彙 (`hidden: ["help"]` 等)

9 系統実測で bool 1 本が圧倒的多数派。面別の非対称は ref & link の分割定義で既存機構のまま組める (§10)。語彙を増やす必要がない。

### help_category を optional 値スロットで表現する (`--help [category]`)

「次のトークンが category か positional か」の曖昧さを optional 値スロットの特殊規則で解くことになる。bool 枝と string 枝の or なら、曖昧さの解決が経路成立 (kuu の背骨モデル) にそのまま乗る (§7、kawaz 裁定)。

### depth の数値指定 (N 層)

中間深さ (2 層だけ) の実需が確認できない。既定 1 層 + opt-in 全層の 2 段 (HELP-Q5=b) で始め、必要になれば追加互換で数値を許す。

### 表示メタを「基礎語彙」として unknown-vocab 検査の対象外にする

name / type 等の構造語彙と同じ「元から合法」リストに表示メタを足す形。well-formedness 側に新しい語彙分類層が生まれ、拡張表示語彙 (方言) を増やす経路も descriptor 機構と別になる。純所有 installer (§9) なら既存機構 (owns 台帳 + descriptor) がそのまま使える。

## 波及

- **DESIGN.md** (P2 で本文追随、本 DR では列挙のみ): §13.9 の未予約 2 件 (失敗時アクション / help installer) を解消・所有/参照の記述に help_meta と on_failure を追加、§14.1 を内部セルモデル + プリセット 3 種 + help_on_failure で改訂、§14.2 に on_failure opt-in の正式名を反映、§1.4 のフィールド一覧に新語彙 (help_long / help_epilog / help_group_name / help_group_title / help_group_description / help_group_order / help_order / help_after / on_failure / help_on_failure) を追加、§2.2 の「AtomicAST 非搬送」に §1 の明確化 (宣言層には載る) を反映、§15 に help query の節を追加
- **LOWERING.md §A.5**: help 節の「アクション部の canonical AtomicAST 形は未予約」を解消 — 内部セル link + 固定 true 供給 + help_on_failure → on_failure 展開の記述へ。help_all / help_category のプリセット展開を追記
- **CONFORMANCE.md**: §1 の query 表に `"help"` 追加、新設節「help クエリ」(§11 の fixture format / 比較規約)、§0 のプロファイル表に help 追加、§3 に entries の順序込み比較を追記
- **schema/wire.schema.json**: 新語彙の properties 追加 (help / help_long / help_epilog / display_name / value_name / グループ・順序語彙 / on_failure / help_on_failure)、description の「表示メタは wire に載らない」を §1 の明確化に合わせて改訂、type enum に help_all / help_category (type が enum 制約を持つ場合)
- **schema/fixture.schema.json**: `query:"help"` の if/then 節と helpExpect の $defs 新設
- **fixtures/help/** (P2、初期セット構想): ルート基本形 / サブコマンド path / global コピーの可視性 / alias 併記 / hidden・deprecated メタ / inheritable prefix 入口 / variant 複数入口の spellings / グループ宣言エントリと order・after の合成 (安定ソート同値・連鎖・複数 after 定義順) / depth:"all" 再帰 / category 絞り / help_long・epilog 素材 / 不在 path・category の absent-ref / 循環 after・order 同時指定・グループ重複の definition-error
- **DR-048**: §3・射程外節の「フィールド名・installer 区分は未確定」への解消 note を追記
- **DR-053**: on_failure 確定の相互参照 note を追記 (fired_action / help_entry の構造は不変)
- **DR-108 §3**: v1 発行条件の 4 → 5 プロファイル改訂 note を追記
- **DR-069**: プロファイル表への help 追加 note を追記
- **DR-042**: canonical installer セットへの on_failure / help_meta 追加 note を追記
- **kuu.mbt / kuu-cli** (P2/P3): help query 実装 (宣言層寄与適用後の断面読み)、`fail_action` → `on_failure` 改名追随、wire decode の allowed keys へ表示メタ語彙追加、`kuu help` サブコマンド、conformance runner の help プロファイル対応
- **canonical レンダラ (層 2、P4)**: kuu プロダクト標準のテキストレンダラ (GNU/clap 風)、kuu-cli 自身の `--help` self-hosting。別 issue で起票 (本 DR の射程外)

## 射程外

- help レンダラの一切 (文言・翻訳・幅・折返し・色・ページング・ソート既定・hidden の既定除外 override・exit code・stdout/stderr 振り分け・man / Markdown 生成)。「help/version は exit 0、usage error は exit 2」級の policy 推奨は DR-109 柱 4 の「exit class」として層 2 のガイドラインに書く余地がある (規範ではなく推奨)
- i18n / message catalog (DESIGN §2.2 の既定を維持 — やりたい言語 DX は UsefulAST 層で definition を差し替えてから export する)
- usage tree (定義構造の忠実な運搬) — §3 の割り切りにより将来の追加互換
- commands のグループ化・before-help / header 席・構造化 examples — 追加互換の将来席
- help_category の multiple 合成 (§7 — v1 は last-wins のみ pin)
- `hidden` / `deprecated` の owns 座席 (§9 — installer descriptor 実体化時に一括)
- v1.0.0 の発行そのもの (DR-108 §6 のまま — 本 DR は発行条件の項目数を変えるのみ)

## 関連

- `docs/findings/2026-07-17-help-mechanism-design-plan.md` (設計プランと HELP-Q1〜Q12 裁定の正本)
- `docs/findings/2026-07-17-cli-help-vocab-survey.md` (12 系統リサーチ — §4/§5/§6/§10 の慣習根拠)
- DR-048 (失敗時アクションの意味論 — §8 は名前と座席のみ確定) / DR-053 (fired_action / help_entry の座席、素材と文言の分離)
- DR-046 §3 (表示メタの軸 — §1 の宣言層明確化の対象) / DR-056 (所有と参照 — §9 の分離の語彙) / DR-058 (hidden / deprecated — §10 で bool 維持を確認)
- DR-057 (alias 併記) / DR-059 (inheritable prefix — §2 の宣言層寄与) / DR-042 (installer 3 役と canonical セット — §8/§9 の追加先)
- DR-060 / DR-104 (completion — 分解の前例、fixture format の同型)
- DR-076 (プリセットの属性展開の枠 — help_on_failure の 2 層構造) / DR-099 (preset 型の前例)
- DR-055 §5.3 (values / or 展開 — help_category の枠) / DR-015 (last-wins — 複数 category)
- DR-108 §3 / DR-069 (v1 発行条件とプロファイル — §11 の改訂対象)
- DR-109 柱 4 (semantic model の上限 — §3 の model がその具体形)、§6 (極小バンドルモード — kuu-cli help 経由の構図)
- DR-063 (wire form = 宣言層 — §1 の明確化、§2 の owns 検査)
- DESIGN §13.9 / §14.1 / §14.2 / §2.2、LOWERING §A.5、CONFORMANCE §0〜§3
