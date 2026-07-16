# 2026-07-16 DR-110 標準パッケージングと UX-Q7R 明文化 (lockstep 3 リポ green)

PKG-Q1〜4 バッチ裁定 → DR-110「kuu-core 標準パッケージング」起草・監査・land、
並行して MoonBit open dispatch PoC、UX-Q7R (Q7 誤読事故の再裁定) の明文化と
fixture 実食による参照実装の未実装露呈・修正、spec/kuu.mbt/kuu-cli 3 リポの
ロックステップ push までを 1 サイクルで回した。

## PKG-Q1〜4 裁定と従属争点の導出

PKG-Q1〜Q4 は全て a 裁定 (kawaz、pre-clear 直後)。従属する詳細争点 17 件は
統括が第一原理から導出して決定し、kawaz への再質問を挟まなかった。唯一の裁量
判断は #19 wire_decode で、A 案でなく B 案 (住人分散) を採った。理由は
サードパーティ installer の語彙拡張経路を A 案が塞ぐため。

## DR-110 land (kuu-core 標準パッケージング)

DR-110 の起草は fable5-worker-high に委譲。統括監査で齟齬 3 件を検出し編集で
反映した:

- DR-094 との整合注記の追加
- matcher が opaque であることと「直列化不能」が同義ではない点の明文化
- sentinel が「(定義上) 現れない」という記述を、実測で既に破られている事実に
  合わせて修正

`docs/decisions/DR-110-kuu-core-standard-packaging.md` として spec main の
commit `ecf740c4d946` で land。INDEX 追加に加え、将来課題として issue
`docs/issue/2026-07-16-engine-contract-verification-fixture.md` を起票した
(commit `94d167a6baad`)。

## MoonBit open dispatch PoC (並行トラック)

DR-110 の作業と並行して、kuu.mbt 側で open dispatch の PoC を codex-sol
worker に委任した (kuu.mbt commit `061b7d4f`、findings
`docs/findings/2026-07-16-moonbit-open-dispatch-poc.md`)。「閉じた構造
`Node` + `Ext(&NodeExt)` の 1 variant」という構成が 3 target で成立すること
を確認。`derive(Eq, Debug)` は失われるため `equal`/`fingerprint` 契約で代替
する。登録は `builtins.install(registry)` の明示方式が必須と判明した。

## UX-Q7R 明文化

UX-Q7 誤読事故 (2026-07-16-kuu-ux-design-cycle 参照) で暫定化していた再裁定
論点 Q7R を明文化した。fable5-worker-low がドラフトを書き、統括が統合。反映
先は DR-031 (正本 note)、DR-052・DR-073 (相互参照 note)、DESIGN §15.5 追記。

`collision.json` fixture を 2 case から 4 case に拡張:

- `single-exposure-ok` に `sources` を追加 (= resolve 相の検証層接続)
- `env-claim-collision` を新設 (= 上位席は主張の対極 pin)
- `defaults-only-no-collision` を新設 (= 導出 pin)

spec main の commit `e3b27efe1c11` で push。

## fixture 実食による Q7R 未実装の露呈

拡張後の fixture を参照実装 (kuu.mbt) に実際に流したところ、Q7R の意味論が
未実装であることが露呈した。mismatch 3 件:

- default が結果 cell を `{x: false}` に上書きしてしまう
- env 主張の共露出が success を素通りしてしまう
- sources が重複する

「runner が green だったのは、検証層がそもそもこの領域に届いていなかった
だけ」という実証になった。

## kuu.mbt 実装 (resolve_ladder_below_cli)

修正は codex-sol worker に委譲 (commit `e921d758` → push 後 `071d4ae4`)。
`resolve_ladder_below_cli` に以下を実装:

- default ゲート
- 上位席 → default の二段解決
- claim bindings ベースの collision 判定
- sources の cell 単位 1 entry 化

conformance は decoded=272/ran_cases=663/skipped=0/mismatches=0、moon test
355/355 で green。

worker は probe の過程で「env-only の sources が default になる」宣言順
バグを自力で検出・修正した。EXP-Q1 (共露出実体の宣言 default が異なる値の
場合の帰結、未裁定) は先取りしていない — 実装は定義順先勝ちだが、pin テスト
は追加しないという統括指示に従った。EXP-Q1 は `docs/QUESTIONS.md` に起票
(統括推し a = 定義順、縁ケースにつき裁定保留も許容)。

## ロックステップ push

spec `e3b27efe1c11` → kuu.mbt `071d4ae4` (pin bump、CI green) → kuu-cli
`8aac0cda` (両 pin 追随 + baseline 560→563、fail 0、CI green)。kuu-cli は
今回が初の fail 0 で、残る blocked は Infinity 4 件のみ。

## 別トラック: UX-Q8 (--config-file)

`--config-file <path> <json|file>` の 2 引数形を kuu-cli に実装 (opus47
worker)。blocked-skip 5 件を解消し、560/561 → 563/563 の前段となった。
前セッション引き継ぎに残っていた「7 件」という数字は誤記で、実測は 5 件
だった。

## 運用知見

worker 間の task_assignment 交差配送で、逆向きの変種 (worker → 旧 peer へ
の誤配送) が発生した。受信側が備えていた「peer 宛の割当は着手せず統括へ
照会する」という防御が機能し、実害なく検出できた。

## 関連

- `docs/decisions/DR-110-kuu-core-standard-packaging.md` (PKG-Q1〜4 裁定の
  正式記録)
- `docs/issue/2026-07-16-engine-contract-verification-fixture.md` (DR-110
  波及の将来課題)
- `docs/decisions/DR-031-value-source-precedence.md` / `DR-052-export-key-unification.md` /
  `DR-073-export-key-collision-carrier.md` (UX-Q7R 反映先)
- `docs/QUESTIONS.md` EXP-Q1 (共露出実体の異 default 値、裁定待ち)
- kuu.mbt `docs/findings/2026-07-16-moonbit-open-dispatch-poc.md` (open
  dispatch PoC)
- kuu.mbt 実装 commit `071d4ae4` (resolve_ladder_below_cli の Q7R 意味論
  実装)
- kuu-cli commit `8aac0cda` (pin 追随、baseline 560→563 fail 0)
- `docs/journal/2026-07-16-kuu-ux-design-cycle.md` (UX-Q7 誤読事故の前日
  経緯)
