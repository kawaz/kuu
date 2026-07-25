---
title: fixture why に残る slice PoC 由来注記を一括処理する
status: open
category: docs
created: 2026-07-25T22:43:27+09:00
last_read:
open_entered: 2026-07-25T22:43:27+09:00
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

# fixture why に残る slice PoC 由来注記を一括処理する

## 概要

fixture の `why` に「slice PoC 第N弾」「蒸留元: slice phaseNN 第N弾」形式の由来注記が
65 ファイルに残っている (2026-07-25 実測)。これは参照実装プロトタイプの内部テスト番号を
指す語で、第三者実装には意味を成さない。

## 背景

commit 0d04469b の sanitize では `.mbt` 参照を含む 43 ファイルのみを対象にしたため、
`.mbt` を含まない 31 ファイルは手つかずで残っており、corpus 内で由来注記の扱いが不揃いに
なっている。

対処方針の候補:

1. 由来注記を落とす
2. spec 語彙 (DR 番号 / DESIGN 節番号) に置き換える

一部だけ処理すると不揃いが悪化するのでクラスごと一括で行うこと。

判断が要る点: 由来注記そのものに価値があるか — fixture がどこから来たかの追跡可能性
(jj log で辿れるなら不要) vs 第三者可読性。

関連: 同種の未確定語彙として KTop / Held / Pending がある。これらは読み状態の概念名で、
DESIGN / decisions に定義語として見つからず実装由来の可能性があるが、ファイル名・関数名
ではなく概念語として使われているため今回は未変更。正典化するか別語彙にするかの裁定が要る。

## 受け入れ条件

- [ ] 65 ファイルの由来注記の扱い方針 (削除 or spec 語彙置換) を決定する
- [ ] 決定した方針をクラス単位で一括適用する (部分適用による不揃いを残さない)
- [ ] KTop / Held / Pending の正典化 or 別語彙化の裁定を別途行う (本 issue のスコープ外なら
      別 issue に切り出す)

## TODO

- [ ] 65 ファイルの一覧を再取得し、由来注記のパターンを分類する
- [ ] 方針を裁定する (docs/QUESTIONS.md 等で提示)
- [ ] 一括置換 or 削除を適用する
