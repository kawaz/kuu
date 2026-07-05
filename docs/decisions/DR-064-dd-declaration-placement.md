# DR-064: dd の宣言配置 — canonical は options[]

> 由来: dd fixture の輪郭議論 (docs/issue/2026-07-04-phase1-serialization-design-agenda.md の派生) で、dd だけが「配置が意味を持たない要素」として positionals[] に例示されている違和感 — DR-018 の「配置で役割が決まる」原則との不整合 — が指摘されたこと。

## 決定

### 1. dd の canonical 配置は options[]

dd の性質は options の分類意味論と一致する: 順不同 (背骨上のどこでも発火)・greedy 面の住人・ハイフン風の綴り・出現位置が結果に効かない。構造的には dd は「**効果が『値セルへの書き込み』でなく『severed 化』である特殊な flag**」であり (flag = greedy exact 衛星 + 効果、と同じ骨格)、options[] が分類として正しい。

```json
"options": [
  {"name": "verbose", "type": "flag", "long": []},
  {"name": "--", "type": "dd"}
]
```

### 2. 配置は挙動に影響しない (仕様事実)

dd installer は `type: "dd"` を**配置不問で回収**し、lowered 形 (greedy 面の dd exact 衛星) は同一になる。positionals[] 配置も合法であり reject しない (DR-054 の境界基準: 挙動不変なので Error でも warn でもない)。canonical からの逸脱は lint の style 指摘の関心。

### 3. usage の `[--]` 表示は operands 直前 — 宣言分類と表示位置の分離

「ユーザ目線では positionals の頭」という直観の正体は宣言分類ではなく **usage 表示の位置** (`prog [options] [--] <args>`)。help レンダラが dd 要素の存在を見て operands 直前に `[--]` を出すのが表示側の慣習であり、宣言側の配置とは独立 (挙動と表示の分離 — 表示メタは UsefulAST 専用 = DR-046、hidden は表示層 = DR-058 と同じ流儀)。

### 4. 重複 dd は無害 (回数制限の規則は持たない)

同一スコープに dd を複数宣言しても、同一トークンでの発火は同効果 (severed 化 + 消費 1・値なし) なので効果列 dedup (DR-038) で合流し ambiguous にならない。これは DR-041 の一般則「同一スコープ内の重複は静的 warn + 実行時 ambiguous」の**例外ではなく同じ原理の帰結** — DR-041 の「実行時 ambiguous」は重複読みが異なる実体への異なる効果を生む通常ケースの帰結であり、経路同一性はもともと効果列で判定される (DR-038)。dd は値効果を持たないため同効果に落ちて合流する。「1 回のみ」の使用感は severed の創発 (発火後は greedy 面ごと off になり 2 個目以降の `--` は raw = リテラル) であって回数制限規則ではない。冗長宣言の指摘は lint の関心。

### 5. name のデフォルト供給と軸限定 (2026-07-05 追加)

- **dd プリセットは name のデフォルト `"--"` を供給する** — canonical の宣言は `{"type": "dd"}` だけで足りる。明示 name は合成順 (DESIGN §3.5、プリセット → 直書き上書き) で普通に上書きされ、dd の綴り差し替え (方言 CLI) に開く。プリセットによる name デフォルト供給は初例だが、type プリセット = 属性の束 (LOWERING §A.5) の既存機構にそのまま乗る
- **dd の name はトリガ綴り軸にのみ効く** (DR-046 の多軸供給源のうち)。dd は値セルも子も持たないため結果キー軸には値が発生せず (DR-051 の absent)、**export_key を設定しても結果には何も現れない** (無意味だが無害 — definition Error にせず lint warn の関心、DR-021 の流儀)。DR-051 の「スコープ生成要素は選ばれたら空でも `{}`」は子または値セルを持つ要素の規則であり、dd には適用されない
- `--` の発火有無を知りたい場合の正規解は ParserContext.selected (DR-051 §5 の 2 層分離)。結果オブジェクトへ出す道は持たない — dd に値効果を持たせると §4 の「値効果なし → 重複合流」の創発が壊れる

## 採用しなかった案

### positionals[] 先頭を canonical にする

usage 表記との同型性 (書き味) はあるが、「配置が意味を持たない要素が位置消費の配列に居る」という DR-018 との不整合が残置される。usage 直観は §3 の表示層分離で担保できる。

### 要素をやめて config 化 (`config: {dashdash: ...}`)

「スコープに 1 個・位置無意味・値なし」という実態には最も正直だが、要素であることで乗っている既存機構 (hidden / 表示メタ / alias による別綴り) を失い、DR-042 の「dd = installer 所有語彙 (要素形)」の覆しにもなる。得られるのは正直さだけで失うものが多い。

## 関連

- DR-018 (配置で役割が決まる — 本 DR は dd をこの原則に整合させる)
- DR-041 / DR-042 (dd = greedy 面のトリガ兼消費者、dd installer — lowered 実態は不変)
- DR-046 / DR-058 (挙動と表示の分離の先行流儀)
- LOWERING §B.4 (dd installer — 例示を options[] へ更新)
- docs/issue/2026-07-04-phase1-serialization-design-agenda.md (議論経緯)
