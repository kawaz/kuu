# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチ改訂 3 巡目 (kawaz 応答 2026-07-18 を受けて再改訂)。裁定済み: HELP-Q2=a、HELP-Q7=a、**HELP-Q3=kawaz 案** (グループ先頭宣言スタイル — 詳細は findings の設計プランに追記済み、正式化は help DR で)。**v1 方針の明確化を受領**: v1 = kuu-core の canonical (多言語展開と UX のベース) であり「後で追加互換で」の積み残しをしない — 必要なものは今全部検討して地に足のついた仕様にする。Q1R (fail_action 名) は Q8RR の kawaz 構想 (`help_onfail`) が答えを含むため統合。詳細の正本: `docs/findings/2026-07-17-help-mechanism-design-plan.md` + `docs/findings/2026-07-17-cli-help-vocab-survey.md`。

## HELP-Q4RR: 説明文の座席設計 (v1 採否でなく完備形を問う)

前巡の「v1 に入れるか」は撤回。完備主義で設計する: 説明文の座席をどう完備させるか。リサーチ実測 (12 系統): 短/長 2 本立てが多数派 (clap about/long_about・thor desc/long_desc・Swift abstract/discussion・cobra Short/Long・oclif summary/description)、単一は argparse・System.CommandLine。clap は -h → 短 / --help → 長の出し分け + 双方向フォールバックまで持つ。

- **a. `help` (短、既存) + `help_long` (長) の 2 本立て + 相互フォールバック規則 (推し)**: 多数派慣習と一致。help model には両方載せ、-h/--help の出し分けはレンダラ (未設定側はもう一方へフォールバック = clap 型)。既存 `help` の意味は不変 (追加のみ)
- b. `help` 1 本 + セクション拡張 (before/after/examples 等) で長文を賄う
- c. 別案 (自由記述 — 例: help を {short, long} のオブジェクト形も許す等)
- 併せて確認: **セクション拡張の席** (epilog/examples/footer 相当、リサーチでは普遍的) も v1 で完備するか。する場合は definition/command レベルの `help_epilog` `help_examples` 等の語彙案を次巡で設計提示する

## HELP-Q5RR: help query の既定出力範囲 (kawaz 案の確認)

kawaz 案を仕様文に直すと: **help query の既定は選択 scope (path 引数で指定した command) の 1 層分** — その scope 直属の options / positionals / 直下 subcommand 名一覧を出し、孫以深へは降りない。`prog sub --help` 相当は path=["sub"] で sub の 1 層分。これは前巡の usage 粒度の問いを包含する (1 層分の positional 進行が usage 素材、ネスト構造の深掘りは不要になる)。

- **a. kawaz 案どおり「選択 scope の 1 層分」を help model の範囲として確定 (推し)**: 実 CLI の --help の普遍的な形と一致し、usage 素材の沼 (任意ネストの一行化) も構造的に消える
- b. opt-in で全層 (再帰) 出力モードも用意 (man 生成等の一括消費者向け。help query に depth 引数を足す形)

### レンダラの実体について (Q5R の「レンダラって何?」への回答)

指摘のとおり「レンダラに任せる」は設計逃げでした。実体はこう考えています: **レンダラ = help model (JSON) を消費してテキストを組む層で、kuu プロダクトが canonical 実装を 1 個標準提供する** (設計プラン P4 — kuu-cli の `--help` を self-hosting する GNU/clap 風テキストレンダラ)。クロージャかテンプレートかで言えば**テンプレート + 部品関数のハイブリッド**を想定: 全体骨格 (セクションの並び) はテンプレート、各部品 (オプション 1 行の組み方、usage 行の組み方) は言語側の関数。ただしこの canonical レンダラ自体の設計はまだ無い — **次の設計サイクルの対象として issue 起票する** (spec が決める help model と、レンダラの内部構造 (テンプレ語彙等) の線引きもそこで)。今の HELP-Q 群は「レンダラに渡す素材 (help model) の完備」を決めている、という関係です。

## HELP-Q6RR: help model の所在と command_path の構築者 (Q6R の疑問への回答込み)

**help model とは**: query:"help" (HELP-Q2=a で確定) の**出力 JSON の構造**のこと。fixture の `expect` に書かれる形 = 仕様が規定する wire 構造で、実装 (kuu.mbt の help query 関数 / kuu-cli の `kuu help` サブコマンド) がこの形を出力する。定義 (definition) 側の話ではなく**出力側の契約**。

**command_path の構築者**: help query の実装 (kuu.mbt 等)。呼び出し側が渡す path 引数 (例 `["remote","add"]`) と definition のトップ command name から、実装が機械的に組む (トップが command なら `[トップ name] + path`)。レンダラや呼び出し側が組むのではない。

- **a. help model に `command_path` を含める (実装が組む、推し)**: レンダラは usage 行の `prog remote add` を model だけから組める
- b. 含めない (レンダラが definition + path から自分で辿る)

## HELP-Q8RR: kawaz 構想 (type:help の全体単一セル + help_onfail) の設計化

前巡の installer 区分の問いは撤回し、kawaz 構想を仕様案に直して確認する。構想の要素分解と既存設計との突合:

1. **type:help は値セルを全体で 1 つだけ持ち、どのサブコマンド scope で発火しても同じセルが true になる** — 既存機構では **global + link の合成に相当** (DESIGN §14.1 の例が既に `global: true` 併記。global コピーの発火は宣言元セルへ link 同期する = 「全体で 1 セル」は既に成立)。type:help の preset が global を暗黙同梱するか、明示宣言に任せるかが設計点
2. **long/short に好きな綴りを付けられる** — 既存どおり (type:help は入口 lowering が long/short と同型、LOWERING §A.5)
3. **`help_onfail: true` で「失敗時に自動でヘルプを出す」を要素ごとに opt-in** — 旧 fail_action の正式名を `help_onfail` にする案に相当。ただし旧設計では fail_action は汎用属性 (version 等にも付く) だった — help 専用名にするなら version の失敗時表示は別属性になる
4. **config で全体の自動ヘルプを有効化** — help セルも普通の値セルなので config/env 値源が自然に効く (DR-050 の既存経路)。「config で help_onfail 相当を制御」は、属性 (定義時固定) でなく値セル化する場合のみ成立する点に設計上の分岐あり

- **a. 構想を採用し設計を詰める (推し)**: `type:help` = bool セル + global 暗黙同梱 + link 合成 (全体 1 セル)、失敗時自動表示は `help_onfail` 属性 (help 型専用、bool)。version の失敗時表示は当面 version 側に同名属性を許すか次巡で整理。詰めた形を DR 案として次巡提示する
- b. 旧設計維持 (fail_action 汎用属性 + type:help が同梱)
- c. 構想の方向で行くが詳細分岐 (global 暗黙化の是非、config 制御の意味論) は DR 起草時に個別 Q で

### 旧 HELP-Q1R (fail_action の名前) の扱い

Q8RR=a なら名前は `help_onfail` に確定し Q1R は消滅。Q8RR=b なら Q1R (fail_action / failure_action) が復活。よって Q1R は Q8RR の従属として保留。

