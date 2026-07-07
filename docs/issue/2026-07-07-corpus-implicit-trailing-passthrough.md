---
title: positional/サブコマンド以降の暗黙 raw pass-through (env/xargs/ssh/docker/ffmpeg の command 引数) が表現できない
status: open
category: design
created: 2026-07-07T23:18:30+09:00
last_read:
open_entered: 2026-07-07T23:18:30+09:00
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

# positional/サブコマンド以降の暗黙 raw pass-through (env/xargs/ssh/docker/ffmpeg の command 引数) が表現できない

## 概要

kuu の option 解析は「背骨上のどこでも順不同で発火しうる」設計だが、実世界の CLI には
**ある positional (utility / command / host / image 等) が一度確定したら、以降のトークン全てを
raw な引数列として扱い、自身の option 解析対象から外す**という慣習が広く存在する。

具体例 (いずれも「以降のコマンドの引数」に自身の `-x` 等の option 風トークンが来ても、
自コマンドの option として拾ってはいけない):

- `env [-i] NAME=VALUE... command [args...]` — `command` 以降
- `xargs [-0] [-n num] [-I replstr] [utility [args...]]` — `utility` 以降
- `ssh [-o key=value]... host [command...]` — リモート実行 `command` 以降
- `docker run [opts] image [cmd [args...]]` — コンテナ内 `cmd` 以降

kuu は dd (`--`、DR-064) によって「明示マーカー以降を severed 化する」表現は持つが、
上記はマーカートークンが存在せず **positional 自体の充足が暗黙のトリガになる**点で dd と異なり、
現行の宣言的文法 (option は背骨上のどこでも順不同発火) では表現できない。

## 背景

`corpus/real-cli/` の 5 ファイルが、実機定義を試みる過程でそれぞれ独立にこの同一ギャップへ
到達し、`why` フィールドに「issue 候補」として記録済み:

- `env.json`: 「= の有無で代入と command を動的に切り分け、境界以降を全て raw 化する
  ステートフルな字句解析」で、dd の固定マーカーと異なり内容依存境界
- `xargs.json`: 「utility 以降は xargs の option 解析対象外だが kuu は背骨上で option 風
  トークンを拾おうとする」
- `ssh.json`: 「`ssh host command args...` の command 以降は remote 実行コマンドで ssh の
  option 解析対象外だが、kuu では option 風トークンを拾おうとする」
- `docker.json`: 「`docker run image cmd args...` の image 以降はコンテナ内コマンドとして
  raw pass-through され docker 自身の option 解析対象外」「dd/sever の変種で、素直な
  variadic positional では表せない」
- `ffmpeg.json`: 上記と同種の骨格に加えて、オプションが「直前/直後のどのファイルに属すか」で
  意味が変わる **位置依存スコープ** (in-opts / out-opts、`-c` が `-i` の前か後かでデコーダ/
  エンコーダを指し分ける) という別軸の限界も持つ。この位置依存スコープ問題は本 issue とは
  別種の課題 (option の意味論そのものが位置で変わる) であり、スコープ外として切り分ける。

いずれも「該当 positional (utility/command/host/image) より後ろは option 風でないトークン
のみを暫定的に扱い、pass-through 境界自体は表現せず記録にとどめる」という同一の回避策で
定義を通している。

関連する既存 DR:

- **DR-064** (`dd-declaration-placement`) — dd (`--`) による明示マーカー severed 化。
  「効果が『値セルへの書き込み』でなく『severed 化』である特殊な flag」という骨格は近いが、
  トリガが**明示マーカートークン**である点が本件 (トリガが**positional の充足**) と異なる

## 受け入れ条件

- [ ] 「positional が充足した時点以降を raw pass-through にする」規則を宣言的文法でどう
      表現できるか検討する (dd の severed 化との関係整理: 明示マーカー vs 暗黙トリガ、
      新規修飾子の要否、または「kuu の設計スコープ外」と結論する選択も含む)
- [ ] 検討結果を DR として記録する
- [ ] 採用方針に応じて `corpus/real-cli/{env,xargs,ssh,docker}.json` の該当 why/case を更新し
      (表現可能になったケースを昇格するか、スコープ外なら現状の記録のまま据え置くか)、
      本 issue への forward-reference を解消する
- [ ] ffmpeg の位置依存スコープ (in-opts/out-opts) は本 issue のスコープ外と明記し、
      必要であれば別 issue として切り出す
