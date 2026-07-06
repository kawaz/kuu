# bool 受理語彙 言語横断調査 — 3 モデル分類・kuu 未議論 G1-G8・canonical 3 択

spec-gaps issue #3 (数値受理構文の再検討) の拡張調査として、bool 値の文字列受理語彙を JSON/TOML/YAML・Rust/Go/Python/JS/Java/C#・CLI パーサ (clap/pflag/cobra/argparse/yargs/commander/picocli/System.CommandLine)・設定ファイル形式 (git config/systemd/PostgreSQL/MySQL/SQLite)・環境変数慣習 (NO_COLOR 系/strtobool 系)・shell の全域で実機検証・一次資料照合し、kuu canonical (DR-040/DESIGN §3.3-3.5) と突き合わせた (kawaz 依頼 2026-07-06)。canonical の選択は未裁定、3 択を並列提示する。

## 判明した事実

### 横断マトリクス (受理語彙)

| 対象 | true 側 | false 側 | ignorecase | 数値 1/0 | yes/no/on/off | 不正入力 | trim |
|---|---|---|---|---|---|---|---|
| JSON | `true` | `false` | ✗厳密 | 別型(int) | ✗ | **parse error** | 外側のみ |
| TOML 1.0 | `true` | `false` | ✗厳密 | 別型(int) | ✗ | **error** | — |
| YAML 1.2 Core | `true/True/TRUE` | `false/False/FALSE` | 3形のみ | 別型(int) | ✗(→str) | **str に silent 解決** | — |
| YAML 1.2 JSON-schema | `true` | `false` | ✗厳密 | 別型 | ✗ | str 解決 | — |
| **YAML 1.1 spec** | `y/yes/on/true` 全形 | `n/no/off/false` 全形 | 3形+単字 | 別型 | **✓(Norway)** | str/int silent | — |
| PyYAML(1.1実装) | `yes/on/true`(3形) | `no/off/false`(3形) | 3形のみ | 別型 | ✓(単字y/nは**str**) | str/int silent | — |
| Rust `FromStr` | `true` | `false` | ✗厳密 | ✗ | ✗ | **Err** | ✗ |
| clap 既定`bool` | `true` | `false` | ✗厳密 | ✗ | ✗ | **error** | ✗ |
| clap `Boolish` | `y yes t true on 1` | `n no f false off 0` | ✓ | ✓ | ✓ | **error** | — |
| Go `strconv.ParseBool` | `1 t T TRUE true True` | `0 f F FALSE false False` | 3形のみ(混在不可) | 1/0のみ | ✗ | **error** | ✗ |
| Go flag/pflag/cobra | 同上(=value 時) | 同上 | 同上 | 1/0 | ✗ | **parse error** | ✗ |
| git config | `true yes on 1`+非0整数 | `false no off 0`+空値 | ✓完全 | ✓(非0=真,16/8進も) | ✗(単字不可) | **error rc128** | ✗(値内空白不可) |
| systemd | `1 yes y true t on` | `0 no n false f off` | ✓完全 | 1/0 | ✓(単字含む) | **-EINVAL** | — |
| strtobool(削除済) | `y yes t true on 1` | `n no f false off 0` | ✓ | 1/0 | ✓ | **ValueError** | ✗ |
| PostgreSQL | `true yes on 1`+**一意接頭辞** | `false no off 0`+接頭辞 | ✓ | 1/0のみ | ✓ | **error** | **✓する** |
| C# `bool.Parse` | `True`(ci) | `False`(ci) | ✓ | ✗ | ✗ | **例外** | **✓する** |
| picocli | `true`(ci) | `false`(ci) | ✓ | ✗(error) | ✗(error) | **例外** | ✗ |
| System.CommandLine | `true`/`false` | 同 | ✓ | ✗(推論) | ✗(推論) | parse error | — |
| yargs `=value` | `true` | `false` | ✗厳密 | **silent false** | **silent false** | **silent false(罠)** | — |
| **Java parseBoolean** | `true`(ci) | **それ以外全部** | ✓ | 全部false | 全部false | **silent(罠)** | ✗ |
| Python `bool(str)` | 非空全部 | 空`""`のみ | — | "0"もTrue | 全部True | **silent(罠)** | ✗ |
| JS `Boolean(str)` | 非空全部 | 空`""`のみ | — | "0"もtrue | 全部true | **silent(罠)** | ✗ |
| MySQL | `TRUE`=1 | `FALSE`=0 | — | 非0=真 | ✗ | 数値キャスト | — |
| SQLite | 数値のみ(`'true'`=**false**) | `'false'`=false | — | 非0=真 | ✗ | 数値キャスト | — |
| shell `[ "$v" ]` | 非空全部(`"false"`も真) | 空のみ | — | — | — | 非空判定 | — |
| libc | **パーサ不在** | — | — | — | — | — | — |

### 傾向・多数派/少数派

- **true/false のみ厳密 = 最多数派** (JSON/TOML/YAML1.2/Rust/clap既定/C#/picocli/System.CommandLine/yargs)。設定ファイル形式と静的型言語 stdlib はここに集中。
- **拡張語彙 (yes/no/on/off + 1/0, ci) = 第二勢力** (git/systemd/strtobool/PostgreSQL/clap Boolish/YAML1.1)。運用系 (init/config) と DB。
- **単字 `y/n/t/f` を受けるのは少数派**: systemd / strtobool / PostgreSQL(接頭辞) / Go(`t/f`のみ)。YAML1.1 spec は規定するが **PyYAML 実装は削除** (doc↔impl 不一致)。
- **数値 `1/0` を受けるのは中間層** (Go系/git/systemd/strtobool/PostgreSQL/clap Boolish)。**`2`/`-1` を bool 受理する実装は皆無** (DB の数値キャストを除く)。
- **trim する少数派**: C# / PostgreSQL のみ。**大多数は trim しない**。
- **不正入力を silent 処理 = 罠勢** (少数だが影響大): Java parseBoolean / Python bool() / JS Boolean() / yargs `=value` / DB キャスト。

### 設計モデルの 3 分類

**モデル A: 厳密 true/false のみ (有限 2 値・不正はエラー)**
代表: JSON, TOML, YAML1.2, Rust `FromStr`, clap 既定, C#, picocli, System.CommandLine。
設計理由: 言語中立で再現可能・移植で挙動が割れない・設定ファイルのラウンドトリップが安定。型システムが「文字列 bool」を境界イベントとしてしか扱わないので、曖昧語彙を持たないのが自然。
トレードオフ: CLI/env で人間が `1`/`yes`/`on` を打ちたい欲求を満たさない → 拡張は opt-in。

**モデル B: 拡張語彙 (yes/no/on/off/1/0, ci, 不正はエラー)**
代表: git config, systemd, strtobool(de-facto), PostgreSQL, clap `BoolishValueParser`, YAML1.1。
設計理由: 運用系/設定系は人間が手打ちする頻度が高く、寛容な語彙が DX を上げる。「寛容だが不正はエラー」を守るので silent 罠は無い。
既知の事故: **YAML Norway problem** — `NO`(ノルウェー国コード)/`ON`/`OFF`/`yes`/`no` を bool 化 → 国リストや文字列を意図した値が勝手に真偽値になる。YAML1.2 が Core Schema でこれを廃止した動機そのもの。同名ツール "yq" が Python(1.1=Norway あり) と Go(1.2=なし) で解釈が割れるのも同根。

**モデル C: なんでも黙って bool 化 (silent 変換・エラーを出さない)**
代表: Java `parseBoolean`(`"true"` 以外は全部 silent false・null も false), Python `bool()` / JS `Boolean()`(非空=true, 空=false, 内容無視), MySQL/SQLite(数値キャスト, `'true'`→**false**), yargs `=value`(未知語は silent false), NO_COLOR(存在=真, 値無視)。
設計理由: truthiness の一般規則 (空/非空) や数値キャストを bool に流用しただけで、bool 専用の語彙判定を持たない。実装が最小で済む。
既知の事故: Java `parseBoolean("ture")`(タイポ)/`("yes")`/`("1")` を全て黙って false → 検知不能。SQLite の文字列 `'true'` を条件に使うと数値キャスト 0 = false。NO_COLOR は `NO_COLOR=0` でも `NO_COLOR=false` でも色が無効化される (値で有効化に戻せない)、空文字だけ「無視」。shell `[ "false" ]` は非空なので真。

モデル C の silent 変換は kuu の姿勢 (`bool↔number` は Error、値の意味を勝手に作らない原則) と非整合であり、全案共通で不採用が妥当。争点はモデル A と B のどちらを canonical に置くか。

### CLI 特有の次元

- **存在ベース flag ⇔ 値付き bool**: 存在ベース (`--flag`→true) が CLI の主流 (Go flag/pflag, clap `SetTrue`, argparse `store_true`, commander, System.CommandLine, kuu の `flag` プリセット)。値付き (`--flag=true`) を受けるかは実装で割れる — 受ける: Go flag/pflag/cobra(ParseBool), picocli, yargs, System.CommandLine。拒否: clap `SetTrue`, argparse `store_true`, commander(`unknown option`)。
- **`--no-` 否定形**: 自動生成派 (pflag `NoOptDefVal`, argparse `BooleanOptionalAction`, commander) と、明示宣言派 (kuu の variant DSL `["no:set:false"]`) に分かれる。kuu は否定入口を明示的に生やし、効果は `op:unset`/`op:set false` を選べる分、他 CLI より表現力が高い。
- **環境変数慣習**: 統一標準は存在しない。presence ベース (NO_COLOR/FORCE_COLOR: 存在+非空で真、値の中身を見ない、空文字=無視) と、値解釈 (strtobool 系, `DEBUG=1`: 値を語彙判定、`DEBUG=0` の解釈がツールで割れる) の 2 系統。

### kuu で未議論の 9 ケース (G1-G8)

kuu 側で読んだ正本: `docs/DESIGN.md` §3.3-3.5 / §11 / §12、DR-040(型 registry と方言)、DR-005(型カテゴリ)、DR-011/071(long variant DSL)、DR-045(効果記述子)、DR-050(config 値源)、DR-061(configurable factory)、`LOWERING.md` §B.1。

| # | 未議論ケース | 現状 | 影響 |
|---|---|---|---|
| G1 | **bool canonical の受理語彙そのもの** | DR-040 §字句仕様に number/exact/path/count はあるが bool の項が無い。`true/false` のみか `1/0` を含むか `yes/on` を含むか未定義 | 最重要。設計選択が要る |
| G2 | **ignorecase** | 未定義。`True`/`TRUE` を canonical で受けるか | 言語横断で挙動割れの主因。number では非論点だが bool では必須 |
| G3 | **不正 bool 文字列の帰結** | 型名解決は「warn+string フォールバック」(DESIGN §3.2)。値 parse 失敗の規定は bool について明示なし。`bool↔number` は Error (DESIGN L945) | Error か warn か silent かを固定しないとモデル A/B/C の分岐が閉じない |
| G4 | **`flag` プリセットの `=value` 挙動** | `count` の `=N` 素通しは明記、`flag=true`/`flag=1` は未明記 | picocli 受理 / clap 拒否 / yargs silent の三択が未確定 |
| G5 | **trim** | number canonical は「10進最小構文のみ」で暗黙 trim なし、bool は無言 | C#/PostgreSQL のみ trim。前後空白 `" true"` の扱い |
| G6 | **presence ベース env bool** | env は値解釈型のみ (DR-049) | NO_COLOR 型慣習を型システムで表現できない非対称 |
| G7 | **config native bool と CLI/env bool 語彙の一致** | config は型一致 native bool を post_filters のみで通す (DR-050 §4)。CLI/env は文字列 parse | canonical を拡張語彙 (モデル B) にすると、TOML の `no`(文字列) と kuu bool parser の `no`(false) で同じ設定を経路により別解釈する Norway 型の食い違いが起きうる |
| G8 | **DESIGN の文言矛盾** | §3.4「canonical=最も寛容な仕様」 vs DR-040「数値は10進最小構文のみ」 | number canonical は実際には「最小=厳格側」。bool 設計時「最も寛容」に引きずられるとモデル B に流れるが、number 実装はモデル A 相当。設計哲学の一貫性のため文言修正が要る |

## 実用的な示唆

### 全案共通の前提 (排他ではない・確定推奨)

- **モデル C (silent 変換 / truthy) は採らない**: `bool↔number は Error` (DESIGN L945) と DR-021 の姿勢に照らし、不正 bool 文字列は Error (または DR-021 の warn 経路のどちらか、G3 を先に確定)。Java/Python/JS の黙変換は kuu の「値の意味を勝手に作らない」原則と非整合。
- **否定は既存の variant DSL で足りている** (DR-011/071)。bool 語彙の議論は「入口の否定」ではなく「値スロットに来た文字列の受理語彙」に限定される。
- **層の道具立ては DR-061 の configurable factory がそのまま使える**: canonical = factory の default config、標準層 opt-in = config キー (`ignorecase` / `accept_numeric` / `accept_yes_no`)、方言 = `contrib_git_bool` / `contrib_systemd_bool` / `contrib_python_bool` の value_parser 差し替え。

### canonical の 1 点をどこに固定するか (A / B / C' は排他 — 1 つしか選べない)

canonical は「言語中立で再現可能な 1 つ」(DR-040) であり、3 案は同じ 1 点の別位置なので統合不可 (ハイブリッド不可)。

**選択肢 A: canonical = 厳密 `true`/`false` のみ (大小厳密・不正 Error)**
制約由来: 「移植で byte-identical」を最優先。JSON/TOML/Rust と一致。number canonical(10進最小) と同一哲学 = 最小コア + opt-in 拡張。G8 の文言矛盾も「canonical は最小・予測可能」に統一する形で解消。
トレードオフ: `1`/`yes`/`on`/大小無視 はすべて標準層 opt-in が必須。G7 (config Norway 食い違い) は起きない (native bool と語彙が最小で一致)。

**選択肢 B: canonical = 拡張語彙 (`true/false/yes/no/on/off/1/0`, ci, 不正 Error)**
制約由来: CLI/運用系 DX 最優先。git/systemd/strtobool の de-facto 寛容セットに一致。DR-040 の「canonical=寛容 default, 方言=そこからの逸脱(狭める)」構図に文言上は最も忠実。
トレードオフ (排他制約): canonical を寛容にすると G7 が発火 — config file 値源 (DR-050) で TOML/JSON の native `no`/`off`(文字列) と、CLI/env 経路で kuu bool parser が読む `no`/`off`(false) が同じ綴りで別解釈になり、YAML Norway problem を kuu が再輸入する。config↔CLI の語彙一致を保つには canonical を寛容にできない、という制約が A と B を排他にする。

**選択肢 C': canonical = `true`/`false` + `1`/`0` (Go `strconv.ParseBool` 相当・中庸)**
制約由来: Go エコシステムの中庸。数値 1/0 だけ足し、`yes/no/on/off` は入れない (Norway 語彙を避ける)。
トレードオフ: `1`/`0` を bool 受理すると `bool↔number は Error` (DESIGN L945) の境界と緊張 — CLI で `--flag=1` を許すのに config の number 1 → bool は Error、という非対称。数値 bool を「文字列 parse では可、型変換では不可」と割り切れるなら成立するが、その線引きの明文化が要る。

3 層配置の骨格 (どの canonical を選んでも共通):
```
canonical      : A / B / C' のいずれか 1 点 (factory default config)
標準層 opt-in  : configurable factory の config キーで canonical から広げる/狭める
                 例: {ignorecase:true} / {accept_numeric:true} / {accept_yes_no:true}
方言           : value_parser 差し替え (移行ロック)
                 contrib_git_bool / contrib_systemd_bool / contrib_python_bool (truthy 再現)
```

number canonical が実装上「最小=厳格」に倒れている事実 (G8) と、config↔CLI の語彙一致で Norway 型事故を避けられる点 (G7) から、選択肢 A が number との設計一貫性・再現性・事故回避で優位という見方ができる。B の DX は標準層 opt-in で回収でき、しかも要素/アプリ単位で明示できるため「寛容にした事実」が wire に残る (DR-061 のシリアライズ再現性)。ただし A/B/C' は canonical の 1 点を選ぶ排他判断であり、DX を canonical 既定で寛容にしたい (opt-in を書かせたくない) なら B、という価値判断が分岐点。ここは並列提示にとどめ、決定は未裁定とする。

**先に閉じるべきは G8 の文言 (§3.4「最も寛容」vs DR-040「最小」) の統一と、G1/G3 の bool canonical 字句項の追加**。この 2 つを確定しないと A/B/C' の比較が地に足がつかない。

## 検証の詳細

検証環境: go1.26.4 / rustc 1.96.0 (clap 4.6.1, pflag 1.0.10, cobra→pflag 1.0.9) / Python 3.14.6 / node v26.4.0 (yargs 18.0.0, commander 15.0.0) / openjdk 21.0.11 / picocli 4.7.6 / sqlite3 3.51.0 / git 2.54.0 / bash。C#/PostgreSQL/MySQL/systemd は実機不在のため公式一次資料で確認。

### Go `strconv.ParseBool` (全列挙・実機確認)

受理はちょうど12語 (true側: `1 t T TRUE true True`、false側: `0 f F FALSE false False`)、それ以外は全て `invalid syntax` error。大小は「全大文字/全小文字/先頭のみ大文字」の3形だけ許可、`tRuE` 等の任意混在は不可 (ignorecase ではない)。数値は `1`/`0` のみ、`2`/`-1`/`01`/`10` は error。`yes/no/y/n/on/off` は全て error。trim しない (`" true"` も error)。

Go `flag` / pflag / cobra は内部で `strconv.ParseBool` に委譲し受理語彙は完全一致 (実機確認: `--verbose=yes` → `invalid boolean value "yes" for -verbose: parse error`)。スペース区切り `--verbose true` は次トークンを消費せず positional に落ちる。

### Rust `str::parse::<bool>` / clap

Rust FromStr は `true`/`false` の2語のみ、大小厳密、数値・省略形・trim すべて不可、空文字も Err (stdlib で最も厳格)。clap は 3形態で挙動が大きく違う: `ArgAction::SetTrue` は純粋な存在ベースで `--flag=true` はエラー、`value_parser!(bool)` は FromStr 依存で `true`/`false` のみ、`BoolishValueParser` (opt-in) のみ `y yes t true on 1` / `n no f false off 0` を case-insensitive で受理 (`enable/disable`/`2`/空文字は error)。

### Python / JS の truthiness 罠 (実機確認)

Python `bool(str)`: `bool("false")==True`, `bool("0")==True`, `bool("no")==True`。空文字列 `""` だけが False (内容を一切見ない)。`argparse type=bool` はこれを各値に適用するため `--typed=false` → True になる典型的な地雷。`distutils.util.strtobool` (CPython 3.11 一次資料): `y yes t true on 1` / `n no f false off 0` を `.lower()` で case-insensitive 判定、それ以外は ValueError。ただし戻り値は int (1/0) であって bool でない。**PEP 632 により Python 3.12 で削除済み、公式代替なし** (実機 3.14.6 で `ModuleNotFoundError`)、実務的フォールバックは setuptools 同梱コピーか自前再実装。

JS `Boolean(str)` は Python `bool()` と同型の罠。`yargs type:"boolean"` の `=value` は **literal `true`/`false` のみ**判定、`--flag=True`/`--flag=1`/`--flag=yes`/`--flag=on` はすべて**silent に false** (エラーを出さないため発見しにくい罠)。

### Java parseBoolean vs picocli/C# (実機確認 Java/picocli、doc確認 C#)

Java `Boolean.parseBoolean`: true側は `"true"` のみ (ignorecase)、false側は「それ以外全部」という専用語彙を持たない設計。不正入力はエラーにならず silent に false (`parseBoolean("ture")` タイポも `parseBoolean("yes")` も黙って false、null も false)。trim しない。

picocli 4.7.6 は Java 素の `parseBoolean` を素通しせず、`true`/`false` 以外を `ParameterException` にするラッパを噛ませている (空文字のみ例外的に false)。C# `bool.Parse` (公式 doc) は `True`/`False` のみを ignorecase で受理、不正入力は `FormatException`、**trim する**点が Java/picocli と異なる (「optionally preceded or trailed by white space」)。

### 設定ファイル形式・環境変数 (実機 + 一次資料)

JSON (RFC 8259) / TOML 1.0 はいずれも `true`/`false` のみで大小厳密、不正入力はパースエラー (silent 落ちなし)。実機確認: `json.loads('{"k": True}')` → `JSONDecodeError`。TOML 実機: `True`/`yes`/`on`/`y`/`n` すべて `TOMLDecodeError: Invalid value`。

**YAML 1.1 spec vs PyYAML 実装の食い違い**: 一次資料 (yaml.org/type/bool.html) の regexp は `y|Y|yes|Yes|YES|n|N|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF` で、これが悪名高い **Norway problem** (`NO` がノルウェー国コードと衝突) の出所。実機 PyYAML 6.0.3 (SafeLoader) では単字 `y/Y/n/N/t/f` は**削除されて str 扱い**、mixed-case (`TrUe`) も非対応で spec と実装が一致しない。YAML 1.2 は Core Schema でこの問題を廃止 (`true/True/TRUE` の3形のみ)、実機 yq(Go, mikefarah) で確認。**同名ツール "yq" が Python版(kislyuk/yq, PyYAML=1.1でNorwayあり)と Go版(mikefarah/yq, 1.2でなし)で挙動が割れる**。

git config (実機 git 2.54.0, 総当たり): `true yes on 1`+非ゼロ整数 (16/8進も解釈) が true、`false no off 0`+空文字値が false、完全 case-insensitive、単字不可、不正入力は rc=128 でエラー停止、値内空白は trim しない。bare key (`[core]\n flag` で値なし) は true、`test.key = ` (空値) は false という差がある。

systemd `parse_boolean` (ソース `src/basic/parse-util.c` 一次資料): `1 yes y true t on` / `0 no n false f off` を case-insensitive、それ以外は `-EINVAL`。strtobool とほぼ同一語彙。

NO_COLOR (一次資料 no-color.org): 「when present and not an empty string (regardless of its value), prevents...」— 存在+非空のみ判定、値の中身を見ない。`NO_COLOR=0` でも色は無効化される (値で有効化に戻せない罠)、空文字は無視。

PostgreSQL (公式 doc): `true yes on 1` / `false no off 0` に加え**一意な接頭辞**まで受理 (`t/tr/tru`→true, `o` は on/off 曖昧で不可)、case-insensitive、trim する。MySQL は `BOOL`/`BOOLEAN` が `TINYINT(1)` の別名で非0=真の数値キャストのみ、文字列語彙の受理は無い。SQLite (実機確認) は文字列 `'true'`/`'false'` を bool として解釈せず数値キャストするため `'true' IS TRUE` は **0 (false)** になる罠。shell `[ "$v" ]` は文字列 `"false"` も非空なので真、文字列 bool 語彙という概念自体を持たない。libc (`stdbool.h`, clang 21 builtin header で確認) は型/マクロ定義のみでパーサ不在。

## 参照ファイル (kuu 側正本)

- `docs/DESIGN.md` §3.3-3.5, §11, §12
- `docs/decisions/DR-040-type-registry-dialects-and-restriction.md` (§canonical default の字句仕様)
- `docs/decisions/DR-005`, `DR-011`, `DR-021`, `DR-045`, `DR-049`, `DR-050`, `DR-061`, `DR-071`
- `LOWERING.md` §B.1 (bool/flag の lowering 実例)
