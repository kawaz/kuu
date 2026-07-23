---
title: fixture why の実装ファイル名参照の残りサニタイズ
status: open
category: task
created: 2026-07-24T03:00:40+09:00
last_read:
open_entered: 2026-07-24T03:00:40+09:00
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

# fixture why の実装ファイル名参照の残りサニタイズ

## 概要

`fixtures/**/*.json` の `why` フィールドに残っている実装ファイル名 (`installer.mbt`
/ `eval.mbt` / `kuu.mbt` 等) への直接参照を、抽象語彙 (観測契約の語彙 / 「参照実装」
という言い回し等) へ書き換える。`grep -rlE 'installer\.mbt|eval\.mbt|kuu\.mbt' fixtures/`
で該当は約 30 ファイル (2026-07-24 時点実測)。

## 背景

多言語スパイク findings (`docs/findings/2026-07-24-multilang-spike-findings.md` §2) で、
fixture why への実装内部語彙漏れが一次資料性を損なうと判明した。matcher 系 4 ファイル
は 2026-07-24 に抽象語彙へ書き換え済みで `walk_short` / `Matcher::` 等は 0 hit 化して
いる。残る実装ファイル名参照 (`installer.mbt` / `eval.mbt` / `kuu.mbt`) を同じ方針で
一括サニタイズする。

## 受け入れ条件

- [ ] `grep -rlE 'installer\.mbt|eval\.mbt|kuu\.mbt' fixtures/` が 0 件になる
- [ ] 期待値 (definition/args/expect 等) は一切変更しない — 書き換え対象は `why` 文言のみ
- [ ] `lowering/` 系 fixture は installer 名が仕様概念 (config installer / long installer 等)
      と重なる場合があるため、機械置換ではなく個別判断で処理する (誤って仕様語彙の
      `installer` まで削らない)
- [ ] 全 fixture が JSON として valid なままである

## TODO

<!-- wip 時のみ -->
