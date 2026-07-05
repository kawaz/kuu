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
- [DR-040](DR-040-type-registry-dialects-and-restriction.md): type registry の方言運用 (canonical default / 言語DX / ユーザ差し替えの3層上書き、寛容default+pre_filter vs value_parser 差し替えの2軸) — canonical 字句仕様 (数値 10 進最小・exact codepoint 比較・path バイト列・count_or_set・filters 3 層) を拡張確定
- [DR-051](DR-051-absent-result-semantics.md): 結果の欠落表現 — 値の無い要素は absent (キーなし)、null は値空間に持たない (config null = 供給なし)、型導出は required/default/反復系 → T・それ以外 → T?

## multiple

- [DR-008](DR-008-multiple-field.md): multiple フィールドに複数値関連を統合 — 内部構造は reorganized by DR-034
- [DR-034](DR-034-multiple-structure.md): multiple の構造モデル (pieceProcessor/separator/accumulator/collector、縮退ケース、type と multiple は同じ属性平面) — mapper→accumulator の改称は updated by DR-036
- [DR-043](DR-043-repeat-and-multiple-split.md): repeat (構造閉包、min/max は枝生成に効く、ref 再帰へ lowering) と multiple (値の畳み) の分離、両者 installer 化 (DR-019 の統合を部分的に覆す)
- [DR-044](DR-044-repeated-group-result-shaping.md): 反復グループの結果整形 — 配列が既定、map は from_entries (entries 配列 / 指名 2 フィールド / key 昇格の 3 用法)

## ref / link / definitions

- [DR-007](DR-007-definitions-ref-link.md): definitions 領域、ref (構造継承) と link (値同期) — reorganized by DR-035 (definitions と registry の名前空間統一)
- [DR-029](DR-029-link-revisited.md): link 見直し (値同期、1実体:N参照、固定パス DSL、遅延解決、失敗=パース失敗)
- [DR-057](DR-057-alias.md): alias — 独立要素の別入口 (参照ファミリー 3 人目: ref/link/alias)、name 導出入口は再導出継承・明示綴りは非継承、結果キーは canonical のみ

## 制約

- [DR-012](DR-012-constraints-as-attributes.md): 制約は要素属性で表現 — 評価意味論は DR-047、語彙拡充は DR-055
- [DR-055](DR-055-constraint-vocabulary.md): 制約語彙の拡充 — conflicts_with (名指しペア排他、対称)、値依存は値の枝への requires 合成 (新語彙ゼロ)、requires 語彙維持、constraint installer
- [DR-047](DR-047-constraint-evaluation-layering.md): 制約評価のレイヤリング — 遅延述語は完全経路の成立条件 (経路フィルタ)、required は値充足 (default 込み)、exclusive_group / requires トリガは committed

## 継承

- [DR-013](DR-013-inherit-inheritable.md): inherit / inheritable で階層継承 — prefix 生成は updated by DR-059
- [DR-059](DR-059-inheritable-prefix.md): inheritable の prefix 生成 — 定義スコープ名 1 個の固定 prefix (全祖先同綴り)、衝突は実行時 ambiguous、別綴りは alias、lowering は global の逆方向コピー
- [DR-014](DR-014-config-field.md): config フィールドで階層継承可能な設定
- [DR-031](DR-031-value-source-precedence.md): 値源の優先順位 (CLI/link > env > config > inherit > default、固定) — required の判定入力は updated by DR-047、source 確定ルール (境界条件) を拡張確定

## CLI 入口 / variant / filter

- [DR-009](DR-009-filter-chain.md): filter chain 初期形 — reorganized by DR-034 (pieceProcessor + separator + accumulator + collector に再編成)、@base sentinel は superseded by DR-062
- [DR-062](DR-062-filter-inheritance-interface.md): filters の継承インターフェース — @base sentinel 廃止 (発見不能な in-band 特殊値・孤立語彙)、string 短縮形 (差し替え) | object 詳細形 ({prepend, append})、ref 継承は後勝ち上書き、中間挿入は非対応 (type shadow で差し替え)
- [DR-011](DR-011-variant-dsl.md): variant の文字列 DSL とオブジェクト形式
- [DR-045](DR-045-effect-descriptors.md): 効果記述子 — 値セル操作は純データ (set/default/unset/empty、committed は効果が明示制御)、効果列の判定キー精密化

## help / 補完 / 表示メタデータ

- [DR-058](DR-058-hidden-deprecated.md): hidden / deprecated の挙動 — hidden は help/補完から除外 (受理不変)、deprecated は受理 + ParserContext.warnings (v1 bool のみ、表示はレンダラ)
- [DR-060](DR-060-completion-query.md): 補完クエリ — 生存 partial 経路 (dead end 除外) の期待集合の和集合、after 整合フィルタ、素材+メタ返却でポリシーは生成器、completer は名前参照で shell 機能へ委譲、責務 4 層

## conformance / 直列形

- [DR-063](DR-063-atomicast-serialization.md): AtomicAST 直列形の確定 — wire form = 宣言層のみ (A 群適用済み + installer 語彙 inert、lowered は決定的再導出)、lowered 断面表記 (面構造 / matcher kind + name 参照 entries / 効果記述子 / `#` 予約内部 id) は段階別 fixture 用で緩比較、構造等価で byte 一致不要
- [DR-065](DR-065-conformance-fixture-format.md): conformance fixture フォーマット — why 必須 / query タグ (parse 定義、lower・complete・definition_error 予約) / definition は wire form / expect は DR-053 union 転用 (effects = cli 効果のみが正本、result = ラダー込み最終値) / error kind 割当 (構造的不足・残余 = parse) / 機能領域別ディレクトリ。正本は docs/CONFORMANCE.md
- [DR-066](DR-066-error-reason-codes.md): 実行時エラーの reason コード層 — errors に機械可読な reason 追加 (DR-053 拡張、組み込み発生源は必ず emit)、発生源は descriptor の reasons で宣言 (DR-061 拡張、完備チェック / typo 検出 / L10n の基盤)、組み込み最小語彙 (missing_operand / unexpected_token / constraint 4 種)、fixture は optional 検証
- [DR-067](DR-067-wire-well-formedness.md): wire form の well-formedness — 合法性 3 層 (構文 / 語彙 / 参照)、空 or・空 seq・1 児・トリガ重複は合法 (warn は lint)、name は非空のみ制約 (`#` id はユーザ禁止の予約)、multiple の配置制約なし (F-042 解消)
- [DR-068](DR-068-json-schema-lifecycle.md): JSON Schema と spec バージョンの lifecycle — 確定版 v1.0.0 = 参照実装 fixture green (フェーズ 3)、バージョン単位は spec バンドル一体、semver (語彙追加 = minor だが旧実装は unknown-vocab で正しく拒否、意味論変更 = major)、$schema は確定版から (F-048 解消) — 準拠宣言の単位は updated by DR-069
- [DR-069](DR-069-conformance-profiles.md): 準拠プロファイル — 段階準拠 (parse-core 必須 / lowering / definition-error / completion opt-in)、descriptor の実装要求は owns + reasons のみ (observes / factory 一般化は canonical 実装の装備 = 準拠非要求)
- [DR-070](DR-070-lower-fixture-format.md): lower fixture フォーマット — installers 列挙 (省略 = 全登録、順序非規範)、expect = DR-063 §3 断面の緩比較 (内部 id 綴りと席順は無視)、順列検査は runner 組み込み 2 段 (常時 = 決定的少数 / opt-in = 全順列)、粒度は基本 3 点セット + 厳選組合せ

## レジストリ / 実装連携

- [DR-010](DR-010-external-registry.md): 外部レジストリの階層化と暗黙参照 — updated by DR-035 (definitions/registry 一様化), DR-036 (multiple registry 追加), DR-040 (type 方言の3層上書き)
- [DR-016](DR-016-result-and-context.md): 結果オブジェクトと ParserContext の2層 — required の判定入力は updated by DR-047
- [DR-035](DR-035-definitions-registry-symmetry.md): definitions は registry と同じ区分の名前空間、解決順の一様化 (DR-007 を再編成)
- [DR-036](DR-036-multiple-registry-and-accumulators.md): multiple registry 追加、accumulators の属性セット拡張、collectors は filters で代替 (DR-008/010 を更新)
- [DR-042](DR-042-installer-architecture.md): installer アーキテクチャ — 特殊語彙 (long/short/env/dd) は registry 装置の所有語彙、5 不変則で順序非依存合成、値源はラダー席宣言
- [DR-049](DR-049-env-lookup-contract.md): env lookup の契約 — env_provider は単一スロット `(key) → string | null` (null=未設定、prefix 連結済み key)、env 値は pieceProcessor 通過、auto_env はフル修飾導出で明示 env: 優先
- [DR-050](DR-050-config-file-value-source.md): config ファイル値源 — type: config_file の配線宣言、config_provider は `(path) → 階層オブジェクト | null` (フォーマットは provider の関心)、config_key は同型対応デフォルト + link パス DSL の明示上書き、値の型は要素の type、config は構造に影響しない
- [DR-056](DR-056-vocabulary-ownership-vs-reference.md): 宣言語彙への関わり方 — 所有 (lowering 責務、排他) と参照 (advisory read、自由)。参照の成果は観測挙動に影響してはならない — 機械可読化は DR-061 (descriptor)
- [DR-061](DR-061-registry-descriptor-and-configurable-factory.md): registry 装置の自己記述 — installer descriptor (owns / observes / config キー所有)、wire 追加語彙の正当性 = 所有集合の和、configurable factory ({name, config} 参照、canonical = default config)、config はキー平坦・値自由 JSON、factory config と filter の線引きは「相」
