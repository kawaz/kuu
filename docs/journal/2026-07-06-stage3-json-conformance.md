# stage 3: JSON conformance runner の完全化 (parse 残 8 + lower 18)

## stage 3a (slice commit 36d32b0b)

- parse 残 8 fixture 中 7 本を実食化。decoded 78→85、ran_cases 197→221、skipped 26→19
- cross-scope sources ×5: runner に resolve_tree 新設 (command tree に値ラダー threading、slice の resolve_scope+inherited_of を tree 配線、entered scope のみ再帰、cli>env>config>inherit>default、nearest-ancestor 勝ち DR-031/059)。gate は resolve && has_commands で flat 80 fixture への波及ゼロ
- 副産物: effect-order-global の凍結 2 件が解消 — 真因は slice 本体でなく旧 flat resolve の射影 gap ({} marker と子ネストを落としていた)。台帳から除去
- or 値枝 ×2: dec_or で value_requires (CRequiresIf) に lower。genuine gap 検出 = ElemDef が枝 id (fmt_json) を持てず違反 element が親 name (format) に帰属 → 凍結 2 件追加 + slice に issue 起票 (2026-07-06-or-branch-id-attribution)。台帳は差し引き 10 件のまま
- nested-group positional (export-key/transparent-seq): slice builder 不在 (ElemDef flat、parse_definition が IdxRepeat を組めない) で skip 継続、理由正確化
- Fable レビュー: must_fix ゼロ。suggestions (stale docstring / documented-lossy カテゴリ / resolve_tree latent gap 3 点の登録) は stage 3b の Part 1 で反映

## stage 3b (slice commit 26e19dd8 / 8da63f7f / 48c2e7b9)

- Part 1 (26e19dd8): レビュー反映 — dec_case 偽 docstring 削除、ヘッダに「TWO LOSSY CATEGORIES」(表現不能→SKIP / model-gap documented-lossy→RUN+ledger 凍結) 追記、resolve_tree の latent gap 3 点 (indexed-repeat binding 漏れ / CmdSat で default ladder 不走行 / proj_sources_tree の dedup 欠如) を CURRENT CONSTRAINTS として near-code 登録
- Part 2 (8da63f7f): lower 18 本の直読み化。query gate を parse+lower に拡張。既存手書き照合 lower_runner_wbtest.mbt の projection (proj_scope/lsec_str/run_lower/canon_of) を再利用し、新規実装は golden expect JSON → LSec decode のみ。5 面断面 (greedy=SET / positionals=ORDER / entities/constraints/templates=SET) + permutation convergence (DR-070 §3) をそのまま享受。18 本全 PASS
- 最終状態: decoded 103 / ran_cases 239 / skipped 1 (nested-group のみ) / mismatches 10 (全て凍結済み)。201 tests green
- Fable レビュー must_fix 1 件 (latent): golden 側 decoder に capability-gate の穴 3 系統 — (1) 非 set 効果記述子 {exact,link,effect} が bare {exact} フォールバックに落ち GExact に化ける (2) {ref,link} の link 黙殺 (ref≠link は DR-007/029 で正当、TNode モデルは表現不能なので false PASS ベクタ) (3) dec_gitem/dec_pos_tnode/dec_tmpl_body/dec_lcon に allowed_keys 不在。現 18 fixture では非発現 (機械確認済みで今日の green は本物) だが契約違反として封鎖 (48c2e7b9): bare {exact} に allowed_keys、dec_ref_link 共有ヘルパ (link==ref 検査)、全分岐に allowed_keys
- ハマり所: moon fmt が既存コード ~50 行を reflow する (moon バージョンドリフト、直近 fmt commit 9a9ea069 当時との出力差)。fix agent はファイルを親状態に戻し意味的編集 6 箇所のみ手で再適用して回避。fmt ドリフトは deprecated 245 警告移行と同根の環境ズレで別途対応予定

## 運用

- ultracode workflow (実装 Opus → レビュー Fable → 修正 Opus) を 2 周。1 ws 1 writer 厳守 (INDEX 是正 commit は workflow 完了まで保留した)
- local-issue plugin の INDEX ソート bug を発見し plugin リポに還元起票 (index-sort-not-enforced-on-write-update)。3 リポの INDEX を手是正

## 関連

- slice: docs/issue/2026-07-06-or-branch-id-attribution.md
- CONFORMANCE (capability-gate / lossy カテゴリ) / DR-070 §3 (permutation convergence) / DR-031, DR-059 (nearest-ancestor 解決)
