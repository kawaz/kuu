---
title: §7.2 config キーの導出裁定 2 件の明文化と輪郭 fixture (short_combine 管掌範囲 / require_equal_separator×allow_equal_separator の definition-error)
status: open
category: task
created: 2026-07-11T13:46:19+09:00
last_read:
open_entered: 2026-07-11T13:46:19+09:00
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

# §7.2 config キーの導出裁定 2 件の明文化と輪郭 fixture (short_combine 管掌範囲 / require_equal_separator×allow_equal_separator の definition-error)

## 概要

kuu.mbt の scope config オブジェクト実装 (2026-07-11) で、spec に明文のない 2 点を既存 DR から導出裁定した。この裁定を DESIGN.md §7.2 に明文化し、輪郭を固定する fixture を追加する。

1. **short_combine:false の管掌範囲** = 複数文字クラスタ読み (`-ab` / `-abc`) の禁止のみで、単一文字発火と値付着 (`-p80`) は許可のまま。
   根拠: DR-014 line 74 の定義文言「`-abc` の結合許可」と DR-041 line 77 の「値付着制限は別の独立方言パラメータ」という例示。

2. **require_equal_separator:true + allow_equal_separator:false の組合せ** は全 long option が入口を失う静的矛盾なので definition-error。
   根拠: DR-083 §5 の「定義時に静的に既知の不整合は definition-error」という筋。

## 背景

scope config オブジェクトの実装中、上記 2 点は spec 本文に直接の明文記述がなく、既存 DR (DR-014 / DR-041 / DR-083) の定義文言・例示・原則から間接的に導出する形で裁定した。実装 (kuu.mbt) は先行しているが、この裁定が正本 (DESIGN.md) に反映されておらず、conformance を担保する輪郭 fixture も未整備。

## 受け入れ条件

- [ ] kawaz が上記 2 件の導出裁定を追認、または修正裁定を出す
- [ ] DESIGN.md §7.2 (docs/DESIGN.md line 515〜) に裁定内容を明文追記 (または DR-091 追補/新 DR の判断を経て反映)
- [ ] fixtures/ に輪郭 fixture を追加:
  - short_combine:false 下での 3 読み分離 (単一文字発火 / 値付着 `-p80` / 複数文字クラスタ `-abc` 禁止) を区別するケース
  - require_equal_separator:true × allow_equal_separator:false の definition-error ケース
- [ ] kuu.mbt の fixtures pin を bump し、追加した輪郭 fixture が pin された状態で conformance green
