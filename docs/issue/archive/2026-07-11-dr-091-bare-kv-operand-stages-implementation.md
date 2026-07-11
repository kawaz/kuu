---
title: DR-091 を実装完了する: kv_map accumulator と require_equal_separator の実装 + corpus 書き直し
status: resolved
category: task
created: 2026-07-11T10:17:34+09:00
last_read: 2026-07-11T11:02:43+09:00
open_entered: 2026-07-11T10:17:34+09:00
wip_entered: 2026-07-11T11:03:52+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-11T11:59:49+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-091","implemented","dr/DR-036","implemented","§1 は既存語彙で表現可能なため実装不要 (regex_match で書ける)","conformance decoded=188 ran_cases=487 skipped=0 mismatches=0, moon test 247本","file 型は未定義語彙のため fixture 側を string に修正 (第一級 file/path 型は未起票の将来課題)","§7.2 config 全体は kuu.mbt issue scope-config-object-gap が追跡"]
blocked_by:
origin: 自リポ TODO
---

# DR-091 を実装完了する: kv_map accumulator と require_equal_separator の実装 + corpus 書き直し

## 概要

issue corpus-bare-key-value-operand (close: 2026-07-11) の裁定で、bare key=value
operand (dd の `if=/of=`、env の `VAR=val`) を 3 段の正規表現で扱う方針が DR-091
(docs/decisions/DR-091-bare-key-value-operand-stages.md) として確定した。§1 (素通し
受け) は既存語彙 (`regex_match`) で今日書けるが、§2 (kv_map accumulator) と §3
(`long_prefix: ""` + `require_equal_separator` の新設) は語彙追加・実装が必要で、
fixture / corpus への反映も未実施のため本 issue で追跡する。

## 受け入れ条件

- [ ] §2: accumulators registry に `kv_map` を追加する (piece `k=v` を最初の `=` で
      分割し Map に畳む、重複キーは last-wins) + fixture
- [ ] §3: scope config に `require_equal_separator` を新設し (`long_prefix: ""` と
      組み合わせて eq 分割形のみ受理、別引数値供給を拒否)、kuu.mbt 実装 + fixture
- [ ] `corpus/real-cli/env.json` を §1 (regex_match) で書き直す (env の完全形は
      DR-090 の pattern dd との合成、対 issue dr-090-dd-match-self-implementation)
- [ ] `corpus/real-cli/dd.json` を §3 (`long_prefix: ""` + `require_equal_separator`)
      形へ書き直し、旧 `long_prefix: ""` 単独 hack は「未定義動作」の pin を 1 件
      残して一掃する
- [ ] DESIGN §7.2 に `require_equal_separator` を追記、§8.4 / DR-036 に `kv_map` を
      語彙追加として反映する
