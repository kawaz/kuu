---
title: alias の正規化と help/completion installer 構想
status: resolved
category: design
created: 2026-07-03T09:16:54+09:00
last_read: 2026-07-04T15:01:07+09:00
open_entered: 2026-07-03T09:16:54+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-04T15:58:40+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-056","dr/DR-057","dr/DR-058","implemented","done:補完のtab-tab/途中入力切替は2026-07-04-completion-partial-parseへ切り離し(F-013/F-038と一括)","done:help canonical表示の具体レイアウトはcanonical helpレンダラの関心でありAST契約外・DR-057射程外に宣言"]
blocked_by:
origin: 自リポ TODO
---

# alias の正規化と help/completion installer 構想

## 概要

alias の基本表現は `ref + link + name` で足りるが、副作用系の扱いが未定義。

1. **help コンテキストでの canonical 表示** — エイリアスを一覧にどう出すか
2. **deprecated なエイリアス名で起動された場合の警告** — 「use xx instead of yy」ヒントの出し方
3. **補完での切替** — 未入力 tab-tab なら canonical リスト (run/version) のみ、`e<tab>` の途中入力なら exec を展開する、等の挙動切替

## 背景

方向性は「help / completion 等の installer が宣言層から alias 属性を勝手に探して拾って活用する」。
これは非削除①' (宣言層 read-only 保全、DR-042) が可能にする形。

明文化すべきポイントは、宣言語彙に対する 2 種類の関わり方の区別:

- **所有** (lowering 責務、不変則③で排他) — その語彙をどう解釈し下流に変換するかを一意に決める側
- **参照** (advisory read、自由) — 語彙を読んで補助的に活用する側 (help / completion 等の installer はこちら)

findings F-008 (コマンドエイリアス)・F-011 (hidden/deprecated)・F-013/F-016 (補完) と交差する。
help 関連・補完関連もそれぞれ独立した installer になりそう、という構想メモも含む。

今は深掘りしない (= 構想段階のメモ)。

## 方向性メモ (2026-07-03 議論)

kawaz の示唆: 「ヘルプオプションを選んだ時にヘルプ表示をするところまで勝手に配線するなら
`type: help` を提供しても良い」。

`type: help` プリセットの存在意義は **配線の完結** にある。定義に
`{type: "help", long: [], short: "h"}` と書くだけで、以下が定義だけで完結する:

1. 入口衛星
2. help フラグ
3. 成功時の help 表示
4. 失敗時アクション (DR-048、dead end 込み・ambiguous 非発火)
5. エラー末尾の `--help` 誘導行

help installer 設計時の論点:

- help レンダリング (F-014 の階層構造・usage 生成) が仕様の関心に入る
- 出力先 (stdout/stderr) と exit code も配線の一部
- レンダラは registry で差し替え可能にする
- opt-out 経路 (`type: help` を使わず flag + アプリ処理で自前実装 = `version` と同じ扱い) は残す

`type: config_file` (F-029 議論中) との対称性: 「type プリセット = 装置との配線宣言」パターン。

## 受け入れ条件

- [ ] help installer の canonical 表示ルール (エイリアスをどう一覧化するか) を決める
- [ ] deprecated エイリアス起動時の警告文言・ヒント形式 (「use xx instead of yy」) を決める
- [ ] 補完の tab-tab (未入力) と途中入力 (`e<tab>` 等) での展開切替仕様を決める
- [ ] 宣言語彙の「所有 (lowering 責務)」と「参照 (advisory read)」の区別を DR として明文化する
- [ ] F-008 / F-011 / F-013 / F-016 との交差点を整理する
