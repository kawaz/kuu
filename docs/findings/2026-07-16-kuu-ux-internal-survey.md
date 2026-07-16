# kuu-ux 輪郭調査 (内部材料)

> opus47 worker による内部調査 (2026-07-16)。kuu-ux (spec を「繋ぐだけ」でなく
> cobra/clap 風の書き味まで含む二つ目の顔、VISION §2) の設計に着手する前段として、
> v0 時代の構想の考古学、現行 spec の ux 接点の棚卸し、kuu.mbt の現 API 表面、
> interpretations 射影の未確定領域、既存裁定による制約を横断的に整理した内部材料。
> UX-Q 論点候補の抽出まで含む。normative な DR/schema/fixture 変更は含まない。

## 判明した事実

### 1. v0 考古学 (kuu.mbt kuu-v0 枝 + VISION §6)

- kuu-v0 bookmark = bc316c6f。DR-0057: 独立コマンド構想は VISION §3 に継承、多言語戦略表は切り離し済み。DR-0047: embed パターンは spec 射程外化
- v0 kuu-cli.md: サブコマンド parse/completions/validate/help の 4 個。JSON プロトコル v1 の入力 = {version:1, description, opts:[...], args:[...]}、opts に 14 kind 混在 (options/positionals/commands 分割なし)。出力成功形 = {ok:true, values:{...}, command:{...}}、ambiguous outcome は v0 に無い。エラー形 = {ok:false, error, kind, tip} の error 1 個 + tip 1 個平坦形 (現行 DR-053 §2 の全列挙 + hint と非互換)
- 語彙対応: opts 14 kind → options/positionals/commands (DR-004) + type registry 参照 (DR-028) / schema.json → wire form (DR-063) / values → result オブジェクト形ビュー (DR-053) / v0 subcommand → query 語彙
- 生き残った構想: 独立コマンド、幻影コマンド体験、Web UI ビルダー、100 コマンドショーケース、descriptor シグネチャ可搬性 (VISION §4)
- 捨てられた設計: opts 14 kind 1 配列統合 / error+tip 平坦形 / ambiguous 欠如 / kind:"flag" 直書きプリセット
- 重要な含意: 現行 spec は AtomicAST を wire form の宣言層 (DR-063) に純化し、v0 の「UsefulAST 層 = 人間が書く層」の露出を spec 射程外化 (DESIGN §16)。**kuu-ux 設計とはこの UsefulAST を復権させる作業**

### 2. 現行 spec の ux 接点の棚卸し

- (a) wire schema (schema/wire.schema.json、301 行): 宣言層のみ、additionalProperties: true。Node 主フィールド: 構造 (name/id/type/or/seq/options/positionals/commands/definitions)、入口 (long/short/env/alias/match/self)、値 (exact/value/default/export_key/multiple)、filter 4 種、参照 (ref/link/config_key)、制約 (required/optional/global/inheritable/exclusive_group/required_group/conflicts_with/requires/deprecated)、completer (名前参照)、config。registryIdentifier = ^([a-z][a-z0-9_]*/)?[a-z][a-z0-9_]*$ (DR-094)
- (b) DR-060 §5 責務 4 層が kuu-ux の位置づけを規定する唯一のスキーム。VISION §2 の kuu-ux は spec の層 3 (「繋ぐだけ」) より広い (「二つ目の顔 = cobra/clap 風の書き味」まで含意)
- (c) DESIGN.md: §0.1/§0.2 で「人間 → UsefulAST (各言語 DX、クロージャあり) ↕ UsefulAST JSON (クロージャ部分は $required) ↓ parse_definition() → AtomicAST」の骨格を明示。**$required プレースホルダは名指しされているが具体形未定義**。§2.2 表示メタ (help/display_name/value_name) は UsefulAST 専用・AtomicAST 非搬送 (DR-046 §3)。§13.9 クロージャ completer の AtomicAST 表現なし。§13 責務外: サブコマンド動的拡張・post-parse validator・sensitive/secret・カラー/interactive/端末制御 = UsefulAST/DX 層の第一級要求。§16 用語表に UsefulAST/AtomicAST/parse_definition() が正式登録
- (d) descriptor 体系: DR-061 (installer descriptor / configurable factory)、DR-094 (ns)、DR-095 (builtin reasons 正本)、DR-106→107 (直交 6 軸 role/construction/io_type/output_mode/fallibility/invocation)。VISION §4 の受け皿確立済み。**ただし role 7 値のうち accumulator/completer は実例なし・宣言軸未確定 (DR-107 §7 で owns/observes 禁止のみ)** — kuu-ux で completer/accumulator を触る API は外挿でしか書けない
- (e) ROADMAP フェーズ 4「MoonBit UsefulAST DX、help レンダラ、completion 生成器」= kuu-ux 実装期はフェーズ 4、フェーズ 3 (kuu.mbt 新 main) 完了後

### 3. kuu.mbt の現 API 表面 (front_door.mbt)

- pub struct AtomicAST { root, registry, ekmap } (不透明ハンドル) / DefLoadError (Malformed/Rejected) / parse_definition / parse(ast,args,env?,config?,tty?) / resolve(同) / complete(ast,args_before,args_after?) / export_map(ast)
- parse/resolve は 2 段 (DR-104 §5 相区分に忠実、parse_and_resolve は意図的に無い)。word_before/word_after は v1 予約通り未実装。Node 80+ variant は隠蔽
- 足りるもの: UsefulAST → wire JSON → parse_definition → AtomicAST の経路
- 足りない/邪魔: (i) UsefulAST → AtomicAST の in-process 経路 (JSON 非経由) が無い (ii) クロージャ経路 (completer/cross-field validator/動的 default) を UsefulAST 側で保持する仕組みが無い ($required の実装形が無い) (iii) Outcome.Success(Array[Binding]) は raw 効果列 — binds → result object の変換完成型は runner 内 (production 昇格は MDR-005 射程外のままフェーズ 3 の宿題)

### 4. interpretations 射影の未確定領域

- DR-053 §3: 全解釈列挙、結果オブジェクト形ビュー、集合比較。重複解釈 dedup 可否は定めない。DR-073: 露出キー衝突時に optional claimants を {result, claimants} の組で
- fixture 実例 8 ファイル: path-search/variable-arity-ambiguous.json (視覚的差分) / failure-actions/ambiguous-non-firing.json / export-key/collision.json (退化ビュー + claimants)
- canonical から取れる素材: result ビュー差分、claimants、fired_action/help_entry 非発火事実
- spec 未規定 = ux/レンダラ領分: ラベリング文言・番号付け / 差分ハイライト / 共通フィールド畳み / claimants の説明文言 / **interpretations の resolve 相適用 (spec 規定なし、runner も要求せず — front_door resolve 実装コメントに「未定」明記)**
- 「解釈の同一性」定義も spec 留保 — dedup 実装するなら spec 側裁定が要る

### 5. 既存の裁定・制約で ux 設計を縛るもの (12 件)

1. DR-060 §5 責務 4 層 (shell 作法を語彙に混ぜない)
2. DR-053 §3 (interpretations の構造情報を失わせない)
3. DR-054 §4 (definition-error 全列挙 + hint、ux が hint を落とすと意図を裏切る)
4. DR-061/107 (独自拡張は descriptor 経由、クロージャをデータ化)
5. DR-107 §7 (role 別 const 固定、ux の descriptor 組み立て API はこの不変量を維持)
6. DR-107 accumulator/completer 軸未確定
7. VISION §4 (descriptor 同梱形式・コード生成器は未設計)
8. DR-046 §3 / DESIGN §2.2 (表示メタは UsefulAST 専用 — ux 層が別ホストする責務)
9. DESIGN §0.2 $required プレースホルダ (名前のみ、具体形未定義 — ux 設計の核)
10. DESIGN §13 責務外 (動的拡張・post-parse validator・sensitive・端末制御 = UsefulAST/DX 第一級要求)
11. CONFORMANCE §1 query 語彙と ux API 名の整合裁定余地
12. QUESTIONS.md 現状ゼロ件 (事前拘束なし)

## 実用的な示唆

### UX-Q 論点候補 (12 件)

| ラベル | 論点 | 選択肢候補 |
|---|---|---|
| UX-A | 書き味の基本形 | builder / struct-first / DSL-first / 言語ごと別 |
| UX-B | UsefulAST の実体 | ネイティブ一級型 / wire Builder / 両顔 |
| UX-C | $required の形 | 特別リテラル / descriptor 名参照置換 / sidecar |
| UX-D | クロージャの受け方 | UsefulAST 保持 + export 時 $required 化 / descriptor 必須化 / 両方 |
| UX-E | 表示メタ | 属性直書き / チェーン / doc comment / L10n key |
| UX-F | failure/ambiguous のレンダリング境界 | 構造渡すのみ / 既定レンダ提供 / 切替 |
| UX-G | parse/resolve 2 段露出 | 糖衣 / 生 2 段 / 既定 1 発 + opt-in |
| UX-H | descriptor の書き味 | JSON 直書き / 言語慣用から自動生成 / 対応表 |
| UX-I | kuu-cli との棲み分け | JSON 組むのみ / bridge / FFI in-process |
| UX-J | cross-field validator | closure API / 提供しない / 宣言的 |
| UX-K | interpretations の resolve 適用 | しない / する / 選択 |
| UX-L | マイグレーションパス | 同じ気分 / 独自 / 準拠モード |

所見:

- 密結合: UX-A/B/C
- 失敗提示連動: UX-F/K
- 別 issue 依存: UX-H (VISION §4)

## 検証の詳細

### 関連ファイル

spec:
- docs/VISION.md §2/§4/§6
- docs/DESIGN.md §0.1/§0.2/§2.2/§13.9/§13 責務外/§16
- ROADMAP.md フェーズ 4
- DR-053/054/060/061/073/094/095/106/107
- schema/wire.schema.json

参照実装:
- kuu.mbt src/core/front_door.mbt

v0 考古学:
- jj -R <kuu.mbt> file show -r kuu-v0 で docs/decisions/DR-0057 / DR-0047 / docs/design/kuu-cli.md
