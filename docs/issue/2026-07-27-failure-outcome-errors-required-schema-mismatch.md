---
title: fixtures/value-sources/named-group-child-default.json の partial-row-is-not-a-complete-path が failureOutcome の required ["outcome","errors"] に違反
status: open
category: bug
created: 2026-07-27T07:20:14+09:00
last_read:
open_entered: 2026-07-27T07:20:14+09:00
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

# fixtures/value-sources/named-group-child-default.json の partial-row-is-not-a-complete-path が failureOutcome の required ["outcome","errors"] に違反

## 概要

`fixtures/value-sources/named-group-child-default.json` の case
`partial-row-is-not-a-complete-path` が、schema の failureOutcome
定義 (`required: ["outcome","errors"]`) に違反している (`errors` フィールド欠落)。

DR-122 作業中に全数 schema 検証を行った際に発見した既存の不整合であり、
DR-122 自体とは無関係。発見時の実行結果: 362 fixture files を検証し 1 件 failed。

## 背景

修正方向が 2 つあり、どちらを採るか裁定が必要:

- **(a) fixture 側に errors を書く**: CONFORMANCE §2 の failure 節は
  `errors` を「全保持の配列」として規定しており、failure には躓きが
  最低 1 件あるはず。現状の fixture はこの検証が骨抜きになっている。
- **(b) schema 側の required を `["outcome"]` のみにする**: `errors` 省略を
  「未検証 opt-in」の意味として許容する。

CONFORMANCE §2 の failure 節の書きぶりからは (a) が spec と整合する側に見えるが、
当該 case で期待される `errors` の中身 (element 省略によるスコープレベルの躓きか、
k/v の missing_operand か) は実装挙動を確認してから確定させる必要がある。

## 受け入れ条件

- [ ] (a)/(b) いずれを採るか裁定する (CONFORMANCE §2 の規定と実装挙動の両面から)
- [ ] (a) 採用の場合: 実装を実行し、当該 case の期待 `errors` を実出力から確認して fixture に反映
- [ ] (b) 採用の場合: schema の required 定義を更新し、他の failure fixture への影響 (errors 省略ケースが増えないか) を確認
- [ ] 全 fixture の schema 再検証で 0 failed を確認

## TODO

- [ ] 実装を実行し、`partial-row-is-not-a-complete-path` case の実際の failure outcome (outcome/errors) を確認する
- [ ] CONFORMANCE §2 の failure 節の該当箇所を精読し、(a)/(b) のどちらが規定と整合するか判断材料をまとめる
