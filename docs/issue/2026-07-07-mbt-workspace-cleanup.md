---
title: kuu.mbt 旧実装系 workspace / origin 残存枝の廃止検討
status: open
category: task
created: 2026-07-07T13:04:13+09:00
last_read:
open_entered: 2026-07-07T13:04:13+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 参照実装立ち上げ (2026-07-07 kawaz 裁定 ⑥) の掃除項目
---

# kuu.mbt 旧実装系 workspace / origin 残存枝の廃止検討

## 概要

参照実装 (kuu.mbt) をゼロ設計 + 設計優先移植で立ち上げるにあたり、旧 kuu-cli 系の
実験 workspace が kuu.mbt リポに残存している。いずれも新仕様 (DR-044 以降) を含まず、
旧実装コードは `kuu-v0` bookmark に集約済み。参照実装の作業空間から旧系を退場させて
混線を防ぐため、workspace の forget + ディレクトリ削除を検討する。

**データ保護方針**: bookmark は削除しない (= change の到達性を保つ)。物理的に消すのは
workspace のチェックアウト (`jj workspace forget` + ディレクトリ削除) のみ。

## 対象 workspace (kuu.mbt リポ)

`/Users/kawaz/.local/share/repos/github.com/kawaz/kuu.mbt/` 配下:

| workspace パス | 最終稼働 | 状態 |
|---|---|---|
| `kuu.mbt/refactor` | 2026-03 | 旧 kuu-cli リファクタ実験 (停滞) |
| `kuu.mbt/review` | 2026-03 | 旧 kuu-cli レビュー用 (停滞) |
| `kuu.mbt/parts-arggen` | 2026-06-29 | argument 生成部の実験 (停滞) |

いずれも旧 kuu-cli 系で新仕様 (DR-044 以降) を含まない。実装コードは `kuu-v0` bookmark
に集約済みのため、これらの workspace チェックアウトを消しても内容は失われない。

## 対象 origin 残存枝 (kuu.mbt リポ)

`jj bookmark list --all-remotes` で観測した origin の残存枝:

- `claude/review-implementation-gLfMA@origin` (= `feat: merge kuu-cli`)
- `dependabot/npm_and_yarn/pkg/ts/npm_and_yarn-90571ef80a@origin`
- `dependabot/uv/examples/archives/20260309-cargo-python/uv-590e9db7b9@origin`

旧 kuu-cli 系 (TS/Python サンプル含む) に紐づく枝。参照実装は MoonBit ゼロ設計で
再出発するため、これらの origin 枝も整理対象。

## TODO

- [ ] workspace forget + ディレクトリ削除の実行 (**kawaz 確認後**)
  - `jj workspace forget refactor review parts-arggen` (kuu.mbt/main から)
  - 各ディレクトリ削除
- [ ] origin 残存枝の削除 (**kawaz 確認後**)
  - `claude/review-implementation-gLfMA` / dependabot 2 枝を origin から削除
- [ ] bookmark は削除しない (= `kuu-v0` 等のデータ保護。到達性維持)

## 参照

- 2026-07-07 kawaz 裁定 ⑥ (台帳ゼロ開始 / slice ws は凍結アーカイブ、削除しない)
- ROADMAP.md フェーズ 3 (参照実装 kuu.mbt の立ち上げ方針)
