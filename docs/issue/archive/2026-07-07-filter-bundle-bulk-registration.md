---
title: filter を bundle で一括登録する口 (idea、優先度低)
status: discarded
category: design
created: 2026-07-07T23:22:52+09:00
last_read:
open_entered: 2026-07-07T23:22:52+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered: 2026-07-12T17:52:19+09:00
resolved_entered:
discard_reason: ["kawaz 裁定 2026-07-12: 不要と判断。具体ユースケース未収集のまま idea 起票されていたが、採用見送りで確定"]
pending_reason:
close_reason: ["discarded"]
blocked_by:
origin: 自リポ TODO
---

# filter を bundle で一括登録する口 (idea、優先度低)

## 概要

kawaz 発のアイデア: filter を個別登録でなく **bundle 単位で一括登録**できる口があると便利ではないか、という提案。優先度は低い idea として記録。

## 背景

現行は filter を個別登録する前提で語彙衝突検査 (DR-042 ③) や wire 直列化 (DR-061) が設計されている。bundle 単位の一括登録があると便利という着想だが、具体ユースケースは未収集。

### 懸念点 (併記)

- **語彙衝突検査 (DR-042 ③) の報告粒度**: bundle 一括登録時、衝突が起きた場合にどの filter がどの bundle 由来かを報告に含める必要がある。個別登録前提の現行の衝突検査メッセージ粒度で足りるか要検討
- **DR-061 wire 直列化での bundle 展開後の個別名記録**: wire form (DR-063 純構文正規化) に落ちた後、bundle 経由で登録された filter も個別 filter として直列化されるはずだが、「どの bundle 由来か」のメタ情報を保持するか (保持するなら wire form が肥大化、しないなら再構成不可) のトレードオフがある

## 受け入れ条件

- [ ] bundle 登録口の必要性を再検討する (現行の個別登録で本当に不便か、具体ユースケースを集める)
- [ ] 必要と判断したら、語彙衝突検査の報告粒度と wire 直列化への影響を設計に含めて DR 化する
- [ ] 不要と判断したら、本 issue を discarded で close する

## 関連

- DR-042 (③ 語彙衝突検査)
- DR-061 (wire 直列化)
- DR-063 (wire form 純構文正規化)
