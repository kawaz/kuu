---
title: custom type 使用時の candidate.ty 表現が未確定 (codex #2 M-13 残)
status: resolved
category: design
created: 2026-07-14T20:12:39+09:00
last_read:
open_entered: 2026-07-14T20:12:39+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-15T14:52:28+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-104", "implemented"]
blocked_by:
origin: 自リポ TODO
---

# custom type 使用時の candidate.ty 表現が未確定 (codex #2 M-13 残)

## 概要

codex レビュー #2 の M-13 (残課題)。DR-104 §2 明確化 note (b) で値位置候補の ty は
解決済み primitive 5 種 (`"string"`/`"number"`/`"int"`/`"float"`/`"bool"`) と確定し、
`schema/fixture.schema.json` の `candidate.ty` も enum で固定した。しかし custom type
(types registry の factory 定義型) を使う definition で complete した場合に `ty` が
何を返すかは未確定 (基底 primitive に解決するのか、custom 型名をそのまま返すのか)。

## 背景

M-13 のトリアージ判定は PARTIAL。`docs/findings/2026-07-14-codex-review2-triage-verdicts.md`
の M-13 節で、`Ty` (kuu.mbt `src/core/node.mbt:65-88`) は閉じた 8 値 enum であり、
`pend_value(...)` 呼び出し (kuu.mbt `src/core/eval.mbt`) が実際に渡すのは
TStr/TNum/TFloat/TInt/TBool の 5 種のみと確認済み。この 5 種の enum 化自体は
確定済みの反映方針として fixture.schema.json に反映済み(または反映予定)。

一方、`definition.type` (`schema/wire.schema.json:30-32` の `registryIdentifier`、
DR-028/094 の型参照糖衣) は custom type 拡張を許す open な文字列パターンであり、
`candidate.ty` (解決済み primitive kind) とは別概念という整理は済んでいる。しかし
「custom type を使う definition で complete した場合、その候補の `ty` は基底
primitive に解決した値を返すのか、custom 型名を返すのか」は corpus に実例が無く
未規定のまま残っている。

## 受け入れ条件

- [ ] complete fixture が custom type を要求する具体場面が出た時点で、candidate.ty の
      解決規則 (基底 primitive 解決 vs custom 名保持) を決定する
- [ ] DR-104 §2 に決定則を追記する (custom type 拡張時の enum 制約の扱いも含む)
- [ ] 決定に応じて `schema/fixture.schema.json` の `candidate.ty` enum 定義を更新する

## TODO

<!-- wip 時のみ -->
