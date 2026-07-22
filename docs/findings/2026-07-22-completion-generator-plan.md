# canonical 補完生成器 (シェル統合) の設計素材 — DR-116 実装の輪郭

> 由来: `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (DR-116 の
> 実装課題化)。DR-116 (生成器の既定 policy: 順序 = help model 参照 / 説明 = origin 引き直し /
> hidden 除外・deprecated 注記・alias 表示 / 出力非 pin) は「何を表示するか」を確定済みで、
> 本 findings は「生成器をどう建てるか」(入口語彙・query 契約・policy 適用位置・住処) の
> 設計素材を整理する。裁定ラベルは **GEN-Qn** (バッチ毎一意プレフィクス規約、CORD-Q1〜Q5 は
> 2026-07-22 裁定で消費済み)。
>
> 裁定状況 (kawaz 2026-07-22): GEN-Q1 = a (ブリッジ型)、GEN-Q2 = a (zsh/bash/fish) 確定。
> GEN-Q3' (入口標準形の推奨) 棄却 — 「入口の形はユーザの勝手。help と同じで生成フラグ
> タイプを用意して終わり」。GEN-Q4' (予約サブコマンド query 口) 棄却 — 「無限の自由度を
> 持つユーザ定義に予約綴りをうまく仕込めると考えるのが誤り。**引数には触らないのが一番
> 安全。入り口からモード切替して一切の引数解釈を奪い、橋渡しに専念する一択**」。
> 本版はこの 2 裁定を反映した確定骨格 — **生成 = help 同型 preset (定義者の自由) /
> query = env var モード切替 (定義非侵襲)** — で全体を再構成した版。

## 0. 前提の地図 (ゼロコンテキスト読者向け)

### 0.1 確定済み契約 (本 findings はどれも変更しない)

1. **complete query** (DR-060 §1/§2、DR-104): カーソル前トークン列 `args_before` (+ optional
   `args_after`) を受け、生存 partial 経路の次消費点候補を同期的な有限配列で返す。候補は
   `spelling` / `is_value` / `type` / `origin` / `term` / `meta` の 6 フィールド identity、
   比較は順序非依存 multiset。`word_before` / `word_after` (カーソル単語の前半・後半) は
   **v1 未実装のまま予約** — core はカーソル単語を消費せず、prefix 絞りは生成器側の選択
   (DR-060 §3、DR-104 §1 明確化)。
2. **責務 4 層** (DR-060 §5): 層 1 = complete API + 候補構造 (spec)、層 2 = kuu completion
   生成器 (kuu プロダクト標準提供、shell 作法を全部封じる)、層 3 = アプリ開発者 (生成器を
   definition の入口に繋ぐだけ)、層 4 = エンドユーザ (`source <(app --completions bash)`
   級の一発登録)。本 findings の主題は層 2 の実装設計と、層 3 が使う入口語彙。
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

### 0.2 裁定済みの骨格 (GEN-Q1〜Q4'、kawaz 2026-07-22)

- **ブリッジ型一択** (GEN-Q1 = a): thin glue script + binary への runtime 問い合わせ。
  静的展開型 (definition から補完 script 全体を生成) は作らない。生存経路計算 (DR-060 §1
  — greedy 面の先食い・sever・eq-split / cluster を含む評価器そのものの走査) と after
  整合フィルタ (フル `parse()`、遅延述語込み — DR-104 §5) が shell script へ静的展開
  不能。kawaz: kuu は表現力が高く、静的展開はシェルで kuu を再実装する複雑さになる
- **v1 対象 shell は zsh / bash / fish** (GEN-Q2 = a、PowerShell は追随)。順序保持不可
  (fish)・説明表示が弱い (bash)・両方可 (zsh) という能力 3 象限を初期実装で踏み、翻訳層の
  設計を最初から shell 能力差吸収の形に強制する
- **生成側入口は type preset、標準形の推奨はしない** (GEN-Q3' 棄却の帰結): 入口の形
  (long / short / env / サブコマンド) は定義者の自由。help preset (DR-113 §2) と同じく
  preset を用意して終わり。cobra の `completion <shell>` 自動追加のような形の押しつけを
  しない (§2)
- **query 口は env var モード切替、definition 非侵襲** (GEN-Q4' 棄却の帰結):
  `KUU_COMPLETE=<shellname> <binary> <words...>`。env が立っていたら kuu 組み込みアプリは
  argv の解釈を一切せず補完 query モードに入り、argv 全体がそのまま補完対象の words に
  なる。ユーザの引数定義は無限の自由度を持つため、その中に予約綴り (サブコマンドや
  option) を衝突なく仕込めるという前提自体が誤り — 引数には触らないのが一番安全 (§3)

### 0.3 消費者 2 形態 — セルフバイナリが主、kuu-cli が従

補完生成器の消費者は 2 形態あり、設計の主従を取り違えないことが本 findings の背骨になる:

- **形態 A (本命): セルフバイナリ組み込み** — kuu-core を組み込んだアプリ自身のバイナリ
  (Rust / Go / TS / MoonBit アプリ)。definition はバイナリ内 (ソースコード上の宣言)、
  custom completer はホスト言語のクロージャとして registry に実在し**実行できる**。
  script 生成も補完時の query もアプリ自身が受ける。生成入口は definition の preset
  entry (§2)、query は env var モード切替 (§3)
- **形態 B (従): kuu-cli の def.json 外部指定** — definition が外部 JSON ファイルとして
  存在する幻影コマンド体験 (VISION) とデバッガ用途。custom completer のクロージャは JSON に
  存在せず**実行できない** (VISION が明記する幻影コマンドの既知の限界)。kuu-cli 自身の
  サブコマンドとして同じ capability を def.json 外部指定で呼ぶ (§3.5 — env プロトコルは
  「definition 内蔵バイナリ」専用であり、形態 B は使わない)

### 0.4 セルフバイナリ定石の一次資料調査 (2026-07-22)

**cobra** (Go — kubectl / helm / gh の土台):

- `completion <shell>` サブコマンドを rootCmd に**自動追加** (`CompletionOptions` で
  無効化・隠し化可能)。エンドユーザは `source <(prog completion zsh)`
- 補完時は生成 script が隠しサブコマンド **`prog __complete <args...> <補完中単語>`** を
  呼ぶ。補完中単語は空でも `""` を明示的に渡す。**カーソル後のトークン (args_after 相当)
  は捨てる**
- 応答は**行指向テキスト**: 1 行 1 候補 (`候補\t説明` のタブ区切り)、最終行に
  `:<directive値>` (ShellCompDirective のビットフラグ: Error / NoSpace / NoFileComp /
  FilterFileExt / FilterDirs / KeepOrder / Default)。stderr に人間向けの directive 説明
- `__complete` は手で直接叩けてデバッグ可能。stdout への print は候補と誤解釈されるため
  debug 出力は専用ファイル (`BASH_COMP_DEBUG_FILE`) へ

**clap_complete dynamic** (Rust、`unstable-dynamic` feature — kuu の query 方式の同系):

- **env var 起動**: main 冒頭に `CompleteEnv::complete()` を仕込み、`COMPLETE=zsh prog`
  で glue script を emit (`source <(COMPLETE=zsh prog)`)。補完時は glue が
  `COMPLETE=zsh` + `_CLAP_COMPLETE_INDEX` (カーソル単語 index) + `_CLAP_IFS` を設定して
  `prog -- ${words}` を呼び、行出力を `compadd` へ流す
- argv 名前空間を汚さない。縁: stdout を complete() より先に書くと壊れる、非補完文脈の
  誤発火は panic、glue ↔ binary 契約は unstable 扱いで「shell 起動のたびに再生成する
  self-correcting 運用」を推奨
- 設計源流は Python argcomplete (env var + glue)。shell 間差 (bash が `COMP_WORDBREAKS`
  で `--flag=value` を `[--flag, =, value]` に割る等) は glue が正規化してから binary へ渡す

**共通の定石** (両者に共通、carapace / fish ネイティブとも整合):

1. script 生成と補完時 query は同一 binary の 2 つの口 (生成 = 登録時 1 回、query =
   補完のたび)
2. **query 応答は行指向テキスト** — shell glue は jq を持たない前提で awk / read /
   `compadd` に直接流せる形が必須。JSON 応答は glue 側に JSON parser 依存を強いるため
   どの系も採っていない
3. glue script には query の呼び出し形が焼き込まれる (生成時に固定)

## 1. 論点 1: アーキテクチャ — ブリッジ型一択 (裁定済み)

§0.2 参照。以降の論点はすべてブリッジ型を前提とする。

## 2. 論点 2: 生成側入口 — help preset と対称の `completion_script` preset

### 2.1 設計の背骨 — DR-113 §2 の型を踏襲する

DR-113 の help preset は「発火の意味論 (内部セル + capability への写し) だけを preset が
定め、入口の形 (long / short / env、or 合成、サブコマンド scope への配置) は定義者の
自由」という分担を確立した。生成側入口も同じ分担にする: kuu が定めるのは **`type:
"completion_script"` preset** の発火意味論だけで、`--completions zsh` にするか `-C` に
するか `APP_COMPLETION=zsh` にするか `app completion zsh` サブコマンド形にするかは
定義者の勝手。

help preset との対称表 (query 側は preset でないため対比行として併記):

| 軸 | help (DR-113) | completion 生成 (本プラン) | completion query (本プラン) |
|---|---|---|---|
| 表現形 | type preset 5 種 | type preset 1 種: `completion_script` | **preset なし** — env var モード切替 (definition 非侵襲、§3) |
| installer | help_installer (回収・植え付け・能力提供の 3 役) | completion_installer (仮名) が植え付けと能力提供を担う (回収する表示メタ語彙は無し — CORD-Q5 = a で completion_render 席は立てない) | installer 関与なし (ux 層 runtime の玄関規約) |
| 入口 | long / short / env、`or` 合成、どの scope でも | 同じ (定義者の自由) | 入口自体が argv の外 (env) |
| 値スロット | `help_category` = bool 枝 + string 枝の or | string (shell 名、必須値) | env 値 = shell 名 |
| 内部セル | `#help` 系 5 種 | `#completion_script` (string) | なし |
| on_failure 糖衣 | `help_on_failure` 既定 true | 既定 false (失敗時に script を出す需要は無い) | — |
| capability | help_query (definition + 表示要求 → model) | script 生成 capability (definition + shell + program_name → script text) | query 応答 capability (definition + words + cword + shell → 行指向応答) |
| 出力の規範性 | model = 規範 (fixture pin)、レンダラ出力 = 非規範 | script バイト列 = 非規範 (DR-116 §6) | candidates = 規範 (既存 DR-104)、応答行 = 非規範 |

help に env モード切替が無いのは非対称ではない: help は「人間が argv で要求する表示」で
argv 文法の一部が自然、query は「機械 (glue) が補完のたびに叩く口」で argv 文法の外に
居るべき、という利用者の違いの帰結。

### 2.2 `type: "completion_script"` の輪郭

- long / short / env の入口を持てる。値スロットは shell 名 (string、必須値 — shell 名
  なしで script は出せないため、`help_category` のような bool 枝は持たない)
- 内部セルは `#completion_script` (string)。発火時に shell 名文字列を供給する
- shell 名の値域は spec では閉じない — 対応 shell 集合は生成器実装 (product) の関心で、
  builtin completer 名の閉集合を確定しなかった DR-111 §6 と同じ線。未対応 shell 名は
  script 生成 capability の実行時エラー (定義者は `values` で自主的に enum 制約しても
  よい — `help_category` の `values` 制約と同型)
- `on_failure` 既定 false
- orchestration (DR-113 §2 末尾と対称): `#completion_script` が値 (shell 名) を持てば、
  ux 層 runtime は script 生成 capability を `(definition, shell, program_name)` で呼び、
  script テキストを stdout へ出して exit 0 (DR-115 §6.4 の exit class ガイドラインと
  同水準の推奨)。program_name は definition ルートの name があれば既定、呼び出し側で
  上書き供給可 (DR-113 §4.4 の program_name 供給と同型)

定義例 (入口の形が定義者ごとに違う 3 例):

```json
{"options": [{"name": "completions", "long": true, "type": "completion_script"}]}
```

```json
{"options": [{"name": "completion-script", "env": "APP_COMPLETION", "type": "completion_script"}]}
```

```json
{"commands": [{"name": "completion",
  "positionals": [{"name": "shell", "type": "completion_script"}]}]}
```

3 例目がサブコマンド形 (`app completion zsh`) — cobra の絵は preset の一構成として
定義者が選べば得られる。positional 入口を help preset が持てるかは DR-113 §2 に明記が
無い (long / short / env のみ列挙) ため、completion preset で positional 入口を許すかは
ABI DR で help 側と揃えて確定する (サブコマンド形の実需があるのは completion 側 —
対称を破って completion のみ許すか、help も含めて許すかの整理が要る。GEN-Q3'' の
付帯論点)。

### 2.3 script 生成 capability が script へ焼き込むもの

query 呼び出し形は env プロトコル (§3) で **definition 非依存に固定**されているため、
焼き込みは最小になる (3 版目まで存在した「definition 内の query 入口綴りの解決と
焼き込み」「query 入口不在の生成時エラー」は env 化で丸ごと消えた):

1. **問い合わせ先 binary** — 生成時の自身。絶対パス解決か素の名前かは glue テンプレの
   関心
2. **補完対象コマンド名** (shell の補完登録 `compdef` / `complete -F` が要求) —
   program_name (§2.2)

## 3. 論点 3: query 契約 — `KUU_COMPLETE` env var モード切替

### 3.1 確定形 (kawaz 裁定 2026-07-22)

```
KUU_COMPLETE=<shellname> <binary> <words...>
```

- env var `KUU_COMPLETE` が立っていたら、kuu 組み込みアプリは **argv の解釈を一切せず**
  補完 query モードに入る (clap_complete dynamic の `COMPLETE=zsh prog` と同系)
- **argv 全体がそのまま補完対象の words になる** — 定義側の argv 文法と補完機械口が
  完全に分離し、予約綴りの衝突が原理的に存在しない
- env 値に shell 名を入れるのは「boolean にしても 1 に意味が無いから、ついでに shell 名を
  入れた」程度の選択 (kawaz)。`KUU_COMPLETE=1` + 第一引数で shell 名を渡す方式も成立
  するが、env 値 = shell 名なら words が純粋に補完対象 argv だけになり glue テンプレも
  1 変数注入で済むため、本 findings は env 値 = shell 名で書く (本質分岐ではないので
  裁定 Q にはしない)

モード切替は **ux 層 runtime の玄関 (parse 呼び出しの入口) が argv 解釈前に判定する**
規約になる。clap は `CompleteEnv::complete()` の手動仕込みをアプリ開発者に課すが、kuu は
ux 層が玄関 API (definition + argv → outcome) を持つため、玄関内部で判定でき、アプリ
開発者に追加の仕込みは要らない — clap の「main 冒頭に書き忘れる」縁は ux 層設計で
吸収できる (各言語 ux 層 API の関心)。

### 3.2 cword (カーソル位置) の受け方 — `KUU_COMPLETE_INDEX` env を推す

行中間補完で args_after (カーソル後のトークン列) を after 整合フィルタ (DR-060 §2、
全解決モデルならではの精度) に使うには、words 全量に加えて**カーソル単語の位置**が要る。
先行 2 系の比較:

- **cobra 方式 (argv 末尾 = カーソル)**: `__complete <args...> <補完中単語>` — カーソル
  以降を渡さない前提の形であり、args_after が原理的に運べない。kuu がこれを採ると
  after 整合フィルタを捨てることになる — 不採用
- **clap 方式 (index を別 env)**: `_CLAP_COMPLETE_INDEX` + argv は words 全量。args_after
  が自然に運べる

**`KUU_COMPLETE_INDEX=<N>` (0-origin、words 内のカーソル単語 index) を推す**。argv 内に
`--cword N` 等の制御トークンを混ぜる案は「argv 全体が words」という確定形の純度を壊す
ため採らない。省略時は行末補完 (カーソル = words 末尾の次、args_after 空) とみなす —
glue は常に INDEX を付けるが、手で叩くデバッグ時に省略できる縁を残す。

glue 側の index 供給素材は 3 shell とも存在する: bash `COMP_CWORD` / zsh `CURRENT`
(1-origin、変換要) / fish `commandline -C` 系から算出 (Web 調査由来・実機未検証、
実装サイクルで検証)。

binary 側の分解 (§0.1-1 の complete API への写像):

- `words[0..cword]` → `args_before` (words 先頭のコマンド名トークンを含むか等の細部は
  ABI DR で確定 — glue が `$words[1]` 以降だけ渡すか、全量渡して binary が先頭を
  落とすかは glue テンプレと対で決める)
- `words[cword]` → カーソル単語 (word)。core の complete には渡さず (DR-104 §1:
  `word_before` は v1 未実装予約)、binary 内の**生成器 policy 段の prefix 絞り**
  (DR-060 §3 が生成器側の選択とした絞り込み) で消費する。将来 core が `word_before` を
  実装した場合は生成器側の絞りを素通しへ切り替える (本段落が申し送りの grep 先)
- `words[cword+1..]` → `args_after`

shell 間差の正規化 (bash の `COMP_WORDBREAKS` が `--flag=value` を `[--flag, =, value]`
へ割る等) は glue 側で吸収してから渡す (clap / argcomplete と同じ分担)。

### 3.3 応答 — 行指向テキスト (stdout)

```
--port	listen port
--color=	output color mode	nospace
:keep_order
:shell_action files
```

- 1 行 1 候補、タブ区切り (`挿入文字列\t説明[\t候補フラグ]`)。**DR-116 §2/§3 の順序
  規則を適用済みの順序付き列** (multiset 非規範の wire candidates と違い、応答の行順が
  意味を持つ)。説明は origin 引き直し済み・hidden 除外済み・deprecated / alias 注記込み。
  `nospace` は candidate の `term: "cont"` の翻訳 (空白挿入が解釈を破壊する制約 —
  DR-104 §2 明確化 (e)。cobra の directive は応答全体に一律だが、kuu は per-candidate の
  term を持つので候補フラグ列で運ぶ)
- `:` prefix 行は応答全体への指示 (cobra directive 行の一般化): `keep_order` (順序保持
  手段のある shell で `compadd -V` / `nosort` へ翻訳)、`shell_action files` (値位置候補の
  builtin completer を shell 既存機能へ委譲する指示 — DR-060 §4 のマップは glue テンプレ
  が持つ)
- JSON にしない理由 (§0.4 定石 2): shell glue は jq を持たない前提で awk / read /
  `compadd` に直接流せる形が必須。JSON が要る machine 消費者には素材 API (`kuu
  complete`、DR-104 wire) が既にある
- 行フォーマットの列構成・フラグ語彙・directive 語彙・エスケープ (説明内のタブ・改行)
  は ABI DR で規定する

**既存 `kuu complete` (素材 API) との関係**: 素の DR-104 wire candidates を JSON で emit
する現行 subcommand はそのまま残す。query 応答は「policy 適用済み・行指向・shell glue
専用」で位相が違い、同じ口に混ぜると素材とポリシーの分離 (DR-060 §3) を CLI 面で崩す
ため別口とする。

### 3.4 env プロトコルの縁 (clap の轍から引き継ぐ注意点)

- **stdout 純度**: query モードの stdout に他の出力 (アプリ起動ログ等) が混ざると glue
  が候補と誤解釈する。kuu は玄関判定 (§3.1) がアプリコード実行前に走るため clap の
  「complete() より先に stdout を書くと壊れる」縁は構造的に出にくいが、ux 層 docs に
  明記する。glue テンプレ側の防御 (directive 行以外の不正行を無視する等) も検討余地
- **子プロセスへの env 伝播**: glue は query 呼び出しにだけ env を付ける
  (`KUU_COMPLETE=zsh "$prog" ...` の一時指定) ので shell セッションへの残留は無いが、
  query モード中のアプリが子プロセスとして別の kuu アプリを起動すると誤発火し得る。
  query モードに入った時点で自 process 環境から `KUU_COMPLETE` / `KUU_COMPLETE_INDEX`
  を除去する (unset) のを ux 層実装の推奨規約にする
- **非補完文脈での誤発火**: ユーザが誤って `KUU_COMPLETE=zsh app run ...` と実行すると
  アプリは run せず補完応答を出す。clap は panic するが、kuu では「これは仕様」(env が
  立っている = 補完 query の明示要求) と整理し、エラーでなく通常の query 応答を返す —
  手で叩けるデバッグ口 (cobra `__complete` の利点) を env 方式でも保つ意図。env 名が
  `KUU_` prefix で衝突しにくいこと、値に shell 名を要求することが誤発火の実質的なガード

### 3.5 形態 B (kuu-cli) — env プロトコルは使わず、正規サブコマンドで capability を露出

env プロトコルの words は「definition 内蔵バイナリの argv」を前提とするため、
**def.json パスを渡す席が無い** — 形態 B (definition が外部ファイル) には構造的に
適合しない。kuu-cli は「definition を外部から受けるアプリ」なので、kuu-cli 自身の
正規サブコマンドとして query 応答 capability を露出する:

```
kuu completion generate <def.json> --shell <s> [--program-name <name>]     # script 生成 capability
kuu completion query <def.json> --shell <s> [--cword <N>] -- <words...>    # query 応答 capability
```

- 幻影コマンド用の glue script には `kuu completion query /path/def.json --shell zsh
  --cword $N -- $words` 形の呼び出しが焼き込まれる。glue テンプレにとって query 呼び出し
  形は元々テンプレ変数 (形態 A = `KUU_COMPLETE=zsh $prog`、形態 B = 上記) であり、glue の
  固定依存は応答行形式 (§3.3) だけ — テンプレは両形態で共有できる
- `kuu help <def.json>` が def.json 内の help entry の有無に関わらず help_query
  capability を呼べるのと同じ関係で、def.json 側の completion preset entry の有無に
  関わらず動く
- def.json 絶対パスが glue に焼き込まれるため、def を動かすと補完が「候補が出ない」形で
  黙って壊れる (形態 B 固有のリスク。shell 補完面にエラーを出す手段は乏しく、script 内
  コメントに再生成手順を焼き込む程度の緩和しかない)

## 4. 論点 4: DR-116 policy の適用位置 — binary 内 1 箇所、glue は翻訳のみ

### 4.1 原則

DR-116 の policy (help model 順整列 / origin 説明引き直し / hidden 除外 / deprecated・
alias 注記) は**全て binary 側の query 応答組立段 (capability 内部) で適用する**。glue
script 側でやると shell 数ぶん policy 実装が複製され、shell 間 drift の温床になる。
glue に残る仕事は (1) words / cword の収集と正規化・転送、(2) 応答行と directive の
shell 機構への翻訳、の 2 つだけ。この分担は形態 A / B で完全に共通 (binary が誰か、
が違うだけ)。

### 4.2 binary 内の処理段 (query 応答 capability のパイプライン)

```
words, cword
  → 分解 (args_before / word / args_after)               … §3.2
  → complete(ast, args_before, args_after)              … 素材 (DR-104 candidates)
  → help_query capability 呼び出し                      … DR-113 §8 適用済み順序 + help 素材
  → custom completer 実行 (形態 A のみ、値位置候補の名前解決)  … 供給順 = 確定順 (DR-116 §3)
  → policy 段:
      hidden 除外 (meta.hidden)                         … DR-116 §5
      word による prefix 絞り                            … DR-060 §3 (生成器側の選択)
      origin → help model entry 突き合わせで整列          … DR-116 §2
      説明引き直し + alias / deprecated 注記             … DR-116 §4/§5
      builtin completer 名 → shell_action 翻訳           … DR-060 §4
  → 行指向応答 emit                                      … §3.3
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
| words / cword 素材 | words / CURRENT | `COMP_WORDS` / `COMP_CWORD` (wordbreaks 再結合が必要) | `commandline -o` / `commandline -C` 系 |

表の各セルは Web 調査由来 (実機未検証)。生成器実装サイクルで 3 shell の実機マトリクス
検証を行い、結果は実装リポ側 findings に記録する。

## 5. 論点 5: 住処と正本 — ABI DR (spec) / glue テンプレ共有 / ux 層実装

### 5.1 3 層の分担

1. **ABI DR (spec 側の新 DR)**: (a) `completion_script` preset の canonical 展開 (入口・
   値構造・内部セル・on_failure 既定 false・orchestration)、(b) env プロトコル
   (`KUU_COMPLETE` / `KUU_COMPLETE_INDEX` の意味論、玄関判定がargv 解釈に先行すること、
   unset 推奨)、(c) 応答行文法 (タブ区切り・候補フラグ・directive 語彙・エスケープ)、
   (d) 2 capability の概念シグネチャ (DR-115 §1.3 の「概念シグネチャを DR に置き fixture
   では検証しない」前例の形)。**DR-111 §5 の io_type 軸**はこの ABI DR が埋めるか先送りを
   明記するかを確定する (custom completer 実行はホスト言語クロージャの直呼びで io_type
   宣言なしでも動くため、descriptor 機械可読化 (VISION §4 実装生成) が要るまで先送りが
   最小 — 先送りするなら座席維持を ABI DR に明記)
2. **glue script テンプレ + 翻訳表**: 契約 (1) にだけ依存する言語非依存資産 (query
   呼び出し形はテンプレ変数 — §3.5)。各言語実装がそれぞれ手書きすると shell × 言語の
   マトリクスで drift するため、正本 1 箇所で言語間共有する (置き場所の具体 — spec リポ内
   `templates/` か別配布か — は実装着手時の判断)
3. **capability 実装 (パイプライン §4.2 + script 生成 + 玄関の env 判定)**: 各言語 ux 層。
   一番手は MoonBit (DR-109 柱 7)、kuu-cli (形態 B) がその最初の消費者。MoonBit 実装の
   座席 (kuu.mbt の ux 層パッケージか kuu-cli lib か) は MoonBit ux 層の座席設計と同時に
   確定する — help_installer / help_query が kuu.mbt に住み canonical レンダラが kuu-cli
   に住んだ前例に照らすと、**installer / capability (= preset と env モードの意味論) は
   kuu.mbt、行指向応答の組版と glue テンプレ埋めは product 側**という分割線が自然だが、
   確定は ux 設計へ送る

### 5.2 spec conformance への増分 — 「ゼロ」ではなくなる (統括への申し送り)

DR-116 §6 の「spec conformance への増分はゼロ」は「**DR-116 の policy 採用だけを理由と
する**増分は無い」の意味であり、preset 化 (GEN-Q3' 裁定) は**新しい裁定による正当な
増分**を生む:

- **増える**: schema の type 値 `completion_script` の受理、preset の lowering (canonical
  展開)、definition-error (座席違い・値スロット不正等)、内部セルの観測。fixture は
  definition-error / lowering profile への追加が見込まれる。query 側は env 切替 (GEN-Q4'
  裁定) により definition 非侵襲となったため、**query 由来の schema 増分はゼロ** (env
  プロトコル自体は wire 語彙でなく runtime 挙動の規範 — fixture pin の対象外、DR-115
  §1.3 の概念シグネチャと同じ位相)
- **増えないまま**: script のバイト列・応答行の内容・候補順・説明文言 (DR-116 §6 の
  出力非 pin は不変)。complete query の契約 (DR-104) も不変

発題 issue の受け入れ条件「spec schema / fixtures / conformance profile への変更が発生
していないことを確認する」は、この裁定を反映して**更新が必要**。

## 6. 論点 6: custom completer の実行 — 形態で分かれる

ゼロコンテキスト向けの状況説明: definition の値位置には `completer: "<名前>"` (例:
`completer: "branches"`) という**名前参照**が書ける (DR-060 §4)。名前の指す実体は
2 種類ある — (i) **builtin completer** (files / dirs / path 等): どの環境にもある一般
補完で、実装は「shell の成熟した補完機構に委譲せよ」という指示 (§3.3 の `shell_action`
directive) に翻訳される (自前でファイル列挙しない)。(ii) **custom completer**: アプリが
registry に登録するホスト言語関数 (例: `branches` = `git branch` を叩いて枝名を返す
クロージャ)。

補完時の扱いは形態で決定的に違う:

- **形態 A (セルフバイナリ)**: query を受けるのはアプリ自身であり、registry に custom
  completer の**実クロージャが居るのでそのまま実行できる** (§4.2 パイプラインの
  completer 実行段)。返却順 = 確定順 (DR-116 §3)。「未知の completer 名」は補完時の
  問題ではなく定義時の問題 (registry 未登録の名前参照 — export 時の未解決フック検出、
  DR-109 柱 3 の $required 系の関心) に還元される
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

- **既存決定・裁定の追認** (新規裁定なし): ブリッジ経路 (GEN-Q1 = a) / 生成 = preset・
  query = env モード切替の骨格 (GEN-Q3'/Q4' 裁定の帰結) / policy の中身 (DR-116 §2〜§5) /
  素材とポリシーの分離 (DR-060 §3) / builtin completer の shell 機能委譲 (DR-060 §4) /
  出力非 pin (DR-116 §6) / preset パターンの型 (DR-113 §2)
- **本 findings の発明 (GEN-Q 裁定対象または ABI DR 確定事項)**: (1) `completion_script`
  preset の canonical 展開の輪郭 (§2.2)、(2) `KUU_COMPLETE_INDEX` による cword 供給と
  省略時の行末補完既定 (§3.2)、(3) 行指向応答の行文法 (タブ区切り + `:` directive 行、
  per-candidate nospace) (§3.3)、(4) env プロトコルの縁対策 (unset 規約・誤発火 = 仕様と
  する整理) (§3.4)、(5) 形態 B は env でなく正規サブコマンドで capability 露出 (§3.5)、
  (6) word の消費位置 = 生成器 prefix 絞り段 (§3.2)、(7) 置き場所 3 層と conformance
  増分の再整理 (§5)、(8) 形態 B の custom completer 縮退規則 (§6)
- **規範化しないもの**: script のバイト列・応答の説明文言・shell 翻訳の細部・各言語
  ux 層の生成器関数シグネチャ・対応 shell 集合 (spec で閉じない)

## 8. リスク・悪い面

- **conformance 増分の発生** (§5.2): preset 化は「実装課題だけ、spec 静穏」だった本 issue
  を spec 改訂 (ABI DR + schema + fixture) に格上げする。v1 スコープへの影響 (5 profile
  green 条件に completion_script の lowering / definition-error が乗るか) は ABI DR 起草
  時に統括判断が要る。ただし query 側の env 化で増分は preset 1 種に縮んだ (3 版目
  構想比で半減)
- **env プロトコルの ux 層規約依存**: 「玄関で KUU_COMPLETE を判定して argv 解釈を
  奪う」は全言語 ux 層が正しく実装して初めて成立する規約 (spec fixture では観測しに
  くい runtime 挙動)。ux 層 conformance の検証手段 (product test の共通シナリオ集等) を
  ABI DR の波及に書く必要がある
- **ABI 固定部分の改訂コスト**: 行文法・directive 語彙・env 名の変更は DR 改訂になる。
  glue テンプレを言語間共有 (§5.1) にして「契約と glue が同じ場所で一緒に改訂される」
  構図にして変更コストを抑えるが、野良 glue (ユーザ手書き) との互換は将来の破壊変更で
  切れ得る
- **bash の説明表示品質**: 列フォーマット擬似表示は端末幅・マルチバイトで崩れやすい。
  bash は説明省略に倒す選択肢を glue テンプレの裁量に残す (応答には常に説明列があり、
  使うかは翻訳側 — policy と翻訳の分離 (§4.1) がこの判断を局所化する)
- **形態 B の def パス焼き込み陳腐化** (§3.5): 補完が「候補が出ない」形で黙って壊れる
- **prefix 絞りの word 消費** (§3.2): 将来 `word_before` が core 実装された場合に二重
  絞りになる。core 実装時に生成器側を素通しへ切り替える追随が必要
- **検証の置き場**: 出力非 pin のため policy 適用の正しさは product test でしか担保され
  ない。issue 受け入れ条件の 5 観点 (順序 / hidden / deprecated / alias / 説明引き直し)
  は**行指向応答の単位** (glue でなく query 応答 capability の出力) で書けば shell
  非依存で決定的にテストできる — glue 層は 3 shell 実機の煙テストに留める

## 9. GEN-Q バッチ (Q1/Q2 裁定済み、Q3''/Q5''/Q6'' 提示、Q4 系は骨格確定につき細部 1 問のみ)

| ラベル | 質問 (1 行) | 選択肢と推し |
|---|---|---|
| GEN-Q1 | 生成器アーキテクチャ | **裁定済み a: ブリッジ型一択** (kawaz 2026-07-22) |
| GEN-Q2 | v1 対象 shell | **裁定済み a: zsh / bash / fish** (kawaz 2026-07-22) |
| GEN-Q3'' | 生成側入口の preset 形 | **a: `type: "completion_script"` — shell 名を必須値に取る string preset (bool 枝なし)、shell 名の値域は spec で閉じない (未対応は capability 実行時エラー、DR-111 §6 と同じ線)、`on_failure` 既定 false、入口は定義者の自由、を推す** — DR-113 §2 の help preset と対称の最小形 (§2.2)。付帯: positional 入口 (サブコマンド形 `app completion zsh` の直接表現) を許すかは help preset と揃えて ABI DR で確定。b: shell 名を optional にし bool 枝で $SHELL 推定 (発明が増えるだけ、glue 登録文脈では shell 名は常に既知) |
| GEN-Q4''' | cword (カーソル位置) の受け方 | **a: `KUU_COMPLETE_INDEX=<N>` (0-origin) の別 env、省略時は行末補完扱い、を推す** — argv 内に制御トークンを混ぜると「argv 全体が words」の純度が壊れる、cobra の末尾単語方式は args_after (after 整合フィルタ、kuu 固有の精度) が原理的に運べない、clap `_CLAP_COMPLETE_INDEX` と同型で 3 shell とも index 素材あり (§3.2)。b: cobra 型「words はカーソルまで + 末尾 = 編集中単語」(args_after を捨てる) |
| GEN-Q5'' | custom completer が実行できない場合の縮退 | **a: 形態 A では問題自体が不存在 (バイナリ内で実クロージャを実行、返却順 = 確定順)。形態 B (kuu-cli、def.json にクロージャ無し) に限り「候補提供なし + validate 面で要求 capability を機械可読報告」、files への fallback はしない、を推す** — 型違い候補は無より悪い、capability 報告は DR-109 柱 3 と同じ線 (§6)。b: 形態 B で files へ fallback |
| GEN-Q6'' | 正本と実装の置き場所 | **a: preset 語彙 + env プロトコル + 応答行文法 + capability 概念シグネチャ = spec の新 ABI DR (DR-113 対称。DR-111 §5 の io_type 軸は先送り明記で座席維持) / glue テンプレ = 言語非依存の共有資産 (正本 1 箇所、query 呼び出し形はテンプレ変数で形態 A/B 共有) / capability 実装 = 各言語 ux 層 (一番手 MoonBit、座席は ux 設計と同時確定)、を推す** — preset 化により wire 語彙が spec 第一級になり正本は必然的に spec DR (§5.1)。**付帯 (要確認): conformance 増分ゼロではなくなる (schema type 1 種 + lowering / definition-error fixture、§5.2) — 発題 issue の受け入れ条件更新が必要**。b: preset 語彙だけ spec、env プロトコル・応答行文法は product docs (glue テンプレの依存先が割れて共有が壊れる) |

## 関連

- `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (発題 issue —
  §5.2 の conformance 増分により受け入れ条件の更新が必要)
- DR-116 (生成器の既定 policy — 本 findings が実装形を与える対象)
- DR-113 §1/§2/§3 (help_installer 3 役・5 preset の canonical 展開・or 合成と default_fn —
  **生成側 preset が対称の型として踏襲する precedent**) / §4.4/§8/§9 (model の順序保存・help_query)
- DR-060 §1〜§5 (complete 意味論・素材とポリシーの分離・completer 名前参照・責務 4 層)
- DR-104 (candidate wire・6 フィールド identity・word_before/word_after の v1 予約)
- DR-111 §5/§6 (completer descriptor — io_type は ABI 確定待ちの座席 / builtin 名の閉集合を確定しない前例)
- DR-109 §1 柱 3 (capability 報告) / 柱 6 (runtime 問い合わせ第一候補) / 柱 7 (MoonBit 一番手)
- DR-114 (cell_fns — preset 発火の供給機構)
- DR-115 §1.3/§6 (概念シグネチャを DR に置き fixture 非 pin の前例・出力非 pin・exit class)
- `docs/findings/2026-07-21-completion-ordering-plan.md` (§1.1 shell 別ソート実態・CORD-Q 裁定の出所)
- `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` §4 (completion 3 系統・dotnet-suggest の轍)
- `docs/VISION.md` (幻影コマンド体験と custom completer の既知の限界)
- kuu-cli: `docs/decisions/DR-0001-multi-impl-architecture.md`、`impl/mbt/cli/src/main/main.mbt` (現行 subcommand 流儀)、`impl/mbt/cli/src/lib/renderer.mbt` (canonical レンダラの座席前例)
- kuu.mbt: `src/kuu/front_door.mbt` (`complete` 玄関 API)
- Web 一次資料 (2026-07-22 調査): cobra completion / `__complete` プロトコル — https://cobra.dev/docs/how-to-guides/shell-completion/ 、https://github.com/spf13/cobra/blob/main/site/content/completions/_index.md (自動追加・`__complete` 呼び出し形式・タブ区切り + directive 行・手動デバッグ可) / clap_complete dynamic — https://docs.rs/clap_complete/latest/clap_complete/env/ (`COMPLETE=zsh prog` env var 起動・`_CLAP_COMPLETE_INDEX`・unstable 契約と毎起動再生成運用) / zsh compadd — https://zsh.sourceforge.io/Doc/Release/Completion-System.html
