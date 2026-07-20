# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

(現在、裁定待ちの質問はありません)

## 👺 API-Q2: 公開面の残り命名 3 点 (audit 保留分)

**背景**: API 監査 (2026-07-20) の改修 17 commits で Critical/Major は消化済み。命名裁定が欲しい小粒だけ保留していた分。

- **(a) `RVal` の改名**: result 射影の値型 (`Scalar/Array/Object` を持つ)。R が何か名前から読めない。候補: `ResultValue` (素直) / `ResultShape` / 現状維持。**統括推し = `ResultValue`**
- **(b) `Cand` → `Candidate`、`CandMeta` → `CandidateMeta`、`TermHint::Cont` → `Continue`**: 補完 API の省略名を展開。**統括推し = 展開する** (補完は公開契約の顔、省略の節約価値なし)
- **(c) `Node::DdSat` / `CmdSat` / `DdMatchSat` の "Sat" 語**: satisfied の略。raw 契約層 (拡張実装者向け) だが読めない。候補: `DdSatisfied` 等へ展開 / 現状維持 (raw 層は許容)。**統括推し = 展開** (拡張実装者も第三者)

**回答形式**: `API-Q2=(a)ResultValue,(b)yes,(c)yes` 等、部分採用可。
