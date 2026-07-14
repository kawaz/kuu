# DR-079: filter 座席の完全格子と作用対象アンカー命名 (piece / value / cell)

> 由来: 「pre_filters と post_filters があるのに中間層だけ無印の `filters` で、意味が曖昧すぎて誤読が多発する」(kawaz、2026-07-10 チャット議論)。意味整理で命名以前の構造欠陥 2 つと座席格子の不完全性を特定し、作用対象 artifact 名でアンカーする命名へ全面移行を裁定。DESIGN §6.2 の相ラベル事故 (issue design-6-2-piece-post-label-collision) と DR-050 の「post_filters のみ」読み分け不能が実害の実例。

## 特定した構造欠陥

1. **`filters` の二重役**: registry 名 (純関数語彙プール `<filters>`) と wire フィールド名 (piece 単位 T→T 座席) が同語で、「filters を通る」が registry 適用一般とも特定座席とも読めた
2. **pre/post のアンカー非対称**: `pre_filters` の pre は **parse 基準**、`post_filters` の post は **accumulator 基準**。対に見える名前が別の軸を指し、parse 基準で対称に読む誤読 (DESIGN §6.2 が per-piece T→T に post_filters と表記した事故) を構造的に誘発した
3. **座席格子の不完全性**: 分割前 (cell 生文字列全体への string→string) の座席が存在せず、multiple 無し要素の「長さ 1 縮退」で pre_filters が事実上それを兼ねていたため欠落が見えなかった

## 決定

### 1. filter 座席の完全格子

値の一生に沿って、形を変える**変換器** 3 つ (separator 分割 / type.parse / accumulator) と、同一ドメイン内純変換の **filter 座席** 4 つが交互に並ぶ:

| 座席 | 作用対象 | 型 | 単位 |
|---|---|---|---|
| A `raw_filters` | 分割前の生文字列 | string → string | cell |
| B `piece_filters` | 分割後の piece | string → string | piece |
| C `value_filters` | parse 済みの値 | T → T | piece |
| D `cell_filters` | 累積後のセル値 | Acc → Acc | cell |

matcher 層 (トリガ認識・トークン分解、DR-041/042) は格子の外 (照合層)。ただし positional の値スロットでは B/C/parse の reject が経路不成立 (held error、DR-037/041 §5) として経路探索に参加する — filter は「処理」であると同時に背骨側では「受理ガード」でもある。

### 2. wire フィールド名は作用対象 artifact でアンカーする

```
pre_filters  → piece_filters
filters      → value_filters
post_filters → cell_filters
```

相対語 pre/post を全廃する。raw → piece → value → cell はデータの一生の進行そのもので、各名前は「filter に何が入力されるか」を自己記述する。継承インターフェース (string 短縮形 = 差し替え / object 詳細形 = {prepend, append} / ref 後勝ち上書き、DR-062) は名前以外不変。

### 3. `raw_filters` (座席 A) は名前を予約し、配線しない

需要候補 (外側括弧剥がし・separator 正規化・エスケープ前処理) はあるが現時点で実需がない。multiple 無し要素では B が A を兼ねる縮退が現状の実態として妥当。需要が出た時に本格子の A 座席として配線する (名前・位置は本 DR が確保済み)。エスケープや splitter (multiple registry kind) との責務分担は配線時に裁定する。

### 4. registry 名 `filters` は語彙プール専用に純化

wire フィールドとしての `filters` は消滅し、`filters` の語は registry (`<filters>`、DR-040/061) だけを指す。descriptor の transform 参照 (DR-077 の update 等) は従来どおり `filters` registry の名前参照。

### 5. 互換 alias は置かない

v1 前 (MDR-001)。旧フィールド名の受理・warn 移行は設けず、spec 文書・schema・fixtures・参照実装を一斉更新する。

## 採用しなかった案

### アンカー全明示 (`pre_parse_filters` / `post_parse_filters` / `post_accum_filters`)

完全自己記述だが冗長で、wire に書く名前として重い。artifact 名方式は同じ情報をより短く運ぶ。

### C = `typed_filters`

既存属性 `values` (or のショートハンド、DESIGN §5.3) との字面近接を完全回避する案。raw → piece → value → cell の進行の語感を優先して `value_filters` を採用 (kawaz 裁定 2026-07-10)。`values` は複数形の列挙・`value_filters` は単数概念の複合語で、実文脈での取り違えは低いと判断。

### D = `accum_filters`

accumulator 直後という位置は明確だが、multiple 無し要素 (accumulator 不在の縮退、DR-034 §6.3 相当) で名前が浮く。`cell` は値セル・cell 上書き等の既存語彙と直結し、scalar でも自然。

### post だけ再アンカー (既存名温存)

`post_filters` の意味を「累積後」から別位相に黙って変えるのはリネームより悪い (過去文書との突き合わせで誤読が増える)。

## 波及

- **DR-062**: 命名 (`pre_filters`) は本 DR で superseded。継承インターフェースの規定は不変
- **DR-009 / DR-034 / DR-040 / DR-049 / DR-050 / DR-077**: 本文は判断記録として不変、INDEX に注記。現行規範 (DESIGN / PIPELINE / CONFORMANCE / LOWERING / schema) と fixtures は全面追従
- **issue design-6-2-piece-post-label-collision は本リネームで解消**: 相ラベルと wire 名の衝突が語彙レベルで消滅。schema の `cell_filters` description に「累積後 (accumulator 後) の Acc → Acc」を明記して DR-050 の読み分け問題も閉じる
- **piece の op 付き artifact 化** (issue list-merge-piece-op-vocabulary): merge 導入時に B/C は「payload にのみ効き op を素通しする」規定を merge 側 DR で追加する

## Superseded (歴史)

> **更新: 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。**

### 座席格子 D 行 (`cell_filters`) の分割 (DR-102 で更新)

> **更新: `cell_filters` が multiple 宣言の有無で T→T/Acc→Acc という異なる型の語彙を 1 属性に内包していたことが構造的欠陥と判明し、D 行は D1 (`final_filters`、確定値 T→T、非 multiple 専用) / D2 (`accum_filters`、累積配列 Acc→Acc、multiple 専用) に分割された。§2 の artifact アンカー命名原則、§「採用しなかった案」の `accum_filters` 不採用理由 (「multiple 無し要素で名前が浮く」) は、本分割により該当ケースが構造的に無くなったため解消。他 3 座席 (A/B/C) の格子・命名原則は不変。**

## 関連

- DR-009 (filter chain 7 段) / DR-034 (pieceProcessor) / DR-062 (継承インターフェース、命名は superseded)
- DR-040 / DR-061 (filters registry と descriptor)
- DR-049 / DR-050 (env / config 値源の chain 通過 — 語彙追従対象)
- DR-041 §5 / DR-037 (reject の経路探索参加 = 受理ガード面)
- issue list-merge-piece-op-vocabulary (piece の精密化、ラダー合成 merge)
