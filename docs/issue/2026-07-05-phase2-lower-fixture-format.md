---
title: フェーズ2-② lowering conformance (query:"lower" fixture フォーマット) 設計叩き台
status: open
category: design
created: 2026-07-05T14:00:33+09:00
last_read:
open_entered: 2026-07-05T14:00:33+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (ROADMAP.md フェーズ2-②、docs/journal/2026-07-05-phase2-fixture-runner-first-run.md の「次」)
---

# フェーズ2-② lowering conformance (query:"lower" fixture フォーマット) 設計叩き台

## 概要

ROADMAP フェーズ2-②「lowering conformance の確定」の論点整理。`query: "lower"` fixture フォーマット (installer 単体/組合せ/全収束形の golden 断面) と、順列一致 property test の扱いを固めるための議論用ドキュメント。まだ何も決定しない。

## 背景

- フェーズ2-① (docs/journal/2026-07-05-phase2-fixture-runner-first-run.md) で `query: "parse"` fixture の最小 runner が slice PoC 上で稼働し、8/8 fixture の正しさとエンジン側の乖離 2 件を検出済み。次段が本フェーズ (2-②)。
- docs/CONFORMANCE.md は `query: "lower"` を「フォーマット未確定、後続で定義」の予約タグとして残している (§1)。ディレクトリ規約も `fixtures/lowering/<installer>/` まで予約済み (§4)。
- DR-063 が lowered 断面の表記を確定済み (§3): scope 断面は面構造 `{greedy, positionals, entities}`、matcher は `{matcher: kind, entries}`。比較は常に緩比較 (LOWERING §C.5: 構造骨格 + matcher 種別/エントリ表の一致、byte 厳密でも wire 厳密でもない)。
- LOWERING.md §C.5 は比較戦略を二段(効果列 oracle / lowered 中間形の緩比較)+ 順列一致 property の3本立てで定義しているが、後者2本 (lowered 断面比較・順列一致) の fixture 表現は「conformance の実働化」で確定するとして本フェーズに委ねられている。
- 蒸留元は slice PoC の既存 phase テスト群 (canon_scope 比較を行っているもの)。167 テストのうち lowering 断面を直接検証している部分が本フェーズの実測背骨になる。

## 論点ツリー

### 1. lower fixture の構造

`query: "parse"` の構造 (`why` + `query` + `definition` + `cases[]`) を土台に、lowering 版でどう拡張するか。

- 大枠の候補: `{why, query: "lower", definition (wire form, DR-063), installers: [...], cases: [{why, expect: <断面>}]}` — parse fixture が `cases[].argv` を持つのに対し、lower fixture は argv を持たず「この definition + この installer 適用範囲でどう lowering されるか」だけを問う。argv 相当の入力軸は「どの installer を適用するか」の指定
- **installers 指定の語彙**: 部分適用 (installer 単体/組合せ) と全収束形 (全 installer 適用済み) を同じ fixture 構造内でどう書き分けるか
  - 候補 (a): `installers: ["long", "short"]` のような列挙 — 単体/組合せに素直、だが「全部」を書くとき installer registry の全名を列挙する必要があり、registry に新 installer が増えるたびに fixture 側の更新が要る (open set 問題)
  - 候補 (b): `installers: "all"` の予約語 — 全収束形を簡潔に書けるが、「全部」の意味が registry の現在の中身に依存する (registry が拡張されると同じ fixture が異なる断面を期待し始める可能性)
  - 候補 (c): 部分適用と全収束形を別 query 値または別ディレクトリで分離 (例: `fixtures/lowering/<installer>/` は単体、`fixtures/lowering/_all/` 相当は全収束) — CONFORMANCE §4 の既存ディレクトリ規約 (`fixtures/lowering/<installer>/`) は単体を前提にしているように読めるので、組合せ/全収束をどこに置くか自体が未決
  - 判断が必要: installer 適用の「不動点反復 (LOWERING §C.2) が全部止まった後」を指すのか、途中段階 (特定 installer だけ適用) を指すのか、両方を fixture で表現する必要があるのか

### 2. expect 断面の表記とゆるい比較の実装

DR-063 §3 が断面の**語彙**を確定済み (面構造 + matcher 表記)。本フェーズの宿題は LOWERING §C.5 が指す「緩比較」を runner としてどう実装するかという**手続き**の確定。

- 面構造 `{greedy: [...], positionals: [...], entities: {...}}` の緩比較で無視してよいフィールド・順序をどう明文化するか
  - `entities` は名前付き map なので順序非規範は自明 (DR-063 §4)。`greedy` / `positionals` は配列 — 配列内の**順序が規範かどうか**が未確定 (installer の適用順は非意味 = LOWERING §C.2 だが、それが「greedy 配列内の要素順まで無視してよい」ことを含意するかは別問題。特に `command` installer のような「新しい背骨を作る」ケースで順序が意味を持つ可能性がある)
  - `matcher` の entries 比較は「種別 (eq_split / short_combine / 素の exact 等) の一致 + エントリ表の一致」(LOWERING §C.5) — エントリ表は `{"<トリガ>": "<実体 name/id>"}` の map なので構造等価で済むが、内部 id (DR-046 §4、`file#geq1` のような予約命名空間) が entries の値に登場するケースの緩比較規則は個別に要検討 (DR-063 §3 の「綴り差は緩比較が吸収する」が具体的にどこまで吸収するか)
  - 骨格の正規化規則 (= どのフィールドを無視し、どのフィールドは厳密比較するか) を CONFORMANCE.md に明文化する必要がある。parse fixture の §3 (構造等価 + effects は配列順込み完全一致) に相当する条項が lower fixture にはまだない

### 3. 順列一致 property の fixture 表現

LOWERING §C.5 の第3の戦略「同じ効果集合を与える argv 順列は同じ結果へ収束する」性質は、**個別事例 fixture とは形が違う** (property test であって golden 断面ではない)。

- 選択肢 (a): lower fixture の一部として組み込む (例: `property: "permutation-invariant"` のような宣言フィールドを持たせ、runner が argv の順列を生成して効果列 oracle で比較する)
- 選択肢 (b): runner の組み込み検査として扱い、fixture 側には何も書かない (= 全 parse fixture に対して runner が自動で順列生成 + 効果列比較を行う、あるいは特定領域だけ opt-in する仕組みを runner 設定で持つ)
- どちらも「効果列 oracle だけで検証できる」(LOWERING §C.5) という性質自体は決定済みなので、迷うのは**表現場所**のみ。fixture に property 宣言を持たせると query 語彙が増える (`query: "lower"` でも `query: "parse"` でもない第3の性質を表現することになる) 一方、runner 組み込みにすると「どの fixture に対して順列検査を回すか」の適用範囲判断が runner 側のロジックに寄る

### 4. golden 断面の粒度

CONFORMANCE §4 は `fixtures/lowering/<installer>/` というディレクトリ規約を既に予約しているが、粒度の内訳は未確定。

- A 群 (LOWERING §A、純構文正規化) のみの断面 — 裸文字列 → exact 等、installer 適用前の純粋展開
- 単独 installer 断面 (LOWERING §B.1〜B.9 の各 installer 相当): long / short / dd / env / command / global / inherit / repeat / multiple / constraint (制約は installer でなく評価器契約寄りかもしれないが LOWERING の並びに合わせて要確認) / alias / inheritable (LOWERING に節がなければ該当 installer の存在自体を要確認)
- 代表的な組合せ (例: long + short + env の同時適用、DR-042 の不動点反復が複数 installer 間でどう合流するかの実測)
- 全収束形 (全 installer 適用済みの最終 lowered 断面)
- 蒸留元は slice の既存 phase テスト (canon_scope 比較を行っているもの)。どのテストがどの粒度に対応するかの棚卸しが未着手

### 5. DR-063 の未確定細部が出た場合の扱い

本フェーズで実装を進める中で DR-063 の表記だけでは決まらない細部 (例: 骨格正規化の具体規則、順列 property の fixture 語彙) が判明した場合、DR-063 の拡張 (追記) にするか新規 DR を起こすかの判断が要る。フェーズ2-① の教訓 (docs/journal/2026-07-05-phase2-fixture-runner-first-run.md: 「追加設計でなく最小 runner の実測で前提を退役させる」) に倣うなら、本フェーズも先に机上で全部決めようとせず、slice PoC 上で `query: "lower"` runner を小さく動かして実測から論点を潰す進め方が有力候補。

## 推奨 (2026-07-05、フェーズ 1 の議論文脈から)

- **論点 1**: installers は **installer 名の列挙 (省略 = 全登録)**。適用は順序非依存 (LOWERING §C.2) なので集合として書く — 配列だが順序は非規範と明記
- **論点 2**: 正規化規則は **DR-063 §3 の断面表記自体を正規形**とし、緩比較で無視するのは (a) 内部 id の具体綴り (`#` 系、DR-063 が非規範と確定済み)、(b) entities 内の席の記載順。matcher は種別 + エントリ表の一致 (§C.5 どおり)
- **論点 3**: 順列一致 property は **runner の組み込み検査** (lower fixture が与えられたら runner が installer 順列を自動生成して canon 一致を検査)。fixture 形式に順列を列挙するとデータ爆発し、property の普遍性 (全順列) を事例列挙で偽装することになる
- **論点 4**: 基本 3 点セット = **A 群のみ / 単独 installer 全種 / 全収束**。組合せは相互作用が実在するものだけ厳選 (global×long/short の decl コピー展開、inheritable×long の逆方向コピー、alias×command — slice の phase 2/8/17/26 テストが蒸留元)
- **論点 5**: **新 DR 1 本** (lower fixture フォーマット) に論点 1〜4 の決定を集約し、DR-063 §3 は参照で繋ぐ (DR-063 の書き換えはしない — 断面表記自体は不変のはず)

## 受け入れ条件

- [ ] `query: "lower"` fixture の構造 (definition / installers 指定語彙 / cases / expect) が確定し docs/CONFORMANCE.md に明文化される
- [ ] lowered 断面の緩比較規則 (骨格正規化・無視するフィールド・順序の扱い) が明文化され runner で実装可能な粒度になる
- [ ] 順列一致 property の表現場所 (fixture 宣言 vs runner 組み込み) が決まる
- [ ] golden 断面の粒度 (A 群単独 / installer 単体 / 組合せ / 全収束) の方針が決まり、slice 既存テストからの蒸留対象が棚卸しされる
- [ ] 論点消化の過程で DR-063 だけでは足りない部分が DR 拡張または新規 DR として記録される

## 関連

- DR-042 (installer 不変則、不動点反応・add-if-absent)
- DR-063 (AtomicAST 直列形 — lowered 断面の面構造・matcher 表記の正本)
- DR-065 (parse fixture フォーマットの判断記録 — 本論点はその lowering 版)
- LOWERING.md 全体 (§A 構造記法の糖衣、§B installer 別 lowering、§C.5 比較戦略)
- docs/CONFORMANCE.md (§1 query 予約 / §4 ディレクトリ規約 — 本フェーズで埋める空欄)
- docs/journal/2026-07-05-phase2-fixture-runner-first-run.md (フェーズ2-① の実測・教訓)
- slice ws: poc/fixture_runner_wbtest.mbt (runner の育成先)
- ROADMAP.md フェーズ2-②
