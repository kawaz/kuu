---
title: 配列・反復結果の要素ごとの provenance を sources でどうアドレスするか未規定
status: open
category: design
created: 2026-07-26T13:39:17+09:00
last_read: 2026-07-28T21:38:10+09:00
open_entered: 2026-07-26T13:39:17+09:00
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

# 配列・反復結果の要素ごとの provenance を sources でどうアドレスするか未規定

## 概要

CONFORMANCE §2 の `sources` は「露出キーを scope-path 修飾したもの」(例 `sub.ttl`) までしか
キー文法を規定しておらず、**配列の要素ごとの由来をどう指すかが空白**。`repeat` / `ref` /
`multiple` が作る配列に対し、要素単位の provenance を表現する手段が spec に無い。

2026-07-26 の sources 修正 (export_key 適用) の際にレビューで指摘され、
「今回の組合せ pin ではなく別設計」と判断して切り出した。

## 背景

### 現状 (実装側の内部表現、spec には無い)

kuu.mbt の内部 path には以下の segment が現れる:

- `#k` — 配列添字。`walk_export_path` (`src/kuu/resolve.mbt:257`) が「結果スコープを作らない
  (配列添字) のでノードを進めずそのまま通す」と扱う
- `#row` / `#fire` — repeat の row / 発火境界を表す sentinel。SourceEntry 収集前に弾かれる

spec 側には `#k` / `#row` / `#fire` のいずれの記述も無い (`docs/CONFORMANCE.md` を grep して確認)。

### なぜ今 fixture に書かないか

現実装の出力をそのまま fixture に写すと、**内部 namespace (`#k` 等) を言語非依存の wire 契約として
固定してしまう**。これは実装の内部表現であって、他言語実装に要求してよい公開表現かどうかが未決。

配列要素の provenance には少なくとも 3 つの表現形がありうる:

- (a) index を path segment として公開する (`tags.#0` / `tags.0`)
- (b) JSON Pointer 的な別軸 (`/tags/0`)
- (c) 配列要素の provenance を `sources` とは別構造で持つ (要素数ぶんの配列を返す等)

どれを採るかで消費者の書き方が変わるので、先に決める必要がある。

### 論点

1. **配列要素ごとの provenance を公開するか**。そもそも「配列全体で 1 つの値源」で足りるかもしれない
   (現状の `{"tags":"cli"}` は配列全体に 1 タグ)。要素ごとに違う席から来る実例
   (`--tags a` + env の separator split + config 由来がマージされる等) が実際にどれだけあるか
2. 公開するなら **addressing の形** ((a)/(b)/(c) またはそれ以外)
3. `#k` / `#row` / `#fire` のうち**公開語彙に出してよいものがあるか**
   (レビュワーの推し: 内部 sentinel を直接公開しない)

### 調査順 (この順で進める)

論点 1 の答え次第で 2/3 が消えるので、**必ずこの順**で進める。逆順にすると内部 `#k` を
先に契約化する誘因が生まれる。

1. **最終配列内で source が異なる要素が共存する到達可能例を探す** — `multiple` の
   `merge` / `splice` / separator split、env と cli の合成、config の array 供給などを
   実際に流して確認する
2. **無ければ cell-level provenance のまま close** — addressing 設計は不要になる。
   現行の accumulator は最終セル単位で source を 1 個返す設計なので、resolve が
   env/config の配列を丸ごと 1 席として採用し cli が上位席でセル全体を確定するなら、
   内部 binding に `#k` があっても公開上は cell-level tag で完結する
3. **あれば element-level provenance を公開するかを裁定** — 到達可能なだけでは公開理由に
   ならない (消費者が要素単位の由来で何をするかが要る)
4. **公開する場合だけ** address model ((a)/(b)/(c)) と fixture を決める

## 受け入れ条件

- [ ] 調査順 1 の結果 (到達可能例の有無) が実例つきで記録されている
- [ ] 論点 1 が裁定されている。公開しないなら以降は不要で close
- [ ] (公開する場合) 論点 2/3 が DR として裁定されている
- [ ] (公開する場合) CONFORMANCE §2 の sources 節に配列要素の扱いが 1 段落で書かれている
- [ ] (公開する場合) fixture で pin: 0 row / 1 row / 複数 row、nested repeat、`multiple` + `repeat`

## 関連

- `docs/CONFORMANCE.md` §2 success の `sources` 規定 (現状 scope-path 修飾までしか書いていない)
- DR-044 (uniform array) / DR-031 (値源ラダー) / DR-052 (結果キー軸)
- kuu.mbt `src/kuu/resolve.mbt:257` (`walk_export_path` の `#k` 扱い)
- 同時期の作業: `fixtures/export-key/sources-under-command.json` / `sources-ladder-under-command.json`
  (配列全体に 1 タグを付ける現行の形を pin している)
