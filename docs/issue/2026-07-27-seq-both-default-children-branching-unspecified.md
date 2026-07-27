---
title: 両子とも default: を持つ seq の枝の立ち方が未規定 (CHILDDEF-Q1=b の残余断面)
status: open
category: design
created: 2026-07-27T11:03:05+09:00
last_read:
open_entered: 2026-07-27T11:03:05+09:00
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

# 両子とも default: を持つ seq の枝の立ち方が未規定 (CHILDDEF-Q1=b の残余断面)

## 概要

seq の**両方の子**が `default:` を持つ場合、トークン不足時にどちらの子を
空席のまま完全経路に含めるか(= 枝の立ち方・優先順位)が未規定。

CHILDDEF-Q1=b (kawaz 裁定 2026-07-26、DR-031 / DESIGN §5.2) は「`default:`
は位置に依らず値源ラダーの席であり、子は消費 0 にならず通常どおり消費を
試みる。トークンを得られなかった消費点は DR-088 §1/§2 により空席のまま
完全経路に含めてよい」と規定した。これを pin した fixture
`fixtures/seq-parse/literal-child-default-ladder.json` は **非対称ケース
のみ**を扱っている(1 子目は `default` 無し = 消費必須、2 子目のみ
`default` あり)。そのケースの `why` は「枝は 1 本のみ — 1 子目に default
が無く省略の余地がないので、"x" を 2 子目へ回す経路は成立しない」と明記して
おり、暗に「両子とも default を持てば複数の空席候補が生まれ枝分かれし得る」
ことを示唆しているが、その対称ケース自体の規定は無い。

## 背景

DR-031 §CHILDDEF-Q1=b と DR-015 の読了時に見つけた残余断面。両子とも
`default:` を持つ seq (例: `{"seq": [{"type":"string","default":"a"},
{"type":"string","default":"b"}]}`)にトークンが 0〜1 個しか来ない場合:

- トークン 0 個: 両子とも空席で埋まるのは自然に見えるが、「両方空席」を
  1 通りの完全経路として確定できるか、それとも複数の空席パターンが
  ambiguous になり得るか未規定
- トークン 1 個: そのトークンを 1 子目に消費させて 2 子目を空席にするか、
  1 子目を空席にして 2 子目に消費させるかで枝が分岐する。DR-088 の
  「静的宣言ベース判定」がどちらを canonical とするか、あるいは両方を
  ambiguous 扱いにするか規定が無い

先食み優先(DR-037/038)や完全経路(DR-041)の既存規範が、default 席が複数
並ぶこの局面にどう適用されるかの読み下しが必要。

## 受け入れ条件

- [ ] 両子とも `default:` を持つ seq でのトークン不足時の枝の立ち方
      (どの子を空席にするかの優先順位、または ambiguous 判定)を DR で規定
- [ ] 規定に対応する fixture (`fixtures/seq-parse/` 配下)を追加し、
      `literal-child-default-ladder.json` の非対称ケースと対照させる
- [ ] 3 子以上に拡張した場合の一般化(または「2 子までで十分、3 子以上は
      別途検討」の明示)

## TODO

<!-- wip 時のみ -->
