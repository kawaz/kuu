# 2026-07-14 DR-102 (cell_filters 属性分割) + DR-103 (required_group) サイクル

`cell_filters` が multiple 宣言の有無で `T→T`/`Acc→Acc` という異なる型の語彙を 1 属性名に
内包していた構造的欠陥を kawaz が前提から棄却し、`final_filters`/`accum_filters` への分割
(DR-102) と、これと並行して起票された必須選択グループ `required_group` (DR-103) を仕上げた
サイクル。2 回の差し戻しを経た設計提案、実装との突き合わせで判明した精密化、definition_error
の実行契約との衝突、DR 本文の構造事故の自己発見など、山あり谷ありの 1 日だった。

## 発端: 旧 DR-102 の前提棄却

前サイクルで DR-101 §3 の判定マトリクス (非 accum 位置の cell_filters に ARRAY-only 綴りを
書いた場合の帰結) の 6 セル目を確定させる旧 DR-102 (`decisions(DR-102): 非 accum 位置の
filter 席にも ARRAY-only 綴りは invalid-range`、change id `otsvtqms`/commit `893d0def` ほか
fixture `f26a7e89`・DESIGN 追記 `fb68bc71` の 3 commit) を land 直後、独立レビューを経た
kawaz が前提そのものを棄却した:「cell という名前自体が『値の置き場』という内部事情由来で
利用者の目的に合っていない」「両方を 1 つのクロージャで扱いたい人はいない。違うものを同じ
ものとして扱わない」「既存を壊すことは正しさがあれば問題ない (ドラフト期)」。3 commit は
`jj abandon` で消し (SPL-Q3 裁定 = 案 C)、番号 102 は分割 DR に再利用することになった。

## 設計提案の 2 回の差し戻し

**1 回目**: `cell_filters` を非 accum 側 (最終値ガード) と accum 側 (累積配列) に分けるべきか
の設計提案で、非統合の根拠を「update 効果は value_filters に届かない」「DR-077 §1 に `cell_filters`
は update の結果にも通すという規定がある」と書いた。統括の実測指摘で両方とも誤りと判明:
DESIGN.md §8.3 の実文は「update の適用結果」を明示的に value_filters の対象に含めており、
DR-077 に `cell_filters` という語は grep 0 件 (fixture の why コメントの要約を DR 本文からの
直接引用であるかのように書いてしまっていた)。実物 grep で確認せず記憶で書いた引用ミス。

差し替えた根拠は argv_pos 帰属の実測差: `value_filters` の reject は piece の実位置に帰属する
一方 (`filters-each.json` の `argv_pos=3` が `"500"` の実 index と一致)、`cell_filters` の
reject は非 accum・accum を問わず一貫して `argv.length` に帰属する (`cell-filter-reject.json`
`argv_pos=2`=length、`cell-filter-range.json` `argv_pos=1`=length、いずれも piece 実位置とは
不一致)。「どの piece が原因か名指ししない、確定した最終値全体への一括検証」という observable
な差異こそが、両者を独立属性として残す実証的な根拠になった。

**2 回目 (SPL-Q6)**: 上記の再導出でも「非 accum 側を廃止し value_filters へ一本化する」案を
統括が正面から評価対象にしたが、kawaz が原則ごと棄却:「違うものを違うものとして扱え、同じに
するな」。corpus に実例が無いことは統合 (表現力削減) の論拠にならない、という裁定。

## 裁定バッチ (SPL-Q) と実行

`docs/QUESTIONS.md` (この日から運用開始した裁定待ち常時集約ファイル) で SPL-Q1〜Q6 を一括提示、
kawaz 裁定は Q1=`final_filters` / Q2=`accum_filters` / Q3=案C (abandon+番号再利用) / Q4=argv.length
両席明文化 / Q5=definition-error が正規ゲート (schema if/then は補助)。これを反映して新 DR-102
(`decisions(DR-102): cell_filters 属性分割 (final_filters/accum_filters) を起票、番号再利用`) を
起票し、DR-079 (座席格子 D 行の分割) と DR-101 §3 (判定マトリクス全体) に Superseded 節を追記、
schema/DESIGN/PIPELINE/LOWERING/CONFORMANCE/REFERENCE を全 grep 追随、既存 fixture 4 本を
リネーム・書き直しした。

## 実装との突き合わせで判明した精密化 (is_accum_elem)

mbt-dr102 による kuu.mbt 側の分割実装で、accum 適格性の実際の判定基準が「multiple 宣言の
有無」ではなく `is_accum_elem` (multiple/repeat/separator のいずれかの宣言を持つか、DR-083 §5
の `collect_scalar_array_default` と同じ導出基準) であることが判明した。DR-102 §1 に定義節を
新設し、以降の節は参照する形に精密化。境界確認として repeat のみ宣言 (multiple 宣言なし) の
positional 要素 × `final_filters` → invalid-range を pin する fixture を追加した。separator の
みのケースは追加しなかった — DESIGN.md 確認の結果「bare separator は仕様概念として存在しない、
wire form も separator を multiple object 内にのみ持つ」ため、そもそも構文的に発生しない境界
だった。

## DR-103: required_group

corpus tar 実機観測 (`tar -vzf archive.tar.gz` がモード未指定で `Must specify one of -c,...`
エラーになる) を発端に、DR-047/DR-055 が予告していた `at_least_one` 系語彙の実現として
`required_group` (要素側属性、`exclusive_group` と同型の `Array[String]`) を起票。kawaz スケッチ
`{required:true, or:[...]}` は「or の枝は独自のトリガを持てない」ため tar 型 (独立トリガ群からの
ALO) を表現できないと判明済みで、definition/scope 側への `groups` 1 級座席案も「グループ判定は
評価側が group ラベルを集約すれば足りる」と棄却された。

**RG-Q1 (flag vacuous 問題)**: DR-103 本体の tar 例に `type:"flag"` の member を使ったところ、
flag preset の暗黙 `default:false` により required_group が常に vacuous に成立してしまう
(未発火でも「値がある」ため充足) 疑いを発見し、fixture 着手前に停止報告した。統括が実装で
vacuous 挙動を実測確認、kawaz 裁定は「flag に required 付けても常に充足はそれで OK。付けても
付けなくても制約への影響は無い、せいぜい lint で『付ける意味ないよ』と言うくらい」— 現状維持
(required は値述語のまま) が正、`requires` 目的語の bool-truth 判定 (「解決後の値が true」) との
非対称は意図的、という結論だった。DR-103 の tar 例は `type:"bool"` + 明示 `long:[":set:true"]`
(plain bool、暗黙 default なし) に書き換え、fixture は充足・違反・exactly-one・縮退・default
相互作用の 5 軸 + vacuous 境界を pin した。

## ハマり所

- **definition_error の「1 definition = 1 構造的問題」契約との衝突**: 非 multiple×accum_filters
  と multiple×final_filters の両方向を 1 つの definition・2 case で pin しようとしたら、
  mbt-dr102 の分割実装検証で両 case とも 2 エラー同時発生の mismatch になった。definition_error
  は「case ごとに definition 全体を検査、expect.errors は全エラーの完全一致集合」という既存
  ハーネス契約があり、既存 fixture が全て 1 definition = 1 構造的問題の形なのはこのため。
  2 ファイルに分割して解消
- **DR-079 の Superseded 節挿入位置事故**: DR-079 に Superseded 節を追記した際、「## 波及」節の
  4 項目のうち 2 項目の後に誤って挿入してしまい、残り 2 項目 (`issue design-6-2-...`/`piece の
  op 付き artifact 化`) が Superseded 節の中に取り残される構造崩れを起こした。後続の文言精密化
  作業で全文を読み直して自己発見し修正した

## 数値・関連

conformance は decoded 210 → 215、ran_cases 562、mismatches=0 (mbt-dr102 分割実装 green)。
moon test 324。ロックステップ push で spec main = `66684975`、kuu.mbt main = `92a52de6`。

- DR-102 (`docs/decisions/DR-102-filter-attribute-split.md`)
- DR-103 (`docs/decisions/DR-103-required-group.md`)
- DR-079/DR-101 (Superseded 節追記対象)
- issue `2026-07-14-cell-filters-attribute-split.md` / `2026-07-12-exclusive-group-at-least-one-required.md`
