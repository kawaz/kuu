# CLI パーサライブラリ 28 種の number/bool 受理調査 — default 中央値 / opt-in 上限 / factory config 案

spec-gaps issue #3 (数値受理構文の再検討) の追加調査。先行 2 本 ([2026-07-06-number-parsing-cross-language.md](2026-07-06-number-parsing-cross-language.md) / [2026-07-06-bool-parsing-cross-language.md](2026-07-06-bool-parsing-cross-language.md)) は stdlib (言語組み込みの数値/bool 変換関数) 寄りの横断調査だったため、本調査では焦点を CLI パーサライブラリ自体の default 挙動と、組み込み (カスタム変換関数を書かない) opt-in の最大範囲に絞って 28 ライブラリを再調査した (kawaz 依頼 2026-07-06)。

対象: Rust clap v4 / Go pflag+cobra・urfave/cli v3・kong / Python argparse・click・typer / Ruby optparse・Thor / JS yargs・commander・oclif / Java picocli・JCommander・Commons CLI / Kotlin clikt / C# System.CommandLine・CommandLineParser / Swift swift-argument-parser / Symfony Console / optparse-applicative (Haskell) / Node util.parseArgs / Deno std/cli / minimist / docopt / getopt_long。大半は実機検証、Java 3 種・C# 2 種・optparse-applicative の inf/nan はソース精読 (未実機箇所は本文中に明記)。kuu リポへの書き込みは調査中に行っていない。

## 判明した事実

### number の default 分類 (4 群)

型付き 19 ライブラリを「素の型宣言だけ (カスタム変換なし) で何を受理するか」で分類すると 4 群に分かれる。

- **S1: 厳格 10 進・不正は Error (中央値群、19 中 12 で最大クラス)** — clap (Rust) / oclif (JS) / picocli・JCommander (Java) / clikt (Kotlin) / System.CommandLine・CommandLineParser (C#) / swift-argument-parser / Thor (Ruby) / argparse・click・typer (Python)。共通点: 10 進符号付きのみ受理、`007→7` (10 進解釈)、`0x/0o/0b` は拒否、不正入力は Error。oclif のみ `+5` (leading plus) も拒否する最厳格。
- **S2: base0 寛容・Error** — pflag+cobra / urfave/cli v3 / kong (いずれも Go, `strconv.ParseInt(s, 0, bits)` 委譲) / OptionParser (Ruby) / optparse-applicative (Haskell)。`007` を **8 進**解釈 (`010→8`)、`0x/0o/0b` を無条件受理、underscore も受理。不正は Error。
- **S3: auto-coerce・silent** — minimist / Deno std/cli / yargs / commander+`Number` (いずれも JS)。`Number()` 系に委譲するため `0x/0o/0b` を受理する一方、不正入力を **Error にせず NaN で通す** (yargs は NaN→null)。
- **S4: 型なし (文字列素通し)** — Node `util.parseArgs` / Symfony Console / docopt / getopt_long / Commons CLI (bare)。変換・検証を一切行わず raw string のまま返す。負数は宣言 arity が消費する設計 (docopt/getopt は◯)。

float は int と別軸で割れる。Python (argparse/click/typer) と Java/Kotlin/Swift 系は `inf`/`nan` を受理 (前者は小文字、後者は先頭大文字 `Infinity`/`NaN`)。Go strconv 群は inf/nan と hex-float `0x1p4` の両方を受理し float では最も寛容。.NET 2 種のみ hex-float 非対応。clap は inf/nan を受理するが hex-float は非対応。

### bool の default 分類 (3 群 + 退化系)

- **B0: 存在ベースのみ (値語彙ゼロ)** — argparse(`store_true`)/clap(`SetTrue`)/commander/oclif/Commons CLI/Symfony(`VALUE_NONE`)/optparse-applicative/Node `parseArgs`。値を渡すこと自体が Error か余剰引数扱い。
- **B1: 厳密 true/false (中央値)** — picocli / System.CommandLine / CommandLineParser / swift-argument-parser (唯一大小区別) / Thor (`true/t/TRUE/T` ↔ `false/f/FALSE/F` の列挙)。
- **B2: strconv 系 (1/0/t/f 込み)** — pflag/urfave (`1/t/T/TRUE/true/True` ↔ `0/f/F/FALSE/false/False`)。B1 と B3 の中間クラスタで、中央値ではないが常見。
- **B3: boolish 拡張 (opt-in 上限の実勢)** — click/typer (`1/true/t/yes/y/on` ↔ `0/false/f/no/n/off/''`) / clikt (`true/t/1/yes/y/on` ↔ `false/f/0/no/n/off`、大文字小文字無視で全ライブラリ中最広) / kong (`true/1/yes` ↔ `false/0/no`、独自語彙で t/f 無し) / OptionParser (`true/yes/+` + 一意 prefix ↔ `false/no/nil/-`、大小区別あり)。
- **退化系 (kuu が避けるべきアンチパターン)** — JCommander (`true` 以外は全部無エラーで false)、yargs (`"true"` の文字列完全一致のみ true、他は全部 false)、minimist・Deno (`false` のみ false、他は全部 true)。いずれも不正入力を検出せず誤った真偽値へ silent に倒れる。

→ **bool canonical の中央値は「厳密 true/false (大小無視が多数派、swift のみ区別)」**。拡張語彙 (yes/no/on/off) は明確な少数派で、boolish の実勢上限は clikt。

### 組み込み opt-in 最大範囲の和集合

カスタム変換関数を書かず、ライブラリ公式の設定/型/フラグだけで広げられる範囲を横断すると:

| 拡張軸 | 実勢の上限 | 提供ライブラリ |
|---|---|---|
| boolish 語彙 | `true/t/1/yes/y/on` ↔ `false/f/0/no/n/off` (大小無視) | clikt (最広) / click / typer, clap `BoolishValueParser` |
| 基数 prefix | `0x/0o/0b` + 先頭 0 の 8 進 | Go strconv 群 / OptionParser / optparse-applicative |
| 基数を config で切替 | `IntegerConfig.Base` (narrow/wide 両方向) | **urfave のみ** |
| 桁区切り `_` | underscore 除去 | Python 系 / Go strconv / Ruby |
| hex-float `0x1p4` | 言語 parse に由来 | picocli / Go strconv / clikt / swift |
| inf/infinity/nan | float 系全般 | Python / Java / Go / Swift / .NET |
| 範囲検証 (min/max) | 開区間・clamp 込み | click `IntRange/FloatRange`, clap `Ranged*`, oclif `{min,max}` |
| count (`-vvv`→整数) | 反復カウント | argparse/click/typer/yargs/clikt/CommandLineParser/swift/clap/pflag/urfave/kong/docopt |
| `--no-` 自動生成 | 有効化 marker 1 つで対の名前を導出 | typer/argparse/yargs/oclif/OptionParser/Thor/Symfony/Deno/urfave/picocli/swift/minimist |
| 負数のフラグ誤認回避 | arity 駆動で次語を無条件消費 | docopt/getopt/optparse(HS)/picocli(数値自動判定)/System.CommandLine |

`,` 系の桁区切りや欧州小数点をデフォルトで受理するライブラリは無い (どれも非対応)。

### `--no-` 自動生成は kuu の variant DSL 明示宣言方針への反例にならない

12 ライブラリが `--no-` 自動生成の仕組みを持つが、**いずれも「有効化 marker を要求してから対の名前を導出する」**形であり、無宣言で否定形が湧くのは minimist と yargs (default-on) のみ。自動化しているのは NAME の導出だけで、意味モデル (bool の false 側 matcher) は各実装とも「1 つの target に 2 matcher を寄せる」形に帰着する。kuu の「1 target に複数 variant を明示」とモデル上は同じで、違いは「名前を綴るか導出するか」という表層の糖衣のみ。これは責務境界を明示分離できるケース (糖衣層=name preset / モデル層=明示 variant) であり、`negatable` をプリセットとして lowering 時に明示 variant へ展開すれば、lowered 産物は依然として明示 variant を持つため kuu の制約 (wire 上の否定は明示・監査可能) を侵害しない。

### default ↔ opt-in の分布から見える設計慣習

型付きパーサの多数派 (clap/oclif/picocli/JCommander/clikt/System.CommandLine/CommandLineParser/swift/Thor/argparse/click/typer) は「default を strict 10 進 + Error に置き、拡張は明示 opt-in」という慣習を取る。少数派 (Go strconv 群・JS auto-coerce 系) は「default から寛容」だが、後者は silent NaN の事故を抱える。kuu の canonical (狭い 10 進 + 不正 Error) はこの多数派慣習と整合し、Go/JS 型の「default から寛容」に寄せると canonical が緩んで移植時の予測可能性が損なわれる。

## 実用的な示唆

以下は factory config のキー案であり、値やデフォルトの採否は未裁定 (kawaz 判断待ち)。

### `kuu_number_parser` factory config の候補キー

| config キー | canonical default 候補 | 標準層 opt-in 例 | 注意点 |
|---|---|---|---|
| `thousand_sep` | `[]` | `["_"]` | `,` は multiple.separator と衝突するため方言送りが妥当 |
| `base_prefix` | `{}` | `{"0x":16,"0o":8,"0b":2}` | urfave の `IntegerConfig.Base` が唯一の前例 |
| `leading_zero` | `"reject"` (JSON 準拠) or `"decimal"` (007→7) | `"octal"` (007→7, 010→8) | 3 値排他。JSON anchor を取るなら reject、中央値追従なら decimal |
| `allow_leading_plus` | 未確定 | `true` | 中央値は許容寄り (oclif のみ拒否) |
| `allow_inf_nan` | `false` (JSON 準拠) | `true` | JSON anchor とは排他関係 |
| `hex_float` | `false` | `true` | niche、方言送り推奨 (.NET も非対応) |

### `kuu_bool_parser` factory config の候補キー

| config キー | canonical default 候補 | 標準層 opt-in 例 | 注意点 |
|---|---|---|---|
| `true_values` | `["true"]` | `+["1","yes","on","t","y"]` | 拡張語彙の実勢上限 = clikt |
| `false_values` | `["false"]` | `+["0","no","off","f","n"]` | true_values と対称 |
| `case_insensitive` | 未確定 | `true` (= 中央値挙動) | canonical を exact-match 哲学に倣い大小区別にすると中央値 (大小無視) から僅かに厳格側にずれる。opt-in で吸収可能 |
| `empty_is_false` | `false` | `true` (= click 挙動) | click は `''→false`、少数派 |

### 負数の値消費は type factory config でなく matcher/lowering の責務

実勢の正解は docopt/getopt/optparse(HS) 型の「arity で引数を取ると宣言/文法で分かっていれば次語を無条件消費」方式。kuu は宣言的に arity を把握できるためこの方式を native に採れ、`-5`/`-inf`/`-1e3` を footgun なく取れる。対して argparse の正規表現ガードや minimist の空白崩壊は「引数要求を消費器が尊重していない」型で穴を生む (`-inf` が argparse で取れない等)。kuu が inf/nan/負数を opt-in で許すなら、値消費は arity 駆動でなければ整合しない (「arity 駆動消費」か「トークン形推測」かは二択で前者一択)。

## 検証の詳細

### バージョン一覧

- Rust: clap v4.6.1
- Go: spf13/pflag v1.0.10 + cobra (pflag に委譲、受理挙動は同一) / urfave/cli v3.10.1 / alecthomas/kong v1.15.0
- Python: 3.14.6 (argparse stdlib / click 8.4.2 / typer 0.26.8)
- Ruby: 2.6.10 (optparse stdlib / Thor 1.5.0) — EOL 版での実測、新しめの Ruby では `Integer` Acceptable の `0o` prefix 対応等に差分の可能性 (未検証)
- Node: 26.4.0 (yargs 18.0.0 / commander 15.0.0 / @oclif/core 4.11.14)
- Java: picocli / JCommander / Commons CLI — JVM ランタイム不在のためソース該当行を精読 (`CommandLine.java` の `BuiltIn` converter・`resemblesOption`・`negatable` javadoc、JCommander `converters/`、Commons CLI `TypeHandler.putDefaultMap`)
- Kotlin: clikt — ソース精読 (`parameters/types/*.kt`, `parameters/options/FlagOption.kt`)
- C#: System.CommandLine / CommandLineParser (commandlineparser/commandline) — dotnet ランタイム不在のためソース精読 (`Binding/ArgumentConverter.StringConverters.cs`, `Core/TypeConverter.cs` 等)
- Swift: swift-argument-parser 1.8.2 (Swift 6.3.2、実機ビルド・実行)
- optparse-applicative (Haskell): ghc 不在のためソース精読のみ

### 実機検証と裏取りの区別

実機実行できたのは clap / pflag+cobra / urfave / kong / argparse / click / typer / optparse (Ruby) / Thor / yargs / commander / oclif / swift-argument-parser。Java 3 種・C# 2 種・optparse-applicative は公式ソースを scratchpad 配下に取得して該当行を grep する形で裏取りした (「たぶん」の記述は排除、ソース行を本文中に引用)。

### 未確定・未実機の限界

- **JCommander の負数トークン誤認**: arity≥1 で次トークンを値消費する設計だが、先頭ハイフン値の扱いは JVM 不在のため未実機 (`--opt=-5` が安全という推定に留まる)。
- **optparse-applicative の `Infinity`/`NaN`・末尾ドット `1.`**: ghc 実機不在でソース精読のみ。Read lexer は数値トークンのみ生成し、Double の inf/nan は round-trip しない wart のため非受理の可能性が高いが未確定。
- **C# System.CommandLine の `.5`/`1.` 受理と既定 culture**: dotnet 不在のため MS Learn doc ベースの記述に留まる。
- popularity (GitHub stars 等) の数値は概算 (順序感把握用)。

検証プロジェクト一式は scratchpad 配下 (`/private/tmp/claude-501/-Users-kawaz--local-share-repos-github-com-kawaz-kuu-main/ed0029a5-e6d1-4ac1-9ccb-f99948e52b2e/scratchpad/`) に使い捨てとして残置。kuu リポへの書き込みは本ファイル作成のみ。
