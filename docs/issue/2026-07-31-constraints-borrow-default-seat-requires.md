---
title: default 席 (borrow) 経由で true になる bool requires 目的語が未 pin
status: open
category: task
created: 2026-07-31T00:19:01+09:00
last_read:
open_entered: 2026-07-31T00:19:01+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: stage2 敵対レビュー (dr125-stage2 セッション)
---

# default 席 (borrow) 経由で true になる bool requires 目的語が未 pin

## 概要

requires の bool 目的語充足は値源不問 (DR-047 §5) であり、cli/env/config 経由の充足は fixture pin がある。しかし **default 席 (`default_fn: "borrow:<source>"` 含む) 経由で true になる bool 目的語の requires 充足は未 pin**。

## 背景

DR-125 で inherit-true-satisfies-requires case (参照経由の値で充足する既存 case) が削除された際、このカバレッジが後退した (stage2 敵対レビュー Minor 3、2026-07-31 検出)。

borrow 解決値が制約検査 (DR-087 §4 の resolve 後評価) を通る組合せは、値源解決と制約検査という 2 つの機構の統合点であり、それぞれの unit 相当の fixture だけでは組合せの正しさが保証されない。`constraints-parse/` に borrow 版 fixture を新設して pin するのが望ましい。

参考:
- `fixtures/constraints-parse/requires-bool-target-config-obj.json` (判断本質の正本)
- `fixtures/value-sources/default-fn-borrow-ladder.json` (borrow の期待値導出根拠)

## 受け入れ条件

- [ ] `fixtures/constraints-parse/` に default 席 (borrow 経由) で true になる bool 目的語の requires 充足 fixture を新設
- [ ] DR-047 §5 (値源不問) と DR-087 §4 (resolve 後評価) の両方に紐づく期待値であることを fixture 内コメントで明示
