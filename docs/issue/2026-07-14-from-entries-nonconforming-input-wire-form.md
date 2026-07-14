---
title: from_entries の輪郭検証 — 不適合入力の結果と wire 直列形
status: open
category: design
created: 2026-07-14T21:22:33+09:00
last_read:
open_entered: 2026-07-14T21:22:33+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 自リポ TODO (codex #3 レビュー由来)
---

# from_entries の輪郭検証 — 不適合入力の結果と wire 直列形

## 概要

codex #3 レビュー指摘 (A-M-6/A-C-3) の未消化分。2 点の検証が必要:

1. **不適合入力の決定的な変換結果が spec に明文で pin されていない**。`from_entries` は total
   (reasons:[]) と宣言されているが、以下のような不適合入力に対する決定的な変換結果が未確定:
   - entries 用法に 1 要素配列を渡した場合
   - 指名フィールド欠落
   - key が非 string
   - 同一 key の重複
   - key 昇格後に空 object になる場合

   参照実装の現挙動を観測して fixture 化するか、definition-time に排除できるものは検査を規定する
   必要がある。

2. **DR-044 の 3 用法の wire 直列形が wire.schema.json と整合しているか要検証**。DR-044 は
   entries 配列形・指名 2 フィールド形・key 昇格形の 3 用法を定義しているが、これが
   wire.schema.json の multiple 詳細形 (collector: string) と整合しているか、引数付き
   collector 呼び出しの canonical wire form が schema に規定されているか、lowering fixture に
   実例があるかを突き合わせる必要がある。

## 背景

codex #3 レビューでの指摘。ただし codex は wire.schema.json 未見で「表現できない」と主張して
おり、鵜呑みにせず DR-044 実物との突き合わせが先。

## 受け入れ条件

- [ ] 不適合入力 (5 パターン) それぞれの決定的な変換結果が spec に明文化される、または
      definition-time 検査として排除が規定される
- [ ] DR-044 の 3 用法の wire 直列形が wire.schema.json の multiple 詳細形と整合しているか
      判定され、不整合があれば是正案が出る
- [ ] 上記の判定結果が fixture / spec 本文に反映される

## 関連

- DR-036
- DR-044
- DR-106 §4
- codex #3 レビュー A-M-6 / A-C-3
