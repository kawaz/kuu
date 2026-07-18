# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチ 4 巡目。裁定済み: Q2=a、Q7=a、Q3=グループ先頭宣言スタイル + order/help_after 併存 (意味論込み)、**Q4=a** (help + help_long の 2 本立て + 相互フォールバック)、**Q5=b** (既定は選択 scope の 1 層分、depth opt-in で全層も可)、**Q6=a** (command_path を model に含める)、**Q8=a** (type:help 全体単一セル + help_onfail 構想で設計を詰める)。全て findings の設計プランへ反映済み、正式化は help DR (P1)。Q9 (version) も裁定済み: 反応は成功・失敗ともアプリ責務、失敗時発火の基盤は汎用属性、help_onfail は type:help の糖衣 (type config で汎用属性へ全展開)。Q11 (visibility 整理) も完結: hidden 語彙は Q12=a (bool 1 本維持、面別非対称は ref 分割定義)、補完への category 不搭載で確定、order×補完は issue completion-ordering-and-lazy-candidates へ。Q10 も裁定済み (Q10-1=a help_category 採用、Q10-2 = type:help_category 型化構想 — bool セル連動トリガ・or 出し分け・values 制限・固定値充足入口、findings §5.4b に記録)。**HELP-Q バッチ全問完了 — 裁定待ちゼロ**。次: help DR (P1) 起草。詳細の正本: `docs/findings/2026-07-17-help-mechanism-design-plan.md` + `docs/findings/2026-07-17-cli-help-vocab-survey.md`。
