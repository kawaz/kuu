---
title: exclusive_group に「少なくとも1つ必須」の表現が無い — tar のモード必須が書けない
status: wip
category: design
created: 2026-07-12T18:39:04+09:00
last_read:
open_entered:
wip_entered: 2026-07-14T10:13:19+09:00
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

# exclusive_group に「少なくとも1つ必須」の表現が無い — tar のモード必須が書けない

## 概要

corpus tar 調査 (2026-07-12、実機 bsdtar 3.5.3) で、`tar -vzf archive.tar.gz`
(モード文字 `c`/`t`/`x` 等を一切指定しない呼び出し) が実機では
`Must specify one of -c,-r,-t,-u,-x` の必須違反エラーになることを確認した。
kuu の現行語彙ではこの制約が表現できない。

`DESIGN.md` §9.2 の `exclusive_group` は「同じグループ名の要素群のうち
最大 1 つしか起動できない (排他)」だけを規定しており、「グループのうち
少なくとも 1 つは必須 (組み合わせて『ちょうど 1 つ』)」を宣言する語彙が
存在しない。要素単位の `required` (DR-093) を排他グループの全メンバーに
付けると「全員必須」になってしまい、意味が変わるため代用できない。

## 背景

- 対象箇所: `corpus/real-cli/tar.json` — モード 3 flag (`c`/`t`/`x` 等) が
  `exclusive_group: ["mode"]` で排他のみ表現されており、必須性は未表現
- 仕様根拠: `DESIGN.md` §9.2 (`exclusive_group` の定義)、§15.9 (関連する
  組合せ制約の記述箇所)
- 関連 DR: `docs/decisions/DR-093-*.md` (要素単位の `required` 導入)
- 裏取り済みの事実はここまで。解決形 (グループ単位の `required` 宣言 /
  `definitions` 側の group descriptor 新設 / `exclusive_group` の詳細
  object 形への拡張 等) は未検討・未裁定。本 issue はそのフラグ立てのみ。

## 裁定 (2026-07-14)

kawaz 裁定確定: `required_group` 属性でグループ単位の「少なくとも1つ必須」を
遅延述語層に追加する方針。DR-103 として起草開始 (未 land、進行中)。

## 受け入れ条件

- [ ] 解決案 (グループ単位 `required` / group descriptor / `exclusive_group`
      object 化 等) を比較検討し、DR として裁定する
- [ ] 裁定した語彙を `DESIGN.md` §9.2 に反映する
- [ ] `corpus/real-cli/tar.json` のモード必須制約を新語彙で表現できることを
      fixture 等で確認する
