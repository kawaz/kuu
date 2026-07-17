---
title: completer/accumulator の descriptor 宣言軸を確定する (DR-107 §7 の未確定 role)
status: open
category: design
created: 2026-07-16T16:33:42+09:00
last_read: 2026-07-17T08:44:17+09:00
open_entered: 2026-07-16T16:33:42+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: DR-109 波及 (統括起票)
---

# completer/accumulator の descriptor 宣言軸を確定する (DR-107 §7 の未確定 role)

## 概要

DR-107 (descriptor 直交軸) の role 7 値のうち completer / accumulator は実例なし・宣言軸未確定のまま(§7 は owns/observes 禁止のみ規定)。completer/accumulator の宣言軸(construction/io_type/invocation 等の直交軸をどう適用するか、completer 固有の軸が要るか)を確定する。

## 背景

DR-109 §5 (UX-Q5=a、kawaz「早めにやりたい」) で次サイクル先行着手が裁定された。kuu-ux 設計の `$required` = named capability marker (DR-109 骨子柱 3) が completer を指せるためには、completer descriptor の宣言軸の確定が前提になる。accumulator も同様(multiple.accumulator の参照先)。

## 受け入れ条件

- [ ] completer / accumulator の role 別宣言軸を DR-107 追記または新 DR で確定
- [ ] schema/descriptor.schema.json の role 別 oneOf に反映
- [ ] builtin の completer/accumulator 住人が居るなら schema/builtin-descriptors.json に収載
- [ ] lint-descriptors が追随

関連: DR-107 §7、DR-095、DR-109 §5・骨子柱 3
