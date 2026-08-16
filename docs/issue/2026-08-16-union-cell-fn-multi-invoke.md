---
title: union セルでの cell fn 多重実行の解消 (UC-Q4 裁定待ち)
status: blocked
category: bug
created: 2026-08-16T10:22:51+09:00
last_read: 2026-08-16T10:58:38+09:00
open_entered:
wip_entered:
blocked_entered: 2026-08-16T10:22:51+09:00
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by: UC-Q4
origin: 実装 worker (codex レビュー #4, 2026-08-16)
---

# union セルでの cell fn 多重実行の解消 (UC-Q4 裁定待ち)

## 概要

対象リポ: `/Users/kawaz/.local/share/repos/github.com/kawaz/kuu.mbt/main`

`cull_union_cell` が variant ごとに `fold_seat_effect` を呼ぶため、1 回の
発火が枝数倍されている。これは DR-114 の一回実行不変条件と衝突しており、
非決定 fn では値と ledger が乖離しうる。`FnFailed` の扱いも同根の問題を
抱えており保留中。

## 背景

由来: codex レビュー #4 (2026-08-16)、実装 worker による正当な保留判断。

解決は spec 側 UC-Q4 の裁定に依存する:

- union 宣言セルへの `ctx.old` 依存 fn について
  - 案 a: definition-error で静的に断つ → 残る fn は old 非依存となるため、
    1 回実行 + 全枝共有で素直に解ける
  - 案 b: 枝ごとに `old` を持たせる → 枝ごと実行が正しい挙動になる

裁定後は以下の 1 サイクルで閉じられる見込み:

1. 裁定に応じた `cull_union_cell` の実装修正
2. `FnFailed` の位相確定
3. pin fixture の追加

## 受け入れ条件

- [ ] spec 側 UC-Q4 の裁定が確定している
- [ ] 裁定 (a/b) に応じて `cull_union_cell` の cell fn 実行回数が修正されている
- [ ] `FnFailed` の位相が確定し、実装に反映されている
- [ ] 上記修正を検証する pin fixture が追加されている
