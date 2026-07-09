# ref テンプレの result 行形 (row shape) 裁定から実装まで一往復

2026-07-09 の記録。issue `ref-template-result-shape` を wip → 実装 → resolved で完走。
ref テンプレ (`definitions.templates` + `ref`) の result 形が「テンプレ内要素名の
トップ露出」という実装バグを抱えていた件を、裁定 → spec fixture pin → kuu.mbt 実装 →
codex レビューでの Major 4 件検出・解消まで一気に通した。

## 裁定 (kawaz)

当初の論点立て (「flat 化の要否」「値セルを持たない構造参照の露出」) 自体が誤りだった。
正しいモデルは DESIGN の既存規定から素直に導出できる:

- `hlcolors := color+` の値セルは **T[]** (T = or 枝の row 形)。row は DESIGN §2.4
  露出規則 (最も浅い name 層) と §2.5 (name 持ち子の並びが kv を作る) の直接適用 —
  colorname 枝の row は `{colorname: string}`、rgb 枝の row は name 持ち兄弟が並ぶ
  kv `{r,g,b}`
- `["red","blue"]` の result は `{hlcolors: [{colorname:"red"}, {colorname:"blue"}]}`。
  テンプレ内要素名 (colorname) がトップレベルに湧くことこそが誤り
- last-wins が関わるのは **option 再発火の cell 上書き**のみ:
  `--hlcolors red blue --hlcolors red` → `{hlcolors: [{colorname:"red"}]}`。repeat
  内の複数バインドの累積とは無関係の別軸
- 単発 ref (repeat 無し) は縮退形 = row 単体 (`{point: {x:1, y:2}}` 型)

裁定の根拠が DESIGN §2.4/§2.5/§6.1 の既存記述から導出可能だったため、**DESIGN 側の
新規明文化は不要**、変更は spec fixture の pin のみで足りた。

## spec fixture (3 本、commit `9e964031918161a57b4c81779fd5490e22205865`)

- `fixtures/repeat-parse/ref-or-template.json`: result / interpretations の pin 保留を
  解消。string 枝 2 発火・rgb vs colorname の ambiguous 2 経路・string 3 発火の
  各 case に result (ambiguous case は interpretations) を追加
- `fixtures/repeat-parse/ref-template-no-repeat-degenerate.json` (新規): 単発 ref
  (repeat 無し) の縮退形 = row 単体を pin。数値 3 個入力では colorname 枝が 1 トークン
  しか消費できず残り 2 トークンが未消費で経路不成立になるため rgb 枝のみが完全経路
  として残り、ambiguous にならないことも合わせて固定 (repeat あり版の
  rgb-vs-3-names-ambiguous との対照点)
- `fixtures/multiple-parse/last-wins-repeat-rows.json` (新規): option 再発火の cell
  丸ごと上書きの輪郭。`last-wins-scalar.json`/`append.json` と同じ「multiple の
  有無」軸の対照ペアとして multiple-parse 配下に配置 (repeat-parse は repeat機構
  自体の輪郭 (porous 消費・flatten 等) の集積と判断)

監査 (コミット前) で新規 fixture 2 本の why に出典表記の誤引用を発見し修正した:
「DR-078 §1 result 裁定」と書かれていたが、DR-078 §1 は definitions.templates
区分新設のみを扱い result 裁定を含まない。result 形の根拠は DESIGN §2.4/§2.5
からの導出 + issue 裁定に書き換えた (このためコミット済み diff には誤引用が
現れない)。

## kuu.mbt 実装 (commit `7abce441585f4c49e7a93343b214d1db7a8b400c`、CI green)

root cause は `elem_head` が ref 要素の name を握り捨てていたこと。result 構築が
ref テンプレの row 境界を組み立てられずテンプレ内要素名がトップに漏れていた。

- `"#row"`/`"#fire"` sentinel 方式で row 境界を表現 (DR-067 の `#` 予約語彙に乗せ、
  既存の `is_sentinel` 防御網へタダ乗りする形で新規防御コードを増やさない)
- 新規 Node `GreedyRepeat`
- `consume_compound` (sc-aware fallback) を導入

## codex レビューでの Major 4 件

実装完了後の codex レビューで Major 4 件を検出、その場で解消:

1. decoder が `#` sentinel を非検証だった → `check_reserved_name` で閉塞
2. `min:0` (unbounded repeat) での suppression 欠落 → generic fallback に差し替え、
   RED (欠陥再現) を実機確認した上で GREEN 化
3. `min>1` の指定を黙って受理していた → `DInvalidRange` で明示 reject
4. `multiple` × `ref` の accumulator 未配線 (即修正はスコープ外と判断し issue 起票で
   先送り: kuu.mbt 側 `multiple-ref-accum-gap` / spec 側
   `ref-nested-consumption-fixture-gap`)

4 件目の issue 起票時、codex レビューはさらに 2 点の fixture 未整備を検出した
(先食み×ref入れ子の消費境界、option ref repeat の min:0 での sibling trigger 境界) —
いずれも `ref-nested-consumption-fixture-gap` に追記済みで次サイクル候補。

## ハマり所

- option への `repeat` 直接装着は spec fixture に前例が無かった (grep で確認済み、
  それまで repeat は positional にのみ使われていた)。schema (`wire.schema.json`)
  上は options の各要素も node 一般属性として repeat を持てるため構文的には妥当と
  判断して進めた
- 「2 個目の `--hlcolors` を colorname が食わない」(= option 再発火境界の非侵食性) の
  根拠は DR-041 §4 の先食い規定から導出できる — `interjection.json` が固定している
  greedy 衛星 vs option トリガの機序と同型

## 最終状態

conformance: decoded=148 / ran_cases=375 / skipped=0 / mismatches=0。kuu.mbt テスト
166 本全 pass。pin bump 済み、全 push CI green。

## 残 issue (次サイクル候補)

- spec: `ref-nested-consumption-fixture-gap` (先食み×ref入れ子 / option ref repeat
  min:0 sibling trigger 境界 / multiple×ref 意味論の 3 点、fixture 未整備)
- kuu.mbt: `multiple-ref-accum-gap` (multiple × ref の accumulator 配線)
