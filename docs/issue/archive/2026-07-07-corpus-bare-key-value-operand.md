---
title: bare key=value operand 形式 (dd if=/of=, env VAR=val) の第一級表現手段が無い
status: resolved
category: design
created: 2026-07-07T23:20:09+09:00
last_read:
open_entered: 2026-07-07T23:20:09+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-11T10:17:01+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-091"]
blocked_by:
origin: 自リポ TODO
---

# bare key=value operand 形式 (dd if=/of=, env VAR=val) の第一級表現手段が無い

## 概要

`dd if=/dev/zero of=/dev/null bs=1m count=10` や `env FOO=bar echo hi` のように、
**prefix (`-`/`--`) を持たない裸の `key=value` トークンを operand として並べる文法**
(getopt 系ではなく BSD dd / env / make に見られる形式) を、kuu の宣言的文法で
第一級表現する手段が無い。`corpus/real-cli/dd.json` と `corpus/real-cli/env.json` が
それぞれ独立の回避策で近似しているが、どちらも `why` フィールドに「issue 候補」と
明記済みの未確定事項。

## 背景

`corpus/real-cli/dd.json` (`why` より):

- `config.long_prefix` を空文字 `""` にし `allow_equal_separator: true` を組み合わせて、
  「空 prefix long option の eq-split matcher」を `if=`/`of=`/`bs=`/`count=` の
  bare key=value operand に流用する回避策で定義を通している
- この流用が **spec 上正しく動作するか自体が未確定** (`why`: 「この手法が spec 上
  正しく動くかは未確定 (実装で要検証)」)。long option の eq-split 機構を prefix なしで
  使うのは元の意味論 (`--name=value` の prefix 部分の役割) を転用しているだけで、
  「bare key=value operand」という文法要素として設計された経路ではない

`corpus/real-cli/env.json` (`why` より):

- `env FOO=bar echo hi` は「= の有無で代入と command を動的に切り分け、境界以降を
  全て raw 化する」ステートフルな字句解析が必要だが、kuu の宣言的 positional 宣言
  (静的な席) では表現できないと判定
- 回避策として `-i` flag + 全 operand を raw string の可変長 positional (`rest`) で
  受け、代入 (`FOO=bar`) と command (`echo`) と arg (`hi`) の区別をせずアプリ層の
  関心として先送りしている (= `key=value` であることすら kuu 側で解釈していない)

両ファイルは **異なる回避策** (dd = long-option eq-split の転用、env = 生 string
収集で解釈を放棄) で同じ「bare key=value operand」という文法要素の欠落を埋めている。
これは同一のギャップに対する 2 通りの場当たり対応であり、収斂していない。

## 受け入れ条件

- [ ] 「prefix なし `key=value` トークンを解析し、`key` 部分でオプション定義に
      マッチさせ `value` 部分を値として bind する」ための第一級の宣言的手段 (新規
      option 種別 / 既存 matcher の拡張 / 明示的にスコープ外と判断、のいずれか) を検討する
- [ ] dd の `long_prefix: ""` + `allow_equal_separator` 流用が spec 上の保証された
      挙動か、たまたま動く未定義動作かを確認する
- [ ] 検討結果を DR として記録する
- [ ] 採用方針に応じて `corpus/real-cli/dd.json` / `corpus/real-cli/env.json` を
      更新し (表現可能になった部分を昇格するか、現状の回避策を「意図的な近似」として
      確定記録するか)、本 issue への forward-reference を解消する
