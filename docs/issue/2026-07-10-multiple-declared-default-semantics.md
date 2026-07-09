---
title: multiple 要素への宣言 default (配列) の意味論が未規定
status: open
category: design
created: 2026-07-10T03:55:38+09:00
last_read:
open_entered: 2026-07-10T03:55:38+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: 依頼元プロジェクト名
---

# multiple 要素への宣言 default (配列) の意味論が未規定

## 概要

wire schema の `default` フィールドは「任意 JSON」(DESIGN §11.4) で、multiple 要素への配列 default 宣言 (例: `{"name": "hosts", "multiple": {...}, "default": ["localhost", "localhost"]}`) は構文上合法。しかし**その意味論を規定した正本の記述がどこにも無い** (accum-fold-update-default-ops サイクル 2026-07-10 の fixture 作成中に発見。DESIGN §11.4/§6.1/§9.1、DR-044/045/051 を確認し、既存 fixture にも実例なし)。

DR-051 §2b は「反復系は 0 発火でも []」とだけ規定しており、宣言 default が反復系で尊重されるのか、[] との関係、default 席供給時の chain 通過をどうするかが開いている。

## 背景

accum-fold-update-default-ops サイクルで一度 fixture 化しかけた (hosts 要素 + value_filters/cell_filters 通過の実証 case) が、正本明文化前の fixture 先行 pin は禁則のため削除して本 issue に退避。当時の case 内容: `--hosts web1 --restore-hosts` → 宣言 default `["localhost","localhost"]` に戻り non_empty (value_filters) → unique (cell_filters) を通って `["localhost"]` に確定、という導出案だった (PIPELINE §1.1「4 値源はいずれも字句層を通って T になる」+ DESIGN §14.3「T 域座席通過は型の帰結」からの推論)。

## 裁定が要る論点

1. multiple 要素の宣言 default はそもそも尊重されるのか (反復系の default 席は常に [] で、宣言 default は decode/definition error という選択肢もある)
2. 尊重される場合、配列の各要素は「分割済み pieces」(DR-050 §4 の config array と同型) として value_filters を per-piece に通るのか、素通しか
3. `:default` op 発火 (accum セル) の戻り先: 宣言 default があればそれ / なければ [] (fixtures/multiple-parse/default-cell-ops.json は「宣言なし → []」のみ pin 済み)
4. 値源ラダーの default 席としての供給時 (未発火時) も同じ扱いか
5. scalar 要素への配列 default は構造不一致で decode/definition error で良いか (DR-050 の構造不一致 Error と同筋)

## 受け入れ条件

- [ ] 上記論点の kawaz 裁定 (DR 化または DESIGN 追記)
- [ ] 裁定に基づく fixture 追加 (尊重する場合は default-cell-ops.json への case 復活を含む)
- [ ] kuu.mbt 側の default 保持表現 (現 Entity.default_value: Value? はスカラーのみ) の追従
