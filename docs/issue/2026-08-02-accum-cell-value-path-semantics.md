---
title: accumulator セルへの値空間パス (link) の意味論が未規定
status: open
category: design
created: 2026-08-02T01:13:28+09:00
last_read:
open_entered: 2026-08-02T01:13:28+09:00
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

# accumulator セルへの値空間パス (link) の意味論が未規定

## 概要

accumulator セルへの link 値空間パス (`link: "tags[0]"` のような accum セルの
行/要素への部分書き) の意味論が未規定。

## 背景

accumulator は resolve 相で collect が畳んで複合値を作るため、パース時の効果
時系列 (DR-127 §4) が前提とする「value_parser 産の複合セル」と位相が合わない。

v1 の裁定 (2026-08-02、DR-127 第 2 波計画): **Unsupported (definition-error)
で塞ぐ** — 需要が出たら「どの相で解決するか」を含めて DR 追補。

参考: kuu.mbt の `docs/research/2026-08-02-dr127-wave2-implementation-plan.md`
§6-1。

## 受け入れ条件

- [ ] accumulator セルへの link 値空間パスをどの相 (parse/collect/resolve) で
      解決するかの方針を DR 追補として記述する
- [ ] 上記方針に基づき definition-error / 実サポートいずれかを実装し、
      対応する fixture を追加する

## TODO

<!-- wip 時のみ -->
