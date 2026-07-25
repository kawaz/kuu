---
title: 最初の positional 充足後を丸ごと raw で取る境界を宣言できない (F1)
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

# 最初の positional 充足後を丸ごと raw で取る境界を宣言できない (F1)

## 概要

dogfooding D1 (kuu-cli 自己定義) で判明した表現力ギャップ。
`docker run IMAGE CMD ARGS...` / `kubectl exec POD -- CMD...` 型 —
定義済み positional (例: IMAGE) を充足した**後の**最初のトークンから先を
丸ごと raw で子コマンドに渡す、という境界を宣言できない。

kuu-cli 自身も `parse DEF_JSON ARGS...` で ARGS を raw に取りたいが、現状は
明示 `--` を要求している (`impl/mbt/tests/self/definition.sh`、kuu-cli リポの
全 parse_case が `--` を挟んでいるのはこのため)。

## 背景

pattern dd (DR-090) のトリガは「トークンの形」(regex) だけで発火し、
**背骨上の進行位置 (どの positional まで充足したか) を条件にできない**。
xargs 型 pattern `^[^\-]` を書くと最初の非ハイフン operand = DEF_JSON 自体で
発火してしまい、「DEF_JSON の次から」が表現できない。明示 `--` (exact dd)
なら可。

一次資料: `docs/findings/2026-07-24-dogfooding-d1-expressiveness.md` の F1 節。

裁定素材の輪郭 (一次資料からの引用):

- (a) pattern dd に発火位置条件 (「この positional 席の充足後」) を足す拡張
- (b) positional 席側の新属性 (DR-090 が採用しなかった `severs_trailing` 系の
  再検討)
- (c) 現状維持 (明示 `--` を canonical とする)

DR-090 §3 は「pattern の設計で競合自体を避ける」方針なので、(a) は同 DR の
設計思想 (位置条件を持たない) との整合を裁く必要がある。一次資料には所感
(推し: (a) 系 — docker/kubectl 型は corpus 頻出で `--` 強制は実用互換を欠く)
が添えられているが、採否・実装方針は spec サイクルの裁定に委ねる。

## 受け入れ条件

- [ ] DR-090 §3 の設計思想 (pattern 設計で競合を避ける方針) との整合を含め、
      (a)/(b)/(c) のいずれか (または他の代替案) を spec サイクルで裁定
- [ ] 裁定結果を DR に反映 (新規 DR または DR-090 改訂)
