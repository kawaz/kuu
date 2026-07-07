---
title: tty 判定値のモデル化 — ambient probe でなく値源として注入する案
status: open
category: design
created: 2026-07-07T23:20:30+09:00
last_read:
open_entered: 2026-07-07T23:20:30+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kawaz/die (依頼元プロジェクト)
---

# tty 判定値のモデル化 — ambient probe でなく値源として注入する案

## 概要

kawaz/die の stdin 分岐 (bare-TTY → help fallback / non-TTY → stdin forward)
は argv 由来ではない ambient probe (isatty(3) 等) に依存する。現行の DR-049
値源ラダー (env/config/inherit/default) のいずれにも該当せず、
`corpus/real-cli/die.json` の definition では一切モデル化できていない
(env/config で代替もできない — 値源として存在しない)。

## 背景

corpus/real-cli/die.json 作成中に発覚。die の完全な仕様 (docs/DESIGN.md の
stdin handling 節) は「ARGS empty + stdin is NOT a TTY → forward」/
「ARGS empty + stdin IS a TTY → help fallback」という 3 分岐を持つが、この
分岐条件 (TTY 判定) 自体を表現する語彙が仕様に存在しない。

メインの初期見解 (kawaz 発、記録目的): 評価器の純粋性 (argv → 結果の決定的
写像) を守るため、ambient probe でなく env と同様の**注入値源**として
モデル化 (fixture が tty 状態を与える) が筋が良いのではという見解。git の
`color=auto` のような「実行環境に依存する解決」と同型の問題であり、
pluggable installer (is-tty installer) として値源を追加する可能性もある。

## 受け入れ条件

- [ ] tty 状態を「注入可能な値源」としてモデル化する設計 (env_provider 的な
      isatty_provider 案、または既存 env_provider の拡張) を検討する
- [ ] 評価器の純粋性 (決定的写像) をどう保つかを明示する
- [ ] 採用方針を DR として記録する
- [ ] 方針を示す corpus fixture (die.json への追記、または新規 fixture) を
      用意する

## 関連

- corpus/real-cli/die.json (本 issue を forward-reference する gap 記述あり)
- DR-049 (値源ラダー)
