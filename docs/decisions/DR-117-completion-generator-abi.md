# DR-117: 補完生成器 ABI — `completion_script` preset・`KUU_COMPLETE` query プロトコル・行指向応答

> 由来: `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (DR-116 の実装課題化) と GEN-Q1〜Q6'' 裁定バッチ (kawaz 2026-07-22〜23、全消化)。下敷きは `docs/findings/2026-07-22-completion-generator-plan.md` (5 版、§9 が裁定記録)。DR-116 (生成器の既定 policy) が「何を表示するか」を確定済みであるのに対し、本 DR は「生成器をどう建てるか」— 生成側入口の preset、glue script ↔ binary 間の query プロトコル、応答の行文法、capability の概念シグネチャ — を確定する。DR-113 §2 の preset 型と DR-115 §1.3 の概念シグネチャ形式を踏襲する。

## 決定

### 1. アーキテクチャはブリッジ型 — 2 つの capability

生成器はブリッジ型一択とする (GEN-Q1 = a): thin glue script + binary への runtime 問い合わせ。definition から補完 script 全体を静的展開する型は作らない。生存経路計算 (DR-060 §1 — greedy 面の先食い・sever・eq-split を含む評価器の走査) と after 整合フィルタ (フル `parse()`、遅延述語込み — DR-104 §5) は shell script へ静的展開できず、静的展開はシェル上での kuu 再実装になる。

v1 の対象 shell は zsh / bash / fish (GEN-Q2 = a、PowerShell は追随)。順序保持不可 (fish)・説明表示が弱い (bash)・両方可 (zsh) の能力 3 象限を初期実装で踏み、翻訳層を最初から shell 能力差吸収の形に強制する。対応 shell 集合は spec では閉じない (DR-111 §6 が builtin completer 名の閉集合を確定しなかったのと同じ線)。

生成器の口は同一 binary の 2 つの capability であり、正式名を次のとおりとする:

| capability | 役割 | 呼び出し頻度 |
|---|---|---|
| `completion_script` | glue script の生成 | 登録時 1 回 |
| `completion_query` | 補完候補の行指向応答 | 補完のたび |

`completion_script` は preset type 値 (§2) と同綴りである。preset の発火がこの capability を 1:1 で呼ぶ対応の明示であり、DR-113 の `type: "help"` → `help_query` より結合が密なため同綴りを採る。`completion_query` は `query` を対にして「script を作る口 / query に応える口」が並びで読めるようにする。

概念シグネチャ (DR-115 §1.3 と同じく、言語側 API の規範化ではなく能力の存在と入出力の確定。fixture では検証しない — §8):

```
completion_script(definition, {
  shell: string,             // shell 名 (必須)
  program_name?: string,     // 補完対象コマンド名。既定は definition ルートの name (DR-113 §4.4 と同型)
}) → script text | error     // 未対応 shell 名は実行時エラー

completion_query(definition, {
  shell: string,             // shell 名 (§3.6 — 実装裁量のヒント、応答文法は shell 非依存)
  words: [string, ...],      // 補完対象コマンド名を先頭に含む全量トークン列 (§3.4)
  cword?: number,            // words 内のカーソル単語 index (0-origin)。省略 = 行末補完
}) → 応答行列 (§4)
```

両 capability は definition 内蔵バイナリ (形態 A、§6) では env プロトコル (§3) と preset 発火 (§2) が呼び、kuu-cli (形態 B、§6) では正規サブコマンドが呼ぶ。呼び口が違っても capability の入出力契約は共通である。

### 2. 生成側入口 — `type: "completion_script"` preset

#### 2.1 canonical 展開

DR-113 §2 の分担を踏襲する: kuu が定めるのは preset の発火意味論だけで、入口の形 (`--completions zsh` / `-C zsh` / `APP_COMPLETION=zsh` / `app completion zsh`) は定義者の自由。cobra の `completion <shell>` 自動追加のような形の押しつけをしない。

- long / short / env の入口を持てる。値スロットは shell 名 (string、必須値)。shell 名なしで script は出せないため、`help_category` (DR-113 §2.3) のような bool 枝は持たない
- 内部セルは `#completion_script` (string)。発火時に shell 名文字列を供給する。`#` 予約 namespace・result への露出は name / export_key 経由、の規約は DR-113 §6 と同一
- `on_failure` の既定は false (失敗時に補完 script を出す需要は無い)。`help_on_failure` に相当する専用糖衣は設けない — 既定 false の preset で発火させたい定義者は汎用 `on_failure: true` を直接書けば足り、糖衣が短縮するものが無い
- 複数指定は string 全体セルの last-wins (`#help_category` と同じ)

#### 2.2 shell 名は自由入力 + 補完候補提示の糖衣

preset は **values enum を張らない** (GEN-Q3'' = a の追加要件)。enum で縛ると未対応 shell 名の実験や実装拡張が不便になる。一方、この値位置の補完候補としては実装が対応する shell 名 (zsh / bash / fish + 実装依存の追加分) を提示する。つまり本 preset は「**shell 名候補を補完で提示するが、受理は自由入力**」の糖衣である。未対応 shell 名の帰結は `completion_script` capability の実行時エラーであり、definition-error でも parse エラーでもない (shell 名の値域は spec で閉じない — §1)。

#### 2.3 配置面 — positional 入口は全 preset で許可 (ABI-Q1 = a)

preset type は値空間と発火意味論を定めるのであって、要素の配置面 (options / positionals / commands 内) を制限しない。この一般解釈は ABI-Q1 = a (kawaz 裁定 2026-07-23) による確定であり、HIP 系裁定 (DR-113) の再解釈ではない。DR-113 §2 の「long / short / env の入口を持てる」は代表的入口の例示であって配置面の閉集合宣言ではない。宣言配置が挙動を縛らない原則は DR-064 が dd について記録した「配置は挙動不問」の先行例と同じ向きだが、全 preset に及ぶ一般則としての格上げは本 DR が確定する (DR-064 は dd の事実を記録した先行例)。

配置の成立可否は、その preset の canonical 展開が要求する入口・値構造が当該面で成立するかで決まる。値スロットを持つ preset (`completion_script`、DR-113 §2.3 の `help_category` の string 枝) は positional 配置で「値消費 = 発火 + 値供給」が既存の positional 意味論のまま成立する:

```json
{"commands": [{"name": "completion",
  "positionals": [{"name": "shell", "type": "completion_script"}]}]}
```

これで `app completion zsh` サブコマンド形 (cobra の絵) が preset の一構成として得られる。completion 専用の特例ではなく、help 系 preset を含む全 preset に適用される一般則である。

#### 2.4 orchestration

`#completion_script` が値 (shell 名) を持てば、ux 層 runtime は `completion_script` capability を `(definition, shell, program_name)` で呼び、script テキストを stdout へ出す。exit 0 を推奨する (DR-115 §6.4 の exit class ガイドラインと同水準の推奨、非規範)。program_name は definition ルートの name があれば既定、呼び出し側で上書き供給できる (DR-113 §4.4 の program_name 供給と同型)。

#### 2.5 script への焼き込みは 3 点

query 呼び出し形は env プロトコル (§3) で definition 非依存に固定されているため、`completion_script` capability が glue script へ焼き込むのは次の 3 点に閉じる:

1. **問い合わせ先 binary** — 生成時の自身。絶対パス解決か素の名前かは glue テンプレの関心
2. **補完対象コマンド名** — shell の補完登録 (`compdef` / `complete -F` / fish `complete -c`) が要求する program_name
3. **UUID** — §3.1 の二箇所一致トークン。script 生成時に採番して焼き込む (補完のたびに生成するのではない)

#### 2.6 挿入形指定 — `insert_form` パラメータ (COMPQ-Q1 = 裁定 2026-07-23)

`completion_script` preset 要素は静的パラメータ **`insert_form`** (string enum: `"space"` / `"eq"`、既定 `"space"`) を持てる。値は long option 候補の挿入形 — 同一 spelling の word_end / cont ペア (§5 の merge 規則) をどちら側へ畳むか — を定義者が指定するダイヤルである:

- `"space"` (既定) — space 形へ統合: 挿入文字列は spelling そのまま、nospace フラグなし。space 形は業界優勢 (clap_complete / argcomplete / click / fish / yargs) であり、bash の `COMP_WORDBREAKS` が `=` でトークンを割る問題も回避する
- `"eq"` — eq 形へ統合: 挿入文字列は `spelling + "="`、nospace フラグ付き。動機は cobra (eq 形既定の唯一の主要例) と同 UI・同挙動の Go ライクな UX をアプリが作れるようにするため

命名は「補完候補の**挿入** (insert) の**形** (form)」の展開形どうし。値 `"eq"` は DR-096 が確立した config 語彙 (`long_eq_sep`) と同じ綴りで eq 分割形を指す。値は preset 発火時でなく `completion_query` の policy 段 (§5) が definition から読む静的属性であり、shell 名のような発火時値スロットではない。

- 未知の値は definition-error (enum 逸脱)。既存 kind の準用であり新 kind は設けない
- 同一 definition 内に複数の `completion_script` 入口がある場合、`insert_form` の**明示値どうしの食い違いは definition-error** とする (挿入形は definition 全体で 1 つの応答 policy であり、どの入口で発火したかに依存させない)。省略と明示の混在は明示値が勝つ
- `completion_script` 入口を持たない definition (形態 B で def.json を直接 query する場合を含む) は既定 `"space"` で動く

### 3. query プロトコル — `KUU_COMPLETE` UUID 二箇所一致の env モード切替

#### 3.1 玄関判定

```
KUU_COMPLETE=<UUID> KUU_COMPLETE_INDEX=<N> <セルフバイナリ> <UUID> <SHELL> <words...>
```

ux 層 runtime の玄関 (parse 呼び出しの入口) は、argv の解釈に先行して `env["KUU_COMPLETE"] == argv[1]` を判定する。比較は**完全一致のみ** (部分一致・正規化・大文字小文字の同一視を行わない)。

- **一致**: argv の解釈を一切行わず補完 query モードに入る。`argv[2]` = shell 名、`argv[3..]` = words として `completion_query` capability (§1) へ橋渡しする
- **不一致** (env 未設定を含む): 通常実行

UUID の目的は秘匿ではなく**自己宛 identification** — 「モード切替の意図」(env) と「これはあなただけへの指示である」(argv) の同時判定であり、ps で見えて構わない。二箇所一致が要る理由は自己参照シナリオへの機構的防御である: kuu 製コマンド `ls` の補完 query 実行中に、custom completer が内部で `ls` を呼ぶと、env 継承だけの判定では子の `ls` も補完モードに入って壊れる。二箇所一致は「親 glue が意図した宛先だけがモードに入る」ことを実装の行儀 (unset の徹底など) に依存せず機構で保証する (棄却された代替案は「採用しなかった案」参照)。

判定はアプリコードの実行に先行する玄関 API 内部で行う。clap の `CompleteEnv::complete()` が main 冒頭への手動仕込みを要するのと違い、kuu は ux 層が玄関 (definition + argv → outcome) を持つためアプリ開発者に追加の仕込みは要らない。

手動デバッグは `KUU_COMPLETE=x app x zsh <words...>` のように env と argv[1] へ同じ文字列を書けば任意の一致文字列で起動できる。不一致は通常実行に倒れるだけで、破壊的な誤発火は構造上存在しない。

#### 3.2 不一致時の一様性 (規範)

**二箇所一致が成立しない場合の実行は、`KUU_COMPLETE` が未設定の場合の実行と観測等価でなければならない。** 観測面は stdout / stderr / exit code の 3 つである。警告・診断出力・exit code の変化・挙動の分岐を一切導入してはならない。env 継承だけの `KUU_COMPLETE` は completer の子プロセス起動で日常的に発生するため、ここで観測可能な差異を生む実装は §3.1 の機構的防御を破る。argv に UUID 様の文字列だけがある場合も同様に通常の引数として扱う (定義に無ければ通常の parse エラーに落ちるだけである)。

#### 3.3 `KUU_COMPLETE_INDEX` — カーソル位置

カーソル単語の位置は env `KUU_COMPLETE_INDEX=<N>` で受ける (GEN-Q4''' = a)。

- N は **words (§3.4) 内のカーソル単語 index、0-origin**
- **省略時は行末補完** とみなす (カーソル = words 末尾の次、args_after 空)。glue は常に INDEX を付けるが、手で叩くデバッグ時に省略できる
- 数値として解釈できない値・負値・words 長を超える値は、省略時と同じ行末補完扱いに縮退する。補完面には実用的なエラー表出手段が乏しく (§6 の形態 B と同根拠)、glue が正しい限り発生しない入力のために失敗モードを増やさない。縮退時に stderr へ警告を出すことを推奨する (非規範 — stderr は glue が解釈しない (§3.5) ため補完面を壊さず、glue の bug を観測可能にする)

argv 内に `--cword N` 等の制御トークンを混ぜる案は「UUID・shell 名以降は純粋に words」という argv 構造の純度を壊すため採らない。cobra の「argv 末尾 = カーソル単語」方式はカーソル以降を渡さない前提の形であり、args_after (after 整合フィルタ、DR-060 §2) が原理的に運べないため採らない。

#### 3.4 words は補完対象コマンド名を先頭に含む全量

`argv[3..]` = words は、**shell が見ているコマンドライン全量のトークン列 (先頭 = 補完対象コマンド名) をそのまま**とする。

- 3 shell の native 素材 (bash `COMP_WORDS` / zsh `words` / fish `commandline -o`) はいずれも先頭にコマンド名を含む全量形であり、glue が加工せず転送できる。カーソル index も native (COMP_CWORD 等) が全量基準なので変換が最小 (zsh の 1-origin → 0-origin のみ)
- 先頭トークンを落とす処理は binary 側 (capability 実装) の 1 箇所に集中し、glue 3 種へ複製しない — policy 適用を binary 内 1 箇所に置く分担 (§5) と同じ思想
- `cword = 0` (コマンド名自身にカーソル) の応答は空とする。コマンド名の補完は shell 自身のコマンド名補完の領分であり、definition に照合する対象が無い

binary 側の complete API (DR-104 §1) への写像:

- `words[1..cword]` → `args_before`
- `words[cword]` → カーソル単語。core の `complete` には渡さず (DR-104 §1: `word_before` は v1 未実装予約)、binary 内の生成器 policy 段の prefix 絞り (§5、DR-060 §3 が生成器側の選択とした絞り) で消費する。将来 core が `word_before` を実装した場合は生成器側の絞りを素通しへ切り替える (本段落が申し送りの grep 先)
- `words[cword+1..]` → `args_after`
- 行末補完 (INDEX 省略) では `words[1..]` → `args_before`、カーソル単語は空、`args_after` は空

shell 間差の正規化 (bash の `COMP_WORDBREAKS` が `--flag=value` を `[--flag, =, value]` へ割る等) は glue 側で吸収してから渡す (clap / argcomplete と同じ分担)。

#### 3.5 stdout 純度

query モードの stdout は §4 の応答行列のみとする。glue は stdout のみを応答として解釈しなければならず、stderr は解釈しない (binary 側のデバッグ出力は stderr へ自由に出せる)。玄関判定 (§3.1) がアプリコード実行前に走るため、clap の「complete() より先に stdout を書くと壊れる」縁は構造的に出にくいが、ux 層実装はこの純度を docs で明示する。

query モードの exit code は、応答を出せた場合 (候補ゼロを含む) は 0、応答生成自体に失敗した場合は非 0 を推奨する (非規範、DR-115 §6.4 と同水準)。

#### 3.6 SHELL 引数は実装裁量のヒント

`argv[2]` = shell 名は、応答調整 (shell 能力差に応じた説明の省略等) に実装が使ってよいヒントである。応答の行文法 (§4) は shell 非依存であり、shell 別翻訳は glue の責務 (§5) なので、**未知の shell 名でも `completion_query` は失敗しない**。これにより手動デバッグ (§3.1) は shell 名位置に任意の文字列を書いても通る。

### 4. 応答の行文法

`completion_query` の応答は stdout への行指向テキストとする。JSON は採らない: shell glue は jq を持たない前提で awk / read / `compadd` へ直接流せる形が必須であり (cobra / clap / argcomplete / carapace が共有する定石)、JSON が要る machine 消費者には素材 API (`kuu complete`、DR-104 wire) が既にある。

```
--port	listen port
--color=	output color mode	nospace
sub	run subcommand
:shell_action files
```

#### 4.1 候補行

- 1 行 1 候補。フィールドはタブ (U+0009) 区切り: `挿入文字列 [TAB 説明 [TAB フラグ...]]`
- 第 1 フィールド = 挿入文字列 (必須、非空)。第 2 = 説明 (空可)。第 3 以降 = 候補フラグ
- 末尾フィールドは省略できる。フラグを持ち説明を持たない候補は説明位置に空フィールドを置く (`cand		nospace`)
- **行順は規範的な提示順** — DR-116 §2/§3 の順序規則 (help model 順 / completer 供給順) を適用済みの順序付き列である。順序非依存 multiset の wire candidates (DR-104 §4) と位相が違う
- 説明は DR-116 §4 の origin 引き直し済み・hidden 除外済み・deprecated / alias 注記込みの最終文字列。文言は非規範 (DR-116 §4)

候補フラグの v1 語彙は **`nospace` の 1 種**: candidate の `term: "cont"` の翻訳であり (同一 spelling の word_end / cont 併存ペアは §5 の merge 規則で 1 行へ畳んでから翻訳する)、空白挿入が解釈を破壊する制約 (DR-104 §2 明確化 (e)) を shell の nospace 機構 (`compadd -S ''` / `compopt -o nospace` 等) へ運ぶ。cobra の directive が応答全体に一律であるのに対し、kuu は per-candidate の `term` を持つため候補フラグ列で運ぶ。glue は未知のフラグを無視しなければならない (前方互換)。

#### 4.2 directive 行

`:` で始まる行は応答全体への指示である。v1 の語彙は 1 種:

- `:shell_action <name>` — 値位置候補の builtin completer (§7) を shell 既存機能へ委譲する指示。`<name>` の v1 語彙は `files` / `dirs`。glue テンプレが shell 機能 (zsh `_files` / bash `compgen -f` / fish 組み込み等) へマップする

directive 行は応答内の任意位置に置け、複数あってよい。同一 directive の重複は 1 回と同義。glue は未知の directive 行を無視しなければならない (前方互換)。glue が `<name>` を解決できない場合は当該 directive を無視する (候補なしへの縮退、§6 の縮退と同じ「型違い fallback をしない」線)。

`:keep_order` 級の順序 directive は設けない。DR-116 §2 は「対象 shell に供給順保持手段がある場合、生成器はその手段へ翻訳する」を常時の規範とするため、glue テンプレは無条件に順序保持翻訳を行えばよく、per-response で切り替える情報が存在しない (将来ソート委譲の実需が出れば未知 directive 無視の前方互換で追加できる)。

#### 4.3 エスケープを持たない — 搬送不能な候補は除外、説明は正規化

行文法にエスケープ語彙 (`\t` / `\n` 等) を導入しない。glue にエスケープ解釈を強いることは、行指向を採る根拠 (awk / read へ直接流せる単純さ) を毀損する。代わりに:

- **挿入文字列にタブまたは改行を含む候補は、`completion_query` が応答から除外する**。かかる文字列は shell の補完挿入機構でも実用に耐えず、搬送語彙を複雑化する根拠にならない。除外時に stderr へその旨をログすることを推奨する (非規範 — stderr は glue が解釈しない (§3.5) ため補完面を壊さず、custom completer 実装者が「出ない理由」を観測できる)
- **説明内のタブ・改行は空白 1 個へ正規化する** (binary 側で行う。glue は正規化済みを前提してよい)

#### 4.4 空応答・空行

- 候補ゼロは候補行ゼロ (directive のみ、または完全な空出力) で表す。prefix 絞りで候補が尽きた場合も同じ (§5 — 入力済みのカーソル単語は消えない)
- glue は空行を無視する

行文法 (フィールド区切り・フラグ語彙・directive 語彙・除外と正規化の規則) は本 DR の規範である。ただし conformance fixture では検証しない (§8)。

### 5. policy 適用は binary 内 1 箇所 — glue は収集と翻訳のみ

DR-116 の policy (help model 順整列 / origin 説明引き直し / hidden 除外 / deprecated・alias 注記) は**全て binary 側の `completion_query` 内部で適用する**。glue script 側で行うと shell 数ぶん policy 実装が複製され、shell 間 drift の温床になる。glue に残る仕事は (1) words / cword の収集・正規化・転送、(2) 応答行と directive の shell 機構への翻訳、の 2 つだけである。この分担は形態 A / B (§6) で完全に共通である。

`completion_query` 内部のパイプライン:

```
words, cword
  → 分解 (args_before / カーソル単語 / args_after)        … §3.4
  → complete(ast, args_before, args_after)                … 素材 (DR-104 candidates)
  → help_query capability 呼び出し                         … DR-113 §8 適用済み順序 + 説明素材
  → custom completer 実行 (形態 A のみ)                    … 供給順 = 確定順 (DR-116 §3)
  → policy 段:
      hidden 除外                                          … DR-116 §5
      カーソル単語による prefix 絞り                        … DR-060 §3 (生成器側の選択)
      origin → help model entry 突き合わせで整列            … DR-116 §2
      説明引き直し + alias / deprecated 注記                … DR-116 §4/§5
      builtin completer 名 → shell_action 翻訳             … §4.2 / §7
      同一 spelling の word_end / cont 併存の挿入形統合      … 本節 merge 規則 (COMPQ-Q1)
      搬送不能候補の除外・説明の正規化                       … §4.3
  → 行指向応答 emit                                        … §4
```

**同一 spelling で term だけが異なる候補ペアは 1 行に統合する** (COMPQ-Q1 裁定 2026-07-23)。`long_eq_sep: "allow"` (既定) では long option の space 形 main entry (term: word_end) と eq-split matcher の元綴り (term: cont) が素材段で 2 件併存する (DR-104 §3 の 6 フィールド同一性規則、`fixtures/complete/eq-split-cont.json` の case `word-end-and-cont-coexist-same-origin` が pin)。素材段のこの併存は正であり変更しない — 畳むのは本節の policy 段である。統合の向きは `insert_form` (§2.6) に従う: 既定 `"space"` は word_end 側 (spelling そのまま、nospace なし)、`"eq"` は cont 側 (`spelling=` + nospace)。片側しか素材に無い場合 (`long_eq_sep: "require"` / `"deny"`、または after 整合フィルタで word_end 側だけが落ちた場合等) は統合対象が無く、在る側をその term の翻訳 (§4.1) のまま emit する — `insert_form` は「ペアが併存した時どちらへ畳むか」だけを定め、単独候補の形を書き換えない。

**prefix 絞りで候補がゼロになった場合は空リストを返す** (kawaz 裁定 2026-07-23)。入力済みのカーソル単語はそのまま残る (例: 値が `foo|bar|baz` の 3 択で `--choice c<TAB>` → 候補なし、`c` は消えない)。ユーザが入力中の文字列には意味があるかもしれず、勝手に消すのはユーザの意図に反するリスクが高い。対案 (一致ゼロなら入力を消して全候補を出し直す) は不採用 — その実現自体が bash の標準 programmable completion 枠組み (`complete -F` + `COMPREPLY`) の外に出る。kuu の glue は標準枠組みの内側に留まる (`bind -x` による TAB 乗っ取りは既存 bash-completion エコシステムと共存できない)。

順序整列の突き合わせ規則 (DR-116 §2 の実装形): candidate の `origin` (canonical 要素名、DR-104 明確化 (c)) を help model の options / commands entry の name に突き合わせる。同一 entry 由来の複数候補 (canonical + alias、eq-split の `cont` 形等) は素材配列の出現順を保つ。値位置候補は由来 entry の順序に従属する。匿名 exact 候補 (origin = spelling 自身、DR-104 明確化 (iii)) は help model に対応 entry を持たないため positional の定義順 (DR-113 §4.4) に従属させる — 匿名 exact 候補は裸文字列→exact 正規化 (DR-063 A.1) が生む名前なし要素由来であり、options / commands の entry は名前を持つ (DR-067 の name 非空制約) ため、この規則の適用対象は positional 側に閉じる (前提確認: DR-104 明確化 (iii))。completer 由来候補は supplier の返却順のまま由来 entry の位置に挿入する。

既存の `kuu complete` (素の DR-104 wire candidates を JSON で出す素材 API) はそのまま残す。query 応答は「policy 適用済み・行指向・shell glue 専用」で位相が違い、同じ口に混ぜると素材とポリシーの分離 (DR-060 §3) を CLI 面で崩すため別口とする。

### 6. 形態 B (kuu-cli) — env プロトコルは使わず、正規サブコマンドで capability を露出

補完生成器の消費者は 2 形態あり、主従を取り違えない:

- **形態 A (本命): セルフバイナリ組み込み** — kuu-core を組み込んだアプリ自身。definition はバイナリ内、custom completer はホスト言語のクロージャとして registry に実在し実行できる。§2 の preset と §3 の env プロトコルが呼び口
- **形態 B (従): kuu-cli の def.json 外部指定** — definition が外部 JSON の幻影コマンド体験 (VISION) とデバッガ用途

env プロトコルの words は「definition 内蔵バイナリの argv」を前提とし def.json パスを渡す席が無いため、形態 B には構造的に適合しない。kuu-cli は自身の正規サブコマンドとして両 capability を露出する。本 DR が規範化するのは「形態 B は env プロトコルでなく正規サブコマンドで両 capability を露出する」ことと capability の入出力契約 (§1) までであり、サブコマンドの綴り・option 名は kuu-cli の CLI 設計の関心 (参考例):

```
kuu completion generate <def.json> --shell <s> [--program-name <name>]     # completion_script capability
kuu completion query <def.json> --shell <s> [--cword <N>] -- <words...>    # completion_query capability
```

- `<words...>` は §3.4 と同じくコマンド名 (幻影コマンド名) を先頭に含む全量。capability の入力契約は両形態で共通 (§1)
- 形態 B に UUID が無いのは、正規サブコマンドは kuu-cli 自身の argv 文法の内側にあり「自分宛か」の曖昧さが生じないため
- glue テンプレにとって query 呼び出し形はテンプレ変数 (形態 A = `KUU_COMPLETE=$uuid "$prog" $uuid <shell> ...`、形態 B = 上記) であり、glue の固定依存は応答行文法 (§4) だけ — テンプレは両形態で共有できる
- def.json 絶対パスが glue に焼き込まれるため、def を動かすと補完が「候補が出ない」形で黙って壊れる (形態 B 固有のリスク。緩和は script 内コメントへの再生成手順の焼き込み程度)

**custom completer の縮退** (GEN-Q5'' = a): def.json にクロージャは直列化されないため、形態 B では custom completer を実行できない。当該値位置は**候補提供なし**とし、`kuu validate` が「この definition は completer capability `<名前>` を要求する (kuu-cli 単体では補完不可)」を機械可読に報告する (DR-109 柱 3 の import 側 capability 報告と同じ線)。files への fallback はしない — branch 名の席にファイル名が出るのは型違いのノイズで無より悪く、fallback したことをユーザが観測できない。形態 A ではこの問題自体が存在しない (registry に実クロージャが居る。未知の completer 名は補完時でなく定義時の問題 — export 時の未解決フック検出、DR-109 柱 3 の関心)。

### 7. builtin completer は `files` / `dirs` の 2 種を収載する

DR-111 §6 が生成器層の DR に委ねた標準 completer 住人の収載を、本 DR で次のとおり確定する:

- `schema/builtin-descriptors.json` に `completers` 区分を新設し、**`files` / `dirs`** の 2 descriptor を収載する。宣言軸は DR-111 §5 の最小形 (`role: "completer"`、`construction: "static"`、`invocation: {encoding: "none", parameters: []}`、`reasons: []`) のまま — io_type は引き続き宣言しない (§8.3)
- 両名は §4.2 の `:shell_action` 語彙と 1:1 対応する: `files` = ファイル・ディレクトリの一般補完 (zsh `_files` / bash `compgen -f` 相当)、`dirs` = ディレクトリのみ (zsh `_files -/` / bash `compgen -d` 相当)
- DR-060 §4 の「files / dirs / path 等」のうち `path` は収載しない。files との差 (何を列挙するか) が shell 側委譲機能の粒度で立たず、同義の別名を builtin に置くのは語彙の重複である
- builtin completer 名の集合は引き続き閉じない (実装・拡張が completer を追加できる)。収載 2 種は「glue 翻訳表の対応が実在する最小集合」である

builtin completer は名前を返すだけで実行実体を持たず、glue が shell 既存機能へマップする (DR-060 §4 — quoting・展開・元表記着地は shell の成熟機構の責任領域)。

### 8. conformance と検証の分担

#### 8.1 spec conformance への増分は preset の受理面のみ

DR-116 §6 の「spec conformance への増分はゼロ」は「DR-116 の policy 採用**だけ**を理由とする増分は無い」の意味であり、本 DR の preset 化 (GEN-Q3'' 裁定) は新しい裁定による正当な増分を生む:

- **増える**: `schema/wire.schema.json` の type 値 `completion_script` の受理と `insert_form` パラメータ (§2.6 — enum `"space"` / `"eq"`、既定 `"space"`)、preset の lowering (canonical 展開)、definition-error、内部セル `#completion_script` の観測、`schema/builtin-descriptors.json` の `completers` 区分 (§7)。definition-error は既存 kind の準用 (同一 default 席の `default` / `default_fn` 複数宣言、DR-113 §5.2 と同型。加えて §2.6 の `insert_form` enum 逸脱と複数入口間の明示値食い違い) を対象とし、**配置面の座席違いは存在しない** (§2.3 — positional 配置は合法)。v1 の入口 DSL は固定 operand も target type に従って string へ decode するため、発火可能だが shell 名 string を供給できない値スロット不正構成は存在せず fixture を持たない。fixture は既存の lowering / definition-error profile への追加であり、**新 profile は設けない** (DR-115 §6.1 と同型)。shell 名候補提示の糖衣 (§2.2) は lowering の `entities` 面で public string 値セルから内部セル `#completion_script` への link と values enum 不在を観測する。候補文字列は実装対応 shell 集合のため fixture pin しない
- **増えない**: query 側の schema 増分はゼロ — env プロトコル (§3) と応答行文法 (§4) は wire 語彙でなく runtime 挙動の規範であり、fixture pin の対象外 (DR-115 §1.3 の概念シグネチャと同じ位相)。script のバイト列・応答行の内容・候補順・説明文言は fixture pin しない (DR-116 §6 の出力非 pin は不変)。complete query の契約 (DR-104) も不変

#### 8.2 ux 層の検証手段 — product test の必須シナリオ

env プロトコルは「玄関で二箇所一致を判定して argv 解釈を奪う」を全言語 ux 層が正しく実装して初めて成立する規約であり、spec fixture の位相 (wire in / wire out) では観測できない。canonical 実装 (各言語 ux 層) は product test に少なくとも次のシナリオを備える (検証実装の形は各言語の関心。DR-115 §6.3 の product golden テストと同じ分担):

1. env と argv[1] が一致 → query モード (argv は解釈されない)
2. env のみ (argv[1] 不一致または不在) → 通常実行、かつ env 未設定時と観測等価 (§3.2)
3. argv[1] に UUID 様文字列のみ (env 不在) → 通常実行 (定義照合により通常の帰結)
4. 一致 + `KUU_COMPLETE_INDEX` の省略 / 不正値 → 行末補完扱い (§3.3)
5. `cword = 0` → 空応答 (§3.4)

policy 適用の正しさ (DR-116 の 5 観点: 順序 / hidden / deprecated / alias / 説明引き直し) は**行指向応答の単位** (glue でなく `completion_query` の出力) で検証する — shell 非依存で決定的にテストでき、glue 層は 3 shell 実機の煙テストに留められる。発題 issue の product test 受け入れ条件はこの単位で読む。

#### 8.3 DR-111 §5 の io_type は引き続き先送り — 座席は維持

DR-111 §5 が「runtime 問い合わせ ABI 確定時に軸を追加する」とした completer descriptor の `io_type` を、本 DR は**追加しない**。本 DR が確定した ABI は glue ↔ binary 間のプロトコル (env・argv・行文法) であり、completer 関数自体の入力形 (word 断片・args 文脈として何を受けるか) の機械可読宣言は依然として要らない — 形態 A はホスト言語クロージャの直呼びで宣言なしに動き、形態 B は実行しない (§6)。io_type 軸の追加は descriptor からの実装生成 (VISION §4) が実体化する時点の DR へ引き続き委ねる。座席は維持される (builtin 2 種 (§7) も io_type を持たないため、禁止 → 必須の将来変更で壊れる corpus は生じない)。

## 採用しなかった案

### 静的展開型の生成器 (definition から補完 script 全体を生成)

生存経路計算と after 整合フィルタが shell script へ静的展開不能であり、シェル上での kuu 再実装になる (GEN-Q1 裁定)。

### 予約サブコマンド / 予約 option による query 口

ユーザの引数定義は無限の自由度を持ち、その中に予約綴りを衝突なく仕込めるという前提自体が誤り。引数には触らないのが一番安全であり、入口からモード切替して一切の引数解釈を奪い橋渡しに専念する (GEN-Q4' 棄却の kawaz 裁定)。

### env 単独判定 (`KUU_COMPLETE=<shellname>` のみ)

env は子プロセスへ継承されるため、custom completer が呼ぶ子の kuu 製コマンドも補完モードに入って壊れる (自己参照シナリオ)。

### unset 規約 (query モード突入時に自 env から `KUU_COMPLETE` を除去)

ux 層実装の行儀に依存し、unset 前に spawn される子・ux 層を経由しない生 exec を防げない。機構でなく規約なので保証にならない (害の無い衛生としてやるのは自由)。

### realpath 照合 (env 値にバイナリパスを入れて自身と照合)

補完対象と同一バイナリを completer が内部で呼ぶ自己参照ケース (`ls` の completer が `ls` を呼ぶ) では realpath が一致してしまい、まさに守りたいケースで守れない。

### argv 単独のマーカー (env なし、argv[1] = UUID のみ)

「UUID らしき第一引数」だけではモード切替の意図を持たない通常引数と区別できない。env (意図) と argv (宛先) の二箇所が揃って初めて「あなただけへの指示」になる。

### cobra 方式の cword (argv 末尾 = カーソル単語)

カーソル以降を渡さない前提の形であり、args_after が原理的に運べない。after 整合フィルタ (kuu が全解決モデルで得る精度) を捨てることになる。

### argv 内の制御トークン (`--cword N` 等)

「UUID・shell 名以降は純粋に words」という argv 構造の純度を壊す (§3.3)。

### words からコマンド名を除いて渡す

glue 3 種すべてに「先頭を切る」加工が複製され、shell native 素材 (COMP_WORDS 等が全量形) との index 変換も 3 箇所に散る。binary 側 1 箇所で落とす方が §5 の分担思想と一貫する。

### JSON 応答

shell glue に JSON parser 依存を強いる。行指向はどの先行系 (cobra / clap / argcomplete / carapace) も共有する定石であり、JSON が要る消費者には素材 API (`kuu complete`) が既にある。

### 行文法へのエスケープ語彙導入

glue のエスケープ解釈は行指向を採った根拠 (awk / read へ直接流せる単純さ) を毀損する。搬送不能候補の除外 + 説明の正規化 (§4.3) で足りる。

### `:keep_order` directive

DR-116 §2 が順序保持翻訳を常時の規範とするため、per-response で切り替える情報が存在しない (§4.2)。

### word_end / cont ペアの 2 行 emit (行応答段でも併存維持)

glue 側から見ると同一 flag が候補として 2 回出る (shell-matrix 実機検証、COMPQ-Q1 発題 issue)。素材段の併存 (DR-104 §3) は wire の同一性規範として正だが、行応答は shell へ提示する最終形であり、ユーザに 2 重表示のノイズを見せる根拠にならない。glue 側での重複排除は policy を shell 数ぶん複製する (§5 の分担違反)。

### eq 形 (`--flag=` + nospace) を既定にする

eq 形既定の主要例は cobra のみで、space 形が業界優勢 (clap_complete / argcomplete / click / fish / yargs)。bash では `COMP_WORDBREAKS` の `=` 分割問題も抱える。eq 形は `insert_form: "eq"` の明示指定で選べれば足りる (§2.6)。

### 形態 B での files fallback

型違いのノイズで無より悪く、fallback したことをユーザが観測できない (§6)。

### builtin completer への `path` 収載

`files` との差が shell 側委譲機能の粒度で立たず、同義の別名の重複になる (§7)。

### 専用糖衣 `completion_on_failure`

既定 false の preset では糖衣が短縮するものが無い。汎用 `on_failure` で足りる (§2.1)。

## 波及

- **DR-116**: §6「spec conformance への増分はゼロ」へ、本 DR §8.1 の関係 (増分ゼロは DR-116 の policy 採用だけを理由とする増分の不在であり、preset 化の増分は本 DR が規定) を note 追記する
- **DR-111**: §5 の completer 行に「io_type の先送り継続と座席維持は DR-117 §8.3」、§6 に「builtin completer 2 種の収載は DR-117 §7」の note を追記する
- **DR-113**: §2 に「各 preset の入口列挙 (long / short / env) は例示であり、positional を含む配置面を制限しない (ABI-Q1 = a、DR-117 §2.3)」の note を追記する。§2.3 (`help_category`) に positional 配置の例示を添える追記も同課題
- **DR-064**: 「配置は挙動不問」が dd の事実記録から全 preset の一般則へ格上げされた旨 (DR-117 §2.3) の note を追記する
- **DR-060**: §4 の「files / dirs / path 等」に「builtin 収載は files / dirs の 2 種、`path` は収載対象外 (DR-117 §7)」の note を追記する
- **schema/wire.schema.json**: type 値 `completion_script` の受理を追加
- **schema/builtin-descriptors.json**: `completers` 区分を新設し `files` / `dirs` を収載 (§7)。descriptor.schema.json の envelope 追随を含む
- **scripts/lint-descriptors.py**: 走査区分に `completers` を追加
- **fixtures**: lowering profile へ preset の canonical 展開 (`insert_form` の既定補完・明示値の観測を含む)、definition-error profile へ同一 default 席の複数宣言・`insert_form` の enum 逸脱・複数入口間の明示値食い違い fixture を追加 (既存 profile への追加、新 profile なし)。挿入形統合の応答行そのもの (§5 の merge 規則) は runtime 挙動の規範であり fixture pin しない (§8.1 の「増えない」側)。v1 の入口 DSL では値スロット不正構成が存在しないことは §8.1 の分担に従う
- **docs/DESIGN.md / LOWERING.md**: `completion_script` preset・内部セル・orchestration の記述を追加
- **glue script テンプレ + shell 別翻訳表**: 本 DR の行文法にのみ依存する言語非依存の共有資産として 1 箇所で管理する (置き場所 — spec リポ内 `templates/` か別配布か — は実装着手時の判断)。shell 別翻訳表 (findings §4.3) は Web 調査由来につき、実装サイクルで 3 shell の実機マトリクス検証を行い実装リポ側 findings に記録する
- **各言語 ux 層 (一番手 MoonBit、DR-109 柱 7)**: 玄関の二箇所一致判定、`completion_query` パイプライン (§5)、`completion_script` 生成、§8.2 の product test シナリオ。MoonBit 実装の座席 (kuu.mbt の ux 層か kuu-cli lib か) は ux 層の座席設計と同時に確定する — help_installer / help_query が kuu.mbt に住み canonical レンダラが kuu-cli に住んだ前例に照らすと、preset と env モードの意味論 = kuu.mbt、行指向応答の組版と glue テンプレ埋め = product 側の分割線が自然だが、確定は ux 設計へ送る
- **kuu-cli**: `kuu completion generate` / `kuu completion query` サブコマンド (§6)、`kuu validate` の completer capability 報告 (§6)
- **発題 issue** (`docs/issue/2026-07-22-dr-116-completion-generator-implementation.md`): 受け入れ条件の conformance 無変更項を本 DR §8.1 の増分範囲確認へ更新 (本 DR と同時に反映済み)
- v1 発行条件 (DR-108 の 5 profile green) に本 DR の lowering / definition-error fixture が乗るかは統括判断とする

## リスク・悪い面

- **conformance 増分の発生**: preset 化は「実装課題だけ、spec 静穏」だった発題 issue を spec 改訂 (schema + fixture) に格上げする。ただし query 側の env 化により増分は preset 受理面 + descriptor 収載に閉じた
- **env プロトコルの ux 層規約依存**: 玄関判定は全言語 ux 層の正実装で成立する規約であり、spec fixture で観測できない。§8.2 の product test シナリオが緩和策だが、conformance profile のような機械的強制力は無い
- **ABI 固定部分の改訂コスト**: 行文法・directive 語彙・env 名の変更は DR 改訂になる。glue テンプレの 1 箇所共有 (波及) で契約と glue が一緒に改訂される構図にして変更コストを抑えるが、野良 glue (ユーザ手書き) との互換は将来の破壊変更で切れ得る
- **bash の説明表示品質**: 列フォーマット擬似表示は端末幅・マルチバイトで崩れやすい。応答には常に説明列があり、bash glue が説明省略に倒すのは翻訳側の裁量 (§5 の policy と翻訳の分離がこの判断を局所化する)
- **形態 B の def パス焼き込み陳腐化**: def.json を動かすと補完が「候補が出ない」形で黙って壊れる (§6)
- **prefix 絞りの二重化リスク**: 将来 core が `word_before` を実装した場合、生成器側の絞りを素通しへ切り替える追随が必要 (§3.4 に申し送り済み)
- **搬送不能候補の除外は情報の損失**: タブ・改行入り候補は応答に現れない (§4.3)。実用上の実害はほぼ無いが、custom completer がそのような候補を返した場合に「出ない理由」を観測する手段は binary 側デバッグ (stderr) に限られる

## 関連

- DR-116 (生成器の既定 policy — 本 DR が実装形を与える。§8.1 が §6 との関係を確定)
- DR-113 §2/§4.4/§6/§8 (preset の型・program_name 供給・内部セル規約・help 順序 — §2 の型を踏襲)
- DR-115 §1.3/§6 (概念シグネチャの前例・出力非 pin・exit class・product golden テストの分担)
- DR-060 §1〜§5 (complete 意味論・素材とポリシーの分離・completer 名前参照・責務 4 層)
- DR-104 (candidate wire・6 フィールド identity・`word_before`/`word_after` の v1 予約 — §3.4 の分解の写像先)
- DR-111 §5/§6 (completer descriptor の最小形と io_type 先送り — §7/§8.3 が解消・継続を確定)
- DR-109 §1 柱 3 (capability 報告 — §6 の validate 報告) / 柱 6 (runtime 問い合わせ第一候補) / 柱 7 (MoonBit 一番手)
- DR-114 (cell_fns — preset 発火の供給機構)
- DR-108 (v1 発行条件 — 波及の統括判断の対象)
- DR-064 (配置は挙動不問 — §2.3 の一般解釈の根拠)
- `docs/findings/2026-07-22-completion-generator-plan.md` (設計素材の正本、GEN-Q 裁定記録)
- `docs/findings/2026-07-21-completion-ordering-plan.md` (shell 別ソート実態・CORD-Q 裁定の出所)
- `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (発題 issue)
- `docs/issue/2026-07-23-completion-query-duplicate-candidates.md` (COMPQ-Q1 の発題 issue — §2.6 / §5 merge 規則の由来)
- `docs/VISION.md` (幻影コマンド体験と custom completer の既知の限界、§4 実装生成)
