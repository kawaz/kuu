# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## RG-Q1: required (単項/required_group member) の bool 型充足は「解決後 true」か「値の有無」か

DR-103 起草中の発見 (spec worker)。flag preset は暗黙 default:false を持つため、「値の有無 (default 込み)」判定だと **required:true を flag に付けても常に充足 (vacuous no-op)** — required_group の本命ユースケース (tar の flag 群 ALO) が機能しない。**現実装は vacuous を実測確認済み** (未発火 required flag が ok になる、統括 live probe 2026-07-14)。

landed テキストは両読みが可能な内部緊張を持つ:
- docs/decisions/DR-047-*.md §5 の表 + DR-093 §1 の bullet: required = 値の有無 (DR-047 §5 不変) → **A 読み (presence、vacuous 容認)**
- DR-093 §1 の先例段落: requires 目的語の bool-truth 判定を「**bool 型の充足定義**」として型委譲の枠に一般化 → **B 読み (bool は解決後 true、聞き手不問)**

選択肢:
- **RG-a (worker+統括推し)**: bool 型の充足定義 (解決後 true、値源不問) を required 単項 / required_group member にも一様適用。required×flag は「明示 true の強制」(--yes ゲート等) という意味を獲得。DR-047 §5 明確化の vacuous 論拠 (「制約が黙って no-op になる」) がそのまま適用され、requires 目的語との非対称も解消。新 DR (104) で pin + DR-047 §5 表 / DR-093 §1 bullet に refine 注記 + DESIGN §9.1 に bool bullet + kuu.mbt 修正 + fixture pin。既存 fixture の flip なし (確認済み)
- **RG-b**: presence のまま維持。required×bool は vacuous 容認 (lint の関心)。tar 型 required_group は plain bool (暗黙 default なし) member で書く運用 — flag preset を使うと黙って no-op になる罠が残る

参照: docs/decisions/DR-093-required-requires-type-delegation*.md §1 / DR-047-*.md §5 (明確化 2026-07-09) / fixtures/constraints-parse/requires-bool-target.json (目的語側の truth-dispatch pin)

## COMP-Q1b: complete fixture の入力フィールド名の最終形 (小)

COMP-Q1〜Q5 は裁定済み (2026-07-14): Q1 = before/after 系で承認 / Q2 = `candidates[].meta` は必須 (候補同一性の成分ゆえ判定に必要) / Q3 = completer 名フィールドを wire に持たせ、fixture は「書けば検証」の opt-in / Q5 = 「7 op 表と無関係」の明示文を書いてよい。Q4 は kawaz の逆質問 (候補 dedup の path 無視は spec pin か / 制約の中間結果で候補が変わるべきでは) — 統括が調査中、提案を持って戻る。

残る小裁定: Q1 承認時の kawaz 不満 (「before/after の対象が何か分かりにくい — 前後の引数？word 中の前後？」) は実際に曖昧性の証左なので:

- **COMP-Q1b-a** (統括推し): `argv_before` / `argv_after` — parse fixture の `argv` と語彙が繋がり「引数トークン列の前後」であることが自己説明的。word 内前後 (将来の word/word_suffix 拡張) との衝突も構造的に回避
- **COMP-Q1b-b**: `before` / `after` のまま (DESIGN §15.13 のシグネチャ語彙と一致)

## V1-Q1〜Q3: v1.0.0 発行条件まわり

正本: **docs/findings/2026-07-13-v1-readiness-audit.md §4** (各 Q の詳細)。

- **V1-Q1** (最優先): DR-068「fixture 全 pass」の範囲 — (a) parse-core のみ / (b) 4 プロファイル全部。統括推し = 「バンドル現存 fixture の参照実装 green」(現在 210/210 で充足) と整理し、プロファイルは第三者実装の準拠宣言単位と切り分ける小 DR で閉じる。参照: docs/decisions/DR-068-json-schema-lifecycle.md / DR-069-conformance-profiles.md / docs/issue/archive/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q4 の過去 3 案)
- **V1-Q2**: lowering 単独 golden 欠落 6 種 (command/global/constraint/alias/inheritable/config) は意図的省略か拡充漏れか。参照: docs/decisions/DR-070-lower-fixture-format.md / fixtures/lowering/
- **V1-Q3**: complete フォーマット確定 DR の起票時期 (V1-Q1 と COMP-Q の裁定に従属)
