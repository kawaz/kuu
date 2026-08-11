---
title: 参照実装が root 宣言の config_file を子スコープの要素へ供給しない (DR-050 §3 同型対応の nested 未実装)
status: open
category: design
created: 2026-08-12T08:32:41+09:00
last_read:
open_entered: 2026-08-12T08:32:41+09:00
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

# 参照実装が root 宣言の config_file を子スコープの要素へ供給しない (DR-050 §3 同型対応の nested 未実装)

## 概要

DR-050 §3 の同型対応は「結果オブジェクトの構造 (name スコープの階層) と config の階層をそのまま対応させる (`serve.port` ↔ config の `serve.port`)」と規定し、root に宣言した config_file が木全体へ効く像を前提にしている。参照実装 (kuu.mbt) は config オブジェクトをスコープごとに独立に解決しており、root の config_file が子 command スコープの要素へ供給しない。

## 背景

実測 (2026-08-12、一時 fixture を KUU_FIXTURES 経由で参照実装へ投入):

- 定義: root に `c1` (`type: "config_file"`, long, default `/a.toml`)、command `serve` 配下に `port` (number, long, default 7, config_key なし = 同型対応)
- 入力 `serve`、provider が `/a.toml` に `{"serve": {"port": 1}}` を返す
- 期待 (DR-050 §3 の同型対応どおり): `result.serve.port = 1`、`sources.serve.port = "config"`
- 実測: `result.serve.port = 7` (自前 default)、`sources.serve.port = "default"` — root の config が子スコープに届いていない
- 対照実測: 子スコープ側にも config_file を置くと、そのスコープ内の要素はその子スコープの config_file だけを見て解決される (root 側は効かない)

原因 (コード読み): `src/kuu/resolve.mbt` の `resolve_scope_config_with_export` が Phase 1 で当該スコープの `sc.entities` だけを走査して config_file 要素を探し、見つからなければ `config_obj = None` で解決する。一方 lowering (`src/internal/engine/lowering.mbt` の `has_config_file`) は木全体を走査して「config_file 要素がどこかにあれば全 value cell に config seat を立てる」— 席は立つが供給側がスコープ独立なので、子スコープの席は永久に埋まらない。lowering と resolve で config_file の可視範囲の想定が食い違っている。

未確定点 (spec 側の裁定が要る): 「root 宣言の config が木全体へ効く」を規範化するのか、「スコープごとに最も近い config_file が効く (lexical な最近傍)」にするのか。異なるスコープに複数の config_file がある場合の優先関係 (root と子の両方にある時どちらが勝つか) も未規定。DR-133 (複数 config_file の後勝ち) は同一スコープ内に射程を限定しており、この論点は DR-133 §射程外に明記して本 issue へ送られている。

関連: DR-050 §3 / DR-133 §5・射程外 / fixtures/value-sources/config/isomorphic-path.json (root スコープでの同型対応は pin 済み、nested は未 pin)

## 受け入れ条件

- [ ] 「root 宣言の config が木全体へ効く」か「スコープごとに最も近い config_file が効く」かの裁定が付く
- [ ] 複数 config_file (root と子の両方) がある場合の優先関係が規定される
- [ ] 裁定に沿った nested fixture が pin され、参照実装が通る

## TODO

<!-- wip 時のみ -->
