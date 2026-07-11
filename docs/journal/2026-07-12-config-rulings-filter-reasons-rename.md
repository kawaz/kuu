# §7.2 config 裁定の追認・definition-error 化 + CONFORMANCE/Schema 追随 + filter reason 細粒度化 + kuu_ prefix リネーム完遂

前回 journal (`2026-07-12-dr093-095-required-ns-schema.md`) の「裁定待ち」に積んであった 2 件
(config 導出裁定の追認、`short_combine` / `require_equal_separator` の扱い) と、SCH バッチの
副産物 issue 2 件 (CONFORMANCE op 語彙乖離、wire.schema の未対応構文)、そして DR-095 由来の
filter reason 細粒度化 (SCH-Q4a) と DR-094 §9 の `kuu_` prefix リネームを、この 1 セッションで
すべて完遂させた。issue は kuu (spec) 側 active ゼロ、kuu.mbt 側は新規発見の bool_parser 未実装
issue 1 件のみが残る。

## 1. short_combine の存在意義議論と維持確定

kawaz からの挑戦: 「combine 禁止した short は `long_prefix:'-'` の long で書けるのでは。混在の
衝突も ambiguous エラーで良い」。AI 側は find コマンドの `-name` 例で試算したが筋の悪さ (long
prefix 化すると値の直接付着 `-p80` のような書き方が失われる) に気づき、一旦 `short_combine`
削除を推奨する方向に傾いた。

最終的に kawaz が維持を確定させた根拠は gcc の `-O2` / `-Wall` 型: **値の直接付着はできるが
クラスタ束ね読みは持たない**という組み合わせは、long (`=` か空白区切りしか値を持てない) では
表現できず、short でしか書けない。`short_combine:false` はこの型を成立させるための独立した
管掌軸であり、long_prefix 化とは代替関係にない。スコープ (グローバル config) と要素単位
override の両対応は既に実装済みだった。

この議論の過程で kawaz からメタ原則の確認があった: 「同じ CLI 文法に複数の表現形が併存して
良い。整合していればどちらでも採用可。エラーの効き方の差はアプリ開発者の関心」。DR-093 §5 の
`{"type":"dd","required":true}` (無条件 required) と `positionals` の `requires:["--"]` (条件付き
requires) が die の忠実表現として 2 通り併存しているのが先例であり、`short_combine:false` と
`long_prefix:"-"` の関係も同型の「表現形の複数併存は正、優劣ではなく用途選択」の実例として
整理された。

## 2. eq-separator 矛盾チェックの definition-error 経路移設

`require_equal_separator:true` + `allow_equal_separator:false` の組み合わせは全 long option が
入口を失う静的矛盾なので definition-error、という裁定 (DR-083 §5 の「定義時に静的に既知の
不整合は definition-error」の筋) 自体は前セッションで導出済みだったが、実装 (kuu.mbt) はこの
チェックを conformance の decode 層 (`DecodeSkip`) に置いていたため fixture で pin できない
状態だった。

kuu.mbt `9402cb65` (`refactor(core): eq-separator 矛盾チェックを decode 層から
definition-error 経路へ移設`) で `collect_eq_separator_conflict` を新設し、long エントリ持ち
要素へ `DInvalidRange` を全列挙 (commands 再帰込み) する形で installer の collect 系へ移設。
`validate_scope_config` から当該チェックを撤去 (DR-091 §3 の `long_prefix:''` 側の判定は残置)。
spec 側は `fixtures/definition-error/config-eq-separator-conflict.json` で
`query:definition_error` として pin (spec `f2d92ac5`、long 持ち全要素へ全列挙、short のみは
対象外の negative pin)。

教訓: **spec が definition-error と規範化した検査は conformance ハーネスの decode 層に置かない**
— decode 層の判定は fixture の `query:definition_error` で pin できず、規範化した拘束力が
実質失われる。

DESIGN §7.2 への明文化は spec `ea60b7e0`
(`short_combine` 管掌範囲 + eq-separator 矛盾の明文化 + short-combine-off 輪郭 fixture 5 case)。
kuu.mbt pin bump は `7341c2a8`。issue `config-derived-rulings-short-combine-eqsep` を close
(spec `6737fec8`)。

## 3. CONFORMANCE op 語彙追随と「schema でなく fixture が悪い」判定

前回 journal の副産物 issue 2 件 (`conformance-effect-op-vocab-drift` /
`wire-schema-missing-env-array-multiple-bool`) を消化した。

**CONFORMANCE.md §2** の effect op 語彙表は `set`/`default`/`unset`/`empty` の 4 op のみ記載
されていたが、実態は DR-077 の `update` (+ `transform`/`args` フィールド) と DR-080 の merge
accumulator 由来 `remove`/`splice` を含む 7 op。表を実態に合わせて更新し、各 op に fixture
実例を紐付けた。

**wire.schema.json** の「未対応構文 2 件」は、調査の結果スキーマの実装漏れではなく **fixture
側の非仕様構文**だと判明した:

- `env: ["C"]` (配列形) — spec 正本に規定ゼロの表記揺れ、`env: "C"` (文字列形) が canonical
- `multiple: true` (boolean 形) — DR-008 で kawaz が過去に明示不採用にした形、`multiple:
  "append"` が canonical

schema 自体は変更せず、fixture 4 箇所 (`constraints-parse/requires-bool-target*.json` の env
配列形、`definition-error/*.json` の `multiple:true`) を canonical 形へ修正。fixtures 全 194
件がスキーマバリデート pass することを実測確認した。

教訓: **schema ギャップ調査は「schema を直す」より先に「spec 正本に規定があるか」を確認する**
— 規定が無ければスキーマでなく fixture 側の誤り。

両 issue を close (spec `beeae6f7`)。実装 commit は spec `6216e2da`
(`docs+fixtures+schema: CONFORMANCE §2 の op 語彙を実態に追随 + 非仕様構文 4 箇所を canonical
形へ修正`、docs/fixtures/schema をまとめて更新)。

## 4. filter reason 細粒度化 (SCH-Q4a 完遂)

DR-095 が descriptor 単位で確定していた組み込み filter の reason 集合 (`in_range` →
`too_small`/`too_large`、`regex_match` → `pattern_no_match`、`non_empty` → `empty_value`) に、
kuu.mbt `src/core/filters.mbt` の `apply_filter_chain` が追従していなかった (全 `Err` を
`filter_rejected` 1 種類に潰していた) ギャップを解消した。

kuu.mbt `8d2f1265`
(`feat(core): filter 失敗 reason の細粒度化 — DR-095 の descriptor 宣言に追従`):

- `FilterDescriptor` に `reasons` フィールドを追加
- `apply_filter_chain` の `Err` を `(reason, message)` 化
- `non_empty` → `empty_value` / `in_range` → `too_small`・`too_large` / `regex_match` →
  `pattern_no_match` を emit
- 宣言外の防御的失敗は `filter_rejected` へ fallback
- emit ⊆ 宣言集合の subset 不変を wbtest で固定

spec 側は fixture 10 pin + why を DR-095 語彙へ更新 (spec `175c9795`)、pin bump は kuu.mbt
`73c014e2`。issue `filter-reason-granularity-dr095` (kuu.mbt 側) を close。この時点で
conformance 194/503/0/0、moon test 300 本。

## 5. kuu_ prefix リネーム完遂 (DR-094 §9 案 A)

`kuu_number_parser` / `kuu_bool_parser` / `kuu_int_parser` という ns 導入前の ad-hoc 疑似
prefix を、DR-094 §9 案 A (`builtin/number_parser` 等への改名、bare 糖衣 `number_parser` 等も
併存) へ乗せ換えた。作業順序は pin 制約で固定: **kuu.mbt 実装 (新旧両名受理) → spec fixture
更新 push → pin bump**。

kuu.mbt `2b05367a`
(`feat(core): factory 名を DR-094 案 A の新名へ — bare/builtin ns/旧 kuu_ の 3 形解決`) で
`dec_types` を bare/builtin ns/旧 `kuu_` の 3 形受理に対応。spec 側は fixtures 17 箇所
(`int-hex-value-space.json` ×3 / `int-round-modes.json` ×12 / `number-base-prefix-optin.json`
×2) + DESIGN.md の該当箇所を新名へ一括更新 (spec `37aa3b3d`)。pin bump 後、kuu.mbt `811b88f0`
(`refactor(core): 旧 kuu_* factory alias を撤去 — bare/builtin ns の 2 形のみ受理、旧名は
unsupported factory`) で移行 alias を撤去し、旧名不受理を wbtest で positive/negative 両方固定。

過去 DR 本文 (DR-061 §3 / DR-074 §4 / DR-075) の `kuu_` 言及は決定当時の記録としてそのまま
無傷 (書き換え対象は現行規範 DESIGN.md と fixtures のみ)。issue `kuu-prefix-factory-rename`
を close (spec `9636aeef`)。

副産物発見: 調査中に **`bool_parser` factory がそもそも未実装**だと判明した。`dec_types` に
bool 分岐が無く、`TypeShadow` に bool 用 config フィールドが無いため、configurable factory の
config キー (`true_values` / `false_values` / `case_insensitive`、DR-074 §3/§4) が wire 経由で
decode できない。bool の canonical default 挙動自体 (`value_parser` 直実装) は動いているが、
方言 config を渡す経路が丸ごと欠けている。kuu.mbt 側 issue `bool-parser-factory-unimplemented`
を起票 (open、bug category)。

## ハマり所 → 解決策

- 同一 kuu.mbt workspace で impl-filter-reasons が作業中 (未コミットの実装が working copy に
  ある状態) に main が `just test` を実行し、live 結合で mismatches=10 に見えた。一瞬「自分の
  fixture 修正が原因か」と誤認しかけたが、live 結合環境では走行中の他 writer の未コミット変更が
  そのまま test に混ざる。**誰の変更が test に映っているかを `jj status` で確認してから解釈する**
  習慣が必要
- jj bookmark move の revset `heads(::@ ~ empty())` が、worker の未コミットファイルで `@` が
  非 empty のとき `@` を掴んでしまう問題が今回も発生した (前回 journal と同一の再発)。
  `ensure-clean` gate が毎回止めてくれているため実害なし、`@-` の明示が安全という結論も同一

## 最終状態

conformance: decoded=194 / ran_cases=503 / skipped=0 / mismatches=0。moon test 306 本。

残 issue は kuu.mbt 側 `bool-parser-factory-unimplemented` のみ (spec 側 active issue はゼロ)。
idea 2 件 (`filter-bundle-bulk-registration` / `tty-value-as-injected-source`) は寝かせ中のまま。
origin 残存枝の掃除は「また今度」。

## commit 系譜

spec: `ea60b7e0` (DESIGN §7.2 明文化 + short-combine-off fixture) → `f2d92ac5`
(config-eq-separator-conflict fixture pin) → `6737fec8` (issue close) → `6216e2da`
(CONFORMANCE op 語彙 7 op 化 + 非仕様構文 4 箇所 canonical 修正) → `beeae6f7` (issue 2 件 close)
→ `175c9795` (filter reason 細粒度化 fixture 10 pin) → `37aa3b3d` (factory 名リネーム fixtures
17 箇所 + DESIGN) → `9636aeef` (issue close)。

kuu.mbt: `9402cb65` (eq-separator 矛盾 definition-error 経路移設) → `7341c2a8` (pin bump) →
`8d2f1265` (filter reason 細粒度化) → `73c014e2` (pin bump) → `2b05367a` (factory 名リネーム
新名対応) → `1c7c1954` (pin bump) → `01fe590e` (bool-parser-factory-unimplemented issue 起票)
→ `811b88f0` (旧 kuu_* alias 撤去)。

## 関連

- DR-093 (`docs/decisions/DR-093-required-type-directed-satisfaction.md`、§5 の
  required/requires 2 表現併存がメタ原則の先例)
- DR-094 (`docs/decisions/DR-094-registry-vocabulary-namespace.md`、§9 案 A が今回のリネーム
  実装の根拠)
- DR-095 (`docs/decisions/DR-095-builtin-descriptor-reasons.md`、filter reason 細粒度化の宣言
  集合の正本)
- issue archive: `config-derived-rulings-short-combine-eqsep` /
  `conformance-effect-op-vocab-drift` / `wire-schema-missing-env-array-multiple-bool` /
  `kuu-prefix-factory-rename` (いずれも spec 側 archive)、`filter-reason-granularity-dr095`
  (kuu.mbt 側 archive)
- kuu.mbt 側 issue `bool-parser-factory-unimplemented` (open、次セッション対応候補)
- 前回 journal: `2026-07-12-dr093-095-required-ns-schema.md`
