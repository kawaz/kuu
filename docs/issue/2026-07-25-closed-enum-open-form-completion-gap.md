---
title: closed enum + 開放形の混在値が補完候補として提示できない (F4)
status: open
category: design
created: 2026-07-25T15:58:51+09:00
last_read:
open_entered: 2026-07-25T15:58:51+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (dogfooding D1 findings)
---

# closed enum + 開放形の混在値が補完候補として提示できない (F4)

## 概要

dogfooding D1 (kuu-cli 自己定義) で判明した表現力ギャップ。
`--category-mode` の値域 `default | all | named:<任意>` は
`regex_match ["^(default|all|named:.+)$"]` で**受理**は書けるが、`values`
enum でないため補完候補の構造提示 (default / all / named: の 3 択) が
できない — 「受理は書けるが補完に乗らない」ギャップ。

## 背景

or で `{values:[default,all]}` と `{regex named:.+}` の枝を分ければ部分的に
改善しうるが、**option 値構造の or 枝が補完候補にどう出るかは未検証**。
裁定候補ではなく、補完 (completion query) 側の表現力課題として記録された
もの。

一次資料: `docs/findings/2026-07-24-dogfooding-d1-expressiveness.md` の F4 節。
採否・実装方針 (or 枝の補完挙動を仕様化するか、別の宣言席を設けるか等) は
spec サイクルの裁定に委ねる。

## 受け入れ条件

- [ ] or 枝混在 (values + regex) の場合の completion query 挙動を実機/仕様で
      検証
- [ ] 部分改善 (or 分岐) で足りるか、新たな宣言席が要るかを spec サイクルで
      判断
