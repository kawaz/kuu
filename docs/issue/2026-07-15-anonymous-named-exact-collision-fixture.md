---
title: named 要素と匿名 exact の同綴り衝突 dedup を pin する collision fixture
status: open
category: task
created: 2026-07-15T15:52:41+09:00
last_read:
open_entered: 2026-07-15T15:52:41+09:00
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

# named 要素と匿名 exact の同綴り衝突 dedup を pin する collision fixture

## 概要

codex レビュー #6 (2026-07-15) の Minor 指摘。DR-104 §2 note (iii) の匿名 exact
origin=spelling 規則により、同一 scope に named 要素 (origin=name) と匿名 exact
(origin=spelling) が同じ綴りで併存し 6 フィールドが完全一致すると 1 件に dedup
される (生成経路は同一性に残らない — 仕様上は §3 から一意に導出可能で未定義では
ない)。この「synthetic な origin が element-name 名前空間と衝突したら経路を捨てて
畳む」継ぎ目が fixture で pin されていない。origin を一意な要素参照だと誤解する
実装への歯止めとして collision fixture を 1 本追加する。

## 背景

`fixtures/complete/anonymous-exact-origin.json` (DR-104 §2 明確化 note (iii)、
統括検証 2026-07-15) は、name を持たない裸文字列由来の exact 候補の origin が
spelling 自身にフォールバックすることを既に pin している
(`nameless-positional-exact-origin-is-own-spelling` ケース、
`{"exact": "init"}` → `origin: "init"`)。

この fallback 則により、named 要素 (例: `command` という name を持つ要素の
spelling が `"command"`) と匿名 exact (`{"exact": "command"}`) が同一 scope に
併存し、6 フィールド (DR-104 §2/§3 の候補同一性の成分) が完全一致する場合、
候補としては区別不能になり 1 件に dedup される。この挙動自体は §3 の同一性規則
から導出可能で仕様上未定義ではないが、fixture で明示的に固定されていないため、
実装が「origin は生成元要素への一意参照」と誤解して 2 件残す退行を検知できない。

## 受け入れ条件

- [ ] named 要素 (name=X、例 `command`) と匿名 exact (spelling=X) が同一 scope
      で併存する definition で `complete` し、6 フィールド一致なら候補 1 件
      (dedup 済み) を期待する fixture を追加する
- [ ] 対照として origin が異なる (name≠spelling) 場合に 2 件残るケースを同一
      fixture ファイル内に置く
- [ ] fixture は `fixtures/complete/anonymous-exact-origin.json` の隣
      (`fixtures/complete/`) に配置する
- [ ] conformance green を確認する (spec fixture push → pin bump → kuu.mbt
      push のロックステップウィンドウで反映)
