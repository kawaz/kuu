---
title: 省略可能な scalar positional にデフォルト値を持たせられない (optional は配列強制)
status: resolved
category: design
created: 2026-07-07T23:10:40+09:00
last_read:
open_entered: 2026-07-07T23:10:40+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-11T10:06:10+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-088","done: kawaz裁定(2026-07-11)「普通に書ける」— optional:true糖衣(repeat {min:0,max:1})を使う必要はなく、素のpositional+default宣言({name,type,default})で「席が空でもdefault供給で経路完全→遅延解決で実体化」とDR-088から導出される。issueの前提がDR-088より古かった。kuu.mbtのpositional充足経路の検証+fixtureは後続issue(kuu.mbt positional-default-fulfillment)が追跡。"]
blocked_by:
origin: 自リポ TODO
---

# 省略可能な scalar positional にデフォルト値を持たせられない (optional は配列強制)

## 概要

`optional: true` は `repeat: {min: 0, max: 1}` の糖衣であり (DR-043)、反復系
要素は max の値に依らず結果が**配列**になる (DR-044、`[]` / `[x]`、「max=1 なら
scalar」の特別化はしない)。このため「省略されたら既定値 X を scalar で持つ
optional positional」(例: `[count=10]` のような 1 個だけの省略可能引数に
default を与えたい場合) を素直には表現できない — 反復系である以上、値は
配列の形でしか出せず、`default` フィールドは非反復要素の値源としてのみ
意味を持つ (§11.4 値源ラダー、DR-051)。

省略時に unwrap_single 相当の collector を都度書けば scalar + default 相当は
作れるが、「省略可能な単一 positional にデフォルト値」という頻出パターンに
毎回 collector 定義を要求するのは糖衣として不親切という指摘。

## 背景

DESIGN.md §6.1 (absent 節) の規定:

> 反復系 (repeat / multiple / `optional: true` 糖衣を含む — optional は
> repeat {min:0, max:1} なので反復系そのもの) は 0 回発火でも `[]` が出る、
> flag / count は default を同梱、required 要素は値が無ければ経路不成立

DR-044 の規定:

> カーディナリティでも形を変えない: repeat / multiple を宣言した要素は max
> の値に依らず配列になる。`repeat: {min: 0, max: 1}` (= `optional: true`
> 糖衣) も `[]` / `[x]` — 「max=1 なら scalar」の特別化はしない。反復を
> 宣言した時点で結果は複数値の形であり、scalar が欲しい場合は collector で
> 畳む (unwrap_single)

`default` は反復系要素には意味を持たない (absent と default は別軸、DR-051)。
この 2 つの規則の組み合わせにより、「optional かつ scalar かつ default 付き」
という宣言はエンジンの一次表現として存在しない。

corpus / real-cli プローブ (`corpus/real-cli/uniq.json` 等) を書く過程で、
「省略可能引数にデフォルト値」という自然言語的には単純な仕様を kuu 定義で
表現しようとして詰まったのが発端。

## 受け入れ条件

- [ ] 「optional + scalar + default」パターンをどう表現すべきか方針を決める
      (候補: (a) 表現しない・都度 collector を書かせる現状維持、(b) optional
      糖衣に scalar 縮退オプションを足す、(c) collector 側の糖衣 (例:
      `unwrap_single` + `default` の組合せ簡略記法) を追加、(d) その他)
- [ ] 採用方針を DR として記録する (DR-043 / DR-044 / DR-051 との関係を明示)
- [ ] 方針を示す corpus fixture (または既存 fixture への追記) を用意する
