# DR-092 (inf/非整数 float serialize) 一気通貫 + §7.2 scope config オブジェクト全 7 キー実装

DESIGN §7.2 scope config オブジェクトの残キー実装、DR-092 (inf/非整数 float の JSON serialize) の
裁定→起票→実装→pin までの一気通貫、の 2 系統を記録する。

## §7.2 scope config オブジェクト全 7 キー実装

issue `scope-config-object-gap` (DR-091 §3 実装から切り出し済み) を close した。kuu.mbt
commit `421e15de`、テスト 247→272。

decode 層で `ScopeConfig` をキー単位の親子マージに変更した。子スコープが明示したキーのみが
親の値を上書きし、それ以外は親から継承する。`(parent_config, scope_path)` を `dec_command`
の再帰呼び出しに運搬する形で実現した。

- `env_prefix` / `auto_env`: DR-049 §3/§4 の名前導出規則をそのまま `e.env` へ焼き込む
- `inst_short`: `(short_prefix, short_combine)` のペアキーでグルーピングし、`"-"` のハード
  コードを解消した
- 導出裁定 2 件 (issue `config-derived-rulings-short-combine-eqsep` で明文化・追跡):
  - (a) `short_combine:false` は「複数 short のクラスタ結合」のみを禁止する。値付着は別扱い。
    根拠は DR-014 line 74 の定義文言 + DR-041 line 77 の値付着別パラメータ例示
  - (b) `require_equal_separator:true` と `allow_equal_separator:false` の組合せは、DR-083 §5
    の筋に沿って静的 definition-error として扱う

## DR-092: inf/非整数 float の JSON serialize

kawaz 裁定 (2026-07-11、ラベル形式は `INF-Q1a` 等の新形式): 文字列 sentinel
`"Infinity"` / `"-Infinity"` を採用 (protobuf3 準拠、正の無限大に `+` は付けない)。対称性
(sentinel の逆変換) は parse 側の寛容さ (DR-074 §7 ci) が担うので serialize 側は一律に
sentinel を出す。非整数 float は shortest round-trip 表現。config 供給経路は DR-050 §4 の
既存経路をそのまま使う。

裁定内訳:
- INF-Q1a: sentinel 文字列形式を採用
- INF-Q2a: 符号付き `-Infinity` のみ、正は無印
- INF-Q3c: 対称性は parse 側 (DR-074 §7 ci) に委ねる
- INF-Q4a: 適用は一律 (条件分岐なし)
- INF-Q5a: 非整数 float は shortest round-trip
- INF-Q6a: config 供給は DR-050 §4 の既存経路を流用、新規 config キー不要

DR-092 を起票 (spec commit `b5a3279f`)、DESIGN §3.3 に追記した。

kuu.mbt 側は production コード変更が不要と判明した。MoonBit stdlib の `Double::to_string` が
Ryu ベースの実装で、`"Infinity"` / `"-Infinity"` の特殊値を既に出力していることを
`~/.moon/lib/core/builtin/double_ryu_nonjs.mbt` で確認した (= 実装調査で「未実装」と決めつけず
stdlib ソースを直接読んで確認した効果、`[[feedback-moonbit-core-stdlib-check]]` の実例が
また 1 件増えた形)。回帰テスト 7 本を追加 (kuu.mbt commit `52ab2197` 系、272→279)。

fixture pin: `fixtures/value-typing/number-inf-nan.json` の受理 4 case に `effects`/`result`
を追加した (spec commit `080ac663`)。kuu.mbt 側の pin を `7bbd9ed6` → `080ac663` に更新した。

## ハマり所 → 解決策

- Bash tool の cwd がツールコール間で維持されず、jj commit を打ったつもりが別リポ (spec) で
  空 commit になっていた。push 前に `jj abandon` で復旧。以後リポ操作は毎回サブシェル
  `(cd ... && ...)` で完結させる運用に変更した
- local-issue の close で「mv 削除側の取りこぼし」が再発した (既知の症状)。`jj squash --from
  @ --into @-` で close commit に合流させて解消した
- worker との SendMessage が 2 回交錯した (裁定送信 vs 完了報告のすれ違い)。該当 msg_id を
  明示して言及し直すことで再同期した
- kawaz フィードバック: 裁定質問のラベルを別バッチで使い回さない (`Qn` の使い回しをやめ
  `INF-Q1` のような prefix 付き形式に変更、メモリに恒久化済み)

## 最終状態

kuu.mbt テスト 279 本 (247 → 272 → 279 の 2 段階増分)。

## commit 系譜

spec: `b5a3279f` (DR-092 起票) → `080ac663` (number-inf-nan.json pin)。
kuu.mbt: `421e15de` (§7.2 全キー実装) → `52ab2197` 系 (DR-092 回帰テスト)。

## 裁定待ち (次セッション向け)

- SCH バッチ (schema-materialization、Q1〜Q6 提示済み)
- DD バッチ (dd 発火必須、Q1〜Q3 提示済み)

## 関連

- DR-092 (`docs/decisions/DR-092-inf-float-json-serialize.md`、inf/非整数 float の JSON serialize)
- issue `scope-config-object-gap` (close、§7.2 全 7 キー対応)
- issue `config-derived-rulings-short-combine-eqsep` (short_combine / eq-separator の導出裁定追跡)
- DR-091 (`docs/decisions/DR-091-bare-key-value-staged-plan.md`、§7.2 の切り出し元)
- 前回 journal: `2026-07-11-dr090-091-implementation.md`
