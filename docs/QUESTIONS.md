# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺 API-Q2b: 補完候補の型名と CandMeta の責務 (調査結果込み再提示)

### 背景 (前回から更新)

kawaz の 2 つの問い: (1) なぜ `Cand` が略語? (2) `CandMeta {is_alias, hidden, deprecated}` は候補でなく定義元のメタでは? 既存ライブラリはどうしてる?

### 調査結果 (clap / cobra / carapace / fish / zsh / argcomplete)

**is_alias / deprecated を候補モデルに載せる例は業界にゼロ**。全ライブラリで「定義側属性 → 補完生成時に filter で除外」が慣習。hidden を候補側に持つのは clap のみ (しかも「他に候補が無ければ出す」低優先セマンティクス)。業界で候補側に載せて価値が高いのは description / tag (グルーピング) / value-display 分離 (carapace が最もリッチ)。

### ただし kuu は意図的に業界と違う設計を既に持つ (DR 確認済み)

- **DR-060 §3**: 「絞り込みポリシー (prefix 絞り含む) は**候補メタを見た生成器側の選択**であり、kuu は固定しない」
- **DR-104 §2/§3**: `meta {is_alias, hidden, deprecated}` は wire 契約の**必須フィールド**かつ候補同一性 6 フィールドの成分。fixtures/complete/meta.json で pin 済み
- = kuu は「core は隠す判断をしない。素材 (メタ込み) を全部返し、表示/除外は消費側 (シェル統合・生成器) の policy」という、help model の hidden の扱い (DR-113 §4.4「hidden は model に残す。除外はレンダラ policy」) と**同型の一貫した思想**。業界慣習 (core が filter) と違うのは事故でなく設計

### 論点 (裁定対象)

- **(b-1) 型名**: `Cand` → `Candidate`、`CandMeta` → ? (b-2 と連動)、`TermHint::Cont` → `Continue`。**統括推し = 展開**
- **(b-2) CandMeta の構造**: 3 案
  - **案 i (統括推し): meta 入れ子を廃止し Candidate に flatten** — `Candidate {spelling, is_value, type, origin, term, is_alias, hidden, deprecated, ...}`。「候補が持つ表示判断材料」として直接持つ。wire (DR-104 の `meta: {...}` 入れ子) は不変で、実装型だけ flatten (wire とモデルの 1:1 は崩れるが、struct 1 個割る位相の差)。CandMeta という「builtin 慣習属性の袋」の座を消す
  - **案 ii: 現状構造維持 + 改名のみ** — `CandidateMeta` に改名。wire の `meta` 入れ子と 1:1 を保つ
  - **案 iii: 業界慣習に寄せて候補から外す** — これは DR-060 §3 / DR-104 の設計転換 (wire 変更 + fixture 改訂) を伴う。kuu の一貫思想 (消費側 policy) を崩すので**統括は非推奨**
- 案 i でも wire 側 (`meta` 入れ子) を将来 flatten するかは別論点 (v1 fixture 互換に触るので今回はスコープ外)

**回答形式**: `API-Q2b=(b-1)展開,(b-2)i` 等。

## 👺 API-Q2c: Node の "Sat" 略語展開 (説明付き再提示)

### 背景説明 (何の話か)

kuu.mbt の **engine 生層 (raw 契約層) の `Node` enum** の variant 名の話。`Node` はパース木の内部表現で、installer が定義を lowering した結果の「マッチング構文木」のノード種を列挙する。拡張 installer を書く人 (= raw 契約層の利用者) が直接触る型。

その中に **"Sat" (= satisfied の略) を含む variant が 3 つ**ある:

```
pub(all) enum Node {
  ...
  DdSat(String)                        // "--" (dd) が既に出現済みの状態でだけ
                                       // マッチする条件付きトリガ (dd satisfied)
  DdMatchSat(String, Bool, Bool, String) // 同上の pattern-match 版
  CmdSat(String, Scope)                // サブコマンドが確定済みの状態でだけ
                                       // 有効になる scope 境界 (command satisfied)
  ...
}
```

「satisfied = その前提条件が既に充足されている状態でのみ発火するノード」という意味論。

### 補強材料 (実装内部の自己矛盾)

実装内部の doc コメント (`src/engine/eval.mbt:63,79-80,253,966`) は既に **`CmdSatisfied` / `DdSatisfied` / `DdMatchSatisfied` と展開形で書いている**。つまりコードを書いた本人も説明時には展開形を使っており、型名だけが略されている状態。

### 論点

- `Node::DdSat` → `DdSatisfied`
- `Node::DdMatchSat` → `DdMatchSatisfied`
- `Node::CmdSat` → `CmdSatisfied`

- **展開する (統括推し)**: "Sat" が satisfied と読める人はいない (Saturday? SAT ソルバ?)。doc コメントとの不一致も解消される。raw 層とはいえ拡張実装者は第三者
- **現状維持**: raw 層は頻出内部語彙なので短くて良い、という立場もある

**回答形式**: `API-Q2c=展開` / `API-Q2c=維持`。
