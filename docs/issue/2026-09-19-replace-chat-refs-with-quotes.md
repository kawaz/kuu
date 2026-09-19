---
title: ccmsg room/メッセージ参照を引用形式に置き換える
status: idea
category: task
created: 2026-09-19T12:22:20+09:00
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
origin: sandbox-jev
---

# ccmsg room/メッセージ参照を引用形式に置き換える

## 概要

sandbox-jev の docs lint PoC (機械検査 chat-ref、精度 289/289) で、DR / research
内の裁定の出典が ccmsg の room / メッセージ番号 (`mid=NN` 等) で書かれている箇所が
181 件見つかった (`docs/research/` と `docs/decisions/` に集中)。room log は版管理外で、
ccmsg v1 の廃止時にまとめて消える予定 (kawaz 2026-09-19) なので、これらの参照は近く
dangling になる。

kawaz の方針: 必要な引用はポインタでなく引用の形にする (memory の
no-chat-refs-in-docs は「日付と要点だけ」)。

## 背景

提案: room log が存在するうちに、`mid=` 参照を機械的に解決して (ccmsg の read で
本文を取得) 該当行の直後に 1〜2 行の引用 + 日付を入れ、room 参照を落とすスクリプトを
作って一括適用する。

`docs/issue/` 内の参照は一時的なものとして対象外。採否と実施時期は当該リポの判断に
委ねる (フラグ止まり)。

検出結果は sandbox-jev の `experiments/09-docs-lint-round2/out/kuu/files/` にファイル
単位で残っている。

## 受け入れ条件

- [ ] 181 件の `mid=` 参照について、採否 (引用化する / しない) を判断する
- [ ] 採用する場合、該当行を引用 + 日付の形式に置き換える

## TODO

<!-- wip 時のみ -->
