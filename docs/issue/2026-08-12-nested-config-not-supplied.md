---
title: 参照実装の DR-050 §3 同型対応 nested 未実装 (root の config_file が子スコープの要素へ供給しない)
status: open
category: bug
created: 2026-08-12T08:32:41+09:00
last_read:
open_entered: 2026-08-12T08:32:41+09:00
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

# 参照実装の DR-050 §3 同型対応 nested 未実装 (root の config_file が子スコープの要素へ供給しない)

## 概要

DR-050 §3 が規定する同型対応 (root の config_file が nested な子スコープの要素へも供給される) が、参照実装では未実装。root スコープの config_file の値が子スコープの要素に供給されず、nested 構成での挙動が仕様と乖離している。

## 背景

DR-050 §3 を読み直す過程で、参照実装の nested 対応が同型対応の規定を満たしていないことに気づいた。

## 受け入れ条件

- [ ] DR-050 §3 の同型対応が nested スコープでも成立することを確認できる fixture が通る
- [ ] root の config_file が子スコープの要素へ供給される実装になっている

## TODO

<!-- wip 時のみ -->
