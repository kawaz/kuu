# API 磨き第 2 サイクル 設計プラン (2026-07-24)

> 由来: 敵対的レビュー統合台帳 (`docs/findings/2026-07-24-fresh-eyes-adversarial-review.md`) の
> §5 裁定 (REV-Q1=a / Q2=a+言語側 bigint / Q3=a 段階型 / Q5=a 同窓実施)。本書は同窓で実施する
> 破壊 1 回分の設計プラン。**発明** (新規に決める形) と**規範化** (現物の暗黙挙動を spec へ格上げ)
> を各節で区別する。REV-Q4 (kuu-cli dogfooding) は次サイクル主タスクで、本書は引き継ぎ面のみ扱う。

## 1. 玄関型の顔ぶれ設計 (REV-Q1 + REV-Q3)

### 1.1 封鎖機構 (発明: 実装配置、spec 影響なし)

MoonBit の internal package 規則 (パスに `internal` セグメントを含む package は祖先 package
以外から import 不可) を使い、kuu.mbt の `src/engine/` を `src/internal/engine/` へ移設して
全 67 pub(all) 型を外部から到達不能にする。`src/builtins/` は**移設しない** — 拡張実装者
(installer / TypeExt / CompleterExt 等の resident 作者) 向け公開面として残す (§3.4 で labeled 化)。
`src/kuu/` (玄関) は internal/engine を import できる位置に置く。

### 1.2 kuu package 側の公開型リスト (発明: 型の切り方 / 規範化: 各フィールドは DR-053/DR-104 の wire 直訳)

REV-Q3=a の段階型強制を骨格にする:

| 新公開型 | 対応する engine 型 | 可視性 | 中身 |
|---|---|---|---|
| `ParsedOutcome` | `@engine.Outcome` (parse 相) | **pub(all) enum** (利用者が match する) | `Success(ParsedBindings)` / `Failure(ParseFailure)` / `Ambiguous(ParsedAmbiguity)` |
| `ParsedBindings` | `Array[@engine.Binding]` | **opaque** (type のみ) | CLI 生 binds のハンドル。読む API を持たない — `resolve` へ渡すだけ |
| `ResolvedOutcome` | `@engine.Outcome` (resolve 相) | **pub(all) enum** | `Success(ResolvedBindings)` / `Failure(ParseFailure)` |
| `ResolvedBindings` | `Array[@engine.Binding]` (解決済み) | **opaque** | `output` が受理する唯一の型 (REV-Q3 の「output は ResolvedOutcome のみ」) |
| `ParsedAmbiguity` | `@engine.AmbiguousData` | pub struct (読み取り専用) | `interpretations : Array[Interpretation]`, `help_entry : String?` |
| `Interpretation` | `@engine.AmbiguousInterpretation` | opaque + 射影メソッド | `view()` (§2 の interpretation ビュー) と `resolve` への受け渡し。claimants は `claimants()` で `Array[(String, String)]` |
| `ParseFailure` | `@engine.FailureData` | pub struct | `errors : Array[ParseError]`, `fired_action : String?`, `help_entry : String?`, `tried_triggers : Array[String]` (DR-053 §2/§4 直訳) |
| `ParseError` | `@engine.ParseError` | pub struct | DR-053 §2 + DR-066 の `{element, argv_pos, kind, reason, message}` |
| `Candidate` | `@engine.Candidate` | pub struct | DR-104 §2 の wire 7 フィールドのみ: `spelling` / `is_value` / `type` (実装識別子は予約語回避、TY-Q1 の許容) / `origin` / `term` / `is_alias` / `hidden` / `deprecated` / `completer?`。engine 側の `path` / `link` / `fire_path` は**運ばない** (DR-104 §2 が wire から明示除外済み — 現 `@engine.Candidate` 直輸出はこの内部座標を漏らしていた) |
| `Warning` | `@engine.Warning` | pub struct | CONFORMANCE §2 / DR-058 §2 の構造化 warning |
| `Value` | `@engine.Value` | **pub(all) enum** | wire 値語彙 (`String`/`Number`/`Bool`) — 利用者が match して値を取り出す終端。REV-Q2 の 2^53 明記はこの型の doc に載せる (§4) |
| `Source` / `EffectOp` | 同名 engine 型 | **pub(all) enum** | wire の閉じた語彙 (DR-031 / DR-045)。variant 追加 = wire 語彙追加 = spec の major であり、pub(all) の破壊性と同期する |
| `ResultValue` | `@engine.ResultValue` | **pub(all) enum** | 結果オブジェクト木 (利用者が walk する) |
| `DefError` / `DefErrorKind` | 同名 engine 型 | pub struct / pub(all) enum | DR-054 §4 の definition-error 列 |
| `ConfigVal` / `TtyObs` | 現状の kuu 側扱いを維持 | pub (構築は `config_from_json` / `tty_obs`) | 変更なし |

既存の `OutputView` / `OutputEffect` / `SourceEntry` / `Help*` 系 / `Completion*` 系 / `DefLoadError`
は engine 型参照 (`@engine.EffectOp` 等) を上表の kuu 型へ差し替えるのみで構造不変。

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
warnings(...) は ParsedOutcome / ResolvedOutcome 両受けの 2 口 or trait 受け (実装裁量)
```

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
parse_view 経路が `ParsedBindings` を output に渡せなくなる — parse 相ビューの検証は
`Interpretation::view()` と同系の parse 相射影を wbtest (package 内、opaque を透視できる) へ移す。
runner の外形 (fixture 突合) は wire 不変なので fixture は壊れない。

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

1. **M1 (spec 先行)**: DR-118 起草・裁定 → DR-053 §3 明確化 note + CONFORMANCE §3 追記 +
   遷移 fixture 1-2 本。並行して §4.1 の DESIGN/REFERENCE 改訂 + 2^53 fixture (AP2-Q1 裁定後)。
   spec push はロックステップ窓 (pin bump まで同窓)
2. **M2 (kuu.mbt 骨格)**: engine → internal/engine 移設 + §1.2 の型新設 + 玄関シグネチャ変更
   (段階型 + ValueSources)。conformance runner / wbtest 追随。ここが破壊の本体 — **1 commit
   系列で一気に green まで持っていく** (中間状態はビルド不能)
3. **M3 (API 整理)**: H10 (registry 統一) / H11 (Candidate 射影 + 層命名) / H13 (labeled 化)。
   M2 と同 push 窓
4. **M4 (追随)**: README Hello World 書き換え / kuu-cli 最小追随 / pin bump。CI green 確認

**fixture 波及見積り**: 既存 fixture の wire は全て不変 (§2 は追認、§1 は実装配置)。
新設のみ (遷移 1-2 本 + 2^53 系 2-3 本)。conformance runner は M2 で書き直しが要るが
突合ロジックは不変。**壊れる既存 fixture: 0 本の見込み**。

**kuu-cli dogfooding (次サイクル) への引き継ぎ面**: (a) H14 の error hint 素材確認 (§3)、
(b) 段階型になった玄関を kuu-cli が使う際の ambiguous 提示 UX (interpretation ビューの
レンダリング) が dogfooding の主素材、(c) ValueSources により kuu-cli の env/config/tty
組み立てが 1 箇所に畳める。

## 6. AP2-Q バッチ素案 (裁定が要る分岐)

- **AP2-Q1: 裁定済み (kawaz 2026-07-24) = a: Error 固定**。超過は常に parse エラー、warning 続行 opt-in は設けない
  - a. reason `integer_precision_exceeded` の Error (reject) 固定 (**推し** — DR-075 の
    値空間 Error 系と一貫、warning 続行は丸め値の黙認になり「黙って精度が落ちる」の再発)
  - b. Error 既定 + int_round 同様の config 軸で「warning + 丸め続行」を opt-in
  - 参照: 本書 §4.1、DR-075、DR-050 §4

他の分岐 (H14 の扱い、opaque 線引き、ValueSources 形) は既裁定 (REV-Q1/Q3) と既存 DR からの
導出で確定できるため Q 化しない。実装中に §3 H14 の素材不足が判明した場合のみ追加 Q を起票する。

## 関連

- `docs/findings/2026-07-24-fresh-eyes-adversarial-review.md` (指摘台帳 + REV-Q 裁定)
- DR-053 / DR-104 / DR-047 / DR-049 / DR-050 / DR-075 / DR-099 / DR-107 / DR-111
- kuu.mbt `src/kuu/front_door.mbt` / `src/kuu/pkg.generated.mbti` / `src/engine/pkg.generated.mbti`
- 前例: `docs/journal/2026-07-21-renderer-and-api-polish-cycle.md` (API 磨き第 1 サイクル)
