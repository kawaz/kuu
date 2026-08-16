---
title: union セルでの cell fn 多重実行の解消 (UC-Q4 裁定確定)
status: open
category: bug
created: 2026-08-16T10:22:51+09:00
last_read: 2026-08-16T10:58:38+09:00
open_entered: 2026-08-16T10:59:32+09:00
wip_entered:
blocked_entered: 2026-08-16T10:22:51+09:00
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
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

## UC-Q4 裁定 (kawaz 2026-08-16 mid=45-47)

案 a (definition-error で静的に断つ) / 案 b (枝ごとに `old` を持たせる) の
どちらでもない第 3 の形で確定:

1. `ctx.old` = その時点のセルの観測値 (それまでの書き込みに淘汰+後勝ちを
   逐次適用した勝ち値) で常に一意。成立値が無い時点は `null`
   (DR-130 §1 と一貫)
2. effect 関数 (set/incr 等の cell_fns) の発火は**入口単位** — 入口は自分の
   引数が全部揃って初めて発火する (union でも非 union でも不変)。部分書き
   (link の位置書き) は発火と別位相
3. fn は発火ごとに 1 回実行、産出は通常の書き込みとして適合枝へ並行着地
   (DR-138 §2-1)

したがって修正方針 = `cull_union_cell` の variant ごと再実行を「1 回実行
した産出の並行着地」へ改める + `FnFailed` は書き込み時位相 (DR-138 §6) で
裁く。

### 規範化・pin fixture 完了 (2026-08-16)

- DR-138 §6b に上記裁定を規範化済み (commit `dd7be821`)
- pin fixture 追加済み: `fixtures/union-parse/cell-fn-momentary-old.json` (3 case, commit `3bc0d01e`)
- 残タスクは `cull_union_cell` の kuu.mbt 実装追随のみ (union-impl 系のロックステップ作業)

## 受け入れ条件

- [x] DR-138 §6b の規範化 (UC-Q4 裁定の反映)
- [x] pin fixture の追加 (`fixtures/union-parse/cell-fn-momentary-old.json` 3 case)
- [ ] kuu.mbt 実装追随 (`cull_union_cell` を「入口単位 1 回発火 + 並行着地」へ修正、lockstep push)
