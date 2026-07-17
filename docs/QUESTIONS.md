# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## SCB-Q1: 未選択 scope の値述語 (required / required_group) は評価に参加するか

背景は docs/issue/2026-07-17-required-group-scope-participation.md (実測マトリクス付き)。現実装は**未入場の command scope に宣言された required / required_group も無条件評価**するため、sibling subcommand の各々に required_group を持つ定義 (git 風 CLI の標準形) はどの入力でも必ず violation になり使用不能。既存規定の空隙: DR-103 §5 が参照する DESIGN §9.2/§15.9 に scope 境界の明示規定が無い。

- **a. 未選択 scope の遅延述語は評価に参加しない (推し)**: DR-051 §3 の unselected scope = absent (キー消失) と整合 — 存在しない結果部分木に値述語を課すのは矛盾。tar/git 等の実 CLI の直感 (`git commit` の必須が `git log` に影響しない) とも一致。exclusive_group 等の指定述語は committed 前提で未入場では元々 vacuous 真なので、挙動が変わるのは値述語のみ = 影響範囲が最小
- b. 全 scope 参加を維持し、値述語の宣言側に制限を課す (subcommand 内 required の禁止等): 実装は不変だが、表現力を削る方向の workaround で、削減の論拠が実装都合になる
- c. root scope のみ評価、子 scope は選択時のみ (a の言い換えだが root の扱いを明示): root は常に「選択済み」なので a と実質同一。a の裁定に含めて明文化するのが良い

## SCB-Q2: required_group の group label 集約範囲 (scope 横断か scope 局所か)

DR-103 §5 の文言「constraint installer が各要素の group ラベルを**スコープ横断で集約**」と、現実装 (scope ごと独立集約、exclusive_group も同様) が食い違う。実測: root の r1 と child-a の a1 が同名 group `g` を宣言しても独立した 2 述語として評価される (横断 merge されない)。

- **a. scope 局所集約を正とし DR-103 §5 の文言を訂正 (推し)**: 実装・exclusive_group の実挙動と一致。scope を跨いだ同名 label が 1 group に merge される意味論は「未選択 scope の member が group 判定に参加するか」という SCB-Q1 の問題を再帰的に生む上、跨ぎたい実需 corpus が無い。lexical scope の直感 (同名変数が scope ごとに別) とも一致
- b. 文言どおり横断集約に実装を寄せる: SCB-Q1=a と組むと「選択された scope の member だけで横断 group を判定」という複合規則になり複雑。実需が出るまで過剰
- 注: SCB-Q1=a + SCB-Q2=a の組合せが最小驚き。この場合 DR-103 §5 は「集約は宣言 scope 単位 (exclusive_group と同一)、評価は選択された scope のみ」の 2 文に置き換わる

参照: docs/issue/2026-07-17-required-group-scope-participation.md / docs/decisions/DR-103-required-group.md §5 / kuu.mbt の src/engine/eval.mbt (eval_all_constraints, collect_scopes) と src/builtins/installer.mbt (inst_constraint)

