---
title: negatable 糖衣 (bool 否定形 B3) の採否裁定
status: idea
category: design
created: 2026-07-08T21:55:51+09:00
last_read:
open_entered:
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO
---

# negatable 糖衣 (bool 否定形 B3) の採否裁定

## 概要

distill-spec-gaps close 時の切り出し (旧 #3 派生、未裁定)。「negatable プリセットを lowering で明示 variant へ展開する糖衣」の採否。kawaz 裁定待ち。

## 背景

- bool に `--no-<name>` 否定入口を一括で生やす糖衣 (例: `negatable: true` → long リストへ `"no:set:false"` を合成) を設けるか
- DR-076 §2 (2026-07-08 確定) で flag の `long:true` 糖衣差し替え + 非空リスト補完という「preset による綴り合成」の先例ができたため、同じ機構 (リスト合成、冪等) に乗せられる見込み。仕様コストは下がっている
- 対抗論: DR-011 が「no ショートハンドは入れない (アプリごとに no の挙動はまちまち、常に明示書き)」と裁定済み。negatable 糖衣はこの裁定と緊張関係にある — 明示 `"no:set:false"` を 1 行書けば済むものに糖衣が要るか
- 2026-07-08 台帳 issue 監査で発見、裁定が要るため idea として保持

## 受け入れ条件

- [ ] kawaz が negatable 糖衣の採否を裁定する
- [ ] 採用の場合: DR 起票 + lowering 仕様への反映
- [ ] 不採用の場合: DR-011 裁定の維持を明記して close
