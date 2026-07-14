# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## ACC-Q1〜Q3: accumulator 語彙と accum_filters の Result 化 (調査完了、裁定待ち)

調査結果 (fallibility 全数 + 言語横断動詞マトリクス): 詳細はセッション scratchpad の accum-fallibility-vocab-recon.md (findings 記録予定)。勢力図 = **filter 席は fallible 優勢 / 構造畳み装置 (accumulator/collector) は total が全員** (DR-082 の「構造的妥当性は definition-error へ、runtime は total」パターンの体系適用)。T[][] は ref×repeat×append で既に可能 (DR-084 §2 pin 済み) だが scalar 側は separator が piece に潰すため不可。

- **ACC-Q1**: 現 accumulator `append` (発火値を 1 個積む) の改名 — **a (統括推し): `push`** (JS/Rust/Ruby/MoonBit で「1 個積む」が割れない。**MoonBit 自身の Array::append は「展開結合」で kuu の append と正反対** — 実装言語との直接衝突を解消) / b: `add` 等
- **ACC-Q2**: 展開結合 accumulator の新設 — **a (統括推し): `extend` 新設** (Python/Rust/MoonBit で「展開」が割れない。`flatten` は DR-036 で repeat の cons 平坦化に既予約のため不可) / b: 見送り
- **ACC-Q3** (旧 CR-Q1): accum_filters の Result 化 — **a (統括推し): Result を生やす** (線引き =「filter 席 = fallible / 構造装置 = total」。accum_filters は filter 席なのに total なのが例外側で、Result 化が体系を揃える。kv_map の手前ゲートは accumulator の話なので非対称にならない。配列全体の検証は matcher ゲートでも静的でも書けず fallible accum_filters が唯一の座席) / b: transform 専用の正式契約化

副次 (裁定不要、次バッチで対応): unwrap_single / from_entries の descriptor が builtin-descriptors.json に未収載 (total なので reasons:[] を補うだけ)。

## V1 残タスク (V1-Q1=b 裁定済み 2026-07-14、裁定待ちなし)

V1-Q1 = **b (4 プロファイル全部の green が v1.0.0 発行条件)** で確定 → completion fixture 系統が v1 blocker に昇格、complete DR サイクル起草中。V1-Q2 は個別扱いで消化 (DR-070 §4 の単独 golden 要求を「席宣言型は組合せ内 coverage で足りる」に明確化 + 不足組合せの補充のみ)。V1-Q3 は V1-Q1=b により「今起草」で決着。リリースプロセス構築 (V1-R16〜18) は complete 系統の後。
