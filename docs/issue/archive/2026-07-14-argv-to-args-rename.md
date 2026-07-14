---
title: fixture 基底フィールド argv → args / argv_pos → args_pos の一斉改名 (kawaz 裁定 2026-07-14)
status: resolved
category: task
created: 2026-07-14T11:47:18+09:00
last_read: 2026-07-14T12:17:58+09:00
open_entered: 2026-07-14T11:47:18+09:00
wip_entered: 2026-07-14T12:16:02+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-14T12:52:33+09:00
discard_reason:
pending_reason:
close_reason: ["done:spec fixtures+corpus 208件一括 argv→args 改名、二重置換回避+JSON構文全数検証 (8cc0b946)","done:spec schema+CONFORMANCE 改名+$0非包含明記 (fb65c18d)","done:spec docs(DESIGN/PIPELINE/LOWERING/REFERENCE) 追随 (bb17b1ab)","done:spec fixture名 argv-minimal.json→args-minimal.json (ae847ea0)","done:kuu.mbt decode層+ParseError.args_pos+内部識別子/コメント 15ファイル148/148の1対1置換 (1d220a4e)","done:検証 歴史記録ディレクトリ以外に argv 残存ゼロ(内容+ファイル名両面)、conformance decoded=215/ran_cases=562/skipped=0/mismatches=0(改名前と同数、flipゼロ)、CI green(kuu.mbt@97c3a5f6 run29304366021)","done:lockstep push#2 spec main=6542f413 / kuu.mbt main=97c3a5f6"]
blocked_by:
origin: kawaz 裁定 (COMP-Q1d, 2026-07-14) — 自リポ TODO
---

# fixture 基底フィールド argv → args / argv_pos → args_pos の一斉改名 (kawaz 裁定 2026-07-14)

## 概要

fixture 基底フィールド `argv` を `args` に、連動する errors フィールド
`argv_pos` を `args_pos` に一斉改名する。対象は fixtures/ + corpus/real-cli/
の 200+ ファイル、schema/fixture.schema.json、docs/CONFORMANCE.md、kuu.mbt
の decode 層 (dec_fixture 等) + 関連 wbtest。DR 本文 (歴史記録) は改名しない。

## 背景

kawaz 裁定 (COMP-Q1d、2026-07-14): `args` は「引数のみ ($0 を含まない)」を
表す語として統一する。`argv` は言語間で $0 包含の読みが割れる曖昧語 (言語横断
調査 `docs/findings/2026-07-14-argv-vocabulary-survey.md` 参照) のため不採用。
「`app -- cmd args...`」の慣習通り、`args` がコマンド名を含むと読む余地はない。

補完 fixture 系統 (未着手) は最初から `args_before` / `args_after` /
`word_before` / `word_after` で書く (COMP-Q1b/Q1d 裁定)。

## 改名スコープ

1. 全 fixture の `argv` フィールド → `args` (fixtures/ + corpus/real-cli/ の
   200+ ファイル)
2. errors の `argv_pos` → `args_pos` (連動、args 配列内の 0-based 位置。
   `argv.length` 帰属の記述も `args.length` に)
3. fixture why 散文中の argv 言及
4. docs/CONFORMANCE.md §1/§2/§3 (フィールド表・argv_pos 規約。あわせて
   「args は $0 (プログラム名) を含まない」を §1 に明記)
5. schema/fixture.schema.json
6. kuu.mbt の decode 層 (dec_fixture 等の JSON キー読み) + 関連 wbtest

## 実行タイミング

現行の未 push 山 (DR-102 分割 + DR-103) のロックステップ push 後の独立
サイクルで着手する (push 窓を分けて bisect 可能性を保つ)。手順: spec 改名
→ kuu.mbt decode 追随 → ロックステップ push。

## 受け入れ条件

- [x] 現役文書・fixture・schema に `argv` の残存ゼロ (DR/journal/findings
      の歴史記録は除く)
- [x] conformance decoded・ran_cases 数維持、mismatches=0
- [x] docs/CONFORMANCE.md に「args は $0 (プログラム名) を含まない」の明記
