# DR-080: merge accumulator — piece マーカー語彙と old 合成

> 由来: リスト値への「継承リストの部分編集」需要 (canonical: `APP_FIELDS=ts,ip,method,path,ua` + `--fields -ip,-ua,@,duration,ip` → `ts,method,path,duration,ip`)。issue list-merge-piece-op-vocabulary の 2 ラウンドのチャット議論 (kawaz × Claude、2026-07-10) で意味論を確定。マーカー認識をクロージャや位相間共有 context で実現する案は、効果の純データ原則 (DR-045 §3) と DR-077 の「parser の old 依存化を棄却した」前例により最初から不採用 — データ (piece) 自身に op を運ばせる。

## 決定

### 1. merge は multiple registry の accumulator 語彙

```json
{"name": "fields", "type": "string", "long": true,
 "multiple": {"accumulator": "merge", "separator": ","}}
```

独立の node 属性 (merge: true 等) は設けない。DR-036 の accumulator 区分と DR-077 §3 の「multiple/accumulator は複数値の畳み (append/merge 等) に純化する」が既に予約していた座席の実体化である。**マーカー語彙 (§2) は accumulator=merge を宣言した要素の CLI 発火 piece 列にのみ適用される** — append 等の他 accumulator や multiple 無し要素では全 piece が literal。

### 2. マーカー語彙 (piece 全体一致のみ)

| piece 形 | 意味 |
|---|---|
| `-<operand>` | remove: operand と等価な要素を**全削除** (左 1 個ではない)。operand は要素 type で parse される (number リストの `-3` は「値 3 の除去」) |
| `@` | splice: old (§3) をその位置に展開 |
| `+` + (`-`\|`@`\|`+`) で始まる piece | escape: 先頭 `+` を 1 個剥がした literal (`+-a`→`-a` / `+@`→`@` / `++`→`+`)。直後が `-`/`@`/`+` 以外の `+x` は literal のまま |
| 上記以外 | add: 通常の値 piece |

- 部分一致はマーカーにならない (`a@b` は literal)
- `-` 単独は remove("") — operand "" は型 parse を通り、string 型では空文字要素の除去、number 型では not_a_number の reject
- `+` 単独は literal `"+"`

### 3. 評価規則 (左→右の一回走査)

- **マーカーを 1 つも含まない発火 = cell 上書き** (accumulator 無し要素の last-wins 再発火と同じ見え方)
- **マーカーを含む発火 = merge モード**。明示 `@` が無ければ**先頭に暗黙の `@`** が補われる
- **old** = セルの現在値。再発火なら直前発火までの結果、**初回発火なら値源ラダーの下位席の勝者** (env / config / inherit / default)。unset がラダーを開く既存規約 (DR-045) は「f = identity の merge」の縮退形にあたる — merge はラダーの「選択」原則 (DR-031) に対する、本 accumulator に限定された合成の口である
- `@` は「**それまでに出た remove を適用した old**」を splice する
- remove は**双方向**に効く: (a) それ以前に組み立てた作業リストから全削除 (後置 remove)、(b) それ以後の `@` の splice 内容から全削除 (前置 remove)。**それ以後の add には効かない**

### 4. canonical 例 (old = 直前発火の `[a,a,b,a,c]`)

```
-f a,a,b,a,c           # [a,a,b,a,c]   マーカーなし = 上書き
-f a,a,b,a,c -f @      # [a,a,b,a,c]   @ = old の splice (恒等)
-f a,a,b,a,c -f -a     # [b,c]         remove のみ = 暗黙 @ + 後方 remove
-f a,a,b,a,c -f -a,@,@ # [b,c,b,c]     前置 remove が両 @ の splice 内容に効く
-f a,a,b,a,c -f d      # [d]           マーカーなし = 上書き
-f a,a,b,a,c -f -a,@   # [b,c]
-f a,a,b,a,c -f -a,@,a # [b,c,a]       remove 後の add は生き残る
-f a,a,b,a,c -f -a,@,a,-a # [b,c]      後置 remove は作業リストに効く
-f a,a,b,a,c -f -a,d   # [b,c,d]       暗黙 @ (先頭) + remove + add
-f a,a,b,a,c -f @,-a,@ # [b,c,b,c]     remove は後続 @ にも効く (-a,@,@ と同値)
-f a,a,b,a,c -f @,-a,a # [b,c,a]       -a,@,a と同値
-f a,-a  # []          (初回発火、old = [])
-f -a,a  # [a]
-f +-a,+@,++ # [-a,@,+] escape
```

## 採用しなかった案

### node 属性 merge: true

accumulator 語彙で表現できる関心を別軸の属性に生やす二重化。宣言の座席は「複数値の畳み方」を所有する multiple.accumulator が正しい。

### remove の左 1 個削除

「シンプルに全削除」(kawaz 裁定)。1 個削除が欲しい場面は将来の別 operand 形 (例: インデックス指定) の関心で、エスケープ規約と同じく先送り。

### マーカーの全リスト適用 (accumulator 非依存)

数値リストの `-3` など literal との衝突が全 separator リストに波及する。merge accumulator を選んだ要素に限定すれば、衝突は宣言者の選択の範囲に収まり、エスケープ (`+-3`) で救済もできる。

### クロージャ / 位相間共有 context によるマーカー実装

効果の純データ原則 (DR-045 §3) と conformance の言語移植性を壊す。piece に op を運ばせる (認識は per-piece、順序は fold まで保存される) 形で共有 context は不要。

## 波及

- DR-036: accumulator 語彙に `merge` を追加 (registry 区分は不変)
- DR-031: 「ラダーは選択であって合成ではない」原則に、merge accumulator の初回 old 参照という限定的な合成の口が開く (unset = f=identity の縮退と統一)
- DR-077: update の old (CLI 席内) とは別物 — merge の old はセル現在値 + 初回は下位席勝者。op 族も別 (update は transform 名前参照、merge は piece 列)
- piece_filters / parse との位相: マーカー認識と escape 剥がしは separator 分割直後・型 parse 前。remove operand は payload として型 parse を通る。piece_filters (DR-079 座席 B) は payload にのみ効き op を素通しする
- effects oracle での piece op (add/remove/splice) の見せ方は fixture 設計時に確定 (issue list-merge-piece-op-vocabulary が追跡)

## 関連

- DR-036 (multiple registry / accumulators) / DR-077 §3 (accumulator の純化、append/merge 等)
- DR-045 (効果は純データ、unset のラダー開放) / DR-031 (値源ラダー)
- DR-079 (filter 座席語彙 — piece の op 付き artifact 化の受け皿)
- issue list-merge-piece-op-vocabulary (経緯と残論点の追跡)
