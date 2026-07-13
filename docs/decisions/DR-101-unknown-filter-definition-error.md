# DR-101: filter 名の未登録は definition-error (kind=unknown-vocab)

> 由来: filter chain 3 属性 (`value_filters` / `piece_filters` / `cell_filters` の非 accum 位置) に指定された filter 名が filters registry に登録されていない場合の帰結の座席確定。現状は kuu.mbt の `apply_filter_chain` (filters.mbt:404-420) が実行時に `unknown_filter` reason を返している。DR-042 (installer / filter registry の同格) と DR-054 §1 の「lowering が構成できない = Error」の適用範囲を filter 側に確定させる。kawaz 裁定 (2026-07-13)。

## 決定

### 1. filter 名の未登録は definition-error、kind=unknown-vocab

`value_filters` / `piece_filters` / `cell_filters` (非 accum 位置) に指定された filter 名 (DESIGN §8.4 の DSL `<name>:<arg>:...` の name、DR-094 の ns 付き識別子 / bare は `builtin` ns の糖衣) が filters registry の descriptor `owns` 集合 (DR-061 §1 / DR-094 §9) に載っていない場合、`parse_definition` が **definition-error** (kind=`unknown-vocab`、DR-054 §4 / DR-082 §1) として静的に reject する。実行時失敗 reason `unknown_filter` は wire から消滅する。

filter は installer と同じく registry 装置として登場する語彙の所有者であり (DR-042 の同格原則: 「属性語彙と registry 実装のペアは kuu の既定路線」)、綴りの登録有無は definition と registry から静的に導出できる。DR-054 §1 の「lowering が構成できない、または全入力で壊れる定義 = Error」の条件に照らして、未登録綴りを持つ chain は「その要素の値経路の pieceProcessor / cell-side chain が構成できない」ため Error。

### 2. kind は既存 unknown-vocab に吸収、専用 kind を新設しない

DR-054 §4 の kind 8 語彙 (`vocab-intersection` / `unknown-vocab` / `invalid-range` / `absent-ref` / `circular-ref` / `zero-progress` / `config-cycle` / `invalid-argument`) は不変。**filter 名の未登録は `unknown-vocab` の直接適用**とする。DR-082 §2 が「unknown-vocab は語彙自体が未知 (transform 名が registry に無い等) に取っておく」と規定した受け皿にそのまま該当する — 判定入力は同じ「registry の owns 集合への所属」であり、filter だけを別 kind で扱う理由は存在しない。

先例: long variant DSL の update transform 名が transform 側 (filters registry の T→T エントリ、DR-077 §2) に載らない場合、既に `unknown-vocab` として reject される (DR-077 §2 「transform でない・存在しない → definition-error」)。filter 名の未登録も同族。

### 3. 対象外: accum 位置の cell_filters (ARRAY filter registry Acc→Acc)

`cell_filters` は位置により対象 registry が切り替わる:
- **非 accum 位置** (multiple 宣言なしの scalar 要素): scalar filter registry (T→T) が対象。本 DR §1 の対象
- **accum 位置** (multiple 宣言ありの accum 要素): ARRAY filter registry (Acc→Acc、DR-079 の「累積後の相」) が対象。本 DR §1 の対象外

accum 位置の cell_filters に scalar filter registry の綴り (T→T) を書くケースは既に **kind=`invalid-range`** として reject する筋 (DR-082 §2 の「構文上は書けるが構成として不成立」— T→T と Acc→Acc は異なる vocabulary 空間で、綴り自体は他方の registry に存在しても本席の要求シグネチャに合わない構成)。異なる registry を跨ぐ層違いは invalid-range が担う。

**判定順**: accum 位置の cell_filters に「ARRAY registry にも scalar registry にも登録されていない綴り」を書いた場合は、本 DR §1 の `unknown-vocab` (登録有無の一次判定) を先に適用する。invalid-range は「本席が要求する registry と別 registry の owns 集合には載っているが、本席の要求シグネチャと合わない」ケースに取っておく (層違い判定は登録済かどうかの前提の上で意味を持つ)。

## 波及

- DESIGN.md §8.3 / §8.5: filter 名未登録 = definition-error (kind=unknown-vocab) を追記
- CONFORMANCE.md §2 failure: runtime reason 一覧に `unknown_filter` の記載なしを確認 (grep 実施済、docs/ / schema/ / fixtures/ 全域で出現なし。本 DR は「消滅」を明文化して座席を閉じる)
- schema/wire.schema.json / schema/builtin-descriptors.json: `unknown_filter` reason 参照の不在を確認 (grep 実施済、出現なし)
- fixtures/definition-error/ 新設 3 件:
  - `value-filters-unknown-vocab.json` (scalar 要素 + value_filters に未登録綴り)
  - `piece-filters-unknown-vocab.json` (scalar 要素 + piece_filters に未登録綴り)
  - `cell-filters-unknown-vocab.json` (非 accum 位置の cell_filters に未登録綴り)
- kuu.mbt (spec 外、実装側の追随タスク): `apply_filter_chain` の runtime `unknown_filter` Err 経路の削除、`parse_definition` の完全性検査群 (installer.mbt の `classify_long_spelling` の update transform 未登録検査と同族の位置) に filter 名未登録検査の追加、`filters_wbtest.mbt:180` 付近の runtime unknown_filter Err を突き当てる wbtest の削除 (本 DR の 3 fixture が pin を引き受ける)

## 採用しなかった案

### runtime Err のまま維持 (現状)

filter 綴りの登録有無は wire (definition) と registry (登録済み集合) から静的に導出できる情報で、実行時まで遅延させる必要が無い。DR-042 §5 不変則③ (所有語彙の交差禁止) と対の完全性検査 (DR-054 §1) が installer 語彙の未登録を Error 側に置いた同じ原則が filter 綴りにも当てはまる。filter だけを runtime に落とすのは DR-042 (installer / filter registry 同格) の非対称を残す。DR-054 §1 の「壊れた定義を通すのは利用者への信頼ではなく放置」原則にも反する。

### 専用 kind `unknown-filter` を新設

DR-054 §4 の kind 集合を増やす案。`unknown-vocab` が既に「語彙自体が未知」の受け皿 (DR-082 §2) として transform / installer 語彙を含意しており、filter だけを別 kind で扱う根拠が無い。「filter 固有の hint 文言を出すため kind を分ける」案も、hint は kind と直交 (DR-054 §4 の hint フィールドが responsible、message 同様レンダラ管轄) なので不要。fixture 側 (DR-082 §1) の element+kind 集合比較も変更不要。

### 対象を value_filters のみに絞る

3 属性 (value_filters / piece_filters / cell_filters) は DESIGN §8.3 で同族 (scalar filter registry の 2 座席 pieceProcessor 内 + 非 accum の cell 席、DR-079 の相区分) として扱われ、DR-034 で 3 属性統合が確定している。1 属性だけを definition-error 化し他 2 属性を runtime Err で残すのは、判定入力 (登録有無) が同じなのに帰結だけ非対称にする — DR-034 の統合とパイプライン設計と相容れない。

### filter compile 失敗 (invalid-argument) と統合

`regex_match` の pattern compile 失敗のような filter 装置内の失敗は kind=`invalid-argument` (DR-085 §1 / DR-082 §3)。本 DR の unknown-vocab とは層が異なる — invalid-argument は「綴りが registry に載っているが、単一引数値そのものが装置の受理範囲外」であり、装置の構築ロジックまで到達する。unknown-vocab は「綴りそのものが registry に載らないため装置を選ぶ段で失敗」で、装置の構築段まで届かない。同じ definition-error でも失敗経路と情報粒度が異なるため kind を分ける DR-085 の判定を維持する。

## 関連

- DR-042 (installer architecture — filter / installer が registry の同格住人)
- DR-054 (parse_definition の失敗挙動 — kind=unknown-vocab の出所)
- DR-082 (definition-error fixture format — 「unknown-vocab は語彙自体が未知」の受け皿規定、本 DR の直接適用ケース)
- DR-034 (multiple structure — 3 filter chain 属性の統合の正本)
- DR-079 (filter 座席の完全格子 — piece_filters / value_filters / cell_filters の相区分、accum 位置と非 accum 位置の切り替え)
- DR-085 (regex_match host dialect — filter 装置の invalid-argument とは別層)
- DR-094 (registry 語彙の namespace — filter 名の ns 付き識別子、owns 集合の判定軸)
- DR-061 (registry descriptor — filter descriptor の `owns` 宣言が unknown-vocab 判定の入力)
- DR-095 (builtin descriptor reasons — 実行時 reason 語彙の canonical、本 DR は unknown_filter の消滅を確定させる相方)
- DR-009 (Superseded by DR-034: 旧 filter chain 統合前の三分割宣言、参考)
- DR-077 §2 (update effect の transform 名検査 — unknown-vocab 適用の先例)
