# DR-117 補完生成器の座席設計 — kuu.mbt / kuu-cli / spec templates の分割線と実装計画

> 由来: DR-117 (`docs/decisions/DR-117-completion-generator-abi.md`) 波及節が ux 設計へ送った
> 「MoonBit 実装の座席」の確定素材。DR-117 の受理面 (preset lowering / capability 席 /
> builtin completer 2 種) は spec (main = `33875f8b` 以降) と kuu.mbt (main = `bac48071` 以降)
> に land 済みで、本 findings はその先 — capability の**実装**がどこに住み、glue テンプレが
> どこを正本とし、各言語アプリの main がどう呼ぶか — を扱う。裁定素案は末尾の UXL-Q バッチ
> (ラベルは DR-109 が UX-Q1〜Q7 を消費済みのため UXL- を使う)。

## 0. 前提の地図 (ゼロコンテキスト読者向け)

### 0.1 確定済み契約 (本 findings はどれも変更しない)

- **2 つの capability** (DR-117 §1): `completion_script` (glue script 生成、登録時 1 回) /
  `completion_query` (補完候補の行指向応答、補完のたび)。概念シグネチャは DR-117 §1 が確定、
  fixture では検証しない
- **env プロトコル** (DR-117 §3): `KUU_COMPLETE=<UUID>` env と `argv[1]` の完全一致 (二箇所一致)
  で query モード突入。不一致は env 未設定時と観測等価 (§3.2、規範)。`KUU_COMPLETE_INDEX` で
  cword、words は補完対象コマンド名を先頭に含む全量 (§3.4)
- **行文法** (DR-117 §4): タブ区切り候補行 + `:` directive 行。規範だが conformance fixture では
  検証しない
- **policy 適用は binary 内 1 箇所** (DR-117 §5): glue は収集と翻訳のみ
- **形態 A (セルフバイナリ) が主、形態 B (kuu-cli) が従** (DR-117 §6)。形態 B は env プロトコル
  を使わず正規サブコマンドで capability を露出
- **product test 必須シナリオ 5 本** (DR-117 §8.2): 玄関判定の 5 分岐。policy 適用の正しさは
  「行指向応答の単位」(glue でなく `completion_query` の出力) で検証

### 0.2 land 済みの受理面 (実物確認 2026-07-23)

- spec: `schema/wire.schema.json` に `completion_script` type 値、`schema/builtin-descriptors.json`
  に `completers` 区分 (`files` / `dirs`)、`fixtures/definition-error/completion-script-invalid-range.json`
  等の fixture
- kuu.mbt: `src/kuu/wire_decode.mbt` (type 受理) / `src/builtins/installer.mbt` (内部セル
  `#completion_script` への link) / `src/builtins/completer_residents.mbt` (files / dirs 住人) /
  `src/kuu/completion.mbt` (capability 席 `completion_script_capability()` と
  `dispatch_completion_script` — **preset 発火の観測まで**。script 生成実装は未着手)
- kuu-cli: `impl/mbt/cli/src/main/main.mbt` に parse / complete / validate / help の 4 サブコマンド。
  completion 系サブコマンドは未着手

### 0.3 help の前例 (対称性検討の素材)

- kuu.mbt `src/kuu/help.mbt`: `help_query_capability()` (capability 席) + `dispatch_help_query()`
  (registry lookup + invoke) + `help()` (model 組み立て本体)。**構造化 HelpModel を返すまで**が
  kuu.mbt の責務
- kuu-cli `impl/mbt/cli/src/lib/renderer.mbt`: DR-115 canonical テキストレンダラ (model → 人間向け
  テキスト)。`impl/mbt/cli/src/lib/wire.mbt`: model → JSON wire 射影。どちらも kuu-cli 側
- この分割が成立した根拠 (DR-115 §6.2): レンダラ出力 (適用後バイト列) は**非規範** — 揺れてよく、
  独立レンダラが複数居てよい。だから product 側に住めた

## 1. 論点 1: 座席の分割線 — help 前例の「対称」をそのまま写せない

### 1.1 波及節示唆の再検討 — 行指向応答は「レンダラ出力」ではなく「wire」である

DR-117 波及節の示唆は「preset と env モードの意味論 = kuu.mbt、**行指向応答の組版と glue
テンプレ埋め = product 側**の分割線が自然」だった。本 findings はこの後半を**採らない**ことを
提案する。根拠は help 前例との位相差:

| | help レンダラ (DR-115) | 行指向応答 (DR-117 §4) |
|---|---|---|
| 読者 | 人間 | glue script (機械) |
| 規範性 | 非規範 (§6.2、揺れてよい) | **規範** (行文法・フラグ語彙・directive 語彙は DR の規範) |
| 実装が複数あってよいか | よい (独立レンダラ歓迎) | **駄目** (glue は 1 つの文法だけを parse する — 実装ごとに揺れたら glue が壊れる) |
| 対応する前例 | renderer.mbt (kuu-cli) | むしろ wire JSON 射影に近いが、それすら「揺れてよい」度で行文法より緩い |

行指向応答は「glue という機械消費者向けの wire」であり、DR-115 §6.2 の「非規範だから product」
というロジックが適用できない。規範 wire の直列化を product ごとに再実装させると、shell 間 drift
を binary 1 箇所に封じた DR-117 §5 の分担思想が、今度は**言語×product 間 drift** として再発する。

さらに決定的なのは**形態 A の成立条件**である。DR-117 §6 は「形態 A (セルフバイナリ) が本命」
とした。MoonBit アプリが `myapp --completions zsh` と `<TAB>` 補完を持つために import するのは
kuu.mbt であって kuu-cli ではない (kuu-cli は standalone CLI frontend — kuu-cli README)。
`completion_query` の実装 (行 emit 込み) が kuu-cli lib にしか無いと、**一般 MoonBit アプリは
補完を持てない**か、kuu-cli の lib に依存する倒錯した構図になる。help レンダラが kuu-cli に
住めて実害が無いのは「アプリごとに help の見た目が違ってよい」からで、glue ABI はアプリごとに
違ってはいけない。

### 1.2 確定案 — 分割線は「規範 ABI の実装 = kuu.mbt / CLI 面と実機検証 = kuu-cli」

**kuu.mbt に置く物** (すべて `src/kuu` — help.mbt / completion.mbt が既に src/kuu に住む前例
踏襲。ux 専用 package の新設は UsefulAST 書き味 API (DR-109 柱 1) の実体化時の関心で、
capability 実装だけなら現行 assembly 層で足りる):

1. **玄関判定** — 二箇所一致 (env × argv) の判定と query モードへの橋渡し (§3 で輪郭)
2. **words/cword 分解** — DR-117 §3.4 の写像 (words → args_before / カーソル単語 / args_after、
   先頭トークン落とし、cword=0 の空応答)
3. **`completion_query` パイプライン全段** (DR-117 §5) — 既存 `complete()` (front_door.mbt) +
   `dispatch_help_query()` (help.mbt) を内部で呼び、policy 段 (hidden 除外 / prefix 絞り /
   整列 / 説明引き直し / shell_action 翻訳 / 搬送不能除外・正規化) を適用し、**行指向応答
   テキスト (String) まで組んで返す**。行文法の正本実装は言語内 1 箇所
4. **`completion_script` 実装** — glue テンプレへの 3 点焼き込み (DR-117 §2.5: binary 参照 /
   program_name / UUID)。テンプレ本文の取得は §2 (置き場所) に依存
5. preset 発火の観測 (`dispatch_completion_script` — land 済み) と 4 の接続

**kuu-cli に置く物**:

1. `kuu completion generate <def.json> --shell <s>` / `kuu completion query <def.json> ...`
   サブコマンド (DR-117 §6 の形態 B 露出面) — def.json 読み・argv 解析・stdout/exit だけを
   持ち、実体は kuu.mbt の capability 実装を呼ぶ (help の `run_help` → `@kuu.dispatch_help_query`
   と同じ薄さ)
2. `kuu validate` の completer capability 報告 (DR-117 §6 — custom completer 縮退の告知)
3. **3 shell 実機検証ハーネス** (§5) — 幻影コマンド (def.json) を素材に glue を実 shell で
   回す煙テスト。形態 B が「従」でありながら検証インフラとして先に価値を出す

**応答の公開形は String (行テキスト) 直返しとする** (構造化型の公開はしない)。理由: glue も
kuu-cli も行テキストしか消費せず、DR-117 §8.2 も検証単位を「行指向応答」と確定している。
構造化応答型を pub にすると MoonBit API 面 (semver 管理対象) が増えるだけで消費者が居ない。
JSON が要る machine 消費者には素材 API (`kuu complete`、DR-104 wire) が既にある (DR-117 §4
冒頭と同じ論拠)。内部実装が中間構造体を持つのは自由 (非公開)。

### 1.3 kuu.mbt 現状コメントとの衝突 (要修正の申し送り)

kuu.mbt `src/kuu/completion.mbt` 冒頭コメントは「The script implementation belongs to the
UX/product layer; kuu.mbt supplies the stable capability name and dispatch connection point」
と書いており、波及節示唆と同じ読み (script 実装 = product) を先取りしている。本 findings の
確定案が裁定されたら、このコメントは「script 生成実装も kuu.mbt (本 package) が持つ」へ改訂
する (UXL-Q1 の裁定に従属)。

## 2. 論点 2: glue テンプレの置き場所 — spec リポ `templates/` を推す

### 2.1 要件と選択肢

要件 (DR-117 波及節): (i) 言語非依存の共有資産 — Rust / Go 実装も同じテンプレを使う。
(ii) 「契約 (行文法) と glue が一緒に改訂される」構図で ABI 改訂コストを抑える (DR-117
リスク節)。(iii) 各言語実装が production バイナリにテンプレを内蔵できる (形態 A のアプリは
spec リポを持ち歩かない)。

| 案 | (i) 言語間共有 | (ii) 契約と同居 | (iii) 内蔵可否 | 判定 |
|---|---|---|---|---|
| a. spec リポ `templates/` | ○ 全実装が同じ正本を参照 | ○ 行文法 (DR-117 §4) の改訂と同一 リポ・同一 push 窓 | △ 転写 + 同期検査が要る (§2.2) | **推し** |
| b. kuu.mbt | × Rust 実装が MoonBit リポを参照する倒錯 | × | ○ (MoonBit だけ) | 不採用 |
| c. kuu-cli | × 同上 + 従の形態がテンプレ正本を握る主従逆転 | × | ○ (同上) | 不採用 |
| d. 独立配布 (新リポ) | ○ | × 契約と別リポ = 改訂が 2 窓に割れる | △ 同上 | 不採用 |

spec リポには「言語中立の正本を実装リポが参照する」流儀が既にある — conformance fixtures を
`KUU_FIXTURES` で注入する運用 (kuu.mbt `justfile` / kuu-cli `impl/mbt/justfile` の FIXTURES)。
templates/ はその第 2 の区分になる。spec リポ README の自己定義「spec + API contract +
conformance fixtures (language-neutral test-data corpus)」に「language-neutral runtime assets」
が加わる位置づけの変化は正直に認める (リスク節参照)。

### 2.2 取得機構 — fixture 注入と違い「production 焼き込み」なので転写 + 同期検査

fixtures はテスト時にしか要らないが、テンプレは**アプリの production バイナリに内蔵**される
(形態 A で `myapp --completions zsh` が spec リポ無しで動く必要)。MoonBit にコンパイル時
ファイル埋め込み機構は無いため:

- kuu.mbt に `scripts/` の転写生成 (spec `templates/*` → `src/kuu/completion_templates.mbt` の
  String 定数) を置き、**CI で spec pin と diff 同期検査** — kuu-cli が deps/kuu.mbt を SHA-pin
  checkout する既存パターン (kuu-cli `impl/mbt/justfile` の deps 検査) と同型
- 他言語実装も各自の埋め込み機構 (Rust `include_str!` + vendoring、Go `go:embed` + vendoring)
  で同じことをする。転写の正しさは同期検査が担保し、テンプレの意味の正しさは §5 の実機検証が
  担保する

**lockstep 窓への影響** (申し送り): 行文法または翻訳表の改訂は「spec templates/ 更新 → kuu.mbt
転写 + pin bump → kuu-cli 追随」の連続 push になる。既存の lockstep 窓 (spec fixture → pin →
実装、`docs/journal` 既知の VANISHED SKIP 事故由来) にテンプレ転写が一員として加わる。窓が
1 系統増えるのではなく既存の窓に乗る (同じ push 順で運べる) が、忘れると「glue と binary の
行文法が食い違い補完が黙って壊れる」形の事故になる。

### 2.3 templates/ の中身の輪郭 (発明、規範化しない)

```
templates/
  completion.zsh      # compdef 登録 + query 呼び出し + 応答翻訳 (compadd -V / -S '' / _files)
  completion.bash     # complete -F + COMP_WORDS 再結合 + compopt -o nosort/nospace + compgen
  completion.fish     # complete -c + commandline -o + タブ区切り native 説明
  TRANSLATION.md      # 翻訳表の正本 (findings §4.3 の表を実機検証済みへ更新して移す)
```

テンプレ変数は DR-117 §2.5 の 3 点 (binary 参照 / program_name / UUID) + query 呼び出し形
(形態 A = env プロトコル / 形態 B = `kuu completion query ...`、DR-117 §6 の「テンプレ変数」
確定に従う)。変数記法・ファイル分割は実装着手時の自由 (規範化しない — DR-117 §8.1 の
「script のバイト列は fixture pin しない」に対応)。

## 3. 論点 3: 玄関判定の呼び出し規約 — 純関数 + 注入で kuu.mbt の既存流儀に載せる

### 3.1 前提: kuu.mbt front_door は「観測を注入する純関数」の流儀

既存の `parse()` (kuu.mbt `src/kuu/front_door.mbt`) は env を `Map[String, String]`、config を
closure、tty を `Map[String, TtyObs]` で**引数注入**する。プロセスの実 env を読むのは呼び出し側
(アプリ / kuu-cli) の仕事。stdout への書き出しも exit も library はしない (kuu-cli が `c_exit` /
`c_write` FFI を自前で持っている事実が「library 側に無い」ことの証左)。

玄関判定もこの流儀に載せる。副作用ゼロの判定は DR-117 §3.2 の一様性 (不一致 = env 未設定時と
観測等価) を**構造的に**満たす — 判定関数が stdout / stderr / exit のどれにも触れない以上、
観測面に差が出る経路が存在しない。product test (§8.2 シナリオ 1〜5) も env / argv を引数で
与えるだけで決定的にテストできる。

### 3.2 シグネチャ輪郭 (発明 — MoonBit API の輪郭であり spec 規範ではない。DR-117 §1 の
概念シグネチャへの適合が制約)

```moonbit
/// 玄関判定 + query 実行を一体で行う。argv はプロセス argv 全量 (argv[0] = 自身)。
/// env はプロセス環境 (呼び出し側が読んで渡す — parse() の env 注入と同じ流儀)。
pub fn completion_entry(
  ast : AtomicAST,
  registry : @engine.Registry,
  argv : Array[String],          // [self, UUID, SHELL, words...] の全量
  env : Map[String, String],
) -> CompletionEntryResult

pub(all) enum CompletionEntryResult {
  NotCompletion                  // 二箇所不一致 (env 未設定含む) — 呼び出し側は通常実行を続ける
  Respond(String)                // query モード成立 — 応答行列テキスト。呼び出し側は stdout へ
                                 // 書き exit 0 (DR-117 §3.5 の推奨に従う)
}
```

- **一体型にする理由**: 判定 (§3.1) と橋渡し (§3.4 分解 → §5 パイプライン) を分けて公開すると、
  呼び出し側が「一致したのに query を呼ばない」「words の切り出しを自前でやる」誤用面が開く。
  判定成立時にやることは一意 (応答を出して終わる) なので、分ける価値が無い
- `KUU_COMPLETE_INDEX` の解釈 (省略 / 不正値 → 行末補完縮退、DR-117 §3.3) も内部で行う。
  縮退時の stderr 警告 (§3.3 の非規範推奨) は library が stderr を持たない設計と衝突するため、
  v1 では**出さない** (悪い面としてリスク節に記載)
- program_name は使わない (query 側に不要)。`completion_script` 側の生成 API は別口:
  `generate_completion_script(ast, registry, shell, program_name?, binary_ref, uuid) -> Result[String, ...]`
  の輪郭 (テンプレ埋めの純関数。UUID 採番も呼び出し側注入 — 乱数も library の外)

### 3.3 アプリ main の姿 (形態 A) と「仕込み不要」の射程

```moonbit
fn main {
  let argv = full_argv()          // @env.args() 相当 + argv[0]
  let env = read_env_map()
  let ast = @kuu.parse_definition(def_json).unwrap_or_die()
  match @kuu.completion_entry(ast, canonical_registry(), argv, env) {
    Respond(lines) => { print(lines); exit(0) }
    NotCompletion => ()
  }
  let outcome = @kuu.parse(ast, args, env~, ...)   // 以降は従来どおり
  ...
}
```

DR-117 §3.1 の「アプリ開発者に追加の仕込みは要らない (clap の CompleteEnv と違い)」は
**ux 層が玄関 (definition + argv → outcome) を持つ**前提の文言である。kuu.mbt の現行 front_door
は parse / resolve / output の分離 3 玄関で、「main 冒頭 1 発」の統合玄関はまだ無い (それは
DR-109 柱 1 の UsefulAST 書き味 API と同時に設計すべき形 — outcome 分岐・help 発火・exit まで
束ねる run() 級の顔になる)。**v1 は上記の明示 2 呼び出し規約とし、統合玄関に補完判定を内包する
のは ux API 設計時の宿題として申し送る** (統合玄関ができれば上の match はその内側に消え、
DR-117 の「仕込み不要」が文字通りになる)。stdout 純度 (§3.5) は「completion_entry を main 冒頭
= 最初の stdout 書き込みより前に呼ぶ」ことに依存するが、これは docs で明示する規約であり
(DR-117 §3.5 の「ux 層実装はこの純度を docs で明示する」の実行)、統合玄関化で構造保証に格上げ
される。

## 4. 論点 4: 実装順序 — 4 マイルストーン

依存の芯は「パイプラインは既存 API (complete / help) の合成で自己完結 → 先」「テンプレは
spec 側の骨格が無いと焼き込みが書けない → 骨格起こしを並行で先行」。

| M | 内容 | リポ | 検証 | 依存 |
|---|---|---|---|---|
| M1 | `completion_query` パイプライン (分解 → complete → help_query → policy 段 → 行 emit) | kuu.mbt | wbtest: DR-117 §8.2 シナリオ 4/5 (INDEX 縮退・cword=0) + DR-116 の 5 観点 (順序 / hidden / deprecated / alias / 説明引き直し) を**行応答単位**で。決定的・shell 非依存 | 無し (既存 complete() / dispatch_help_query() の合成) |
| M2 | spec `templates/` 骨格 (3 shell 分の変数スロット確定、最初は zsh を完成度優先) + kuu.mbt 転写機構 (scripts + CI 同期検査) | spec + kuu.mbt | 同期検査 CI が回ること | M1 と並行可 (行文法は DR-117 §4 で確定済みなのでテンプレは今書ける) |
| M3 | 玄関判定 `completion_entry` + `completion_script` 生成 (テンプレ埋め) + preset orchestration 接続 | kuu.mbt | wbtest: §8.2 シナリオ 1/2/3 (二箇所一致 / env のみ / argv のみ)。一様性 (§3.2) は「NotCompletion が返るだけ」の構造で担保 | M1 + M2 |
| M4 | kuu-cli `kuu completion generate/query` + `kuu validate` capability 報告 + **3 shell 実機マトリクス検証** (§5) + 恒常煙テスト | kuu-cli | §5 の 2 段 | M3 |

- M1 が最厚 (policy 段の突き合わせ規則 — DR-117 §5 の origin 整列・匿名 exact の positional
  従属)。M2 は薄いが lockstep 窓の新参者なので手順を journal に残す価値がある
- v1 発行条件 (DR-108) に M1〜M3 が乗るかは統括判断 (DR-117 波及節の既存申し送りのまま)
- 一番手が MoonBit であることは DR-109 柱 7 の確定。Rust / Go はテンプレ転写パターン (M2 の
  vendoring) だけ真似れば M1/M3 相当を各自実装する構図

## 5. 論点 5: shell 翻訳表の実機検証 — 初回マトリクス (実端末) + 恒常煙テスト (半自動) の 2 段

findings `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 の翻訳表は Web 調査由来・
実機未検証 (同 §4.3 末尾の自己申告)。「product test か手動マトリクスか」は二者択一にせず、
検証対象の位相で 2 段に分ける:

### 5.1 段 1: 翻訳機構の存在検証 — 実端末マトリクス (初回 1 回 + 表改訂時)

翻訳表の各セル (「zsh の `compadd -V` は unsorted group を作る」「bash 4.4+ の
`compopt -o nosort` が効く / 3.2 では無い」等) は **shell 機能の事実主張**であり、glue の
テストより先にセル自体の裏取りが要る (empirical-verification: 1 サンプル NG、bash は
バージョン軸が本質)。方法:

- tmux 実端末 (`tmux send-keys` + `capture-pane`) で 3 shell × 表の全行を踏む。対話補完の
  最終表示 (順序・説明・nospace の実挙動) は実端末でしか観測できない — zsh の zpty や fish の
  `complete -C` は候補列挙までで、表示順・挿入挙動の検証には足りない
- bash はバージョン軸を必ず 2 点 (macOS 同梱 3.2 = nosort 不可の縮退経路 / 5.x = 全機能) 踏む
- 結果は**翻訳表を実機検証済みへ更新して spec `templates/TRANSLATION.md` (§2.3) を正本化**し、
  検証ログ (シェルバージョン × セル × 観測結果のマトリクス) は kuu-cli 側 findings に記録
  (DR-117 波及節「実装リポ側 findings に記録」の実行。ハーネスが kuu-cli に住むため)

### 5.2 段 2: glue の恒常煙テスト — 非対話ハーネスで CI 常設

回帰検知は自動化する。各 shell に非対話で補完関数を駆動する定石がある:

- **fish**: `fish -c 'complete -C"app --col"'` — 候補列挙が最も素直に自動化できる
- **bash**: `COMP_WORDS` / `COMP_CWORD` / `COMP_LINE` を設定して生成 script の補完関数を直接
  呼び、`COMPREPLY` を assert (bash-completion プロジェクト自身のテスト定石)
- **zsh**: 候補列挙レベルなら compadd をモックした関数直呼び、表示レベルは段 1 に委ねる

煙テストの中身は「生成 script が source でエラーなく登録される」「代表 def.json で候補が
期待集合と一致する」「nospace / shell_action files の翻訳が呼ばれる」程度に留める (DR-117
§8.2 の分担どおり、policy の正しさは M1 の行応答単位テストが既に担保しており、ここで再検証
しない)。kuu-cli リポの just task + GitHub Actions (ubuntu = bash 5.x / zsh / fish、macOS =
bash 3.2 縮退経路) に常設する。

## 6. 発明と規範化の区別

- **確定済み規範の適用** (本 findings は変更しない): capability 2 口の入出力契約 (DR-117 §1) /
  env プロトコルと一様性 (§3) / 行文法 (§4) / policy の binary 内 1 箇所 (§5) / 形態 B の
  正規サブコマンド露出 (§6) / product test 5 シナリオと検証単位 (§8.2)
- **本 findings の発明 (UXL-Q 裁定対象)**: (1) 座席分割線の確定 — 波及節示唆の後半 (組版 =
  product) を覆し、両 capability の実装 (行 emit 込み) を kuu.mbt に置く (§1)、(2) glue
  テンプレの spec `templates/` 正本化 + 転写 + 同期検査 (§2)、(3) `completion_entry` の純関数
  2 呼び出し規約と統合玄関への申し送り (§3)、(4) 実機検証の 2 段構え (§5)
- **発明だが裁定不要 (前例からの導出)**: kuu.mbt 内の座席が src/kuu (新 package を切らない —
  help.mbt の前例踏襲、§1.2)、応答公開形が String 直返し (消費者が行テキストしか読まない事実
  からの導出、§1.2)、実装順序 M1〜M4 (依存関係からの導出、§4)
- **規範化しないもの**: MoonBit API シグネチャの細部 (§3.2 は輪郭であり spec は DR-117 §1 の
  概念シグネチャまで) / テンプレ変数記法・ファイル分割 (§2.3) / 煙テストの粒度 (§5.2)

## 7. リスク・悪い面

- **spec リポの性格変化**: templates/ 収載で spec リポが「規範 + fixture corpus」から
  「+ runtime 資産の正本」へ広がる。fixture は実装の検証材料だがテンプレは実装の**部品**であり、
  spec リポの改訂が直接 production 挙動を変える初のケース。lockstep 窓の運用 (§2.2) を守らない
  と補完が黙って壊れる
- **転写 + 同期検査の維持コスト**: 言語実装が増えるたび vendoring + 同期検査の複製が増える。
  検査が無い実装は drift しても気づけない (検査導入は各言語実装の規律に依存し、spec 側から
  強制できない — DR-117 リスク節の「env プロトコルの ux 層規約依存」と同型の構図)
- **`completion_entry` の縮退警告を捨てる**: DR-117 §3.3 が推奨する INDEX 不正値時の stderr
  警告 (非規範) を、v1 の純関数設計は出せない (library が stderr を持たない)。glue の bug の
  観測可能性が下がる。将来 ux 層が診断 sink を持つ設計になったら回収する
- **2 呼び出し規約の忘却リスク**: 統合玄関が無い間、アプリが `completion_entry` を呼び忘れると
  補完だけが黙って効かない (エラーにならない — 不一致 = 通常実行の設計の裏面)。docs での規約
  明示と、`completion_script` preset を使う definition なのに entry 未呼び出し、を検出する
  機械的手段は無い
- **String 直返しの拡張余地**: 将来「構造化応答が欲しい消費者」(例: 補完 UI を自前描画する
  TUI アプリ) が現れたら公開型の追加が要る。v1 で閉じた分の後方拡張は非破壊 (関数追加) で
  できるため、先回りはしない
- **実端末マトリクスの再現コスト**: tmux 検証は環境 (shell バージョン・compinit 状態) に敏感で、
  「初回 1 回」の結果が読者の環境で再現しない可能性がある。検証ログにバージョンを必ず併記する
  ことで緩和するが、恒常 CI に乗るのは段 2 の非対話ハーネスだけ — 表示レベルの回帰 (zsh の
  順序が崩れる等) は検知が遅れ得る

## 8. UXL-Q バッチ素案 (本質分岐のみ)

> **裁定済み (kawaz 2026-07-23)**: UXL-Q1=a / UXL-Q2=a / UXL-Q3=a / UXL-Q4=a — 全問推し通り。
> 本 findings §1〜§5 の確定案がそのまま実装方針となる。実装は §4 の M1 から着手。

> ラベルについて: 統括指示は「UX-Q バッチ」だが UX-Q1〜Q7 は DR-109 が消費済み
> (ラベル使い回し禁止) のため UXL- (ux layer) を用いる。

- **UXL-Q1: 座席の分割線** — (a) 両 capability の実装 (行指向応答の emit・glue テンプレ埋め
  込み) を kuu.mbt に置き、kuu-cli は CLI 面 (completion サブコマンド / validate 報告) と
  実機検証ハーネスのみ / (b) DR-117 波及節示唆どおり、行指向応答の組版とテンプレ埋めを
  product (kuu-cli) 側に置く。**推し = a**: 行文法は glue が parse する規範 ABI であり
  (help レンダラの「非規範だから product」が適用できない)、形態 A のアプリが kuu.mbt import
  だけで補完を持てることが主従 (DR-117 §6) の成立条件 (§1.1)
- **UXL-Q2: glue テンプレの置き場所** — (a) spec リポ `templates/` を正本とし、各言語実装は
  転写 (vendoring) + CI 同期検査で内蔵 / (b) kuu.mbt / (c) kuu-cli / (d) 独立配布リポ。
  **推し = a**: 言語間共有と「契約と glue が一緒に改訂される」構図 (DR-117 リスク節) を同時に
  満たすのは契約と同居だけで、KUU_FIXTURES 注入の既存流儀に第 2 区分として自然に乗る (§2.1)
- **UXL-Q3: 玄関判定の呼び出し規約** — (a) v1 は純関数 `completion_entry` (argv / env 注入、
  判定 + query 実行一体、String 返し) の明示呼び出し規約とし、main 冒頭 1 発の統合玄関への
  内包は ux API (UsefulAST 書き味) 設計時に送る / (b) 統合玄関 (run() 級) を今設計して補完
  判定を最初から内包する。**推し = a**: 既存 front_door の注入流儀と §3.2 一様性の構造的担保
  に直結し、統合玄関は outcome 分岐・help 発火・exit まで束ねる大きな設計で補完だけを先行
  させると二度手間になる (§3.3)
- **UXL-Q4: 翻訳表の実機検証方式** — (a) 2 段: 初回は tmux 実端末マトリクス (表のセル自体の
  裏取り、bash はバージョン 2 点)、恒常は非対話ハーネス (fish -C / bash 関数直呼び / zsh
  関数直呼び) の煙テストを kuu-cli CI に常設 / (b) 恒常自動テストのみ (実端末レベルは省略) /
  (c) 初回手動のみ (CI 常設なし)。**推し = a**: 表示順・挿入挙動は実端末でしか観測できず
  (b では表のセルが検証されない)、回帰検知は自動が要る (c では glue 改修のたび手動コストが
  再発する) (§5)

## 関連

- `docs/decisions/DR-117-completion-generator-abi.md` (ABI 正本 — 本 findings は波及節の
  「座席は ux 設計へ送る」の受け皿)
- `docs/decisions/DR-109-kuu-ux-skeleton-and-cli-contract.md` 柱 7 (MoonBit 一番手) / 柱 1
  (UsefulAST — UXL-Q3 の統合玄関の送り先)
- `docs/decisions/DR-115-canonical-help-renderer.md` §6.2 (レンダラ非規範 — §1.1 の対称性精査
  の比較対象)
- `docs/decisions/DR-116-completion-generator-policy.md` (policy 5 観点 — M1 の検証対象)
- `docs/findings/2026-07-22-completion-generator-plan.md` §4.3 (翻訳表、実機未検証) / §5.1
  (3 層分担の原案)
- kuu.mbt `src/kuu/completion.mbt` (capability 席 land 済み + 要改訂コメント §1.3) /
  `src/kuu/help.mbt` (前例) / `src/kuu/front_door.mbt` (注入流儀)
- kuu-cli `impl/mbt/cli/src/lib/renderer.mbt` (help レンダラ前例) /
  `impl/mbt/cli/src/main/main.mbt` (サブコマンド面)
