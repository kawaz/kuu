---
title: 残 fixture 化 2 件 — short × 文字系値 ambiguity / int hex 値空間
status: open
category: task
created: 2026-07-08T21:54:42+09:00
last_read:
open_entered: 2026-07-08T21:54:42+09:00
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

# 残 fixture 化 2 件 — short × 文字系値 ambiguity / int hex 値空間

## 概要

distill-spec-gaps close 時の切り出し。いずれも spec 規則は確定済みで fixture 化のみの作業。

## 背景

2026-07-08 台帳 issue 監査。旧 distill-spec-gaps の #3 (DR-074) 決着後の派生 2 件。

## 受け入れ条件

- [x] short × 文字系値 ambiguity fixture: DR-074 §5 の枝生成規則 (確定済み) を fixtures/matcher-readings/ に追加
      → `matcher-readings/short-cluster-inf-multi-accept.json` (1 case、3-way multi-Accept)。DR-074 §5 の観念例 `-inf` の字 i / n / f を flag に、`-s` を string 値取り short に置いて具体化。walk_short が in-token 値長さ 1/2/3 で独立枝を生成し 3 経路全成立 → ambiguous。cluster-split-string.json の 2-way を 3-way に一般化。DR-041 §3 早閉じ抑制で positional-vs-cluster 経路の ambiguity は matterialize しない (greedy 面が positional 素通し枝を殺す) ため、実装が spec DR-074 §5 の枝生成規則を materialize するのは short cluster 内部の walk_short multi-Accept が正 (DR-041 §3 と DR-074 §5 の合成境界)
- [x] int hex 値空間 fixture: DR-075 の規定 (int + base_prefix opt-in 経路の値空間判定) を fixtures/value-typing/ に追加
      → `value-typing/int-hex-value-space.json` (4 case)。kuu.mbt の `kuu_int_parser` factory が `int_round` + `number_allow_base_prefix` の 2 config キーを直交合成できる (`parse_int_value_ext` + resolve.mbt decode で配線済み) ことを実機確認した上で fixture 化。`0xff`=255 (hex 整数値) / `0x1.8p3`=12 (hex float 整数値) は int_round モードによらず受理、`0x1.8p0`=1.5 (hex float fractional) は int_round=error で `not_an_integer`、int_round=floor で `1` へ丸めて受理。int-value-space.json (10 進 default) と int-round-modes.json (10 進 10 モード判別) の hex 断面補完
