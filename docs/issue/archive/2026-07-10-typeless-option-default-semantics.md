---
title: option/positional の type 省略時の既定意味論が未規定 (DESIGN §1.3 の省略可宣言と decoder 実装の乖離)
status: resolved
category: design
created: 2026-07-10T20:56:29+09:00
last_read:
open_entered:
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-11T09:19:06+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-089","kawaz 裁定 (2026-07-11) により省略時既定型を当てる3案(flag/string/DESIGN側を狭める)は全て不採用。素直に表現するなら型なし、ないものに勝手に値型をあてるのは手抜き。DR-089 (spec commit 94f208e7): typeは値空間のみを規定し消費は構造の関心(直交)。type:\"none\" = 値空間が空のnodeを第一級で定義、省略 = noneの糖衣。結果非掲載・発火観測はParserContext/explains層、値充足席には立てない(definition-error)。実装とfixtureは未着手(DRのみ)のためfollow-up必要 — kuu.mbt側のdecoder対応issueは呼び出し側が別途起票する。"]
blocked_by:
origin: 自リポ TODO
---

# option/positional の type 省略時の既定意味論が未規定 (DESIGN §1.3 の省略可宣言と decoder 実装の乖離)

## 概要

DESIGN.md:88 は「option/positional は所属配列で役割が定まるので type フィールドは省略可」と宣言するが、省略時に何型として振る舞うか (option → flag 糖衣? string 値スロット? / positional → string?) の既定が正本に無い。

## 背景

kuu.mbt decoder は or/ref/values を持たない限り type 必須 (= spec より厳格) で、既存 fixture 33 件も全て flag を明示しており、実質「省略」は未使用・未 pin。2026-07-10 の set-always-variant-branch.json で type 無し verbose (意図は flag) が decode 不能になり fixture 側に `type:"flag"` を明記して回避した。

## 裁定候補

- (a) option の type 省略 = flag 糖衣 / positional = string を既定として明文化 (CLI 常識に一致)
- (b) 省略 = string 一律
- (c) DESIGN:88 を「values/or/ref がある場合のみ省略可」に狭める (現 decoder 挙動の追認)

kawaz 裁定バッチ行き。

## 受け入れ条件

- [ ] type 省略時の既定意味論を裁定 (a/b/c いずれか、または別案)
- [ ] DESIGN.md §1.3 (省略可宣言) を裁定内容に合わせて明文化
- [ ] decoder 実装と fixture を裁定に合わせて追従 (必要なら)
