---
title: トークン非帰属の失敗 (env/config 由来) の argv_pos 規約が未明文化
status: resolved
category: design
created: 2026-07-09T16:08:55+09:00
last_read:
open_entered: 2026-07-09T16:08:55+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-09T16:13:02+09:00
discard_reason:
pending_reason:
close_reason: ["dr/CONFORMANCE.md §2 (commit ce52ffa5)","implemented","(b) discarded: 最小変更の (a) で fixture と正本が整合したため不採用、将来必要になれば conformance-tried-triggers-help-entry-fields の optional フィールド議論と合流"]
blocked_by:
origin: 自リポ TODO
---

# トークン非帰属の失敗 (env/config 由来) の argv_pos 規約が未明文化

## 概要

CONFORMANCE.md §2 は「argv_pos は 0-based。トークンが尽きて要求が満たせない失敗は argv.length を指す」とだけ規定し、どの argv トークンにも帰属しない失敗 (env / config 由来の値の parse・filter reject) の argv_pos を明文化していない。一方 conformance harness (kuu.mbt json_conformance_wbtest.mbt の error decode) は argv_pos 欠落を DecodeSkip にするため、fixture 側で省略もできない。

## 背景

fixtures/pre-filters/env-source.json (case env-untrimmed-parse-rejected, 2026-07-09 追加) では暫定として「トークン枯渇規約の準用 = argv.length (argv=[] なら 0)」で書いた。

選択肢:

- (a) この準用を CONFORMANCE §2 に明文化する
- (b) errors 比較で argv_pos を reason 同様の optional 検証に格上げする (harness の decode 変更を伴う、既存 issue conformance-tried-triggers-help-entry-fields の optional フィールド議論と同族)

(a) が最小。kawaz 裁定を待たず (a) で運用し、覆れば fixture を追従させる。

由来: pre_filters fixture batch (fixtures/pre-filters/, commit 15ce7dcb) 作成時に fixture-prefilters worker が発見。

## 受け入れ条件

- [ ] CONFORMANCE.md §2 に env/config 由来などトークン非帰属の失敗の argv_pos 規約を明文化する、または (b) 案を採用し harness の decode を optional 検証に変更する
- [ ] fixtures/pre-filters/env-source.json の暫定値 (argv.length 準用) が規約と整合することを確認 (規約が変われば fixture を追従)
