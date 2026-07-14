# 2026-07-14 ACC 裁定ラッシュ (DR-105) + worker 世代交代の運用知見

DR-104 (complete クエリ) サイクルと並行して進んだ、accumulator/ARRAY filter registry まわりの
裁定バッチ。codex レビュー #1 の 1 指摘 (C-1) から出発し、fallibility 全数調査と言語横断の動詞
マトリクス調査を経て何度も案が転回した末に DR-105 として着地した。同じ日、長命 worker が
複数サイクルをまたいで context 枯渇する事故が 2 回発生し、worker 運用を「サイクル単位の
fresh spawn」へ切り替える教訓も生まれた。

## 発端: CR-Q1 (codex レビュー #1 の C-1 指摘)

DR-102 (`cell_filters` → `final_filters`/`accum_filters` 分割) の post-land codex レビュー #1 が、
`accum_filters` (ARRAY filter registry) の reject 規定と実態の乖離を C-1 として指摘した:
DR-102 §4 と CONFORMANCE は `accum_filters` の reject 時の `args` 位置帰属を規定しているが、
ARRAY filter registry の実態は `unique` (Transform、常に成功) のみで **reject を発生させる住人が
存在しない** — 旧 `cell_filters` 時代から継承した規定と実態の乖離が、DR-102 の属性分割で
可視化された形だった。

`docs/QUESTIONS.md` の CR-Q1 として、(a) `ArrayFilterDescriptor` を fallible 化する / (b) ARRAY
registry を「transform 専用」として正式に契約に昇格し reject 規定を条件付き化・削除する、の
二択で提示したところ、kawaz の方向出しは前向きだった:「Result なしは初期に綺麗だからで選んだ
だけ。現実に即さないなら他でも生やしてるし Result を返しても良い」。ただし判断材料として
3 点の調査を統括に指示:

1. filter 系装置の fallibility 全数調査 (失敗を返せない種別は他に何があるか、どちらが優勢か)
2. flat しない追加 (`T[][]`) の組み込み手段の有無
3. `append` 語彙の妥当性 (Python `append`/`extend`、JS `push`/`concat` のように flat 有無で
   言語間の意味が割れる)

## fallibility 全数調査と語彙探索の紆余曲折

調査結果 (セッション scratchpad `accum-fallibility-vocab-recon.md`) が明らかにした勢力図は
**「filter 席は fallible 優勢 / 構造畳み装置 (accumulator/collector) は total が全員」** —
DR-082 が確立した「構造的妥当性は definition-error へ、runtime は total」パターンの体系的な
再確認だった。`T[][]` は `ref × repeat × append` で既に表現可能 (DR-084 §2 pin 済み) だが、
scalar 側は separator が piece に潰すため同じ手は使えない。

ここから accumulator 語彙の改名案が何度も転回した:

1. **ACC-Q1/Q2**: `append` → `push` (JS/Rust/Ruby/MoonBit で「1 個積む」が割れない、MoonBit 自身の
   `Array::append` が「展開結合」で kuu の `append` と正反対という直接衝突の解消) + 展開結合用に
   `extend` を新設 (Python/Rust/MoonBit で「展開」が割れない)
2. **ACC-Q1b**: kawaz の再検討 (extend は言語非依存文脈で別義リスク) を受け `push` + `spread` 案に
   更新。spread は「展開して積む」が語に内在し深さ曖昧性も文字列連想もない、という統括の推し
3. **ACC-Q1c**: 実物確認で前提が修正された — **展開結合は既存 accumulator `flatten` (DR-036、
   `[T,[T,…]] → T[]`) が既に担っており新設は不要**と判明。話は既存ペア `{append / flatten}` の
   改名に縮小し、`push_one`/`push_each` (one = 丸ごと1要素、each = 各要素を展開) 案が浮上
4. **ACC-Q1d (最終)**: kawaz 案が全てを覆した——「語彙は `append` を維持し、`flatten` 属性
   (ダイヤル) を足す」。統括はこれに賛成し、副産物として**既存の独立 `flatten` accumulator
   (DR-036) は `append` + `flatten:true` と同義なので統合して廃止**という整理を追加提案、
   Yes 裁定でそのまま確定した

「言語横断調査で防御した語彙が調査結果そのものを理由に覆る」という構図は前日の `argv` 命名論争
(`docs/journal/2026-07-14-completion-design-rulings.md` 参照) と同型で、この日 2 度目の発生になる。
push_one/push_each 案も「one/each がどちらも『一つずつ』に聞こえる」という理由で最終的に棄却され、
`append` を動かさず属性を 1 つ足すだけ、という最小の変更が残った。

## DR-105 が確定した内容

`docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md`:

1. **`flatten` は `append` accumulator のダイヤル** (既定 `false`)。`true` で発火値が配列なら
   その要素を 1 段だけ積む (深さは spec で固定、多段展開はしない)
2. **`flatten:true` は `append` 専用** — 他 accumulator (`merge`/`override`/`increment`/`kv_map`)
   への宣言は kind=`invalid-range` で reject (DR-082 §2 の確立パターン)。**merge との整理**
   (ACC-Q4 裁定に併記、kawaz 確認): `merge` の入力は常に scalar piece であり (`merge × ref` は
   DR-084 §3 が definition-error で既に封じ済み)、配列発火値が `merge` に到達する経路が構造的に
   存在しない。したがって `flatten` を `merge` にも許すという選択肢は最初から意味を持たず、
   `append` 限定は妥協ではなく入力形の違いがそのまま帰結する自然な線引きになる
3. **旧 `flatten` accumulator (DR-036) は `append` + `flatten:true` に統合し廃止**。DR-036/DR-043 に
   Superseded 節を追記
4. **ARRAY filter registry (`accum_filters`) の fallibility 確立** — scalar filter registry と同じ
   Validate/Transform 二分法を採用。DR-102 §4 が既に規定していた reject 位置帰属 (`args.length`) が
   本 DR で初めて実効化される
5. **`length_range:min:max` 新設** (ACC-Q4) — 累積後の配列長を検証する ARRAY registry 最初の
   Validate。`min` 未満 = `too_short`、`max` 超過 = `too_long`

採用しなかった案 (DR-105「採用しなかった案」節): accumulator 語彙の単独動詞改名 (`push`/`spread`/
`extend` 系)、`accum_filters` を transform 専用に固定する案 (fallible 化撤回)、`flatten` の多段展開
対応 (`flatten: 2` 等)。

## DR-105 の実装反映は次サイクル送り (意図的な一時的不整合)

DR-105 は **設計 (DR 文書 + schema + REFERENCE/LOWERING 追随) は本サイクルで完了**したが、
fixture 書き換えと kuu.mbt 実装追随は保留した。理由は `mbt-dr102` worker による complete 実装の
live 検証が並行進行中で、同一 workspace への同時書き込みを避ける 1 ws 1 writer 原則
(`docs/QUESTIONS.md` 運用と同じ思想) を優先したため。結果として、この日の main は
**意図的な一時的不整合**を抱えたまま CI green になっている: `fixtures/lowering/repeat/basic.json`
等の lowering fixture 2 本と kuu.mbt 実装はまだ旧形 (`"accumulator": "flatten"`) のままで、
fixture と実装が旧形どうしで整合しているから CI が通っている状態。解消は issue
`2026-07-14-dr-105-fixture-impl-followup` が追跡する (書き換え対象 fixture 一覧は issue 本文に
収録済み)。

## worker 世代交代: 長命 worker の context 枯渇と fresh spawn 原則

この日、`spec-dr102` と `mbt-dr102` の 2 つの worker が、複数サイクルをまたいで働かせた結果
context 枯渇で応答不能になる事故が起きた。DR-102/103 サイクルから DR-104/105 サイクルまで
同一 worker に持ち越そうとしたのが直接の原因で、以降は **サイクル単位の fresh spawn を基本**にする
運用へ切り替えた:

- spawn の型: Agent tool、`subagent_type=sonnet5-worker-high`、`name` 付き、`run_in_background: true`
- プロンプトに毎回焼き込む事項: リポ絶対パス / 唯一 writer である旨 / push 禁止 (統括がロックステップで
  行う) / path 指定 commit 必須 / Bash は毎回サブシェル化 / 先に読ませる DR・fixture の実パス /
  期待値は spec から導出する (一般 CLI 慣習で裁かない) / 矛盾や導出不能に気づいたら黙って進めず
  停止報告 / 完了報告は fresh な実出力をそのまま貼らせる
- 実績パターン: spec 側 (DR 起草 + fixture) と kuu.mbt 側 (実装) は別 worker に分離、両リポは並列可・
  同一リポ内は直列 (1 ws 1 writer)

副産物として、fixture の期待値を理論導出した箇所は実装検証で覆ることが多いという経験則も
この日確立した。「fixture の期待値を導出 → 実装で通して mismatch の内訳を報告 → 統括裁定 →
fixture または実装のどちらを直すか決める」という **mismatch レビュー方式**が、DR-104 サイクルの
2 件 (`docs/journal/2026-07-14-dr104-complete-cycle.md` 参照) を含め、本セッション全体で
fixture 誤り 5 件・実装バグ 3 件をこの方式で発見する結果になった。worker の完了報告と idle 通知が
頻繁に交錯する問題も見つかっており、無報告の idle はリポを直接確認するのが最速、再同期は
message ID 言及での再送、という対処が固まった。

## 数値・関連

conformance 最終値: **decoded=239 / ran_cases=605 / skipped=0 / mismatches=0**、moon test 324
(DR-104 サイクルと共通の最終値 — 両サイクルは同日連続して進み、最後のロックステップ push
`befb8a85` の時点で揃った数値)。spec main = `befb8a85`、kuu.mbt main = `d648fd63`。

- DR-105 (`docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md`)
- DR-036 (accumulators registry — `flatten` エントリの出所、Superseded 節追記対象)
- DR-043 (repeat と multiple の分離 — 旧 `flatten` accumulator 登録の出所)
- DR-084 §3 (`merge × ref` の definition-error — `flatten` × 他 accumulator の invalid-range 判定の先例)
- DR-102 (`final_filters`/`accum_filters` 属性分割 — ARRAY filter registry の座席定義)
- DR-082 (definition-error kind 分類 — invalid-range パターン)
- issue `2026-07-14-dr-105-fixture-impl-followup` (実装反映の追跡)
- docs/QUESTIONS.md CR-Q1 → ACC-Q1〜Q4 (裁定の記録、削除済み履歴)
