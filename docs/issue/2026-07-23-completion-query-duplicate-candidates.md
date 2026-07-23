---
title: completion_query が同一 insert の候補を通常版/nospace 版で重複 emit する
status: open
category: design
created: 2026-07-23T23:02:27+09:00
last_read: 2026-07-23T23:38:18+09:00
open_entered: 2026-07-23T23:02:27+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: shell-matrix (自リポ実機検証)
---

# completion_query が同一 insert の候補を通常版/nospace 版で重複 emit する

## 概要

completion_query が、同一 insert に対応する候補行を「通常版」と「nospace 版」の
2 行として重複 emit する挙動が shell-matrix の実機検証で見つかった。glue 側では
同一 flag が候補として 2 回出てくる観測結果になる。

## 背景

DR-117 §4 が定義する候補行文法上、この重複 emit が仕様として正しい (= 通常版/
nospace 版は別の候補行として区別されるべき) のか、query 実装 (kuu.mbt M1) 側の
bug (= 同一 insert は 1 行に統合すべき) なのかが未裁定。

検証ログ: kuu-cli の `docs/findings/2026-07-23-shell-matrix-verification.md` 参照。

## 受け入れ条件

- [x] DR-117 §4 の候補行文法を確認し、重複 emit の扱いを明文化する (下記裁定で対応)
- [ ] 仕様として不正なら kuu.mbt M1 (completion_query) を修正
- [ ] 仕様として正なら glue 側の重複排除責務を明記する

## 裁定 (COMPQ-Q1, 2026-07-23)

kawaz 裁定:

1. **素材段** (DR-104 §3 の word_end/cont 2 件併存) は正。変更なし。
2. **行応答 policy 段** (DR-117 §5) に新設: 同一 spelling・term 違いのペアは
   1 行へ統合する merge 規則。既定は space 形 (word_end 側、nospace なし。
   業界優勢 + bash `COMP_WORDBREAKS` 回避のため)。
3. **completion_script preset** に `insert_form: "space"|"eq"` パラメータを
   新設 (既定 `"space"`)。DR-117 §2.6。`"eq"` で cobra 互換の eq 形
   (`--flag=` + nospace) へ切替可能。

### DR-117 反映箇所

- §2.6 (新設): `insert_form` パラメータ
- §5: merge 規則
- §4.1: 注記追加
- §8.1: 増分
- 採用しなかった案 2 件
- 波及 fixtures

### 残タスク

kuu.mbt M1 での merge 規則 + `insert_form` の実装 (受け入れ条件の残り 2 項目)。
