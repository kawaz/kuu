---
title: kuu_ prefix factory 名のリネーム (kuu_number_parser 等 → builtin/ 正規名、DR-094 §9 案 A)
status: open
category: task
created: 2026-07-12T01:05:30+09:00
last_read:
open_entered: 2026-07-12T01:05:30+09:00
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

# kuu_ prefix factory 名のリネーム (kuu_number_parser 等 → builtin/ 正規名、DR-094 §9 案 A)

## 概要

DR-094 §9 (docs/decisions/DR-094-registry-vocabulary-namespace.md) で、旧 `kuu_` prefix
(`kuu_number_parser` / `kuu_bool_parser` / `kuu_int_parser`) は ns 正規化前の ad-hoc 疑似
namespace と位置づけられ、案 A (リネーム: `builtin/number_parser` / `builtin/bool_parser` /
`builtin/int_parser`、bare 糖衣で `number_parser` 等) が推奨採用されている。本 issue は
その実改修 (fixtures + DESIGN.md) を実施するためのもの。

## 背景

- DR-094 §9 は案 A 採用の理由として、ns 導入の動機 (ad-hoc prefix の正規化) との一致、
  および他の builtin 名 (`trim` / `in_range` 等、prefix なし) との表記スタイル統一を挙げる。
  案 B (`builtin/kuu_number_parser` のように `kuu_` を残す) は fixture 改修コストゼロだが、
  ns による「spec 組み込み」表現と実装由来 prefix が二重表現になる難点がある。
- 実改修対象 (DR-094 §9 の実測、fixtures/ 配下 grep で 2026-07-12 時点で再確認済み — 計 17 箇所):
  - `fixtures/value-typing/int-hex-value-space.json`: `kuu_int_parser` × 3
  - `fixtures/value-typing/int-round-modes.json`: `kuu_int_parser` × 12
  - `fixtures/value-typing/number-base-prefix-optin.json`: `kuu_number_parser` × 2
  - `kuu_bool_parser` は fixtures 配下に出現なし (0 箇所、リネーム対象の型名としては存在するが
    fixture 上の実出現はゼロ)
- 現行規範 `docs/DESIGN.md` にも該当箇所あり (`kuu_int_parser` / `kuu_number_parser` /
  `kuu_bool_parser` への言及、configurable factory の説明部分)。ここも新名に更新が必要。
- 過去 DR 本文 (DR-061 §3 / DR-074 §4 / DR-075) の言及は決定当時の記録としてそのまま無傷で
  よい (書き換え不要)。書き換えが要るのは現行規範 (DESIGN.md) と fixtures のみ。
- 作業順序は pin 制約により固定: **kuu.mbt 実装 (新旧両名受理 → 新名へ) → spec fixture 更新
  push → pin bump**。spec 側だけ先に fixture を新名へ切り替えると、旧名のみ受理する pin 済み
  kuu.mbt 実装との整合が崩れるため、実装側の両名受理対応が先行する必要がある。

## 受け入れ条件

- [ ] `docs/DESIGN.md` の factory 名が新名 (`builtin/number_parser` / `builtin/bool_parser` /
      `builtin/int_parser`、または bare 糖衣 `number_parser` 等) に更新されている
- [ ] fixtures 3 ファイル・計 17 箇所 (`int-hex-value-space.json` ×3 / `int-round-modes.json`
      ×12 / `number-base-prefix-optin.json` ×2) が新名に更新されている
- [ ] kuu.mbt の conformance テストが green
- [ ] pin bump 済み (spec fixture 更新後、kuu.mbt 側の pin を新版へ)
