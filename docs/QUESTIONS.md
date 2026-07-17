# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## DEP-Q1: deprecated warnings の cardinality (同一入口の複数回起動)

同一 deprecated 入口を 1 parse 内で複数回起動したとき、warnings に同じ entry を回数分積むか、element 単位で畳むか。DR-058 §2 の明確化 note (2026-07-15) が「未規定のまま残る」と明示 (issue `deprecated-warning-boundary-fixtures` (2))。

- **a. element 単位で畳む (重複排除、推し)**: warnings の用途は「use <canonical> instead」の導出素材 (DR-058 §2) であり発火回数は素材に不要。CONFORMANCE §3 の「warnings は集合比較 (element の組)」とも整合 (集合では重複を表現できない)。kuu.mbt 現実装 (engine/eval.mbt `warnings_structured`, first-seen 順 dedup) もこの形
- b. 起動回数分積む: 発火回数の情報を保持できるが、集合比較の現規約では fixture で検証不能 (multiset 比較への CONFORMANCE 改訂が連動で必要)

参照: docs/decisions/DR-058-hidden-deprecated.md §2 note / docs/CONFORMANCE.md §3 warnings 行 / kuu.mbt の src/engine/eval.mbt (warnings_structured)

## DEP-Q2: parse 失敗時の warnings 残置

deprecated 入口の起動後に parse が失敗 (値不足・値不正等) した場合、failure outcome に warnings を残すか (issue `deprecated-warning-boundary-fixtures` (3))。DR-058 §2 は「起動されたら積む」(字義は残す側) と「パース成功後の利用推奨警告」(層定義は出さない側) の両方の文言を持ち、導出が割れる。

- **a. 失敗時は warnings を出さない (推し)**: deprecated 警告の層定義は「パース成功後の利用推奨」(DR-058 §2 が filter warn (DR-021) と明示的に別層化した根拠)。失敗した起動に乗り換え推奨を出しても行為として成立しない (エラー修正が先)。kuu.mbt 現実装 (Success のみ warnings 生成) もこの形
- b. 失敗時も起動済み deprecated の warnings を残す: 「起動されたら積む」の字義通り。ユーザが同時に両方 (エラー + 乗り換え推奨) を見られる利点はあるが、failure wire の warnings 面を CONFORMANCE §2 に新設する連動が必要

参照: docs/decisions/DR-058-hidden-deprecated.md §2 / docs/issue/2026-07-15-deprecated-warning-boundary-fixtures.md (2)(3)
