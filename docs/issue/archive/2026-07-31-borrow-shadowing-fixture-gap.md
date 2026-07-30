---
title: borrow 名前解決の遮蔽 (shadowing) 挙動が未 pin
status: resolved
category: task
created: 2026-07-31T00:29:08+09:00
last_read:
open_entered: 2026-07-31T00:29:08+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-31T01:11:14+09:00
discard_reason:
pending_reason:
close_reason: ["fixture/value-sources/default-fn-borrow-shadowing.json (commit 18424639)","kuu.mbt resolve_wbtest.mbt sibling shadowing unit test (commit 745b8f51, RED verified)","done: conformance decoded=389 mismatches=0 (統括 fresh 確認 2026-07-31)"]
blocked_by:
origin: 自リポ TODO
---

# borrow 名前解決の遮蔽 (shadowing) 挙動が未 pin

## 概要

`default_fn: "borrow:<source>"` の名前解決は lexical scope chain (DESIGN §2.7 / DR-125 §4) で「最近傍の宣言で止まる」= 自スコープに同名 entity が宣言されているが値を持たない場合、外側へ抜けず absent-source になる (遮蔽)。この遮蔽挙動を pin する fixture が corpus に無い。

## 背景

kuu.mbt 実装 (2026-07-31) は遮蔽で止まる読みを採用済み (統括承認済み)。しかし `command-scope`/`shadowing` 系の既存 fixture は borrow を含まず、この読みを固定する fixture が corpus に存在しない。

value-sources/ に以下の対 case を新設して固定するのが望ましい:

- 子スコープが borrow 先と同名の値なし entity を宣言 → absent-source で子要素 absent
- 同名 entity に値がある → そちらを引く (外側へ抜けない)

参考:
- `fixtures/value-sources/default-fn-borrow-ladder.json` (borrow の期待値導出根拠)
- DR-113 §5.4

## 受け入れ条件

- [ ] `fixtures/value-sources/` に遮蔽 (shadowing) 挙動を pin する対 case (値なし entity で absent-source / 値ありで自スコープ優先) を新設
- [ ] DESIGN §2.7 / DR-125 §4 の lexical scope chain 規定に紐づく期待値であることを fixture 内コメントで明示

## 追記 (2026-07-31)

- kuu.mbt 検査 (2026-07-31) が遮蔽判断を独立に支持: DESIGN §2.7 の解決は名前を宣言に束ねる規則なので、内側宣言が外側を遮蔽して absent-source に落ちるのが lexical scoping として正。DR-125 §5「同名祖先の暗黙探索は代替を持たない」とも整合。
- 追加 case 候補: DR-125 §4 の chain 3 段目「definitions にしか無い名前を borrow」も absent-source として同 fixture で固定すると良い (definitions の宣言は解決値を持たないため)。kuu.mbt 実装 (2026-07-31) は chain 2 段 (現在スコープ → 外側) で止まっており、3 段目を後から実装しようとする事故の防止になる。
- spec fixture 新設と同時に kuu.mbt 側 `resolve_wbtest` にも遮蔽 case の wbtest を 1 本足すこと。
