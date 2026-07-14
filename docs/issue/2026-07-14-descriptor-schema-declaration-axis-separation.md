---
title: descriptor schema の宣言軸再整理 (role/construction/invocation/fallibility)
status: idea
category: design
created: 2026-07-14T21:20:23+09:00
last_read:
open_entered:
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

# descriptor schema の宣言軸再整理 (role/construction/invocation/fallibility)

## 概要

`schema/descriptor.schema.json` の `kind` (installer/factory/filter/collector) は
「役割 (role)」軸と「生成方式 (construction)」軸が 1 本の enum に混在しており、
`configurable filter` のような「役割 = filter × 構築 = factory」の組み合わせを
表現できない。codex #3 レビュー (A-M-1/M-3/M-4) で指摘された、descriptor の
宣言軸そのものの構造的な不足を扱う。

completers registry の実体化 (`kind` に completer を足す/factory の書き方を
決める) タイミングで、以下の軸分離をまとめて検討する:

- **role 軸**: installer / filter / factory / collector 等、住人が果たす意味論的役割
- **construction 軸**: 単体 (単一 name で完結) / factory (config 付き構築が必要)
- **invocation 軸**: DSL 引数 (`in_range`/`length_range` の `min`/`max` のような
  呼び出しごとの args) を宣言できる軸。現状 `config` 欄に「これは config でなく
  DSL 引数の注記」という但し書きを添えて同居させており (`schema/builtin-descriptors.json`
  の `in_range`/`length_range` 参照)、descriptor 自身が「config ではない」と
  自認する形になっている。M-18 の definition-time 検査 (descriptor 宣言と実装の
  引数リストの整合確認) を機械化するには、invocation 専用の宣言軸が必要
- **fallibility 軸**: 現行 `signature` (Validate/Transform) は「入力保持の可否」の
  複合軸になっており、transform しつつ reject もありうる filter (例: 変換した上で
  範囲外なら reject するような filter) を表現できない。`reasons` が空/非空かで
  fallibility を機械判定する既存規約 (DR-095 §3) との整合も含めて再検討が必要

## 背景

`kind` は DR-061 §1 で 4 宣言軸 (owns/observes/config/reasons) の入れ物として
導入され、DR-066 §2 で reasons が追加、DR-106 で `domain` (carrier 軸:
scalar/array) が signature (fallibility 軸) と直交する形で分離された。この
DR-106 の分離パターン (直交する軸を複合 enum でなく独立フィールドにする) を
`kind` 自体にも適用すべきという指摘が codex #3 レビューで出た。

具体的な症状:

1. **role × construction の混在**: `kind: "factory"` は「configurable factory」
   (types/accumulators/completers 等の名前 + config 参照先) を指すが、これは
   本来「filter という role を factory という construction で作る」という
   直交した組み合わせの 1 例に過ぎない。configurable filter (config 付きで
   構築される filter) を表現しようとすると `kind` の enum が破綻する
2. **invocation 軸の不在**: `config` フィールドの description 自体が
   「filter descriptor には通常出現しない (filter の呼び出し引数は DSL の
   `args` であり descriptor 宣言の config キーとは別物)」と明記しているのに、
   実際の `in_range`/`length_range` descriptor は DSL 引数の意味を `config`
   欄に注記として書いている (二重の意味を 1 フィールドに押し込めている)
3. **fallibility の複合軸**: `signature: Validate/Transform` は「入力を変えるか」
   と「reject しうるか」を同時に表しており、transform かつ rejectable な filter
   を宣言できない

## 受け入れ条件

- [ ] completers registry の実体化に着手する際、role/construction/invocation/fallibility
      の軸分離案を DR として起票し、DR-061/DR-106 との整合 (Superseded か拡張か)
      を明示する
- [ ] 分離案が `in_range`/`length_range` の DSL 引数を「config でない」と自認する
      現状の歪みを解消することを確認する
- [ ] 分離案が M-18 (definition-time 検査の機械化) を実現可能にすることを確認する

## 関連

- DR-061 (registry descriptor and configurable factory)
- DR-106 (descriptor role and carrier axes) — 直交軸を独立フィールドに分離する
  先例パターン (domain/signature)
- codex #3 レビュー (A-M-1/M-3/M-4) — 今サイクルの journal / findings 側の記録参照
