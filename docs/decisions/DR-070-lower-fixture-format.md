# DR-070: lowering conformance fixture (`query: "lower"`) のフォーマット

> 由来: フェーズ 2-② (ROADMAP)。DR-063 (宣言層 wire) の「受信側 lowering の担保は段階別 fixture」の実体化。DR-065 が予約した `query: "lower"` の確定。議論経緯は docs/issue/2026-07-05-phase2-lower-fixture-format.md。

## 決定

### 1. fixture の構造

```json
{
  "why": "...",
  "query": "lower",
  "definition": { ...wire form (DR-063)... },
  "installers": ["long", "short"],
  "expect": { ...lowered 断面 (DR-063 §3 の面構造)... }
}
```

- **installers は installer 名の列挙** (省略 = 登録済み全 installer)。適用は順序非依存 (LOWERING §C.2) なので**集合**であり、JSON 配列の順序は非規範
- A 群糖衣のみの段階は `"installers": []` で表す (純構文正規化は installer 以前に常に適用、§C.4)

### 2. expect は DR-063 §3 の断面表記が正規形

`{greedy: [...], positionals: [...], entities: {...}}` + matcher `{matcher: kind, entries}` + 効果記述子。比較は緩比較 (LOWERING §C.5):

- **無視するもの**: 内部 id の具体綴り (`#` 系、DR-063 で非規範)、entities 内の席の記載順
- **一致を要求するもの**: 構造骨格、matcher の種別と回収エントリ表、効果記述子の op/operand/link 先

### 3. 順列検査は runner の組み込み (fixture に順列を列挙しない)

順序非依存は全順列で成立する普遍 property であり、**golden 断面 fixture 1 個が順列検査の入力を兼ねる** — runner が installers の並べ替えを生成し、同一 golden への収束を検査する。2 段構え:

- **常時**: 決定的に選んだ少数順列 (fixture 内容から導出する決定的選択、乱数不使用 — 再現性のため)
- **opt-in** (明示フラグ / nightly): 全順列または大量サンプル。canonical セット (10+ installers) の全順列は階乗爆発するため常時実行しない。コストは時間のみなので普段はスキップしてよい

### 4. golden 断面の粒度 — 基本 3 点セット + 厳選組合せ

- **A 群のみ** (`installers: []`)
- **単独 installer 全種** (long / short / dd / env / command / global / inherit / repeat / multiple / constraint / alias / inheritable / config)
- **全収束形** (installers 省略)
- **組合せは相互作用が実在するものだけ厳選**: global × long/short (decl コピーの不動点展開)、inheritable × long (逆方向コピー)、alias × command (entry-copy の再導出)。slice の phase 2/8/17/26 テスト群が蒸留元

## 採用しなかった案

### fixture への順列列挙 (代表例含む)

n! のデータ爆発に加え、「列挙した順列だけが仕様」という誤読を招く。普遍 property の事例列挙は property の偽装になる (golden + runner モードで完全に表現できるため冗長)。

### installers の "all" 文字列糖衣

省略 = 全登録で足りる。語彙を増やさない。

## 射程外

- runner の順列選択アルゴリズムの詳細 (決定的であること以上は実装の自由)
- `query: "complete"` / `"definition_error"` のフォーマット (引き続き予約、DR-065)

## 関連

- DR-063 (断面表記の正規形 — 本 DR は参照のみ、書き換えなし) / DR-065 (query タグの予約解消) / DR-042 (順序非依存の根拠)
- LOWERING §C.2 / §C.4 / §C.5
- docs/CONFORMANCE.md (規範反映先) / docs/issue/2026-07-05-phase2-lower-fixture-format.md (議論経緯)
