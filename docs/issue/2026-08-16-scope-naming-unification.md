---
title: 「name スコープ」呼称群を「結果キー軸占有」語彙へ統一する用語整理
status: open
category: task
created: 2026-08-16T01:09:21+09:00
last_read:
open_entered: 2026-08-16T01:09:21+09:00
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

# 「name スコープ」呼称群を「結果キー軸占有」語彙へ統一する用語整理

## 概要

TRG-Q4=a の裁定 (スコープ生成 = resolved export_key 軸の占有、DR-025/033/006 改稿済み) の波及で、
REFERENCE.md:67/:266/:544、DR-044、DR-050、LOWERING.md:418/:429、DESIGN の一部箇所に「name スコープ」
「name が結果スコープを作る」といった旧規範のままの呼称群が残存している。これらを新語彙
(結果キー軸占有・resolved export_key 軸の占有) へ全面的に統一する。

## 背景

fable レビュー (M2/m5, 2026-08-15) で検出。規範矛盾そのものの直し (DESIGN §2.3/§11.1 等) は
当該サイクルで対応済みだが、残りの用語統一は範囲が広く別サイクルでの対応とされた
(DR-136 サイクルの push 後に着手)。

## 受け入れ条件

- [ ] REFERENCE.md:67/:266/:544 の「name スコープ」呼称を新語彙へ置換
- [ ] DR-044、DR-050 内の該当呼称を新語彙へ置換
- [ ] LOWERING.md:418/:429 の該当呼称を新語彙へ置換
- [ ] DESIGN 内の残存箇所 (§2.3/§11.1 以外の波及箇所) を洗い出し置換
- [ ] 置換後、旧呼称 (「name スコープ」「name が結果スコープを作る」) の grep 残存がゼロであることを確認
