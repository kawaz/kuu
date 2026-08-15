---
title: 「name スコープ」呼称群を「結果キー軸占有」語彙へ統一する用語整理
status: open
category: task
created: 2026-08-16T01:09:21+09:00
last_read:
open_entered: 2026-08-16T01:09:21+09:00
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

# 「name スコープ」呼称群を「結果キー軸占有」語彙へ統一する用語整理

## 概要

TRG-Q4=a の裁定 (スコープ生成 = resolved export_key 軸の占有、DR-025/033/006 改稿済み) の波及で、
REFERENCE.md:67/:266/:544、DR-044、DR-050、LOWERING.md:418/:429、DESIGN の一部箇所に「name スコープ」
「name が結果スコープを作る」といった旧規範のままの呼称群が残存している。これらを新語彙
(結果キー軸占有・resolved export_key 軸の占有) へ全面的に統一する。

## 背景

fable レビュー (M2/m5, 2026-08-15) で検出。規範矛盾そのものの直し (DESIGN §2.3/§11.1 等) は
当該サイクルで対応済みだが、残りの用語統一は範囲が広く別サイクルでの対応とされた
(DR-136 サイクルの push 後に着手)。

## 範囲に含める: DESIGN 全体への trigger_name 語彙の織り込み

呼称統一と同じ「読者が旧規範のモデルで読んでしまう」問題として、**DESIGN.md に `trigger_name` の
概念紹介が無い**点も本 issue の範囲に含める。

DR-136 で CLI 表面の照合綴りは一級軸 `trigger_name` になったが、DESIGN 側の `trigger_name` 言及は
long の主入口綴りを直した 3 箇所 (commit `320d72d9`) だけで、**軸そのものを紹介する記述が無い**。
名前軸を説明する §2.x を読んだ読者は「綴りは name が供給する」という旧モデルのまま先へ進んでしまう。

やること:

- 名前軸を扱う節 (§2.1〜§2.3 近辺) に `trigger_name` 軸を加え、DR-136 §1 の軸表 (trigger_name /
  id / export_key / value_name / display_name と、name からの文字写像) を DESIGN の粒度で紹介する
- `name` の説明を「各軸へのデフォルト供給源」の語彙に揃える (それ自体は CLI 表面にも結果にも
  直接現れない)
- 正本は DR-136 と REFERENCE §2.2 の名前軸まとめ表なので、DESIGN 側は概念紹介 + 参照に留めて
  規定を二重管理しない

## 受け入れ条件

- [ ] REFERENCE.md:67/:266/:544 の「name スコープ」呼称を新語彙へ置換
- [ ] DR-044、DR-050 内の該当呼称を新語彙へ置換
- [ ] LOWERING.md:418/:429 の該当呼称を新語彙へ置換
- [ ] DESIGN 内の残存箇所 (§2.3/§11.1 以外の波及箇所) を洗い出し置換
- [ ] 置換後、旧呼称 (「name スコープ」「name が結果スコープを作る」) の grep 残存がゼロであることを確認
- [ ] DESIGN に `trigger_name` 軸の概念紹介を追加し、`name` の説明を「各軸へのデフォルト供給源」語彙へ揃える (規定は DR-136 / REFERENCE を正本として参照に留める)

## 注意

- **DR 本文の Superseded / 歴史注記に出てくる「name スコープ」は判断記録なので触らない** (当時の呼称のまま残すのが正)
- 意味が変わる置換ではないので fixture の期待値には影響しない見込み。ただし fixture の why に同じ呼称が出るなら同時に拾う
