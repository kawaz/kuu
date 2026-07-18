# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチ 4 巡目。裁定済み: Q2=a、Q7=a、Q3=グループ先頭宣言スタイル + order/help_after 併存 (意味論込み)、**Q4=a** (help + help_long の 2 本立て + 相互フォールバック)、**Q5=b** (既定は選択 scope の 1 層分、depth opt-in で全層も可)、**Q6=a** (command_path を model に含める)、**Q8=a** (type:help 全体単一セル + help_onfail 構想で設計を詰める)。全て findings の設計プランへ反映済み、正式化は help DR (P1)。残る Q は version の従属論点 (Q9) と help 範囲出し分けの新論点 (Q10)。詳細の正本: `docs/findings/2026-07-17-help-mechanism-design-plan.md` + `docs/findings/2026-07-17-cli-help-vocab-survey.md`。

## HELP-Q9: version の失敗時表示の扱い (Q8RR 従属、kawaz の説明要求への回答込み)

### 「version についてはどんな話だったか」の説明

現行 spec での version の位置づけ (DESIGN §14.2 / DR-048 §3): **version は「ただの flag」** — `{"name": "version", "type": "flag", "long": true, "global": true}` と書き、成功時は `result.version: true` を見て**アプリが**バージョン出力する (kuu はバージョン文字列を持たず、出力もしない)。**パース失敗時は結果がアプリに渡らないので何も出ない** — そこで DR-048 が「失敗時にも version を出したいアプリは失敗時アクション属性 (旧 fail_action) を opt-in する」とした。この「help も version も同じ汎用属性で救う (2 つを特別扱いしない)」が旧設計。Q8RR=a で属性名が `help_onfail` (help 専用の語感) になったため、version 側の失敗時 opt-in の座席が宙に浮いた — が今の論点。

### help との競合 (「失敗時実行とした場合 help との競合は?」)

既に DR-048 §4 が裁定済み: 失敗時に複数の失敗時アクション (help と version 両方が argv に居た等) が観測された場合、**argv 上の消費位置が最小のものを発火する (先勝ち)**。`prog --version --hlep-typo` なら version が勝つ。この規則は属性名がどうなっても不変で、競合の新規裁定は不要。

### 「version が立ったら結果を無視して version アクションを採用する責務は kuu とアプリのどちらが負うべきか」

これは**成功時**の話 (失敗時は上記で kuu が発火を選ぶ)。現行裁定 (DR-048 §4): 「成功時に衝突は存在しない — `--help --version` が両方 committed なら結果に両方現れ、**どちらに反応するかはアプリの領分 (kuu は決めない)**」。つまり現行はアプリ責務。ただし Q8RR=a で help は「ParserContext の help フラグ → パーサが出力切替」という kuu 側関与を持つため、version だけアプリ責務のままにするかが問い:

- **a. 現行維持 — version への反応は成功・失敗ともアプリ責務 (失敗時発火の opt-in 属性だけ kuu が提供) (推し)**: kuu はバージョン文字列を持たない (DESIGN §14.2) 以上、「version アクションの採用」を kuu が引き受けても出せるものが無い — 責務を負う実体的な意味があるのはアプリ側だけ。help との非対称は「help は kuu が model を組める (定義から導出可能) / version 文字列は定義外の情報」という素材の所在の差から来る必然
- b. `type: "version"` プリセットを新設し、help と対称の「全体単一セル + onfail」構造にする (バージョン文字列も定義に持たせる — DESIGN §14.2 の「AST にバージョン文字列を持たせない」を覆す)
- c. 別案 (自由記述)

### 従属: 失敗時 opt-in 属性の名前 (Q8RR=a の帰結の整理)

- **a. `help_onfail` は type:help 専用とし、version 等の他要素には汎用名 `show_onfail` (または `fire_onfail`) を別途用意** — 名前は 2 つになるが各々の語感が正確
- **b. 属性は 1 つに統一し、名前を要素非依存の汎用名 (`onfail_action: true` 等) にする** — type:help もこれを同梱 (kawaz 構想の help_onfail は「help 要素にこの属性を付けた状態」の呼び名と整理)
- c. 統括判断に任せる

## HELP-Q10: help の範囲出し分け (--help-full / --help [category]) の設計 (新論点)

kawaz 発題: 「--help-full や --help-all、`--help [category]` (tag/label みたいな語彙) を置いて --help (引数なし) と範囲を出し分けるみたいなのもあるじゃない? その辺どうする?」

既存部品との突合: (1) hidden の既定除外 + 「--help-all で hidden も表示」はレンダラ policy として DR-058 が既に予告済み。(2) help model は hidden をメタとして落とさず運ぶ設計済み (レンダラが出し分け可能)。(3) help_group_name (Q3 裁定) がカテゴリの自然な単位になり得る。(4) type:help は bool セル (Q8RR=a) — `--help [category]` は**値を取る help** になり、bool でなく optional 値スロット (`repeat:{min:0,max:1}` の string) が要る。

- **a. 出し分けは「複数の help 入口 + help model のフィルタ引数」で組む (推し)**: `--help` / `--help-full` は**別々の type:help 要素** (何個でも定義可能、全体単一セルは「help 系で 1 セル」でなく要素ごと) とし、どの入口が発火したかで レンダラが verbosity を変える。`--help [category]` は help query に filter 引数 (group 名 / category) を足し、type:help に optional 値スロットを許す形で表現。verbosity level (最小/full) は wire 語彙にせずレンダラ + 入口の対応付けに留める
- b. type:help に `help_level` / `help_categories` 等の宣言語彙を持たせ、入口ごとの範囲を定義側で機械可読に固定する (レンダラ非依存で conformance 可能になるが語彙が増える)
- c. 範囲出し分けは全てレンダラの関心とし、spec は関与しない (入口が複数あることと hidden メタの搬送だけで足りると割り切る)
- 注: a と b は排他でなく「a で始めて b の宣言語彙を格上げ」も可能だが、v1 完備主義に照らすと今どちらかに決める。Q8RR=a の「全体単一セル」との整合 (help 系要素が複数ある時セルは 1 個か要素ごとか) も本 Q の従属論点として裁定に含めたい — 推し: 要素ごとにセル (--help と --help-full は別セル、どちらが発火したか result で区別できる)
