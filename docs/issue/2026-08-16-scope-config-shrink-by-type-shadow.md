---
title: scope config の語彙縮小 — number 系ダイヤル類を型 shadow で置換できるか
status: open
category: design
created: 2026-08-16T13:20:28+09:00
last_read:
open_entered: 2026-08-16T13:20:28+09:00
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

# scope config の語彙縮小 — number 系ダイヤル類を型 shadow で置換できるか

## 概要

scope config の語彙縮小の検討 — number 系ダイヤル類 (受理輪郭・基数 prefix 等の型挙動設定) を
型 shadow で置換できるか (kawaz 洞察 2026-08-16 mid=64-65、値カプセル設計の副産物)。

現状 scope config は number 系のダイヤルを独自語彙で持つが、値カプセル化 (DR-139) で
type がカプセルプリセットの参照になった今、同じ効果は「definitions.types で同名 number 型を
shadow 再定義する」(DR-035 の definitions → registry 解決順) で表現できる見通し。成立すれば
scope config の語彙が減り、型挙動の設定が type 体系 1 本に寄る。

## 背景

値カプセル移送 (DR-139/140) の副産物として得られた洞察。別サイクルの設計検討であり、
値カプセル移送そのもののスコープ外。

関連: `docs/research/2026-08-13-value-capsule-design.md` §2.16。

## 受け入れ条件

- [ ] scope config の number 系キーの棚卸しと shadow 置換の全数対応表を作成
- [ ] スコープ継承 (config は親から継承) と definitions の lexical 解決の意味論差を確認し、
      継承粒度が変わらないことを確認 (または差分を明記)
- [ ] 既存 fixture (`value-typing/number-base-prefix-optin.json` 等) の観測が shadow 置換後も
      保存されることを確認
- [ ] DR-035/DR-094 (bare 名 shadow の解決規則) との整合を確認
- [ ] 上記を踏まえ、置換を採用するか・しないかの結論を出す (DR 起票 or 却下記録)

## TODO

<!-- wip 時のみ -->
