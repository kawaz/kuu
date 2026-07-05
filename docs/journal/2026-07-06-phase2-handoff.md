# フェーズ 2 大進捗の記録と次セッションへの引き継ぎ (2026-07-05〜06)

> 本セッション (dba54ead) はフェーズ 1 の完了からフェーズ 2-③ の conformance ループ実働化までを 1 本で実行した。残作業の地図と、文書化されていなかった文脈を引き継ぐ。

## 完了したこと (時系列)

1. **フェーズ 1 完了**: DR-061〜071 の 11 本 (descriptor+factory / filters 二形 (@base 廃止) / 直列形 = 宣言層 wire + 5 面断面 / dd 配置と name デフォルト / fixture フォーマット / reason コード / well-formedness 3 層 / Schema lifecycle / 準拠プロファイル / long 責務分離)。docs/CONFORMANCE.md と schema/wire.schema.json 新設。findings 台帳 40 件全消化
2. **フェーズ 2-①②**: parse runner (fixtures/dd 8 cases 完全一致) + lowering fixture 18 本 (全 shape)。slice の spec 乖離 6 件を修正 (dd 配置 / errors 空 / entity 生成 ×2 / absent long conflation / flag preset default)
3. **DR-071 サイクル**: absent long conflation バグ → conformance 検出 → 応急 Option 化 → 根本の設計欠陥に遡って long を variant リスト一級化 (`:set` 主入口 + `long: true` 糖衣) → 応急実装の撤廃。仕様と slice の両側追従済み
4. **フェーズ 2-③ 蒸留**: 台帳 (docs/issue/2026-07-05-phase23-distill-ledger.md) の全 15 領域を 2 wave 並列 + 横断 adversarial 監査で fixture 化 — **parse fixture 86 本 / 220+ cases** (fixtures/ 全体で 104 definition)。監査が捕捉: value_requires (DR-055 却下 DSL) の slice 写し是正 / optional の spec 内矛盾 (DR-051 精密化で解消、一様配列が正) / prefix-guard 二重蒸留の一本化 / ambiguous-receptacles の陳腐化実測写し (下記)
5. **JSON 直読み conformance runner (slice)**: 技術検証 (wasm-gc で x/fs 動作、KUU_FIXTURES env + 相対 fallback) → stage 1 (骨格 + dd) → stage 2 (parse 語彙網羅、**78/86 実食 / 197 cases**)。capability-gate 方式 (lossless decode のみ実食、スキップ理由ヒストグラムが残タスク)。justfile の test task が KUU_FIXTURES を解決
6. **divergence 台帳の確立**: 既知 divergence を known_divergences() に凍結し、UNEXPECTED (新規) と VANISHED (解消したのに台帳未更新) の**両方向で fail**。現在 **7 件** = held-error ×2 (slice issue: min2-unbounded-empty-errors) + collision / transparent-kv 昇格 / empty fired scope ×2 / shadow subtree (slice issue: parse-conformance-gaps-batch1)
7. **codex レビュー 3 本** (フェーズ 1 ドメイン / 方向性 / フェーズ 2-②) + stop 時 review gate 対応多数。方向性レビューの「最小 runner を先に動かせ」は即日実証された

## 文書化されていなかった文脈 (ここが正本)

- **ambiguous-receptacles 是正の判定根拠**: 隣接する同型 2 repeat の取り分違いは DR-043 の「取り分次元」(選好で 1 本確定)。蒸留元 phase1:24 は取り分選好導入前 (slice 第 1 弾) の生 Many の実測で、陳腐化した挙動の写しだった。real ambiguous が保存されるのは構造差 (or 枝・読み違い) のみ。裏取りで「取り分の向き (左先最長) は暫定」も顕在化し DR-043 に注記済み
- **inheritable の Model X/Y** (spec-gaps #6): 祖先 write-target が result の root キーに出るか。slice 実測 = Y (出る)、fixtures/inheritable-parse は Y 準拠で先行。未 ratify
- **failure-actions**: 候補 def は WithHeld で確定済み (DR-048)。fixture の失敗時アクション要素は `type: "help"` プリセット経由で書ける (汎用属性フィールド名は §13.9 未予約のままで問題ない)
- **dd fixture の説得力**: GNU cp の実機観測 (2026-07-05、`cp a --` = missing destination 等 4 パターン) と一致することを why に記録してある
- **stage 3 の技術情報**: moon test の cwd = poc、x/fs は `__moonbit_fs_unstable` host import (moonrun 提供、wasm-gc/native 両対応実測済み)。nightly 追従リスクは x/fs が吸収
- **CI 統合の未決**: kuu.mbt の ci.yml は main branch のみ対象で slice push では発火しない。参照実装を main に置く際、fixtures (別リポ) の取得方式 (kawaz/kuu の並置 checkout + KUU_FIXTURES 注入が素直) を決める必要がある
- **known gap 台帳の正本は DR-070 §1b** (現在 2 件: reason 未実装 / alias add-if-absent)。divergence 台帳 (slice の known_divergences) とは別物 — 前者は「実装の未追従」、後者は「実食で観測された不一致の凍結」

## 残作業 (優先順)

1. **stage 3**: 残 8 parse fixture の構文対応 (cross-scope sources の command tree 越しラダー / or 値枝 (exact 分岐 + per-branch requires) / nested-group positional) + lower 18 本の直読み化 (query gate 拡張、expect = 5 面断面の緩比較)
2. **slice gap 修正**: batch1 の 4 種 + min2 (修正のたび divergence 台帳から VANISHED 検査で消す)
3. **spec-gaps 10 件の議論** (docs/issue/2026-07-05-distill-spec-gaps.md) → 決着分の DR 化。特に (1) wire-form 表面の疑義 (未蒸留 4 テストの救済) と (6) Model X/Y が fixture に波及する
4. slice の deprecated 245 警告移行 (Show→Debug、inspect 影響を test で確認しながら機械的に)
5. **参照実装 (kuu.mbt 新 main) の方針確認** — kawaz と議論: 実装 DR の番号空間 / moon プロジェクト構成 / PoC の既知の破れ 2 件 (完成オラクルのスコープ相対化・pending 枝設計) の根治タイミング / CI の fixtures 取得

## 運用ノート (本セッションで確立、メモリにも保存済み)

- **ボールを渡して止まらない** — 判断が必要な分岐 (仕様の決定文言 / 不可逆操作 / 方針変更) のときだけ停止
- **節目ごとに codex レビュー** (codex:codex-rescue、background) — stop gate 任せにしない
- **1 つの jj ws に書くのは同時 1 エージェントまで** — 並行書きは empty commit 量産 + bookmark 迷走 (実害なしで済んだが要注意)。読み取り専用との並行は可
- **エージェントはターン境界で止まる** — idle 通知が来たら成果物を実 FS で確認し、未完なら SendMessage で突く (突けば再開する)。異常報告 (「ファイルが移動した」等) はサンドボックスの幻視がありうるので本人に続行させずメイン視点で観測して確定
- **golden は仕様準拠値** (DR-070 §1b)。「slice の写し」は監査で弾く (value_requires が実例)
- **kawaz の議論スタイル**: 高速往復、a/b 提示 → nod → ink。設計の直感 (long 責務混載等) は本質を突くので正面から検討する。ultracode 許可あり (セッション単位で確認)
- grep -c は 0 マッチで exit 1 (`&& ||` 連鎖で誤読する)。push の ensure-clean は他エージェントの書きかけで正しく止まる (想定内)

## 読むべき一次資料 (次セッション)

1. 本ハンドオフ → docs/journal/2026-07-05-*.md 3 本 (フェーズ 2-①/②/③ の詳細)
2. docs/CONFORMANCE.md + DR-063/065/070/071 (fixture を触るなら必須)
3. 蒸留台帳 + distill-spec-gaps issue (docs/issue/)
4. slice: poc/json_conformance_wbtest.mbt の冒頭コメント (runner の設計と拡張手順)、docs/issue/ の 3 件
5. プロジェクトメモリ (MEMORY.md — feedback 3 件)

## 現在の HEAD

- kawaz/kuu main = dce3d46e (全 push 済み、@ clean)
- kuu.mbt slice = e6cacccd (全 push 済み、moon test 201/201)
