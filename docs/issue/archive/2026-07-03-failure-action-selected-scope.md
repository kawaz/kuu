---
title: 失敗時アクションの「候補経路で selected」の精密定義
status: resolved
category: design
created: 2026-07-03T17:56:00+09:00
last_read:
open_entered: 2026-07-03T17:56:00+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-03T18:53:26+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-048","implemented"]
blocked_by:
origin: 自リポ TODO
---

# 失敗時アクションの「候補経路で selected」の精密定義

## 概要

DR-048 (失敗時アクション — early-exit は持たず完走後の表示選択) が射程外とした
ケース、すなわち「完全経路が 0 本の失敗時に、候補経路のいずれかで失敗時アクション
持ち要素が selected だった」場合の精密な定義を確定する。

具体的に詰める点:

- どの partial 経路の selected を数えるか
- partial 経路の範囲 (= どこまでを「候補経路」と見なすか)
- findings F-039 が記録した失敗時部分状態との接続

## 背景

DR-048 は「失敗時アクションは early-exit を持たず、完走後の表示選択で扱う」方針を
確定したが、完全経路が 1 本も成立しない失敗時のケースは射程外として棚上げしていた。
この棚上げ部分を放置すると、失敗時アクション判定の仕様に穴が残ったままになる。

確定の進め方として、slice PoC で以下の失敗形を実測し、発火条件を観測してから
定義を固める:

- `--help --typo`
- `--typo --help`
- dd (double-dash) 内部での失敗
- 複数アクションが競合する場合の argv 先勝ち挙動

実測結果をもとに精密定義を確定したら、DR-048 を更新するか、後続 DR を新規起票する。

## 受け入れ条件

- [ ] slice PoC で上記 4 種の失敗形それぞれの失敗時アクション発火条件を観測し記録する
- [ ] 「どの partial 経路の selected を数えるか」を確定する
- [ ] 「partial 経路の範囲」を確定する
- [ ] findings F-039 の失敗時部分状態との接続を明記する
- [ ] DR-048 の更新 or 後続 DR の起票を完了する
