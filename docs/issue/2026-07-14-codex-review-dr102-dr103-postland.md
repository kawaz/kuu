---
title: codex レビュー指摘の対応 — DR-102/103 post-land (実バグ1 + spec精密化 + fixture輪郭補完)
status: open
category: bug
created: 2026-07-14T12:22:20+09:00
last_read: 2026-07-14T12:49:32+09:00
open_entered: 2026-07-14T12:22:20+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (DR-102/103 post-land codex レビュー対応)
---

# codex レビュー指摘の対応 — DR-102/103 post-land (実バグ1 + spec精密化 + fixture輪郭補完)

## 概要

DR-102 (属性分割) / DR-103 (required_group) の land 直後に codex (gpt-5.6-sol) へ
全方位レビューを依頼した結果の指摘対応。実バグ 1 件 (最優先)、DR 明確化 note 2 本、
エラー合成規則の未定義 2 件、設計分岐 1 件 (要裁定)、fixture 輪郭補完の残りを含む。

## 背景

- 出所: DR-102 (属性分割) / DR-103 (required_group) の land 直後の codex (gpt-5.6-sol)
  全方位レビュー (2026-07-14)
- 統括 (メインセッション) が主要指摘を検証済み — 検証状態を各項目に明記
- レビュー全文: セッション scratchpad の cycle-review-codex.md (findings 記録は別途)

### 指摘詳細 (M-番号 = codex レビューの指摘番号)

**[確定バグ、最優先] M-2: required_group member の候補セル解決が required 単項と不一致**

member が structural or (型付き枝) の場合、値供給時にも「no satisfied member」で
誤 violation (統括の live probe で確定: `--level 5` 供給、num 枝発火・値確定でも
`required_group_violated`)。required 単項では同型バグが修正済み (CRequired の
candidates 機構、`fixtures/constraints-parse/required-structural-or-branch.json`)
だが CRequiredGroup は member 名 (`e.name`) しか見ていない。
修正方針: CRequired と同じ候補セル解決を共有 + fixture (or member / ref member)。

**[確定、DR-103 明確化 note ×2 (DR-047 §5 の追記前例形式)]**

- M-1: §3 の exactly-one は member 構成の限定が必要 — exclusive は committed 述語 /
  required_group は値述語で数える対象が異なり、flag や default 持ち member が
  混ざると 0 トリガでも両制約が成立する。「発火時のみ値を持つ member 群 (plain
  bool 等) に限り exactly-one committed が成立」と限定する必要
- M-4: §4「観測上同じ」は誤り — 充足真偽は同値だが error の element (group
  ラベル) / reason (`required_group_violated`) は group 固有

**[設計分岐 → CR-Q1、QUESTIONS.md 参照] C-1: accum_filters の reject 規定と ARRAY registry の実態の乖離**

DR-102 §4 と CONFORMANCE は accum 側 reject の `argv_pos` 帰属を規定するが、
ArrayFilterDescriptor は「拒否を持たない純関数」(Result 経路なし) で reject を
発生させられない (旧 cell_filters 時代から継承した規定と実態のずれ)。

**[報告ベース確認済み、要修正] M-5/M-6: エラー合成規則の未定義**

- M-5: regex compile 検査が accum_filters (ARRAY registry は regex_match を
  所有しない) にも走り「自 registry のみ参照」の DR-102 §2 と矛盾
- M-6: wrong-seat 属性 × 未登録綴りで invalid-range + unknown-vocab の二重報告
  (definition_error は完全一致集合なので wire 契約になる)
- 方向: 構造 gate 先行、wrong-seat 属性の中身は解釈しない (invalid-range のみ)、
  registry 所有時のみ factory 固有検査。DR-102 明確化 note + fixture
  (wrong-seat×unknown の完全一致集合、accum_filters×scalar-only 綴りの逆方向
  unknown-vocab) + 実装修正

**[妥当、要 fixture] M-8: DR-102 §5 (scalar default の型依存 pipeline) の fixture ゼロ**

string default の全段通過 / native default の skip / string default parse
failure / default 由来 final_filters reject の args 位置。実装が §5 通りかも
未検証。

**[妥当、要裁定または導出] M-9: type:"none" × final_filters が未定義**

統括の導出案: DR-089 §4 (none への値源宣言 = definition-error) と同型で
invalid-range。fixture 化。

**[妥当] M-3: constraint 系属性 (exclusive_group/conflicts_with/required_group) の decode が option 限定で positional を受けない**

spec は「要素属性」。導出方向: family 一括で positional 対応 + fixture。

**[妥当、軽微]**

- M-7: DR-102 の「value_filters は piece 実位置」は CLI 由来に限る過剰一般化
  (env/config/default 由来は args.length — CONFORMANCE と整合、挙動は正しい。
  DR 明確化のみ)
- M-10 + m-4: kuu.mbt のコメント修正 (pipeline 順序の誤記、存在しない fixture
  名参照)
- m-1: fixture why の「multiple 専用」語彙を accum/non-accum に統一

### fixture 輪郭補完リスト

- accum_filters × collector の適用順 pin (実装は accum_filters 先行だが
  resolve.mbt コメントは「open」のまま — observable なので固定必須)
- required_group の名前空間独立を非対称 membership で実証 (required_group
  `g:[a,b]` × exclusive_group `g:[a,c]`)
- 値空間なし (none) member の committed 判定
- scope 境界 (parent/command/global)
- 複数 group 同時違反の全列挙
- repeat-only + accum_filters 成功側

### 実行順の提案

M-2 バグ修正 (fixture 先行) → DR 明確化 note 群 → エラー合成 (M-5/6) →
fixture 輪郭バッチ → M-3/M-9。args 改名サイクル (走行中) の完了後に着手。

## 受け入れ条件

- [ ] M-2 の live probe が success (required_group member の structural or 枝で
      値供給時に誤 violation が出ない)
- [ ] DR-103 明確化 note 2 本 (M-1 exactly-one の member 限定、M-4 group 固有の
      error element/reason) が反映済み
- [ ] C-1 (accum_filters の reject 規定と ARRAY registry 実態の乖離) が
      CR-Q1 裁定を経て解消
- [ ] M-5/M-6 のエラー合成規則が DR-102 明確化 note + fixture + 実装修正で解消
- [ ] M-8 (scalar default 型依存 pipeline) の fixture が揃い green
- [ ] M-9 (type:"none" × final_filters) が裁定または導出で fixture 化
- [ ] M-3 (constraint 系属性の positional 対応) が family 一括で fixture 化
- [ ] fixture 輪郭補完リストの各項目が fixture 化済み
- [ ] conformance mismatches = 0

## TODO

- [ ] args 改名サイクル (走行中) の完了を待つ
- [ ] M-2 の fixture (or member / ref member) を先に用意してから修正着手
- [ ] CR-Q1 (C-1 の設計分岐) を QUESTIONS.md に起票して裁定を待つ
