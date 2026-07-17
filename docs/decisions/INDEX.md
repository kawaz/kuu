# DR Index

引数定義 AST 設計の決定記録 (Design Record) 一覧。各 DR の Status / Superseded 関係は本体ファイル末尾を参照。

## パース意味論

- [DR-021](DR-021-longest-match-and-ambiguous.md): 露出キー一意性検査は実行時、静的バリデータは warn のみ — パース成功条件は updated by DR-038 (完全経路一意性に再定義)
- [DR-037](DR-037-filter-reject-error-and-branch-resolution.md): filter の Reject/Error 区別、解けた枝の数による結末分類
- [DR-038](DR-038-parse-semantics-path-uniqueness.md): パース意味論の確定 — 「完全経路の一意性」を契約に、長い経路を優先する規則は持たない、実装契約は bounded path-search
- [DR-041](DR-041-token-reading-semantics.md): トークン読みの意味論 — 読みは枝 (多重 Accept)、greedy は面で優先 (先食い)、prefix ガード非採用、dashdash は再スコープ化
- [DR-048](DR-048-failure-time-action.md): 失敗時アクション — early-exit は持たない (完走後の表示選択)、汎用属性 + type:help 同梱、衝突は argv 位置の先勝ち、候補経路は dead end 込み、ambiguous では非発火 (誘導行で補完)
- [DR-053](DR-053-parse-outcome-structure.md): パース結末の構造 — outcome 3 値 discriminated union、errors 全保持 + primary は argv 最深、ambiguous は全解釈列挙 (結果オブジェクト形)、help_entry / tried_triggers はフィールドで文言はレンダラ
- [DR-054](DR-054-parse-definition-failure.md): parse_definition の失敗挙動 — 構成不能/全入力破壊 = Error・一部入力の驚き = warn の境界基準、v1 Error は構文/値域/参照検査まで、定義エラーは全列挙 + hint
- [DR-073](DR-073-export-key-collision-carrier.md): export-key 衝突の担体 — ambiguous 維持 + 解釈ごとの optional claimants 面 (露出キー → 占有実体 entity)、識別子は entity (値/source では区別不能)、fixture は {result, claimants} の組で集合比較 (順序非依存)、独立 outcome / 値オブジェクト化 / failure 化を不採用、lint は別綴り co-export に link 提案
- [DR-097](DR-097-greedy-reading-viability.md): 先食い・早閉じ抑制の「読める」の精密化 — DR-041 §4 の述語はトリガ一致でなく読みの成立 (その greedy 読みを経由する完全経路の存在) を指す、成立しない読みは読みゼロと同じ扱いで素通し枝が生き他ルートが通れば held Error は捨てられる (DR-037 適用)、早閉じ抑制にも同じ述語を共有し及ぶ、typo マスク受容は DR-041 §5 の既定トレードオフの一貫適用

## 2層 AST / 構造プリミティブ

- [DR-001](DR-001-two-layer-ast.md): 2層 AST 構造 (UsefulAST / AtomicAST)
- [DR-002](DR-002-element-isomorphism.md): 全要素は同型、CLI 慣習名はシュガー — 適用範囲は updated by DR-017 (AtomicAST 限定)
- [DR-017](DR-017-command-first-class-at-definition.md): command は定義時1級、パース時同型
- [DR-018](DR-018-placement-and-commands-sugar.md): 配置で区別、commands は positionals 内 or 糖衣
- [DR-019](DR-019-repeat-merged-into-multiple.md): repeat を multiple に統合、可変長 positional — multiple の内部構造は reorganized by DR-034、repeat との統合は DR-043 で分離
- [DR-020](DR-020-recursion-via-primitives.md): 復帰/途中分岐は専用概念を持たず構造で組む
- [DR-023](DR-023-structural-primitives-finalized.md): 構造プリミティブ確定形 (4 + multiple + 糖衣)
- [DR-026](DR-026-leaf-branch-and-sugar.md): 葉/枝、exact は値プリミティブの一種、構造記法の糖衣 (裸文字列=exact, 裸配列=seq)
- [DR-027](DR-027-serial-renamed-seq.md): serial → seq 改名 (or/seq/multiple = alternation/concatenation/closure)
- [DR-039](DR-039-atomicast-convergence-and-vertical-slice.md): AtomicAST = ボトムアップエンジンのシリアライズ形、垂直スライスで実装と共設計、JSON Schema は最後 — 直列形の範囲は DR-063 で確定

## 名前とスコープ

- [DR-003](DR-003-name-three-axes.md): name は3軸 (CLI起動/結果key/内部参照) を兼任
- [DR-006](DR-006-scope-and-lexical-resolution.md): スコープは自動、lexical scope chain で解決 — updated by DR-033 (lexical スコープ = name スコープに統一)
- [DR-022](DR-022-snake-case-naming.md): キー名 snake_case、case 変換 pluggable
- [DR-024](DR-024-three-name-layers.md): 名前は3層 (key name / def name / value_name)
- [DR-025](DR-025-name-creates-scope.md): name が結果スコープを作る、露出は最も浅い name 層
- [DR-033](DR-033-lexical-scope-equals-name-scope.md): lexical スコープ = name が作るスコープ
- [DR-046](DR-046-name-axes-decomposition.md): name の軸分解 — id / 結果キー / value_name / display_name の目的別軸、name はデフォルト供給源 (nameless への ref/link が可能に)
- [DR-052](DR-052-export-key-unification.md): 結果キー軸の一本化 — export_key: string | null (export bool 廃止)、null = nameless 同化の透過 (値は流れる)、選ばれた name スコープは空でも `{}`

## 配置 / options / positionals / commands

- [DR-004](DR-004-options-positionals-split.md): options / positionals の2分割、commands は or でラップ
- [DR-030](DR-030-entity-only-node.md): 実体だけノード (入口属性なしの値ノード、appconfig ストア用途)
- [DR-064](DR-064-dd-declaration-placement.md): dd の宣言配置 — canonical は options[] (順不同・greedy 面住人の分類一致、dd = 効果が severed 化の特殊 flag)、配置は挙動不問、usage の [--] 表示はレンダラの慣習 (宣言と表示の分離)

## 値と型 / type 参照糖衣

- [DR-005](DR-005-type-categories.md): type の3カテゴリと子からの値型推論
- [DR-015](DR-015-value-propagation.md): 値の発生と伝搬の構造的セマンティクス
- [DR-028](DR-028-type-as-reference.md): type は definitions/registry への参照糖衣、解決順、前方互換、flag等は糖衣プリセット
- [DR-032](DR-032-ref-link-name-resolution.md): ref/link が指すのは name (解決はスコープ内→definitions)、type とは別物
- [DR-040](DR-040-type-registry-dialects-and-restriction.md): type registry の方言運用 (canonical default / 言語DX / ユーザ差し替えの3層上書き、寛容default+pre_filter vs value_parser 差し替えの2軸) — canonical 字句仕様 (数値・exact codepoint 比較・path バイト列・count_or_set・filters 3 層) を拡張確定。number 字句は updated by DR-074 (10 進最小 → 実用寛容固定字句)、bool 字句は DR-074 で新設
- [DR-074](DR-074-canonical-number-bool-lexicon.md): number / bool canonical 字句の確定 — number は実用寛容な 10 進固定字句 (leading `+` / `007`=decimal / `.5`・`1.` / `_` default 桁区切り / inf は float 型のみ・nan は両型 Error / 型 suffix 非採用)、基数 prefix + hex float は `number_allow_base_prefix` 統合 opt-in (canonical では `0x1F` も `0x1.8p3` も Error)、bool は `["true","1"]`/`["false","0",""]`+ci (yes/no は opt-in)、bool↔number は文字列 parse 可・型変換 Error、anchored 契約明文化、負数 arity 駆動消費、G8 (最寛容 vs 最小) 解消。JSON 同型 / 型 suffix / nan 受理 / 個別 base 指定 / empty_is_false / 読みモードを不採用。int の値空間判定 (§2 暫定注記の M2) は confirmed by DR-075
- [DR-075](DR-075-int-rounding-modes.md): int の値空間判定 (M2 確定) と int_round (小数入力の丸めモード) — int は整数「値」を受理 (`"3.0"`→3 / `"1e3"`→1000、fractional のみ int_round に従う、DR-074 §2 の読みを採用し DR-050 §4 の構文判定を supersede)、`kuu_int_parser` factory の config キー `int_round` は 10 種体系完備 (方向 4 `floor`/`ceil`/`trunc`/`away` × {非 half, half} + `half_even` + `error`)、canonical default `error`、命名は kuu 独自一貫系 (HALF_UP/HALF_DOWN 罠を回避し `away`/`trunc` で 0 起点向き・`ceil`/`floor` で無限起点向き)、String 源は binary64 非経由の厳密判定を必須要件化 (`parseFloat`→round は不適合、native-number 源は JSON 由来 binary64 で対象外)、`not_an_integer` は error モードのみ emit。CLI パーサ界に前例なし。構文判定維持 (選択肢 Q) / half_05up / pre_filter 退避のみ / HALF_UP 系命名を不採用
- [DR-092](DR-092-inf-float-json-serialize.md): inf / 非整数 number の JSON serialize 規約 — inf は値位置に文字列 sentinel `"Infinity"`/`"-Infinity"` (protobuf3 canonical JSON 同型、先頭 `+` 付けない)、parse-serialize 対称性は parse 側の寛容 (DR-074 §7 の `Infinity` case variant 受理) が担う非対称採用、適用範囲は result/effects/config 由来値の一律、非整数 float の canonical serialize は shortest round-trip (Ryu/Grisu 系)、precision-critical 値は fixture 直接 pin を避け opt-in 曖昧さ回避は方向付けのみ、config JSON 値位置への `"Infinity"` 供給は DR-050 §4 既存経路で自動成立 (確認的明記)。タグ付き object / JSON5 bare literal / 小文字 `inf` canonical / 入力 case 保存を不採用
- [DR-076](DR-076-bool-is-value-type-flag-is-sugar.md): bool は通常の値型 (variant 持ちでも eq-split 値形を受ける)、flag が特殊 — 特殊性は flag 側の展開 (long 綴り合成: long:true 糖衣差し替え + 非空リスト補完) で吸収。presence-only へ寄せる案・flag 廃止・node 語彙正規形を不採用
- [DR-077](DR-077-update-effect-and-count-normal-form.md): 効果 op に update を追加 (old へ filters registry の T=>T transform を適用する 0-token 効果)、count = number + default:0 + long:true 糖衣 [":update:increment"] の綴り合成に正規化。multiple increment accumulator は count から退役
- [DR-078](DR-078-definitions-templates-and-ref-identity.md): definitions に templates 区分を新設 (クロージャなしの共有消費文法 Node の座席、ref の解決先)。ref/link/alias の参照実体は name lookup で束縛される内部 id (DR-032 の精密化)。types 相乗り・頂上 templates 節を不採用
- [DR-051](DR-051-absent-result-semantics.md): 結果の欠落表現 — 値の無い要素は absent (キーなし)、null は値空間に持たない (config null = 供給なし)、型導出は required/default/反復系 → T・それ以外 → T?

## multiple

- [DR-008](DR-008-multiple-field.md): multiple フィールドに複数値関連を統合 — 内部構造は reorganized by DR-034
- [DR-034](DR-034-multiple-structure.md): multiple の構造モデル (pieceProcessor/separator/accumulator/collector、縮退ケース、type と multiple は同じ属性平面) — mapper→accumulator の改称は updated by DR-036
- [DR-043](DR-043-repeat-and-multiple-split.md): repeat (構造閉包、min/max は枝生成に効く、ref 再帰へ lowering) と multiple (値の畳み) の分離、両者 installer 化 (DR-019 の統合を部分的に覆す)
- [DR-044](DR-044-repeated-group-result-shaping.md): 反復グループの結果整形 — 配列が既定、map は from_entries (entries 配列 / 指名 2 フィールド / key 昇格の 3 用法)
- [DR-080](DR-080-merge-accumulator.md): merge accumulator — piece マーカー語彙 (remove 全削除 / @ splice / + escape、全体一致のみ)、L→R 評価 (marker なし = 上書き、marker あり = merge + 暗黙先頭 @)、remove は双方向 (作業リストと後続 @ の splice 内容)、old = セル現在値 (初回は下位席勝者 = ラダー合成の限定口、unset は f=identity の縮退)
- [DR-105](DR-105-accumulator-flatten-and-array-filter-fallibility.md): accumulator `flatten` ダイヤル (append 専用、既定 false、true で発火値配列を 1 段展開) — 独立 accumulator エントリ `flatten` (DR-036/043) を統合廃止、他 accumulator への宣言は definition-error kind=invalid-range (merge×ref の DR-084 §3 と同型)。ARRAY filter registry (`accum_filters`) の fallibility 確立 (「filter 席=fallible/構造装置=total」の勢力図適用) + 最初の Validate 系住人 `length_range:min:max` 追加、DR-102 §4 の reject 位置帰属 (argv.length) が実効化

## ref / link / definitions

- [DR-007](DR-007-definitions-ref-link.md): definitions 領域、ref (構造継承) と link (値同期) — reorganized by DR-035 (definitions と registry の名前空間統一)
- [DR-029](DR-029-link-revisited.md): link 見直し (値同期、1実体:N参照、固定パス DSL、遅延解決、失敗=パース失敗)
- [DR-057](DR-057-alias.md): alias — 独立要素の別入口 (参照ファミリー 3 人目: ref/link/alias)、name 導出入口は再導出継承・明示綴りは非継承、結果キーは canonical のみ

## 制約

- [DR-012](DR-012-constraints-as-attributes.md): 制約は要素属性で表現 — 評価意味論は DR-047、語彙拡充は DR-055
- [DR-055](DR-055-constraint-vocabulary.md): 制約語彙の拡充 — conflicts_with (名指しペア排他、対称)、値依存は値の枝への requires 合成 (新語彙ゼロ)、requires 語彙維持、constraint installer
- [DR-047](DR-047-constraint-evaluation-layering.md): 制約評価のレイヤリング — 遅延述語は完全経路の成立条件 (経路フィルタ)、required は値充足 (default 込み)、exclusive_group / requires トリガは committed — 値空間なし要素の required / requires 目的語判定は refined by DR-093 (型委譲)
- [DR-093](DR-093-required-type-directed-satisfaction.md): required / requires の充足は型委譲 — 値空間ありは値の有無 (DR-047 §5 不変)、値空間なし (`type: "none"`、dd 含む) は発火 (committed)。requires 目的語も同枠 (DR-089 §4 の definition-error を置換)、dd → greedy Seq 宣言語彙化 (DD2) は PoC 実測のうえ不採用のまま idea 降格
- [DR-103](DR-103-required-group.md): 必須選択グループ — `required_group` (要素側属性、`exclusive_group` と同型の `Array[String]`、DR-047 §5 の値述語に分類、判定は `required` 単項充足 (DR-093) のグループ論理和)。名前空間は `exclusive_group` と独立、同名併用で exactly-one (tar のモード必須) を合成可能。単独 member は `required: true` と等価に縮退。definition/scope 側の `groups` 1 級座席は棄却 (kawaz 裁定「グループ判定は評価側が group ラベル集約で足りる」)。DR-012 の「グループ的必須は or+required で足りる」/ DR-055 §4 の同主張は独立トリガ群 (flag 群) には不成立と判明 (journal 実証) し Superseded 節追記を提案

## 継承

- [DR-013](DR-013-inherit-inheritable.md): inherit / inheritable で階層継承 — prefix 生成は updated by DR-059
- [DR-059](DR-059-inheritable-prefix.md): inheritable の prefix 生成 — 定義スコープ名 1 個の固定 prefix (全祖先同綴り)、衝突は実行時 ambiguous、別綴りは alias、lowering は global の逆方向コピー
- [DR-014](DR-014-config-field.md): config フィールドで階層継承可能な設定
- [DR-031](DR-031-value-source-precedence.md): 値源の優先順位 (CLI/link > env > config > inherit > default、固定) — required の判定入力は updated by DR-047、source 確定ルール (境界条件) を拡張確定
- [DR-081](DR-081-default-seat-rewrite-and-source.md): default 席書き換えモデル — env/config/inherit は default と default_source (観測用隠し属性) を書き換える、source = committed ? cli : default_source、op=default は「書き換え済み default」を明示 set で source=cli (DR-031 明文の再確認、fixture 実践の由来席読みを覆す)
- [DR-083](DR-083-multiple-declared-default.md): multiple 要素の宣言 default — 尊重される (反復系の [] は宣言不在時の暗黙 default)、供給形は分割済み pieces (DR-050 config array 同型、separator 非適用、merge マーカー不活性)、op=default は書き換え済み default へ (DR-081 既定)、scalar への配列 default は definition-error (invalid-range)
- [DR-084](DR-084-multiple-ref-row-accumulation.md): multiple×ref — 累積単位は発火値 = row (append で [row...]、0 発火 [])、repeat×multiple は発火境界保存の T[][] (flatten 不採用、平坦形は multiple 単独で表現)、merge×ref は definition-error (invalid-range、マーカーの認識対象 piece 列が構造上不在)
- [DR-085](DR-085-regex-match-host-dialect.md): regex_match — Validate filter (pattern 1 引数、unanchored=部分一致)、照合方言は host 実装準拠 (DR-040 の方言一致記述を相対化、fixture は方言安全パターン限定)、compile 失敗は definition-error (kind=invalid-argument 新設)、colon 含み pattern は DESIGN §8.4 既存オブジェクト形式 (短縮形の colon 全分割は不変、name 特例 / descriptor 分割制御は不採用)
- [DR-086](DR-086-value-slot-consumption-priority.md): variant 枝競合の消費優先 — 値スロットが照合消費できる読みは引数なし枝に cut で優先 (後続 positional の充足可能性で再解釈しない)、required positional 同居は missing_operand / optional 同居は [] で success (ambiguous 化しない)
- [DR-087](DR-087-lazy-default-resolution.md): default の遅延解決 — default = 全解決後に空の cell へ入る fallback (先詰めモデルの否定)、op=default / 席書き換えは placeholder 操作で実体化は依存順に最後 (config_path 解決 → config 席参照 → 祖先 → inherit)、解決後の消費者は常に全実体化済みの値を見る (再演不要・不可)
- [DR-088](DR-088-declared-source-is-default-presence.md): 宣言された値源はデフォルトの存在 — env/config/inherit 宣言 = 遅延 default_fn と同型、経路探索の値充足述語は静的宣言ベース (committed ∨ 宣言あり、実行時値に非依存で決定的)、最終判定は遅延解決後の実値 (空なら unset のまま落ちる、再探索なし)
- [DR-089](DR-089-type-none-value-space.md): type 省略 = none — type は値空間のみを規定し消費は構造の関心 (直交)、none = 値空間が空の node (消費 0 の純トリガも「食って捨てる」も構造で書ける)、結果非掲載で発火観測は ParserContext / explains 層、値充足席には立てない (definition-error) — required / requires 目的語については superseded by DR-093 (発火=committed で充足)
- [DR-090](DR-090-dd-pattern-trigger-self-keep.md): dd の一般化 — トリガ形 (exact | match 正規表現、host 方言準拠) × 自己の扱い (drop | keep = 消費 0 で自身含め positional 域へ) の 2 軸。優先規則は新設せず pattern 設計 (xargs 型は `^[^-]` = 最初の非ハイフン operand) で競合自体を回避、option 面の終端は severed の効果が与える
- [DR-091](DR-091-bare-key-value-operand-stages.md): bare key=value operand の段階表現 — §1 素通し (multiple string + regex_match、既存語彙)、§2 kv_map accumulator (Map へ畳む・last-wins)、§3 固定キー型付きは long_prefix:"" + require_equal_separator 新設【DR-096 で キーは long_eq_sep へ置換、§3 の空 prefix 合法条件は撤廃 (先食いが衝突を解決)】
- [DR-096](DR-096-scope-config-axis-reorganization.md): option 表面 config の軸別再編 — `long_eq_sep` (3 値 `require`/`allow`/`deny`) / `short_attached_value` (4 値 +`last_only`) の enum 化。旧 `allow_equal_separator`+`require_equal_separator` の 2 bool を `long_eq_sep` に統合 (illegal states unrepresentable、矛盾 definition-error 規定と fixture を削除)、`short_attached_value` 新設で gcc/clang 型 per-option attach-only と GNU getopt 型 last_only (付着は丸取りのみ) を表現、`long_prefix:""` の合法条件 (DR-091 §3) を撤廃 (先食いが operand 衝突を解決)、ダイヤルに位置条件なし、`short_combine` は不変
- [DR-100](DR-100-config-key-prefix-normalization.md): config 語彙の整理 — `auto_env` を `env_auto` へ改名 (DR-096 の軸 prefix 先頭規律を env 軸にも適用)、factory config キーの canonical は「factory 名 prefix あり」と規約化し `builtin/bool_parser` の `true_values`/`false_values`/`case_insensitive` を `bool_true_values`/`bool_false_values`/`bool_case_insensitive` へ追随リネーム (`number_parser`/`int_parser` は既に準拠で不変)。bare 統一案は不採用 (綴りの好みは vocab_alias installer 構想がユーザランドで吸収、正準は動かさない)、dd の `match`/`self` への `dd_` prefix 付与も見送り

## CLI 入口 / variant / filter

- [DR-009](DR-009-filter-chain.md): filter chain 初期形 — reorganized by DR-034 (pieceProcessor + separator + accumulator + collector に再編成)、@base sentinel は superseded by DR-062
- [DR-062](DR-062-filter-inheritance-interface.md): filters の継承インターフェース — @base sentinel 廃止 (発見不能な in-band 特殊値・孤立語彙)、string 短縮形 (差し替え) | object 詳細形 ({prepend, append})、ref 継承は後勝ち上書き、中間挿入は非対応 (type shadow で差し替え)、命名 (pre_filters) は superseded by DR-079
- [DR-079](DR-079-filter-seat-lattice-and-artifact-anchored-names.md): filter 座席の完全格子と作用対象アンカー命名 — pre_filters/filters/post_filters → piece_filters/value_filters/cell_filters (pre/post 全廃、raw→piece→value→cell の artifact 進行)、raw_filters (分割前座席) は名前予約のみ、registry 名 filters は語彙プール専用に純化、互換 alias なし
- [DR-011](DR-011-variant-dsl.md): variant の文字列 DSL とオブジェクト形式 — set の args なし形 (主入口) は updated by DR-071
- [DR-071](DR-071-long-variant-list.md): long の責務分離 — variant リスト一級化 (各要素が入口 1 個、`:set` = 主入口) + `long: true` は [":set"] の糖衣、absent = false = [] = 入口なし (presence 罠の構造的消滅)、主入口なし variant のみが表現可能に、旧 `long: []` の意味変更 (破壊的、ドラフト期)
- [DR-045](DR-045-effect-descriptors.md): 効果記述子 — 値セル操作は純データ (set/default/unset/empty、committed は効果が明示制御)、効果列の判定キー精密化
- [DR-101](DR-101-unknown-filter-definition-error.md): filter 名の未登録は definition-error (kind=unknown-vocab) — value_filters / piece_filters / cell_filters (非 accum 位置) の 3 属性で filter 名が filters registry の descriptor `owns` 集合に載らない場合は `parse_definition` が静的 reject (runtime reason `unknown_filter` は wire から消滅、DR-042 の filter/installer 同格 + DR-054 §1 の「lowering が構成できない = Error」の filter 側適用)、専用 kind は新設せず DR-054 §4 の既存 8 kind の `unknown-vocab` に吸収 (DR-082 §2 の受け皿規定を直接適用、long update transform 名検査 DR-077 §2 と同族)、filter 装置内の invalid-argument (DR-085 の regex_match compile 失敗) とは別層 — **§3 (accum 位置の cell_filters 判定マトリクス) は DR-102 で superseded** (cell_filters 属性分割により位置依存判定の前提が解消)
- [DR-102](DR-102-filter-attribute-split.md): `cell_filters` の属性分割 — multiple 有無で T→T/Acc→Acc という異なる語彙を 1 属性に内包していた構造的欠陥を解消し、`final_filters` (非 multiple 専用、T→T、最終値ガード) と `accum_filters` (multiple 専用、Acc→Acc、累積配列) に分割 (kawaz 裁定 2026-07-13、SPL-Q1〜Q6 裁定バッチ)。1 属性 1 registry で unknown-vocab 判定が単純化、位置依存の層違い invalid-range 判定は消滅。multiple 有無との排他はいずれも definition-error kind=invalid-range (scalar-array-default-invalid-range.json と同型)。reject の argv_pos は両属性とも argv.length 帰属 (value_filters の piece 実位置帰属との違いが独立属性として残す実証根拠)。非 multiple 要素の宣言 default 値の pieceProcessor 通過は DR-050 §4 の型依存規則をそのまま適用 (config 供給と同型)。DR-079 (座席格子 D 行分割) と DR-101 §3 に Superseded 節追記。旧 DR-102 (非 accum×ARRAY-only=invalid-range の判定精密化案、未 push) は前提から棄却され abandon、番号を本 DR が再利用

## help / 補完 / 表示メタデータ

- [DR-058](DR-058-hidden-deprecated.md): hidden / deprecated の挙動 — hidden は help/補完から除外 (受理不変)、deprecated は受理 + ParserContext.warnings (v1 bool のみ、表示はレンダラ)
- [DR-060](DR-060-completion-query.md): 補完クエリ — 生存 partial 経路 (dead end 除外) の期待集合の和集合、after 整合フィルタ、素材+メタ返却でポリシーは生成器、completer は名前参照で shell 機能へ委譲、責務 4 層

## conformance / 直列形

- [DR-063](DR-063-atomicast-serialization.md): AtomicAST 直列形の確定 — wire form = 宣言層のみ (A 群適用済み + installer 語彙 inert、lowered は決定的再導出)、lowered 断面表記 (面構造 / matcher kind + name 参照 entries / 効果記述子 / `#` 予約内部 id) は段階別 fixture 用で緩比較、構造等価で byte 一致不要
- [DR-065](DR-065-conformance-fixture-format.md): conformance fixture フォーマット — why 必須 / query タグ (parse 定義、lower・complete・definition_error 予約) / definition は wire form / expect は DR-053 union 転用 (effects = cli 効果のみが正本、result = ラダー込み最終値) / error kind 割当 (構造的不足・残余 = parse) / 機能領域別ディレクトリ。正本は docs/CONFORMANCE.md
- [DR-082](DR-082-definition-error-fixture-format.md): definition_error fixture format — DR-054 §4 返値の転用 (element+kind の集合比較、message/hint 非比較、argv なし)、未対応構成系の kind は invalid-range (DR-065 予約の解消)
- [DR-066](DR-066-error-reason-codes.md): 実行時エラーの reason コード層 — errors に機械可読な reason 追加 (DR-053 拡張、組み込み発生源は必ず emit)、発生源は descriptor の reasons で宣言 (DR-061 拡張、完備チェック / typo 検出 / L10n の基盤)、組み込み最小語彙 (missing_operand / unexpected_token / constraint 4 種)、fixture は optional 検証
- [DR-067](DR-067-wire-well-formedness.md): wire form の well-formedness — 合法性 3 層 (構文 / 語彙 / 参照)、空 or・空 seq・1 児・トリガ重複は合法 (warn は lint)、name は非空のみ制約 (`#` id はユーザ禁止の予約)、multiple の配置制約なし (F-042 解消)
- [DR-068](DR-068-json-schema-lifecycle.md): JSON Schema と spec バージョンの lifecycle — 確定版 v1.0.0 = 参照実装 fixture green (フェーズ 3)、バージョン単位は spec バンドル一体、semver (語彙追加 = minor だが旧実装は unknown-vocab で正しく拒否、意味論変更 = major)、$schema は確定版から (F-048 解消) — 準拠宣言の単位は updated by DR-069
- [DR-069](DR-069-conformance-profiles.md): 準拠プロファイル — 段階準拠 (parse-core 必須 / lowering / definition-error / completion opt-in)、descriptor の実装要求は owns + reasons のみ (observes / factory 一般化は canonical 実装の装備 = 準拠非要求)
- [DR-070](DR-070-lower-fixture-format.md): lower fixture フォーマット — installers 列挙 (省略 = 全登録、順序非規範)、expect = DR-063 §3 断面の緩比較 (内部 id 綴りと席順は無視)、順列検査は runner 組み込み 2 段 (常時 = 決定的少数 / opt-in = 全順列)、粒度は基本 3 点セット + 厳選組合せ
- [DR-072](DR-072-fixture-case-id.md): fixture case の安定 id (slug) — 各 case に required "id" (kebab-case・fixture 内 unique・意図 2〜4 語、通し番号禁止)、参照は rel::slug (位置依存 case#N の置換)、id 一意性は fixture メタ層の lint (DR-067 の wire 3 層とは disjoint)、id 欠落は fixture 不備
- [DR-104](DR-104-completion-fixture-format.md): complete fixture フォーマット (DR-065 予約の解消、v1 blocker 化) — 入力 args_before/args_after (word_before/word_after は v1 未使用予約、DR-060 §2 の before/word/word_suffix/after から改名)、candidates は Cand 構造の直訳 (spelling/is_value/ty/origin/term/meta 必須・completer は opt-in・path は wire 非搭載) の集合比較、候補同一性は spelling/is_value/ty/origin/term/meta の完全一致 (path は同一性に不参加、実装既定を格上げ)、遅延述語は args_before-only の候補生存判定に不参加 (dead end=parse相/制約=resolve相)、args_after 供給時のみ完全経路判定 (遅延述語込み) で間接的に絞る
- [DR-108](DR-108-spec-release-process.md): spec リリースプロセス — VERSION ファイルが spec バンドル一体 (DESIGN+LOWERING+CONFORMANCE+REFERENCE+DR+fixtures+schema) を代表、kawaz 標準 release ループ縮小形 (check-version → validate-bundle → release の 3 job、bump → push → CI が tag/GH Release、v1.0.0 未満は prerelease)、権限最小化 (release job のみ contents:write、persist-credentials:false、bump-semver はバージョン固定取得)、concurrency 直列化 + gh release create 直前の同 tag recheck、bootstrap 判定の fail-closed 化 (stderr 内容で空/エラーを区別)、V1-Q1=b の正式記録 (DR-068 §1「fixture 全 pass」= DR-069 4 プロファイル全 green を**指定参照実装 kuu.mbt**で満たすこと、DR-069 §1「parse-core 最小」は実装の準拠名乗り条件で別軸)、green の規範・証跡ファイル (`docs/releases/vX.Y.Z-evidence.md`) は CONFORMANCE §0.1 + validate-bundle の軽量 gate、schema `$id` は wire/fixture/descriptor の 3 ファイルのみ (builtin-descriptors.json は `$schema-ref` 更新)、参照実装は CI pin (SHA) + README 準拠宣言で対応、v1.0.0 発行自体は docs/runbooks/v1-release.md 側で別途実行 (codex レビュー #5 の C-1/M-1〜M-7/m-1〜m-3 反映)

## レジストリ / 実装連携

- [DR-010](DR-010-external-registry.md): 外部レジストリの階層化と暗黙参照 — updated by DR-035 (definitions/registry 一様化), DR-036 (multiple registry 追加), DR-040 (type 方言の3層上書き)
- [DR-016](DR-016-result-and-context.md): 結果オブジェクトと ParserContext の2層 — required の判定入力は updated by DR-047
- [DR-035](DR-035-definitions-registry-symmetry.md): definitions は registry と同じ区分の名前空間、解決順の一様化 (DR-007 を再編成)
- [DR-036](DR-036-multiple-registry-and-accumulators.md): multiple registry 追加、accumulators の属性セット拡張、collectors は filters で代替 (DR-008/010 を更新)
- [DR-042](DR-042-installer-architecture.md): installer アーキテクチャ — 特殊語彙 (long/short/env/dd) は registry 装置の所有語彙、5 不変則で順序非依存合成、値源はラダー席宣言
- [DR-049](DR-049-env-lookup-contract.md): env lookup の契約 — env_provider は単一スロット `(key) → string | null` (null=未設定、prefix 連結済み key)、env 値は pieceProcessor 通過、auto_env (DR-100 で `env_auto` へ改名) はフル修飾導出で明示 env: 優先
- [DR-050](DR-050-config-file-value-source.md): config ファイル値源 — type: config_file の配線宣言、config_provider は `(path) → 階層オブジェクト | null` (フォーマットは provider の関心)、config_key は同型対応デフォルト + link パス DSL の明示上書き、値の型は要素の type、config は構造に影響しない
- [DR-056](DR-056-vocabulary-ownership-vs-reference.md): 宣言語彙への関わり方 — 所有 (lowering 責務、排他) と参照 (advisory read、自由)。参照の成果は観測挙動に影響してはならない — 機械可読化は DR-061 (descriptor)
- [DR-061](DR-061-registry-descriptor-and-configurable-factory.md): registry 装置の自己記述 — installer descriptor (owns / observes / config キー所有)、wire 追加語彙の正当性 = 所有集合の和、configurable factory ({name, config} 参照、canonical = default config)、config はキー平坦・値自由 JSON、factory config と filter の線引きは「相」
- [DR-094](DR-094-registry-vocabulary-namespace.md): registry 語彙の namespace — filter 名/factory 名/type 参照/reason 語彙全域に ns、builtin (closed set) と拡張 (open set) の分離、bare 名は builtin ns の糖衣、区切りは `/` (`:` は DSL 引数区切り・`.` は link 固定パス DSL のフィールドアクセスと衝突のため不採用)、共通 reason (too_small 等) は builtin ns 内で複数 filter が共有可能 (DR-066 §2 の緊張を解消)、definitions ローカルキーは ns 対象外
- [DR-095](DR-095-builtin-descriptor-reasons.md): builtin filter/factory の reasons 宣言集合の確定 — 正本は spec 側 `schema/builtin-descriptors.json` (SCH-Q2-a)、組み込み filter は descriptor 単位で列挙 (SCH-Q3-b、trim/increment/unique は Transform で reasons:[]、non_empty は `empty_value` 新設、in_range は `too_small`/`too_large`、regex_match は実行時 `pattern_no_match` のみ・compile 失敗は definition-error kind=invalid-argument に分離)、canonical factory は DR-094 §9 案 A の新名 (`builtin/number_parser` 等) で `not_a_number`/`not_an_integer`/`int_out_of_range`/`not_a_bool` を帰属 (DR-074/075 根拠)
- [DR-098](DR-098-tty-injected-value-source.md): tty 判定の値源化 — tty_provider は env_provider/config_provider と同列の単一スロット `(stream: "stdin"|"stdout"|"stderr") → bool | null`、wire 属性 `tty` で bool 値要素の席に注入 (供給値は native bool、型不一致・none/dd・flag/count への付与は definition-error kind=invalid-range)、値源ラダーは `default` の直前 (`inherit` の後) に挿入 (明示 > 継承 > 観測 > 宣言既定)、source タグに `tty` 追加、評価器の純粋性は不変 (ambient probe は provider 実装に閉じる)、DESIGN §13.9 の TTY 責務外記述を「tty 値の注入は射程内、能動センシング/レンダリングは引き続き責務外」に改訂 — **§3/§4/§5 は DR-099 が撤回** (Superseded 節参照)
- [DR-099](DR-099-tty-is-a-preset-type.md): tty は型である — DR-098 の wire 属性 + ラダー席モデルを preset 型へ転換 (`type: "tty"` = `builtin/tty`、bool を土台にする flag/count 同族の糖衣プリセット、DR-076 の枠)。値源ラダーは DR-031 の元の 5 段に復元、tty 型の `default` 席だけが `fold(観測) ?? 宣言 default` を解決規則として持つ (観測優先・source タグ `tty`/`default` は維持)。configurable factory config は `tty_stream` (必須、3 値 enum) / `tty_cygwin` (既定 true)、tty_provider シグネチャは `(stream) → {terminal, cygwin} | null` に改訂 (fold 計算 `terminal || (tty_cygwin && cygwin)` を spec 側の純データ計算として保つ)。preset 化により DR-098 の definition-error 3 分類・multiple×tty 未規定は構文的に不要化
- [DR-106](DR-106-descriptor-role-and-carrier-axes.md): descriptor の役割軸 (`kind`) と担体軸 (`domain`) の機械可読化 — `kind` enum に `collector` 追加 (`unwrap_single`/`from_entries` を `filter` から区別)、`kind:"filter"` 限定の `domain: scalar|array` 新設 (`signature` の fallibility 軸と直交、`in_range` と `length_range` を機械可読に区別)。carrier の正本は wire 属性位置 (DR-102 §3) のまま、`domain` は descriptor 単体を読む場面の機械可読ヒント。collector の呼び出し規約 (`multiple.collector` 由来) が filter chain の colon-DSL args と異なる旨も明記。DR-036 の「collectors registry は新設しない」方針は不変 — **`kind`/`domain` は DR-107 が Superseded** (直交軸化)
- [DR-107](DR-107-descriptor-orthogonal-axes.md): descriptor の直交軸化 — `kind`→`role` rename (7 値: installer/filter/collector/type_parser/accumulator/completer/provider)、`construction: static|factory` 新設 (filter×factory = configurable filter を第一級化)、`io_type` 新設 (JSON 表現可能な値型の再帰体系: string/number/bool/null/array&lt;T&gt;/map&lt;string,T&gt;/value、固定幅なし)、`signature` を `effect: preserve|transform` + `fallibility: total|reject` に分解 (変換×失敗可能の第 3 象限を表現可能化)、`invocation: {encoding: colon_args|object_args|none, parameters}` 新設 (DR-105 §5 の definition-time 検査規則を宣言化)。role 別 oneOf で必須/禁止フィールドを Schema 強制 (collector は domain=array/effect=transform/fallibility=total を const 固定)。env_provider/config_provider/tty_provider の 3 provider descriptor を新規収載 (DESIGN §12/§12b/§14.3 の散文シグネチャを機械可読化)。DR-106 (`kind`/`domain`) を Superseded — accumulator/completer の未確定 2 行は DR-111 が確定
- [DR-111](DR-111-accumulator-completer-descriptor-axes.md): accumulator / completer role の descriptor 宣言軸確定 (DR-107 §7 の未確定 2 行の解消、全軸が既存 DR からの導出で裁定分岐なし) — accumulator は collector と同じ「構造畳み装置」の勢力図 (DR-105 §4) で const 固定 (output_mode=transform/fallibility=total/construction=static、io_type.input 常に array ラップ、invocation は object_args 固定 — `flatten` を append の parameters に載せ DR-105 §2 の wrong-seat 判定を機械可読化)、io_type の対象は畳み相 (collect) のみで cell 解決相 (resolve_cli の Binding プロトコル) は評価器内部として宣言対象外。builtin は append/merge/kv_map の 3 種収載 (increment は DR-077 の宿題決着で除外、override は概念モデル名で registry 住人ではない)。completer は named capability marker の最小形 (invocation none 固定・reasons 常時空、io_type は runtime 問い合わせ ABI 確定まで禁止 — DR-109 骨子柱 3 の $required に必要なのは name+role の同定のみ)、builtin completer は収載せず標準 completer 名の閉集合は補完生成器層 (DR-060 §5 層 2) の DR に委ねる
- [DR-109](DR-109-kuu-ux-skeleton-and-cli-contract.md): kuu-ux 設計骨子 (7 本柱) と kuu-cli 契約の初期裁定 (UX-Q1〜Q7) — kuu-ux = UsefulAST 実体化の 3 責務 (Definition/Export/Binding)、書き味合流モデル、$required = named capability marker + export validation、help/error は semantic model まで共通、CLI envelope は fixture expect と厳密一致 (余剰フィールド不可、解析コンテキスト露出は将来保留)、sources 常時出力、interpretations は resolve 非適用 (途中経過を規定せず最適化余地を保つ)、kuu-cli はテストツールでなくアプリ内 kuu と同一挙動 (実環境を既定取得 + --no-env/--env k=v 等の試験用オプション、極小バンドルモード・RPC クロージャ注入構想の土台)、既定 resolve 維持 + preset default は export_key 共露出に非参加 (collision.json §divergence の決着)
- [DR-110](DR-110-kuu-core-standard-packaging.md): kuu-core 標準パッケージング — 全言語実装は engine (機構のみ、builtin 語彙を含まない) / builtins (canonical 住人、公開 extension interface のみ使用 = 3rd party と差し替え可能) / assembly=kuu (組成所有・front_door 一本道の玄関・conformance の主語) の 3 層で構成 (PKG-Q1〜Q4 全て a、kawaz 2026-07-16)。依存は一方向 (assembly→builtins→engine)、engine 内蔵集合は閉じた列挙 11 項 (open node 契約・pluggable matcher・ラダー骨格・install 契約・generic 2 検査…)、boundary survey 従属争点 19 件の境界裁定表を規範化。sentinel の外部 API 露出 (is_sentinel) は廃止し玄関が吸収。conformance の検証対象は assembly (engine 単体は将来課題)
