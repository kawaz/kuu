# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## RGV-Q1: required 系の flag/bool member 充足を bool-truth に変えるか (RG-Q1 の再確認)

kawaz の疑義 (2026-07-14 夜): 「flag フィールドは値の充足ではなく true を判断に使うべきでは？」

現状の記録 (統括検証済み、間違いは未発見):

- `requires` 目的語が bool/flag → **解決後の値が true** (kawaz 裁定 2026-07-09、DR-047 §5 明確化、`fixtures/constraints-parse/requires-bool-target.json`)
- `required` / `required_group` → **値の有無** (default 込み、型委譲 DR-093)。flag member は暗黙 default false で常時充足 = vacuous 合法 (**RG-Q1 = kawaz 裁定 2026-07-14**、DR-103 §7、`fixtures/complete/constraint-required-group-vacuous-flag.json` 他で pin)
- bool-truth の一様適用案 (RG-a) は DR-103「採用しなかった案 (4)」に**統括推し → kawaz 棄却**の記録あり。棄却理由 = required は値述語、requires は依存述語 — 「非対称は意図的」

選択肢:

- **(a) 現状維持** — RG-Q1 の通り。値述語 vs 依存述語の区別を保つ (統括の推し: 語彙の意味論として一貫、tar 型実需は plain bool member で表現済み)
- **(b) RG-a 再開** — required/required_group の bool/flag member にも bool-truth を適用。影響: DR-103 §7 の supersede、DR-047 §5・DR-093 整合再検討、fixture 2 本 (required-group.json / constraint-required-group-vacuous-flag.json)、kuu.mbt required_candidates 判定の変更
