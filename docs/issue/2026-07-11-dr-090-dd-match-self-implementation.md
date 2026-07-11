---
title: DR-090 を実装完了する: dd installer の match/self 属性対応と corpus 書き直し
status: open
category: task
created: 2026-07-11T10:17:34+09:00
last_read:
open_entered: 2026-07-11T10:17:34+09:00
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

# DR-090 を実装完了する: dd installer の match/self 属性対応と corpus 書き直し

## 概要

issue corpus-implicit-trailing-passthrough (close: 2026-07-11) の裁定で、dd 要素を
(トリガ形 exact|pattern) × (自己保持 self drop|keep) の 2 軸に一般化する方針が
DR-090 (docs/decisions/DR-090-dd-pattern-trigger-self-keep.md) として確定した。
決定内容は spec 側の定義のみで、kuu.mbt 実装・fixture・corpus への反映は未実施のため
本 issue で追跡する。

## 受け入れ条件

- [ ] kuu.mbt の dd installer が `match` (正規表現トリガ) / `self: "keep"` (消費 0 の
      自己保持 Accept) 属性を DR-090 の規定通り解釈するよう対応する
- [ ] fixtures: xargs 型の輪郭 (既知 option が勝つ / 未知 `-f` で発火・自己保持 /
      発火後は全 raw) と、従来 exact dd の挙動不変の対照を追加する
- [ ] `corpus/real-cli/{xargs,ssh,docker}.json` を DR-090 の (pattern, keep) 形へ
      書き直す (env は DR-091 の key=value 表現とセットで別対応)
- [ ] DESIGN / LOWERING の dd 節に 2 軸の注記を追記する
