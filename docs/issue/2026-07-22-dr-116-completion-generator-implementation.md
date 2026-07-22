---
title: DR-116 を実装完了する
status: open
category: task
created: 2026-07-22T15:34:01+09:00
last_read:
open_entered: 2026-07-22T15:34:01+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO
---

# DR-116 を実装完了する

## 概要

`docs/decisions/DR-116-completion-generator-policy.md` は canonical 補完生成器の既定 policy (definition 由来候補の help model 順整列、completer 由来候補の供給順確定、candidate origin からの説明引き直し、hidden/deprecated/alias の既定表示) を定めた設計決定。spec conformance への増分はゼロ (DR-116 §6) だが、生成器実装・product test は未実装。

## 背景

元 issue: `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` (completion-ordering-and-lazy-candidates、現状 status=open、archive 未移動)。

DR-116 §「波及」(末尾節) は以下を実装課題として明示している:

- canonical 補完生成器は complete query と help_query capability の両方を入力に使う
- runtime 問い合わせ ABI は §3 の順序規則を採用し、completer 実行方式を定める
- 生成器 product test は help model 順の適用、hidden 除外、deprecated 注記、alias 表示、origin からの説明引き直しを検証する
- spec schema / fixtures / conformance profile に変更は無い (この課題のスコープ外)

## 受け入れ条件

- [ ] canonical 補完生成器が complete query candidates と help_query capability の help model を組み合わせて動作する
- [ ] definition 由来候補が DR-113 §8 適用済みの help model 順に整列される (DR-116 §2)
- [ ] completer 由来候補の供給順確定ロジックが実装される (DR-116 §3)
- [ ] 候補説明が candidate に同梱されず、`origin` から help model / definition を引き直して表示される (DR-116 §4)
- [ ] hidden / deprecated / alias の既定表示 policy が実装される (DR-116 §5)
- [ ] 生成器 product test: help model 順の適用、hidden 除外、deprecated 注記、alias 表示、origin からの説明引き直しをそれぞれ検証する (DR-116 波及節)
- [ ] spec schema / fixtures / conformance profile への変更が発生していないことを確認する (DR-116 §6 の非規範性を維持)

## 関連

- DR-116 §2〜§6、波及節、`docs/decisions/DR-116-completion-generator-policy.md`
- DR-060 §3〜§5 (素材と policy の分離、completer 名前参照、責務 4 層)
- DR-104 §2〜§4 (candidate wire、6 フィールド identity、順序非依存 multiset)
- DR-111 §5 (completer descriptor と runtime 問い合わせ ABI の境界)
- DR-113 §8 (help 順序の適用済み列)
- DR-115 §6.2 (canonical 出力の非規範・fixture 非 pin)
