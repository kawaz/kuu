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

## 採用しなかった案

### bool を presence-only に寄せる (flag と同一視)

「--enabled=true が書けない bool」は string/number との対称性を壊し、値型としての bool の設計を特殊側 (flag) の都合で歪める。本 DR の向きの逆であり不採用。

## TODO (後続)

- 展開の正規形を案 A / 案 B のどちらで固定するかは lowering 仕様の確定時に決める (本 DR は「bool は値型・特殊性は flag 側で吸収」の向きと等価スケッチまでを確定)
- fixture 追従: `lowering/long/variant.json` の why 改訂 + variant 持ち bool の eq-split ケース追加、`value-typing/bool-canonical.json` への `--x=value` × variant 共存ケース追加

## 関連

- DR-074 §3 (bool canonical 字句) / DR-066 §3 (`not_a_bool`)
- DR-011 / DR-045 (variant)
- DR-040 (型方言 — flag/count は標準層の座席)
- issue `2026-07-08-variant-bool-eq-split-value` (本 DR で解消)
