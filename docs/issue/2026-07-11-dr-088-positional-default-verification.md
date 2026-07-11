---
title: DR-088 を実装完了する: kuu.mbt の positional 充足経路 (default 供給) を検証する
status: open
category: task
created: 2026-07-11T10:06:56+09:00
last_read: 2026-07-11T10:20:58+09:00
open_entered: 2026-07-11T10:06:56+09:00
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

# DR-088 を実装完了する: kuu.mbt の positional 充足経路 (default 供給) を検証する

## 概要

corpus-optional-scalar-positional issue (close: 2026-07-11) の裁定で、「optional +
scalar + default」パターンは DR-088
(docs/decisions/DR-088-declared-source-is-default-presence.md) から素直に導出できる
(= 素の positional + default 宣言 `{name, type, default}` で「席が空でも default 供給で
経路完全 → 遅延解決で実体化」) と判明した。この裁定が kuu.mbt 実装に反映済みかどうかは
未確認のため、実装側の検証・補完を行う。

## 背景

- DR-088 は「宣言された source は default 有無で presence が決まる」という規定
- corpus-optional-scalar-positional issue の close 時、上記パターンの表現ギャップは
  DR-088 の導出で解決済みと裁定されたが、kuu.mbt 側の実装が DR-088 の規定通りに
  この経路を静的に判定しているかは別途確認が必要
- 実装漏れがあれば DR は「紙の上の裁定」で終わり、fixture/corpus でも検証できない

## 受け入れ条件

- [ ] kuu.mbt の positional 充足判定 (経路探索の値充足述語) が DR-088 の規定通り
      「committed ∨ 宣言あり (= default 込み)」で静的判定されていることを確認する
- [ ] 「省略可能な scalar positional + default」パターンの corpus/real-cli fixture
      (または相当のテスト) を用意し、経路が一意に解決されることを検証する
- [ ] 実装漏れがあれば修正し、既存 corpus/fixture 一式が green のままであることを確認する

## TODO

<!-- wip 時のみ -->
