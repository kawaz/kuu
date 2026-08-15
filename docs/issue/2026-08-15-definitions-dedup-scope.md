---
title: definitions 配下の同名重複の扱いが spec 未規定
status: idea
category: design
created: 2026-08-15T23:00:25+09:00
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
origin: 自リポ TODO
---

# definitions 配下の同名重複の扱いが spec 未規定

## 概要

definitions 配下 (def name 軸) の同名重複の扱いが spec 未規定。

## 背景

definitions セクションで同じ def name が複数回宣言された場合の意味論
(reject / last-wins / merge 等) が現行 spec で定義されていない。

## 受け入れ条件

- [ ] 同名重複時の意味論を決定し spec (DR) に明記する
- [ ] 決定した意味論を検証する fixture を追加する
