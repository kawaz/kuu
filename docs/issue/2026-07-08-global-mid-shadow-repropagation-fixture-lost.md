---
title: 「global 中間 shadow の孫への再伝播」の輪郭 fixture が alias 移行で失われた
status: open
category: task
created: 2026-07-08T20:40:29+09:00
last_read:
open_entered: 2026-07-08T20:40:29+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: dr066-path worker (spec commit 8f4e1373 の移行作業中に発見)
---

# 「global 中間 shadow の孫への再伝播」の輪郭 fixture が alias 移行で失われた

## 概要

`fixtures/command-scope/shadowing-subtree.json` は旧 LLiteral 構文
(`long:["verbose"]`) で「中間スコープの shadow が global コピーを介して孫まで
再伝播する」機構を検証していた。DR-011 明確化 (2026-07-08、colon 無しは
unknown-vocab) に伴う DR-057 alias 形への移行で、alias は AliasDef に
`is_global` を持たず global 伝播しないため、この機構は新構成では発火しなくなった。

grandchild-subtree-global ケースの observable な期待値 (孫スコープ内 `--verbose`
で `averb` が発火) は DR-041 §4 の早閉じ + porous という別メカニズムで偶然保存
されており、期待値は不変のまま green。ただし本来検証していた「global 中間
shadow の孫再伝播」という機構そのものはどの fixture もカバーしていない
(fixture の why 文にはこの差異を明記済み)。

## 背景

dr066-path worker の fixture 移行報告 (2026-07-08) にて、spec commit 8f4e1373
の移行作業中に発見された。仕様上の期待値は壊れていないが、検証している機構が
すり替わっている状態 (= 偶然の green)。

## 受け入れ条件

- [ ] global 中間 shadow の再伝播を LLiteral に依存しない構成 (例: 同名
      canonical flag の global 宣言と中間スコープの自前宣言、トリガは name
      由来) で検証する fixture を再設計・追加する
- [ ] `shadowing-3level-same-name.json` が近い構図なので、そこでカバー済みの
      範囲との差分を先に洗ってから追加すること
