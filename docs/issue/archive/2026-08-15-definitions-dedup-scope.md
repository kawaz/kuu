---
title: definitions 配下の同名重複の扱いが spec 未規定
status: resolved
category: design
created: 2026-08-15T23:00:25+09:00
last_read:
open_entered:
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-08-16T01:39:39+09:00
discard_reason:
pending_reason:
close_reason: ["done: 前提不成立 (definitions は名前がキーの JSON object なので同名多重定義は wire 上表現不可能。区分違いの同名は区分が名前空間として既存規範のまま合法。scope と definitions の同名は DR-032 の解決順が既に仲裁)"]
blocked_by:
origin: 自リポ TODO
---

# definitions 配下の同名重複の扱いが spec 未規定

## 概要

`definitions` 配下 (def name 軸) で同じ名前が 2 つ以上宣言された場合の扱いが spec 未規定。`duplicate-id` (DR-054 更新 5) の参加集合に含まれるのか、別 kind なのか、暗黙規則で吸収されるのかが宙に浮いている。

## 何が未規定か

DR-054 更新 5 が定める `duplicate-id` の参加集合は「同一 lexical スコープにある、参照識別子を持つ宣言要素」で、これは `options` / `positionals` / `commands` の面を念頭に置いた規定になっている。`definitions` 配下 (DR-007 / DESIGN §10.4) については明示がない。

- `definitions` 配下は結果に露出しない (DESIGN §10.4) ので、露出キー軸の `export-key-collision` (DR-120) は掛からない
- `duplicate-id` の参加集合に含まれるかどうかの明示がない
- ref / link の解決は lexical 連鎖の最後に `definitions` を見る (DR-032 / DR-006) ので、同名が 2 つあれば**解決先が一意に定まらない**はず。その帰結が `duplicate-id` なのか、別 kind なのか、last-wins 等の暗黙規則で吸収されるのかが決まっていない
- 「解決できない」側に倒すなら `absent-ref` との関係整理も要る — 不在ではなく多重定義なので、同じ kind に載せると意味が混ざる

## なぜ裁定が要るか (導出では決まらない)

CMDID-Q1 (command の `duplicate-id` 参加、kawaz 裁定 2026-08-15) と**同型の「参加集合の境界」問題**。`definitions` は結果キー軸を持たない領域なので、

- 「id 軸の重複はどの面でも一様にエラー」と読む → 参加する
- 「参加集合は結果スコープを持つ面に限る」と読む → 参加しない (別の扱いが要る)

のどちらにも読め、既存 DR からの導出だけでは決まらない。

## 検討の材料

- DR-054 更新 5 の検査面の規定 (alias desugar / global copy より前の lexical 宣言面) との整合 — `definitions` はこの面に居るのか
- `definitions` 内での名前解決が「同一 lexical スコープ」を成すのか、領域として別扱いなのか (DR-007 / DR-033)

## 受け入れ条件

- [ ] `definitions` 配下の同名重複の意味論を裁定し、DR (DR-054 更新 5 の参加集合、または新規) に明記する
- [ ] `absent-ref` / `duplicate-id` との kind の切り分けを明示する
- [ ] 決定した意味論を pin する fixture を追加する

## 由来

duplicate-id サイクル (DR-054 更新 5 の `duplicate-name` → `duplicate-id` 改稿) のレビュー 2 系統で指摘された論点。今回の改稿スコープでは決めていない。
