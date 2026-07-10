---
title: values 制約と variant 枝競合 (:set vs :set:always) の意味論明文化
status: resolved
category: design
created: 2026-07-10T10:53:43+09:00
last_read: 2026-07-10T18:45:19+09:00
open_entered: 2026-07-10T10:53:43+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-10T20:28:30+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-086","spec/f85d2331","spec/a3230016","spec/2bb72f27","implemented","done:論点1/2/4はDESIGN §5.3/DR-028/DR-041 §4への明文化追記3件で導出済みと判定 (spec f85d2331)。論点3とpositional同居の残論点はkawaz裁定「食える分は食う」によりDR-086でcut意味論を新設 (spec a3230016)、fixtureはset-always-variant-branch.json 4case + set-always-variant-cut-positional-{required,optional}.json 2caseでpin済み (spec 2bb72f27)。受け入れ条件3(kuu.mbt values decode確認)は未サポートを実機確認し、kuu.mbtリポのissue values-decode-supportを対で起票済み — decode実装とfixture green化はそちらが追跡"]
blocked_by:
origin: 自リポ TODO
---

# values 制約と variant 枝競合 (:set vs :set:always) の意味論明文化

## 概要

DR-081 §4 の canonical 例は `values: ["always","none","auto"]` + `long: [":set", ":set:always", ...]` という構成で、裸 `--color` や `--color --foo` が「:set 読みの dead-end により :set:always (引数なし枝) が勝つ」挙動を例示している。しかしこの構成の意味論に明文の規定が無い。

## 背景

fixture 化 (2026-07-10) 作業中に発覚。正本明文化前の fixture 先行 pin は禁則のため、当該行の pin を本 issue に退避した。

## 明文が無い点

1. **or 構造 (values 展開後) を持つ node への long/default/env 同居**: 構文上は書けるが (schema は開いている、DESIGN §5.1/5.2 の排他は exact×or/seq のみ)、意味論の前例・規定なし
2. **:set 値スロットと or/values 制約の相互作用**: type 参照 parse と「or 内 exact との照合」がどう並存するか。type フィールドなしで or 自体が型を兼ねるのか
3. **枝競合の経路**: `--color <values 不一致トークン>` で :set 読みが dead-end して :set:always が勝つ、`--color always` では :set が勝つ (positional 不在なら :set:always + 残余 unexpected_token が落ちるため) — この経路探索の帰結を DR-038/041/043 の既存規定から一意導出できるか、values 側の追加規定が要るか
4. greedy 値スロットの raw 消費 (DR-041 §4「発火した greedy は値スロットを一体の束として raw 消費」) と「values 不一致による dead-end → 別枝採用」の関係 — raw 消費は無条件のはずが、複数入口 variant があると再解釈が起きるのか

## 関連

- DR-081 §4 (canonical 例の当該行) / DESIGN §5.3 (values は or のショートハンド) / DR-038 (完全経路 ambiguity) / DR-041 §4 (greedy raw 消費) / DR-028 (type 参照)
- fixtures/value-sources/ の default-source-model 系 fixture (values 抜きの縮小版で本質行のみ pin 済み)

## 受け入れ条件

- [ ] 上記 1〜4 の意味論の kawaz 裁定 (DR 化または DESIGN 明文化)
- [ ] DR-081 §4 の :set:always 行の fixture 化
- [ ] kuu.mbt の values decode 対応の確認 (未サポートなら実装 issue を対で起票)
