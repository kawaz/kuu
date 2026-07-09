---
title: ref テンプレ入れ子の消費境界 + multiple×ref 意味論の fixture 未整備
status: open
category: task
created: 2026-07-09T23:05:45+09:00
last_read:
open_entered: 2026-07-09T23:05:45+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: ref-template-result-shape サイクルの codex レビュー (2026-07-09)
---

# ref テンプレ入れ子の消費境界 + multiple×ref 意味論の fixture 未整備

## 概要

ref テンプレ入れ子の消費境界と multiple×ref の意味論に、fixture 未整備の
輪郭が 3 つある。いずれも `ref-template-result-shape` サイクルの codex
レビュー (2026-07-09) で検出。実装側の対は kuu.mbt の
`multiple-ref-accum-gap` issue。

1. **先食い×ref 入れ子**: greedy 衛星の読めるトークンが ref テンプレ内の
   string leaf に食われない (DR-041 §4) ことは `interjection.json` が素の
   positional で pin しているが、ref 経由の入れ子 leaf に対する輪郭
   fixture が無い。kuu.mbt 実装ではこの穴が実在した (`consume_compound`
   導入で修正)。例: positional ref+repeat の途中に `--verbose` が来る case。
2. **option ref repeat の min:0 (unbounded) での sibling trigger 境界**:
   `--hlcolors` (min:0 repeat) の直後に別 option `--other` が来た時、
   template string leaf が `--other` を食わず option 発火が優先されるべき
   輪郭。kuu.mbt では suppression 経路の穴として検出 (wbtest で暫定 pin、
   spec fixture が正本になるべき)。
3. **multiple×ref の意味論**: `multiple:true` と `ref` の同時指定時、
   DESIGN §6.1 から配列結果は導出できるが、row の累積 (再発火ごとに row
   配列へ append するのか、cell 上書き last-wins の repeat 版とどう
   区別されるか) の fixture が無い。`last-wins-repeat-rows.json`
   (multiple 無し = 上書き) の対照として multiple あり = 累積の pin が要る。

## 背景

`ref-template-result-shape` の bug fix サイクルで codex にレビューを
依頼した際、上記 3 点が「実装は直ったが仕様輪郭を固定する fixture が無い」
状態として指摘された。kuu.mbt 側では既に一部 (1, 2) が実バグとして踏まれ
修正済みだが、spec リポの fixture がそれを正本として固定していない。

## 受け入れ条件

- [ ] 上記 1〜2 の消費境界 fixture 追加 (既存 repeat-parse / multiple-parse
      の分類慣習に従う)
- [ ] 3 の multiple×ref fixture 追加 (必要なら kawaz 裁定を仰ぐ)
- [ ] kuu.mbt 側 pin bump + conformance green で解消確認
