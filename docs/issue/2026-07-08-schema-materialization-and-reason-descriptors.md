---
title: Schema 実体化 + reason descriptor 全列挙 (DR-068 lifecycle 管掌)
status: open
category: task
created: 2026-07-08T21:53:42+09:00
last_read:
open_entered: 2026-07-08T21:53:42+09:00
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

# Schema 実体化 + reason descriptor 全列挙 (DR-068 lifecycle 管掌)

## 概要

フェーズ 3 で行う Schema 実体化に紐づく横断タスクの集約。台帳 issue 3 本 (phase1-serialization-design-agenda / phase23-distill-ledger / distill-spec-gaps) の close 時に残項目として切り出した。

## 背景

2026-07-08 台帳 issue 監査 (fixture-batch worker の読み取り監査レポート) にて、3 台帳に横断していた Schema 実体化系の残項目を発見。一本化して管理する。

## 受け入れ条件

- [ ] schema/*.json ドラフトの書き出し: DR-067 §構文層が正本、機械的写像。確定版発行条件は DR-068 lifecycle (フェーズ 3 の fixture green と同期)
- [ ] canonical factory / 組み込み filter の emit しうる reason 全列挙を descriptor `reasons` 宣言へ実体化 (DR-066 §2、同 §射程外で「Schema 実体化と同時」と規定)
- [ ] bool value_parser 失敗 reason の descriptor 宣言 (旧 distill-spec-gaps #5 の派生。not_a_bool は DR-066 §3 v1 語彙に追加済み、宣言側の実体化が残り)
