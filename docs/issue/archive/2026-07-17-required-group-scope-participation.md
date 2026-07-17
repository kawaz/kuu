---
title: 未選択 scope の値述語 (required/required_group) が評価に参加し定義が使用不能になる — scope 参加規則と group label 集約範囲の未規定
status: resolved
category: design
created: 2026-07-17T18:09:56+09:00
last_read:
open_entered: 2026-07-17T18:09:56+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-17T19:52:58+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-103","implemented","done: SCB-Q1=a/Q2=a (kawaz 裁定 2026-07-17、原理「グローバルオプション以外、サブコマンドは完全に別コマンドと見るべき」) を DR-103 §5 明確化 note で確定 (spec cfc432ed)","done: kuu.mbt 2相修正 — engine 側 eval_all_constraints に scope_selected gate (5090933c、{} scope_marker 判定で「入場したが未発火」と「未入場」を区別)、resolve 相 apply_requires_filter_with_export にも同一 gate を共用適用 (cacf5a37 系→51bc5205 に含まれる)","done: fixtures/constraints-parse/required-group-scope-boundary.json 6 case pin (spec 7fc5c9be、root 常時選択・未選択 sibling 不参加・入場 scope 評価・独立充足の輪郭)","done: lockstep 完了 — kuu.mbt CI green 51bc5205 (280 decoded/686 ran/0 mismatch)、kuu-cli 588/588 baseline ratchet (bebf9021)"]
blocked_by:
origin: 自リポ TODO
---

# 未選択 scope の値述語 (required/required_group) が評価に参加し定義が使用不能になる — scope 参加規則と group label 集約範囲の未規定

## 概要

codex-review 残債の scope 境界 fixture (DR-103 §5) 作成中に worker が発見、統括が実機で切り分けた。**未入場 (未選択) の command scope に宣言された required / required_group が、その scope に入場しない経路でも評価され violation を出す**。この挙動だと sibling subcommand それぞれに required_group を持つ定義は「どの入力でも必ず violation」になり定義全体が使用不能 (reductio)。

## 背景

### 実測マトリクス (kuu-cli bdf914d5 の binary、kuu.mbt 0fe7d9cc 相当)

| 構成 | args | 実測 | 備考 |
|---|---|---|---|
| child-a{a1,a2: rg=g} + child-b{b1: rg=g} | `child-a --a1` | **failure** rg_violated element=g path=[child-a] | worker 発見の diverge。a1 発火済みなのに fail |
| 同、child-b 側を rg=h に改名 | `child-a --a1` | **failure** element=h path=[child-a] | 未入場 child-b の h が発火。path 帰属も child-a で不可解 |
| constraint は child-b のみ (child-a は素) | `child-a --a1` | **failure** element=h path=[child-a] | 混入の決定的証拠 |
| child-a 単独 (sibling なし) | `child-a --a1` | success | 単独なら正常 |
| exclusive_group 同構成 (2 sibling 同名 g) | `child-a --a1` | success | exclusive は committed 前提の指定述語なので未入場は vacuous 真 — 影響は値述語のみ |
| required 単項を child-a に、入場なし | `` (空) | **failure** required_violated | required 単項も同罪 |
| root{r1: rg=g} + child-a{a1: rg=g} | `--r1` | **failure** element=g | r1 発火済みでも未入場 child-a 側が fail |

### 実装側の構造 (kuu.mbt)

- `inst_constraint` (builtins/installer.mbt) は builder ごと = scope ごとに group を独立集約 (スコープ横断 merge はしていない)
- `eval_all_constraints` (engine/eval.mbt) は collect_scopes の**全 ScopedCons を無条件に評価** — scope の選択状態 (入場有無) を見ない
- exclusive_group / conflicts_with / requires は committed 前提条件を持つため未入場 scope では vacuous に真 → 顕在化するのは値述語 (required / required_group) のみ

### spec 側の空隙

- DR-103 §5 は「constraint installer が各要素の group ラベルを**スコープ横断で集約**し、グループごとに 1 つの遅延述語を宣言する — 集約範囲・スコープ境界の扱いは exclusive_group (DESIGN §9.2/§15.9) と同一の規定を流用」と言うが、**参照先の DESIGN §9.2/§15.9 に scope 境界の明示規定が存在しない** (§9.2 は 3 行の基本形のみ、§15.9 は遅延述語の層定義のみ)
- 「未選択 scope の遅延述語が評価に参加するか」はどの DR にも明文なし。DR-051 §3 (unselected scope = absent) と DR-047 §5 (selected は診断メタ) は隣接するが直接は答えない
- 実装の「スコープごと独立集約」と DR-103 §5 の「スコープ横断で集約」の文言も食い違っている

### 裁定待ち

SCB-Q1 (scope 参加規則) / SCB-Q2 (label 集約範囲) を docs/QUESTIONS.md に起票済み。裁定後に kuu.mbt 修正 + scope 境界 fixture (draft は統括 scratchpad に退避済み: scope-boundary-fixture-draft.json) を pin する。

## 受け入れ条件

- [x] SCB-Q1/Q2 の裁定が DR-103 (または DR-047) に明確化 note として反映される
- [x] kuu.mbt の eval/集約が裁定どおりに修正される
- [x] scope 境界 fixture (worker draft ベース + root×child 混在 case) が fixtures/constraints-parse/ に pin される
- [x] codex-review-dr102-dr103-postland の「scope 境界 fixture」項目がこの issue 経由で解消される

## 関連

- docs/issue/2026-07-14-codex-review-dr102-dr103-postland.md (fixture 輪郭補完リストの scope 境界項目)
- DR-103 §5 / DR-047 §2・§5 / DR-051 §3 / DESIGN §9.2・§15.9
