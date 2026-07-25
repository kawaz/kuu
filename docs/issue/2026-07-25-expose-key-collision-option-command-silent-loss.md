---
title: 露出キー衝突が option × command で検出されず command が黙って勝つ (値の silent loss)
status: open
category: bug
created: 2026-07-25T16:52:07+09:00
last_read:
open_entered: 2026-07-25T16:52:07+09:00
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

# 露出キー衝突が option × command で検出されず command が黙って勝つ (値の silent loss)

## 概要

同じ露出キーへ解決する要素の組み合わせのうち、option × option の衝突は検出されるが、
option × command の組み合わせは検出されず、command 側が黙って option の値を上書きする。
両方の要素が同一入力で cli 発火しているにもかかわらず ambiguous エラーにならず、
option 側の値が result から消失する (値の silent loss)。

## 背景

dogfooding D4 中に発見。DESIGN §15.5 / DR-073 は「同じ露出キーへ解決する 2 要素が
同一入力で両方露出したら ambiguous」と規定し、`fixtures/export-key/collision.json` の
case `co-exposure-collision` が option × option でこれを pin している。しかし
option × command の組ではこの検出が効いていない。

最小再現 (kuu-cli の parse サブコマンド経由で実測、2026-07-25):

```
definition = {
  "options": [{"name": "x", "type": "flag", "long": true}],
  "commands": [{"name": "x", "type": "command", "options": [{"name": "inner", "type": "flag", "long": true}]}]
}
```

- `args ["--x"]` → success `{"x": true}`
- `args ["x"]` → success `{"x": {"inner": false}}`
- `args ["--x", "x"]` → success `{"x": {"inner": false}}` (option `--x` の値が消え、command 側が勝つ)

`effects` には `entity=x op=set operand=true source=cli` が残るため、option 側も
確かに cli 発火している。にもかかわらず ambiguous 判定が働かず、command が
option の値を silent に上書きしている。

仕様側の根拠: DESIGN §2.6 は「結果キーを持つスコープ生成要素 (command 含む) は、
選ばれたら子が全部 absent でも空 kv `{}` を持つ」と明記しており、command の選択も
露出に当たる。commands を衝突検出から除外する規定は spec 内に見当たらない。

裁定が要る点:

- (a) kuu.mbt の実装バグとして、衝突検出を option × command の組にも広げるのか
- (b) spec 側で commands を衝突検出から除外する規定を明文化するのか
  (その場合、result での値のマージ規則も別途必要になる)

実害の実例: kuu-cli 自身の定義が、global `--help` option と `help` command の
両方で結果キー `help` を名乗っている。(a) を採ると `kuu help --help` が
ambiguous になる。

fixture 案: `fixtures/export-key/` に option × command の断面を追加すべき。

## 受け入れ条件

- [ ] (a) か (b) の裁定が下る
- [ ] (a) 採用時: option × command の衝突検出が実装され、`fixtures/export-key/`
      に option × command 断面の fixture case が追加される
- [ ] (b) 採用時: DESIGN / DR に commands 除外規定と result マージ規則が明記され、
      `kuu help --help` のような実例が矛盾なく扱われることが確認される
