---
title: op=default の sources タグ — DR-031 明文 (cli) と fixture 実践 (default) の矛盾
status: resolved
category: design
created: 2026-07-10T04:45:37+09:00
last_read:
open_entered: 2026-07-10T04:45:37+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-10T11:13:11+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-081","implemented","fixtures/value-sources/default-source-model.json","fixtures/value-sources/unset-ladder.json","fixtures/multiple-parse/default-cell-ops.json","done:conformance decoded=158 ran_cases=403 skipped=0 mismatches=0","doc-pending:CONFORMANCE.md sources 実文追記は今後の doc 整備で (DR-081 波及節に記載済み)"]
blocked_by:
origin: 自リポ TODO
---

# op=default の sources タグ — DR-031 明文 (cli) と fixture 実践 (default) の矛盾

## 概要

`sources` フィールドにおける effect op=default 適用後のタグについて、正本 DR と fixture 実践が矛盾している (accum-fold-update-default-ops サイクルの codex レビュー 2026-07-10 で検出。矛盾自体はそれ以前の scalar fixture 作成時から存在)。

- **DR-031 の明文**: 「effect op=default (committed=true) 適用後は `cli` — 値の内容が default 値と同じでも、その値を確定させたのはユーザの明示操作」(source = 最終値を確定させた効果/充填の由来、という定義に基づく)
- **fixture 実践**: fixtures/value-sources/unset-ladder.json の default-commits-locked (scalar、先行) と fixtures/multiple-parse/default-cell-ops.json (accum、2026-07-10 追加) はどちらも sources=**default** を pin。why は「commit 機構は cli 発火だが final 値の source は値の出所 = default」という「値の由来席」読みを採っている
- kuu.mbt 実装も fixture に合わせ default を報告 (conformance green)

## 論点

どちらの読みを正とするか:

1. **DR-031 明文 (cli)**: source = 「誰が確定させたか」。ユーザ操作による確定は cli。この場合 fixture 2 本 + kuu.mbt 実装の修正が必要
2. **由来席 (default)**: source = 「値がどの席から来たか」。committed 軸 (確定性) とは直交する別軸として source を純粋な出所情報に保つ — DR-031 自身の「committed/selected との直交性」節 (DR-016 維持) とはこちらの方が整合的とも読める。この場合 DR-031 の当該行の改訂が必要

どちらも一貫した設計として成立するため kawaz 裁定が必要。裁定までは fixture 実践 (default) が実効的な現状仕様として動いている (scalar/accum で一貫)。

## 受け入れ条件

- [ ] kawaz 裁定 (1 か 2 か)
- [ ] 裁定 1 なら: fixture 2 本の sources 修正 + kuu.mbt の source タグ修正。裁定 2 なら: DR-031 当該行の改訂 (Superseded 注記または本文修正の流儀は DR 運用に従う)
- [ ] CONFORMANCE の sources フィールド説明に確定した読みを明記

## 関連

- DR-031 (値源ラダーと source 定義) / DR-045 (default op = committed=true) / DR-016 (メタデータ分離)
- fixtures/value-sources/unset-ladder.json (default-commits-locked) / fixtures/multiple-parse/default-cell-ops.json
- codex レビュー指摘 (2026-07-10、accum-fold サイクル)
