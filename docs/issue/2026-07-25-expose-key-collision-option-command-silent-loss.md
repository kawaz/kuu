---
title: 露出キー衝突が option × command で ambiguous に昇格しない (command が黙って勝つ)
status: open
category: bug
created: 2026-07-25T16:52:07+09:00
last_read: 2026-07-31T00:00:00+09:00
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

# 露出キー衝突が option × command で ambiguous に昇格しない (command が黙って勝つ)

## 概要

同じ露出キーへ解決する要素の組み合わせのうち、option × option の衝突は検出されるが、
option × command の組み合わせは検出されず、command 側が黙って option を上書きする。
両方の要素が同一入力で cli 発火しているにもかかわらず、DESIGN §15.5 / DR-073 が
規定する ambiguous エラーに昇格しない。

**スコープ訂正 (2026-07-25、統括の再実測)**: 起票時は「option 側の値が result から
消失する (値の silent loss)」と書いたが誤り。切り分け直すと 2 つの別現象が混在していた。

1. **kuu.mbt の in-memory な `ResultValue::Object` は同名キーのエントリを両方保持している**。
   実証: kuu-cli の dispatch が result の全エントリを走査して `Bool(true)` を探す実装
   (kuu-cli commit b07b7406 の `help_requested`) が実際に機能しており、`kuu help --help` で
   help option の `Bool(true)` と help command の `Object` の両方が in-memory に存在することが
   確認できる。したがって **kuu.mbt の result builder は値を捨てていない**。
2. 一方 **JSON 直列化では片方しか出ない**。重複キー保持パーサ (python json
   `object_pairs_hook`) で kuu-cli の parse 出力を読んでも result のエントリは 1 件のみ
   (command scope 側の object が残り、option の bool が消える)。これは kuu-cli の envelope
   直列化の問題であり、**別 issue として kuu-cli 側に起票すべき** (DR-109 は CLI envelope と
   fixture expect の厳密一致を要求しているため、重複キーを持つ result の直列化規則が
   未定義なのが根本)。

したがって **本 issue のスコープは (A) 露出キー衝突 (option × command) が
DESIGN §15.5 / DR-073 の規定どおり ambiguous に昇格しないことに限定する**。
「値の silent loss」は kuu.mbt レベルでは発生していない (JSON 直列化レベルでのみ発生、
別 issue 管轄)。裁定点 (a)/(b) は変更なし。

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
- `args ["--x", "x"]` → success (JSON 直列化では `{"x": {"inner": false}}` のみが見える。
  上記スコープ訂正のとおり in-memory の result は option 側 `Bool(true)` エントリも
  保持しているが、JSON 直列化は重複キーの片方 (command 側) しか出力しない)

`effects` には `entity=x op=set operand=true source=cli` が残るため、option 側も
確かに cli 発火している。にもかかわらず ambiguous 判定が働かず、command が
option を silent に上書きした形で扱われている (= 衝突が検出されていないという意味での
silent、result の値そのものは kuu.mbt レベルでは失われていない)。

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

## 関連論点 (別 issue / Q で扱う)

DR-113 §2 / DESIGN §14.1 / §15.15 の内部セル → `help_query` 入力の写像表に
**path の導出規則が無い**ことが判明している。アプリが scope を知る手段が
「result のキーを見る」しかないため、本 issue の衝突がそのまま scope 判定の
誤りに直結する構造がある (別 issue で起票予定、本 issue の受け入れ条件には含めない)。

## 受け入れ条件

- [ ] (a) か (b) の裁定が下る
- [ ] (a) 採用時: option × command の衝突検出が実装され、`fixtures/export-key/`
      に option × command 断面の fixture case が追加される
- [ ] (b) 採用時: DESIGN / DR に commands 除外規定と result マージ規則が明記され、
      `kuu help --help` のような実例が矛盾なく扱われることが確認される
