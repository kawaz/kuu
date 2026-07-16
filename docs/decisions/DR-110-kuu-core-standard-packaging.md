# DR-110: kuu-core 標準パッケージング — engine / builtins / assembly の 3 層

> 由来: PKG-Q1〜Q4 裁定バッチ (kawaz 2026-07-16、`docs/QUESTIONS.md` 経由)。駆動源は
> kuu-core 立て直し (UX-Q7R 追記が指摘した「公開面が過剰な core を呼び出し側が各自
> 組み合わせている」構造、DR-109 §7) と、参照実装 kuu.mbt の境界争点全列挙調査
> (kuu.mbt リポ `docs/findings/2026-07-16-engine-builtin-boundary-survey.md`、争点 21 件。
> 以下「boundary survey」、争点番号 PKG-#N は同 findings 準拠)。kawaz 裁定の核:
> **builtin (installer / 型 parser / filter) を 3rd party と同じ interface・同じ登録経路で
> 実装し、package も一線を引く**。本 DR は PKG-Q4=a (spec 側に規範 DR を先に立てる —
> 3 層構成は多言語展開の契約であり参照実装のローカル事情ではない) の実施である。

## 決定

### 0. 規範の射程 — 全言語実装への契約 (PKG-Q4=a)

**全言語の kuu-core 実装 (VISION §2 層 2) は engine / builtins / assembly の 3 層で
構成する。** 本 DR の規範は能力要件 (「engine は builtin 語彙を含まない」「builtins は
公開 extension interface のみ使用する」等) で書く。層の実現機構 (package / module /
crate / trait / interface / 関数テーブル) は各ホスト言語の自由であり、本文中の
MoonBit 語彙 (trait / enum / `moon.pkg` 等) は全て例示である。

「層」の判定は観測可能な依存関係で行う: ある実装が本 DR に準拠するとは、
§2 の依存方向・禁止事項を満たす形で 3 層の境界を持つことをいう。物理的な
パッケージ分割の単位数 (3 package か、2 package + 内部 module 境界か) は問わない —
**境界の存在と禁止事項の充足が規範であり、配布形は自由**。

### 1. 3 層の定義

| 層 | 内容 | 一言で |
|---|---|---|
| **engine** | パース機構 (path 探索・読みの枝・結末構造)・registry 機構・descriptor 契約・値源ラダー骨格・AtomicAST 構造骨格と拡張 node 登録機構。**builtin 語彙を一切含まない** (§3 が内蔵集合の閉じた列挙) | 機構だけの空の劇場 |
| **builtins** | canonical 住人の実装群: installer (long / short / env / dd / command / global / inherit / repeat / multiple / config / constraint / alias / inheritable、DR-042 の表)・値プリミティブ型 parser (DR-074/075)・preset 型 (flag / count / tty、DR-076/077/099)・filter / accumulator / collector 住人 (DR-095/105)。**engine の公開 extension interface だけを使い、3rd party 拡張と同じ目線で実装する** | 電池 (特権なし) |
| **assembly** | 電池込みの組立と利用者向けの顔。canonical set の組成・登録、front_door (一本道の玄関、DR-109 §7 追記)、conformance の検証主体 (§8) | 電池込みの完成品 |

assembly 層の名は製品名を継いで **kuu** とも呼ぶ (参照実装のパッケージ名は
`engine` / `builtins` / `kuu` を想定)。本文では層の役割を指すとき assembly、
製品層を指すとき kuu と書き分けるが同一の層である。

spec 上の根拠系: 「組み込み型 = 最初から登録済みのプリセット」(DR-028)、
「builtin はただの namespace であり、拡張 ns と同じ語彙軸の別区分」(DR-094)、
「全 registry 住人が descriptor を持つ」(DR-061 / DR-095 / DR-107)。spec は一貫して
**builtin に構造的特権を与えていない**。本 DR はこの既存規範をパッケージ構成に
写像し、「参照実装だけがエンジン直書きの特権を持つ」非対称を禁止する。

> 整合注記 (DR-094 §1 との読み合わせ): DR-094 §1 は installer 所有フィールド名
> (`long` / `short` / `env` / `repeat` 等) を「AtomicAST の構造プリミティブであり
> registry の住人名ではない」と書くが、これは **ns 名前解決の対象か否か**の区分
> (名前解決を通さない構造キーワードである、の意) であって、engine 層への帰属の
> 主張ではない。本 DR の §2-1 (engine はこれらの語彙を知らない) と矛盾しない —
> これらのフィールドの decode・lowering は各 installer 住人の所有 (#19、§6)。

### 2. 依存方向と 3 つの禁止事項 (規範)

依存は `assembly → builtins → engine` の一方向のみ。逆流を禁止する:

1. **engine は builtin 語彙を含まない**: installer 属性名 (`long` / `short` / `env` /
   `repeat` 等)・型名 (`number` / `bool` / `flag` / `count` / `tty` 等)・filter /
   accumulator / collector 名 (`trim` / `append` / `merge` 等)・sentinel 綴り
   (`#row` / `@depr:` 等)・preset 意味論 (presence-only、increment 効果、fold??default)
   のいずれも、engine のコードに識別子・分岐条件・特別扱いとして現れてはならない。
   engine が知ってよいのは「語彙が存在しうる」という枠 (registry 機構・descriptor
   契約・opaque data の運搬) だけである
2. **builtins は engine の公開 extension interface のみを使用する**: engine の非公開
   内部への接触 (内部構造の直接操作、非契約シンボルへの依存) を禁止する。この規範の
   検証可能形は「**canonical builtin の任意の 1 住人を外し、同じ interface で書かれた
   3rd party 実装に差し替えても、engine は無改変で動く**」— 差し替え可能性が
   「同じ目線」の操作的定義である
3. **canonical set の組成は assembly が所有する**: 「どの住人を電池として同梱するか」
   の表 (DR-042 の canonical installer set、DR-095 の builtin filter/factory 群、
   DR-036 の accumulator/collector プリセット) は assembly 層の登録コードが正本で
   あり、engine にも builtins 単体にも全部入りの組成表を持たせない。builtins は
   住人の実装を提供するだけで、自分たちを engine へ登録する主体にならない

禁止事項 1 の帰結として、engine のテスト (unit) も builtin 語彙を前提にできない —
engine のテストは合成 (synthetic) の拡張住人で契約を検証する。builtin 語彙込みの
検証は builtins の unit と assembly の conformance (§8) の関心である。

### 3. engine の内蔵集合 (閉じた列挙)

engine が自前で持つのは以下に限る。ここに列挙のないものは builtins / assembly の
関心であり、engine への追加は本 DR の改訂 (または後続 DR) を要する:

1. **AtomicAST の構造骨格**: 選択 (or)・順次 (seq)・リテラル照合 (exact)・参照
   (ref)・スコープ・束縛・反復骨格 (DR-023/026 の構造プリミティブと、その lowering
   が要求する構造 node)。値プリミティブ (string/number/…) は含まない (#2、§4)
2. **open node 契約 (PKG-Q1=a)**: 拡張 node 種の登録機構。各 node 種は評価能力
   (読みの生成) と**消費数の契約データ** (0 トークンで束縛のみ寄与する node か、を
   含む — PKG-#18) を宣言して登録する。engine は node 種名の直書き分岐でなく契約
   データで判定する。DR-041 §3「消費数は Accept の報告値であり value の有無から
   導出しない」の宣言側の対
3. **path 探索と結末構造**: 完全経路の一意性 (DR-038)、読みは枝 (DR-041)、
   Reject/Error の枝解決 (DR-037)、結末 3 値 union (DR-053)、スコープ昇降と背骨
   (DR-041 §4 / DR-042 不変則⑤)
4. **pluggable matcher 契約 (PKG-#6)**: matcher は「opaque な構成データ + 解釈
   callback (トークンと位置を受け読みの枝を返す)」として登録される。DR-041 §3-4
   の「matchers add reading capability WITHOUT adding schema」と DR-042 の「再解釈
   matcher は名前付きデータ」の実装契約形。eq-split / short-combine という具象は
   builtins の住人 (§4)。**opaque は「直列化不能」を意味しない** — matcher の
   データ性 (DR-042: クロージャでなく名前付きデータ、lower fixture の断面比較
   LOWERING §C.5 / DR-070 §2 が matcher 種別・エントリ表を pin する) は不変で
   あり、その直列形の encode / decode は wire decode (#19) と対称に当該住人が
   提供する。engine にとって中身が不透明、というだけで構造比較可能性は住人の
   契約として保持される
5. **値源ラダーの骨格 (PKG-#11)**: 席順序 cli > env > config > inherit > default は
   engine 契約 (DR-031「順序は固定、設定可能にしない」)。各席の provider
   (env_provider / config_provider / tty_provider、DR-107 §6) の受け口と充填の
   一般機構も engine。**席内解決に builtin 語彙を要するもの** — tty 型の default 席の
   `fold(観測) ?? 宣言 default` (DR-099)、flag / count の preset default
   (DR-076/077) — は当該 builtin の descriptor が解決子を提供し、engine は
   descriptor dispatch で呼ぶ (直書きしない)
6. **registry 機構と descriptor 契約**: 名前 (ns 付き語彙、DR-094) → 住人の解決、
   descriptor の宣言軸 (DR-061 / DR-107)、configurable factory の構築枠 (DR-061 §3)
7. **install 契約 (PKG-#9)**: installer を「所有語彙 (owned vocab) / 適用 (lowering
   寄与) / 定義時検査 (collect defs errors)」の 3 能力を持つ契約として受け、
   DR-042 の 5 不変則に基づく合成 (不動点反復・冪等・順序非依存) を回す機構。
   installer の閉じた列挙型を持たない
8. **定義時検査の集約と真に generic な 2 検査 (PKG-#8)**: エラーの全列挙・hint 付き
   返却 (DR-054 §4) は engine の集約機構。engine 自前の検査は (a) 所有語彙の交差
   (registry 登録時、DR-042 不変則③) と (b) unknown-vocab (定義検査時、所有集合の
   和に載らない語彙の検出、DR-061 §2) の 2 つのみ — どちらも「登録された住人の宣言」
   だけから計算でき、個別語彙の意味論を要しない。個々の検査規則の中身
   (long DSL 妥当性、repeat の min>max、config 循環…) は各 installer の管掌 (§4)
9. **結果構築の一般写像**: export_key の写像 (DR-052)、露出キー衝突の検出
   (DR-073)、配列 / オブジェクトの一般構築、UX-Q7R の充填判定 (default 注入は
   export_key 適用後の結果 cell を見る、DR-109 §7 追記)
10. **complete 走査骨格 (PKG-#20)**: 生存 partial 経路の期待集合収集 (DR-060 §1)、
    候補構造の組み立て。候補メタ (hidden / deprecated / alias / 終端ヒント /
    completer 名) の**中身**は engine にとって opaque な運搬物であり、engine は
    「登録要素の宣言メタを候補に写す」一般機構だけ持つ。**opaque なのは engine
    内部の運搬に限る** — 利用者へ返る候補構造そのもの (メタの語彙と形) は
    DR-060 §3 / DR-104 が既に仕様として規範化しており、本 DR はそれを変えない
11. **AtomicAST decode の容れ物と orchestrator (PKG-#19)**: wire (直列形) の
    構造骨格 decode と、「各 installer 住人に自所有語彙分の decode を委ねて集約する」
    orchestrator。installer 語彙 (allowed keys、`type:` の factory 名分岐、
    accumulator 名…) の decode 本体は各住人 (§4)

### 4. builtins の住人 (電池、特権なし)

builtins が提供するのは canonical 住人の実装であり、いずれも §2-2 の
extension interface 経由で登録される:

- **canonical installer 群** (DR-042 の表の 13 種): 各住人が自所有語彙について
  wire decode (PKG-#19)・lowering・定義時検査 (PKG-#8 の残り全検査)・seat / preset
  宣言 (PKG-#10: flag の default:false、count の default:0、tty、config 席の同型
  注入、accumulator 名の写像) を**所有ごと**提供する。DR-061 §1 の descriptor
  (owns / observes / config キー / reasons) がその宣言正本
- **値プリミティブ型** (string / number / int / float / bool): open node 契約
  (§3-2) に乗る拡張 node として自前の評価 (値スロットの読みと parse) を登録する
  (PKG-#2)。canonical 字句 (DR-074/075) と型 config (RoundMode / BoolConfig 等、
  PKG-#7) は型 descriptor の管掌であり、engine は型カテゴリの列挙
  (旧 Ty enum 相当) を持たない (PKG-#4)
- **preset 型** (flag / count / tty): presence-only の読み、count の increment
  効果 (DR-077 §3)、tty の fold??default (DR-099) は全て builtin 意味論。
  評価器内の matcher / ladder がこれらを直書きしていた癒着 (boundary survey
  PKG-#5) は、PKG-#4/#6 の帰結として自然に解消される (PKG-Q3=a: 独立修正しない —
  presence-only や effect 生成の知識が matcher の opaque data と型 descriptor 側へ
  移ることで、engine 側に直書きの居場所自体が無くなる)
- **matcher 具象** (long の eq-split / short の cluster・値付着): §3-4 の pluggable
  契約の住人。構成 config (equal separator の扱い、attach mode 等、PKG-#7) も
  builtin 語彙であり、opaque data の中身として engine を素通りする
- **filter / accumulator / collector 住人** (PKG-#12/#13): trim / non_empty /
  in_range / regex_match / increment / unique、append / merge / kv_map、
  unwrap_single / from_entries 等は全て descriptor registry の住人 (DR-095 /
  DR-105 / DR-107)。resolve 段の名前分岐直書き (merge → 専用 fold、kv_map →
  オブジェクト構築) は住人の fold / collect 実装へ移す
- **sentinel 綴り** (PKG-#3): `#row` (DR-078 §1)・`#fire` (DR-034 last-wins)・
  `@depr:` (DR-058)・`@act:` (DR-048) 等の綴りは builtins の内部語彙。engine が
  知るのは「束縛には通常束縛と meta 束縛の 2 区分がある」という型区分だけで、
  綴り規約 (prefix 判定) を持たない。**meta 束縛の判定を外部 API として公開しない**
  (PKG-#15: 参照実装の `is_sentinel` pub 相当は廃止) — 利用者向け出力 (DR-053 の
  結末構造、fixture の expect) に sentinel が現れない仕様は不変。現行参照実装では
  sentinel が玄関の出力に漏れ、消費者 (conformance runner / kuu-cli) が各自
  `is_sentinel` で skip している — この後処理は assembly の玄関 (§5) が内部で
  吸収する形に移り、外部消費者から sentinel の存在ごと不可視になる

### 5. assembly (kuu) の責務

- **canonical set の組成・登録** (§2-3): DR-042 / DR-095 / DR-036 の canonical
  住人一式を engine へ登録する組立コードの正本
- **front_door — 一本道の玄関** (PKG-#21): DR-053 (parse) / DR-054
  (parse_definition) / DR-060 (complete) の 3 契約と resolve 込みの完全経路を、
  利用者 (kuu-ux / kuu-cli / conformance runner) が**唯一の入口**として使える形で
  公開する。UX-Q7R (DR-109 §7 追記) が指摘した「公開面が過剰な core を呼び出し側が
  各自組み合わせる」構造の解消はこの一本化で行う — engine が公開するのは拡張実装者
  向けの raw 契約 (path 探索・complete 走査・install 合成)、builtins が公開するのは
  住人 (decode + lowering + 各 descriptor)、**利用者が呼ぶのは assembly の玄関だけ**
- **conformance の検証主体** (§8)

### 6. 境界裁定表 (boundary survey 従属争点の規範化)

上流 4 裁定 (kawaz 2026-07-16): **PKG-Q1=a** (Node open 化 — engine は構造 node のみ
内蔵、値プリミティブ・マーカー・satellite は builtin が拡張登録) / **PKG-Q2=a**
(engine 最小 Entity + builtin 固有宣言は descriptor として各 builtin 所有) /
**PKG-Q3=a** (matcher の count→increment 直書きは上流裁定の帰結で自然解消) /
**PKG-Q4=a** (spec 規範 DR 先行 = 本 DR)。従属争点は第一原理 (§2 の禁止事項) から
以下に裁定する。争点番号は boundary survey 準拠:

| 争点 | 裁定 (規範) | spec 根拠 |
|---|---|---|
| #2 値プリミティブの評価 | builtin 拡張 node として自前 eval を登録。engine の評価器は型別 arm を持たない | DR-028 (組み込み型 = 登録済みプリセット)、DR-061 §4 (config 検証は factory 自身の責務) |
| #3 sentinel 綴り | builtins 内部語彙。engine は束縛の meta 区分 (型タグ) のみ知る | DR-078 §1 / DR-058 / DR-048 / DR-034 (全て builtin 意味論) |
| #4 型カテゴリ列挙 | engine から除去。型の値空間・presence-only・値スロット有無は型 descriptor / node 契約データの管掌 | DR-076 / DR-077 (flag・count は糖衣プリセット)、DR-089 (none は type 省略の糖衣) |
| #6 matcher 具象 | eq-split / short-combine は builtins。engine は opaque data + 解釈 callback の pluggable 契約のみ | DR-041 §3-4 (matcher は能力追加、スキーマ不変)、DR-042 (matcher = 名前付きデータ) |
| #7 型・matcher の config 型 | 丸め・bool 語彙・separator / attach 等の config は builtin 所有。engine は unknown-config を素通し (opaque 運搬) | DR-074 / DR-075 / DR-096 (いずれも builtin 型契約) |
| #8 定義時検査 | 各 installer が自所有分の検査を提供。engine は全列挙・hint 付き集約 + generic 2 検査 (語彙交差 = 登録時、unknown-vocab = 定義検査時) のみ | DR-054 (集約契約)、DR-042 不変則③、DR-061 §2 (所有集合の和) |
| #9 installer の型 | 閉じた列挙型を廃止し install 契約 (所有語彙 / 適用 / 検査) に開く。canonical set の組成は assembly | DR-042 (canonical set は「標準として同梱する」区分 = 組成は電池側)、DR-010/040 (registry 3 層) |
| #10 seat / preset 宣言 | flag / count / tty の preset、config 席の注入、accumulator 名写像は各住人が宣言。結果セル (Entity 相当) の構築機構と席テーブルは engine | DR-105 §1/§3、DR-050 §3、DR-099、DR-076/077 |
| #11 値源ラダー | 席順序は engine 契約で不変。席内解決に builtin 語彙を要するもの (tty の fold??default、flag/count preset) は descriptor dispatch | DR-031 (順序固定)、DR-099 (tty は default 席の解決規則を持つ preset 型) |
| #12 filter registry | 住人は builtins、登録は assembly。engine は名前 lookup と呼び出し契約 (io_type / fallibility) のみ | DR-010 (registry 3 層)、DR-062、DR-095、DR-107 §3/§4 |
| #13 accumulator / collector | #12 と同型。resolve 段の名前分岐直書きは住人の実装へ | DR-036 (registry 規定)、DR-105 §4 |
| #15 meta 束縛判定の公開 | 外部 API として公開しない (sentinel は利用者向け出力に現れない) | DR-053 (結末構造に sentinel なし)、DR-104 §5 (相区分は engine 契約、綴りは含まない) |
| #16 conformance runner | assembly 層に属する (§8)。engine / builtins は各層の unit を持つ | DR-065 / DR-069 (fixture は電池込み定義を前提とする、§8) |
| #17 公開面の三分類 | 各層は自層の契約に属するシンボルのみ公開する。分類基準: そのシンボルの消費者が (a) engine を拡張する実装者 → engine 契約、(b) 住人の再利用・差し替え → builtins 契約、(c) 利用者玄関 → assembly。テスト都合の公開は契約に数えない。実施 (棚卸し) は実装側課題 | DR-109 §7 追記 (公開面過剰の構造指摘)、本 DR §2 |
| #18 0-token 判定 | node 契約の消費数宣言 (データ) で判定する。node 種名の直書き列挙で判定しない | DR-041 §3 (消費数は報告値)、本 DR §3-2 |
| #19 wire decode | 各 installer 住人が自所有語彙分の decode を提供、engine は構造骨格 decode + 集約 orchestrator | DR-061 §2 (語彙正当性 = 所有集合の和 — decode 可能性も同じ所有で決まる)、DR-042 (所有権の粒度は属性単位) |
| #20 complete 走査 | 骨格は engine、候補メタの中身は opaque 運搬。利用者向け候補構造 (メタ語彙と形) は DR-060 §3 / DR-104 のまま不変 | DR-060 §1/§3、DR-104 §2/§3 |
| #21 front_door | assembly の顔 (§5)。engine は raw 契約、builtins は decode + lowering | DR-053 / DR-054 / DR-060 (3 契約)、DR-109 §7 追記 (一本道の玄関) |

### 7. VISION との接続

3 層構成は VISION §2〜§5 の構想の構造的な受け皿になる:

- **選択的 assembly (subset assembly)**: assembly が組成を所有する (§2-3) とは、
  「全部入り」以外の組成 — engine + 選択した builtin 住人だけの縮小組立 — が
  同じ登録経路で作れることを意味する。VISION §5 のコードジェネレータ (「定義上
  必要な installer やフィルタのみを import し、バンドルサイズを気にした最小コードを
  出力する」) と DR-040 の「未参照 parser は自明に dead-code」の tree-shake 原則は、
  この subset assembly が組成表を差し替えるだけで成立する。VISION §3 の極小バンドル
  モード (アプリは wrapper のみ、パースは kuu-cli へ委譲) にとっても、委譲先の
  kuu-cli 自身が「1 つの assembly」である以上、本 DR の 3 層はその品質保証
  (conformance の主語、§8) の土台になる
- **RPC クロージャ注入は extension interface の第 3 の消費者**: §2-2 の公開
  extension interface の消費者は (1) builtins 自身、(2) ホスト言語の 3rd party
  拡張、そして (3) VISION §4 の RPC クロージャ注入 — kuu-cli が RPC 越しの
  クロージャ呼び出しを proxy する住人を同じ経路で登録する形 — の 3 系統になる。
  builtins が特権経路を持たないこと (§2) は、(2)(3) が (1) と同じ品質で動くことの
  構造的保証である
- **descriptor によるシグネチャ export (VISION §4)**: 独自 filter の descriptor
  から import 先で interface / モックを生成する構想は、「住人が descriptor を持ち、
  engine は descriptor 契約だけ知る」(§3-6) という本 DR の境界と同じ線の上にある

### 8. conformance との関係

**既存 conformance fixture (DR-065 / DR-069) の検証対象は assembly (電池込み) で
ある。** fixture の definition は builtin 語彙 (long / short / env / type: "number" …)
を前提に書かれており、`parse-core` プロファイル (CONFORMANCE §0) の主語は
「canonical 電池を組成済みの完成品」— engine 単体はいかなる fixture も pass
できないし、それは欠陥ではない (engine は語彙を持たない、§2-1)。

- 実装が「kuu 準拠」を名乗る条件 (CONFORMANCE §0、parse-core green) は不変。
  準拠の主語が assembly であることを本 DR が明確化するだけで、fixture・
  プロファイル・green の規範 (§0.1) に変更はない
- **engine 単体の契約検証 (合成住人による extension interface の準拠 fixture 化)
  は将来課題**として明示する — 現時点では各実装の engine unit test の関心に留め、
  spec 側の fixture 体系には含めない。3rd party 拡張の生態系が実体化した段階、
  または多言語 2 実装目の engine 移植時に、契約検証の fixture 化を再検討する
  (射程外の節に記載、追跡 issue を波及で起票)

### 9. Rationale — なぜ今、spec 規範として立てるか

kawaz 裁定 (2026-07-16) の総コスト論: 参照実装のエンジン直書き特権を放置する
コストは実装リポに閉じない —

1. **UX への波及**: 公開面が過剰な core は、呼び出し側 (runner / kuu-cli / 将来の
   kuu-ux) が各自で部品を組み合わせる構造を生み、同じ definition で挙動が割れる
   (UX-Q7R で実際に露呈した — kuu-cli と runner の resolve 適用差は core の顔が
   一本でないことの産物であり、CLI 側の裁定で解ける問題ではなかった)
2. **多言語展開への波及**: 層境界が spec に無ければ、2 言語目の実装者は「どこまでが
   engine の契約でどこからが電池か」を参照実装のコードから逆算するしかなく、
   境界の再発明 (かつ実装ごとの不一致) が起きる。「移植の定義 = fixture を pass
   させること」(CONFORMANCE) は挙動を固定するが構造を固定しない — 構造の契約は
   DR でしか書けない
3. **マーケティング (spec の主張の実証) への波及**: kuu は「builtin に構造的特権は
   ない、3rd party は builtin と同じものが書ける」を spec で主張してきた
   (DR-028 / DR-094 / DR-061 / DR-095 / DR-107)。参照実装がその主張の反例
   (エンジン直書き) である限り、主張は動く証明を持たない。boundary survey が示した
   とおり、現行実装には matcher が count 型の increment 効果を直書きする等の癒着が
   実在し (PKG-#5)、「同じ interface で書ける」は未実証だった

また、参照実装が front_door 完成・conformance green の安定点にある今が、境界の
引き直しを fixture の保護下で行える最初の窓であり、v1 (DR-068) 前に層境界を
確定しておけば多言語展開の契約に破壊的変更を持ち込まずに済む。

## 採用しなかった案

### PKG-Q1 の非採用肢 — 閉じた node 列挙の維持 (engine が全 node 種を知る)

現状維持案。boundary survey の従属争点ほぼ全て (#2/#4/#5/#18 等) が engine 直書きの
まま残り、§2-1 の禁止事項が構造的に満たせない。「spec は特権なしと言うが実装は
特権前提」の非対称が恒久化する。

### PKG-Q1 の非採用肢 — AtomicAST を JSON 同型 struct に縮退させ、評価実装を builtin 側に閉じ込める

engine から評価器そのものが消え、DR-037/038/041 の評価器契約 (path 探索・読みの枝・
完全経路一意性) の持ち主が居なくなる。各 builtin (または各 assembly) が評価器を
再実装することになり、「機構は 1 つ、語彙は住人」という本 DR の分離原理と逆になる。

### PKG-Q4 の非採用肢 — 実装リポのローカル設計記録 (MDR) で済ませる

3 層構成を kuu.mbt の package 再編としてだけ記録する案。2 言語目に契約が届かず、
§9-2 の再発明問題が解けない。層境界は「全言語実装が従う能力要件」であり、
DR-108 の spec バンドルに乗る規範として spec 側に置く必要がある。

### PKG-#19 の非採用肢 — wire decode を丸ごと単一の builtin decode モジュールにする

decode を 1 モジュールに集約すると、3rd party installer が自所有語彙を wire に
足す経路が閉じる (decode の allowed-keys 表がその 1 モジュールの private 事情に
なる)。DR-061 §2 の「wire 語彙の正当性 = 登録済み descriptor の所有集合の和」は
decode 可能性も同じ所有分散で決まることを含意しており、集約案はこれと非整合。

### engine の結果セル (Entity 相当) を完全 opaque 化する (boundary survey #14 案 A)

結果セルを builtin 側の型にすると、engine が値源ラダー (§3-5) と結果構築 (§3-9) を
回せなくなる。PKG-Q2=a は「engine 最小 Entity (名前・席宣言等の骨格) + builtin
固有宣言は descriptor へ」であり、opaque 化 (engine が結果セルを扱えない) とも
現状維持 (30+ フィールドの carrier を engine が抱える) とも異なる中間が正。

## 波及

- **kuu.mbt**: package 分離の実装 (engine / builtins / kuu、§0 の通り物理形は実装
  裁量)。boundary survey の自明帰属表 + 本 DR の裁定表が作業指示になる。実装側の
  モジュール依存規約 (MDR-002 §3) の更新もここに含む — 実装 issue として起票
- **kuu.mbt / kuu-cli**: meta 束縛判定の外部 API 廃止 (#15) に伴い、front_door 外で
  sentinel を後処理していた消費者 (boundary survey が指摘する kuu-cli 側
  post-processing) は assembly の玄関 (§5) へ乗り換える。UX-Q7R の
  known-fail (single-exposure-ok) はこの乗り換えで自然解消見込み (DR-109 §7 追記)
- **spec**: engine 単体の契約検証 (合成住人 fixture) の将来課題 issue を起票 (§8)
- **docs/decisions/INDEX.md**: 本 DR の行を追加

## 射程外

- **engine 単体の契約検証の fixture 化** (§8 — 将来課題 issue で追跡)
- **extension interface の関数シグネチャの正規形**: install 契約・open node 契約・
  matcher 契約の言語別シグネチャは各実装の関心 (DR-042 射程外の姿勢を踏襲)。spec が
  固定するのは能力要件 (§3 の各契約が何を宣言・提供するか) まで
- **subset assembly の具体形** (コードジェネレータ / tree-shake の出力形、VISION §5
  の構想のまま)
- **RPC クロージャ注入の spec** (VISION §4 の構想のまま — 本 DR は登録経路が
  extension interface に一本化されることだけ規定)
- **wbtest / テスト専用可視性の言語別機構** (boundary survey #16/#17 の実装面 —
  各層 unit の置き場は実装裁量、conformance の主語だけ §8 が規定)

## 関連

- kuu.mbt `docs/findings/2026-07-16-engine-builtin-boundary-survey.md` (争点 21 件の
  一次資料、争点番号の正本)
- DR-028 (組み込み型 = 登録済みプリセット — 特権なしの原点)
- DR-094 (builtin ns は語彙区分であって特権区分ではない)
- DR-061 / DR-095 / DR-107 (descriptor 体系 — 全住人が自己記述する、宣言軸の正本)
- DR-042 (installer アーキテクチャ — 5 不変則・canonical set・matcher = データ)
- DR-041 (トークン読みの意味論 — matcher 契約・消費数報告の評価器側)
- DR-031 / DR-099 (値源ラダーの席順序 = engine 契約、tty preset の席内解決)
- DR-037 / DR-038 / DR-053 / DR-054 / DR-060 (engine 骨格が担う評価器・玄関 3 契約)
- DR-052 / DR-073 (結果構築の一般写像)
- DR-065 / DR-069 (conformance — 検証対象が assembly であることの前提)
- DR-109 §7 追記 (UX-Q7R — 一本道の玄関、本 DR の直接の駆動源)
- docs/VISION.md §2〜§5 (層構造・極小バンドル・RPC 注入・コードジェネレータ)
- docs/CONFORMANCE.md §0 (準拠プロファイルと green の規範)
