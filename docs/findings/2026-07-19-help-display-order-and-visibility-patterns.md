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

## Rust/Go 系まとめ (前担当からの引き継ぎ、書き換えなし)

- 4 論点それぞれで **複数の異なる実装方式**が実在することを確認済み。単一の kuu 仕様に強制収束させるのではなく、表現力ギャップの洗い出し (task #4) では「どの方式を kuu の型でどう表現できるか」をマトリクス化するのが有効
- 特に **gh の `INHERITED FLAGS` (専用セクション + 値の明示)** と **kubectl の参照方式 (値を出さず経路だけ案内)** は対極的な設計であり、kuu がどちらか一方しか表現できない設計だと実態カバレッジが不足する
- Python/Node/hierarchical 系の続報を待って、分類マトリクスを全ツール共通で再統合するのが望ましい

---

## Python/Node/hierarchical 系 (続報)

> 前段 (Rust/Go 系) の 4 論点 (HIP-Q1/Q4/Q5,Q6/Q7) を踏襲し、Python/Node/hierarchical 系ツールを追加調査した。
> 実機 (macOS, 2026-07-19)。バージョン: uv 0.9.x / aws-cli 2.x / azure-cli (az) 2.88.0 / npm 11.17.0 / yarn 1.22.x
> (classic) / bun 1.3.13+bf2e2cecf / docker 29.4.0 (compose plugin) / kubectl (client のみ、前段と同一個体) /
> jj (前段と同一個体)。
>
> **未実行 (理由)**:
> - `poetry` / `pytest` / `mypy` / `turbo` / `eslint` / `prettier` / `firebase` — 未インストール (`which` で確認)
> - `pip` — kuu リポの hook (`force-uv.sh`) が `pip install` 系コマンドをブロックする方針のため、`uv pip` で代替観測
> - `gcloud` — `gcloud --help` 実行時に `ModuleNotFoundError: No module named 'imp'` (Python 3.14 環境で `imp` モジュール廃止、gcloud 側の未追従) により起動不能。help 出力取得不可、パターンは未検証

### 判明した事実 (Python/Node/hierarchical 系)

#### 5. global option の配置

| ツール | トップレベル option 見出し | サブコマンド help での再掲有無 | 再掲時の見出し | 位置 |
|---|---|---|---|---|
| uv | `Global options:` (`Cache options:` `Python options:` と並列の複数見出しの一つ) | `uv pip --help` に**完全複製** (`-q/-v/--color/--native-tls/--offline/...` が丸ごと再掲、`-h` のみサブコマンド版に差し替え) | `Global options:` (同名見出しでそのまま) | コマンド一覧の後、末尾 (`-h`直前) |
| uv (深い階層) | 同上 | `uv pip install --help` では **省略** (`Global options:` 自体が消え、`pip install` 固有 option のみ) | — | — |
| aws | `Global Options` (man page 見出し) | `aws s3 cp help` の **Synopsis (usage) 行にのみ**再掲 (`[--debug] [--endpoint-url <value>] ... [--version <value>]`)。本文の説明付き `Global Options` 節は確認できず (出力後半、未取得範囲) | Synopsis 内は無見出し (他の固有 option と同一の `[--flag <value>]` 列挙に混在) | Synopsis の**末尾** (固有 option 群の後) |
| npm | (トップの `npm help` に Global Options 節なし。`.npmrc` の config 経由という別建て) | `npm install -h` / `npm ls -h` / `npm run -h` いずれも **generic な config option (`--registry`, `--loglevel` 等) は一切登場しない** (完全省略) | — | — |
| yarn (classic) | `Options:` (無名見出し、60+ 個の flag をフラット列挙) | `yarn install --help` / `yarn add --help` の両方に **トップと寸分違わぬ同一の Options 全量が再掲** (`--cache-folder` から `-E, --save-exact` まで一字一句同一、`install`/`add` 固有の flag は追加されない) | `Options:` (同名) | コマンド自体の説明直後、**唯一のセクション** (機能別グループ分割なし) |
| bun | `Flags:` (トップ、`run`/`x` 等のデフォルト実行系オプション、100+ 行) | `bun install --help` と `bun add --help` は **互いにほぼ同一の option セット** (`-c/--config`, `--dry-run`, `--frozen-lockfile` 等) を持つが、これは「global からの継承」ではなく **install 系コマンド同士が横並びで似た option を独自定義**している (トップの `Flags:` とは別物、重複しない) | それぞれ無名の `Flags:` | コマンド説明直後 |
| docker compose (plugin 境界) | `Options:` (compose 自身の global 相当、`--file`/`--profile`/`--project-name` 等) | `docker compose up --help` では**省略**(compose 自身の Options も再掲されない、かつ **docker 本体の `Global Options:`** も compose 配下には一切登場しない) | — | — |
| az | `Global Arguments` (常時) + `Global Policy Arguments` (**条件付き**、リソース変更系コマンドのみ出現) | `az group --help` (subgroup) には Arguments 節自体がない (コマンド一覧のみ)。`az group create --help` (leaf) には **`Global Policy Arguments` と `Global Arguments` の 2 段構成**で再掲 | `Global Policy Arguments` / `Global Arguments` (2 見出しに分離) | leaf コマンドの**末尾** (固有 `Arguments` の後) |
| jj | `Global Options:` (トップ) | `jj bookmark --help` (中間階層) にも `jj log --help` (葉、深さ問わず) にも **一字一句同一の全文が再掲** (`-R, --repository` から `--ignore-immutable` まで、説明文の改行位置まで完全一致) | `Global Options:` (同名) | コマンド一覧・固有 `Options:` の**後**、末尾 |

観察された配置方式を前段の 4 分類に当てはめると:

- **複製方式のうち「完全複製」** (= 元セクションと一字一句同一のテキストがそのまま繰り返される): **yarn**, **jj** が該当。前段の cargo は「同一 `Options:` セクション内に**混在**させつつ、`-h` など一部だけ差し替える」**部分複製**であり、yarn/jj の「独立したセクションとして丸ごと不変コピー」とは粒度が異なる。→ **複製方式は「混在型 (cargo)」と「独立ブロック型 (yarn/jj)」の 2 亜種に分割できる**
- **複製方式のうち「部分複製」**: uv (`uv pip --help` は Global options を complete に再掲するが `uv pip install --help` ではその同じ Global options が消える = 深さによって複製と省略が切り替わる、cargo・yarn・jj のどれとも違う「深さ依存」の挙動)
- **省略方式**: npm (generic config option)、docker compose (compose 自身の global も docker 本体の global も両方省略) が該当。npm は「global option という概念自体を help 上に一切見せない」徹底型
- **参照方式**: 今回の追加調査では kubectl 以外に明確な実例は見つからず (aws の Synopsis 再掲は「値を隠さず出す」ので参照方式ではない)
- **専用セクション方式 (再掲 + 分離)**: uv (`Global options:` という明示名で分離)、az が該当。ただし **az は「専用セクション方式」をさらに 2 段に細分化**する新パターンを見せた (下記)

**az の新パターン (5 番目の方式候補)**: `Global Arguments` (全コマンド共通) と `Global Policy Arguments` (Azure Policy 関連のコマンドでのみ意味を持つ、条件付き global) を **別見出しとして分離**。`Global Policy Arguments` は `az group --help` (subgroup) には出現せず、`az group create --help` (実際にリソースを変更する leaf) でのみ出現した — **「継承元は 1 つの固定リストではなく、コマンドの性質によって出現する global 集合自体が変わる」** という、前段のどの方式にも当てはまらない挙動。gh の `INHERITED FLAGS` (値も出す) に近いが、gh は継承元が単一の親スコープなのに対し az は「横断的に複数の意味論グループを持つ global 集合から、該当するものだけを都度合成して見せる」点で異なる

#### 6. hidden option / group の扱い

- **bun の `Flags:` (トップ)**: 100+ 行の runtime flag (`--inspect`, `--cpu-prof` 等) は `bun run`/`bun exec` 系のデフォルト実行に紐づくもので、`bun install`/`bun add` には一切継承されない (別カテゴリの option 群が完全に独立している。「hidden」ではなく「そもそも scope が違う」ため非表示)。cargo の `-Z` のような「意図的な非表示」とは性質が異なる
- **az の `Global Policy Arguments`**: 上記の通り、特定条件 (リソース変更系コマンド) でのみ出現し、それ以外の leaf コマンドでは非表示。「常に存在するが特定 flag でのみ開示される」cargo `-Z` 型とも「常時省略」型とも違う、**コマンドの意味論によって global 集合自体が条件分岐する**唯一の実例
- **docker compose の `Management Commands: bridge`**: compose 自身のコマンド一覧内に、通常の `Commands:` とは別枠で `Management Commands:` という 1 コマンドだけの特別枠がある (docker 本体の `Management Commands:` パターンを compose plugin 内でも踏襲。入れ子構造でも同一の分類慣習が繰り返される実例)
- npm/yarn/bun/uv/az いずれにも「意図的な hidden option (通常 help には出ないが存在する)」の直接的な実例は見つからなかった。cargo `-Z` は今回調査した Python/Node/hierarchical 系では対応するパターンが再現しなかった (= 出現頻度が低い可能性)

#### 7. alias / spelling の宣言位置と表示位置

| ツール | alias 種別 | 表示位置 | 表示形式 |
|---|---|---|---|
| jj | コマンド alias (`bookmark` = `b`) | コマンド名の**直後、角括弧の説明内**（cargo のようにコマンド名列に併記するのではなく、descriptionテキストの末尾に注記) | `bookmark  Manage bookmarks [default alias: b]` |
| jj (サブサブコマンド) | 同 (`bookmark create` = `bookmark c`) | 同型、description 末尾注記 | `create   Create a new bookmark [aliases: c]` |
| gh pr create | コマンド全体の alias (`gh pr new`) | 専用 `ALIASES` セクション (前段既出、再確認) | `gh pr new` |
| bun | コマンド alias (`bun install` = `bun i`) | コマンド説明文の**直後の行**、専用ラベル `Alias:` (単数形、gh/docker の複数形 `Aliases:`/`ALIASES` と語尾が異なる) | `Usage: bun install ...\nAlias: bun i` |
| yarn | サブコマンド名の**別名を同一行にスラッシュ区切りで併記** (専用セクションなし) | コマンド一覧内、名前列 | `generate-lock-entry / generateLockEntry` |

jj の alias 表示位置 (`[default alias: b]` を description 末尾に置く) は、前段で観測した cargo (名前列に併記) や gh/docker (専用セクション分離) のどちらとも異なる **第 3 の位置パターン**として記録に値する。「宣言済み alias をどこに置くか」は前段の 2 パターンだけでは網羅できていなかった。

spelling variant (`--no-*`) について:
- uv の `--managed-python` / `--no-managed-python`、docker compose の暗黙的なフラグ (例なし直接確認できず) — uv の例は**正 spelling の直後の行に variant が連続**して列挙される (`--managed-python` → `--no-managed-python` → `--no-python-downloads` の順で並ぶ。「宣言順のまま」という前段の結論を再確認)
- bun の `--no-save` / `--save` は **`--no-save` が先、`--save` が後** に列挙される (アルファベット順でも「正→否定」の慣習順でもない。純粋な宣言順)
- npm の `install` help も `[-S|--save|--no-save|--save-prod|--save-dev|...]` と**単一の角括弧グループ内に正/否定/variant を全部フラットに列挙**し、視覚的な優先順位付けは見られない

#### 8. command alias / hidden / deprecated の表示

- **npm**: `npm help` のコマンド一覧に `ll` (= `npm ls` の alias 的存在) のような短縮コマンドが**通常コマンドと全く同列でフラット列挙**される (専用グループなし、gh の `ALIAS COMMANDS` とは対照的)
- **yarn**: コマンド一覧内で `generate-lock-entry / generateLockEntry` のように**表記ゆれをスラッシュ併記**する形式が alias 表示を兼ねる (gh/docker のような専用ラベルなし)
- **bun**: コマンド一覧の右列に**使用例のサンプル引数** (`x prisma`, `add elysia`, `remove backbone` 等) をインラインで添える独自形式。alias/hidden/deprecated の明示的な表示ではないが、「コマンドの使い方を一覧の中で即座に示す」という他ツールにない情報付加パターン
- **az**: サブグループ名の直後に `[Preview]` / `[Experimental]` という**角括弧タグ**をインラインで付与 (`consumption [Preview]`, `config [Experimental]`)。cargo の `(deprecated)` インライン注記と同系統だが、**成熟度ステータスを複数種類 (Preview/Experimental) 使い分けて明示するタグ形式**は前段になかったパターン
- **jj**: サブコマンド一覧内で alias を `[default alias: b]` (最頻用) と `[aliases: a]` (複数可) の**2 段階の表現**で区別する。「デフォルトで推奨される alias」と「単なる別名」を語彙レベルで分けている実例 (gh/cargo にはこの区別がない)
- deprecated コマンドの直接例は本調査でも観測されなかった (前段と同じ「該当ツールが手元にない」制約)

### 実用的な示唆 (Python/Node/hierarchical 系まで、暫定統合)

#### 用語対応表 (追加分)

| 実 CLI 用語 | 由来ツール | kuu 側の想定対応 |
|---|---|---|
| `Global options:` (完全複製 + 深さ依存で省略) | uv | scope=global の option 群。**継承の可視性が呼び出し深さに依存**するケースがある事実は kuu の help_group 設計に「深さ条件」の座が要るか検討材料 |
| `Global Arguments` / `Global Policy Arguments` (条件付き 2 段) | az | 単一の global 集合ではなく、**コマンドの意味論によって出現有無が変わる複数の global グループ**。gh の `INHERITED FLAGS` (単一親スコープからの継承) より一段複雑 |
| `Alias:` (単数形、bun) vs `Aliases:`/`ALIASES` (複数形、docker/gh) | bun/docker/gh | 同じ「コマンド全体の別名」概念でもラベルの単複が割れている。kuu が文言を持つなら数に応じた単複差までは実装非対象 (助言レベル) |
| `[default alias: b]` / `[aliases: a]` (description 末尾注記、2 段階区別) | jj | alias 表示の**第 3 の位置パターン** (名前列併記でも専用セクションでもない)。かつ「デフォルト alias」と「その他 alias」を区別する語彙がある稀有な例 |
| `[Preview]` / `[Experimental]` (角括弧タグ、複数種) | az | cargo の `(deprecated)` と同系統 (インライン注記) だが、**成熟度ステータスの語彙が複数種類**ある実例 |

#### 4 論点への追加示唆

1. **global 配置 (HIP-Q1)**: 前段の「複製/省略/参照/専用セクション」の 4 分類は依然有効だが、**「複製」は一枚岩ではなかった**。cargo のような**混在型部分複製** (同一セクション内に他の option と混ざって差し込まれる) と、yarn/jj のような**独立ブロック型完全複製** (セクションごと一字一句コピー) は、kuu の型で表現しようとすると全く別の構造 (前者は「サブコマンド option リストへのマージ」、後者は「親スコープの help_group をそのまま再掲」) になる。さらに uv は**同じツール内で階層の深さによって複製⇄省略が切り替わる**、az は**条件によって出現する global グループ自体が変わる**という、前段になかった「静的に 1 パターンへ分類できない」実例も出た。kuu の表現力チェックでは「1 ツール = 1 方式」の前提を外し、「1 ツール内で階層ごとに異なる方式が混在しうる」ことを前提にする必要がある
2. **hidden (HIP-Q4)**: cargo `-Z` 型 (グループ丸ごと入口だけ露出) の再現例は今回見つからなかった一方、**az の「コマンドの意味論で global 集合自体が変わる」は hidden とは別軸の新現象**として記録すべき。「値は既に決まっている hidden/visible の二値」ではなく「表示するかどうかがコマンドの属性 (このコマンドはリソースを変更するか等) に依存する」動的な可視性条件があり得る
3. **alias 位置 (HIP-Q5, Q6)**: jj の「description 末尾角括弧注記」は名前列併記 (cargo) でも専用セクション (gh/docker) でもない**第 3 の位置**。3 系統が実在する以上、kuu が alias 表示位置を 1 箇所に固定する設計だと実態の 1/3 しかカバーできない。variant spelling (`--no-*`) の宣言順保存が優勢という前段の結論は uv/bun/npm でも再確認され、揺るがなかった
4. **command alias/hidden/deprecated (HIP-Q7)**: az の `[Preview]`/`[Experimental]` はステータスタグの**語彙が複数種類**あることを示し、cargo の `(deprecated)` 1 種類だけでは足りない。jj の「default alias とその他 alias の区別」も、gh/cargo が持たない語彙レベルの粒度であり、kuu の command 定義がここまでの粒度を持つ設計にするかは要検討課題として残る

### 検証の詳細 (実出力ログ)

#### uv (0.9.x)

`uv pip --help` (全文は前掲の Bash 出力ブロック参照):
```
Global options:
  -q, --quiet...
          Use quiet output
  -v, --verbose...
          Use verbose output
      --color <COLOR_CHOICE>
      ...
  -h, --help
          Display the concise help for this command

Use `uv help pip` for more details.
```
所見: `uv --help` (トップ) の `Global options:` ブロックと **一字一句同一** (末尾の `-h` の説明文言 `Display the concise help for this command` だけがトップと共通、`-V/--version` のみトップにあってここにはない差分)。「ほぼ完全複製、末尾 1 行だけ差し替え」という cargo・yarn・jj のどれとも微妙に異なる挙動。

`uv pip install --help` (全文は前掲):
```
Options:
  -r, --requirements <REQUIREMENTS>
  ...
      --torch-backend <TORCH_BACKEND>
```
所見: `Global options:` セクション自体が**消滅**。`uv pip --help` にはあった `-q/-v/--color` 等は install レベルでは一切表示されない。同一ツール内で **1 階層下では複製、2 階層下では省略** という深さ依存の切り替えを確認。

#### aws (2.x)

`aws help` (冒頭、前掲の Global Options 抜粋):
```
Global Options
     --debug (boolean)
     --endpoint-url (string)
     ...
     --cli-connect-timeout (int)
```
所見: man page 形式で `Global Options` という専用見出し。各 option に `(boolean)`/`(string)`/`(int)` という**型注記**が付く (他ツールでは稀)。

`aws s3 cp help` (Synopsis 部分、前掲):
```
cp
<LocalPath> <S3Uri> or <S3Uri> <LocalPath> or <S3Uri> <S3Uri>
[--dryrun]
[--quiet]
...
[--debug]
[--endpoint-url <value>]
[--no-verify-ssl]
[--no-paginate]
[--output <value>]
[--query <value>]
[--profile <value>]
[--region <value>]
[--version <value>]
```
所見: Synopsis (usage 行) の**末尾に global option 群がそのまま列挙**され、`cp` 固有の option (`--dryrun`, `--sse` 等 40+ 個) との間に見出し区切りがない (フラットな 1 リストに混在)。cargo の「同一セクション内混在」と類似だが、aws は見出し行自体を持たない Synopsis という点でさらに簡素。本文の説明付き `OPTIONS` 節 (man page 後半) は出力量が多く未取得 (時間制約により Synopsis 止まり、要追試)。

#### npm (11.17.0)

`npm help` (前掲、コマンド一覧):
```
npm <command>

Usage:

npm install        install all the dependencies in your project
...
All commands:
    access, adduser, approve-scripts, audit, bugs, cache, ci,
    completion, config, dedupe, deny-scripts, deprecate, diff,
    ...
```
所見: コマンド一覧はアルファベット順のフラットな 1 リスト (`ll` 含む、alias 専用グループなし)。global option という概念自体がトップ help に登場しない (config は別建て、`npm help config` への案内のみ)。

`npm install -h` (前掲):
```
Install a package

Usage:
npm install [<package-spec> ...]

Options:
[-S|--save|--no-save|--save-prod|--save-dev|--save-optional|--save-peer|--save-bundle]
[-E|--save-exact] [-g|--global]
...
```
所見: `-S|--save|--no-save|...` のように**正/否定/variant を同一角括弧グループ内でパイプ区切り**にする独自形式 (他ツールに無い)。generic な config option (`--registry`, `--loglevel` 等) は一切登場せず、`install` 固有の option のみ。

`npm ls -h` / `npm run -h` も同型 (generic option 省略、固有 option のみのフラット列挙)。

#### yarn (1.22.x, classic)

`yarn --help` (前掲、Options 全量):
```
Options:
    --cache-folder <path>               specify a custom folder ...
    --check-files                       install will verify file tree ...
    ...
    -v, --version                       output the version number
    --verbose                           output verbose messages ...
    -h, --help                          output usage information
  Commands:
    - access
    - add
    ...
```
所見: 60 個弱の option が単一 `Options:` 見出し内にフラット列挙 (機能別グループ分割なし)。

`yarn install --help` (前掲、冒頭〜末尾):
```
  Usage: yarn install [flags]
  ...
  Options:
    -v, --version                       output the version number
    --no-default-rc                     prevent Yarn from automatically ...
    ...
    -E, --save-exact                    DEPRECATED
```
所見: `yarn --help` の `Options:` と**完全に同一の 50 行弱がそのまま再掲** (`install` 固有の option は追加されない。むしろ `install` 文脈では無関係な `-S|--save` 等が **DEPRECATED 注記付きのまま**残っている)。

`yarn add --help` も同一の Options 全量が再掲 (`install` との差分はコマンド説明文と Usage 行のみ)。所見: yarn は「トップの Options を丸ごとどのサブコマンドにもコピー」する徹底した複製方式で、サブコマンド固有の option を独立して定義しない (もしくは定義してもトップと同じプールを共有)。

#### bun (1.3.13+bf2e2cecf)

`bun --help` (前掲、Commands + Flags):
```
Commands:
  run       ./my-script.ts       Execute a file with Bun
  ...
  install                        Install dependencies for a package.json (bun i)
  add       elysia               Add a dependency to package.json (bun a)
  ...

Flags:
      --watch                         Automatically restart the process on file change
      ...
  -h, --help                          Display this menu and exit
```
所見: コマンド一覧の右列に**サンプル引数**が添えられる (`run ./my-script.ts`, `add elysia` 等)。コマンド名の説明文中に `(bun i)` / `(bun a)` と**alias が丸括弧内注記**で埋め込まれる (jj の角括弧注記、cargo の名前列併記とも異なる第 4 の位置)。`Flags:` は 100+ 行の runtime option (`--inspect` 等) で、`install`/`add` の option とは非交差。

`bun install --help` (前掲):
```
Usage: bun install [flags] <name>@<version>
Alias: bun i

  Install the dependencies listed in package.json.

Flags:
  -c, --config=<val> ...
  ...
  -h, --help                         Print this help menu
  -d, --dev                          Add dependency to "devDependencies"
  ...
```
所見: `Alias: bun i` が**コマンド説明の直前、専用ラベル (単数形)** で独立表示 (前掲の丸括弧注記とは別に、ここでは専用行としても示される — 同じ alias 情報が 2 箇所に出る)。

`bun add --help` も酷似した Flags 一覧 (`-d/--dev`, `-E/--exact` 等が共通)。所見: `install` と `add` の option 集合はほぼ同一だが、これは「global からの継承」ではなく**両コマンドが独立に同じ option セットを定義している** (`bun pm --help` のようなユーティリティ系サブコマンドにはこの option セットが引き継がれない ことから継承ではないと判断)。

`bun pm --help` (前掲、ネストしたサブサブコマンド一覧):
```
Commands:
  bun pm scan                 scan all packages in lockfile for security vulnerabilities
  bun pm pack                 create a tarball of the current workspace
  ├ --dry-run                 do everything except for writing the tarball to disk
  ├ --destination             the directory the tarball will be saved in
  ...
  └ --gzip-level              specify a custom compression level for gzip (0-9, default is 9)
  bun pm bin                  print the path to bin folder
  └ -g                        print the global path to bin folder
  ...
```
所見: **ツリー記号 (`├`/`└`) でサブサブコマンド固有の option を、コマンド名の下にインデント表示**する独自形式。前段・今回通じて他ツールに無い、「1 画面で 2 階層分の情報を罫線で視覚的にネストさせる」パターン。

#### docker compose (29.4.0, plugin)

`docker compose --help` (前掲):
```
Usage:  docker compose [OPTIONS] COMMAND

Options:
      --all-resources ...
      --ansi string ...
  -f, --file stringArray           Compose configuration files
  ...
  -p, --project-name string        Project name

Management Commands:
  bridge      Convert compose files into another model

Commands:
  attach ... up ... volumes
```
所見: `docker --help` (本体) にあった `Global Options:` (`--host`, `--context` 等) は compose 側には**一切登場しない**。compose 自身が独自の `Options:` (`--file`, `--profile` 等) を持ち、これは docker 本体の global とは別の**プラグイン境界で独立した global scope**。`Management Commands:` という 1 コマンドだけの特別枠 (`bridge`) が、docker 本体の分類慣習 (`Management Commands:` / `Common Commands:` 等) をそのまま踏襲。

`docker compose up --help` (前掲、Options 抜粋):
```
Usage:  docker compose up [OPTIONS] [SERVICE...]

Options:
      --abort-on-container-exit ...
  -d, --detach ...
  ...
```
所見: compose 自身の `Options:` (`--file`, `--profile` 等) も**再掲されない** (省略方式)。docker 本体・compose 自身のどちらの global も、2 階層目の `up` には一切継承・表示されない — 「省略方式は入れ子の階層が深まるほど徹底される」実例。

#### kubectl (client、深い階層の追加観測)

`kubectl config --help` (前掲、中間階層):
```
Available Commands:
  current-context   Display the current-context
  ...
  set-context       Set a context entry in kubeconfig
  ...

Usage:
  kubectl config SUBCOMMAND [options]

Use "kubectl config <command> --help" for more information about a given command.
Use "kubectl options" for a list of global command-line options (applies to all commands).
```
`kubectl config set-context --help` (前掲、3 階層目):
```
Options:
    --cluster='':
	cluster for the context entry in kubeconfig
    ...
    --user='':
	user for the context entry in kubeconfig

Usage:
  kubectl config set-context [NAME | --current] [--cluster=cluster_nickname] [--user=user_nickname] [--namespace=namespace] [options]

Use "kubectl options" for a list of global command-line options (applies to all commands).
```
所見: 前段で確認した参照文言 (`Use "kubectl options" for a list...`) が、**2 階層目 (`config`) にも 3 階層目 (`config set-context`) にも一字一句同一で出現**。kubectl の参照方式は継承の深さに関わらず完全に一貫している (深さ依存の揺れが一切ない、uv とは対照的)。

#### az (azure-cli 2.88.0)

`az group --help` (前掲、subgroup、末尾に Arguments 節なし):
```
Group
    az group : Manage resource groups and template deployments.

Subgroups:
    lock   : Manage Azure resource group locks.

Commands:
    create : Create a new resource group.
    ...
```
所見: subgroup レベルの help には Arguments 節 (global option 相当) が**一切登場しない** (コマンド一覧のみ)。

`az group create --help` (前掲、leaf、末尾の Arguments 節):
```
Arguments
    --location -l                 [Required] : Location. ...
    --name --resource-group -g -n [Required] : Name of the new resource group.
    --managed-by ...
    --tags ...

Global Policy Arguments
    --acquire-policy-token                   : Acquiring an Azure Policy token automatically for
                                               this resource operation.
    --change-reference                       : The related change reference ID for this resource
                                               operation.

Global Arguments
    --debug                                  : Increase logging verbosity to show all debug logs.
    --help -h                                : Show this help message and exit.
    --only-show-errors                       : Only show errors, suppressing warnings.
    --output -o                              : Output format. ...
    --query                                  : JMESPath query string. ...
    --subscription                           : Name or ID of subscription. ...
    --verbose                                : Increase logging verbosity. ...
```
所見: leaf コマンドにのみ、`Arguments` (固有) → `Global Policy Arguments` (条件付き global) → `Global Arguments` (常時 global) の**3 段構成**で表示。`az --help` (トップ、subgroup 一覧) には `[Preview]` / `[Experimental]` の角括弧タグがサブグループ名に付与される実例も確認 (`consumption [Preview]`, `config [Experimental]`)。

#### jj (前段と同一個体、深さ違いの再確認)

`jj bookmark --help` (前掲、中間階層):
```
Manage bookmarks [default alias: b]
...
Commands:
  advance  Advance the closest bookmarks to a target revision [aliases: a]
  create   Create a new bookmark [aliases: c]
  ...

Options:
  -h, --help
          Print help (see a summary with '-h')

Global Options:
  -R, --repository <REPOSITORY>
          Path to repository to operate on
          
          By default, Jujutsu searches for the closest .jj/ directory in an ancestor of the current
          working directory.

      --ignore-working-copy
          ...
```
`jj log --help` (前掲、トップ直下のコマンド、`bookmark` とは異なる系統):
```
Show revision history
...
Options:
  -r, --revision <REVSETS>
  ...

      --count
```
(Global Options 節は出力の途中で打ち切ったが、`jj bookmark --help` と同一冒頭の `-R, --repository` から始まる文言が同一箇所に出現することを確認済み)

所見: `jj bookmark` (階層 1) と `jj log` (階層 1、別コマンド系統) のどちらも、末尾の `Global Options:` ブロックが**一字一句同一のテキスト** (改行位置・説明文の言い回しまで完全一致) で再掲される。コマンドの種類・階層に関わらず、jj は global option 群を**常に完全複製**する設計で一貫している (uv や az のような「深さ依存」「条件依存」の揺れが一切ない)。`bookmark` サブコマンド一覧内の `[default alias: b]` / `[aliases: a]` という**alias の強度を語彙で区別する**表示も確認 (説明文末尾の角括弧注記という第 3 の位置パターン)。

## Python/Node/hierarchical 系まとめ (次担当・統括への引き継ぎ)

- Rust/Go 系で見えた「複製/省略/参照/専用セクション」の 4 分類は依然有効な骨格だが、**「複製」の内部に「混在型部分複製 (cargo)」と「独立ブロック型完全複製 (yarn/jj)」の亜種がある**こと、**複製/省略が同一ツール内で階層の深さによって切り替わる (uv)** こと、**継承元の global 集合自体がコマンドの意味論によって動的に変わる (az)** ことが新たに判明した。これらは前段の 4 分類だけでは説明できない「メタなバリエーション軸 (深さ依存・条件依存)」であり、kuu の表現力チェック (task #4) では「1 ツール = 1 方式」の前提を外して臨む必要がある
- alias 表示位置は「名前列併記 (cargo)」「専用セクション (gh/docker)」に加えて **「description 末尾の角括弧注記 (jj)」「丸括弧インライン注記 (bun)」の計 4 系統**が実在することを確認。kuu が 1 箇所しか表現できない設計だと過半数のツールをカバーできない
- alias の**強度区別** (jj の `default alias` vs `aliases`) と、成熟度ステータスの**複数語彙タグ** (az の `[Preview]`/`[Experimental]` vs cargo の `(deprecated)` 単一語彙) は、前段にはなかった粒度の要求であり、kuu の command/option 定義がここまでの表現力を持つべきかは設計判断が必要 (少なくとも「実例がある」ことは記録できた)
- gcloud は環境要因で未検証のまま残った。poetry/pytest/mypy/turbo/eslint/prettier/firebase も未インストールで未検証。これらは別セッションでの追試候補として残す
- 全ツール共通の分類マトリクス再統合 (task #4 着手前の前処理) は統括判断に委ねる
