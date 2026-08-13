---
title: 非占有要素 (config_file) の export_key が実セルの露出キーと重なる構成の fixture 追加
status: resolved
category: task
created: 2026-08-12T16:00:58+09:00
last_read: 2026-08-14T04:19:28+09:00
open_entered: 2026-08-12T16:00:58+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-08-14T04:20:30+09:00
discard_reason:
pending_reason:
close_reason: ["DR-135 (config_file は通常要素、2026-08-14 裁定) で前提が反転したため、要求された fixture は spec 上成立しなくなった。代替の pin を追加済み","pin/fixtures/export-key/collision-config-file-option.json","pin/fixtures/export-key/config-file-transparent-non-occupier.json","pin/fixtures/export-key/unselected-scope-internal-cell-mask.json"]
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

## DR-135 影響 (2026-08-14、close 理由)

DR-135 (config_file は通常要素、2026-08-14 裁定) により本 issue の前提が反転し、要求された形の
fixture は spec 上成立しなくなった。

1. 本 issue が「合法構成」としていた config_file "cfg" (export_key: "user") + option "user" は、
   config_file が露出キー衝突検査の占有子になった (DR-135 §4 / DR-120 §4 占有側) ため
   **definition-error kind=export-key-collision** になる。よって「--user alice → {user:[alice]} /
   0 発火 → {user:[]}」という受け入れ条件は spec 上到達不能で、この形の fixture を追加しては
   ならない。
2. 代替として追加済みの pin:
   - `fixtures/export-key/collision-config-file-option.json` — 同構成が definition-error になる
     輪郭
   - `fixtures/export-key/config-file-transparent-non-occupier.json` — config_file を非占有に
     する正しい書き方 (export_key: null の透過。値の伝搬は止まらず config 席の充填は働く)
   - `fixtures/export-key/unselected-scope-internal-cell-mask.json` — 内部セル除外の negative
     list から config_file が抜けた形へ改訂
3. 由来だった kuu.mbt 側の欠陥 (内部セル除外が実セルの binding を巻き添えで落とす) は config_file
   については構造ごと消える (もう除外対象ではない) が、type:"none" / dd trigger では残るので、
   実装側の修正自体は無効化されない。
