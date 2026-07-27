---
title: 両子とも default: を持つ seq に 1 トークンだけ与えたときの枝の立ち方が未規定
status: idea
category: design
created: 2026-07-27T11:03:05+09:00
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
origin: CHILDDEF-Q1=b 反映作業中の統括指摘 (2026-07-27)
---

# 両子とも default: を持つ seq に 1 トークンだけ与えたときの枝の立ち方が未規定

## 概要

CHILDDEF-Q1=b (kawaz 裁定 2026-07-26、DESIGN §5.2 / DR-031) により `default:` は位置に依らず値源ラダーの席となり、DR-088 §1/§2 の静的充足判定によって「default 宣言を持つ消費点は、トークンを得られなくても空席のまま完全経路に含めてよい」が or/seq の子位置にも及ぶようになった。この帰結として、**seq の子が 2 つとも `default:` を持ち、トークンが 1 つだけ与えられた場合**にどちらの子が消費するかが未規定である。

例: 定義 `{"seq":[{"type":"string","default":"A"},{"type":"string","default":"B"}]}` に 1 トークン `x`:

- 枝 1: 1 子目が `x` を消費、2 子目は空席 → default B が充填 → `["x","B"]` / sources `["cli","default"]`
- 枝 2: 1 子目が空席 (default A 充填)、2 子目が `x` を消費 → `["A","x"]` / sources `["default","cli"]`

両枝とも入力を全消費する完全経路であり、DESIGN §15.1 の成功条件 (完全経路がちょうど 1 本) に照らすと **2 本成立 = ambiguous** になるのが素直な導出。ただし DR-038 の経路同一性 (実体への観測可能な効果列で判定) を適用すると効果列が異なる (どちらの座に cli 効果が立つか) ため 2 本と数えられ、退化して 1 本に畳まれることはない、という読みまでは追えている。

## 背景

今回の反映 (CHILDDEF-Q1=b) で追加した fixture `fixtures/seq-parse/literal-child-default-ladder.json` は **1 子目に default が無い** 定義なので枝が 1 本に確定し、この曖昧性に触れない。統括裁定 (2026-07-27) で「今回 pin しなくてよい、曖昧さが実在するなら issue メモとして残せ」と指示された。

## 受け入れ条件

- [ ] 上記 2 枝がともに完全経路として成立するか (= ambiguous が正しい帰結か)、それとも seq の順次消費 (DESIGN §5.1「子を順に消費」) が先頭優先を含意して枝 1 だけが成立するのかを裁定する
- [ ] repeat / optional 実装後は同型の曖昧性がより広い範囲で現れるため、そこでまとめて裁定する選択肢も検討する
- [ ] 裁定後は fixture で pin する (seq-parse 配下、`literal-child-default-ladder.json` の隣)

## 関連

- DESIGN §5.2 (value:/default: の 2 位相) / §5.1 (seq は子を順に消費) / §15.1 (完全経路の成功条件)
- DR-031 (const と default の位相分離、CHILDDEF-Q1=b) / DR-088 §1/§2 (宣言された値源 = デフォルトの存在) / DR-038 (経路同一性は効果列)
- fixtures/seq-parse/literal-child-default-ladder.json (今回追加、1 本枝に確定する側)
