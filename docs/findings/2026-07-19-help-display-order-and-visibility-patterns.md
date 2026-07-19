# help 表示順・可視性の一般パターン調査

> Rust/Go/Python/Node/hierarchical 系の実 CLI ツールを実機実行し、help 実表示を採取した。
> 由来: kawaz 指示 2026-07-19「一般にどんなパターンがあって kuu ではそれらを表現できるか」。
> 対応論点: HIP-Q1 (global 配置) / HIP-Q4 (hidden 座) / HIP-Q5 (alias 位置) / HIP-Q6 (spelling 順) / HIP-Q7 (command 表示)。
> 本 finding は一次観測 (実出力抜粋 + 分類)。kuu の表現力チェックと仕様追加の判断は別 finding / DR で。

## 判明した事実 (Rust/Go 系)

実機 (macOS, 2026-07-19) で以下を確認した:

- cargo 1.97.0 / rustup 1.29.0 / ripgrep 15.1.0 / fd 10.4.2 / gh 2.96.0 / git 2.54.0 / docker 29.4.0 / kubectl (client, `--version` flag無効個体だが `--help` は動作) / go (バージョン flag無効個体だが `help` は動作)

### 1. global option の配置

分類マトリクス (ツール × 配置方式):

| ツール | トップレベル option 名 | サブコマンド help での再掲有無 | 再掲時の見出し | 位置 |
|---|---|---|---|---|
| cargo | `Options:` (無名見出し) | **複製 (同名 flag が再定義される)**。`-v/--verbose`, `-q/--quiet`, `--color`, `--config`, `-Z`, `-h` が `cargo build --help` にも独立して同じ文言で載る | 見出しなし (同じ `Options:` セクション内) | サブコマンド固有 option と**同一セクション内で先頭に混在**、その後 `Package Selection:` `Target Selection:` 等の機能別グループが続く |
| rustup | `Options:` | サブコマンド (`toolchain`, `toolchain install`) では **再掲されない**。各サブコマンドは自分の `-h, --help` のみ持つ | — | — (継承の可視化なし。ユーザは top-level `--help` を別途見る必要がある) |
| git | usage 行の `[-C <path>] [-c ...] ...` | サブコマンド man page (`git commit --help` 等) では **登場しない**。サブコマンド固有 `OPTIONS` のみ | — | — |
| docker | `Global Options:` (明示ラベル) | `docker container --help` や `docker container run --help` では **完全省略**。トップレベル `docker --help` にのみ 1 箇所出現 | `Global Options:` (top のみ) | トップレベル help の**末尾** (Management/Swarm/Commands セクション群の後) |
| kubectl | (トップの `--help` に一覧なし。`kubectl options` という**専用サブコマンド**が実体を持つ) | 各サブコマンド help の**末尾に固定文言の参照文**: `Use "kubectl options" for a list of global command-line options (applies to all commands).` | 参照メッセージのみ、値は非表示 | 全サブコマンド help 共通の最終行 |
| gh | `FLAGS` (トップ固有) | サブコマンド help に **`INHERITED FLAGS`という専用セクション名**で明示的に再掲 (例: `gh pr --help` の `--help` のみ、`gh pr create --help` では `--help` + `-R, --repo` の2つ) | `INHERITED FLAGS` (固有ラベル、`FLAGS` と分離) | `FLAGS` セクションの**直後**、`ARGUMENTS`/`EXAMPLES` より前 |

観察された配置方式は 3 系統に分類できる:

1. **複製方式** (cargo): global 相当の option をサブコマンド定義に**そのままコピー**し、通常の option 群と同一セクションに混在させる。ソース上は継承だが help 表示上は「継承」の痕跡が消え、独立した option に見える
2. **省略方式** (rustup, git, docker): サブコマンド help には出さない。ユーザはトップレベル help を別途参照する必要がある
3. **参照方式** (kubectl): 値を再掲せず「どこで見られるか」の案内文だけを毎回末尾に固定表示
4. **専用セクション方式** (gh): 継承された option だけを集めた**独立の見出し** (`INHERITED FLAGS`) を設け、自前 option (`FLAGS`) とは明確に分離して両方見せる

gh の `INHERITED FLAGS` は 4 分類の中で唯一「継承であることを表示上も明示しつつ、値も見せる」方式。

### 2. hidden option / group の扱い

- **cargo の `-Z` (unstable flags)**: 通常の `cargo --help` / `cargo build --help` には `-Z <FLAG>  Unstable (nightly-only) flags to Cargo, see 'cargo -Z help' for details` という**入り口の1行だけ**が載り、個々の flag 一覧 (200+ 個) は `cargo -Z help` という**別サブコマンド相当の問い合わせ**でのみ見える。「グループ丸ごと非表示、入口だけ露出」パターンの実例
- ripgrep 15.1.0: `-h`(short) と `--help`(long) で **出力内容が異なる** (`-h` は要約、`--help` は詳細)。「hidden」ではなく「詳細度で出し分け」だが、同じ flag セットの可視性が呼び出し方で変わる実例として記録
- git: `git help -a` は "Main Porcelain Commands" / "Ancillary Commands / Manipulators" 等のカテゴリ見出しで**全コマンドを列挙**。特定コマンドを意図的に隠す仕組みは観測されなかった (= 少なくとも `-a` を使えば全部見える設計)
- kubectl: `Subcommands provided by plugins:` という**プラグイン由来コマンド専用セクション**があり、通常のビルトインコマンドと表示上分離される (hidden ではないが「由来による強制グループ化」の実例)
- docker: `buildx*` `compose*` のように**コマンド名にアスタリスク付与**で「プラグイン提供」を明示。hidden ではなく可視だが由来を印で区別

「グループ全体を隠す」の直接的な実例は cargo `-Z` のみ。他は「省略」ではなく「別セクションで分離表示」が主流だった。

### 3. alias / spelling の宣言位置と表示位置

| ツール | alias 種別 | 表示位置 | 表示形式 |
|---|---|---|---|
| cargo | コマンド alias (`build`/`b`) | コマンド名の**直後にカンマ区切り**で同一行 | `build, b    Compile the current package` |
| docker | コマンド alias (`docker container run` = `docker run`) | help 本文内に**専用`Aliases:`ブロック** (usage 直下、Options より前) | `Aliases:\n  docker container run, docker run` |
| gh | コマンド alias (`gh pr create` = `gh pr new`) | 専用 `ALIASES` セクション (USAGE の直後、FLAGS より前) | `ALIASES\n  gh pr new` |
| gh (トップ) | サブコマンド alias (`co` = `pr checkout`) | トップレベル help に**専用セクション** `ALIAS COMMANDS` (CORE COMMANDS 等と並列の見出し) | `co:  Alias for "pr checkout"` |

spelling variant (例: `--no-foo`) の宣言位置と表示順については、今回実行したツール群で明示的な variant 表示 (説明文中の言及を除く) は確認できなかった:
- fd の `--strip-cwd-prefix` は「flag なしなら always 相当」のような **default 値の言及のみ**で、`--no-strip-cwd-prefix` という独立 flag は存在しない (值を取る flag として1本化)
- rustup `--no-self-update` / `--no-update` / `--no-lazy-fetch` (git) は **正 spelling と否定 spelling が別々の独立 flag として、通常の宣言順 (アルファベット順に近い) でそのまま列挙**される。「main spelling 先→variant 後」への並び替えは観測されなかった。宣言順のまま表示される、が優勢パターン

### 4. command alias / hidden / deprecated の表示

- **gh**: トップレベル help に `ALIAS COMMANDS` という**独立カテゴリ見出し**を設け、`co: Alias for "pr checkout"` の形式でコマンド名 + 説明文 (「Alias for ...」という定型文言) を明示
- **docker**: コマンド一覧 (`Management Commands:` 等) の中でプラグイン提供コマンドに `*` サフィックス (`buildx*`, `compose*`) を付け、リスト末尾に注記なし (`*` の意味はヘルプ内で説明されない — 別ドキュメント依存)
- **kubectl**: `Subcommands provided by plugins:` セクションで由来別に完全分離 (カテゴリ名自体が由来を説明)
- **deprecated command の直接的な表示例**: 今回の 4 ツールでは deprecated コマンドの help 表示は観測できなかった (該当する deprecated サブコマンドを持つツールが手元になかった)。cargo の `--all` オプション ("Alias for --workspace (deprecated)") は **option レベルの deprecated 表示例**として観測: `Package Selection:` セクション内で通常の option と同列に列挙されつつ、説明文中に `(deprecated)` という文言が付与される。専用セクション分離ではなく**インラインの注記語**で表現

## 実用的な示唆 (Rust/Go 系まで)

### 用語対応表 (実 CLI 用語 → kuu 内部語)

| 実 CLI 用語 | 由来ツール | kuu 側の想定対応 |
|---|---|---|
| `Global Options:` | docker | scope=global の option 群 |
| `INHERITED FLAGS` | gh | サブコマンド help で見せる「親 scope から継承した option」の集合。gh は自前 (`FLAGS`) と明確に分離 |
| `Use "X options" for ...` (参照文) | kubectl | 継承 option を**値としては出さず、入手経路だけ案内**する参照方式。kuu の help_group 相当に「参照のみ」モードがあるかは要検討 |
| `-Z help` (別サブコマンドでの unstable flag 一覧) | cargo | help_group の hidden 相当を「通常 help には出さないが、別入口を用意する」形。単純な bool hidden ではなく「入口だけ見せて詳細は別コマンド」という二段階可視性 |
| `Aliases:` / `ALIASES` (コマンド単位) | docker, gh | サブコマンド自身の command alias 表示。docker は usage 直下、gh は USAGE 直後 (ともに FLAGS/Options より前という共通点) |
| `ALIAS COMMANDS` (トップの専用カテゴリ) | gh | サブコマンド一覧内で alias だけを別グループとして分離するパターン。kuu の command 一覧表示で「alias グループ」を切る座が要るか要検討 |
| `*` サフィックス (由来注記) | docker | 提供元 (プラグイン等) の視覚的マーキング。hidden/alias とは別軸の注記 |
| `(deprecated)` インライン注記 | cargo | 専用セクション分離ではなく、既存の Group 内で説明文に注記語を混ぜる方式 |

### 4 論点への直接示唆

1. **global 配置 (HIP-Q1)**: 実 CLI は「複製」「省略」「参照文」「専用セクション再掲」の 4 方式に分かれ、**1 つの正解はない**。kuu が単一の固定順序 (先頭 or 末尾) を strict に決め打つのは実態と乖離する。gh の `INHERITED FLAGS` が最も表現力が高い (継承の事実を隠さず、値も出す) が、cargo の複製方式もよく使われている (= 継承を隠して自前 option のように見せる設計判断も正当)
2. **hidden (HIP-Q4)**: 「グループ丸ごと隠す」の実例は cargo `-Z` の 1 例のみで、かつ「完全非表示」ではなく「入口 1 行 + 別コマンドでの詳細開示」という**二段階**だった。kuu の help_group に hidden フラグを付けるなら、「完全 hidden (grep 不能)」と「入口のみ表示 + 詳細は別経路」の 2 段階を区別できるか検討の価値あり
3. **alias 位置 (HIP-Q5, Q6)**: option レベルの alias 表示位置に強い慣習は見られなかった (cargo はコマンド alias をカンマ併記するが、option alias の専用パターンは今回未観測)。variant spelling (`--no-*`) は**宣言順そのまま**が優勢で、「main 先→variant 後」への自動並び替えの実例はなかった — kuu が宣言順保存をデフォルトにするのは実態に合う
4. **command alias/hidden/deprecated (HIP-Q7)**: gh の `ALIAS COMMANDS` (トップ専用セクション) と docker/gh の `Aliases:` (サブコマンド内、usage 直後) は**表示位置が異なる**。「コマンド一覧内で alias を分離するか」と「特定コマンドの help 内で自分の alias を示すか」は別々の設計判断であり、kuu もこの 2 層を区別して表現できる必要がありそう

## 検証の詳細 (実出力ログ)

### cargo (1.97.0)

`cargo --help`:
```
Rust's package manager

Usage: cargo [+toolchain] [OPTIONS] [COMMAND]
       cargo [+toolchain] [OPTIONS] -Zscript <MANIFEST_RS> [ARGS]...

Options:
  -V, --version                  Print version info and exit
      --list                     List installed commands
      --explain <CODE>           Provide a detailed explanation of a rustc error message
  -v, --verbose...               Use verbose output (-vv very verbose/build.rs output)
  -q, --quiet                    Do not print cargo log messages
      --color <WHEN>             Coloring [possible values: auto, always, never]
  -C <DIRECTORY>                 Change to DIRECTORY before doing anything (nightly-only)
      --locked                   Assert that `Cargo.lock` will remain unchanged
      --offline                  Run without accessing the network
      --frozen                   Equivalent to specifying both --locked and --offline
      --config <KEY=VALUE|PATH>  Override a configuration value
  -Z <FLAG>                      Unstable (nightly-only) flags to Cargo, see 'cargo -Z help' for
                                 details
  -h, --help                     Print help

Commands:
    build, b    Compile the current package
    check, c    Analyze the current package and report errors, but don't build object files
    clean       Remove the target directory
    doc, d      Build this package's and its dependencies' documentation
    new         Create a new cargo package
    init        Create a new cargo package in an existing directory
    add         Add dependencies to a manifest file
    remove      Remove dependencies from a manifest file
    run, r      Run a binary or example of the local package
    test, t     Run the tests
    bench       Run the benchmarks
    update      Update dependencies listed in Cargo.lock
    search      Search registry for crates
    publish     Package and upload this package to the registry
    install     Install a Rust binary
    uninstall   Uninstall a Rust binary
    ...         See all commands with --list

See 'cargo help <command>' for more information on a specific command.
```
所見: コマンド alias (`build, b`) はコマンド名列内にカンマ併記、宣言順そのまま。global option (`Options:`) はコマンド一覧より前、単一の無名見出し内に混在。

`cargo build --help` (抜粋):
```
Options:
      --future-incompat-report   Outputs a future incompatibility report at the end of the build
      --message-format <FMT>     Error format [...]
  -v, --verbose...               Use verbose output (-vv very verbose/build.rs output)
  -q, --quiet                    Do not print cargo log messages
      --color <WHEN>             Coloring [possible values: auto, always, never]
      --config <KEY=VALUE|PATH>  Override a configuration value
  -Z <FLAG>                      Unstable (nightly-only) flags to Cargo, see 'cargo -Z help' for
                                 details
  -h, --help                     Print help

Package Selection:
  -p, --package [<SPEC>]  Package to build (see `cargo help pkgid`)
      --workspace         Build all packages in the workspace
      --exclude <SPEC>    Exclude packages from the build
      --all               Alias for --workspace (deprecated)

Target Selection:
  --lib / --bins / --bin [<NAME>] / --examples / --example [<NAME>] / --tests / --test [<NAME>] / --benches / --bench [<NAME>] / --all-targets

Feature Selection:
  -F, --features <FEATURES>  ...
Compilation Options:
  -r, --release / --profile <PROFILE-NAME> / -j, --jobs <N> / --keep-going / --target [<TRIPLE>] / --target-dir <DIRECTORY> / ...
Manifest Options:
  -m, --manifest-path <PATH> / --ignore-rust-version / --locked / --offline / --frozen
```
所見: global 由来の `-v/-q/--color/--config/-Z/-h` が**サブコマンド独自の `Options:` 見出し内に完全複製**され、`Package Selection:` 等の機能グループより前に位置。`--all` の説明文に `(deprecated)` とインライン注記 (専用セクションなし)。

`cargo publish --help` でも同型の複製 (`-n/--dry-run` 等の固有 option が `Options:` 内の先頭寄りに追加され、global 由来と混在)。

`cargo -Z help` (抜粋、200+ 行から先頭 18 行):
```
Available unstable (nightly-only) flags:

    -Z allow-features              Allow *only* the listed unstable features
    -Z any-build-script-metadata   Allow any build script to specify env vars via cargo::metadata=key=value
    -Z asymmetric-token            Allows authenticating with asymmetric tokens
    ...
```
所見: 通常 help には `-Z <FLAG>` の 1 行しか出ない詳細一覧が、専用サブコマンド的呼び出し (`cargo -Z help`) でのみ全開示される。「グループ丸ごと hidden、入口 1 行だけ露出」の実例。

### rustup (1.29.0)

`rustup --help`:
```
rustup 1.29.0 (28d1352db 2026-03-05)

The Rust toolchain installer

Usage: rustup[EXE] [OPTIONS] [+toolchain] [COMMAND]

Commands:
  install / uninstall / toolchain / default / show / update / check / target / component / override / run / which / doc / man / self / set / completions / help

Arguments:
  [+toolchain]  Release channel (e.g. +stable) or custom toolchain to set override

Options:
  -v, --verbose  Set log level to 'DEBUG' if 'RUSTUP_LOG' is unset
  -q, --quiet    Disable progress output, set log level to 'WARN' if 'RUSTUP_LOG' is unset
  -h, --help     Print help
  -V, --version  Print version

Discussion:
  (長文の説明 + Common commands 例示ブロック)
```
所見: help に `Discussion:` という**自由記述の使い方ガイド節**があり、コマンド一覧・option 一覧とは別に「よく使うコマンド例」を自然文で提示 (`Common commands:` に `rustup update` 等の実行例)。

`rustup toolchain --help`:
```
Install, uninstall, or list toolchains

Usage: rustup[EXE] toolchain <COMMAND>

Commands:
  list / install / uninstall / link / help

Options:
  -h, --help  Print help

Discussion:
  (toolchain 命名規則の説明)
```
所見: トップの `-v/-q` は**再掲されない**。サブコマンド help は自分の `-h` のみ持つ。継承の可視化が一切ない (省略方式)。

`rustup toolchain install --help` も同型 (独自 option のみ、global 相当の再掲なし)。

### ripgrep (15.1.0)

`rg --help` (冒頭 + セクション構成の抜粋):
```
ripgrep 15.1.0
Andrew Gallant <jamslam@gmail.com>

ripgrep (rg) recursively searches the current directory for lines matching
a regex pattern. ...

Use -h for short descriptions and --help for more details.

USAGE:
    rg [OPTIONS] PATTERN [PATH ...]
    ...

POSITIONAL ARGUMENTS:
    <PATTERN>
        ...
    <PATH>...
        ...

INPUT OPTIONS:
    -e PATTERN, --regexp=PATTERN
        ...
```
所見: help 本文冒頭に `Use -h for short descriptions and --help for more details.` という**自己言及の案内文**があり、`-h`(short) と `--help`(long) で出力の詳細度が変わることを明示。機能別グループ見出し (`INPUT OPTIONS:` 等、大文字 + コロン) が多数存在 (フルテキストは 1660 行、機能領域ごとに 10+ グループに分割)。全 option がフラットな 1 リストではなく、機能カテゴリ別の複数見出しに分割される点は cargo の `Package Selection:` 等と同型のパターン。

### fd (10.4.2)

`fd --help` (フルテキスト): 単一の `Options:` 見出し内に全 option (60+ 個) をフラットに列挙、機能別グループ分割はなし。各 option の説明文中に「関連する flag」への言及 (例: `--type executable` の説明に `--type file` との関係を注記) はあるが、見出しレベルのグループ化はしない設計。alias / hidden / deprecated の実例は観測されなかった (シングルバイナリで階層コマンドを持たないため該当論点が少ない)。

### gh (2.96.0)

`gh --help`:
```
CORE COMMANDS
  auth: / browse: / codespace: / discussion: / gist: / issue: / org: / pr: / project: / release: / repo: / skill:

GITHUB ACTIONS COMMANDS
  cache: / run: / workflow:

ALIAS COMMANDS
  co:            Alias for "pr checkout"

ADDITIONAL COMMANDS
  agent-task: / alias: / api: / attestation: / completion: / config: / copilot: / extension: / gpg-key: / label: / licenses: / preview: / ruleset: / search: / secret: / ssh-key: / status: / variable:

HELP TOPICS
  accessibility: / actions: / environment: / exit-codes: / formatting: / mintty: / reference: / telemetry:

FLAGS
  --help      Show help for command
  --version   Show gh version

EXAMPLES
  ...

LEARN MORE
  ...
```
所見: コマンド一覧が **6 つの明示カテゴリ** (CORE / ACTIONS / ALIAS / ADDITIONAL / HELP TOPICS + 実質的な FLAGS) に分割され、`ALIAS COMMANDS` が独立カテゴリとして他と並列。`co: Alias for "pr checkout"` という**定型フォーマット文言**でエイリアス先を明示。

`gh pr --help` (抜粋):
```
GENERAL COMMANDS
  create: / list: / status:

TARGETED COMMANDS
  checkout: / checks: / close: / comment: / diff: / edit: / lock: / merge: / ready: / reopen: / revert: / review: / unlock: / update-branch: / view:

FLAGS
  -R, --repo [HOST/]OWNER/REPO   Select another repository using the [HOST/]OWNER/REPO format

INHERITED FLAGS
  --help   Show help for command

ARGUMENTS
  ...
EXAMPLES
  ...
LEARN MORE
  ...
```
所見: `FLAGS` (自前 = `-R/--repo`) と `INHERITED FLAGS` (継承 = `--help`) が**明確に分離**されたセクション。継承 option がここでは `--help` の 1 個だけだが、専用見出しを割いている。

`gh pr create --help` (抜粋):
```
USAGE
  gh pr create [flags]

ALIASES
  gh pr new

FLAGS
  -a, --assignee login / -B, --base branch / -b, --body string / ... (25 個の固有 flag)

INHERITED FLAGS
      --help                     Show help for command
  -R, --repo [HOST/]OWNER/REPO   Select another repository using the [HOST/]OWNER/REPO format

EXAMPLES
  ...
```
所見: `ALIASES` セクションが `USAGE` の直後・`FLAGS` の前に独立配置 (`gh pr new` というコマンド全体の別名を1行で表示)。`INHERITED FLAGS` には `gh pr --help` で見た `-R/--repo` (親の scope から継承) が**そのまま複製**され、`FLAGS` (このコマンド固有) とは別セクションのまま。

`gh alias --help`:
```
AVAILABLE COMMANDS
  delete: / import: / list: / set:

INHERITED FLAGS
  --help   Show help for command
```
所見: 深い階層でも `INHERITED FLAGS` パターンが一貫して維持される。

### git (2.54.0)

`git --help`:
```
usage: git [-v | --version] [-h | --help] [-C <path>] [-c <name>=<value>]
           [--exec-path[=<path>]] [--html-path] [--man-path] [--info-path]
           [-p | --paginate | -P | --no-pager] [--no-replace-objects] [--no-lazy-fetch]
           [--no-optional-locks] [--no-advice] [--bare] [--git-dir=<path>]
           [--work-tree=<path>] [--namespace=<name>] [--config-env=<name>=<envvar>]
           <command> [<args>]

start a working area (see also: git help tutorial)
   clone / init
work on the current change (see also: git help everyday)
   add / mv / restore / rm
examine the history and state (see also: git help revisions)
   bisect / diff / grep / log / show / status
grow, mark and tweak your common history
   backfill / branch / commit / history / merge / rebase / reset / switch / tag
collaborate (see also: git help workflows)
   fetch / pull / push
```
所見: コマンド一覧が**用途別の自然文見出し** (`start a working area`, `work on the current change` 等) でグループ化される、他ツールに無いパターン。global option は usage 行にのみ列挙、サブコマンド man page には一切再掲されない (省略方式)。`history` コマンドに `EXPERIMENTAL:` というインライン接頭辞 (unstable/experimental の注記例)。

`git commit --help` (man page 冒頭、OPTIONS 節先頭のみ):
```
GIT-COMMIT(1)                      Git Manual                     GIT-COMMIT(1)

NAME
     git-commit - Record changes to the repository

SYNOPSIS
     git commit [-a | --interactive | --patch] [-s] [-v] [-u[<mode>]] [--amend]
                ...

DESCRIPTION
     ...

OPTIONS
     -a, --all
         Automatically stage files that have been modified and deleted, but new
         files you have not told Git about are not affected.
     -p, --patch
         ...
```
所見: man page 形式。global option (`-C`, `-c` 等) は一切登場しない。完全な省略方式。

`git help -a` (抜粋、"Main Porcelain Commands" と "Ancillary Commands / Manipulators" の 2 カテゴリのみ抜粋、実際は他に "Interacting with Others" 等の見出しも続く):
```
Main Porcelain Commands
   add / am / archive / backfill / bisect / branch / bundle / checkout / cherry-pick / citool / clean / clone / commit / describe / diff / fetch / format-patch / gc / gitk / grep / gui / history / init / log / maintenance / merge / mv / notes / pull / push / range-diff / rebase / reset / restore / revert / rm / scalar / shortlog / show / sparse-checkout / stash / status / submodule / switch / tag / worktree

Ancillary Commands / Manipulators
   config / fast-export / fast-import / filter-branch / mergetool / pack-refs / prune / reflog / refs / ...
```
所見: `-a` オプションで全コマンドをカテゴリ別に閲覧可能。意図的な hidden コマンドの実例はここでは確認できなかった (`git help -a` が包括的な一覧であるため)。

### docker (29.4.0)

`docker --help`:
```
Usage:  docker [OPTIONS] COMMAND

Common Commands:
  run / exec / ps / build / bake / pull / push / images / login / logout / search / version / info

Management Commands:
  builder / buildx* / checkpoint / compose* / container / context / image / manifest / network / plugin / system / volume

Swarm Commands:
  swarm

Commands:
  attach / commit / cp / create / diff / events / export / history / import / inspect / kill / load / logs / pause / port / rename / restart / rm / rmi / save / start / stats / stop / tag / top / unpause / update / wait

Global Options:
      --config string      Location of client config files (default "/Users/kawaz/.docker")
  -c, --context string     Name of the context to use to connect to the daemon (overrides DOCKER_HOST env var and default context set with "docker context use")
  -D, --debug              Enable debug mode
  -H, --host string        Daemon socket to connect to
  -l, --log-level string   Set the logging level ("debug", "info", "warn", "error", "fatal") (default "info")
      --tls / --tlscacert / --tlscert / --tlskey / --tlsverify
  -v, --version            Print version information and quit

Run 'docker COMMAND --help' for more information on a command.
```
所見: コマンド一覧が **Common / Management / Swarm / (無印) Commands** の 4 カテゴリに分割。`buildx*` `compose*` に**アスタリスク付与** (プラグイン提供の印、ヘルプ内に凡例なし)。`Global Options:` は**トップレベル help の最後方** (全コマンド一覧の後) に単一ブロックとして配置。

`docker container --help`:
```
Usage:  docker container COMMAND

Commands:
  attach / commit / cp / create / diff / exec / export / inspect / kill / logs / ls / pause / port / prune / rename / restart / rm / run / start / stats / stop / top / unpause / update / wait

Run 'docker container COMMAND --help' for more information on a command.
```
所見: `Global Options:` は**再掲されない** (省略方式)。

`docker container run --help` (抜粋、Aliases とグローバル非再掲を確認):
```
Usage:  docker container run [OPTIONS] IMAGE [COMMAND] [ARG...]

Create and run a new container from an image

Aliases:
  docker container run, docker run

Options:
      --add-host list ...
      (60+ 個の固有 option、単一 Options: 見出し内にフラット列挙、アルファベット順)
```
所見: `Aliases:` セクションが **Usage の直後・説明文の後・Options の前**に独立配置。`docker container run` と `docker run` の 2 表記が併記され、どちらが「正」でどちらが「別名」かの区別はフラット (both 併記)。global option (`--config`, `--host` 等) は一切再掲されない。

`docker system --help`:
```
Usage:  docker system COMMAND

Manage Docker

Commands:
  df / events / info / prune
```
所見: 深い階層でも global 再掲なし・alias なし、シンプルなコマンド一覧のみ。

`docker image build --help` (末尾抜粋): `Options:` 内に build 固有 option (`--no-cache`, `--platform`, `--tag` 等) がフラット列挙、機能別グループ分割なし (cargo とは対照的)。

### kubectl (client、`--version` flag は本ビルドで無効)

`kubectl --help` / `kubectl -h` (両者は同一出力、rg と異なりショート/ロングで差がない):
```
Basic Commands (Beginner):
  create / expose / run / set

Basic Commands (Intermediate):
  explain / get / edit / delete

Deploy Commands:
  rollout / scale / autoscale

Cluster Management Commands:
  certificate / cluster-info / top / cordon / uncordon / drain / taint

Troubleshooting and Debugging Commands:
  describe / logs / attach / exec / port-forward / proxy / cp / auth / debug / events

Advanced Commands:
  diff / apply / patch / replace / wait / kustomize

Settings Commands:
  label / annotate / completion

Subcommands provided by plugins:
  pod           The command pod is a plugin installed by the user

Other Commands:
  api-resources / api-versions / config / plugin / version

Usage:
  kubectl [flags] [options]

Use "kubectl <command> --help" for more information about a given command.
Use "kubectl options" for a list of global command-line options (applies to all commands).
```
所見: コマンド一覧が **8 カテゴリ** (Beginner/Intermediate の習熟度別分割を含む) に細分化される、他ツールに無い粒度。`Subcommands provided by plugins:` が由来別の独立カテゴリ。global option は**トップレベルにすら値が出ず**、`kubectl options` という別サブコマンドでのみ実体が見られる (最も徹底した参照方式)。

`kubectl get --help` (末尾、global option 相当の扱いを確認):
```
    (get 固有の 30+ option がフラット列挙されたあと)
Usage:
  kubectl get [(-o|--output=)json|yaml|...] (TYPE...) [flags] [options]

Use "kubectl options" for a list of global command-line options (applies to all commands).
```
所見: 深い階層でも参照文言が完全に同一パターンで繰り返される。global option の値は一切表示されない。

`kubectl config view --help` (末尾) も同型: 固有 option 列挙 → Usage → 同一の参照文言。

### go (bare `go version` flag は本ビルドで無効、`go help` は動作)

`go help`:
```
The commands are:
  bug / build / clean / doc / env / fix / fmt / generate / get / install / list / mod / work / run / telemetry / test / tool / version / vet

Use "go help <command>" for more information about a command.

Additional help topics:
  buildconstraint / buildjson / buildmode / c / cache / environment / filetype / gopath / goproxy / importpath / modules / ...

Use "go help <topic>" for more information about that topic.
```
所見: 「コマンド」と「トピック (概念ガイド)」が**別の一覧として明示的に分離** (git の `git help -g` 相当だが、go は単一 `go help` 実行内で両方を一度に表示する点が異なる)。global option の概念自体が薄い (go はサブコマンドごとに build flags を共有するが、`build flags are shared by the build, clean, get, install, list, run, and test commands` という**自然文での対象コマンド列挙**でグルーピングを説明する。表形式の Global Options セクションは存在しない)。

`go help build` (抜粋): build flags を機能別ではなくフラットな箇条書きで列挙 (`-C dir` / `-a` / `-n` / `-p n` / `-race` / `-msan` / `-asan` ...)。「shared by the build, clean, get, install, list, run, and test commands」という説明で、この flag セットが**複数コマンド共有**であることを散文で明示 (構造化された global/inherited 表示ではなく自然文依存)。

`go help mod` (サブコマンド一覧): `download / edit / graph / init / tidy / vendor / verify / why` の 8 個。alias / hidden の実例は観測されなかった。

## Rust/Go 系まとめ (次担当への引き継ぎ)

- 4 論点それぞれで **複数の異なる実装方式**が実在することを確認済み。単一の kuu 仕様に強制収束させるのではなく、表現力ギャップの洗い出し (task #4) では「どの方式を kuu の型でどう表現できるか」をマトリクス化するのが有効
- 特に **gh の `INHERITED FLAGS` (専用セクション + 値の明示)** と **kubectl の参照方式 (値を出さず経路だけ案内)** は対極的な設計であり、kuu がどちらか一方しか表現できない設計だと実態カバレッジが不足する
- Python/Node/hierarchical 系の続報を待って、分類マトリクスを全ツール共通で再統合するのが望ましい
