# 旧実装 (main ws `src/core/`) の考古学 — 効果・遅延 Accept・消費数モデル

> 3 テーマの読み取り専用調査の確定事実。現行語彙 (DESIGN §16) で記述。ソース位置は main workspace 基準。

## 判明した事実

### 1. variant / effect 系 (→ DR-045 に吸収済み)

- 効果は「種別 = データ (`Variation` enum 5 種: Toggle/True/False/Reset/Unset) + 操作 = 不透明クロージャ」の半データ化 (`types.mbt:53-59`, `options.mbt:144-205`)
- 値セル操作のアルファベットは `Accessor` 5 操作 (`set` / `set_value` / `set_commit` / `reset` / `get`、`types.mbt:418-424`)
- **Reset と Unset の差は committed フラグのみ** (Reset=committed true / Unset=false)。Unset は env フォールバック (committed=false の opt にのみ適用、`parse.mbt:536-541`) や後続上書きに開く。現行 DR-011 の 4 効果 (set/default/unset/empty) は旧 5 Variation の生存部分集合 + empty (旧に無い新領域) と正確に対応する
- alias/clone は共有セルへの「保存 → commit → コピー → 復元」体操 (`parser.mbt:502-518`) — 効果 = 直接 mutation の代償で、効果のデータ化 (DR-045) の反例根拠
- `wrap_node_with_set` (`parser.mbt:14-39`) が「消費 > 0 → 自動 committed」を全ノードに結合し、Reset/Unset がそれを迂回していた — selected と committed の分離 (DR-045 §2) の実証

### 2. 遅延 Accept / 投機実行 (→ DR-047 制約評価レイヤリングの材料)

- 正体は `docs/research/2026-03-05-speculative-execution-potential.md` (旧 DR-0015)。kawaz 原案: バリデータを**即時型** (int/regex 等、トークン単体で判定可) と**遅延型** (排他 / at_least_one / 最大 N、他オプションを知らないと判定不能) に分類し、遅延型は「最初の走査では仮食いし、全フォーク世界の全引数消化が終わった時点で遅延バリデーションを行う」
- **実装はゼロ**: 旧モデル (名前完全一致) では同率タイが起きずフォーク機構が発動しないため、post-parse チェック (`constraints.mbt` の exclusive/at_least_one/required/requires が is_set() を数えて ParseError) に縮退した
- 旧研究が特定した前提条件 (非完全一致 → タイ → フォーク) を、現行の再解釈 matcher (複数読み、DR-041) が供給する — 直系の継承関係
- DR-047 への持ち上げ方: constraints の計数述語ロジックを再利用し、評価タイミングを「完全経路 (全消費世界) ごとの遅延 reject 述語」へ移す
- `pending` / `cell` 二相 (`nodes.mbt:18-27`) は仮食いのノード局所版。pending が最長一致で負けても巻き戻らない構造で count 系にロールバック漏れの潜在懸念 (コード構造上の観測、テスト未確認)。slice PoC の不変 binding 列設計はこの問題を回避している

### 3. Accept(consumed) の消費数モデル (→ DR-041 §3 に反映済み)

- `TryResult::Accept(consumed~: Int, commit~: () -> Unit)` — consumed は外側 args からの消費数のフラットな Int。外向き/内部断片の二層モデルは一級では存在しない
- 二層は 2 つの再解釈 matcher の内部にだけ場当たり実装: eq-split (`parse.mbt:79-170`) は合成配列 `[name, value]` + 外向き 1 ハードコード + `consumed >= 2` ゲート、short combine (`parse.mbt:174-361`) は grapheme 分割 + 外側借用時のみ外向き 2
- 局所・毎 pos の最長一致アービタ (consumed max、同率 = ambiguous) は DR-038 の大域全消費経路計数に置換済み — 移植不要

## 実用的な示唆

- DR-045 (効果記述子) の根拠と改造点 (純データ化) はテーマ 1 から
- DR-047 (制約評価レイヤリング、F-026/F-027/F-004) はテーマ 2 の分類 + 述語持ち上げをそのまま骨格にできる
- 実装エンジンは pending 型 mutation でなく不変 binding/効果列で (テーマ 2 の懸念回避、PoC 実証済み)
