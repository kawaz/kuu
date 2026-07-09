---
title: definition_error fixture format の確定 (DR-065 予約分の初実例化) + accum×update の kind 判定
status: open
category: design
created: 2026-07-10T03:58:36+09:00
last_read:
open_entered: 2026-07-10T03:58:36+09:00
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

# definition_error fixture format の確定 (DR-065 予約分の初実例化) + accum×update の kind 判定

## 概要

DR-065 §1 は conformance fixture の query タグとして `"definition_error"` (DR-054) を**予約のみ**しており、expect 構造の詳細は「後続で確定」と明言している (射程外節にも重ねて記載)。現在リポ全体に definition-error 形式の fixture は 0 件。

accum-fold-update-default-ops サイクル (2026-07-10) で「accum 要素への `:update:<T=>T transform>` variant 宣言は静的 definition-error」という導出 (DR-077 §2 の「transform でない・存在しない → definition-error」ファミリ + accum 宣言と transform は定義時点で静的に既知 + min>1 明示 reject の前例) に至ったが、これを fixture 化するには予約 format の初実例化が必要と判明し、保留した。実装側 (kuu.mbt) は min>1 前例と同型に wbtest で pin して先行済み。

## 背景

DR-065 §1 で query タグ予約が決まった時点では expect 構造は未確定のまま射程外とされていた。今回 accum×update の definition-error ケースを spec fixture として追加しようとして、この予約分の実例が 1 件も無いこと (= どの形式で書けばいいか前例が無い) が発覚し、fixture 化を進める前に format 自体の裁定が必要になった。

## 裁定が要る論点

1. **query: "definition_error" の expect 構造**: DR-054 §4 の parse_definition() 返値 `{outcome: "definition-error", errors: [{element, kind, message, hint}]}` をそのまま expect に転用するのが素直 (DR-065 §2「fixture 専用の簡略形は作らない」原則の類推)。message/hint は文言なので比較対象外 (kind までの比較) とするか
2. **accum×update の kind**: DR-054 §4 の kind 列挙 (vocab-intersection / unknown-vocab / invalid-range / absent-ref / circular-ref / zero-progress / config-cycle) のどれに落ちるか。候補見立て: invalid-range (kuu.mbt の min>1 reject が DInvalidRange を使った前例と同系の「構成が値域外」) vs unknown-vocab 系 (「transform でない」の原義)。signature 不一致という新 kind を追加する選択肢もある
3. 同 format が確定したら、min>1 (option ref repeat) の definition-error も spec fixture 化できる (現在 kuu.mbt wbtest のみの pin)

## 受け入れ条件

- [ ] query: "definition_error" の expect 構造の kawaz 裁定 (DR 化)
- [ ] accum×update と min>1 の definition-error fixture 追加
- [ ] kuu.mbt harness の decode 対応 + wbtest pin からの移行

## 関連

- DR-065 §1 (query タグ予約) / DR-054 §4 (parse_definition 返値・kind 列挙) / DR-069 (definition-error プロファイル) / DR-077 §2 (transform の静的検査)
- kuu.mbt: accum-fold-update-default-ops issue (実装は wbtest pin で先行)
