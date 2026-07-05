# フェーズ 2-③: parse fixture 蒸留 wave1+wave2 (2026-07-05)

蒸留台帳 (docs/issue/2026-07-05-phase23-distill-ledger.md) の全 15 領域を 2 wave の並列蒸留 + 横断 adversarial 監査で fixture 化した記録。

## 成果

- **parse fixture 15 領域 / 約 86 ファイル / 220+ cases** (lowering 18 本と合わせ fixtures/ は 104 definition)。全 jq valid + schema validate 済み
- **sources フィールドの確定** (DR-065 拡張): 値源由来の検証は effects 拡張でなく entity → source タグのマップ。キーは scope-path 修飾。値源系 fixture の入力は cases[].env / config / config_files
- **監査が実際に捕まえたもの**: value_requires (DR-055 却下済み DSL) の slice 写し 2 fixture → 正本形 (or/exact への requires 合成) へ是正 / optional の spec 内矛盾 (DR-043/044 の一様配列 vs DR-051 表の誤読) → DR-051 精密化 + early-close.json 修正 / prefix-guard の二重蒸留 → matcher-readings へ一本化 / multiple: true の非合法値
- **仕様詰め所 10 件を docs/issue/2026-07-05-distill-spec-gaps.md に集約** (wire-form 表面の疑義 / interpretations 順序 / number 寛容度 / backtrack errors 多重度 / value_parser reason / inheritable の Model X/Y / collision 表現 / warnings 語彙 / bare separator 昇格 / separator の wire 経路)
- slice の新 divergence 1 件を起票 (min2-unbounded-empty-errors — bounded との held error 非対称)
- slice の moon fmt 適用済み (200/200 green 維持)。deprecated 245 警告 (Show→Debug 系) の移行は未実施の残作業

## 事故と教訓

- **同一 jj ws への並行書き込みで empty commit 量産 + bookmark 迷走** (slice-fmt × wave1-cleanup)。実作業の喪失はなかったが、kawaz の指摘で停止 → jj op log 観測 → 直列仕切り直し。教訓「1 ws に書くのは同時 1 エージェントまで」をメモリ恒常化
- **エージェントのサンドボックス視界の異常** (serial-finish が「fixtures が tests/ へ移動」「台帳が close」等の幻を観測) — 実 FS は健全だった。エージェントの異常報告は本人に続行させず、メイン視点で観測して確定する
- **grep -c の exit code 罠**: 0 マッチは出力 0 + exit 1 なので `&& ... ||` 連鎖で「ファイル不在」と誤読しうる — 存在確認は test -f を先行させ、独立コマンドで

## 次

- **転写実食 (第 2 段)**: slice の parse runner に新 15 領域を転写して実食 → divergence 判定ループ (min2 は先に判明済み)。JSON 直読み runner の導入もこの段で検討 (手転写のスケール限界)
- spec-gaps 10 件の議論 → 決着分を DR 化
- slice の deprecated 警告移行 (機械的、単発)
- その後: 参照実装 (kuu.mbt 新 main) の着手方針確認

## 関連

- 台帳 / distill-spec-gaps issue / CONFORMANCE (sources・env/config 入力) / DR-051 (optional 精密化) / DR-065 (sources)
- slice: docs/issue/2026-07-05-min2-unbounded-empty-errors.md
