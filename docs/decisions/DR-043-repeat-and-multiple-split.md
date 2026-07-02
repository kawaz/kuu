# DR-043: repeat と multiple の分離 — 閉包は構造、畳みは値パイプライン

> 由来: 本セッションの議論 (findings F-020 / F-021 の前段)。DR-019 の「repeat を multiple に統合」を部分的に覆し、DR-034 が宣言した「個数制約は別軸として分離」に受け皿を与える。

## 決定

### 2 概念の分離

- **repeat (構造閉包)**: 「同じ要素を複数回」という反復構造。`repeat: {min, max}` / `repeat: true` (無制限)。主戦場は positional 文脈だが「構造が書ける場所ならどこでも」書ける (greedy 内部の可変長値スロット、opts 群の反復 等)。min / max は閉包のパラメータであり、**path-search の枝生成に効く構造制約** (事後検証ではない): `cp src... dst` は src の取り分ごとの枝のうち完全経路が 1 本に絞れることで解ける (DR-038 の創発)。
- **multiple (値の畳み)**: option の複数回発火や separator 分割片が生む値列を畳む DR-034 のパイプライン (separator / mapper / collector)。**出現回数・出現位置の制約は持たない** (回数は repeat、位置の自由は greedy の軸)。

両者の共有部品は値パイプラインだけ: repeat が生む値列にも option 再発火の値列にも、同じ accumulator (DR-036) が使える。

### どちらも installer (基本属性から降格)

positional / options で互いに使えない語彙を全要素共通の基本属性として持つ座りの悪さは、installer 所有語彙 (DR-042) にすることで解消する:

- **repeat installer**: `repeat` 属性を回収し、**ref を使った再帰リスト構造に lowering する**:

  ```json
  {"name": "file", "type": "string", "repeat": {"min": 1}}
  ```

  →

  ```json
  {"name": "file", "seq": [{"type": "string"}, {"ref": "file", "optional": true}]}
  ```

  ([T, T[]] の cons 構造。3 引数なら [T,[T,[T]]] と unfold される)。min は必須段の unroll、max は unroll 段数の上限、上限なしは再帰尾部で表現する。平坦化 ([T,[T,…]] → T[]) の accumulator を同時にインストールする。ゼロ進捗ガード (再帰 1 周で 1 トークン以上消費すること) は静的検査で保証する。unfold は現在の背骨に留まる (DR-041 §4) ため、反復間の greedy 割り込み (`cp src... --verbose dst`) は保たれる。

  repeat の対象要素は形を問わない (DR-042)。inline 型だけでなく **ref 要素にもそのまま付く**:

  ```json
  {"name": "hlcolors", "ref": "color", "repeat": {"min": 1}}
  ```

  →

  ```json
  {"name": "hlcolors", "seq": [{"ref": "color"}, {"ref": "hlcolors", "optional": true}]}
  ```

  (`color` を `[r,g,b] | colorname` のような構造テンプレとして export: false で定義し bg / fg から ref する使い方の延長)。head の消費は ref 先の構造が担うため、ゼロ進捗ガードは「ref 先が 1 トークン以上消費すること」の検査に帰着する。

- **multiple installer**: `multiple` 属性を回収し、要素の値セルに accumulator / pipeline (DR-034 / DR-036) を構成する (env と同型の、席・能力宣言型の installer)。

これにより **AtomicAST コアから閉包プリミティブが消える**: 構造は exact / or / seq / primitive + ref/link (+ greedy マーク) で閉じ、反復は再帰 (DR-020「再帰はプリミティブで組む」) に、畳みは registry に、それぞれ帰着する。

「消える」の射程は**直列形 (AtomicAST) の語彙**である。評価器が ref 再帰を反復機構 (多孔質ループ等) で処理するのは観測等価な encoding として自由であり、評価器の内部から反復の概念が消えることは主張しない (垂直スライス PoC で確認)。

### 取り分の選好 (greedy 既定 / lazy)

同一列に複数の閉包が並ぶ (`{string repeat:{min:1}} {string repeat:{min:1}}` に `a b c d e`) と、取り分の切り方だけが異なる完全経路が複数生じる。これは「効果の異なる別解釈」(DR-038 が ambiguous 検出すべきもの) ではなく**同一解釈の切り方の自由**であり、閉包自身の宣言的選好で代表 1 本に確定する:

- **greedy (既定)**: 長い取り分から試す (regex の `.+`)。`repeat: {min: 1}` は無記述で greedy
- **lazy**: `repeat: {min: 1, lazy: true}` で短い取り分から試す (regex の `.+?`)
- **確定規則**: 選好順に取り分を試し、**最初に完全経路へ到達した取り分で確定**する。下流が失敗すれば次の取り分へ後退する (regex バックトラッキングと同型)。複数の閉包が並ぶ場合は先 (左・外) の閉包の選好から試す
- 例: greedy + greedy に `a b c d e` → `[a,b,c,d,e],[]` は 2 つ目の min:1 で失敗 → `[a,b,c,d],[e]` で確定 (それより短い取り分は試さない)。lazy + greedy → `[a],[b,c,d,e]`

これは経路間の優先規則ではなく**閉包の消費意味論** (枝生成規則) であり、先食い・早閉じ抑制 (DR-041 §4) と同じカテゴリに属する。DR-038 の「完全経路間に優先なし」は無傷で、選好が働くのは同一閉包の取り分次元の中だけ — or 枝違い・読み違いなど構造の異なる完全経路が並べば従来どおり ambiguous になる。

確定規則の「完全経路」は **DR-038 の大域の全消費経路**を指す (取り分の採否は下流全体の成否で決まる — regex バックトラッキングと同じ)。実装が枝刈りのために局所的な完成判定を使う場合、その判定は**スコープの消費境界に相対化**しないと近似が壊れる (垂直スライス PoC で実測: root 直下の repeat では全体長基準でよいが、親の消費が続くスコープ内の repeat では不可)。

フィールド名を `lazy` とし greedy 側を既定 (無記述) にするのは、AST の greedy マーク (出現位置の自由、DR-041) との同名衝突を避けるため。

帰結: 「上限なし閉包が positional 列に複数 → 潜在 ambiguous」という静的 warn (DESIGN 旧 §15.6) は不要になり削除する。

### required との関係

repeat の min は閉包の反復回数 (CLI トークン消費の構造) であり、required (committed であること、値源 DR-031 込みの充足) とは別概念として立てる。両者は重ならない。

## 採用しなかった案

### min/max を multiple のサブフィールドに戻す (DR-019 原型)

「option の複数回起動」と「positional の反復個数」が別概念であることは DR-034 の経緯で判明済み。1 フィールドに再同居させると「min/max が option 文脈で無意味」という罠が戻り、同名 1 語が発生 (何回) と畳み (どう積む) の両義を再び呼び込む。

### top-level 属性 (min_count / max_count)

repeat しない要素に付いても意味を成さず、required の隣に文脈限定の属性が散らばる。

### 閉包プリミティブの維持 (multiple ノードを AtomicAST コアに残す)

再帰 + ref で表現可能 (DR-020) であり、コアの要素数を増やす理由がない。評価器は再帰 1 本を扱えばよい。

### 糖衣による停止条件の自動注入 (auto-narrowing)

入れ子グループの糖衣展開時に、宣言済みトリガ語彙から導出した除外 pre フィルタを自動注入する案。背骨なし内部の無制限 repeat がトリガ構造を丸呑みする問題 (取り分選好で誤パースが静かに勝つ) への対策として検討したが、定義に書かれていない絞り込みが暗黙に効くのは明示性重視に反する。「意図した形に的確にマッチさせる」設計は regex と同様に利用者の領域であり、kuu は部品と example と lint (DR-021) を提供するに留める。

## DR-019 との関係

DR-019 の「repeat を独立**構造要素**にしない (要素属性で表す)」は引き続き有効。「repeat と multiple を multiple 一本に統合する」は本 DR で覆す (DR-019 に Superseded 注記)。

## 検証 (垂直スライス第 2 弾へ)

- ref 再帰 lowering の枝生成と `cp src... dst` の取り分一意性
- repeat 反復間の greedy 割り込み (unfold が背骨に留まること)
- 平坦化 accumulator と name 駆動 result builder の噛み合わせ
- multiple × repeat の併用 (`prog a,b c,d` — separator 分割と反復の合成)
- 取り分の選好 (greedy 既定 / lazy、下流失敗での後退、or 構造 ambiguous との共存)

## 関連

- DR-019 (統合の判断 — 部分的に Superseded)
- DR-034 (パイプライン 4 要素 — 共有部品として存続) / DR-036 (accumulators / multiple registry)
- DR-020 (再帰はプリミティブで組む — repeat lowering の根拠)
- DR-038 (取り分の一意性) / DR-041 (背骨・先食い) / DR-042 (installer アーキテクチャ)
- findings `2026-06-29-ast-missing-pieces.md` F-020 / F-021
