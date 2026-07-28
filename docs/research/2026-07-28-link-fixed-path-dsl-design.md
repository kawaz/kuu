# link 固定パス DSL の設計素描 (LINKPATH-Q 起票前の下敷き)

> 由来: kuu.mbt issue `2026-07-27-link-fixed-path-dsl-unimplemented` を起点にした設計検討
> (2026-07-28、読み取り専用ワーカーの素描を統括が監査して収載)。裁定が下りたら
> QUESTIONS.md → DR へ昇格し、本ファイルは経緯資料として残る。
> `fixtures/link-parse/absent-target.json` の静的検査 pin は統括が実物確認済み。

## 0. TLDR

DR-029 の固定パス DSL (`link:"timerange.since"` / `link:"color.rgb[-1]"`) を実装可能な意味論に落とすには、パスを **「セル空間の接頭辞 + 値空間の残余」の 2 相に分解する案 (案 1)** が既存の規範 (effects の cell 単位規範、DR-122 の shadow tree、DR-032 の name 参照) と最も整合する。これが推し。最大の裁定点は (a) この 2 相分解自体を規範に置くか、(b) 発火時に解決先の値が未確定 (absent) のときの挙動、(c) 値空間残余に対して許す操作の範囲、の 3 つ。なお現行 fixture (`fixtures/link-parse/absent-target.json`) が root name の解決を**定義時静的検査 (absent-ref)** として既に pin しており、DR-029 の「静的解決はしない」の字面とは分界の精密化が必要 — これは案の如何に関わらず DR 追補が要る。

## 1. 要求の輪郭 (何ができないのが問題か)

現状 (kuu.mbt、2026-07-26 land 分) の link は **bare name のみ**:

- wire decode は `link` を単一 String として受け、パス文法の解釈をしない
- 評価は `LinkTarget(from, target, levels, ext, inner)` funnel が「binding のキーを from→target に書き換え、Source::Link を付け、levels 段 lexical 脱出させる」だけ。**着地先は常に「セル丸ごと」**

これで書けないもの (DR-029 の原意図):

1. **不透明複合値の部分同期**: `type:"datetime"` の value_parser が実行時に作る `{since, until}` の `since` だけに `--since` 入口を合流させる (`link:"timerange.since"`)。AST は datetime の内部構造を知らないので遅延解決が必然 (DR-029 の kawaz 発言が正本)
2. **配列要素への合流**: `link:"color.rgb[0]"` / `[-1]`。負 index 含む固定 index
3. **他スコープの子セルへの合流**: link の name 解決は lexical スコープ内 → definitions (DR-032)。兄弟スコープ `timerange` の子 `since` は bare name では見えない (lexical 外) が、パスなら root `timerange` を lexical に解決してから降下できる
4. **nameless 子への位置指定**: nameless seq tuple の要素はセルとして存在するが name が無い (id 付与は DR-046 の逃げ道)。`pair[0]` の位置指定はこの穴を塞ぐ

v1 完備主義の下では 1〜4 全部が輪郭に入る。

## 2. 既存規範から導出される不変条件 (どの案でも動かせない骨格)

- **操作の時系列適用** (DR-029): パス付きでも出現順の操作列。`--since Y --timerange X` なら X の value_parser 産出が Y の部分書きを上書きする。逆順なら Y が勝つ。裁定不要の系
- **解決失敗 = Reject** (DR-029 + DR-037): パス残余の解決失敗はその**枝の Reject** であり Error ではない。他に成立する解釈があればそれが選ばれ、無ければ全体パース失敗。or の枝をまたぐパスも静的に禁じない
- **完全経路の系** (DR-038): 実装は**裁定前に枝ローカルの効果列 fold でパス解決可否を判定**する必要がある (裁定後に解決失敗が発覚して全体失敗、では DR-029 の「他枝が選ばれる」が実現できない)
- **root name の解決は定義時静的** (`fixtures/link-parse/absent-target.json::link-target-not-defined` が pin、DR-054 §4 `absent-ref`)。DR-029 の「解決は遅延」は**値構造の降下**についての規定で、name 参照 (セル空間) は静的、という分界が実運用で既に成立。DR-029 への追補が必要
- **パスは宣言名軸** (DR-032 + DR-121 §5 / `fixtures/link-parse/export-key-address.json`): link は name/id 参照であり export_key の綴りでは辿らない。ただし値空間残余に入った後は value_parser 産オブジェクトの生キー (第 3 の鍵空間、型の関心) になる — 不可避
- **sources は shadow tree の座単位** (DR-122)、**link は独立タグ** (DR-121 §4)。**effects は cell 単位・宣言名軸** (CONFORMANCE §3)

## 3. 設計案

### 案 1 (推し): セル空間 / 値空間の 2 相分解

- **第 1 相 (セル空間、定義時静的)**: root name を lexical → definitions で解決 (現行どおり)。以降の step も**宣言構造で辿れる限り**セル降下 — `.name` は当該スコープの子セルの宣言 name (または id)、`[int]` は seq の透過子 (値の座を持つ子) の位置。降下がセルに当たって残余が空なら、**bare link と完全に同じセル同期** (現行 LinkTarget 意味論そのまま、accumulator/cell_fns/ladder すべて生きる)。この相の解決不能は definition-error `absent-ref` の系
- **第 2 相 (値空間、発火時遅延)**: セル降下が葉セルに到達してなお step が残る場合 (datetime の `.since`、accumulator 配列の `[0]` 等)、残余は**発火時にそのセルの枝ローカル現在値を introspection で辿る**。到達した座への操作は「退化セル」意味論: `set` (override) と Value 返しの fn (`incr` 等、ctx.old = 現座値) のみ。解決失敗 (セル未確定 / キー不在 / index 範囲外) はその枝の Reject

文法は DR-029 の `name ('.' name | '[' int ']')*` そのまま (構文不正は decode 時 definition-error)。shadow tree はセル着地 = 従来どおり座に `link` タグ、値残余着地 = 複合値 leaf を DR-122 の「値の構造そのまま」で分解した座に `link` タグ、他の座は産出発火のタグを保つ (merge accumulator の由来混在 (DR-122 §3) と同型)。

**利点**: セルに当たる限り既存 link 意味論が無傷 (1 実体:N 参照、操作列、ladder、effects の cell 単位規範)。既存 fixture と矛盾なし。datetime も位置指定も書ける (完備)。
**難点**: 同じ綴り `timerange.since` で、timerange がスコープなら子セル同期 (ladder あり)、datetime leaf なら値書き (ladder なし) と意味論の厚みが変わる。ただしこの二相性は「スコープの kv はパース時に存在せず、不透明値の内部にはセルが存在しない」という**構造的事実の写像**であり、発明した規則ではない。

### 案 2 (棄却): 全遅延・値一元

スコープの kv は結果組み立て時にしか存在しないため、発火時の観測値を枝ローカル binding 列から都度 fold し、書きを子セル効果へ**逆写像**しないと effects (cell 単位、宣言名軸) の規範が保てない。逆写像は export_key 透過・nameless 畳み込みと絡んで一意でない。また「result の形を辿る」なら鍵空間が露出キーになり link = name 参照 (DR-032) と衝突。統合の見かけの下で排他制約を侵害する型。

### 案 3 (棄却記録): 値残余を leaf 限定 / セル降下限定に絞る

実装順序の話としては有効だが、issue の受け入れ条件 (introspection 設計が定まっていること) と v1 完備主義に反する。

## 4. 裁定が要る論点 (LINKPATH-Q 候補、起票は着手時)

- **Q1: 2 相分解を規範に置くか、値残余のみにするか** (重心)。(a) 2 相分解が導出的に優位だが「同じ綴りで厚みが変わる」暗黙性の受容を伴う
- **Q2: 値残余の解決先が発火時点で未確定 (absent) のときの挙動** (重心)。導出は「枝 Reject」一択だが UX 帰結の承認が要る: `--since` を使うには同一解釈内で実体が先に発火する構造を書き手が組む、という要件ごと pin
- **Q3: 値残余の座に許す操作の範囲**。導出は「set + Value 返し fn のみ、sentinel 返し (unset/default/empty) は発火時 Reject」
- **Q4: value_parser 産の複合値は shadow tree 上で何座か** (leaf 1 タグ vs 構造分解 — 後者は link 無しの datetime の sources 表現も変えるので波及ごと裁定要。現状どちらが pin されているか fixture 横断確認が先)
- **Q5: effects への path の載せ方** (重心)。structured `path` フィールド (segment 配列) の optional 追加が導出寄りだが新フィールドなので裁定必須 (結合文字列は DR-121 §1.1 の禁則で除外)
- **Q6: DSL 表層の細部** — `.`/`[`/`]` を含む name はパスに書けない (definition-error) / 負 index は発火時点の現在長で確定 / `[int]` のセル空間解釈は「値の座を持つ透過子の並び」
- **Q7: DR-029 追補の承認** — 「name 参照 (セル空間) は定義時に束縛、値構造の降下だけが遅延」の分界文

## 5. 実装コストの見通し

- decode: `link` String をパス AST (root + segments) にパース。bare name は segments 空の縮退形で後方差分なし
- introspection ABI: 「Value に対する get/set (field/index)」で足りる — value_parser への追加要求は「Value を返すこと」以上に増えない
- 評価器: `LinkTarget` の target を (cell, path_residual) に拡張。**裁定前の枝成立判定に解決可否を含める** (DR-038 の系) が一番効く箇所
- fixture: セル降下 (兄弟スコープ子) / 値残余 (不透明複合値) / 負 index / absent Reject → 他枝勝ち / 時系列上書き (両順) / sources の座 re-tag / effects の path 表記
