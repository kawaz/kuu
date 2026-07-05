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
2. **ambiguous interpretations の配列順序規範**: 集合として扱うか列として扱うか、CONFORMANCE §3 に未明示。
3. **number value_parser の trailing-suffix 寛容度**: DR-041 §3 の "1.0f" 値付着例と DR-040 の 10 進最小構文の間にテンションがある。明文化が必要。
4. **backtrack 枯渇時の held errors SET の多重度**: 全取り分の失敗を積むか最深のみ保持するか未 pin。`fixtures/repeat-parse/backtrack.json` が genuine-failure ケースを保留中。
5. **value_parser 系 reason (not_a_number 等) の descriptor 実体化**: 既知の宿題 (Schema 実体化)。
6. **inheritable write-target の result キー export**: Model X (子 default への導管のみ、root に出さない) vs Model Y (root にも出す)。slice 実測は Model Y、`fixtures/inheritable-parse` は Model Y 準拠で先行している。
7. **export-key の collision fixture での interpretations 表現**: 両解釈が `{x:true}` に退化し ambiguous 期待が弱い。露出キー衝突時の interpretations 表現の詰めが必要。
8. **deprecated の warnings を期待値語彙 (`expect.warnings`) に足すか**: `fixtures/alias-parse/deprecated.json` が先行使用している。CONFORMANCE §2 の outcome union に warnings は未記載。
9. **bare separator の accumulator 昇格**: multiple 宣言なしで separator があれば append する挙動。DESIGN §6.3 に未記載だが slice 実装は存在する。明文化が必要。
10. **separator の standalone wire フィールド不在**: multiple パイプライン経由に一本化されているかの確認。

各項の詳細根拠は該当 fixture の why コメントと関連 DR を参照。

## 進捗

- 10 論点の並列分析 (議論材料の準備) に着手。分析完了後 kawaz と議論し決着分を DR 化する。

## 受け入れ条件

- [ ] 各論点について仕様側 (DESIGN.md / CONFORMANCE.md / DR) を pin するか、意図的に「フェーズ2 継続検討」として保留するかを決定
- [ ] (1) の wire-form 表面疑義は再検証し、表現可能なら蒸留 agent 側の見落としとして是正、不可能なら仕様拡張の要否を判断
- [ ] pin した内容を該当 DR または DESIGN.md に反映
