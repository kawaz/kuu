# 数値受理構文の言語横断調査 — anchored 多数派・kuu 未議論 9 ケース

> spec-gaps issue #3 (数値受理構文の再検討) の議論球として、C/C++・Rust/Go・Python/Node・Java/C#/JSON/POSIX/shell の数値文字列変換 (stdlib + 主要 CLI パーサ) を実機検証・一次資料照合し、kuu canonical (DR-040/DR-041) と突き合わせた。canonical 再検討 5 軸は決定でなく選択肢の並列提示 (未裁定)。

## 判明した事実

### 横断マトリクス (判別力の高い軸)

| 対象 | anchored / prefix消費 | trailing型suffix | int が `1.0` 越境 | 進数prefix `0x/0o/0b` | 先頭0の8進化 | underscore | inf/nan | Unicode桁 | 前後空白trim |
|---|---|---|---|---|---|---|---|---|---|
| **JSON** RFC8259 | anchored | ✕ | ✕ | ✕ | ✕(禁止) | ✕ | ✕(明示禁止) | ✕ | ✕(token内不可) |
| **kuu canonical** | **anchored (DR-041§5)** | ✕(型の領分) | float=◯/int✕ | ✕(標準層opt-in) | 未議論 | ✕(標準層opt-in) | **未議論** | **未議論** | 未議論 |
| C `strtol/strtod` | **prefix消費(endptr)** | ✕(残る) | strtolは`1`で停止 | base0/16のみ | base0=◯ | ✕ | strtodのみ◯(大小無視) | ✕ | 先頭のみskip |
| C `atoi` | prefix消費(残不明) | ✕ | `1`で停止 | ✕ | ✕ | ✕ | ✕ | ✕ | 先頭skip |
| C++ `>>`(libc++) | prefix消費 | **`1.5f`→FAIL** | intは`1`で停止 | intは10進固定 | ✕ | ✕ | **✕**(非受理) | ✕ | 先頭skip |
| C++ `stoi/stod` | prefix消費(pos返し) | ✕(残る) | stoiは`1`で停止 | base0/16 | base0=◯ | ✕ | stodは◯ | ✕ | 先頭skip |
| Rust `parse`+clap | **anchored** | ✕ | int✕/f64◯ | **✕(全拒否)** | **✕(10進)** | ✕(全拒否) | f64◯(大小無視)/hexfloat✕ | ✕ | ✕ |
| Go `strconv`+flag系 | **anchored** | ✕ | int✕/float◯ | **base0のみ◯** | **base0=◯(罠)** | base0/float◯ | float◯(大小無視) | ✕ | ✕ |
| Python `int/float`+argparse | **anchored** | ✕ | int✕/float◯ | int(,0)のみ◯ | ✕(int(,0)は禁止) | ◯(桁間1個) | float◯(大小無視) | **◯(Nd category)** | 前後+`\t\n` |
| JS `Number` | **anchored** | ✕(`1n`→NaN) | int概念なし | **◯** | ✕(10進) | ✕ | `Infinity`完全一致のみ | ✕ | 前後(空→0) |
| JS `parseInt/parseFloat` | **prefix消費** | ✕ | parseIntは`1`停止 | parseIntは0xのみ | ✕ | ✕(で停止) | parseFloat=`Infinity`のみ | ✕ | 先頭のみ |
| JS `BigInt("..")` | anchored(例外) | ✕(throw) | ✕(整数のみ) | ◯ | ✕(`"010"`→10n) | ✕(文字列不可) | ✕ | ✕ | 前後(空→0n) |
| Java `parseInt` | **anchored** | ✕(`123L`✕) | ✕ | ✕(10進固定) | ✕(10進) | ✕ | ✕ | **◯(digit-value)** | **✕(一切なし)** |
| Java `parseDouble` | **anchored** | **◯(f/F/d/D受理・無視)** | float域広 | hexfloat◯(p必須) | — | ✕ | ◯(**大小厳密**`Infinity`のみ) | ✕(ASCIIのみ) | ◯(`[\x00-\x20]`) |
| C# `int/double.Parse`(doc) | anchored | ✕ | int✕/double◯ | ✕(hexは要flag,無prefix) | ✕(10進) | ✕(要flag) | double◯(記号culture依存) | ✕ | ◯ |
| shell `$(())` bash/dash/zsh | anchored | ✕ | ✕(整数のみ) | 0x◯,0b✕(zshは◯) | **◯(罠, zshは✕)** | ✕(zshは◯) | ✕ | ✕ | ◯(空→0) |

### 傾向・多数派/少数派

- **anchored が多数派**: JSON・Rust・Go・Python・JS `Number`/`BigInt`・Java・C#・shell 算術・kuu。**prefix 消費は少数派**で C `strtol`/`strtod`/`atoi`・C++ iostream・JS `parseInt`/`parseFloat` に限られる (C 系 endptr 思想とその影響を受けた JS の CSS 由来 2 関数)。
- **int パーサが `1.0` を越境受理する対象はゼロ**。全対象で int/float の字句は分離。少数派の C strtol/JS parseInt は「越境」ではなく `1` で prefix 停止しているだけ。
- **進数 prefix 無条件受理は JS `Number` のみ** (`0x/0o/0b` 全部)。多数派は「base 引数/flag で opt-in」(C base0・Go base0・Python `int(,0)`・C# `AllowHexSpecifier`) か「全拒否」(Rust・Java・JSON・shell 一部)。
- **先頭0の8進化は罠として少数派**: C base0・Go base0 (flag/pflag/cobra が継承)・bash/dash 算術のみ。多数派 (Rust・Java・Python int既定・JS・zsh・kuu 設計上) は8進化しない。**同じ `"010"` が 8 と 10 に割れる** のが移植最大の落とし穴 (下記 3 分裂参照)。
- **underscore 受理は少数派**: Python (桁間)・Go (base0/float)。Rust・JS 文字列変換・Java・C#既定は拒否。
- **inf/nan は float 系のみ・大小無視が多数派** (C strtod・Go・Rust・Python・C# .NET Core)。**例外**: Java parseDouble=大小厳密 (`Infinity`/`NaN` のみ)、JS=`Infinity` 完全一致のみ (`inf` 不可)、iostream=非受理、JSON=明示禁止。int パーサは全対象で inf/nan 拒否。
- **Unicode 桁受理は少数派**: Python (int/float とも Nd)・Java parseInt のみ。Java parseDouble すら ASCII 固定という言語内非対称。
- **trailing 型 suffix 受理は Java parseDouble ただ1つの特異仕様** (`f/F/d/D`)。
- **前後空白 trim しないのは Java parseInt/parseDouble・JSON・kuu (構造上) の少数派**。多数派は先頭 or 前後を trim。
- **`"010"` の解釈は 3 分裂**: 10進 (Rust/Java/Python int既定/JS/zsh既定/kuu想定) / 8進 (C strtol base0・Go strconv base0・flag/pflag/cobra・bash/dash算術) / 禁止 (Python `int(s,0)` は leading zero 自体を SyntaxError 的に拒否)。
- **CLI 層は例外なく host stdlib に丸投げ**: survey 対象の全 CLI パーサ (clap・flag・pflag・cobra・argparse・commander・yargs・picocli・System.CommandLine) は独自の数値字句拡張を一切持たない。追加するのは範囲チェック (clap の `number too large`)・help 名・例外→検証エラー変換のみ。commander は生文字列格納で coercion 関数を利用者に委ねる。**kuu だけが逆**に DR-040 で数値字句を canonical/標準層/方言の3層で first-class 所有する。

### 失敗の返し方 (CLI 検証実装に直結)

| 方式 | 対象 | 特性 |
|---|---|---|
| 例外送出 | Python 全て・Java・C#・C++ stoi/stod・JS BigInt | 失敗が呼び側に伝播 |
| sentinel NaN (無例外) | JS `Number`/`parseInt`/`parseFloat` | `"NaN"` 入力と失敗が区別不能 |
| Result/Option | Rust `parse` | 型で失敗を強制ハンドル |
| errno+endptr 複合 | C strto* | `0` と失敗が衝突、両方見ないと overflow 見逃す |
| **エラー通知なし** | C `atoi` | 失敗も overflow(UB) も検出不能 |
| Error 枝保持 | kuu (DR-037) | value_parser 失敗は完全経路0本時に Error 枝として表示 |

### 設計モデルの3分類

- **Model A: anchored 全体一致型 (多数派)** — JSON・Rust `parse`・Go `strconv`・Python・JS `Number`/`BigInt`・Java・C#・**kuu の value_parser**。「文字列全体が数値でなければ失敗」、token 境界解釈と値解釈を分けない。
- **Model B: prefix 消費 + 残り返却型 (少数派)** — C `strtol`/`strtod`(endptr)・`atoi`(endptr無し)・JS `parseInt`/`parseFloat`・C++ `stoi`/`stod`(pos返し)。全体一致判定は呼び側の責務。POSIX strtod 一次資料が「残りを呼び側に返す」ことを明示的な設計目的と規定。**kuu との関係が本質的**: Model B の「貪欲 prefix 消費・残り捨て」は DR-038/041 が明示的に置換対象とした「値トライアル長い方先勝ち commit」と同型。kuu は意図的にこれを排除し、境界候補を全部「枝」にして path-search で一意化する。
- **Model C: suffix 寛容型 (Java parseDouble のみ)** — anchored のまま言語リテラルの型 suffix (`f/F/d/D`) だけを文法に組み込む。JavaDoc 公式 grammar が `FloatTypeSuffix` を明記。B の prefix 消費性は持たず、全体一致のまま文法を1トークン拡張しただけ (A と B のハイブリッドではない — 制約由来は「Java 言語リテラル文法との対称性」という単一目的)。

**kuu の位置づけ**: kuu は Model A (anchored value_parser) を採る (DR-041§5)。Model B 相当の「prefix 消費」は value_parser の外側、CLI matcher/installer 層 (DR-041§3) が「トークン境界の多重読み (枝)」として表現する。host 言語群は「token 分解」も「値解釈」も1つの数値関数に混ぜる (Model B) か、CLI パーサが stdlib に丸投げして分解しない。kuu は token 境界再解釈 (matcher) と値解釈 (anchored value_parser) を明示分離する点が固有。

### kuu canonical との突き合わせ

| ケース | kuu canonical (DR-040) | 各言語多数派 | 評価 |
|---|---|---|---|
| `123abc` (trailing garbage) | ✕ (anchored) | anchored 多数派も ✕ | 多数派と一致。prefix消費のC/JS parseIntが少数派 |
| `1.0f` (型suffix) | ✕ (型の領分) | Java 以外全て ✕ | 多数派と一致。Model C は Java 1例のみ |
| `1_000` (underscore) | ✕ (標準層opt-in) | Rust/JS/Java も拒否、Python/Go は受理 | 拒否寄りが多数派、canonical の判断は妥当 |
| `0x1F` (hex整数) | ✕ (標準層opt-in) | opt-inか拒否が多数派 | 一致。無条件受理はJS Numberのみ |
| `010` (先頭0) | 明示なし (基数prefixは canonical から除外済みだが記載なし) | 10進/8進/禁止に三分裂 | §未議論ケース 5 |
| `+5` (leading +) | 記法 `[+-]?` は許容、だが "JSON同型" は minus のみ | 大半が受理、JSON/C#既定/shell一部は拒否 | 記法と看板が矛盾 (§未議論ケース 4) |
| `1e3` (指数) | ◯ | float系多数派◯ | 一致 |
| `.5` / `1.` | 記法 `[. digits]` = 両方✕ (JSON同型) | float系は両方受理が多数派 | canonical は JSON寄り=少数派。C/Go/Python/Rust/Java float は受理 |

### kuu で未議論の 9 ケース

1. **hex float (`0x1.8p3`, 二進指数`p/P`)**: DR-040 の基数 prefix opt-in は整数の話。float の hex 表現 (C strtod・Go ParseFloat・Java parseDouble が受理、Rust f64・Python float は非対応) は canonical/標準層/方言のどこにも位置づけがない。`p` 必須(Go/Java) vs 任意(strtod) も空白。
2. **JS BigInt の `n` suffix**: kuu は型を要素定義の `type` フィールドで決める設計なので値でなく型を表す文字列内suffixはそもそも思想が異なるが、「文字列内型サフィックス方言を受理するか」は未議論。JS の非対称 (文字列 `BigInt("010")`→10n 受理だがリテラル`010n`→SyntaxError、逆に`1_000n`リテラルは可だが文字列は不可) も対比点として未議論。
3. **特殊値 inf/nan/infinity**: DR-040・DESIGN§3.3 に一切言及なし。JSON同型を厳密に取れば禁止だが、DESIGN§3.3は「float は number と同域」とも言う。float系多数派は大小無視で受理する以上、`--threshold=inf` を受けるか・大小規則(Java厳密 vs strtod無視 vs JS Infinity限定)が未定。
4. **leading `+` と "JSON number 同型" の齟齬**: kuu記法`[+-]?`はleading+を許すがJSON numberは`[minus]`のみ(先頭+不可)。canonical の記法と「JSON同型」の看板が矛盾。survey ではleading+受理が多数派(拒否はJSON・C#既定・shell一部)。
5. **leading zeros (`007`, `010`, `01`)**: 基数prefixをcanonicalから外したので「先頭0=8進化」は起きないはずだが、「受理して10進(Rust/Java/Python int/JS)」か「JSON流に禁止(`01`不正)」かが未確定。CLI入力で普通に来るため実務上重要。
6. **Unicode桁 (全角`１２３`・アラビア`٣`)**: Python int/float・Java parseIntが受理する少数派挙動。kuuの「codepoint単位・正規化なし」はexact照合の規定であって数値字句のUnicode桁受理とは別問題。cross-host再現性の観点ではASCII `[0-9]`固定が安全(Pythonの Nd category依存はhostのUnicodeテーブル版に依存)。
7. **underscore opt-in時の位置規則**: DR-040は`_`を標準層opt-inとするが位置規則が未定。survey では細かく割れる: Python=桁間1個のみ、Go base0=桁間+prefix直後のみ、Rust=str::parseは全拒否。default規則が未定。
8. **指数の不完全形 (`1e`, `1.5e+`, `.e3`)**: C strtodはprefix消費で`1.5`に落として`e+`を残す(Model B)。anchored系は全拒否。kuuはanchoredなので全拒否が自然だが、value_parserの失敗(Error枝)になることの明記がない。
9. **前後空白trim**: 構造上ほぼ回避されるがenv/config経路で残る。CLIは空白分割済み単一トークンを受けるので前後空白は発生しにくいが、env変数値やconfig文字列由来ではあり得る。trimするか(Java/JSON/kuuは非trim少数派、多数派はtrim)未議論。

### kuu設計を裏付ける survey 事実

- **anchored契約 (DR-041§5) は多数派と整合**。prefix消費(Model B)を数値パーサに持ち込まない判断は正しい。ただしDESIGN/DR-040に「value_parserはtoken全体一致・prefix消費しない」の明文がなく、Model B出身(C/JS)の移植者が誤って持ち込むリスクがある。
- **CLI層が字句を所有するkuuの設計は、survey の host stdlib非互換によって正当化される**。全host CLIパーサがstdlib委譲で`010`の8進/10進分裂・locale小数点・inf/nan大小差・Unicode桁・underscore規則差をそのまま継承してしまう。ポータブルなarg specはhost stdlibに委譲できない — これがDR-040のcanonical-defaultを持つ最大の裏付け。

## 実用的な示唆

各軸を独立の選択肢として並列提示する (決定は未裁定)。各選択肢の制約由来を明示し、折衷/ハイブリッドは提案しない — 各モデルの長所は互いに排他な制約から出ているため集約すると両方崩れる。

### 軸1: 特殊値 inf/nan (最優先の空白)

- **1A — JSON厳密 (number/floatとも禁止)**。制約由来: cross-host byte-identicalとJSON相互運用(RFC 8259の明示禁止)。トレードオフ: 科学計算CLIで`--threshold=inf`が書けない。
- **1B — floatのみinf/nanを大小無視で受理 (numberはJSON厳密)**。制約由来: IEEE754 doubleの完全な値域表現(strtod/Go/Rust/Python多数派)。トレードオフ: DESIGN§3.3の「floatの受理域はnumberと同じ」が崩れ、明示的な乖離改訂が要る。
- **1C — canonicalは禁止・方言でのみopt-in**。制約由来: canonical最小主義(DR-040の「言語中立で再現可能な1つ」)。トレードオフ: infを使う言語DXが毎回opt-in。

1B の「floatの値域完全性」と1Aの「JSON同型の看板」は同時に立たない(JSONがinfを禁じているため排他)。

### 軸2: leading `+` / leading zeros と "JSON number同型" の看板

- **2A — JSON厳密に寄せる** (leading+禁止、leading zero禁止、`.5`/`1.`禁止)。制約由来: JSON相互運用とwire上の一意表現。記法を`[-]? (0 | [1-9]digits) [.digits] [e...]`に改める。トレードオフ: CLI入力の`+5`/`007`/`.5`を弾く(CLI慣習と乖離)。
- **2B — 記法どおり寛容に寄せる** (leading+/leading zero/`.5`/`1.`許容、10進固定で8進化しない)。制約由来: CLI入力の実務寛容性(Rust/Java/Python int多数派の「先頭0=10進」に合わせる)。トレードオフ: 「JSON number同型」の看板を下ろし、DESIGNの表現を「JSON numberを包含する10進最小構文」等に改訂。

2Aと2Bは排他(JSONの`int = zero / digit1-9 *DIGIT`がleading zeroとleading+を構造的に禁じている)。

### 軸3: hex float (`0x1.8p3`) の位置づけ

- **3A — 整数基数prefixとhex floatを標準層でまとめてopt-in**。制約由来: C/Goの「0xを付けたら整数もfloatも16進」という一貫性。トレードオフ: Rust f64/Python floatが非対応な以上、cross-host保証が弱い。
- **3B — hex floatは方言のみ(標準層に置かない)**。制約由来: DR-040「再現性の射程」の「跨いで一致させたい方言は精密specを持つべき」。非対応hostが多い機能を標準層に上げない。トレードオフ: hex floatを使うDXが方言依存になる。
- **3C — 整数基数(0x/0o/0b)とhex floatを別opt-inに分離**。制約由来: factory config の粒度細分化。トレードオフ: configキーが増え方言構成が複雑化。

### 軸4: anchored契約の明文化 (低コスト・高価値)

survey で Model B (prefix消費) が C/JS に実在し、DR-038/041 の置換対象と同型である以上、**「kuuのvalue_parserはtoken全体一致でありprefix消費(endptr式)をしない」をDR-040かDESIGN§3.3に一文追加**することを推奨。制約由来: Model B出身の移植者による貪欲commitの誤混入防止(DR-041§3が既に排除した挙動の再流入をドキュメントで塞ぐ)。トレードオフ: なし(既存判断の明文化のみ)。

### 軸5: suffix受理方言 × CLI matcherの相互作用注記 (`-n1.0f`に直結)

survey の Java parseDouble (Model C, `1.0f`受理) は、kuuがcanonicalでsuffixを拒否する判断の正当化材料。**もしkuuがModel C式のsuffix受理を方言で提供すると、DR-041§3の`-n1.0f`の値付着経路(`n="1.0f"`)がvalue_parserを通過し、short分割経路(`n="1.0"`+`-f`)とのambiguous判定が「常に付着側成功」に化ける**。示唆: suffix受理方言を提供する場合、CLI matcherの値付着との相互作用でambiguous挙動が変わる旨をDR/方言specに注記すべき。制約由来: kuuはsurvey対象の中で唯一「数値字句」と「CLIトークン境界」を両方所有する(全host CLIパーサはstdlib委譲で字句を所有しない)ため、この衝突はkuu固有の設計責務であり、host言語には対応物がない。

## 検証の詳細

検証環境: Apple clang 21.0.0 (arm64-darwin, libc++/Darwin libc)、rustc 1.96.0/cargo 1.96.0/clap 4.6.0、go 1.26.4/pflag v1.0.9/cobra v1.10.2、Python 3.14.6、Node v26.4.0/commander 15.0.0/yargs 18.0.0、JDK 21.0.11 (OpenJDK Homebrew)/picocli 4.7.6、bash 5.x/dash/zsh。**C# / System.CommandLine のみ実機未確認 (dotnet 不在、MS Learn doc ベース)**。

### C / C++ (担当1, 全実測)

POSIX strtod 一次資料: *"decompose the input string into three parts: white-space / a subject sequence / a final string of unrecognized characters"* + *"A pointer to the final string is stored in the object pointed to by endptr"* — 「残りを呼び側に返す」ことが明示的な設計目的。

| 対象 | 実測ハイライト |
|---|---|
| `strtol`/`strtoul` | `"123abc"`→123,endptr残"abc"。base=0で`0x`→16進、先頭`0`→8進(`"0123"`→83)、`0b`/`0o`非対応。`strtoul("-1")`→ULONG_MAX(符号反転罠)。overflow→clamp+errno=ERANGE |
| `strtod`/`strtof` | C99 hex float受理: `"0x1.8p3"`→12、`p`は任意(`"0X10"`→16, p無しでもhex float解釈)。inf/nan大小無視で受理(`"nan(123)"`→nan)。overflow→inf+ERANGE |
| `atoi` | endptrなし=残り不明。エラー通知一切なし(`"abc"`→0、overflow→UB) |
| C++ `iostream >>` | libc++実測: `"1.5f"`→**FAIL**(浮動小数numgetのatoms集合に`f`含まれ`"1.5f"`全体収集→strtodが"1.5"で止まり不整合検知→failbit)。`"inf"`/`"nan"`→**FAIL**(strtodと非対称)。overflowはfailbit+clamp(atoiと違い黙って壊れない) |
| C++ `stoi`/`stod` | 例外送出(`invalid_argument`/`out_of_range`)、trailing garbageは`pos`で返す(全消費強制でない)。`stod`はinf/nan受理(strtod直系、iostreamと食い違う) |

同一入力`"0123"`: strtol(base0)→83(8進)、iostream>>int→123(10進、8進解釈しない)、atoi→123。**同じCライブラリ系統内でも受理域が食い違う**。

std::from_chars は本調査対象外(未実測)。

### Rust / Go (担当2, 全実測 + Go一次資料照合)

Rust: 全パーサ(`i64`/`u64`/`f64`のstr::parse、clap value_parser)は**anchored**、進数prefix/underscore全拒否、`"010"`→10(十進)。f64のみ`inf`/`infinity`/`nan`を大小無視で受理、hex float非対応。clapはstr::parseに完全委譲(独自拡張ゼロ、範囲チェックのみ追加)。

Go: `strconv.ParseInt`はbase引数で挙動が激変。GOROOT一次資料: *"If the base argument is 0, the true base is implied by the string's prefix... Also, for argument base 0 only, underscore characters are permitted"*。base=10は`"010"`→10、**base=0は`"010"`→8(8進、罠)**。`ParseFloat`はbase引数なしで常にhex float(`p`必須)+underscore受理、inf/nan大小無視。flag/pflag/cobraは全てstrconvにbase=0で委譲するため、CLIの`--i=010`が**8になる罠を継承**(実測: `--i=010`→8, `--i=0755`→493)。

### Python / JS-Node (担当3, 全実測)

Python `int(s)`: anchored、Unicode Nd桁受理(全角`"１２３"`→123, アラビア`"٣"`→3)、underscore桁間1個のみ、`"010"`→10(8進化なし)。`int(s,0)`: `"010"`→**FAIL**(leading zero禁止、doc一致: "Base 0 also disallows leading zeros")。`float(s)`: inf/nan大小無視、hex float非対応。

JS `Number(s)`: anchored、`0x/0o/0b`無条件受理、`"010"`→10、underscore不可、空文字→0、`"Infinity"`完全一致のみ(`"inf"`→NaN)。`parseInt`/`parseFloat`: **prefix消費**(`"123abc"`→123、`"1_000"`→1で`_`停止)。`BigInt("...")`: anchored+例外、`"010"`→10n(10進受理)だがリテラル`010n`→SyntaxError(文字列とリテラルで規則が逆転)。

argparse/commander/yargs: 三者ともstdlib変換に委譲、独自の数値受理域拡張なし。commanderは生文字列格納+利用者coercion完全委譲。

### Java / C# / JSON / POSIX / shell (担当4, Java/JSON/POSIX/shell実測、C#はdocのみ)

Java `parseInt`: anchored、10進固定(8進化なし)、前後空白trimなし。**実機とdocの食い違い**: JavaDoc散文は「decimal digitsのみ」と読めるが、実機は`Character.digit(char,10)`委譲によりUnicode桁を受理(`"٣"`→3, `"１２３"`→123)。実機優先で記録。

Java `parseDouble`: JavaDoc公式grammarに`FloatTypeSuffix: one of f F d D`が明記され、`"1.0f"`→1.0, `"1.0d"`→1.0(suffix1個まで、`"1.0dd"`拒否)。hex float受理だが`p`必須(`"0x1"`拒否、`"0x1.8p3"`→12.0)。inf/nanは大小厳密(`"infinity"`拒否)。空白trimは`[\x00-\x20]`除去(NBSP/全角空白は非trim)。

picocli 4.7.6: `Integer.parseInt`/`Double.parseDouble`に素通し委譲(独自拡張なし)、失敗を`ParameterException`に変換するのみ。

C# (**実機未確認、dotnet不在**): MS Learn doc — `int.Parse`既定は`NumberStyles.Integer`(前後空白許容、hex/桁区切りは要flag、`AllowHexSpecifier`指定時も`0x`prefix不可)。`double.Parse`は**culture依存が最重要**(一部cultureで小数点が","、桁区切りが"."になり得る)。inf/nanの大小区別は.NET Framework vs .NET Core 3.0+でバージョン差。System.CommandLineの既定cultureも実機未確認の要注意フラグ。

JSON (RFC 8259 §6 ABNF verbatim): `number = [minus] int [frac] [exp]`、`int = zero / (digit1-9 *DIGIT)` — leading zero・leading+を構造的に禁止。RFC本文に「such as Infinity and NaN are not permitted」と明記。

POSIX getopt/strtol/strtod: getopt自体は数値非解釈(optargは文字列のまま)、数値化はアプリ側のstrtol/strtod呼び出しに依存。POSIX strtol一次資料: base0で`0x`/`0X`=16進、先頭`0`=8進。

shell `$(())` (bash 5.x/dash/zsh 実測マトリクス):

| 入力 | bash | dash | zsh |
|---|---|---|---|
| `010` | 8(8進) | 8(8進) | 10(既定で8進化せず) |
| `0b101` | エラー | エラー | 5(2進対応) |
| `1_000` | エラー | エラー | 1000(対応) |
| `1.0` | エラー(整数のみ) | エラー | 1.(float対応) |
| `16#FF` | 255 | エラー(非対応) | 255 |

bash/dashは先頭0=8進化(罠)・float不可・`0b`不可。zshは既定で8進化せず2進/underscore/float対応という独自拡張。3shell共通で先頭符号可・空白trim・空文字列=0・`0x`hex全対応。

### 未実測フラグ (統合時の留意)

- C# `int/double.Parse`の`.5`/`1.`受理とSystem.CommandLine既定culture(dotnet不在)
- C++ `std::from_chars`(担当外)

## 参照ファイル (kuu側正本)

- `docs/decisions/DR-040-type-registry-dialects-and-restriction.md` (§canonical defaultの字句仕様)
- `docs/decisions/DR-041-token-reading-semantics.md` (§3 `-n1.0f`値付着、§5 prefixガード不採用)
- `docs/DESIGN.md` §3.3, §3.4
