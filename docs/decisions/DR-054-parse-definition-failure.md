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
| warn | 露出キー衝突の可能性 | DR-021 (実行時 ambiguous で捕まる) |
| warn | 同一スコープの同一トリガ重複 | DR-041 (静的 warn + 実行時 ambiguous) |
| warn | 丸呑み構造 (option 群 + 上限なし string positional) | DR-021 / DESIGN §15.6 |

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
- DR-021 (warn 原則 — 適用層の限定、type フォールバックの例外は不変)
- DR-053 (結末の union — 同族構造)
- DR-032 (ref/link 解決 — 不在・循環の検査根拠)
- DESIGN §13.5 (次の手 hint) / §13.7 (diagnose) / §15.6 (warn の座席)
- findings `2026-06-29-ast-missing-pieces.md` F-035 (解消)
