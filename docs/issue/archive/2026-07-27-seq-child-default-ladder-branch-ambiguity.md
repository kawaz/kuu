---
title: seq/or の default 子が複数の消費候補を生むときの枝の立ち方が未規定
status: resolved
category: design
created: 2026-07-27T11:03:05+09:00
last_read: 2026-07-27T11:09:05+09:00
open_entered:
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-28T21:42:29+09:00
discard_reason:
pending_reason:
close_reason: ["design/DESIGN.md§5.2","fixtures/seq-parse/child-default-preemption.json","done"]
blocked_by:
origin: CHILDDEF-Q1=b 反映作業中の統括指摘 (2026-07-27)
---

# seq/or の default 子が複数の消費候補を生むときの枝の立ち方が未規定

## 概要

本質は「default: 席が同一トークンに対する消費候補を複数生む」ことで、seq (子が順に並ぶ) でも or (枝が並列に並ぶ) でも同型に起きる。

CHILDDEF-Q1=b (kawaz 裁定 2026-07-26、DESIGN §5.2 / DR-031) により `default:` は位置に依らず値源ラダーの席となり、DR-088 §1/§2 の静的充足判定によって「default 宣言を持つ消費点は、トークンを得られなくても空席のまま完全経路に含めてよい」が or/seq の子位置にも及ぶようになった。この帰結として、**同一トークンを食える消費候補が複数立つ構成**でどちらが消費するかが未規定である。seq なら「子が 2 つとも `default:` を持ち、トークンが 1 つだけ与えられた場合」、or なら「型が重なる兄弟枝の一方が `default:` を持つ場合」(下記「or 側の実例」) がそれぞれの現れ方になる。

seq 側の例: 定義 `{"seq":[{"type":"string","default":"A"},{"type":"string","default":"B"}]}` に 1 トークン `x`:

- 枝 1: 1 子目が `x` を消費、2 子目は空席 → default B が充填 → `["x","B"]` / sources `["cli","default"]`
- 枝 2: 1 子目が空席 (default A 充填)、2 子目が `x` を消費 → `["A","x"]` / sources `["default","cli"]`

両枝とも入力を全消費する完全経路であり、DESIGN §15.1 の成功条件 (完全経路がちょうど 1 本) に照らすと **2 本成立 = ambiguous** になるのが素直な導出。ただし DR-038 の経路同一性 (実体への観測可能な効果列で判定) を適用すると効果列が異なる (どちらの座に cli 効果が立つか) ため 2 本と数えられ、退化して 1 本に畳まれることはない、という読みまでは追えている。

## or 側の実例 (2026-07-27 実測)

CHILDDEF-Q1=b の fixture 反映時、実装 worker (impl-two-rulings) の指摘で `fixtures/or-parse/unselected-branch-default-absent.json` の定義がこの断面に該当することが判明した。

定義 `{"or":[{"name":"fast","type":"string"},{"name":"slow","type":"string","default":"d"}]}` に `--mode x`:

- 枝 1: fast が "x" を消費 → `{mode:{fast:"x"}}` / effects は fast への set
- 枝 2: slow が "x" を消費 → `{mode:{slow:"x"}}` / effects は slow への set

旧規範では slow が消費 0 の const だったため枝 2 は "x" を残余トークンにして不成立で、fast の 1 本に確定していた。CHILDDEF-Q1=b で `default:` 子が通常消費するようになった結果、両枝とも全消費が成立する。束縛先の実体が異なるため DR-038 の経路同一性 (効果列で判定) では 1 本に合流せず、DESIGN §15.1 / DR-037 の「解けた枝の数」表から **ambiguous** が導出される。

劣後規範を全 DR に対して探したが存在しない: DR-041 §4 の先食い・早閉じ抑制は greedy と背骨に関する規則で枝間優先を与えない (DR-097 の精密化を適用しても両枝 viable)、DR-038 は「完全経路間に優先がない」と明示、DESIGN §15.1 は「最長一致をプリミティブな規則として持たない」と明記、DR-088 は充足判定のみで優先を規定しない。

**統括裁定 (2026-07-27)**: ambiguous が正しい導出であり、劣後規範は入れない (DR-038 を曲げない)。当該 fixture は元の pin 意図 (「選ばれなかった default 持ち枝は着席しない」の輪郭) を保存するため、slow を `int` + `default:7` へ変えて**型で排他化**する (string トークンは int 照合で Reject されるため一意に fast へ確定、DR-041 §4「raw 消費と node 構造照合は別レイヤ」)。fixture 修正は impl-two-rulings が担当。

この裁定は当該 fixture の扱いを決めたものであって、**本 issue の論点 (型が重なる場合に ambiguous 以外の解を与えるべきか) は未裁定のまま残る**。型で排他化できない場合 (同型の兄弟が並ぶ seq、両子とも同型 + default 等) の規定が引き続き必要。

## 背景

今回の反映 (CHILDDEF-Q1=b) で追加した fixture `fixtures/seq-parse/literal-child-default-ladder.json` は **1 子目に default が無い** 定義なので枝が 1 本に確定し、この曖昧性に触れない。統括裁定 (2026-07-27) で「今回 pin しなくてよい、曖昧さが実在するなら issue メモとして残せ」と指示された。

## 受け入れ条件

- [ ] 上記 2 枝がともに完全経路として成立するか (= ambiguous が正しい帰結か)、それとも seq の順次消費 (DESIGN §5.1「子を順に消費」) が先頭優先を含意して枝 1 だけが成立するのかを裁定する
- [ ] repeat / optional 実装後は同型の曖昧性がより広い範囲で現れるため、そこでまとめて裁定する選択肢も検討する
- [ ] トークンが 0 個の場合も同じ論点が立つ: 両子とも空席で埋まるのが 1 通りの完全経路として確定するのか、複数の空席パターンが ambiguous になり得るのか
- [ ] 3 子以上に一般化した場合の規定 (または「2 子までで十分、3 子以上は別途検討」の明示)
- [ ] or 側 (並列枝) と seq 側 (順次子) を同一の規定で扱えるか、別々の規定が要るかを裁定する
- [ ] 裁定後は fixture で pin する (seq-parse 配下、`literal-child-default-ladder.json` の隣)

## 関連

- DESIGN §5.2 (value:/default: の 2 位相) / §5.1 (seq は子を順に消費) / §15.1 (完全経路の成功条件)
- DR-031 (const と default の位相分離、CHILDDEF-Q1=b) / DR-088 §1/§2 (宣言された値源 = デフォルトの存在) / DR-038 (経路同一性は効果列)
- DR-037 (解けた枝の数による結末分類 — 2 個以上は ambiguous) / DR-041 §4 (先食い・早閉じ抑制、raw 消費と構造照合の層分離)
- fixtures/seq-parse/literal-child-default-ladder.json (今回追加、1 本枝に確定する側)
- fixtures/or-parse/unselected-branch-default-absent.json (型排他化で回避した実例)
- DESIGN §5.2 末尾「帰結: default: 持ちの子は同型の兄弟枝と ambiguous になりうる」(本 issue の条文側の注意書き)
- 重複起票を統合: docs/issue/archive/2026-07-27-seq-both-default-children-branching-unspecified.md (同一論点、並行 write fork 競合による事故。上記 2 観点は当該 issue から吸収)
