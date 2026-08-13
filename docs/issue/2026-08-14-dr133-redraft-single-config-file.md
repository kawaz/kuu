---
title: DR-133 再改稿 — 1 スコープ 1 config_file (並置 definition-error)、fold は multiple パス列のみ
status: open
category: task
created: 2026-08-14T04:27:55+09:00
last_read:
open_entered: 2026-08-14T04:27:55+09:00
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

# DR-133 再改稿 — 1 スコープ 1 config_file (並置 definition-error)、fold は multiple パス列のみ

## 概要

DR-133 の要素間規則(「そのスコープの config_file 要素を宣言順に走査してパス列を作る」)を撤去し、1 スコープ 1 config_file・並置は definition-error という規範へ再改稿する。fold は 1 つの config_file 要素の multiple パス列にのみ定義する。

## 背景

### 由来

kawaz 裁定 CFM-Q3a (2026-08-14、docs/QUESTIONS.md でチェック受領。mid=8 の枠組みへの回帰 + mid=9 で補強)。裁定済みにつき QUESTIONS.md の CFM-Q3 節は削除済みで、本 issue が記録先。

### 裁定内容

現行 DR-133 は「そのスコープの config_file 要素を宣言順に走査してパス列を作る」という要素間規則を持つが、これは誤読だった。fold は **1 つの config_file 要素の multiple パス列**に定義するものであり、複数の config_file 要素の並置には意味を与えない。重ねの正規形は `{type:"config_file", multiple:{append}, ...}` の 1 要素で、分割指定も borrow で 1 要素に集約する。

再改稿の骨子 3 点:

1. **1 スコープ 1 config_file** — 並置は definition-error (意味を与えない構成は定義時に倒す)。kind は要検討 (invalid-range が既存線に近いが未確定)
2. **fold は multiple パス列のみ** — トップレベルキー置換で畳む規則自体 (DR-133 §1 の 3 手順・§2 の深いマージ禁止・§3 の各パス独立判定) は multiple の供給列に対してそのまま生きる
3. **探索は合成に委ねる** — 「探す場所が複数 = 最初の readable 1 個」は file 要素 + readable filter (I/O filter の新カテゴリ) + borrow の合成で書く方向。readable filter 自体は別 issue (docs/issue/2026-08-12-io-predicate-vocabulary-seat.md)

綴り違い (--config / --config-file) は alias 語彙で 1 要素に吸収できるので、並置需要は無いことが mid=9 で確定している。

## 受け入れ条件

- [ ] DR-133 の再改稿 (要素間規則の撤去 + 並置 definition-error 化 + §4「複数要素を書くことが重ねの宣言」の書き換え + §5 射程の見直し)。DESIGN §14.3 / REFERENCE.md の config_file 行も同じ規範へ追随
- [ ] fixture 3 本の組み替え (現在は複数 config_file 要素の並置を前提にしており、再改稿後は定義ごと definition-error になる):
  - fixtures/value-sources/config/multi-file.json (c1 + c2 = 2 要素)
  - fixtures/value-sources/config/multi-file-path-absent.json (c1 + c2 = 2 要素)
  - fixtures/value-sources/config/multi-file-multiple.json (sys + user + site = 3 要素)
  いずれも multiple 1 要素形へ組み替える。並置が definition-error になる輪郭の fixture も新設する
- [ ] DR-135 の pin の受け皿: DR-135 (config_file は通常要素) により、名前付き config_file 要素は result / sources に確定パスを持って現れる。multiple なら供給順のパス列 string[]、0 供給なら []、未供給の座は null、cli 由来の発火は effects にも 1 件。この観測を組み替え後の multiple 1 要素 fixture に必ず含めること — 現行 3 本は DR-135 反映前の期待値のまま据え置いてある (DR-135 のサイクルでは意図的に触っていない) ので、再改稿サイクルで一括して入れる
- [ ] 供給されたパス vs 読めたパス (DR-135 §2.1) の pin も組み替え後に残す: result に座るのは供給された列であって、読めたものだけを残した列ではない

## 注意 (push 順序)

spec 側 fixture の変更は kuu.mbt 実装追随とロックステップで push すること (spec 単独 push は conformance を red にする)。

## 関連

- docs/decisions/DR-133-config-path-list-fold.md (再改稿対象)
- docs/decisions/DR-135-config-file-is-a-normal-element.md (config_file 通常要素化。§波及に本 issue を参照済み)
- docs/issue/2026-08-12-config-committed-carry-over.md (参照実装の fold 未追随。受け入れ条件が本再改稿で変わる)
- docs/issue/2026-08-12-io-predicate-vocabulary-seat.md (readable filter の席)
