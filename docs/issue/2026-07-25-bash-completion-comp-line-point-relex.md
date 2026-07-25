---
title: bash 補完 glue の words 再結合を COMP_LINE/COMP_POINT ベースの再字句解析へ
status: open
category: design
created: 2026-07-25T14:18:08+09:00
last_read:
open_entered: 2026-07-25T14:18:08+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (H9 bash glue 実装時の残存ギャップ)
---

# bash 補完 glue の words 再結合を COMP_LINE/COMP_POINT ベースの再字句解析へ

## 概要

H9 (spec commit 4161961e) で COMP_WORDBREAKS 分割の再結合を
`templates/completion.bash` に実装したが、COMP_WORDS ベースのため空白情報が
失われる残存ギャップがある。

ユーザが `myapp foo : bar` と空白付きで打った場合も `myapp foo:bar` と
打った場合も COMP_WORDS は同一 `[myapp, foo, :, bar]` になり
(実測: `COMP_WORDBREAKS = " \t\n\"'@><=;|&(:"`)、再結合は両方を `foo:bar`
へ畳む。後者では DR-117 §3.4 の words 契約 (shell が見ている行の全量トークン
列) から乖離する。

影響は補完面のみ (parse には影響しない)。対象は `: = ; @ < > | & (` を
単独引数として空白区切りで渡す CLI の補完時。

## 背景

忠実な解は COMP_LINE + COMP_POINT からの再字句解析 (bash-completion の
`_get_comp_words_by_ref` より踏み込んだ形)。今回 H9 で採らなかった理由は
補完が best-effort な UX 面であり当該ケースが稀なため。

実機検証ハーネスは H9 worker が残した `reassemble_test.sh` /
`e2e_test.sh` / `mock_binary.sh` が参考になる (bash 5.3.9 / 3.2.57 の
両版で回る形)。

## 受け入れ条件

- [ ] COMP_LINE/COMP_POINT ベースの再字句解析方式を設計するか、現状維持
      (COMP_WORDS ベースで空白情報欠落を許容) を明示的に選ぶか裁定
- [ ] 採用する場合、`myapp foo : bar` と `myapp foo:bar` を区別する
      re-lex 実装を `templates/completion.bash` に追加
- [ ] 既存の `reassemble_test.sh` / `e2e_test.sh` / `mock_binary.sh` を
      拡張して両ケースを回帰させる (bash 5.3.9 / 3.2.57 の両方)

## TODO

<!-- wip 時のみ -->
