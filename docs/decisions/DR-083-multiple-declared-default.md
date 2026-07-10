# DR-083: multiple 要素の宣言 default — 分割済み pieces としての供給

> 由来: issue multiple-declared-default-semantics (accum-fold サイクル 2026-07-10 で「意味論未規定」として fixture から退避した 5 論点)。DR-081 (default 席書き換えモデル) の確定により全論点が既存 DR の合成から導出可能になったため、導出を DR として記録する (kawaz の「やるべきと思う順でどんどん進めて」指示による自律起草、2026-07-10)。

## 決定

### 1. multiple 要素の宣言 default は尊重される

DR-051 §2b の「反復系は 0 回発火でも `[]`」は**宣言 default 不在時の暗黙 default** であり、宣言 default はそれを置き換える。DR-051 §2a (default 持ちは絶対に absent にならない) は multiple 要素でも同じに効き、その値が宣言 default 配列になる。

```json
{"name": "hosts", "type": "string", "long": true, "default": ["localhost"],
 "multiple": {"accumulator": "append"}}
```

### 2. 供給形は「分割済み pieces」

宣言 default 配列は DR-050 §4 の config array と同型に扱う: **既に分割済みの piece 列** (separator は適用されない)。各 piece は型一致なら T 域座席のみ (value_filters per piece → accumulator 畳み → cell_filters、DESIGN §14.3 の型の帰結)。JSON string の piece は string 域 (piece_filters → parse) も通る (DR-050 §4 の string 規定と同じ)。

merge accumulator の要素でも、default 供給の pieces に**マーカー語彙は適用されない** — DR-080 §1 がマーカーを「CLI 発火 piece 列」に限定しているため。供給値は全 piece literal。

### 3. op=default は宣言 default (書き換え済み) へ戻す

DR-081 §2 の既定のまま: `:default` 発火はその時点の書き換え済み default (env/config が書き換えていればその値、無ければ宣言 default 配列、それも無ければ `[]`) をセルへ書き、committed=true / sources=cli。

### 4. ラダー供給時 (未発火・uncommitted)

sources = default_source (DR-081 §1)。宣言 default のみなら sources=default、env/config が default を書き換えていればその席名。

### 5. scalar 要素への配列 default は definition-error

要素の type と default の構造不一致 (非 multiple のスカラー要素に配列) は**定義時に静的に既知**なので definition-error (kind=invalid-range、DR-082 §2 の「未対応構成」系)。DR-050 の構造不一致が実行時 Error なのは config が実行時供給だから — 宣言 default は定義の一部なので静的検査に倒す。

## 採用しなかった案

### 反復系の default 席は常に [] (宣言 default を decode で拒否)

DR-051 §2b を「[] 固定」と読む案。schema が default を任意 JSON と宣言しており、flag/count が preset default を持つ (DR-051 §2a) のと同様に、反復系だけ宣言 default を禁じる理由が無い。PATH 型ユースケース (組み込み default リストへの merge) の土台としても宣言 default は必要。

### 宣言 default 配列に separator を適用してから piece 化

配列は既に構造を持つ (JSON が分割済み)。文字列 1 本を default に書いた場合の separator 適用は本 DR の射程外 (string の default は長さ 1 piece — 分割したければ配列で書く)。

## 波及

- fixtures: default-cell-ops.json に宣言 default 付き accum の case を追加 (accum-fold サイクルで退避した hosts case の復活 — value_filters/cell_filters の T 域通過の実証込み)。ラダー供給 (未発火) case、scalar×配列 default の definition-error fixture、merge 要素への default 供給 (マーカー不活性) case
- kuu.mbt: Entity の default 保持を長さ 1 縮退の統一列 (`default_values: Array[Value]?`、scalar = 長さ 1) へ再型付け (accum-fold サイクルで一度取り下げた設計を、fixture の正当化により採用)。decoder は scalar JSON → [v] 持ち上げ、配列は multiple 要素のみ合法
- issue multiple-declared-default-semantics は fixture / 実装の追従完了時に close (本 DR 起草時点で wip)

## 関連

- DR-081 (default 席書き換えモデル — 本 DR の土台) / DR-051 §2 (absent と一様配列) / DR-050 §4 (config array = 分割済み pieces の先行同型) / DR-080 §1 (マーカーは CLI 発火限定) / DR-082 (definition-error format)
- issue multiple-declared-default-semantics (経緯)
