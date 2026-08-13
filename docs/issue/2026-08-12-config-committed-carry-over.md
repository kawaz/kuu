---
title: 参照実装が config パス列の fold に未追随 (最後勝ち全体置換のまま / committed 持ち越し)
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

# 参照実装が config パス列の fold に未追随 (最後勝ち全体置換のまま / committed 持ち越し)

## 概要

DR-133 (docs/decisions/DR-133-config-path-list-fold.md、2026-08-12 改稿) は config 席の埋め方を「スコープの全
config_file 要素が供給するパスを宣言順に並べた 1 本の列を作り、各パスを順に provider へ渡し、読めたオブジェクトを
トップレベルキー置換で畳む」に統一した。参照実装 (kuu.mbt) は旧形の「宣言順で最後にパスを持つ要素だけを読む全体
置換」のままで、fold への作り替えが要る。旧 issue 内容 (committed フラグの要素間持ち越し) は、この作り替えに
含まれる 1 項目として本 issue に統合する。

## 追随に要ること (spec 側の規範は DR-133 が正本)

1. **パス列の構築** — 当該スコープの config_file 要素を宣言順に走査し、各要素が cli > env > default ラダーで
   供給したパスを列に足す。`multiple` の config_file 要素は自分の位置に供給順で inline 展開する。どの席からも
   供給されなかった要素は列に参加しない (DR-133 §1/§1.1)
2. **N 回読み + fold** — 列の各パスを provider へ渡し (契約は 1 パス → 1 オブジェクトのまま)、読めたオブジェクトを
   トップレベルキー置換で畳む。深いマージはしない (DR-133 §1/§2)
3. **各パス独立の判定** — committed パス (cli/env 明示) の読込失敗は Error、default 由来パスの不在は黙認。前の
   パスの committed 性を後段へ持ち越さない (DR-133 §3)。現状は `src/kuu/resolve.mbt` の
   `resolve_scope_config_with_export` Phase 1 が `cf_path` / `cf_committed` をループ外の可変変数に積み、後続要素が
   default 席からパスを取っても `cf_committed` を false に戻さないため、「先行要素が cli 明示 + 勝った要素が
   default 由来で読めない」で規範に反する Error が出る
4. **`parse_fold_ladder` の写しも同期** — 同ファイルに Phase 1/2 相当の写しがあり、こちらもパス列 fold へ揃える
   必要がある

## DR-135 による前提の反転 (旧「別乖離」節の訂正)

DR-135 (2026-08-14 裁定) により、config_file は通常要素であることが確定した。name を持つ config_file 要素は
result / sources に現れる: multiple なら供給順のパス列 `string[]`、供給が 0 件なら `[]`。したがって「multiple の
config_file 要素が result / sources に `user=[]` として現れる」のは乖離ではなく DR-135 に沿った正しい挙動であり、
逆に「結果に出さない」実装のほうが DR-135 違反になる。

## 実測 (2026-08-12、spec 側 fixture 追加後の kuu.mbt `moon test -p kuu`)

(注) この実測は DR-135 反映前の fixture に対するもの。config fixture 群は DR-135 で期待値が変わっている
(config_file 要素自身の座が result / sources に増え、cli 供給パスは effects にも 1 件増える) ため、mismatch の
再測が要る。

`[json-conformance] decoded=404 ran_cases=915 skipped=2 mismatches=9` のうち config 関連は 8 件:

- `value-sources/config/multi-file.json::top-key-replacement-fold` — got
  `{onlya=70(default), onlyb=22, port=2}` / want `{onlya=11(config), onlyb=22, port=2}` (前段ファイルのキーが
  残らない)
- `value-sources/config/multi-file.json::each-element-resolves-its-own-path` — 同型 (onlya が default に落ちる)
- `value-sources/config/multi-file.json::committed-path-then-tolerated-absent-path` —
  `resolve error: config file "/b.toml" could not be read` (committed 持ち越し)
- `value-sources/config/multi-file-path-absent.json::cli-supplied-path-joins-the-list` /
  `::env-supplied-path-joins-the-list` — onlya が default に落ちる
- `value-sources/config/multi-file-multiple.json::multiple-paths-inline-in-declaration-position` /
  `::multiple-without-supply-does-not-join` — multiple のパスが列に入らず、かつ `user=[]` が result に漏れる
- `value-sources/config/multi-file-multiple.json::multiple-supply-order-decides-the-fold-order` —
  `resolve error: config file "/site.toml" could not be read`

## 受け入れ条件

- [ ] fixtures/value-sources/config/multi-file.json の 4 case が通る
- [ ] fixtures/value-sources/config/multi-file-path-absent.json の 3 case が通る
- [ ] fixtures/value-sources/config/multi-file-multiple.json の 3 case が通る
- [ ] 既存の config fixture (ladder / path / isomorphic-path / array-object / null-supply / value-typing) が
      引き続き通る (単体要素 = 列長 1 の縮退形として一致すること)
- [ ] 名前付き config_file 要素が result / sources に確定パスを持って現れる (multiple は供給順のパス列、未供給の
      座は null)。cli 由来の発火は effects にも載る (DR-135 §2/§3)

## 注意 (push 順序)

spec 側の fixture は commit 済み (未 push)。spec を先に push すると kuu.mbt の conformance が red になるため、
実装追随とロックステップで push すること。
