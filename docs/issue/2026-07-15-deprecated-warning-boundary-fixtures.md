---
title: deprecated warning の境界 fixture (混在・cardinality・失敗時・variant 波及) と未規定点の確定
status: open
category: design
created: 2026-07-15T15:54:16+09:00
last_read:
open_entered: 2026-07-15T15:54:16+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: codex レビュー #6 (2026-07-15) の Minor 指摘
---

# deprecated warning の境界 fixture (混在・cardinality・失敗時・variant 波及) と未規定点の確定

## 概要

codex レビュー #6 (2026-07-15) の Minor 指摘。`fixtures/alias-parse/{deprecated,long-deprecated}.json`
は「受理不変 + 警告 + 入口限定」の通常成功系 3 case を pin 済みだが、以下の境界が
未検証・一部未規定:

1. 同一 parse 内で deprecated alias と canonical/通常 alias を混在起動する case
   — deprecated 状態が canonical セルに貼り付いて後続入口へ漏れる誤実装を潰す
   「入口限定」の最直接検証 (fixture 追加のみ、規定は既存)
2. deprecated 入口の複数回起動 — warnings を起動回数分積むか要素単位で畳むか
   DR-058 が cardinality を未規定 (設計裁定が必要。DR-058 の明確化 note
   (2026-07-15) が本 issue を追跡先として参照済み)
3. 値不足・値不正で parse が失敗する場合に error outcome へ warnings を残すか
   — 「起動されたら積む」と「パース成功後の利用推奨警告」の境界が曖昧
   (設計裁定が必要)
4. variant DSL 込みの long 再導出 (DR-057 §3) で deprecated が alias 生成の
   全 variant に及ぶか — long:true 主入口 1 本の現 fixture では検証不能
   (規定は DR-057 §3 から導出可能と思われるが fixture 未 pin)

## 背景

`fixtures/alias-parse/deprecated.json` / `fixtures/alias-parse/long-deprecated.json`
は deprecated alias の「受理不変・警告発火・入口限定」を通常成功系で 3 case
固定済みだが、上記 4 観点は fixture / 規定のいずれかが欠けている。(2)(3) は
codex が「設計上未決」と指摘した箇所で、DR-058 の cardinality (起動回数分か
要素単位で畳むか) と失敗時の warnings 残置有無は既存規定から自明に導出できない。

## 受け入れ条件

- [ ] (2)(3) の設計裁定を `docs/QUESTIONS.md` 経由で確定し、DR-058 に note を
      追記する
- [ ] (1)-(4) の fixture を `fixtures/alias-parse/` に追加する
- [ ] ロックステップ (spec fixture push → pin bump → kuu.mbt push) で
      conformance green を確認する
