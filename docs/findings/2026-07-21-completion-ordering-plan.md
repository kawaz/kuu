# 補完候補の順序制御・lazy 補完・生成器の表示 policy — 設計プラン

> 由来: `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` (kawaz 発題 2026-07-18)。
> 着手条件「help DR 確定後」は DR-113 (help 機構再設計、order 語彙の意味論確定) と
> DR-115 (canonical help レンダラ) の land で成立した。論点 3 (生成器の表示 policy) は
> REND-Q7=a 裁定 (kawaz 2026-07-21、DR-115 §7) により本 issue へ統合された分。
> 裁定ラベルは **CORD-Qn** を使う — issue 名は completion だが、COMP-Q1〜Q5 は 2026-07-14 の
> 裁定バッチ (`docs/journal/2026-07-14-completion-design-rulings.md`) で消費済みであり、
> QUESTIONS.md 運用規約 (バッチ毎に一意プレフィクス・番号の使い回し禁止) に従い新プレフィクスを切る。

## 0. 前提の地図 (ゼロコンテキスト読者向け)

補完まわりの確定済み契約は次の 4 点に集約される。

1. **complete query の意味論** (DR-060 §1): カーソル前トークン列を消費できた全生存
   partial 経路の、次消費点で読めるものの和集合。dead end は含めない。
2. **候補の wire 表現と比較規約** (DR-104): 候補は `spelling` / `is_value` / `type` /
   `origin` / `term` / (flatten 済みの) `is_alias` / `hidden` / `deprecated` を持ち、
   6 フィールド identity で dedup される。`candidates` の比較は**順序非依存の multiset**
   (DR-104 §4) — 列挙順は非規範。
3. **素材とポリシーの分離・責務 4 層** (DR-060 §3/§5): 絞り込みポリシー (prefix 絞り、
   alias を隠す等) は候補メタを見た**生成器側 (層 2) の選択**であり、kuu (層 1) は固定
   しない。層 2 = kuu プロダクト標準提供の completion 生成器で、shell ごとの作法を
   全部封じる。本仕様 (AtomicAST) の射程外だが、kuu プロダクトとしては提供する。
4. **completer は名前参照** (DR-060 §4、DR-111 §5): 動的候補関数は wire に載らず
   名前参照のみ。呼び出しの入力契約 (io_type) は runtime 問い合わせ ABI (DR-109 柱 6、
   未実体化) の確定待ちで、descriptor 側から先取りしない (DR-111 §5)。

help 側で今サイクル確定した資産のうち本プランが使うもの:

- **order 語彙の意味論** (DR-113 §8): `help_order` (entry 表示順) / `help_group_order` /
  `help_after` (name 参照で直後配置)。options / commands の各フラット列へ「明示 order →
  宣言 index の安定ソート、次に help_after 配置」の 2 段適用。**help model は並べ替え後の
  順序を保存する** (DR-113 §4.4)。
- **「wire 指示語彙 + canonical 既定 policy」のパターン** (DR-115): 表示様式は wire の
  指示席 (定義者の意図 = 素材) + canonical レンダラの既定 policy (非規範) + 実行時上書き、
  の 3 段。出力バイト列は fixture pin しない (DR-115 §6)。

## 1. 論点 1: 候補順序の制御 — order 系を補完候補順へ反映するか

### 1.1 shell 側の現実 — 最終表示順は spec からは保証できない

kawaz 言及済みの「シェル側が勝手にソートする現実」を実装事例で裏取りした
(Web 調査 2026-07-21、一次資料は「関連」節の URL):

| shell | 既定挙動 | 供給順の保持手段 |
|---|---|---|
| zsh | group 内を match 文字列でソート | `compadd -V` (unsorted group)。group 間は `zstyle group-order` |
| bash | `compgen` 出力を readline がソート | `compopt -o nosort` (**bash ≥ 4.4 限定**) |
| fish | fish 自身が候補をソート | **保持手段なし** (fish がソートを手放さない) |
| PowerShell | 生成 script 側で `Sort-Object` するのが慣例 | ソートを挟まなければ供給順 |

cobra はこの差を `ShellCompDirectiveKeepOrder` (v1.7.0+) という**候補列と一緒に返す
指示ビット**で吸収する — 生成 script が shell ごとの保持手段 (`nosort` / `compadd -V`)
に翻訳し、手段の無い shell (fish、古い bash) では効かない。つまり業界の先行実装でも
「定義者の順序意図」は best-effort であり、**最終表示順の保証はどの設計でも不可能**。
この事実は「順序を spec の観測可能な規範にする」路線 (後述 案 c) の価値を大きく下げる。

### 1.2 既存資産の観察 — 順序素材は既に運ばれている

見落とされがちな点: **DR-113 §8 の 2 段適用後の順序は help model に保存済み**であり、
補完生成器 (層 2) は definition を保持している (静的 script 生成でも runtime 問い合わせ
でも、生成器は definition から出発する — DR-060 §5)。したがって生成器は help_query
capability を呼べば **order 適用済みの entry 列**を今すぐ取得できる。順序素材を候補
wire に複製しなくても、素材は既に届く経路がある。

### 1.3 案の空間

**案 a: canonical 生成器の既定 policy として help model の順序を参照する (spec 変更ゼロ)**

- 生成器 (層 2) が candidates を help model (DR-113 §8 適用済み順序) に突き合わせて
  整列し、shell の保持手段 (`compadd -V` / `nosort`) が使える shell では供給順を保持
  させる — cobra KeepOrder と同型の翻訳を canonical 生成器の既定にする
- candidate の `origin` (canonical 要素名) を help model の entry に突き合わせれば
  対応が取れる。値位置候補・匿名 exact 候補 (origin = spelling 自身、DR-104 明確化
  (iii)) の順序は「由来 entry の順序に従属」で一貫する
- spec (wire・fixture・比較規約) は一切変わらない。DR-060 §3「並び・絞りは生成器側」
  の既存線引きにそのまま載る
- 悪い面: 生成器実装が complete query と help_query の両方を呼ぶ結合を持つ (ただし
  同一 binary / 同一 definition 内の話で、配布・ABI には影響しない)

**案 b: 候補 wire に順序素材 (help_order 実効値) を載せる**

- candidate に `order` (2 段適用後の実効順位) を追加し、生成器は complete query の
  応答単体で整列できる
- 悪い面: (1) wire 拡張 = 全実装に搬送義務、(2) 6 フィールド identity に `order` を
  入れるか除外するかの規約追加が必要 (除外が自然だが completer と同様の merge 規則が
  another 席で要る)、(3) help_after の「直後配置」は列全体の文脈で決まる相対指定で、
  単独候補に載せる数値へ潰すと情報が落ちる (実効順位に解決して載せれば潰れないが、
  candidates は「生存経路の和集合」で help のフラット列と集合が一致しない — 欠番の
  ある順位列になる)、(4) 案 a で同じ素材が既に届く以上、複製経路の追加になる
  (DR-115 §4 の「model はフラット列のまま、突き合わせで復元」と逆行)

**案 c: candidates の列挙順を規範化する (DR-104 §4 改訂、順序込み比較)**

- 悪い面: 既存 fixture 全数の順序 pin が要る破壊改訂であることに加え、§1.1 の通り
  最終表示順はどの shell でも保証できず、「観測可能な規範」が保証しない体験のために
  比較規約を重くする転倒。列挙順を SHOULD に留める変形は fixture で検証できない規範 =
  観測等価主義 (DR-113 §1 の実装位相自由と同じ流儀) に反する空文になる

**案 d: 何もしない (順序は生成器の完全な自由、既定 policy も定めない)**

- 悪い面: kawaz の発題需要「よく使うオプションを先に出す」が canonical 経路で満たされ
  ない。help_order を書いた定義者の意図が補完で活きるかが生成器実装ごとのくじ引きになる

**評価**: 案 a を推す。順序は「定義者の意図」という素材であり、従い方は生成器 policy —
DR-115 が hidden / help_render で確立した構図の completion 版が、新語彙ゼロ・新搬送
ゼロで書ける。案 b は将来 runtime 問い合わせ ABI の応答設計 (§2) で「応答単体で完結
させたい」実需が出た時に、ABI 側の応答 envelope の関心として再検討すればよい (wire
candidate 契約へ複製するのではなく)。

### 1.4 補完専用 order 語彙 (completion_order) の要否

「help では末尾に置きたいが補完では先に出したい」を表現する独立語彙は立てない側を推す。
順序語彙一式 (order / group_order / after) の二重化になり、需要の実在が未確認。追加は
非破壊 (新 opt-in 語彙) なので、実需が出た時に DR-115 §1 の個別席パターン
(`help_value_structure_style` が 1 語彙だけ追加された前例) で足せる。v1 完備主義
(必要なものは今設計し切る) との緊張はあるが、「必要」の証拠が無い語彙の先取りは
DR-111 §5 が io_type で棄却した「実例・実需が無い軸の事前予約」に当たる — 完備主義の
対象は「必要と分かっているもの」であり、本件はそちらに入らないと整理する (この整理
自体の当否を CORD-Q2 として裁定に上げる)。

## 2. 論点 2: lazy 補完 (peco/fzf 型) — 遅延評価・ストリーム供給の許容

### 2.1 解釈の確定 (issue が「裁定時に要確認」とした点)

issue の解釈を採る: 現行の complete query は同期的に有限 candidates 配列を返す。
lazy 補完とは (1) 候補生成を遅延評価する、(2) peco / fzf のようなインタラクティブ
絞り込み UI へ候補をストリーム供給する、の 2 形を指す。

### 2.2 層の分析 — lazy の実需は definition 由来候補には無い

kuu core の complete query が返す候補は **definition 由来** (トリガ綴り + 値位置の
型情報 + completer 名) であり、定義の大きさに比例する有限で小さい集合。lazy 化の
実需があるのは **completer の実行結果** (ファイル一覧・リモートリソース名・数千件の
動的候補) — つまり DR-060 §4 が「実行はしない、名前参照のみ」と core から切り離した
層である。core は「この値位置は completer `branches` で埋まる」という**参照**を返す
だけで、重い列挙は最初から core の外にある。この既存の関心分離が、lazy 問題を
そのまま解く: **complete query の契約 (有限配列・同期) は変えず、lazy 性は completer
実行層 (生成器 ↔ アプリ関数の配線、runtime 問い合わせ ABI) の関心と位置づける**。

- peco / fzf 型 UI への接続も同じ層に落ちる: fzf は自前で絞り込み・自前で表示順を
  管理する (供給順もソート順も fzf の設定次第)。kuu 側がストリーム contract を持って
  いても、それを活かすのは生成器と UI の間の配線であり、spec の観測面には現れない
- DR-111 §5 は completer の io_type (入力契約) を「ABI 確定 DR が追加する」と明示的に
  空けてある — ストリーム / ページング / キャンセルはこの ABI 設計 (completers registry
  実体化、DR-109 柱 6) の論点であり、座席が既に用意されている

### 2.3 順序確定ロジックの申し送り

lazy 供給では「全候補が出揃ってからソート」ができない (issue の指摘)。ただし §1 の
案 a (順序素材は help model 経由、definition 由来候補にのみ意味を持つ) を採る場合、
completer が生む動的候補には definition 上の順序意図がそもそも存在しない — 動的候補
の順序は completer 関数の返却順が唯一の情報源であり、「**供給順 = 確定順** (cobra
KeepOrder と同じ規約)」が自然に唯一解になる。バッファして整列する案は「何で整列
するか」の基準が無く成立しない。この帰結 (definition 由来候補 = help model 順 /
completer 由来候補 = 供給順) を ABI 設計 issue への申し送り事項として固定する。

### 2.4 v1 の扱い

v1 では complete query の契約を変えず、lazy の規定は ABI 設計と同時に行う (issue
受け入れ条件の追認)。「lazy 化しても complete query の観測 (fixture) と等価」という
保証は、DR-113 §1 が canonical expansion に許した実装位相の自由と同じ形で既に
確保されている — candidates の生成が内部で逐次でも、fixture 比較は multiset なので
観測は変わらない。追加の規定は不要。

## 3. 論点 3: 生成器の表示 policy — 候補説明・deprecated マーカー (REND-Q7 統合分)

### 3.1 業界素材 — 候補側に何を載せるか

- **carapace** (最もリッチ): 候補 = `value \t description \t style` の 3 分離。
  tag (候補群のラベル) と style (色・修飾) を第一級で持つ
- **zsh**: `_describe` / `compadd -d` で候補と説明の対を表示。tag + `zstyle` で
  ユーザ側が表示 policy を上書きできる
- **cobra**: runtime 問い合わせ (`__complete`) の応答が `completion\tdescription` 行 +
  指示ビット (ShellCompDirective)
- **fish**: `候補\t説明` の対をネイティブ表示
- 候補に `is_alias` / `deprecated` 級のメタを載せる例は業界ゼロ (CandMeta 責務調査、
  `docs/journal/2026-07-21-renderer-and-api-polish-cycle.md`) — 各系は「説明文字列に
  焼き込んだ最終形」を運ぶのに対し、kuu は素材で運んで生成器が焼く (DR-060 §3 の
  意図的設計、同調査で確認済み)

### 3.2 候補説明 (help 文字列) の供給経路

現行の candidate は help 文字列を持たない。説明付き補完 (zsh `_describe` 相当) を
canonical 生成器が組むには help が要る — 供給経路は 2 案:

**案 a: 同梱しない — origin 経由の引き直し (現状構造の維持)**

- 生成器は definition (と help_query capability) を常に持つ (§1.2 と同じ観察)。
  candidate の `origin` は canonical 要素名 (DR-104 明確化 (c)) なので、help model の
  entry へ突き合わせて `help` を引ける
- 引き直し規則は canonical 生成器の既定 policy として文書化する: exact 候補 = origin
  entry の `help` (short)。`is_alias: true` の候補 = canonical entry の help + alias
  である旨の注記 (DR-057 の canonical 自動導出と同じ素材)。値位置候補 = origin entry
  の help (候補は「この option の値」なので entry の説明が最も近い素材)
- 悪い面: 生成器が complete query 単体で完結しない (§1.3 案 a と同じ結合。同一
  binary 内なので実害は薄い)。匿名 exact 候補 (origin = spelling 自身) は引き先
  entry が help を持たなければ説明なしになる — これは定義に説明が無いのだから正しい

**案 b: candidate wire に help を同梱する**

- 悪い面: (1) 表示メタ語彙は「宣言層に inert 属性として残り、lowered 産物や評価器へ
  運ばない」(DR-113 §1) — complete query は評価器の出力であり、help 文字列を candidate
  に載せることはこの原則の逆行、(2) 6 フィールド identity との関係規約 (help 差異で
  dedup が割れるか) が必要になる、(3) help / help_long のどちらを載せるかの選択を
  wire 層で固定してしまう (レンダラ policy の座席を奪う)

**評価**: 案 a を推す。cobra / carapace が説明を候補列に同梱するのは「protocol が
候補列しかない」系の制約であり、definition が第一級で生成器が常に definition を持つ
kuu では同梱の必然が無い。runtime 問い合わせ ABI の応答 (shell shim へ返す行) に
説明を含めるのは自由 — それは ABI 応答 envelope の関心 (binary 内部で引き直して
添える) であり、spec の candidate 契約とは別物、という線引きで両立する。

### 3.3 deprecated / hidden の canonical 既定 policy

DR-115 の「canonical 既定 policy は非規範だが宣言の正本を DR に置く」(§5) の形を
completion 生成器へ移植する。ただし統括見立て (issue 論点 3) の通り、completion 側は
セクション骨格もテンプレも不要 — **wire 指示語彙 (completion_render 席) は立てず**、
canonical 生成器の既定 policy の文書化だけで足りる。DR-115 パターンのうち移植する
のは「既定 policy を DR に宣言する」部分のみで、「3 段 override の wire 席」部分は
移植しない (表示の自由度が shell 側機能に律速され、上書き語彙を用意しても shell に
よっては従えない — DR-115 §7 が挙げた流用不能の理由そのもの)。

canonical 既定 policy 案:

- **hidden**: 既定除外 (DR-060 §3 が既に明記する既定の追認)。help 側の
  `#help_show_hidden` に相当する実行時スイッチは補完には無い — 補完呼び出しは shell
  が発火し、ユーザが flag を添える機会が無いため。露出したい要素は hidden を外すか
  ref & link の面別分割 (DR-113 §7.3) で表現する
- **deprecated**: 候補には**残し** (受理される綴りを補完から隠すと「打てるのに出ない」
  非対称が生まれる — DR-104 §5 の「早期に隠すより打たせて教える」と同じ説明チャネル
  論)、説明文字列の末尾に deprecated 注記を付ける。注記の文言は非規範 (DR-115 §4 の
  入口注記と同じ扱い)。alias 経由なら「use <canonical> instead」の canonical 自動導出
  (DR-057) が素材
- **is_alias**: 既定で表示 (DR-060 §3 の例示「未入力 tab-tab は alias を隠す / 途中
  入力は全部出す」のような文脈依存の絞りは生成器実装の裁量に残し、既定は隠さない側)

これらは DR-115 §6 と同じく**出力は fixture pin しない** (品質担保は kuu 生成器
実装側の product テスト)。spec conformance には何も増えない。

## 4. 発明と規範化の区別

- **既存規範の追認** (新規決定なし): complete query の有限配列契約 / multiset 比較 /
  素材とポリシーの分離 / hidden の既定除外 / completer 名前参照
- **本プランの発明 (裁定対象)**: (1) 生成器が help model の順序を参照して整列する
  接続 (§1.3 案 a — 新語彙ゼロだが「層 2 が help_query を使う」接続自体は新規)、
  (2) lazy を completer 実行層の関心と確定する位置づけと順序確定の申し送り (§2)、
  (3) 説明の origin 引き直し規則と deprecated / alias の既定表示 policy (§3)
- **規範化しないもの**: 生成器の出力 (補完 script のバイト列・説明の文言・注記の形)。
  すべて DR-115 §6 と同じ非規範側に置く。今回の裁定で spec conformance (fixture /
  schema) に増分は発生しない見込み — 裁定結果の記録先は既存補完 DR への追記 note
  または新 DR の「canonical 生成器の既定 policy」節になる
- **Web 調査由来の事実** (実機未検証): §1.1 の shell 別ソート挙動と cobra / carapace
  の仕様は一次資料の記述に基づく (URL は「関連」節)。生成器実装サイクルで実機検証する

## 5. リスク・悪い面

- 案 a 系 (順序も説明も「生成器が definition / help model から引く」) は生成器実装の
  結合を増やす。complete query 単体を叩く軽量 consumer (kuu-cli の `kuu complete` を
  script から使う等) には順序・説明が付かない — その consumer が現れた時に §1.3 案 b
  (ABI 応答 envelope での複製) を再検討する後戻り経路は残る
- fish では順序意図が原理的に反映されない (§1.1)。「help_order を書いたのに補完順が
  変わらない」という定義者の驚きは shell 差として残り、生成器 docs で説明するしかない
- completion_render 席を立てない判断 (§3.3) は、将来「この定義では deprecated を補完
  から隠したい」級の定義側需要が出た時に語彙追加の DR が要る。非破壊追加なので後悔
  コストは低いが、DR-115 が help で立てた席との非対称は残る
- lazy の先送り (§2.4) により、peco / fzf 統合の具体設計は ABI issue まで動かない。
  発題の「lazy 補完を許容するか」への v1 の答えは「core 契約上は最初から妨げていない
  (実行層の関心)」であり、体験としての実現は後続

## 6. CORD-Q バッチ素案

| ラベル | 質問 (1 行) | 選択肢と推し |
|---|---|---|
| CORD-Q1 | 候補順序の制御経路 — order 系を補完へどう反映するか | **a: canonical 生成器の既定 policy (help model の DR-113 §8 順序を origin 突き合わせで参照、spec 変更ゼロ) を推す** — 順序素材は help model に保存済みで新語彙・新搬送ゼロ、DR-060 §3 の既存線引きに載る。b: 候補 wire に実効順位を複製 / c: 列挙順の規範化 (DR-104 §4 改訂) / d: 何もしない |
| CORD-Q2 | 補完専用 order 語彙 (completion_order 等) を v1 で立てるか | **a: 立てない (help_order 併用、実需が出たら非破壊追加) を推す** — 順序語彙一式の二重化で、需要未確認の先取りは DR-111 §5 の io_type 棄却と同じパターン。b: v1 完備主義側に倒して新設 |
| CORD-Q3 | lazy 補完の v1 位置づけ | **a: completer 実行層 (runtime 問い合わせ ABI) の関心と確定、core の complete query 契約は不変。順序確定は「definition 由来 = help model 順 / completer 由来 = 供給順」を ABI issue へ申し送り、を推す** — 重い列挙は DR-060 §4 の名前参照分離により最初から core の外にある。b: v1 で stream 観測等価規定を書く |
| CORD-Q4 | 候補説明 (help 文字列) の供給経路 | **a: candidate へ同梱しない — origin 経由の引き直し規則 (exact = origin entry の help / alias = canonical help + 注記 / 値位置 = origin entry の help) を canonical 生成器 policy として文書化、を推す** — 表示メタは評価器へ運ばない (DR-113 §1) の一貫。b: candidate wire に help 同梱 |
| CORD-Q5 | deprecated / hidden / alias の canonical 生成器既定 policy | **a: hidden = 既定除外 (既存規定の追認)、deprecated = 候補に残し説明末尾に注記 (文言非規範)、alias = 既定表示。wire の completion_render 席は立てず、出力は fixture pin しない (DR-115 §6 の線)、を推す** — completion は「候補 1 行の組み方」だけでテンプレ層の語彙が要らない (REND-Q7=a の統括見立ての具体化)。b: 定義側上書き席 (completion_render) も同時新設 |

## 関連

- `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` (発題 issue、本プランの出所)
- DR-060 (complete query の意味論・素材とポリシーの分離・責務 4 層・completer 名前参照)
- DR-104 (candidate wire 表現・6 フィールド identity・multiset 比較)
- DR-113 §8 (order 語彙の 2 段適用と model への順序保存) / §1 (表示メタは評価器へ運ばない)
- DR-115 (wire 指示語彙 + canonical 既定 policy のパターン、§6 出力非 pin、§7 REND-Q7=a の統合元)
- DR-111 §5 (completer descriptor — io_type は ABI 確定待ちの座席)
- DR-109 §1 柱 6 (completion 配布 = 生成器標準提供 + runtime 問い合わせ第一候補)
- DR-057 (alias の canonical 自動導出) / DR-058 (hidden / deprecated の表示層原則)
- `docs/journal/2026-07-21-renderer-and-api-polish-cycle.md` (CandMeta 責務の業界調査 — is_alias/deprecated を候補に載せる例は業界ゼロ)
- `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` §4 (completion 3 系統)
- Web 一次資料 (2026-07-21 参照): cobra ShellCompDirectiveKeepOrder — https://github.com/spf13/cobra/blob/main/bash_completionsV2.go (bash 4.4+ nosort guard) / https://cobra.dev/docs/how-to-guides/shell-completion/ 、zsh compadd -V / group-order — https://zsh.sourceforge.io/Doc/Release/Completion-System.html 、carapace の value/description/style 3 分離 — https://carapace-sh.github.io/carapace-bin/spec.html / https://carapace-sh.github.io/carapace-spec/carapace-spec/command/completion.html
