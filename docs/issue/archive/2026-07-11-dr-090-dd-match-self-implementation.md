---
title: DR-090 を実装完了する: dd installer の match/self 属性対応と corpus 書き直し
status: resolved
category: task
created: 2026-07-11T10:17:34+09:00
last_read: 2026-07-11T14:37:00+09:00
open_entered: 2026-07-11T10:17:34+09:00
wip_entered: 2026-07-11T10:30:53+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-11T11:01:11+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-090","implemented","kuu.mbt commit 2cc6ff35 で dd の match (regex トリガ、core Regex 準拠) × self (drop|keep) を実装 (DdMatchSat 新設、既存 DdSat 無改修。self:keep = 消費 0 Accept + 同 pos severed 再帰。compile 失敗は DInvalidArgument。tried_triggers に pattern トリガは非掲載)","fixture: fixtures/dd/match-self-keep.json 3 case (severed 後の既知 option 綴りが raw、が本命の軸) + definition-error 1 case (spec 7bbd9ed6)","corpus xargs/ssh/docker を dd + 分離型付き positional 形へ書き直し済み (severed は greedy 面のみ、席の型・必須は不変)","副産物: host 方言の実測発見 (未 escape [^-] は core Regex で compile 不能 → DR-090 の canonical 表記を escape 形 [^\\-] に修正)","conformance decoded=186 / ran_cases=480 / skipped=0 / mismatches=0、moon test 235 本"]
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
