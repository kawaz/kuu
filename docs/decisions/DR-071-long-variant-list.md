# DR-071: long の責務分離 — variant リスト一級化と bool 糖衣

> 由来: slice の absent long conflation バグ (2026-07-05、lower fixture 実食で検出) が露呈した「presence を absent vs 空配列の区別に載せる」ことの構造的脆さと、kawaz の責務混載指摘 (long は入口 presence / 主入口綴り供給 / variant リストの 3 責務を 1 フィールドに畳み、主入口は「暗黙の set variant」になっている)。codex 検討 (分離案推奨、protobuf3 repeated field では absent/empty が原理的に表現不可能という裏付け) と kawaz の一級化提示を経て確定。

## 決定

### 1. long の値空間は bool | variant DSL 配列の二形

```json
"long": true                          // 糖衣 = [":set"] (最頻ケース)
"long": [":set", "no:set:false"]      // 正規形: 各要素が入口を 1 個生む
"long": ["no:set:false"]              // --no-ssl のみ (主入口なし — 本 DR で表現可能になった)
```

- **正規形は variant DSL の配列**で、各要素が long 入口を 1 個生む。`:set` (prefix 空文字列) が主入口 (`--<name>`)。主入口は特別扱いでなくリストの一級要素 — 「暗黙の set variant」が明示に還元される
- **`long: true` は `[":set"]` の糖衣** (multiple / filters と同じ string|object 二形イディオムの bool|array 版)。展開は long installer の解釈 (wire には二形とも載る — multiple の文字列プリセットと同じ扱い)。例外: **type:flag は糖衣を `[":set:true"]` に差し替える** (preset による糖衣差し替え、DR-076 §2)
- **absent = `false` = `[]` = 入口なし (全て同義)**。「省略 = default 値と等価」の構造等価 (DR-063 §4) に完全に乗り、absent/empty の presence 意味論が仕様から消滅する。JSON 生態系 (protobuf3 / Go encoding/json 等) で区別が落ちても意味が変わらない
- **`long: []` の意味変更 (破壊的、ドラフト期)**: 旧「主入口を生成」→ 新「入口なし」

### 2. variant DSL の set 意味拡張 (DR-011 更新)

`set` の **args なし形 = 値スロット** (トークンを消費する通常入口。flag 等の非消費 type では type 相応の固定値供給 — lowering は従来の主入口生成と同一)。args あり形 = 固定値 (現行どおり)。`"set"` 単独 (`: `なし) は文法エラーのまま (prefix か effect か曖昧になるため `:set` のみ)。

### 3. short は不変

short は variant 概念を持たず「presence + 綴り」を文字列 1 つで表現する。対称性は「入口軸が 1 フィールド」という形で回復する (型の違いは情報量の差 — long の綴りは name 由来で決まる)。

## 採用しなかった案

- **現状維持 (absent vs [] の区別)**: protobuf3 の repeated field は区別を wire 上表現できず、Go の omitempty も落とす — 一部シリアライズ方式で仕様の意味論が原理的に載らない。多言語展開のたびに同種の conformance 失敗を再演する構造
- **long: bool + long_variants の分離 (2 フィールド)**: presence 罠は消えるが、フィールド分離の命名問題と「主入口の暗黙性」が bool 側に残る。一級化の方が違和感の根を絶つ
- **オブジェクト形 (long: {variants?})**: fragility が配列から object へ横滑りするだけ (Go では struct の omitempty が実質機能しない)
- **`[":undef"]` による打ち消し**: 「存在しないものを書いて無効化する」否定宣言は包含側で書く原則に反する
- **long_<prefix> の展開属性**: open set の prefix をフィールド名に埋めると descriptor owns / schema / completeness 検査が動的フィールド名を扱う羽目になる

## 波及 (本 DR と同時反映)

DESIGN §7.1/§7.3、LOWERING §B.1、schema (long: boolean | array)、fixtures の definition (旧 `long: []` は `true` へ)、DR-011 注記。slice の追従 (ElemDef の二形解釈) は別作業。

## 関連

- DR-011 (variant DSL — §2 の set 二形拡張で更新)
- DR-063 §4 (構造等価 — absent/false/[] 同義の根拠) / DR-067 (well-formedness — 二形の型)
- DR-057 (別綴りは alias — 主入口綴りが name 由来のみである根拠)
- docs/journal/2026-07-05-phase2-lowering-fixtures.md (absent long conflation の検出経緯)
