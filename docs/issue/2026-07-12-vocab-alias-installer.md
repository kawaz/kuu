---
title: vocab_alias installer — 語彙の糖衣 alias を Map 一個で追加する installer 構想
status: idea
category: design
created: 2026-07-12T21:42:04+09:00
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

# vocab_alias installer — 語彙の糖衣 alias を Map 一個で追加する installer 構想

## 概要

wire 語彙の綴りの好み (例: factory config キーの prefix 有無、属性の別名) を、spec の正準語彙のリネームで解決するのではなく、「語彙の糖衣 alias を追加する installer」をユーザランドに置くことで解決する構想 (kawaz 発案、2026-07-12)。

config は `Map<alias, canonical>` 一個で、定義の decode/lowering 時に alias フィールド名を正準語彙へ純糖衣展開する。正準語彙・fixtures・conformance は単一のまま揺れない。

## 背景

factory config キーの prefix 混在 (`number_`/`int_` 付き vs bool の bare) を bare 統一する提案が出た際、kawaz が「正準を動かすのでなく alias 機構で好きにできるようにすれば良い」と裁定し、混在は現状維持で確定した。

その裁定の中で出た構想が本 issue の内容:

- 所有語彙の排他 (DR-042 不変則③) が、alias と既存語彙の衝突を definition-error として自然に検出する (= 追加の衝突検出ロジックが不要という見立て)
- extension ns (DR-094 open set) の住人として core 外で実装可能なので、spec 本体への追加は必須ではない — 「やりたいやつがやりゃいい」ポジション
- 懸念 (併記): alias だらけの定義は第三者可読性が下がるが、これは定義作者の選択の範疇

## 受け入れ条件

- [ ] installer の config 形状 (`Map<alias, canonical>`) と decode/lowering 時の展開タイミングの設計が固まる
- [ ] DR-042 不変則③ (所有語彙の排他) による alias-既存語彙衝突の definition-error 化を裏取りする
- [ ] extension ns (DR-094) 配下での実装可否・要否を判断する (= spec 本体変更が不要という前提の裏取り)

## 設計ノート (kawaz、2026-07-12 追記)

- vocab_alias は適用順に依存し冪等にできない — alias 展開は綴りの書き換えなので、他の installer が語彙を読む (所有検査・席宣言) より前に必ず適用される必要がある。
- ただし installer は定義側で配列として宣言する構造なので、特別な機構は不要 — 「配列順 = 適用順」であり、vocab_alias を配列の先頭に置くのは定義作者の責任で済む。先頭に置かなかった場合は未展開 alias が通常の unknown-vocab エラー (DR-054) として自然に表面化する。
