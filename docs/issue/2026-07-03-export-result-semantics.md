---
title: export の結果整形意味論 — export(bool) + export_key の統合可否
status: open
category: design
created: 2026-07-03T09:12:30+09:00
last_read: 2026-07-04T09:33:19+09:00
open_entered: 2026-07-03T09:12:30+09:00
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

# export の結果整形意味論 — export(bool) + export_key の統合可否

## 概要

要素が結果オブジェクトに「出るか出ないか」と「何という名前で出るか」を、1 フィールドで一本化できないか検討する。

案: `export: <名前> | false/null`
- 文字列を指定 → その名前で結果オブジェクトに現れる (= 現行の `export_key` 相当)
- 未指定 (デフォルト) → `name` の値で現れる
- `false` or `null` → 結果オブジェクトに一切現れない

現行 DESIGN §1.4 (docs/DESIGN.md) は次の 2 フィールド構成:

```json
"export": false,
"export_key": "<別名>",
```

この 2 フィールドを 1 フィールドに統合できるか、統合すべきでない理由があるかを詰める。

## 背景

- findings F-022 (`docs/findings/2026-06-29-ast-missing-pieces.md`): optional の semantics で unset / null / default の 3 区別が要検討とされている。`export` の on/off/別名 表現もこれと同種の「3 値以上の意味論」を持つため、設計を揃えたい
- PoC 第 4 弾で observed: 起動された空コマンドが `{}` として結果オブジェクトに現れる (presence marker)。「要素が結果オブジェクトに現れるかどうか」の一般規則と export 意味論は同時に確定しないと、片方だけ決めても矛盾が起きうる
- DR-016 (結果オブジェクトと ParserContext の2層) は「結果オブジェクトは値だけのシンプルなビュー」という前提を置いている。export の意味論はこの前提の具体化にあたる

## 受け入れ条件

- [ ] `export` (bool) + `export_key` (別名) の 2 フィールド維持 か `export: <名前> | false/null` への 1 フィールド統合 か を決定し DR 化
- [ ] `false` / `null` 指定時に結果オブジェクトへ一切現れないことを明記 (F-022 の unset/null/default 3 区別との整合を確認した上で)
- [ ] PoC 第 4 弾で観測した presence marker (空コマンドが `{}` で現れる) の一般規則と export 意味論の整合を取る
- [ ] DESIGN.md §1.4 (該当箇所は現行 92-132 行あたり) を確定した意味論に更新
