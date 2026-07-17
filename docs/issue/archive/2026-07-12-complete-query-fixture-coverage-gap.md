---
title: complete クエリの fixture がゼロ件 — 補完挙動のカバレッジが kuu.mbt の wbtest のみ
status: resolved
category: task
created: 2026-07-12T18:40:35+09:00
last_read: 2026-07-17T13:54:55+09:00
open_entered: 2026-07-12T18:40:35+09:00
wip_entered: 2026-07-13T14:57:45+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-17T13:56:33+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-104","implemented","done:CONFORMANCE.md §4 新設・fixtures/complete/ 26件・dr097-pending-mode-split.json で pin・kuu.mbt conformance green(92b9cee5)"]
blocked_by:
origin: 自リポ TODO
---

# complete クエリの fixture がゼロ件 — 補完挙動のカバレッジが kuu.mbt の wbtest のみ

## 概要

fixture コーパス全体で `"query": "complete"` の fixture が 0 件。DESIGN が定義する
complete クエリ (= 「カーソル前のトークン列を消費できた全生存 partial 経路の、次の
消費点で読めるものの和集合」) の言語非依存な pin が存在しない。現状のカバレッジは
kuu.mbt の `src/core/complete_wbtest.mbt` のみで、これは実装内 whitebox テストであり
他言語移植時に補完仕様への準拠を検証する手段が無い。

## 背景

DR-097 実装の codex レビュー (2026-07-12) の副次的発見。DR-097 により `has_viable` が
parse/complete モードで Pending の扱いを分ける実装になった (トリガ消費済み・値待ちの
場合でも complete モードでは候補を返す) こともあり、この輪郭は fixture 化の価値が
上がっている。

対応案 (未裁定): `fixtures/complete/` 系統の新設 + `docs/CONFORMANCE.md` の complete op
節の充実。既存の CONFORMANCE 7 op 表 (parse/complete 含む) との整合確認から着手するのが
筋。

関連:
- `docs/CONFORMANCE.md` (7 op 表、complete op 節)
- DR-097
- kuu.mbt `src/core/complete_wbtest.mbt` (read-only 参照。他言語同種実装の参考にはなるが
  fixture 化の代替にはならない)

## 受け入れ条件

- [x] `docs/CONFORMANCE.md` の complete op 節と既存 7 op 表の整合を確認 — §4 新設済み、query 表・比較規約 (candidates の multiset 比較、meta 必須検証 = COMP-Q2、completer opt-in = COMP-Q3) 整備済み (DR-104)
- [x] `fixtures/complete/` 系統を新設する方針を裁定 (対象輪郭の洗い出し含む) — 新設済み、現在 26 fixture (方針裁定は DR-104 + COMP-Q バッチ)
- [x] DR-097 の Pending 扱い分岐 (parse/complete モード差) を含む fixture を最低 1 件作成 — `fixtures/complete/dr097-pending-mode-split.json` の case `pending-value-slot-viable-in-complete-mode-only` で pin 済み
- [x] kuu.mbt が新設 fixture を pass することを確認 — conformance green (decoded=274 ran_cases=667 mismatches=0、CI green 92b9cee5)
