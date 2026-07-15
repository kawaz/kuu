---
title: Cand への completer フィールド実装追随 (DR-104 §2 宣言済みタスク)
status: resolved
category: task
created: 2026-07-14T20:14:03+09:00
last_read:
open_entered: 2026-07-14T20:14:03+09:00
wip_entered: 2026-07-15T10:57:26+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-15T12:07:48+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-104","implemented","done:pin テスト5本 (commits fca55c9c/712ebd37/742ee613)、fixtures/complete/completer-{basic,positional,merge-conflict,merge-match}.json 4本、conformance decoded=267/ran_cases=649/mismatches=0、moon test 332/332、ロックステップ push (spec 1ad9b448 → kuu.mbt ea001c49)、CI green (run 29385675841)"]
blocked_by:
origin: 自リポ TODO
---

# Cand への completer フィールド実装追随 (DR-104 §2 宣言済みタスク)

## 概要

DR-104 §2 は completer を wire に持たせ opt-in 検証すると規定したが、参照実装の
Cand 構造体には **completer フィールドが未実装**。codex レビュー #2 の M-5/C-2 が
指摘した残作業。

## 背景

DR-104 §2 明確化 note (d) により「実装追随まで fixture に completer を書かない、
書くなら実装追随と同一サイクルで」と定められている。spec/DR 側は land 済みだが
kuu.mbt 実装側が追随していない一時的不整合の状態。

## 受け入れ条件

- [ ] Cand に completer フィールドが追加され、complete() で配線される
- [ ] 同一 6 フィールドで completer だけ異なる候補の merge 規則が確定・実装される
- [ ] completer opt-in 検証の fixture が 1 本以上追加される
- [ ] conformance 比較器が completer opt-in 分岐に対応する

## TODO

- [ ] Cand に completer フィールド追加 + complete() での配線
- [ ] 同一 6 フィールドで completer だけ異なる候補の merge 規則の確定 (DR-104 §3 明確化 note が予告)
- [ ] completer opt-in 検証の fixture 1 本以上
- [ ] conformance 比較器の completer opt-in 分岐

## 関連

- `docs/findings/2026-07-14-codex-review2-triage-verdicts.md` M-5/C-2
- DR-104 §2 (completer を wire に持たせる規定 + 明確化 note (d))
- DR-060 §3 (completer 名参照)
