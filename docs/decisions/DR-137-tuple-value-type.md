# DR-137: value-type 体系への tuple 型追加 — 位置が定義時に固定・要素型が座ごと個別、record と完全対称

> 由来: kawaz 裁定 UC-Q1=a (2026-08-16、ccmsg) と 2×2 整理 (kawaz mid=32-34)。正本ノートは
> `docs/research/2026-08-16-union-culling-settlement.md` §1b。union 値の枝並行構築 (DR-138) が
> 「位置付きで部分構築できる固定アリティの積型」を出力側に要求するため、DR-128 が入力側の
> 理由で棄却した tuple 型を出力側の要求から導入する。**DR-128 採用しなかった案 (a) を
> supersede し、DR-126 §1 の value_type 列挙を拡張する。**

## 決定

### 1. `value_type` に `tuple` を追加する

DR-126 §1 の体系に、固定アリティの積型を第一級で追加する:

```
value_type :=
    "string" | "number" | "bool" | "null" | "value"
  | { "array": value_type }
  | { "map": value_type }
  | { "record": { <field_name>: <type 参照>, ... } }
  | { "tuple": [<type 参照>, <type 参照>, ...] }            // 本 DR で追加 (2 要素以上)
  | [value_type, value_type, ...]                          // union (2 要素以上)
```

**record と完全対称の規定を敷く** (DR-126 §1 の各規定がそのまま位置軸に写る):

- **座の型は kuu の type 参照** — registry の住人を DR-094 の ns 付き識別子で指す。
  解決は registry 空間のみ、未登録参照は unknown-vocab 系の definition-error
- **型の依存グラフに参加する** — tuple の座の type 参照は DR-067 の参照層が検査する
  type edge に含まれ、循環は definition-error `circular-ref` (再帰型は v1 で許さない)
- **JSON 形は再帰導出する** — 消費者は各座の type の `out` を再帰的に辿る。tuple の
  JSON 表現は**長さ N の array** であり、値集合は `{"array": "value"}` の部分集合。
  DR-107 §3 の「JSON 表現可能な型のみ」閉域は不変 (定義域の拡張ではなく精密化)
- **value_type の内側へネストできる** (`{"array": {"tuple": [...]}}` 等)

**bare array union 記法との構文衝突は起きない** — DR-107 §3 / DR-126 §1 が予告した
「tuple 導入時はタグ付き形へ移行する」をそのまま実施した形であり、`[...]` は union、
`{"tuple": [...]}` が tuple で、綴りの空間が交わらない。

### 2. tuple は closed — 位置語彙とアリティが定義時に閉じている

record が「キー語彙の閉域」であるのと対称に、tuple は**位置語彙 (アリティ) の閉域**である。
値は常に宣言どおり長さ N の JSON array で、各座には座の type の `out` に適合する値
または `null` (DR-130 の値空間の住人) が座る。

**record と違い、tuple に presence-optional は無い** — 座は常に在り (長さが形の一部)、
「値の無い座」は null で表す。結果射影は DR-130 §1 の全列挙規則がそのまま効き、
埋まらない座は `null` で現れる (`[0, 255, null]`)。sources shadow も位置対応の配列で
座ごとにタグ / null を持つ (DR-122 §3「タグの決定単位は値の座」の位置軸適用 —
既存の sourceShadow の array 形で表現でき、fixture schema の変更は不要)。

**null 座が残ったまま「その型の完成値」かは軸が違う** — record は presence-optional
なので部分値も完成値だが、tuple は全座充足が値の意味である (kawaz mid=32-34 の裁定)。
この「完成」判定が効くのは値確定相であり、規定は DR-138 §1 が置く (単相 tuple セルの
未完成確定は kind `parse` / reason `incomplete_value` — DR-138 §4)。

帰結として、**完成値でない tuple 値 (null 座持ち / アリティ不一致) の丸ごと供給は型不適合**
である — 下位席 (env / config / default) の完全値 1 発供給や丸ごと set の型判定 (DR-138 §3)
には完成判定が含まれ、宣言 default に完成値でない array を書けばその供給は既存の宣言 default
供給失敗の経路 (DR-102 §5 系、`fixtures/value-typing/declared-default-parse-failure.json` の族)
に落ちる。これは **`incomplete_value` (CLI/link による組み上げが完成に達しなかった確定相の
失敗、DR-138 §4) とは別位相** — 供給された 1 値の型判定は供給時に即座に裁かれ、確定相まで
遅延しない。

### 3. 2×2 の整理 — tuple : array = record : map

構造型 4 種は「キー / 位置が定義時に固定か」×「要素型が座ごとに個別か」の 2×2 で
過不足なく整理される (kawaz mid=32-34):

| | 座が定義時固定 (closed) | 座が実行時 (open) |
|---|---|---|
| **要素型が座ごと個別** | `record` (名前軸) / `tuple` (位置軸) | — (表現しない) |
| **要素型が一様** | (record / tuple の縮退で書ける) | `map` (名前軸) / `array` (位置軸) |

tuple は array の精密化 (record が map の精密化であるのと同型) であり、静的化・vivify・
言語バインディング直訳 (固定長タプル / struct への写像) の各性質は closed 側の列から
機械的に従う。null 残りの責務分担もこの表から読める — closed 側は「座が在る」ことを
型が保証し「座が埋まる」ことは値ごと (record は埋まらなくても完成、tuple は全座充足が
完成)、締めの述語 (`required` / filter) は型の外の関心 (DR-047 / DR-126 §3 の線のまま)。

### 4. link 固定パス DSL — `[int]` は tuple では定義時静的、vivify 可

DR-127 §2.2 の遷移表に tuple 行を追加する:

| 現在の value_type | 次 segment の静的判定 | 実行時に残るもの | vivify |
|---|---|---|---|
| **tuple** | `[int]` の範囲・負 index とも**定義時静的** (アリティが宣言で閉じている — 範囲外・`.name` は definition-error `absent-ref` 系)。座に当たったら座の type の `out` へ降下を継続 | 値読みのみ (座は常に在る) | **可** (器 = 全座 `null` の長さ N array) |

array 行 (vivify 不可 — 要素の存在が実行時) は不変であり、両行の差は §3 の 2×2 の
帰結である。vivify が安全である根拠は record と同一 — DR-127 §根拠「vivify を許すのは、
closed record が『器の形』を定義時に確定させるから」の「形」がキー語彙から
アリティ + 座型に置き換わるだけで、生成した器がどの座を持ちうるかは定義時に尽くされる。
vivify は `set` 専用・Value 返し fn の空座 Reject 等の既存規則 (DR-127 §3/§4.1) も
そのまま効く。座への set の operand は**座の type のパーサ**を通る (DR-127 §3.2 の
「パースを担うのはフィールド側の type」の位置軸適用)。

### 5. 宣言と実産出の乖離は Error (DR-126 §4 の対称)

type パーサが返した値が自身の tuple 宣言と食い違う場合の扱い:

| 乖離 | 扱い | reason |
|---|---|---|
| (a) 長さが宣言アリティと違う / array でない | Error | `output_shape_mismatch` |
| (b) 非 null 座の値が座の type の `out` と合わない | Error | `field_type_mismatch` |
| (c) 座が `null` | **正常** — null は値空間の住人 (DR-130 §3)、完成判定は確定相の関心 (DR-138 §1) |

record の (c) 「キー欠落 → 射影で null 補形」に対応する状態は tuple には無い —
長さが形の一部なので「座が無い」産出は (a) である。reason は record 系 (DR-126 §4 /
REFERENCE §7.3) の既存語彙を共用し、新語彙は興さない。

## 根拠

### 出力側の部分構築が tuple を要求する — DR-128 棄却の前提が変わった

DR-128 採用しなかった案 (a) の棄却理由は「tuple は本 DR で不要になった — pair は
定義片の `seq` がそのまま表す」であった。この理由は**入力側 (CLI トークンの消費文法)**
については今も正しく、本 DR は覆さない — 入力の複数トークン形は引き続き
`input_structure` の `seq` が担う。

覆ったのは前提の射程である。union 値の枝並行構築 (DR-138、kawaz 承認済みの color 例) は
`--r 0` が空セルの位置 0 へ書いて `[0, null, null]` を組み上げる**出力側の座**を要求する。
これは DR-128 起草時に存在しなかった要求であり、入力側の `seq` では書けない
(seq は消費の宣言であって値の座ではない)。value_type に位置軸の closed 型が無い穴が、
この要求で初めて観測可能になった。

### 「固定長 array + 全座必須注釈」の近似より第一級が良い

近似案は value_type の追加を避けられるが、(i) array 行の vivify 不可に注釈依存の例外が
生え DR-127 §2.2 の表が「array だが例外」を持つ、(ii) 要素型が座ごとに違う tuple
(`[int, string]`) が書けず §3 の 2×2 の左上セルに穴が残る、(iii) 型が違うものを
同じ型 + 注釈で表すのは DR-102 の「違うものを違うものとして扱え」に反する。

## 波及

- **DR-126**: §1 の value_type 列挙に tuple を追加 (更新注記)。§2〜§5 の record 規定は
  不変で、本 DR が位置軸の対称形を置く
- **DR-127**: §2.2 遷移表に tuple 行を追加 (§4)。§3 の vivify 器の列挙に tuple
  (全座 null array) を追加。他の規定は不変 (union 行の変更は DR-138 の関心)
- **DR-128**: 採用しなかった案 (a) に supersede 注記 (棄却理由の入力側は不変、
  出力側の新要求で導入)
- **schema/descriptor.schema.json**: `$defs.value_type` の `anyOf` に
  `{"tuple": [...]}` 分岐を追加 (items は record フィールドと同じ type 参照 string、
  `minItems: 2`)。union 分岐の description にある「将来 tuple 型を導入する場合は…
  タグ付き形へ移行する」の予告文を本 DR 実施の記述へ差し替え
- **scripts/lint-descriptors.py**: type 参照の解決検査 (record フィールド) を tuple 座へ
  拡張 (同じ registry 語彙への解決検査)
- **docs/REFERENCE.md**: value_type 記法の表は REFERENCE に無い (DR-126 波及の確認の
  まま) ため追記不要。§7.3 の乖離 reason 4 語彙は tuple と共用 (§5) で語彙追加なし
- **言語バインディング**: tuple の型導出は固定長タプル / struct への直訳、全座
  `T | null` (DR-130 §7 の record 側と対称)
- **kuu.mbt / kuu-cli**: value_type decode / 乖離検査 / vivify 器 / パス DSL の tuple 行の
  追随 (spec 側 pin 更新後、lockstep 窓)

## 採用しなかった案

### 固定長 array + 全座必須注釈による近似

根拠節のとおり (vivify 例外・座別型の欠落・記法衝突・DR-102 の線)。

### record の名前付き糖衣 (`{"record": {"0": ..., "1": ...}}`) への畳み込み

JSON object のキー順は非規範であり位置の意味論をキーの綴りに埋め込むことになる。
record の presence-optional と tuple の全座充足 (§2) は責務が違い、同じ型に畳むと
完成判定 (DR-138 §1) が「record だが特別」の分岐を持つ。

## 関連

- DR-126 (record 型 — 本 DR が対称拡張する体系の正本)
- DR-127 §2.2/§3 (パス DSL の遷移表と vivify — tuple 行の追加先)
- DR-128 採用しなかった案 (a) (tuple 棄却 — 本 DR が supersede)
- DR-107 §3 (value_type の JSON 閉域と bare array union 記法の衝突予告)
- DR-130 (null は値空間の住人 — tuple の null 座表現の前提)
- DR-138 (union 値の枝並行構築と確定相淘汰 — tuple を要求した側、完成判定の正本)
- docs/research/2026-08-16-union-culling-settlement.md §1b (裁定の正本)
