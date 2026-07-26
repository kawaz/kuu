---
title: 親と子の両方が type を持つ or/seq に「親の type は無意味」の lint warn を出す
status: open
category: design
created: 2026-07-26T11:06:00+09:00
last_read:
open_entered: 2026-07-26T11:06:00+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO
---

# 親と子の両方が type を持つ or/seq に「親の type は無意味」の lint warn を出す

## 概要

`{"name":"level","type":"int","or":[{"type":"int","name":"num"},{"type":"bool","name":"flag"}]}`
のように、**親要素と子要素(or/seq の枝)の両方が `type` を持つ**定義に対して、
静的バリデータが「親の `type` は結果に効かない」旨の lint warn を出すようにする。

DR-067 §2 により `type`(参照糖衣)は葉・枝どちらとも同居でき、§3.5 の合成順で
「type テンプレの構造を直書きが上書きする」と規定されている。したがって上記の
ような定義は**合法**であり、実装も受理する(2026-07-26 実測、validate が
`ok:true`)。しかし直書きの `or` が構造として優先されるため、親の `type` は
最終結果に一切反映されない。書き手が「親の型を宣言したつもり」でも実際には
無視される、という意図と挙動の食い違いが起きる。

## 背景

kawaz 指示 (2026-07-26)。definition-error にはしない(DR-067 の合法規定を
覆さないため)が、DESIGN §15.6 が定める静的バリデータ(warn はする、reject
はしない領分)で拾う価値がある。

想定文言: 「親要素の type は or/seq が構造を決めるため無視される。型を指定
したいなら各枝に書く」程度。

**注意**: 現状 DESIGN §15.6 の静的 warn 自体が未実装(kuu.mbt リポの issue
`2026-07-25-static-lint-warn-and-diagnose-unimplemented` 参照)。本件は
その実装が入った後に追加する warn 項目の 1 つとして扱うのが自然で、単独で
先行実装する必要はない。

## 受け入れ条件

- [ ] DESIGN §15.6 の静的バリデータ実装時に、本 warn ケースが仕様として
      含まれている(or/seq の親子両方が type を持つ場合に warn)
- [ ] DR-067 §2/§3.5 の合成順規定(直書き優先)と矛盾しない文言になっている

## TODO

<!-- wip 時のみ -->
