---
title: type ローカル filter の簡略化検討
status: open
category: design
created: 2026-08-16T13:27:27+09:00
last_read:
open_entered: 2026-08-16T13:27:27+09:00
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

# type ローカル filter の簡略化検討

## 概要

type ローカルな filter の簡略化検討 (kawaz mid=67-68、2026-08-16)。方向: 汎用 filter
(複数の型・要素から共有参照される trim/in_range 等) は registry + descriptor を維持
しつつ、特定 type にローカルな filter は (1) 型定義内に閉じたネームスペース (DR-094
のグローバル ns 衝突管理から外す)、(2) さらにカプセル/型内でのみ使う場合は descriptor
自体を不要化 (インライン変換宣言) できるケースが多い見込み。

## 背景

descriptor の存在理由 (共有語彙の衝突管理 / reasons 完備チェック DR-061 / help・lint
機械可読性) を分解し、各目的が型ローカル filter に適用されるかで「descriptor 必須の
残る場面」と「不要にできる場面」の境界線を引く。受け入れ検証ノート
(2026-08-16-capsule-acceptance-walkthrough.md §8) の「descriptor 領分の残存」残余の
解消策。値カプセル移送とは独立の後続設計サイクル。

関連: DR-061/094/102/132、発題 mid=1 の「registry の煩雑さも減らせるのでは」。

## 受け入れ条件

- [ ] descriptor の 3 つの存在理由 (衝突管理 / reasons 完備チェック / help・lint 機械
  可読性) それぞれについて、型ローカル filter への適用可否を判定する
- [ ] 「descriptor 必須の残る場面」と「descriptor 不要にできる場面」の境界線を明文化する
- [ ] 型ローカル filter のネームスペース設計 (DR-094 グローバル ns 衝突管理からの分離)
  を DR として起票する
