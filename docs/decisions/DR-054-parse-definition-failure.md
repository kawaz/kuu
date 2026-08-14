# DR-054: parse_definition の失敗挙動 — Error/warn の境界基準と定義エラーの全列挙

> 由来: findings `2026-06-29-ast-missing-pieces.md` の F-035 (parse_definition() の失敗挙動)。DR-042 (完全性検査) / DR-043 (ゼロ進捗ガード) / DR-050 (config 循環) / DR-052 (export_key の値域) に散在していた定義時検査の総束ねと、判断基準の言語化。本セッションの議論で確定。

## 決定

### 1. Error / warn の境界基準

**lowering が構成できない、または全入力で壊れる定義 = Error (parse_definition 失敗)。一部入力で驚きうるだけの定義 = warn (定義は通す)。**

| 区分 | 検査 | 出所 |
|---|---|---|
| **Error** | 未知の特殊語彙 (registry の所有語彙集合に載らない) | DR-042 不変則① |
| **Error** | 不正な値域 (export_key に bool、repeat の min > max 等) | DR-052 ほか |
| **Error** | 不在の ref / link 参照 (解決スコープ + definitions のどこにも無い) | DR-032 |
| **Error** | 循環 ref (構造継承の無限展開) | DR-007/032 |
| **Error** | ゼロ進捗再帰 (repeat unfold の 1 周が 1 トークンも消費しない) | DR-043 |
| **Error** | config_file 要素自身への config 席 (循環) | DR-050 §5 |
| **Error** | installer 所有語彙の交差 (registry 登録時) | DR-042 不変則③ |
| **Error** | 露出キー衝突 (1 結果スコープで同一露出キーへ解決する値セルが 2 つ以上) | DR-120 §1 |
| warn | 同一スコープの同一トリガ重複 | DR-041 (静的 warn + 実行時 ambiguous) |
| warn | 丸呑み構造 (option 群 + 上限なし string positional) | DR-021 / DESIGN §15.6 |

循環 ref とゼロ進捗の判定は同一の**左再帰原理**に統一される: 検査対象は「**head 位置 (トークン消費前に到達可能な位置) にあるサイクル**」であり、repeat lowering の正当な自己 ref (cons 尾部 — head の消費ノードの後ろに置かれる) は head 位置でないため通る。基準はこの一点で、曖昧な境界を持たない (slice PoC 第 14 弾で対照実測済み)。

DR-021 の「warn はする、reject はしない」は **warn の層 (一部入力で驚きうる) にだけ適用される**。Error の層 (構成できない) には適用されない — 壊れた定義を通すのは利用者への信頼ではなく放置である。type 未登録の warn + string フォールバック (DR-021/028) は前方互換のための意図的な例外で不変。

### 2. 検査の深さ: v1 は構文・参照検査まで

Error 検査は**単純な構文・値域・参照の検査に限る**。制約間の意味矛盾 (exclusive_group + requires の相互矛盾等、制約グラフの解析を要するもの) は、基準上は「全入力で壊れる」でも **v1 では warn (lint) に置く** — 検出コストと網羅性の保証が釣り合わないため。lint 側の解析が成熟して確実に判定できるものは、後続判断で Error へ昇格してよい (基準は §1 のまま)。

### 3. 検査の配置

- **Error 検査は parse_definition 本体** (実行時 bundle に同梱される — 壊れた定義は動かせないので分離不能)
- **warn は開発時ツール** (kuu linter / diagnose §13.7) の関心で、実行時 bundle に同梱しない (DESIGN §15.6 の既定路線を維持)

### 4. 返値は 2 値 union、エラーは全列挙

```
{outcome: "success", atomic: <AtomicAST>}
{outcome: "definition-error", errors: [{element: <要素参照>, kind: <検査種別>, message: <string>, hint: <次の手>}, ...]}
```

- DR-053 (パース結末の 3 値 union) と同族の構造。言語 DX が例外へ変換するのは自由
- errors は**全列挙** (コンパイラの定石 — 1 個直すたびに再実行させない)
- `hint` は §13.5 の「次の手」型 (DR-042 完全性検査の様式) を全 Error に一般化する。warn は返値に乗せない (lint の出力チャネルの関心)

## 採用しなかった案

### 全検査を warn に倒す (DR-021 の全面適用)

未知語彙や不在参照を通すと、実行時に「定義した機能が黙って効いていない」形で現れる — 実行時 Error より発見が遅く、信頼とは逆の放置。DR-042 不変則①が既にエラーを要求している。

### 制約間の意味矛盾も v1 から Error

制約グラフ解析の網羅性を parse_definition が保証することになり、実行時 bundle が重くなる。lint に置けば同じ検出を開発時に提供できる。

### first-error で打ち切り

定義の修正サイクルが 1 エラーずつになる。全列挙のコストは定義サイズ有界で問題にならない。

## 射程外

- lint (warn 層) の出力フォーマット・チャネルの具体形
- 各 Error message の文言 (レンダラ / DX の関心、hint の必須性のみ規定)
- warn の網羅リストの凍結 (lint の成熟に伴い増える。§1 の表は現時点の確定分)

## 関連

- DR-042 (完全性検査・語彙交差 — Error の出所、hint 様式の原型)
- DR-043 (ゼロ進捗ガード) / DR-050 (config 循環) / DR-052 (値域検査) — Error の出所

## definition-error の kind 値の正式列挙

> **更新: DR-067 (well-formedness 3 層) の参照ラベルの根拠として、DefError の kind 値を正式列挙する: `vocab-intersection` / `unknown-vocab` / `invalid-range` / `absent-ref` / `circular-ref` / `zero-progress` / `config-cycle` (垂直スライス PoC 第 14 弾の実装形と一致)。本 DR の散文記述 (未知の特殊語彙・不正な値域・不在・循環の ref/link・ゼロ進捗再帰・config 循環) との対応は自明。**
>
> **更新2 (DR-085 訂正、2026-07-10): `invalid-argument` を追加。** registry 装置 (filter/type 等) に渡した引数の値そのものが不正で、装置側の構築 (compile 等) が失敗するケース (regex_match の pattern compile 失敗が最初の実例、DR-085 §1)。invalid-range (構文上は書けるが構成の組合せとして不成立) とは層が異なる — invalid-argument は単一引数値の内部妥当性、invalid-range は複数属性の組合せの値域外。
>
> **更新3 (DR-120 §5): `export-key-collision` を追加。** 1 結果スコープで同一露出キーへ解決する値セルが 2 つ以上ある定義 (DR-120 §1)。schema `definitionErrorExpect` の enum には反映済みで、本列挙と CONFORMANCE §2 の追随がここで揃う。
>
> **更新4 (GATEKIND-Q1=a、kawaz 裁定 2026-07-26): `unsupported` を追加。** 定義は spec 上合法だが、当該実装がその組み合わせを未対応として拒否した。既存 8 kind が「定義が不正」を報告するのに対し、`unsupported` だけは**定義は正しく、報告しているのは実装側の制限**という軸の違いを持つ — 同じ定義でも実装が変われば success になる。conformance 上、この kind を返す実装は当該機能の green を主張できない (CONFORMANCE §0.1)。`message` に未対応の範囲、`hint` に代替を書くこと (非規範、§4 の hint 一般化がそのまま効く)。
>
> **schema との非対称**: `schema/fixture.schema.json` の definitionErrorExpect の kind enum に `unsupported` は**加えない**。fixture は spec の正解を固定するものであり、正解が「実装が未対応」を期待することは無い — 実装制限は実装ごとに違うので、fixture に書けば別の実装にとって偽の期待になる。`unsupported` は実装が実行時に返す値としてのみ正規であり、fixture の期待値としては非正規、という一方向の語彙である。
>
> **更新5 (DNR-Q1=a、kawaz 裁定 2026-08-14): `duplicate-name` を追加。** 同一 lexical スコープに同じ**参照識別子**を持つ要素が 2 つ以上ある定義 (DR-006 / DR-003 の name 重複禁止を報告する kind)。既存 kind に相乗りさせない: `invalid-range` は 1 要素内の属性の組合せが値域外であることの申告で別要素間の衝突を表せず、`export-key-collision` は露出キー軸の判定だからである。
>
> - **判定軸は参照識別子** (DR-046 §1 の id 軸) — 明示 `id` があればその値、無ければ name が供給する (DR-046 §2)。生の name 文字列ではないので、同名でも相異なる `id` を割れば合法 (`fixtures/dd/duplicate-decl.json`)。DR-006 が重複を禁じた根拠 2 つのうち結果キー衝突は DR-120 が `export-key-collision` として引き取っており、本 kind に残るのは ref / link 解決の曖昧化 = 参照識別子軸である
> - **export-key-collision との軸の違い**: `export_key` で露出キーを割った同名ペアは `export-key-collision` に掛からないが `duplicate-name` には掛かる。逆に宣言名が異なるまま `export_key` を揃えたペア (`fixtures/export-key/collision.json` / `collision-identity.json`) は `export-key-collision` だけが立つ。両軸が同時に破れる形 (同名かつ `export_key` 未指定) では要素ごとに 2 kind が立ち、§4 の全列挙どおり両方を積む (一方を抑制する規則は置かない)
> - **参加する要素**: 同一 lexical スコープ (DR-025 / DR-033 — name / id を持つノードが作る) にある、参照識別子を持つ宣言要素。`or` / `seq` の子も同一スコープの兄弟として参加する。値セルの有無や露出キーの占有 (DR-120 §4) は参加条件ではない — 非占有要素 (`export_key: null` の `config_file` 等) も参照識別子は持つ
> - **参加しない要素**: **command** — name は綴り軸を保つため、相異なる `export_key` を割った同名 command 2 本は両立したままである (DR-120 §7、DR-067 §1 のトリガ重複合法)。**alias 要素** — 入口だけの存在で結果スコープも実体も持たず (DR-057 §2)、name は入口綴りの再導出源 (DR-057 §3)。DR-120 §4 の「name は綴り軸と id 軸にのみ効く」は結果キー軸に効かないことを述べる対比であり、alias 入口が独立した参照識別子を占有する意味ではない
> - **粒度**: 重複に関与する要素ごとに 1 件を全列挙する (DR-120 §5 と同じ理由 — 比較は `(element, kind)` の集合なので、重複グループの代表 1 件にすると相手が expect から読めなくなる)
> - **対処**: 片方を rename するか、明示 `id` で参照識別子を分ける (hint は message の関心、§射程外)
> - fixture: `fixtures/definition-error/duplicate-name.json` (中心形と非参加要素の対照)、`fixtures/export-key/collision-or-branch-siblings.json` (`or` 枝の兄弟が参加する形、2 kind の全列挙)
- DR-021 (warn 原則 — 適用層の限定、type フォールバックの例外は不変)
- DR-053 (結末の union — 同族構造)
- DR-032 (ref/link 解決 — 不在・循環の検査根拠)
- DESIGN §13.5 (次の手 hint) / §13.7 (diagnose) / §15.6 (warn の座席)
- findings `2026-06-29-ast-missing-pieces.md` F-035 (解消)
