# DR-076: bool は通常の値型、flag/count が特殊 — 特殊性は flag/count 側の展開で吸収する

> 由来: issue `2026-07-08-variant-bool-eq-split-value` (variant 持ち bool の eq-split 値形の可否)。kawaz 裁定 2026-07-08。

## 決定

### 1. bool は string/number と同格の値型

bool は元々 **string / number などと同様に引数を受けて `:set` する値型**である。したがって:

- **variant を持つ bool も eq-split 値形 (`--ssl=false`) を受ける**。variant トリガ (`--ssl`/`--no-ssl`) と `=value` 形は排他ではなく共存する
- 値の字句は DR-074 §3 の canonical bool 語彙 (true/false/1/0/""、case-insensitive)、語彙外は `not_a_bool` (DR-066 §3)

引数を持たない **flag や count の方が特殊**な立場であり、bool の設計を flag の都合 (presence-only) で歪めない。

### 2. flag の特殊性は flag 側の展開 (bool への糖衣) で吸収する — 正規形は long 綴り合成 (kawaz 裁定 2026-07-08)

flag を内部的に bool へ展開する際の摩擦 (引数の有無) は、**特殊な立場である flag 側の展開で工夫する**。bool 本体には手を入れない。正規形は **long 綴り DSL の合成**で定める:

- **合成規則**: flag installer は宣言された**非空の** long variant リストに `:set:true` (裸トリガで true を set) を補完する (冪等 — 既に含まれていれば足さない)。absent / `false` / `[]` は他の型と同様**入口なし** (DR-071 §1 の三態同義を維持 — 合成を absent/`[]` の区別に載せると、区別が wire 上落ちる serialization 方式 (protobuf3 等、DR-071 の採用しなかった案) で flag の意味が変わってしまう)
- **flag の `long:true` 糖衣は `[":set:true"]`** (裸発火のみ = 古典 flag)。`long:true` = `[":set"]` (DR-071 §1) は他の型の糖衣で、flag preset はこれを差し替える。糖衣層の default を preset が差すのは count が defaultValue=0 を差すのと同型で、`:set` の代数 (§4、型非依存) には触れない
- 等価表 (すべて `...filters` / short / env 等の他属性はそのまま):

```
{type:"flag"}                                ≡ {type:"bool", default:false}            // long 入口なし (short / env だけの flag)
{type:"flag", long:true}                     ≡ {type:"bool", long:[":set:true"], default:false}
{type:"flag", long:[":set"]}                 ≡ {type:"bool", long:[":set", ":set:true"], default:false}   // 値形 + 裸の同居
{type:"flag", long:["no:set:false"]}         ≡ {type:"bool", long:["no:set:false", ":set:true"], default:false}
{type:"flag", long:[":set", "no:set:false"]} ≡ {type:"bool", long:[":set", "no:set:false", ":set:true"], default:false}
```

- **値形のみ / off-switch のみが欲しい場合は type:bool を直接書く** — 補完に opt-out は無く、逃げ道は型選択そのもの
- **short は不変** (DR-071 §3)。flag の short / 発火 entry は非消費・固定 true 供給 (DR-071 §2「非消費 type では type 相応の固定値供給」がそのまま生きる — flag 型を残す理由の実質はここ: short は variant DSL を持たないため、型が慣習挙動を担わないと裸 `-v` が表現不能になる)
- AST / 言語 DX 層に flag 概念を残すか展開後で持つかは表現層の自由 (core の意味論は上記展開で閉じる。help のデフォルト文言等はその層の関心事)

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

### 展開の正規形を node 語彙で定める (matcher 無しの値セル + Exact トリガ + link)

§2 の綴り合成に対する対案。値だけ持つ bool セルを置き、綴りは Exact でマッチさせて link の値をセットする形。bool の long lowering 仕様を node 層でもう一度記述する重複が生じ、綴り合成なら「flag 定義の lowering 結果 = 等価 bool 定義の lowering 結果」の恒等式として fixture 検証できる利点も失う。

### flag 型の廃止 (bool + `long:[":set:true"]` で足りる)

long 軸では成立するが、short 軸の裸発火 (`-v` で true) の表現手段が消える — short は variant DSL を持たない (DR-071 §3) ため、非消費の慣習挙動を担う型が無くなると逃げ道が無い。short の variant リスト化 (DR-071 §3 の改訂) まで波及させるコストに見合わず、flag を残して糖衣差し替えで済ませる方が変更が局所。

### flag の `long:true` 糖衣を型非依存 (`[":set"]`) のまま補完に載せる

最頻の flag (`long:true`) が値形 (`--verbose=false` / `--verbose false`) まで受けることになり、「宣言していない効果が発動する」ことになる (bool 語彙トークンが後続する argv で Ambiguous が第一級で発生)。flag preset の存在意義は慣習 (presence-only) のエンコードなので、糖衣は古典 flag 側に倒す。値形が欲しければ明示 (`long:[":set"]`) か type:bool。

## TODO (後続)

- ~~count の展開正規形~~ → **DR-077 で確定** (effect 語彙に update を追加し、count = number + default:0 + `long:true` 糖衣 `[":update:inc"]` — flag と同じ綴り合成の 2 例目)

## 関連

- DR-074 §3 (bool canonical 字句) / DR-066 §3 (`not_a_bool`)
- DR-011 / DR-045 (variant)
- DR-040 (型方言 — flag/count は標準層の座席)
- issue `2026-07-08-variant-bool-eq-split-value` (本 DR で解消)
