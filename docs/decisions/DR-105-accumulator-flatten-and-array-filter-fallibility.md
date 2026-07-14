# DR-105: accumulator flatten ダイヤル + ARRAY filter registry の fallibility 確立

> 由来: ACC-Q1〜Q4 裁定バッチ (kawaz 2026-07-14、`docs/QUESTIONS.md` 経由)。fallibility 全数調査 + accumulator 語彙の言語横断動詞マトリクス調査 (セッション scratchpad `accum-fallibility-vocab-recon.md`) が確立した勢力図 —「filter 席は fallible 優勢 / 構造畳み装置 (accumulator/collector) は total が全員」(DR-082 の「構造的妥当性は definition-error へ、runtime は total」パターンの体系適用) — を軸に、(1) `flatten` accumulator (DR-036/DR-043) を独立エントリから `append` のダイヤルへ統合し、(2) ARRAY filter registry (`accum_filters`、DR-102) に初めて fallible な住人を迎える。complete DR サイクル (DR-104) の後続。

## 決定

### 1. `flatten` は `append` accumulator のダイヤル (既定 false)

```json
{"name": "src", "type": "string", "multiple": {"accumulator": "append", "flatten": true}}
```

- `flatten: true` — 発火値が配列 (JSON array 相当) なら、その**要素を 1 段だけ**積む (深さは spec で固定、多段展開はしない)。既定 `false` は現行の `append` 挙動 (発火値を丸ごと 1 要素として積む) と完全に同一
- **kawaz の言語化 (由来)**: 「flatten を明記することで accumulator が実質 2 つのレイヤを扱ってるところを宣言的に整理できる」— 旧 `flatten` accumulator は「累積 + 1 段展開」という 2 つの関心を 1 つの accumulator 名に同居させていた構造的欠陥を持っていた (DR-102 の `cell_filters` 属性分割が解消した「1 属性に 2 つの型/関心が同居する」問題と同型の欠陥)。`append` (累積) + `flatten` (展開の有無) の直交する 2 フィールドに分解することで、どの累積装置に展開ダイヤルを乗せるかが宣言的に見える
- 適用対象は **repeat の cons unfold** (DR-043 §「repeat installer」、`[T,[T,…]]` → `T[]`) が主用途だが、ダイヤル自体は「発火値が配列で 1 段展開したい」という一般の宣言意図を表す — repeat 固有の語彙ではなく `append` 全体の汎用ダイヤルとして位置づける

### 2. `flatten` は `append` 専用 — 他 accumulator への宣言は definition-error

`flatten: true` を `append` 以外の accumulator (`merge` / `override` / `increment` / `kv_map`) に宣言することは、その accumulator にそもそも存在しない属性を書いた構造不一致であり、**kind=invalid-range** で reject する — `merge` accumulator × `ref` (DR-084 §3、ref の発火値は piece 列を持たない row でありマーカー認識対象が構造上存在しない) と同型の「構文上は書けるが構成として不成立」パターン (DR-082 §2)。

**merge との整理 (kawaz 確認、2026-07-14)**: `flatten` ダイヤルは `append` 専用と決める根拠は `merge` の入力形にある — `merge` の入力は常に scalar piece であり (`merge` × `ref` は DR-084 §3 が definition-error で既に封じ済みで、配列発火値が `merge` に到達する経路が構造的に存在しない)、`merge` にとって「発火値が配列か」という分岐自体が発生しえない。したがって `flatten` を `merge` にも許すという選択肢は最初から意味を持たず、`append` 限定は妥協ではなく `merge`/`append` の入力形の違いがそのまま帰結する自然な線引きになる。

### 3. `flatten` accumulator (DR-036) は `append` + `flatten:true` に統合し廃止

accumulators registry の独立エントリ `flatten` (DR-036 の属性セット `{accumulator: (piece, processor, prevs) → T[], default_collector: "identity"}`、DR-043 が repeat installer の平坦化用に登録) は本 DR により**削除**する。同じ意味論は `{"accumulator": "append", "flatten": true}` で表現する — repeat installer (DR-043 §「repeat installer」) の lowering は、平坦化 accumulator を単独名で src の値セルへインストールする代わりに、`append` + `flatten:true` の組をインストールする形に追従する。

### 4. ARRAY filter registry (`accum_filters`) の fallibility 確立

`accum_filters` (DR-102 §1、Acc→Acc、ARRAY filter registry) の住人は、これまで `unique` (Transform、常に成功) のみで fallible な住人が存在しなかった。本 DR により ARRAY filter registry は **scalar filter registry と同じ Validate/Transform の二分法** (descriptor `signature` フィールド、`schema/descriptor.schema.json`) を採用し、reject を返せる Validate 系の住人を持てるようになる — 「filter 席 = fallible 優勢 / 構造畳み装置 (accumulator/collector) = total」という勢力図の一様適用であり、`accum_filters` が「filter でありながら total しかいない」という不均衡だった状態を解消する。

`kv_map` accumulator の reject (`=` を含まない piece の拒否、DR-091 §2) が matcher 手前ゲート (accumulator 到達前の構造検査) であることは、accumulator 自体の fallibility とは別軸 — accumulator/collector は依然として total (構造畳み装置は失敗しない) のまま非対称にならない。

**reject 時の位置帰属は `args.length`** — DR-102 §4 が「`final_filters`/`accum_filters` ともに `argv.length` (現 `args.length`) に帰属する」とすでに規定していたが、`accum_filters` 側は reject 可能な住人が不在だったため理論上の規定に留まっていた。本 DR の Result 化により、この規定が初めて実効化される (実測で pin できる状態になる)。

### 5. `length_range:min:max` — ARRAY filter registry 最初の検証系 filter (ACC-Q4)

```json
{"name": "tags", "type": "string", "multiple": {"accumulator": "append"}, "accum_filters": ["length_range:1:5"]}
```

- 累積後の配列長を検証する Validate (ARRAY filter registry、DR-102 §1 の accum_filters 席)。`min` 未満 = reason `too_short`、`max` 超過 = reason `too_long` (scalar filter registry の `in_range` が持つ `too_small`/`too_large` と対の命名、DR-066 の reason 語彙規約)
- kawaz が挙げた「配列長検査」の直接表現。Result 化 (§4) を fixture で実際に pin できる、ARRAY filter registry 最初の実例になる
- DSL 呼び出し形は scalar 版 `in_range:min:max` と同型 (コロン区切り DSL、DR-009)

## 採用しなかった案

### accumulator 語彙の改名 (`push`/`push_one`/`push_each` 等)

ACC-Q1 の当初検討は `append` の改名候補として `push_one` (単発積み) / `push_each` (展開積み) の対、あるいは単独語 `push`/`spread`/`extend` を比較した。`push_one`/`push_each` は "one"/"each" という副詞的差異の弁別性が低く (どちらも「積む」動詞に修飾語を足しただけで読み手が意味を推測しづらい) 却下。単独語系は言語横断調査 (fallibility/動詞マトリクス調査) で「`extend` は言語間で意味が正反対に割れる」(Python の `list.extend` は平坦展開だが、他言語では単純追加の意味で使われる例がある) ことが判明し、`push`/`spread` も単独では「1 段展開」という具体的操作を含意しない曖昧語と判断された。kawaz の再検討により、既存 `append` を維持したまま「展開の有無」を独立ダイヤル (`flatten: true/false`) として切り出す方が、動詞 1 語に 2 つの意味を詰め込むより低誤解であるという結論に至った (ACC-Q1d)。

### accum_filters を transform 専用契約として固定する (ACC-Q3-b)

Result 化せず `ArrayFilterDescriptor.run` を `Array[Value] → Array[Value]` (無 Result) のまま維持し、DR-102 §4 の reject 規定を撤回する案。fallibility 全数調査が確立した勢力図 (「filter 席は fallible 優勢」) に反し、`accum_filters` だけが「filter」を名乗りながら reject を一切表現できない例外のまま固定化される — 将来 `length_range` のような検証系 filter を追加する道を閉ざす。kawaz 裁定によりこちらは不採用、Result 化 (§4) を正とする。

### repeat×multiple の flatten を multiple 一般へ多段展開可能にする

`flatten` のダイヤルを bool でなく段数指定 (`flatten: 2` 等) にする拡張も検討候補だったが、DR-043 が定めた repeat cons の平坦化用途は常に 1 段 (`[T,[T,…]]` → `T[]`) で十分であり、多段対応の実需が無い。1 段固定 (bool) が最小の語彙で足りる。

## 波及

- **DR-036**: accumulators registry の属性セット表から `flatten` エントリを削除する Superseded 節を追記 (全文は下記)
- **DR-043**: §「repeat installer」の「平坦化 (`[T,[T,…]]` → `T[]`) の accumulator は組み込み名 `flatten` として accumulators registry (DR-036) に登録する」という記述に Superseded 節を追記 — 現役は `append` + `flatten:true` (全文は下記)
- **DR-102 §4**: `accum_filters` の reject 位置帰属規定 (`argv.length`) が本 DR により初めて実効化される旨の明確化 note を追記
- **schema/wire.schema.json**: `multiple` の object 詳細形に `flatten?: bool` (既定 false) を型ヒントとして追加
- **schema/builtin-descriptors.json**:
  - `filters.unique` は現状維持 (Transform、reasons:[])
  - `filters.length_range` を新設 (Validate、reasons: `["too_short", "too_long"]`)
  - `filters.unwrap_single` / `filters.from_entries` (collector、DR-036/DR-044) の descriptor を新規収載 — total (常に成功) なので reasons:[] を補うのみ (副次対応、裁定不要)
- **DESIGN.md / REFERENCE.md / PIPELINE.md / LOWERING.md**: `flatten` accumulator の独立言及箇所を `append` + `flatten:true` へ全 grep 追随 (LOWERING §B.8 の repeat installer 出力例が主対象)、REFERENCE.md の filter 一覧表に `length_range` を追加、`just lint-reference` で検証
- **fixtures**: `fixtures/lowering/repeat/basic.json` / `fixtures/lowering/baseline/converged.json` の `"accumulator": "flatten"` を `{"accumulator": "append", "flatten": true}` に書き換え。`accum_filters` Result 化 + `length_range` 追加の runtime reject fixture、`flatten` × 他 accumulator の definition-error fixture (DR-084 §3 の merge×ref と同型パターン) を新設。**本サイクルでは fixture 変更は保留** (mbt-dr102 の complete 実装 live 検証中のため統括の go 待ち) — 影響棚卸しのみ本 DR に記録し、書き換え自体は go 後

### 追記した Superseded 節 (適用済み、全文)

DR-036 の accumulators registry 属性セット表の直後に追加:

```markdown
## Superseded (歴史)

> **更新: 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。**

### `flatten` accumulator の独立エントリ廃止 (DR-105 で更新)

> **更新: accumulators registry の独立エントリ `flatten` ({accumulator: (piece, processor, prevs) → T[], default_collector: "identity"}) は、
> 「累積」と「1 段展開」という 2 つの関心を 1 accumulator 名に同居させる構造的欠陥と判明し廃止された。現役は `append` accumulator の
> `flatten: true` ダイヤル (DR-105) — repeat installer (DR-043) の cons 平坦化は `{accumulator: "append", flatten: true}` で表現する。
> 他 accumulator (accumulators registry の他エントリ全て) は不変。**
```

DR-043 の「平坦化の accumulator は組み込み名 `flatten` として accumulators registry (DR-036) に登録する」の直後に追加:

```markdown
> **更新 (DR-105): `flatten` の独立 accumulator エントリは廃止され、`append` accumulator の `flatten: true` ダイヤルに統合された。
> repeat installer の cons 平坦化は `{"accumulator": "append", "flatten": true}` を src の値セルへインストールする形に追従する。
> 「組み込み名 `flatten` として登録する」という本文の記述は現役仕様ではなくなったが、判断経緯 (repeat cons の平坦化という用途自体) は不変。**
```

DR-102 §4 の末尾に追加:

```markdown
> **明確化 (統括検証 2026-07-14、DR-105 の反映): `accum_filters` の reject 位置帰属 (`argv.length`) は、ARRAY filter registry の
> fallibility 確立 (DR-105 §4、`length_range` 等の Validate 系住人の追加) により初めて実効化される。本節策定時点では ARRAY filter
> registry に reject 可能な住人が存在せず (`unique` のみ、Transform)、この規定は `final_filters` 側の実測 (`final-filter-reject.json`
> 等) からの類推適用に留まっていた。**
```

## 関連

- DR-036 (accumulators registry — `flatten` エントリの出所、Superseded 節追記対象)
- DR-043 (repeat と multiple の分離 — `flatten` accumulator 登録の出所、Superseded 節追記対象)
- DR-034 (multiple パイプライン 4 要素 — accumulator の位置づけ)
- DR-084 §3 (merge × ref の definition-error — `flatten` × 他 accumulator の invalid-range 判定の先例)
- DR-102 (`final_filters`/`accum_filters` 属性分割 — ARRAY filter registry の座席定義、§4 の reject 位置帰属が本 DR で実効化)
- DR-082 (definition-error kind 分類 — invalid-range の「構文上は書けるが構成として不成立」パターン)
- DR-066 (reason コード規約 — `too_short`/`too_long` の命名対称性)
- DR-091 §2 (kv_map の reject — matcher 手前ゲートで accumulator 自体の fallibility とは別軸)
- docs/QUESTIONS.md ACC-Q1〜Q4 (裁定の記録)
