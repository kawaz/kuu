---
title: 値持ち command の配列 value は invalid-range — DR-134 §1 の array 表現を読み直す (CVQ-Q1a 裁定の反映)
status: resolved
category: task
created: 2026-08-14T04:30:08+09:00
last_read:
open_entered: 2026-08-14T04:30:08+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-08-14T04:54:26+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-134","fixture/definition-error/command-array-value-invalid-range.json","implemented:spec 側完了、kuu.mbt 実装追随は 2026-08-12-config-committed-carry-over と同じ実装サイクルで回す (既存 issue で追跡済み)"]
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

## 完了記録 (2026-08-14)

- **DR-134 §1 に明確化を追加**: 「フィールド名 + JSON scalar / array」の array は「その座の値が map (スコープ) か、そうでない値か」の対比表現であって配列 literal の担体を約束した文ではない、と明記。**値持ち command の担体は scalar literal のみ**で、**配列 `value` / 配列 `default` はいずれも definition-error kind=`invalid-range`**。配列 default も同時に倒したのは、DR-134 §5 (値の供給は既存の node 意味論のまま) により const 席 (`value:`) とラダー default 席で扱いが割れる理由が無いため
- **根拠の位置づけ**: 非 multiple のスカラー要素への配列 default を静的に倒す既存の線 (DR-083 §5、fixtures/definition-error/scalar-array-default-invalid-range.json) と同族。値持ち command は multiple 宣言を持たない単値セルなので、値空間 (scalar) と literal の構造 (配列) の不一致が定義時点で静的に既知になる。command 専用の新規則ではなく通常の値セル検査の帰結
- **採用しなかった案に CVQ-Q1b を追加**: 配列 value の合法化は 2 経路とも意味論の追加設計を呼ぶ — (a) 担体の accum 化は `multiple` を宣言していないセルが accumulator になる特例を生み、accum_filters / 供給順 / 0 発火の `[]` といった反復系の規則が「宣言していないのに効く」形で付いてくる (DR-102 の 1 属性 1 registry や DR-044 の uniform array と噛み合わない)。(b) 配列 literal の許容は単値セルの値空間に配列を入れることになり DR-083 §5 と正面から食い違う。配列を返したい需要は multiple 要素を command のスコープ内に置くか、値持ちをやめてスコープを名乗る形で既存語彙で書ける
- **fixture 新設**: fixtures/definition-error/command-array-value-invalid-range.json。配列 `value` を持つ `arrval` と配列 `default` を持つ `arrdef` の 2 要素が invalid-range を 1 件ずつ、scalar literal を持つ兄弟 `ok` は合法のまま error を持たない (= 値持ち command の value 合法化そのもの (DR-134 §1) が不変であることの同時固定)
- **INDEX**: DR-134 エントリに本明確化を反映
- **QUESTIONS.md**: CVQ-Q1 節は裁定受領時に削除済みで、残骸が無いことを確認済み
- 検証: lint 3 種 OK (lint-reference / lint-descriptors / lint-fixtures、fixture 414 件)
