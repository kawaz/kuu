# DR-091: bare key=value operand の段階表現 — regex 受け / kv_map accumulator / eq 必須の空 prefix long

> 由来: issue corpus-bare-key-value-operand (dd の `if=/of=`、env の `VAR=val`、make の `FOO=bar` に第一級表現が無く、corpus は `long_prefix: ""` hack と生 string 収集の 2 通りに分裂)。kawaz 提案 (2026-07-11) の段階論: 「最低限の仕事だけしてアプリに丸投げなら k=v 形を regex マッチフィルタ付き multiple string で受ければ済む。k=v 分解して Map にするまでなら accumulator で出来るのが次段階。`if=(type:file)` レベルまでなら long_prefix:'' かつ eq 分割必須 (別引数での値提供を拒否) オプションが必要になりそう」。

## 決定 — 用途の深さに応じた 3 段の正規表現

### 1. 素通し受け (既存機構のみ、追加なし)

任意キーの k=v 列を「形だけ検証して文字列のまま」渡す。**既存語彙で今日書ける**:

```json
{"name": "assigns", "type": "string", "multiple": "append",
 "piece_filters": [{"name": "regex_match", "args": ["^[A-Za-z_][A-Za-z0-9_]*="]}]}
```

分解はアプリの仕事。env / make のような**任意キー**はこの段 (または §2) が管掌 — 任意キーを §3 の long 定義に列挙することはできない。

### 2. kv_map accumulator (語彙追加)

accumulators registry に `kv_map` を追加する: piece `k=v` を最初の `=` で分割し、Map (結果は kv オブジェクト) に畳む。再発火・重複キーは last-wins (DR-015 のあと勝ちと同じ規約)。separator との関係・merge との異同は fixture 設計時に確定する (DR-036 の registry 区分は不変、DR-080 merge と並ぶ語彙の 1 住人)。

### 3. eq 必須の空 prefix long (固定キー + 型付き)

`if=(type: file)` 級 — キー集合が固定で、値に型・filter を効かせたい場合:

- `long_prefix: ""` を**合法な設定として明文化**し、同時に **`require_equal_separator: true`** (scope config、DESIGN §7.2 の兄弟) を新設する — eq 分割形 (`key=value`) のみを受理し、別引数での値供給 (`key value`) を拒否する
- eq 必須により「`=` を含むトークンだけが long 候補」になり、素の operand (`foo`) が long 経路と衝突しない — これが空 prefix を破綻させない条件であり、`require_equal_separator` なしの `long_prefix: ""` は従来どおり未定義動作 (corpus の旧 hack は fixture から一掃する)
- 未知キー (`foo=bar` で `foo` が未定義) は通常の unknown option 系エラー — 固定キー集合の前提。任意キーは §1/§2 の管掌と割り切る

## 採用しなかった案

### 第一級要素種別 operand_key の新設

matcher 経路が 3 本目に増える。§3 (既存 long 機構 + eq 必須の 1 config) が同じ表現力をより小さい足場で与え、§1/§2 が残りを覆う。

### long_prefix: "" 単独の正当化

eq 必須を伴わない空 prefix は素 operand と long 候補の区別を失い、matcher invariant の精査コストに見合わない。

## 波及

- fixtures: §1 は corpus の env を書き直して実演 (regex_match は実装済み)。§2 kv_map / §3 require_equal_separator は各 fixture + kuu.mbt 実装 (対 issue 起票)。dd corpus は §3 形へ、旧 hack は「未定義動作」の pin を 1 件残して一掃
- env の完全形 (`FOO=bar cmd -x`) は §1 or §2 + DR-090 (pattern dd) の合成
- DESIGN §7.2: require_equal_separator の追記 / §8.4・DR-036: kv_map の語彙追加

## 関連

- DR-080 (merge — accumulator 語彙の先行例) / DR-036 (accumulators registry) / DR-085 (regex_match) / DR-090 (pattern dd — env 合成の相方) / DR-015 (last-wins)
- issue corpus-bare-key-value-operand (経緯)
