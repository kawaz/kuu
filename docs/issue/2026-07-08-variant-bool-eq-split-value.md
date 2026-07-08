---
title: variant を持つ bool 要素は --ssl=false (eq-split 値形) を受けるべきか
status: open
category: design
created: 2026-07-08T11:51:52+09:00
last_read:
open_entered: 2026-07-08T11:51:52+09:00
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

# variant を持つ bool 要素は --ssl=false (eq-split 値形) を受けるべきか

## 概要

variant (`--no-ssl` 等) を持つ bool 要素が eq-split 値形 (`--ssl=false`) を
受けないのは仕様として意図的か、それとも実装漏れかを決める。

現状 kuu.mbt (`src/core/installer.mbt` の `inst_long`) は
`e.ty == TBool && e.variants.length() == 0` のガードで、variant を持つ
bool 要素を `eq_entries` に登録していない。つまり `--ssl=false` は
「未知の値付き long option」として弾かれる (variant 無し bool なら
`--ssl=false` は受理される非対称)。

## 背景

kuu.mbt の conformance Batch-1 実装 (DR-074 §3 bool eq-split 対応) で、
`fixtures/lowering/long/variant.json` の why テキスト「値トークンを取らない」
を根拠に、variant 持ち bool を eq_entries 非登録とする実装を選んだ。
これは fixture を壊さない側への仮置きであり、設計として詰め切ったわけでは
ない。

対抗案として「`--ssl=false` は `--no-ssl` と意味的に等価に受理されるべき」
という設計もあり得る (POSIX 系 CLI の実勢: 例えば `--flag=false` を
サポートする CLI ライブラリは一定数存在する — 実勢調査は未実施)。

DR-074 §3 は variant との相互作用を明示的に規定していない。

## 決めるべきこと

- [ ] variant 持ち bool 要素の `=value` 形 (`--ssl=false` / `--ssl=true`) を
      受理するか否か
- [ ] 受理する場合、variant トリガ (`--no-ssl`) との優先関係、および
      両方が同一コマンドラインに現れた場合の衝突時の挙動
- [ ] `fixtures/lowering/long/variant.json` と
      `fixtures/value-typing/bool-canonical.json` への輪郭追加 (上記決定を
      反映した fixture ケース)

## 受け入れ条件

- [ ] variant 持ち bool の eq-split 値形の可否が DR (DR-074 補遺 or 新規 DR)
      として明文化されている
- [ ] 上記 DR に基づき `fixtures/lowering/long/variant.json` /
      `fixtures/value-typing/bool-canonical.json` に輪郭ケースが追加されて
      いる
- [ ] `src/core/installer.mbt` の `inst_long` 実装が DR の決定と整合して
      いる (ガード条件の見直し含む)
