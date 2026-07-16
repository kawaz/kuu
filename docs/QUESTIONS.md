# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## TY-Q1: completion 候補の wire フィールド `ty` の改名先 (kawaz 発題 2026-07-17)

candidate の `ty` (DR-104 §2、CONFORMANCE §4、fixtures/complete/) は MoonBit の予約語回避 (`type` が識別子不可) が wire に漏れた略記で、分かりにくい。改名は「あとでまとめて」(kawaz) — 次の spec 変更バッチに同乗。

- **(a) `type` に統一** (統括推し): definition 側の `type` フィールドと一貫。JSON wire に予約語制約は無く、実装識別子は MDR-003 既存規約 (`fields(rename=...)`) で吸収 — 実装コストは (b) と同等
- (b) `typ`: kawaz 原案。実装識別子と wire の綴りが一致する利点、definition の `type` との二重綴りは残る

変更範囲: DR-104 追記 note + CONFORMANCE §4 + fixtures/complete/ + schema + kuu.mbt (Cand.ty) + kuu-cli (wire 出力) の lockstep 1 回。
