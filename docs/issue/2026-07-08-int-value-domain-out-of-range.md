---
title: int の値域 (Int64 範囲外の入力) が spec 未規定
status: open
category: design
created: 2026-07-08T12:31:07+09:00
last_read:
open_entered: 2026-07-08T12:31:07+09:00
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

# int の値域 (Int64 範囲外の入力) が spec 未規定

## 概要

DR-075 は「整数値か否か」の値空間判定と int_round を規定するが、
「整数値ではあるが表現可能範囲を超える入力」(例: `"1e300"`、
`"9223372036854775808"`) の帰結を定めていない。DR-066 v1 の reason 語彙にも
これに相当するエントリ (`int_out_of_range` 相当) が無い。

## 背景

参照実装 (kuu.mbt) 側で、silent に Int64 wrap してしまうバグの修正として
provisional reason `"int_out_of_range"` を emit する対応を進めている
(kuu.mbt issue `2026-07-07-parse-int-value-huge-exponent-overflow`)。
この provisional reason 導入は `not_a_bool` の前例
(`docs/issue/2026-07-07-bool-invalid-reason-vocab-gap.md`) と同型: 実装が
先に踏んだ判断を spec 側が未裁定のまま抱えている状態。

決めるべきこと:

1. int の値域は実装定義 (ホスト言語の整数幅) か、kuu 仕様として固定
   (i64 と明記) か。bigint 型を別途持つ場合の棲み分けも含む
2. 範囲外入力の reason 語彙 (`int_out_of_range` の正式化、または別名)
3. float→int の `int_round` 適用結果が範囲外になる場合の帰結
   (Error にするか、saturate/clamp するか等)
4. value-typing fixture への境界ケース追加 (Int64 max/min ±1、巨大指数
   (`"1e300"` 等) のケース)

## 受け入れ条件

- [ ] int の値域規定 (実装定義 vs i64 固定、bigint との棲み分け) を DR に明記する
- [ ] DR-066 §3 の v1 reason 語彙表に範囲外入力用の reason を追記する
- [ ] int_round 適用値が範囲外になる場合の帰結を明記する
- [ ] value-typing fixture に Int64 境界ケース (max/min ±1、巨大指数) を追加する
