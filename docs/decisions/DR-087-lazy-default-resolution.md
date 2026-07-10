# DR-087: default の遅延解決 — placeholder 設置と依存順の最終実体化

> 由来: bool-requires の config/inherit 対応 (issue bool-requires-config-inherit-gap) の実装中に「制約検査が config 解決済みの値を参照できない」「config_file 解決の再演が要るのでは」という設計混乱が出たのを受けた kawaz 裁定 (2026-07-10)。「デフォルトは全部遅延解決するんだよ。依存順で」「cell に何もないところから始まって全ての解決が済んだけどまだ cell に何もなかった時に入れる値が本来のデフォルト」。

## 決定

### 1. default の意味論 = 全解決後の fallback (先詰めではない)

default とは「**すべての値源の解決が済んでもなお cell が空だった時に入る値**」である。「先に default を変数へ代入しておき、上位値源が来たら上書きする」手続き型の慣行は、たまたま同じ結果になる実装手順であって default の定義ではない。kuu の意味論はこの本義で規定する — cell は空から始まり、解決の最後に空のまま残った cell にだけ default が実体化される。

### 2. default の設置・書き換えは placeholder 操作

`op=default` の発火、env/config/inherit による default 席の書き換え (DR-081) は、いずれも「**default という placeholder を設置・更新する操作**」であって値の実体化ではない。実体化 (cell への具体値の書き込み) は解決フェーズの最後に一括で行う。default_source (DR-081 §1) は placeholder に付随する由来メタであり、この遅延モデルの帰結として自然に定義される。

**default_fns (`() → T`、`default:` の関数形 — PIPELINE / DR-010 の registry 区分) の評価も同じ**: placeholder には関数参照が置かれるだけで、**呼び出しは default 解決フェーズ (実体化) まで行わない** (kawaz 裁定 2026-07-10)。定義時・供給時の前倒し評価は、上位値源で埋まる cell の関数を無駄に呼ぶだけでなく、評価時点依存の値 (時刻等) の意味論を壊す。

### 3. 実体化は依存順

default の実体化は要素間の依存を追った順序で行う:

- config_path (config_file 要素) 自体の default も env から来うる — よって「config_path の解決 (env → 明示 → default)」が「他要素の config 席の参照」より先
- inherit は祖先 cell の解決値に依存する — 祖先の実体化が先
- 一般化: **値源が他 cell の解決値に依存する場合、その cell の実体化が先** (依存グラフの位相順)

パス解決のような依存の根は先に確定し、default の実体化だけを遅延させる。既に解決済みの値の**再演 (再解決) は不要かつ不可** — 解決は一度きりで、遅延はその実行時点を最後へ寄せるだけ。

### 4. 帰結: 解決後の消費者は常に全解決済みの値を見る

制約検査 (requires / conflicts / exclusive)・結果射影・sources 計算など、解決フェーズ後の消費者は「全 cell が実体化済み」の世界だけを見る。「検査層が config を引けない」「値源ごとに別の参照経路が要る」という問題は、先詰め・逐次解決の実装形が生む人工的な問題であり、遅延解決モデルでは構造的に存在しない。

## 採用しなかった案

### 先詰め (pre-fill) + 上書きの手続き的モデル

default の詰め忘れが起きにくい実装慣行として広く使われるが、「default を参照する消費者が、上位値源の到着前の中間状態を観測しうる」「値源追加のたびに上書き順の整合を人手で保つ」という本 DR の由来になった混乱そのものを生む。

### 消費者ごとの値源再解決 (再演)

bool-requires 検査が自前で config_file 解決をやり直す等。解決の一回性が壊れ、値源ロジックの複製が発散する。

## 波及

- DR-031 (値源ラダー) / DR-081 (default 席書き換え・default_source) / DR-083 (宣言 default) / DR-045 (unset = default へ戻す): いずれも本 DR の遅延モデルで再説明できる (観測同値、本文改訂不要)。unset は「placeholder へ戻す」操作としてそのまま整合
- DR-050 (config): config_path の解決が他要素の config 席参照に先行することを §3 が明文化
- kuu.mbt: 解決フェーズの先詰め箇所の棚卸し (実体化順序が §3 の依存順と観測同値かの監査) — 対 issue を kuu.mbt に起票
- conformance fixture: 観測挙動は既存 pin と同値のはず (本 DR は実装形の規範化)。監査で観測差が出た場合はその場面を fixture 化

## 関連

- DR-031 / DR-045 / DR-050 / DR-081 / DR-083 (上記波及)
- issue bool-requires-config-inherit-gap (由来の混乱)
