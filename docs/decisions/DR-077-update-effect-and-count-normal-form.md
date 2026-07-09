# DR-077: update 効果 — old 依存のセル変換を効果語彙に開き、count を綴り合成の正規形に乗せる

> 由来: DR-076 の TODO (count の展開正規形) の議論 (kawaz × Claude、2026-07-09)。「消費時 hook はどこにあるか」の問いから、effect (DR-045) がその座席であることを再確認した上で、inc 固定語の追加案 / set の reducer 化案 / parser の (val, old) => T 化案を経て、「効果語彙に汎用の 1 語 + 変換実体は registry 名前参照」で確定。

## 決定

### 1. 効果 op に `update` を追加する (DR-011 / DR-045 の 5 語目)

```
"<prefix>:update:<transform>[:<arg1>...]"          // 綴り DSL (DR-011)
{"exact": "--verbose", "link": "verbose", "effect": {"op": "update", "transform": "inc", "args": []}}   // 効果記述子 (DR-045)
```

- **意味論**: 発火時に link 先セルの現在値 old へ transform を適用して書き戻す — `cell = f(old)`。トークンは消費しない (default / unset / empty と同じ 0-token 効果)
- **committed = true** (set と同格のユーザ明示操作。unset / default だけが committed を特殊制御する現行構図は不変)
- **post_filters は update の結果にも通す**: set 経路 (parser → filters → cell) と対称に old → transform → filters → cell。DR-040 の「count の上限は post_filters (in_range 等) で書く」がそのまま効く
- ledger (DR-015) 上のイベントは (実体, update(transform), operand なし, source, 順序) で、他の効果と一様に畳まれる

### 2. transform の実体は filters registry の名前参照 (新 registry は作らない)

- `<transform>` は **filters registry のエントリ名**。effect はクロージャでなく純データ (DR-045 §3) なので、wire に載るのは名前 + args のみ。実体 (T => T) は言語バインディングが registry に登録する
- **使えるのは transform シグネチャ (T => T) の filter のみ**。filter は descriptor (DR-061) で自分の signature (validate / transform) を宣言し、`:update:<name>` の name が transform でない・存在しない場合は definition-error (DR-054 系: 不在は unknown-vocab、シグネチャ不適合は invalid-signature 相当の細分)
- args 付き transform は filters の既存 colon 規約のネスト: `update` の arity 規約 = 第 1 引数が registry 名、残りはその filter の args (例: `:update:add:5`)
- 組み込み transform として **`inc`** (number: `(old) => (old ?? default) + 1`、0-arg) を filters registry に置く

### 3. count は「number + default:0 + `update:inc` の綴り合成」に正規化する

flag (DR-076 §2) と完全対称の preset 合成になる:

```
{type:"flag"}                ≡ {type:"bool",   default:false}                       // 入口なし
{type:"flag",  long:true}    ≡ {type:"bool",   default:false, long:[":set:true"]}   // 裸発火で true
{type:"count"}               ≡ {type:"number", default:0}                           // 入口なし
{type:"count", long:true}    ≡ {type:"number", default:0, long:[":update:inc"]}     // 裸発火で +1
```

- **糖衣差し替え**: count の `long:true` 糖衣 = `[":update:inc"]` (他の型の `[":set"]` を preset が差し替える — flag の `[":set:true"]` と同じ機構、DR-076 §2)
- **補完**: count の明示 variant リストは非空なら `:update:inc` を補完 (冪等)。absent / false / [] = 入口なし (三態同義、DR-071 §1)
- **short**: 不変 (DR-071 §3)。count の short は非消費で、発火が update(inc) 効果を持つ (flag の固定 true 供給と同じく型が慣習挙動を担う)
- **multiple:{accumulator:"increment"} は count から退役**: 現在値依存の変換は accumulator (セル側、DR-029/DR-036) でなく効果 (発火側) の仕事になる。multiple / accumulator は本来の関心 (複数「値」の畳み: append / merge 等) に純化する。increment を accumulators registry から除くかは Schema 実体化時に判断 (使用者が count のみなら除く)
- **値源との共存**: parser は (string) => T の純粋な字句層のまま (DR-074/075)。count に env / config を宣言した場合、そこから来る文字列は number として普通に parse → set される (`VERBOSITY=5` は 5 を set、inc ではない)。inc は CLI 発火だけの関心、という責務分離が本 DR の核
- **count_or_set (DR-040)**: `[":set", ":update:inc"]` 相当の合成に還元できる見込みだが、optional 値スロット (`repeat:{min:0,max:1}`) との取り分整理を含むため正規形の確定は別途 (DR-040 の記述は当面現行のまま)

## 採用しなかった案

### 固定語 `inc` を効果 op に足す

count は書けるが、他の old 依存変換 (toggle / dec / スケール等) が欲しくなるたびに op 語彙が増える。汎用 1 語 + registry 参照の方が、op 語彙を閉じたまま変換空間を開ける。

### set を reducer 化する (`set = (val, old) => T`)

set の意味 (「parser が変換した値を書く」) 自体を変えてしまい、既存の全 set 経路が reducer の縮退形という読み替えを背負う。効果の隣に 1 語足す方が変更が局所。

### parser を (val: string, old: T) => T に一般化する

parser は全値源 (CLI トークン / DSL literal / env / config) が共有する字句層 (DR-074/075) で、old 依存にすると env の `VERBOSITY=5` が inc になる等のねじれと、「畳みの無い値源での old の定義」「bare 発火の sentinel 文字列」という追加規約 2 つを払うことになる。fold は発火側 (CLI 面固有の関心) に置く。

## 波及 (本 DR と同時反映)

- DR-011: effect 語彙表に `update` を追加 (注記)
- DR-045: op 表に update 行を追加 (注記)
- DR-076: TODO の count 行を本 DR 参照で解消
- LOWERING §A.5: count 節を綴り合成形で書き直し
- kuu.mbt 実装 + conformance fixture (lowering/count/ + count parse 挙動 + env 共存境界) は後続作業

## 関連

- DR-045 (効果記述子 — update は 5 番目の op) / DR-011 (綴り DSL)
- DR-076 §2 (flag の綴り合成 — count は同じ機構の 2 例目)
- DR-040 (count 上限は post_filters / count_or_set) / DR-029・DR-036 (accumulator はセル側 — 本 DR で count からは退役)
- DR-015 (mutation ledger) / DR-074・DR-075 (parser は純粋な字句層)
- DR-061 (descriptor — filter の signature 宣言) / DR-054 (definition-error)
