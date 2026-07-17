# CLI パーサ help 語彙の横断調査 (12 系統 + 参考 2) — help model 設計の一次資料

> 由来: kawaz 発題 (2026-07-17)「help_group_name / help_group_order / help_order くらいはどうせ必要になるんじゃないの？各言語のメジャーやモダンな CLI パーサの大規模リサーチは済んでるの？」。HELP-Q3 (help グループ語彙の v1 採否) の判断材料。前半 (clap / argparse+click+typer / cobra+urfave / commander+yargs / picocli) と後半 (System.CommandLine / thor+optparse / Swift ArgumentParser / shell 慣習 / cliffy+kong+bpaf+oclif) を並列調査し結合した。

## 統合サマリ (両バッチの収束点)

1. **短/長説明の 2 本立ては多数派**: clap (about/long_about, help/long_help)、thor (desc/long_desc)、Swift AP (abstract/discussion)、oclif (summary/description)、cobra (Short/Long)。単一説明は argparse・System.CommandLine 等。-h/--help の出し分けと双方向フォールバックまで持つのは clap
2. **グループ見出し (help_group_name 相当) は過半数が保有**: clap help_heading / argparse add_argument_group / typer rich_help_panel / cobra Group (コマンド用) / yargs .group / picocli sectionKeys / Swift AP @OptionGroup(title:) / cliffy .group / kong group / oclif helpGroup。**click 無印と System.CommandLine が持たない**のは反例として重要
3. **グループ順序 (help_group_order 相当) の明示 API はほぼ皆無**: 大半は「宣言順 / 呼び出し順」。**唯一 Go kong が Groups スライス順による明示制御** (Group{Key,Title,Description} の一元管理) を持つ
4. **項目表示順 (help_order 相当) の数値指定は少数派**: clap display_order と picocli @Option(order=N) のみ。他は宣言順
5. **セクション拡張 (before/after/epilog/examples) は普遍的**、metavar/value_name 相当も普遍的 (kuu は value_name 既存で対応済み)

以下、各バッチの原文。

---

# CLI help 語彙リサーチ (前半5系統): clap / argparse+click+typer / cobra+urfave-cli / commander+yargs / picocli

kuu (言語非依存 CLI 引数定義 spec) の help 語彙設計の一次資料。各系統の公式ドキュメント・ソースコード docコメントを当たった。version は調査時点 (2026-07) の最新安定系列。

**kawaz が名指しした `help_group_name` / `help_group_order` 相当の対応表** (詳細は各節):

| 系統 | グループ名の指定 | グループ表示順の指定 |
|---|---|---|
| clap v4 | `Arg::help_heading` (個別) / `Command::next_help_heading` (以降のデフォルト) | グループ自体の順序制御は無い。グループ内の個々の Arg は `display_order`/`next_display_order` |
| argparse | `add_argument_group(title, description)` | 明示 API 無し、`add_argument_group()` を呼んだ順 |
| click (無印) | ネイティブ機能無し (後述) | ネイティブ機能無し |
| typer | `rich_help_panel="名前"` | 明示 API 無し。定義順 + 固定ルール (後述) |
| cobra | `Group{ID, Title}` を `AddGroup()` で定義、コマンド側は `GroupID` で参照 | `AddGroup()` を呼んだ順がそのまま表示順 |
| urfave/cli | `Category` (文字列のみ) | 明示 API 無し (推定: 出現順) |
| commander.js | `Option#helpGroup()` / `helpGroupHeading` (詳細下記、未確認箇所あり) | 未確認 |
| yargs | `.group(keys, groupName)` | 明示 API 無し、`.group()` を呼んだ順 |
| picocli | `@Command.optionListHeading` 等セクション単位の heading (グループ化そのものは別機構 `@ArgGroup`) | `sortOptions=false` + `@Option(order=N)` |

---

## 1. Rust clap v4 (v4.5系, 2026-07時点)

出典: [docs.rs/clap](https://docs.rs/clap/latest/clap/) / [clap_builder/src/builder/command.rs](https://github.com/clap-rs/clap/blob/master/clap_builder/src/builder/command.rs) / [arg.rs](https://github.com/clap-rs/clap/blob/master/clap_builder/src/builder/arg.rs) doc comment。

### 短い説明 / 長い説明の分離 (about vs long_about 型)

- `Command::about` — "Sets the program's description for the short help (`-h`)." `long_about` 未設定なら `--help` にもこれが出る。
- `Command::long_about` — "Sets the program's description for the long help (`--help`)." `about` 未設定なら `-h` にもこれが出る (双方向フォールバック)。
- `Arg::help` / `Arg::long_help` も同型の関係 (`-h` 用 1 行 / `--help` 用複数行、互いにフォールバック)。
- 注記: 補完スクリプト生成では簡潔さのため常に短い方 (`about` / `help`) のみが使われる。

### オプションのグループ見出し

- `Arg::help_heading` — "Override the `--help` section this appears in." (個々の Arg に対する明示指定)
- `Command::next_help_heading` — "Set the default section heading for future args." (以降に追加される Arg のデフォルト見出しを変更。個別の `help_heading` が優先)
- サブコマンド版は `Command::subcommand_help_heading` (今回 doc 本文は取得できず、名前と用途から Command::next_help_heading のサブコマンド版と推定。**未確認**)
- グループの表示順そのものを操作する専用 API は無い (`next_help_heading` を呼ぶたびに以降の Arg のグループが切り替わる、という逐次モデル)

### 表示順の明示指定 (display_order 型)

- `Arg::display_order` — "Allows custom ordering of args within the help message." 値が小さいほど先に表示。同値はソートされる。位置引数には無効 (常に index 順)。
- `Command::next_display_order` — "Change the starting value for assigning future display orders for args." 個別の `display_order` が未設定の Arg に適用。
- 粒度: **Arg 単位** (グループ単位の一括指定は無い、`next_display_order` は「以降のデフォルト値」を変えるだけ)

### usage 行の自動生成と override

- `Command::override_usage` — "Overrides the `clap` generated usage string for help and error messages." 設定すると自動生成 usage は完全に無効化され、これだけが唯一表示される。複数行時のインデント規則あり (1行目インデント無し、2行目以降7スペース)。

### セクション拡張

- `Command::before_help` / `before_long_help` — "Free-form help text for before auto-generated short/long help." ヘッダー・著作権表示等に使う。
- `Command::after_help` / `after_long_help` — 自動生成ヘルプの後に出す自由形式テキスト。追加の使用法説明・注意事項・連絡先等。
- `Command::override_help` — "Overrides the `clap` generated help message (both `-h` and `--help`)." 自動生成では不十分な場合のみ使うべき、と明記。現在のコマンドのみに効き、サブコマンドには別途必要。
- `Command::help_template` — ヘルプ全体のテンプレート文字列を差し替える。プレースホルダタグ例: `{name}` `{version}` `{author}` `{about}` `{usage-heading}` `{usage}` `{all-args}` `{options}` `{positionals}` `{subcommands}` `{before-help}` `{after-help}`。`{bin}` は非推奨。

### metavar / value_name

- `Arg::value_name` — "Placeholder for the argument's value in the help message / usage." 表示専用で実引数アクセスには関与しない。`FILE` `INTERFACE` のような全大文字が慣例。暗黙に `ArgAction::Set` を設定する副作用がある (= 値を取る Arg であることを暗に宣言)。
- `Arg::value_names` — 複数値を取る Arg 用に個別の名前を並べる版 (doc 本文取得できず、シグネチャのみ確認)。

### hidden / 出し分け

- `Arg::hide` — "Do not display the argument in help message." ただし **エラー時の usage 文字列からは隠されない** (エラーメッセージには出る)、という重要な非対称性。
- `Arg::hide_short_help` — `-h` からのみ隠す (`--help` には出る)。usage からは隠されない。設定すると `--help` 呼び出し時に next-line-help スタイルが強制される副作用あり。
- `Arg::hide_long_help` — 逆に `--help` からのみ隠す (`-h` には出る)。
- `Command::hide` 相当 (`is_hide_set` の存在は確認できたが doc 本文は取得不可、**未確認**。用途はサブコマンド自体をヘルプ一覧から隠すことと推定)

### 特殊機能

- **man/completion 生成**: 公式エコシステムの別クレート `clap_mangen` (man page = roff 形式を生成) と `clap_complete` (シェル補完スクリプト。bash/zsh/fish/PowerShell/elvish/Nushell 対応)。どちらも `Command` を `CommandFactory::command()` 経由で取得し `build.rs` や隠しサブコマンドから呼ぶのが典型パターン。
- 旧 `clap_generate` クレートが両機能の前身で、現在は clap モノレポに統合。

---

## 2. Python argparse + click + typer

### 2-1. argparse (Python 3.14 系ドキュメント時点)

出典: [docs.python.org/3/library/argparse.html](https://docs.python.org/3/library/argparse.html)

- **短い説明/長い説明の分離**: `description=` (usage 行の下)、`epilog=` (オプション一覧の後のフッター)。both の折り返しは `formatter_class` で制御。one-line 相当の区別は無い (argparse に about/long_about のような二段階は無い)。
- **オプションのグループ見出し**: `add_argument_group(title=None, description=None)`。返るグループオブジェクトは通常同様 `add_argument()` を持ち、追加した引数はヘルプで別セクション表示になる。**名前はあるが順序を明示指定する API は無い**、呼び出し順がそのまま表示順。
  - 関連: `add_mutually_exclusive_group(required=False)` — 相互排他 (usage 行で `[--foo | --bar]` または必須なら `(--foo | --bar)`)。グループ自体は title/description 非対応だが、title 付き argument group の中にネストして追加可能。
  - Python 3.14 で argument group / mutually exclusive group の**ネスト呼び出しは例外化**(廃止)。
- **表示順の明示指定**: 無い (定義順固定)。
- **usage 行の override**: `usage=` キーワード引数。`%(prog)s` フォーマット指定子が使える。
- **セクション拡張**: `description` / `epilog` のみ。before-help 相当は無い。
- **metavar**: `metavar=` (単一 or tuple で `nargs` の各要素に別名)。`choices` 指定時は自動的に選択肢一覧が metavar 相当の表示になる。
- **hidden / 出し分け**: argparse ネイティブには無い (`argparse.SUPPRESS` を `help=` に渡すとヘルプ本文から除外できるが、これは「非表示オプション」というより「help 文言自体を空にする」仕組み)。`-h` と `--help` の出し分け機構自体も無い (1段階のみ)。
- **特殊機能 (formatter_class 4種)**:
  - `RawDescriptionHelpFormatter` — description/epilog のみ整形済み扱い (折り返さない)
  - `RawTextHelpFormatter` — 引数の help テキストも含め空白を保持 (連続改行は1つに縮約)
  - `ArgumentDefaultsHelpFormatter` — 各引数の説明にデフォルト値を自動追記
  - `MetavarTypeHelpFormatter` — metavar に dest でなく `type=` の名前を使う

### 2-2. click (最新安定版)

出典: [click.palletsprojects.com](https://click.palletsprojects.com/en/stable/documentation/) / API リファレンス

- **短い説明/長い説明の分離**: `help=` (docstring から自動採取、コマンド詳細説明) と `short_help=` (グループのサブコマンド一覧に出す要約)。`short_help` 未指定時は docstring 先頭文を自動抽出し、長すぎれば `...` で省略。
- **オプションのグループ見出し**: **ネイティブ機能なし**。click 本体には argparse の `add_argument_group` に相当する「オプションをヘルプ上でグループ化する」機能が存在しない (`click.Group` はサブコマンドのグループであって、フラグ/オプションの表示グループとは別概念)。この用途には外部拡張 `rich-click` 等が必要 (`rich_click` 側にオプショングループ機能がある)。**kuu の help_group_name/help_group_order を検討する上で「argparse 系でもグループ化がネイティブ標準とは限らない」重要な反例**。
- **表示順**: ネイティブ指定 API 無し (定義順)。
- **usage override**: `options_metavar=` (usage 行の `[OPTIONS]` 部分を書き換え)。
- **セクション拡張**: `epilog=` (末尾)。before-help 相当は無し。`\f` (フォームフィード) マーカーで docstring の一部をヘルプから切り捨てる仕組みがある (= 「ここから先はコード内コメント、ヘルプに出さない」区切り)。
- **metavar**: `metavar=` (パラメータ単位)。
- **hidden**: `Command(hidden=True)` — "hide this command from help outputs." (親グループのサブコマンド一覧から除外)。Option/Argument 側の `hidden` も存在する (API に定義はあるが、doc 本文の詳細取得は不可、**未確認**)。
- **特殊機能**: `show_envvar=True` で紐づく環境変数をヘルプに表示 (`[env var: USERNAME]`)。`\b` で段落の自動再折返しを無効化。

### 2-3. typer (最新安定版)

出典: [typer.tiangolo.com](https://typer.tiangolo.com/tutorial/commands/help/)

typer は click の上に構築されており、多くは click 由来。typer 固有の付加価値は Rich 連携。

- **短い説明/長い説明**: コマンドの説明は docstring が基本、`@app.command(help="...")` で明示上書き可能 (docstring より優先)。アプリ全体は `typer.Typer(help="...")`。click のような help/short_help 二段階の概念は typer レベルでは前面に出てこない (内部は click 継承と推定、**未確認**)。
- **オプションのグループ見出し**: `rich_help_panel="名前"` — コマンド単位・パラメータ単位の両方に指定可能。**表示順は明示 API 無し**、固定ルールとして「デフォルトの Arguments パネル → カスタム引数パネル → デフォルトの Options パネル → カスタムオプションパネル」の順に並ぶ。
- **表示順の明示指定**: 上記ルール以外に個別の順序指定 API は確認できず。
- **usage override**: 専用 API は未確認 (click 由来の仕組みに委譲していると推定)。
- **セクション拡張**: `epilog=` (Rich markup 込みで書ける、例: `epilog="Made with :heart: in [blue]Venus[/blue]"`)。
- **metavar**: 個別の言及なし (click 由来と推定、**未確認**)。
- **hidden**: `@app.command(hidden=True)` の存在に言及したが、当該ページに詳細記述は無し (**未確認、click の Command(hidden=True) 相当と推定**)。
- **特殊機能**:
  - Rich Markup モード (`rich_markup_mode="rich"`、デフォルト) — `[bold green]...[/bold green]` 等の装飾、絵文字ショートコード対応
  - Markdown モード (`rich_markup_mode="markdown"`) — Markdown 記法対応だが色指定は不可 (Rich markup 併用が必要)
  - `deprecated=True` でヘルプに "(deprecated)" 表示
  - v0.20.0 以降、タイプミス時に `difflib.get_close_matches()` でコマンド候補を自動提案 (`suggest_commands=False` で無効化可)

---

## 3. Go cobra + urfave/cli

### 3-1. cobra (最新安定版)

出典: [pkg.go.dev/github.com/spf13/cobra](https://pkg.go.dev/github.com/spf13/cobra) / [user_guide.md](https://github.com/spf13/cobra/blob/main/site/content/user_guide.md)

- **短い説明/長い説明の分離**: `Short` (親コマンドの一覧・`help` 出力用) / `Long` (`help <command>` 実行時の詳細)。about/long_about と同型の二段階構造。
- **オプションのグループ見出し (= サブコマンドのグループ化)**: `Group{ID, Title}` を親コマンドで `AddGroup(groups ...*Group)` により定義し、子コマンドは `GroupID` フィールドでそれを参照。**グループの表示順は `AddGroup()` を呼んだ順そのまま** (明示的な order 数値は無い、呼び出し順序 = 表示順序というモデル)。組み込みの `help`/`completion` コマンドは `SetHelpCommandGroupId()` / `SetCompletionCommandGroupId()` で別途グループ割り当て可能。
  - 注意: これは「オプション(フラグ)」のグループ化ではなく「**サブコマンド**」のグループ化。フラグ単位のヘルプ見出しグループ化機能は cobra 本体には無い (pflag 側にも無い、**確認済みの欠落**)。
- **表示順 (フラグ単位)**: 明示 API 未確認。pflag はデフォルトでアルファベット順ソートと推定 (**未確認、要裏取り**)。
- **usage override**: `SetUsageFunc(f func(*Command) error)` / `SetUsageTemplate(s string)` — usage 部分だけの差し替え。`SetHelpFunc` / `SetHelpTemplate` はヘルプ全体。
- **セクション拡張**: `Example` フィールド (使用例、`help` 出力に含まれる)。テンプレート全体を差し替えれば before/after 相当も自作可能だが専用フィールドは無い。
- **hidden / 出し分け**:
  - `Hidden bool` — true でコマンド一覧から除外 (`IsAvailableCommand()` が false になる)
  - `Deprecated string` — 非空なら使用時にその文字列を警告表示
  - `HasAvailableFlags()` 等、hidden/deprecated を除いた「表示すべきか」判定メソッド群が多数用意されている (可視性判定のパターンが体系化されている)
- **特殊機能**:
  - `SuggestFor []string` — エイリアスに似るが「サジェストのみ」(実際には実行できない別名候補)
  - `DisableSuggestions` / `SuggestionsMinimumDistance` — 未知コマンド時の Levenshtein 距離ベース類似コマンド提案の制御
  - `DisableAutoGenTag` — ドキュメント生成時の "Auto generated by spf13/cobra" タグ抑制
  - `Annotations map[string]string` — 任意メタデータ (help 表示に直接使うというより外部ツール連携用)

### 3-2. urfave/cli v3

出典: [cli.urfave.org/v3](https://cli.urfave.org/v3/examples/full-api-example/)

- **短い説明/長い説明の分離**: `Usage` (短い一行説明) / `Description` (詳細な複数行説明)。`UsageText` で usage 行自体を自由記述に置き換え可能 (= cobra の `Use` と override_usage を兼ねた立ち位置)。
- **オプションのグループ見出し**: `Category` (文字列ラベルのみ)。サブコマンドを `Category` でグループ化し、`VisibleCategories()` で取得。**表示順の明示 API は確認できず** (推定: 出現順、**未確認**)。cobra の `Group{ID,Title}` のような構造体は無く、素の文字列一致でグループ化する簡素なモデル。
- **hidden**: `Hidden bool` (true で `VisibleCommands()` から除外)。`HideHelp` / `HideHelpCommand` / `HideVersion` で help/version 関連の表示自体を個別に抑制可能 (= cobra には無い粒度、helpの提供自体をトグルできる)。
- **特殊機能**: `HelpPrinter` / `VersionPrinter` / `FlagStringer` という関数型フィールドで出力ロジック自体を差し替え可能。`RootCommandHelpTemplate` / `CommandHelpTemplate` / `SubcommandHelpTemplate` の3種テンプレートが階層別に分かれている (cobra は Help/Usage の2種、urfave/cli はコマンド階層で3種に分化)。

---

## 4. Node commander + yargs

### 4-1. commander.js (v15系)

出典: [github.com/tj/commander.js README](https://github.com/tj/commander.js/blob/master/Readme.md) / [jsDocs.io v15.0.0](https://www.jsdocs.io/package/commander)

- **短い説明/長い説明の分離**: `.description()` が基本。about/long_about のような二段階構造は無い(1種類のみ)。
- **オプションのグループ見出し**: `Option` クラスに `helpGroup()` メソッドと `helpGroupHeading` の存在を jsDocs API 一覧で確認 (Help クラス側にも `helpGroupHeading` あり)。**詳細な挙動 (順序制御含む) は今回未取得、要追加調査**。README には「サブコマンドのヘルプ見出しをグループ化できる」という記述のみ確認。
- **hidden**: `Option#hideHelp()` — 特定オプションを help 出力から個別に隠す (例: `new Option('-s, --secret').hideHelp()`)。`.hideHelp()` はコマンド全体にも呼べる(全隠し)。
- **表示順**: 明示 API 未確認。
- **usage override**: 専用の override メソッド名は未確認 (`.usage()` で usage 行文字列を直接設定するタイプと推定、**未確認、argparse の usage= と同系統の可能性**)。
- **セクション拡張**: `.addHelpText(position, text)` — position は `before` / `after` / `beforeAll` / `afterAll` 等 (階層違い)。動的コンテンツ(関数)も渡せる(例: 環境依存のヘルプ文言生成)。
- **特殊機能**: `.configureHelp()` でヘルプ生成のグローバル設定、`.formatHelp()` でヘルプ全体の整形ロジック自体を差し替え。`visibleOptions()` はヘルプに表示すべきオプション (hidden 除く) を返す内部 API。

### 4-2. yargs (最新版)

出典: [raw docs/api.md (yargs/yargs)](https://github.com/yargs/yargs/blob/main/docs/api.md)

- **短い説明/長い説明の分離**: `.describe(key, desc)` の1種類のみ (二段階無し)。
- **オプションのグループ見出し**: `.group(key(s), groupName)` — "places options under an alternative heading when displaying usage instructions"。**名前指定のみ、順序を明示制御する API は無い** (呼んだ順、または内部の登録順と推定)。
- **hidden**: `.hide(key)` — ヘルプから隠す。ただし `--help --show-hidden` (`.showHidden()` と対) を渡すと表示される、というエンドユーザー救済経路がある点が独特 (= 隠すが完全には消さない設計思想)。オプション定義時に `hidden: true` でも同じ効果。
- **usage override**: `.usage(message|command, [desc], [builder], [handler])` — `$0` がスクリプト名に置換される (bash/perl の `$0` 相当の語彙)。desc/builder/handler を渡すとデフォルトコマンド定義 (`.command()` のエイリアス) としても機能する多重用途 API。
- **セクション拡張**: `.epilogue(str)` (別名 `.epilog(str)`) — 末尾メッセージ。`.example(cmd, desc)` — 使用例セクション専用の API (`$0` 補間対応、複数まとめて登録可)。commander/click の epilog とは別に **examples 専用セクションを持つのが yargs の特徴**。
- **特殊機能**: `.example()` によるセクション化された使用例 (他系統では epilog に手書きすることが多い機能を構造化 API として提供)。

---

## 5. Java picocli (4.7系)

出典: [picocli.info apidocs (CommandLine.Command)](https://picocli.info/apidocs/picocli/CommandLine.Command.html) / [Quick Guide](https://picocli.info/quick-guide.html)

- **短い説明/長い説明の分離**: `header` (usage synopsis の前、複数行可、サブコマンド一覧では最初の行だけ使われる = about と短縮表示の兼用) / `description` (synopsis の後の詳細説明)。about/long_about のような「-h と --help で出し分け」概念そのものは無い (picocli は `-h`/`--help` を同一表示にするのが標準、1段階ヘルプモデル)。
- **オプションのグループ見出し**: セクション単位の heading 属性群 (`headerHeading` `synopsisHeading` `descriptionHeading` `parameterListHeading` `optionListHeading` `commandListHeading` `footerHeading` 等) で各固定セクションの見出し文言をカスタマイズできる。ただし「複数オプションを任意の名前のグループに束ねる」機能は **`@ArgGroup` という別のアノテーション**が担当 (相互排他/同時指定必須などの意味論を持つグループで、ヘルプでは `heading` 属性を持つ。**今回のリサーチ対象外だったため詳細未調査、別途確認が必要**)。
- **表示順の明示指定**: `sortOptions=false` (デフォルト true = アルファベット順) を `@Command` に指定した上で、各 `@Option(order=N)` で数値指定。値が小さいほど先。**Option 単位の粒度**、グループ単位の一括指定 API は無い。注記: `@Option` がフィールドとメソッド混在の場合、宣言順を確実に検出できない、という制約が明記されている。
- **usage 行の自動生成と override**: `usageHelpAutoWidth` (true でターミナル幅自動検出、デフォルト false、Java 7+ 必須) / `usageHelpWidth` (固定幅指定、デフォルト 80)。usage 行そのものの完全 override 用の専用属性は今回未確認 (テンプレート的な `synopsisHeading` 等で部分制御する思想が強い、**clap の override_usage のような一括置換 API は無いと推定、未確認**)。
- **セクション拡張**: `header` / `footer` / `description` に加え、`UsageMessageSpec` が持つ固定セクション順序 (`HEADER_HEADING → HEADER → SYNOPSIS_HEADING → SYNOPSIS → DESCRIPTION_HEADING → DESCRIPTION → PARAMETER_LIST → OPTION_LIST → COMMAND_LIST → EXIT_CODE_LIST → FOOTER_HEADING → FOOTER`) を `sectionKeys()` / `sectionMap()` で並べ替え・カスタムセクション追加可能 (= 他系統に比べ最も構造化されたセクションモデル)。
- **metavar / value_name**: `paramLabel` — 省略時はフィールド名を `<` `>` で囲んだものがデフォルト。オプション必須性に応じて `[` `]` (省略可) や `...` (複数値) を自動付加、`hideParamSyntax` で抑制可能。
- **hidden / 出し分け**: `@Command` `@Option` `@Parameters` 全てに共通の `hidden` 属性。`-h`/`--help` の出し分け (short/long help の二段階) という概念自体が無いため、hide も一段階 (完全に出す/出さないのみ)。
- **特殊機能**:
  - `mixinStandardHelpOptions=true` — `-h/--help` と `-V/--version` を自動追加するショートカット (i18n 用の `descriptionKey` も定義可能)
  - `showDefaultValues` — オプション説明にデフォルト値を自動追記 (boolean 除く)。3.2 以降は個別に説明文中へ埋め込むことも可能
  - `helpCommand=true` — サブコマンドを「ヘルプコマンド」指定すると親の必須オプション検証がスキップされる (= `--help` 相当だがサブコマンド形式の CLI 向け特別扱い)
  - `versionProvider` — 実行時動的バージョン情報 (JAR マニフェスト等から取得)
  - **man page 生成**: `picocli-codegen` モジュールの `ManPageGenerator` (4.2.0〜) が **AsciiDoc** (Markdown ではない) 形式で生成、asciidoctor で HTML/PDF/man に変換。4.4 以降はサブコマンドとして組み込み可能。ロケール指定 (`user.language`/`user.country`) でローカライズ済み man page 生成にも対応。テンプレートファイルによる生成内容+手動編集のハイブリッド運用も可能。
  - 色 (Ansi) 関連は `Help.Ansi` / `Help.ColorScheme` の存在をシグネチャ経由で確認したが詳細は未取得 (**未確認**)。

---

## 未確認事項まとめ (追加調査が必要な場合の TODO)

- clap: `Command::hide` (Command 単位の hidden) の doc 本文、`subcommand_help_heading`/`subcommand_value_name` の doc 本文
- click: Option/Argument の `hidden` パラメータの詳細挙動 (補完への影響含む)
- typer: help/short_help 二段階の有無、metavar 相当、usage override の有無 (click 継承と推定だが未確認)
- cobra: フラグ単位の表示順 API の有無 (pflag 側の挙動)
- urfave/cli: Category の表示順制御 API の有無
- commander.js: `helpGroup()`/`helpGroupHeading` の詳細挙動 (順序制御含む)、usage override 専用 API の有無
- picocli: `@ArgGroup` のヘルプ表現 (heading 等)、usage 行の完全 override API の有無、`Help.Ansi`/`Help.ColorScheme` の詳細
# CLI help 語彙・機能リサーチ (後半5系統)

kuu (言語非依存 CLI 引数定義 spec) の help 語彙設計のための一次資料調査。
担当: C# System.CommandLine / Ruby thor+optparse / Swift ArgumentParser /
shell 系慣習 (GNU/help2man, fish, bash) / モダン系 (Deno cliffy + Go kong)。

各系統で **help_group_name / help_group_order / help_order 相当の機能の有無**
を必ず確認する (kawaz 名指しの観点)。見つからない観点は「未確認」と明記する
(推測で埋めない)。

---

## 1. C# System.CommandLine (2.0.0-beta4 系 / 2.0 GA トラック混在に注意)

**version 注記**: System.CommandLine は 2.0 が長期 beta のまま推移しており、
`HelpBuilder.CustomizeLayout` / `CustomizeSymbol` は beta4 系 API、2.0 GA
トラックでは `HelpAction` を wrap するやり方に変わっている。以下は両方に
言及する。バージョン差分がある点は明記。

### 短い説明 / 長い説明の分離

- `Description` プロパティ 1 個のみ。abstract/discussion のような **2 段階
  分離は無い**。Command / Option / Argument いずれも単一の `Description`
  文字列を持つ
- ただしヘルプ本文の記述量はセクション単位でカスタマイズ可能 (下記)

### metavar 相当

- `Option.HelpName` (旧版では `Argument.HelpName` は internal で
  `ArgumentHelpName` 経由が必要だった、という API 変遷あり) が値表示名を
  制御する。例: `--file <FILEPATH>`
- `AcceptOnlyFromAmong(...)` で許容値リストを与えると `--color
  <Black|Red|White|Yellow>` のように選択肢がそのまま表示名になる

### hidden / 出し分け

- `Hidden` プロパティ (旧版では `IsHidden`) で Command/Option/Argument を
  ヘルプ・補完から除外。ただしコマンドライン上は指定可能 (完全な秘匿ではない)

### グループ見出し (help_group_name 相当)

- **無い**。公式ドキュメント自身が「picocli の `@ArgGroup` のような
  built-in のオプショングループ概念は無い」と明言。グループ化したい場合は
  **サブコマンドで表現する**のが推奨パターン (= コマンドをエリア/グルーピング
  識別子として使う)
- 見出しが欲しい場合は `HelpBuilder.CustomizeLayout` でセクションを丸ごと
  追加/差し替えして自前実装するしかない (= 宣言的な属性ではなく手続き的な
  layout 差し替え)

### 表示順 (help_order 相当)

- **宣言的な `order` 属性は無い** (Java picocli の
  `@Command(sortOptions=false)` + `order` 属性と対比すると明確な差)
- 既知の issue として、alias のソートが `alias` → `prefix` の順になっており
  宣言順ではなくアルファベット順になる quirk が報告されている (= 開発者が
  意図せず順序を制御できない不満の実例)
- 順序を変えたい場合は `HelpBuilder` の layout/section を丸ごとカスタマイズ
  するしかない

### usage 行

- 自動生成、`Arity` (ArgumentArity: Zero / ZeroOrOne / ExactlyOne / ZeroOrMore
  / OneOrMore、またはカスタム min/max) から usage 表現が導出される
- usage 行自体の override 手段は layout カスタマイズ経由 (専用プロパティは
  未確認)

### セクション拡張

- `HelpBuilder.CustomizeLayout` (beta4) で `HelpBuilder.Default.GetLayout()`
  を `.Skip(1)` 等で操作し、先頭/末尾にセクション追加や差し替えが可能
  (例: Description セクションを Figlet ASCII art に差し替え)
- 2.0 GA トラックでは `UseHelp` に渡す `HelpAction` を wrap するパターンに
  変更されている (per-symbol 表示のカスタムアクションを前後に噛ませる)

### 特殊機能

- man/Markdown 生成、色、幅制御、i18n: **公式ドキュメントで明確な言及は
  未確認** (i18n 対応は `System.CommandLine.Localization` 系が過去に議論
  されていたが 2.0 系での状態は未確認)

### 出典

- [How to customize help in System.CommandLine (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/commandline/how-to-customize-help)
- [HelpBuilder Class (Microsoft Learn API reference)](https://learn.microsoft.com/en-us/dotnet/api/system.commandline.help.helpbuilder?view=system-commandline)
- [HelpBuilder.Default Class](https://learn.microsoft.com/en-us/dotnet/api/system.commandline.help.helpbuilder.default?view=system-commandline)
- [Customizing Help Output (DeepWiki 解説)](https://deepwiki.com/dotnet/command-line-api/7.2-customizing-help-output)
- [System.CommandLine 2.0 Beta 2 announcement (GitHub issue #1537)](https://github.com/dotnet/command-line-api/issues/1537)
- [Command-line syntax overview (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/commandline/syntax)
- [Inconsistent ordering of option aliases in help text (GitHub issue #860)](https://github.com/dotnet/command-line-api/issues/860)

---

## 2. Ruby thor (1.5.0 系) + optparse (Ruby 3.4 系 stdlib)

### 2-a. thor

短い説明 / 長い説明の分離:

- **`desc(usage, description)`** — 次に定義するコマンドの usage と短い説明
- **`long_desc(long_description, options={})`** — 長い説明を別途定義。
  `:for` オプションで既存コマンドの長文説明を後から差し替え可能
- つまり thor は abstract (desc の description 部) / discussion (long_desc)
  の **2 段階分離を持つ** (Swift ArgumentParser の abstract/discussion と
  同型の設計)
- 実装上の注意: `desc` を呼ばずにメソッドを定義すると
  "Attempted to create command ... without usage or description" という
  warning が出る (= コマンド登録に説明必須という設計判断)

オプション定義:

- **`method_option`** (alias: `option`) — 個別コマンドのオプション。
  `:desc` (説明) / `:required` / `:default` / `:aliases` / `:type`
  (:string, :hash, :array, :numeric, :boolean) / `:banner` (usage 表示文字列
  = metavar 相当) / **`:hide`** (ヘルプから隠す) を持つ
- **`class_option`** — 全コマンド共通のオプション (= global option 相当)

### hidden / 出し分け

- `method_option` の `:hide` キーで個別オプションをヘルプから除外可能

### グループ見出し (help_group_name 相当)

- **thor 本体の `method_option`/`class_option` レベルには見当たらず**
  (= コマンド単位のグルーピングは別クラス `Thor::Group` が担う設計で、
  「1 個の Description 文字列を持つコマンド群を一括実行する」ためのもので
  ヘルプ表示上の見出しグループではない)
- オプション単位のグループ見出し機能は **未確認** (公式 API ドキュメントに
  group 系キーの言及なし)

### 表示順 (help_order 相当)

- **宣言順**で表示される設計 (明示的な order 属性は無い、コード定義順が
  そのまま反映される一般的な Ruby DSL の挙動)

### 出典

- [RubyDoc.info — Thor class (1.5.0)](https://www.rubydoc.info/gems/thor/Thor)
- [Thor ホームページ](http://whatisthor.com/)
- [Building a Ruby CLI with Thor (MarsBased)](https://marsbased.com/blog/2020/04/27/building-ruby-cli-thor)

### 2-b. optparse (Ruby stdlib)

banner (usage 行相当):

- `banner` 属性 = 「summary に先行する見出し」。デフォルトは
  `"Usage: #{program_name} [options]"`

グループ見出し (help_group_name 相当):

- **`separator(string)`** — summary に区切り文字列 (見出し) を挿入する。
  実装は `top.append(string, nil, nil)` という単純なもので、構造化された
  「グループ」オブジェクトではなく **単なる文字列行の埋め込み**
- 典型パターン: `opts.separator ""` → `opts.separator "Specific options:"`
  → 関連オプション群を `on` で定義、という手続き的な見出し構築
- つまり optparse の「グループ」は **宣言的なメタデータではなく、コード上の
  記述順序に依存した文字列差し込み**という設計 (help_group_name のような
  名前付きプロパティは無い)

表示順 (help_order 相当):

- **`on_head`** (= `define_head` の別名。先頭に挿入) / **`on`** (通常、
  宣言順に中間へ追加) / **`on_tail`** (= `define_tail` の別名、末尾に追加)
  の 3 段階の位置指定がある
- これは「先頭固定」「末尾固定」「その他は宣言順」という **粗い 3 レベルの
  順序制御**であり、任意の数値順序 (help_order のような) ではない
- 典型用途: `on_head` は全員が使う共通オプション、`on_tail` は `--help`
  `--version` のような「常に最後」オプション

metavar 相当:

- `on` の引数文字列内で `--file FILE` のように直接書く (専用プロパティでは
  なく usage 文字列の一部として表現する設計、GNU 慣習に近い)

summary_width:

- `summary_width` 属性 = オプション一覧部分の表示幅 (デフォルト 32 文字)。
  コンストラクタ引数 `width` (デフォルト 32) と `indent` (デフォルト 4
  スペース) で初期化される。列幅を数値で制御できる数少ない機構

### 出典

- [RubyDoc.info — OptionParser (optparse 4.0.0)](https://www.rubydoc.info/stdlib/optparse/OptionParser)
- [Ruby 3.4 optparse tutorial](https://docs.ruby-lang.org/en/3.4/optparse/tutorial_rdoc.html)
- [optparse.rb ソース (ruby/ruby)](https://github.com/ruby/ruby/blob/master/lib/optparse.rb)
- [on() vs on_tail() (comp.lang.ruby ML アーカイブ)](https://groups.google.com/g/comp.lang.ruby/c/JhtWdphyb7M)

---

## 3. Swift ArgumentParser (apple/swift-argument-parser, 最新 main 系)

### 短い説明 / 長い説明の分離 (abstract / discussion 型)

- **`abstract`** — コマンドの 1 行説明。ヘルプの "OVERVIEW" として表示
- **`discussion`** — より長い説明、拡張ヘルプ表示に使う。デフォルト空文字列
- **`ArgumentHelp`** 型 (文字列リテラルの代わりに渡せる) は個別引数にも同じ
  2 段構造を持つ: abstract 相当の短文 + discussion 相当の長文 + **valueName**
  (metavar 相当) + **visibility** (可視性レベル) をまとめて持つ、という
  設計になっている点が特徴的 (コマンドレベルと引数レベルで同じ語彙構造)

### usage

- `CommandConfiguration.usage` — カスタム usage 文字列。`nil` なら自動生成
  usage を表示、空文字列を明示すると usage 行自体を非表示にできる
  (= 「自動生成 / override / 完全非表示」の 3 値を 1 プロパティで表現)

### 可視性 (hidden 相当)

- `shouldDisplay` (visibility) — コマンドの表示/非表示。デフォルト `true`
- 引数側は `ArgumentHelp.visibility` で同種の制御 (private があれば hidden
  ヘルプ相当、詳細な列挙値は未確認)

### グループ見出し (help_group_name 相当) — **明確にサポートあり**

- **`@OptionGroup(title:)`** — オプション群にタイトルを付けてヘルプ上で
  区切られたセクションとして表示 (例: `title: "Shared Options"` →
  ヘルプに "SHARED OPTIONS:" として表示)。元は GitHub issue #267
  「Group and label option groups in the help screen」で要望が出て
  実装された機能で、before は「option group はただ他の引数群に溶け込んで
  表示され、グループごとに分離・ラベル付けされない」という課題があった
- **`CommandGroup`** (result builder 構文) — サブコマンド群を共通見出しの
  下にグループ化する機能。Swift Forums の提案スレッドが起源

### 表示順 (help_order 相当)

- **宣言順** — オプショングループも通常の引数も、struct 内でのプロパティ
  宣言順がそのままヘルプの表示順になる。明示的な数値 order 属性は無い
  (Swift ArgumentParser には System.CommandLine 同様、宣言順以外の順序を
  指定する仕組みは **確認できなかった**)

### metavar

- `ArgumentHelp` の `valueName` プロパティで値の表示名を指定

### 出典

- [CommandConfiguration.swift (apple/swift-argument-parser ソース)](https://github.com/apple/swift-argument-parser/blob/main/Sources/ArgumentParser/Parsable%20Types/CommandConfiguration.swift)
- [CommandConfiguration API docs](https://apple.github.io/swift-argument-parser/documentation/argumentparser/commandconfiguration/)
- [Group and label option groups in the help screen (GitHub issue #267)](https://github.com/apple/swift-argument-parser/issues/267)
- [Grouping subcommands (Swift Forums)](https://forums.swift.org/t/grouping-subcommands/72219)
- [Grouping options in help (Swift Forums)](https://forums.swift.org/t/grouping-options-in-help/45121)
- [Announcing ArgumentParser (swift.org)](https://www.swift.org/blog/argument-parser/)

---

## 4. shell 系慣習 (GNU help format / help2man / fish / bash completion)

### 4-a. GNU Coding Standards の `--help` 慣習

- **MUST 相当の規範**: `--help` は標準出力に簡潔な使い方説明を出して正常
  終了。他のオプション・引数は無視。`--version` も同様に標準出力へ出して
  正常終了 (名前・バージョン・由来・法的状態を表示、末尾の空白の後がバージョン
  番号という機械可読規約もある)
- **`--help` 出力末尾の規約**: bug 報告先メールアドレス、パッケージの
  ホームページ (通常 `https://www.gnu.org/software/pkg/`)、GNU ソフトウェア
  全般のヘルプページへのリンクを置くこと、という具体的な文言規約がある:
  `Report bugs to: mailing-address` / `pkg home page: <URL>` /
  `General help using GNU software: <URL>`
- i18n 対応: 翻訳者向けに "Report translation bugs to <...>" という追加行を
  入れる慣習も明記されている (= bug-report セクション自体が多言語対応の
  拡張ポイントとして設計されている)
- **グループ見出しの慣習**: GNU Coding Standards 自体には「オプションを
  カテゴリ分けせよ」という明文規定は見当たらなかった (未確認)。実例として
  coreutils の `ls` は **マニュアル (man page) レベルでは**「どのファイルを
  リストするか」「何の情報を出すか」「ソート」「一般的な出力整形」「タイム
  スタンプ整形」「ファイル名整形」等のセクションに分かれるが、これは man page
  の構成であり `--help` 自体の出力构造とは異なる可能性がある (実機の GNU
  `ls --help`/`grep --help` 出力は本環境が BSD 系ツールのため実機検証不可、
  **未検証**)

### 4-b. help2man

- `--help` / `--version` の出力が GNU 慣習に沿っていれば、そこから man page
  を自動生成できるツール。生成される man page のセクション:
  NAME / SYNOPSIS / DESCRIPTION / OPTIONS / EXAMPLES / AUTHOR (Report bugs to
  行から抽出) 等
- 実務上の意味: **`--help` の出力形式自体が「他ツールが機械的にパースする
  契約」になっている** (= usage 行の書式、オプション一覧の書式、bug-report
  行の書式が全て help2man のパーサが期待する形と一致している必要がある)
- Makefile 慣習として、man page はバイナリではなくソース (`--help`/
  `--version` の出力を定義しているソースファイル) に依存させ、開発者側で
  生成して配布に含める運用が推奨されている

### 4-c. fish `complete -d` (description)

- `complete -d DESCRIPTION` (= `--description`) — 補完候補ペイン (pager) に
  表示される説明文字列を付与
- **重要な副次効果**: 同じ (空でない) description を持つ `-s`/`-o`/`-l` の
  複数オプションは **1 つの候補としてまとめて表示される** (= description が
  暗黙のグルーピングキーとして機能する、という設計)。これは
  help_group_name とは異なる目的 (補完候補の重複排除) だが、
  「同一文字列 = 同じ扱い」という発想は共通点として言及に値する
- `-a`/`--arguments` で候補をコマンド置換から生成する場合、各候補にタブ区切りで
  説明を付けられ、この方式の説明が `-d` より優先される (= 静的な `-d` より
  動的な per-candidate 説明が優先されるという優先順位規約)
- 短くまとめる慣習: 「description は短く保つこと、その方がユーザが一度に
  多く見られるから」という明示的なガイドラインがある (= 表示幅・視認性への
  配慮が公式ドキュメントに明記)

### 4-d. bash programmable completion

- **`compgen`** / **`complete -F`** / **`compopt`** が中核。`complete -F
  funcname command` で補完関数を登録、関数は `$1`=コマンド名 `$2`=補完中の
  単語 `$3`=直前の単語を受け取り、結果を `COMPREPLY` 配列にセットする
- **description 表示機構が無い** — fish の `-d` に相当する「補完候補に説明
  文字列を添える」公式機構は bash の `complete`/`compgen` には **存在しない**
  (= 候補の単語のみが `COMPREPLY` に入り、Readline はそれをそのまま補完
  候補として表示する。説明文の同時表示は bash-completion プロジェクト等の
  慣習実装が独自に画面制御で模倣することはあっても、公式 builtin の機能では
  ない)。これは fish との明確な設計差として言及に値する
- `-o nospace` (末尾スペース抑制) や `-o bashdefault` (デフォルト補完を
  引き継ぐ) 等の副オプションはあるが、いずれも表示上の説明語彙ではなく
  補完動作の制御

### 出典

- [--help (GNU Coding Standards)](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html)
- [Bug Report Address (GNU gettext manual)](https://www.gnu.org/software/gettext/manual/html_node/Bug-Report-Address.html)
- [help2man (GNU Project)](https://www.gnu.org/software/help2man/)
- [Man Pages (GNU Coding Standards)](https://www.gnu.org/prep/standards/html_node/Man-Pages.html)
- [complete builtin (fish-shell 公式 docs, 最新)](https://fishshell.com/docs/current/cmds/complete.html)
- [Writing your own completions (fish-shell 公式 docs)](https://fishshell.com/docs/current/completions.html)
- [Programmable Completion Builtins (Bash Reference Manual)](https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion-Builtins.html)
- [Programmable Completion (Bash Reference Manual)](https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion.html)
- [A Programmable Completion Example (Bash Reference Manual)](https://www.gnu.org/software/bash/manual/html_node/A-Programmable-Completion-Example.html)
- [ls invocation (GNU Coreutils 9.11 manual)](https://www.gnu.org/software/coreutils/ls)

---

## 5. モダン系 (Deno cliffy + Go kong / 参考: Rust bpaf, oclif)

kawaz 名指しの「help_group_name / help_group_order / help_order 相当」の
確認という観点で、この系統群の中で **Go kong が最も直接的に該当する機能を
持つ**ことが分かった。以下、cliffy をメインに、kong を「もう1つの特筆すべき
パーサ」として扱う (bpaf と oclif も group 系機能を持つため参考として併記)。

### 5-a. Deno cliffy (command パッケージ、v0.25.x〜v1.2.1 系で API 概ね安定)

短い説明 / 長い説明:

- `.description()` (または `.command(name, description)` の第2引数)
  1 つのみ。ただし **表示の出し分けがある**: `-h` (短縮フラグ) では説明の
  1 行目だけ表示、`--help` (フルネーム) では全文表示、という「同じ
  description 文字列に対する表示レベルの違い」で abstract/discussion 的な
  効果を実現している (= 専用の 2 プロパティ分離ではなく、1 つの文字列を
  フラグの短縮/フル使い分けで出し分ける設計)
- 複数行 description のインデントは保持される

hidden:

- `.hidden()` — サブコマンドを自動生成ヘルプ・シェル補完から除外
- option レベルも `{ hidden: true }` で同様

グループ見出し (help_group_name 相当) — **明確にサポートあり**:

- **`.group(name)`** メソッド — 以降 `.option()` で登録するオプションを
  その名前のグループに割り当てる、という **位置的 (positional) な DSL**。
  `.group("Other options")` を呼んだ後に `.option()` を重ねると、ヘルプ上で
  "Other options:" という見出しの下にまとまる
- 複数回 `.group()` を呼べば複数セクションを作れる (例: "Other options" と
  "Other options 2" の 2 見出し)
- **順序**: 宣言順 (= `.group()` を呼んだ順・その後 `.option()` を呼んだ順)
  がそのままヘルプの見出し順・項目順になる。数値の `order` 属性は無い

global / dotted grouping:

- `.global()` でサブコマンドツリー全体に同じオプション/環境変数/型を
  共有 (= global option 相当)
- ドット区切りの入れ子オブジェクトでオプションをグルーピングする機能もある
  (これは help 表示のグループではなく、パース結果の格納構造のグルーピング)

### 出典 (cliffy)

- [Cliffy Command README (v0.20.1)](https://deno.land/x/cliffy@v0.20.1/command/README.md)
- [Cliffy Options docs (v1.2.1)](https://cliffy.io/docs/v1.2.1/command/options)
- [Cliffy Commands docs (v0.24.2)](https://cliffy.io/docs@v0.24.2/command/commands)
- [c4spar/cliffy (GitHub)](https://github.com/c4spar/cliffy)

### 5-b. Go kong (alecthomas/kong) — 特筆すべき新興パーサとして選定

選定理由: struct タグベースの宣言的パーサで、`group` タグと専用の `Group`
メタデータ型が **help_group_name / help_group_order の両方に最も直接的に
対応する実装**だったため、比較材料として重要と判断した。

- **`placeholder`** タグ = metavar 相当。例 `placeholder:"<the-placeholder>"`
  で `--flag-name=<the-placeholder>` のような表示になる。`PlaceHolderProvider`
  インターフェースを実装すればマッパー側から動的に metavar を供給することも
  可能
- **`hidden`** タグ — コマンド/フラグをヘルプ出力から省く
- **`group`** タグ + **`Group` 型 (help_group_name / help_group_order 相当の
  本命)**:
  - `group` タグの値は「グループを識別する Key」に過ぎない (文字列 ID)
  - 実際にヘルプに出す **Title** (見出し文字列) と **Description**
    (見出し下の説明文、空なら非表示) は、`Group` 型のインスタンスとして
    別途 `Groups([]Group)` オプションで定義し、Key で紐付ける、という
    **「タグは ID 参照のみ、表示メタデータは別途一元管理」という 2 層設計**
  - `Groups([]Group)` に渡すスライスの **順序がそのままヘルプでの表示順**
    になる (= help_group_order 相当が明確に存在する、数少ない実例)
- **`xor`** タグ — 排他グループ (同一グループ内で 1 個のみ使用可、
  `required` と組み合わせると「グループ内 1 個以上必須」も表現可能)。
  これは help 表示のグループとは別の「値制約としてのグループ」で、
  「表示グループ」と「制約グループ」を別タグ (`group` vs `xor`) で分離して
  いる点が設計として参考になる
- カスタムヘルプ: `Help(HelpFunc)` オプションで `DefaultHelpPrinter` を
  丸ごと差し替え可能。`ValueFormatter(HelpValueFormatter)` で値表示の
  カスタマイズ、`Vars{}` でヘルプ文字列・placeholder・デフォルト値への
  変数展開 (簡易テンプレート機能) もサポート

### 出典 (kong)

- [alecthomas/kong (GitHub)](https://github.com/alecthomas/kong)
- [kong package (pkg.go.dev API reference)](https://pkg.go.dev/github.com/alecthomas/kong)

### 5-c. 参考: Rust bpaf の `group_help` (kong との対比)

- bpaf の `group_help(text)` / `with_group_help` は、複合パーサ (`construct!`
  で組み合わせた複数フィールド) に **共有の説明文を 1 つ付与する**機能。
  例: `construct!(Rect { width, height }).group_help("Rectangle is defined by
  width and height in meters")`
- これは kong の「Title + Description を持つ名前付きグループ」とは似て
  非なるもので、bpaf の group_help は **「見出し」ではなく「複合パーサへの
  1 段落の注釈」**に近い (help_group_name のような短い見出しラベルの概念は
  薄く、説明文がそのままグループの識別も兼ねる設計)
- 他の関連機能: `hide_usage` / `hide` (usage 行 / ヘルプ全体からの除外)、
  `custom_usage` / `usage`/`with_usage` (usage 行の override)、
  `descr`/`header`/`footer` (アプリ全体の説明・ヘッダ・フッタ)、
  `render_markdown`/`render_html`/`render_manpage` (docgen 機能、Markdown/
  HTML/man page への出力を持つ点は他系統になかった特殊機能)

### 出典 (bpaf)

- [bpaf (docs.rs)](https://docs.rs/bpaf)
- [bpaf::_documentation (docs.rs)](https://docs.rs/bpaf/latest/bpaf/_documentation/index.html)
- [pacak/bpaf (GitHub)](https://github.com/pacak/bpaf)

### 5-d. 参考: oclif の `helpGroup` (kong との対比、簡易版)

- oclif の flag には `helpGroup` プロパティがあり、フラグを名前付きグループ
  (例 `'THE BEST FLAGS'`) に入れられる。ただし kong の `Group` 型のような
  Title/Description を分離したメタデータ構造ではなく、**グループ名の文字列
  1 つを直接指定するだけ**の簡易版 (= help_group_name 相当はあるが、
  help_group_order 相当や Description 併記の仕組みは公式ドキュメントから
  確認できなかった、未確認)
- 他: `summary` (短い説明) と `description` (長い説明) の分離あり、
  `helpLabel` でフラグの表示ラベル自体を override 可能

### 出典 (oclif)

- [oclif Flags docs](https://oclif.io/docs/flags/)

---

## 横断まとめ (help_group_name / help_group_order / help_order 相当の有無)

| 系統 | グループ見出し (name) | グループ順序 (order) | 項目表示順 (help_order) |
|---|---|---|---|
| System.CommandLine | 無し (サブコマンドで代替) | 無し | 無し (宣言順、alias は逆に非決定的な quirk あり) |
| thor | 未確認 (Thor::Group は別概念) | 未確認 | 宣言順 |
| optparse | `separator` (文字列埋め込み、非構造化) | 手続き的 (呼び出し順) | `on_head`/`on`/`on_tail` の3段階のみ |
| Swift ArgumentParser | `@OptionGroup(title:)` あり | 宣言順のみ | 宣言順のみ |
| GNU/help2man | 慣習レベル (man page 節構成、`--help` 自体は未確認) | — | — |
| fish complete | 無し (description 一致による偶発的グルーピングのみ) | — | — |
| bash completion | 無し (description 機構自体が無い) | — | — |
| Deno cliffy | `.group(name)` あり | 宣言順 (呼び出し順) | 宣言順 |
| Go kong | **`Group{Key,Title,Description}` あり** | **`Groups([]Group)` のスライス順で明示制御** | 未確認 (フラグ個々の順序制御は見当たらず) |
| Rust bpaf (参考) | `group_help` (見出しというより注釈文) | — | — |
| oclif (参考) | `helpGroup` (文字列のみ、簡易版) | 未確認 | — |

**最も直接的に「名前 + 説明を持つグループを、明示的な順序リストで並べる」**
という kawaz 名指しの機能像に一致するのは **Go kong** のみだった。他の
系統は「見出し文字列を宣言順に置いていく」設計が主流で、順序制御を
グループ定義から独立させて明示指定する発想を持つのは kong だけという
のがこのバッチでの発見。
