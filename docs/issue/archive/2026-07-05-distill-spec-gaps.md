---
title: 蒸留 wave1/wave2 監査で出た仕様詰め所の集約 (フェーズ2-③ 議論球)
status: resolved
category: design
created: 2026-07-05T22:04:45+09:00
last_read: 2026-07-06T00:48:55+09:00
open_entered: 2026-07-05T22:04:45+09:00
wip_entered: 2026-07-06T00:52:45+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-08T22:02:11+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-074","dr/DR-073","implemented","issue/2026-07-08-schema-materialization-and-reason-descriptors","issue/2026-07-08-remaining-value-fixtures","issue/2026-07-08-negatable-sugar-b3-ruling","issue/2026-07-08-inf-json-serialize-convention"]
blocked_by:
origin: フェーズ2-③ 蒸留 wave1/wave2 監査 (自リポ TODO)
---

# 蒸留 wave1/wave2 監査で出た仕様詰め所の集約

## 概要

フェーズ2-③ の parse fixture 蒸留 (wave1/wave2、`docs/issue/2026-07-05-phase23-distill-ledger.md` 台帳ベース) を実施した監査過程で、仕様側の詰め所・要確認事項が複数出た。個別 fixture の実装判断に埋もれさせず、ここに集約して次の議論球とする。かつて未蒸留だった slice テスト phase1:130/147、phase23:15/30 の 4 件 (下記 (1)) は決着済み — 3 件を蒸留し phase1:130 は消し込んだ。

## 背景

蒸留 agent が「wire で宣言不能」と報告したケースの一部は、DESIGN.md / DR の該当箇所を読み返すと表現可能に見えるものがあり、agent の転写都合 (見落とし) なのか本当の仕様欠落なのか切り分けが必要。また CONFORMANCE.md / DESIGN.md の記述が未明示のまま fixture 実装 (slice 実測) が先行してしまっている論点もあり、どちらを正とするか pin する必要がある。

## 論点

1. **wire-form 表面の疑義 (要再検証)**: 共有 or-template / 可変アリティ option / 匿名副スコープが wire で宣言不能と蒸留 agent が報告したが、`definitions.types` テンプレ (DESIGN §3.1) + or キー形 (§1.2) + 可変アリティ `--color` 例 (§15.4) で表現できる可能性が高い。未蒸留 4 テスト: phase1:130/147, phase23:15/30。agent の転写都合 (見落とし) か仕様欠落かの切り分けが先決。 → **[pin 済み・第3バッチ (kawaz 裁定 2026-07-06)]** 案 a: 4 件中 3 件 (phase1:147 可変アリティ / phase23:15 異位置失敗 / phase23:30 同深タイ) は蒸留 agent の転写ミス (slice の lowered 形をそのまま literal 転写していた) で wire form で表現可能と確定 → 蒸留した (共有トリガを long/short に factor out し or はアリティ/構造差分のみを担う。or キー形 §1.2 + 可変アリティ --color §15.4 + DR-053 §2/§3、wire schema 検証済み)。残る phase1:130 (匿名副スコープ) は『背骨を作れるのは command 部分木のみ』(DR-042 ⑤) を維持して wire fixture 化せず消し込み — engine 内部不変則で、背骨境界の greedy 面遮断の意味論は fixtures/command-scope/ 群 (early-close / shadowing 系) が parse 観測で被覆済み。DR-042 は無変更。蒸留先・消し込み根拠は台帳 (phase23-distill-ledger.md) D1 に記録。
2. **ambiguous interpretations の配列順序規範**: 集合として扱うか列として扱うか、CONFORMANCE §3 に未明示。 → **[pin 済み・第1バッチ]** 集合的比較・順序非規範 (CONFORMANCE §3 + DR-053 §3)。dedup 多重度軸は論点 7 (export-key 衝突の担体) に従属し本項では定めず #7 送り。
3. **number value_parser の trailing-suffix 寛容度**: DR-041 §3 の "1.0f" 値付着例と DR-040 の 10 進最小構文の間にテンションがある。明文化が必要。 → **[pin 済み・第4バッチ (kawaz 裁定 2026-07-06、全軸)]** DR-074 新設で number/bool canonical 字句を全面確定。number は「10 進最小」でも「JSON 同型」でもなく実用寛容 10 進固定字句 (leading +/007=decimal/.5・1./_ default/基数 prefix+hex float 統合 opt-in/inf は float 型のみ・nan Error/型 suffix 非採用)、bool は [true,1]/[false,0,""]+ci を新設。型 suffix 非採用の帰結として `-n1.0f` の値付着枝が canonical で Error に落ちるため cluster-split.json/cluster-split-no-flag.json の golden を canonical 準拠へ更新 (DR-038/041 の -n1.0f 例は条件形で本文不変、ambiguity 原則は suffix 非依存の cluster-split-string.json が被覆)。DESIGN §3.3/§3.4 改訂で G8 (最寛容 vs 最小) 解消。DR-040 に updated marker。輪郭 fixture を fixtures/value-typing/ に新設。
4. **backtrack 枯渇時の held errors SET の多重度**: 全取り分の失敗を積むか最深のみ保持するか未 pin。`fixtures/repeat-parse/backtrack.json` が genuine-failure ケースを保留中。 → **[pin 済み・第2バッチ]** 案 a (全取り分累積) で pin。全取り分が dead-end なら各取り分の躓きを errors に全保持 (最深のみ保持ではない、slice 現行挙動が仕様)。成功側の取り分選好 (DR-043) との層区別: 成功側の畳み = 解釈の同一性、失敗側の全保持 = 診断材料 (層が違うので矛盾しない)。DR-053 §2 に注記、CONFORMANCE §2 に補足、`fixtures/repeat-parse/backtrack.json` に no-number-genuine-failure case 追加 (期待値は DR-053 §2 から導出)。
5. **value_parser 系 reason (not_a_number 等) の descriptor 実体化**: 既知の宿題 (Schema 実体化)。
6. **inheritable write-target の result キー export**: Model X (子 default への導管のみ、root に出さない) vs Model Y (root にも出す)。slice 実測は Model Y、`fixtures/inheritable-parse` は Model Y 準拠で先行している。 → **[pin 済み・第1バッチ]** Model Y (祖先 write-target も自スコープの結果キーに露出) を pin。既存 3 規則の合成で新機構ゼロ (DESIGN §11.3 + DR-059 §5)。導管のみ (per-copy export_key opt-out) はフェーズ2 継続検討。
7. **export-key の collision fixture での interpretations 表現**: 両解釈が `{x:true}` に退化し ambiguous 期待が弱い。露出キー衝突時の interpretations 表現の詰めが必要。 → **[pin 済み・第2バッチ]** ambiguous 維持 + 解釈ごとの optional claimants 面 (露出キー → 占有実体 entity name)。衝突は結果キーの provenance の曖昧さで、値/source では区別不能・実体 entity が一意識別子。fixture は各解釈を `{result, claimants}` の組で表し集合比較 (順序非依存)。DR-073 新設、CONFORMANCE §2/§3 + DESIGN §15.5 に反映、`fixtures/export-key/collision.json` co-exposure-collision に claimants 追加。lint は別綴りだけの co-export に link 提案 (別実体 co-export は正当なので提案止まり)。DR-021 のオントロジー (衝突 = ambiguous) 継続。
8. **deprecated の warnings を期待値語彙 (`expect.warnings`) に足すか**: `fixtures/alias-parse/deprecated.json` が先行使用している。CONFORMANCE §2 の outcome union に warnings は未記載。 → **[pin 済み・第1バッチ]** warnings (optional) を CONFORMANCE §2 success + §3 比較規約に正式追加 (各要素 {element, kind}、sources 同型 projection、kind は optional 検証)。
9. **bare separator の accumulator 昇格**: multiple 宣言なしで separator があれば append する挙動。DESIGN §6.3 に未記載だが slice 実装は存在する。明文化が必要。 → **[裁定済み・第1バッチ]** #10 の帰結で非-gap (bare separator は仕様概念として存在しない = wire で表現不能、昇格ルール自体が moot)。canonical form は `multiple:{accumulator:"append", separator:","}` (DESIGN §6.3)。残余 (repeat×separator の nested-piece accumulator が平坦か入れ子か) は該当型が現 corpus に無く検証 fixture を書けないため defer。
10. **separator の standalone wire フィールド不在**: multiple パイプライン経由に一本化されているかの確認。 → **[pin 済み・第1バッチ]** separator は multiple パイプライン成分のみ、standalone wire フィールドは設けない (DESIGN §6.3、全一次資料一致)。reader 死票 whitelist 掃除は #9 決着後の follow-up (別 issue)。

各項の詳細根拠は該当 fixture の why コメントと関連 DR を参照。

## 進捗

- 10 論点の並列分析 (議論材料の準備) を完了。kawaz が第1バッチ 5 論点 (#10/#9/#2/#8/#6) を推奨案どおり ink。
- 第1バッチ 5 論点を spec 文書 + fixture ヘッジに反映済み:
  - **#10+#9**: DESIGN §6.3 に「separator は multiple 内のみ / bare separator は仕様概念として存在しない / 分割の canonical form」を明文化。#9 残余 (repeat×separator の nested-piece accumulator) は該当型が corpus に無く検証 fixture を書けないため **defer**。fixtures/multiple-parse/{separator-split,separator-repeat}.json のヘッジ除去。
  - **#2**: CONFORMANCE §3 + DR-053 §3 に interpretations の集合的比較・順序非規範を追記。dedup 多重度軸は論点 #7 (export-key 衝突の担体) に従属し本項では定めず **#7 送り**。fixtures/matcher-readings/cluster-split.json のヘッジ除去。
  - **#8**: CONFORMANCE §2 success + §3 に warnings (optional、{element, kind}) を正式追加。fixtures/alias-parse/deprecated.json の SPEC GAP 注記解消。
  - **#6**: DESIGN §11.3 + DR-059 §5 に Model Y を明文化。fixtures/inheritable-parse/basic.json のヘッジ除去。
- kawaz が第2バッチ 2 論点 (#4/#7) を裁定 (2026-07-06)。spec 文書 + fixture に反映済み:
  - **#4**: 案 a (全取り分累積) で pin。DESIGN/DR-053 §2 に「取り分次元の dead-end も全保持」を注記 (成功側の取り分選好 DR-043 との層区別 = 解釈の同一性 vs 診断材料)。CONFORMANCE §2 failure に補足。fixtures/repeat-parse/backtrack.json に no-number-genuine-failure case 追加 (全取り分の躓きを errors に列挙、期待値は DR-053 §2 から導出)。
  - **#7**: ambiguous 維持 + 解釈ごとの optional claimants 面で pin。DR-073 新設 (INDEX 追記)。CONFORMANCE §2 ambiguous + §3 に claimants ({result, claimants} の組・集合比較で順序非依存) を定義。DESIGN §15.5 に claimants 言及を追加。fixtures/export-key/collision.json の co-exposure-collision に claimants 追加 (退化ビューを provenance で区別)、要確認注記を DR-073 参照の確定文言へ。single-exposure-ok の preset default 論点は別論点として残置。
- kawaz が第3バッチ 1 論点 (#1) を裁定 (2026-07-06、案 a)。fixture + 台帳に反映済み:
  - **#1**: wire-form 表面疑義 4 件は「3 件は蒸留 agent の転写ミス (lowered 形の literal 転写) → wire で表現可能、蒸留する」「phase1:130 (匿名副スコープ) は DR-042 ⑤『背骨は command 部分木のみ』維持で消し込み」で決着。蒸留 3 fixture (path-search/{variable-arity-ambiguous, held-errors-distinct-depth, held-errors-same-depth}.json、共有トリガ factor out + or アリティ差分、wire schema 検証済み) を新設。phase1:130 は engine 内部不変則で背骨境界の意味論は fixtures/command-scope/ 群が被覆。DR-042 は無変更。台帳 (phase23-distill-ledger.md) D1 の 4 行を消し込み。
- kawaz が第4バッチ 1 論点 (#3) を全軸裁定 (2026-07-06)。spec 文書 + fixture に反映済み:
  - **#3**: DR-074 新設で number/bool canonical 字句を全面確定。number = 実用寛容 10 進固定字句 (leading +/007=decimal/.5・1./_ default 桁区切り/基数 prefix+hex float 統合 opt-in `number_allow_base_prefix`/inf は float 型のみ・nan は両型 Error/型 suffix 非採用)、bool = `["true","1"]`/`["false","0",""]`+ci 新設、bool↔number は文字列 parse 可・型変換 Error、anchored 契約明文化、負数 arity 駆動消費。DESIGN §3.3/§3.4 改訂で G8 (§3.4「最寛容」vs DR-040「最小」) 解消・JSON 同型看板除去。DR-040 に updated marker。整合スイープ: 型 suffix 非採用の帰結で fixtures/matcher-readings/cluster-split.json (ambiguous→success) + cluster-split-no-flag.json (success→failure) の golden を canonical 準拠へ更新 (DR-038/041 の -n1.0f 例は条件形で本文不変、ambiguity 原則は新設 cluster-split-string.json が suffix 非依存で被覆)。輪郭 fixture を fixtures/value-typing/ に 5 件新設 (number-decimal-lexicon / -base-prefix-rejected / -base-prefix-optin / -inf-nan / bool-canonical)。
- 決着 9/10 (#10/#9/#2/#8/#6/#4/#7/#1/#3)。残 1 論点 (#5 value_parser reason の descriptor 実体化 = Schema 実体化の宿題、needs-discussion) のため **status は wip 継続**。
- **残 open 事項 (フェーズ2 継続、#3 の裁定に付随)**:
  - **short × 文字系値の ambiguity fixture 化**: `-inf` が short flag 列 `-i -n -f` とも読める等の衝突は matcher の枝生成 + 完全経路一意化で扱う方針が確定 (DR-074 §5、DR-038/041 の既存原則、モード指定なし)。その ambiguity を固定する fixture 化はフェーズ2 継続。
  - **negatable 糖衣 (bool 否定形 B3)**: findings で `--no-` 自動生成が variant DSL 明示宣言方針の反例にならない (糖衣層 = name preset / モデル層 = 明示 variant) と整理済みだが、negatable プリセットを lowering で明示 variant へ展開する糖衣の採否は未裁定。
  - **int 型の hex 値空間判定** (`0x1.8p3`=12 可 / `0x1.8p0`=1.5 は not_an_integer): DR-074 §2 で規定済みだが fixture は int factory の base_prefix 配線確定後 (number-base-prefix-optin は number 型のみ被覆)。→ **M2 決着 (下記進捗参照)** で DR-075 により確定、fixture 化は base_prefix 配線後 (value-typing-s7-fixtures で追跡) のため継続。
  - **inf の operand/result JSON serialize 規約**: JSON に inf リテラルが無く未確定 (number-inf-nan は accept 側を成功輪郭のみ固定)。value-typing.json の 1.0→"1" 表記未確定と同族。
  - **bool value_parser 失敗の reason**: DR-066 v1 に bool 用 reason 語彙が無く bool-canonical::yes-rejected は kind まで検証。#5 (reason descriptor 実体化) に合流しうる。
- kawaz が M2 (int の String parse が構文判定か値空間判定か) を裁定 (2026-07-06、DR-075 新設)。spec 文書に反映済み:
  - **M2**: 値空間判定で確定。int は整数「値」を受理 (`"3.0"`→3 / `"1e3"`→1000)、真に fractional な値のみが `kuu_int_parser` factory の config キー `int_round` (10 種体系完備、canonical default `error`) に従う。DR-074 §2 暫定注記を解消、DR-050 §4 の構文判定寄り読みを supersede、DR-066 §3 の `not_an_integer` は `int_round=error` のときのみ emit と注記、DR-061 に `int_round` 平坦キー例追加、DESIGN §3.3/§3.4 改訂 (値空間判定 + `int_round` + default `error` + factory config 例)。String 源は binary64 非経由の厳密判定を必須要件化 (native-number 源は JSON 由来 binary64 で対象外の非対称)。fixture 2 件新設 (`int-value-space.json` = error モードの受理輪郭 / `int-round-modes.json` = 代表 4 モードの判別ベクタ横並び)。これで残 open 事項の「int 型の hex 値空間判定」は DR-075 で確定 (fixture は int factory の base_prefix 配線後、value-typing-s7-fixtures で追跡)。main 10 論点は #5 (value_parser reason の descriptor 実体化 = Schema 実体化の宿題) が未決のため status は wip 継続 (M2 は #3/#5 派生の詰め所で、main 論点カウントとは別軸)。

## 受け入れ条件

- [ ] 各論点について仕様側 (DESIGN.md / CONFORMANCE.md / DR) を pin するか、意図的に「フェーズ2 継続検討」として保留するかを決定 — **9/10 決定済み (#10/#9/#2/#8/#6/#4/#7/#1/#3)。残 #5 (value_parser reason の descriptor 実体化) のみ未決。#3 に付随する残 open 事項 (short×文字系 ambiguity fixture / negatable B3 / int hex 値空間 fixture / inf serialize / bool reason) はフェーズ2 継続 (上記 進捗)**
- [x] (1) の wire-form 表面疑義は再検証し、表現可能なら蒸留 agent 側の見落としとして是正、不可能なら仕様拡張の要否を判断 — **完了**: 4 件中 3 件は転写ミス (lowered 形 literal 転写) と確定し wire form で蒸留 (共有トリガ factor out + or アリティ差分、wire schema 検証済み)、phase1:130 は DR-042 ⑤ 維持で消し込み。仕様拡張は不要 (既存 or キー形 §1.2 + §15.4 + DR-053 で表現可能)
- [x] pin した内容を該当 DR または DESIGN.md に反映 — **第1・第2・第3バッチ分は反映済み (上記 進捗)。#1 は仕様拡張不要が結論のため DR/DESIGN 無変更、蒸留 fixture + 台帳 D1 に反映。残 #3/#5 の反映は決定後**
