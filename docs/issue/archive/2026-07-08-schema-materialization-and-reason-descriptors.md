---
title: Schema 実体化 + reason descriptor 全列挙 (DR-068 lifecycle 管掌)
status: resolved
category: task
created: 2026-07-08T21:53:42+09:00
last_read:
open_entered: 2026-07-08T21:53:42+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-12T01:34:22+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-094","dr/DR-095","implemented","done:Schema実体化 (schema/descriptor.schema.json, schema/fixture.schema.json, schema/builtin-descriptors.json 新規, schema/wire.schema.json 更新, fixtures 188件実機バリデート, commit fe81b50c系)","issue/2026-07-12-kuu-prefix-factory-rename","issue/2026-07-12-conformance-effect-op-vocab-drift","issue/2026-07-12-wire-schema-missing-env-array-multiple-bool","issue/kuu.mbt/2026-07-12-filter-reason-granularity-dr095","deferred:datetime parser reasons (字句仕様未確定, DR-095射程外)"]
blocked_by:
origin: 自リポ TODO
---

# Schema 実体化 + reason descriptor 全列挙 (DR-068 lifecycle 管掌)

## 概要

フェーズ 3 で行う Schema 実体化に紐づく横断タスクの集約。台帳 issue 3 本 (phase1-serialization-design-agenda / phase23-distill-ledger / distill-spec-gaps) の close 時に残項目として切り出した。

## 背景

2026-07-08 台帳 issue 監査 (fixture-batch worker の読み取り監査レポート) にて、3 台帳に横断していた Schema 実体化系の残項目を発見。一本化して管理する。

## 受け入れ条件

- [ ] schema/*.json ドラフトの書き出し: DR-067 §構文層が正本、機械的写像。確定版発行条件は DR-068 lifecycle (フェーズ 3 の fixture green と同期)
- [ ] canonical factory / 組み込み filter の emit しうる reason 全列挙を descriptor `reasons` 宣言へ実体化 (DR-066 §2、同 §射程外で「Schema 実体化と同時」と規定)
- [ ] bool value_parser 失敗 reason の descriptor 宣言 (旧 distill-spec-gaps #5 の派生。not_a_bool は DR-066 §3 v1 語彙に追加済み、宣言側の実体化が残り)

## 裁定待ち論点 (SCH バッチ、2026-07-11 提示)

SCH-Q1. Schema 実体化のスコープ (現状 schema/wire.schema.json 1 本のみ、DR-067 §射程外は複数形 schema/*.json を想定):
- a) wire のみ: 最小コストだが descriptor/reason の機械可読正本が無く DR-061 §2 の「所有集合の和で wire 語彙を機械判定」が基盤を持たない
- b) wire + descriptor + fixture の 3 本 【推奨】: 機械判定基盤が spec と同期、実装間で descriptor 直列化形を共有。難点: factory config 部は任意 JSON で Schema 単体では閉じない
- c) wire + descriptor のみ: fixture 起票時の機械検査 (why 欠落/id 重複) を各実装 runner が自前で持つ非対称

SCH-Q2. descriptor の reasons 宣言の正本位置 (DESIGN §13.1 は宣言軸と明記、kuu.mbt filters.mbt L31-37 は「参照実装に宣言リスト不要」と opt-out 中):
- a) spec 側正本 (schema/builtin-descriptors.json 等) 【推奨】: 完備チェック/typo 検出が全実装共通の正本を持つ。kuu.mbt の opt-out は「emit 集合 ⊂ spec 宣言集合で準拠、内部構造は自由」と再整理すれば整合
- b) 各実装が自前 (spec は語彙表のみ): 完備チェックの実装間 portability が失われる
- c) hybrid (reason 全集合のみ spec 正本): owns/observes/config は宣言軸なのに reasons だけ実装自由になる非対称

SCH-Q3. filter 系 reason の粒度 (現状 DR-066 §3 v1 表に filter 系は無く、impl は全 filter Err を filter_rejected 1 個に潰す):
- a) v1 表に filter 系も closed set 統合: filter は open set なので追加のたび v1 表改訂
- b) 組み込み filter だけ descriptor 単位で列挙、v1 表は総覧のまま 【推奨】 (例: in_range → too_small/too_large、regex_match → pattern_no_match/pattern_compile_failed、non_empty → empty_value)
- c) filter_rejected 潰しを spec で追認: typo 検出/L10n が filter 領域で死ぬ

SCH-Q4. kuu.mbt の filter_rejected 潰しの扱い (Q3-a/b なら現状不準拠):
- a) impl を spec に追従 (FilterDescriptor に reasons 追加、Err arm を (reason, message) 化する破壊変更) 【推奨】: ドラフト期 (DR-068 §3) なので仕様上の障害なし
- b) spec 側を「宣言まで、emit は subset で可」に緩める: 実装依存の緩さが仕様に固定され spec-as-core に反する
- c) impl 現状維持で理想集合だけ書く: fixture green 発行条件と衝突したまま v1 到達

SCH-Q5. bool parser の reason 宣言 — Q2 に従属。Q2-a なら a) kuu_bool_parser descriptor に reasons: ["not_a_bool"] が自明 【推奨】

SCH-Q6. 実施タイミング:
- a) fixture green 前に先行実体化 (今) 【推奨】: DR-061 §射程外「フェーズ 1 で実体化」の意図どおり、fixture 蒸留中に完備チェックが働く
- b) v1.0.0 発行と同期: fixture の穴が green まで発見されない

出所: DR-066 §1-3/§射程外、DR-067 §射程外 (L44-47)、DR-068 §1/§3/§射程外、DR-061 §1-4/§射程外、schema/wire.schema.json、CONFORMANCE.md §2、DESIGN.md §13.1 (L864)、kuu.mbt src/core/filters.mbt L30-45/L143-145/L314-330。
