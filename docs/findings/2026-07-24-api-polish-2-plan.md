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

**builtins の扱い (sol blocker 1)**: 当初案の「builtins は公開面として残す」は単独では成立
しない — builtins factory のシグネチャは `@engine` 型を 75 箇所参照しており (builtins
pkg.generated.mbti の機械カウント)、engine を internal 化すると builtins の公開シグネチャが
外部から書けない型を露出する矛盾になる。解消の 2 案は **AP2-Q3** (§6) へ:

- **案 a (推し): 外部拡張面も本サイクルで閉じる** — builtins も `src/internal/builtins/` へ
  移設し、v1 公開面は kuu 玄関のみとする。拡張実装者向けの公開 ABI (Registry / TypeExt /
  InstallerExt / descriptor 群) は「言語側拡張機構の公開」として別サイクルで設計し切って
  開ける (REV-Q2 裁定の bigint 拡張が最初の顧客 = 拡張 ABI の dogfooding になる)。v1 の
  canonical assembly 利用 (parse_definition の extensions 省略経路) は玄関だけで完結する
  ため、現時点の外部利用者を壊さない
- **案 b: 拡張 ABI package を切り出す** — engine の型のうち拡張契約に要る部分
  (Registry / 各 Ext trait / descriptor / Node 構築子...) を `src/extension/` (public) へ
  移し、engine 残余を internal 化。本サイクル内で「拡張に要る最小型集合」の線引き設計が
  必要になり、Node / ElementDef 級の巨大 pub(all) が結局公開面に残る (B1 の縮小幅が小さい)

### 1.1b ParsedOutcome variant × 玄関の遷移表 (sol major 9 の反映)

| variant \ 玄関 | resolve | resolve_interpretation | output | warnings | help | complete / completion 系 |
|---|---|---|---|---|---|---|
| Parsed Success(binds) | ✓ (binds を渡す) | — (型不一致) | ✗ (型で拒否 — DR-118 §1) | ✓ | n/a (help は AtomicAST 起点) | n/a (同左) |
| Parsed Failure | — (終端。型で渡せない) | — | ✗ | ✓ (deprecated 警告は failure でも出る) | n/a | n/a |
| Parsed Ambiguous | — | ✓ (interp を 1 つ選ぶ) | ✗ (ビューは Interpretation::view 経由) | ✓ | n/a | n/a |
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
| `Interpretation` | `@engine.AmbiguousInterpretation` | opaque + 射影メソッド | ビュー射影と `resolve_interpretation` への受け渡し。claimants は `claimants()` で `Array[(String, String)]`。**ビュー計算は AST が必須** (§1.2b) |
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
| `Registry` / `CapabilityExt` | 玄関引数 7 箇所 / capability 4 箇所 | **AP2-Q3 の帰結に従属**: 案 a なら Registry は玄関から消える (H10 §3.1 で AtomicAST 封入に統一済み + parse_definition の extensions? 引数は canonical 固定になり隠れる) が、`install_canonical` / `install_vocabulary` / capability 2 関数も公開面から落ちる。案 b なら extension package 居住 |
| `ConfigVal` / `TtyObs` / `Value` / `Source` / `ResultValue` | 玄関引数・OutputView | 当初表どおり kuu 側へ |

M2 の完了条件に「`moon info` 後の `src/kuu/pkg.generated.mbti` に `@engine.` (internal 参照)
が 0 件」の機械検査を置く (grep 一発で判定可能)。

### 1.2b Interpretation のビュー計算と AST provenance (sol blocker 2 の反映)

当初案の `Interpretation::view()` (引数なし method) は実装不能 — ビュー射影 (現
`output_of_interpretation`) は ast.root / ekmap / extensions を要するため、Interpretation 値
単体からは計算できない。また `resolve_interpretation(ast, interp, ...)` は別の definition の
ast と interp を混ぜて渡せる (provenance 不整合が silent に走る)。解消の 2 案は **AP2-Q4**
(§6) へ:

- **案 a (推し): AST-束縛ハンドル** — `Interpretation` が AtomicAST への参照を内包して生まれる
  (parse が ParsedAmbiguity を組む時点で束縛)。`interp.view()` / `interp.resolve(args, sources)`
  が引数なし/AST なしで成立し、取り違えが構文的に不可能になる。ParsedBindings /
  ResolvedBindings も同様に AST を内包し、`resolve(bindings, args, sources)` /
  `output(resolved)` から ast 引数が消える — 玄関全体が「AtomicAST は parse_definition と
  parse だけが受け、以降はハンドルが運ぶ」形に単純化。コスト: ハンドルが AST を生かし続ける
  (GC 圧) が、CLI parse の寿命では実害なし
- **案 b: identity 検証** — AtomicAST に生成時 identity を振り、resolve_interpretation /
  output が「ast と bindings の identity 不一致」を検出して Failure (or panic 級の契約違反
  エラー) にする。API 形状は当初案のまま、検出が実行時になる分だけ弱い

いずれも DR-118 の概念シグネチャ (atomic を引数に書く) とは矛盾しない — DR-118 §1 は
「言語側 API の字面の規範化ではない」と明記済みで、案 a は atomic の供給をハンドル内包で
実現する言語側設計。

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
`ParsedBindings::effects(self) -> Array[OutputEffect]` (案 a なら引数なし method)。
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
3. **M2b (kuu.mbt 骨格)**: engine → internal/engine 移設 (+ AP2-Q3 の帰結で builtins も) +
   §1.2/§1.2a の型新設 + 玄関シグネチャ変更 (段階型 + ValueSources + AP2-Q4 の帰結)。
   ここが破壊の本体 — **1 commit 系列で一気に green まで持っていく** (中間状態はビルド不能)。
   **checklist (sol major 8)**:
   - [ ] `src/engine/moon.pkg.json` / `src/builtins/moon.pkg.json` の移設 (import パス全追随)
   - [ ] `src/kuu/moon.pkg.json` の import を internal パスへ
   - [ ] justfile / CI の mbti 生成・検査 task のパス追随 (`moon info` の出力先が変わる)
   - [ ] conformance runner の `@engine.` 直参照除去 (Success/Failure/Ambiguous match、
         L2172-2340 ほか全域 — runner は kuu 玄関語彙のみで書けることが封鎖の検証を兼ねる)
   - [ ] wbtest 群 (front_door_wbtest / eval_wbtest / installer_wbtest...) の参照整理
         (package 内なので internal 参照可 — 移動不要だが import 綴りは変わる)
   - [ ] 完了判定: `src/kuu/pkg.generated.mbti` に `@engine.`/`@internal` 参照 0 件 (grep)
   - [ ] ParsedBindings::effects 射影口の設置と runner effects-only 経路 (40 箇所) の移行
4. **M3 (API 整理)**: H10 (registry 統一) / H11 (Candidate 射影 + 層命名) / H13 (labeled 化)。
   M2 と同 push 窓
5. **M4 (追随)**: README Hello World 書き換え / kuu-cli 最小追随 / pin bump。CI green 確認

**fixture 波及見積り (sol major 4 で精密化)**: 既存 fixture の **wire (期待値) は全て不変**
(§2 は追認、§1 は実装配置)。新設は 2^53 系 1 本 (実施済み、4 case)。ただし「fixture 0 本」は
検査契約 (runner がどの玄関経路で fixture を食わせるか) の不変を意味しない — effects-only
検証 40 箇所の経路が ParsedBindings::effects へ移る等、runner の再配線は M2b checklist が
正本。突合ロジック (構造等価・集合比較) は不変。

**kuu-cli dogfooding (次サイクル) への引き継ぎ面**: (a) H14 の error hint 素材確認 (§3)、
(b) 段階型になった玄関を kuu-cli が使う際の ambiguous 提示 UX (interpretation ビューの
レンダリング) が dogfooding の主素材、(c) ValueSources により kuu-cli の env/config/tty
組み立てが 1 箇所に畳める。

## 6. AP2-Q バッチ素案 (裁定が要る分岐)

- **AP2-Q1: 裁定済み (kawaz 2026-07-24) = a: Error 固定**。超過は常に parse エラー、warning
  続行 opt-in は設けない (reason は既存 `int_out_of_range` を使用、spec 反映済み — commit 66f88200)

- AP2-Q2 は別トピック (DR-075 supersede の確認、統括起票) で消費済み — 本書の Q は Q3 から

- **AP2-Q3: engine internal 化と拡張 ABI の公開範囲** (sol blocker 1、詳細 §1.1)
  - a. **外部拡張面も本サイクルで閉じる** (**推し** — builtins も internal 化、v1 公開面は
    kuu 玄関のみ。拡張 ABI は bigint 拡張 (REV-Q2) を最初の顧客として別サイクルで設計して
    開ける。理由: 拡張 ABI の線引きは Registry / Ext trait / descriptor / Node 構築子に跨る
    大きな設計で、本サイクルに繰り込むと破壊窓が肥大する。閉じておけば後から開けるのは
    非破壊、開けたものを閉じ直すのは破壊 — B1 と同型の非対称)
  - b. 拡張 ABI package (`src/extension/`) を本サイクルで切り出す (拡張の最小型集合の設計が
    今必要になり、Node 級の巨大 pub(all) が公開面に残って B1 の縮小幅が減る)
  - 参照: §1.1 / §1.2a、builtins pkg.generated.mbti の @engine 参照 75 箇所 (機械カウント)

- **AP2-Q4: Interpretation / bindings ハンドルの AST provenance** (sol blocker 2、詳細 §1.2b)
  - a. **AST-束縛ハンドル** (**推し** — parse 産物が AtomicAST 参照を内包し、`interp.view()` /
    `interp.resolve(...)` / `output(resolved)` から ast 引数が消え、別 definition との
    取り違えが構文的に不可能。DR-118 の概念シグネチャとは矛盾しない — atomic の供給形は
    言語側設計であることを DR-118 §1 が明記済み)
  - b. identity 検証 (API 形状は ast 引数のまま、不一致を実行時エラーで検出 — 検出が実行時に
    なる分だけ弱く、「契約違反」という新しいエラー種別の座席設計が要る)
  - 参照: §1.2b、kuu.mbt front_door.mbt の `output_of_interpretation` (ast 必須の現物根拠)

他の分岐 (H14 の扱い、opaque 線引き、ValueSources 形と純粋性契約、warnings method 形、
ParsedBindings::effects 射影口) は既裁定 (REV-Q1/Q3) と既存 DR からの導出で確定できるため
Q 化しない。実装中に §3 H14 の素材不足が判明した場合のみ追加 Q を起票する。

## 7. sol 二次レビュー指摘への対応一覧 (2026-07-24 改訂)

| # | 指摘 | 対応 | 反映先 |
|---|---|---|---|
| B1 | engine internal × builtins 公開が矛盾 (@engine 75 箇所) | 採用 — AP2-Q3 化 (推し = 拡張面も閉じる) | §1.1 / §6 |
| B2 | Interpretation::view() 実装不能 + AST provenance 未保持 | 採用 — AP2-Q4 化 (推し = AST-束縛ハンドル) | §1.2b / §6 |
| B3 | 2^53 字句判定のマイルストーン欠落 | 採用 — M2a として独立化 (Double 化前の 10 進字句比較)、M1 fixture green 化との lockstep 明記 | §5 |
| M4 | 「fixture 0 本」は検査契約基準で不正確 | 一部採用 — fixture の wire は 0 本変更で正 (実測: 期待値に触れる変更なし)。ただし runner の effects-only 経路 40 箇所の再配線を明記し、ParsedBindings::effects 射影口で fixture 無傷を維持 | §1.4 / §5 |
| M5 | 公開型 14 種は transitive closure 不足 | 採用 — mbti 機械走査 (直接参照 14 型) + 追加 8 型群を表化、M2b 完了判定に grep 検査を設置 | §1.2a |
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
