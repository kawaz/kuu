# DR-116: canonical 補完生成器の既定 policy — 順序・説明・可視性・lazy の責務境界

> 由来: `docs/findings/2026-07-21-completion-ordering-plan.md` の CORD-Q1〜Q5 裁定 (kawaz 2026-07-22、全て案 a)。DR-060 の素材と生成器 policy の分離、DR-104 の順序非依存候補契約、DR-113 §8 の help 順序、DR-111 §5 の completer ABI 境界、DR-115 §6.2 の出力非 pin を前提とする。

## 決定

### 1. 本 DR が定めるのは canonical 補完生成器の既定 policy

canonical 補完生成器は complete query の候補素材と help model を組み合わせ、対象 shell の補完機構へ翻訳する。本 DR はその既定 policy を定める。候補 wire、complete query の観測、fixture 比較規約は変更しない。

生成器 API や各 shell script の具体形、説明文の組版、対象 shell が最終的に表示する順序は生成器実装の関心である。定義側の上書き席は設けない。

### 2. definition 由来候補は DR-113 §8 適用済みの help model 順に整列する

canonical 生成器は help_query capability から得た help model の options / commands 列を参照する。この列は DR-113 §8 の「明示 order と宣言 index による安定ソート → `help_after` 配置」を適用済みであり、その順序を候補提示順の正本とする。

- candidate の `origin` を help model の entry または definition 内の対応要素へ突き合わせ、definition 由来候補を対応 entry の順に整列する
- 同じ entry に属する複数候補は生成器の安定順を保つ
- 値位置候補は、その候補を生む definition entry の順序に従属する
- 対象 shell に供給順保持手段がある場合、生成器はその手段へ翻訳する。供給順を保持できない shell の最終表示順は保証しない

`candidates` 自体の列挙順は引き続き非規範であり、DR-104 §4 の順序非依存 multiset 比較を維持する。補完専用の order 語彙は設けず、定義者の順序意図は help 語彙を共用する。

### 3. lazy は completer 実行層の関心とし、core 契約を変えない

complete query は definition 由来の有限候補と completer 名参照を同期的な配列で返す。重い動的候補の遅延評価、ストリーム供給、ページング、キャンセル、インタラクティブ絞り込み UI への接続は、completer を実行する runtime 問い合わせ ABI の関心とする。

DR-111 §5 が保留する completer ABI は次の順序規則を引き継ぐ。

- **definition 由来候補**: §2 の help model 順
- **completer 由来候補**: completer の供給順を確定順とする

completer 由来候補には definition 上の order 素材が存在しないため、全件バッファ後の再整列規則は設けない。`complete_lazy` 等の制御語彙も設けない。静的候補には lazy の意味がなく、completer の実行方式は ABI が表現すべきだからである。

### 4. 候補説明は candidate に同梱せず、`origin` から引き直す

canonical 生成器は definition と help model を保持し、candidate の `origin` が指す定義要素から説明素材を引き直す。

- canonical exact 候補: `origin` が指す entry の `help`
- alias 候補: canonical entry の `help` と alias であることを示す注記
- 値位置候補: `origin` が指す値定義の `help`

`origin` が指す定義に `help` が無ければ、説明は付けない。alias 注記と deprecated 注記の文言・配置は非規範とする。runtime 問い合わせ ABI が shell shim 向け応答へ説明を添える場合も、binary 内でこの引き直しを行った結果を応答 envelope に載せるのであり、candidate wire の一部にはしない。

### 5. hidden / deprecated / alias の既定表示 policy

canonical 生成器の既定は次のとおり。

- **hidden**: 候補から除外する
- **deprecated**: 候補に残し、説明へ deprecated 注記を加える
- **alias**: 候補に表示する

受理される deprecated 綴りを候補から消さず、利用可能性と移行案内を同じ補完面で示す。alias の文脈依存絞り込みは生成器実装または実行時 policy の裁量だが、既定では隠さない。

### 6. spec conformance への増分はゼロ

本 DR は wire 語彙、candidate 構造、complete query の意味論、schema、conformance fixture を追加・変更しない。canonical 生成器が出力する script、候補順、説明文字列、注記、shell 上の最終表示は fixture pin しない。

この線引きは DR-115 §6.2 と同型である。定義素材の受理・搬送は既存 conformance が担い、適用後の表示品質は生成器 product test が担う。したがって本 DR の採用だけを理由とする spec conformance profile の追加は行わない。

## 採用しなかった案

### candidate wire に順序フィールドを追加する

help model に DR-113 §8 適用済み順序が保存されており、生成器は `origin` で対応づけられる。順序を candidate に複製すると、6 フィールド identity への参加可否、欠番、`help_after` の相対配置を数値へ潰す規則が新たに必要になる。既存素材で表現できるため追加しない。

### 補完専用 order 語彙を追加する

help と補完で独立した order / group order / after 系を持つと、同じ定義者意図を表す語彙が二重化する。独立した順序需要が無い状態で新しい語彙を予約せず、DR-113 §8 の順序を共用する。

### candidate wire に description を同梱する

説明を candidate へ載せると、表示メタを評価器出力へ運び、help / help_long の選択と 6 フィールド identity への参加可否を wire 層で決める必要が生じる。生成器は definition と help model を保持するため、`origin` から引き直す方が責務に合う。

### `complete_lazy` 等の制御語彙を追加する

lazy の実需は completer の動的列挙にあり、definition 由来の静的候補には適用対象が無い。実行方式を core definition や candidate wire に載せると ABI の責務を先取りする。ストリーム・ページング・キャンセルと一緒に runtime 問い合わせ ABI が定める。

## 波及

- canonical 補完生成器は complete query と help_query capability の両方を入力に使う
- runtime 問い合わせ ABI は §3 の順序規則を採用し、completer 実行方式を定める
- 生成器 product test は help model 順の適用、hidden 除外、deprecated 注記、alias 表示、origin からの説明引き直しを検証する
- spec schema / fixtures / conformance profile に変更は無い

## 関連

- DR-060 §3〜§5 (素材と policy の分離、completer 名前参照、責務 4 層)
- DR-104 §2〜§4 (candidate wire、6 フィールド identity、順序非依存 multiset)
- DR-111 §5 (completer descriptor と runtime 問い合わせ ABI の境界)
- DR-113 §8 (help 順序の適用済み列)
- DR-115 §6.2 (canonical 出力の非規範・fixture 非 pin)
- `docs/findings/2026-07-21-completion-ordering-plan.md` (CORD-Q1〜Q5 の選択肢と根拠)
- `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` (発題 issue)
