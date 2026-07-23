# 補完 UX 層 M1〜M3 サイクル (2026-07-23)

## 完了サマリ

- **UXL-Q1〜Q4 裁定** (全て a = findings 推し通り、正本: docs/findings/2026-07-23-completion-ux-layer-plan.md §8): 補完 capability 実装 (行 emit 込み) は kuu.mbt / glue テンプレは spec templates/ が正本 + 転写 + CI 同期検査 / 玄関判定は純関数 completion_entry / 翻訳表検証は実端末マトリクス + CI 煙テストの 2 段
- **M2 (spec 側 templates/ 新設)**: completion.zsh は完成度優先で仕上げ、bash/fish は骨格。TRANSLATION.md は全セルに実機検証 status を付与。README にテンプレ変数 (`{{BINARY}}` / `{{PROGRAM_NAME}}` / `{{UUID}}`) を記載。spec main = 970c7d0a で push、CI green
- **M1 (kuu.mbt completion_query パイプライン)**: `src/kuu/completion_query.mbt` — words/cword 分解 → complete → help_query → policy 段 → 行応答 emit までの一連、wbtest 込み
- **M2 (kuu.mbt 側転写)**: `scripts/gen-completion-templates.sh` + `src/kuu/completion_templates.mbt` (spec templates/ からの転写生成)、justfile に `gen-templates` / `check-templates` task を追加 (CI 同期検査)
- **M3 (kuu.mbt 玄関判定 + 生成)**: `completion_entry` (二箇所一致の純関数玄関判定)、`generate_completion_script` (3 点焼き込み)、`completion.mbt` のコメント改訂
- kuu.mbt main = 987ef262 で push、CI green。テスト 445/445、conformance decoded=315 mismatch 0 skip 0

## 実装判断メモ

- MoonBit raw string の `#|` は `()` wrap が要る (deprecated_syntax 0027)
- `KUU_COMPLETE_INDEX` パーサは private `parse_nonneg_int` を使用 (strconv import を広げない判断)
- argv 長 < 2 も NotCompletion 判定 (DR-117 §3.2 の一様性に従う)
- shell 名は小文字 canonical のみ受理

## lockstep 窓の実施記録

spec push (templates) → kuu.mbt pin bump (a3d3a2de → 970c7d0a) + push、の順で連続実施。事故なし。

## 残課題

- M4: kuu-cli の `completion generate` / `completion query` サブコマンド + validate completer 報告 + 煙テスト (worker 作業中)
- 翻訳表 (TRANSLATION.md) の tmux 実端末マトリクス検証 (findings §5.1 段 1、未着手)
