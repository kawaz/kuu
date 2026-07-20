# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。


> **⚠ 2026-07-19 HIP-META-Q バッチ裁定 (mid=14, mid=15, mid=18, mid=23)**:
> - **meta-Q1 = a**: help_installer が必要、DR-112 §1 撤回、設計プランから立て直し。実装ロールバック計画へ
> - **meta-Q2**: order 関連 / display_name / value_name / help_on_failure 齟齬なし承認。**help_epilog = a 採用** (mid=15 の "epilog のことか、理解。ok" で確定)
> - **meta-Q3**: depth = "scope" | "all" 承認、数値 depth 不要。他 worker 起草部分も「基本よさそう」
> - **meta-Q4** (mid=13/16/17/20 で継続議論・確定): value_structure tree = a **承認**。type_ref ノード + model トップ types セクション拡張 (mid=17 の共有型) = **承認 (mid=20)**。レンダラ側は「趣味もある、後日レンダラ policy 指定オプション語彙追加で 1 行表現も選択可能に」(canonical レンダラ設計 issue に持ち越し、集約表示 vs 1 行 inline vs 詳細説明形式の選択可能化)。pipe 曖昧回避 (mid=16) も同 issue に持ち越し
> - **meta-Q5** (mid=18 確定): **5 個の直交 type 構成** — `help` / `help_all_category` (旧 help_all 名前変更 + 意味論訂正、「全 category 絞りなし」) / `help_category` / `help_show_hidden` (独立軸新設、hidden 表示) / `help_tree` (独立軸新設、サブコマンド tree 全展開)。hidden は独立軸で分離 (混合概念回避)、現行 DR-112 §7 の type:"help_all" は完全撤回。各 type は or で組合せ可 (kuu 背骨の or 表現力そのまま)
> - **meta-Q6 = A** (mid=23 確定): **default_fn 汎用機構**。fn registry 引き + DSL `"fn_name[:arg...]"` (filter/variant DSL と対称)。builtin fn = borrow / inherit / env / constant / computed / uuid。descriptor 引数の型宣言に kuu の positionals 定義式 (kawaz mid=21 追補)。**DR-088 で kawaz 裁定原文に「default_fn」の語が既出** (「env 指定があるってことは env から遅延解決する default_fn が設定されてるようなもん」) = 概念は既存、DSL 実装が新設分。専用属性 (default_from / default_for) 廃案

## HIP-META-Q8 バッチ裁定確定サマリ (mid=32/34/35/36/37/38)

### ✅ Q8-δ = cell_fns (mid=39 確定): registry 命名

**kawaz 裁定 (mid=39)**: `cell_fns` 採用。「セル操作もあることを考えると source_fn では不足」。ctx 名も **FnCtx** に統一 (registry と対称)。

### ✅ Q8-ε 承認 (mid=38): 統一 FnCtx + mode 判別

kawaz 指摘: 2 種類の ctx を fn signature で受けるのは対称性欠く。**統一 FnCtx + mode 判別 + 個別 ctx 取得** の設計:

```
fn signature: (args: string[], ctx: FnCtx) → Result<Value | Sentinel, Reason>

FnCtx API:
- ctx.mode() → "default" | "effect" | "filter"
- ctx.as_default() / as_effect() / as_filter() → 個別 ctx | null (mode 一致時のみ非 null)
- 共通 API: ctx.env(var) / ctx.system(key) / ctx.observes()
```

- **統括推し = 承認 (kawaz 案採用)**、finding §2.5 反映済み



- **✅ Q8 = A**: universal fn 統合承認 (mid=32)
- **✅ Q8-α = a** (mid=37): args 値の array 記法導入、1 段限定
- **✅ Q8-γ = i-2** (mid=37): 2 registry (`filters` 既存 + `fns` 新設)、`fns` は default_fn と variant_effect を統合、fn descriptor の返り値型 (Value/Sentinel) で「default 席で使える」vs「発火時のみ」を区別 (kawaz mid=36 指摘で default_fns と variant_effects を分ける必要ないと確認)
- **✅ Q8-β = A' full (訂正 2026-07-20)**: filter 系も universal fn 統合の対象 (共通機構 = DSL 書式 + observes 軸)、ただし **registry は Q8-γ = i-2 で分離** (filters registry + cell_fns registry の 2 個体制)。registry 分離 (Q8-γ) と共通機構統合 (Q8-β) は独立で両立。filter 側の実装コストは激減 (observes 軸を filter descriptor に追加するだけ)。旧記述「filter は今統合しない」は Q8-γ = i-2 (registry 分離) を誤読していたための drift、訂正
- **✅ Q8 統合の「真の姿」確定 (訂正 2026-07-20)**: 共通機構は「DSL 書式 (colon-args + array 記法) + observes 軸 + **統一 FnCtx + mode 判別** (Q8-ε mid=38 確定)」の 3 点。registry / failure reason は役割固有 (filter registry + cell_fns registry の 2 個)、ctx は unified FnCtx (mode="filter"|"default"|"effect" で内部を分岐、旧「FilterFnCtx/DefaultFnCtx/EffectFnCtx 独立」記述は Q8-ε 承認で unified に統合済み、旧記述は drift)

次アクション: DR-114 (universal fn 統合) 起草 + DR-113 (help 再設計) を DR-114 前提で書き直し。裁定完了、実装コスト激減、v1 完備主義準拠。

## HIP-META-Q8-α: args 値の colon 含む問題 — array 記法導入 (kawaz mid=34, ✅ mid=37 = a 承認)

### 背景

universal fn DSL (`"fn:arg1:arg2"`) は args に colon を含む値を書けない。エスケープ (`\:`) は暗黙知要求で不安、導入したくない (kawaz mid=34)。

### 提案 (kawaz mid=34)

wire form 上、colon-string と array of string を**同じ位置で受け入れる**混在配列:

```json
long: ["no:set:false", ":set", ["", "set", "a:b"], ["debug", "env", "LOG:PATH"]]
```

- 各要素は string or array of string の**どちらか**
- **array 要素の中身は string のみ** (1 段限定、際限なし化を回避)
- string と array は意味論的に等価

### 選択肢

- **候補 a (推し、統括推し)**: array 記法導入、1 段限定。エスケープ不要、明示的、書き手負担なし
- 候補 b: エスケープ (`\:`) 導入 — kawaz 却下済み
- 候補 c: colon 含む値は書けない仕様として固定 — 実用性欠く

## HIP-META-Q8-β: filter 系を universal fn 統合に含めるか (kawaz mid=34 問い、mid=35 精緻化、mid=37 帰結で決着)

**決着 (mid=37 → 2026-07-20 訂正)**: Q8-γ = i-2 は **registry の分離** (filters と cell_fns の 2 個) を意味するが、これは Q8-β の「filter 系を共通機構 (DSL 書式 + observes 軸) に含めるか」とは**独立**。Q8-β = **A' full** (filter 系も共通機構統合) が正しい裁定 (旧記述「filter は今統合しない」は Q8-γ の意味を誤読していた drift、訂正)。filter 側の実装コストは激減 (observes 軸を filter descriptor に追加するだけ、既存 registry / pipeline / FilterFnCtx は refactor 不要)。

## HIP-META-Q8-β 元記述 (参考):

### 見積結果 (finding §4.5、kawaz mid=35 反映後)

**kawaz mid=35 指摘**: registry も ctx も role で分けるのが自然。統合の実体は「共通機構は DSL 書式 + observes 軸の 2 点だけ」。

filter 系統合の実装コストは **激減**: 既存 filter 機構 (registry / descriptor / pipeline / FilterFnCtx) は refactor 不要、observes 軸を filter descriptor に追加する + array 記法をパーサで受けるだけで実質的な統合達成。

### 選択肢

- **候補 A' (推し、統括推し、更新版)**: v1 で filter 系統合も含む full 統合、role 完全分離戦略 (registry + ctx + failure reason は role 固有、共通は DSL 書式 + observes 軸のみ)。実装コスト = TRI-Q4 級 or 以下
- 候補 A (前案): filter 系は v2 に回す — 統括推し撤回、更新版 A' に集約
- 候補 B: universal ABI だけ先行、DSL 集約は v2 — mid=35 反映後は「共通機構が薄い」= A' と B の差がほぼ消える、A' に統合
- 候補 C: 現状維持で v1、統合は v2 — v1 完備主義違反

## HIP-META-Q8-γ: registry vs role の分け方 (kawaz mid=35, ✅ mid=36 精緻化 + mid=37 = i-2 承認)

### 選択肢

- **候補 i (推し、統括推し)**: **別 registry** (`filters` / `default_fns` / `variant_effects` の 3 registry)。既存 kuu 構造 (registry 1 個 = role 1 個の 1:1 対応) と整合、名前衝突の自動回避 (DR-094 namespace)、物理的な分離 = 意味論分離が自然
- 候補 ii: 同 registry で role で区別 (`fns` registry の中に role=filter と role=default_fn が並ぶ) — 現構造と非整合、実装コスト増
- 候補 iii: registry + role の両方で冗長に区別 — 意味論的に無駄

## HIP-META-Q8: universal fn への統合 (kawaz 発題 mid=29) — variant DSL effect + default_fn を fn 機構に集約

### 背景説明

kawaz mid=29 の指摘:
1. long DSL の `":set[:X]"` (variant effect 語彙) と default_fn `"constant:X"` の意味論重複 (「固定値供給」の同型)
2. long DSL の `:区切り 2 個目以降` の書式は default_fn descriptor の args と同型
3. → **long に値源としての default_fn を持ってこられる**可能性 (統合案)
4. descriptor のジェネリクス T の追加 (統合時の型精密化)

現 kuu では:
- **variant DSL** (`":set:X"` / `"no:set:false"` 等、DESIGN §7.3-7.4) — 発火時 cell 操作、effect 4 種 (set/default/unset/empty)
- **filter DSL** (`"trim"` / `"in_range:1:65535"` 等、DESIGN §8.4) — 値の変換・検証
- **default_fn DSL** (mid=28 で確定、`"constant:X"` / `"borrow:Y"` / `"env:VAR"` 等) — default 席の値計算

これら 3 種 DSL は書式が同型 (`"name[:arg...]"`)、意味論も「fn 呼び出しで結果を得る」で近い。**統合可能性**の検討。

### 選択肢

- **候補 A (統合推し、統括推し)**: **universal fn** 機構を kuu の背骨として立てる。variant DSL の effect / filter chain / default_fn を全て「fn 呼び出しの specialization」として統一。descriptor registry 引きで cell operation / value transformation / default supply を宣言。DSL は 1 種類に集約。「やりすぎ感」の kawaz 自問への回答 = やりすぎでなく、kuu 背骨 (or/seq/repeat/link/ref の任意ネストで機構を統一する思想) と整合、DR-088 kawaz 裁定「値源は全て default_fn」の完成形
- 候補 B (現状維持、統合しない): 3 種 DSL は表面的に類似だが意味論的位相が違う (effect は発火時 cell 操作、filter は値変換、default_fn は default 席計算) として維持。「やりすぎ感」= 統合の複雑度が意味論明快性を上回るリスク
- 候補 C: v1 では現状維持、v2 で統合検討 — **v1 完備主義 (メモリ feedback-v1-completeness-principle) 違反、不採用**

### 統合の範囲 (候補 A 採用時)

- **DSL 統一**: 3 種 DSL を 1 種の universal fn DSL に集約 (`"fn:args"` 書式)
- **effect 語彙の再整理**: variant DSL の 4 effect (set/default/unset/empty) を fn 化 (set → constant、default → default (default 席参照)、unset → unset、empty → empty)
- **descriptor の統一**: DR-107 の role enum に fn 系の役割を統合 (default_fn だけでなく effect / filter も同 role で扱う? or 別 role で共通 fn 機構を使う?)
- **long DSL への default_fn 引き込み**: `long: ["ttl:constant:60"]` のように発火時 fn を明示 (現 variant DSL の一般化)
- **ジェネリクス T の追加検討**: DR-107 §3 の型体系拡張 (現 "value" 近似で足りるか、精密性のため T 導入するか)

### 影響範囲

- kuu spec の背骨 (DSL / descriptor / lowering / effect / filter / default_fn) の統合再設計
- 実装 (kuu.mbt) の広範な書き直し
- 波及: DESIGN §7 (variant DSL) / §8 (filter) / §11 (default 席) / DR-011 (variant DSL) / DR-034 (multiple/collector) / DR-036 (filter chain) / DR-102 (filter パイプライン) / DR-087/088 (default 遅延解決) / DR-107 (descriptor 直交軸) / DR-111 (accumulator/completer) 等
- fixtures (variant / filter / multiple / value-sources 系ほぼ全体) の記法確認

### 統括推し

**候補 A (統合)** — v1 完備主義に沿った推し。ただし **範囲膨大**なため、まず統括が **深掘り finding** (「universal fn 統合の設計プラン」) を起草してから v1 スコープ判断を確定する順序を推す。統合の副作用 (実装広範書き換え / 既存 DR/fixture への波及 / 現実装との整合) を精査してから最終裁定。

### 参照

- DESIGN §7.3-7.4 (variant DSL / effect 4 種)
- DESIGN §8.4 (filter DSL)
- DR-011 (variant DSL)、DR-034 (multiple)、DR-036 (collector)、DR-102 (filter パイプライン)
- DR-087/088 (default 遅延解決、default_fn 概念)
- DR-107 (descriptor 直交軸、role enum、io_type 型体系)
- HIP-META-Q6 (default_fn 汎用機構、mid=28 で default_fn 一本化承認)
- kuu 背骨 (or/seq/repeat/link/ref の任意ネスト、機構統一思想)

## ✅ HIP-META-Q11 = a (mid=48 確定): update effect の forget + cell_fns fn ABI に ctx.old 追加

**裁定 (mid=48)**: variant effect 4 種 (set/default/unset/empty) に戻す、update は cell_fns registry の独立 fn (`incr` 等) が `ctx.old` を参照する形で実現。cell_fns fn ABI に `ctx.old` (Value | absent) 追加。DR-114 修正要 (update 節削除、set fn ABI 更新)。

以下は議論の記録 (参考):

## HIP-META-Q11 元記述 (参考): update effect の forget + set fn ABI に old 追加 (kawaz mid=46 発題)

### 背景

私 (統括) が別 agent 再監査 Major 4 対応で「update は total 限定 + filters registry の transform を EffectCtx の現在値に適用」と finding + DR-114 で書いたが、kawaz mid=46 で **筋が悪い**指摘。kawaz 対案:

- update を forget、変わりに **値提供 fn (set 系) の ctx に old (現在値) を入れる**
- 単なる値供給 (`set(60)`) は old を使わない (immutable set)
- update 相当は `set:incr` 等の fn が `ctx.old` を参照する形で表現
- 「図らずも前の値を ctx に入れることでフィルタとも合流できてしまいそう」= T → T の同一 ABI、filter/cell_fns 合流の入り口

### 選択肢

- **候補 a (推し、統括推し + kawaz 提案 + mid=47 訂正)**: kawaz 案採用。variant effect 4 種 (set/default/unset/empty) に戻す。DR-114 の update 特殊対応 (filters transform を EffectCtx に適用) 記述を削除、cell_fns registry の fn ABI に `ctx.old` (Value | absent) 追加。**update 相当は独立した fn (`incr` 等) が cell_fns registry に住人として登録、`ctx.old` を参照して新規値を返す形で実現** (例: `:incr` で発火時 cell に「old + 1」を set、`default_fn: "incr"` で default 席に「old + 1」を設定)。「variant 4 種」は long ドメイン上の DSL 呼称、実体は cell_fns の 4 個の builtin fn descriptor (kawaz mid=47 指摘)
- 候補 b: 現状維持 (update effect + 特殊対応)。実装コスト削減なし、universal fn 統合の対称性劣化
- 候補 c: filter と cell_fns の合流を今やる (Q8-γ の再検討、1 registry 化) — 範囲拡大リスク大、v1 では避ける

### 統括推し = a、理由

1. universal fn 統合の対称性向上 (5 種 effect → 4 種、update は set の特殊化)
2. fn ABI 統一 (set が old を optional 受け取り、他 fn は無視すれば OK)
3. DR-114 の update 特殊対応記述削除で単純化
4. Major 4 (update fallible 意味論) が消滅 = v1 blocker が 1 個減る
5. filter と cell_fns の合流基盤 (T → T の同一 ABI)、将来 v2 以降の統合再検討の入り口

### 修正範囲

- finding §2.1 の 5 種 → 4 種 (update 削除)
- finding §2.5 の fn ABI に `ctx.old` 追加
- DR-114 の update 節削除 + set fn ABI 更新
- Major 4 該当なしになる

## ✅ HIP-META-Q10 = a (mid=48 確定): help capability 入力の contract + query 不在時の失敗 envelope

**裁定 (mid=48)**:
- **Q10-α = a**: help query capability の入力に `category_mode: "default" | "all" | {"named": <string>}` を追加。renderer は category_mode で 3 分岐 (絞りなし全表示 / 特定 category 絞り / デフォルト表示)。`#help_all_category` cell 値からアプリ側が category_mode を組んで query 呼び出しに渡す。DR-113 修正要
- **Q10-β = a**: help query 固有の失敗 envelope 新設 (query-error `absent-path` / `absent-category`)、definition_error profile と分離。conformance runner は help query の失敗を definition_error と区別。DR-113 修正要

以下は議論の記録 (参考):

## HIP-META-Q10 元記述 (参考): help capability 入力の contract + query 不在時の失敗 envelope (別 agent 再監査 Major 5/6)

### Q10-α: `#help_all_category` / `#help_show_hidden` / `#help_tree` cell 値の renderer policy 入力 (Major 5)

**背景**: DR-113 の 5 直交 type (help / help_all_category / help_category / help_show_hidden / help_tree) は発火時に対応する内部セルを立てるが、これらの cell 値を renderer policy へ渡す contract が DR-113 に明記されていない。基本 help も help_all_category も `category` を省略、`#help_all_category` cell が model / renderer policy に渡されていないため、両者は観測上同一。

**選択肢**:

- **候補 a (統括推し)**: help query capability の入力に **`category_mode: "default" | "all" | {"named": <string>}`** を追加。renderer は category_mode で「絞りなし全表示」「特定 category 絞り」「デフォルト表示」を分岐。`#help_all_category` cell からアプリ側が category_mode を組んで query 呼び出しに渡す
- 候補 b: `#help_all_category` / `#help_show_hidden` / `#help_tree` の cell 値を help model の envelope に含める (`{help_all_category: bool, help_show_hidden: bool, help_tree: bool}`)、renderer が model から直接読む
- 候補 c: renderer policy 指定オプション語彙 (HIP-META-Q4 で持ち越し) の 1 部として整理、canonical renderer 設計 issue で決定

### Q10-β: help query の path/category 不在時の失敗 envelope (Major 6)

**背景**: DR-113 は definition が合法でも呼び出し側が存在しない path/category を問い合わせただけで definition-error `absent-ref` を返すと規定。これは定義検証と query 実行失敗の**位相の混同** (definition-error は definition 側の欠陥、query 不在は呼び出し側の誤り)。

**選択肢**:

- **候補 a (統括推し)**: help query 固有の失敗 envelope を新設 (query-error `absent-path` / `absent-category`)、definition_error profile と分離。conformance runner は help query の失敗を definition_error と区別して扱う
- 候補 b: 存在しない path/category 呼び出しは **空結果扱い** (help model は空の options/commands で返す)、失敗にしない
- 候補 c: 現状維持 (definition-error `absent-ref`)、位相不整合を許容

### 統括推し

**Q10-α = a** (category_mode capability 入力追加)、**Q10-β = a** (help query 固有の失敗 envelope)。両者とも v1 完備主義準拠、v1 blocker として P2 (fixtures) 着手前に確定要。

## ✅ HIP-META-Q9 (既存 DR から一意導出、裁定不要): preset 暗黙 default と明示 default_fn の衝突

**決着 (2026-07-20)**: worker (dr114-draft) が「同席の明示 default_fn が preset 暗黙 default を置換する」規則を DR-076 (プリセット属性展開の枠) + DR-098 §5 (明示 > 暗黙の思想) から一意導出、DR-114 に含める。**発明でなく既存 DR からの応用**、kawaz 裁定不要。統括推し (i-2) と一致。DR-114 §? (該当節) で明記される。

以下は議論の記録 (参考):

## HIP-META-Q9 元記述 (参考):

### 背景説明

DR-076 (プリセット属性展開) の flag preset は「暗黙 `default: false` を同梱」する。統括 finding §2.3 の合成例で `type: "flag"` + 明示 `default_fn: "borrow:help-full"` を書いたが、これは preset 暗黙 default (`default: false`、= `default_fn: "set:false"` の糖衣) と明示 default_fn (`"borrow:help-full"`) の**衝突**。

Q7-α+一本化 (mid=28+32) で「`default:value` と `default_fn` の相互排他」を裁定済み。preset 暗黙 default も同じ扱いにするかが本 Q の論点。

### 選択肢

- **候補 (i-1)**: preset 暗黙 default (= 暗黙 `default_fn:"set:false"` 相当) を明示 default_fn 併用は definition-error (`invalid-range`)。ユーザは type:flag と明示 default_fn の合成を書けない = HIP-META-Q5 の 5 直交 type 合成例 (help-all-category / help-show-hidden 等の flag) が書けない、実用性欠く
- **候補 (i-2、統括推し)**: **明示 default_fn が preset 暗黙 default を置換する規則を DR-076 準拠で追加**。「preset 暗黙 default_fn + 明示 default_fn が併記された場合、明示が置換」の規則。kuu 思想「明示 > 暗黙」と整合、DR-076 の枠 (プリセット属性展開) に「明示による置換」機構を追加
- 候補 (ii): 例の型を変えて回避 (`type: "bool"` + 明示 `long: [":set:true"]` 等、DR-076 の preset を使わない)。finding §2.3 の合成例だけの問題として先送り、preset 上書きの spec 追加は保留

### 統括推し

**候補 (i-2) 明示置換**、理由:
1. kuu 思想「明示 > 暗黙」と整合 (DR-098 §5 の値源ラダー明示優位と同型)
2. HIP-META-Q5 の 5 直交 type 合成例 (`--help-all` = flag、`default_fn: "borrow"` で連鎖) が自然に書ける
3. DR-076 の枠内に規則追加で完結、大規模設計変更不要

**候補 (ii)** は finding §2.3 例だけの回避で、実運用で flag preset + default_fn 併用の需要 (verbose 系、strict 系、theme 系等の集約 flag) が繰り返し発生する見込み = spec 側の裁定が必要

### 参照

- DR-076 (プリセット属性展開の枠)
- DR-098 §5 (値源ラダー明示序列、「明示 > 暗黙」の思想)
- HIP-META-Q7-α+一本化 (default:value と default_fn の相互排他裁定 mid=28+32)
- HIP-META-Q5 (5 直交 type 合成例が flag preset を使う)
- finding §2.3 (合成例、統括で書き直し要)

## HIP-META-Q7: default_fn の descriptor 軸と失敗意味論 (dr113-review 指摘 Critical 1 + Major 5)

### 背景説明

DR-113 起草時、finding §4.3 の descriptor 設計が **DR-107 (descriptor 直交軸化、`kind` 廃止・`role`/`construction`/`invocation` 軸) と非整合**な旧方言で書かれていた (dr113-review Critical 1)。DR-107 の現 role enum は `installer | filter | collector | type_parser | accumulator | completer | provider` の 7 値で **default_fn 該当なし**。default_fn の descriptor は role 軸に新値を追加する必要があり、その追加は kawaz 裁定が要る。

加えて default_fn の**失敗意味論** (unknown fn / arity 不正 / absent source / cycle / unset source の outcome/error kind) が finding にも DR-113 にも未定義 (dr113-review Major 5)。v1 blocker として P2/P3 前に閉じる必要あり。

### Q7-α: default_fn の role 軸への追加方式 (mid=28 = a 承認)

- **✅ 候補 a 承認 (mid=28)**: `role` enum に新値 **`"default_fn"`** を追加
- **追加確定 (mid=28 + mid=32 補正)**: **default_fn 一本化**、`default: value` / `env: "VAR"` / `inherit: true` は全て default_fn の糖衣 (finding §4.4 参照)。**fn 名は `set`** (Q8=A 統合で variant DSL `":set:X"` と座が同じになり別名不要、mid=32 kawaz 指摘で `constant` → `set` に逆訂正)。wire form 記法は不変、破壊的でない

### Q7-β: default_fn descriptor の軸 const 固定案

`role: "default_fn"` 追加時の各軸 (統括推し暫定):

| 軸 | 値 | 根拠 |
|---|---|---|
| `construction` | `"static" | "factory"` (自由) | builtin fn 6 種は static、拡張 fn は factory (config を取る computed fn 等) |
| `io_type` | 必須、`input` は `"value"` (fn ごと自由)、`output` は `"same_as_target"` 相当の値型 | fn は arbitrary value を返す (target option の型に合わせる) |
| `output_mode` | 禁止 (default 席は「入力保持」概念が無い、fn は新規値を生成) | provider と同じ扱い |
| `fallibility` | 必須、`total` or `reject` (fn ごと自由) | `borrow` は absent source で reject、`constant` は total 等 |
| `invocation` | 必須、`encoding: "colon_args"` 固定 (filter/variant DSL と同じ書式) | `default_fn: "fn:args"` の DSL |
| `owns` / `observes` | 禁止 | installer 軸 |
| `config` | `construction:factory` なら必須、`static` なら禁止 | DR-107 §7 の filter と同型 |
| `reasons` | 必須 (fallibility=reject 時)、`fallibility=total` なら空 | fn の失敗 reason 語彙 |

### Q7-γ: default_fn の失敗意味論 (mid=32 で 1/2/3/6 承認、4/5 = kawaz 質問による)

以下を DR-113 (or 追加 DR) で確定する必要:

1. **✅ unknown fn 参照** (`default_fn: "unknown:args"`、descriptor registry に無い): definition-error kind = `unknown-vocab` (DR-101 と同型) を推し
2. **✅ arity/type 不正** (`default_fn: "borrow:a:b"` = borrow は arg 1 個なのに 2 個): definition-error kind = `invalid-argument` (DR-085 と同型) を推し
3. **✅ absent source** (`default_fn: "borrow:X"` で X が値未持ち): fn の reason で reject 相当。DR-088「遅延評価でデフォルト解決したらやっぱりありませんでした、になったらそのノードは unset のまま = committed=false に戻されて落ちる」= **fallback を持たない default_fn の absent は unset のまま** を推し
6. **✅ 依存グラフ解決順**: DR-087 の遅延解決に載せる。位相順で回す

### Q7-γ-45 補足: borrow の ctx 受け取り方式 (kawaz 質問 mid=32)

「4 循環依存」「5 unset source」の判定に絡む機構論。kawaz mid=32 質問:「parse コンテキスト参照が必要な borrow は組み込み専用の特殊扱いで循環チェックできる、という立て付け? or default_fn に渡ってくる引数として colon 引数配列でなく sourceFnCtx みたいなのを経由して取得するイメージ、どちら想定?」

**候補 a (組み込み専用の特殊扱い)**: borrow は kuu 組み込み専用、内部で parse context を参照。3rd party fn は colon-args のみで完結、循環チェックは borrow 限定機構

**候補 b (推し、統括推し) — 全 fn が sourceFnCtx を受け取る universal ABI**:
- 全 default_fn は `(args: [...], ctx: SourceFnCtx) → Result<Value, Reason>` の同一 ABI
- ctx API: `ctx.borrow_option(name)` / `ctx.env(var)` / `ctx.system(key)` 等
- descriptor に **`observes: ["option:<name>", "env:<var>", "system:<key>"]` の宣言軸** を追加 (DR-107 の installer 軸 `observes` を default_fn にも適用)
- observes に載せた依存が循環グラフの edge、循環は definition-error `kind=circular-ref` (§Q7-γ 4)
- 静的 name 参照は observes 集合から依存グラフ構築 (DR-087 位相順)、動的 name 参照 (稀) は runtime エラーとして扱う

推し理由:
1. **対称性**: 全 fn 同 ABI、descriptor で observes 宣言 = 静的解析可能
2. **3rd party 拡張の対称性**: サードパーティ fn も borrow 相当を書ける (DR-094 namespace 思想と整合)
3. **循環チェックの universal 化**: DR-088 遅延解決グラフに全 fn が乗る = 統一機構
4. **Q8=A universal fn 統合との整合**: universal fn ABI の一部として ctx 受け取り

具体例:

| fn | args | observes | 実装 |
|---|---|---|---|
| `borrow:name` | `[name]` | `["option:<name>"]` | ctx.borrow_option(name) |
| `env:VAR` | `[VAR]` | `["env:VAR"]` | ctx.env(VAR) |
| `set:X` (`constant` の後継、mid=32) | `[X]` | `[]` | X をそのまま返す (ctx 不要) |
| `computed:git_branch` | `[git_branch]` | `["system:git_branch"]` | ctx.system(git_branch) |
| `uuid:v4` | `[v4]` | `["system:uuid_gen"]` | ctx.system(uuid_gen) |

**5 unset source (最終的に何も無い)**: 3 と同じ扱い (unset で落ちる、DR-088)。observes に載っていても、依存先が全て unset なら本要素も unset で落ちる (位相順で伝播)。

### Q7-γ 選択肢

- **候補 b (推し)**: 全 fn が SourceFnCtx を受け取る universal ABI + descriptor に observes 軸追加。循環チェック universal
- 候補 a: 組み込み専用の borrow 特殊扱い、3rd party は colon-args のみ

**Q8=A (universal fn 統合) を承認したなら、Q7-γ も (b) が整合的**。

### 参照

- **DR-107** (descriptor 直交軸、`role`/`construction`/`invocation` 軸、7 role 値の初期集合)
- DR-087 (default 遅延解決、依存グラフ、位相順)
- DR-088 (宣言された値源はデフォルトの存在、default_fn の概念既出)
- DR-101 (unknown-vocab)
- DR-085 (invalid-argument)
- DR-082 (definition-error 分類、invalid-range/circular-ref)
- schema/descriptor.schema.json (P2 波及、default_fn 追加要)
- schema/builtin-descriptors.json (P2 波及、builtin fn 6 種の追加要)
- dr113-review verdict (Critical 1 + Major 5)

## HIP-META-Q4: 複合値構造 option の help model 表現 (裁定確定 mid=20)

**裁定サマリ**: 本体 = a (value_structure tree) 承認、付録 2 (共有型 type_ref + types セクション) mid=20 で承認。レンダラ側 (pipe 曖昧回避 / 集約 vs inline / 詳細説明) は canonical レンダラ設計 issue に持ち越し、「レンダラ policy 指定オプション語彙」を追加して選択可能に (kawaz mid=20 落とし所)。以下は議論の記録 (次のセッション参照用)。

### kawaz 追補 (mid=13)

`--color` の 3 引数 (`--color r g b`) だけでなく、`colorname` との or (`--color red` or `--color 255 0 0`) も kuu 背骨 (or/seq/repeat 任意ネスト) で書ける仕様。help model で表現できないと素材不足。

### kawaz 提示 (mid=14)

他 CLI パーサに前例が無い kuu 独自の悩みと確認 (統括の他 CLI 調査でも or 分岐値 option を model schema で扱う CLI パーサは無し、全て custom parser 内に隠蔽)。

kawaz レンダラ表示案 (canonical レンダラの候補):

1. `--color <COLOR_NAME|R G B>` (1 行 pipe 分岐)
2. `--color <COLOR_NAME>` / `       <R G B>` (2 行、value_name のみ)
3. `--color <COLOR_NAME|RGB>` / `        COLOR_NAME:  cssカラー名` / `        RGB: R G B  RGBカラー0-255の数字3つ。e.g. 255 0 0` (usage 名 + 詳細説明)

### 選択肢

- **候補 a (推し)**: options entry に `value_structure` フィールドを追加、tree 形は AST の or/seq/repeat と同型で表現力を保存。レンダラは tree を再帰的にトラバースして usage/help を組む。kawaz 3 案はレンダラ policy の候補 = **model は素材のみ、canonical レンダラで既定案を決める**

  ```json
  {
    "spellings": ["--color"],
    "value_structure": {
      "or": [
        {"single": {"value_name": "COLOR_NAME", "values_enum": ["red", "green", ...]}},
        {"seq": [
          {"single": {"value_name": "R", "type": "number"}},
          {"single": {"value_name": "G", "type": "number"}},
          {"single": {"value_name": "B", "type": "number"}}
        ]}
      ]
    }
  }
  ```

- 候補 b: `value_names: [...]` 平坦 list (単純複数値のみ、or 分岐は非対応) — kuu spec の or 表現力を model が捨てる**縮小推し (v1 完備主義違反)**、不採用側
- 候補 c: 現状維持 (value_name 1 個)、複雑構造はレンダラが AST を直接読む — 素材と policy 分離の原則を破る、DR-112 骨格違反

### 付録: レンダラ usage 表記の曖昧回避 (kawaz 指摘 mid=16)

kawaz 懸念: `<COLOR_NAME|R G B>` は 2 通りに読める曖昧表記 (pipe の precedence 不明示):

- **意図 A** (or 分岐): `<COLOR_NAME> | <R G B>` = COLOR_NAME 単独 or R G B の seq 3 個
- **意図 B** (seq 内 or): `<<COLOR_NAME|R> <G> <B>>` = 1 個目 (COLOR_NAME or R) + G + B の seq 3 個

これは **model 側** (value_structure tree、or/seq/repeat 明示) の話**ではなく**、**canonical レンダラが tree を usage 表記に落とす際の表記法** の議論。model 自体は or/seq ノードが明示されているので曖昧を排除できる。

canonical レンダラ設計 issue (別立て、DR-112 波及節「canonical レンダラ」で提示予定) で以下の policy を定める:

- **候補 1 (明示括弧強制)**: `<COLOR_NAME | <R G B>>` — or の各分岐を `<...>` で明示、tree 構造を表記に反映。単純 or (葉が single のみ) の推し
- **候補 2 (詳細説明形式、kawaz mid=14 案 3)**:

  ```
  --color <VALUE>
    VALUE:
      <COLOR_NAME>       色名 (red, green, ...)
      <R> <G> <B>        RGB (0-255 の数値 3 個)
  ```

  曖昧さゼロ、複雑な value_structure (seq/repeat のネスト混在) の推し
- 候補 3 (2 行分離、kawaz mid=14 案 2): `--color <COLOR_NAME>` / `       <R G B>` — シンプルだが「or」であることが表記から読みにくい (連続の意 or 分岐の意 が不明)

統括推し (canonical レンダラ既定 policy): **tree の複雑度で使い分ける** — 単純 or は候補 1、複雑ネストは候補 2。3 は不採用側 (or が読めない)

**本付録は HIP-META-Q4 の model 側裁定 (value_structure tree = a) に影響しない** — model は tree で表現力保存、レンダラ policy は canonical レンダラ設計 issue で決める。ここは統括の推しを記録するにとどめる。

### 付録 2: definitions で構造型を共有する場合の model + レンダラ設計 (kawaz 提示 mid=17)

kawaz が示した実用例: kuu の既存機構 (`definitions` + `ref`) で構造型を定義し、複数の option がそれを参照する。共有型は help でも集約表示するのが自然:

```
--fg COLOR
--bg COLOR
--level-colors INFO WARN DEBUG

Types:
  COLOR, INFO, WARN, DEBUG:
    <COLOR_NAME>       色名 (red, green, ...)
    <R> <G> <B>        RGB (0-255 の数値 3 個)
```

定義側 (推測形):

```json
{
  "definitions": {
    "color_value": {
      "value_name": "COLOR",
      "or": [
        {"value_name": "COLOR_NAME", "values": ["red", "green", ...]},
        {"seq": [{"value_name": "R", "type": "number"}, {"value_name": "G", "type": "number"}, {"value_name": "B", "type": "number"}]}
      ]
    }
  },
  "options": [
    {"name": "fg", "long": true, "ref": "color_value"},
    {"name": "bg", "long": true, "ref": "color_value"},
    {"name": "level-colors", "long": true, "seq": [
      {"ref": "color_value", "value_name": "INFO"},
      {"ref": "color_value", "value_name": "WARN"},
      {"ref": "color_value", "value_name": "DEBUG"}
    ]}
  ]
}
```

これは value_structure tree 設計を **type_ref ノード + model トップの types セクション** に拡張する必要:

**model 側の追加**:

1. **value_structure tree に `type_ref` ノード追加**:

   ```json
   {"type_ref": "color_value", "value_name": "INFO"}
   ```

   - `type_ref` は definitions への参照 (kuu 既存 `ref` 機構)
   - `value_name` は**参照箇所固有の名前**の上書き (`level-colors` の 3 引数を `INFO WARN DEBUG` と個別命名する用)。省略時は type 定義側の value_name (`COLOR`) を使う

2. **help model のトップに `types` セクション追加** (参照されている definitions を集約射影):

   ```json
   {
     "command_path": [...],
     "usage": {...},
     "types": [
       {
         "id": "color_value",
         "value_structure": {
           "or": [...]
         },
         "help": "...",
         "used_as": ["COLOR", "INFO", "WARN", "DEBUG"]  // 参照箇所の value_name 一覧
       }
     ],
     "options": [...],
     ...
   }
   ```

**レンダラ policy** (canonical レンダラ設計 issue で決定):

- type_ref ノードの**参照回数**を集計 (types セクションの `used_as` で判別可能)
- **参照回数 ≥ 2**: usage 行は value_name 短縮表記 (`COLOR`, `INFO WARN DEBUG`)、末尾 `Types:` セクションで詳細展開。**共有型の重複展開を防ぐ**
- **参照回数 1**: `types` セクションに載せず、value_structure を inline 展開する (統一感重視、統括推し) or type_ref のまま表示 (省略統一)
- kawaz 例の `COLOR, INFO, WARN, DEBUG:` は 4 名前を集約表示するパターン (canonical レンダラの既定 policy)

**HIP-META-Q4 との整合**:

value_structure tree = a (Q4 の推し) に **type_ref ノード対応** を追加する形で拡張。model schema の骨格 (value_structure が or/seq/repeat/single/type_ref の 5 種ノードの tree) は同じ。types セクションは model トップの新規フィールド。

**kuu の既存機構 (definitions + ref) との整合**:

kuu spec は既に definitions (DR-063 §1) と ref を持つ = help model の type_ref はこれの直接射影。**新規語彙は「model 側の type_ref ノード名 + types セクション」のみ**、definition 側の wire form 側は既存機構をそのまま使う。

## HIP-Q バッチ (発生順)

> **注**: HIP-META-Q1 = a 裁定に伴う DR-112 全体撤回 + 立て直しを待つため、HIP-Q1〜Q4 の議論は保留。新 DR (help_installer 設計プラン起草後の正本) の記述に応じて再定式化する。旧 HIP-Q1〜Q7 のうち Q2/Q5/Q6/Q7 は実装追随 issue に、Q3 は drift 訂正、Q1/Q4 は新 DR に取り込みで消化される見込み。
