# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺CORD-Q1〜Q5: 補完の順序制御・lazy・表示 policy (正本: docs/findings/2026-07-21-completion-ordering-plan.md)

- **👺CORD-Q1: 順序制御の経路** — (a 推し) canonical 生成器が help model の §8 適用済み順序を参照 (spec 変更ゼロ、順序素材は既に届く経路がある) / (b) 候補 wire に順序フィールド追加 / (c) 生成器任せ現状維持。shell 実態: zsh/bash は保持可、fish は原理的に不可 — findings §1
- **👺CORD-Q2: 補完専用 order 語彙の要否** — (a 推し) 立てない (help_order がそのまま効く、実需が出たら非破壊追加。v1 完備主義との緊張は「順序制御自体は Q1=a で完備、専用語彙は差別化需要待ち」の整理) / (b) completion_order 語彙新設 — §1.4
- **👺CORD-Q3: lazy 補完の v1 位置づけ** — (a 推し) completer 実行層 (DR-111 §5 ABI) の関心と確定、core 契約不変 / (b) core に lazy 表現追加 — §2
- **👺CORD-Q4: 候補説明の供給経路** — (a 推し) 候補へ同梱せず origin で定義を引き直す規則を生成器 policy 文書化 (DR-113 §1「表示メタを評価器へ運ばない」と整合) / (b) description を候補 wire に同梱 — §3.2
- **👺CORD-Q5: deprecated/hidden/alias の生成器既定 policy** — (a 推し) hidden 除外 / deprecated 表示 + 注記 / alias 表示、wire 席は立てず出力非 pin (DR-115 §6.2 と同型) / (b) 別配分 — §3.3

## 👺MISC-Q1: ref template 越し候補 origin の非対称を仕様化 (issue lowering-generated-element-origin-rule)

実装静的解析の結果: trigger 候補 = 参照元要素名、値位置候補 = template 内部 leaf 名、で**実装が一意に決定済み**。(a 推し) この非対称をそのまま DR-104 §3 に確定文言化 + fixture 2 本 pin (trigger 綴り由来 vs 値スロット語彙由来の関心分離として説明可能、統一案 b/c は dedup 破壊 or alias 帰結との齟齬)。回答: `MISC-Q1=a` 等

## 👺MISC-Q2: from_entries の不適合入力 + wire 直列形 (issue from-entries-nonconforming-input-wire-form)

実装は total pass-through (エラーを出さず fallback、key 非 string は "?" 化、重複 key 保持) で一意決定済み。encode の wire 3 形 ("entries" / [k,v] / promote key) は schema 未追随。**(推し) w1+v1**: 実装 encode 3 形を wire canonical に格上げ (schema 拡張 + descriptor 完全宣言 + DR-044 追記) + 不適合入力 5 パターンを追認明文化 + fixture pin。total 契約 (DR-036) を保つ。対案 = 検査/エラー化 (total を捨てる、波及大)。回答: `MISC-Q2=推し` 等

## 👺MISC-Q3: kuu.mbt の remote 枝 3 本の削除 (issue mbt-workspace-cleanup + mbt-remote-branch-context-audit)

棚卸し実測: `origin/ast-spec` / `origin/claude/review-implementation-gLfMA` / `origin/dependabot/...` の 3 本は**現系譜 (main/kuu-v0/ast-spec) に完全吸収済みを実証** (未回収 diff 0)。(a 推し) 3 本削除 + issue 2 件 close (TODO の古い記述も現状に同期)。kuu-v0 / ローカル workspace 群は温存方針どおり不変。新発見の孤立 default workspace (中身なし) も forget して良いか併せて。回答: `MISC-Q3=a (default forget も可)` 等
