# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> 詳細の正本: `docs/findings/2026-07-17-help-mechanism-design-plan.md` (統括反映後のパス)。
> 前提: 「help installer は installer ではなく help query + レンダラ層に分解する」が本バッチの土台 (同 findings §2)。この分解自体に異議があれば HELP-Q0 として自由記述で。

## HELP-Q1: 失敗時アクション属性の正式フィールド名

DR-048 §3 / DESIGN §13.9 が未予約のまま、参照実装 (kuu.mbt `src/kuu/wire_decode.mbt:95`) は `fail_action: bool` で先行。

- **a. `fail_action` を追認** (推し: 実装先行の名と意味が一致し簡潔、追加コストゼロ)
- b. `failure_action` (省略しない綴り)
- c. 別名 (自由記述)

## HELP-Q2: help model の露出経路 — query:"help" の conformance 化

- **a. query タグ `"help"` を新設し `fixtures/help/` で pin、kuu-cli に `kuu help` として写す** (推し: complete (DR-104) と同じ型で、多言語実装間の help 素材同一性を機械検証できる + 極小バンドルモード (DR-109 §6) の help 供給経路になる)
- b. help model は spec の散文定義のみ (fixture 化しない、実装の自由度優先)

## HELP-Q3: `help_group` (オプションのグループ見出し指定) を v1 に入れるか

clap の `help_heading` / picocli の section 相当。純表示メタで追加互換。

- **a. v1 では入れない** (推し: 追加互換なので実需が出てから。v1 語彙を最小に保つ)
- b. v1 から予約だけする (フィールド名 `help_group: string` を DESIGN §1.4 に載せ、挙動は後続)
- c. v1 で挙動まで入れる

## HELP-Q4: 長文説明の分離 (`help_long` — clap の about/long_about 相当) を v1 に入れるか

- **a. v1 では入れない** (推し: HELP-Q3 と同根拠。`help` 1 本で始めて `--help` と `-h` の出し分けはレンダラが同一素材から判断する余地もある)
- b. v1 から予約 / 導入

## HELP-Q5: usage 素材の粒度

- **a. 要約素材のみ (positional 進行の要約 + has_options / has_subcommands / has_dd)** (推し: 任意ネスト構造の一行化は docopt の逆問題で沼。忠実な usage を組みたいレンダラは wire definition を直接読めば足りる — model は「定義を読み直さず一覧が組める要約」と割り切る)
- b. usage tree (定義構造の写し) を model に含める
- c. usage を model に含めない (レンダラが definition から全部組む)

## HELP-Q6: プログラム名 (`prog`) の座席

args が $0 非包含 (DESIGN §0.1) のため定義にプログラム名が存在しない。

- **a. help model に含めない。レンダラ / kuu-cli 入力の関心** (推し: $0 非包含の既定と一貫。busybox 型は argv0 issue (`docs/issue/2026-07-14-argv0-preset-type.md`) の領分)
- b. definition ルートに `prog_name` 表示メタを新設する

## HELP-Q7: v1 発行条件 (V1-Q1 = 4 プロファイル green) に help プロファイルを加えるか

- a. 加える (5 プロファイル green が v1 条件)
- **b. 加えない (help は v1 後の最初の増分)** (推し: v1 blocker を増やさない。ただし kawaz の発題「ヘルプは引数パースの次に必要」の温度感次第で a が妥当 — 温度感の裁定そのもの)

## HELP-Q8: 失敗時アクションの installer 区分

- **a. `failure_action` installer を canonical セット (DR-042 表) に追加** (推し: constraint installer と同型の「能力宣言型」で、1 語彙 1 所有者 (不変則③) と descriptor (`owns: ["fail_action"]`) が素直に立つ)
- b. 入口系 installer (long/short/command) の共通規則にする (installer を増やさないが、1 語彙を複数装置が解釈する形になり不変則③との整合説明が毎回必要)
