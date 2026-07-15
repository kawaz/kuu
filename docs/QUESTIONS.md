# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## NEXT-Q1: 次サイクルの作業方向 (2026-07-15)

- **(a) v1 リリースプロセス構築** (統括推し) — V1-R16〜18 (findings 2026-07-13-v1-readiness-audit Tier 1)。発行条件 (4 プロファイル green) は達成済み、仕組み側 (バージョニング / release workflow / kuu.mbt との対応宣言 / CHANGELOG) を作る
- **(b) kuu-cli PoC** — `kuu parse def.json -- args` の最小実物 (正面玄関 API + conformance プロトコル原型の流用で安い、VISION §3 の実証)
- **(c) kuu-ux 設計** — MoonBit の二つ目の顔 (b の実利用フィードバック後が質的に有利)
- **(d) completer 実装追随** — issue cand-completer-followup (complete プロファイルの完成、a/b と別リポなので並行可)
- **(e) 小粒 issue 掃除** — NoDashStr/DeprMark 監査ほか / **(f) 旧持ち越し** — codex #1 残・旧枝回収

複数選択可 (例「a と d 並行」)。統括推しは a → b。


