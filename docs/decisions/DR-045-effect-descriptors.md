# DR-045: 効果記述子 — 値セルへの操作は純データで衛星に載る

> 由来: variant の非 set effect (default / unset / empty) の lowering が未定義という gap (LOWERING カタログの variant 効果 lowering 節) と、旧実装の考古学 (`main` ws `src/core/` の Variation / Accessor / alias clone の観測)。findings F-... ではなく DR-011 の効果語彙に直接対応する。

## 決定

### 1. 効果記述子 (純データ)

greedy 衛星・matcher の発火が値セル (値源席) に与える操作を**効果記述子**として純データで表現する:

```json
{"exact": "--no-color", "link": "color", "effect": {"op": "unset"}}
```

op 語彙は DR-011 の 4 effect にそのまま対応する:

| op | operand | 値セルへの操作 | committed |
|---|---|---|---|
| `set` | あり (literal または消費した値) | operand を書く | true |
| `default` | なし | default 値へ戻す | **true** (明示的に default が欲しい) |
| `unset` | なし | default 値へ戻す | **false** (触っていないことにする — env 等の後段が上書き可) |
| `empty` | なし | コレクション (配列 / Map) を空にする | true |

通常の値バインド (値スロットがトークンを消費して書く) は `set` の縮退形であり、効果列 (DR-038) の要素は一様に **(実体, op, operand, source, 順序)** となる。default / unset / empty も観測可能な効果として経路同一性の判定に参加する。

### 2. committed は効果が明示制御する

「発火したら committed=true」という自動結合は持たない。**selected (入口がマッチしたか) と committed (ユーザの明示指定として扱うか) は独立** (DR-016 のメタデータ分離を効果レベルで保証する)。default と unset の違いは committed フラグだけであり、この差が値源ラダー (DR-031) の挙動を分ける — unset なら env / config / inherit が上書きでき、default ならユーザの明示選択としてロックされる。

### 3. 効果はクロージャではなくデータ

matcher (DR-042) と同じ理由で、効果記述子は名前付き純データとする。lowering 後の全体が比較・直列化可能であることが、順列テストの構造比較と AtomicAST のシリアライズ可能性を支える。

## 旧実装からの継承と改造 (考古学の観測)

- **二軸 (default 書込 × committed) は旧実装で実証済み**: 旧 Variation の Reset (committed=true) / Unset (committed=false) が本 DR の default / unset に対応する。値セルの操作アルファベット (旧 Accessor: set / set_value / set_commit / reset) は op 語彙が過不足なく被覆する
- **改造点**: 旧実装は「種別はデータ、操作は不透明クロージャ」の半データ化で、直列化不能だった。本 DR で純データ化する
- **反例根拠**: 旧実装の alias は共有セルに対し「保存 → commit 実行 → コピー → 復元」の体操を毎回行っていた。効果がデータなら適用先 (link 先) を差し替えるだけで済む
- **selected / committed 分離の実証**: 旧実装の「消費したら自動 committed」デコレータを Reset / Unset が迂回せざるを得なかった — 自動結合が硬すぎた証拠

## 採用しなかった案

### 効果クロージャ (関数として持つ)

直列化・比較不能。旧実装の限界の再生産。

### toggle / flip

DR-011 で却下済み (Bool 専用で CLI 慣習として薄い)。旧 Variation には存在したが引き継がない。

### 共有セルの save / restore による alias 実現

旧実装の体操。link (DR-029) + 効果記述子の適用先指定で置換される。

## 射程外

コレクションの**特定要素の除去** (`--no-x=item` のような差分操作) は本 DR では定めない。旧実装にも値セル効果としては存在せず (mergeable list は値文字列に対する filter)、必要になれば accumulator / filter 側の語彙として検討する。

## 更新

> **DR-077 により op 語彙に `update` を追加 (5 語目)**: 発火時に link 先セルの現在値 old へ transform (filters registry の T=>T エントリ名前参照) を適用して書き戻す 0-token 効果。committed=true、post_filters は結果にも通す。効果が純データ (§3) である原則は不変 — wire に載るのは transform の名前 + args のみ。

## 関連

- DR-011 (variant DSL — op 語彙の出所。effect 4 種の意味論を本 DR が lowering レベルで確定)
- DR-015 (値の伝搬 — set の縮退形としての通常バインド)
- DR-016 (committed / selected — 分離の効果レベル保証)
- DR-029 (link — 効果の適用先)
- DR-031 (値源ラダー — committed=false が後段席に開く)
- DR-038 (効果列 — 判定キーの精密化: op / operand を含む)
- DR-042 (matcher-as-data — データ化の同族原則)
- 考古学報告 (main ws `src/core/types.mbt` の Variation / Accessor、`parser.mbt` の alias clone / wrap_node_with_set の観測)
