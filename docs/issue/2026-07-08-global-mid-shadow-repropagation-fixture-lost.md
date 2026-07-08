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

codex レビュー (2026-07-08、節目レビュー) でも同件が Medium 指摘として独立に検出された。
影響範囲の補足: `shadowing-subtree.json` に加えて `fixtures/command-scope/shadowing.json` も
同様に「global copy shadow → subtree 支配」という元の検証意図が別経路 (local alias firing /
porous fallback) に置き換わっている。再設計時は両ファイルを対象にすること。なお
`shadowing-3level-diff-name.json` / `shadowing-3level-diff-trigger.json` は trigger-vs-name の
挙動を引き続きカバーしており対象外。

## 受け入れ条件

- [x] global 中間 shadow の再伝播を LLiteral に依存しない構成 (例: 同名
      canonical flag の global 宣言と中間スコープの自前宣言、トリガは name
      由来) で検証する fixture を再設計・追加する
      → `fixtures/command-scope/mid-global-repropagation.json` として追加
      (root+mid 共に global 同名 verbose、trigger=name 由来 long:true)。
      sub に自前 --quiet を持たせて早閉じ抑制下でも mid.verbose 経由の
      入口再伝播が働くことを case `grandchild-with-own-flag-forces-repropagation`
      で分離検証。
- [x] `shadowing-3level-same-name.json` が近い構図なので、そこでカバー済みの
      範囲との差分を先に洗ってから追加すること
      → same-name.json は mid.verbose 非 global で `mid sub --verbose` が
      早閉じ+porous で mid に戻る経路。本 fixture の case 1/2 は同じ observable
      だが機構が異なる (mid が global なので sub 自前入口が発火)。case 3 が
      両機構を分離する差分ケース (same-name.json 構成で --quiet を足すと
      unexpected_token 失敗、本 fixture は成功)。
