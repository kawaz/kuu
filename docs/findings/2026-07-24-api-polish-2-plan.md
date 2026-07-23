# API 磨き第 2 サイクル 設計プラン (2026-07-24)

> 由来: 敵対的レビュー統合台帳 (`docs/findings/2026-07-24-fresh-eyes-adversarial-review.md`) の
> §5 裁定 (REV-Q1=a / Q2=a+言語側 bigint / Q3=a 段階型 / Q5=a 同窓実施)。本書は同窓で実施する
> 破壊 1 回分の設計プラン。**発明** (新規に決める形) と**規範化** (現物の暗黙挙動を spec へ格上げ)
> を各節で区別する。REV-Q4 (kuu-cli dogfooding) は次サイクル主タスクで、本書は引き継ぎ面のみ扱う。
>
> **改訂 (2026-07-24, sol 二次レビュー反映)**: codex-sol-reviewer の blocker 3 / major 6 を反映。
> 対応一覧は §7 (指摘別の採用/反論)。M1 (DR-118 + 2^53) は実施済み (spec commit 66f88200)。

## 1. 玄関型の顔ぶれ設計 (REV-Q1 + REV-Q3)

### 1.1 封鎖機構 (発明: 実装配置、spec 影響なし) — sol blocker 1 の反映

MoonBit の internal package 規則 (パスに `internal` セグメントを含む package は祖先 package
以外から import 不可) を使い、kuu.mbt の `src/engine/` を `src/internal/engine/` へ移設して
外部から到達不能にする。`src/kuu/` (玄関) は internal/engine を import できる位置に置く。

**builtins の扱い (sol blocker 1 → AP2-Q3=b 裁定済み、kawaz 2026-07-24)**: 当初案の
「builtins は公開面として残す」は単独では成立しない — builtins factory のシグネチャは
`@engine` 型を 75 箇所参照しており (builtins pkg.generated.mbti の機械カウント)、engine を
internal 化すると builtins の公開シグネチャが外部から書けない型を露出する矛盾になる。
**裁定 = 案 b: 拡張 ABI package を本サイクルで切り出す** (旧案 a「拡張面も閉じる」は棄却 —
bigint (REV-Q2) / custom completer / 自作 type が既に顧客として並んでおり、閉じる価値がない)。

#### 拡張 ABI package (`src/extension/`) の設計方針

engine の型のうち**拡張契約に要る最小集合**を `src/extension/` (public) へ移し、engine 残余を
`src/internal/engine/` 化する。線引きの原則: 「resident 作者が descriptor を書き、registry へ
登録するのに要る型」だけを extension に置く — 評価器の内部座標 (Node / Scope / Entity /
ElementDef / Branch / Ctx...) は含めない。多言語スパイク findings
(`docs/findings/2026-07-24-multilang-spike-findings.md` §4) を設計入力にする:

- **スパイクの知見 1 (要らなかった面)**: パイプライン意味論 (matcher / 先食い / 効果列 / 比較)
  は spec + fixture で 2 言語とも閉じた — 拡張 ABI に評価器内部を出す必要はない、の傍証。
  extension package が Node 構築子を持たない線引きはこの実証と整合
- **スパイクの知見 2 (規定が要る面)**: wire union の decode 規則 / 数値表現規範 (2^53 raw
  保持) / provenance 保証水準の宣言。これらは「言語側拡張が従うべき実装要件」として
  extension package の doc 契約 (および spec 側の実装要件節) に載せる — AP2-Q4=b の契約
  ベース路線とここで接続する
- **extension に置く候補** (M2b で mbti 走査により確定): `Registry` と登録口 /
  Ext trait 群 (`TypeExt` / `InstallerExt` / `CompleterExt` / `AccumulatorExt` /
  `MatcherExt` / `CapabilityExt` / `EntityExt`) / descriptor 型と構築関数
  (`CellFnDescriptor` / `FilterDescriptor` / ... と `cell_fn_descriptor()` 等) / fn ABI 面
  (`FnInvocation` / `FnCall` / `FnCtx` / `FnReason` / `FnOutput` / `Value` / `ConfigVal`) /
  提供契約 (provider シグネチャ)。**判定器**: その型が schema/builtin-descriptors.json の
  宣言軸か DR-107/111/114 の ABI 節に現れるか — 現れなければ internal
- **巨大 pub(all) の残留リスク (旧案 b の弱点) への手当**: Ext trait のメソッドシグネチャが
  Node を返す箇所 (installer の植え付け面) が最大の漏斗。ここは trait メソッドの引数/戻りを
  builder 型 (`InstallBuilder` — 既に private fields) へ寄せて Node 直接露出を避ける。
  それでも残る露出は M2b で列挙して個別裁定 (実装時の報告事項)

### 1.1b ParsedOutcome variant × 玄関の遷移表 (sol major 9 の反映)

| variant \ 玄関 | resolve | resolve_interpretation | output | warnings | help | complete / completion 系 |
|---|---|---|---|---|---|---|
| Parsed Success(binds) | ✓ (binds を渡す) | — (型不一致) | ✗ (型で拒否 — DR-118 §1) | ✓ | n/a (help は AtomicAST 起点) | n/a (同左) |
| Parsed Failure | — (終端。型で渡せない) | — | ✗ | ✓ (deprecated 警告は failure でも出る) | n/a | n/a |
| Parsed Ambiguous | — | ✓ (interp を 1 つ選ぶ) | ✗ (ビューは view_of_interpretation(ast, interp) 経由) | ✓ | n/a | n/a |
| Resolved Success(binds) | — | — | ✓ (唯一の受理) | ✓ | n/a | n/a |
| Resolved Failure | — | — | ✗ | ✓ | n/a | n/a |

「—」= 型システム上その組み合わせの API が存在しない。help / complete / completion_query 系は
outcome を受けず AtomicAST 起点なので遷移表の対象外 (`dispatch_completion_script` のみ
outcome を受ける — ParsedOutcome を受理する形に置く。補完 script 要求は parse 相で確定する
発火であり resolve を要さないため)。

### 1.2 kuu package 側の公開型リスト (発明: 型の切り方 / 規範化: 各フィールドは DR-053/DR-104 の wire 直訳)

REV-Q3=a の段階型強制を骨格にする:

| 新公開型 | 対応する engine 型 | 可視性 | 中身 |
|---|---|---|---|
| `ParsedOutcome` | `@engine.Outcome` (parse 相) | **pub(all) enum** (利用者が match する) | `Success(ParsedBindings)` / `Failure(ParseFailure)` / `Ambiguous(ParsedAmbiguity)` |
| `ParsedBindings` | `Array[@engine.Binding]` | **opaque** (type のみ) | CLI 生 binds のハンドル。読む API を持たない — `resolve` へ渡すだけ |
| `ResolvedOutcome` | `@engine.Outcome` (resolve 相) | **pub(all) enum** | `Success(ResolvedBindings)` / `Failure(ParseFailure)` |
| `ResolvedBindings` | `Array[@engine.Binding]` (解決済み) | **opaque** | `output` が受理する唯一の型 (REV-Q3 の「output は ResolvedOutcome のみ」) |
| `ParsedAmbiguity` | `@engine.AmbiguousData` | pub struct (読み取り専用) | `interpretations : Array[Interpretation]`, `help_entry : String?` |
| `Interpretation` | `@engine.AmbiguousInterpretation` | opaque + 射影メソッド | `view_of_interpretation(ast, interp)` によるビュー射影と `resolve_interpretation(ast, interp, ...)` への受け渡し。claimants は `claimants()` で `Array[(String, String)]`。ast との対応は doc 契約 (AP2-Q4=b、§1.2b) |
| `ParseFailure` | `@engine.FailureData` | pub struct | `errors : Array[ParseError]`, `fired_action : String?`, `help_entry : String?`, `tried_triggers : Array[String]` (DR-053 §2/§4 直訳) |
| `ParseError` | `@engine.ParseError` | pub struct | wire 正本 (schema/fixture.schema.json `runtimeError`) どおり `{element, args_pos, kind, reason, message, path?}` — 実装の現行フィールド名 `args_pos` / `path` を保持 (sol major 11: 当初表の `argv_pos` 表記は DR-053 起草時の旧名で誤り、`path` の脱落も訂正) |
| `Candidate` | `@engine.Candidate` | pub struct | DR-104 §2 の wire 語彙 **9 フィールド** (sol major 10 訂正): `spelling` / `is_value` / `type` (実装識別子は予約語回避、TY-Q1 の許容) / `origin` / `term` / `is_alias` / `hidden` / `deprecated` / `completer?`。engine 側の `path` / `link` / `fire_path` は**運ばない** (DR-104 §2 が wire から明示除外済み — 現 `@engine.Candidate` 直輸出はこの内部座標を漏らしていた) |
| `Warning` | `@engine.Warning` | pub struct | CONFORMANCE §2 / DR-058 §2 の構造化 warning |
| `Value` | `@engine.Value` | **pub(all) enum** | wire 値語彙 (`String`/`Number`/`Bool`) — 利用者が match して値を取り出す終端。REV-Q2 の 2^53 明記はこの型の doc に載せる (§4) |
| `Source` / `EffectOp` | 同名 engine 型 | **pub(all) enum** | wire の閉じた語彙 (DR-031 / DR-045)。variant 追加 = wire 語彙追加 = spec の major であり、pub(all) の破壊性と同期する |
| `ResultValue` | `@engine.ResultValue` | **pub(all) enum** | 結果オブジェクト木 (利用者が walk する) |
| `DefError` / `DefErrorKind` | 同名 engine 型 | pub struct / pub(all) enum | DR-054 §4 の definition-error 列 |
| `ConfigVal` / `TtyObs` | 現状の kuu 側扱いを維持 | pub (構築は `config_from_json` / `tty_obs`) | 変更なし |

既存の `OutputView` / `OutputEffect` / `SourceEntry` / `Help*` 系 / `Completion*` 系 / `DefLoadError`
は engine 型参照 (`@engine.EffectOp` 等) を上表の kuu 型へ差し替えるのみで構造不変。

### 1.2a 公開型の transitive closure (sol major 5 の反映 — mbti 機械走査)

現 kuu 公開面 (`src/kuu/pkg.generated.mbti`) の `@engine.*` 参照は 14 型 (Registry 7 /
Outcome 5 / HelpValueStructure 4 / CapabilityExt 4 / Value 3 / ConfigVal 3 / Source 2 /
ResultValue 2 / Binding 2 / Warning / EffectOp / DefError / Candidate /
AmbiguousInterpretation 各 1)。当初表 14 種はこの直接参照の置換であって閉包ではない —
フィールド型を辿ると以下が追加で kuu 側の顔ぶれに要る:

| 追加型 | 引き込み元 | 扱い |
|---|---|---|
| `FnInvocation` | `EffectOp::Invoke(FnInvocation)` | `{name : String, args : Array[String]}` の wire DSL 直訳 (DR-114 §6) — kuu 側 pub struct として持つ。閉じた wire 語彙なので漏れではない |
| `WarningKind` | `Warning.kind` | pub(all) enum (現 variant は `Deprecated` のみ、CONFORMANCE §2) |
| `ErrorKind` | `ParseError.kind` | pub(all) enum (`Parse`/`Filter`/`Constraint`、DR-053 §2) |
| `DefErrorKind` | `DefError.kind` | pub(all) enum (DR-054 §4 / DR-082 の kind 語彙) |
| `TermHint` | `Candidate.term` | pub(all) enum (`word_end`/`cont`、DR-104 §2) |
| `HelpValueStructure` + `HelpSingleValue` / `HelpRepeatSpec` / `HelpTypeRef` | `HelpOption.value_structure` ほか 4 箇所 | help model の wire 構造 (DR-113) — 4 型セットで kuu 側へ移す (現在 engine 居住なのが配置誤りで、help model の一部として玄関側が正位置) |
| `Registry` / `CapabilityExt` | 玄関引数 7 箇所 / capability 4 箇所 | **AP2-Q3=b の帰結**: extension package (`src/extension/`) 居住。玄関の引数 Registry は H10 (§3.1) で AtomicAST 封入に統一され、`install_canonical` / `install_vocabulary` / capability 関数は extension 側の公開面に移る |
| `ConfigVal` / `TtyObs` / `Value` / `Source` / `ResultValue` | 玄関引数・OutputView | 当初表どおり kuu 側へ |

M2 の完了条件に「`moon info` 後の `src/kuu/pkg.generated.mbti` に `@engine.` (internal 参照)
が 0 件」の機械検査を置く (grep 一発で判定可能)。

### 1.2b Interpretation のビュー計算と AST provenance (sol blocker 2 の反映)

当初案の `Interpretation::view()` (引数なし method) は実装不能 — ビュー射影 (現
`output_of_interpretation`) は ast.root / ekmap / extensions を要するため、Interpretation 値
単体からは計算できない。また `resolve_interpretation(ast, interp, ...)` は別の definition の
ast と interp を混ぜて渡せる (provenance 不整合)。

**裁定 = AP2-Q4=b: 契約ベース** (kawaz 2026-07-24。旧案 a「AST-束縛ハンドル」は棄却 —
env/xargs 構図の責務越境: 産物が生成元への参照を持ち回るのは「呼び出し側が対応関係を管理する」
という自然な責務分担を型側が肩代わりする過剰。多言語スパイクで MoonBit は呼び出し単位の
generative brand が不可能と実機確定しており (`docs/findings/2026-07-24-multilang-spike-findings.md`
§3「provenance の言語別上限」)、ハンドル内包でも言語間で保証水準が揃わない):

- **API 形状は ast 引数維持**: `view_of_interpretation(ast, interp)` /
  `resolve_interpretation(ast, interp, args, sources?)` / `output(ast, resolved)` — 玄関は
  一貫して ast を第 1 引数に受ける (DR-118 の概念シグネチャそのまま)
- **doc 契約**: 「bindings / interpretation は、それを産んだ parse の ast とだけ組み合わせて
  よい。別 ast との混用時の挙動は未定義」を各玄関の doc 契約として明記。ValueSources の
  純粋性契約 (§3 H12) と同じ位相の契約であり、spec 側は「provenance 保証水準は言語実装が
  宣言する」形 (静的保証 = Rust の generative brand / 契約ベース = MoonBit) のどちらも
  conformant とする — スパイク findings §4 の「provenance 保証水準の宣言」がこの規定の入力
- **identity 検証は任意 (実装コストで軽い方へ)**: AtomicAST に生成時 identity を振って
  実行時検出する強化は言語実装の任意。参照実装 (kuu.mbt) は v1 では入れない (検出機構の
  追加コスト > 混用バグの実発生率、という軽い方の判断) — 入れる場合も検出は契約違反の
  即時 abort であって Failure outcome への転落ではない (呼び出し側バグを wire に載せない)
- **言語側の型強化は任意**: Rust 実装が generative brand で静的保証に格上げするのは自由
  (contract 上位互換)。spec は強制しない

**opaque / pub(all) の線引き原則** (発明): 「利用者が **match で分岐する** wire 語彙 enum
(閉じた集合、variant 追加は spec major と同期) だけ pub(all)。読むだけの型は pub struct
(構築不可)。engine の評価座標を含む型 (bindings) は opaque ハンドル」。engine 側の
`Node` 18 variant / `ElementDef` 66 フィールド / `Entity` mut は internal 化で全て消える —
B1 の「フィールド 1 個追加が破壊変更」は builtins の拡張 ABI 面だけに縮む。

### 1.3 玄関シグネチャの変化

```
parse(ast, args, sources?) -> ParsedOutcome                       // §3.3 の sources 統一込み
resolve(ast, bindings : ParsedBindings, args, sources?) -> ResolvedOutcome
resolve_interpretation(ast, interp : Interpretation, args, sources?) -> ResolvedOutcome   // §2 新設
output(ast, resolved : ResolvedBindings) -> OutputView
```

**warnings の形 (sol major 7 — 実装裁量にせず確定)**: method 形の 2 口
`ParsedOutcome::warnings(self) -> Array[Warning]` / `ResolvedOutcome::warnings(self) -> Array[Warning]`
とする。自由関数 2 口 (`warnings_parsed` / `warnings_resolved`) は名前で相を運ぶ冗長、trait 受けは
2 型のためだけの trait 新設で過剰。method なら呼び出し面は `outcome.warnings()` の 1 綴りに
揃い、相は self の型が運ぶ。

現 `resolve(ast, outcome, ...)` の「Failure/Ambiguous をパススルー」挙動は段階型で**型ごと消える**
(Success の payload だけが resolve へ進める)。現 `output(effects~, resolved?)` の 2 引数 labeled は、
`ResolvedBindings` が parse 相 binds の由来 (`merge_sentinels_from_origin` 済み) を内部に抱えることで
1 引数に畳める — effects 射影に必要な parse 相情報は `resolve` が `ResolvedBindings` へ同梱する
(現 front_door.mbt L324 の merge を型内部へ移す)。

### 1.4 利用者コードのビフォーアフター

**README Hello World** (kuu.mbt README.md L42-48):

```moonbit
// before
match @kuu.parse(ast, ["--verbose"]) {
  @engine.Success(binds) => ...   // binds : Array[@engine.Binding] を直接舐める
  @engine.Failure(_) => ...
  @engine.Ambiguous(_) => ...
}
// after — @engine 参照ゼロ、output まで玄関 4 手で完結
match @kuu.parse(ast, ["--verbose"]) {
  Success(binds) =>
    match @kuu.resolve(ast, binds, ["--verbose"]) {
      Success(resolved) => println(@kuu.output(ast, resolved).result)
      Failure(f) => println(f.errors[0].message)
    }
  Failure(f) => println(f.errors[0].message)
  Ambiguous(a) => println("\{a.interpretations.length()} interpretations")
}
```

**conformance runner** (kuu.mbt src/kuu/json_conformance_test.mbt L2165-2201): parse→output の
parse_view 経路 (`@kuu.output(ast, effects=binds)` — resolve 前の binds から effects を検証) が
`ParsedBindings` を output に渡せなくなる。**effects 射影は parse 相の産物** (DR-045 の発火列)
なので、玄関に parse 相専用の射影口を 1 つ残す:
`parsed_effects(ast, bindings) -> Array[OutputEffect]` (AP2-Q4=b により ast 引数維持の自由関数形。名は実装時に玄関語彙へ揃えてよい)。
`output` (result/sources 込みの完全 wire) は resolved 専用のまま — 「effects だけは parse 相で
読める」は DR-104 §5 の相区分そのもの (effects の順序・内容は resolve で変わらない) であり
2 口受理 (DR-118 採用しなかった案) の再導入ではない。runner の effects-only 検証
(constraints-parse 系で 40 箇所が該当) はこの口へ移行し、**fixture 自体は 1 本も変更しない**
(sol major 4 の「壊れる」は「runner 経路の消失」であり、射影口の設置で fixture 側は無傷 —
§5 の見積りを「既存 fixture 変更 0 本 + runner/玄関の経路再配置」に精密化)。

**kuu-cli** (impl/mbt/cli/src/main/main.mbt): `@engine.ConfigVal` 参照 (L242/L247) が
`@kuu.ConfigVal` に変わる他は、outcome match の型名変更のみ。REV-Q4 の書き直しが同窓後に
続くため、ここでは最小追随に留める。

## 2. Ambiguous の resolve 意味論 — DR-118 素案骨子 (REV-Q3 従属)

DR 番号は次番 (現最新 DR-117)。**規範化が主、発明は遷移 API の形のみ**。

### 2.1 決定案の骨子

1. **遷移型** (発明): ambiguous からの前進は「利用者が interpretation を 1 つ選び、
   `resolve_interpretation(ast, interp, args, sources)` で ResolvedOutcome へ遷移する」。
   選択の基準 (先頭を取る / ユーザに聞く / エラーにする) は利用者の関心で、kuu は順序を
   与えない (DR-053 §3「列挙は集合的、順序は同一性成分でない」の帰結)。resolve 失敗は
   通常経路と同じ Failure 転落 (DR-047 §4)
2. **interpretation ビューの相** (規範化): DR-053 §3 の「結果オブジェクト形のビュー」は
   **parse 相までを適用した姿** (値源ラダー未適用) と明文化する。付随規則は現参照実装
   `output_of_interpretation` (front_door.mbt L679-685) の 3 規則をそのまま格上げ:
   (a) interpretation 自身の bindings が運ばない Default-source scalar は除外、
   (b) DR-073 §1 の claimants に載る key の default は衝突 provenance のため残す、
   (c) 空 accumulator 配列は構造として残す。
   現 fixture (`fixtures/failure-actions/ambiguous-non-firing.json` ほか interpretations を
   持つ全 fixture、および conformance runner が「ambiguous case は resolve を要求しない」
   posture) が既にこの形を暗黙採用しており、**fixture 変更ゼロ**の追認になる
3. **なぜ parse 相止まりか** (論拠): ambiguous の解消前に値源ラダーを適用すると、解釈間で
   claimants の占有が異なるため「どの解釈の席にラダーを注ぐか」が解釈ごとに分岐する —
   ビューは「差分が一目で分かる」(DR-053 §3) ための比較面であり、比較面には全解釈で
   一様に計算できる相 (parse 相) しか使えない。ラダーの帰結が見たければ選んでから
   `resolve_interpretation` する、が相区分 (DR-104 §5) の一様適用

### 2.2 波及

- DR-053 §3 へ明確化 note (前例形式) を追記、CONFORMANCE §3 の interpretations 比較規約に
  「ビューは parse 相 + 上記 3 規則」を明記
- 新 fixture 1-2 本: `resolve_interpretation` の遷移を pin する query (ambiguous を選んで
  resolve し Success/Failure 双方) — 現 query 語彙で表現可能かは fixture 設計時に確認
  (parse query の expect 拡張で足りる見込み)

## 3. H10-H14 の解消案

### H10: registry 二重供給 (裁定不要 — 導出で一意)

現状 `completion_entry(AtomicAST, Registry, ...)` / `completion_query(AtomicAST, Registry, ...)` /
`dispatch_completion_script(Registry, Outcome)` / `dispatch_help_query(Registry, AtomicAST, ...)` が
`ast.extensions` と別口で Registry を受ける (kuu.mbt src/kuu/pkg.generated.mbti L12-L28)。
`parse_definition` が AtomicAST に extensions を封入済み (front_door.mbt L43) なので、
**AtomicAST を受ける関数は全て ast.extensions を読む形へ統一し、引数 Registry を廃止**。
`dispatch_completion_script(Registry, Outcome)` は AtomicAST を受けない唯一の口 — シグネチャを
`(AtomicAST, ParsedOutcome)` へ変え同原則に載せる。desync 経路 (decode した registry と
query 時の registry が食い違う) が型で消える。引数順の揺れも同時に解消 (ast が常に第 1 引数)。

### H11: Candidate.ty 改名 + 補完系の層命名 (裁定不要)

- `ty` → `type` 対応の kuu 側 `Candidate` は §1.2 で新設 (wire 綴り `type`、実装識別子は
  予約語回避で TY-Q1 の許容範囲)。engine 側は internal なので改名不要
- 補完系 5 口の層を名前に出す: DR-060 §5 / DR-117 の 2 層 (候補計算層 / シェル統合層) に従い
  `complete` (層 1) はそのまま、層 2 の `completion_entry` / `completion_query` /
  `dispatch_completion_script` / `generate_completion_script` は `completion_` prefix で既に
  揃っている — 改名は最小 (`dispatch_completion_script` → `completion_script_request` 等、
  動詞形の統一) に留め、doc comment に層対応表を置く。大掛かりな rename は発明になるため
  実装時に fable 判断 1 回で確定

### H12: 値源供給 3 様の統一 (発明: 束ね型。spec の provider 契約とは整合)

spec の provider 契約は env = `(key) -> string | null` (DR-049 §1)、config = `(path) -> 階層値 | null`
(DR-050 §2)、tty = stream 名 → 生観測 (DR-099 §4)。現玄関は env だけ Map、config は closure、
tty は Map で形が割れている。解消:

```moonbit
pub struct ValueSources {  // 構築は labeled コンストラクタ関数で
  env : (String) -> String?          // DR-049 §1 の provider 形そのまま
  config : (String) -> ConfigVal?    // DR-050 §2 そのまま
  tty : (String) -> TtyObs?          // DR-099 §4 を lookup 関数形に揃える
}
pub fn value_sources(env? : ..., config? : ..., tty? : ...) -> ValueSources  // 省略 = no-op provider
pub fn env_from_map(Map[String, String]) -> (String) -> String?  // 現 Map 利用者向け糖衣
```

- **全 3 源を spec の provider closure 形へ揃える** (Map は糖衣関数で受ける)。parse / resolve /
  resolve_interpretation が同一 `sources?` 1 引数を受け、B3 の「同じ 3 引数を 2 発へ再供給する
  冗長」が 1 変数の使い回しに縮む
- **相間一貫性の保証 (sol major 6)**: 束ねだけでは「parse と resolve で異なる値を返す provider」
  (非純粋 closure) が相間の意味論を silent に割る問題が残る。**契約化で解消する**: ValueSources
  の doc 契約として「同一 key への応答は parse/resolve の 2 相を通じて安定であること。違反時の
  挙動は未定義」を明記する (getenv / ファイル読みの実態は事実上安定で、実害があるのは意図的な
  非純粋 closure のみ)。snapshot 内包案 (parse 時に読んだ値を ParsedBindings へ焼き込み resolve
  が再読しない) は不採用 — parse 相は requires フィルタが触った席しか読まず、resolve 相が読む
  全席の値を parse 時点で先読みするのは「どの席を読むか」の走査を 2 重化する実装複雑化で、
  提供側が普通に書けば成立する安定性をエンジン側の複製で肩代わりする均衡の悪さがある。契約
  違反の検出 (debug モードでの再読値比較等) は将来の DX 関心として持ち越し
- tty の Map → lookup 化は wire (fixture の `tty` オブジェクト) に触らない — fixture decode 側で
  Map を包むだけ。spec 改訂不要 (DR-099 §4 は「stream 名 → 生観測」の対応関係を規定しており
  写像の実装形は縛っていない)

### H13: builtins factory の labeled 化 (裁定不要)

`separated_arg(String, String?, &TypeExt, RoundMode, BoolConfig, Array[FnInvocation], allow_base_prefix?, merge?)`
(builtins/pkg.generated.mbti L128) 級の位置引数連弾を、name 以外全 labeled へ。同型 4 連続の
`generate_completion_script(String, String, String, String)` (M4 指摘と同根) も同窓で labeled 化。
builtins は §1.1 で公開面に残るため、v1 前の今が唯一の無償窓。

### H14: bool option の値要求罠 (spec 裁定は不要と判断 — error hint 側で解消)

`{"type": "bool"}` の option が `--verbose` 単独で missing_operand になるのは spec どおり
(bool は値スロットを取る型、flag が値なし型 — DESIGN §3.3)。糖衣の既定を変える
(long 単独 bool を flag 扱いに倒す) のは型意味論の変更で REV 裁定済み事項の外に出るため
採らない。解消は**説明チャネル側**: missing_operand の機械可読 reason (DR-066) は既に
あるので、レンダラ層 (kuu-cli / canonical renderer) が「bool 型要素の operand 欠如」時に
`hint: did you mean type "flag"?` 相当の誘導を出す。これは DR-053 §4 の「素材はフィールド、
文言はレンダラ」の枠内で spec 改訂不要 — kuu-cli dogfooding サイクル (REV-Q4) の要件へ
引き継ぐ。**ただし error 構造に「型が bool だった」ことをレンダラが判別する素材が現 wire に
あるかは実装時に確認し、素材が足りなければ errors への素材追加を DR 明確化 note で行う**
(その時点で Q 化)。

## 4. 2^53 明記 (REV-Q2) — DESIGN/REFERENCE 改訂点と bigint 受け口確認

### 4.1 改訂点 (規範化: DR-050 §4 が既に binary64 前提を明記済み、总則へ昇格)

- **DESIGN §3.3** (L269 周辺): 「Big 系は bigxx 型で」の 1 句を削除し、置換として
  「`int` / `number` の保証精度は binary64 の整数安全域 (絶対値 2^53 以下)。超過する整数
  リテラルの受理は保証しない。任意精度が要る場合は言語実装側の拡張型 (1st party 提供の
  拡張ライブラリ) の関心」を明記
- **REFERENCE.md**: `int` / `number` 型の項に同内容の利用者向け 1 段落 (現状 2^53 への言及ゼロ)
- **超過値の扱い**: REV-Q2 裁定文は「reject/warning」併記で挙動が未収束 → **AP2-Q1** (§6)。
  導出を試みると: DR-075 の int 値空間判定は「値空間外 = Error」の系で、2^53 超過は
  「binary64 で表現した時点で元の 10 進が復元不能 = 値空間判定自体が信頼できない」ため
  reason `integer_precision_exceeded` の **Error (reject) が既定**、が素直。ただし
  「警告して丸め値で続行」を糖衣 (int_round 同様の config 軸) で許すかは裁定余地が残る
- fixture: 2^53 境界 (`9007199254740992` 受理 / `9007199254740993` reject) の pin を
  value-typing 系へ 2-3 本新設 — ただし fixture 自体が JSON number を運べない
  (runner の decode が binary64) ため **string 源経由で pin する** (DR-050 §4 の
  「string 源は厳密判定」側が検査可能な唯一の面。native number 源の超過は原理的に
  fixture で観測不能 — この非対称も DESIGN に 1 行明記)

### 4.2 言語側 bigint 拡張の受け口確認 (現 descriptor 境界で足りるか)

**足りる、ただし宣言軸 1 個の追加が既知の宿題として残る**。根拠:

- type_parser の拡張追加自体は DR-107 の descriptor 機構 + DR-094 の拡張 ns で受けられる
  (bigint 型は `ext:bigint` 級の type_parser resident)
- 空白は **candidate.type への写像**: DR-104 §2 明確化 (2026-07-15) が「拡張 ns の
  type_parser が増える場合、その descriptor 宣言側で candidate.ty への写像 kind を宣言する
  必要がある (宣言軸の追加は当該拡張の DR の関心)」と既に留保済み。DR-111 §1 の
  マトリクスにも同留保あり。つまり bigint 拡張 DR (将来) が descriptor に
  `candidate_type` 写像軸を 1 個足すだけで閉じる — 本サイクルでの先行実装は不要
- `Value` が `Number(Double)` 一枚である点は、拡張型の値が pipeline を通る経路
  (DR-034 の parse 出力) に効く — 拡張 type_parser の出力が Value に載らない値
  (任意精度整数) を持つ場合の運搬形は当該拡張 DR の関心として**本サイクルでは開けない**
  (v1 core の値空間は 2^53 明記で閉じる、が REV-Q2 裁定の趣旨)

## 5. 実装順序とマイルストーン

依存: DR-118 (§2) は玄関型 (§1) の `resolve_interpretation` の前提 / 2^53 (§4) は独立 /
H10-H13 は玄関型の同窓破壊に同乗。

1. **M1 (spec 先行) — 実施済み** (spec commit 66f88200): DR-118 起草 + DR-053 §3 明確化 note +
   CONFORMANCE §3 追記 + §4.1 の DESIGN/REFERENCE 改訂 + 2^53 境界 fixture
   (`fixtures/value-typing/int-precision-2pow53.json`)。遷移 fixture は解釈同定子の設計が
   要るため DR-118 射程外へ (見送り理由は DR-118 参照)。spec push はロックステップ窓
   (pin bump まで同窓) — **M1 fixture の green 化は M2a の実装 commit と同一窓に固定する**
   (sol blocker 3: fixture 単独 push は VANISHED SKIP 事故の再演になる)
2. **M2a (kuu.mbt: 2^53 lexical check) — sol blocker 3 の反映で独立マイルストーン化**:
   int parser の string 源経路に **Double 化前の字句判定**を入れる。Double parse 後では
   `9007199254740993` と `9007199254740992` が区別できない (どちらも同じ binary64 に落ちる)
   ため、判定は 10 進字句そのもので行う: number 字句を正規化 (符号 / 桁区切り `_` 除去 /
   指数展開 / 小数部の整数性確認) した上で有効桁列を 2^53 = 9007199254740992 の 16 桁と
   文字列比較する (17 桁以上は即超過、16 桁は辞書順比較)。入口は CLI トークン / env /
   config の JSON string の全 string 源 (DR-050 §4 の string 経路は 1 本に合流済みなので
   実装点は int parser 1 箇所)。ここが green になって初めて M1 fixture が通る
3. **M2b (extension ABI 設計)**: AP2-Q3=b の切り出し設計を実装に先行して確定する —
   §1.1 の判定器 (descriptor 宣言軸 / DR-107/111/114 ABI 節に現れる型) で builtins mbti の
   @engine 参照 75 箇所を全数分類し、「extension に置く型リスト + Node 露出が残る箇所の
   individual 対処 (InstallBuilder 寄せ)」の表を作る。bigint 拡張 (REV-Q2) / custom
   completer / 自作 type の 3 顧客が extension の型だけで書けることを机上検証 (書けない型が
   出たらリストへ追加)。産物は本 findings への追記 or 別 findings (設計が大きければ)。
   **残る Node 露出は列挙して統括報告** (実装前の個別裁定)
4. **M2c (kuu.mbt 骨格)**: engine → `src/internal/engine/` 移設 + `src/extension/` 実体化
   (M2b の表どおり。builtins は extension の型で書き直して公開維持) + §1.2/§1.2a の型新設 +
   玄関シグネチャ変更 (段階型 + ValueSources、ast 引数維持 = AP2-Q4=b + provenance doc 契約)。
   ここが破壊の本体 — **1 commit 系列で一気に green まで持っていく** (中間状態はビルド不能)。
   **checklist (sol major 8)**:
   - [ ] `src/engine/moon.pkg.json` / `src/extension/moon.pkg.json` / `src/builtins/moon.pkg.json`
         の移設・新設 (import パス全追随)
   - [ ] `src/kuu/moon.pkg.json` の import を internal + extension パスへ
   - [ ] justfile / CI の mbti 生成・検査 task のパス追随 (`moon info` の出力先が変わる)
   - [ ] conformance runner の `@engine.` 直参照除去 (Success/Failure/Ambiguous match、
         L2172-2340 ほか全域 — runner は kuu 玄関語彙のみで書けることが封鎖の検証を兼ねる)
   - [ ] wbtest 群 (front_door_wbtest / eval_wbtest / installer_wbtest...) の参照整理
         (package 内なので internal 参照可 — 移動不要だが import 綴りは変わる)
   - [ ] 完了判定: `src/kuu/pkg.generated.mbti` に `@engine.`/internal 参照 0 件 (grep)。
         extension の mbti にも Node / Scope / Entity / ElementDef が現れないこと (grep)
   - [ ] parse 相 effects 射影口の設置と runner effects-only 経路 (40 箇所) の移行
5. **M3 (API 整理)**: H10 (registry 統一) / H11 (Candidate 射影 + 層命名) / H13 (labeled 化)。
   M2 と同 push 窓
6. **M4 (追随)**: README Hello World 書き換え / kuu-cli 最小追随 / pin bump。CI green 確認

**fixture 波及見積り (sol major 4 で精密化)**: 既存 fixture の **wire (期待値) は全て不変**
(§2 は追認、§1 は実装配置)。新設は 2^53 系 1 本 (実施済み、4 case)。ただし「fixture 0 本」は
検査契約 (runner がどの玄関経路で fixture を食わせるか) の不変を意味しない — effects-only
検証 40 箇所の経路が parse 相 effects 射影口へ移る等、runner の再配線は M2c checklist が
正本。突合ロジック (構造等価・集合比較) は不変。

**kuu-cli dogfooding (次サイクル) への引き継ぎ面**: (a) H14 の error hint 素材確認 (§3)、
(b) 段階型になった玄関を kuu-cli が使う際の ambiguous 提示 UX (interpretation ビューの
レンダリング) が dogfooding の主素材、(c) ValueSources により kuu-cli の env/config/tty
組み立てが 1 箇所に畳める。

## 6. AP2-Q バッチ素案 (裁定が要る分岐)

- **AP2-Q1: 裁定済み (kawaz 2026-07-24) = a: Error 固定**。超過は常に parse エラー、warning
  続行 opt-in は設けない (reason は既存 `int_out_of_range` を使用、spec 反映済み — commit 66f88200)

- AP2-Q2 は別トピック (DR-075 supersede の確認、統括起票) で消費済み — 本書の Q は Q3 から

- **AP2-Q3: 裁定済み (kawaz 2026-07-24) = b: 拡張 ABI package を本サイクルで設計・切り出す**。
  当初推し a (拡張面を閉じる) は「後送りの押し付け + v1 を急ぐ前提混じり」の指摘で棄却。
  bigint 拡張 (REV-Q2 の言語側回収) をテストケースに、custom completer / 自作 type 登録も
  顧客として設計する。設計方針は §1.1、多言語スパイク findings §4 が設計入力

- **AP2-Q4: 裁定済み (kawaz 2026-07-24) = b: 契約ベース (ast 引数維持)**。a (AST 束縛
  ハンドル) は「呼んだ先の結果補償までライブラリが抱える責務越境 (env/xargs の構図)」で棄却。
  ast と産物の対応維持は呼び出し側の責務として doc 契約化。identity 検証の有無は実装コストで
  軽い方に倒す (検証なし契約のみも可)。言語側の型レベル強化 (Rust generative brand 等) は
  各実装の任意工夫 — MoonBit は不可能と実機確定済み (rank-2/existential 無し、多言語スパイク
  findings §3)。帰結の詳細は §1.2b

他の分岐 (H14 の扱い、opaque 線引き、ValueSources 形と純粋性契約、warnings method 形、
parse 相 effects 射影口) は既裁定 (REV-Q1/Q3) と既存 DR からの導出で確定できるため
Q 化しない。実装中に §3 H14 の素材不足が判明した場合のみ追加 Q を起票する。

## 7. sol 二次レビュー指摘への対応一覧 (2026-07-24 改訂)

| # | 指摘 | 対応 | 反映先 |
|---|---|---|---|
| B1 | engine internal × builtins 公開が矛盾 (@engine 75 箇所) | 採用 — AP2-Q3 化、裁定 = b (拡張 ABI package を本サイクル設計) | §1.1 / §6 |
| B2 | Interpretation::view() 実装不能 + AST provenance 未保持 | 採用 — AP2-Q4 化、裁定 = b (契約ベース、ast 引数維持) | §1.2b / §6 |
| B3 | 2^53 字句判定のマイルストーン欠落 | 採用 — M2a として独立化 (Double 化前の 10 進字句比較)、M1 fixture green 化との lockstep 明記 | §5 |
| M4 | 「fixture 0 本」は検査契約基準で不正確 | 一部採用 — fixture の wire は 0 本変更で正 (実測: 期待値に触れる変更なし)。ただし runner の effects-only 経路 40 箇所の再配線を明記し、parse 相 effects 射影口で fixture 無傷を維持 | §1.4 / §5 |
| M5 | 公開型 14 種は transitive closure 不足 | 採用 — mbti 機械走査 (直接参照 14 型) + 追加 8 型群を表化、M2c 完了判定に grep 検査を設置 | §1.2a |
| M6 | ValueSources 束ねだけでは B3 未解消 | 採用 (契約化側) — provider 安定性を doc 契約化。snapshot 内包は不採用 (resolve 相の全席先読みが走査の 2 重化になる根拠を明記) | §3 H12 |
| M7 | warnings API が実装裁量のまま | 採用 — method 2 口 (`outcome.warnings()`) に確定 | §1.3 |
| M8 | M2 checklist 不足 | 採用 — moon.pkg×2 / justfile mbti path / runner @engine 直参照除去を checklist 化 | §5 M2b |
| M9 | variant × API の遷移表欠落 | 採用 — 表を追加 (dispatch_completion_script は ParsedOutcome 受理と確定) | §1.1b |
| M10 | Candidate は 7 でなく 9 フィールド | 採用 — 9 に訂正 (is_alias/hidden/deprecated は meta flatten 済みの個別席) | §1.2 |
| M11 | ParseError の args_pos / path が wire 正本と不一致 | 採用 — fixture.schema.json `runtimeError` の `{element, args_pos, kind, reason, message, path?}` に訂正 (旧表記 argv_pos は DR-053 起草時の旧名) | §1.2 |

## 関連

- `docs/findings/2026-07-24-fresh-eyes-adversarial-review.md` (指摘台帳 + REV-Q 裁定)
- DR-053 / DR-104 / DR-047 / DR-049 / DR-050 / DR-075 / DR-099 / DR-107 / DR-111
- kuu.mbt `src/kuu/front_door.mbt` / `src/kuu/pkg.generated.mbti` / `src/engine/pkg.generated.mbti`
- 前例: `docs/journal/2026-07-21-renderer-and-api-polish-cycle.md` (API 磨き第 1 サイクル)
