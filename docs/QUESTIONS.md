# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺COMPQ-Q1: 同一 spelling で term 違いの候補を行応答でどう畳むか

**質問**: 素材 (DR-104 §3、fixtures/complete/eq-split-cont.json case `word-end-and-cont-coexist-same-origin`) は `--port × WordEnd` と `--port × Continue` の 2 件併存を pin する。これを行応答 (DR-117 §4/§5) に落とす段の畳み方が未規定 (規範 gap)。現実装は 2 行 emit で、shell 補完に同一 flag が 2 回出る (実機検証で発見)。正本: docs/issue/2026-07-23-completion-query-duplicate-candidates.md

- **(a) 推し: Continue 側 (nospace) に統合して 1 行 emit**
  - eq-split 併存の意味は「値を続けて書ける」で shell UX 上 nospace が実態。同一 origin 派生なので統合で失う情報は無い。DR-117 §5 policy 段に merge 規則を追記、fixture 増分ゼロ (§8.1 の分担どおり)
- (b) WordEnd 優先で 1 行 emit (nospace なし — eq-split の nospace hint を失い挿入 UX 劣化)
- (c) 素材通り 2 行 emit 維持、glue で吸収 (glue 3 種で扱いが割れ shell 間 drift = DR-117 §5 の思想に反する)

