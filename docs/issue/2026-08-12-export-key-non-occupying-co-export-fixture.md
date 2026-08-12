---
title: 非占有要素 (config_file) の export_key が実セルの露出キーと重なる構成の fixture 追加
status: open
category: task
created: 2026-08-12T16:00:58+09:00
last_read:
open_entered: 2026-08-12T16:00:58+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kuu.mbt
---

# 非占有要素 (config_file) の export_key が実セルの露出キーと重なる構成の fixture 追加

## 概要

kuu.mbt の m3 修正 (2026-08-12、Release v0.0.31) で「config_file (露出キー非占有、DR-120 §4) の
export_key が同スコープの通常要素の露出キーと一致する合法構成」で実セルの binding / 0 発火 [] が
内部セル除外に巻き添えで落ちる欠陥を修正した。修正は kuu.mbt の e2e wbtest で pin 済みだが、
spec conformance corpus (fixtures/export-key/) にこの非占有 co-export 形の fixture が無い。

## 背景

再現定義: options に config_file "cfg" (export_key: "user") + string multiple option "user"。

期待値は「--user alice → {user:[alice]}、0 発火 → {user:[]}」(DR-050 / DR-120 §4 / DR-044 から導出)。

fixture を spec 側に追加すれば、他実装も同じ欠陥を踏まなくなる。

関連: kuu.mbt docs/issue/2026-08-12-command-definition-error-parity-review-followup (3) 節の実測記録

## 受け入れ条件

- [ ] fixtures/export-key/ に config_file (非占有) の export_key が通常要素の露出キーと重なる
      co-export 構成の fixture を追加
- [ ] --user alice → {user:[alice]} のケースを含む
- [ ] 0 発火 → {user:[]} のケースを含む
