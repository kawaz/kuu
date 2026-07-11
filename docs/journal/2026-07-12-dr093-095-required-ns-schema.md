# DR-093 (required/requires 型委譲) + DR-094 (registry namespace) + DR-095 (Schema 実体化)

3 件の DR を連続して起票・実装した。起点は kawaz/die の `--` が必須にできない issue で、
required の意味論を type (値空間) への一様委譲として再定式化する DR-093、その過程で持ち上がった
「builtin 語彙を closed set として共通化したい」要求から生まれた DR-094 (registry namespace)、
namespace を前提に懸案だった Schema 実体化を完了させる DR-095 の 3 系統を記録する。

## DR-093: required/requires の型委譲充足 (DD3 バッチ)

発端は issue `dd-required-marker-fire-constraint` (2026-07-07 起票)。die の `--` (dd) は値セルを
持たないため DR-047 §5 の「値の有無」判定に乗らず、required で表現できないギャップだった。

kawaz 提案は 3 段階で変遷した:

1. **greedy Seq 表現**: `Seq([Exact("--"), Ref(...)])` を greedy 面に直接構築すれば `["msg"]` は
   failure、`["--","msg"]` は success になることを PoC (kuu.mbt エンジン直構築、2026-07-11) で
   実測確認 (5/5)。sever 相当が DESIGN §15.8「greedy 内部は背骨なし一体消費」の構造的性質であり
   dd 固有の機構ではないことの裏付けにもなった
2. 「required のスコープ拡張: cell なし node は『使用されたか』チェック」
3. 「`type:none` を発明すれば型委譲で一様化できる」— 最終的にこの形で裁定 (DD3 バッチ)

裁定内訳:

- **DD3-Q1**: none 要素の「発火」判定は committed
- **DD3-Q2**: requires の目的語も型委譲に含める。これにより DR-089 §4 の「値充足を要求される席
  には値空間が無いため立てない → definition-error」を置換する
- **DD3-Q3**: greedy Seq への opt-in lowering 書き換え案 (DD2) は不採用のまま idea へ降格。
  PoC で得た知見 (sever は greedy Seq の構造的性質) は記録として DR-093 に残す

DR-093 を起票 (spec `6d4890e7ab83`)、issue を close (`f2409475f71b`)。

kuu.mbt 実装で 2 件のギャップを発見した:

- (a) required 属性が MDR-002 移植時から丸ごと未実装だったと判明した。fixtures にも
  `required:true` が 0 件で空白が隠れていた。型委譲の一様形でゼロから新設した
  (kuu.mbt `4867d5fa1b7f`)
- (b) dd 発火が binding を生成せず committed が立たない問題があった。`DdSat`/`DdMatchSat` に
  committed 観測用の binding 配線を追加し (`DdMatchSat` に `elem_name` 追加)、result/effects
  への漏れは `collect_dd_names` で除外した

DR-093 §5 を精密化 (spec `78fa885ec4ee`): die の忠実表現は無条件 `required` ではなく
`args requires ["--"]` (条件付き) — help/version 単独実行が壊れないため。kuu.mbt 側は positional
の requires decode 配線で対応 (`2e1797f59473`)。

fixture 導出ミスが 1 件あった: `requires-dd-target` の bare-operand case は取り分 dead-end
全保持 (DR-053 §2) により 2 エラー形が正しい。worker が実装との mismatch から指摘し、main が
DR-053 §2 と既存 pin (element 省略慣習) で裏取りして fixture を修正した (spec `ddc8ed6980f4`、
輪郭 fixture 4 本 + die.json を `requires:['--']` の忠実表現へ)。issue close (`3c30c8b038b9`)。

成果: conformance 188/487 → 192/497 (mismatches=0)、moon test 294 本。die.json の failure pin
化 + pin bump (kuu.mbt `3538a0fd3890`) で CI green。

## DR-094: registry 語彙の namespace (SCH-Q3 の kawaz 提案)

由来は SCH バッチ (issue `schema-materialization-and-reason-descriptors`) が抱えていた緊張 —
filter 系 reason は open set (拡張 filter が自由に語彙を足せる) であってほしい一方、組み込み語彙は
closed set として spec が管掌したい (SCH-Q3)。kawaz 原動機は「共通で使う系のエラーは builtin
ネームスペースみたいなのを設ければ共通化はできる」。

決定:

- スコープは registry 識別子全域 (types / filters / accumulators / multiple / env_provider /
  config_provider / completers + installer descriptor の config キー宣言)
- `builtin` ns は spec 管掌の closed set (新規追加は DR/semver 要)、拡張 ns は各提供元が自由に
  語彙を追加できる open set
- bare 名は builtin ns の糖衣 (`trim` = `builtin/trim` 等)。既存の全 fixture/DR/DESIGN.md の
  記述は無傷のまま builtin ns への参照として再解釈される
- 区切り文字は `/`。候補 `:` / `.` / `/` のうち `:` は filter DSL の引数区切り
  (`"in_range:1:100"`) と variant DSL (`"no:set:false"`) で既に使用済み、`.` は link path DSL が
  専有しており、両者とも使えないため `/` を採用

DR-094 を起票 (spec `ec4b44e59ec6`)。`kuu_` prefix は ad-hoc な疑似 ns だったため、正規の ns へ
乗せ換えるリネーム issue を起票した (spec `df5f6ddf5a4e`、`kuu-prefix-factory-rename`)。

## DR-095 + Schema 実体化 (SCH-Q1b/Q2a)

由来は SCH バッチの SCH-Q2/Q3/Q5。DR-066 §射程外・DR-061 §射程外で持ち越されていた
「Schema 実体化と同時に行う」項目の実施。kawaz 裁定 (2026-07-11):
「SCH-Q1b/Q2a 明示、Q3 は DR-094 の ns で解消」。

決定:

- descriptor の `reasons` 宣言の正本は spec 側 `schema/builtin-descriptors.json` (SCH-Q2-a)。
  各実装は「emit する reason 集合 ⊆ spec 宣言集合」で準拠する (DR-054 の unknown-vocab と同族)
- 組み込み filter の reason は builtin ns の closed set、descriptor 単位で列挙 (SCH-Q3-b)。
  DR-066 §3 の kind 別総覧表は維持しつつ、filter 系 reason は各 filter の descriptor が個別に宣言
- signature (`Validate` | `Transform`) が reasons の有無を機械的に決める根拠になる:
  Transform (常に成功) は `reasons: []`、Validate (拒否しうる) のみが非空の reasons を持つ

`schema/descriptor.schema.json` + `fixture.schema.json` + `builtin-descriptors.json` を新規に
作成し、`wire.schema.json` を更新した。fixtures 全 188 件 (当時) で実機バリデートした。
DR-095 + schema 実体化 (spec `8e1f74ef024c`)。issue close (`3f659bdcd727`)。

副産物として issue 2 件を起票 (spec `f31e292e0bc3`): CONFORMANCE の effect op 語彙乖離
(update/remove/splice が未記載) / wire.schema の env 配列・multiple:true のギャップ。

kuu.mbt の `filter_rejected` (現状の全 filter Err 潰し) の細粒度化は SCH-Q4a の導出裁定として
kuu.mbt 側 issue へ切り出した (kuu.mbt `7ea74d033939`、`filter-reason-granularity-dr095`)。

## ハマり所 → 解決策

- kuu.mbt 実装 push を spec の fixture push + pin bump より先に出してしまい、中間 SHA
  (`2e1797f59473`) の CI が旧 pin (`080ac663`) と衝突して fail した。pin bump SHA
  (`3538a0fd3890`) で解消。教訓: DR 実装が既存 fixture の pin を変える場合、「spec fixture push
  → pin bump」を kuu.mbt 実装 push と同時か先に出す
- jj bookmark move の revset `heads(::@ ~ empty())` が、worker の未コミットファイルで `@` が
  非 empty のとき `@` を掴んでしまった。ensure-clean gate が push を止めたため実害はなく、
  `--allow-backwards` で復旧。教訓: bookmark move は `@-` を明示する
- codex-rescue の完了通知に本文が入らないケースがあった。transcript JSONL から python でマーカー
  文字列を含む最長テキストのみ外科的に抽出する (全読み禁止) 方法が有効だった

## 最終状態

kuu.mbt: conformance 192/497 (mismatches=0)、moon test 294 本。

## commit 系譜

spec: `6d4890e7ab83` (DR-093 起票) → `ec4b44e59ec6` (DR-094 起票) → `8e1f74ef024c` (DR-095 +
schema 実体化) → `78fa885ec4ee` (DR-093 §5 精密化) → `ddc8ed6980f4` (fixture 修正 + die.json
更新)。

kuu.mbt: `4867d5fa1b7f` (DR-093 required 属性実装) → `2e1797f59473` (positional の requires
配線) → `3538a0fd3890` (spec fixtures pin bump)。

## 裁定待ち (次セッション向け)

- 導出裁定 2 件の追認 (`short_combine` 解釈A / `require_equal_separator` + `!allow` の
  definition-error 化 — issue `config-derived-rulings-short-combine-eqsep`、kawaz へ説明済み)
- `mbt-workspace-cleanup` の実行可否 (破壊的操作のため要判断)

## 関連

- DR-093 (`docs/decisions/DR-093-required-type-directed-satisfaction.md`、required/requires の
  型委譲充足)
- DR-094 (`docs/decisions/DR-094-registry-vocabulary-namespace.md`、registry 語彙の namespace)
- DR-095 (`docs/decisions/DR-095-builtin-descriptor-reasons.md`、builtin descriptor reasons
  宣言集合の確定)
- issue `kuu-prefix-factory-rename` (`kuu_` prefix を正規 ns へ乗せ換えるリネーム作業)
- issue `filter-reason-granularity-dr095` (kuu.mbt 側、`filter_rejected` の細粒度化)
- issue `config-derived-rulings-short-combine-eqsep` (裁定待ち、追認事項)
- 前回 journal: `2026-07-11-dr092-and-scope-config-implementation.md`
