---
title: short オプションの per-option attach-only 制約 (space-form 拒否) が表現できない
status: open
category: idea
created: 2026-07-12T12:57:00+09:00
last_read:
open_entered: 2026-07-12T12:57:00+09:00
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

# short オプションの per-option attach-only 制約 (space-form 拒否) が表現できない

## 概要

gcc/clang 実機検証で、値持ち short オプションごとに「付着専用 (attach-only、
`-O2` のみ許可・`-O 2` は拒否)」か「付着 or 空白区切り両方可 (`-I x` /
`-Ix` 両方許可)」かが個別に決まっているケースを確認した。kuu の現行 spec
(DR-041 値スロット一般規則) は値持ち short 全てに空白区切り形の読みを一様に
許すため、この per-option 制約を表現する config ダイヤルが存在しない。

## 背景

corpus/real-cli/gcc.json 作成時の実機検証 (2026-07-12、macOS clang) で、
`-O 2` / `-W all` の空白区切り値供給が exit 1 で拒否される一方、
`-I /usr/include` / `-l m` は受理されることを確認した。DR-041 は installer
パラメータで方言を吸収する概念に言及するのみで、DESIGN.md に具体キーは
未定義。gcc.json では今回この差異を case 化せず top-level why に明記して
除外した (誤った期待値の固定を回避するため)。

裏取りは実機観測済みだが、採否判断は未裁定。要素単位 config override
(DR-049 §4) の既存枠に「space-form 許可/禁止」ダイヤルを足す形が候補では
ないか、という程度のフラグ起票。

関連: corpus/real-cli/gcc.json の why、DESIGN.md §7.2 config、
DR-041 §4/§5、DR-049 §4。

## 受け入れ条件

- [ ] per-option の space-form 許可/禁止をモデル化する必要性・要否を裁定
- [ ] 採用する場合、DESIGN.md §7.2 / DR-041 or 新規 DR に config キーを定義
- [ ] corpus/real-cli/gcc.json の除外 case を再検討・反映
