# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺DOG-Q4γ: 「引数ゼロ = help」に宣言席は要るか (前提を差し戻して再提示)

### 背景説明 (kawaz 指摘 2026-07-24「対称って何？公開API的にどうなってる？」への整理)

旧 Q4α/β は「help_on_failure と対称の新糖衣を設計する」前提で書いたが、**公開 API の実物を確認するとその前提が弱かった**。help がユーザに届く経路は 2 本あり対称ではない:

1. **成功時**: `ParsedOutcome::Success(bindings)` → アプリが result の `help` キー (`{help: true}`) を見て自分で help_query → renderHelp する定型パターン (DR-113 §2 orchestration、DESIGN §14.1)。kuu は help を**出さない** — 素材 (help model) を返すだけ
2. **失敗時**: `ParsedOutcome::Failure(ParseFailure)` の `fired_action: "help"` を見てアプリが renderHelp。`on_failure` / `help_on_failure` は**この失敗経路だけ**の機構 (DR-048)

つまり「引数ゼロで help を出す」は今の API で既に組める:

- **経路 X (成功のまま)**: 引数ゼロは plain success (`{help: false}`)。アプリが「仕事の指定が無い」(subcommand キー不在) を見て renderHelp + exit 0 — dispatch の 1 分岐、spec 増分ゼロ
- **経路 Y (failure に倒す)**: root の subcommand 席を `required` にすると引数ゼロは完全経路 0 本 = failure。既存 `help_on_failure` が発火し `fired_action:"help"` が返る — spec 増分ゼロ、ただし **exit code は失敗系** になる (help 表示自体は出る)

残る実質論点は 1 点だけ: **「引数ゼロ → help」を『成功 + exit 0』にしたいとき、アプリに書かせず定義だけで完結させたいか**。

### 選択肢

- (a) **宣言席は不要** — 経路 X (アプリ定型) を canonical パターンとして docs (DESIGN §14.1 か CONFORMANCE 周辺) に例示を 1 段落足すだけ。kuu-cli D2 もこの形で書く
- (b) **宣言席は不要 + 経路 Y を推奨形として文書化** — 「引数ゼロ = usage error (失敗系 exit)」で良い流儀の CLI 向け。exit 0 が欲しいアプリは経路 X
- (c) **宣言席が要る** — 「定義だけ読めば『引数なしで help が出る CLI』だと分かる」宣言性に価値を置く。この場合のみ旧 Q4α/β の各論 (命名 help_on_empty / 発火条件 = positional・subcommand 席 0 消費 / help_installer 所有・on_failure と別機構 / config 昇格は DR-014 緊張あり / 既定 false) が生きる — 各論の統括推しは旧版 (git log の f0172d72) 参照
- **統括推し: (a)** — 発火条件の意味論 (「引数ゼロとは何か」= 旧 Q4α の本丸) は結局アプリの関心 (どの result を「仕事なし」と見るか) と同型で、宣言席に持ち上げても定義語彙が 1 個増えるだけで判定の難しさは消えない。dogfooding の実例 (kuu-cli) が 1 分岐で済むことを実証してから、複数アプリで頻出したら (c) を再検討する方が v1 完備主義とも両立する (「必要なものは今設計し切る」— 今は必要の証拠が 1 例も無い)
