# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## UX-Q7R: CLI の resolve 適用条件の再考 (Q7 誤読の巻き戻し、2026-07-16)

> 経緯: UX-Q7 への kawaz 回答「Q1-6で出た話も含めて最高」を a 案承認と誤読して DR-109 §7 を確定処理したが、原文は「〜含めて**再考**」の typo だった (kawaz 訂正)。DR-109 §7 に再考中 note を追記済み。§7 の内容は再裁定まで暫定。

元の問い: conformance fixture は `resolve` フラグで resolve 相の適用を選ぶが、kuu-cli は常時 resolve を適用する。この差で export-key/collision :: single-exposure-ok が kuu-cli だけ fail した (未発火 flag の preset default が resolve で充填され共露出キーに混ざる。kuu.mbt runner は green)。

「Q1-6 で出た話も含めて再考」の解釈候補 — Q6 裁定 (kuu-cli はテストツールでなくアプリ内 kuu と同一挙動が本義) を踏まえると:

- **(a) 旧 a 案 (暫定実装中)**: CLI は既定 resolve 維持 + 「preset default は export_key 共露出に参加しない」を spec 明文化。collision fail は射影側で解消
- **(b) resolve 適用有無を fixture と同じ軸で CLI にも露出**: `--no-resolve` opt-out を設け、既定は resolve。conformance gate は fixture の resolve フラグに追従して切替
- **(c) 「アプリ内 kuu と同一挙動」の含意を先に確定する**: アプリ内の kuu (kuu-ux 経由) が parse/resolve をどう呼ぶのが標準形かを kuu-ux 設計 (骨子柱 1 の Binding 面) で先に決め、kuu-cli はそれに従う — Q6 の第一原理からの導出で、resolve の既定を CLI 単独で決めない
- (d) その他 (再考の意図を自由文で)

(kawaz の「再考」の意図がどの層 (CLI 既定 / spec 明文化 / kuu-ux との整合) に向いているか自由文で教えてもらえれば、選択肢を組み直します)


