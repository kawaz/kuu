# kuu-ux 輪郭調査 (CLI 生態系)

> codex (gpt-5.6-sol) worker による調査、5 並列 + 3 者反証監査済み、2026-07-16。
> clap / Cobra / Click / argparse / Commander.js / yargs / picocli /
> System.CommandLine の 8 系統を横断し、「定義API → 型付き結果」の変換方式、
> 定義データの往復性、subcommand/error/completion/help の責務分担、既知の
> 失敗パターンを比較した。kuu-ux (spec を「繋ぐだけ」でなく cobra/clap 風の
> 書き味まで含む二つ目の顔) の設計材料。normative な DR/schema/fixture 変更は
> 含まない。

## 判明した事実

### 1. 主要 8 系統の横断マトリクス

| library | 定義API | 結果受取 / typed bridge | subcommand | error/help既定 | 定義export/import | completion/help責務 |
|---|---|---|---|---|---|---|
| clap (Rust) | Command/Arg builder と #[derive(Parser/Subcommand)]。derive は同じ builder model へ展開 | builder は ArgMatches の typed accessor (parser 型との不一致は実行時問題になり得る)。derive は struct/enum へ束縛 | builder tree / enum variant | get_matches は help/version=0、usage error=2 で exit。非 exit は try_get_matches | command definition の公式 lossless JSON round-trip なし。旧 YAML import は現行で撤廃。第三者 serde はある | help は本体、completion は別 crate clap_complete。AOT 静的生成と unstable dynamic の両方 |
| Cobra (Go) | &cobra.Command{Use, RunE...} + AddCommand、flag を命令的登録。struct tag binding なし | Run/RunE callback 内で pointer binding または pflag getter | *Command tree | RunE error では usage 表示が既定。SilenceUsage は実行時 error 一括抑止だが parse/arg error は対象外で非対称 | 公式 JSON round-trip なし。tree walk 自作 export は可能 | help/completion 本体。生成 script は hidden __complete を binary へ問い合わせ。man/Markdown は cobra/doc 別 package |
| Click (Python) | decorator で関数 → Command、@option/@argument、Group | 変換済み値を callback kwargs へ。dataclass/Pydantic 自動 binding は core 外 | @group.command() / nested group | UsageError=2、通常例外=1。group no-args は既定 usage error | 唯一 core に Context.to_info_dict() の一方向 introspection (lossy、再構築用でない)。import なし | help/completion 本体。shell shim が環境変数経由で runtime 問い合わせ |
| argparse (Python) | ArgumentParser.add_argument/add_subparsers builder | 動的属性 bag Namespace。set_defaults(func=...) で dispatch | subparser tree | parse error は stderr+usage+exit 2。exit_on_error=False でも全経路を捕捉できない既知差 | core に export/import なし | help 本体、completion は core 外 (argcomplete/shtab) |
| Commander.js | fluent chain 中心。Option/Argument object も可 | .action() callback / .opts()。強い chain 推論は公式別 package @commander-js/extra-typings | nested Command / executable subcommands | parse error 時は既定で process.exit。exitOverride で throw 化 | core round-trip なし | help 本体、shell completion は core 未提供 (issue #2008) |
| yargs | fluent chain + plain object CommandModule | argv object。型は本体でなく @types/yargs の推論。async 混在で parse() が argv/Promise union になり得る | nested builder / command module | strict rejection は明示 opt-in が多い | core round-trip なし | completion は本体。--get-yargs-completions で runtime 問い合わせ |
| picocli (Java) | annotation と programmatic CommandSpec/OptionSpec が同一 model へ合流 | annotation field injection。execute() は int exit code、typed parse 値は ParseResult | annotation subcommands / addSubcommand | invalid input 既定 2、execution exception 既定 1 | 公式 JSON round-trip なし | help 本体。AutoComplete は本体 jar 同梱の静的 script 生成 |
| System.CommandLine 2.x (C#) | 現行 core は builder (RootCommand/Command/Option<T>/Argument<T>)。attribute binding は外部 source generator 層 | SetAction callback が ParseResult を受け GetValue<T>。任意 object 自動 binder は core から撤去 | mutable command tree | RootCommand に help/version 等既定。Invoke 経由なら parse error を stderr+help、exit 1 | 公式 round-trip なし (長期要望のみ) | help 本体。completion は外部 dotnet-suggest + shim で runtime 問い合わせ。bootstrap 摩擦あり |

### 2. 「宣言データ → 型付き結果」の 4 型

1. 言語型を正本にして CLI 定義を導出 (clap derive / picocli annotation / Typer / Kong)。長所: compile-time/IDE。短所: export 時に言語固有情報や closure が落ちる
2. command model を正本にして明示 typed accessor (System.CommandLine Option<T> + GetValue<T> / clap builder value_parser + get_one<T>)。短所: model 上の型と取得側の型の二重指定ズレ
3. untyped/dynamic bag + callback dispatch (argparse Namespace / yargs argv / Cobra pflag getter)。動的言語では自然
4. 型推論を外付け adapter で補う (Commander extra-typings / @types/yargs)。チェーン分断・drift が弱点

### 3. builder API ↔ serializable data の往復性は不在

主要 8 系統に「lossless で第一級の両方向 round-trip」は無い。Click の
`to_info_dict` が唯一の一方向 lossy introspection。OpenAPI→CLI、botocore、
jsonargparse は「外部 spec → runtime command」の強い前例。oclif manifest、
jdx/usage、carapace-spec は serializable command metadata の有力前例。

round-trip が普及しない構造理由: action callback、custom validator、dynamic
completer、I/O object、DI service 等は直列化不能。

### 4. completion 3 系統

- 静的 script 生成 (picocli / clap AOT)
- thin shim → 同一 binary へ runtime 問い合わせ (Cobra `__complete` / Click env / yargs / clap dynamic)
- 外部共通 engine (dotnet-suggest / usage / carapace)

DR-060 の「生成器は標準提供」は usage/carapace で実証あり。ただし
(1) engine/shim の配布と発見 (2) shell 登録 bootstrap (3) spec schema と
generator の version drift (4) runtime binary 不在時の fallback、を product
側が解決する必要がある。dotnet-suggest は bootstrap 摩擦が弱点の実例。

help は共通化可能なのが policy (error category / exit class / usage を
添える条件 / suggestion 有無 / semantic sections) であって renderer では
ない。文言・locale・width・色・layout は言語/product 側。docopt のように
usage text を正本にすると rewrap・翻訳・具体 error が弱くなる。

### 5. 失敗パターン (轍)

- clap: raw builder は定義と typed retrieval の型分離で誤型指定が runtime 問題。旧 YAML declarative API はエラーが runtime へ遅延する理由で撤廃 (spec-first には強い lint/codegen gate が必要、issue #3087)
- Cobra: RunE error と usage rendering の coupling、SilenceUsage の非対称。package-global rootCmd/init() 慣習と global completion registry が test isolation を害する — instance constructor を正本にすべき
- Click: 関係制約 (mutual exclusion 等) が core に弱い。to_info_dict を再構築可能 spec と誤認しない
- argparse: Namespace の stringly 受取、subcommand required が opt-in、exit_on_error=False の非一貫、暗黙 default の積み重ね
- Commander: chain 分断で推論が失われる。completion/export 欠如。default singleton sugar は大規模/test 用途で避ける
- yargs: 型実装が別 repo で drift、async 混在で parse result union。singleton 問題は v18 撤廃済みなので現行欠陥として書かない
- picocli: execute()=int と typed parse/result が別経路。静的 completion は dynamic 候補の鮮度に弱い
- System.CommandLine: runtime binder 複雑化→撤去、長い beta/API churn、外部 completion の bootstrap 摩擦

## 実用的な示唆

### kuu-ux の切り分け案

JSON definition は言語横断の正本のまま、静的型言語では codegen/derive/
source-generator/typed adapter を ux 層に置く。動的言語は直接 mapping を
許す。全言語に単一の typed binding 方式を強要しない。System.CommandLine が
reflection binder を core 外へ追い出した歴史 (issue #2576) が万能 runtime
binder を避ける強い根拠。

### Definition / RuntimeHooks / Binding の 3 分離

kuu で export を第一級にするなら次の 3 分離が要る:

- **Definition**: 純 serializable な宣言層
- **RuntimeHooks**: action callback / custom validator / dynamic completer / DI service 等、言語内実装
- **Binding**: parse/実行の outcome を言語型へ写す adapter

hook を単に落とすと「export した JSON は動作を再現できる」誤認を生む。
これを避けるには (a) built-in semantic 語彙 (b) named hook reference /
required capability marker (c) export 時の未解決 hook 検出 validation が
必要。Fig の prebuilt generator 語彙が参考になる。

### 共通骨格 / 言語別の境界

横断で固定できる骨格:

- immutable/serializable Definition
- parse_definition の validation diagnostics
- parse の Outcome 分類
- completion request/candidate protocol
- help/error の semantic model・policy (renderer は含めない)
- definition export 契約・schema version・unresolved runtime capability の表現
- instance-scoped command graph・hook registry

言語ごとに変える UX:

- declaration surface (Rust derive+builder / Go constructor / Python decorator / TS fluent / Java annotation / C# source-generator)
- typed binding
- dispatch
- exception・async・DI 統合
- naming・doc-comment 抽出

核心: 各言語に同じ API 形を移植するのではなく、JSON Definition・Outcome・
Candidate protocol だけを同じ意味論にし、表面は各言語の慣用へ寄せる。

## 検証の詳細

一次資料 URL 一覧:

- clap: https://docs.rs/clap/latest/clap/_derive/ / https://docs.rs/clap_complete/latest/clap_complete/ / https://github.com/clap-rs/clap/issues/918 / https://github.com/clap-rs/clap/issues/3087
- Cobra: https://cobra.dev/docs/how-to-guides/working-with-commands/ / https://github.com/spf13/cobra/blob/main/site/content/completions/_index.md / https://github.com/spf13/cobra/issues/340
- Click: https://click.palletsprojects.com/en/stable/api/ / https://click.palletsprojects.com/en/stable/shell-completion/
- argparse: https://docs.python.org/3/library/argparse.html / https://github.com/python/cpython/issues/103498
- Commander: https://github.com/tj/commander.js/blob/master/Readme.md / https://github.com/commander-js/extra-typings / https://github.com/tj/commander.js/issues/2008
- yargs: https://github.com/yargs/yargs/blob/main/docs/api.md / https://github.com/yargs/yargs/issues/1586
- picocli: https://picocli.info/picocli-programmatic-api.html / https://picocli.info/autocomplete.html / https://picocli.info/apidocs/picocli/CommandLine.ParseResult.html
- System.CommandLine: https://learn.microsoft.com/en-us/dotnet/standard/commandline/migration-guide-2.0.0-beta5 / https://learn.microsoft.com/en-us/dotnet/standard/commandline/how-to-enable-tab-completion / https://github.com/dotnet/command-line-api/issues/2576
- 前例: https://github.com/oclif/oclif/blob/main/docs/manifest.md / https://usage.jdx.dev/ / https://github.com/carapace-sh/carapace-spec / https://fig.io/docs/reference/generator/prebuilt-generators
