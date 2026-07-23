# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺AP2-Q5: v1 公開拡張 ABI の範囲 (builtins 2 分割の帰結)

**質問**: M2c 実装で「builtins 全体を拡張作者と同じ立場に置く」が不成立と判明 (builtins 14 ファイル中 11 は Node 参照ゼロだが、node residents 12 種 + installer residents は評価器 ABI の住人で、公開すると Node 語彙の再発明が要る)。v1 の公開拡張 ABI をどこまでにするか。正本: docs/findings/2026-07-24-extension-abi-design.md §8.8

- **(a) 推し: 拡張作者と同じ立場で書ける面のみ公開** — 公開 trait 5 本 (TypeExt/CompleterExt/AccumulatorExt/CollectorExt/EntityExt + CapabilityExt)。node/installer/matcher 拡張は非公開 (internal の canonical 資材)
  - 根拠 1: AP2-Q3=b の名指し顧客 3 つ (bigint / custom completer / 自作 type) は全部この面で書ける (机上検証済み)
  - 根拠 2: 評価器内部座標 (Node/Ctx) の安定化 DR なしに node 拡張を開くのは時期尚早。閉→開は非破壊
  - arg factory 14 本も公開面から除去 (production 呼び出し元は internal のみと実測)
- (b) installer/matcher/node 拡張も v1 で公開 (plant 語彙 = Node 再発明問題の正面解決が必要、破壊窓が大きく延びる)

