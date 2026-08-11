---
title: 参照実装が複数 config_file 間で committed フラグを持ち越す (DR-133 §4 乖離)
status: open
category: task
created: 2026-08-12T00:00:00+09:00
last_read:
open_entered: 2026-08-12T00:00:00+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered:
discard_reason:
pending_reason:
close_reason:
blocked_by:
origin: DR-133 起草時の実測 (2026-08-12)
---

# 参照実装が複数 config_file 間で committed フラグを持ち越す (DR-133 §4 乖離)

## 概要

DR-133 §4 は「DR-050 §2 の committed 読込失敗 Error / default 由来不在の黙認は、**勝った (= 宣言順で最後に
パスを持つ) config_file 要素のパスの committed 性だけ**で決まる」と規範化した。参照実装 (kuu.mbt) は
committed 性を要素間で持ち越しており、この規範に反する Error を出す。

## 現象 (実測 2026-08-12)

定義: `c1` (config_file, long, default `/a.toml`) → `c2` (config_file, long, default `/b.toml`) の宣言順。

- 入力 `--c1 /a.toml` (committed、provider は `/a.toml` を返せる)
- 勝つのは `c2`、そのパスは default 由来の `/b.toml`、provider は `/b.toml` を返せない

規範上の期待: 勝ったパスは default 由来なので不在は黙認 → config 席は空、値要素は自前 default (success)。
実測: `config file "/b.toml" could not be read` の resolve エラー。

## 原因 (コード読み)

`src/kuu/resolve.mbt` の `resolve_scope_config_with_export` Phase 1。config_file 要素のループで
`cf_path` / `cf_committed` / `cf_element` をループ外の可変変数に積んでおり、後続要素が default 席から
パスを取ったときに `cf_committed` を `false` へ戻していない (`cf_path` の carry-over 自体は DR-133 §2
「最後にパスを持つ要素が勝つ」と一致するので正しい)。`parse_fold_ladder` (同ファイル) にも同じ Phase 1
相当の写しがあり、そちらは committed を扱っていない。

## 影響と fixture 化可否

- 影響は「先行要素が cli / env 明示 + 勝った要素が default 由来で読めない」の組合せのみ。誤って parse
  失敗になるので静かな誤りではない
- **fixture では pin できない**: resolve フェーズのエラーは args_pos を持たず failure schema に収まらない
  (`fixtures/value-sources/config/path.json` の注記と同じ理由)。conformance 面では観測できないため、
  実装側のユニットテストで押さえる必要がある

## 次の一手

kuu.mbt 側で `cf_committed` を「勝った要素のパス供給席」の属性として持ち直す (勝者確定後に committed を
決める、または要素ごとに (path, committed) を作って最後の Some を採る)。
