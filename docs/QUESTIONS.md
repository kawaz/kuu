# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## ACC-Q1〜Q3: accumulator 語彙と accum_filters の Result 化 (調査完了、裁定待ち)

調査結果 (fallibility 全数 + 言語横断動詞マトリクス): 詳細はセッション scratchpad の accum-fallibility-vocab-recon.md (findings 記録予定)。勢力図 = **filter 席は fallible 優勢 / 構造畳み装置 (accumulator/collector) は total が全員** (DR-082 の「構造的妥当性は definition-error へ、runtime は total」パターンの体系適用)。T[][] は ref×repeat×append で既に可能 (DR-084 §2 pin 済み) だが scalar 側は separator が piece に潰すため不可。

裁定済み: **ACC-Q3 = Result 化** (kawaz 2026-07-14。線引き =「filter 席 = fallible / 構造装置 = total」、実装サイクルは complete DR の後)。ACC-Q1/Q2 は kawaz の再検討 (extend は言語非依存文脈で別義リスク / push も単独では迷い / 一般論では flat=spread・concat、そのまま=wrap・nest が低誤解) を受けて更新:

裁定済み (2026-07-14): **ACC-Q1d = Yes** — `append` 維持 + `flatten` ダイヤル (既定 false、true で発火値が配列ならその要素を積む = 1 段)、既存 flatten accumulator は append+flatten:true に統合して廃止。「accumulator が実質 2 つのレイヤを扱っていたのを flatten 明記で整理」(kawaz)。実行サイクル着手済み。
- 裁定済み (2026-07-14): **ACC-Q4 = OK** — `length_range:min:max` を Result 化と同サイクルで追加。**merge と flatten の整理** (kawaz 確認): flatten ダイヤルは append 専用 — merge の入力は常に scalar piece (merge × ref は DR-084 §3 が definition-error で封じ済みで、配列発火値が構造的に到達しない) ため選択肢自体が発生しない。他 accumulator への flatten 宣言は invalid-range (宣言形不一致の確立パターン) として DR-105 で pin

副次 (裁定不要、次バッチで対応): unwrap_single / from_entries の descriptor が builtin-descriptors.json に未収載 (total なので reasons:[] を補うだけ)。

## V1 残タスク (V1-Q1=b 裁定済み 2026-07-14、裁定待ちなし)

V1-Q1 = **b (4 プロファイル全部の green が v1.0.0 発行条件)** で確定 → completion fixture 系統が v1 blocker に昇格、complete DR サイクル起草中。V1-Q2 は個別扱いで消化 (DR-070 §4 の単独 golden 要求を「席宣言型は組合せ内 coverage で足りる」に明確化 + 不足組合せの補充のみ)。V1-Q3 は V1-Q1=b により「今起草」で決着。リリースプロセス構築 (V1-R16〜18) は complete 系統の後。
