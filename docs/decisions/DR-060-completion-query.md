# DR-060: 補完クエリ — 生存 partial 経路の期待集合、素材とポリシーの分離、責務 4 層

> 由来: issue `2026-07-04-completion-partial-parse` (findings F-013 completer / F-038 partial parse モードの統合)。本セッションの議論で確定 (shell 提供情報の洗い出し → 確定後の挿入・着地の観点 → 責務の置き場の訂正、の 3 巡)。

## 決定

### 1. 意味論: 生存 partial 経路の次消費点の期待集合 (和集合)

補完は「全消費契約の別モード」ではなく、次の 1 クエリで定義される:

> **complete = カーソル前のトークン列を消費できた全生存 partial 経路について、次の消費点で読めるものの和集合**

- 「読めるもの」= greedy 面の matcher トリガ綴り (exact 衛星、eq-split / cluster の元綴り) + positional 面の次の期待ノード (値プリミティブの型 / values の exact 群)
- **全消費も一意性 (1 本) も課さない** — どの解釈に進むかはユーザがこれから打つので、全解釈の和集合が正しい。ambiguous 検出も行わない
- **dead end (途中で失敗した経路) は含めない** — 補完は「これから続きを打つ」文脈であり、もう成立しない解釈の候補はノイズ (DR-048 の失敗時アクションが dead end 込みなのと目的が逆)
- 基盤は DR-048 / F-039 の partial state と**概念レベルで**同じ。新しい公理は「打ち切り位置での期待集合の収集」1 つだけ。ただし実装機構の共有は要求しない — parse の枝列挙が「トリガ消費・値 pending」を中間状態として表現しない設計なら、補完は評価器と鏡写しの専用走査 (greedy/positional 面・先食い・sever の同型判定) が正しい形になる (slice PoC 第 18 弾で実測: dead end の扱いが目的で逆であることも分離を支持)。観測挙動 (本 DR の候補構造) が同一なら実装形は自由

### 2. API: shell が提供する情報を signature で狭めない

shell (bash COMP_WORDS/COMP_POINT、zsh words/PREFIX/SUFFIX、fish commandline) はカーソル**以降**のトークンとカーソル単語内の位置も提供する。これを受けられる形にする:

```
complete(atomic, {
  before: [tokens],        // カーソル前のトークン列 (必須)
  word: "<カーソル単語の前半>",   // 単語頭なら空
  word_suffix?: "<同・後半>",    // --po|rt の rt。候補との両立絞り込みに使える (v1 未使用可)
  after?: [tokens],        // カーソル後のトークン列
}) → 候補構造
```

- **after 整合フィルタ**: after が与えられたら「候補採用後に after も消費して完全経路に到達できる経路が 1 本以上あるもの」に絞れる — 行中間の補完で後続と矛盾する候補を落とす。全解決モデル (path-search) を持つ kuu ならではの精度で、逐次モデルの既存パーサには原理的にできない
- 補完種別 (tab 連打 / 一覧要求) は shell 間で体系がバラバラ (COMP_TYPE / compstate / fish は概念ごと別) なので **API に入れない** — 生成器のポリシー入力

> **明確化 (統括検証 2026-07-14、DR-104 での fixture format 確定に伴う命名改訂): 上記シグネチャの `before`/`word`/`word_suffix`/`after` は DR-104 により `args_before`/`word_before`/`word_after`/`args_after` に改名された。** `args`/`args_pos` への改名サイクル (issue `argv-to-args-rename`) と同じ命名統一の流れ — `before`/`after` 単独では「トークン列の前後」か「カーソル単語内の前後」か読み手が判別できないため、`args_`/`word_` の prefix で対象を明示する。意味論 (§1/§2 の決定内容) 自体は不変、語彙のみの改訂。`word_before`/`word_after` は本節が既に明記する「v1 未使用可」のまま、参照実装未着手で予約が継続する。
>
> **訂正 (統括検証 2026-07-14、codex レビュー #2 の反映): 上記「本節が既に明記する『v1 未使用可』のまま」という記述は誤り。** 本節原文で「v1 未使用可」の注記が付いていたのは `word_suffix` (現 `word_after`) のみであり、`word` (現 `word_before`) には付いていなかった (`word` は `before` と同様 `?` を持たない必須フィールドだった)。したがって「カーソル単語を core に渡す」という `word` の契約は、本節の既存規定の単なる継続ではなく、**DR-104 が v1 で明示的に supersede した** (未実装のまま予約する形へ格下げした) ものである — 参照実装が当初から word 系パラメータを持たなかった事実 (§2 本文) と、§3「絞り込みポリシー (prefix 絞り含む) は候補メタを見た生成器側の選択であり、kuu は固定しない」という既存規定 (prefix 絞りは元々生成器側の関心で core が word の値を消費する必然が無い) が、この supersede の論拠になる。

### 3. 候補構造: 素の素材 + メタ。ポリシーは持たない

候補は以下の素材とメタで返す:

- **exact 候補**: 綴り (素の文字列) + メタ: 由来要素 / canonical か alias か (DR-057) / hidden (DR-058、既定で除外だがメタには残す) / deprecated / **終端ヒント** (`word_end` = 確定・スペース可 / `continue` = 継続・nospace — dir の末尾 `/` や `--key=` の後など)
- **値位置**: 型情報 + **completer 名** (実行はしない)

絞り込みポリシー (未入力 tab-tab は alias を隠す / 途中入力は全部出す、prefix 絞り) は**候補メタを見た生成器側の選択**であり、kuu は固定しない。置換範囲とカーソル着地は shell の領分 (bash は単語全体置換、zsh は設定依存) — kuu はどの流儀でも壊れない素材と終端ヒントを返すだけ。

### 4. completer は名前参照、標準は shell 機能へ委譲

- registry 区分 **`completers`** を正規予約する (F-013)。要素の参照フィールドは `completer: "<名前>"`
- **標準 completer (files / dirs / path 等) は名前を返すだけで、生成器が shell 既存機能へマップする** (zsh `_files` / bash `compgen -f` / fish 組み込み)。クォート・変数展開 (`"$HOME"/` 等)・チルダ・エスケープ・元表記での着地は全部 shell の成熟した補完機構の責任領域に落ちる — 自前実装は shell ごとの quoting 再実装になるため canonical にしない
- **アプリ固有の動的候補**は completer 名 → アプリ提供関数の呼び出しを生成器が配線する。契約: 候補は**素の値文字列** (unquoted の実体) で返し、挿入時のクォートは shell / 生成器が付ける (zsh compadd の自動 quote 等)。**変数展開は kuu の関心外** — kuu は与えられた word 文字列をそのまま照合する
- クロージャ completer の AtomicAST 表現は引き続き持たない (名前参照のみ。DESIGN §13.9 の未予約から「名前参照は確定」に更新)

### 5. 責務 4 層 (エンドユーザとアプリ開発者に shell の作法を学ばせない)

```
1. complete API + 候補構造        — 本仕様 (本 DR) の関心
2. kuu completion 生成器          — kuu プロダクトの標準提供。各 shell 向け補完関数の実体と
                                    登録コマンドの出力 (`app completion bash` の出力)、
                                    completer 名 → shell 機能のマッピング、絞り込みポリシー。
                                    shell ごとの作法は全部この層に封じる。本仕様の射程外
3. アプリ開発者                    — completion サブコマンドに生成器を繋ぐだけ
4. エンドユーザ                    — source <(app completion bash) するだけ
```

層 2 が存在して全部を埋めることが前提であり、「shell 作法の学習」をアプリ開発者に丸投げしない。F-015 の「補完スクリプト生成は kuu core の提供物ではない」は「本仕様 (AtomicAST) の関心ではない」の意味であり、kuu プロダクトが提供しないという意味ではない (DESIGN §0.1 の宣言文を本 DR で修正)。

## 採用しなかった案

### 全消費契約の 2 モード分離 (F-038 原案)

「モード」という別意味論を立てる必要がない。生存 partial 経路 + 期待集合収集という 1 クエリで足り、DR-038 の契約は無傷。

### file/dir 候補の kuu 側列挙

`"$HOME"/` のクォート・展開・元表記着地を shell ごとに再実装することになる。shell 委譲が唯一実用的。

### 補完種別 (tab 連打) を API に載せる

shell 間で体系が違いすぎ、正規化するとどれかの shell の情報を落とす。ポリシー層 (生成器) の関心。

### カーソル前のみの signature (argv_prefix 案)

shell はカーソル以降も提供しており、after 整合フィルタという kuu 固有の精度を捨てることになる。もらえる情報を signature で狭めない。

## 射程外

- 生成器の出力形式 (各 shell の補完関数テンプレート・登録コマンド) — 層 2 の実装の関心
- 絞り込みポリシーの既定値 (tab-tab 切替の具体挙動) — 層 2 の関心
- complete API の直列形 (JSON フィールド名) — DR-039 の直列形確定と同時

## 関連

- DR-038 (完全経路一意性 — 補完は別クエリでありこの契約を緩和しない)
- DR-048 / F-039 (partial state — 同じ基盤、dead end の扱いは目的差で逆)
- DR-041/042 (matcher / greedy 面 — 期待集合の供給源)
- DR-057 (alias メタ) / DR-058 (hidden / deprecated メタ)
- DR-053 (素材とポリシーの分離 — 同じ流儀)
- DESIGN §0.1 (F-015 宣言文の修正) / §13.1 (completers 区分) / §13.9 (動的補完の更新)
- findings `2026-06-29-ast-missing-pieces.md` F-013 / F-038 (解消)、F-016 (suggest — tried_triggers は DR-053 で確定済み、近接マッチは層 2/DX)
- issue `2026-07-04-completion-partial-parse` (解消)
