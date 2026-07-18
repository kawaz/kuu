# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチ 4 巡目。裁定済み: Q2=a、Q7=a、Q3=グループ先頭宣言スタイル + order/help_after 併存 (意味論込み)、**Q4=a** (help + help_long の 2 本立て + 相互フォールバック)、**Q5=b** (既定は選択 scope の 1 層分、depth opt-in で全層も可)、**Q6=a** (command_path を model に含める)、**Q8=a** (type:help 全体単一セル + help_onfail 構想で設計を詰める)。全て findings の設計プランへ反映済み、正式化は help DR (P1)。Q9 (version) も裁定済み: 反応は成功・失敗ともアプリ責務、失敗時発火の基盤は汎用属性、help_onfail は type:help の糖衣 (type config で汎用属性へ全展開)。残る Q は Q10 (help 範囲出し分け) のみ。詳細の正本: `docs/findings/2026-07-17-help-mechanism-design-plan.md` + `docs/findings/2026-07-17-cli-help-vocab-survey.md`。

## HELP-Q10R: help の範囲出し分け — help_category 案の設計確認 (2 巡目)

### kawaz 案 (2026-07-18) の整理

要素側に **`help_category: []` (string 配列、既定空)** を新設し、**`help_group_name` は自動でカテゴリに追加される糖衣としても効く** — グループ = 単一カテゴリの典型例として重複記述なしで済み、複数カテゴリ所属 (`help_category: ["net", "advanced"]`) も表現できる。`--help [category]` はこのカテゴリでフィルタして表示する。

統括評価: **賛成、懸念点なし** — group 単独案の弱点 (複数所属を表現できない) を正確に埋め、糖衣により典型例 (グループ = カテゴリ) では追加記述ゼロ。help model の options/commands entries に `categories: [...]` (group 名 + 明示 category の合成結果) を載せ、help query に `category` フィルタ引数を足す形で自然に接続します。

### help_level の実例について (「実際のパーサ実装例あるの?」への回答)

正直な答え: **`help_level` のような「定義側で入口ごとの表示範囲レベルを宣言する語彙」を持つパーサは、12 系統リサーチで 1 つも見つかっていません**。私が Q10 の選択肢 b に書いた help_level は前例のない発明でした。実在するのは以下の 3 パターンだけです:

1. **-h / --help の 2 段出し分け** (clap): 入口によって短い説明 (help) / 長い説明 (long_help) を切り替える — レベルは「入口とレンダラの対応」であって宣言語彙ではない。kuu では Q4=a (help/help_long) + 複数 help 入口で同じことができる
2. **--help --show-hidden** (yargs): hidden を「隠すが完全には消さない」で、エンドユーザが `--show-hidden` を足すと表示される救済経路。kuu では hidden メタが model に載る設計 (Q3 系裁定済み) なのでレンダラで同じことができる
3. **--help-all** (GNU 系ツールの慣習、argp の `--help` vs `--usage` 等): これも入口の別定義 + レンダラの範囲切り替えで、宣言語彙ではない

つまり選択肢 b (help_level) は前例なしにつき**取り下げ**ます。カテゴリフィルタ (kawaz 案) + 複数入口 + hidden メタ搬送で、実在する全パターンをカバーできます。

### 確認したい残り 2 点

- **Q10-1. help_category 案の採用確認**: **a. 採用** (help_category: [] 新設 + group_name 自動追加の糖衣、help query に category フィルタ引数、推し) / b. 修正あり (自由記述)
- **Q10-2. `--help [category]` の値スロットと複数 help 入口のセル構造**: type:help が optional 値 (category 指定) を取れる形にする必要がある。**a. type:help に optional 値スロット (string) を持たせ、値が category として result に入る + help 系要素は要素ごとに別セル (--help と --help-full は独立、どちらが発火したか result で区別) (推し)** / b. 別案 (自由記述)
