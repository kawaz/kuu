---
title: ref テンプレの result が row 配列に写像されない (テンプレ内要素名がトップ露出する実装バグ)
status: resolved
category: bug
created: 2026-07-09T12:58:37+09:00
last_read: 2026-07-09T17:03:45+09:00
open_entered: 2026-07-09T12:58:37+09:00
wip_entered: 2026-07-09T22:13:52+09:00
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-09T23:22:47+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-078","implemented","fixtures/multiple-parse/last-wins-repeat-rows.json","fixtures/repeat-parse/ref-or-template.json","done:conformance decoded=148 ran_cases=375 skipped=0 mismatches=0"]
blocked_by:
origin: 自リポ TODO
---

# ref テンプレの result が row 配列に写像されない (テンプレ内要素名がトップ露出する実装バグ)

## 2026-07-09 kawaz 裁定 — 論点立て自体が誤り、result 形は定義から導出される

当初の論点 (「flat 化の要否」「値セルを持たない構造参照の露出」) は誤ったフレーミングだった。
正しいモデル (kawaz 裁定):

- `hlcolors` は「repeat 付きで color (テンプレ) を取る positional」であり、**値セルは T[]**。
  T = or の枝の row 形 = name 付き要素の部分オブジェクト ({colorname: string} | {r,g,b})
- `["red","blue"]` の result = `{hlcolors: [{colorname:"red"}, {colorname:"blue"}]}`。
  テンプレ内要素名 (colorname) がトップレベルに湧くことこそが誤り
- last-wins が関わるのは **option 再発火の cell 上書き**のみ:
  `--hlcolors red blue --hlcolors red` → `[{colorname:"red"}]`。repeat 内の複数バインドとは無関係
- rgb 枝は name 付き seq (r/g/b) なので row は `{r:255, g:0, b:0}` (object)。name の無い要素なら
  配列、が定義からの導出
- 単発 ref (repeat 無し) は縮退形 = row 単体 (`{point: {x:1, y:2}}`)

よって本 issue は裁定待ちではなく**実装バグ + result 形の pin 作業**:
現実装の「colorname がトップに出る / hlcolors が別枠の [] になる」は result 構築
(build_result) が ref テンプレの row 境界を組み立てていないバグ。

## 背景 (当初の観測、2026-07-09 kuu.mbt DR-078 decode 実装後)

`hlcolors := color+` (definitions.templates の or [rgb seq | colorname]) を parse すると
`["red","blue"]` の result = `{colorname: "blue", hlcolors: []}` になっていた。
effects 面 (entity=colorname に set が積まれる) は fixtures/repeat-parse/ref-or-template.json
で pin 済み — result 構築側で ref 名の row 配列へ写像する実装が必要 (row 境界の識別に
Binding.scope/link が使えるかは実装検討事項)。

## 受け入れ条件

- [ ] result 構築が ref テンプレ要素を「ref 名: 反復 row の配列」(単発は row 単体) へ写像する
- [ ] テンプレ内要素名がトップレベル result に出ない
- [ ] option 再発火の cell 上書き (`--x a b --x c` → 最後の発火の row 列) の輪郭も fixture 化
- [ ] fixtures/repeat-parse/ref-or-template.json の result / interpretations pin 保留を解消
      (string 枝 / rgb 枝 / 混合 / ambiguous の各形)
