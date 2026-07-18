# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチ 4 巡目。裁定済み: Q2=a、Q7=a、Q3=グループ先頭宣言スタイル + order/help_after 併存 (意味論込み)、**Q4=a** (help + help_long の 2 本立て + 相互フォールバック)、**Q5=b** (既定は選択 scope の 1 層分、depth opt-in で全層も可)、**Q6=a** (command_path を model に含める)、**Q8=a** (type:help 全体単一セル + help_onfail 構想で設計を詰める)。全て findings の設計プランへ反映済み、正式化は help DR (P1)。Q9 (version) も裁定済み: 反応は成功・失敗ともアプリ責務、失敗時発火の基盤は汎用属性、help_onfail は type:help の糖衣 (type config で汎用属性へ全展開)。残る Q は Q10 (help 範囲出し分け) のみ。詳細の正本: `docs/findings/2026-07-17-help-mechanism-design-plan.md` + `docs/findings/2026-07-17-cli-help-vocab-survey.md`。

## HELP-Q10: help の範囲出し分け (--help-full / --help [category]) の設計 (新論点)

kawaz 発題: 「--help-full や --help-all、`--help [category]` (tag/label みたいな語彙) を置いて --help (引数なし) と範囲を出し分けるみたいなのもあるじゃない? その辺どうする?」

既存部品との突合: (1) hidden の既定除外 + 「--help-all で hidden も表示」はレンダラ policy として DR-058 が既に予告済み。(2) help model は hidden をメタとして落とさず運ぶ設計済み (レンダラが出し分け可能)。(3) help_group_name (Q3 裁定) がカテゴリの自然な単位になり得る。(4) type:help は bool セル (Q8RR=a) — `--help [category]` は**値を取る help** になり、bool でなく optional 値スロット (`repeat:{min:0,max:1}` の string) が要る。

- **a. 出し分けは「複数の help 入口 + help model のフィルタ引数」で組む (推し)**: `--help` / `--help-full` は**別々の type:help 要素** (何個でも定義可能、全体単一セルは「help 系で 1 セル」でなく要素ごと) とし、どの入口が発火したかで レンダラが verbosity を変える。`--help [category]` は help query に filter 引数 (group 名 / category) を足し、type:help に optional 値スロットを許す形で表現。verbosity level (最小/full) は wire 語彙にせずレンダラ + 入口の対応付けに留める
- b. type:help に `help_level` / `help_categories` 等の宣言語彙を持たせ、入口ごとの範囲を定義側で機械可読に固定する (レンダラ非依存で conformance 可能になるが語彙が増える)
- c. 範囲出し分けは全てレンダラの関心とし、spec は関与しない (入口が複数あることと hidden メタの搬送だけで足りると割り切る)
- 注: a と b は排他でなく「a で始めて b の宣言語彙を格上げ」も可能だが、v1 完備主義に照らすと今どちらかに決める。Q8RR=a の「全体単一セル」との整合 (help 系要素が複数ある時セルは 1 個か要素ごとか) も本 Q の従属論点として裁定に含めたい — 推し: 要素ごとにセル (--help と --help-full は別セル、どちらが発火したか result で区別できる)
