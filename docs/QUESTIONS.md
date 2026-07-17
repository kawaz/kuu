# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチ改訂 2 巡目 (kawaz 応答 2026-07-17 を受けて説明を書き直し)。裁定済み: HELP-Q2=a (query:"help" conformance 化)、HELP-Q7=a (v1 発行条件に help プロファイル追加 = 5 プロファイル green)。HELP-Q6 は前提誤りで取り下げ (下記 HELP-Q6R 参照)。詳細の正本: `docs/findings/2026-07-17-help-mechanism-design-plan.md`。

## HELP-Q3R: help グループ・順序語彙の v1 採否 (リサーチ完了、選択肢を作り直し)

### リサーチ結果の要約 (正本: docs/findings/2026-07-17-cli-help-vocab-survey.md、12 系統 + 参考 2)

- **グループ見出し (help_group_name 相当) は過半数が保有**: clap `help_heading` / argparse `add_argument_group` / typer `rich_help_panel` / yargs `.group` / Swift AP `@OptionGroup(title:)` / kong `group` / oclif `helpGroup` 等。持たないのは click 無印・System.CommandLine・bash 補完
- **グループの表示順の明示 API はほぼ皆無** — 大半は「宣言順 / 呼び出し順」。唯一 Go kong が `Groups([]Group{Key,Title,Description})` のスライス順で明示制御 (グループ定義と表示メタを分離した 2 層設計)
- **項目単位の表示順 (help_order 相当) の数値指定は少数派**: clap `display_order` / picocli `@Option(order=N)` のみ。他は宣言順
- kuu の文脈での含意: wire form は JSON で**要素の宣言順が構造上保存される** (help model の entries も定義順保存を推す設計済み) ため、「宣言順 = 表示順」の主流モデルは**追加語彙ゼロで既に成立**している。数値 order が要るのは「宣言順と表示順を変えたい」場面のみ

### 選択肢

- **a. `help_group` (グループ名 string) のみ v1 導入。順序は宣言順で開始** (推し: 過半数の慣習に一致し、グループ見出しの実需は確実。順序の明示制御は kong 以外に前例が無く、宣言順で不足する実例が出てから `help_group_order`/`help_order` を追加互換で足す — JSON の宣言順保存が既に主流モデルをカバーしているため)
- b. kong 型のフル 2 層 (要素側 `help_group` 参照 + definition 側 groups 定義リスト {name, title, description} で順序も一元制御) を v1 から導入
- c. `help_group` + 数値 `help_order` の 2 語彙を v1 導入 (clap 型)
- d. v1 では入れない (当初案 — リサーチ結果を踏まえると過半数慣習からの乖離が大きく非推奨に格下げ)

## HELP-Q1R: 失敗時アクション属性の正式フィールド名 (説明を書き直し)

### 背景説明 (この属性は何か)

kuu は「`--help` が argv に居たら即 exit してヘルプを出す」という **early-exit を持たない** (DR-048)。パースは常に最後まで走る。では `prog --hlep typo-arg` のようにパースが**失敗**した実行で `--help` も書かれていた場合にどうするか — DR-048 の答えが「失敗時アクション」: **パース失敗時に、この要素が argv 上で発火していたら、エラーと一緒に『この要素が発火していた』ことを報告に載せる** (報告の `fired_action` フィールド)。アプリはそれを見て「エラーではなくヘルプを出す」を選べる。つまり「失敗した時に自動でヘルプを出すか」をアプリが判断するための**素材フラグ**で、kuu 自体は何も出力しない。

`type: "help"` プリセット (DESIGN §14.1) はこの属性を暗黙で同梱する。属性単体でも任意の要素 (例: `--version`) に付けられる — 「失敗時でも version は出したい」を opt-in する形。この**属性の wire フィールド名が未予約**のまま、参照実装が内部名 `fail_action: bool` で先行実装しているので、正式名を決めたい。

- **a. `fail_action` を追認** (推し: 実装先行の名と意味が一致し簡潔)
- b. `failure_action` (省略しない綴り)
- c. 別名 (自由記述)

## HELP-Q4R: 長文説明の分離を v1 に入れるか (機能説明を書き直し)

### 背景説明 (この機能は何か)

`-h` / `--help` を**ユーザがどう定義するか**の話ではない (それは既にユーザの自由)。**説明文の素材を 1 本持つか 2 本持つか**の話。多くのパーサは説明文の座席を 2 本持つ: 短い一行説明 (一覧表示に使う) と長い詳細説明 (単独表示に使う)。例: clap は `about` (短) と `long_about` (長) を持ち、`-h` では about、`--help` では long_about を表示する慣習。kuu は現在、表示メタとして `help` (string) 1 本のみ (DR-046 §3)。

- **a. v1 では `help` 1 本のまま** (推し: 2 本目は追加互換なので実需が出てから。短/長の出し分けをしたいレンダラは当面同一素材で判断)
- b. `help_long` を v1 から導入 (clap/picocli 等の慣習に合わせ最初から 2 本)
- 注: HELP-Q3 のリサーチ (10 系統横断) で各パーサの実態を確認中 — 結果次第で b の根拠が強まる可能性あり。リサーチ後の再提示に含めて良ければこの Q は保留のままでも OK

## HELP-Q5R: usage 行の素材をどこまで help model に含めるか (説明を書き直し)

### 背景説明 (何の話か)

help 画面の 1 行目にある `Usage: prog [OPTIONS] <FILE>... [-- <ARGS>...]` という**書式行**を、help query の出力 (help model JSON) からどうやって組み立てられるようにするか。3 つの選択肢は「model にどこまで加工済みの素材を入れるか」の粒度の違い:

- **a. 要約素材のみ** (推し): model には「positional の進行列 (名前・repeat・optional)」+「オプションがあるか」「サブコマンドがあるか」「`--` 区切りがあるか」の bool 群だけ入れる。上の例なら `[OPTIONS]` は has_options=true から、`<FILE>...` は positionals 配列から、レンダラが組み立てる。kuu の定義は or/seq/repeat の任意ネストを持てるため、**どんな複雑な定義でも正確な 1 行に変換する規則**を spec が決めるのは沼 (docopt が逆方向 = usage 文字列→定義 で嵌った問題の裏返し)。複雑な定義の usage をどこまで丸めるかはレンダラの裁量に逃す
- b. usage tree: 定義の構造 (or/seq/repeat のネスト) を丸ごと model に写す。レンダラは忠実な usage を組めるが、それは wire definition を直接読むのと同じ情報 — model の意義 (定義を読み直さず一覧が組める要約) が薄れる
- c. usage 素材を model に入れない: レンダラが definition を直接読んで全部組む。model は一覧 (options/commands) だけ担当

## HELP-Q6R: プログラム名の取り方 (前提を修正して再提示)

旧 HELP-Q6 は「定義にプログラム名が存在しない」を前提にしたが、**kawaz 指摘で前提誤りと判明**: トップを command タイプ (`{"type": "command", "name": "myapp", ...}`) にすればトップの command name がプログラム名そのもので、サブコマンドも祖先も同じ規則で辿れる。fixture がトップ command を書いていないのは試験の関心外だからで、通常のアプリ定義はトップ command が基本形。

この整理だと **help model のプログラム名は「選択 scope までの command name 経路」から自然に得られ、新設フィールドは不要** — help query の `path` 引数と合わせて `["myapp", "remote", "add"]` の連鎖が usage 行の `prog remote add` 素材になる。確認したいのは 1 点だけ:

- **a. help model に `command_path` (トップからの command name 列) を含める** (推し: レンダラが usage 行を組むのに毎回 definition を遡らなくて済む。トップが command でない定義 (fixture 的な素の {options,...}) では空列)
- b. model に含めず、レンダラが definition + path から自分で辿る

## HELP-Q8R: 失敗時アクション語彙の担当装置 (説明を書き直し)

### 背景説明 (何の話か)

typo サジェスト (「もしかして --port?」) は**別の既存機構** (`tried_triggers`、DR-053 §4 — 失敗位置で試された綴り一覧を報告に載せ、近接マッチ計算はレンダラの関心) で、この Q とは無関係。この Q は HELP-Q1R の属性 (`fail_action`) を **installer 体系のどの装置が所有するか**という内部整理の話。kuu では全 wire 語彙に「所有 installer」(その語彙を解釈して下流形に変換する唯一の担当装置、DR-042/056) を決める規約があり、`fail_action` の担当が未定。

- **a. 専用の failure_action installer を canonical セット (DR-042 表) に追加** (推し: constraint installer と同型の「能力宣言型」装置。1 語彙 1 所有者の規約が素直に立ち、descriptor 宣言 (owns: ["fail_action"]) も書ける)
- b. 入口系 installer (long/short/command) の共通規則として吸収 (装置は増えないが、1 つの語彙を複数装置が解釈する形になり規約との整合説明が毎回必要)
- どちらでも観測挙動は同じ (内部アーキテクチャの整理)。判断を統括に任せる場合はその旨で OK
