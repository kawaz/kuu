---
title: フェーズ2-③ parse fixture 蒸留台帳 (slice 167 テスト → 領域割り当て)
status: open
category: task
created: 2026-07-05T19:20:00+09:00
last_read:
open_entered: 2026-07-05T19:20:00+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: ROADMAP フェーズ2-③ (蒸留 + 参照実装の縦切り並行)。蒸留元 = slice PoC (kuu.mbt slice 枝、凍結)
---

# フェーズ2-③ parse fixture 蒸留台帳

## 概要

slice PoC の全テストブロック (phase1〜29、約 172 ブロック) を conformance **parse fixture** (`query:"parse"`、CONFORMANCE.md §2) の機能領域へ割り当てる作業台帳。フェーズ2-② で lowering fixture (`query:"lower"`、18 本) は installer 単体/組合せ/全収束を蒸留済みなので、本フェーズの主対象は **parse 意味論の fixture 化**。

蒸留元は読み取り専用。本台帳作成時点で slice への書き込みはしていない。

### サマリ

- **総テストブロック**: 約 172 (各ブロックは複数 argv ケースを内包、CONFORMANCE の「167 テスト」相当)
- **parse fixture 蒸留対象**: 15 領域 / 約 110 ブロック
- **蒸留非対象**: 約 55 ブロック (lowering fixture で被覆済み / installer 順列 runner 検査 / definition-error・completion の予約クエリ / エンジン内部)
- **effects 拡張が要る領域**: 1 領域 (value-sources — `source` タグ付き effects。CONFORMANCE §2 が「フェーズ2 で確定」と予約)
- **仕様確認が要る領域**: failure-actions (候補 def ポリシー軸 AcceptsOnly/WithHeld/DeepestOnly の wire 表現)

## 1. 領域分割表 (parse fixture 蒸留対象)

各領域 = `fixtures/<領域>/` の単位。行末 phase 参照は `phase<N>:<行>`。

### D1. path-search — `fixtures/path-search/`

DR-038/041 のパース意味論コア (完全経路の数 → success/ambiguous/failure、greedy 割り込み、フォールスルー)。

| slice テスト | 検証内容 |
|---|---|
| phase1:11 | 完全経路 0 本 → held Error 伴う failure |
| phase1:18 | 完全経路唯一 → commit |
| phase1:24 | 無制限 Many 2 本が両方全消費 → ambiguous(2) |
| phase1:78 | greedy が 2 positional の間に割り込む (porous 面) |
| phase1:88 | greedy が repeat 反復の間に割り込む |
| phase1:101 | 発火した value greedy は次トークンを無条件 raw 消費 (getopt 同型) |
| phase1:113 | 未定義 -x が string positional へフォールスルー |
| phase1:120 | 未定義 -x が number positional で値パーサ拒否 → held Error |
| phase1:130 | 親 greedy が子スコープの positional 消費を妨げない |
| phase1:147 | 可変アリティ option (3数値/1文字列) + 末尾受け皿 → ambiguous(2) |
| phase23:15 | 異位置で失敗する複数経路の Error 全保持、primary=最深 |
| phase23:30 | 同位置失敗は同深タイで両方 primary |

### D2. matcher-readings — `fixtures/matcher-readings/`

eq-split / short-combine / cluster の読み分割。ambiguity が定義依存であること。

| slice テスト | 検証内容 |
|---|---|
| phase1:36 | `-n1.0f` は -f 定義時 cluster 分割で ambiguous |
| phase1:50 | `-n1.0` は有効分割点なく単一読み |
| phase1:64 | `-n1.0f` も -f 未定義なら単一読みに潰れる (ambiguity は定義依存) |
| phase2:223 | long-space / eq-split / short-attach / short-next の 4 形が同一 cell に一致 |
| phase9:32 | 同 entity/source で value 違い → ambiguous (value が identity 成分) |
| phase23:59 | ambiguous 解釈が結果オブジェクト形で全列挙 (`-n1.0f`→`[{n:1,f:true},{n:1}]`) |

### D3. dd — `fixtures/dd/` (既存 2 本を拡張)

既存: `basic.json` (7 cases), `duplicate-decl.json` (1 case)。相互作用ケースを追加。

| slice テスト | 検証内容 | 備考 |
|---|---|---|
| phase2:202 | `--` 後 greedy 面遮断で読み反転 | basic.json で被覆済み (確認のみ) |
| phase6:11 | dd × global: コピーされた global option も子の dd で遮断 | 新規 |
| phase6:35 | 遮断境界は子の `--` 位置、それ以前は global 発火 | 新規 |
| phase17:65 | dd 内部の `--help` は raw 消費で help 非発火 | failure-actions とクロス |
| phase29:52 | 明示 dd 名 (`++`) で綴り差し替え、既定 `--` は素の positional | 新規 |

### D4. repeat — `fixtures/repeat/`

取り分選好 (greedy/lazy/backtrack)、min-max、porous、ref-template、separator×repeat。最大領域。

| slice テスト | 検証内容 |
|---|---|
| phase4:15 | `cp src... dst` 分割点は末尾トークン数で一意 |
| phase4:57 | greedy が repeat 反復の間に割り込む (途中挿入で unfold 継続) |
| phase4:80 | min:2 は head + 再帰 tail、不足時 fail |
| phase4:114 | 共有 or-template を ref する repeat の ambiguity 表出 |
| phase10:16 | greedy+greedy: 左 closure が最長取り (backtrack 不要で一意) |
| phase10:30 | lazy+greedy: 左 lazy で最短取りに反転 |
| phase10:47 | greedy が後続型制約失敗で regex 的 backtrack 再分割 |
| phase10:64 | 取り分選好は or 分岐構造差の ambiguity を消さない |
| phase14:34 | min:2 再帰 Ref tail (1個失敗/2個以上成功) |
| phase14:52 | max 有限 {1,3} は 4個目を消費不能で fail |
| phase14:71 | 厳密個数 {2,2} は過不足で fail |
| phase14:93 | 有界 greedy 2本も左が上限内最長取り |
| phase14:110 | 有界 lazy で最短取り |
| phase14:157 | unwrap_single: 0/1 配列を scalar に戻す opt-in collector |
| phase16:38 | separator×repeat: 各トークン分割 + 反復発火を flatten |
| phase16:53 | separator (repeat なし): 1トークンを append で分割リスト化 |
| phase7:47 | repeat の複数バインドが result で 1 リストに平坦化 |
| phase7:56 | 名前付き command scope 内 repeat はネスト+平坦化両立 (command-scope とクロス) |

### D5. multiple — `fixtures/multiple/`

accumulator append vs scalar last-wins、empty variant。

| slice テスト | 検証内容 |
|---|---|
| phase7:15 | multiple option の複数発火は append でリスト化 (1回でも要素1件) |
| phase7:25 | 非 accumulator は複数発火でも last-wins scalar (対比) |
| phase7:75 | multiple option + repeat positional が同一 result で独立リスト化 |
| phase13:143 | empty variant (`--clear-tags`) が蓄積コレクションを空にリセット (variant-effects とクロス) |

### D6. command-scope — `fixtures/command-scope/`

subcommand 入場 / global コピー / shadowing / inherit / 早閉じ / 入れ子 / 結果ネスト。大領域。分割検討: 早閉じ (early-close) を `fixtures/command-scope/early-close/` に、global/shadowing を `/global/` に副領域化してもよい。

| slice テスト | 検証内容 |
|---|---|
| phase3:13 | subcommand が greedy trigger 発火 → 自前背骨に入る |
| phase3:37 | global 宣言 option が子スコープへ構造コピー |
| phase3:54 | global shadowing: 子が同一トリガ宣言でコピー抑制 |
| phase3:73 | inherit: ladder cli>env>inherit>default で最近祖先値を継承 |
| phase3:121 | inherit 元なしなら子自身の default に落ちる |
| phase6:53 | global が孫コマンドまで多段伝播 (fixpoint) |
| phase6:70 | shadowing はレベルごと、中間スコープ自前宣言で subtree ブロック |
| phase7:35 | subcommand は result をコマンド名の下に 1 段ネスト |
| phase8:13 | 親子同名 option: 最内 readable が勝つ (`build --out X`) |
| phase8:25 | root で先に readable なら root 発火 (`--out X build`) |
| phase8:40 | 子が読めない次要素なら閉じて親が再開・消費 |
| phase8:58 | 3階層で孫が読めない option を中間コマンドが消費 (再帰早閉じ抑制) |
| phase8:78 | global コピーで子 readable 化 → 早閉じ抑制で一意 |
| phase11:10 | global option は子内発火でも root entity へ束縛 (子セル新設なし) |
| phase11:24 | 値持ち global も root cell へ同期 |
| phase19:25 | 3段: 中間が別名+同トリガ shadow → 孫に root コピー伝播せず |
| phase19:43 | 3段: 同名+同トリガでも判定はトリガ依存 |
| phase19:55 | 3段: 同名+別トリガは shadow せず root コピー正常伝播 |

### D7. inheritable — `fixtures/inheritable/` (DR-059、command-scope の下位)

祖先スコープへの逆方向コピーと固定 prefix 綴り。

| slice テスト | 検証内容 |
|---|---|
| phase27:17 | inheritable が自スコープ `--ttl`・祖先 `--sub-ttl` の両綴りで効く |
| phase27:33 | 祖先綴りは深さで伸びず全階層同じ `--sub-ttl` |
| phase27:61 | 祖先書込み値が配下 default (inherit 席)、自スコープ CLI が優先 |
| phase27:98 | 祖先が同綴り自前 option を持つと inheritable コピー抑制 (自前優先) |
| phase27:128 | prefix 付き `--sub-ttl` が long installer と合成 (space/eq-split 両形) |

### D8. constraints — `fixtures/constraints/` (DR-055/047)

required / requires / exclusive_group / conflicts_with / value_requires。

| slice テスト | 検証内容 |
|---|---|
| phase21:46 | required positional は success で必ず値持ち、値なしは経路不成立 (absent とクロス) |
| phase23:45 | error kind 3値: parse (型不一致) / filter (post_filter reject) / constraint (required 未充足) |
| phase25:15 | constraint installer 不在で unknown-vocab、順列で結果不変 |
| phase25:42 | requires: committed + 目的語 (値の有無) 不足で違反、default 充足なら OK |
| phase25:74 | conflicts_with: 片側宣言で双方向、両 committed で衝突、unset 取消で非衝突 (variant-effects とクロス) |
| phase25:114 | 同ペアが exclusive_group と conflicts_with 両方宣言 → 両述語独立発火で 2 errors |
| phase25:133 | value_requires: committed 分岐 (`format=json`) でのみ発動、default 値では非発動 |
| phase25:171 | constraint が 2 完全経路の一方を落とし残り 1 本確定 (制約なしなら ambiguous) |

### D9. variant-effects — `fixtures/variant-effects/` (DR-045 4 op: set/default/unset/empty)

効果記述子の op 語彙。**effects の op フィールドは CONFORMANCE §2 に既にあり拡張不要**。

| slice テスト | 検証内容 |
|---|---|
| phase13:82 | set variant (`--gzip`) が operand 伴い発火 (`compress=set(gzip)`) |
| phase13:103 | unset は ladder 開放 (env 後勝ち)、set/default は commit (env 無視) |
| phase13:143 | empty variant がコレクション clear (multiple とクロス) |
| phase18:37 | long/short 同一 cell 発火: 効果列順序保存 + scalar 後勝ち |
| phase18:52 | global の root 入口 + command 内コピーが別トークン発火 → 後勝ち |
| phase25:74 | unset で conflict 取消 (constraints とクロス) |
| phase26:52 | long alias が base+variant 再導出 (alias とクロス) |

補足: phase13:22 (同 cell 同値 op 違い → ambiguous)、phase13:37 (同一 effect merge) は手組み `EffMark` を使う。wire 表現は variants 宣言経由で蒸留可 (要検討、下記 §4)。phase13:9 (committed 導出) は純関数テストで INTERNAL。

### D10. failure-actions — `fixtures/failure-actions/` (DR-048)

help/version 発火、argv-minimal 勝ち、ambiguous 非発火。**要仕様確認あり (§4)**。

| slice テスト | 検証内容 |
|---|---|
| phase17:37 | help 先行+後続失敗 → 全候補 def で help selected 発火 |
| phase17:50 | 失敗トークン先行 → help 到達不能で非発火 |
| phase17:65 | dd 内部 `--help` raw 消費で非発火 (dd とクロス) |
| phase17:85 | 2 failure-action は argv 消費位置最小が発火 |
| phase17:108 | help 発火後 number positional 失敗 → 候補 def 3案が分岐 |
| phase17:130 | 先食みで help を通る全経路発火 → WithHeld==DeepestOnly |
| phase18:15 | ambiguous (完全経路 2本) は help selected でも failure-action 非発火 |
| phase23:76 | 発火 action (argv 最小) と retain Error (primary=最深) が 1 Failure に両立 |
| phase23:90 | failure に help_entry / tried_triggers フィールドが載る (Did you mean 素材) |

### D11. value-sources — `fixtures/value-sources/` (**要 effects 拡張**)

env / config / inherit / default のラダー。**CONFORMANCE §2 が「parse fixture の effects は cli source のみ、ラダー充填は result 側検証、source 付き effects 拡張はフェーズ2 で確定」と予約している唯一の拡張要領域**。source タグ (cli/env/config/inherit/default) を effects に載せる語彙拡張が前提。

| slice テスト | 検証内容 |
|---|---|
| phase2:133 | env ladder cli>env>default |
| phase3:73 | inherit ladder (command-scope とクロス) |
| phase13:103 | unset が ladder 開放し env 後勝ち (variant とクロス) |
| phase20:44 | 4値源 ladder cli>env>config>default、source タグ保存 |
| phase20:94 | config_key 未指定要素は同型 path (scope path+name) 探索、不一致で default |
| phase20:120 | config 値の型寛容が双方向対称、bool↔number/array→scalar は Error |
| phase20:173 | config 配列→multiple piece、object→config_key 同型ナビ |
| phase20:196 | 整数値 number→string で `1.0`→`"1"` (実装選択) |
| phase20:218 | config_file 自身のパスも cli>env>default ラダー |
| phase20:252 | committed パス読込失敗は Error、default 由来パス失敗は黙認 |
| phase21:81 | config JSON null は「供給なし」でラダー通過 (default/absent へ) |
| phase21:107 | int 型は整数のみ、非整数 1.5 Error、文字列も整数構文のみ |
| phase21:130 | number は 1.5 許容、int は Error (数値 3 種対照) |
| phase27:61 | inheritable の inherit→default (inheritable とクロス) |

補足: config-file 系 (phase20:94/196/218/252/275、phase21:81/107/130) は量が多いので `fixtures/value-sources/config/` に副領域化を推奨。phase20:275 (config_file が config_key を持つ循環禁止) は definition-error 寄り (§3)。

### D12. export-key — `fixtures/export-key/` (DR-052)

export_key 上書き / null 透過 / 衝突。

| slice テスト | 検証内容 |
|---|---|
| phase22:15 | export_key 文字列が結果キーを name 由来から上書き |
| phase22:26 | export_key null (option) は kv 結果から消えるが値は発火・伝搬 |
| phase22:44 | export_key null (array 要素) はキーのみ消え値は bare 要素で残る (形不変) |
| phase22:69 | export_key null (command) はスコープキー除去、子が親へ昇格 |
| phase22:97 | export_key `""` は null へ正規化 (同じ透過挙動) |
| phase22:116 | export_key は link/id と直交 (合流不変、キーのみ変化、alias とクロス) |
| phase22:143 | 同一 export_key の 2 要素が両露出 → 実行時 ambiguous 衝突 |

### D13. absent — `fixtures/absent/` (DR-051)

absent (キーごと消える) の輪郭。

| slice テスト | 検証内容 |
|---|---|
| phase21:15 | 値源なし要素の未指定は absent (null でも 0 でもなくキー消失) |
| phase21:30 | default 保持要素は常に present (source=default)、absent にならない |
| phase21:37 | repeat 要素は 0 発火でも `[]`、absent にならない |
| phase21:59 | absent 要素の meta は roster+bindings 側で問合せ可 (2層分離、一部 ctx query は INTERNAL) |
| phase22:131 | selected scope は子 absent でも `{}`、unselected は absent (export-key とクロス) |

### D14. alias — `fixtures/alias/` (DR-057/058)

alias の canonical 束縛・再導出・deprecated。

| slice テスト | 検証内容 |
|---|---|
| phase26:34 | short alias が canonical cell へ、結果キーは canonical、後勝ち |
| phase26:52 | long alias が name 由来 base + variant を新名で再導出 |
| phase26:79 | 明示 `long:[]` 上書きで継承 variant を切る (素の base のみ) |
| phase26:122 | command alias が canonical subtree に入る、結果キー canonical |
| phase26:162 | deprecated alias は受理+canonical 束縛+warning、非 deprecated 入口は無警告 |
| phase26:185 | alias 入口が canonical を commit させても実体側 requires 発動 (constraints とクロス) |

### D15. name-surface — `fixtures/name-surface/` (DR-071/022、phase29 由来)

主入口記法 `:set` の name 由来トリガ生成と kebab-case 正規化 (parse 観測)。

| slice テスト | 検証内容 |
|---|---|
| phase29:17 | `:set` が `--<name>` トリガ生成、未発火時 preset default false |
| phase29:26 | snake_case 名 → kebab-case トリガ (`--dry-run`、`--dry_run` は fail) |
| phase29:35 | 明示綴り (`:set` 以外) は normalize 素通し |

## 2. 各領域の蒸留メモ (規模・型の適合)

CONFORMANCE §2 の outcome union (success{effects,result} / failure{errors,fired_action} / ambiguous{interpretations}) がそのまま使える。dd の `basic.json` (7 cases/1 file) が粒度の基準。

| 領域 | 推定 fixture 数 | 推定 cases | dd 確立型の適合 |
|---|---|---|---|
| path-search | 3-4 | 12-15 | そのまま (success/failure/ambiguous 全出現) |
| matcher-readings | 2-3 | 8-10 | そのまま (ambiguous interpretations 語彙を使う) |
| dd | 既存2 + 2-3 | +5 | そのまま (basic 既存) |
| repeat | 5-6 | 20+ | そのまま (取り分選好は result の配列で表現) |
| multiple | 1-2 | 5 | そのまま |
| command-scope | 5-7 | 20+ | そのまま (result のネスト構造で表現) |
| inheritable | 1-2 | 6 | そのまま |
| constraints | 2-3 | 8-10 | **reason 拡張が活きる** (`<属性名>_violated`、DR-066)。fixture では optional 検証 |
| variant-effects | 2 | 7 | そのまま (op フィールド既存) |
| failure-actions | 2-3 | 10 | fired_action フィールド既存。**候補 def 軸は要確認 (§4)** |
| value-sources | 3-4 | 15+ | **要拡張: source 付き effects** (env/config/inherit/default)。CONFORMANCE §2 の予約事項 |
| export-key | 1-2 | 8 | そのまま (result のキー構造)。衝突は ambiguous 型 |
| absent | 1 | 5-7 | そのまま (result のキー欠如で表現) |
| alias | 2-3 | 7 | そのまま (result キー canonical + warnings)。**warnings フィールドが未使用語彙 (deprecated)** |
| name-surface | 1 | 3 | そのまま |

### 拡張が要る語彙 (未使用の期待値語彙)

1. **effects の source タグ拡張** (value-sources): 現状 `source:"cli"` のみ。env/config/inherit/default を effects に載せるか、CONFORMANCE §2 通り result 側で ladder 検証に留めるか、フェーズ2 で確定する。**この確定が value-sources 蒸留の前提**。
2. **reason コード** (constraints/failure/value-sources): DR-066 の `<属性名>_violated` / `too_small` 等。fixture では optional 検証なので段階導入可。
3. **warnings フィールド** (alias deprecated): phase26:162 の deprecated 警告。CONFORMANCE §2 の outcome union に warnings は未記載 → 追加要否をフェーズ2 で確認。
4. **fired_action の候補 def 軸** (failure-actions): §4 参照。

## 3. 蒸留しない (非対象) テストと理由

| テスト群 | 理由 |
|---|---|
| phase2:109 (24順列), phase3:190 (5040順列), phase20:74, phase26:146, phase27:112 | installer 順列一致 = **lower runner 組込みの順列検査 (DR-070 §3) で被覆**。fixture に順列を列挙しない |
| phase2:33 (idempotence), phase2:57 (inert declaration) | installer 冪等・宣言層 inert = DR-042 ①' のエンジン内部。lowering baseline で概念被覆 |
| phase4:40, phase13:53, phase14:128, phase26:107, phase29:44/63/77 | canon 構造比較 (LOWER) = **既存 fixtures/lowering/ で被覆済み**。repeat template/variant lowering/optional=repeat identity/short 非継承/dd 配置非依存/global 子 entity 不生成 |
| phase2:74/92, phase3:148, phase4:145, phase14:177, phase20:275, phase24:8/28/45/59/77 | definition-error (DR-054): unknown-vocab / vocab-intersection / zero-progress / invalid-range / absent-ref / circular-ref / config 循環。**`query:"definition_error"` は CONFORMANCE §1 で予約、フェーズ2 内で別途確定** |
| phase28:16/34/56/76/94/111/130/151/181 (9件) | completion (DR-060): **`query:"complete"` は予約**。parse evaluator と別走査 (dead-end 除外 / pending 値 / 終端ヒント)。completion fixture として別種蒸留 |
| phase15:9/21/34/50, phase12:92 | result-shaping (DR-044 from_entries/KeyPromote): rval 変換を直接テスト (parse を経由しない)。result builder 内部。export-key 領域の周辺だが parse fixture の対象外 |
| phase9:6/16/24/32, phase11:35/44, phase13:9/22/37 | effect-identity エンジン内部: 手組み scope (`flag×2` / `Rooted` / `EffMark`) で merge/distinct 原理を検証。**原理は dd/duplicate-decl.json で既に蒸留済み**。wire 表現可能な重複トリガ宣言のみ D9 で拾い、手組み内部は非対象 |
| phase12:43/59/76 | authsock 生 AtomicAST の pre_filter 境界: 手組み IdxRepeat 入れ子の negative-control。エンジン内部の pre_filter 実測。仕様輪郭としては repeat 領域が被覆、優先度低 |
| phase16:14 | oracle 既知限界: サブコマンド内 repeat の完了判定が scope 境界を誤認する既知バグの観測記録。**DR-070 §1b の KNOWN GAP 台帳に属す**。仕様準拠 fixture ではなく実装ギャップ記録 |

## 4. 要確認事項 (蒸留前に決める)

1. **value-sources の effects 拡張** (最優先): source タグ (env/config/inherit/default) を effects に載せるか result 検証に留めるか。CONFORMANCE §2 の予約を解消しないと D11 (14 ブロック) が着手できない。
2. **failure-actions の候補 def ポリシー軸**: phase17 の AcceptsOnly / WithHeld / DeepestOnly は「どの候補経路集合で failure-action を評価するか」のエンジンポリシー軸 (DR-048)。これが wire form の定義に載るのか、runner/プロファイル (DR-069) 側の設定なのか未確認。phase17:108/130 はこの軸で挙動が分岐するので、fixture の表現方法を決める必要がある。
3. **warnings フィールドの outcome union 追加要否**: alias deprecated (phase26:162) の警告を fixture で検証するか。CONFORMANCE §2 に warnings は未記載。

## 5. 優先順位 (提案)

仕様の中核 (path-search 意味論・matcher 読み) から着手し、既存型で素直に蒸留できる領域を先に片付け、拡張・確認が要る領域を後回しにする。

1. **第1波 (中核・拡張不要)**: D1 path-search → D2 matcher-readings → D4 repeat → D6 command-scope。パース意味論の骨格。既存 outcome union で完結。
2. **第2波 (中核・軽い拡張)**: D9 variant-effects → D8 constraints (reason optional) → D10 failure-actions (§4-2 確認後) → D5 multiple → D7 inheritable。
3. **第3波 (要拡張)**: D11 value-sources (§4-1 の effects source 拡張確定が前提) → D12 export-key → D13 absent → D14 alias (warnings §4-3) → D15 name-surface。
4. **第3波と並行可 (非 parse クエリ)**: definition-error (`query:"definition_error"`) と completion (`query:"complete"`) の fixture 形式確定 + 蒸留 (phase24 / phase28 が元)。ROADMAP フェーズ2-③ が「`definition_error` / `complete` の fixture 形式もこの中で確定」と明記。

第1波は既存 `fixtures/dd/basic.json` と同じ型でそのまま書けるので、最小 runner (フェーズ2-①) の実食対象を早く増やせる。
