# API 磨き第 2 サイクル (2026-07-24)

## 完了サマリ

- **発端**: 敵対的レビュー (fresh-eyes 4 ペルソナ、`docs/findings/2026-07-24-fresh-eyes-adversarial-review.md`) で Blocker 4 件 + Major 群を検出 → REV-Q1〜Q5 の裁定を経てプラン化 (`docs/findings/2026-07-24-api-polish-2-plan.md`)
- **二次レビューとプラン改訂**: codex-sol の二次レビューでプラン自体の blocker 3 件を検出、プラン改訂 → AP2-Q1〜Q5 の裁定
- **主要裁定**:
  - AP2-Q1=a: 2^53 は Error 固定
  - AP2-Q2=a: DR-075 を supersede、bigint は言語実装側の拡張として切り離す
  - AP2-Q3=b: 拡張 ABI を本サイクルで正面設計 (「後送りは押し付け」の指摘で選択肢 a を棄却)
  - AP2-Q4=b: provenance は契約ベース (env/xargs の責務論で裁定)
  - AP2-Q5: 二択の枠組み自体を kawaz が否定し「Node/Ctx の公開形を正面設計」に再定式化
- **extension ABI 設計**: `docs/findings/2026-07-24-extension-abi-design.md` §8 に往復 5 版を記録。trait 移動循環 → bridge 合成循環 → builtins の Node 依存 → InstallerExt 層順、の順に probe 実験 13 本で解決。最終形は abi (純データ) ← extension (trait 8 本 + Registry) ← internal/engine ← kuu-node (Node typealias + 構築子 + InstallerExt) の 4 層。設計原理は「構築と観測を公開、分解は評価器の専権」(resident 14 種の全数 grep で分解ゼロが論拠)。DR-119 (open node 拡張 ABI) を起草
- **実装**:
  - M1: spec に DR-118 (段階型) + 2^53 + SPK を反映
  - M2a: kuu.mbt に 2^53 の字句判定を実装。`@json.parse` が 2^53 で Infinity を返す罠を runner 側の repr フォールバックで回避
  - M2c: 骨格を 120 files 規模で破壊的に再構成 (3 層構造 + 段階型 + H12 ValueSources + Candidate 9 フィールドの玄関型)
  - M4: kuu-cli を追随、engine 直 import を 0 化
- **監査での誤指摘と教訓**: opus47-high 監査が M2 に対して「warnings を failure でも保持すべき」と指摘したが、DR-058 DEP-Q2=a に反するため revert。「遷移表のセルは正本 DR と突き合わせる」を再確認。一方 worker 側の判断 3 点 (`dispatch_completion_script` の ResolvedOutcome 化等) は監査が追認し、プラン側を訂正
- **事故と学び**:
  - M2c の初代 worker が context 超過で停止。中間 dirty 状態から後任 worker が完遂。「context 残 20% で commit」の運用を強化
  - M4 worker がスコープ外の moon.pkg 形式変更 (pkgtype) を混入、統括環境の moon が不受理。push 前検証で捕捉して revert
  - `direnv exec` 単独では cwd が変わらない罠を発見、rules を `cd && direnv exec` へ改定
- **最終 head**: spec 40b58d84 / kuu.mbt 4cb23d50 (461/461, decoded=318) / kuu-cli f6fcd748 (conformance 598/598, help 33/33, smoke 6/6)。全 CI green (kuu-cli は push 時点で走行中)

## 残課題

- M3: API 整理 (H10 registry 統一 / H11 命名 / H13 labeled 化 / H14 bool 罠)
- dogfooding サイクル (REV-Q4=a で裁定済み)
