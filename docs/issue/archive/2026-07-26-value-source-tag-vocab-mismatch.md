---
title: 値源タグの語彙が規範文書間で不一致 (link / tty の扱いが文書ごとに違う)
status: resolved
category: bug
created: 2026-07-26T13:48:24+09:00
last_read: 2026-07-27T03:34:26+09:00
open_entered: 2026-07-26T13:48:24+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-27T03:35:46+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-031","dr/DR-121","dr/DR-099","implemented","done:CONFORMANCE §2 が DR-031「source の記録」の8語彙 (cli/link/env/config/inherit/tty/default/const) を正本として参照する形に統一","done:schema/fixture.schema.json の sources enum を8語彙化、effects[].source は CONFORMANCE §2 の規約どおり cli/link の2値","done:link を source として pin する fixture を fixtures/link-parse/ (basic/export-key-address/absent-target) に追加","done:DR-099 の stale なラダー表記を解消"]
blocked_by:
origin: 自リポ TODO
---

# 値源タグの語彙が規範文書間で不一致 (link / tty の扱いが文書ごとに違う)

## 概要

値源タグ (`sources` が返す語彙) の集合が、規範文書ごとに食い違っている。
第三実装は「link 越しに確定した値の sources に何を出すか」を決められない。

## 背景

2026-07-26 の sources 修正の際、spec 単体のゼロ知識レビュー (実装を見ずに spec だけで実装する
視点) で発見。今回の変更とは独立な既存の不整合だが、今回 CONFORMANCE §2 の sources 規定が
DR-031 を参照する形にしたので、放置すると参照先が矛盾している状態になる。

### 実態 (2026-07-26 時点)

| 文書 | 語彙 |
|---|---|
| `docs/CONFORMANCE.md` §2 success の sources | `cli` / `env` / `config` / `inherit` / `tty` / `default` (link 無し) |
| `schema/fixture.schema.json` の sources enum | 同上 (link 無し) |
| `docs/decisions/DR-031-value-source-precedence.md` | `cli` / `link` / `env` / `config` / `inherit` / `default` (tty 無し) |
| `docs/decisions/DR-098-*.md` | `cli` / `link` / `env` / `config` / `inherit` / `tty` / `default` (全部入り) |
| `schema/fixture.schema.json` の effects[].source | `cli` の const (単一値) |

DR-031 は「link 越しに確定した場合は `link`」と規定しているが、CONFORMANCE と schema の enum に
`link` が無いため、link 由来の値を持つ fixture は書けない。逆に DR-031 には `tty` が無いが
CONFORMANCE にはある (DR-099 の tty preset 型が後から入ったため)。

## 論点

1. `link` を sources の公開語彙に含めるか — 含めないなら「link 越しの確定は上流の席
   (`cli` 等) に正規化する」と明記する必要がある。含めるなら CONFORMANCE と schema の enum に足す
2. DR-031 の語彙表を現行に追従させるか — `tty` が抜けている。DR-098 が全部入りなので
   そちらが実質の正本になっているが、DR-031 が「値源ラダーの正本」として参照され続けている
3. 正本をどこに置くか — 現状 4 箇所に語彙が散在している。1 箇所を正本にして他は参照にすべき

## 受け入れ条件

- [ ] 値源タグの語彙の正本が 1 箇所に定まっている (推し: CONFORMANCE §2 か DR-031 のどちらか)
- [ ] 他の文書 (DR-031 / DR-098 / CONFORMANCE / schema 2 箇所) がその正本を参照する形になっている、
      または同一の集合を持つ
- [ ] `link` の扱いが明文化されている (公開語彙に含める / 上流席へ正規化する のいずれか)
- [ ] link 越しに確定した値の sources を pin する fixture がある (公開語彙に含める場合)

## 関連

- `docs/CONFORMANCE.md` §2 success の `sources` 規定
- `schema/fixture.schema.json` (sources の enum / effects[].source の const)
- `docs/decisions/DR-031-value-source-precedence.md` (値源ラダーと source の記録)
- `docs/decisions/DR-098-*.md` (全語彙を列挙している)
- DR-099 (tty preset 型 — tty タグの出自)
