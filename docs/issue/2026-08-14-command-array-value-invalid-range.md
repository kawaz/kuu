---
title: 値持ち command の配列 value は invalid-range — DR-134 §1 の array 表現を読み直す (CVQ-Q1a 裁定の反映)
status: open
category: task
created: 2026-08-14T04:30:08+09:00
last_read:
open_entered: 2026-08-14T04:30:08+09:00
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

# 値持ち command の配列 value は invalid-range — DR-134 §1 の array 表現を読み直す (CVQ-Q1a 裁定の反映)

## 概要

DR-134 §1 は「値を名乗る command は『フィールド名 + JSON scalar / array』」と書いているが、参照実装の担体セルは非 accum (単値) で、配列 value (`{"type":"command","name":"x","value":[1,2]}`) は decode を通った後に単値へ縮む (黙殺)。既存の definition-error 群では「scalar 要素への配列 default」は invalid-range であり、この線と整合させる必要がある。

## 背景

kawaz 裁定 CVQ-Q1a (2026-08-14、docs/QUESTIONS.md でチェック受領)。裁定済みにつき QUESTIONS.md の CVQ-Q1 節は削除済みで、本 issue が記録先。発端は DR-133/134 実装レビュー (2026-08-12、fable5-high)。

### 裁定内容 (CVQ-Q1a)

**配列 value は definition-error kind=`invalid-range`。** 担体は scalar literal のみ。

読み直しの根拠: DR-134 §1 の「array」は「スコープ (map) でなく値」であることの対比表現であって、array を積極的に約束した文ではない。この読みを DR-134 に 1 行で明確化する。既存の「scalar 要素への配列 default」が invalid-range である線と整合する (同居不可・値域外の組合せは一貫して invalid-range、DR-134 §2 の kind 選定理由と同じ)。

不採用: CVQ-Q1b (配列 value を合法にする = 担体を accum 化するか配列 literal を許容する。実装・意味論の追加設計が要る)。

DR-134 は同日に別件の note 追記が入っている (§6 の透過 value command 合法 = inert/vacuous の線、commit 943c1392)。本作業はその後段に積む。

## 受け入れ条件

- [ ] DR-134 §1 の「フィールド名 + JSON scalar / array」の array が値の担体を約束しない旨が 1 行で明確化されている (対比表現であることの明示)。§5 (値の供給は既存の node 意味論のまま) との整合も確認済み
- [ ] DR-134 §2 の kind 表もしくは §5 に、配列 value = invalid-range が規範として書かれている
- [ ] fixture 新設: 値持ち command への配列 value が invalid-range になる輪郭。既存の値持ち command 系 fixture (fixtures/command-scope/value-command.json、fixtures/definition-error/command-value-occupying-child.json、fixtures/definition-error/command-carrier-default-fn-unknown-vocab-invalid-range.json) の並びに置く
- [ ] DESIGN §15.5 近傍 / command の value を説明している箇所 (DESIGN の DR-134 反映行) が追随している

## 関連

- docs/decisions/DR-134-command-value-or-scope.md §1 / §2 / §5 (改訂対象)
- docs/decisions/DR-054 (definition-error の kind 列挙 — invalid-range の意味)
- schema/fixture.schema.json の kind enum (invalid-range は既存、追加不要)
