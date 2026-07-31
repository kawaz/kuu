# DR-128: 型入力構造の splice — `input_structure` で type が自分の CLI 消費文法を kuu 定義片として宣言する

> 由来: kawaz チャット議論・裁定 2026-07-31 (ccmsg r98 mid=8〜16) および 2026-08-01 (mid=21/22/26 +
> checkbox 裁定 SPL-Q1〜Q3 / MISC-C1)、正本は
> `docs/research/2026-07-31-type-input-structure-splice.md` (§1 骨格、§2 help 整合、§2b link path 分界、
> §2c 型参照・レジストリ継承、§2d 二重独立設計の収束 13 点)。発端は「`--timerange TIMERANGE` が
> string (`5m..now`) と pair (`[since, until]`) のどちらでも受けられる構造を descriptor でどう書くか」で、
> tuple 型を value-type 体系に足す案 (統括提示) を kawaz が「pair は kuu の positionals で書けばよい」と
> 反転させたのが本 DR の機構。DR-126 (record) が本機構の**出口**の型宣言を規定するのに対し、本 DR は
> **入口**の消費文法を規定する。§2d の収束点は fable5-high と codex-sol-worker に独立設計させた 2 案が
> 独立に同結論へ到達した箇所であり、導出として採用確定した。

## 決定

### 1. `input_structure` — descriptor の新軸

`type_parser` role の descriptor に、optional なトップレベル軸 `input_structure` を追加する。
`io_type` と並ぶ独立軸であり、type が**自分の CLI トークン消費文法**を kuu の定義片で宣言する。

```json
{
  "name": "app/timerange",
  "role": "type_parser",
  "input_structure": {
    "or": [
      [{"name": "range", "type": "string"}],
      [{"name": "since", "type": "timestamp"}, {"name": "until", "type": "timestamp"}]
    ]
  }
}
```

値は **wire 構造語彙の閉じた部分集合**である。Schema 上は `wire.schema.json` の node へ `$ref` し、
語彙の制限 (§4 の外部界面語彙の排除) は Schema でなく定義時検査層が担う — 「wire の一部である」ことは
参照で表現し、「どの語彙が座れるか」は role 依存の判断だからである。

`io_type` と `input_structure` は別軸として並ぶ。`io_type` は**供給値の形** (どんな値が入って何が出るか) を
語り、`input_structure` は **CLI トークン文法** (どう読むか) を語る。config / env の供給は文法を通らない
(§6) ため、この 2 軸は互いに置き換えられない。

### 2. 定義片なしは 1 トークン string 消費への縮退

`input_structure` を持たない type は従来どおり値スロット 1 つ = 1 トークンを消費する。定義片は opt-in であり、
本 DR は既存 type (string / number / bool / 各 preset) の挙動を一切変えない。

**暗黙の raw-string 枝は足さない。** 定義片を書いた type が 1 トークン形も受けたいなら、その枝を
`or` に明示する (冒頭例の `range` 枝がまさにそれ)。暗黙枝があると「定義片が語る文法」と「実際に読まれる
文法」が食い違い、help 射影 (§7) が実挙動を語れなくなる。

### 3. 展開は lowering 時の splice、判定は外側の path-search が持つ

値スロットに定義片持ち type が現れたら、lowering 時に定義片をその位置へ splice する。template / preset
展開と同位相であり (LOWERING §A.5、DR-028)、新しい相を作らない。type preset が既に構造を注入している
前例 — flag → bool + default、`config_file` → config 配線、`tty` → default 席の解決規則 — の一般化である。

**sub-parse は局所で outcome を確定しない。** splice された定義片は消費候補を外側の path-search へ返すだけで、
完全経路 0 / 1 / 2+ の最終判定は外側が行う (DR-038 不変)。1 トークン形と 2 トークン形の曖昧性解決は
既存の or 枝選択 / Reject / バックトラック / variable-arity 機構がそのまま担い、新しい曖昧性規則を持ち込まない
(既存 pin: `fixtures/path-search/variable-arity-ambiguous.json`)。

sub-parse の結果 (or → 選ばれた枝、seq → kv) を value_parser が受け、宣言済みの出力型 (`io_type.output`、
record なら DR-126) の JSON へ変換して返す。value_parser の ABI は文字列 1 本でなく **Value を受ける**形になる。

### 4. sealed scope — 定義片は隔離された小世界である

定義片は「そのまま展開」ではなく隔離小世界であり、唯一の出力は value_parser へ渡る構造化 Value である。

**規則 4 点:**

1. **lexical chain は定義片 root で終端する** — 外から内、内から外のいずれも不可視。定義片内の要素は
   外側の要素を名前で参照できず、外側からも定義片内の名前は見えない
2. **内部完結の `ref` / `link` は可** — 定義片内の名前空間で閉じる限り既存機構がそのまま使える
3. **`definitions` は持てない** — 共有構造が要るなら registry の type として切り出す (定義片の中に
   もう 1 つの定義域を作ると、型の同一性が使用文脈で変わる余地が生まれる)
4. **`export_key` は内部消費専用** — value_parser への入力を組み上げるための鍵であり、外側の result /
   sources には漏れない

**閉じるのは名前・binding 空間であって type レジストリは継承される** (kawaz 裁定 2026-08-01 mid=22)。
部分パースは「パーサを派生させ binding をクリアしたもので読む」機構であり、派生先は type レジストリを
引き継ぐ。したがって定義片 leaf は `timestamp` のような registry 型を普通に名乗れる。

**leaf の値源ラダーは「CLI 消費 > default」の 2 段に縮退する。** env / config / inherit / link の席は
定義片内に存在しない (§6 のとおり供給界面が定義片を通らないため)。`default_fn` は定義片内で使える —
解決は sealed scope 内で完結し、外を指せば `absent-ref` の definition-error になる (kawaz 裁定 2026-08-01)。

**要素間制約 4 種 (`requires` / `conflicts_with` / `exclusive_group` / `required_group`) は定義片内で使える**
(SPL-Q1 = a)。DESIGN §9 の 5 種のうち単項の `required` を除いた 4 種であり、解決は sealed scope 内、
評価は sub-parse 経路の中でのみ行われる (外側の経路成立条件には合流しない)。定義片 default と
string 枝の整合が型作者の責任である (§5 の無橋) のと同じく、これらの制約の妥当性も型作者の責任である。

### 5. 語彙の合法・不法

| 合法 (定義片内で書ける) | 不法 (書けば definition-error `invalid-range`) |
|---|---|
| 構造: `or` / `seq` / `repeat`、裸配列・裸文字列の記法糖衣 | 外部界面: `long` / `short` / `env` / `config_key` |
| 値: `name` / `type` / `values` / `default` / `default_fn` / `filters` | 配置・伝播: `global` / `alias` / `commands` / `type: "dd"` |
| 反復・畳み: `repeat` / `multiple` / `accumulator` | 完走後の表示選択: `on_failure` |
| 制約: `requires` / `conflicts_with` / `exclusive_group` / `required_group` / `required` | 定義域: `definitions` |
| 内部消費: `export_key` / 内部完結の `ref` / `link` | |

外部界面語彙は wrong-seat 系の `invalid-range` として弾く。**inert 許容にしない** — 「書いても効かない」
にすると型作者の bug が黙って埋まる。DR-054 の kind 語彙 (`invalid-range` = 構文上は書けるが構成の
組合せとして不成立) にそのまま乗る分類である。

**定義片 leaf の `type` が未解決なら `unknown-vocab`** の definition-error になる。wire の `type:` 属性が
未解決時に warn + string フォールバックへ倒す (DR-028) のとは非対称だが、これは DR-126 §1 が
record フィールドの type 参照に置いたのと同じ非対称であり、同じ理由による — 定義片は type が自分の文法を
**名乗る側**の宣言であって、名乗りの一部を string と読み替えると別の文法を語ることになる。

**descriptor 内の型参照は registry 空間のみで解決する** (SPL-Q3 = a)。使用側 definition の
`definitions.types` には shadow されない — descriptor は registry の住人であり、その意味が使用側の
書き方で変わってはならない。これは DR-126 §1 が record フィールドに置いた規則と同一で、wire の `type:`
属性の解決順 (definitions → registry、DR-035 / DESIGN §13.3) とは解決空間が異なる。

### 6. 供給界面 — 定義片を通るのは CLI トークンだけ

| 供給源 | 経路 |
|---|---|
| CLI | 定義片を splice した文法でトークンを消費 → sub-parse 結果を value_parser へ |
| env | **string 1 本が value_parser へ直行** (sub-parse を通らない)。パース不能なら Reject |
| config | **構造化 JSON が value_parser の入力へ直行** (sub-parse を通らない) |
| link | 出力側の座への書き込み。入力世界とは交わらない (DR-127 §5) |

sub-parse は「トークン列をどう区切って読むか」の概念であり、トークン列を持たない供給源には適用対象が無い。
env が string 1 本なのは env 値がそもそも 1 文字列であるため、config が直行するのは config が既に構造を
持っているためである。

**link path による部分書きは入力側へ注入しない** (DR-127 §5 が規定済み、本 DR は交差しないことを確認する
だけである)。「入力が揃うまでパースを保留する」第 3 の状態は作らない — Reject の発火時点が原因操作から
遅延して args_pos 帰属 (DR-037) が壊れるためである。

**定義片 default と organic 部分書きの間に橋は無い。** 各経路は自分の既存規則どおりに動く —
sub-parse 経路は定義片セルのラダー (§4 の 2 段) が普通に回り default 充填がある / string 枝は parser の
産出がすべて / organic 部分書きは vivify の器 `{}` だけで default 橋を持たない (DR-127 §3.1)。
定義片 default と string 枝の整合は型作者の責任であり、DR-126 §4 の乖離検査の対象外である (lint ヒント候補)。

**フィールド契約の置き場は入口側である。** `timestamp` (in: string|number → out: number) のような in 契約が
住むのは `--until` 単体入口の `type: timestamp` と、定義片 leaf `until` の `type: timestamp` の 2 箇所であって、
record 宣言に住むのは out 形だけである (DR-126 採用しなかった案 (b) は不変)。「until 単体でも timerange
一発でもパースと out 契約が同じ」は両入口が同じ type を名乗ることで成立し、合流点が record の out 型になる。

### 7. `io_type.input` の string 固定を撤廃し、産出形の整合を静的に検査する

DR-107 §7 の role マトリクスは `type_parser` の `io_type.input` を `string` 固定としているが、これを撤廃する。
`input_structure` を持つ type の value_parser は string でなく構造化 Value を受けるためである。

`io_type.input` は **定義片の産出形・env の string・config の供給形の和**を宣言する。定義片から導出される
産出形 (or → union、seq → 各 leaf の out を持つ kv) が `io_type.input` の宣言域に含まれない場合、
definition-error `invalid-range` である。

この検査は**「宣言 vs 宣言」の定義時静的検査**であり、DR-126 §4 の「返した値 vs 自己宣言」の runtime Error
とは位相が違う。前者は descriptor 2 軸の内部矛盾で、descriptor を読んだ時点で分かる。後者は実際の産出値を
見るまで分からない。

### 8. ネスト・循環・反復

- **ネスト splice は可、深さ上限を持たない** — 定義片 leaf の type がさらに定義片を持てば再帰的に splice する
- **`input_structure` 経由の型依存が循環したら `circular-ref`** の definition-error。DR-126 §1 が
  out.record 側の型参照循環に置いた規則 (v1 全面禁止) と同型で、入力側にも同じ検査が要る
- **`repeat` / `multiple` / `accumulator` は定義片内で使える** — 既存の lowering 機構がそのまま動く。
  sealed scope が制限するのは名前空間と外部界面であって構造表現力ではない
- **greedy の割り込みは配置の既存規則そのまま** — option の値スロットに splice された定義片は option 値として
  一体に消費され、positional 配置に splice された定義片は背骨に載るので greedy の割り込みを受ける
  (DR-041 / DR-043 / DR-097)。定義片であることを理由にした新規則は持たない

### 9. help — 既存の `value_structure` へ完全委譲する

splice された構造は DR-113 §4.1 の `value_structure` としてそのまま help model へ射影する。写像は
定義片の構造語彙と model の node 語彙の同名対応 — `or` → `or`、`seq` → `seq`、`repeat` → `repeat`、
leaf → `single` (`value_name` / `type` / `values_enum`)、定義片持ち type の leaf → `type_ref` — であり、
新しい model 語彙を追加しない。

**この位相の pin**: help_query が読む断面には `input_structure` 由来の構造が乗る。これは DR-113 §2.3 の
`help_category` preset が確立した規範 (「type descriptor 由来で注入された構造が `value_structure` として
help model に射影される」) の一般化であり、splice はその先例に乗るだけである。

1 行合成 `<RANGE | <SINCE UNTIL>>` は DR-115 §5.1 の `value_structure_style: "auto"` の既定挙動として
規定済みで、本 DR は表示規則を足さない。sealed scope が閉じるのは ref / link / export_key / result への
露出であって、表示メタ (`value_name`、name からの uppercase 導出) は元々結果非露出であるため、定義片
leaf の name を usage プレースホルダに使うことは既存規範と無矛盾である。

**`types` 集約には registry 宣言 type も載せる** (DR-113 §4.2 の `types` は definitions の共有型のみを
想定していた)。`id` は**解決に使った参照綴り** (`app/timerange` / bare 名) とし、registry 型と definitions
型が同じ model 内で衝突しないようにする。**descriptor の `description` は `types[].help` へ写さない** —
descriptor の description は実装者向けの自己記述であって、エンドユーザ向け help 文言ではない。

### 10. 観測面 — 定義片内のセルは外へ出ない

- 定義片内のセルは**内部セル族**であり、`effects` / `result` / `sources` のいずれにも現れない
  (DR-113 §6 の `#` 内部セルと同じ位置づけ)
- 外側の値セルには **1 回の set** が起きる。`source` は入口どおり (CLI 消費なら `cli`)
- sub-parse 中の失敗は**原因トークンの `args_pos`** に帰属する (DR-037 の args_pos 規範がそのまま効く)
- `errors[].element` は**外側の entity** — 定義片内の名前を外へ漏らさない
- **補完**: 候補の origin は外側の値セル entity、候補そのもの (type / completer) は定義片 leaf の宣言由来。
  内部名は候補にも origin にも現れない

### 11. definition-time 検査の一覧

| 検査 | kind |
|---|---|
| 外部界面語彙が定義片内に座っている (§5 の不法列) | `invalid-range` |
| 定義片内に `definitions` がある | `invalid-range` |
| 定義片から導出した産出形が `io_type.input` の宣言域外 (§7) | `invalid-range` |
| 定義片 leaf の `type` が registry に無い (§5) | `unknown-vocab` |
| 定義片内の `ref` / `link` / `default_fn` が sealed scope の外を指す | `absent-ref` |
| `input_structure` 経由の型依存が循環 (§8) | `circular-ref` |

### 12. conformance ビークルは 2 系統で、役割が直交する

`input_structure` は type descriptor の軸なので、conformance fixture から挙動を pin するには
定義片を持つ registry 住人が要る。**両方を採る** (SPL-Q2 = a + b)。

- **`builtin/struct`** — identity 系 type_parser の configurable factory。splice **機構そのもの**の pin
  (or 枝選択・seq の kv 組み上げ・sealed scope・観測面) を担い、同時に「構造を持つ値をアプリが自前 parser
  なしで受け取る」ユーザ機能でもある
- **`fixture/*` residents** — CONFORMANCE が宣言する fixture 専用 namespace の住人。**変換系 parser の
  挙動**の pin (string 形の正規化、部分 range、DR-126 §4 の乖離 Error 近傍) を担う

2 者は役割が直交する。前者は機構が正しく動くことを、後者は機構の上に載る変換系 type が正しく振る舞うことを
固定する。identity factory だけでは変換系の挙動が pin できず、fixture 専用住人だけでは機構の pin が
ユーザから見えない機能に閉じてしまう。

## 根拠

### 入力の構造は「型体系に足す」より「既にある文法で書く」ほうが小さい

発端の課題 (`--timerange` が 1 トークンでも 2 トークンでも受かる) を value-type 体系で解こうとすると
tuple 型が要り、DR-107 §3 が射程外にした bare array union 記法との構文衝突を抱えることになる。
一方 kuu は既に or / seq / repeat / variable-arity という**トークン消費文法の表現力**を持っている。
pair は「tuple 型」ではなく「2 つの positional」であり、それを書く語彙は最初からあった。
本 DR は表現力を足していない — 既存の表現力を type の内側から使えるようにしただけである。

### splice が新しい相を作らないことが、機構全体の予算を決めている

type preset は既に構造を注入している (flag / count / help 系 / completion_script / tty)。splice が
lowering 同位相であることで、曖昧性解決 (DR-038)・greedy (DR-041/097)・repeat (DR-043)・
値源ラダー・観測面のいずれも既存規則が流用され、本 DR が新設する規範は「sealed scope の 4 規則」と
「産出形の整合検査」だけになった。sub-parse が局所で outcome を確定しない (§3) のはこの姿勢の核で、
局所確定を許すと path-search の一意性契約 (DR-038) の外にもう 1 つの判定主体が生まれる。

### sealed scope は「型の同一性は使用文脈に依存しない」の帰結

定義片が外を参照できると、同じ type が使用側の定義次第で別の文法を持つことになる。`definitions` を
持てないこと (§4-3)、型参照が registry 空間のみで解決すること (§5) も同じ 1 つの要求から出ている。
DR-126 §1 が record フィールドの解決空間に置いた規則と同根であり、両 DR は descriptor の意味が
registry 側で閉じるという同じ姿勢の入口側 / 出口側の現れである。

### 入力と出力は交わらないほうが観測が壊れない

link path (出力側) と sub-parse (入力側) を交差させると、「入力が揃うまで保留」という状態が要る。
その状態は effects の時系列にも値源ラダーにも席が無く、Reject の発火が原因トークンから遅延して
args_pos 帰属が壊れる (DR-127 §5)。両者を交わらせないことで、時系列適用だけで全ケースが決まる
(DR-029 / DR-127 §4) 性質が保たれる。

## 波及

- **DR-107**: §7 の role マトリクス `type_parser` 行を更新 — `io_type.input` の `string` 固定を撤廃 (§7)、
  `input_structure` 列 (optional、type_parser のみ) を追加。他 role では禁止。§3 の value-type 体系自体は不変
- **schema/descriptor.schema.json**: `descriptor` に `input_structure` プロパティを追加し、
  `wire.schema.json` の node へ `$ref` する。role 条件分岐で `type_parser` 以外は禁止、`type_parser` では
  optional。語彙制限 (§5) と産出形整合 (§7) は Schema では書けず定義時検査層 / lint の関心
- **schema/wire.schema.json**: 定義片が参照する node 定義の共有 — descriptor 側から `$ref` される前提で、
  `$defs.node` の切り出し粒度が参照可能かを確認する (現状 `$defs.node` は存在する)
- **schema/builtin-descriptors.json**: `builtin/struct` (§12) を `types` に新規収載
- **docs/DESIGN.md**: §3 (type と参照糖衣) に定義片持ち type の節を追加、§13.1 のレジストリ区分表の
  `types` 行に定義片の存在を反映。§9 の制約語彙は定義片内でも使える旨の注記 (§4)
- **docs/LOWERING.md**: §A.5 (type 糖衣プリセット) の隣に「A.6 input_structure の splice」を新設 —
  splice が A 群 (installer 不動点の前段の純構文正規化、§C.4) のどこに座るかを確定する必要がある
- **docs/CONFORMANCE.md**: §6 のディレクトリ構成に splice 領域を追加、`fixture/*` namespace の宣言 (§12)
- **docs/REFERENCE.md**: §3.3 factory config キー表に `builtin/struct` の config を追加 (綴りは §射程外)
- **DR-113**: §4.2 の `types` 集約が definitions の共有型に加えて registry 型も受ける (§9)
- **DR-126**: §1 の型参照解決順は既に registry のみへ改訂済み (SPL-Q3 = a) で、本 DR は入力側にも
  同じ規則が及ぶことを確認する
- **fixtures 新設** — 定義片の骨格・sealed scope・供給界面・観測面・検査の各面を pin する:

  | 領域 | pin する内容 |
  |---|---|
  | 定義片の基本形 | or 枝選択 (1 トークン形 vs 2 トークン形)、seq の kv 組み上げ |
  | 曖昧性 | variable-arity との合流が既存規則どおりであること (DR-038 の外側判定) |
  | 配置差 | option 値スロット = 一体消費 / positional = 背骨 (greedy 割り込み) |
  | sealed scope | 内部完結 ref/link の成立、外向き参照の `absent-ref` |
  | 語彙検査 | 外部界面語彙・`definitions` の `invalid-range` |
  | 型検査 | leaf type 未解決の `unknown-vocab`、循環の `circular-ref`、産出形整合の `invalid-range` |
  | 供給界面 | env string 直行 / config 直行 (定義片を通らないこと) |
  | 観測面 | 外側 1 set・source タグ・args_pos 帰属・errors[].element が外側 entity |
  | help / 補完 | value_structure 射影と types 集約、補完候補の origin |

- **kuu.mbt / kuu-cli**: value_parser ABI が string でなく **Value を受ける**形へ (§3)。splice の lowering 実装、
  sealed scope の派生パーサ (binding クリア + type レジストリ継承)、§11 の definition-time 検査群

## 採用しなかった案

### (a) tuple 型を value-type 体系に足す

`[since, until]` を型として書けるようにする案 (統括が最初に提示し kawaz が反転させた)。棄却理由は
§根拠のとおり、kuu が既に持つトークン消費文法で書ける構造のために型体系を拡張することになり、
DR-107 §3 が射程外にした bare array union との構文衝突も引き受けることになる。tuple 型は本 DR で
**不要になった** — pair は定義片の `seq` がそのまま表す。

### (b) 定義片を持つ type にも暗黙の raw-string 枝を足す

1 トークンでそのまま渡す枝を暗黙に持たせれば、既存 type からの移行が滑らかになり、定義片で書き漏らした
形も救われる。棄却理由は §2 のとおり、定義片が語る文法と実挙動が食い違い、help 射影 (§9) が実挙動を
語れなくなること。救済のつもりの暗黙枝は「なぜかパースが通る形」を生む。

### (c) 定義片内の外部界面語彙を inert 許容にする

`long` / `env` 等を書いても黙って無視する扱い。LOWERING §C.1 (元要素は実体だけノードに降格し、宣言属性は
inert に残る) との類推が効きそうに見える。棄却理由は §5 のとおり、それらは型作者の bug であって
互換性のための残置ではないため。inert 許容は「効くと思って書いた宣言が黙って効かない」を作る。

### (d) 定義片内で constraint を全面禁止する (SPL-Q1 の非採用肢、sol 案)

sealed scope 内の制約は外側の経路成立条件と合流しないので、書けても効果が読みにくいという理由で
禁止する案。棄却理由は、定義片内の制約は sealed scope 内で解決でき評価も sub-parse 経路に閉じるため
機構的な穴が無く、禁止する側が新しい規則を足すことになるため。定義片 default と string 枝の整合と
同じく、型作者の責任として扱う (kawaz 裁定 SPL-Q1 = a)。

### (e) splice された定義片を greedy に対して常に一体消費とする (sol 案)

配置によらず定義片を 1 単位として扱えば、greedy の割り込みで定義片が途中で切れる事態を防げる。
棄却理由は、これが**新規則**であること — 既存の配置規則 (option 値スロットは一体、positional は背骨) を
そのまま適用すれば同じ場面が既存語彙で説明でき、新規則ゼロで済む (kawaz 承認済みの統括判断)。

### (f) conformance ビークルをどちらか一方に絞る

`builtin/struct` だけ / `fixture/*` residents だけ。棄却理由は §12 のとおり役割が直交しているため。
identity factory は機構を pin するがそれ自身は値を変換しないので変換系 parser の挙動を固定できず、
fixture 専用住人は変換を pin するがユーザから見える機能を伴わない。

## 射程外

- `builtin/struct` の config キーの綴りと形 (定義片をどう受け取るか) は本 DR で確定しない。
  descriptor 軸としての `input_structure` と factory config が同じ定義片語彙を受ける 2 経路になるため、
  schema 起草時に合わせて決める
- 定義片内で使える `filters` の相 (piece / value / final のどれが定義片 leaf に効くか) は既存の
  値パイプライン規則の適用問題として扱い、本 DR は新規則を置かない
- splice が LOWERING の A 群 / B 群のどちらの不動点に座るかの正確な位置づけ (波及の LOWERING §A.6)

## 関連

- DR-126 (record 型 — 本機構の出口の型宣言。§4/§5 の解決空間規則が入口側と対をなす)
- DR-107 §3/§7 (descriptor の直交軸・role マトリクス — §1 が軸を足し §7 が `io_type.input` 固定を外す)
- DR-127 §5 (入力側への部分注入はしない — §6 の link 非交差の正本)
- DR-113 §2.3/§4.1/§4.2 (help_category preset の構造注入先例、`value_structure` / `types` — §9 の射影先)
- DR-115 §5.1 (`value_structure_style: "auto"` — 1 行合成の既定挙動)
- DR-038 (完全経路の一意性 — §3 の「局所で outcome を確定しない」の上位規範)
- DR-041 / DR-043 / DR-097 (greedy・repeat・「読める」の精密化 — §8 の配置既存規則)
- DR-037 (Reject / Error と args_pos — §10 の失敗帰属)
- DR-054 (definition-error の kind 語彙 — §11 の分類)
- DR-035 / DR-028 (type 参照の解決順 — §5 の非対称の対比元)
- DR-061 §4 (descriptor は validator ではない — §7 の検査が宣言同士の整合であることの位置づけ)
- DR-094 (registry 語彙の namespace — `fixture/*` / `builtin/struct` の識別子体系)
- LOWERING §A.5 (type 糖衣プリセット — splice の同位相の先例)
- docs/research/2026-07-31-type-input-structure-splice.md (本 DR の正本)
- fixtures/path-search/variable-arity-ambiguous.json (可変 arity 曖昧性の既存 pin)
