# リポ再編の記録と次セッションへの引き継ぎ (2026-07-04)

> 前セッション (session id: e7109798-4c5c-43fd-88d6-a8c96aa6a21f) が spec-as-core 再編 (ROADMAP.md) を実行した記録と、残作業の地図。前セッションは cmux-msg で質問を受けられる (コンテキストが尽きるまで)。

## 完了したこと

- **DR コーパス第 2 回クリーンナップ**: 33 ファイル 65 issues + verify 8 件 (ultracode workflow、44 agents / 4.3M tokens)。禁止語ゼロ、INDEX 60 DR 再分類済み
- **kawaz/kuu 新設 (public)**: spec 正本リポ。ast-spec 枝の全履歴を push し、GitHub 側で main に rename、default branch = main。README (spec-as-core の顔) / LICENSE (MIT) / ROADMAP 済み
- **kuu.mbt の枝再編**: 旧 main → `kuu-v0` (実験場アーカイブ、改名 push 済み)。新 `main` = root empty commit 直下の初期 README (「kuu の MoonBit 参照実装として再出発」)。default branch = main
- slice 枝は凍結 (PoC 167 テスト、conformance fixture の蒸留元)

## 残作業 (次セッションの初手)

1. **kawaz/kuu の独立 clone セットアップ**: `~/.local/share/repos/github.com/kawaz/kuu/` にパス規約どおり (git bare + jj workspace 方式、personal-jj-workflow skill 参照。kuu.mbt の構成が実例)
2. **未 push commit の反映**: kuu.mbt の ast-spec ws のローカル先端 (README/LICENSE + 移送用 justfile の 2 commits) は kawaz/kuu にまだ push されていない。新 clone で justfile を kuu 運用向け (origin main への push task) に書き換える commit を積んでから、まとめて push する (sign-on-push の署名を確認)
3. **掃除 (kawaz 確認後)**: kuu.mbt の origin に残る `ast-spec` ブランチ (正本は kawaz/kuu に移行済み、10+ commits 遅れの残骸) と `claude/review-implementation-gLfMA` の削除
4. **フェーズ 1 開始** (ROADMAP): AtomicAST 直列形の確定 + conformance fixture フォーマット設計。JSON Schema の実体化 (findings F-042/F-048 の解消 = 台帳全消化)。第 18 弾で見えた「pending 状態の枝表現」も直列形設計の入力

## 読むべき一次資料 (次セッション)

1. ROADMAP.md (構成方針と 6 フェーズ)
2. docs/DESIGN.md (現役仕様の単一ソース) と docs/LOWERING.md
3. docs/decisions/INDEX.md → 必要な DR (60 本、cleanup 済み)
4. kuu.mbt slice 枝の docs/journal/2026-07-02-slice-poc.md と 2026-07-03-slice-poc-5.md (PoC 第 1〜18 弾の実測)
5. プロジェクトメモリの feedback 群 (特に feedback_subagent_opinion_required)

## 運用ノート (前セッションから継承)

- 委譲: 実測は中位 tier (Opus)、レビューは同 tier。PoC 委譲時は「DR 再読 → 実測 → 契約割れ最優先の報告」パターン (slice journal 参照)
- commit は必ずパス指定 (`jj commit -m "..." <files...>`)。push は justfile 経由 (push-guard が直接 push をブロック)
- kawaz の議論スタイル: 高速往復、選択肢 a/b 提示 → nod → ink。ambiguous を規則で潰さず定義駆動・明示性重視・公理を増やさない
- DR 起票判断は docs/runbooks/2026-06-26-dr-corpus-cleanup.md の「新規 DR の起票判断」節が正本
