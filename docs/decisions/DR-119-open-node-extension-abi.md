# DR-119: open node 拡張 ABI — node / matcher 拡張の公開契約 (構築と観測を公開、分解は評価器の専権)

> 由来: API 磨き第 2 サイクルの extension ABI 設計 (`docs/findings/2026-07-24-extension-abi-design.md`
> §8.10 第 5 版) と kawaz 裁定 (2026-07-24、AP2-Q5 の再定式化「Node/Ctx をどう公開するかを
> 考えよう」)。DR-110 §3-2 の open node 契約は「engine の内蔵機構」としての規定であり、
> 独立実装者・拡張作者に向けた**公開 ABI としての規範** (trait のメソッド集合、評価プロトコル
> 型の安定性、継続の使用制約) が言語非依存に書かれていなかった空白を埋める。規範の導出元は
> 参照実装 (kuu.mbt) の node resident 12 種 + matcher resident 2 種の接触面全数調査 (同
> findings §8.10.1) — **全て既存挙動の規範化であり、意味論の発明はない** (§6 の宣言義務の
> 明文化のみが新規の規範文)。

## 決定

### 1. 設計原理: 構築と観測を公開し、分解は評価器の専権とする

node / matcher 拡張の ABI は次の非対称を骨格とする:

- 拡張が得るのは **(a) 評価プロトコル型 (Branch / Binding / Candidate / ParseError) の構築**、
  **(b) 評価文脈 (Ctx) の観測**、**(c) 消費構造 (node) の構築** (§4 の構築子集合)
- **node 構造の分解 (内部表現の場合分け・フィールド読み) は評価器の専権**であり、ABI に
  分解の口を置かない。拡張 node の評価は evaluator からの callback (§2 の `eval`) として
  実行され、拡張は自分の担当区間の読みだけを生成する

論拠: 参照実装の全 resident (node 12 / matcher 2) の接触面調査で、**分解を行う住人は
存在しない** — 拡張の関心は「自分の消費点で何を読み、何を束縛するか」であり、木全体の
形は evaluator の関心。分解を公開すると内部表現 (node の内部構成) が semver 契約に入り、
構造 1 個の追加が破壊変更になる (敵対的レビュー B1 と同型)。構築と観測だけなら、内部表現の
変更は ABI に現れない。

### 2. node 拡張契約 — 必須 4 面 + optional 3 面

拡張 node 種は次の契約を宣言して registry に登録する (DR-110 §3-2 の「評価能力 + 消費数の
契約データ」の公開形。概念シグネチャ — 言語 API の字面は各実装の関心、DR-115 §1.3 と同位相):

**必須 4 面:**

| 面 | 概念形 | 規範 |
|---|---|---|
| `kind` | `() → string` | node 種の識別名。拡張 ns 規約 (DR-094) に従う |
| `encode` | `() → json` | 構成データの直列形。**同一性の成分** — `kind + encode が等しい node は同一` (matcher の同一性規約 DR-110 §3-4 と同じ規則を node にも適用)。lowering 検証 (`query:"lower"`、DR-070) の pin 対象 |
| `consumes_zero_tokens` | `() → bool` | **宣言義務** (§6)。この node が 0 トークン消費で束縛のみ寄与するかの静的宣言。evaluator は node 種名の直書き分岐でなくこの契約データで zero-progress 検査 (DR-043 の ZeroProgress) 等を判定する |
| `eval` | `(ctx, position, bindings, resume) → branches` | 評価能力の本体 (§3 のプロトコル) |

**optional 3 面** (未宣言時の既定値を持つ — 実装は default 実装 / null 許容等で表現):

| 面 | 概念形 | 既定 | 用途 |
|---|---|---|---|
| `element_name` | `() → string?` | なし | この node が帰属する要素名 (エラー帰属・候補 origin の素材) |
| `is_failure_action` | `() → bool` | false | 失敗時アクション (DR-048) の担体か |
| `effect_mark` | `() → (string, effect_op)?` | なし | 発火時に効果列へ積む cell operation の宣言 (DR-045) |

### 3. 評価プロトコル — branch 3 値・resume 継続・ctx 観測 3 面

#### 3.1 branch は安定な 3 値 union

`eval` の戻り値は branch の列。branch は次の 3 値で閉じる:

```
branch = accept(next_position, bindings)     — この読みが成立、position まで消費
       | held(parse_error, bindings)         — この読みは躓いた (Error 保持、DR-037)
       | pending(candidates, bindings)       — 補完モード: 候補を提示して停止 (DR-060)
```

- **3 値は open node ABI の安定面** — variant の追加・意味変更は本 ABI の major 改訂
  (破壊変更)。成分 (parse_error / candidate / binding) は wire 級の純データ (DR-053 §2 /
  DR-104 §2 / DR-045) で、拡張は公式構築子 (§5) でのみ構築する
- 消費数は accept の `next_position` の報告値であり、node の value 有無から導出しない
  (DR-041 §3 の既存規範の ABI 面での再掲)

#### 3.2 resume は現在の eval 呼び出しの継続 — 保持禁止

`resume : (ctx, position, bindings) → branches` は「自分の担当区間を消費し終えた後、
残りの木の評価を評価器へ返す」継続である。

- **resume は受け取った eval 呼び出しの継続としてのみ呼ぶ。保持 (格納・後続呼び出しへの
  持ち越し・別 eval からの呼び出し) は禁止** — 評価器の探索状態は eval 呼び出しに束縛されて
  おり、外から再入すると経路収集 (DR-038 の完全経路一意化) が壊れる。参照実装の既存
  doc 契約の規範化
- resume を呼ばずに branch を返すのは合法 (held / pending は resume を要さない。accept を
  直接返すのは「担当区間で完結する読み」の表現)

#### 3.3 ctx の観測は 3 面

拡張が評価文脈から読めるのは次の 3 観測に限る:

```
ctx.token_at(position) → string?        — 入力トークンの参照
ctx.is_complete_mode() → bool           — 補完モードか (pending を返すべき文脈か)
ctx.extensions() → registry             — 登録済み住人の lookup (filter chain 実行等)
```

- ctx の構築は評価器の専権 (拡張は構築しない)。観測面の追加は本 ABI の minor (非破壊)、
  削除・意味変更は major
- registry lookup を通じた filter chain の実行 (piece_filters 適用等) は ABI の一部 —
  実行ヘルパの具体形 (関数名・引数順) は言語実装の関心だが、「拡張 node が登録済み filter を
  自分の値処理に適用できる」ことは契約 (参照実装の `apply_piece_filters` 相当)

### 4. 消費構造の構築面 — structural 4 種 + 拡張 node 注入

拡張 (installer を含む) が消費構造を組むための構築子集合:

```
exact(spelling)            — リテラル照合 1 トークン
bind(name, value)          — 0 消費の束縛
seq([node...])             — 順次
or([node...])              — 選択
ext_node(node_extension)   — §2 の契約を満たす拡張 node の注入
```

- structural 4 種 (exact / bind / seq / or) は DR-110 §3-1 の「AtomicAST の構造骨格」の
  うち、拡張が組む必要が実証された部分集合 (参照実装の enum_value_node が要求する 4 種、
  findings §8.10.1)。**構造骨格の残り (scope / ref / 反復骨格) は v1 の構築面に含めない** —
  実需の実証がなく、scope 生成・参照解決は installer/lowering の深い協調を要するため、
  需要が実体化した時点の ABI 改訂 (minor — 構築子追加は非破壊) で開ける
- 構築子は値を返すのみで、返った構造を分解する口は無い (§1 の原理)

### 5. 評価プロトコル型の構築子

branch の成分は公式構築子でのみ構築する (フィールド直書きの口を置かない — 内部座標
(評価器の bookkeeping) を既定値で埋める責務が構築子にあり、直書きを許すと内部座標が
ABI 契約に入る):

- `binding(name, value, source)` + 効果 variant (`effect(name, op)` / deprecation /
  action marker — DR-045 / DR-058 / DR-048 の効果列語彙に対応する構築子群)
- `candidate.trigger(...)` / `candidate.pending_value(...)` (DR-104 §2 の wire 語彙成分
  のみを引数に取る — `path` / 内部 link 座標は評価器が付与)
- `parse_error.filter(...)` / `parse_error.constraint(...)` 等の kind 別構築子
  (DR-053 §2 / DR-066 の errors 成分)

読み取りは wire 語彙の getter (DR-104 §2 / DR-053 §2 が wire に定めるフィールド) に限る。

### 6. consumes_zero_tokens の宣言義務 (新規規範)

拡張 node は `consumes_zero_tokens` を**必ず**宣言する。虚偽宣言 (true と宣言して消費する /
false と宣言して 0 消費経路を持つ) の挙動は未定義 — 評価器はこの宣言を信頼して
zero-progress 検査 (DR-043) と反復骨格の停止判定を行い、実行時の実測検証を義務付けない
(検証コストを評価ループに載せない)。lint / debug モードでの検出は実装の任意。

### 7. matcher 拡張契約 — 同じ原理の適用

matcher (DR-110 §3-4 の pluggable matcher) の公開契約も §1 の原理で成立する:

```
kind() → string / encode() → json           — 同一性 (DR-110 §3-4 既存規範)
candidates() → [candidate...]               — 補完素材 (DR-060 §3)
interpret(ctx, position, bindings, resume) → branches
```

- interpret のプロトコルは §3 と同一 (branch 3 値 / resume 制約 / ctx 観測 3 面)。
  matcher が node 契約と別 ABI なのは登録先 registry と役割 (トークンの再解釈 vs 消費構造の
  評価) の違いであり、プロトコル面は共有する

### 8. descriptor role への追加 (DR-107 update)

DR-107 §1 の role enum に `node` / `matcher` を追加する:

```
role: "installer" | "filter" | "collector" | "type_parser" | "accumulator"
    | "completer" | "provider" | "node" | "matcher"
```

- DR-107 §1 は matcher を「評価器内部の実装装置は対象外」としていたが、この線引きの
  判定器は「独立実装者が host 言語で実装しうる runtime callable ABI を持つか」(同 §1) —
  本 DR により node / matcher は公開 ABI を持つ住人になったため、**同じ判定器の適用結果が
  変わった** (線引き自体は不変)。descriptor 宣言軸: 両 role とも `invocation: none` 固定
  (wire の DSL args を持たない — 構成データは encode が担う)、`owns` 禁止 (wire 語彙を
  所有しない — 所有は installer の専権、DR-042)、`io_type` 禁止 (評価プロトコルは
  io_type の値型体系で表現する対象でない — DR-111 §2 の「cell 解決相は宣言対象外」と
  同じ線)。`reasons` は node のみ任意 (held に載せる reason の列挙、DR-066 の宣言規約)
- builtin の node resident (値プリミティブ 12 種) / matcher resident (2 種) の descriptor
  収載は参照実装の追随サイクルで行う (本 DR は軸の確定まで)

### 9. DR-110 との関係 (新規 DR とした理由)

DR-110 §3-2/§3-4 は「engine が何を内蔵するか」のパッケージング構成の規定であり不変。
本 DR はその契約に**公開 ABI としての規範** (メソッド集合の必須/optional、安定性契約、
使用制約) を与える別関心 — DR-110 の改訂で済ませると「パッケージング構成」と「ABI 意味論」
が 1 DR に同居して以後の改訂単位が混ざるため、番号を分けた。DR-110 側の変更はない
(§3-2 の「契約データで判定する」は本 DR §6 がそのまま具体化する関係)。

## 採用しなかった案

### node の内部表現 (ADT) を公開する

内部構造 1 個の追加が破壊変更になり semver 生存不能 (B1 と同型)。全 resident の接触面
調査で分解の実需がゼロであることが確認されており、公開の便益がない。

### 拡張向けの専用中間語彙 (plant DSL) を設けて node 構築を間接化する

中間語彙が evaluator の表現力に追いつくには node 12 種 + structural 4 種の意味論の
再表現が必要で、node の再発明そのもの (findings §8.8 の停止条件として実証)。§4 の
「構築子は公開、分解は不可」で同じ封鎖が中間層なしに得られる。

### consumes_zero_tokens を実行時実測で検証する

評価ループに全 node の消費実測が載り、宣言の意味 (静的判定の材料) が失われる。虚偽宣言は
未定義動作とし、検出は lint の関心に置く (DR-047 の vacuous required と同じ扱い)。

### matcher を descriptor role の対象外のまま維持する

「runtime callable ABI を持つ住人」という DR-107 の判定器に対し、本 DR 後の matcher は
明確に該当する。対象外のままだと descriptor 体系に載らない公開 ABI が生まれ、宣言正本の
一元性 (DR-061) が破れる。

## 射程外

- 各言語実装での公開形 (package 分割・typealias・可視性機構) — 参照実装の形は
  `docs/findings/2026-07-24-extension-abi-design.md` §8.10 が記録する
- scope / ref / 反復骨格の構築面 (§4 — 需要実体化時に minor で追加)
- builtin node / matcher resident の descriptor 収載 (§8 — 実装追随サイクル)
- installer 拡張の decode / 植え付け面の詳細規範 — installer は DR-042 / DR-054 の既存
  契約が主で、本 DR は §4 の構築面を提供する立場。installer ABI 全体の規範化が要るかは
  実装追随で判断

## 波及

- **DR-107 §1**: role enum に `node` / `matcher` 追加 (§8 — 明確化 note を DR-107 へ追記)
- **schema/descriptor.schema.json**: role enum の 2 値追加 + 両 role の oneOf 行
  (invocation none / owns 禁止 / io_type 禁止) — 実装追随サイクル
- **DESIGN**: open node 契約の節 (§15 系) に本 DR への参照を追加 — 実装追随サイクル
- **参照実装 (kuu.mbt)**: API 磨き第 2 サイクル M2c (findings §8.10.6 checklist)

## 関連

- DR-110 §3-2/§3-4 (open node 契約・pluggable matcher — 本 DR が公開 ABI 規範を与える対象)
- DR-107 (descriptor 直交軸 — §8 で role 追加) / DR-111 (宣言対象外の線引きの前例)
- DR-041 §3 (消費数は Accept の報告値 — §3.1 の出所) / DR-043 (zero-progress — §6 の動機)
- DR-037 (held の Error 保持) / DR-053 §2 (parse_error 成分) / DR-104 §2 (candidate 成分) /
  DR-045 (binding と効果列) / DR-060 (pending と補完)
- DR-094 (拡張 ns — kind の命名規約)
- `docs/findings/2026-07-24-extension-abi-design.md` §8.10 (接触面全数調査・実機検証・
  参照実装の公開形)
