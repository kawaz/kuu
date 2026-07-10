# DR-080 merge accumulator の実装サイクル完走

kawaz 裁定の転写 (前サイクルの journal 参照) を受けた DR-080 merge accumulator の spec fixture
+ kuu.mbt 実装サイクル。issue `list-merge-piece-op-vocabulary` が resolved・archive 済みで完走した。

## 成果物

- **spec fixture 5本 / 23 case**: `multiple-parse/merge-{basic,splice-remove,escape,first-firing,
  no-separator}.json`。DR-080 §4 の canonical 14例 + escape 縁の字句3 + env 初回発火×merge 1 +
  accumulator=append でのマーカー非適用対照1 + separator なし縮退4
- **kuu.mbt commit 409d1142857a553b0f389c636175033dc176755e** (本体): `classify_merge_piece`
  (piece 全体一致の `-operand`/`@`/`+escape` 判定) を eval.mbt に、`resolve_merge_accum`
  (at_pos グルーピング + L→R 評価 + old_values 持ち回り) を resolve.mbt に追加。conformance
  decoded=162 / ran_cases=422 / skipped=0 / mismatches=0、moon test 191 本全 pass
- **kuu.mbt commit 9cfbd93cb2eba55034f058acf5130204e968d821** (縮退対応): separator なし merge
  宣言でもマーカー語彙が効くよう修正 (下記「codex Medium」参照)。conformance decoded=163 /
  ran_cases=426 / skipped=0 / mismatches=0、moon test 195 本全 pass

両commit ともCI success。

## サイクル中の裁定: effects の piece op 語彙

DR-080 本体は「effects oracle での piece op の見せ方は fixture 設計時に確定する」を残論点
として明記していた (issue 本文にも記載)。今サイクルで worker (spec-rename) が fixture 化する
過程で以下を裁定・確定させた (kawaz への遡及確認事項として team-lead が引き継ぎ):

- add piece → `{op:"set", operand:<parse済み値>}`、remove piece → `{op:"remove",
  operand:<parse済み値>}`、splice piece → `{op:"splice"}` (operand なし)。並びは piece の
  L→R 順で effects の順序規範に乗せる
- **暗黙補完される先頭 `@` は effects に載せない** — マーカーを含む発火で明示 `@` が無い場合に
  DR-080 §3 の評価規則が補う `@` は、実際の CLI 入力ではなく評価規則の産物なので、effects
  (= CLI 発火の観測記録) には現れず、その効果は result 面 (old の splice 結果) にのみ観測される。
  DR-045 の「効果は CLI 発火に対応する観測可能データ、評価の正規化形ではない」という原則に忠実な
  区別。remove の双方向性 (確定済み splice への遡及) についても同じ原則で、effects は実入力
  piece 順のまま記録し、遡及の効果は result にのみ現れる

## 実装形の噛み合い

eval 層 (`classify_merge_piece`) は long space form / eq-split / short cluster の3経路すべてに
merge フラグを配線し、payload の型 parse は add piece と共有する (`piece_filters` → 型 parse の
経路は merge/非merge で分岐しない)。resolve 層 (`resolve_merge_accum`) は同一 `at_pos` (1回の
CLI 発火) の piece 列をグルーピングしてから `eval_merge_pieces` を適用し、発火ごとに確定状態を
置換再計算する。初回発火の old 参照と op=default の「書き換え済み default」参照は、DR-081 で
新設した `resolve_ladder_below_cli` を両方から呼ぶ形で再利用できた — 別サイクルで確定した
設計が想定外の箇所で噛み合った実例。

## fixture 記述漏れ5件の検出と修正

impl worker (kuu.mbt 側) の RED 解析で、spec-rename worker が作成した merge fixture 5 case
(`merge-escape.json` 3件、`merge-first-firing.json` 2件) に DR-051 §2b の一様配列規約違反が
見つかった — 同一 definition 内に複数の multiple 要素があるとき、未発火側の multiple 要素の
結果キーが `[]` として明示されておらず省略されていた (例: `merge-escape.json` の definition は
`fields` と `nums` の2要素を持つが、`fields` のみを発火させる case の `result` に `nums: []` が
欠落していた)。反復系要素は0回発火でも absent にならず `[]` になる (DR-044/051) ため、これは
fixture 側の記述漏れであって仕様のギャップではない。impl worker がまず scratch パッチで
「実装は正しく `[]` を返すが fixture の期待値が欠落している」ことを検証してから team-lead に
報告し、team-lead が5 case とも `result` に不足キーを追記して修正した (fixtures pin
6e6b5ab1de8923e5d547b705a476f4c51ef7772d)。

harness 側でも同種の gap が見つかった: `scope_needs_default_ladder` が merge 宣言要素を検知せず
raw binds を直接 fold する迂回路を通ってしまい、Remove/Splice 効果の誤 fold と Splice
placeholder の混入を引き起こしうる状態だった。こちらも同じ修正コミットで閉じている。

## codex レビュー: Medium 1件 (separator なし merge の縮退)

本体実装の codex レビューで Medium 1件「separator なし merge 宣言のマーカー適用が未検証領域」
と指摘された (他5観点は指摘なし)。DR-034 §6.3 の「multiple 無しは常に長さ1の `[piece]`」という
既存の縮退原則から、separator を省略した merge 宣言も同じ長さ1縮退に落ちるはずと導出し、
`SepArg` の separator を `String?` 化して `None` は分割せず `[tok]` にする形でコードへそのまま
構造化した (= 縮退を文字通りコードの型に落とす設計)。value_prim / eq-split / short の3経路の
gate を「separator あり」から「separator あり or merge」へ拡張し、非merge要素の挙動は無変更。
spec 側は `merge-no-separator.json` (4 case) をミニサイクルで即日追加し、fixture と実装を
同日中に解消できた。

## 教訓: resolve_wbtest の手組み Binding では検出できない構造問題

separator なし merge の配線 gap は、`resolve_wbtest` が手組みの `Binding` を直接与えるスタイルの
テストでは検出できなかった — installer (定義の lowering) から eval (matcher 経路) までを経由
しないと、経路ごとの gate 条件の欠落は現れない。この教訓から `parse_definition → parse →
resolve_scope` を一気通貫で通す wbtest 4本を新設し、以後同種の配線 gap を単体テストの層だけで
見逃さない体制にした。

## 最終数値

conformance: decoded=163 / ran_cases=426 / skipped=0 / mismatches=0。moon test 195 本全 pass。

## 関連

- DR-080 (`docs/decisions/DR-080-merge-accumulator.md`) / DR-081 (`resolve_ladder_below_cli` の
  再利用元) / DR-034 §6.3 (multiple 無し縮退、separator なし対応の導出元) / DR-044/051 (一様配列
  規約、fixture 記述漏れの根拠) / DR-045 (効果は CLI 発火の観測データ、暗黙 @ 非掲載の根拠)
- issue `list-merge-piece-op-vocabulary` (resolved、archive 済み — 本サイクルで完走)
- 前回 journal: `2026-07-10-dr080-082-rulings-and-followup.md` (DR-080 裁定の転写元、
  「次サイクル: merge の実装サイクルが最後の大物」として引き継がれた本題)
