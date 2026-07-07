# フェーズ 2 完了 + 参照実装立ち上げ (フェーズ 3 開始) の引き継ぎ (2026-07-06〜07)

> 本セッション (ed0029a5) は前ハンドオフ (docs/journal/2026-07-06-phase2-handoff.md) の残作業全消化 → spec-gaps 全決着 → 参照実装の方針確定と骨格構築まで実行した。次セッションの本丸は評価器コアの実装。

## 完了したこと (時系列)

1. **stage 3 完了**: JSON conformance runner の完全化 — parse 残 8 の decoder 拡張 (resolve_tree 新設) + lower 18 本の直読み化。skip 26→1 まで消化 (詳細: docs/journal/2026-07-06-stage3-json-conformance.md)
2. **slice gap 修正**: shadow subtree (link_depth 一般化) / transparent-kv / min2+FilterArg の held-error parity。台帳 10→6 (詳細: docs/journal/2026-07-06-gap-fixes-ink-batch1-case-id.md)
3. **台帳強化**: skip 台帳の 3 方向 fail (UNEXPECTED/VANISHED/CHANGED SKIP) + verdict 全文粒度凍結 (codex/Fable レビュー指摘の反映)
4. **fixture case-id 導入 (DR-072)**: 全 86 fixture / 223 case に kebab slug 付番、台帳を rel::slug 表記へ。lowering (単一 expect 形式) は対象外
5. **spec-gaps 全決着**: #10/#9/#2/#8/#6 (第 1 バッチ) → #4 (held errors 全取り分累積) / #7 (**DR-073**: collision = ambiguous + claimants 面) / #1 (3 件蒸留 + phase1:130 消し込み、structural-or は slice builder 不在で skip 凍結) / #3 (**DR-074**: number/bool canonical 字句 — JSON 看板外し、実用寛容、bool = true/1/false/0/"" ci) / M2 (**DR-075**: int_round 10 種 + int の値空間判定確定)。残は #5 の Schema 実体化 (DR-068 ライフサイクル待ち) のみ
6. **調査 findings 4 本**: number/bool の言語横断 + CLI パーサライブラリ 28 種 (default 中央値 / opt-in 上限) + int 丸めモード (docs/findings/2026-07-06-*.md ×3 + int 丸めは DR-075 に直接反映)
7. **参照実装の方針確定 (Task 6)**: 調査 4 本 → 7 論点アジェンダ → kawaz 裁定「スピードよりも設計の良さ」で方針 c (責務境界の明示分離)。kuu.mbt 新 main の骨格構築 (moon/justfile/CI/Release、CI green) + **MDR-001** (bootstrap-policy)
8. **評価器設計 (Phase B)**: 設計スケッチ → kawaz ink → **MDR-002** (CPS 化 + Pending 統一 + モジュール分割 8 ファイル) + **MDR-003** (予約語命名 = 末尾 _ + wire rename)

## 文書化されていなかった文脈 (ここが正本)

- **kuu.mbt main の位置づけ**: bookmark = 98c5a0e0 (骨格 + MDR-001〜003)。実装 DR は MDR-NNN 空間 (spec DR は複製せず参照)。CI は kawaz/kuu を SHA pin (e21646f5) で並置 checkout + KUU_FIXTURES 注入 — **fixtures を更新したら ci.yml の pin を bump する PR が必要** (その PR で台帳更新もセット)
- **VERSION=0.0.0 は意図的な placeholder** (release 休眠)。moon.mod は 0.1.0。初回 release は kawaz が VERSION bump した時点で発火
- **slice は凍結アーカイブ**: divergence 23 / skip 6 が台帳固定。追従 issue 群 (slice の docs/issue/ 全 10 件) は新実装の**チェックリスト**として参照する (物理移管しない)。台帳ゼロ開始が MDR-001 の決定
- **kuu.mbt の旧 ws (refactor/review/parts-arggen)** は廃止候補 (docs/issue/2026-07-07-mbt-workspace-cleanup.md)。実 removal は kawaz 確認後。main ws の旧実装残骸はリセット済み (abandon せず op log 保全)
- **MDR-002 の先食い穴**: greedy_reads が入力末尾の値なしトリガを沈黙させ positional に raw 食いされうる (未検証の机上指摘)。参照実装で明示 fixture 化する TODO が MDR-002 にある
- **DR-075 の binary64 非経由要件**: int_round の判定は字句スキャン or decimal で行う (parseFloat→round は不適合)。字句スキャンは decimal 正解と 20 万件ファズ一致の実証済み
- **予約語 rename の実機**: `derive(ToJson(fields(alias_(rename="alias"))))` + FromJson 対称が moon 0.1.20260629 で動作確認済み (MDR-003 に記録)
- **gh-monitor plugin の既知 bug 2 件** (起票済み): workflow 不在チェックが jj workspace 構成で素通り + workdir 解決がセッション起動 dir を拾う → **push 後の hook nudge の repo/SHA は信用せず、push task の notify --self → 対象リポの SHA を自分で確認して watch を張る**。kuu.mbt の `just watch` は watch-workflow.sh の PATH 未通で exit 127 → plugin フルパス (`~/.claude-personal/plugins/cache/gh-monitor/gh-monitor/<ver>/scripts/watch-workflow.sh`) で直接起動
- **cmux-msg の既知 bug** (起票済み: claude-cmux-msg の docs/issue/2026-07-07-notify-self-unread-never-clears.md): notify --self が read 後も未読に残る → hook の「未読 N 件」は自分の push 通知の残骸なら無視してよい
- **local-issue plugin の INDEX ソート bug** (起票済み) — write/update 後は INDEX の並びを目視確認

## 残作業 (優先順)

1. **評価器コアの実装 (Task 15、本丸)**: src/core に MDR-002 の 8 ファイル構成 (node/value/matcher/cont/eval/resolve/outcome/installer) を実装。実装順は ROADMAP の 4 フェーズ (lowering → 評価器 → 値確定 → 出口)。葉 + installer は slice 参照移植 (設計優先 — DR-074/075 字句・欠落 builder を移植時に埋める)、評価器は CPS + Pending でゼロ実装。命名は MDR-003。受け入れ: phase16 相当の解消 + conformance fixtures (267+ case) の実食開始
2. **DR-074/075 の細部 fixture** (spec 側 issue: 2026-07-06-value-typing-s7-fixtures — §7 細部 + int_round 残 6 モード)
3. **旧 ws 掃除の実行** (kawaz 確認後、issue: 2026-07-07-mbt-workspace-cleanup)
4. spec-gaps #5 (reason の Schema 実体化) は DR-068 ライフサイクルに従い後続

## 運用ノート (前ハンドオフからの追加分)

- **レビューの tier 使い分け**: 機械確認主体のレビューは Opus、新規設計判断を含むレビューだけ Fable (claude-rules-personal の top-tier-model-delegation に判定軸を追記済み — workflow のレビュー段を惰性で一律 Fable にしない)
- **ファイル参照は grep 可能な実パス片で**: 「fixtures/export-key/collision の co-exposure-collision case」形式。裸の単語 (spec-gaps 等) は初出でパス併記 (メモリ feedback-fixture-reference-format)
- **spec ws への並行書き込み事故に注意**: workflow と background agent を同時に spec ws に書かせない (今回 1 回ヒヤリ、実害なし)
- **codex stop-gate は有能**: DR 間の伝播漏れ・fixture 被覆の過大主張・rounding 残骸を 3 回捕捉した。指摘は基本正当なので即対応でよい

## 読むべき一次資料 (次セッション)

1. 本ハンドオフ → kuu.mbt/main の **MDR-001/002/003** (実装の正本。MDR-002 に型スケッチ・机上トレース・受け入れ条件)
2. spec の DR-072〜075 + docs/CONFORMANCE.md (fixture を食わせるなら必須)
3. slice の poc/json_conformance_wbtest.mbt 冒頭コメント (harness 設計の正本 — 機構を新 main に持ち込む) + docs/issue/ 全 10 件 (実装チェックリスト)
4. slice の poc/eval.mbt / installer.mbt (移植参照元。ただし評価器はゼロ設計 — 構造でなく仕様輪郭の理解のために読む)
5. プロジェクトメモリ (MEMORY.md — feedback 4 件)

## 現在の HEAD (全 push 済み・全 CI green)

- kawaz/kuu main = 550c3a3b (@ clean)
- kuu.mbt main = 98c5a0e0 (骨格 + MDR-001〜003)
- kuu.mbt slice = 5d507e8c (凍結アーカイブ、202 tests green)
