# canonical 補完生成器 (シェル統合) の設計素材 — DR-116 実装の輪郭

> 由来: `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (DR-116 の
> 実装課題化)。DR-116 (生成器の既定 policy: 順序 = help model 参照 / 説明 = origin 引き直し /
> hidden 除外・deprecated 注記・alias 表示 / 出力非 pin) は「何を表示するか」を確定済みで、
> 本 findings は「生成器をどう建てるか」(アーキテクチャ・提供インターフェース・query 契約・
> policy 適用位置・住処) の設計素材を整理する。裁定ラベルは **GEN-Qn** (バッチ毎一意
> プレフィクス規約、CORD-Q1〜Q5 は 2026-07-22 裁定で消費済み)。
>
> 裁定状況: GEN-Q1 = a / GEN-Q2 = a 確定 (kawaz 2026-07-22)。GEN-Q3/Q4 は初版の
> 「kuu-cli 前提」の視野欠落 (kawaz 指摘: 本命消費者はセルフバイナリ = kuu を組み込んだ
> アプリ自身) で差し戻し、GEN-Q5/Q6 と併せて §2/§3/§5 を消費者 2 形態分離で再構成した
> 再提示版 (GEN-Q3'〜Q6')。

## 0. 前提の地図 (ゼロコンテキスト読者向け)

### 0.1 確定済み契約 (本 findings はどれも変更しない)

1. **complete query** (DR-060 §1/§2、DR-104): カーソル前トークン列 `args_before` (+ optional
   `args_after`) を受け、生存 partial 経路の次消費点候補を同期的な有限配列で返す。候補は
   `spelling` / `is_value` / `type` / `origin` / `term` / `meta` の 6 フィールド identity、
   比較は順序非依存 multiset。`word_before` / `word_after` (カーソル単語の前半・後半) は
   **v1 未実装のまま予約** — core はカーソル単語を消費せず、prefix 絞りは生成器側の選択
   (DR-060 §3、DR-104 §1 明確化)。
2. **責務 4 層** (DR-060 §5): 層 1 = complete API + 候補構造 (spec)、層 2 = kuu completion
   生成器 (kuu プロダクト標準提供、shell 作法を全部封じる、spec 射程外)、層 3 = アプリ開発者
   (**completion サブコマンドに生成器を繋ぐだけ**)、層 4 = エンドユーザ (`source <(app
   completion bash)` するだけ)。層 3/層 4 の文言が示す通り、**DR-060 の想定の中心は最初から
   「アプリ自身のバイナリが completion サブコマンドを持つ」形**である (§0.3 形態 A)。
   本 findings の主題は層 2 の実装設計。
3. **生成器の既定 policy** (DR-116): definition 由来候補は DR-113 §8 適用済みの help model
   順 / completer 由来候補は供給順確定 / 説明は candidate 同梱でなく `origin` から help
   model・definition を引き直す / hidden 除外・deprecated 注記・alias 表示。出力 (script・
   候補順・説明文字列) は fixture pin しない (DR-115 §6.2 と同型)。
4. **completer は名前参照** (DR-060 §4、DR-111 §5): 標準 completer (files / dirs / path 等)
   は生成器が shell 既存機能 (`_files` / `compgen -f` / fish 組み込み) へマップする
   (アプリ内実行でも file 列挙を自前でやらない — quoting・展開・元表記着地は shell の
   成熟機構の責任領域)。アプリ固有 completer は「completer 名 → アプリ提供関数の呼び出しを
   生成器が配線する」。実行の入力契約 (io_type) は runtime 問い合わせ ABI の確定待ちで、
   descriptor 側は座席だけ空けてある (DR-111 §5)。
5. **配布方向** (DR-109 §1 柱 6): completion 配布は「生成器標準提供 + runtime 問い合わせが
   第一候補」。dotnet-suggest の bootstrap 摩擦 (外部共通 engine 方式) を轍とする。
6. **shell 側の現実** (`docs/findings/2026-07-21-completion-ordering-plan.md` §1.1、Web 調査・
   実機未検証): 供給順保持は zsh `compadd -V` / bash `compopt -o nosort` (4.4+) で可能、
   fish は不可。説明表示は zsh (`_describe` / `compadd -d`)・fish (`候補\t説明` ネイティブ)
   が得意、bash は候補文字列しか持てず cobra V2 は列フォーマット加工で擬似表示する。

### 0.2 裁定済みの土台 (GEN-Q1 / GEN-Q2、kawaz 2026-07-22)

- **GEN-Q1 = a: ブリッジ型一択** (thin script + binary への runtime 問い合わせ)。静的展開型
  (definition から補完 script 全体を生成) は作らない。根拠: 生存経路計算 (DR-060 §1 の
  全生存 partial 経路の和集合 — greedy 面の先食い・sever・eq-split / cluster を含む評価器
  そのものの走査) と after 整合フィルタ (フル `parse()`、遅延述語込み — DR-104 §5) が
  shell script へ静的展開不能で、展開する = 評価器の shell 再実装。kawaz 裁定理由: kuu は
  表現力が高く、静的展開はシェルで kuu を再実装する複雑さになる。動的 completer も実行時に
  しか解決できない。静的・ブリッジ混成も「静的に決まる部分」がほぼ残らないため検討外
- **GEN-Q2 = a: v1 対象 shell は zsh / bash / fish** (PowerShell は追随)。順序保持不可
  (fish)・説明表示が弱い (bash)・両方可 (zsh) という能力 3 象限を初期実装で踏み、翻訳層の
  設計を最初から shell 能力差吸収の形に強制する

### 0.3 消費者 2 形態 — セルフバイナリが主、kuu-cli が従

補完生成器の消費者は 2 形態あり、設計の主従を取り違えないことが本 findings の背骨になる:

- **形態 A (本命): セルフバイナリ組み込み** — kuu-core を組み込んだアプリ自身のバイナリ
  (Rust / Go / TS / MoonBit アプリ)。definition はバイナリ内 (ソースコード上の宣言)、
  custom completer はホスト言語のクロージャとして registry に実在し**実行できる**。
  生成 (`app completion zsh`) も補完時の問い合わせも**アプリ自身が受ける**。cobra / clap
  の定石はすべてこの形態であり、DR-060 §5 層 3「completion サブコマンドに生成器を繋ぐ
  だけ」が指す絵もこれ。生成器は各言語 kuu 実装 (ux 層) がライブラリ機能として同梱する
- **形態 B (従): kuu-cli の def.json 外部指定** — definition が外部 JSON ファイルとして
  存在する幻影コマンド体験 (VISION) とデバッガ用途。custom completer のクロージャは JSON に
  存在せず**実行できない** (VISION が明記する幻影コマンドの既知の限界)。形態 A の標準形を
  「def.json を外部から指定する」形で動かす特殊形として設計する — B のために独自の形を
  発明しない

初版はこの分離を欠き、形態 B (kuu-cli) を暗黙の主語に生成コマンド形と query 契約を
組んでいた (kawaz 指摘で差し戻し)。以降の設計は形態 A を主語にし、B は A からの差分
だけ書く。

### 0.4 セルフバイナリ定石の一次資料調査 (2026-07-22)

**cobra** (Go — kubectl / helm / gh の土台):

- `completion <shell>` サブコマンドを rootCmd に**自動追加** (`CompletionOptions` で
  無効化・隠し化可能)。エンドユーザは `source <(prog completion zsh)`
- 補完時は生成 script が隠しサブコマンド **`prog __complete <args...> <補完中単語>`** を
  呼ぶ。補完中単語は空でも `""` を明示的に渡す。カーソル後のトークン (行中間補完の
  args_after 相当) は捨てる
- 応答は**行指向テキスト**: 1 行 1 候補 (`候補\t説明` のタブ区切り)、最終行に
  `:<directive値>` (ShellCompDirective のビットフラグ: Error / NoSpace / NoFileComp /
  FilterFileExt / FilterDirs / KeepOrder / Default)。stderr に人間向けの directive 説明
- `__complete` は手で直接叩けてデバッグ可能。stdout への print は候補と誤解釈されるため
  debug 出力は専用ファイル (`BASH_COMP_DEBUG_FILE`) へ

**clap_complete dynamic** (Rust、`unstable-dynamic` feature):

- サブコマンドでなく **env var 起動**: main 冒頭に `CompleteEnv::complete()` を仕込み、
  `COMPLETE=zsh prog` で glue script を emit (`source <(COMPLETE=zsh prog)`)。補完時は
  glue が `COMPLETE=zsh` + `_CLAP_COMPLETE_INDEX` (カーソル単語 index) + `_CLAP_IFS` を
  設定して `prog -- ${words}` を呼び、行出力を `compadd` へ流す
- argv 名前空間を一切汚さない (サブコマンド追加なし) のが利点。一方 glue ↔ binary の
  契約は unstable を明言し「shell 起動のたびに再生成する self-correcting 運用」を推奨。
  stdout を complete() より先に書くと壊れる、非補完文脈での誤発火は panic、という
  env var 方式特有の縁がある
- 設計源流は Python argcomplete (env var + glue)。shell 間差 (bash が `COMP_WORDBREAKS`
  で `--flag=value` を `[--flag, =, value]` に割る等) は glue が正規化してから binary へ渡す

**共通の定石** (両者に共通、carapace / fish ネイティブとも整合):

1. 生成と query は同一 binary の 2 つの口 (生成 = 登録時 1 回、query = 補完のたび)
2. **query 応答は行指向テキスト** — shell glue は jq を持たない前提で awk / read /
   `compadd` に直接流せる形が必須。JSON 応答は glue 側に JSON parser 依存を強いるため
   どの系も採っていない (初版 findings は JSON envelope を仮置きしていたが、この現実で
   棄却 — §3.3)
3. プログラム名は生成時に root コマンド名 / argv[0] から script へ焼き込む

## 1. 論点 1: アーキテクチャ — ブリッジ型一択 (GEN-Q1 = a 確定)

§0.2 参照。以降の論点はすべてブリッジ型を前提とする。

## 2. 論点 2: 提供インターフェース — 生成側の標準形

### 2.1 形態 A: アプリ自身の `<prog> completion <shell>` (多言語共通推奨)

DR-060 §5 層 4 の体験 (`source <(app completion bash)`) は、アプリが `completion`
サブコマンドを持つことを既に仮定している。cobra (kubectl / helm / gh) が確立した
`<prog> completion <shell>` は業界で最も枯れた形であり、これを **kuu の多言語共通の
推奨インターフェース**とする:

```
<prog> completion <zsh|bash|fish>     # 補完 script を stdout へ (エンドユーザが source / 配置)
```

- 各言語 kuu 実装 (ux 層) は「definition + 生成 policy → script 文字列」の生成器関数を
  ライブラリ提供し、アプリ開発者はそれを completion サブコマンドへ繋ぐ (層 3 の仕事は
  この配線だけ)。cobra 式の**自動追加** (completion entry を暗黙注入) をするかは各言語
  ux 層の裁量 — kuu は definition が argv 文法の正本という思想なので、暗黙注入より
  「定義テンプレ / ヘルパで明示的に足す」側が思想に合うが、これは ux 層 API 設計の
  関心で多言語共通推奨には含めない
- script へ焼き込むもの: (1) 補完対象コマンド名 (definition ルートの name、無ければ
  生成時に呼び出し側が供給 — DR-113 §4.4 の program_name 供給と同型)、(2) 問い合わせ先 =
  アプリ自身 (生成時の絶対パス解決か素の名前かは glue テンプレの関心)。形態 A では
  definition はバイナリ内にあるので **def パスの焼き込みは存在しない**

推奨の置き場所は GEN-Q6' (§5) — サブコマンド名 `completion`・shell 名 positional という
「顔」の多言語統一に価値があるため、非規範の推奨として spec 側 DR に置く案を推す。

### 2.2 形態 B: kuu-cli の def.json 外部指定 (A の特殊形)

kuu-cli は「definition JSON を与えて操作する」道具 (現行 `parse` / `complete` /
`validate` / `help` はすべて `kuu <sub> <def.json> [options]`)。形態 A の標準形へ
def.json 供給を足しただけの形にする:

```
kuu completion generate <def.json> --shell <zsh|bash|fish> [--program-name <name>]
```

- `--program-name` は幻影コマンド運用で必須になる席 (wrapper script 名 ≠ definition ルート
  name のケース)。形態 A では argv[0] が自然に埋める情報を、B では明示供給する
- script へ焼き込むもの: 形態 A の 2 点 + **def.json の絶対パス** (query 時に同じ
  definition を読むため)。def を動かすと補完は「候補が出ない」形で黙って壊れる — shell
  補完面にエラーを出す手段は乏しく、script 内コメントに再生成手順を焼き込む程度の緩和
  しかない (形態 B 固有のリスク)
- shell を positional (cobra 並び `completion zsh`) でなく `--shell` オプションにするのは
  kuu-cli 内のサブコマンド一貫性 (def.json 第一 positional) を優先するため。**アプリ側
  (形態 A) は cobra 並びの positional が推奨**であり、B が A と並びを違えるのは
  「def.json という A に無い引数が第一 positional 席を使う」ことの帰結

## 3. 論点 3: query 契約 — runtime 問い合わせ ABI の実体化

### 3.1 位置づけ — DR-111 §5 が空けた座席そのもの

補完時に glue script から呼ばれる口の契約は、DR-109 柱 6 が「第一候補」とし DR-111 §5
が「ABI 確定 DR が io_type 軸を追加する」と座席を空けて待っている **runtime 問い合わせ
ABI** の実体化そのものである。DR-116 §3 の順序規則 (definition 由来 = help model 順 /
completer 由来 = 供給順) と §4 の「binary 内で説明を引き直して応答へ載せる」は、既に
この ABI 宛の申し送りとして書かれている。したがって query 契約は kuu-cli のローカル
仕様ではなく、**多言語共通の顔**として設計する (正本の置き場所は GEN-Q6')。

### 3.2 口の方式 — 予約サブコマンド (cobra 型) vs env var 起動 (clap 型)

**案 a: 予約サブコマンド型** — glue script が `<prog> __kuu_complete ...` を呼ぶ

- 利点: 手で叩けてデバッグ可能 (cobra が明示する利点)、呼び出しが argv に閉じて glue が
  単純、env var 伝播による子プロセス誤発火が無い
- 予約綴りの衝突: definition の要素名・トリガと衝突しない予約が要る。argv トークンと
  しては `__` prefix (cobra 慣習) が shell 上安全。ux 層は parse 前の玄関でこのトークンを
  横取りする (definition には現れない — cobra の `__complete` も同じ扱い)。
  「`__kuu_complete` という正規サブコマンドを持ちたいアプリ」は理論上締め出されるが、
  cobra が何年も問題にしていない水準の理論値
- 隠すか見せるか: cobra は隠しコマンド。kuu の推奨も **help / 補完候補に出さない**
  (エンドユーザの語彙でない機械用の口 — 利用者語彙の原則) だが、存在は docs で公開し
  デバッグ用途に手で叩けることを明記する (「隠し」= 非公開ではなく非表示)

**案 b: env var 起動型** — `COMPLETE=zsh prog` (clap / argcomplete 系)

- 利点: argv 名前空間を完全に汚さない (予約綴りゼロ)。生成も query も同じ env var 経路で
  glue を毎 shell 起動時に再生成する self-correcting 運用ができる
- 悪い面: main 冒頭に interception を仕込む規約がアプリ全言語に波及する (stdout を先に
  書くと壊れる・非補完文脈の誤発火が panic、と clap 自身が縁の多さを示している)、env var
  は子プロセスへ伝播しやすい、手で叩く形が不自然でデバッグしにくい、clap 自身が契約を
  unstable と明言したまま — 枯れ度で cobra 型に劣る

**評価: 案 a (予約サブコマンド型) を推す**。kuu の query は「definition + words +
cursor → 応答」の純関数で、手で叩いて検証できるデバッグ可能性は kuu の観測等価主義と
相性が良い。argv 非汚染という b の利点は、`__kuu_complete` の予約 1 綴りのコストと
釣り合わない。

### 3.3 入出力 — words + cword 直渡し、行指向応答

**入力** (形態 A):

```
<prog> __kuu_complete --shell <s> --cword <N> -- <word...>
```

- glue は shell の words 配列 (bash `COMP_WORDS` / zsh `words` / fish `commandline -o`)
  を `--` の後ろへそのまま渡し、カーソル位置を `--cword <N>` (0-origin) で渡す。JSON を
  shell に組ませない (quoting 再実装 = 層 2 が封じるべき shell 作法の漏出)
- binary 側で `words[1..cword]` → `args_before`、`words[cword]` → カーソル単語 (word)、
  `words[cword+1..]` → `args_after` に分解する。**cobra は補完中単語より後ろを捨てるが、
  kuu は args_after を after 整合フィルタ (DR-060 §2、全解決モデルならではの精度) に
  使えるため words 全量 + cword 渡しにする** — 定石 (cobra 型の口) に合わせて kuu の
  能力を削らない、が本契約の独自部分
- word は core の complete には渡さない (DR-104 §1: `args_before` は確定済み完全トークン
  のみ、`word_before` は v1 未実装予約)。word は binary 内の**生成器 policy 段の prefix
  絞り** (DR-060 §3 が生成器側の選択とした絞り込み) で消費する。将来 core が `word_before`
  を実装した場合は生成器側の絞りを素通しへ切り替える (本段落が申し送りの grep 先)
- shell 間差の正規化 (bash の `COMP_WORDBREAKS` が `--flag=value` を `[--flag, =, value]`
  へ割る等) は glue 側で吸収してから渡す (clap / argcomplete と同じ分担)

**応答: 行指向テキスト** (stdout):

```
--port	listen port
--color=	output color mode	nospace
:keep_order
:shell_action files
```

- 1 行 1 候補、タブ区切り (`挿入文字列\t説明[\t候補フラグ]`)。**DR-116 §2/§3 の順序
  規則を適用済みの順序付き列** (multiset 非規範の wire candidates と違い、応答の行順が
  意味を持つ)。説明は origin 引き直し済み・hidden 除外済み・deprecated / alias 注記込み
  (§4)。`nospace` は candidate の `term: "cont"` の翻訳 (空白挿入が解釈を破壊する制約 —
  DR-104 §2 明確化 (e)。cobra の directive は応答全体に一律だが、kuu は per-candidate の
  term を持つので候補フラグ列で運ぶ)
- `:` prefix 行は応答全体への指示 (cobra の directive 行の一般化): `keep_order` (順序
  保持手段のある shell で `compadd -V` / `nosort` へ翻訳)、`shell_action files` (値位置
  候補の builtin completer を shell 既存機能へ委譲する指示 — DR-060 §4 のマップは glue
  側テンプレが持つ)
- **初版 findings の JSON envelope 案はここで棄却する**: shell glue は jq を持たない前提で
  awk / read / `compadd` に直接流せる形が必須であり、cobra / clap / carapace が例外なく
  行指向なのはこのため。JSON が要る machine 消費者には素材 API (`kuu complete`、DR-104
  wire) が既にある
- 行フォーマットの列構成・フラグ語彙・directive 語彙の詳細は実装で確定する (ABI 契約と
  して正本化する範囲は GEN-Q6')。エスケープ (説明内のタブ・改行) は契約側で規定必須

**既存 `kuu complete` (素材 API) との関係**: 素の DR-104 wire candidates を JSON で emit
する現行 subcommand はそのまま残す。query 口は「policy 適用済み・行指向・shell glue
専用」で位相が違い、同じ口に `--policy` フラグで混ぜると素材とポリシーの分離 (DR-060 §3)
を CLI 面で崩すため別口とする。

### 3.4 形態 B (kuu-cli) の query

```
kuu completion query <def.json> --shell <s> --cword <N> -- <word...>
```

形態 A の `__kuu_complete` と**同一の入出力契約**で、def.json を外部指定する点だけが
差分。kuu-cli 自身は「definition を外部から受けるアプリ」なので予約綴り `__kuu_complete`
でなく正規の `completion query` 子コマンドとして持つ (kuu-cli の補完対象は def.json の
定義する幻影コマンドであって kuu-cli 自身ではないため、衝突回避の動機が無い)。

custom completer はここでだけ実行不能になる (§0.3 形態 B、GEN-Q5')。

## 4. 論点 4: DR-116 policy の適用位置 — binary 内 1 箇所、glue は翻訳のみ

### 4.1 原則

DR-116 の policy (help model 順整列 / origin 説明引き直し / hidden 除外 / deprecated・
alias 注記) は**全て binary 側の query 応答組立段で適用する**。glue script 側でやると
shell 数ぶん policy 実装が複製され、shell 間 drift (ある shell だけ deprecated 注記が
無い等) の温床になる。glue に残る仕事は (1) words / cword の収集と正規化・転送 (§3.3)、
(2) 応答行と directive の shell 機構への翻訳、の 2 つだけ。この分担は形態 A / B で
完全に共通 (binary が誰か、が違うだけ)。

### 4.2 binary 内の処理段 (パイプライン)

```
words, cword
  → 分解 (args_before / word / args_after)
  → complete(ast, args_before, args_after)              … 素材 (DR-104 candidates)
  → help_query capability 呼び出し                      … DR-113 §8 適用済み順序 + help 素材
  → custom completer 実行 (形態 A のみ、値位置候補の名前解決)  … 供給順 = 確定順 (DR-116 §3)
  → policy 段:
      hidden 除外 (meta.hidden)                         … DR-116 §5
      word による prefix 絞り                            … DR-060 §3 (生成器側の選択)
      origin → help model entry 突き合わせで整列          … DR-116 §2
      説明引き直し + alias / deprecated 注記             … DR-116 §4/§5
      builtin completer 名 → shell_action 翻訳           … DR-060 §4
  → 行指向応答 emit
```

順序整列の突き合わせ規則 (DR-116 §2 の実装形): candidate の `origin` (canonical 要素名、
DR-104 明確化 (c)) を help model の options / commands entry の name に突き合わせる。
同一 entry 由来の複数候補 (canonical + alias、eq-split の `cont` 形等) は生成器の安定順
(素材配列の出現順) を保つ。値位置候補は由来 entry の順序に従属。匿名 exact 候補
(origin = spelling 自身、DR-104 明確化 (iii)) は help model に対応 entry を持たない —
positional 側の値なので「positional の定義順」(model は positionals を定義順で保存、
DR-113 §4.4) に従属させる。completer 由来候補 (形態 A の custom completer 実行結果) は
supplier の返却順のまま、由来 entry の位置に挿入する。

### 4.3 shell 別翻訳表 (glue テンプレの責務)

| 応答要素 | zsh | bash | fish |
|---|---|---|---|
| 行順 (keep_order) | `compadd -V` unsorted group | `compopt -o nosort` (4.4+、旧版は諦め) | 手段なし (fish がソート) |
| 説明列 | `_describe` / `compadd -d` | 列フォーマット擬似表示 (cobra V2 型) or 省略 | `候補\t説明` ネイティブ |
| nospace フラグ | `compadd -S ''` | `compopt -o nospace` | 挙動既定 (`-f` 系の制御) |
| shell_action files | `_files` | `compgen -f` / `-o default` | fish 組み込み (`__fish_complete_path`) |
| words 正規化 | words / CURRENT | `COMP_WORDS` (wordbreaks 再結合が必要) | `commandline -o` |

表の各セルは Web 調査由来 (実機未検証)。生成器実装サイクルで 3 shell の実機マトリクス
検証を行い、結果は実装リポ側 findings に記録する。

## 5. 論点 5: 住処と正本 — 契約は spec、実装は各言語 ux 層

### 5.1 分けるべき 3 つのもの

「生成器をどこに置くか」は 1 問ではなく、性質の違う 3 つの置き場所問題に分解される:

1. **契約 (インターフェースの顔)**: `<prog> completion <shell>` の推奨形 (§2.1)、
   `__kuu_complete` の入出力 (words + cword / 行指向応答 / directive 語彙) (§3.3)。
   **多言語で統一されて初めて価値がある** — glue テンプレが言語非依存に共有できるのも、
   エンドユーザの体験が言語をまたいで同じなのも、契約が 1 つだから
2. **glue script テンプレ + 翻訳表**: shell ごとの補完関数の文字列テンプレ (§4.3 の
   翻訳を実装した shell script)。**契約 (1) にだけ依存し、実装言語に依存しない** —
   binary が Go でも Rust でも同じテンプレが使える
3. **policy 段 + 生成器関数の実装**: §4.2 のパイプライン。実装言語ごとに書かれる
   (kuu-core の complete / help_query を呼ぶホスト言語コード)

### 5.2 置き場所の設計

**契約 (1) の正本 = spec 側の DR** を推す。根拠:

- §3.1 の通り query 契約は DR-111 §5 が空けた runtime 問い合わせ ABI の座席そのもので、
  spec の DR 体系に既に予定地がある。kuu-cli docs に置くと「kuu-cli のローカル仕様」に
  見え、各言語 ux 実装が従う根拠が弱くなる (DR-0001 §4 の「kuu-cli の CLI 入出力契約は
  kuu-cli docs で正本化」は parse / complete 等の def.json 道具面の話で、多言語共通 ABI
  はそれより上流)
- **spec conformance 増分ゼロ (DR-116 §6) とは両立する**: DR-115 §1.3 が canonical
  レンダラ API を「概念シグネチャ (言語側 API の規範化ではなく 3 段目の存在の確定)」と
  して DR に置き fixture では検証しない前例のとおり、「DR に書く = fixture pin する」
  ではない。ABI DR は推奨契約 (非 conformance) として書き、fixture / schema / profile は
  触らない。issue 受け入れ条件「spec 変更ゼロの確認」は fixture / schema / conformance
  profile を指すと読み、その意味では維持される
- DR-111 §5 の completer io_type 軸をこの ABI DR で同時に埋めるかは分けて考える:
  形態 A の completer 実行はホスト言語クロージャの直呼びで、wire 上の io_type 宣言が
  無くても動く (io_type が要るのは descriptor の機械可読化 = VISION §4 実装生成の関心)。
  **ABI DR は completer 実行の入力 (word・args 文脈を渡すか) を ux 層 API 推奨として
  書き、descriptor io_type 軸の追加は実装生成が要るまで先送り**が最小 — ただし DR-111
  §5 は「ABI 確定 DR が io_type 軸を追加する」と書いており、先送りするならその旨を
  ABI DR に明記して座席を維持する

**glue テンプレ (2) = 契約 DR の付属資産として言語間共有**を推す。テンプレは契約にだけ
依存する言語非依存の文字列であり、各言語実装がそれぞれ手書きすると shell × 言語の
マトリクスで drift する。置き場所の具体 (spec リポの `templates/completion/` か、実装が
vendoring する別配布か) は実装着手時の判断でよいが、「正本 1 箇所 + 各言語は埋め込む
だけ」の形を最初から取る。

**実装 (3) = 各言語 ux 層 + 一番手は MoonBit**。DR-109 柱 7 (MoonBit UsefulAST が
一番手、kuu-cli の self-hosting が最初の dogfooding) に従い、最初の実装は MoonBit で
書き、kuu-cli (形態 B、`completion generate` / `completion query`) がその最初の消費者に
なる。置き場所は kuu.mbt (ux 層パッケージ) か kuu-cli lib かの 2 択:

- DR-115 canonical レンダラは kuu-cli 側 (`impl/mbt/cli/src/lib/renderer.mbt`) に住んだ
  前例がある。ただしレンダラと違い生成器は**形態 A (アプリ組み込み) が本命**で、
  kuu-cli lib に置くと MoonBit アプリ (kuu.mbt を import する側) から届かない
- kuu.mbt は spec 参照実装 (conformance の主語) で、非規範の product 品を同居させるかは
  レンダラのとき kuu-cli 側を選んだ理由と衝突する。ux 層パッケージ (UsefulAST の住処)
  の位置づけ次第であり、**MoonBit ux 層の座席設計 (DR-109 柱 7 の実装課題) と同時に
  決めるのが正**。本 findings では「kuu-cli lib 固定 (初版 GEN-Q6 案 a) を撤回し、
  実装座席は MoonBit ux 設計へ送る」までを裁定範囲とする

## 6. 論点 6: custom completer の実行 — 形態で分かれる

ゼロコンテキスト向けの状況説明: definition の値位置には `completer: "<名前>"` (例:
`completer: "branches"`) という**名前参照**が書ける (DR-060 §4)。名前の指す実体は
2 種類ある — (i) **builtin completer** (files / dirs / path 等): どの環境にもある一般
補完で、実装は「shell の成熟した補完機構に委譲せよ」という指示に翻訳される (自前で
ファイル列挙しない)。(ii) **custom completer**: アプリが registry に登録するホスト言語
関数 (例: `branches` = `git branch` を叩いて枝名を返すクロージャ)。

補完時の扱いは形態で決定的に違う:

- **形態 A (セルフバイナリ)**: query を受けるのはアプリ自身であり、registry に custom
  completer の**実クロージャが居るのでそのまま実行できる** (§4.2 パイプラインの
  completer 実行段)。返却順 = 確定順 (DR-116 §3)。「未知の completer 名」は補完時の
  問題ではなく定義時の問題 (registry 未登録の名前参照 — export 時の未解決フック検出、
  DR-109 柱 3 の $required 系の関心) に還元される。**初版 GEN-Q5 が立てた「builtin
  変換表に無い名前をどうするか」は、本命形態では問題自体が存在しない** (静的展開の
  発想の残滓だった)
- **形態 B (kuu-cli / 幻影コマンド)**: def.json にクロージャは直列化されておらず
  (生態系調査の構造的事実 — 主要 8 系統に lossless round-trip が無い理由そのもの)、
  custom completer は**実行できない**。この縮退の規則だけが裁定対象として残る:
  - **案 a: 候補提供なし + validate 面で告知** — その値位置は補完が出ないだけで、
    入力自体は普通にできる。`kuu validate` が「この definition は capability `branches`
    を要求する (kuu-cli 単体では補完不可)」と機械可読に報告する (DR-109 柱 3 の
    import 側 capability 報告と同じ線)
  - **案 b: files へ fallback** — 何か出るが、branch 名の席にファイル名が出るのは
    型違いのノイズで無より悪い。かつ「fallback したこと」をユーザが観測できない
  - 案 a を推す

## 7. 発明と規範化の区別

- **既存決定の追認** (新規裁定なし): ブリッジ経路の第一候補性 (DR-109 柱 6) / policy の
  中身 (DR-116 §2〜§5) / 素材とポリシーの分離 (DR-060 §3) / builtin completer の shell
  機能委譲 (DR-060 §4) / 出力非 pin (DR-116 §6) / アプリが completion サブコマンドを
  持つ絵 (DR-060 §5 層 3/層 4 が既に仮定)
- **本 findings の発明 (GEN-Q 裁定対象)**: (1) 消費者 2 形態の主従 (A 本命 / B 特殊形)
  という設計の背骨 (§0.3)、(2) `<prog> completion <shell>` の多言語共通推奨 (§2.1)、
  (3) 予約サブコマンド `__kuu_complete` + words / cword 直渡し + 行指向応答という query
  契約、および cobra と違い args_after を捨てない拡張 (§3)、(4) word の消費位置 = 生成器
  prefix 絞り段 (core の word_before 予約に触れない) (§3.3)、(5) 契約 = spec ABI DR /
  glue テンプレ = 言語間共有 / 実装 = 各言語 ux 層、という 3 層の置き場所 (§5)、
  (6) 形態 B の custom completer 縮退規則 (§6)
- **規範化しないもの**: glue script のバイト列・応答の表示文言・shell 翻訳の細部・
  各言語 ux 層の生成器関数シグネチャ。ABI DR に書くのは口の形 (入出力の語彙) までで、
  fixture / schema / conformance profile には何も足さない

## 8. リスク・悪い面

- **ABI を今確定する重さ**: query 契約を spec DR にすると、行フォーマット・directive
  語彙の変更が DR 改訂になる。clap が unstable 運用 (毎 shell 起動時再生成) で逃げて
  いる部分を kuu は正面から固定しにいく形 — glue テンプレを言語間共有 (§5.2) にする
  ことで「契約と glue が同じ場所で一緒に改訂される」構図にして変更コストを抑えるが、
  野良 glue (ユーザ手書き) との互換は将来の破壊変更で切れ得る
- **`__kuu_complete` の予約綴り**: definition 側でこの綴りをサブコマンド名に使う
  アプリを事実上締め出す。cobra の `__complete` と同水準の理論リスクだが、予約の事実は
  ABI DR に明記が要る (lint / definition-error にするかは ux 層設計の判断)
- **bash の説明表示品質**: 列フォーマット擬似表示は端末幅・マルチバイトで崩れやすい。
  v1 で bash は説明省略に倒す選択肢を glue テンプレの裁量に残す (応答には常に説明列が
  あり、使うかは翻訳側 — policy と翻訳の分離 (§4.1) がこの判断を局所化する)
- **形態 B の def パス焼き込み陳腐化** (§2.2): 補完が「候補が出ない」形で黙って壊れる
- **prefix 絞りの word 消費** (§3.3) は将来 `word_before` が core 実装された場合に
  二重絞りになる。core 実装時に生成器側を素通しへ切り替える追随が必要
- **検証の置き場**: 出力非 pin (DR-116 §6) のため、policy 適用の正しさは product test
  でしか担保されない。issue 受け入れ条件の 5 観点 (順序 / hidden / deprecated / alias /
  説明引き直し) は**行指向応答の単位** (glue でなく query 出力) で書けば shell 非依存で
  決定的にテストできる — glue 層は 3 shell 実機の煙テストに留める

## 9. GEN-Q バッチ (Q1/Q2 裁定済み、Q3'〜Q6' 再提示)

| ラベル | 質問 (1 行) | 選択肢と推し |
|---|---|---|
| GEN-Q1 | 生成器アーキテクチャ | **裁定済み a: ブリッジ型一択** (kawaz 2026-07-22。静的展開はシェルで kuu を再実装する複雑さになる) |
| GEN-Q2 | v1 対象 shell | **裁定済み a: zsh / bash / fish** (kawaz 2026-07-22) |
| GEN-Q3' | 生成側インターフェースの標準形 | **a: 形態 A = `<prog> completion <shell>` (cobra 定石、shell は positional) を多言語共通推奨とし、形態 B = `kuu completion generate <def.json> --shell <s> [--program-name]` はその def.json 外部指定形、を推す** — DR-060 §5 層 4 の `source <(app completion bash)` が既にこの形を仮定しており、B のために独自形を発明しない (§2)。b: アプリ側の形は各言語 ux 層の完全裁量 (多言語共通推奨を置かない) |
| GEN-Q4' | query 口の方式と契約 | **a: 予約サブコマンド型 `<prog> __kuu_complete --shell <s> --cword <N> -- <word...>` (words 全量 + cword 渡しで cobra と違い args_after を捨てない) + 行指向応答 (タブ区切り候補行 + directive 行、JSON にしない — glue は jq を持たない)、隠し表示だが docs 公開でデバッグ可能、を推す** — DR-111 §5 の runtime 問い合わせ ABI 座席の実体化 (§3)。b: env var 起動型 (clap `COMPLETE=zsh prog` 系 — argv 非汚染だが main 冒頭 interception の規約が全言語に波及し、契約 unstable 運用が前提になる) |
| GEN-Q5' | custom completer (アプリ登録の動的補完関数) が実行できない場合の縮退 | **a: 形態 A では問題自体が不存在 (バイナリ内で実クロージャを実行、返却順 = 確定順)。形態 B (kuu-cli、def.json にクロージャ無し) に限り「候補提供なし + validate 面で要求 capability を機械可読報告」、files への fallback はしない、を推す** — branch 名の席にファイル名を出すのは型違いのノイズで無より悪い、capability 報告は DR-109 柱 3 と同じ線 (§6)。b: 形態 B で files へ fallback |
| GEN-Q6' | 契約と実装の置き場所 (3 層) | **a: query ABI + `completion <shell>` 推奨 = spec 側の ABI DR (非 conformance、fixture / schema 増分ゼロは維持 — DR-115 §1.3 の概念シグネチャ前例。DR-111 §5 の io_type 軸は先送り明記で座席維持) / glue script テンプレ = 契約付属の言語間共有資産 (正本 1 箇所、各言語は埋め込むだけ) / 生成器実装 = 各言語 ux 層 (一番手 MoonBit、座席は ux 層設計と同時に確定 — 初版の kuu-cli lib 固定は撤回)、を推す** — 契約は多言語で統一されて初めて価値があり、kuu-cli docs 正本では各言語が従う根拠が弱い (§5)。b: 契約も kuu-cli docs 正本 (DR-0001 §4 の延長) / c: glue テンプレも各言語が個別に持つ |

## 関連

- `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (発題 issue)
- DR-116 (生成器の既定 policy — 本 findings が実装形を与える対象)
- DR-060 §1〜§5 (complete 意味論・素材とポリシーの分離・completer 名前参照・責務 4 層 — 層 3/4 がセルフバイナリの絵の出所)
- DR-104 (candidate wire・6 フィールド identity・word_before/word_after の v1 予約)
- DR-111 §5 (completer descriptor — io_type は runtime 問い合わせ ABI 確定待ちの座席 = §3.1 の予定地)
- DR-109 §1 柱 3 (capability 報告) / 柱 6 (runtime 問い合わせ第一候補) / 柱 7 (MoonBit 一番手・kuu-cli dogfooding)
- DR-113 §4.4/§8/§9 (help model の順序保存・help_query capability)
- DR-115 §1.3/§6/§7 (概念シグネチャを DR に置き fixture 非 pin の前例・出力非 pin)
- `docs/findings/2026-07-21-completion-ordering-plan.md` (§1.1 shell 別ソート実態・CORD-Q 裁定の出所)
- `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` §4 (completion 3 系統・dotnet-suggest の轍)
- `docs/VISION.md` (幻影コマンド体験と custom completer の既知の限界)
- kuu-cli: `docs/decisions/DR-0001-multi-impl-architecture.md` (マルチ実装・契約正本化の範囲)、`impl/mbt/cli/src/main/main.mbt` (現行 subcommand 流儀)、`impl/mbt/cli/src/lib/renderer.mbt` (canonical レンダラの座席前例)
- kuu.mbt: `src/kuu/front_door.mbt` (`complete` 玄関 API)
- Web 一次資料 (2026-07-22 調査): cobra completion / `__complete` プロトコル — https://cobra.dev/docs/how-to-guides/shell-completion/ 、https://github.com/spf13/cobra/blob/main/site/content/completions/_index.md (自動追加・`__complete` 呼び出し形式・タブ区切り + directive 行・手動デバッグ可) / clap_complete dynamic — https://docs.rs/clap_complete/latest/clap_complete/env/ (`COMPLETE=zsh prog` env var 起動・`_CLAP_COMPLETE_INDEX`・unstable 契約と毎起動再生成運用) / zsh compadd — https://zsh.sourceforge.io/Doc/Release/Completion-System.html
