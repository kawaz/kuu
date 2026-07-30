# DR-120: 露出キーに対応する値セルはちょうど 1 つ — 別セルの同キー露出は definition-error

> 由来: dogfooding D4 で判明した露出キー衝突の 2 つの検出ギャップ (issue
> `2026-07-25-expose-key-collision-option-command-silent-loss.md` — 同名の別実体が 1 claimant へ
> 潰れて衝突判定を素通りし option の値が黙って消える / scope 生成要素 command の結果キー占有が
> 検出の入力空間に存在しない) と、kawaz 裁定 EXK-Q1〜Q4 (2026-07-25)。DR-021 の「露出キーの
> 一意性検査は実行時」と、それを担体面で精密化した DR-073 を置き換える。

## 決定

### 1. 中核規範 — 1 結果スコープ・1 露出キー・1 値セル

**1 つの結果スコープにおいて、1 つの露出キーに対応する値セルはちょうど 1 つ。**

- **露出キー** = 露出規則 (DESIGN §2.4) でその結果スコープの結果キーとして現れる名前。`export_key`
  明示があればその値、無ければ name 由来
- **値セル** = その結果キーに対応する 1 個の値の座。入口 (long / short / variant / alias / link) が
  何本あってもセルは 1 つ (DR-029 の 1 実体 : N 参照、DR-073 §2「他の入口は実体へ束ねられる」)
- 相異なる 2 つ以上の値セルが同一結果スコープで同一露出キーへ解決する定義は **definition-error**
  (kind `export-key-collision`)

この不変則は結果オブジェクトの形そのものの要請でもある。結果は「キーが一意な JSON object」として
モデル化されており (DR-063 §4、CONFORMANCE §3 の key ベース対応付け)、重複キーを持つ result を
書き下す規則は spec に無い — 1 キー : 複数セルは、到達すると表現形を持たない状態である。

### 2. 正当な用途は既存語彙で書ける

| やりたいこと | 手段 | セルと露出キーの関係 |
|---|---|---|
| 同じ値セルに複数の入口 (別綴り / 別パース方法 / 別 op) を生やす | `link` (DR-029)。綴りだけの別名は `alias` (DR-057)、同一要素の別 op 入口は long variant (DESIGN §7.3) | 入口 N : セル 1。露出キーは実体側の 1 つ |
| 1 つの露出キーに複数のタイプ / 複数の消費構造を相乗りさせる | 名前を `or` 席に載せる (DESIGN §5.1 / §5.3) | セルは or 席の 1 つ、枝が N。型が割れれば結果型は union |
| 上記いずれでもなく、別セルが同じ露出キーを名乗る | — | **definition-error** |

> 露出キーに対応するセルは **or 席**でありそこに複数タイプが相乗りするのは問題ないし、露出キーに
> 対する値セル 1 つも崩れない (kawaz、EXK-Q1 裁定)

### 3. 判定は export_key 適用後の露出キーで行う

検査対象は**解決後の露出キー文字列**であり、その解決が identity 経由 (未指定 → name) だったか
mapped 経由 (`export_key` 明示) だったかを区別しない (EXK-Q4)。

| 組 | 露出キー | 判定 |
|---|---|---|
| `{name:"x"}` + `{name:"x"}` | x, x | definition-error |
| `{name:"a", export_key:"x"}` + `{name:"b", export_key:"x"}` | x, x | definition-error |
| `{name:"x"}` + `{name:"y", export_key:"x"}` | x, x | definition-error |
| `{name:"x"}` + `{name:"x", export_key:"y"}` | x, y | 合法 |

### 4. 露出キーを占有する要素 / しない要素

**占有する (検査に参加する)**:

- 露出キーを持ち値セルを持つ要素 — 入口ありの通常要素、入口なしの実体だけノード (DR-030) の双方
- 露出キーを持つ**スコープ生成要素 (command を含む)** — スコープ生成は値の発生であり、選ばれたら
  子が全部 absent でも空 kv `{}` を持つ (DESIGN §2.6 / DR-052 §3)。結果キーを占有する 1 セルとして
  数える (EXK-Q2)
- `inheritable` が祖先スコープへ置く write-target — 祖先スコープで実際に結果キーを占有する
  (DESIGN §11.3 / DR-059 §5) ため、その祖先スコープで参加する

**占有しない (参加しない)**:

- `link` を持つ参照ノード / `alias` 要素 — 値は canonical の実体セルへ流れ、自前のセルを持たない
  (DR-029、DR-057「結果キーは canonical のみ」)。name は綴り軸と id 軸にのみ効く
- 結果キー軸を持たない要素 (name 無し / `export_key: null`) — 透過。その子の結果キー持ちが親スコープで
  参加する (DESIGN §2.4 / DR-052 §2)
- 値セルも子も持たない要素 — `dd` がこれに当たる (name はトリガ綴り軸にのみ効き、`export_key` を
  書いても結果に何も現れない、DR-064 §5)
- `#` 予約 namespace の内部セル (DESIGN §14.1) と `definitions` 配下の要素 (DESIGN §10.4) — 結果に現れない
- `global` installer が子孫スコープへ置く入口コピー — 宣言スコープのセルへ合流する入口であり、
  コピー先スコープに新しいセルを作らない (本項が正本 — 旧 DESIGN §11.3 の鏡像記述だったが、§11.3 は DR-124 で欠番)

### 5. 検査の時点・面・error の形

- **時点**: `parse_definition` 本体 (DR-054 §3 — Error 検査の座席、実行時 bundle に同梱される)
- **面**: 全 installer の宣言層寄与を適用し終えた宣言層 (help_query capability が読む面と同じ、
  DESIGN §15.15) — `commands` / `global` / `inheritable` / `alias` の宣言的コピーを含み、lowered 産物は
  見ない。結果キーが決まるのはこの面である
- **kind**: `export-key-collision` (DR-054 §4 の kind 列挙に追加)
- **粒度**: 衝突に関与する要素ごとに 1 件 (`element` = 当該要素) を全列挙する (DR-054 §4 の全列挙
  原則。比較は `(element, kind)` の集合なので、衝突グループ単位の代表 1 件にすると衝突相手が
  expect から読めなくなる)
- **hint**: DESIGN §13.5 の「次の手」型。**どの手段を提示するかは衝突要素の値空間で決まる** (下記)

#### hint は値空間で link / or を出し分ける

hint が提示する解決手段は、§2 の 3 手段対応表をそのまま利用者へ返す形にする:

| 衝突した値セルの値空間 | 提示する手段 | 読み取る意図 |
|---|---|---|
| 一致する | `link` | 同じ値を複数の入口から設定したい (入口 N : セル 1) |
| 一致しない | `or` | 1 つの結果キーに複数のタイプを相乗りさせたい (セル 1 : 枝 N) |

- 3 要素以上の衝突では、**全要素の値空間が一致する場合にのみ** link 側とする
- どちらの場合も「そもそも別のキーにしたい」ための `export_key` 分離を副次の道として添えてよい。
  型からは判別できないので出し分けの条件には使わない

**値空間の判定基準**: type 参照名の綴りではなく、**type プリセット展開後 (LOWERING §A.5) の値セルの型**で
見る。`flag` と `bool` は §A.5 で同じ bool セルへ落ちるので一致、`count` と `number` も共に number セルなので
一致する — 後者は DR-029 が canonical な link 例として挙げた `-vvv` (count) と `--log-level N` (number) その
ものであり、綴りで判定すると本来 link が正解の組に or を勧めることになる。link が成立する条件は
「合流先のセルが 1 つの値空間を持つ」ことであって、入口のパース方法が同じであることではない。

**文言は規範にしない**。規範化するのは「どの手段を提示するか」= 素材までで、綴り方はレンダラ / 実装の
関心に置く。根拠は 3 つ:

- DR-054 §射程外が「各 Error message の文言はレンダラ / DX の関心、hint の必須性のみ規定」と既に線を
  引いている
- fixture の比較単位は `(element, kind)` の集合で message / hint を比較しない (DR-082 §1) ため、文言を
  規範化しても conformance で検証できない = 実効を持たない規範になる
- 「素材はフィールド、文言はレンダラ」は kuu の既定線 (DR-053 / DR-113 §1)

**文言の水準** (規範ではなく、利用者の語彙で書くことの例示): hint は定義に書く語 (`link` / `or` /
`export_key`) と直し方を示し、内部語彙 (値セル / 実体 / 宣言層 / claimants) は出さない。

- 値空間が一致: 「`--json` と `--yaml` が同じ結果キー `format` を作っています。同じ値を両方から
  設定したいなら、片方に `link: "json"` を書いてください」
- 値空間が不一致: 「`--color` (文字列) と `--color` (数値 3 つ) が同じ結果キー `color` を作っています。
  1 つのキーで両方の書き方を受けたいなら、`color` を 1 つにまとめて `or` で 2 つの形を並べてください」

### 6. 検査は構造的で、経路の到達可能性を見ない

同一結果スコープに同じ露出キーの別セルがあれば、それらが実行時に同時に露出しうるかを問わず
error になる。`or` の別枝にある兄弟・排他の別 command 配下から昇格露出する子・`exclusive_group` で
縛った兄弟も対象。

- 到達可能性の判定は経路解析であり、DR-054 §2 が Error 層から明示的に外している層 (制約グラフの
  意味矛盾と同じ位置)。構造カウントなら露出規則 (DESIGN §2.4) を回すだけで閉じる
- 露出キーとセルの 1:1 は結果オブジェクトの静的な形の性質であり、実行時にどの枝を通ったかとは独立

排他な 2 枝から同じキーを埋めたい設計は、枝ごとに別セルを立てるのではなく **1 セルを or 席にする**か
**共有実体へ link する**ことで表現する。表現力は失われず、書き方が 1 本に定まる。

### 7. 覆す範囲と残す範囲

**覆す**:

- DR-021「露出キーの一意性検査は実行時」「定義時に潰さず、入力経路として解決できる限り許す」
- DR-021 / DESIGN §15.6 / DR-054 §1 の warn 項目「露出キーが衝突しうる構造」「共露出キーに異なる
  宣言 default が並ぶ構造」— 定義エラーになるので warn の座席が消える
- **DR-073 は全体が役目を終える** (下記 §8 の判断根拠)

**残す**:

- パースの成功条件と ambiguous 一般 (DR-021 前段 / DR-038)。構造的に複数の完全経路が立つ ambiguous は不変
- 「露出キーの型不一致は union、嫌うなら `export_key` で分離」(DR-021)。適用先が「別セル同士」から
  「1 つの or 席の枝同士」へ移るだけで、指針そのものは生きる
- 「スコープ階層が違えば対象外」(DR-021)。別スコープの同キーは衝突ではない
- **綴り (トリガ literal) 軸は本 DR の対象外** — 同一スコープのトリガ重複は静的 warn + 実行時
  ambiguous のまま (DR-041 / DR-059 §2 / DR-067 §1)。同名 command 2 本は綴り軸では合法で、結果キー軸で
  衝突する (相異なる `export_key` を割れば両立する — command の name はトリガ綴りを保つ、DR-052 §2)

### 8. DR-073 の処遇 — 全体を Superseded とする

DR-073 の各節が本 DR 下で持つ意味を逐条で見ると、残る条項が無い:

| DR-073 の節 | 本 DR 下での状態 |
|---|---|
| §1 解釈ごとの optional `claimants` 面 | 衝突が定義時に消えるため、この面を生む outcome が存在しない |
| §2 識別子は実体 entity (値でも source でも区別不能) | claimants の値の議論であり、面ごと不要になる |
| §3 fixture 表現の順序非依存性 (`{result, claimants}` の組) | 同上 |
| §4 lint は別綴り co-export に link 提案 (提案止まり、reject しない) | 「提案」から「唯一の書き方」へ格上げされ、definition-error の hint に吸収される |
| §5 DR-021 のオントロジー (衝突 = ambiguous) 継続 | 本 DR が逆転させる |

したがって DR-073 は Superseded by DR-120。DR-073 が採らなかった案のうち「独立 outcome `collision`
を足す」を退けた論拠 (3-outcome union を壊さない) は本 DR でも保たれる — 衝突は outcome の話ですら
なくなり、definition-error 側へ移る。

### 9. なぜ実行時でなく定義時か

DR-021 は「定義上ありえても実用時点では同時に使われない事情があるだろう」という利用者への信頼から
実行時 ambiguous に委ねた。この判断は「露出キーに値セル 1 つ」という不変則を**持たない**前提で
下されている — 衝突を構造の性質ではなく入力ごとの現象として見ていたため、静的に潰すと正当な定義まで
殺すという読みになった。

不変則を置くと見え方が変わる。同一セルへの複数入口は `link`、複数タイプの相乗りは `or` で書ける
以上、「link も or も使わずに別セルへ同じ露出キーを名乗らせる」書き方に残る正当な動機が無い
(kawaz: 「そのケースを link 以外で書きたい動機はアプリ制作者目線でもおそらく存在しない」)。加えて
実測では、その書き方は衝突検出を素通りして値が黙って消える経路を持っていた (由来 issue のギャップ A)。
動機の無い書き方を実行時まで持ち越すより、定義時に弾いて書き方を 1 本に定める方が良い。

### 10. 書き換え例

#### (a) 同じ露出キーを 2 実体で名乗る → link で 1 セルに

違反形 (`fixtures/export-key/collision.json` の現行定義):

```json
{"options": [
  {"name": "a", "type": "flag", "long": true, "export_key": "x"},
  {"name": "b", "type": "flag", "long": true, "export_key": "x", "env": "B"}
]}
```

link 形 — `--a` と `--b` は 1 つのセル `a` へ合流し、結果キーは `x` の 1 つ:

```json
{"options": [
  {"name": "a", "type": "flag", "long": true, "export_key": "x", "env": "B"},
  {"name": "b", "long": [":set:true"], "link": "a"}
]}
```

`{type:"flag", long:true} ≡ {type:"bool", long:[":set:true"], default:false}` (DR-076 §2) なので、
参照側の入口は `[":set:true"]` を直書きする。綴りだけの別名で足りるなら
`{"alias": "a", "name": "b"}` でも書ける (入口は name から再導出、結果キーは canonical のみ、DR-057)。

#### (b) `--json` / `--yaml` を 1 つの format セルへ (variant DSL の固定値供給 + link)

違反形 — 2 実体が同じ露出キー `format` を名乗る:

```json
{"options": [
  {"name": "json", "type": "flag", "long": true, "export_key": "format"},
  {"name": "yaml", "type": "flag", "long": true, "export_key": "format"}
]}
```

1 セル形 — 実体は入口を持たない `format` (DR-030)、`--json` / `--yaml` は固定値を供給する入口:

```json
{"options": [
  {"name": "format", "type": "string", "default": "text"},
  {"name": "json", "long": [":set:json"], "link": "format"},
  {"name": "yaml", "long": [":set:yaml"], "link": "format"}
]}
```

`":set:json"` は prefix 空 = 主入口綴り `--json`、`set` に引数 1 個 = `Value` 供給で消費 0
(DESIGN §7.3 / §7.4)。結果キーは `format` の 1 つで、`--json --yaml` は同一セルへの効果列
(あと勝ち、DR-015) になる。

#### (c) 型の違う 2 形を 1 キーへ → or 席

DR-021 が挙げた `--color R G B` (number×3) と `--color none` (string) を別要素で書くと 2 セルが
`color` を名乗って error。名前を or 席に載せる:

```json
{"options": [
  {"name": "color", "long": true, "or": [
    {"exact": "none"},
    {"seq": [
      {"name": "r", "type": "number"},
      {"name": "g", "type": "number"},
      {"name": "b", "type": "number"}
    ]}
  ]}
]}
```

セルは `color` の 1 つ、枝が 2 本。結果型が union になるのを嫌うなら `export_key` でキー空間を
分ける (DR-021 の指針をそのまま継承)。

## 採用しなかった案

### 実行時 ambiguous の維持 (DR-021 / DR-073 の継続)

現行の姿。定義を通し、実際に共露出した入力でだけ ambiguous にする。退けた理由:

- 由来 issue の実測どおり、衝突検出は claimants の同一性 (raw entity name) に依存しており、同名の
  別実体は 1 claimant へ潰れて検出を素通りする。検出器を直しても、command は entity ではない
  (DR-063 §3) ため担体モデルに席が無く、DR-073 §2 の改訂が別途要る
- 「実用上は同時に使われない」を利用者が知っている、という DR-021 の信頼の対象が、そもそも
  link / or で明示的に書ける形しか残っていない
- 定義時に弾けば、重複キー result という**表現形を持たない状態**への到達経路が構造的に消える

### 狭い読み — 素の name が一致する場合だけ definition-error (EXK-Q4 (a))

`export_key` 経由で同じキーに解決する組は従来どおり実行時 ambiguous に残す案。既存 fixture と
DESIGN §15.5 / §15.6 が無傷で済む一方:

- 「露出キーに値セル 1 つ」という規範が name 経由の場合にだけ成り立つ半端な不変則になる。検査基準が
  解決キー文字列の一致であること (DR-052 §1、`collision-identity.json` が pin 済み) と食い違う
- 実行時検出の機構 (claimants + command への担体拡張) を維持するコストが残り、狭い読みでは
  EXK-Q2 で広げた検出が使われる場面だけが残るという歪んだ構成になる

kawaz 裁定は広い読み。表現力の面では「排他的にしか発火しない 2 要素 (`exclusive_group` で縛った等)
を別セルで書く」形が失われるが、その用途は or 席 / link で書ける。

### claimants の値を修飾して退化を回避する (EXK-Q1 (c))

claimants の値を `"option:x"` / `"command:x"` のように修飾する、または `id` 軸 (DR-046) を必須の
一意識別子へ昇格させる案。退化 (2 解釈が 1 つに縮退する) は避けられるが、wire / CONFORMANCE / 全実装 /
全 fixture に波及するコストを、動機の無い書き方を生かすために払うことになる。

### 重複キーを持つ result を合法化する (EXK-Q2 (b))

command を衝突検査の対象から外し、同じキーを複数要素が占める result を認める案。DR-063 §4
(JSON object は unordered = キー一意前提)、CONFORMANCE §3 の比較規約、DR-109 §2 (envelope は fixture
expect と厳密一致) の 3 箇所の改訂が要り、結果キーの静的型が入力依存で `bool | object` になって
DESIGN §2.6 の型導出が破綻する。

## 射程外

- lint / diagnose の出力形式・チャネル (DR-054 §射程外と同じ)
- error message / hint の**文言** — 提示する手段の選択規則は §5 で規範化するが、綴り方はレンダラ /
  実装の関心 (DR-054 §射程外の継承)
- 綴り (トリガ literal) 軸の重複検査 — 静的 warn + 実行時 ambiguous のまま (§7)
- 本 DR で到達不能になる既存規定 (UX-Q7R / EXP-Q1 の共露出 cell 規定、DR-118 §3 規則 2 など) の
  最終的な去就 — 波及の棚卸しとして列挙するに留め、各 DR の改訂は後続判断

## 波及

### fixture (fixtures/ + corpus/ 全数走査済み。下表以外に同一スコープ・同一露出キーの別セルは無い)

| fixture | 現行 | DR-120 下 | 移行 |
|---|---|---|---|
| `fixtures/export-key/collision.json` | a / b が `export_key:"x"`、4 case | 定義自体が違法 | `query:"definition_error"` へ。下記「失われる pin」の退避が要る |
| `fixtures/export-key/collision-identity.json` | identity の a と mapped の b がキー `a`、対照の p / q が同居 | a / b が違法。p / q は巻き添え | definition-error case + p / q の対照 (identity 同士で名前が違えば衝突しない) を別定義へ切り出し |
| `fixtures/export-key/collision-default-divergent.json` | 異なる宣言 default の a / b がキー `x` | 違法 | definition-error へ。EXP-Q1 の裁定 (異 default の provenance 競合 = ambiguous) は到達不能になる |
| `fixtures/complete/after-filter-ambiguous-survives.json` | `collision.json` の輪郭を流用して Ambiguous を作り、after 整合フィルタが Ambiguous を生存させることを固定 | 定義が違法 → **Ambiguous の供給源を失う** | 構造的 ambiguous (DESIGN §15.4 の option / positional 境界) へ差し替える。検証意図 (DR-104 §5 の Ambiguous 生存) 自体は本 DR と無関係で維持が必要 |
| `fixtures/complete/dedup.json` / `completer-merge-conflict.json` / `completer-merge-match.json` | 同名 command `build` 2 本 (同一トリガが 2 経路から供給される状況の再現) | 結果キー軸で衝突 → 違法 | 各 command に相異なる `export_key` を割る。トリガ綴りは name 由来で不変 (DR-052 §2、`command-promote.json`) なので検証意図は保たれる |
| `fixtures/dd/duplicate-decl.json` | 同名 dd 2 本 | **影響なし** | dd は値セルを持たない (DR-064 §5、§4 の参加条件) |

**失われる pin と退避先**:

- `collision.json :: single-exposure-ok` の `sources {x:"cli"}` (resolve 相を実行しない実装を落とす検証層) —
  単一実体 + `export_key` の定義 (`rename.json` 系) で取り直す
- `collision.json :: defaults-only-no-collision` の「未発火 flag は default `false` を持ち sources は `default`」—
  衝突と無関係な pin なので単一 option の fixture へ移す
- `collision.json :: env-claim-collision` / `collision-default-divergent.json` の 2 case — 規範自体が消滅
  (実体間のキー占有競合が起こりえない)

### spec 文書

- **DESIGN §15.5 / §15.6** — §15.5 を本 DR の規範へ差し替え、§15.6 の warn 項目から「露出キーが
  衝突しうる構造」「共露出キーに異なる宣言 default が並ぶ構造」を落とす
- **DR-054** — §1 の表の warn 行「露出キー衝突の可能性」を Error 行へ移し、§4 の kind 列挙に
  `export-key-collision` を追加
- **CONFORMANCE** — kind 語彙の行に `export-key-collision` を追加。`claimants` の 3 箇所
  (ambiguous 面の説明 / §3 の比較規約 / 比較規約表) を落とす
- **`schema/fixture.schema.json`** — `definitionErrorExpect` の kind enum に `export-key-collision` を追加、
  ambiguous 側の `claimants` を落とす
- **DR-118** — §3 規則 2 (claimants 席の default 残置) と §2 / §4 の claimants 言及が到達不能になる。
  §4 の論拠 (比較面は全解釈で一様に計算できる相しか使えない) 自体は claimants に依存せず成立する
- **DR-031 追記 note (UX-Q7R / EXP-Q1) / DR-052 追記 note (UX-Q7R)** — 「共露出構造では複数実体の値が
  合流する結果 cell」という前提が到達不能になる。単一実体では結果 cell と実体セルが一致するため
  「default 充填判定は結果 cell 単位」は観測差を失う
- **DR-109** — 「preset default は export_key 共露出に非参加」(UX-Q7 群の決着) が到達不能になる
- **PIPELINE.md** — 冒頭の DR 一覧と §e の DR-073 参照
- **REFERENCE.md** — `export_key` の項に本 DR の不変則と definition-error kind を追記
- **EXK-Q3 の派生裁定** — 「`path` = パースが選択した最深の command scope」を DESIGN §14.1 / §15.15 の
  内部セル → help_query 入力の写像へ追加した。この裁定は本 DR に依存する (同名キーでアプリが取り違える
  状況が起きなくなるため、導出手段を縛らずに済む)

### 実装

- **kuu.mbt** — `parse_definition` に `export-key-collision` 検査を追加 (宣言層寄与適用後の面で
  結果スコープごとに露出キーを集計)、hint は衝突要素の値空間で link / or を出し分ける (§5)、
  claimants 機構と衝突の実行時検出を撤去、conformance runner の ambiguous 比較から claimants を落とす
- **kuu-cli 自身の定義** — global `--help` option と `help` command が root スコープでキー `help` を
  占有しており definition-error になる。どちらかに `export_key` を割る (副産物として走査回避コードが不要になる)
- **issue** — `docs/issue/2026-07-25-expose-key-collision-option-command-silent-loss.md` は本 DR で解消

## 関連

- DR-021 (露出キー一意性検査は実行時 — 本 DR が該当節を Superseded。パース成功条件・union 指針・
  スコープ階層の除外は存続)
- DR-073 (export-key 衝突の担体 — 本 DR が全体を Superseded、§8)
- DR-029 (link = 値同期、1 実体 : N 参照) / DR-057 (alias — 結果キーは canonical のみ) / DR-030
  (実体だけノード) — 正当な書き方の供給元 (§2)
- DR-052 (結果キー軸の一本化 — 露出キーの解決規則、command の presence marker) / DR-046 (名前の軸分解)
- DR-054 (definition-error の境界基準 — Error / warn の線引き・kind 列挙・hint の座席と文言の射程外、§5/§6)
- DR-082 §1 (definition_error fixture — 比較単位は `(element, kind)`、message / hint は非比較。hint の
  文言を規範化しない根拠、§5) / LOWERING §A.5 (type プリセット展開 — 値空間判定の基準、§5)
- DR-063 §4 (JSON object は unordered = キー一意前提) / DR-053 (パース結末の構造)
- DR-064 §5 (dd は値セルを持たない — 非参加の根拠、§4)
- DR-059 §5 / DESIGN §11.3 (inheritable の祖先 write-target — 参加の根拠、§4)
- DR-041 / DR-067 §1 (トリガ綴りの重複は warn + 実行時 ambiguous — 軸の分離、§7)
- DESIGN §2.4 (露出規則) / §2.6 (absent と presence marker) / §5.1 / §5.3 (or 席) / §15.5 / §15.6 /
  §15.15 (宣言層寄与適用後の面)
- issue `2026-07-25-expose-key-collision-option-command-silent-loss.md` (由来、解消)
