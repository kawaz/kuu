---
title: positional group 上の insert_form 宣言が decode 段で silent drop される
status: idea
category: design
created: 2026-07-24T00:07:36+09:00
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
origin: kuu.mbt worker (insert_form 実装時)
---

# positional group 上の insert_form 宣言が decode 段で silent drop される

## 概要

positional group (name-group、type なし) 上の `insert_form` 宣言が decode 段で
silent drop される spec gap。DR-117 §2.6 が要求する definition-error に
落ちず、宣言が無視されたまま通ってしまう。

## 背景

DR-117 §2.6 は「非 `completion_script` type への `insert_form` 宣言も
definition-error (invalid-range 準用)」を規定するが、kuu.mbt の
`dec_positional` は allowed_keys 受理後に `dec_positional_group` ルートへ
抜けるため、group 上の宣言は error にならず落ちる。fixture / DR にこの edge
の pin が無い。

対応案 (次に DR-117 を触る時に裁定):

- (a) definition-error fixture を 1 本足して pin (`dec_positional_group` で
  error 材料 carry の実装追随)
- (b) group は要素でないので対象外と DR に明記

## 受け入れ条件

- [ ] (a)/(b) いずれかを裁定し、DR-117 と fixture に反映

## TODO

