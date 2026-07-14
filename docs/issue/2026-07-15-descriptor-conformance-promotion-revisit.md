---
title: descriptor 検証の conformance 昇格の再検討
status: idea
category: design
created: 2026-07-15T02:25:46+09:00
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

# descriptor 検証の conformance 昇格の再検討

## 概要

descriptor 宣言 (role/io_type/invocation/effect/fallibility) と実装実体の整合を
conformance で機械検証する query/profile を新設すべきかどうかの再検討。
DAX-Q6 裁定で先送りにした論点を忘れないよう、再検討トリガ付きで起票する。

## 背景

DAX-Q6 裁定 (docs/findings/2026-07-15-descriptor-axes-design-recon.md) で
「軸再整理 DR は schema/builtin 書き換えに集中し、conformance 昇格は先送り」と
した。kawaz 指示 (2026-07-15)「その後忘れず再検討されるように」を受けて、
先送り事項を issue として明示的に残す。

## 受け入れ条件

- [ ] 以下いずれかのトリガに達した時点で本 issue を read し、conformance 昇格の要否を判断する
  - 独自フィルタの実装ラップ (VISION.md §4 の 4 段目) が言語 DX で実際に必要になった段階
  - 多言語展開 (2 言語目) の着手時
- [ ] 判断内容: descriptor 宣言 (role/io_type/invocation/effect/fallibility) と
      実装実体の整合を conformance で機械検証する query/profile の新設要否

## 関連

- docs/findings/2026-07-15-descriptor-axes-design-recon.md (DAX-Q6)
- docs/issue/2026-07-14-descriptor-schema-declaration-axis-separation.md (本体)
- docs/VISION.md §4
