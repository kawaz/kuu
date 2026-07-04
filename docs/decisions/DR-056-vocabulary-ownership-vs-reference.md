# DR-056: 宣言語彙への 2 つの関わり方 — 所有 (lowering 責務) と参照 (advisory read)

> 由来: issue `2026-07-03-alias-normalization-help-completion-installer` の「明文化すべきポイント」。DR-042 の非削除①' (宣言層 read-only 保全) が可能にする形の明文化。本セッションで確定。

## 決定

installer が宣言語彙に関わる形を 2 種類に区別する:

- **所有 (ownership)**: その語彙をどう解釈し下流 (lowered 層) に変換するかを一意に決める側。lowering 責務を持ち、不変則③ (交差禁止) で排他。1 語彙 1 所有者
- **参照 (advisory read)**: 語彙を読んで補助的に活用する側。自由 (排他なし、宣言なしに読める)。help installer が `alias` / `hidden` / `deprecated` を読んで表示データを作る、completion installer が同じ語彙から補完データを作る、等

参照には規律を 1 本課す:

> **参照読みの成果は、パースの観測挙動 (効果列、DR-038/045) に影響する寄与の材料にしてはならない。** 表示データ・補完データ・診断のような副次成果物の構築にのみ使える。

- パース挙動を変えたければ所有者になる (語彙を所有し lowering する) — 参照の抜け道で意味論を変えることはできない
- 非削除①' (宣言属性は inert に残る) はこの参照を可能にするための保全であり、help 生成・diagnose・再シリアライズは全て参照の実例
- 不変則② (他 installer の lowered 産物を読んで反応しない) は不変 — 参照が許されるのは**宣言層**であって lowered 産物ではない

## 採用しなかった案

### 参照にも登録 (宣言) を要求する

参照は観測挙動に影響しない読み取りであり、合成の正しさ (順序非依存・冪等) に関与しない。登録制にする理由がない。

### 全てを所有に一本化 (表示用も語彙所有者が生成)

long installer が help 表示データまで生成する形。表示・補完の関心が全 installer に散り、レンダラ差し替え (registry) と衝突する。読み手 (help/completion) 側が集める方が責務が閉じる。

## 関連

- DR-042 (installer 5 不変則 — ①' が参照を可能にし、③が所有を排他にする。本 DR は関わり方の語彙を補完)
- DR-057 (alias — 所有は alias installer、canonical 表示・deprecated 警告・補完切替は参照側)
- issue `2026-07-03-alias-normalization-help-completion-installer`
