# DR-085: regex_match — 照合方言は host 実装準拠、colon 含み pattern は既存オブジェクト形式

> 由来: kuu.mbt issue regex-match-filter (filters registry に regex_match が無い)。方言論点は kawaz 裁定 (2026-07-09)「持ち込む言語が持つ regex エンジンや実装に準じる宣言で良い。全て同じを目指すのはキリがないし現実的でない」。colon 分割論点は DESIGN §8.4 の既存オブジェクト形式で解消できると判明したため、裁定済み + 導出可能として自律起草 (2026-07-10)。

## 決定

### 1. regex_match は Validate filter (pattern 1 引数)

`regex_match` は filters registry の Validate 住人 (DR-040 の「狭める (拒否)」語彙、DR-009 の DSL 例・DESIGN §8.4 が既に予約)。pattern 1 引数を取り、対象 string が照合すれば素通し、しなければ reject。

- **unanchored = 部分一致**。全体一致は pattern 側の `^...$` アンカーで表現する (照合エンジンの一般慣習に従い、filter 側で暗黙アンカーを足さない)
- pattern の compile 失敗と照合不一致は別の失敗 (前者は定義不良、後者は入力拒否)

### 2. 照合方言は host 実装準拠

spec は regex の方言 (メタ文字集合・文字クラス・拡張) を規定しない。**各 host 実装は自身の言語が持つ regex エンジンに準じる**ことを宣言すれば適合する。

- DR-040 の「regex 方言の一致が cross-host 再現性の条件」という記述はこの裁定で相対化される: 方言一致は「同一挙動を跨 host で要求する場合の条件」であって、spec が課す要件ではない
- conformance fixture は**方言差の出ない共通パターンに限定**して書く (literal / `^` `$` アンカー / `[a-z0-9]` 級の基本文字クラス)。lookahead・Unicode プロパティ等の host 依存領域は fixture に載せない
- host 言語に regex エンジンが無い実装は、サブセットを自前実装して「その host の方言」として宣言してよい (方言の内容は host の関心)

### 3. colon を含む pattern は既存のオブジェクト形式で書く

filter の string 短縮形 (`"regex_match:^[0-9]+$"`) は colon 全分割のままとする (規則不変)。`^https?://` のように pattern 自体が colon を含む場合は、**DESIGN §8.4 が既に規定するオブジェクト形式**を使う:

```json
{"name": "regex_match", "args": ["^https?://"]}
```

短縮形は「引数が colon を含まない単純ケース」の糖衣であり、複雑な引数のためにオブジェクト形式が用意されているという既存の役割分担がそのまま適用される。

## 採用しなかった案

### filter 名による分割規則の特例 (regex_match のみ first-colon split)

DSL の一般規則 (colon 全分割) を name 依存にする。読み手が filter 名ごとに分割規則を覚える必要が生じ、同種の要求を持つ将来 filter のたびに特例が増える。

### descriptor 宣言による分割制御 (arity / greedy-last-arg を registry descriptor に持たせる)

DR-061 の descriptor 語彙拡張としては一貫するが、オブジェクト形式が同じ問題を既に解いており、新機構の追加理由がない。短縮形の表現力を上げる関心が将来実証されたら再検討する。

### canonical subset (kuu_regex_min) の spec 固定

kawaz 裁定で明示的に棄却。「全て同じを目指すのはキリがない」— 方言は host の関心。

## 波及

- fixtures: fixtures/pre-filters/ に regex_match の輪郭を追加 (一致受理 / 不一致 reject / 部分一致と全体一致の区別 / メタ文字 escape。いずれも方言安全な共通パターンのみ。colon 含み pattern のオブジェクト形式 case を含める)
- DR-040: 「regex 方言の一致」節は本 DR §2 の相対化を受ける (本文改訂は不要、参照で足りる)
- kuu.mbt: filters_registry に regex_match を追加 (MoonBit core string の第一級 Regex の薄い wrapper、方言 = core Regex 準拠を宣言)。issue regex-match-filter が追跡

## 関連

- DR-040 (狭める/広げる語彙、regex 方言の cross-host 記述) / DR-009 (DSL 例) / DESIGN §8.4 (filter の string 短縮形とオブジェクト形式)
- DR-061 (registry descriptor — 分割制御拡張を採らなかった対象)
- kuu.mbt issue regex-match-filter (経緯、kawaz 裁定の記録)
