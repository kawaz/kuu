# extension ABI 設計 (M2b) — builtins @engine 参照の全数分類と切り出しリスト

> **改訂履歴 (2026-07-24)**: 初版の「extension が全型の定義側」→ M2c blocker 1 回目 (opaque
> Node を evaluator が match 不能) で第 1 版 §8 (2 層: 型 internal / trait extension) に改訂
> → blocker 2 回目 (engine の `ElementDef.ty : &TypeExt` 等により internal→extension import
> が必須で、trait の internal 型参照と循環) で §8 第 2 版 (3 層 + InstallerExt bridge) に
> 再改訂 → blocker 3 回目 (第 2 版の bridge 合成が extension↔internal の package cycle、
> M2c 指摘 + 合成 probe 実験 11 で確定) で §8 第 3 版 (3 層 + trait 8 本全部層分割 +
> snapshot 変換 adapter は internal 側) に再々改訂 → **停止条件発火 (plant 語彙 = Node
> 再発明、M2c 2026-07-24) で §8.8 第 4 版: v1 公開拡張 ABI を 3 顧客面に絞り、node /
> installer residents は internal 配置の canonical 資材とする (AP2-Q5 裁定素材)**。
> §2 の型リストは §8.3 + §8.8 の層割当が正。

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

## 8. M2c blocker の解決 (第 3 版) — abi / extension / internal の 3 層、trait は全部層分割

> 第 1 版 §8 (「型は internal 定義のまま、trait を extension 定義に」の 2 層) は撤回 —
> engine の `ElementDef.ty : &TypeExt` (declaration.mbt:166) / `eval.mbt:453` の `&MatcherExt`
> 直参照により internal→extension import が必須になり、trait シグネチャの internal 型参照
> (extension→internal) と**循環する** (統括裏取りどおり)。本版は probe 実験 7-10 で
> 全経路を実機確定した上での置き換え。

### 8.1 実機検証 (moon 0.1.20260709、probe プロジェクト。実験 1-6 は第 1 版から有効)

| # | 検証 | 結果 (実出力) |
|---|---|---|
| 1 | extension 定義 opaque struct を internal が読む | フィールド直読み不可 (blocker 1 の追認 — 初版 §4 撤回の根拠) |
| 2 | internal 定義 pub(all) enum を extension の pub fn シグネチャに載せる | 可能 (mbti に `@eng.Node2` として出る) |
| 3 | 外部が extension 経由で internal 型の値を受け取り・持ち回り・渡し戻す | 可能 (pass-through) |
| 4 | 外部の internal package 直 import | 不可 (`Cannot import internal package ... due to internal visibility rules`) |
| 5 | 外部から internal 型への dot-call (import なし) | 不可 (`Cannot call method of type ...: package ... is not imported`) |
| 6 | extension 定義 trait のシグネチャに internal 型を含めて外部が impl | 可能 (impl は型注釈なしで受け、値は透過) |
| 7 | **外部 package が internal 定義 trait を自作型に impl** (`impl @eng.TypeExt2 for BigIntType`) | **不可** — trait 名の解決自体が `Package "eng" not found in the loaded packages` (import できないので名指し不能)。orphan rule 以前に名前空間で詰む |
| 8 | extension の `pub traitalias @eng.TypeExt2 as TypeExt` 越しに外部が impl | **impl 宣言は通るが使用点で不可** — `Type BigIntType does not implement trait @probe/x/internal/eng.TypeExt2: definition of the trait is unknown, due to its package not imported`。**traitalias は橋にならない** (実体 trait の可視性を要求する) |
| 9 | **3 層構成**: `abi` (wire データ型のみ) ← `extension` (trait + Registry、abi のみ import) ← `internal/engine` (abi + extension を import、`Node.Leaf(String, &@ext.TypeExt3)` フィールド保持 + evaluator 全面 match + Registry lookup) ← 玄関 | **全部 green** (moon check)。外部 consumer の impl + 登録も green |
| 10 | **bridge adapter**: internal に core trait (現 engine の trait をそのまま温存)、extension に公開 trait + priv adapter struct で `impl @eng.TypeExtCore for TypeAdapter` (internal trait を extension 内の型に impl) + `as_core(&TypeExt) -> &TypeExtCore` 変換 fn | **green だが単体構成のみ** — この形は extension→internal import を要し、7 trait の internal→extension import と **package cycle** になるため 3 層との合成不能 (M2c 指摘、第 3 版で撤回) |
| 11 | **合成 probe (第 3 版の決定打)**: abi ← extension (TypeExt + InstallerExt + BuilderView 窓 + Registry、import は abi のみ) ← internal (InstallBuilder→BuilderView snapshot 変換 = adapter を internal 側に、evaluator 全面 match、run_installer/lower_and_eval) ← door、+ 外部 consumer が type/installer 両拡張を impl・登録 | **moon check 全 green + moon test pass + 外部の internal import 拒否も再確認** (`Cannot import internal package ...`)。import は abi←ext←internal の完全一方向で cycle なし |

**確定事実**: (a) internal 定義 trait は外部から impl 不能 (実験 7)、traitalias でも救えない
(実験 8)。(b) bridge adapter (実験 10) は単体では green だが 3 層と合成すると package cycle
(M2c 指摘が正)。(c) **成立する合成形は 1 つ**: 全 trait 層分割 + 文脈は extension 定義の
純データ窓 + snapshot 変換 adapter を internal 側に置く (実験 11)。

### 8.2 採用設計: 3 層分割 (実験 9/11 の形)、trait 8 本すべて extension 定義

**トポロジ (依存は全て一方向、循環なし):**

```
abi  ←  extension  ←  internal/engine  ←  kuu (玄関)  ←  利用者
 ↑______________________________________↗   (玄関は 3 層全部 import 可)
        builtins は extension + abi のみ import (DR-110 の機械証明)
```

- **`src/abi/`** (新設、public): wire / プロトコルの**データ型だけ**の層。trait なし・評価器
  依存なし。居住者: `Value` / `ConfigVal` / `ResultValue` / `Binding` / `Candidate` /
  `ParseError` / `TypeParseFail` / `FnReason` / `FnOutput` / `FnArg` / `FnCall` /
  `FnInvocation(Form)` / `EffectOp` / `Source` / `ErrorKind` / `DefError(Kind)` /
  `CellSentinel` / `Warning(Kind)` / config 担体 (`BoolConfig` / `RoundMode` / `AttachMode` /
  `EqSepMode`)。これらは現 engine で既に pub(all) の純データで、評価器型 (Node/Scope) を
  フィールドに持たない — 移動は機械的 (grep で相互参照を確認済みの範囲では Binding→
  Value/EffectOp/Source、Candidate→TermHint のみで閉包が abi 内で閉じる。M2c で `moon check`
  が閉包漏れを機械検出する)
- **`src/extension/`** (public): trait 8 本 + `Registry` + descriptor 3 型・宣言軸 enum・
  構築子 + `FnCtx` 文脈型。import は abi のみ。**trait シグネチャに internal 型を書けない**
  制約が今回の設計圧 — 各 trait の internal 型参照を次の 3 手で除去する (§8.3)
- **`src/internal/engine/`**: 評価器の全て (Node / Scope / Entity / ElementDef / evaluator /
  lowering)。abi + extension を import し、`ElementDef.ty : &@ext.TypeExt` / evaluator の
  trait 呼び出しは**現状の形のまま** (実験 9 で green 確認済み)。pub(all) は internal 境界が
  吸収 (第 1 版の結論のまま有効)
- **builtins**: extension + abi のみ import (internal 不可視のコンパイル成功が DR-110 の層契約
  の機械証明 — 第 1 版のまま)

### 8.3 trait シグネチャの internal 型除去 — 3 手の割当

現 trait 8 本のシグネチャが internal 型を参照する箇所と除去手段:

| trait | internal 参照 | 手 | 除去後の形 |
|---|---|---|---|
| `TypeExt` | なし (Value/TypeParseFail は abi へ) — `default_seat_resolver(SeatCtx)` のみ | **手 1: 文脈型を extension へ移す** | `SeatCtx` は declared/observed の純データ窓 (private fields + getter) で評価器型を持たない — extension 居住に移せる |
| `CompleterExt` / `CapabilityExt` | なし (name のみ) | — | そのまま |
| `EntityExt` | `Candidate` | abi へ移動済み | そのまま成立 |
| `CollectorExt` | `ResultValue` | abi へ移動済み | 同上 |
| `AccumulatorExt` | `Binding` / `ParseError` / `ResultValue` / `Value` | abi へ移動済み | 同上 (resolve_cli の lower 継続 closure も abi 型のみ) |
| `FilterDescriptor` 等 | `Value` / `FnReason` / `FnCtx` | abi + extension 内 | そのまま |
| `MatcherExt` | **`Ctx` / `Branch`** | **手 2: Ctx を extension の opaque 窓に、Branch は abi へ** | `Ctx` は token_at / is_complete_mode / extensions の 3 観測のみ — extension 定義の opaque struct にし、internal が構築子 (hidden 契約 fn) で作る。`Branch` は Accept/Held/Pending × abi 型 (Binding/ParseError/Candidate) の純データ — abi 居住可 |
| `InstallerExt` | **`DecodeCtx` / `DecodedOwnedDeclaration` / `InstallBuilder` / `DefsView` / `DefError`** | **手 1+2 混合** | `DecodeCtx` (3 値 enum) / `DecodedOwnedDeclaration` / `OwnedDeclaration` 系は宣言 wire の純データ — abi へ。`InstallBuilder` / `DefsView` は **extension 定義の opaque struct** にし、観測メソッド (definition 観測 / templates / output) を extension が持つ。内部に internal の Definition を抱える必要があるが、**opaque struct のフィールドを internal 型にはできない (extension は internal を import しない)** — ここが唯一の残設計点で、解決は「InstallBuilder / DefsView を **internal 定義のまま**にし、InstallerExt の当該メソッドを **bridge adapter (実験 10)** で扱う」(§8.4) |

### 8.4 InstallerExt の文脈型 — BuilderView 窓 + internal 側 snapshot 変換 (第 3 版)

InstallerExt の apply/collect_defs_errors は InstallBuilder / DefsView (内部に Definition /
Node templates を抱える文脈型) を受けるため、純粋な層分割では extension に置けない。

> **第 3 版改訂 (M2c 指摘の反映、2026-07-24)**: 第 2 版の「extension 側 adapter」は
> **extension→internal の package import を要求し、internal→extension (7 trait 参照) と
> package cycle になる** (MoonBit の import は package 単位 — adapter 実装ファイルに閉じても
> 逃げられない。M2c 指摘どおり)。第 2 版時点では probe 9 (3 層) と probe 10 (bridge) が
> **別構成の green で合成未証明**だった。実験 11 (合成 probe) で M2c 対案 =
> **adapter を internal 側に置く**形の合成 green を確定し、こちらを採用する。

**採用形 (実験 11 で合成 green)**:

- **公開 `InstallerExt` も extension 定義の層分割 trait にする** — apply /
  collect_defs_errors の引数は extension 定義の **`BuilderView`** (純データ窓 struct:
  private fields + 観測 getter (`element_names()` 級、§8.5 の実測 4-5 観測) + 植え付け口
  (`plant()`)。abi 型だけで構成され internal を知らない)
- **adapter は internal 側**: internal の lowering が `run_installer(InstallBuilder,
  &@ext.InstallerExt)` で、(1) InstallBuilder (internal 文脈、Definition / Node templates
  保持) から BuilderView (純データ snapshot) を**構築**し、(2) 公開 trait を呼び、
  (3) view の植え付け結果を internal の Node へ**変換して植える**。internal→extension の
  既存 import (7 trait のための) に相乗りするだけで**新しい import 方向が生まれない**
- Registry は公開 `&InstallerExt` の束をそのまま保持 (internal 変換は lookup 後に
  internal 側で行う — M2c 対案どおり)
- 帰結: **internal に `InstallerExtCore` を別 trait として立てる必要も消えた** — 現
  InstallerExt の decode/apply/collect_defs_errors を BuilderView ベースに書き換える
  (decode の引数 `Json` / `DecodeCtx` / 戻り `DecodedOwnedDeclaration` は abi 居住なので
  層分割で運べる — decode 面は view 化すら不要)

**hybrid は消滅し、trait 8 本すべて層分割 (extension 定義) に統一される。** 「bridge
(adapter で trait 変換)」という装置自体が不要になった — 残る adapter は trait ではなく
**文脈型の純データ snapshot 変換** (InstallBuilder → BuilderView) で、これは internal の
lowering 内部実装であり ABI に現れない。MatcherExt の Ctx / TypeExt の SeatCtx も同じ
「extension 定義の純データ窓」パターンで統一 (第 2 版 §8.3 の方針のまま、bridge fallback の
但し書きは削除 — fallback 先が cycle で不成立と判明したため、窓化で書けない observation が
出た場合は設計持ち帰り (統括報告) が正しい escalation)。

**BuilderView 設計の注意 (実験 11 で見えた制約)**: view は snapshot なので、installer が
植えた結果を後続 installer が view 越しに観測する「累積観測」は internal 側の再 snapshot で
実現する (installer 毎に view を作り直す — 現実装の installer fixpoint (DR-042) が既に
「installer 列を回す」構造なので、回し毎の view 再構築は既存ループに 1 行入る形)。植え付けは
`plant` の受理する語彙 (abi 型) に制限される — 現 builtins の installer が Node を直接植える
箇所は「plant 語彙で表現できる形」への再設計が要り、その語彙集合は builtins 15 本の書き直しが
確定する (§8.5 の機械検出パターンと同じ)。**ここが M2c の最大作業点** — plant 語彙が膨らんで
実質 Node の再発明になるようなら設計持ち帰り。

### 8.5 blocker 2 (installer view) と残露出 — 第 1 版の結論は有効なまま

- installer の観測面: builtins 15 installer の実測 (第 1 版 §8.4) = `e.name` / `e.help_meta` /
  `definition()` / `templates()` / `output()` の 4-5 観測。extension の観測 fn 集合は
  「builtins を extension + abi だけで書き直す」M2c 作業が確定する (不足 = コンパイルエラーで
  機械検出) — 変更なし
- 残露出 0 件も有効: 外部は internal import 不能 (実験 4/5/7) なので Candidate 内部座標 /
  Binding 直書き / Definition 66 フィールド閉包に到達経路がない。**abi へ移した型は例外** —
  abi は public なので `Binding` / `Candidate` を abi に置くと pub(all) フィールドが外部可視に
  戻る。**abi の struct は private fields + 構築子/getter の pub struct とする** (Candidate は
  wire 9 getter + 構築子、Binding は new/effect 構築子 + read getter — 第 1 版 §5-1/2 の推し
  がそのまま abi の形になる)。enum (Value / EffectOp / Branch...) は wire 閉語彙なので
  pub(all) のまま

### 8.6 M2c checklist (第 2 版で置換)

- [ ] `src/abi/` 新設: §8.2 の純データ型を engine から物理移動 (struct は private fields 化、
      enum は pub(all) 維持)。`moon check` で閉包漏れ検出 → 漏れ型は abi 追加 or 設計再判定
- [ ] `src/extension/` 新設: trait 8 本 (全部層分割) + Registry + descriptor + FnCtx 文脈 +
      SeatCtx / Ctx / BuilderView (+DefsView 相当) の純データ窓。**import は abi のみ** —
      extension が internal を import する箇所はゼロ (実験 11 のトポロジ。cycle なしの機械
      保証は moon が import 解決時に検査する)
- [ ] `src/engine/` → `src/internal/engine/`: ElementDef.ty 等の trait フィールドは
      `&@ext.TypeExt` 参照に張り替え (実験 9 の形)。evaluator の match は無変更。lowering に
      InstallBuilder→BuilderView snapshot 変換 (installer 毎の再構築、fixpoint ループ内 1 行)
      と plant 語彙 → Node 変換を追加 (実験 11 の run_installer の形)
- [ ] builtins: moon.pkg を abi + extension のみに (internal import なしのコンパイル成功 =
      DR-110 機械証明)。lowering 内部ヘルパ 6 関数の非公開化・lowering 総口の internal 移動
      (§3 のまま)
- [ ] kuu 玄関: 3 層 import。runner の @engine 語彙除去 (プランのまま)
- [ ] 完了判定: builtins / 外部 probe の moon.pkg に internal が無い + 外部 probe で
      internal import 拒否を確認 + `moon test` 全 green
- [ ] 統括報告: BuilderView の観測 getter + plant 語彙の最終集合 (builtins 15 本書き直しの結果)。plant 語彙が Node 再発明に膨らむ場合は実装を止めて設計持ち帰り

### 8.8 第 4 版 — 停止条件発火 (plant 語彙 = Node 再発明) の解決: v1 拡張 ABI は 3 顧客面に絞る

> 発火の事実確認 (M2c 中間状態の実物、kuu.mbt working copy): 公開 arg factory 14 本は
> `@engine.Node` を返し (builtins/node_residents.mbt L122-955、NodeExt impl 59 箇所)、
> installer 本体 (inst_long 等) は既に internal/engine/lowering.mbt へ移動済み。builtins に
> 残る Node 依存は node_residents.mbt (14) + installer_residents.mbt の ElementDef 2 箇所。
> BuilderView の plant で factory 戻り値 (Node) を運ぼうとすると abi に Node 相当の座席が
> 要る = 停止条件どおり。

#### 8.8.1 原因の切り分け — 「拡張作者の面」と「canonical 資材の面」の混同

行き詰まりの根は「builtins 全体を拡張作者と同じ立場に置く」目標設定にある。builtins の
中身は 2 種に分かれる:

- **(A) 拡張作者と同じ立場で書ける面**: type residents / completer / accumulator /
  collector / matcher 構築 / filter descriptor / cell_fns / entity_ext — grep 実測で
  **Node 参照ゼロ** (builtins 14 ファイル中 11 ファイルが該当。node_residents 14 /
  installer_residents 2 / lexicon 1 参照のみが例外)
- **(B) engine の open node 契約 (DR-110 §3-2) に乗る評価能力の提供面**: node residents
  (値プリミティブの読み/parse を NodeExt::eval で登録、DR-110 §4「値プリミティブ型は
  open node 契約に乗る拡張 node」) と installer residents (Definition/ElementDef を読む
  lowering 参加者)。これらは**評価器の内部座標 (Ctx/Branch/Binding/Resume/Node) を
  シグネチャに持つ trait の実装**であり、wire に現れない評価器 ABI の住人

DR-110 の「builtins は公開 extension interface のみ使用」は (B) を含む全面要求だが、
(B) の interface (NodeExt / installer の lowering 面) は §2.1 で既に「v1 拡張 ABI の
射程外」と裁定済み (NodeExt internal 残置)。**(B) を v1 の公開 ABI に含めない以上、
(B) の住人が internal 配置になるのは矛盾ではなく整合** — 「公開 interface のみ使用」の
検証可能形 (任意の 1 住人を 3rd party 差し替え可能) は、(B) については「internal 内の
NodeExt/installer 契約に対する差し替え可能性」として **engine のコード分離 (禁止事項 1:
語彙の直書き分岐なし) で担保**され続ける。層の物理配置 (public package か internal か) は
差し替え可能性の operative definition に含まれない。

#### 8.8.2 第 4 版の配置

- **builtins を 2 分割**:
  - `src/builtins/` (public、import = abi + extension のみ): (A) 面 — type/completer/
    accumulator/collector/matcher/filter/cell_fns/entity_ext。**ここが「拡張作者と同じ
    書き方」の対称性の証明** (moon.pkg に internal が無いままコンパイルが通る)
  - `src/internal/residents/` (internal、import = abi + extension + internal/engine):
    (B) 面 — node_residents + installer_residents (+ lexicon の ElementDef 依存部)。
    canonical 資材として evaluator 型に直接触る
- **arg factory 14 本は公開面から消す** (team-lead 検討方向 2 の実測裏付け: production の
  呼び出し元は internal の lowering と kuu 玄関の registry 組成のみ — wire decode 経由で
  しか使われず、外部利用者が Node を手組みする正当な経路は v1 に存在しない。wbtest の
  利用は package 内なので影響なし)
- **BuilderView の plant 語彙は「installer が wire から decode した宣言を置く」面に限定**
  — Node を運ばない。もっとも v1 では公開 installer 拡張自体を提供しないため (下記)、
  BuilderView / InstallerExt の extension 公開も**取り下げ**、installer 契約は internal に
  残す (現行の InstallerExt そのまま、書き換え不要)
- **extension の公開 trait は v1 = 5 本**: TypeExt / CompleterExt / AccumulatorExt /
  CollectorExt / EntityExt (+ CapabilityExt、descriptor/FnCtx/config 担体は §2 のまま)。
  MatcherExt / InstallerExt / NodeExt は internal (evaluator 内部座標を運ぶ trait 群 —
  「メソッドが abi+extension の型だけで書ける trait だけを公開する」判定則が 3 版の
  hybrid 判定則を置き換える最終形)。TypeExt の evaluator 接続は「type resident の
  parse_token を internal の値スロット node が呼ぶ」向きなので TypeExt 自体は
  abi 型のみpremise で公開可能 (実験 9/11 で green の形)

#### 8.8.3 3 顧客への影響 = ゼロ、対称性の論点 (Q 化素材)

§6 の 3 顧客 (bigint / custom completer / 自作 type) は全て (A) 面 = **v1 公開 5 trait で
変わらず書ける** (installer / matcher / node 拡張は 3 顧客のいずれも要さない)。

**ただし公開 ABI の範囲が変わるため AP2-Q5 として裁定を仰ぐ** (「builtin と同じ書き方で
自作できる」対称性が (B) 面で消える):

- **AP2-Q5: v1 公開拡張 ABI の範囲**
  - a. **(A) 面の 5 trait + descriptor 面のみ公開** (**推し** — 3 顧客が全部書ける実証済み
    範囲。installer / matcher / node の拡張 ABI は評価器内部座標の安定化が前提で、開くなら
    その安定化 DR とセット。AP2-Q3=b の「拡張 ABI package を本サイクルで設計」は (A) 面で
    充足 — bigint/custom completer/自作 type が裁定文の名指し顧客であり、installer 拡張は
    顧客に居ない。閉→開は非破壊の非対称も再適用)
  - b. installer / matcher も v1 で公開 (BuilderView 窓 + plant 語彙の設計を完遂する —
    plant 語彙の Node 再発明問題に正面から答える必要があり、破壊窓がさらに延びる。
    canonical installer 13 種と同等の表現力を初版から保証する負担)
  - 参照: 本節、DR-110 §3-2/§4 (値プリミティブ = open node 契約の住人)、§6 (3 顧客検証)

#### 8.8.4 M2c checklist 差分 (第 3 版 §8.6 への上書き)

- [ ] builtins 2 分割: node_residents / installer_residents (+ lexicon の ElementDef 部) を
      `src/internal/residents/` へ。残り 11 ファイルは `src/builtins/` (import = abi +
      extension のみ) — **中間変更の大半 (abi/extension/internal の移動) はそのまま生きる**
- [ ] arg factory 14 本 + effect_mark/deprecation_mark/failure_mark/node_resident_name を
      公開面から除去 (internal/residents 居住、玄関 registry 組成と lowering だけが呼ぶ)
- [ ] extension から InstallerExt / MatcherExt / BuilderView 案を撤去 (internal 残置)。
      公開 trait = TypeExt / CompleterExt / AccumulatorExt / CollectorExt / EntityExt /
      CapabilityExt。Registry の register_installer / register_matcher / register_node は
      internal 側の組成 API へ分離 (公開 Registry には (A) 面の register だけ残す)
- [ ] 完了判定: `src/builtins/moon.pkg` に internal 参照なし (対称性の機械証明は (A) 面で
      成立) + 外部 probe で 3 顧客が公開面だけで書けること + moon test 全 green
- [ ] AP2-Q5 の裁定を待ってから extension の公開 trait 面を fix (a なら上記どおり、
      b なら BuilderView 設計を §8.4 の停止条件込みで再開)

### 8.9 probe の再現手順 (実出力の保全)

probe プロジェクトは scratchpad (session-local) のため、判断根拠の実出力を残す:

- 実験 7 実出力: `Package "eng" not found in the loaded packages.` (moon check、consumer が
  `impl @eng.TypeExt2 for BigIntType` を書いた時 — internal は import 節に書けないため)
- 実験 8 実出力: `Type BigIntType does not implement trait @probe/x/internal/eng.TypeExt2:
  definition of the trait is unknown, due to its package not imported.` (extension の
  `pub traitalias @eng.TypeExt2 as TypeExt` 越しに impl + 使用した時)
- 実験 4 実出力: `Cannot import internal package probe/x/internal/eng@0.1.0 in
  probe/consumer/main@0.1.0 due to internal visibility rules`
- 実験 9/10: moon check `Finished. moon: ran N tasks` (green)。ただし 10 は単体構成のみで
  合成不能 (第 3 版注記参照)
- 実験 11 (合成、第 3 版の根拠): 同一 workspace で abi/ext/internal/eng/door の 4 package +
  外部 consumer。moon check `Finished. moon: ran 8 tasks` (green)、外部 consumer の
  type+installer 両拡張 impl も `Finished. moon: ran 4 tasks` (green)、`moon test`
  `Total tests: 1, passed: 1, failed: 0.`、外部の internal import は
  `Cannot import internal package probe/x/internal/eng@0.1.0 in probe/consumer/main@0.1.0
  due to internal visibility rules` で拒否 (再確認)。構成の要点: extension の moon.pkg import
  は `["probe/x/abi"]` のみ、internal は `["probe/x/abi", "probe/x/ext"]`、BuilderView は
  extension 定義の純データ窓 (private fields + element_names getter + plant 口)、internal の
  `run_installer(InstallBuilder, &@ext.InstallerExt)` が snapshot 構築 → trait 呼び出し →
  plant 結果の Node 変換を担う。再現は同構成を moon 0.1.20260709 で組めば確認できる
## 関連

- `docs/findings/2026-07-24-api-polish-2-plan.md` §1.1 / §5 (M2b の発注元、AP2-Q3=b)
- `docs/findings/2026-07-24-multilang-spike-findings.md` §4 (拡張 ABI 設計への入力)
- DR-107 / DR-111 / DR-114 (descriptor 宣言軸 = 分類判定器) / DR-110 (3 層契約 — builtins は
  公開 extension interface のみ使用)
- kuu.mbt `src/builtins/pkg.generated.mbti` / `src/engine/pkg.generated.mbti` (一次資料)
