# argv 語彙の言語横断調査

> kuu の conformance fixture が使う `"argv"` フィールド (= $0 を含まない引数トークン列) の
> 妥当性を、言語横断の命名慣習・出典から評価する。

## 1. 言語横断マトリクス

| 言語 | 標準的な名前 | $0 (プログラム名) を含むか | 出典 |
|---|---|---|---|
| C / C++ | `argc` / `argv` (argument count / argument vector) | **含む** (`argv[0]` = プログラム起動名) | [cppreference: Main function](https://en.cppreference.com/c/language/main_function) |
| Python | `sys.argv` | **含む** (`argv[0]` = スクリプト名) | Python公式 (bugs.python.org #7936 等の議論で確認) |
| Ruby | `ARGV` | **含まない** (プログラム名は別変数 `$0`) | [RubyDoc / Ruby公式チュートリアル](https://www.rubydoc.info/stdlib/core/Process:argv0) |
| Node.js | `process.argv` | **含む** (`argv[0]`=実行パス, `argv[1]`=スクリプトパス, `argv[2]`〜が実引数) | [Node.js公式 Process docs](https://nodejs.org/api/process.html) |
| Go | `os.Args` | **含む** (`Args[0]` = プログラム名) | [Go公式 os package](https://pkg.go.dev/os) |
| Rust | `std::env::args()` | **含む** (慣習上先頭は実行パスだが、仕様として保証はされない) | [Rust公式 std::env::args](https://doc.rust-lang.org/std/env/fn.args.html) |
| Java | `main(String[] args)` | **含まない** | [Oracle公式チュートリアル](https://docs.oracle.com/javase/tutorial/essential/environment/cmdLineArgs.html) |
| Kotlin | `main(args: Array<String>)` | **含まない** | Kotlin公式ドキュメント (Java踏襲) |
| C# | `Main(string[] args)` vs `Environment.GetCommandLineArgs()` | **2 系統併存**: `args`=含まない / `GetCommandLineArgs()`=含む (`[0]`=実行ファイル名) | [Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/main-command-line) |
| Swift | `CommandLine.arguments` | **含む** (`arguments[0]` = プログラムパス) | [Apple公式 CommandLine docs](https://developer.apple.com/documentation/swift/commandline/arguments) |
| PHP | `$argv` | **含む** (`$argv[0]` = スクリプト名) | [PHP公式マニュアル](https://www.php.net/manual/en/reserved.variables.argv.php) |
| Perl | `@ARGV` | **含まない** (プログラム名は別変数 `$0`) | [perldoc: @ARGV](https://perldoc.perl.org/variables/@ARGV) |
| shell (POSIX/bash) | positional parameters (`$1`,`$2`,...,`"$@"`) | **含まない** (`$0` は positional parameter の枠外の別スロット) | [GNU Bash Reference Manual: Special Parameters](https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html) |
| Zig | `std.process.argsAlloc()` | **含む** (先頭要素がプログラムパス) | [Zig std/process.zig ソース](https://github.com/ziglang/zig/blob/master/lib/std/process.zig) |
| Haskell | `System.Environment.getArgs` | **含まない** (公式docに明記: "not including the program name") | [Hackage: System.Environment](https://hackage.haskell.org/package/base/docs/System-Environment.html) |
| **MoonBit** | 下記「MoonBit 詳細」参照 | **2 層構造**: 低レベル `@env.args()` は含む / `argparse` パッケージの `parse(argv?)` パラメータは既定で含まない | ローカル MoonBit 標準ライブラリソース (`~/.moon/lib/core`) の一次確認 (下記) |

### MoonBit 詳細 (ローカル MoonBit 標準ライブラリソースの grep による一次確認)

MoonBit の標準ライブラリは argv 相当を **2 層**で持つ:

1. **`@env.args() -> Array[String]`** (`env/env.mbt:17`):
   コメントは `"Get the command line arguments passed to the program."`。
   実装は `get_cli_args_internal()` へ委譲 (native/js/wasm 各ターゲット別実装)。
   これは C 言語スタイルの生の argv で、**$0 (プログラム名) を含む**。

2. **`argparse` パッケージの `Command::parse`** (`argparse/command.mbt:105`):
   ```moonbit
   pub fn Command::parse(
     self : Command,
     argv? : ArrayView[String] = default_argv(),
     env? : Map[String, String] = Map([]),
   ) -> Matches raise
   ```
   パラメータ名が **`argv`**。そのデフォルト値を作る `default_argv()`
   (`argparse/parser.mbt:80`) の実装:
   ```moonbit
   fn default_argv() -> ArrayView[String] {
     let args = @env.args()
     if args.length() > 1 {
       args[1:]      // 先頭 (= $0) を明示的に除去
     } else {
       []
     }
   }
   ```

**これが決定的な一次資料**: MoonBit 公式 (International Digital Economy Academy 著作、
Apache-2.0) の標準 argparse ライブラリ自身が、パーサに渡す引数トークン列を
**`argv` という名前のパラメータで表現しながら、実装は $0 を明示的に slice off した配列**
をデフォルトにしている。kuu が採用しようとしている「argv = $0 抜きの引数トークン列」
という用法は、kuu の想定実装言語のひとつである MoonBit の標準ライブラリ設計と
**完全に同型**。

## 2. 「argv」の認知度評価

- **C 由来の語として業界共通語彙**: `argc`/`argv` は CS 教育で必ず教わる語で、
  C を経由した実装者ならまず間違いなく「コマンドライン引数の列」と理解できる。
  略語だが専門用語として定着度が高い (対して `args` は「関数引数一般」とも読める)
- ただし **「argv = $0 を含む」という含意は言語文化によって割れる**:
  - **C系静的言語** (C, C++, Go, Rust, Zig, Swift): `argv`/`Args`/`arguments` 系の名前で $0 を含めるのが伝統
  - **動的スクリプト言語のうち Ruby, Perl**: 「ARGV」という **C 由来の呼称をそのまま採用しながら、$0 は含めない** という設計 (= kuu と同型の前例)
  - **JVM 系 (Java, Kotlin) / .NET の `Main(args)` / Haskell**: `args` という一般語を使い、$0 を含めない
- 結論: 「argv」という語自体は言語を問わず「コマンドライン引数の列」という総称として広く通じる。「$0 を含むかどうか」は語彙 (`argv` vs `args`) では決まらず、各言語・各 API ごとに個別に規定されている、というのが実態に近い

## 3. 「argv なのに $0 を含まない」用法のずれ評価

$0 の扱いについて言語ごとに分布を取ると (2 の表参照):

- **含む**: C/C++, Python, Node.js, Go, Rust, Swift, PHP, Zig, MoonBit の `@env.args()` (9)
- **含まない**: Ruby, Perl, Java, Kotlin, C# の `Main(args)`, Haskell, POSIX shell, MoonBit の `argparse` パラメータ (8)

ほぼ拮抗しており、「argv は必ず $0 を含む」という一枚岩の業界規約は存在しない。
むしろ重要なのは **「言語のプロセス起動 API (低レベル)」と「引数パーサに渡すトークン列 (高レベル)」は別の関心事**という点:

- 低レベル API (`@env.args()`, `os.Args`, `sys.argv` 等) はプロセス起動の生データなので $0 を含むのが伝統
- 高レベル・パーサ向け API (`ARGV`, `@ARGV`, `main(args)`, `getArgs`, MoonBit `argparse` の `argv` パラメータ) は「パース対象のトークン列」という specific な関心事のため、$0 を含めない設計が広く確立している

kuu の spec が定義する `"argv"` フィールドは **後者の関心事** (パーサへの入力) に対応する。
MoonBit の `argparse` パッケージ自身が「パーサへの入力を `argv` という名で $0 抜きにして渡す」設計を
採用している以上、**「argv なのに $0 を含まない」は混乱を生むというより、パーサ向け API の主流パターンの一つ**と評価できる。

### 混乱が生まれるとすれば

C/C++ 出身者が spec を読んだとき、字面だけで「argv だから argv[0] はプログラム名のはず」と
早合点するリスクはゼロではない。ただしこれは **spec 本文に一言「プログラム名を含まない」と
明記すれば解消可能**な程度のリスクであり、語彙選択自体を変える必要性までは示さない。

## 4. 類似 spec / API の呼称 (補完・パース系)

| 出典 | 引数列を指す語 | 備考 |
|---|---|---|
| bash programmable completion | `COMP_WORDS` (トークン化された全コマンドライン。`$0`=コマンド名含む) / `COMPREPLY` (返す候補配列) | [GNU Bash Manual: Programmable Completion](https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion.html) — `argv` という語は使わず `WORDS` という一般語 |
| clap_complete (Rust) `CompleteEnv` / `engine` API | `line` (コマンドライン文字列全体), `current_dir` 等 | [docs.rs clap_complete::env](https://docs.rs/clap_complete/latest/clap_complete/env/index.html) — dynamic completion 文脈では `argv` でなく `line`/`words` 系の語 |
| click (Python) `shell_complete` | `ctx.args` (既に確定した引数列), `incomplete` (未確定の入力中の語) | [Click公式: Shell Completion](https://click.palletsprojects.com/en/stable/shell-completion/) — `args` という一般語 + `incomplete` という意味的に specific な語の組合せ |

これら「補完」文脈の API は軒並み `argv` という語を避け、`words` / `line` / `args` + `incomplete`
のような、より用途特化した語彙を採用する傾向がある。ただしこれらは「シェルが completion スクリプトに渡す
生の入力 (未確定語を含む対話的な状態)」を表すためのもので、kuu の `argv` (= パーサが処理する確定済みの
引数トークン列) とは責務が異なる。kuu の `argv_before` / `argv_after` は「カーソル位置で分割した確定トークン列」
であり、この点では click の `ctx.args` (確定済み引数列) に近い関心事だが、click も `argv` でなく `args` と
呼んでいる点は参考情報として留意。

## 5. 推奨

**(a) argv を維持 + spec に「プログラム名 ($0) を含まない」ことを明記** を推奨する。

根拠:

1. **MoonBit 一次資料が最有力の後押し**: kuu が想定する実装言語の一つである MoonBT 自身の標準
   argparse ライブラリが、パーサへの入力パラメータ名を `argv` としながら実装で $0 を除去する、
   kuu と同型の設計を既に採用している (MoonBit 標準ライブラリソース `argparse/parser.mbt:80` `default_argv()`)
2. **Ruby (`ARGV`) / Perl (`@ARGV`) という確立した前例**: 「argv という C 由来の呼称を保持しつつ
   $0 を含めない」設計は kuu が最初ではない。動的言語圏で広く実践されている
3. **「パーサへの入力」という関心事では args より argv の方が specific**: `args` は
   「関数の引数一般」とも読めてしまい曖昧 (Java/Kotlin の `main(args)` のように「その関数の
   引数」という文脈が明確な場面では問題ないが、kuu の spec のように「独立したフィールド名」
   として置く場合、`args` 単体は「何の引数か」を曖昧にする)。`argv` は「コマンドライン引数の
   トークン列である」という文脈を語自体が強く示唆する
4. **懸念 (= C 系出身者の早合点リスク) は spec 内の一文明記で解消可能な程度**であり、語彙変更
   ("args" へのリネーム) をしてもこのリスクを完全には消せない (`args` にも「$0 を含む」流派が
   Rust の `env::args()` のように存在するため、`args` に変えたところで曖昧さがゼロになるわけではない)

(b) `args` へ改名する案は、「$0 を含まない」直感との親和性はやや高まるが、上記 3, 4 の理由で
argv に対する明確な優位性を持たない。加えて `args` 自体も言語によって $0 を含む/含まないが割れて
おり (表参照)、改名しても曖昧さの解消効果は限定的。

`argv_before` / `argv_after` という派生名についても、基底語彙 `argv` の評価がそのまま適用される
(= 維持を推奨)。

---

**追記 (2026-07-14)**: 本調査の推奨 (argv 維持) は kawaz 裁定 (2026-07-14) で不採用 — 言語間で意味が割れている事実は曖昧語の証拠であり、避けた命名 (args 系、COMP-Q1d) を採る。
