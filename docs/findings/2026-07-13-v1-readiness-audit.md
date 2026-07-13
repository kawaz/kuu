# kuu v1 readiness 監査レポート

> 対象: spec = `kawaz/kuu` (working copy 最新、DR-102系 未push commit 込み) / 参照実装 = `kawaz/kuu.mbt`
> 検証方式: 委任元が実施した全数検証結果 (20要件) を統合。本レポートは新規調査を行わず、与えられた検証結果のみを根拠とする。

## サマリ

| 判定 | 件数 | 内訳 |
|---|---|---|
| met | 6 | V1-R02, R03, R05, R12, R13, R14 |
| partial | 8 | V1-R01, R06, R07, R08, R09, R10, R15, R18 |
| unmet | 6 | V1-R04, R11, R16, R17, R19, R20 |

v1 到達に向けた最大のボトルネックは **(a) spec リポの未push commit (R19)**、**(b) DR-068/DR-069 間の「fixture 全 pass」範囲の未裁定 (R20)**、**(c) v1.0.0 リリースプロセス自体が両リポどちらにも未構築 (R16/R17/R18)** の3系統。実装・fixture 拡充系の gap (R04, R06, R08, R09, R10) は作業量はあるが設計判断待ちではなく着手可能。

---

## 1. 要件×判定 一覧表

| ID | 要件 (要約) | 判定 | 根拠要約 |
|---|---|---|---|
| V1-R01 | フェーズ0 (ast-spec cleanup) 完了: INDEX.md分類整理・kuu-v0改名・新main作成 | **partial** | INDEX.md分類・kuu-v0改名・新main作成は journal (2026-07-04) に実行記録あり、完了。しかし ROADMAP.md の「単一 git リポ・独立枝群」という記述が実態 (kawaz/kuu と kawaz/kuu.mbt の2独立GitHubリポ) と不整合。kuu.mbt側 ast-spec 枝 (DR-101 まで、5commit遅れ) の削除未実施、kuu(spec)側main (DR-102 まで) との非同期も残存。 |
| V1-R02 | DR-063 直列形決定が DESIGN/LOWERING に反映され schema/wire.schema.json として実体化 | **met** | schema/wire.schema.json 実在、DR-063 §1-4 の構造 (宣言層のみ、lowered産物非搭載、構造等価) を反映。DESIGN §15.7 / LOWERING §C.3 にも転記済み。DESIGN.md:1132 の「書き出しは残作業」という一文が stale (実際は実体化済み) だが要件充足には無影響。 |
| V1-R03 | schema/wire.schema.json が DR-067 §2 構文層 invariant 全項目を実装 | **met** | 葉/枝排他+exact制約 (allOf/not)、or/seq の0/1児許容 (minItems未指定)、multiple/repeat配置非制約、name/id非空+`#`予約 (pattern)、二形フィールド (oneOf) の全6項目を1対1確認。 |
| V1-R04 | DR-067 §3 の property-based test 生成器契約が実装済み | **unmet** | kuu.mbt 全体を generator/proptest/fuzz/arbitrary 系キーワードで grep しても0件。空or/空seq/1児/トリガ重複を合法入力として生成する仕組み自体が存在せず、既存テストは全て手書き fixture ベース。 |
| V1-R05 | フェーズ2-① (最小runner) 完了、fixture誤りがこの時点で検出・修正済み | **met** | journal (2026-07-05) に「fixture 8/8 全て正しい (authoring error ゼロ)」と記録。以後も DR-081/DR-070/2026-07-12記録等で fixture 誤り検出→修正のメカニズムが実際に稼働している実績複数。 |
| V1-R06 | query:"lower" fixture フォーマット (DR-070) 実装、golden断面4種+順列検査 | **partial** | query:"lower" 分岐実装済み、常時少数順列 (pick3: identity/reverse/rotate) 実装済み。golden の A群のみ/全収束形/厳選組合せ3組は充足。**単独installer全種13種のうち6種 (command/global/constraint/alias/inheritable/config) は単独golden fixtureが欠如** (常に他installerとの組合せの中でのみ登場)。opt-in全順列検査は未実装。 |
| V1-R07 | query:"definition_error"/"complete" が DR-070 と同格の DR として確定 | **partial** | definition_error は DR-082 で確定済み (fixture 13件実在)。**complete は未確定** — 専用DR無し、fixture 0件、CONFORMANCE.md:24 は両方とも「予約」表記のまま (definition_error確定後も追随していないstale記述)。 |
| V1-R08 | 全installer/canonical factory/組み込みfilter/遅延述語のdescriptorがowns/observes/config/reasonsで宣言されschema/builtin-descriptors.jsonに実体化 | **partial** | canonical factory (4件: number/int/bool/tty parser) + 組み込みfilter (6件) はDR-095で実体化済み。**installer descriptor (long/short/dd/env/command/global/inherit/repeat/multiple/constraint/alias/inheritable/config、canonical 13種) は0件**、$comment欄で明示的にスコープ外と記載。遅延述語 (required/requires/exclusive_group/conflicts_with) のreasonsも同様に対象外。 |
| V1-R09 | DR-054 の8種definition-error kindがschema+fixtureに反映、各kind最低1件のfixture case存在 | **partial** | schema (fixture.schema.json) は8種kind列挙を完備。**fixture caseは3/8種のみ実在** (unknown-vocab/invalid-range/invalid-argument)。残り5種 (vocab-intersection/absent-ref/circular-ref/zero-progress/config-cycle) をtriggerするfixture caseが0件。参照実装側 (kuu.mbt installer.mbt) はこれら5種を生成するロジックを実装済み (到達可能コード)。 |
| V1-R10 | DR-066 §3 のv1組み込みreason10種がdescriptor reasonsに過不足なく写像 | **partial** | value_parser系4種 (not_a_number/not_an_integer/not_a_bool/int_out_of_range) は写像済み。**残り6種 (missing_operand/unexpected_token/required_violated/requires_violated/exclusive_group_violated/conflicts_with_violated) はinstaller/constraint descriptor自体が未実体化のため写像なし** (V1-R08の欠落に起因、DR-095自身がスコープ外と明記)。 |
| V1-R11 | 4準拠プロファイルの定義がDESIGN.md/CONFORMANCE.mdに明文反映 | **unmet** | DESIGN.md/CONFORMANCE.md を「DR-069」「プロファイル」等で grep して0件ヒット。DR-068の更新注記・INDEX.mdには反映あるが、これは要件が明示的に除外する「DR本文」側であり「現役仕様文書」への転記は未実施。CONFORMANCE.md:24 の「complete/definition_error は予約」という表記もDR-069制定後にアップデートされていない。 |
| V1-R12 | 参照実装がparse-coreプロファイル対応fixture (query:"parse"全件) を全green | **met** | query:"parse" 174件、conformance runner が lowering 内包の形で実食、統括検証値 skipped=0/mismatches=0 でgreen。dec_fixture内でparse_definition (installer chain実行) を呼びlowering内包を実装的に確認。 |
| V1-R13 | 準拠必須はowns/reasonsの2軸のみ、observes/一般config-factoryは準拠に不要 | **met** | kuu.mbtにobserves概念の実装 (help installer等) やfilter/accumulator/completerのconfig一般適用が一切存在しない (grep 0件) にもかかわらずconformance全554ケースmismatches=0。owns+reasons(+types factory)のみでconformanceが成立することが構成的に証明されている。 |
| V1-R14 | 評価器コアがゼロ設計構築、PoC破れ2件がMDRに記録、slice凍結fail相当が解消 | **met** | MDR-002に破れ1 (完成オラクル大域境界)・破れ2 (Pending中間状態欠如) の設計判断・却下案含め記録。cont.mbt (CPS化)、Branch::Pending 3値化を実装確認。旧slice `poc/phase16_wbtest.mbt` の凍結fail相当シナリオがeval_wbtest.mbtで解消 (期待通りSuccess+tail_ok) を確認。 |
| V1-R15 | 参照実装がconformance fixture全体をgreen (DR-068 §1のv1.0.0発行トリガ) | **partial** | 現存fixture (parse 174/lower 23/definition_error 13、計210件) は全green (skipped=0,mismatches=0)。**completionのconformance fixtureが0件のためfixtureベースで検証不能** (ユニットテスト complete_wbtest.mbt のみでspec conformanceとは非連動)。DR-068の「fixture全pass」がDR-069の4プロファイル全部を指すか parse-core のみで足りるかが両DR間で未裁定 (→V1-Q1)。 |
| V1-R16 | v1.0.0タグ/リリースがspecバンドル全体を単一バージョンとして同時発行する仕組みが用意されている | **unmet** | spec(kuu)リポにVERSION/.github/release処理が存在しない (justfileはpush系taskのみ、tag未作成)。kuu.mbt側release.ymlは参照実装自体のsemverタグ発行のみでspecバンドル一体発行の仕組みではない。 |
| V1-R17 | schema/*.jsonの$idがバージョン付きURIに更新される仕組み・確定時のホストURI確定手順が用意 | **unmet** | 現状$id未設定 (ドラフト期の意図通り)。しかし**確定時に$idを更新する発行手順書 (runbook) が存在しない**。DR-068自身が「ホストURI確定 (発行時)」を射程外としており後続issue/runbookでも拾われていない。 |
| V1-R18 | DESIGN §0.1のドラフト期宣言文がv1.0.0発行と同時に確定版宣言へ更新される | **partial** | ドラフト期宣言文は現状も未確定のまま (意図通り)。DR-068にv1.0.0発行時に更新する「意図」は明記されているが、**それを実行する発行チェックリスト/runbookが存在しない** (漏れリスクあり)。 |
| V1-R19 | spec working copyの未push commit (DR-102系等) がv1.0.0確定宣言前にpush済み | **unmet** | origin/main (538b839a) に対しworking copy @は6 commit先行 (DR-102 decisions/fixture pin/DESIGN反映等含む)。jj status自体はクリーン (commit済みだが未push)。 |
| V1-R20 | DR-068 §1「fixture全pass」とDR-069「parse-core最小/他opt-in」の関係が明示裁定されている | **unmet** | 両DR本文・ROADMAP・DESIGNいずれにも明示裁定なし。archived issue (2026-07-08-schema-materialization-and-reason-descriptors.md, SCH-Q4-c) がこの緊張を「fixture green発行条件と衝突したままv1到達」と既に指摘済みだが未解消。現存issue (2026-07-12-complete-query-fixture-coverage-gap.md) もこの矛盾の顕在化。 |

---

## 2. DR-069 opt-in プロファイルの v1 必須要件からの除外について

DR-069 §1 は準拠プロファイルを **parse-core (必須・lowering内包) / lowering・definition-error・completion (opt-in)** と定義し、「kuu 準拠を名乗る最小条件は parse-core green」としている (V1-R11 evidence)。

この定義に基づくと、以下の点は **v1 の必須ブロッカーではなく opt-in 領域の残作業** として扱ってよい:

- **V1-R07 の complete フォーマット未確定**: query:"complete" の fixture format 確定は DR-069 上 opt-in プロファイル (completion) の話であり、parse-core green のみが必須条件なら v1.0.0 発行の前提にはならない。
- **V1-R15 の completion fixture 0件**: 同上。completion プロファイルの fixture 不在は、DR-069 の字義通りなら v1 到達を妨げない。

ただし、これは **DR-069 側の定義を字義通り適用した場合の解釈**であり、**DR-068 §1 の「fixture 全 pass」という無限定な文言と正式に整合が取られていない** (V1-R20 参照)。したがって「completion は v1 必須要件から除外される」という結論自体は DR-069 単体からは導出できるが、**DR-068 との優先関係が未裁定である限り、この除外は正式決定ではなく解釈の域を出ない**。V1-Q1 (下記) の裁定が下るまで、completion 除外は暫定扱いとすべき。

一方、**lowering (V1-R06) と definition-error (V1-R09) は opt-in プロファイルではあるものの、実質的にはほぼ実装・fixture化が進んでおり、gap は「網羅性の不足」であって「未着手」ではない**。DR-069 上は opt-in でも、既存投資を無駄にしないためこれらの残 gap 埋めは v1 前に完了させておくのが望ましい (作業リスト参照)。

---

## 3. v1 までの残作業リスト (依存順・着手可能性つき)

### Tier 0: 即着手可能・依存なし (最優先)

1. **[V1-R19] spec リポの未push commit を push**
   `just push` (bump-semver vcs push --branch main --jj-bookmark-auto-advance) を実行し、DR-102系6commitをorigin/mainへ反映。他作業に依存せず即実行可能。push前に他並行エージェント (spec-dr102等) の書き込み競合が無いことのみ確認。

2. **[V1-R20] DR-068/DR-069 の「fixture 全 pass」範囲の裁定 (V1-Q1)**
   後続の多くの判断 (R11転記内容、R15の発行トリガ、R16-R18のリリースプロセス設計) の前提になるため最優先で裁定すべき。archived issue SCH-Q4 の a/b/c 案を再訪し、正式に選択した案をDRとして記録する。

### Tier 1: Tier 0 裁定後に方向性が固まる作業 (並行着手可)

3. **[V1-R11] DESIGN.md/CONFORMANCE.mdへのDR-069プロファイル定義の転記**
   V1-Q1裁定を受けて内容を確定させた上で転記 (プロファイル表・parse-coreがloweringを内包する旨・最小条件)。あわせてCONFORMANCE.md:24の「complete/definition_error は予約」というstale表記を更新。

4. **[V1-R16] spec リポのリリースプロセス構築**
   VERSION相当の表現・DESIGN+LOWERING+CONFORMANCE+fixture+Schemaを一体でタグ付けするtask/workflowを新設。V1-Q1裁定の結果 (発行条件の対象プロファイル範囲) を反映する必要があるためTier0後が望ましいが、雛形設計自体は並行着手可。

5. **[V1-R17] v1.0.0発行手順書 (runbook) の新設 + $id更新タスクの明記**
   V1-R16のリリースプロセスと統合して設計。schema/*.json 4ファイルの$idバージョン付きURI更新タスクを含める。

6. **[V1-R18] 発行チェックリストへのDESIGN §0.1文言更新タスク追加**
   V1-R17のrunbookと統合可能 (同一チェックリスト内の1項目として追加)。

### Tier 2: 独立して着手可能な fixture/schema/実装拡充 (Tier 0/1と並行可)

7. **[V1-R09] definition-error fixture 5種の追加**
   vocab-intersection / absent-ref / circular-ref / zero-progress / config-cycle の各kindをtriggerする具体的definition入力を設計しfixture化。参照実装 (installer.mbt) は既に生成ロジックを持つため実装側追加作業は不要、spec側のfixture設計が中心。

8. **[V1-R08] installer descriptor (owns/observes/config/reasons) の実体化**
   canonical installer 13種のdescriptorをschema/builtin-descriptors.json相当の場所に追加。DR-095と同格の新規issue/DRとして起票が必要。

9. **[V1-R10] installer/constraint reasons 6種のdescriptor写像**
   V1-R08の実体化に依存 (installer descriptorが無いと写像先が無い)。missing_operand/unexpected_token (installer由来) とrequired_violated等4種 (constraint installer由来) を追加。あわせてint_out_of_rangeのfixture case追加も検討。

10. **[V1-R06] lowering golden fixtureの拡充 + opt-in全順列検査の実装**
    単独installer golden 6種 (command/global/constraint/alias/inheritable/config) の追加是非をV1-Q2で判定した上で対応。opt-in全順列検査 (明示フラグ/nightly) をjson_conformance_wbtest.mbtに追加。

11. **[V1-R04] property-based test 生成器の実装**
    DR-067 §2構文層invariantを満たすwire AST生成器を実装し、空or/空seq/1児/トリガ重複を生成対象に含めるproperty testをwbtestとして追加。他の作業から独立。

12. **[V1-R01] ROADMAP.mdのリポ構成記述更新 + kuu.mbt側ast-spec枝の削除・両リポ同期**
    ドキュメント更新は即着手可。ast-spec枝削除は journal (2026-07-04) が既に指示済みの残作業の実施。DR-102系の同期はV1-R19のpush後に再確認。

### Tier 3 (opt-in、v1必須ではないが記録推奨)

13. **[V1-R07] query:"complete" fixture format確定DRの起票**
    DR-069のopt-inプロファイルのためv1発行のブロッカーではないが (§2参照)、V1-Q1裁定で「completionも必須」と決まった場合はTier 0/1相当に格上げが必要。現時点ではv1後回しとして記録するか、DR起票のみ先行させるかを判断 (→V1-Q3)。

---

## 4. 裁定・追加調査が必要な項目 (V1-Q ラベル)

導出可能な事項は上記本文中で導出済み。以下は検証結果だけでは判定できず、ユーザー裁定または新規DR起票が必要な項目。

### V1-Q1: DR-068 §1「fixture 全 pass」が指す範囲の裁定
**論点**: v1.0.0 発行条件は (a) parse-core プロファイルの fixture green のみで足りるか、(b) DR-069 の4プロファイル (parse-core/lowering/definition-error/completion) 全部の green を要求するか。
**現状**: 両DR本文とも明記なし。archived issue SCH-Q4 (2026-07-08-schema-materialization-and-reason-descriptors.md) が同一論点をa/b/c案で提示済みだが選択記録なし。現存issue (2026-07-12-complete-query-fixture-coverage-gap.md, status: wip) がこの矛盾の実害 (completion fixture 0件でv1到達不能になりうる) を記録中。
**影響範囲**: V1-R11 (転記内容), V1-R15 (発行トリガ判定), V1-R16-18 (リリースプロセス設計), 本レポート §2 の除外解釈の正式性。
**裁定なしでの暫定解釈**: DR-069 §1 の字義 (「parse-core green が最小条件」) を採用すれば (a) が自然だが、DR-068 §1 の無限定文言と矛盾したままでは正式な発行条件として使えない。

### V1-Q2: lowering golden fixture の単独installer 6種欠落の性格
**論点**: command/global/constraint/alias/inheritable/config の6installerについて、単独 (installers=[<自分だけ>]) の golden fixture が存在しない状態は (a) DR-070 §4 の意図的省略 (これらは「構造語彙を持たない席宣言型installer」であり単独では構造衛星が展開されないため、他installerとの組合せでのみ意味を持つ)、(b) 単純な fixture 拡充漏れ、のどちらか。
**現状**: fixture 内の why コメントで「席宣言型」という性質への言及はあるが、DR-070 文言の字義 (「単独installer全種」の明記) とは食い違う。DR-070 側での明示的な例外規定は無い。
**影響範囲**: V1-R06 の完全充足可否、作業リスト項目10のスコープ。

### V1-Q3: query:"complete" フォーマット確定DRの起票スケジュール
**論点**: completion は DR-069 上 opt-in のため v1.0.0 発行のブロッカーではない (§2参照) が、DR-082 (definition_error) と同格の DR を v1 前に起票して「予約」状態を解消すべきか、v1後の課題として明示的に先送りするか。
**現状**: 現存issue (2026-07-12-complete-query-fixture-coverage-gap.md) が課題として認識済みだが、起票時期の方針決定はされていない。V1-Q1 の裁定次第でこの項目の優先度が変わる (V1-Q1が(b)なら必須に格上げ)。

---

## 5. 検証結果に基づく補足事項

- V1-R02 evidence 内で発見された **DESIGN.md:1132 の stale 記述** (「Schema ファイルのドラフト書き出しは残作業」← 実際は実体化済み) は要件充足自体に影響しないが、`no-historical-noise` の観点で削除対象。V1-R11 の転記作業と合わせて修正するのが効率的。
- V1-R09 の definition-error 5種欠落について、**参照実装側 (kuu.mbt installer.mbt) は該当ロジックを実装済み** (dead codeではなく到達可能) であることが確認されている。したがって作業の中心は spec 側の fixture 設計であり、実装側の新規開発は不要と見られる (ただし installer_wbtest.mbt での単体テストカバレッジも absent-ref 以外未確認、あわせて点検が望ましい)。
- V1-R13 は「observes/一般config-factoryが参照実装に一切実装されていないにもかかわらずconformance全green」という構成的証拠によりmet判定されているが、これは**参照実装が意図的にscopeを絞った設計選択**であり、他言語での将来的な多言語実装がこの2軸を実装する場合の互換性検証はまだ行われていない点に留意 (v1要件外の観測事項)。
