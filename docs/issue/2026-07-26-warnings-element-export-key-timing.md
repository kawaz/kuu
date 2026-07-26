---
title: warnings[].element のキー体系が export_key 適用の前後どちらか未規定
status: open
category: design
created: 2026-07-26T13:09:30+09:00
last_read:
open_entered: 2026-07-26T13:09:30+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: kuu.mbt
---

# warnings[].element のキー体系が export_key 適用の前後どちらか未規定

## 概要

CONFORMANCE §2 success の説明が `sources` と `warnings` のキーを一括りに「entity name (scope-path 修飾) 側の名前空間」と書いていた。`sources` 側は 2026-07-26 に「export_key 適用後の露出キー、result と同一のキー体系」へ明確化した (kuu.mbt の bug 修正 `2026-07-25-sources-projection-skips-export-key-under-commands` に伴う) が、**`warnings[].element` については未検証のまま残している**。

## 背景

`warnings[].element` は DR-058 §2 で「代替すべき canonical セル参照」と規定されている。「canonical」は宣言面 (deprecated な入口に対する canonical な入口) を指す語で、**結果面の露出キーとは軸が違う**可能性が高い。つまり:

- (a) `element` は宣言面の canonical セル参照 = export_key 適用**前**の名前。deprecated 警告は「定義のどの入口を使ったか」の話なので宣言面が筋
- (b) `sources` と揃えて結果面の露出キー = export_key 適用**後**

現在の CONFORMANCE §2 は (a) を示唆する書き方 (「canonical セル参照 (どの入口が deprecated かでなく代替すべき canonical、DR-058 §2)」) だが、明示的に export_key との関係を書いていない。

### 確認すべきこと

- DR-058 §2 の原文で canonical の指すものを確認する
- `export_key` を持つ要素に deprecated alias を付けた fixture が corpus にあるか (無ければ断面が空 = 実装がどちらでも通る)
- 実装 (kuu.mbt) が warnings の element に何を載せているか実測

## 受け入れ条件

- [ ] CONFORMANCE §2 の warnings 箇条書きに export_key との関係が 1 文で書かれている
- [ ] その規定を pin する fixture が corpus にある (deprecated alias × export_key の交差)

## 関連

- docs/CONFORMANCE.md §2 success の `sources` / `warnings` 箇条書き
- DR-058 §2 (deprecated 警告)
- DR-052 §1 (結果キー軸の一本化)
- kuu.mbt issue 2026-07-25-sources-projection-skips-export-key-under-commands (sources 側の対応)
