---
title: help_category 内部セル link 配線は at_pos ベース last-wins で実装する (M5 着手時の注意)
status: idea
category: task
created: 2026-07-23T23:24:48+09:00
last_read:
open_entered:
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

# help_category 内部セル link 配線は at_pos ベース last-wins で実装する (M5 着手時の注意)

## 概要

M5 で `#help_category` 内部セルの link 配線を実装する際、at_pos ベースの CLI
出現順 last-wins を最初から使う (`kuu.mbt` `src/kuu/completion.mbt` L42-72 の
修正パターンを再利用)。

## 背景

`apply_entity_links` (`resolve.mbt` L2619 付近) は宣言順で bindings に
リンクコピーを push するため、配列順 last-wins は「宣言順で最後に勝つ」に
なってしまう bug class がある (CLI 出現順ではない)。

現状の実物検査 (2026-07-23) で link を立てる production 箇所は
`completion_script` のみ (`installer.mbt` L1322 付近) で、この箇所は
at_pos ベース last-wins に修正済み。`help_category` 系は現時点で未配線
のため今は該当バグは無い。

ただし M5 (`HelpMetaInstaller.apply` 移送時に wire 段で `#help_category` を
立てる予定) で同じ配列順 last-wins パターンを踏むと、この bug class が
再発する。

## 受け入れ条件

- [ ] M5 で `#help_category` 内部セルの link 配線を実装する際、
      `completion.mbt` L42-72 と同様に at_pos ベースの CLI 出現順
      last-wins を採用している
- [ ] `apply_entity_links` 側の宣言順 push に依存した last-wins ロジックを
      新規に追加していない

## TODO

<!-- wip 時のみ -->
