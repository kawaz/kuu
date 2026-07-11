# DR-095: builtin filter / factory の reasons 宣言集合の確定

> 由来: SCH バッチ (docs/issue/2026-07-08-schema-materialization-and-reason-descriptors.md) の裁定待ち論点 SCH-Q2/Q3/Q5。DR-066 §射程外「canonical factory / 組み込み filter の reason 全列挙 (Schema 実体化と同時)」と DR-061 §射程外「組み込み factory の config キー全列挙 (フェーズ 1 の Schema 実体化で行う)」の実施。kawaz 裁定 2026-07-11 (「SCH-Q1b/Q2a 明示、Q3 は DR-094 の ns で解消」)。

## 決定

### 1. descriptor の reasons 宣言の正本は spec 側 (SCH-Q2-a)

`reasons` 宣言の正本は spec 側 `schema/builtin-descriptors.json` に置く。各実装は「emit する reason 集合 ⊆ spec 宣言集合」で準拠する — 実装は spec が宣言した reason のみを emit してよく、宣言に無い reason を emit してはならない (DR-054 の unknown-vocab と同族の完備性)。実装内部で reasons を再宣言する構造 (per-descriptor の `reasons: [...]` フィールド等) を持つかどうかは実装の自由 (DR-061 §1 の observes と同じ「宣言は素材、実行時強制はしない」姿勢)。

kuu.mbt `filters.mbt` L31-37 の「reasons is deliberately NOT a separate declared list here」という opt-out コメントは、本決定により **「参照実装は spec 宣言集合を信頼して独自の reasons リストを持たない (emit 側の実装選択)」と再整理**される — spec 側に正本が無い状態での opt-out ではなく、正本が spec 側にある前提での省略として位置づけが変わる。

### 2. 組み込み filter の reason は builtin ns の closed set、descriptor 単位で列挙 (SCH-Q3-b)

DR-066 §3 v1 表 (parse 6 種 + constraint 4 種) は kind 別の総覧のまま維持し、filter 系 reason は各 filter の descriptor が個別に宣言する (SCH-Q3-b 案)。DR-094 §2 が解消した緊張 (組み込みは closed / 拡張は open) により、builtin filter の reasons は spec が閉じた集合として列挙・完備管理できる。拡張 filter は自分の ns で新規 reason を自由に追加してよい (open set のまま)。

### 3. 組み込み filter の reasons 全列挙

DESIGN §8 (filter chain) と kuu.mbt `src/core/filters.mbt` (参照実装 registry) を突き合わせ、現存する組み込み filter/collector 全種を列挙する。signature (DESIGN §8.1 の `Validate` | `Transform`) が reasons の有無を機械的に決める根拠になる — **`Transform` (値を無条件に書き換える、失敗しない) は `reasons: []`**、**`Validate` (拒否しうる) のみが非空の reasons を持つ** (PIPELINE.md §5 IO 端点表の「filter (transform): T → T | — (失敗の出口なし)」/「filter (validate): T → T | reject, reason: `too_small` 等」の対比が根拠)。型不一致 (非対象型が filter に渡る) は filter chain の型契約違反 (filter-definition bug、kuu.mbt filters.mbt の "defensive, same rationale" 注記群) であり、正しい定義における failure mode ではないため reasons に含めない。

| filter | signature | reasons | 根拠 |
|---|---|---|---|
| `trim` | Transform | `[]` | 常に成功 (string の前後空白除去、非 string は素通し)。DESIGN §8.1 の Transform 定義通り失敗しない |
| `non_empty` | Validate | `["empty_value"]` | 空文字列を拒否する単一の failure mode。SCH-Q3-b 提示の命名をそのまま採用 (issue 裁定に明記済み) — DR-066 §3 v1 表に対応語彙が無いため本 DR で新設する builtin ns 語彙 |
| `in_range` | Validate | `["too_small", "too_large"]` | DR-066 §2 本文・docs/PIPELINE.md §2 (段 5 reject 表・IO 端点表)・docs/CONFORMANCE.md §2 (`filter` kind の例) の全てが `in_range` の failure mode としてこの 2 語を既に例示している。min 未満 = `too_small` / max 超過 = `too_large` |
| `regex_match` | Validate | `["pattern_no_match"]` | **compile 失敗は本 descriptor の reasons に含めない** — DR-085 §1「pattern の compile 失敗は definition-error (kind=invalid-argument)」/ DR-082 §3「装置引数の値そのものが不正で装置側の構築が失敗する場合は invalid-argument」により、compile 失敗は実行時 reason 体系 (kind=parse/filter/constraint の `reason`) ではなく definition-error の `kind` 側に属する — 両者は DR-083 §5 の「静的に既知は定義時に倒す」原則の対象が違う (pattern は定義の一部で compile 可否は定義時に静的判定できる)。実行時に残る failure mode は「valid にコンパイルされた pattern に対象文字列が不一致」の 1 種のみ、`pattern_no_match` と命名する (SCH-Q3-b 提示の命名を実行時 reason 側にのみ残す) |
| `increment` | Transform | `[]` | count 要素の value_filters/update transform として使われる前提で数値入力のみ受ける。Transform なので失敗しない (§本節冒頭の判定根拠) |
| `unique` (array cell_filter、`Array[Value] → Array[Value]`) | Transform 相当 | `[]` | 累積後の配列から重複除去する純関数、拒否を持たない。kuu.mbt `ArrayFilterDescriptor` の `run` シグネチャに `Result` が無い (`array_filter_unique` 参照) こと自体が failure mode 皆無の実装的裏付け |

`filter_rejected` (kuu.mbt 現状の全 filter Err 潰し) は本 DR の宣言集合には含めない — SCH-Q4 として §5 に扱いを記す。

### 4. canonical factory (types registry) の reasons — DR-094 §9 案 A の新名で宣言

DR-094 §9 案 A (`kuu_number_parser` → `builtin/number_parser` 等のリネーム) を前提に、新名で宣言する。DR-074/075 が個々の reason の帰属を既に確定している:

| factory (新名) | config キー (DR-074 §4) | reasons | 根拠 |
|---|---|---|---|
| `builtin/number_parser` | `number_thousand_sep` (default `["_"]`) / `number_allow_base_prefix` (default `false`) / `number_leading_zero` (default `"decimal"`) | `["not_a_number"]` | number/float 共通の構文不一致 reason (DR-066 §3 v1 表)。float の inf/nan 規定・hex float 等の失敗も全て構文が読めない扱いに帰着し新規語彙を要しない (DR-074 §1/§2/§7) |
| `builtin/int_parser` | `int_round` (default `"error"`、10 種の丸めモード、DR-075 §2) | `["not_a_number", "not_an_integer", "int_out_of_range"]` | DR-075 §6「`kuu_int_parser` descriptor の `reasons` 宣言は `not_an_integer` / `not_a_number` を列挙」が明文の根拠。`not_a_number` は number として全く読めない入力 (`"abc"`)、`not_an_integer` は non-integer な値かつ `int_round:error` 時のみ (DR-066 §3 v1 表の precision 注記)。`int_out_of_range` は DR-075「int の値域は実装定義」節が追加根拠 (host 幅を超える整数値の silent wrap 禁止) |
| `builtin/bool_parser` | `true_values` (default `["true","1"]`) / `false_values` (default `["false","0",""]`) / `case_insensitive` (default `true`) | `["not_a_bool"]` | DR-074 §3「不正 bool 文字列は Error」+ DR-066 §3 v1 表 (kawaz 裁定 2026-07-08 で追加済み語彙)。SCH-Q5 の裁定通り自明 |

### 5. kuu.mbt の `filter_rejected` 潰しの扱い (SCH-Q4)

現状の kuu.mbt 実装は `apply_filter_chain` (filters.mbt L309-330) で全 filter の Err を `filter_rejected` 1 個の reason へ潰している。本 DR の決定 (§2/§3) により、この実装は宣言された builtin reasons 集合 (`empty_value` / `too_small` / `too_large` / `pattern_no_match` 等) を emit していないため、DR-069 の準拠プロファイルにおいて **「reason は fixture では optional 検証」(DR-066 §5) の範囲では現状のまま準拠可能** — reason 未 emit の発生源は許容される (DR-066 §1「未 emit は許容 — その場合 fixture は kind までの検証になる」)。ただし細粒度 reason を検証する新規 fixture を追加する場合、参照実装が kind までの検証にしか応じられない非対称が生じる。

**推奨 (実施は別 issue)**: kuu.mbt の `FilterDescriptor` に宣言集合準拠の細粒度 reason 化 (各 filter の Err arm を `(reason, message)` に分解) を適用する (issue SCH-Q4-a 相当)。ドラフト期 (DR-068 §3) につき破壊的変更の障害はない。本 DR は spec 側の宣言確定のみを射程とし、実装追従は射程外とする。

## 採用しなかった案

### SCH-Q2-b: 各実装が自前で reasons を持つ (spec は語彙表のみ)

完備チェック (「定義に登場する全パーツの reasons の和 vs fixture のカバー」) の実装間 portability が失われる。spec-as-core の方針 (README) と非整合。

### SCH-Q2-c: reason 全集合のみ spec 正本、owns/observes/config は実装自由

descriptor の 4 宣言軸 (DR-061 §1 + DR-066 §2) のうち reasons だけ扱いを変える理由がない。owns/observes/config が既に spec 正本 (DR-061 の記述そのもの) である以上、reasons だけ非対称にする根拠が無い。

### SCH-Q3-a: v1 表に filter 系reason も closed set 統合

filter は open set (拡張 filter が自由に語彙を足す) なので、v1 表 (組み込み最小語彙) に filter reason を混ぜると filter 追加のたび v1 表改訂が要る。DR-094 の ns 分離 (builtin ns だけが closed) の方が筋が良い。

### SCH-Q3-c: `filter_rejected` 潰しを spec で追認

typo 検出・L10n が filter 領域全体で機能しなくなる。DR-066 §2 の完備チェック/typo 検出という導入目的そのものを filter 領域だけ放棄することになり不採用。

### regex_match の compile 失敗を reasons に含める (`pattern_compile_failed`)

issue SCH-Q3-b の例示に含まれていたが、DR-085 §1 / DR-082 §3 を精読すると compile 失敗は definition-error の kind (`invalid-argument`) 側の語彙であり、実行時 `reason` 語彙 (kind=parse/filter/constraint に付随) とは体系が異なる。同一の failure を 2 つの語彙体系に二重登録すると DR-054/066 の「発生源ごとに 1 つの語彙体系」という整理が崩れるため、実行時 descriptor の reasons からは除外する。

## 波及

- `schema/builtin-descriptors.json` (新規): 本 DR §3/§4 の列挙を機械可読形に実体化 (別作業として同時実施、本 issue のタスク 2)
- kuu.mbt: `filter_rejected` の細粒度化 (§5 推奨) は別 issue として追跡が必要 — 本 DR は起票のみ行い実装しない
- DR-094 §9 の実際のリネーム作業 (fixtures 一括更新、DESIGN.md 該当箇所反映): 別 issue のまま (本 DR は新名を spec 宣言としてのみ使用し、既存 fixtures/DESIGN.md の `kuu_number_parser` 等の表記は本 DR で変更しない)
- 既存 fixture `fixtures/piece-filters/reject.json` の `reason: "filter_rejected"` (non_empty の実行時 reject) は、参照実装が §5 の推奨追従を行うまで `empty_value` への更新を行わない (fixture の reason は optional 検証なので現状のまま green)

## 射程外

- `empty_value` 以外に新設が必要な builtin filter reason の網羅的洗い出し (今後 filter が追加されるたびに descriptor 単位で宣言する運用、本 DR は現存 filter のみを対象とする)
- `string` / `path` / `file` / `dir` / `exact` / `datetime` の value_parser reasons: `string`/`path`/`file`/`dir` は DESIGN §3.3 により「バイト列受理・parse 自体は失敗しない」(検証は filters opt-in の関心) なので `reasons: []` が自明だが、`datetime` は canonical 字句仕様が DESIGN.md / DR 群に未確定であり (kuu.mbt にも type 実装が存在しない — `value.mbt` の `Value` enum は `VStr`/`VNum`/`VBool` のみ)、`exact` は value_parser でなく matcher 照合プリミティブ (不一致は「読みが立たない」、PIPELINE.md §5 の「エラーではなく枝が生えない」規約により reason 体系の対象外)。これらの扱いは `schema/builtin-descriptors.json` 実体化タスク側で datetime 字句仕様確定 (未着手) を待って追記する
- kuu.mbt 側の細粒度 reason 実装 (§5)

## 関連

- DR-066 (reason コード層 — v1 表 / descriptor 宣言軸 / 排他所有 prefix 却下、本 DR は §射程外「canonical factory / 組み込み filter の reason 全列挙」を実施)
- DR-061 (registry descriptor — reasons を含む 4 宣言軸、本 DR は §射程外「組み込み factory の config キー全列挙」を実施)
- DR-094 (registry 語彙の namespace — builtin/拡張 ns 分離が SCH-Q3 の緊張を解消、§9 案 A のリネーム新名を本 DR が使用)
- DR-074 (number/bool canonical 字句 — `not_a_number`/`not_a_bool` の帰属根拠、factory config キー)
- DR-075 (int 値空間判定 + int_round — `not_an_integer`/`int_out_of_range` の帰属根拠、§6 が reasons 宣言を明文化)
- DR-085 (regex_match host dialect — compile 失敗と実行時不一致の層分離、本 DR §3 の regex_match 行の根拠)
- DR-082 (definition-error fixture format — kind=invalid-argument の定義、compile 失敗の帰属先)
- DR-083 (multiple 宣言 default — §5「静的に既知は定義時に倒す」原則、regex_match compile 失敗の層分離に援用)
- docs/PIPELINE.md (§2 filter chain 7 段の reject 表、§5 IO 端点早見表 — Validate/Transform の failure mode 有無の根拠)
- docs/CONFORMANCE.md (§2 filter kind の reason 記述例)
- docs/issue/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q2/Q3/Q4/Q5 の裁定待ち論点、本 DR がその決着)
