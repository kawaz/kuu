---
title: DR 本体に残る実装固有名を整理する
status: open
category: docs
created: 2026-07-25T22:43:27+09:00
last_read:
open_entered: 2026-07-25T22:43:27+09:00
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

# DR 本体に残る実装固有名を整理する

## 概要

複数の DR 本文に参照実装固有の名前が残っている (2026-07-25 確認):

- DR-057 §3 (line 37): 「slice PoC 第 16 弾の flag」
- DR-076 §2
- DR-078
- DR-105
- DR-106

いずれも `kuu.mbt` / `installer.mbt` / slice PoC 参照を含む。

## 背景

fixture 側の `why` をサニタイズする際、DR-057 §3 を引用している fixture
(`fixtures/alias-parse/long-deprecated.json`) は引用元が壊れるため書き換えられなかった。
つまり DR 側を直さないと fixture 側だけでは完結しない構造になっている。

判断が要る点: DR は判断記録なので「当時の実装を指す記述」に正当性がある場合もある。
一律除去ではなく「言語非依存の spec として読まれる部分か、判断経緯の記録部分か」で
切る必要がある。前者は spec 語彙へ置換、後者は残す、という切り分けを各箇所について
行うこと。

## 受け入れ条件

- [ ] DR-057 §3 / DR-076 §2 / DR-078 / DR-105 / DR-106 の該当箇所を洗い出し、
      「spec として読まれる部分」か「判断経緯の記録部分」かを箇所ごとに切り分ける
- [ ] 前者は spec 語彙 (DR 番号 / DESIGN 節番号等) へ置換する
- [ ] 後者は残す判断とその理由を記録する
- [ ] DR-057 §3 を引用する fixture (`fixtures/alias-parse/long-deprecated.json`) の
      サニタイズを、DR 側の修正後に完了させる

## TODO

- [ ] 対象 5 DR の該当箇所を再確認し一覧化する
- [ ] spec 部分 / 判断経緯部分の切り分け方針を裁定する
- [ ] 置換・記録を適用する
- [ ] fixture 側 (long-deprecated.json) のサニタイズを完了させる
