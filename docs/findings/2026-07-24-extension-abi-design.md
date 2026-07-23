# extension ABI 設計 (M2b) — builtins @engine 参照の全数分類と切り出しリスト

> **改訂 (M2c blocker 解決、2026-07-24)**: 初版の「extension が全型の定義側」は MoonBit の
> package privacy と矛盾する (evaluator が opaque Node を match できない / installer view の
> 契約発明が要る) と M2c 実装が停止。**§8 に実機検証 6 本に基づく 2 層化の解決設計を追記** —
> §2 の型リストは §8.3 の層割当が正 (初版の §2.1「trait 8 本全部 extension」は §8 が修正)。
> §4 の「Node opaque 再輸出」は撤回し §8.2 の pass-through 方式に置き換える。

> 由来: API 磨き第 2 サイクル プラン (`docs/findings/2026-07-24-api-polish-2-plan.md`) §1.1 /
> §5 M2b、AP2-Q3=b 裁定 (拡張 ABI package を本サイクルで設計)。本書が M2c (骨格破壊) の入力。
> 分類の一次資料は kuu.mbt `src/builtins/pkg.generated.mbti` (@engine 参照 75 箇所 / 型 28 種、
> 機械カウント) と `src/engine/pkg.generated.mbti` (trait シグネチャと transitive 閉包)。
> 判定器はプラン §1.1 の「descriptor 宣言軸 / DR-107/111/114 の ABI 節に現れるか」。

## 1. builtins が参照する engine 型 28 種の全数分類

参照回数は mbti の出現数 (計 118 出現、行数 75)。判定列 = extension (公開 ABI) / internal
(評価器内部) / **opaque** (extension に置くがフィールド/variant 非公開のハンドル)。

| 型 | 参照 | 判定 | 根拠 |
|---|---|---|---|
| `TypeExt` | 19 | extension | DR-107 role `type_parser` の trait 本体 |
| `Node` | 18 | **opaque** | 評価器内部座標だが、factory (`bool_arg` 等 14 関数) の戻り値・installer 植え付け面に不可欠。§4 の手当参照 |
| `InstallerExt` | 17 | extension | DR-107 role `installer`。ただし decode 面の transitive 閉包が重い (§5 残露出 3) |
| `FnInvocation` | 12 | extension | DR-114 §6 の wire DSL 直訳 |
| `BoolConfig` | 6 | extension | descriptor config 軸 (bool_* キー群、DR-074/DR-100) の担体 |
| `RoundMode` | 5 | extension | descriptor config 軸 `int_round` (DR-075) の担体 |
| `Registry` | 5 | extension | 登録口そのもの (register_* 11 口 + lookup_* 11 口)。フィールドは既に private |
| `FilterDescriptor` | 5 | extension | DR-107 role `filter` の descriptor 実体 + `filter_descriptor()` 構築子 |
| `Definition` | 4 | internal (§5 残露出 3) | 宣言 snapshot。installer の `DefsView` 経由でのみ拡張に見える |
| `AccumulatorExt` | 3 | extension | DR-111 §2 の 2 相 ABI (resolve_cli は宣言対象外だが trait には要る) |
| `Scope` | 2 | internal | lowering 産物 (評価器内部)。`lower_definition*` は玄関専用口へ (§3) |
| `MatcherExt` | 2 | extension | engine 内蔵 11 項の pluggable matcher 契約 (DR-110) |
| `DefError` | 2 | extension | installer の `collect_defs_errors` 戻り値 (DR-054 §4 wire 語彙) |
| `CompleterExt` | 2 | extension | DR-111 §4 の named capability marker (name のみ) |
| `CollectorExt` | 2 | extension | DR-107 role `collector` |
| `ArrayFilterDescriptor` | 2 | extension | DR-106/107 の domain=array filter |
| `Variant` | 1 | internal | `classify_long_spelling` (builtins 内部ヘルパ) の戻り値のみ。builtins の当該関数を非公開化して internal 落ち |
| `Value` | 1 | extension | wire 値語彙 (DR-107 io_type の terminal) |
| `OrBranch` | 1 | internal | `or_branch_node` (lowering 内部) — 同上、非公開化 |
| `ExportKey` | 1 | internal | `build_export_map` は玄関/内部の関心。builtins 公開面から外す |
| `ErrorKind` | 1 | extension | `ConfigValueError.kind` 経由 (wire kind 語彙) |
| `EntityExt` | 1 | extension | candidate 装飾 hook (completer 属性の配線先) |
| `ElementDef` | 1 | internal (§5 残露出 3) | `element_head` は lowering 内部 — 非公開化 |
| `EffectOp` | 1 | extension | wire 6 op 語彙 (`effect_mark` 経由) |
| `DefErrorKind` | 1 | extension | DefError の kind |
| `ConfigVal` | 1 | extension | config provider 契約 (DR-050 §2) |
| `CellFnDescriptor` | 1 | extension | DR-114 の cell_fns descriptor |
| `AttachMode` | 1 | extension | short_attached_value の config 軸 (descriptor 宣言軸) |

**集計**: extension 20 種 / internal 7 種 / opaque 1 種 (Node)。internal 7 種のうち 5 種
(Variant / OrBranch / ExportKey / ElementDef / Scope) は builtins の**当該公開関数を非公開化
するだけで消える** (拡張作者向けでない lowering 内部ヘルパが public に居ただけ)。残る
Definition と Node が本設計の芯 (§4 / §5)。

## 2. transitive 閉包 — extension package の確定型リスト

§1 の extension 20 種から trait シグネチャ・descriptor 構築子を辿った閉包。**41 型 + trait 8 本**:

### 2.1 Ext trait 8 本 (全 pub(open))

`TypeExt` / `InstallerExt` / `MatcherExt` / `AccumulatorExt` / `CollectorExt` / `CompleterExt` /
`EntityExt` / `CapabilityExt` (CapabilityExt は builtins 非参照だが kuu 玄関の capability 2 関数
が要る — プラン §1.2a)。`NodeExt` は **internal に残す** (Registry の register_node/lookup_node
口ごと非公開化 — node 種の追加は評価器の walk 対象追加であり v1 拡張 ABI の射程外。
lookup_node を使う engine 内部は internal 内で完結する)。

### 2.2 descriptor と構築子

`FilterDescriptor` / `ArrayFilterDescriptor` / `CellFnDescriptor` + 構築関数
(`filter_descriptor` / `array_filter_descriptor` / `cell_fn_descriptor` / `cell_fn_parameter`)、
宣言軸の enum: `FilterSignature` / `FnFallibility` / `CellFnOutput` / `CellFnParameterKind` /
`CellFnRepetition` / `CellFnArity` / `CellFnParameter`。

### 2.3 fn ABI (DR-114)

`FnInvocation` / `FnInvocationForm` / `FnCall` / `FnArg` / `FnOutput` / `FnReason` / `FnCtx`
(opaque、as_filter/as_effect/as_default + env/token 窓) / `FilterCtx` / `EffectCtx` /
`DefaultCtx` / `CellSentinel` / `DefaultFnCall`。

### 2.4 wire 語彙・値

`Value` / `ConfigVal` / `ResultValue` / `EffectOp` / `Source` / `ErrorKind` / `DefError` /
`DefErrorKind` / `TypeParseFail` / `FnReason` / `ParseError` (Matcher/Accumulator ABI が運ぶ)。

### 2.5 呼び出し文脈 (opaque)

`Registry` (登録口。register_node 除く 10 register + 10 lookup) / `Ctx` (matcher 用、
token_at/is_complete_mode/extensions) / `SeatCtx` (TypeExt default_seat_resolver 用) /
`Branch` / `Binding` / `Candidate` (§5 残露出 1-2 参照) / `InstallBuilder` / `InstallChild` /
`InstallOutput` / `DefsView` / `DecodeCtx` / `DecodedOwnedDeclaration` / `OwnedDeclaration`
(+ `LongDeclaration` 等の従属、installer decode 面 — §5 残露出 3)。

### 2.6 config 担体

`BoolConfig` / `RoundMode` / `AttachMode` / `EqSepMode` (+ `bool_config_canonical` /
`round_mode_of` / `attach_mode_of` / `eq_sep_mode_of` の解決ヘルパ)。

## 3. builtins 公開面の再編 (extension の型だけで書けるか)

builtins の公開関数 70 本を 3 分類:

1. **extension の型だけで書ける (公開維持)**: resident factory 群 (`*_type` 11 本 /
   `*_installer` 15 本 / `*_completer` 2 本 / `*_accumulator` 3 本 / `*_collector` 2 本 /
   filter descriptor 6 本 / `cell_fn_descriptors` / matcher 構築 4 本 (`eq_split` /
   `short_combine` / `eq_entry` / `short_entry`) / config ヘルパ 4 本) — Node を返す arg
   factory 14 本も **Node が opaque であれば** extension の語彙で成立 (§4)
2. **非公開化 (internal 落ち)**: `classify_long_spelling` / `or_branch_node` / `element_head` /
   `node_resident_name` / `build_export_map` / `parse_filter_shorthand` (玄関/lowering 内部
   ヘルパ。拡張作者の用事がない — 3 顧客検証 §6 で不要を確認)
3. **玄関専用口へ移動**: `lower_definition` / `lower_definition_snapshot` (`Scope` /
   `LoweredDefinition` を返す lowering の総口 — 呼ぶのは kuu 玄関 `parse_definition` のみ。
   internal 側に置き、builtins からも外す)

## 4. Node 露出の手当 — opaque ハンドル + InstallBuilder 寄せ

**方針: Node を extension で「構築はできるが分解できない」opaque 再輸出にする。**

- extension の Node は type のみ公開 (variant 18 種は不可視)。構築経路は §3-1 の arg factory
  14 本 (`string_arg` / `typed_arg` / `bool_arg` / ...) と installer 植え付け面のみ
- installer の `apply(InstallBuilder)` は現行どおり: `InstallOutput::new(Array[Node])` で
  greedy 列を組む — Node は「factory が返した値をそのまま置く」usage に限定され、拡張作者が
  variant を match / 合成する経路は塞がる。設計スケッチ (M2c での形):

```
// extension 側 (概念形)
type Node                          // opaque
pub fn typed_arg(name, ty, filters) -> Node      // 14 factories
pub fn InstallOutput::new(Array[Node]) -> InstallOutput
pub fn InstallBuilder::plant(Self, InstallOutput) -> Unit   // 現 output() setter 系を寄せる
```

- **canonical builtins 自身は internal の Node variant に触ってよいか**: 触らない側に倒す —
  DR-110 の「builtins は公開 extension interface のみ使用 = 3rd party と差し替え可能」が
  既にこれを要求している。builtins 内で variant match している箇所が M2c で洗い出されたら、
  不足している構築/観測 API を extension に足すか internal へ移す (どちらかは箇所ごとに判定、
  DR-110 の層契約が判定器)

## 5. 残露出の列挙 (M2c での個別判断素材)

1. **`Candidate` の内部座標 3 フィールド** (`path` / `link` / `fire_path`): MatcherExt の
   `candidates()` / `interpret` の Branch、EntityExt の `complete_candidate` が engine の
   12 フィールド pub(all) Candidate を運ぶ。DR-104 §2 が wire から明示除外した内部座標が
   拡張 ABI に露出する。**推し**: extension の Candidate はフィールド非公開 (pub struct) +
   構築子 `Candidate::trigger` / `Candidate::pending_value` (既存、内部座標は構築子が既定値で
   埋める) + 読み取りは wire 9 フィールドの getter のみ — matcher 作者は内部座標を触らない
   (経路座標は interpret の継続閉包が運ぶ)
2. **`Binding` / `Branch` / `ParseError` の pub(all)**: Matcher/Accumulator ABI の本体で
   露出自体は正当 (DR-111 が accumulator の resolve_cli を「宣言対象外だが ABI には存在」と
   既に整理)。ただし `Binding.link` / `at_pos` 等の parser bookkeeping フィールドへの書き込みが
   拡張作者に開く。**推し**: extension では read + 公式構築子 (`Binding::new` / `effect`) のみの
   pub struct 化。フィールド直書きは internal 専権
3. **InstallerExt の decode 面の重い閉包**: `DefsView::definition()` が `Definition` (9 フィールド
   pub(all)) を返し、その中の `ElementDef` (66 フィールド) / `CommandDef` / `AliasDef` /
   `ScopeDeclaration` まで transitive に露出する。B1 の「フィールド 1 個追加が破壊変更」が
   installer 拡張面にだけ残る形。**推し**: v1 では `Definition` / `ElementDef` を extension で
   opaque 化し、installer が実際に読む観測面 (vocab 回収に要る getter — M2c で builtins の
   15 installer が読むフィールドを全数列挙して最小 getter 集合を確定) だけを開ける。getter
   集合が 66 フィールドの大半に及ぶ場合は「installer 拡張 ABI は v1 実験的 (semver 保証外)」
   の注記で B1 を封じる fallback — どちらに倒すかは M2c の列挙結果を見て統括裁定
4. **`Registry::new()` + 空 registry**: 拡張作者が canonical を経由しない素の Registry を組んで
   玄関に渡せる (canonical 語彙が全欠落した assembly)。DR-110 の subset assembly として正当な
   自由であり露出のままとする (露出だが問題でない、の明示)

## 6. 3 顧客の机上検証

### 6.1 bigint 型拡張 (REV-Q2 の言語側回収) — **登録・配線は書ける。値運搬に既知の留保**

- 書く物: `TypeExt` impl (`name`=`"ext/bigint"`、`parse_token` で 10 進字句を検証) +
  `Registry::register_type` + descriptor (role `type_parser`)。§2 のリストで全て賄える
- **留保 (新規でなく既知)**: `parse_token` の戻り `Value` は `Number(Double)` で任意精度を
  運べない — bigint 値は `Value::String` で運ぶ (canonical 化した 10 進文字列) のが v1 の形。
  wire (result/effects の operand) も JSON number で書けない値なので string 運搬は wire 側とも
  整合する。`Value` への variant 追加は wire 語彙の major であり当該拡張 DR の関心 (プラン
  §4.2 の既存留保どおり)。candidate.type への写像 kind 宣言軸も同 DR (DR-104 §2 留保)
- 結論: extension リストへの追加型は**不要**

### 6.2 custom completer — **書ける (最小)**

- 書く物: `CompleterExt` impl (name のみ) + `Registry::register_completer` + descriptor
  (role `completer`、invocation none 固定 — DR-111 §4)。wire の `completer` 属性が名前で
  引く named capability marker なので、trait は name 以外の面を持たない。追加型不要

### 6.3 自作 type 登録 (definitions.types の factory 参照先) — **書ける**

- 書く物: 6.1 と同形の `TypeExt` impl + descriptor。factory config (BoolConfig / RoundMode
  相当の自作 config) は descriptor の config 軸宣言 + impl 内部の保持で完結 — engine 型への
  依存は `Value` / `TypeParseFail` / `SeatCtx` (default 席の独自解決を持つ場合) のみで
  §2 リスト内。追加型不要

**3 顧客とも §2 の確定リストで書ける。不足型なし** (6.1 の Value 運搬は型不足でなく当該拡張
DR に委ねられた設計判断)。matcher / installer / accumulator 拡張は 3 顧客の外だが、trait と
従属型はリストに含めた (§5 残露出 2-3 の手当が M2c 前提)。

## 7. M2c への引き渡し (checklist 差分)

- extension package の moon.pkg: `src/extension/` は internal/engine を import し再輸出はしない
  (MoonBit に再輸出構文はない — extension が型の**定義側**になり、internal/engine が extension
  を import する向きに倒す。つまり「engine から extension へ型を物理移動」が正しい向き。
  §2 リストの型 + trait を extension へ移設し、評価器 (internal) が extension を import する)
- 完了判定 grep (プラン M2c 判定に追加): `src/extension/pkg.generated.mbti` に `Node` の
  variant / `Scope` / `Entity` / `ElementDef` フィールドが現れない。`@internal` 参照 0 件
- §5-1/2 の Candidate / Binding の pub struct 化は kuu 玄関 (§1.2 の新 Candidate) と二重装置に
  なる — 玄関の Candidate (wire 9 フィールド) と extension の Candidate (matcher ABI 用) は
  **別型として重複を受容** (利用者面と拡張面で関心が違う。統合すると内部座標が利用者面へ
  逆流する)
- §5-3 の installer getter 全数列挙は M2c 冒頭タスク (builtins 15 installer の Definition
  読み取りフィールドを grep 列挙 → 統括へ裁定素材として報告)

## 8. M2c blocker の解決 — 定義位置と露出の分離 (2 層設計、実機検証済み)

### 8.1 前提の実機検証 (moon 0.1.20260709、scratchpad probe プロジェクト 6 実験)

| # | 検証 | 結果 |
|---|---|---|
| 1 | extension 定義の opaque struct を internal package が読む | フィールド直読み不可、観測 fn 経由のみ (= evaluator の全面 match は書けない — blocker 1 の追認) |
| 2 | **internal package 定義の pub(all) enum を extension package が import し、pub fn のシグネチャに載せる** | **可能** (moon check green、mbti に `@eng.Node2` として出る) |
| 3 | 外部モジュールが extension 経由で internal 定義型の**値**を受け取り・持ち回り・渡し戻す | **可能** (値の透過は privacy 制約に当たらない) |
| 4 | 外部モジュールが internal package を直接 import | **不可** (`Cannot import internal package ... due to internal visibility rules`) — variant match / フィールド読みの前提となる import 自体が拒否される |
| 5 | 外部モジュールが internal 型の値へ dot-call (import なし) | **不可** (`Cannot call method of type ...: package ... is not imported`) |
| 6 | extension 定義 trait のメソッドシグネチャに internal 型を含め、外部が impl | **可能** (impl 側は型注釈なしのパラメータで受け、値を透過する分には触れない) |

**帰結**: team-lead 仮説のとおり「定義位置と露出は別の話」が実機で成立する。internal 定義の
型は、(a) extension のシグネチャに**現れてよく**、(b) 外部はその値を**運べる**が、(c) 分解
(match / フィールド / メソッド) は**一切できない** — つまり **internal 定義 + extension
signature 経由の pass-through が、狙っていた「構築できるが分解できない opaque」をコンパイラ
強制で無償実現する**。extension 側に opaque wrapper 型を立てる必要も、evaluator 用の
eliminator/visitor を発明する必要もない。

### 8.2 解決設計: 型は internal/engine 定義のまま、extension は「関数と trait の層」

初版 §4 の「extension が Node の定義側 (opaque struct)」を撤回し、次の 2 層に置き換える:

- **internal/engine = 全評価器型の定義側** (現状の engine から型を動かさない)。Node / Scope /
  Entity / ElementDef の pub(all) も **internal 内では現状のまま維持** — internal package の
  中身は外部から import 不能 (実験 4) なので、pub(all) の破壊性 (B1) は internal 境界が丸ごと
  吸収する。evaluator / outcome / cont の全面 pattern match は**無変更で成立** (blocker 1 は
  「型を動かす」前提が生んだ問題で、動かさなければ存在しない)
- **extension = trait 定義 + factory / 構築子 / descriptor 関数の層**。Ext trait 8 本と
  descriptor 構築子・arg factory・matcher 構築子・config ヘルパを engine / builtins から
  extension へ移す。シグネチャに internal 型 (Node / Binding / Candidate...) が現れるのは
  実験 2/6 のとおり合法で、拡張作者はそれらを **pass-through 値**として扱う (分解経路は
  コンパイラが塞ぐ)
- **import 向き**: internal/engine は extension を import **しない** (逆向き)。extension が
  internal/engine を import する — 初版 §7 の「engine が extension を import する向き」も
  撤回 (型移動が無いので依存の反転自体が不要になり、循環リスクも消える)。
  ただし **trait は extension 定義**なので、engine 側で trait 束 (`&InstallerExt` 等) を
  受ける座席 (Registry / lowering) は trait 定義への参照が要る — ここだけ注意が要り、
  解決は「**Registry と trait を同じ extension package に置く**」(§8.3)。Registry の
  lookup/register は trait を運ぶだけで evaluator 型の分解をしないため extension 居住が
  自然で、evaluator は `@ext.Registry` を値として受け取り lookup する (実験 3 の透過と同型)

依存グラフ (M2c の moon.pkg 構成):

```
internal/engine  ←─ extension  ←─ builtins ←─ kuu (玄関) ←─ 利用者
       ↑________________________________________|   (kuu は internal も import 可)
```

- extension: internal/engine を import。trait 8 本 + Registry + descriptor/factory/config 関数
- builtins: extension のみ import (DR-110 の「公開 extension interface のみ使用」を
  moon.pkg レベルで機械強制 — internal を import しないことが 3rd party 差し替え可能性の証明)
- kuu 玄関: extension + internal/engine を import (lowering 総口・outcome 変換は internal 直)
- 外部拡張作者: extension を import (builtins は参考実装として読む)

### 8.3 §2 型リストの層割当の修正

§2 のリストのうち**型**は原則 internal/engine 定義のまま。extension が**定義**するのは:

| extension 定義 | 中身 |
|---|---|
| trait 8 本 | `TypeExt` / `InstallerExt` / `MatcherExt` / `AccumulatorExt` / `CollectorExt` / `CompleterExt` / `EntityExt` / `CapabilityExt` (engine から移動。シグネチャ中の Value / Candidate / Binding / Branch / Ctx / SeatCtx / InstallBuilder / DefsView / DecodeCtx / DecodedOwnedDeclaration / TypeParseFail / ParseError / ResultValue は internal 参照のまま) |
| `Registry` | trait 束の登録・lookup (trait と同居が必須 — §8.2)。register_node/lookup_node は非公開化 (初版 §2.1 どおり NodeExt は ABI 外)。**注意**: `NodeExt` trait 自体は engine の node walk が使うため internal に残す — Registry から node 口を外すことで extension は NodeExt を知らずに済む |
| descriptor 3 型 + 構築子 | `FilterDescriptor` / `ArrayFilterDescriptor` / `CellFnDescriptor` は invoke を engine が呼ぶが、struct 定義自体が closure 保持のレコードで evaluator 型を match しない — trait と同じ理由で extension 定義に移せる。宣言軸 enum (FilterSignature 等 §2.2) も同移動 |
| factory / 構築子 / config ヘルパ関数 | arg factory 14 本・matcher 構築 4 本・`Candidate::trigger` / `pending_value`・`Binding::new` / `effect`・`FnCtx` 観測窓・config 担体 (`BoolConfig` / `RoundMode` / `AttachMode` / `EqSepMode` は純データなので extension 定義へ移してよい — evaluator は値を読むだけ) |

internal 定義のまま extension シグネチャに現れる型 (pass-through 面): `Node` / `Binding` /
`Candidate` / `Branch` / `Ctx` / `SeatCtx` / `InstallBuilder` / `InstallChild` / `InstallOutput` /
`DefsView` / `Value` / `ConfigVal` / `ResultValue` / `ParseError` / `TypeParseFail` / `FnCtx`
文脈型群 / `DefError` 系 / `FnInvocation` 系。

### 8.4 blocker 2 (installer view) の解決 — 発明不要、getter は実測 4 種で足りる

blocker 2 の「read view 契約の新設 = 発明」も 2 層化で消える: `InstallBuilder` / `DefsView` は
internal 定義のまま extension trait のシグネチャに現れ、**既存の public メソッド**
(definition() / templates() / extensions() / output()...) がそのまま観測面になる — 新契約は不要。
残る問題は「definition() が返す `Definition` → `ElementDef` の分解を拡張作者ができるか」だが、
実験 5 のとおり **internal を import できない外部は Definition のフィールドもメソッドも
読めない** — つまり残露出 3 (66 フィールド閉包) は**そもそも露出しない**ことが判明
(pub(all) でも import 不能なら読めない)。

ただしそれは「外部 installer が定義を観測する術がない」ことも意味する。実需の実測:
**builtins の installer residents (15 本) が Definition から読むのは `e.name` / `e.help_meta` /
builder の `definition()` / `templates()` / `output()` の実質 4-5 観測に集約される**
(installer_residents.mbt の grep 全数、§5-3 の宿題の前倒し完了)。よって:

- extension に **installer 観測 fn** を最小集合で置く (internal 型を受けて素の値を返す —
  例: `element_names(DefsView) -> Array[String]` 級。正確な集合は builtins 15 本を extension
  だけで書き直す M2c 作業がそのまま決める: builtins が必要とした観測 = ABI の観測、
  DR-110 の層契約が判定器として機能する)
- installer 拡張が builtins より深い観測 (ElementDef の任意フィールド) を要する需要は
  v1 では封鎖されたまま — これは残露出でなく**意図した最小面** (需要が実体化したら観測 fn を
  足す非破壊拡張で応える)

### 8.5 残露出 4 件 (§5) の再評価

2 層化により §5 の 1 / 2 / 3 は**露出自体が消滅** (Candidate 内部座標・Binding 直書き・
Definition 閉包は、外部が internal を import 不能な時点で読み書きの経路がない)。extension が
公式構築子 (`Candidate::trigger` 等) を提供する部分だけが残り、これは §8.3 の関数移動で
賄われる。§5-4 (素 Registry) は変わらず正当な自由。**M2c への個別判断素材は 0 件に減る** —
唯一の統括報告事項は §8.4 の installer 観測 fn の最終集合 (builtins 書き直しの結果報告)。

### 8.6 M2c checklist の差し替え (初版 §7 を置換)

- [ ] `src/engine/` → `src/internal/engine/` へ物理移動 (型・evaluator は無変更、パスのみ)
- [ ] `src/extension/` 新設: trait 8 本 + Registry + descriptor 3 型と宣言軸 enum + 構築子/
      factory/config ヘルパ関数を engine / builtins から移動。moon.pkg は internal/engine import
- [ ] builtins の moon.pkg を extension のみ import に変更 — **internal を import しない**
      (コンパイルが通ること自体が DR-110 層契約の機械証明)。通らない箇所 = 不足観測 fn として
      extension に追加 (§8.4)
- [ ] builtins の lowering 内部ヘルパ 6 関数 (§3-2) の非公開化、lowering 総口 (§3-3) の
      internal 移動
- [ ] kuu 玄関の moon.pkg: extension + internal/engine import。runner の @engine 語彙は
      玄関語彙へ (プラン M2c checklist と同じ)
- [ ] 完了判定 grep: 外部視点の公開面 = `src/extension/pkg.generated.mbti` +
      `src/kuu/pkg.generated.mbti` + `src/builtins/pkg.generated.mbti`。builtins の mbti から
      `@engine.` が消え `@extension.`/internal pass-through 参照になっていること。
      mbti に internal 型が**シグネチャとして**現れるのは §8.2 のとおり正 (露出とは別) —
      判定は「参照が現れない」ではなく「**builtins / 玄関の import 節に internal/engine が
      無い** (玄関は例外) + 外部 consumer の probe プロジェクトで internal import が拒否される」

## 関連

- `docs/findings/2026-07-24-api-polish-2-plan.md` §1.1 / §5 (M2b の発注元、AP2-Q3=b)
- `docs/findings/2026-07-24-multilang-spike-findings.md` §4 (拡張 ABI 設計への入力)
- DR-107 / DR-111 / DR-114 (descriptor 宣言軸 = 分類判定器) / DR-110 (3 層契約 — builtins は
  公開 extension interface のみ使用)
- kuu.mbt `src/builtins/pkg.generated.mbti` / `src/engine/pkg.generated.mbti` (一次資料)
