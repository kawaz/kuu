# kuu-cli dogfooding サイクル 設計プラン (2026-07-24)

> 由来: 敵対的レビュー統合台帳 (`docs/findings/2026-07-24-fresh-eyes-adversarial-review.md`) の
> B4 (dogfooding 未実装) と REV-Q4=a 裁定 (kuu-cli dogfooding 書き直しを主タスク化、
> H2-H9 の慣習違反はその中で一括解消)。前提サイクル = API 磨き第 2
> (`docs/findings/2026-07-24-api-polish-2-plan.md`、以下 AP2 plan) の段階型玄関
> (parse → ParsedOutcome / resolve → ResolvedOutcome / output、DR-118) と ValueSources。
> 対象実装 = kuu-cli `impl/mbt/cli/` (main.mbt 878 行の手書き parser + lib/wire.mbt)。
>
> 本書の記述は **[規範化]** (既存 DR / 裁定から導出、出所明記) と **[発明]** (本プランの
> 新規判断、実装時に妥当性検証) を区別して付す。

## 0. ゴールと二重の性格

kuu-cli の CLI 面 (argv 解析・help・補完・exit code) を **kuu 自身の definition
(`impl/mbt/cli/kuu-cli.def.json` [発明: 配置]) + kuu.mbt 玄関 API** で駆動する形に書き直す。

このタスクは二重の性格を持つ:

1. **製品修理**: B4 解消 + H2-H9/H14 の慣習違反一括解消 (台帳 §4 やるだけリスト)
2. **spec の実地テスト**: 「kuu で本物の CLI を 1 本書く」初の総合演習。def.json で
   **書けない構造・書きにくい構造が出たらそれ自体が spec への発見** — §5 の発見リストに
   記録し、spec 側へ issue / Q として還流する (dogfooding-feedback の内部版)

スコープアンカー (これ以外に膨らませない):

- やる: kuu-cli.def.json 設計 / main.mbt の dispatch 書き直し / H2-H9+H14 解消 /
  CLI 面テスト新設 / 発見の記録
- やらない: kuu.mbt 側の機能追加 (発見は issue 化して spec/kuu.mbt サイクルへ渡す。
  例外 = H14 素材不足が判明した場合の DR 明確化 note は AP2 plan §3 で予約済み) /
  README 増強 H15-H19 (docs サイクル別枠) / release 開始 (VERSION 0.0.0 休眠継続、
  kuu-cli DR-0001 §2)

## 1. kuu-cli 自身の def.json 設計

### 1.1 コマンドツリー (現 main.mbt の 6 面を kuu wire 語彙で表現)

```
kuu
├── parse       <def.json> [--no-env] [--env k=v]... [--no-config] [--config <v>]
│               [--config-file <path> <v>]... [--tty <json>] [--] <args...>
├── complete    <def.json> --args-before <json-array> [--args-after <json-array>]
├── validate    <def.json>
├── help        [<def.json>] [--path ...] [--depth ...] [--category-mode ...]
│               [--format ...] [--show-hidden] [--program-name ...] [--binding k=v]...
│               [--style-* ...]
└── completion
    ├── generate <def.json> --shell zsh|bash|fish --binary <ref> --uuid <u>
    │            [--program-name <n>]
    └── query    <def.json> [--cword <N>] -- <words...>
```

wire 表現の対応 [規範化: キーは schema/wire.schema.json の実在語彙で確認済み]:

| 現 main.mbt の手書き構造 | wire 表現 |
|---|---|
| subcommand dispatch (parse/complete/...) | `commands` (ネスト scope、completion の子 generate/query は 2 段ネスト) |
| `<def.json>` 必須 positional | `positionals` + `required: true`、type は string (パス。`-` の stdin 特例は §3 H7 — I/O 層責務で型は string のまま) |
| `--env k=v` 繰返し | `long` option + `multiple` (accumulator)。`k=v` の分解は値 filter でなくアプリ側 (§5 発見候補 F3) |
| `--config-file <path> <v>` 2 引数形 | `seq` 多値 (UX-Q8 裁定 2026-07-16 が既に「seq 多値の dogfooding として」と予告した席) + `multiple` |
| `--no-env` / `--no-config` | flag 型 (bool 型でなく flag — H14 の罠を自分で踏まない) |
| `--no-config` / `--config` / `--config-file` 排他 | `exclusive_group` [規範化: fixtures/constraints-parse/exclusive.json] |
| `--shell zsh\|bash\|fish` | `enum` 値制約 |
| `--depth scope\|all` 等の enum 値 | `enum`。`named:<name>` 併存の `--category-mode` は enum で書けない → `pattern` or 素 string + アプリ側検証 (§5 発見候補 F4) |
| `--cword <N>` | int 型 |
| `--` 以降の `<args...>` / `<words...>` | dd (`--` 遮断) + repeat positional [規範化: fixtures/dd/、DR-042] |
| `--` 省略時「非オプション先頭以降は全部 target」(現 parse の挙動) | **kuu の greedy/先食い意味論と一致するか要検証** (§5 発見候補 F1 — 現実装は「最初の非 flag token で以降全て positional」という trailing 縮退。kuu の読み意味論で同じ挙動を宣言できるかが表現力テストの目玉) |
| `kuu help` (引数 0 で usage、def.json 付きで help_query) | positional optional + アプリ側分岐。help subcommand 自体は通常 scope |
| `--help` (大域) | help preset (`type: "help"`) を inheritable/global 宣言 → **H4 (subcmd --help) が定義 1 行で全 scope に効く** [規範化: DR-048、fixtures/failure-actions/] |
| `--version` | **wire に version preset が無い** (§5 発見 F2 — fixtures/failure-actions/args-minimal.json の why が「type:"version" プリセット未予約」を自白済み)。暫定実装は §3 H5 |

### 1.2 文言資産

def.json の `help` / `help_long` / `help_group_*` に現 usage_text() の内容を移すが、
**そのまま転記しない**: H6 (DR/findings 番号 10 箇所以上 + 日英混在) の解消として、
全文言を英語で書き直し、DR 番号は落とす (interface-wording rule: 利用者の語彙で書く。
DR への遡及は def.json 内 comment でなく docs 側の責務)。help_group で
parse options / help options / completion options の節構成を再現する
[規範化: DR-113 の group 機構]。

### 1.3 def.json の置き場と読み込み [発明]

MoonBit native binary に JSON を同梱する最も単純な形 = ビルド時に def.json を
MoonBit string literal へ埋め込む生成 step (justfile task で `kuu-cli.def.json` →
`def_embedded.mbt` を生成、生成物は commit しない or 検査付き commit)。
実行時ファイル読みは「kuu-cli が自分の def を見失う」配布欠陥になるため不採用。
これは形態 A (セルフバイナリ組み込み、DR-117 §6) の要件「definition はバイナリ内」
そのもの。

## 2. main.mbt の書き直し構成

新 main は薄い dispatch のみ (現 878 行 → 目標は I/O primitive + dispatch で ~300 行台
[発明: 見積り])。処理順:

```
main:
  1. completion_entry(ast, argv, env)          — DR-117 形態 A の玄関。KUU_COMPLETE env
     プロトコル発火なら Respond(text) を stdout に出して即 exit 0。
     自分自身の補完が kuu の completion 機構で動く = dogfooding の象徴点
  2. parse(ast, args, sources)                 — 自身の argv を kuu で解析 (DR-118 段階型)
  3. ParsedOutcome 分岐:
     - Failure + fired_action == "help"        → help() + canonical renderer → stdout, exit 0  (H3/H8)
     - Failure + fired_action == "version"     → version 文字列 → stdout, exit 0  (§3 H5 の暫定形次第)
     - Failure (その他)                         → renderer のエラー整形 → stderr, exit 2  (usage error)
     - Ambiguous                               → kuu-cli 自身の定義では原理上出ない設計にするが、
                                                  出たら interpretation 提示 → stderr, exit 2 (防御)
     - Success(parsed)                         → resolve(ast, parsed, args, sources) へ
  4. ResolvedOutcome::Failure                  → stderr, exit 2 / Success → output() → binds 取り出し
  5. binds からサブコマンド決定 → 各 runner へ dispatch
     runner は「型付き引数を受け取って @lib.cmd_* を呼ぶ」だけに痩せる
     (現 run_parse 200 行の手書き while ループが全部消える)
```

- **help は kuu 自身の help_query + canonical renderer** [規範化: DR-113 / DR-115]:
  usage_text() のハードコード文字列を廃止し、`kuu --help` / `kuu parse --help` /
  `kuu help` (引数なし) を全て dispatch_help_query → cmd_help_text 経路に一本化。
  M3 (top-level help 48 行の壁) は「root scope の help = subcommand 一覧 + 大域 option
  のみ、詳細は `kuu <sub> --help`」という 2 段 help が **help_query の scope 単位取得で
  構造的に解決** される (depth 既定 Scope がまさにこの形)
- **2 値源の階層** [発明: 構成判断]: kuu-cli 自身の CLI 面は env/config/tty 値源ラダーを
  使わない (ValueSources は空 = 純 CLI。kuu-cli の option を環境変数で上書きする要件は無い
  し、payload 側の `--env` 注入と紛れる)。payload (ユーザ def.json への parse/complete)
  に渡す ValueSources は従来どおり実環境既定 (DR-109 §6) — 「kuu-cli 自身の面」と
  「payload の面」の 2 層を混同しないことが本書き直しの整理軸
- stdout/stderr 分離規約は現行維持 [規範化: codex #1 M-5 統括裁定 2026-07-16]:
  machine JSON = stdout / human text = stderr。**例外を 2 つ明文化**: ユーザ自発の help
  (H3) と --version (H5) は stdout (GNU 慣習、`| less` が動く)

## 3. H2-H9 + H14 の解消層 対応表

| ID | 指摘 | 解消層 | 中身 |
|---|---|---|---|
| H2 | exit code が README と不一致 (読めないファイル / malformed JSON / parse 失敗が exit 0) | wire.mbt (cmd_*) + main dispatch | exit 規約を 1 箇所の関数 (outcome → exit class) に集約し README と一致させる: 0=success / 1=payload の parse・validate・help query 失敗 / 2=kuu-cli 自身の usage error。**現バグの根は cmd_* が error 時 exit を返しても main が拾い損ねる経路** — dispatch 書き直しで構造ごと消す。回帰テストを §4 の CLI 面テストに置く |
| H3 | `--help` が stderr | main dispatch | fired_action==help → renderer text → **stdout**, exit 0 |
| H4 | `<subcmd> --help` が動かない | **def.json** | help preset を root で inheritable 宣言 → 全 scope に自然発生。手書き分岐 (現 L89 の "--help" match arm) 削除。**def 定義だけで直る = dogfooding の価値実証点** |
| H5 | `--version` が無い | def.json + main dispatch | wire に version preset が無い (§5 F2)。暫定 [発明]: fixtures/failure-actions/args-minimal.json と同型に `type:"help"` 要素を name:"version" で置き、fired_action=="version" を dispatch で判別して VERSION 内容を stdout へ。**歪み (help 意味論の版流用) を自覚した暫定** — 正式席は DOG-Q1 (§6) |
| H6 | help 出力に DR 番号 + 日英混在 | def.json 文言資産 | §1.2 のとおり全文英語で書き直し。renderer 出力に日本語・DR 番号が 0 件であることを CLI 面テストで grep 検査 |
| H7 | stdin (`-`) 未対応 | I/O 層 (read_file_all の手前) | `<def.json>` が `-` なら stdin 全読み [規範化: POSIX 慣習]。def.json の型は string のまま (パス解釈は I/O 層責務、wire は関与しない — ここを wire に持ち込まないのが層の規律) |
| H8 | 引数なしが exit 2 | def.json + main dispatch | 引数なし → root scope の help 表示 + **exit 0** [規範化: 台帳 H8 の「cli-design-preferences なら exit 0 が整合」]。実現形は「args 空 → 完全経路 0 本 failure + help_on_failure で help 発火 → dispatch が fired_action==help を exit 0 へ」。この経路が kuu 意味論で自然に組めるかは実装時検証 (§5 F5) — 組めなければ dispatch 冒頭の args.length()==0 特判 (現行同様) で妥協し、発見として記録 |
| H9 | bash glue の TODO 平文焼き付き | kuu.mbt (completion_template_bash) | kuu-cli 層でなく kuu.mbt のテンプレ資産の修理。**本サイクルの kuu.mbt 側 唯一の必須変更** [発明: スコープ判断 — テンプレ文字列修正のみで ABI 不変のため同乗可]。修正後 smoke (3 shell syntax-check) で検証 |
| H14 | bool option が値要求で素人が詰む | kuu-cli renderer (エラー整形) | [規範化: AP2 plan §3 H14 で裁定不要と判断済み]。reason==missing_operand かつ当該要素の型が bool のとき `hint: declare it as type "flag" if it takes no value` を stderr に添える。**素材確認が先**: 現 wire の errors に「要素の型が bool だった」を renderer が知る素材があるか (element 名 → def 内の型引き当てで足りるはず — kuu-cli は ast を持っているので def 側から引ける。wire 拡張不要の見込み)。足りなければ AP2 plan §3 の予約どおり DR 明確化 note + Q 化 |

## 4. 検証戦略

### 4.1 既存 gate の維持

conformance sweep (情報収集) / help-conformance (green gate) / e2e (代表 fixture) /
smoke (completion 3 shell) は全て維持。e2e は wire envelope (stdout JSON) を見るので
dispatch 書き直しの影響を受けない — **書き直し前に e2e を green 確認 → 書き直し後に同
green を再確認** が回帰の背骨。

### 4.2 新設: kuu-cli 自身の CLI 面テスト

2 層に分ける [発明: テスト構成]:

1. **def.json の意味論テスト = conformance fixture 形式の自家 fixture**:
   `impl/mbt/cli/tests/self/` に spec fixture と同形式 (`definition` + `cases[args/expect]`)
   で kuu-cli.def.json 断片のケースを書き、既存 runner の流儀で回す。排他 (exclusive_group)、
   seq 2 引数形、dd 遮断、help 発火などが対象。**spec fixture 形式がそのまま第三者アプリの
   テスト形式として使える** ことの実証 — 使いにくければそれも発見 (F6)
2. **プロセス境界テスト = bash e2e 拡張**: exit code / stdout・stderr 分離 / stdin /
   --version は **fixture 形式では表現できない** (wire model は exit code・stream を
   持たない — DR-109 柱 4 が exit class を semantic までと線引きした帰結の実地確認)。
   compiled binary への bash テストで H2/H3/H5/H7/H8 を 1 ケースずつ固定。
   H6 は renderer 出力への `grep -c 'DR-[0-9]'` = 0 検査

### 4.3 補完の dogfooding 検証

completion_entry 玄関 (§2 step 1) が入ることで、`kuu completion generate <kuu-cli 自身の
def.json> --shell zsh ...` で **kuu-cli 自身の補完 glue を生成して kuu-cli を補完できる**。
smoke に「自分自身の def.json を食わせる」ケースを 1 本追加 (H9 修正の検証を兼ねる)。

## 5. 表現力の発見リスト (spec への還流台帳)

実装前に見えている候補 (実装中に確定させ、確定分を spec 側 issue / Q へ):

- **F1: trailing var-args の縮退規則** — 現 main.mbt の「最初の非オプション token 以降は
  全て target」(L204) を kuu の読み意味論 (先食い / greedy / dd) で宣言できるか。
  できない場合「オプション位置自由 (cli-design-preferences) と trailing raw args の両立」
  という表現力欠落として起票
- **F2: version action の席が無い** — fixtures/failure-actions/args-minimal.json の why が
  既に自白している未予約席を、実利用者として初めて要求する形。§6 DOG-Q1
- **F3: `k=v` 形の値分解** — `--env k=v` の key/value 分解は wire の値 filter で書けるか、
  アプリ側責務か。位相の整理だけでも文書価値あり
- **F4: enum + 開放形の混在値** (`--category-mode default|all|named:<name>`) — enum でも
  pattern でも素直に書けない形。頻出パターンなら spec 側の語彙候補
- **F5: 「引数なし = help + exit 0」の宣言可能性** (§3 H8) — help_on_failure 経由で組めるか
- **F6: fixture 形式の第三者利用性** (§4.2) — definition 断片の再利用・why 必須の重さ等

発見の還流形式: 「フラグ + 一次資料 (本 findings §5 + 実装 commit) の提示」に留め、
spec 側の実装判断は spec サイクルに委ねる。

## 6. マイルストーンと DOG-Q

### 依存関係

**AP2 の M2c (段階型玄関の kuu.mbt 実装) が前提** — 本サイクルの main dispatch (§2) は
ParsedOutcome/ResolvedOutcome/ValueSources の新玄関で書く。AP2 M4 (kuu-cli 最小追随) と
本サイクル D2 は同じファイルを触るため、**AP2 M4 は「ビルドを通す最小限」に留め、本格
書き直しは本サイクルで行う** (writer 衝突回避、one-ws-one-writer)。

### マイルストーン

1. **D1: def.json 起草 + 表現力検証** — kuu-cli.def.json を書き、`kuu validate` (現行版)
   と自家 fixture (§4.2 層 1) で意味論を固める。F1/F4/F5 の書けるか判定はここで確定。
   産物: def.json + 発見リスト確定版 (本 findings へ追記)
2. **D2: main.mbt 書き直し** — §2 の構成で dispatch 一新 + 埋め込み生成 step (§1.3) +
   H2/H3/H4/H5/H7/H8 を同時解消 (dispatch 構造そのものが解消形のため分割不能)。
   1 commit 系列で green まで
3. **D3: 文言・補完・hint** — H6 (文言英語化、def.json 内で完結するが renderer 出力検証
   込み) + H9 (kuu.mbt テンプレ修正 + pin bump 同窓) + H14 (hint、素材確認込み) +
   completion self-dogfood (§4.3)
4. **D4: テスト整備 + 記録** — bash e2e 拡張 (§4.2 層 2) + README の exit code 節を実装と
   一致させる (H2 の文書側) + journal + F 系の spec 還流起票

push はロックステップ窓 (H9 で kuu.mbt を触るため: kuu.mbt push → pin bump → kuu-cli push)。

### DOG-Q バッチ素案

- **DOG-Q1: version action の正式席** (F2)
  - a. spec に `type: "version"` preset を新設 (help preset と同型の failure-action、
    文言は definition が持つ)
  - b. 汎用 fail-action 属性 (action 名を definition が自由に付け、アプリ側 dispatch が
    fired_action 名で分岐 — version はその一例)
  - c. spec 変更なし、kuu-cli は type:"help" の name 違い流用を恒久化
  - 推し: **b** — args-minimal.json の why が示すとおり選択機構は既に action 名非依存で
    動いており、preset 増殖 (a) より汎用席が kuu の設計線 (素材はフィールド、文言は
    レンダラ) に合う。c は歪みの恒久化で不採用
- **DOG-Q2: `kuu help <def.json>` の --format 既定** — main.mbt L641 が既に「既定切替は
  kawaz 裁定待ち」と保留している席。dogfood 後は人間向け text が自然だが、
  help-conformance gate と既存利用は json 前提
  - a. 既定を text に切替 (machine 用途は --format json 明示)
  - b. json 既定を維持
  - 推し: **a** — `kuu help` はユーザ自発の human 経路で、machine 経路 (gate / CI) は
    引数明示のコストが低い。gate 側は --format json を明示するだけで無傷

DOG-Q1 は D1 (def.json に version をどう書くか) に影響するため **D1 着手前に裁定が
望ましい**。DOG-Q2 は D3 まで遅延可。

## 関連

- 台帳: `docs/findings/2026-07-24-fresh-eyes-adversarial-review.md` (B4 / H2-H9 / H14 / M2 / M3)
- 前提サイクル: `docs/findings/2026-07-24-api-polish-2-plan.md` (DR-118 段階型 / ValueSources / H14 引き継ぎ §3)
- 補完系: DR-116 (policy) / DR-117 (ABI、形態 A/B) / `docs/findings/2026-07-23-completion-ux-layer-plan.md`
- help 系: DR-113 (help_query) / DR-115 (canonical renderer)
- kuu-cli 側: `impl/mbt/cli/src/main/main.mbt` (書き直し対象) / kuu-cli DR-0001 §3 (PoC 契約)
