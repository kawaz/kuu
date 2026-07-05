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

### 1b. golden の期待値は仕様準拠値で書く (実装の実測ミラーではない)

golden fixture は仕様の正本であり、参照実装の現状挙動の写しではない。実装が仕様に未追従の箇所 (例: flag preset default 未実装で値セルが bool + default:false に降格されない) は、**fixture は仕様準拠値 (§A.5 なら `{type: "bool", default: false}`) を書き、実装側 runner が KNOWN GAP として差分を可視化する**。実測はあくまで表記写像の確立と fixture 誤り検出の oracle である。

**既知 gap 台帳 (slice PoC、2026-07-05 時点)** — why の個別注記は本台帳への参照で足りる (全 fixture への網羅記載は要求しない):

1. flag preset default 未降格 (値セルが TFlag のまま、bool + default:false にならない — 第 11 弾 note 1)
2. `long: []` present-empty の名前由来綴り生成 未実装 (slice は明示綴りリストのモデル、snake→kebab 正規化も同様)
3. reason フィールド未実装 (parse fixture の errors 検証は kind まで)
4. dd の options[] 配置で ensure_entities が余分な `--` 実体を生成 (not_dd ガードが positionals ループにのみあり options ループに無い — 配置依存の乖離、slice issue で追跡)
5. global の子スコープに自前 verbose セルが生成される (Rooted 衛星は root セルへ link 同期するが entity 生成が残る — 断面 golden は子 entities 空が仕様準拠)
6. alias 再導出時の add-if-absent 未適用 (short alias の entry-copy が既存エントリと重複しうる — JSON entries object ではキー重複が潰れて観測不能になりうるため、runner での可視化可能性自体に再確認が必要。fixtures/lowering/alias/basic.json の KNOWN GAP 2)

### 2. expect は DR-063 §3 の断面表記が正規形

`{greedy: [...], positionals: [...], entities: {...}}` + matcher `{matcher: kind, entries}` + 効果記述子。比較は緩比較 (LOWERING §C.5):

- **無視するもの**: 内部 id の具体綴り (`#` 系、DR-063 で非規範)、entities 内の席の記載順
- **一致を要求するもの**: 構造骨格、matcher の種別と回収エントリ表、効果記述子の op/operand/link 先
- **面配列の順序規範**: `positionals` 配列は**順序込み比較** (消費順が意味論そのもの — src→dst の並びは仕様)。`greedy` / `constraints` 配列は**集合比較** (順序非規範 — greedy は順不同の面、constraints は述語の集合)。`entities` / `templates` は JSON object でキー順は元々非規範。exclusive_group の members 等、**要素内の配列が集合か列かは各語彙の意味論に従う** (members = 集合、seq の children = 列)

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
