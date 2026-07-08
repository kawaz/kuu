# DR-076: bool は通常の値型、flag/count が特殊 — 特殊性は flag/count 側の展開で吸収する

> 由来: issue `2026-07-08-variant-bool-eq-split-value` (variant 持ち bool の eq-split 値形の可否)。kawaz 裁定 2026-07-08。

## 決定

### 1. bool は string/number と同格の値型

bool は元々 **string / number などと同様に引数を受けて `:set` する値型**である。したがって:

- **variant を持つ bool も eq-split 値形 (`--ssl=false`) を受ける**。variant トリガ (`--ssl`/`--no-ssl`) と `=value` 形は排他ではなく共存する
- 値の字句は DR-074 §3 の canonical bool 語彙 (true/false/1/0/""、case-insensitive)、語彙外は `not_a_bool` (DR-066 §3)

引数を持たない **flag や count の方が特殊**な立場であり、bool の設計を flag の都合 (presence-only) で歪めない。

### 2. flag の特殊性は flag 側の展開 (bool への糖衣) で吸収する

flag を内部的に bool へ展開する際の摩擦 (引数の有無) は、**特殊な立場である flag/count 側の展開で工夫する**。方向性は 2 案あり、いずれも bool 本体には手を入れない:

- **案 A: matcher 無しの値セル + Exact トリガ + link**。値だけ持つ bool セルを置き、綴りは Exact でマッチさせて link の値をセットする形に展開する (引数付き bool が必要ならその値セルへ link すればよいだけ)
- **案 B: long 綴り DSL の合成で表現する** (kawaz のスケッチ、等価変換のイメージ):

```
{type:"flag", long:[]}                     ≡ {type:"bool", long:[":set:true"], ...filters}
{type:"flag", long:[":set"]}               ≡ {type:"bool", long:[":set", ":set:true"], ...filters}
{type:"flag", long:["no:set:false"]}       ≡ {type:"bool", long:["no:set:false", ":set:true"], ...filters}
{type:"flag", long:[":set", "no:set:false"]} ≡ {type:"bool", long:[":set", "no:set:false", ":set:true"], ...filters}
```

つまり flag = 「値なし発火 (`:set:true` = 裸トリガで true を set) を合成した bool」であり、引数あり/なしを同居させたい場合も long 綴りの合成だけで表現できている。

### 3. 参照実装への帰結

- kuu.mbt の暫定ガード「variant を持つ TBool は eq_entries 非登録」(installer.mbt `inst_long`) は**撤去方向** — variant 持ち bool も eq-split を登録する
- `fixtures/lowering/long/variant.json` の why「値トークンを取らない」は本 DR で改訂対象 (fixture 追従は下記 TODO)

### 4. 綴り `:set` の意味論と値形の範囲 (kawaz 裁定 2026-07-08 追記)

- **`:set` = 「値を取って set」で型に依らず一意** (厳密な代数)。裸トリガ発火は常に `:set:true` (operand 付き縮退形) を明示的に書く。`long: true` の糖衣が `[":set"]` (DR-071) である規則とも一様で、bool は number/string と完全に同じ扱いになる — bool の `:set` だけが裸 set-true に縮退する従来の特例は廃止
  - 帰結: `{type:"bool", long:[":set"]}` の `--ssl` は値必須 (裸 `--ssl` 単独は値の missing operand)。裸発火が欲しければ `:set:true` を足す
  - 既存 fixture `lowering/long/variant.json` は定義に `:set:true` を追記して裸 `--ssl` を保つ (本裁定に伴う fixture 改訂)
- **bool の値形は eq-split (`--ssl=false`) と space form (`--ssl false`) の両方** — string/number の衛星 (空間形 Seq([exact, 値スロット]) + eq-split matcher) と完全対称。space form の値と positional の取り合いは path-search が解決する (それが本設計の思想)

## 採用しなかった案

### bool を presence-only に寄せる (flag と同一視)

「--enabled=true が書けない bool」は string/number との対称性を壊し、値型としての bool の設計を特殊側 (flag) の都合で歪める。本 DR の向きの逆であり不採用。

### bool の `:set` に裸 set-true 縮退を残す (加算的互換)

bool でだけ `:set` が「値形 + 裸 true」の二役になり、綴り DSL の意味が型依存になる。flag 展開の等価式が「bool 側が暗黙に :set:true を含む」という読み替えを要し代数が濁るため不採用 (§4 の厳密な代数を採る)。

### bool の値形を eq-split のみに絞る

消費曖昧性の回避にはなるが、string/number が space form を受ける対称性を bool だけ欠く。曖昧性の解決は path-search の本領であり、値型の対称性を優先 (§4)。

## TODO (後続)

- flag → bool の**展開の正規形** (§2 案 A: Exact+link / 案 B: long 綴り合成) は lowering 仕様の確定時に決める (§4 で `:set` 系綴りの意味論は確定済み — 残るのは flag の内部展開経路の選択のみ)
- count の展開先は bool ではなく **number セル** (DR-005: number + defaultValue=0 + 発火で increment、accumulator 意味論はセル側 = DR-029)。flag と同じ整理 (type preset の合成) で正規形を別途書く

## 関連

- DR-074 §3 (bool canonical 字句) / DR-066 §3 (`not_a_bool`)
- DR-011 / DR-045 (variant)
- DR-040 (型方言 — flag/count は標準層の座席)
- issue `2026-07-08-variant-bool-eq-split-value` (本 DR で解消)
