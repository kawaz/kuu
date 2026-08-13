---
title: DR-133 §3 の committed 判定を link 透過にする (CFL-Q1a 裁定の反映)
status: resolved
category: task
created: 2026-08-14T04:29:01+09:00
last_read:
open_entered: 2026-08-14T04:29:01+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-08-14T04:48:30+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-133-config-path-list-fold.md §4.1", "implemented", "fixture:schema-constraint-unfixable", "followup:2026-08-12-config-committed-carry-over"]
blocked_by:
origin: 自リポ TODO
---

# DR-133 §3 の committed 判定を link 透過にする (CFL-Q1a 裁定の反映)

## 概要

## 由来
kawaz 裁定 CFL-Q1a (2026-08-14、docs/QUESTIONS.md でチェック受領)。裁定済みにつき QUESTIONS.md の CFL-Q1 節は削除済みで、本 issue が記録先。発端は実測 (2026-08-12、kuu.mbt issue command-definition-error-parity-review-followup の (2) 節に再現記録)。

## 問題
link は config_file セルを target にでき (decode / lint / parse / resolve すべて通過)、CLI で明示した値が link 経由で config path として効く。ただし binding の source は Link になるため、DR-133 §3 の committed 判定 (現行実装 = source が cli/env のときのみ Error) から漏れ、**CLI で指定したのに読込失敗が黙認される**。

DR-031 は CLI / link を同順位の明示操作と規定し、DR-121 §4 は Link を独立 source タグとして維持する。一方 DR-133 §3 は committed を「cli / env 明示」とだけ列挙しており、link の位置づけが未規定だった。

## 裁定内容 (CFL-Q1a)
**committed 判定は link を透過し、値の源席の cli/env 性で判定する。** committed の意味は「利用者が明示したのに読めないのは失敗」(DR-050 §2) であり、link は明示供給の搬送路にすぎない (DR-031 の同順位規定と整合)。

重要な非対称を保つこと:
- **sources の観測タグは `Link` のまま** (DR-121 §4 は現役、不変)。利用者から見た「どの入口から入ったか」の軸は変えない
- **committed 判定 (内部) だけ由来を辿る**。観測面のタグと内部判定を別軸として扱う

不採用: CFL-Q1b (committed は cli/env 直のみ = 現実装の追認、「CLI 指定したのに黙認」が残る) / CFL-Q1c (config_file セルを link target にすること自体を definition-error にする = 経路ごと塞ぐ)。

## 作業
- DR-133 §3 に link 透過の規範を明記 (「committed なパス (cli / env 明示)」の定義に、link 経由で運ばれた cli/env 由来の値を含める旨)。DR-050 §2 の分界にも波及するか要確認
- DESIGN §14.3 の committed 記述の追随
- fixture: link 経由で供給した config path の読込失敗が Error になる輪郭。ただし **resolve フェーズのエラーは args_pos を持たず failure schema に収まらない** 既知の制約があり (fixtures/value-sources/config/path.json の why に記録あり)、成功輪郭でしか固定できない可能性がある。表現可否を先に確認すること
- sources のタグが Link のままであることの pin も併せて残す (committed 判定と観測タグが別軸である証跡)

## 関連
- docs/decisions/DR-133-config-path-list-fold.md §3 (改訂対象)
- docs/decisions/DR-050-config-file-value-source.md §2 (committed 分界の正本)
- docs/decisions/DR-121-sources-result-address.md §4 (link は独立 source タグ、不変)
- docs/decisions/DR-031 (CLI / link 同順位)
- docs/issue/2026-08-14-dr133-redraft-single-config-file.md (DR-133 は再改稿が確定しているので、本項の反映は再改稿と同時に行うのが効率的)

## 受け入れ条件

- [ ] DR-133 §3 に link 透過の規範が明記されている
- [ ] DESIGN §14.3 の committed 記述が追随している
- [ ] fixture の表現可否が確認され、可能な範囲で pin されている

## 完了記録 (2026-08-14)

- DR-133 §4.1 を新設: 「committed かどうかは値を運んだ経路ではなく値の源席の cli / env 性で判定する」。link は明示供給の搬送路にすぎず (DR-031 の CLI / link 同順位規定)、経路の違いで「明示したか」の判定が変わるのは規定と食い違う、という根拠を明記。**観測面のタグは不変** (sources は経路を写す面なので link 経由の座は link のまま、DR-121 §4 は現役) で、由来を辿るのは committed 判定 (内部) だけの別軸であることも規定
- DESIGN §14.3 に同趣旨の 1 項を追加
- fixture: fixtures/value-sources/config/link-supplied-path.json を新設 (3 case) — link 入口から供給したパスが canonical の config セルへ流れて provider に読まれ、effects の entity は canonical 名 `config` / source は `link`、result / sources の座も `link` タグ。対として自入口供給なら `cli`、未発火なら宣言 default パスで `default`。link 参照ノード自身は非占有なので結果に現れない (DR-120 §4)

### 判定側が固定できない理由 (実物確認済み)

「link 経由の committed なパスが読めなければ Error」の**負の輪郭は現行 fixture schema では表現できない**:

- config の読込失敗は resolve フェーズのエラーで、`schema/fixture.schema.json` の `runtimeError` が required とする **`args_pos`** に対応する args トークンを持たない (required: ["args_pos", "kind"] を実確認)
- `kind` の enum が **`parse` / `filter` / `constraint`** の 3 語彙しかなく、config 読込失敗に対応する席が無い

これは link 固有の制約ではなく、**直接 cli 供給の committed 読込失敗も同じ理由で未固定**である (fixtures/value-sources/config/path.json の why に既に記録あり)。したがって規定は DR-133 §4/§4.1 が持ち、conformance が検証するのは成功輪郭のみ。実装側は単体テストで担保すること。

将来 resolve フェーズのエラーを conformance に載せるなら、failure schema 側の拡張 (args_pos の省略許容 + kind 語彙の追加) が前提になる — 本 issue の射程外だが、着手する場合はここが入口。
