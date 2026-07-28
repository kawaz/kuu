---
title: 射影 (result/effects/sources) の検証断面に構造的な空白が残っている (P1/P2 の 8 テーマ)
status: open
category: task
created: 2026-07-26T14:12:36+09:00
last_read:
open_entered: 2026-07-26T14:12:36+09:00
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

# 射影 (result/effects/sources) の検証断面に構造的な空白が残っている (P1/P2 の 8 テーマ)

## 概要

2026-07-26 の sources 修正で「全テスト緑だが、危険な断面が corpus に存在しないだけ」という
状況が 3 回連続で発生した (交差 fixture 0 件 / ambiguous × command 0 件 / named seq × internal cell 0 件)。
個別に塞いでも次が出るため、射影に関わる構造次元の直積で空の組合せを機械的に洗い出した。

P0 (直近スコープで塞いだ 5 テーマ) は本 issue の対象外。残った P1 / P2 の 8 テーマを記録する。

## 背景

### 構造次元 (洗い出しに使った軸)

- 結果スコープの生成元: root / command / named seq / named or / repeat row / inheritable の祖先 write-target / global の祖先 cell
- 露出キーの解決: identity / renamed (`export_key:"x"`) / transparent (`export_key:null`) — scope label と cell 自身で別々に効く 2 軸
- セルの種類: leaf / accumulator (0回/1回/複数回発火) / internal (none, config_file, dd) / presence marker
- 値源: cli / link / env / config / inherit / tty / default
- 射影相: parse-only interpretation / resolve 済み success
- 観測面: effects / result / sources (内部セルは 3 面すべての不在が必要)
- cell op: set / default / unset / empty / remove / splice
- outcome: success / ambiguous が高危険 (failure / definition-error は success 射影を作らないので低優先)

## P1 (優先して塞ぐべき)

### 1. nested command accumulator × 0/1/複数発火 × scope rename

- corpus: accumulator × command の file 交差は 2 files / 7 source cases あるが、accumulator は全て root。command 子 scope 内 accumulator の sources は 0
- 危険: `accum_cells` の nested path / 0-fire の default 注入 / binding dedup の 3 分岐が同時に動く
- 最小: 1 file / 3 cases (0/1/2 fires、renamed command + renamed accum)

### 2. inheritable の祖先 write-target × export_key rename/null

- corpus: inheritable × sources は 5 files / 13 cases だが全て identity exposure。rename/null 交差は 0
- 危険: cell の宣言 scope と実際に値を占有する祖先 scope が異なる。通常 command の path map とは別の installer 分岐
- 最小: 1 file / 2〜3 cases (ancestor CLI → child inherit、child CLI override、rename)。transparent (null) は祖先結果から消える意味まで確認が要る
- 同 issue で global の鏡像を 1 case 足す (global × sources は identity 1 file / 2 cases のみ)

### 3. 多段 scope × 各 segment の rename/null

- corpus: 多段 identity path (`mid.ttl`) はあるが、各 segment の rename/null は 0
- 危険: `walk_export_path` が node を進めつつ segment を rename / drop する反復。1 段の test では「drop 後も child node へ進む」ことを完全には証明しない
- 最小: 1 file / 2 cases (outer rename + inner null、および逆配置)

### 4. named seq/or の accumulator × sources

- corpus: named seq × accumulator の result fixture は 3 files / 5 cases、named or も 3 files / 5 cases あるが、expect.sources 付きは 0
- 危険: wrapper scope path + accumulator fold + 0-fire default の合成。通常 leaf の named scope fixture では accum fallback を見ない
- 最小: 各構造 1 file、計 2 files (0-fire + multi-fire を 2 cases ずつ)

### 5. internal cell × repeat row

- corpus: none / config_file / dd × repeat row は 0
- 危険: internal address に index segment が必要になる
- 先に `docs/issue/2026-07-26-array-element-provenance-sources-addressing.md` の裁定が要る。それまで fixture を書かない (内部 `#k` を先に契約化しない)

## P2 (組合せ網羅寄り、低優先)

### 6. non-CLI source × renamed nested scope

- corpus の source 内訳: cli 73 / default 52 / config 22 / env 18 / inherit 5 / tty 3 / link 0。renamed sources は 5 files / 11 cases だが主に root、child scope rename で確認済みなのは cli のみ
- 危険度: 低 (射影自体は source 非依存。provider / resolve が source ごとに別 Binding 形を作る実装だけが壊れる)
- 最小: config または inherit × renamed child を 1 file / 1 case

### 7. global の canonical cell × export_key rename/null × effects/sources

- corpus: global × sources は 1 file / 2 cases、identity のみ
- 危険: 子 scope の入口から root canonical cell へ飛ぶため binding.scope と発火位置が異なる。effects は宣言名、result/sources は canonical の露出キーという 3 軸
- 最小: 1 file / 2 cases (root 発火、child コピー発火)

### 8. cell op (empty/remove/splice) × nested/renamed sources

- corpus: root identity では既存、nested/renamed 交差は 0
- 危険度: 低 (`result_sources` の特別分岐は `Unset` だけで、他の op は `binding.source` 素通し)
- 最小: 増やすなら 1 file で empty + unset の対照。remove/splice まで全積は不要

## 受け入れ条件

- [ ] P1 の 1〜4 が fixture で塞がれている (5 は array provenance の裁定後)
- [ ] P2 の 6〜8 について、塞ぐか「危険度が低いので塞がない」を明示的に判断した記録がある
- [ ] 同種の空白を再発させないための仕組みが検討されている (次元の直積を機械チェックする lint 等)

## 2026-07-28 洗い直し結果

DR-122 (shadow tree)・DR-123・child repeat fixture 群 land 後の再評価で 8 テーマの判定が確定。

### close 判定

- **テーマ 8** (cell op × nested/renamed): DR-122 §2.1 が sources 側の分岐を仕様から消したため「塞がない」判断で close
- **テーマ 6** (non-CLI source × renamed nested scope): 単独 file は作らず、テーマ 1〜3 の fixture に non-CLI source を 1 case 混ぜて副産物として埋める方針で close。前提の「link 0」は link-parse/basic.json と export-key-address.json の land で既に古い

### 残存テーマ、着手価値順

1. **テーマ 1** (nested command accumulator): 351 fixture 中 0 件で最優先。テーマ 3 残余 / 6 / 8 の empty op 1 case を同一定義に相乗り
2. **テーマ 7** (global × export_key): corpus に宣言 0 件。effect-order-global.json に export_key を足した姉妹 file が最短
3. **テーマ 5** (internal cell × repeat row): DR-122 でブロッカー消滅。none-exclusion-under-scopes の named seq case に repeat を足す形が最小
4. **テーマ 2** (inheritable): rename 側は導出可能で即 fixture 化可、null 側は QUESTIONS.md INH-Q1 として裁定待ちに起票済み
5. **テーマ 4** (named or × accumulator): 着手可、0 発火 default は DR-123 の後続 = task #82 マトリクスに合流

### 実施タイミング

fixture 作成は kuu.mbt Phase 2-5 完了後 (conformance が spec fixtures を live に読むため、走行中実装の gate を壊さない)。

### 注記 (旧統計失効)

issue 本文の旧 corpus 統計 (cli 73 等) は DR-121 フラット entry 前提で失効。現行は 80 file / 176 case が sources を持つ。

## 関連

- `docs/issue/2026-07-26-array-element-provenance-sources-addressing.md` (P1-5 の前提)
- `docs/CONFORMANCE.md` §2 success の sources / effects 規定
- DR-052 (結果キー軸) / DR-089 (type none) / DR-044 (uniform array) / DR-059 §5 (inheritable の write-target)
