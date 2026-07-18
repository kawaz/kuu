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
- 裁定済み (kawaz 2026-07-18): **範囲違いの help 入口は別タイプで当てる** (`type: "help"` と `type: "help_all"` のような対) — -h/--help を短/長で区別する文化 (clap 型) を kuu が模倣する必要はなく、範囲の違いは型の違いとして宣言する。help DR で help_all プリセットの中身 (hidden 込み全表示の意図メタ) を確定

## HELP-Q11: visibility の全体整理 (kawaz の再整理要求への回答)

### 「visibility が completion にも関係する話」の所在 — 既存裁定の全体像

visibility (hidden) は **help と completion の両方に既に一貫した裁定があります**。同じ 1 原則が両方を貫いています: **「素材とポリシーの分離」— hidden はメタとして常に運び、既定除外は消費側 (レンダラ / 生成器) のポリシー**。

| 面 | 規定 | 正本 |
|---|---|---|
| 宣言 | `hidden: true` は「help 一覧と補完候補の両方から既定除外、**受理は不変**」(隠し要素は普通に起動できる) | DR-058 §1 |
| completion | **complete API は hidden に関わらず候補を返し、候補の `meta.hidden` にフラグを載せる**。既定除外は生成器 (層 2) の関心。`candidates[].meta` = `{is_alias, hidden, deprecated}` は必須検証 (省略で検証が骨抜きになるのを防ぐ、COMP-Q2) | DR-060 §3、DR-104 §2/§3、schema/fixture.schema.json |
| help | help model も同型: **hidden をメタとして落とさず運び、既定除外はレンダラ policy** (「--help-all で hidden も表示」をレンダラが作れるように) | 設計プラン §5.2 (DR-058 §1 の予告の実現) |
| 絞り込みポリシーの例 | 「未入力 tab-tab は alias を隠す / 途中入力は全部出す」等は候補メタを見た生成器側の選択で kuu は固定しない | DR-060 §3 |
| deprecated | 同じ分離: メタで運び、表示 (打消し線等) は消費側 | DR-058 §2、DR-104 |

つまり **completion は「hidden メタ搬送 + ポリシーは層 2」で既に完全に裁定・実装・fixture pin 済み** (fixtures/complete/meta.json が hidden オプションの候補搬送を pin)。help 側は同じ原則を model に写すだけで、新規裁定は不要です。

### 今回の help_all / help_category との接続

- `--help-all` (hidden 込み全表示) = **help_all 型の入口** (上記裁定) + レンダラが hidden メタを見て表示に含める、で完結
- **補完候補への category 搭載は不要 (kawaz 裁定 2026-07-18「意味が分からない」で確定 — 載せない)**
- **order 系 (help_group_order / help_order / help_after) は補完に関わる可能性あり (kawaz 指摘)**: 補完候補の提示順を定義者が制御したい場面 (よく使うオプションを先に出す等)。現行 DR-104 は candidates の**比較を順序非依存の multiset** としており順序は非規範 — order 系を補完に効かせるなら「candidates の列挙順に order を反映する (比較規約は多重集合のまま = 順序は SHOULD)」が最小干渉の形。生成器がメタとして order を受け取る案 (meta 拡張) もある。**この論点は help DR でなく補完側の設計余地として issue 起票し、order 系の意味論確定 (help DR) 後に検討するのを推す** (補完の表示順は shell 側の挙動 (zsh の group 表示等) にも依存し、単独で決めきれないため)

## HELP-Q12: hidden の語彙設計 (kawaz 指示「他ライブラリを鑑みつつ提案」)

### 各ライブラリの hidden 語彙の実測 (survey findings より)

| 系統 | 語彙 | 粒度・特記 |
|---|---|---|
| clap | `hide` + **`hide_short_help` / `hide_long_help`** (出し分け単位の部分 hide)。**エラー時 usage には出る**非対称あり | 3 語彙、bool |
| argparse | `help=SUPPRESS` (専用語彙なし) | — |
| click / typer | `hidden=True` | bool 1 本 |
| cobra | `Hidden` + 可視性判定メソッド群 (`IsAvailableCommand` 等) | bool 1 本 |
| urfave/cli | `Hidden` + `HideHelp`/`HideVersion` (機能自体の抑制) | bool + 機能トグル |
| commander | `.hideHelp()` | bool 相当 |
| yargs | `hidden: true` + **`--show-hidden` 救済経路** | bool + ランタイム opt-in |
| picocli | `hidden` (Command/Option/Parameters 共通) | bool 1 本 |
| Swift AP | **`visibility` (段階値)** — `shouldDisplay`/ArgumentHelp.visibility、`private` 等の列挙 (詳細未確認) | **唯一の段階制** |

収束点: **`hidden: bool` 1 本が圧倒的多数派**。段階制 (visibility enum) は Swift AP のみ、出し分け単位の部分 hide (hide_short_help) は clap のみ。

### kuu の現状と提案

kuu は既に `hidden: bool` を wire 語彙として持ち (DR-058 §1、DR-104 の CandMeta で補完へも搬送済み、fixture pin 済み)、意味は「help 一覧・補完候補の両方から既定除外、受理不変」。

- **a. `hidden: bool` 1 本を維持 (推し)**: 多数派慣習と一致し、既に fixture pin 済み。help/completion の範囲出し分けは kuu では別の部品が担う — clap の hide_short_help 相当は「help_all 型では出す」(help_all 裁定済み)、yargs の --show-hidden 相当は生成器の meta.hidden 参照、Swift AP の段階制が表す「help には出すが補完には出さない」等の非対称が欲しい場合のみ b へ
- b. `hidden` を bool | string[] に拡張 (`hidden: ["help"]` / `["completion"]` で面別制御、bool true = 全面)。段階制 (Swift AP) より宣言的で kuu の語彙慣習 (配列で面を列挙) に合う — ただし面別 hide の実需が現時点で無く、CandMeta / help model の hidden フィールド型も bool から変わる (fixture 改訂を伴う)
- c. 別案 (自由記述)
