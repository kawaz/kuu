---
title: DR-093 を実装完了する: required/requires 型委譲充足の kuu.mbt 実装 + die.json 更新
status: open
category: task
created: 2026-07-12T00:51:17+09:00
last_read:
open_entered: 2026-07-12T00:51:17+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (issue dd-required-marker-fire-constraint の close 時自動起票)
---

# DR-093 を実装完了する: required/requires 型委譲充足の kuu.mbt 実装 + die.json 更新

## 概要

issue `2026-07-07-dd-required-marker-fire-constraint` (close: 2026-07-12) の裁定で、
required / requires の充足判定を型 (値空間) への委譲として一様化する方針が
DR-093 (docs/decisions/DR-093-required-type-directed-satisfaction.md) として確定した。
値空間なし要素 (`type: "none"`、dd 含む) の required 充足は「発火したこと (committed)」
で定義され、`{"type":"dd","required":true}` (新規 wire 語彙ゼロ) で kawaz/die の `--`
必須が表現できるようになった。決定内容は spec (DR-047 §5 精密化 / DR-089 §4 一部
supersede) のみで、kuu.mbt 実装・corpus/real-cli/die.json への反映・fixture 追加は
未実施のため本 issue で追跡する。

## 受け入れ条件

- [ ] kuu.mbt の required 判定ロジックが none 型要素 (dd 含む) に対し「committed で充足」
      を実装する (DR-093 §2)
- [ ] requires の目的語が none 型要素の場合も同 dispatch (発火で充足) で解釈する
      (DR-093 §3、DR-089 §4 の definition-error を置換)
- [ ] `corpus/real-cli/die.json` を `{"type":"dd","required":true}` 化し、
      `bare-arg-without-dd-diverges` ケースを failure (`required_violated`) pin へ更新する
- [ ] fixtures/ に none 型 required (+ requires 目的語が none のケース) の輪郭 fixture を追加する
- [ ] pin bump

## 関連

- docs/decisions/DR-093-required-type-directed-satisfaction.md
- docs/issue/archive/2026-07-07-dd-required-marker-fire-constraint.md (由来 issue、close 済み)
- DR-047 §5 (精密化元)、DR-089 §4 (一部 supersede 元)
