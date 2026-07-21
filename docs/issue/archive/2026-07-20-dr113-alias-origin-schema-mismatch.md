---
title: origin enum の alias 形の出現点が消滅 — DR-113 §4.4 と schema の整理が必要
status: resolved
category: design
created: 2026-07-20T15:57:20+09:00
last_read:
open_entered: 2026-07-20T15:57:20+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-21T09:55:09+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-113#4.3","裁定/GAP-Q2=a","schema/fixture.schema.json helpOrigin から alias 形削除","kuu.mbt HelpOrigin::Alias 削除"]
blocked_by:
origin: P2 help fixture レビュー (codex-sol-reviewer)
---

# origin enum の alias 形の出現点が消滅 — DR-113 §4.4 と schema の整理が必要

## 概要

DR-113 §4.4 (L320 付近) は「alias は canonical entry の `alias_spellings` /
`aliases` に併記し、独立一覧しない」と明文規定している。一方
`schema/fixture.schema.json` の `helpOrigin` は `kind: "alias"` 形 (L392) を
持つが、alias が独立 entry にならない以上、`origin: { kind: "alias" }` が
出現する場所が schema・DR のどちらにも存在しない (= 定義はあるが使用箇所が
消滅している状態)。

## 背景

P2 help fixture レビュー (codex-sol-reviewer, 2026-07-20) の Major 3 で確定。
DR-113 §4.4 は alias 独立一覧を禁止する設計に倒したが、`helpOrigin` schema
の `kind: "alias"` 分岐がその後追従していない (= 設計変更が schema に反映
されず取り残された)。

fixture は現状、alias 併記形のみで書く暫定運用にしている。P3 (kuu.mbt 実装)
着手前に、以下いずれかの整理が必要:

- schema から `kind: "alias"` 形を落とす (DR-113 §4.4 の規定と一致させる)
- または、名前付き alias の canonical 併記時に別席で `kind: "alias"` を使う
  意図が本当にあるなら、DR-113 側にその出現条件を明文化する

## 受け入れ条件

- [ ] DR-113 と `schema/fixture.schema.json` の `helpOrigin` の `kind: "alias"`
      形の整合が取れる (使わないなら schema から削除、使うなら DR に出現条件を明記)
- [ ] fixture の alias 併記形との整合を確認
