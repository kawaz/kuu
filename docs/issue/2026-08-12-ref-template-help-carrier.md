---
title: ref/template 由来 help_meta の provenance carrier 未実装 (M1 次サイクル)
status: open
category: task
created: 2026-08-12T11:08:26+09:00
last_read: 2026-08-12T14:57:04+09:00
open_entered: 2026-08-12T11:08:26+09:00
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

# ref/template 由来 help_meta の provenance carrier 未実装 (M1 次サイクル)

## 概要

DR-116 §4 の説明引き直しを ref template 越しの候補にも効かせる対応を次サイクルへ持ち越す。inline 宣言分は実装済み (commit 9d56053c)。ref/template 由来分は規模: inline の 2〜3 倍。

## 背景

- (1) `AtomicAST.templates` が `Map[String, @engine.Node]` (front_door.mbt:42) で宣言層でなく help_meta を持たないため、新しい carrier が要る
- (2) DR-078 は同一テンプレへの複数参照を許すため、origin (= テンプレ内部 leaf 名、DR-104 (iv)) だけでは参照インスタンスが決まらない。M4 の fire_path と同型の provenance channel が engine に要る
- (3) DR-104 (iv) の非対称 (trigger の origin = 参照元要素名 / 値位置 = テンプレ内部 leaf) で、2 つの面が別の carrier に照合される

## 着手前の確認手順

wire で ref template 内 leaf に help を書いて lower が通るか、の 1 点から着手する (= surfacing する help がそもそも存在するか)。`fixtures/complete/ref-template-origin-value.json` の leaf は help 無し。

## 確認結果

**前提成立**。template 内部 leaf は `help` を宣言でき、kuu.mbt の wire decode + lower を通過する。一方、その文言は現状の complete candidate と help model のどちらにも搬送されない。したがって surfacing 対象は実在し、provenance carrier の設計に進む価値がある。

仕様上も、DR-078 §1 は `definitions.templates` の値を「要素定義と同じ構造記法」と定め、`schema/wire.schema.json` の node は `help` を全 node 共通の宣言層属性として持つ。

### 再現

`fixtures/complete/ref-template-origin-value.json` と同じ定義の template leaf 2 個へ、次の属性だけを追加した一時 complete fixture と help fixture を用意した。

```json
{"type": "string", "name": "primary", "help": "primary template value"}
{"type": "string", "name": "secondary", "help": "secondary template value"}
```

一時 fixture root には正本の `fixtures/lowering/` も配置して lower conformance runner の入力を満たし、kuu.mbt の基準 commit `635b61af8daa` で実行した。

```sh
cd "$KUU_MBT"
KUU_FIXTURES="$SCRATCH/template-help-fixtures" moon test --target native
```

実出力:

```text
[json-conformance] decoded=26 ran_cases=26 skipped=0 mismatches=0
[json-conformance] decoded: complete/template-leaf-help.json,help/template-leaf-help.json,...
Total tests: 737, passed: 737, failed: 0.
```

complete fixture は元 fixture と同じ 2 candidate を期待し、そのまま PASS した。両 candidate は `origin` が `primary` / `secondary` で分かれるが、template leaf の help 文言を持たない。

help fixture の実出力は次のとおり。参照元 option `--item` は現れるが、template leaf の help 文言は現れない。

```json
{"outcome":"help","command_path":[],"usage":{"has_options":true},"options":[{"spellings":["--item"],"value_structure":{"single":{"type":"string"}},"hidden":false,"deprecated":false,"origin":"local"}]}
```

### 解釈

- `parse_definition` を使う公開 conformance 経路が fixture を decode し、lower conformance を含む native test 全件が成功したため、template leaf の `help` は lower に拒否されない。
- complete candidate と help model の双方で文言が消えるため、宣言不能ではなく carrier 欠落が問題である。
- 観測対象は kuu.mbt 基準 commit `635b61af8daa` の native target。ほかの target は未観測。

## 受け入れ条件

- [x] 上記確認手順 (ref template 内 leaf への help 記述 + lower 通過確認) を実施
- [ ] 確認結果を踏まえ、provenance carrier の設計・実装方針を決定
- [ ] ref/template 由来分の DR-116 §4 説明引き直しが実装される

## TODO

<!-- wip 時のみ -->
