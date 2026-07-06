---
title: 蒸留 wave1/wave2 監査で出た仕様詰め所の集約 (フェーズ2-③ 議論球)
status: wip
category: design
created: 2026-07-05T22:04:45+09:00
last_read: 2026-07-06T00:48:55+09:00
open_entered: 2026-07-05T22:04:45+09:00
wip_entered: 2026-07-06T00:52:45+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: フェーズ2-③ 蒸留 wave1/wave2 監査 (自リポ TODO)
---

# 蒸留 wave1/wave2 監査で出た仕様詰め所の集約

## 概要

フェーズ2-③ の parse fixture 蒸留 (wave1/wave2、`docs/issue/2026-07-05-phase23-distill-ledger.md` 台帳ベース) を実施した監査過程で、仕様側の詰め所・要確認事項が複数出た。個別 fixture の実装判断に埋もれさせず、ここに集約して次の議論球とする。未蒸留のまま残っている slice テストは phase1:130/147、phase23:15/30 の 4 件 (下記 (1) に関連)。

## 背景

蒸留 agent が「wire で宣言不能」と報告したケースの一部は、DESIGN.md / DR の該当箇所を読み返すと表現可能に見えるものがあり、agent の転写都合 (見落とし) なのか本当の仕様欠落なのか切り分けが必要。また CONFORMANCE.md / DESIGN.md の記述が未明示のまま fixture 実装 (slice 実測) が先行してしまっている論点もあり、どちらを正とするか pin する必要がある。

## 論点

1. **wire-form 表面の疑義 (要再検証)**: 共有 or-template / 可変アリティ option / 匿名副スコープが wire で宣言不能と蒸留 agent が報告したが、`definitions.types` テンプレ (DESIGN §3.1) + or キー形 (§1.2) + 可変アリティ `--color` 例 (§15.4) で表現できる可能性が高い。未蒸留 4 テスト: phase1:130/147, phase23:15/30。agent の転写都合 (見落とし) か仕様欠落かの切り分けが先決。
2. **ambiguous interpretations の配列順序規範**: 集合として扱うか列として扱うか、CONFORMANCE §3 に未明示。 → **[pin 済み・第1バッチ]** 集合的比較・順序非規範 (CONFORMANCE §3 + DR-053 §3)。dedup 多重度軸は論点 7 (export-key 衝突の担体) に従属し本項では定めず #7 送り。
3. **number value_parser の trailing-suffix 寛容度**: DR-041 §3 の "1.0f" 値付着例と DR-040 の 10 進最小構文の間にテンションがある。明文化が必要。
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
- 残 3 論点 (#1/#3/#5) は未決 (needs-discussion / 第3バッチ以降)。よって status は wip 継続。

## 受け入れ条件

- [ ] 各論点について仕様側 (DESIGN.md / CONFORMANCE.md / DR) を pin するか、意図的に「フェーズ2 継続検討」として保留するかを決定 — **7/10 決定済み (#10/#9/#2/#8/#6/#4/#7)。残 #1/#3/#5**
- [ ] (1) の wire-form 表面疑義は再検証し、表現可能なら蒸留 agent 側の見落としとして是正、不可能なら仕様拡張の要否を判断 — 未着手 (#1 は第1・第2バッチ外)
- [x] pin した内容を該当 DR または DESIGN.md に反映 — **第1・第2バッチ分は反映済み (上記 進捗)。残 3 論点の反映は決定後**
