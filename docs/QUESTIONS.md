# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺AP2-Q2: DR-075 旧裁定「int 値域は実装定義」の supersede 確認

**質問**: AP2-Q1=a (2^53 超過 Error 固定) を成立させるため、M1 実装は旧裁定「int の値域は実装定義 (Int64 実装は 2^53 超を受理してよい)」(kawaz 2026-07-08、DR-075) を **canonical 値域 = 絶対値 2^53 固定に supersede** した。Error 固定 + 移植間の受理域一致からの導出だが、過去の明示裁定の上書きを含むため確認。正本: DR-075 の Superseded 注記 + fixtures/value-typing/int-precision-2pow53.json

- **(a) 推し: supersede を承認** (全実装で受理域が一致 = fixture で pin 可能。厳密値域が要るユーザの逃げ道は自作 type 登録 or string 受け、は旧裁定のまま不変)
- (b) 「保証下限 2^53 + 実装はより広くてよい」に読み替え (Int64 実装の受理を許すが、移植間で同じ入力の成否が割れ、reject fixture を置けなくなる)

## 👺AP2-Q3: engine internal 化と拡張 ABI の公開範囲 (sol blocker 1)

**質問**: builtins の公開シグネチャが @engine 型を 75 箇所露出しており、engine 封鎖 (REV-Q1=a) と builtins 公開残置が両立しない。正本: docs/findings/2026-07-24-api-polish-2-plan.md §1.1 / §6

- **(a) 推し: 外部拡張面も本サイクルで閉じる** — builtins も internal 化、v1 公開面は kuu 玄関のみ。拡張 ABI は bigint 拡張 (REV-Q2 の言語側回収) を最初の顧客として別サイクルで設計して開ける
  - 根拠: 閉→開は非破壊、開→閉は破壊の非対称。拡張 ABI の線引き (Registry/Ext trait/descriptor) は大きな設計で、本サイクルに繰り込むと破壊窓が肥大する
- (b) 拡張 ABI package を本サイクルで切り出す (Node 級の巨大 pub(all) が公開面に残り、封鎖の縮小幅が減る)

## 👺AP2-Q4: parse 産物ハンドルの AST provenance (sol blocker 2)

**質問**: Interpretation::view() 等は ast/export map が必須で、別 definition の ast を混ぜて渡せる取り違えが型で防げない。findings §1.2b / §6

- **(a) 推し: AST 束縛ハンドル** — parse 産物 (ParsedBindings/Interpretation) が AtomicAST 参照を内包し、view/resolve/output から ast 引数が消える。取り違えが構文的に不可能
- (b) identity 実行時検証 (ast 引数は残し、不一致を実行時エラー — 検出が遅く、新しいエラー種別の座席設計が要る)

