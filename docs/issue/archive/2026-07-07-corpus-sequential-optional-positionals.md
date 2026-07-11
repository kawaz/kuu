---
title: 連続する optional positional が単一トークンで ambiguous になる表現ギャップ
status: resolved
category: design
created: 2026-07-07T23:01:52+09:00
last_read:
open_entered: 2026-07-07T23:01:52+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-11T10:06:10+09:00
discard_reason:
pending_reason:
close_reason: ["done: kawaz裁定(2026-07-11)により ambiguous 判定を仕様として維持、救済機構(fill属性等)は導入しない。型やvalues制約が異なれば既存の経路探索が自然に一意化する。corpus/real-cli/uniq.jsonのuniq fixtureはambiguousのpinのまま正。"]
blocked_by:
origin: 自リポ TODO
---

# 連続する optional positional が単一トークンで ambiguous になる表現ギャップ

## 概要

複数の optional positional が連続する定義 (例: `input` (optional) → `output`
(optional)) で、ファイル引数が **1 個だけ**渡された場合、kuu の素直な定義では
その 1 トークンが `input` 席にも `output` 席にも収まり、両経路とも全消費に
到達するため ambiguous と判定される。

しかし実機 (BSD/macOS `uniq [-cdiu] [-f num] [-s chars] [input] [output]`) は
「1 個目のファイル引数は必ず input」という **位置優先** で一意に解決する
(`uniq -c in.txt` は `in.txt` を読んで stdout に出力する、決して in.txt を
output として書き込む解釈にはならない)。この位置優先規則を kuu の文法で
どう表現するか (あるいは表現せず ambiguous のままにするか) が未解決。

## 背景

`corpus/real-cli/uniq.json` の `single-file-ambiguous` ケースが実機プローブ
として本件を先に固定しており、同ケースの `why` フィールドが本 issue ファイル
を forward-reference している (`issue: docs/issue/2026-07-07-corpus-sequential-optional-positionals.md`)。

関連する既存 DR:

- **DR-043** (`repeat-and-multiple-split`) — greedy 選好は同一 repeat 内の
  取り分にのみ働き、別要素 (今回のような `input` と `output` という別 positional)
  間の帰属には効かない
- **DR-021** (`longest-match-and-ambiguous`) — 「longest-match でも
  ambiguous になりうる」の一般論、§15.4 の複数完全経路 → ambiguous 判定の根拠
- **§15.4** (DESIGN.md) — 複数の完全消費経路が並立する場合の ambiguous 判定

`corpus/real-cli/uniq.json` の 3 ケース (`both-files-unambiguous` /
`no-files-stdin` / `single-file-ambiguous`) は、2 個埋まる場合と 0 個の場合は
一意に解決できることを既に固定している。曖昧になるのは「1 個だけ埋まる」
中間ケースのみ。

## 受け入れ条件

- [ ] 連続する optional positional に「先頭優先で埋める」割当規則を kuu の
      文法・意味論でどう表現できるか (または表現しない選択も含め) 検討する
- [ ] 検討結果 (新規修飾子を導入する / 既定セマンティクスを変更する /
      ambiguous のまま許容する、のいずれか) を DR として記録する
- [ ] 採用した方針に合わせて `corpus/real-cli/uniq.json` の
      `single-file-ambiguous` ケースを更新する (方針が ambiguous 許容のまま
      なら現状維持、位置優先を採用するなら `outcome: success` に変える)
