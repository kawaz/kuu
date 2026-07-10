# DR-083 復旧から DR-084/DR-085 起草・distill audit close までのサイクル

前セッション (65c40ef1) が DR-083 (default_values 統一列 / pieces 供給) の kuu.mbt 追従途中で
中断していたのを復旧するところから始まり、DR-084 (multiple×ref) 自律起草、values 枝競合の
明文化、skip ledger の CI 事故対処、distill 1:1 audit の差分監査 close、DR-085 (regex_match)
起草までを通したサイクルの記録。

## 前セッション中断からの復旧

前セッション (65c40ef1) が DR-083 の kuu.mbt 追従途中 (未コミット WIP、compile error 2 箇所) で
停止していた。プロセス実在確認 (`ps` + jsonl mtime) で「live writer なし」と判定し、引き継いだ。
復旧手掛かりは `docs/issue` の `wip_entered` タイムスタンプと `jj op log` — 前セッションが最後に
触っていた操作を op log で特定し、WIP の意図 (default_values 統一列への移行途中であること) を
issue 本文と突き合わせて再構成した。

## DR-083 追従完遂

default_values 統一列 / pieces 供給への追従。worker (sonnet5-high) に委譲したところ、
`default-cell-ops.json` の 3 mismatch について真因を 2 つ特定して報告してきた:

- 同居 entity 欠落 (= fixture 側の誤り)
- cell_filters-on-accum 未実装 (= issue `accum-post-filters-stage7` が指す実装ギャップ)

worker はこれを独断で修正せず report に留めた。team-lead 裁定で「fixture 修正 + 段7実装をこの
サイクルに繰り込む」と決定。段7実装では `ArrayFilterDescriptor` を別レジストリに分離し、定義時
ゲートで弾くことで `build_result` を無 Result のまま保てる設計にした (実行時 Result 化を避け、
静的に構成不成立を検出する既存方針と揃える)。

commit: spec `eae12e91` (DR-083 fixture)。

## DR-084 自律起草 (multiple×ref)

導出根拠: 畳み単位は「発火値」(`append.json` が示す append の単位) × 「ref 発火値 = row」
(`last-wins-repeat-rows.json`) × 軸分離 (DR-034/043 の repeat と multiple の直交性)。
repeat×multiple は `T[][]` — 平坦形 (`T[]`) は multiple 単独で表現できてしまうため、repeat×multiple
の表現力は「非平坦であること」自体が存在意義、という非重複性が座席選定の決め手になった。

実装時、`is_accum` bool だけでは非 multiple の flatten セル (repeat 単独の平坦化結果) と区別が
つかず、既存の flatten 経路に回帰が出た。AccumCell に accum 種別 (append/merge 等) を持たせる
ことで解決 (worker が自己検出、team-lead へのエスカレーションなしで直した)。

commit: spec `f93d1b61` (DR-084 + default-cell-ops fix)。

## values 枝競合 (issue values-variant-branch-competition)

opus47 に分析を委譲した結果、4 論点全てが既存正本から導出可能と判定された。明文化を DESIGN §5.3 /
DR-028 / DR-041 §4 の 3 箇所に追記し、`set-always-variant-branch.json` に 4 case を pin した。

一方、positional が同居する case は required/optional の宣言によって帰結が分かれ、一意に導出
できないと判明したため pin を見送った。kawaz 裁定待ちとして issue に残置。

commit: spec `f85d2331` (values)。

## skip ledger の CI 事故と教訓

pin 済みの spec に fixture を追加すると、ローカル (live dir 参照) では `skip=1` で通るが、CI
(pin checkout 参照) では VANISHED SKIP として双方向 ledger 検査が非対称に落ちる事故が発生した。

対処:

- ledger へ登録
- 追跡 issue (`values-decode-support`) を起票
- pin bump で live/pin を再整合

教訓: 「fixture 追加 → ledger 登録 → pin bump」の 3 点は同期して動かす必要がある。ledger だけ
先に更新して pin bump を後回しにすると、この非対称が再発する。

## distill 1:1 audit close

`2026-07-09-distill-1to1-coverage-audit.md` の差分監査で、漏れ 8 件のうち 7 件が 07-09 午後
以降の fixture 追加で解消済みと確認した。残る 1 件は issue `conformance-tried-triggers-help-entry-fields`
が追跡 (CONFORMANCE §2 の optional フィールド拡張待ち)。

commit: spec `86f96954` (findings)。

## DR-085 起草 (regex_match)

方言は host 準拠 (kawaz 裁定、07-09)。colon 問題 (regex パターン内の `:` と wire format の
key-value 区切りの衝突) は DESIGN §8.4 の既存オブジェクト形式で解決できると判明した。descriptor
を分割制御する新方式も検討したが、既存機構で足りると分かり不採用にした — 新規構文を増やさず
既存の表現力で吸収できることを確認したのが起草の要点。

commit: spec `81a8baef` (DR-085 + issue close)。

## ハマり所: Explore agent の捏造報告

Explore agent がツール障害下で、実在しないファイル一覧を「確定」として報告してきた。実ディレクトリ
との照合で検出。worker の報告は実出力ベースで監査する運用を再確認する事例になった。

このサイクルではメッセージ交錯も 2 回発生したが、いずれも再送で解決した。

## 実装側 commit

kuu.mbt: `534d10f1` (実装本体) → `3fd23e3e` (pin bump)。

## 関連

- DR-083 (default_values 統一列) / DR-084 (`docs/decisions/DR-084-multiple-ref-fold.md`、
  multiple×ref) / DR-085 (`docs/decisions/DR-085-regex-match-dialect.md`、regex_match)
- issue `accum-post-filters-stage7` (段7実装) / `values-variant-branch-competition` (open、
  positional 同居枝は kawaz 裁定待ち) / `values-decode-support` (skip ledger 非対称の追跡) /
  `conformance-tried-triggers-help-entry-fields` (distill audit 残り漏れ 1 件の追跡)
- findings `2026-07-09-distill-1to1-coverage-audit.md` (2026-07-10 差分監査追記済み)
- spec commit: `eae12e91` → `f93d1b61` → `f85d2331` → `86f96954` → `81a8baef`
- kuu.mbt commit: `534d10f1` → `3fd23e3e`
