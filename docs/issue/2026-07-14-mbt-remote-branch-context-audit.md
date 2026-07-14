---
title: kuu.mbt 旧リモート枝 5 本の未回収コンテキスト棚卸し (削除はしない)
status: wip
category: task
created: 2026-07-14T10:24:59+09:00
last_read:
open_entered:
wip_entered: 2026-07-14T10:24:59+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kawaz 裁定 (2026-07-14, BR-Q) — 旧枝削除不可、棚卸し先行
---

# kuu.mbt 旧リモート枝 5 本の未回収コンテキスト棚卸し (削除はしない)

## 概要

kuu.mbt リポの main 以外の remote 枝 5 本について、main に無い commit 群・
現行 spec (kawaz/kuu) や kuu.mbt main に未吸収の内容 (設計メモ・fixture・
実装・議論) を read-only で棚卸しし、回収候補を報告する。**この issue の
スコープは棚卸しと報告まで**。回収の実施・枝の最終処置 (保持継続 or 削除)
は棚卸し結果を見て kawaz が改めて裁定する。

## 背景

kawaz 裁定 (2026-07-14, BR-Q): 旧枝の削除は不可 —「まだ拾えてないコンテキ
ストがある」。履歴は保持したまま、先に未回収コンテキストの棚卸しを行う
方針。

`docs/findings/2026-07-13-v1-readiness-audit.md` の V1-R01 でも「kuu.mbt
側 ast-spec 枝の削除未実施」が partial 判定の一因として指摘されており、
削除是非を判断する前に内容確認が必要な状態だった。

`docs/issue/2026-07-07-mbt-workspace-cleanup.md` は workspace forget と
一部 origin 枝 (claude/review-implementation-gLfMA / dependabot 2枝) の
削除是非を扱う既存 issue だが、対象・スコープが本 issue と一部重複しつつ
異なる (旧 issue は削除是非の検討、本 issue は削除前提を撤回した棚卸し)。
両 issue の重複解消は棚卸し完了後に検討する。

## 対象 (git ls-remote 実測、2026-07-14)

kuu.mbt リポの main (`8c91113d`) 以外の全 remote 枝:

| 枝 | 実測 SHA (先頭8桁) |
|---|---|
| `ast-spec` | `a7d2f945` |
| `claude/review-implementation-gLfMA` | `81647c8c` |
| `dependabot/npm_and_yarn/examples/20260318-npm-typescript/...` | `a4cab4de` |
| `kuu-v0` | `bc316c6f` |
| `slice` | `5d507e8c` |

## タスク

各枝について:

1. main に無い commit 群を洗い出す
2. 現行 spec (kawaz/kuu) / kuu.mbt main に吸収されていない内容 (設計メモ・
   fixture・実装・議論) を特定する
3. 回収候補として報告する (findings 記録)

read-only 作業のみ。枝の削除・書き換え・force push は一切行わない。

## 受け入れ条件

- [ ] 枝ごとの未吸収コンテンツ一覧 (findings 記録)
- [ ] 回収候補の提示
- [ ] 処置 (保持継続 or 削除・回収実施の要否) について kawaz の再裁定を仰ぐ

## TODO

- [ ] 5 枝それぞれの main との diff (commit ログ + 内容差分) を確認
- [ ] 各枝の内容を「回収済み/未回収」に仕分け
- [ ] `docs/findings/` に棚卸し結果を記録
- [ ] kawaz に再裁定を依頼 (処置の最終決定)

## 関連

- `docs/findings/2026-07-13-v1-readiness-audit.md` V1-R01 (ast-spec 枝の残存観測)
- `docs/issue/2026-07-07-mbt-workspace-cleanup.md` (workspace / 一部 origin 枝の削除是非、対象一部重複)
