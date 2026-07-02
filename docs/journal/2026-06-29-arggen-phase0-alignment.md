# arggenerator (第0フェーズ) を AST に落とし込む場所を探る — ボトムアップ実装とのすり合わせ

> **位置づけ**: 本 journal に書かれた「方針合意」はすべて **ロード段階の方針合意であり、DR 化された決定ではない**。ここは 2026-06-29 の議論の経緯記録であって、決定の記録ではない。実装・DR 化の際は改めて検討する。
> **出典**: 別セッション (session id: `618028dc-b5e8-4efc-b006-3e5244503e84`、作業 ws は parts-arggen = ボトムアップ実装プロトタイプ側) のタイムライン。一次資料はそのセッション自体。

## 目的 — 設計確定ではなくロード

kawaz が終盤に明言した目的は「agg という実装よりのボトムアップの話を AI に理解させてから、ast の要素に綺麗に落とし込む場所を探る」こと。つまり本セッションは AtomicAST / UsefulAST への **ロード段階**であって、設計を確定させる場ではない。以下の「方針合意」節も、その前提で読む。

DR 番号が2系統併走している点に注意する: ast-spec 側 (3桁、現役) と parts-arggen 側 (4桁、プロトタイプ実験記録で語彙は再選定対象)。本 journal が参照する parts-arggen 側 DR (4桁) はプロトタイプの決定であって、ast-spec の現役契約ではない。

## 経緯

### 1. 「第0フェーズ (agg)」の発出

議論の起点は「オプション / ポジショナル走査 (= 第1フェーズ = path-search) の前に、引数トークンを再分解する第0フェーズがある」という提示だった。`--key=value` や連結 short (`-abc`) のようにトークン境界を組み替える処理は、filter (String→T) 層でも accumulator (T[]→U) 層でも表現できない。トークン列そのものを別のトークン列に正規化する操作は **filter より下層**にある、という違和感の言語化がこのフェーズ概念の出発点。

### 2. lagg / sagg の同定

その「第0フェーズの装置」は、ボトムアップ実装に既にあった。`install_eq_split_node` (`--k=v` の分解) と `install_short_combine_node` (連結 short の分解) がそれである。どちらも「collect (トークンを集める) → 動的に matcher を生成 → cluster を走査しつつ value trial で枝を列挙する」という同じ骨格を持つ。第0フェーズは実装済みで、まだ階層概念として名付けられていなかっただけ、と判明した。

### 3. DR-038 との不整合

既存実装は「長い方を先勝ちで commit する」挙動を持ち、これは [DR-038](../decisions/DR-038-parse-semantics-path-uniqueness.md) (最長一致を廃し、入力を全消費する完全経路がちょうど1本のときだけ成功) に違反する。議論の途中で AI が「最長一致」に言及したが、kawaz が `-p80` の例で DR-038 の契約を正しく適用してこれを訂正した。第0フェーズの装置も「先勝ち commit」ではなく、複数の分解候補を枝として列挙して下流に渡す形でなければ契約を満たさない。

### 4. 構造の再編

kawaz の整理では、command は本質的に `greedys[]` (ハイフン起動・順不同で貪欲に食う要素群) と `positionals[]` (位置消費される要素群) の2本立てとして捉えられる。long / short / dd はいずれも greedy trait を持つ要素であり、long ⇔ short の兼用 (同一実体を長短両方で名乗る) は link による実体共有で表現する。

### 5. dd の一般化

区切り機構 dd を `dd(separator, consume, exclude, multiplicity)` の4属性で捉えると、long / short / positional / command / `--` / xargs 系区切りが、すべてこの4属性の **プリセット**として表現できる、という一般化が出た。入れ子や多段区切りも `repeat[-- {or:[...]}]` のように repeat と or の組み合わせで表現できる。

### 6. 冷水 — 新規は「階層概念の明示化」だけ

ここで kawaz が冷水を浴びせた。曰く「元々の kuu にほぼ原型があった dd の説明をしただけ。入れ子も複数コマンドも元々の想定」。実際、parts-arggen 側の `dashdash.mbt` / DR-0018 / DR-0053 で、任意 separator・入れ子・stop_before・exact ノードの consumed 振る舞い・値/アクションプリミティブの境界は既に議論済みだった。本当に新規なのは **「第0フェーズという階層概念の明示化」だけ**だと判明した。dd の4属性一般化そのものは、既存の想定を言い直したにすぎない。

### 7. codex adversarial review

議論の妥当性を codex の adversarial review にかけた。6件の指摘のうち、(a) packed forest 化、(b) コスト境界、(c) positional 順序破壊、(d) `-cv` 回帰、の4件は kawaz がいずれも不要な懸念として却下した (kuu が扱うスケールと責務の理解が浅い指摘)。有効だったのは (e) 最小サブセットから始める提案と (f) DR-039 との衝突指摘の2件だけで、しかもこれらも既に着地していた「dd = sugar」方向を補強するにとどまった。

### 8. 命名論点で終了

最後は命名で止まった。kawaz の最終発話は「引数ジェネレータジェネレータ + 消費マシンのオブジェクトを何と呼ぶか。`arggengen` は小スコープでは良いが、`arggen` は消費サブパーサとセットで一体になるもの」。命名対象が (X) コマンドスコープに1個の統括オブジェクトなのか、(Y) 個別の arggen + 消費装置ユニットなのか、が確定しないまま議論を終えた。

## ロード段階の方針合意 (DR 未起票)

以下は議論を通じて向いた方向であって、**決定ではない**。DR には起票していない。

- **第0フェーズ (トークン再正規化) と第1フェーズ (path-search) の階層分離**という概念の明示化。これがこのセッション唯一の新規概念。
- **dd は AtomicAST 要素ではない**。kawaz「こんな高機能なのが atomic なわけないじゃん」。dd / long / short / positional / command / lagg / sagg は UsefulAST の sugar / preset / 説明語彙であり、AtomicAST 上では既存 atomic (exact / or / seq / primitive / multiple) に lowering される。**AtomicAST スキーマは変えない**。DR-018 / DR-034 / DR-039 の改訂は不要。
- **UsefulAST 表面は現行記法を維持** (options[] / positionals[] / commands[] + 1ノード内 long/short 並列)。内部の `greedys[] + positionals[]` は lowering の落とし先であってスキーマ変更ではない。long/short 同実体は link 注入。dd は positionals[] 内の greedy exact として書き、糖衣展開で greedys[] へ移動する (元位置からは消えるが、後続 positional の参照リストは保持する)。
- **DR-038 との整合化**: 「先勝ち commit」を「多重 Accept (枝を絞らず下流に渡す)」に置換する。第0フェーズが枝を列挙し、第1フェーズ path-search が完全経路数 (0 = 失敗 / 1 = 確定 / 2+ = ambiguous) で結末を決める。
- **`-cv` の曖昧は「正しい挙動」**。kawaz「kuu は他で出来ないことをまずやり切る。曖昧は引数定義の設計が悪いだけ」。他 CLI 互換へのダウングレード (short の引数は最後のみ、Go 風 `-long` 等) は agg 装置の**プラガブル化**で吸収する。互換性はコアの責務ではない。
- **コスト / 組み合わせ爆発は非論点**。kawaz「引数パーサが扱うデータ数なんて高がしれてる。無限ループだけ気をつけとけば」。気にすべきは「壊れる構造 (= ゼロ進捗 Accept、これは静的検出可能) が書けてしまうか」だけ。

## 未解決論点

- **命名 (セッションはここで終了)**: 統括オブジェクトの呼称。対象が (X) コマンドスコープに1個の統括オブジェクトか、(Y) 個別の arggen + 消費装置ユニットか、の確定待ち。`arggengen` / `arggen` のどちらをどのスコープに当てるかも保留。
- **exclude 語彙の再選定**: parts-arggen DR-0018 は `stop_before` を採用しているが、これはプロトタイプの決定。値域は v1 で exact-string リスト、ノード参照リストは後回し。
- **commands[] を greedys[] に統合するか**: `git status` の `status` を第0フェーズの一員として読み直せるか、という提起はあったが未決着。
- **agg 装置のプラガブル化の具体形**: GNU 流 / Go 流 / カスタム方言をどう差し替えるか、は未着手。

## 関連

同日、独立に走った仕様欠落洗い出し [`docs/findings/2026-06-29-ast-missing-pieces.md`](../findings/2026-06-29-ast-missing-pieces.md) の以下の項目が、本議論の射程と交差する:

- **F-001** (`--` dashdash の AtomicAST 表現と意味論) — 第0フェーズがトークン再正規化として dashdash を扱う点と直結。
- **F-002** (`allow_equal_separator` の境界と `--flag=value` の bool 問題) — lagg (`--k=v` 分解) の射程。
- **F-003** (`short_combine` のバリュー付着形式と分割単位) — sagg (連結 short 分解) の射程。
- **F-041** (糖衣展開規則のカノニカル定義、critical、DR-046 候補) — 「dd 等は sugar で AtomicAST に lowering される」方針が、まさにこの糖衣展開カノニカル化と同じ問題を指す (findings の要約節では F-035 近傍にも同趣旨が併記されている)。F-035 (`parse_definition()` の失敗挙動) も隣接論点。

DR 側の関連:

- [DR-018](../decisions/DR-018-placement-and-commands-sugar.md) (配置で区別、commands は糖衣) — 「dd は positionals[] 内 exact として書き糖衣展開する」方針の足場。
- [DR-038](../decisions/DR-038-parse-semantics-path-uniqueness.md) (完全経路の一意性、最長一致廃止) — 第0フェーズの「多重 Accept」化が満たすべき契約。
- [DR-039](../decisions/DR-039-atomicast-convergence-and-vertical-slice.md) (AtomicAST = ボトムアップエンジンのシリアライズ形) — 本議論全体の合流テーゼ。lagg/sagg = `install_eq_split` / `install_short_combine` の対応もここに記載済み。
