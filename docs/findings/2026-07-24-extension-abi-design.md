# extension ABI 設計 (M2b) — builtins @engine 参照の全数分類と切り出しリスト

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

## 関連

- `docs/findings/2026-07-24-api-polish-2-plan.md` §1.1 / §5 (M2b の発注元、AP2-Q3=b)
- `docs/findings/2026-07-24-multilang-spike-findings.md` §4 (拡張 ABI 設計への入力)
- DR-107 / DR-111 / DR-114 (descriptor 宣言軸 = 分類判定器) / DR-110 (3 層契約 — builtins は
  公開 extension interface のみ使用)
- kuu.mbt `src/builtins/pkg.generated.mbti` / `src/engine/pkg.generated.mbti` (一次資料)
