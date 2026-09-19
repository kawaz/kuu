---
title: DR の Superseded 節を archive へ分離する
status: idea
category: task
created: 2026-09-19T16:28:12+09:00
last_read:
open_entered:
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: sandbox-jev
---

# DR の Superseded 節を archive へ分離する

## 概要

sandbox-jev の docs lint PoC (経緯 narrative 検査、精度 0.80〜0.89) で、`docs/decisions/` の
DR 41 本が「冒頭の更新バナー + `## Superseded (歴史)` 節に旧本文を残す」形で発火した。

41 本を「文書全体が旧」と「部分的に生きている」に仕分ける。前者は `decisions/archive/`
へ丸ごと移動、後者は Superseded 節を `decisions/archive/DR-NNN-<slug>-superseded.md`
のような形に切り出し、現役 DR 側は `Status:` 行の Superseded 注記だけで指すようにする。

## 背景

kawaz の方針 (2026-09-19): 文書全体が旧なら archive へ移動、部分的に生きているなら
旧本文を分離して archive 側に置き、現役部分だけを残す ([[no-historical-noise]] rule に沿う)。

対象一覧は sandbox-jev の
`experiments/09-docs-lint-round7/out/kuu/files/docs/decisions/` の
`historical_narrative` スコアが 0.5 超のファイル (フラグ止まり、採否は kuu 側の判断)。

一括作業になるので kuu 側の都合の良いタイミングで着手する。

## 受け入れ条件

- [ ] 対象 41 本を「全体が旧」「部分が旧」に仕分ける
- [ ] 「全体が旧」の DR を `decisions/archive/` へ移動する
- [ ] 「部分が旧」の DR は Superseded 節を `decisions/archive/DR-NNN-<slug>-superseded.md` へ切り出し、現役 DR 側は `Status:` 行の注記だけにする
