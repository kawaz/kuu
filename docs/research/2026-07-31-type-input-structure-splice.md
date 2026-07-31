# 型入力構造の splice — type が kuu 定義片で自分の消費文法を宣言する

> 由来: kawaz チャット議論 2026-07-31 (ccmsg r98 mid=8〜10)。発端は「`--timerange TIMERANGE` が
> string (`5m..now`) と pair (`[since, until]`) のどちらでも受けられる構造を descriptor でどう書くか」。
> tuple 型を value-type 体系に足す案 (統括提示) に対し、kawaz が「pair は kuu の positionals で
> 書けば良いのでは」と反転させた。DR 起草前の下敷き。record 型 (DR-126、出力側) とは独立で、
> こちらは**入力側**の機構。

## 0. TLDR

type は自分の CLI 消費文法を **kuu の wire 定義片 (or / seq / typed leaves)** で宣言する。
値スロットに当該 type が現れたら定義片を lowering 時に **splice** (template / preset 展開と同位相)、
sub-parse の結果 (or → union、seq → kv) を value_parser が受けて宣言済み出力型 (record 等、DR-126)
の JSON に変換して返す。tuple 型は不要になる (pair は定義片の seq がそのまま表す)。

## 1. 確定した骨格 (チャット裁定)

1. **入力宣言は kuu 定義片** (mid=9): 例 — timerange の入力は
   `{"or": [[{"name":"range","type":"string"}], [{"name":"since","type":"string"},{"name":"until","type":"string"}]]}`。
   1 トークン形と 2 トークン形の曖昧性解決は既存の or 枝選択 / Reject / バックトラック /
   variable-arity 機構がそのまま担う
2. **展開は lowering 時の splice** (mid=10): template / preset 展開と同位相。type preset が既に構造を
   注入している前例 (flag → bool + default、config_file → config 配線、tty → default 席規則) の一般化
3. **隔離境界 (sealed scope)** (mid=10): 定義片の namespace はそこで閉じる —
   - 定義片内から descriptor 外への link / ref 参照は不可
   - 定義片内の export_key は内部消費 (value_parser への入力の組み上げ) 専用で、外の result に漏れない
   - 「そのまま展開」ではなく隔離小世界。唯一の出力は value_parser へ渡る構造化 Value
4. **env 供給は string 枝のみ** (mid=10): env は string 1 本。それがパース不能なら受け入れ不可 (Reject 系)。
   sub-parse (トークン消費文法) は CLI 専用の概念
5. **config 供給は sub-parse を通らない** (mid=10 で統括理解に異議なし): 構造化 JSON は value_parser の
   入力へ直行。io_type.input (value-type 体系) は「供給値の形」の宣言として残り、定義片は
   「CLI トークン文法」の宣言 — 2 つは別軸で並ぶ
6. **拡張型の価値** (mid=10): 追加タイプが「type 名 + 構造宣言」でリッチな IO を持て、
   description 散文への依存が減る

## 2. 未確定の設計課題 (DR 起草前に詰める)

- **help 生成との整合** — 分析済み (2026-07-31、fable5-low 分析を統括が実物裏取り)。
  **結論: 既存 value_structure 表示への完全委譲で新規範ほぼゼロ**:
  - 決定的な先例 = `help_category` preset (DR-113 §2.3): 「type descriptor 由来で注入された構造が
    `value_structure` として help model に射影される」規範が既に存在する。splice はその一般化
  - 1 行合成 `<RANGE | <SINCE UNTIL>>` は DR-115 §5.1 `value_structure_style: "auto"` の既定挙動として規定済み
  - sealed scope が閉じるのは ref/link/export_key/result への露出であり、表示メタ (value_name、
    name からの uppercase 導出) は元々結果非露出 — fragment leaf の name を usage プレースホルダに
    使うのは既存規範と無矛盾。新概念不要
  - 「type 側が help 表示文字列を明示する」案は不採用 — DR-113 が「usage 一行文字列を model に含める」を
    却下済み (素材/policy 分離)。上書き需要は既存語彙 (value_name / help_value_structure_style) で充足
  - DR 起草時に決める残り: (i) registry 宣言 type を model の `types` 集約に載せるか (id namespace が
    definitions 側と未規定、v1 は inline 固定でも成立)、(ii) 位相の pin 文言 (help_query の読む断面に
    input_structure 由来構造が乗る — DR-113 §2.3 と同じ書き方)、(iii) fragment 内 repeat の可否
    (sealed scope 語彙範囲と連動)、(iv) ネスト splice の model 表現 (type_ref ネストで可能、可否は
    sealed scope 規則に従属)
- **補完**: 定義片内の枝・typed leaf の補完候補が外の補完機構にどう合流するか (splice なら
  構造は見えるはずだが、sealed scope の名前が候補 origin にどう出るか)
- **sealed scope の精密規則**: 定義片内で使える語彙の範囲 (installer 所有語彙はどこまで /
  定義片内の definitions は持てるか / ネスト = 定義片内の typed leaf がさらに定義片持ち type の場合)
- **descriptor での置き場**: `io_type.input` (value-type、供給値形) とは別軸の新フィールド
  (仮: `input_structure`、wire.schema の部分集合を参照)
- **既存 type (string/number/bool 等) との関係**: 定義片を持たない type は従来どおり 1 トークン消費
  (デフォルトの縮退形)。定義片は opt-in

## 2b. 追記 (2026-07-31 続き): link path 部分書きとの分界 (ccmsg mid=11 + セッション内問答)

- **入力側への部分注入はしない**: link path の書き先は常に**出力 record の座**。「入力が揃うまで
  パース保留 ([undefined, until] の in 候補バッファ)」という第 3 の状態は作らない — effects 時系列にも
  ラダーにも席が無く、Reject の発火時点が原因操作から遅延して args_pos 帰属 (DR-037) が壊れるため。
  sub-parse (入力世界) は CLI トークン消費に閉じ、link path (出力世界) とは交わらない
- **時系列適用が全ケースを決める** (DR-029、裁定不要の系): `--until X` のみ → vivify で `{until: X}`、
  パースは起こらない / `--until X --since Y` → 座ごと set 更新 / `--until X --timerange Z` →
  Z の parser 産出がセル値を丸ごと置換 (部分書きは消える) / 逆順 → parser 産出の上に座だけ更新 /
  unset → 既存 DR-045 (record 専用規則は不要)
- **`{until}` だけで終わっても正当値** (kawaz 確認済み): presence-optional closed record の適合値。
  sources は Q4=a の座単位 (`timerange: {until: "link"}`)、since は absent でキーごと消滅。
  「since が必要」はアプリ制約の領分 (requires / final_filters)
- **organic 組み上げ値と parser 産値は無差別** — 保証の対応: parser 産 → 乖離検査 (DR-126 §4) が
  宣言適合を保証 / link 組み上げ → 宣言外キーへの set は静的パス検査で definition-error、
  座への set 時に operand が**フィールド宣言型で pieceProcessor を通る** (既存値パイプラインの自然延長)。
  どちらの経路でも「closed record 宣言に適合する値しかセルに座れない」が成立する
- **presence 導出は宣言駆動** (mid=14 で裁定、RECFLD-Q1 は reframe で解消): record 専用の presence
  マーカーは新設せず、フィールドの presence は**定義片 leaf の既存宣言 (default / required / repeat)**
  から DR-051 §3 の既存規則をそのまま機械適用して導出する。`{number, default: 80}` → T /
  required → T / `{string, repeat:{min:0}}` → 配列 T / 素の宣言 → T? / 宣言する場が無いもの
  (定義片を持たない provider 系の out record) → T? が正直な既定。blanket 規則 (全 T? / 全必須) は無い
- **定義片 default × organic 部分書きは「無橋」で確定** (mid=16 の帰結、2026-07-31): 各経路は自分の
  既存規則どおり — sub-parse 経路は定義片セルのラダーが普通に回る (default 充填あり) / parser string
  経路は産出がすべて (timerange の string 形は `-5m..` / `..now+5m` のような部分 range を正規に産む —
  部分 presence は parser 産出として普通の値) / organic 部分書きは vivify の器 `{}` のみで default 橋なし。
  型導出は経路間の保守側 (全経路で保証できる宣言だけ T、素宣言 = T?)。定義片 default と string 経路の
  整合は型作者の責任 (乖離検査の対象外、lint ヒント候補)
- **フィールド契約の置き場** (mid=12 で確認): timestamp (in: string|number → out: number) のような
  in 契約が住むのは**入口側** — `--until` 単体入口の `type: timestamp` と、input_structure 定義片の
  leaf `until` の `type: timestamp`。record 宣言に住むのは out 形 (`{until: "number"}`) だけで、
  フィールドに parser 名は書かない (DR-126 採用しなかった案 (b) は不変)。「until 単体でも
  timerange 一発でもパースと out 契約が同じ」は、両入口が同じ type を宣言することで成立し、
  合流点が record の out 型になる

## 2c. 追記 (2026-08-01): out.record が型導出の正本 / フィールド型 = type 参照 / type レジストリ継承 (mid=21/22)

- **RECP-Q1 は解消 (前提が誤り)**: input_structure は入力パーサ用であって**型導出に関与しない**。
  値セルの型は **out.record だけを見る**。presence は out.record の presence-optional のまま (= `T?`)。
  §2b の「presence は定義片 leaf の宣言から導出」という記録は mid=16 起点の統括 framing で、
  mid=21 が明示的に覆した — 定義片の required/default から T を導く発想自体を採らない
- **record フィールドの型は kuu type 参照で書く** (mid=21): `out: {"record": {"since": "timestamp",
  "until": "timestamp"}}`。number / string / bool も「組み込みで提供される普通の registry type」であり
  特別な語彙ではない (bool と string しか使わない定義なら number は登録なし = tree-shaking しても
  動くべき、mid=22)。DR-126 起草時の「フィールド値型に parser 名参照を持ち込まない」は
  mid=3 の JSON 閉域 (= **値**が JSON 表現可能という制約) をフィールド**語彙**の制約と誤読した
  統括の発明で、破棄する
- **sealed scope が閉じるのは ref/link の名前・binding 空間であって type レジストリは継承される**
  (mid=22): 部分パースは「パーサを派生させて binding をクリアした奴で読む」— type レジストリは
  派生先に継承される含意だった
- **型依存**: timerange 型は timestamp 型に依存する — timestamp が type レジストリに未登録なら
  timerange は使えない (unknown-vocab 系の definition-error)。型は依存グラフを成す
- **link 注入時のパースはフィールドの type が担う**: `link: "tr.until"` の operand は until 座の
  型宣言 (`timestamp`) のパーサで文字列パースされてから座る。§2b「set 時 operand がフィールド
  宣言型の pieceProcessor を通る」の「宣言型」の実体は type 参照 — 入口側の type 宣言でなく
  **フィールド側の type が正**
- **JSON 形の導出**: record を読む消費者 (codegen / lint) は各フィールドの type の out を再帰的に
  辿って JSON 形を得る (timestamp → number)。registry 解決が前提になる

## 2d. 追記 (2026-08-01): 二重独立設計 (fable / sol) の突き合わせ結果

kawaz 指示 (mid=23/24) により fable5-high と codex-sol-worker へ**独立に**設計させ統括が突き合わせた。
主要 13 点で両案が独立に同結論へ収束 — 収束点は導出として採用確定 (次の DR-128 起草の正本):

1. 軸名 **`input_structure`**、descriptor トップレベルの optional 軸 (io_type と並ぶ、`type_parser` 限定)
2. 値は wire 構造語彙の閉じた部分集合 (schema は wire.schema への $ref、語彙制限は定義時検査層)
3. 定義片なし = 1 トークン string 縮退。暗黙 raw-string 枝は足さない (1 トークン形も欲しければ枝で明示)
4. **io_type.input の string 固定を撤廃** — 定義片産出形・env string・config 供給形の和を宣言。
   定義片から導出した産出形が input 宣言域に含まれなければ definition-error `invalid-range`
   (「宣言 vs 宣言」の定義時静的検査 — DR-126 §4 の runtime Error とは別位相)
5. splice は lowering 同位相 (template/preset と同じ)。sub-parse は局所で outcome を確定せず
   消費候補を外側 path-search へ返す — 完全経路 0/1/2+ の最終判定は外側 (DR-038 不変)
6. sealed scope: lexical chain は定義片 root で終端 (外→内・内→外とも不可視)、内部完結の ref/link 可、
   **definitions は持てない** (共有構造は registry 型切り出し)、export_key は内部消費専用
7. 外部界面語彙 (long/short/env/config_key/global/alias/commands/dd/on_failure 等) は
   definition-error `invalid-range` (wrong-seat 系、inert 許容にしない — 型作者の bug を隠すため)。
   定義片 leaf のラダーは「CLI 消費 > default」の 2 段
8. leaf type 未解決 = `unknown-vocab` (wire の warn+string フォールバックと非対称 — 名乗る側の宣言)
9. ネスト splice 可・深さ上限なし、`input_structure` 経由の型依存循環 = `circular-ref`
10. repeat / multiple / accumulator は定義片内で可 (既存 lowering 機構そのまま)
11. 観測面: 定義片内セルは内部セル族 (effects/result/sources 非露出)、外側セルへ 1 set
    (source は入口どおり)、失敗は原因トークンの args_pos に帰属、errors[].element は外側 entity
12. help: value_structure へ完全委譲 (or/seq/repeat/single/type_ref への写像 pin、DR-113 §2.3 の一般化)。
    **types 集約に registry 型も載せる** (id = 解決に使った参照綴り、model 内で衝突しない)。
    descriptor の description は types[].help に写さない (実装者向け自己記述のため)
13. 補完: 候補 origin は外側値セル entity、type/completer は leaf 宣言由来、内部名は漏らさない

**裁定確定 (2026-08-01 checkbox + mid=26)**: SPL-Q1 = a (constraint 4 種可、sealed 内解決・sub-parse 経路のみ評価)。
SPL-Q2 = **a + b 両採用** — `builtin/struct` (identity) が splice 機構の pin とユーザ機能を担い、
`fixture/*` residents が変換系 parser 挙動 (string 形正規化・部分 range・乖離 Error 近傍) の pin を担う
(役割直交、kawaz「どう思う」→ 統括分担案を承認)。SPL-Q3 = a (descriptor 内型参照は registry のみ —
DR-126 §1 の解決順文言を修正)。MISC-C1 両承認 (DR-029 追補文は「構造を名乗っていれば」へ一般化 /
TTYCYG = tty_provider の cygwin 観測削除を確定)。

相違 3 点 (裁定済み、経緯):
- 定義片内の constraint 4 種 (requires 等) — fable: 可 (sealed 内解決、無橋と同じ型作者責任) / sol: 禁止
- conformance ビークル — fable: `builtin/struct` (identity parser の configurable factory、ユーザ価値あり) /
  sol: fixture 専用 residents (`fixture/*` ns を CONFORMANCE 宣言)
- descriptor 内型参照の解決空間 — sol: registry のみ (使用側 definitions で shadow されない =
  descriptor の意味が使用側非依存) / fable: 使用側解決文脈 (definitions → registry、DR-035 対称)。
  ※ 採用側によっては DR-126 §1 の解決順文言の修正が要る

統括判断で確定した細部: greedy 割り込みは配置の既存規則そのまま (option 値スロット = 一体消費 /
positional 配置 = 背骨割り込み可 — 新規則ゼロの fable 案。sol の一律一体消費は新規則になるため不採用)。
default_fn は定義片内で可 (解決は sealed 内で完結、外を指せば absent-ref 静的 — sol の observes 抜け道
懸念は sealed 解決が塞ぐ)。out.record 側の型参照循環は DR-126 §1 改訂済み (v1 全面禁止) が正。

- DR-126 (出力側の record 型 — 本機構の出口の型宣言)
- DR-107 §3 (value-type 体系 — tuple 不要になった経緯はこのノート §0)
- docs/research/2026-07-28-link-fixed-path-dsl-design.md §4b (record 裁定の正本)
- DESIGN §12b / DR-099 (type preset が構造・挙動を注入する前例)
- DR-030 / DR-046 (nameless 子・実体だけノード — 定義片内の leaf の座)
- fixtures/path-search/variable-arity-ambiguous.json (可変 arity 曖昧性の既存 pin)
