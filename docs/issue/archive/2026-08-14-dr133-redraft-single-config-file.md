---
title: DR-133 再改稿 — 1 スコープ 1 config_file (並置 definition-error)、fold は multiple パス列のみ
status: resolved
category: task
created: 2026-08-14T04:27:55+09:00
last_read:
open_entered: 2026-08-14T04:27:55+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-08-14T04:46:54+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-133", "implemented", "issue/2026-08-12-config-committed-carry-over"]
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

## 完了記録 (2026-08-14)

- DR-133 を再改稿: 要素間規則 (全 config_file 要素の宣言順走査 / inline 展開) を撤去し、§1 に「1 スコープ 1 config_file、並置は definition-error kind=invalid-range (関与要素ごとに 1 件全列挙)」、§1.1 に「重ねの正規形は 1 要素の multiple (既定パス列は配列 default)」、§1.2 に「探索は合成に委ねる」を新設。fold 本体 (§2 パス列 → 1 オブジェクト / §3 トップキー置換・深いマージなし / §4 各パス独立) は multiple の供給列に対する規定として保持
- kind の選定根拠: config 席はスコープに 1 つ (DR-031 #3) なので 2 つ以上は同じ 1 席への重複宣言 = 席の値域外。invalid-range は DR-134 §2 と同じ「同居不可の組合せ」の筋で、export-key-collision のような hint 出し分けを持たないため新 kind は興さない
- 波及: DESIGN §14.3 / REFERENCE の config_file 行 / DR-050 §2 の読み直し note と射程外項に確定 note / INDEX
- fixture: fixtures/definition-error/config-file-siblings-invalid-range.json を新設 (並置 = invalid-range)。multi-file 系 3 本を 1 要素 multiple 形へ組み替え、役割を分離した — multi-file.json = fold の意味論と席ごとの入れ替え (4 case) / multi-file-multiple.json = 供給順が fold 順を決める (2 case) / multi-file-path-absent.json = 供給なし = 空列と env 席 (3 case)。DR-135 の結果面 pin (パス列が string[] として座る、読めなくても座る、0 供給は []) も組み込み済み
- 検証: fold 規則を素朴実装で再現し、3 fixture 9 case の result / sources 期待値と全一致することを確認。lint 3 種 OK (fixture 413 件)
- CFM-Q3-β (values:[...] の読み) は未裁定のまま docs/QUESTIONS.md に残っている。本再改稿では既定パス列を配列 default で書き、values 糖衣には触れていない

DR-133 再改稿は spec 側完了。kuu.mbt 実装追随は docs/issue/2026-08-12-config-committed-carry-over.md が持つ。
