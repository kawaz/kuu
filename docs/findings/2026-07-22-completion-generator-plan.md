# canonical 補完生成器 (シェル統合) の設計素材 — DR-116 実装の輪郭

> 由来: `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (DR-116 の
> 実装課題化)。DR-116 (生成器の既定 policy: 順序 = help model 参照 / 説明 = origin 引き直し /
> hidden 除外・deprecated 注記・alias 表示 / 出力非 pin) は「何を表示するか」を確定済みで、
> 本 findings は「生成器をどう建てるか」(アーキテクチャ・CLI 形・ブリッジ契約・policy 適用
> 位置・住処) の設計素材を整理する。裁定ラベルは **GEN-Qn** (バッチ毎一意プレフィクス規約、
> CORD-Q1〜Q5 は 2026-07-22 裁定で消費済み)。

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
   (completion サブコマンドに生成器を繋ぐだけ)、層 4 = エンドユーザ (`source <(app
   completion bash)` するだけ)。本 findings の主題は**層 2 の実装設計**。
3. **生成器の既定 policy** (DR-116): definition 由来候補は DR-113 §8 適用済みの help model
   順 / completer 由来候補は供給順確定 / 説明は candidate 同梱でなく `origin` から help
   model・definition を引き直す / hidden 除外・deprecated 注記・alias 表示。出力 (script・
   候補順・説明文字列) は fixture pin しない (DR-115 §6.2 と同型)。
4. **completer は名前参照** (DR-060 §4、DR-111 §5): 標準 completer (files / dirs / path 等)
   は生成器が shell 既存機能 (`_files` / `compgen -f` / fish 組み込み) へマップする。
   アプリ固有 completer の実行入力契約 (io_type) は runtime 問い合わせ ABI の確定待ちで、
   descriptor 側は座席だけ空けてある (DR-111 §5)。
5. **配布方向** (DR-109 §1 柱 6): completion 配布は「生成器標準提供 + runtime 問い合わせが
   第一候補」。dotnet-suggest の bootstrap 摩擦 (外部共通 engine 方式) を轍とする。
6. **shell 側の現実** (`docs/findings/2026-07-21-completion-ordering-plan.md` §1.1、Web 調査・
   実機未検証): 供給順保持は zsh `compadd -V` / bash `compopt -o nosort` (4.4+) で可能、
   fish は不可。説明表示は zsh (`_describe` / `compadd -d`)・fish (`候補\t説明` ネイティブ)
   が得意、bash は候補文字列しか持てず cobra V2 は列フォーマット加工で擬似表示する。

### 0.2 実装側の現況

- **kuu-cli** (`github.com/kawaz/kuu-cli`、ローカル `~/.local/share/repos/github.com/kawaz/kuu-cli/main`):
  マルチ実装リポ (DR-0001)。PoC は `impl/mbt` (MoonBit、kuu.mbt を workspace 流用)。
  現行サブコマンドは `parse` / `complete` / `validate` / `help`。`kuu complete <def.json>
  --args-before <json-array> [--args-after <json-array>]` は **DR-104 wire candidates を
  素材のまま** stdout に JSON emit する (policy 未適用)。stdout = machine JSON /
  stderr = human text の分離が確立済み。
- **canonical help レンダラの前例** (最重要の座席前例): DR-115 の canonical レンダラは
  kuu.mbt でなく **kuu-cli 側** (`impl/mbt/cli/src/lib/renderer.mbt`) に実装された。
  kuu.mbt (spec 参照実装) は help model (素材) までを供給し、非規範の表示 policy は
  product 側が住処になる、という分担の実績。補完生成器も同じ構図に載る (論点 5)。
- **kuu.mbt の供給 API**: `@kuu.complete(ast, args_before, args_after?)` (front_door.mbt)、
  help_query capability (DR-113 §9 経由、kuu-cli の `run_help` が既に呼んでいる)、
  definition 本体。生成器が必要とする素材は**全て既存 API で届く**。

## 1. 論点 1: アーキテクチャ — ブリッジ型 vs 静的展開型

### 1.1 案の空間

生態系は 3 系統 (`docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` §4): 静的 script
生成 (picocli / clap AOT) / thin shim → 同一 binary へ runtime 問い合わせ (cobra
`__complete` / Click / clap dynamic) / 外部共通 engine (dotnet-suggest / carapace)。
外部共通 engine は DR-109 柱 6 が bootstrap 摩擦を轍として既に退けているので、比較は
前 2 者。

**案 a: ブリッジ型 (thin script + runtime 問い合わせ) — cobra `__complete` と同系**

生成 script は「shell の補完文脈 (words / cword) を集めて binary の補完問い合わせ
subcommand を呼び、応答行を shell の表示機構へ流す」だけの薄い層。候補計算・policy
適用は全部 binary 内。

**案 b: 静的展開型 (definition から補完 script 全体を生成)**

definition を読んで各 scope の候補を shell script の case 分岐等に静的展開する。
補完時に binary を呼ばない。

### 1.2 評価 — ブリッジ型が構造的に必然

静的展開型は kuu の意味論に対して**原理的に表現力不足**であり、劣化版としてしか
成立しない:

- **生存経路計算が静的展開不能**: complete の候補集合は「カーソル前トークン列を消費
  できた全生存 partial 経路の和集合」(DR-060 §1) で、greedy 面の先食い・sever・
  eq-split / cluster を含む評価器そのものの走査。これを shell script に展開する =
  評価器を shell で再実装することであり、責務 4 層が「shell 作法を層 2 に封じる」
  ために避けた「shell ごとの再実装」を最悪の形で呼び戻す
- **after 整合フィルタが静的展開不能**: `args_after` 供給時の候補生存はフル `parse()`
  (遅延述語込み) の実行を要する (DR-104 §5)。行中間補完の精度は kuu の設計上の売り
  (DR-060 §2「全解決モデルならではの精度」) で、静的展開では捨てることになる
- **動的 completer が呼べない**: completer 名参照 → 実行の配線 (DR-060 §4) は実行時
  にしか解決できない
- 静的展開の利点とされる「補完時に binary 不要」は、kuu では成立しない前提 —
  幻影コマンド体験 (VISION) でも補完を叩く先の kuu-cli binary は存在するし、アプリ
  組み込みでもアプリ binary が存在する。binary 不在で script だけ残る状況は想定
  ユースケースに無い

先行実装の分布もこれを裏付ける: 動的候補と文脈依存の強い系 (cobra / clap dynamic /
Click / yargs) は全てブリッジ型で、静的展開に留まるのは定義が静的に閉じる系
(picocli の一部) だけ。**ブリッジ型 (案 a) 一択を推す**。静的・ブリッジの混成
(静的に決まる部分は展開し動的部分だけ問い合わせ) は、生存経路計算が既に静的に
決まらない以上「静的部分」がほぼ残らず、script の複雑化だけが残るので検討外とする。

なお DR-109 柱 6 の「runtime 問い合わせが第一候補」は骨子の承認であり、生成器実装の
アーキテクチャ確定はここが初出になる (発明と規範化の区別は §6)。

## 2. 論点 2: CLI インターフェース — 生成側の形

### 2.1 生成コマンドの形

kuu-cli の既存流儀は「`kuu <sub> <def.json> [options]`」(def.json が第一 positional)。
cobra 流の `prog completion zsh` (shell が positional) とは並びが違う。2 形を比較:

- **案 a: `kuu completion <def.json> --shell <zsh|bash|fish>`** — kuu-cli 内部一貫性
  (parse / complete / validate / help 全てが def.json 先頭)。shell はロングオプション
  ([cli-design-preferences] のロングオプション基本にも合う)
- **案 b: `kuu completion <shell> <def.json>`** — cobra 系ユーザの筋肉記憶に合うが、
  kuu-cli 内で completion だけ positional 並びが逆転する

案 a を推す。kuu-cli は「definition を与えて操作する」道具でありサブコマンド間の
一貫性が学習コストを決める。cobra の並びはアプリ組み込み (層 3、`app completion
bash`) の慣習であって、そちらはアプリ開発者が自分のサブコマンド体系で自由に決める
(生成器はライブラリ関数として繋がれるだけ)。

### 2.2 生成 script に焼き込むもの

ブリッジ script は補完時に問い合わせを再現できる情報を script 内に固定する必要が
ある。焼き込み対象:

1. **def.json の絶対パス** (kuu-cli 経路の場合) — 補完時に同じ definition を読む。
   パスが動くと補完が壊れるが、これは「source し直す」で解決する運用 (静的展開型でも
   definition 変更で再生成が要るのは同じ)。将来のアプリ組み込み経路 (runtime 問い合わせ
   先がアプリ binary 自身) では def パスの焼き込み自体が不要になる
2. **補完対象のコマンド名** — shell の補完登録 (`compdef` / `complete -F`) が対象
   コマンド名を要求する。definition のルート要素 name があれば既定に使い、無ければ
   供給必須 (DR-113 §4.4 の program_name 供給と同型)。上書き席として
   `--program-name <name>` を生成コマンドに置く (幻影コマンド運用では def.json 名と
   実際に叩く wrapper 名が違い得るため既定だけでは足りない)
3. **問い合わせ先 binary のパスまたは名前** — 既定は生成時の `kuu` 自身 (argv[0] の
   解決)。cobra は `$0` 相当をアプリ名に固定するが、kuu-cli 経路では補完対象コマンド
   ≠ 問い合わせ binary なので別変数になる

### 2.3 v1 の対象 shell

DR-060 §5 層 4 の体験 (`source <(app completion bash)`) を成立させる最小集合。
候補: zsh / bash / fish (+ PowerShell)。

- zsh / bash は必須 (kawaz 環境 = zsh、普及面 = bash)。順序保持・説明表示とも手段あり
  (bash の説明表示は cobra V2 型の列フォーマット擬似表示、bash < 4.4 は順序保持不可)
- fish は説明表示がネイティブで得意な一方、順序保持手段が無い (§0.1-6)。「help_order を
  書いたのに補完順に効かない」は shell 差として生成器 docs で告知する
  (`2026-07-21-completion-ordering-plan.md` §5 で既に識別済みのリスク)
- PowerShell は kawaz の運用面に無く、実機検証環境の確保コストが先行する

**zsh / bash / fish の 3 shell を v1 とし、PowerShell は追随に送る**側を推す。3 shell の
根拠は cobra / clap / carapace が最低限揃える集合との一致と、順序不可 (fish)・説明弱い
(bash)・両方可 (zsh) という**能力マトリクスの 3 象限を初期実装で踏む**こと — 翻訳層の
設計 (§4.3) が最初から shell 能力差を吸収する形に強制され、後から fish を足して設計が
壊れる事故を防ぐ。

## 3. 論点 3: ブリッジ問い合わせの契約

### 3.1 座席 — 既存 `kuu complete` とは別口が要る

既存 `kuu complete` は DR-104 wire candidates (素材) をそのまま emit する。これは
spec の観測面 (fixture と同語彙) を人間・機械へ見せる道具であり、**素材 API として
そのまま残す**。一方ブリッジが必要とするのは DR-116 policy 適用後の形 (整列済み・
説明付き・hidden 除外済み) であり、応答語彙が別物になる。同一 subcommand への
`--policy` フラグ追加は「素の素材」と「policy 適用済み」という位相の違う出力を
1 つの口に混ぜる (DR-060 §3 の素材とポリシーの分離を CLI 面で崩す) ので採らない。

新しい口は **`kuu completion` のネスト子コマンド** に置く (子・孫サブコマンドを持つ
のは [cli-design-preferences] の基本形):

```
kuu completion generate <def.json> --shell <shell> [--program-name <name>]   # script 出力 (§2)
kuu completion query    <def.json> --shell <shell> --cword <N> -- <words...>  # 補完時の問い合わせ (本節)
```

cobra の `__complete` (隠しコマンド) と違い隠さない。kuu-cli は machine 消費前提の
道具で「ユーザに見せたくない内部口」という動機が薄く、隠し口は補完 (自分自身の
dogfooding) からも見えなくなり自己矛盾する。

> 生成側を `kuu completion <def.json> --shell X` (子コマンドなし) にして query だけ
> 子に切る変形もあるが、「引数なし実行 = そのレベルの usage 表示」の一貫性
> ([cli-design-preferences]) から generate / query の対称な 2 子構成が素直。

### 3.2 入力 — shell からは raw argv 直渡し (JSON を shell に組ませない)

素材 API (`kuu complete`) の `--args-before <json-array>` は machine 消費者向けで、
shell script に JSON 配列の quoting を組ませるのは事故源 (bash / zsh / fish 3 通りの
quoting 再実装 = 層 2 が封じるべき shell 作法の漏出)。ブリッジ query は cobra と同じ
**raw argv 直渡し**にする:

- script は shell が持つ words 配列 (bash `COMP_WORDS` / zsh `words` / fish
  `commandline -o`) を `--` の後ろへそのまま渡し、カーソル位置は `--cword <N>`
  (0-origin、words 内 index) で渡す
- binary 側で `words[0..cword]` → `args_before`、`words[cword]` → カーソル単語 (word)、
  `words[cword+1..]` → `args_after` に分解する。分解ロジックが binary 内 1 箇所に
  集まり、shell 側 script は収集と転送だけになる
- カーソル単語 (word) は core の complete には渡さない (DR-104 §1: `args_before` は
  確定した完全トークンのみ、`word_before` は v1 未実装予約)。word は binary 内の
  **生成器 policy 段の prefix 絞り** (DR-060 §3 が生成器側の選択とした絞り込み) に
  使う。つまり予約席 `word_before` の「将来 core に渡す」を先取りせず、生成器層で
  消費する — core 契約は不変のまま説明責任が生成器 docs に置ける

### 3.3 応答 — policy 適用済み envelope (DR-104 wire とは別語彙)

query の応答は DR-116 §4 の「runtime 問い合わせ ABI が shell shim 向け応答へ説明を
添える場合も、binary 内でこの引き直しを行った結果を応答 envelope に載せるのであり、
candidate wire の一部にはしない」が指す envelope の実体化。輪郭:

```json
{
  "items": [
    {"insert": "--port", "display": "--port", "description": "listen port", "nospace": false},
    {"insert": "--color=", "display": "--color=", "description": "...", "nospace": true}
  ],
  "shell_actions": ["files"],
  "keep_order": true
}
```

- `items` は **DR-116 §2/§3 の順序規則を適用済みの順序付き配列** (multiset 非規範の
  wire candidates と違い、ここでは配列順が意味を持つ)。説明は origin 引き直し済み・
  hidden 除外済み・deprecated / alias 注記込み (§4)
- `nospace` は candidate の `term` (`word_end` / `cont`) の翻訳。`cont` の後の空白挿入は
  解釈を破壊する制約 (DR-104 §2 明確化 (e)) なので必須で運ぶ
- `shell_actions` は値位置候補の builtin completer 名を「shell 既存機能を呼べ」という
  指示に翻訳したもの (zsh `_files` / bash `compgen -f` / fish 組み込みへのマップは
  script 側テンプレが持つ)。cobra の ShellCompDirective (ビットフラグ) の役割を
  機械可読 JSON で持つ形
- フィールド名・形は生成器 product 契約 (kuu-cli docs で正本化、DR-0001 §4 の
  「CLI 入出力契約の正本化」の一部) であり、spec conformance には載せない (DR-116 §6)

**この envelope が将来の runtime 問い合わせ ABI (DR-111 §5 の座席) の下敷きになる**。
アプリ組み込み経路 (問い合わせ先がアプリ binary 自身、custom completer が実行できる)
の ABI 設計時に、この envelope へ completer 実行結果 (供給順 = 確定順、DR-116 §3) を
合流させる。v1 の kuu-cli 経路では custom completer は実行できない (definition JSON
だけではホスト言語クロージャが無い — VISION の幻影コマンドの限界そのもの) ので、
builtin マップ表に無い completer 名は**候補提供なし** (files への勝手なフォールバックは
しない — 型が違う候補を出すのは無より悪い) + 生成器 docs での告知とする。

## 4. 論点 4: DR-116 policy の適用位置 — binary 内 1 箇所、script は翻訳のみ

### 4.1 原則

DR-116 の policy (help model 順整列 / origin 説明引き直し / hidden 除外 / deprecated・
alias 注記) は**全て binary 側の query 応答組立段で適用する**。script 側でやると
shell 数ぶん policy 実装が複製され、shell 間 drift (ある shell だけ deprecated 注記が
無い等) の温床になる。script に残る仕事は次の 2 つだけ:

1. **収集と転送** (§3.2): words / cword を集めて query を呼ぶ
2. **shell 機構への翻訳**: 応答の `items` / `shell_actions` / `keep_order` / `nospace` を
   shell の語彙に落とす

### 4.2 binary 内の処理段 (パイプライン)

```
words, cword
  → 分解 (args_before / word / args_after)
  → @kuu.complete(ast, args_before, args_after)        … 素材 (DR-104 candidates)
  → help_query capability 呼び出し                      … DR-113 §8 適用済み順序 + help 素材
  → policy 段:
      hidden 除外 (meta.hidden)                         … DR-116 §5
      word による prefix 絞り                            … DR-060 §3 (生成器側の選択)
      origin → help model entry 突き合わせで整列          … DR-116 §2
      説明引き直し + alias / deprecated 注記             … DR-116 §4/§5
      completer 名 → shell_actions 翻訳                  … DR-060 §4
  → envelope emit
```

順序整列の突き合わせ規則 (DR-116 §2 の実装形): candidate の `origin` (canonical 要素名、
DR-104 明確化 (c)) を help model の options / commands entry の name に突き合わせる。
同一 entry 由来の複数候補 (canonical + alias、eq-split の `cont` 形等) は生成器の安定順
(素材配列の出現順) を保つ。値位置候補は由来 entry の順序に従属。匿名 exact 候補
(origin = spelling 自身、DR-104 明確化 (iii)) は help model に対応 entry を持たない —
positional 側の値なので「positional の定義順」(model は positionals を定義順で保存、
DR-113 §4.4) に従属させる。

### 4.3 shell 別翻訳表 (script テンプレの責務)

| envelope | zsh | bash | fish |
|---|---|---|---|
| items (順序) | `compadd -V` unsorted group | `compopt -o nosort` (4.4+、旧版は諦め) | 手段なし (fish がソート) |
| description | `_describe` / `compadd -d` | 列フォーマット擬似表示 (cobra V2 型) or 省略 | `候補\t説明` ネイティブ |
| nospace | `compadd -S ''` | `compopt -o nospace` | 挙動既定 (`-f` 系の制御) |
| shell_actions: files | `_files` | `compgen -f` / `-o default` | fish 組み込み (`__fish_complete_path`) |

表の各セルは Web 調査由来 (実機未検証)。生成器実装サイクルで 3 shell の実機マトリクス
検証を行い、結果は kuu-cli 側 findings に記録する (spec 側の関心ではない)。

## 5. 論点 5: 住処 — kuu-cli lib、spec / kuu.mbt 増分ゼロ

### 5.1 座席

DR-115 canonical レンダラの前例 (§0.2) と同じ分担にする:

- **kuu.mbt (spec 参照実装)**: 増分ゼロ。素材供給 API (`complete` / help_query /
  definition) は全て既存。生成器 policy は非規範 (DR-116 §6) であり、spec 参照実装に
  置くと「conformance の主語」と「product 表示品質」の責務が混濁する — レンダラを
  kuu-cli 側に置いた判断と同一線
- **kuu-cli `impl/mbt/cli/src/lib/`**: 生成器本体 (script テンプレ・policy 段・envelope
  emit)。`renderer.mbt` の隣 (例: `completion.mbt`)。他言語 impl はこの契約 (kuu-cli
  docs 正本) + spec fixtures に対して再実装する (DR-0001 §4 の織り込み済みコスト)
- **spec (kawaz/kuu)**: schema / fixtures / conformance profile 増分ゼロ (DR-116 §6 の
  維持を issue 受け入れ条件として明示確認する)。本 findings と GEN-Q 裁定の反映先も
  spec 側は DR-116 への追記 note または kuu-cli 側 DR で足りる見込み

### 5.2 core に「薄い支援 API」は要らないことの確認

policy 段が必要とする素材の存在を突き合わせた:

| policy 段の入力 | 供給元 (既存) |
|---|---|
| candidates (origin / term / meta 込み) | `@kuu.complete` (front_door.mbt) |
| DR-113 §8 適用済み順序 + help / help_long | help_query capability の help model (DR-113 §4.4 が順序保存を明記) |
| alias 注記の素材 (canonical 名) | candidate `origin` が canonical を指す (DR-104 明確化 (c)) + model の `alias_spellings` |
| deprecated / hidden | candidate `meta` (DR-104 §2) |
| completer 名 | candidate `completer` (DR-104 §2、参照実装追随済み 2026-07-15) |

全行が既存 API で埋まる。「origin → entry 突き合わせ」のような結合処理は生成器の
関心そのものであり、core へ吸い上げると DR-116 が「生成器 API や各 shell script の
具体形は生成器実装の関心」と切った線を逆流する。**core 支援 API は不要**と結論する。

## 6. 発明と規範化の区別

- **既存決定の追認** (新規裁定なし): ブリッジ経路の第一候補性 (DR-109 柱 6) / policy の
  中身 (DR-116 §2〜§5) / 素材とポリシーの分離 (DR-060 §3) / builtin completer の shell
  機能マップ (DR-060 §4) / 出力非 pin (DR-116 §6)
- **本 findings の発明 (GEN-Q 裁定対象)**: (1) ブリッジ型一択の確定と静的展開型の正式
  棄却 (§1)、(2) 生成コマンドの形と v1 shell 集合 (§2)、(3) `completion generate /
  query` の 2 子構成・raw argv 直渡し・policy 適用済み envelope という query 契約 (§3)、
  (4) word の消費位置 = 生成器 prefix 絞り段 (core の word_before 予約に触れない) (§3.2)、
  (5) custom completer 名の v1 扱い = 候補提供なし + docs 告知 (§3.3)、(6) 住処 =
  kuu-cli lib で kuu.mbt / spec 増分ゼロ (§5)
- **規範化しないもの**: script のバイト列・envelope の表示文言・shell 翻訳の細部。
  envelope のフィールド形は kuu-cli product 契約として kuu-cli docs で正本化する
  (spec conformance には載せない)

## 7. リスク・悪い面

- **envelope 契約の二重進化**: query envelope (v1、kuu-cli 経路) と将来の runtime
  問い合わせ ABI (DR-111 §5、アプリ binary 経路) が別々に育つと、completer 実行結果の
  合流時に envelope 改訂が要る。§3.3 の「下敷きにする」と明記して ABI 設計 issue へ
  申し送ることで縫合点を固定するが、v1 envelope の形が ABI 設計を事実上先取りする
  面は残る (逆に言えば、実物の運用実績を持って ABI 設計に入れる利点でもある)
- **bash の説明表示品質**: 列フォーマット擬似表示は端末幅・マルチバイトで崩れやすい。
  v1 で bash は説明省略に倒す選択肢もあり、生成器実装時の product 判断に残す
  (envelope には常に description を載せ、使うかは script テンプレの裁量 — policy と
  翻訳の分離 (§4.1) がこの判断を局所化する)
- **def.json パス焼き込みの陳腐化** (§2.2): definition を動かすと補完が黙って壊れる
  (query が def 読込失敗 → 候補なし)。エラーを補完面に出す手段は shell 側に乏しく、
  「候補が出ない」としてしか観測されない。script 内に再生成手順のコメントを焼き込む
  程度の緩和しかない
- **prefix 絞りの word 消費** (§3.2) は将来 `word_before` が core 実装された場合に
  「生成器で絞る」と「core で絞る」の二重絞りになる。core 実装時に生成器側を素通しへ
  切り替える追随が必要 (DR-104 §1 の予約が発火した時の申し送りとして本 findings が
  grep で引っかかる)
- **順序検証の弱さ**: 出力非 pin (DR-116 §6) のため、help model 順整列の正しさは
  kuu-cli product test でしか担保されない。issue 受け入れ条件の product test 5 観点
  (順序 / hidden / deprecated / alias / 説明引き直し) を envelope 単位 (script でなく
  query 応答の JSON) で書けば、shell 非依存で決定的にテストできる — script 層の
  テストは翻訳の煙テストに留める

## 8. GEN-Q バッチ素案

| ラベル | 質問 (1 行) | 選択肢と推し |
|---|---|---|
| GEN-Q1 | 生成器アーキテクチャ | **a: ブリッジ型一択 (thin script + binary runtime 問い合わせ)、静的展開型・混成は作らない、を推す** — 生存経路計算と after 整合 (フル parse) が script へ静的展開不能で、DR-109 柱 6 の第一候補の帰結 (§1.2)。b: 静的展開型を併設 |
| GEN-Q2 | v1 対象 shell | **a: zsh / bash / fish の 3 shell (PowerShell は追随) を推す** — 順序不可・説明弱い・両方可の能力 3 象限を初期実装で踏み、翻訳層設計を shell 能力差吸収の形に強制する (§2.3)。b: zsh + bash 先行 / c: PowerShell も v1 |
| GEN-Q3 | 生成コマンドの形 | **a: `kuu completion generate <def.json> --shell <shell> [--program-name <name>]` (def.json 第一 positional の kuu-cli 既存流儀 + generate/query の対称 2 子構成) を推す** — サブコマンド間一貫性が優先、cobra 並び (`completion zsh`) は層 3 アプリ側の裁量に残る (§2.1/§3.1)。b: cobra 流 `completion <shell> <def.json>` |
| GEN-Q4 | ブリッジ query の契約 | **a: `kuu completion query <def.json> --shell <s> --cword <N> -- <words...>` (raw argv 直渡し・binary 側分解) + policy 適用済み envelope (順序付き items / description / nospace / shell_actions / keep_order)、隠しコマンドにしない、を推す** — JSON quoting を shell に組ませない + DR-116 §4 の envelope 座席の実体化、将来 ABI の下敷き (§3)。b: 既存 `kuu complete` に --policy フラグ追加 / c: cobra 型 `__complete` 隠しコマンド |
| GEN-Q5 | custom completer 名の v1 扱い | **a: builtin マップ表 (files/dirs/path 等) のみ shell 機能へ翻訳、表に無い completer 名は候補提供なし + 生成器 docs 告知 (実行 ABI は DR-111 §5 の座席どおり後続)、を推す** — kuu-cli 経路にはホスト言語クロージャが無く実行不能 (幻影コマンドの既知の限界)、files への勝手な fallback は型違い候補で無より悪い (§3.3)。b: 未知名は files に fallback |
| GEN-Q6 | 生成器の住処 | **a: kuu-cli `impl/mbt/cli/src/lib/` (renderer.mbt と同座席)、kuu.mbt / spec 増分ゼロ、envelope 契約は kuu-cli docs で正本化、を推す** — DR-115 レンダラの座席前例と同一分担、policy 段の必要素材は全て既存 API で届く (§5.2 の表)。b: kuu.mbt に生成器支援 API を足す |

## 関連

- `docs/issue/2026-07-22-dr-116-completion-generator-implementation.md` (発題 issue)
- DR-116 (生成器の既定 policy — 本 findings が実装形を与える対象)
- DR-060 §1〜§5 (complete 意味論・素材とポリシーの分離・completer 名前参照・責務 4 層)
- DR-104 (candidate wire・6 フィールド identity・word_before/word_after の v1 予約)
- DR-111 §5 (completer descriptor — io_type は runtime 問い合わせ ABI 確定待ちの座席)
- DR-109 §1 柱 6/柱 7 (runtime 問い合わせ第一候補・kuu-cli self-hosting が最初の dogfooding)
- DR-113 §4.4/§8/§9 (help model の順序保存・help_query capability)
- DR-115 §6/§7 (出力非 pin・canonical レンダラの kuu-cli 座席前例)
- `docs/findings/2026-07-21-completion-ordering-plan.md` (§1.1 shell 別ソート実態・CORD-Q 裁定の出所)
- `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` §4 (completion 3 系統・dotnet-suggest の轍)
- kuu-cli: `docs/decisions/DR-0001-multi-impl-architecture.md` (マルチ実装・契約正本化)、`impl/mbt/cli/src/main/main.mbt` (現行 subcommand 流儀)、`impl/mbt/cli/src/lib/renderer.mbt` (canonical レンダラの座席前例)
- kuu.mbt: `src/kuu/front_door.mbt` (`complete` 玄関 API)
- Web 一次資料 (2026-07-21 調査分の再利用、実機未検証): cobra `__complete` / ShellCompDirective — https://cobra.dev/docs/how-to-guides/shell-completion/ 、zsh compadd — https://zsh.sourceforge.io/Doc/Release/Completion-System.html
