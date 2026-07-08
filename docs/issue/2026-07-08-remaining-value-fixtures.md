---
title: 残 fixture 化 2 件 — short × 文字系値 ambiguity / int hex 値空間
status: open
category: task
created: 2026-07-08T21:54:42+09:00
last_read:
open_entered: 2026-07-08T21:54:42+09:00
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

# 残 fixture 化 2 件 — short × 文字系値 ambiguity / int hex 値空間

## 概要

distill-spec-gaps close 時の切り出し。いずれも spec 規則は確定済みで fixture 化のみの作業。

## 背景

2026-07-08 台帳 issue 監査。旧 distill-spec-gaps の #3 (DR-074) 決着後の派生 2 件。

## 受け入れ条件

- [ ] short × 文字系値 ambiguity fixture: DR-074 §5 の枝生成規則 (確定済み) を fixtures/matcher-readings/ に追加
- [ ] int hex 値空間 fixture: DR-075 の規定 (int + base_prefix opt-in 経路の値空間判定) を fixtures/value-typing/ に追加。number 側は number-base-prefix-optin.json でカバー済み、int 型経由の輪郭が未 pin
