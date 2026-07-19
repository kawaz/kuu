# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> **⚠ 2026-07-19 HIP-META-Q バッチ裁定 (mid=14)**:
> - **meta-Q1 = a**: help_installer が必要、DR-112 §1 撤回、設計プランから立て直し。実装ロールバック計画へ
> - **meta-Q2**: help_epilog 以外承認 (order 関連 / display_name / value_name / help_on_failure 齟齬なし)。**help_epilog だけ意味説明後の裁定待ち → 下記 HIP-META-Q2-EPI**
> - **meta-Q3**: depth = "scope" | "all" 承認、数値 depth 不要。他 worker 起草部分も「基本よさそう」
> - **meta-Q4**: 他 CLI パーサに前例無しの kuu 独自の悩みと確認、value_structure tree = a 相当を暫定推し。レンダラ 3 案 (`--color <COLOR_NAME|R G B>` 1 行 / 2 行分離 / 詳細説明付き) は canonical レンダラ設計時に決定

## HIP-META-Q2-EPI: help_epilog を採用するか (残 1 件)

### 語源と実 CLI 実績

- `epilog` は英単語 (Ancient Greek `epílogos` 由来、`prologue` の対義語で「終章・結び」)。略称ではなく普通の英単語
- 実 CLI パーサでの実績: argparse (`ArgumentParser(epilog="...")`) / click (`@click.command(epilog="...")`) / typer / Commander.js `.addHelpText('after', ...)` / yargs `.epilog(...)` と広く採用。survey (`docs/findings/2026-07-17-cli-help-vocab-survey.md`) の統合サマリ 5 で「セクション拡張は普遍的、末尾テキスト = 過半数が持つ」と裏取り

### 用途

help 出力の末尾、オプション一覧の後に置く自由テキスト:

- 連絡先 (`Report bugs to: ...`)
- 注意事項
- "See also" 節
- 追加の使用例
- 法的注意 (`Copyright ...`)
- 環境変数一覧の補足など

**description は冒頭、help_long は詳細本文、epilog は末尾フッター** の 3 部構成 (実 CLI ツール hangar)。

### kuu で採用する意味

素材として model に載せる (レンダラが末尾に組む)。無ければ「オプション一覧の後に何かを出したい」を**定義側から素材化する座席が無い**。実 CLI で末尾フッターに出しているアプリの needs を kuu spec で吸収できなくなる。

### 選択肢

- **候補 a (推し)**: 採用する。`help_epilog: string` を任意要素属性として持つ (定義時に「オプション一覧の後に出す自由テキスト」を宣言できる)。model 側は `epilog: string` として素材化、レンダラが末尾に組む
- 候補 b: 採用しない。末尾フッター素材席は kuu spec で持たず、アプリ側 (レンダラ設計時) で自作。実 CLI アプリの needs は各アプリ側で吸収

## HIP-META-Q4: 複合値構造 option の help model 表現

### kawaz 追補 (mid=13)

`--color` の 3 引数 (`--color r g b`) だけでなく、`colorname` との or (`--color red` or `--color 255 0 0`) も kuu 背骨 (or/seq/repeat 任意ネスト) で書ける仕様。help model で表現できないと素材不足。

### kawaz 提示 (mid=14)

他 CLI パーサに前例が無い kuu 独自の悩みと確認 (統括の他 CLI 調査でも or 分岐値 option を model schema で扱う CLI パーサは無し、全て custom parser 内に隠蔽)。

kawaz レンダラ表示案 (canonical レンダラの候補):

1. `--color <COLOR_NAME|R G B>` (1 行 pipe 分岐)
2. `--color <COLOR_NAME>` / `       <R G B>` (2 行、value_name のみ)
3. `--color <COLOR_NAME|RGB>` / `        COLOR_NAME:  cssカラー名` / `        RGB: R G B  RGBカラー0-255の数字3つ。e.g. 255 0 0` (usage 名 + 詳細説明)

### 選択肢

- **候補 a (推し)**: options entry に `value_structure` フィールドを追加、tree 形は AST の or/seq/repeat と同型で表現力を保存。レンダラは tree を再帰的にトラバースして usage/help を組む。kawaz 3 案はレンダラ policy の候補 = **model は素材のみ、canonical レンダラで既定案を決める**

  ```json
  {
    "spellings": ["--color"],
    "value_structure": {
      "or": [
        {"single": {"value_name": "COLOR_NAME", "values_enum": ["red", "green", ...]}},
        {"seq": [
          {"single": {"value_name": "R", "type": "number"}},
          {"single": {"value_name": "G", "type": "number"}},
          {"single": {"value_name": "B", "type": "number"}}
        ]}
      ]
    }
  }
  ```

- 候補 b: `value_names: [...]` 平坦 list (単純複数値のみ、or 分岐は非対応) — kuu spec の or 表現力を model が捨てる**縮小推し (v1 完備主義違反)**、不採用側
- 候補 c: 現状維持 (value_name 1 個)、複雑構造はレンダラが AST を直接読む — 素材と policy 分離の原則を破る、DR-112 骨格違反

## HIP-Q バッチ (発生順)

> **注**: HIP-META-Q1 = a 裁定に伴う DR-112 全体撤回 + 立て直しを待つため、HIP-Q1〜Q4 の議論は保留。新 DR (help_installer 設計プラン起草後の正本) の記述に応じて再定式化する。旧 HIP-Q1〜Q7 のうち Q2/Q5/Q6/Q7 は実装追随 issue に、Q3 は drift 訂正、Q1/Q4 は新 DR に取り込みで消化される見込み。
