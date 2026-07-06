# DR-074: number / bool canonical 字句の確定 — 実用寛容な固定字句と factory config

> 由来: issue `2026-07-05-distill-spec-gaps` の論点 #3 (number value_parser の受理構文の再検討)。DR-040 が canonical を「10 進最小構文」と規定する一方 DESIGN §3.4 は「最も寛容な仕様」と称し (G8 の文言矛盾)、number の leading `+` / 先頭 0 / `.5`・`1.` / 桁区切り / 基数 prefix / 特殊値 inf・nan と、bool の受理語彙・ignorecase・不正入力の帰結が未確定だった。3 本の言語横断調査 (下記 §根拠) を踏まえた kawaz 裁定 (2026-07-06) で number 字句を改訂・bool 字句を新設する。

## 決定

### 1. number canonical 字句

canonical (factory default config) の number は **10 進を基本とする、言語中立で再現可能な実用寛容字句** とする。「最小」でも「JSON 同型」でもなく、CLI 入力の実務で普通に来る形を受ける固定字句を 1 点に定める。

- **先頭符号**: `[+-]` を両方受理 (leading `+` 可)。`+5` = 5。
- **先頭 0**: decimal として解釈 (`007` → 7)。octal 解釈は canonical ではあり得ない (opt-in 時のみ、§4 の `number_leading_zero`)。同じ `010` が 8 と 10 に割れる移植事故 (findings: C base0 / Go base0 / bash 算術の罠) を canonical から排除する。
- **小数点のみ / 末尾小数点**: `.5` (先頭省略) / `1.` (末尾省略) を受理。float 系多数派 (C / Go / Python / Rust / Java) に一致し、JSON の `int frac` 構造制約は canonical の基準にしない。
- **指数**: `1e3` / `1E3` (従来どおり)。指数部の符号 `[+-]` は任意 (`1e-3` / `1e+3` / `1E+3` を受理、省略可) — §7。
- **桁区切り underscore**: default で受理 (config `number_thousand_sep`、default `["_"]`)。カンマはロケール依存 (`1,234` が 1234 とも 1.234 とも読める) かつ `multiple.separator=","` と衝突するため default 外 — opt-in で `["_", ","]` のように追加可能。
- **基数 prefix + hex float は統合 opt-in** (§2)。canonical (default) では整数 `0x1F` も hex float `0x1.8p3` も **Error** (not_a_number)。
- **特殊値 inf**: `float` 型のみ受理。`number` 型では Error。受理語彙は **`inf` / `infinity` の 2 語に固定** (case-insensitive なので `Inf` / `INF` / `Infinity` は case variant として含む)。先頭符号 `[+-]` を合成可 (`-inf` / `+Infinity`) — 確定集合と符号合成は §7。言語 DX (特定言語向け canonical types) が float の inf 非対応を選ぶことも許容 — その DX では未サポートで、必要ならユーザが registry に自作登録で解決する。
- **特殊値 nan**: 両型で Error (opt-in も置かない)。CLI 文脈で nan を値として使う場面はない。どうしても必要なら or + exact でアプリが受ける。
- **型 suffix (`1.0f` / `100n`)**: 不採用 (canonical にも標準層 opt-in にも置かない)。float / double の使い分けは要素の `type` で行う。Big 系は `bigxx` 型の領分 — 言語 DX の canonical types に bigxx を含めるかは DX ごとで、未サポート DX の `type: bigxx` は registry 未登録エラー (自分で実装して登録せよ、と誘導)。

`int` 型の整数制約 (非整数 = Error、reason `not_an_integer`) と `float` 型の関係は不変 (DESIGN §3.3)。ただし「float の受理域は number と同じ」は **「float = number + inf」に精緻化する** — number は inf を受けず float だけが受ける差分がある (上記 inf 規定)。

### 2. 基数 prefix / hex float の統合 opt-in (`number_allow_base_prefix`)

整数の基数 prefix (`0x` / `0o` / `0b`) と hex float (`0x1.8p3`) を **単一フラグ `number_allow_base_prefix` (default false) に統合**する。個別の `{"0x":16}` 指定や hex_float 独立フラグは採らない。

理由: hex float が書けるのに `0xff` が Error、あるいは整数 hex は書けるのに hex float が Error、というねじれを作らない。`0x` を有効化したら整数 hex も hex float も一括で有効になる。

有効時 (`number_allow_base_prefix: true`) の受理規則:

- **二進指数 `p`/`P` は任意** (C `strtod` 流)。`float` 型で `0xff` → 255.0 も `0x1.8p3` → 12.0 も `0x1.8` → 1.5 も受ける。`p` 必須にすると float で `0xff` が読めず「16 進整数は書けるが 16 進 float は書けない」同種のねじれが残るため、任意とする。
- **`int` 型は値空間で判定** (10 進と同一規則): `0x1.8p3` = 12 は整数値なので受理、`0x1.8p0` = 1.5 は整数でないため Error (`not_an_integer`) — 10 進の `1.5` が int で Error になるのと同じ規則を hex にも適用する。
  - **暫定注記 (裁定確認中)**: この「10 進 int への一般化」(= 10 進 int も値空間で判定し、整数値の非整数構文 `2.0` を受理する読み) は **kawaz 裁定待ち**。DR-050 §4 の整数構文規定「JSON string は整数構文のみ parse 受理」との整合を含め、int の String parse が構文判定か値空間判定かは未決 (本 DR §2 の hex 分岐と DR-050 §4 の 10 進分岐で判定軸が割れている)。裁定確定まで本節の 10 進 int 一般化は確定規定として扱わない。
- **`number` 型**: 整数・非整数いずれも受理 (`0xff` → 255、`0x1.8` → 1.5)。

内部整合 (レビュー確認済み観点):

- `e` は 16 進数字なので hex では桁として扱い、二進指数には `e` でなく `p` を使う (`0x1e2` = 482 は全体が hex、`0x1` + 10 進指数 `e2` には割れない)。10 進の `e` 指数と hex の `p` 指数は prefix (`0x` の有無) で一意に切り替わり衝突しない。
- canonical (false) では `0x1F` も `0x1.8p3` も Error で対称。opt-in (true) で両方が一括で成功に転じる。有効/無効のどちらでも「整数 hex は OK だが hex float は Error」のねじれは発生しない。

### 3. bool canonical 字句

- **`true_values` default = `["true", "1"]`**
- **`false_values` default = `["false", "0", ""]`**
- **`case_insensitive` default = `true`**
- 空文字 `""` は false 側 (env の `FLAG=` パターン対応)。`empty_is_false` のような独立キーは持たない — 空文字は `false_values` の要素として表現し、要素から外せば `""` は不正入力 (Error) になる。
- `yes` / `no` / `on` / `off` は **canonical 外**。`true_values` / `false_values` の config で opt-in 追加できる。YAML Norway problem (`NO` = ノルウェー国コードが bool 化) を canonical に再輸入しないための線引き。
- 不正 bool 文字列は **Error** (silent 変換しない — Java `parseBoolean` / Python `bool()` / JS `Boolean()` の「なんでも黙って bool 化」= モデル C を採らない、DR-021 の姿勢と整合)。

**bool↔number の線引き** (明文化):

- **文字列 `"1"` の parse (String → bool) は可** (bool 値パイプラインが `true_values` を照合)。CLI / env / config の文字列トークンはこの経路。
- **number 型の値 `1` からの型変換 (config native number → bool) は Error** (従来どおり、DESIGN の bool↔number Error 規定は不変)。config で `flag: 1` (JSON 数値) を bool 要素に入れるのは非強制 Error。
- 線引きの根拠: env の `XX_FLAG=1` / `FLAG=` 慣習は文字列であり、CLI / env / config が型パーサ (String → T) を共有する設計上、文字列 `"1"` / `"0"` / `""` を bool 語彙に含めるのが自然。一方 config native の JSON number は「文字列でなく数値型」なので型変換規則 (bool↔number 非強制) に従う。「文字列 parse では可、型変換では不可」の非対称を明示的に採る。

### 4. factory config キー (DR-061 configurable factory)

canonical = factory の default config。標準層 opt-in・方言は config キーの列挙 (DR-040 / DR-061)。`kuu_number_parser` / `kuu_bool_parser` factory の config キー:

| factory | config キー | canonical default | opt-in 例 | 備考 |
|---|---|---|---|---|
| `kuu_number_parser` | `number_thousand_sep` | `["_"]` | `["_", ","]` | カンマは locale / multiple.separator 衝突で default 外 |
| | `number_allow_base_prefix` | `false` | `true` | 整数 `0x/0o/0b` + hex float を一括有効 (§2) |
| | `number_leading_zero` | `"decimal"` | `"octal"` | `"decimal"`: `007`→7 / `"octal"`: `010`→8 (移植ロック用) |
| `kuu_bool_parser` | `true_values` | `["true", "1"]` | `+["yes","on","t","y"]` | 拡張語彙の実勢上限 = clikt |
| | `false_values` | `["false", "0", ""]` | `+["no","off","f","n"]` | true_values と対称、`""` は空入力=false |
| | `case_insensitive` | `true` | `false` | false で大小厳密 (JSON/TOML 準拠方言) |

- inf/nan は number_* の独立 config キーを持たない: inf は `float` 型で常時受理・`number` 型で常時 Error (型で分岐、config 化しない)、nan は両型で常時 Error。型 suffix も config キーを持たない (§1、不採用)。
- config は純データなので定義とともにシリアライズされ、方言構成の再現性が wire 上で担保される (DR-061)。config 値の検証は factory 自身の責務 (DR-061 §4)。

### 5. anchored 契約と負数・文字系値の消費

- **anchored 契約の明文化**: value_parser は **token 全体一致**であり、prefix 消費 (C `strtod` の endptr 式に「読めるところまで読んで残りを返す」= Model B) を **しない**。findings で Model B (C `strtol`/`strtod`/`atoi`・JS `parseInt`/`parseFloat`) が実在し、DR-038/DR-041 が明示的に置換対象とした「値トライアル長い方先勝ち commit」と同型である以上、Model B 出身の移植者による貪欲 commit の誤混入を防ぐため一文で固定する (DR-041 §5 の prefix ガード非採用と対の、値解釈側の anchored 規定)。
- **負数・文字系の値 (`-5` / `-inf` / `-1e3`) の消費は arity 駆動**: kuu は宣言から arity を知るので、値を要求する要素は次トークンを無条件に値として消費できる (docopt / getopt / picocli 型の arity 駆動消費、findings の実勢正解)。トークン形推測 (argparse の正規表現ガード / minimist の空白崩壊) は採らない。
- **short cluster 読みとの衝突** (例: `-inf` が short flag 列 `-i -n -f` とも読める場合) は、matcher が両候補を **枝として生成**し、完全経路の 0 / 1 / 2+ 本で決着する (DR-038 / DR-041 の既存原則)。読みモード指定 (「値優先モード」等) は導入しない。
- **アプリ都合の狭め・広げ** (カンマ除去 / `.5` の `0.5` 化 / suffix 除去等) は `pre_filter` で行う — factory config を無限に増やさない (DR-040 の「寛容 default + pre フィルタ」経路、DR-061 §5 の相の線引き)。

### 6. G8 (文言矛盾) の解消と canonical の位置づけ

DESIGN §3.4 の「canonical = 最も寛容な仕様」と DR-040 の「canonical = 10 進最小構文」の矛盾 (G8) を解消する。canonical は「最寛容」でも「最小」でもなく、**「言語中立で再現可能な、実用寛容を含む固定字句」** に位置づけを統一する。DESIGN §3.4 の文言を本表現へ改訂し、「JSON number 同型」の看板を外す (JSON の leading `+` 禁止・先頭 0 禁止・`.5`/`1.` 禁止という構造制約は canonical の基準ではない)。DR-040 の 3 層構造 (canonical / 言語 DX / ユーザ差し替え) と factory 方式 (DR-061) は不変で、本 DR が number の字句仕様を差し替え、bool の字句仕様を新設する。

### 7. 未規定組合せの pin (実装確定規則)

§1-§2 の字句を実装に落とすと未規定だった細部を、以下の合理的既定で確定する (レビュー指摘の pin)。いずれも canonical (default) と opt-in (`number_allow_base_prefix`) の両方で一貫する。

- **指数の符号**: 10 進指数 `e`/`E` の指数部に符号 `[+-]` を任意で許す。`1e-3` / `1e+3` / `1E+3` を受理、符号省略 (`1e3`) も受理。hex float の二進指数 `p`/`P` も同様に指数部符号任意 (`0x1.8p-3` / `0x1.8p+3`)。
- **inf の確定語彙集合**: `{inf, infinity}` の **2 語** (case-insensitive)。`Inf` / `INF` / `Infinity` は case variant として自動的に含まれる (別語として列挙しない)。先頭符号 `[+-]` を合成可 — `-inf` / `+inf` / `-Infinity` / `+Infinity` を受理 (符号は §1 の先頭符号規則が inf にも適用)。`float` 型のみ (§1)。「`inf` 等」のような開いた語彙表現は採らない (確定 2 語に閉じる)。
- **基数 prefix の大文字**: prefix 部は case-insensitive。`0X` / `0O` / `0B` も `0x` / `0o` / `0b` と同値で受理。hex の桁 (`a`-`f` / `A`-`F`) は元々 case-insensitive。有効化は `number_allow_base_prefix` (§2)。
- **小数部・二進指数は hex (`0x`) のみ**: 小数点付き (`0x1.8`) と二進指数 (`0x1.8p3`) は **hex float 限定**。`0o` / `0b` は **整数のみ** (小数点・指数を受けない) — C / Go / Java と同じ (8 進 float / 2 進 float のリテラル文法は存在しない)。`0o1.5` / `0b1.1` は Error。
- **`_` (thousand_sep) の配置文法**: 桁区切り `_` は **桁と桁の間のみ** (直前・直後の両隣が当該基数の桁であること)。連続 (`1__000`) 不可、先頭 (`_1`) / 末尾 (`1_`) / 小数点隣接 (`1_.5` / `1._5`) / 指数記号隣接 (`1_e3` / `1e_3`) / prefix 隣接 (`0x_ff` / `0_x`) は不可。意味論は **「配置を検証して除去」** — 配置規則を満たせば除去して数値化し、満たさなければ Error。桁グループ幅 (3 桁区切り等) の検証は **しない** (`12_34_5` も配置規則を満たせば受理)。opt-in 時の hex 内 (`0xff_ff`) も同一規則 (両隣が hex 桁)。
- **符号付きゼロ `-0` / `+0`**: 通常の数値として受理 (値空間で `0`)。`int` 型でも受理 (0 は整数)。特別扱いしない。

これらは canonical 字句の完全な輪郭を成し、value-typing fixture 群 (`fixtures/value-typing/`) の golden がこの規則を被覆する。

## cluster-split fixture への波及 (`-n1.0f`)

型 suffix 不採用 (§1) は、DR-041 §3 / DR-038 が「値パーサが `1.0f` と `1.0` の両方を受理する **場合**」の帰結として引く `-n1.0f` → ambiguous の例に波及する。canonical number は `1.0f` を **受理しない** (Error) ため、canonical で number 要素にこの例を具現化すると:

- `fixtures/matcher-readings/cluster-split.json`: 値付着読み `n="1.0f"` は not_a_number の held Error に落ち、分割読み `n="1.0"` + `-f` のみが完全経路 → **ambiguous でなく success `{n:1, f:true}`** に変わる。
- `fixtures/matcher-readings/cluster-split-no-flag.json`: `f` 未定義では分割読みが立たず唯一の読み `n="1.0f"` が Error → 完全経路 0 本 → **success でなく failure** (errors: element=n / kind=parse / reason=not_a_number)。

DR-038 の当該例は「値パーサが受理する **場合**」という**条件形の仮説**なので DR-038 / DR-041 の本文は不変 (lenient 方言 parser を使えば依然として ambiguous になる)。矛盾していたのは canonical number でこの仮説を具現化していた両 fixture の golden であり、これらを canonical 準拠 (suffix → Error) に更新する。multiple-Accept ambiguity 原則自体は suffix 非依存の string 値 fixture (`fixtures/matcher-readings/cluster-split-string.json`) で被覆を維持する。

## 根拠 (言語横断調査)

3 本の findings が本裁定を裏付ける:

- **`docs/findings/2026-07-06-number-parsing-cross-language.md`** / **`docs/findings/2026-07-06-cli-parser-lib-survey.md`**: CLI パーサライブラリ 28 種の default 中央値は「厳格 10 進 + 不正 Error」(S1 群 12/19)。leading `+` は許容が中央値 (拒否は oclif のみ)、`007` は 10 進解釈が多数派 (8 進化は Go/pflag/cobra の罠)。`0x` 無条件受理は JS `Number` のみで多数派は opt-in か拒否。型 suffix は Java `parseDouble` 1 例のみの特異仕様。anchored が多数派で prefix 消費 (Model B) は少数派 (C 系 + JS parseInt)。→ canonical を「実用寛容な 10 進固定字句 + opt-in 拡張」に置く判断が中央値慣習と整合。
- **`docs/findings/2026-07-06-bool-parsing-cross-language.md`**: bool default 中央値は「厳密 true/false (大小無視多数派)」。拡張語彙 (yes/no/on/off) は少数派で Norway problem の温床。env の `XX_FLAG=1` / `FLAG=` (presence/値解釈) 慣習が 1/0/"" を canonical に含める決め手。silent 変換 (モデル C) は kuu の bool↔number Error 姿勢と非整合で全案共通不採用。config↔CLI の語彙一致 (G7) を保つには canonical を過度に寛容にできない (Norway 型の経路別解釈を避ける)。→ `["true","1"]` / `["false","0",""]` + ci は「厳密 true/false を基準に env 慣習の 1/0/"" だけ足す」中庸で、yes/no は opt-in 送り。

## 採用しなかった案

### JSON number 厳密 (leading `+` 禁止・先頭 0 禁止・`.5`/`1.` 禁止)

JSON の `int = zero / (digit1-9 *DIGIT)` は leading `+` と先頭 0 を構造的に禁じ `.5`/`1.` も不可。cross-host byte-identical と JSON 相互運用が制約由来だが、CLI 入力の `+5` / `007` / `.5` を弾き CLI 慣習と乖離する。kuu は wire 上の JSON 表現 (結果値) と CLI 入力字句を分離できるので、入力字句を JSON の構造制約に縛る必要がない。

### 型 suffix 受理 (`1.0f` / `100n`)

Java `parseDouble` の `FloatTypeSuffix` は言語リテラル文法との対称性という単一目的の特異仕様 (survey 1 例)。kuu は型を要素の `type` で決めるため値内 suffix で型を表すのは思想が異なる。さらに suffix を方言で受理すると DR-041 §3 の `-n1.0f` 値付着経路が常に成功し short 分割との ambiguous 判定が化ける (findings 軸5)。float/double は type、Big 系は bigxx 型で表す。

### nan 受理 (opt-in を含む)

CLI 文脈で nan を値として渡す場面がなく、`--threshold=nan` に意味論的な用途がない。opt-in フラグを置いても死蔵する。必要な例外用途は or + exact でアプリが個別に受ければよい。inf は科学計算 CLI で閾値として実在するので float 型で受けるが、nan は両型 Error に固定。

### 基数の個別指定 (`{"0x":16, "0o":8}` map)

DR-061 の例が示す map 形は表現力が高いが、canonical 運用では「16 進整数は許すが hex float は禁じる」等のねじれ構成を招く。単一フラグ `number_allow_base_prefix` に統合すれば整数 hex と hex float が常に連動し、ねじれが原理的に発生しない。細粒度が要る方言は value_parser 差し替えで表現する。

### `empty_is_false` 独立キー

空文字を false にするか否かは `false_values` に `""` を含めるか否かで表現できる。独立キーは `false_values` と冗長な二重管理になり、両者が食い違う構成 (`empty_is_false:false` かつ `false_values:["",...]`) の解釈が不定になる。空入力の扱いは `false_values` の要素として一元化する。

### 読みモード指定 (「値優先モード」等)

`-inf` が値 (`-inf`) か short 列 (`-i -n -f`) かを mode フラグで切り替える案。評価器に mode 状態を持たせると DR-041 §5 の「prefix ガード非採用 / mode 状態を持たない」方針に反する。matcher の枝生成 + 完全経路の一意化 (DR-038/041) で決着するので mode は不要。

## DR-040 の canonical 字句節との関係

本 DR は DR-040 §「canonical default の字句仕様」のうち **number の字句仕様を差し替え** (10 進最小 → 実用寛容固定字句 + 基数統合 opt-in + inf/nan 規定)、**bool の字句仕様を新設**する (DR-040 には bool の字句項がなかった、findings G1)。DR-040 の 3 層上書き構造・2 系統の方言軸 (pre_filter で狭める / value_parser 差し替え)・configurable factory 方式 (DR-061) は不変。exact / path / count 系の canonical 字句も不変。

## 関連

- DR-040 (type registry の方言 3 層 — 本 DR が number 字句を改訂・bool 字句を新設、3 層構造は不変) / docs/DESIGN.md §3.3-3.4 (canonical 字句の正本、本 DR で改訂)
- DR-061 (configurable factory — canonical = default config、`kuu_number_parser` / `kuu_bool_parser` の config キーは §4) / DR-066 (reason 語彙 — `not_a_number` / `not_an_integer`、inf/nan/suffix の Error はこれらに落ちる)
- DR-041 (トークン読み — §5 anchored 契約と対、`-n1.0f` 条件形例は不変) / DR-038 (完全経路一意性 — `-n1.0f` 条件形例は不変、fixture golden のみ canonical 準拠へ) / DR-037 (Reject/Error — 値パーサ失敗は held Error)
- DR-021 (warn はする reject はしない — bool の silent 変換非採用の姿勢) / DR-050 (config 値源 — bool↔number 非強制 / config native number → bool Error の不変)
- findings `2026-07-06-number-parsing-cross-language.md` / `2026-07-06-bool-parsing-cross-language.md` / `2026-07-06-cli-parser-lib-survey.md` (根拠、§根拠)
- issue `2026-07-05-distill-spec-gaps` 論点 #3 (本 DR で決着) / G8 (文言矛盾解消、§6)
