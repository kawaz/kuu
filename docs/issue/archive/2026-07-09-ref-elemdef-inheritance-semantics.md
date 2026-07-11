---
title: ref の「ElemDef 全体継承」用法 (DR-007) と「消費文法 Node 差し替え」実装の意味論差
status: resolved
category: design
created: 2026-07-09T12:43:52+09:00
last_read:
open_entered:
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-11T10:12:29+09:00
discard_reason:
pending_reason:
close_reason: ["done — kawaz 裁定 Q6-a (2026-07-11)。DR-007 の旧例 ({\"ref\":\"run\",\"name\":\"exec\",\"deprecated\":true}) が「ElemDef 全体継承」に読めたのは DR-057 (alias) 制定前の代替表現で、別入口 + deprecated の用途は alias が完全カバー済み。ref は DR-078 §1/§3 の「消費文法テンプレの id 束縛」という狭い意味に確定 (実装・fixture とも既にこの立場、影響ゼロ)。DR-007 の例を消費文法テンプレ共有の例に差し替え、alias への migration hint と DR-057/078 参照を追記 (直前の spec commit)。"]
blocked_by:
origin: 自リポ TODO
---

# ref の「ElemDef 全体継承」用法 (DR-007) と「消費文法 Node 差し替え」実装の意味論差

## 概要

DR-078 実装調査 (2026-07-09) で検出。DR-007 の例 `{"ref":"run","name":"exec","deprecated":true}` は ElemDef 全体 (型・filters・入口等) を継承して差分上書きする用法に読めるが、kuu.mbt の ref_target 実装 (installer.mbt elem_head) は**消費文法 Node だけ**を Ref(name) に差し替え、name/filters/export_key 等は自分自身の宣言のまま。DR-057 §2 も「ref (構造を継承する)」と構造側の語で説明している。

## 背景

kuu.mbt issue ref-template-decode-missing の調査 (impl-worker2) で発見。DR-078 の射程外節に記録済み、本 issue が追跡先。

## 論点

- DR-007 の広い用法 (ElemDef 継承) を仕様として生かすか、DR-078 §1 の「消費文法テンプレート参照」に絞って DR-007 の例を改訂するか
- ElemDef 継承が欲しい実例 (deprecated 別入口等) は DR-057 alias が既にカバーしている可能性が高い — alias との棲み分けを先に洗う

## 受け入れ条件

- [ ] DR-007 の ref 用法と DR-057/DR-078 の ref 実装意味論の整合方針を裁定する
- [ ] alias との棲み分けを確認し、必要なら DR-007 の例を改訂する
