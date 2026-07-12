# DR-098: tty 判定の値源化サイクルと並列整備の記録

DR-097 サイクルの journal 記録 (`38a745f6`, 17:58) から約 20 分後、kawaz が
寝かせ中の idea 2 件に裁定を下した。filter の bundle 一括登録案は具体
ユースケース未収集のまま「不要」と判断され discarded で archive
(`0013dc95`, 17:52 close 実行 — journal 記録より僅かに先行)。もう一方の
tty 判定値のモデル化案 (`docs/issue/2026-07-07-tty-value-as-injected-source.md`)
は「やっといて」で着手が決まった。

## 着手前精読での衝突発見と統括裁定

spec worker が着手前に既存記述を精読し、DESIGN §13.9 の既存文言

> **TTY / カラー / interactive**: AtomicAST は端末状態を知らない。出力
> レンダリングは実装側の責務。

と、これから起草する DR-098 の設計 (tty 値を注入値源としてモデル化する)
が正面衝突することを発見して統括に停止報告した。§13.9 は「tty という
概念を kuu の射程外に置く」明文除外であり、そこに新しい値源を挿すのは
既存規定の単純な上書きに見えたためである。

統括裁定: §13.9 は実際には 2 つの異なる関心を一文に束ねていた —
「レンダリング責務の実装層への分離」と「tty を値源として持たない」。
DR-098 が解消するのは後者のみで、前者 (AtomicAST が端末を能動的に操作
したりセンシングしたりしない) は不変則として維持する。この整理に従い、
§13.9 は改訂 (削除ではない) する形で続行することになった。この裁定は
DR-098 §7 にそのまま反映されている。

## DR-098 起草 (`688d586f`, 18:17)

骨子:

- **`tty_provider` — registry 単一スロット**: `(stream: "stdin" |
  "stdout" | "stderr") → bool | null`。env_provider (DR-049) /
  config_provider (DR-050) と同列、複数 provider の合成は持たない。
  production 実装は `isatty(3)` 相当だが、conformance/fixture では
  case 入力の `tty` フィールドで直接注入し production probe を経由しない
- **評価器の純粋性は不変**: ambient probe (isatty 呼び出し) の実行は
  provider 実装 (kuu 外側、ホスト言語 DX) の責務に完全に閉じる。
  env/config に続く「実行環境依存の外部入力を provider 経由で注入する」
  パターンの 3 例目
- **wire 属性 `tty`**: 値語彙は `"stdin"|"stdout"|"stderr"` の 3 値
  enum。installer 所有語彙 (DR-042 不変則③) で ns 対象外 (DR-094 §1)
- **供給値は native bool**: DR-050 §4 の config scalar と同じ「型一致で
  T 域直行」原理がそのまま適用され、piece_filters/parse をスキップし
  value_filters/cell_filters のみ通過する。非 bool 値プリミティブ /
  値なし要素 (`type:"none"`、dd 含む) / `flag`・`count` プリセットへの
  `tty:` はいずれも definition-error (kind=`invalid-range`)。flag/count
  は「起動時の書き込み」という別経路を既に持つため tty 席と意味論が
  両立しない
- **ラダー位置**: `cli > link > env > config > inherit > tty > default`
  — tty を default の直前・inherit の直後に挿入。「明示 (CLI/env/config)
  > 継承 (inherit) > 観測 (tty) > 宣言既定 (default)」の一貫序列で、
  `NO_COLOR`/`CLICOLOR_FORCE` (env が tty 検出を上書き) や git の
  `color.ui=auto` (config があれば従う、無ければ tty 判定) という
  実世界の慣行がこの位置を裏付ける
- **source タグ**: `tty` を追加。ただし `effects` には現れない (env/config
  /inherit と同じく完走後の値確定、CONFORMANCE §2 の対象外)

## spec 側の追随

起草の直後、同一セッション内で立て続けに追随コミットが積まれた:
`8b8c4fd2` (18:21, DESIGN §11.4/§12b/§13/§13.9/§16 + wire.schema/fixture.schema
/CONFORMANCE の追随) → `75832ccc` (18:23, fixtures 新設 — tty-ladder.json
5 ケース + tty-non-bool.json の definition-error 輪郭) → `65fca63b`
(18:25, corpus/real-cli/die.json の gap 記述解消 + stdin_tty 要素の追加)。

実装は別 issue に切り出す方針で `fd086d4e` (18:30, issue task
`dr-098-implementation`) を起票し、元 issue は `352853d2` (18:31) で
archive、`fd712426` (18:31) で旧 path 削除。この時点で spec 側の
DR-098 チェーンは完結し main は `fd712426` を指す。

## kuu.mbt 側のプロセス事故と実装完遂

`fd712426` の直前、統括は kuu.mbt 側の expected_skips 台帳に DR-098 の
tty fixture 2 本を「実装 land まで skip」として凍結記載する commit
(`4ac25205`, 18:31:17) を単独で push した。台帳契約 (MDR-001 §6) 上は
正しい手順だが、この時点で kuu.mbt が pin していた spec SHA はまだ
`24c72730` (tty fixture 追加より前) のままで、pin bump が伴っていな
かった。結果、CI は「台帳が skip を期待しているのに、pin された spec
にはその fixture 自体が存在しない」= VANISHED SKIP と判定し、CI 赤が
1 run 発生した。

台帳エントリと pin された fixture 集合はロックステップで動かす必要が
ある — 過去の「impl+pin 同梱 push」の教訓と同じクラスの事故である。
`2ddc818f` (18:34:47, pin bump `24c72730`→`fd712426`) で spec 側の
最新 SHA を pin し直し、数分内に green へ復帰した。

その後 `a396d21b` (18:57〜19:00) で tty_provider / TtyInst installer /
definition-error 検査を実装。Source enum に `Tty` (Inherit と Default
の間) を追加、`Entity.tty_key`/`ElemDef.tty` を env_key/env と同型の
単一スロットとして新設、`resolve_ladder_below_cli` に tty 席を挿入
(型一致で value_filters/cell_filters のみ通過)、decode 層・
`apply_requires_filter` まで配線した上で expected_skips 台帳の該当
エントリを解消。fresh 実行: `just test` で decoded=201 / ran_cases=536
/ skipped=0 / mismatches=0、310 wbtest 全 pass、moon check --deny-warn
/ moon fmt --check 通過。spec 側の実装追跡 issue
(`docs/issue/2026-07-12-dr-098-implementation.md`) は本稿執筆時点では
実装は完了しているが status は `open` のまま残っている (close 操作は
別途必要)。

## 同日午後の並列整備

kuu.mbt 側の本実装 (`2ddc818f` 完了〜`a396d21b` 着手まで約 23 分) を
待つ間、spec 側では別系統の待機作業を並列で前進させた:

- `03180e2f` (18:36) — wire.schema.json の properties に
  `deprecated`/`match`/`self` の型ヒントを追加。schema ギャップ調査
  (survey-schema-gap) の成果で、DR-058/DR-090 で既に規定済みだった
  記載漏れを埋めた。同調査で `values` は DR-063 の意図的除外と判定、
  kuu.mbt 側に残っていた平坦 `separator` は正本 (DESIGN §6.3/DR-034
  — separator は multiple object 内のみ) を持たない dead entry として
  除去された (`fe5f99dc`)
- `2a64ae56` (18:37) — corpus/real-cli/tar.json に last_only の
  実戦プローブ 2 cases。実機 bsdtar 3.5.3 の `-tfzv` が f 中間クラスタ
  を丸取りする挙動を観測し、kuu.mbt live 実行で裏取り済み
- `8bc3ee7e` (18:39) — issue 起票「exclusive_group の at-least-one が
  表現不能」(design カテゴリ)
- `01e0694e` (18:41) — issue 起票「complete クエリの fixture がゼロ件」
  (task カテゴリ)、main はこの commit を指す

## commit 系譜

spec: `0013dc95` (bundle idea discard close) → `688d586f` (DR-098 起草)
→ `8b8c4fd2` (docs+schema 追随) → `75832ccc` (fixtures 固定) →
`65fca63b` (corpus die 追随) → `fd086d4e` (実装 issue 切り出し) →
`352853d2` (元 issue archive) → `fd712426` (旧 path 削除) →
`03180e2f` (wire.schema 型ヒント) → `2a64ae56` (tar last_only プローブ)
→ `8bc3ee7e` (issue: exclusive-group) → `01e0694e` (issue:
complete-query-fixture-gap)。

kuu.mbt: `4ac25205` (expected_skips 台帳凍結、pin bump 未伴走で CI 赤) →
`2ddc818f` (pin bump、green 復帰) → `a396d21b` (tty_provider 実装完遂)。

## 関連

- `docs/decisions/DR-098-tty-injected-value-source.md`
- DR-049 (env_provider — 単一スロット provider の先行例)
- DR-050 (config_provider — 型一致で T 域直行の先行例、§4 の直接の土台)
- DR-031 (値源ラダー — 本 DR が拡張する対象)
- `docs/issue/2026-07-12-dr-098-implementation.md` (実装追跡、status open のまま残存)
- `docs/issue/archive/2026-07-07-tty-value-as-injected-source.md` (元 issue)
- `docs/issue/archive/2026-07-07-filter-bundle-bulk-registration.md` (discard された姉妹 idea)
- `fixtures/value-sources/tty-ladder.json` / `fixtures/definition-error/tty-non-bool.json`
- 前回 journal: `2026-07-12-dr097-forestall-viability.md`
