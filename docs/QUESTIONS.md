# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺DOG-Q3: $schema を wire の inert 属性として語彙追加するか (D1 発見 F7)

**質問**: README が推奨する `"$schema"` 行を parse_definition が未知キー拒否する自己矛盾。正本: docs/findings/2026-07-24-dogfooding-d1-expressiveness.md F7

- **(a) 推し: `$schema` を inert 属性として語彙追加** (JSON Schema エコシステムの慣習に従い decode で無視。エディタ補完の導線と整合)
- (b) 現規範維持 (未知キー厳格拒否)、README の $schema 導線を「validate 前に除去せよ」に書き換え (利用者に手間を転嫁)

## 👺DOG-Q4: 「引数なし = help 表示 + exit 0」の宣言席 (D1 発見 F5)

**質問**: cli-design-preferences の頻出要件「引数なしで help 表示」を def で宣言できない (引数なしは help:false の success)。findings F5

- (a) 宣言席を新設 (例: definition 直下の empty_argv_action 等 — 設計が要る)
- **(b) 推し: v1 は宣言席を設けず、アプリ dispatch の 1 分岐 (result が全て既定値の success → help 呼び) を公式パターンとして docs 化** (D2 で実装しつつ様子見。頻出と実証されたら宣言席を後から足す — 非破壊)
- (c) help preset の拡張 (on_empty_argv: true 等の糖衣)

## 👺DOG-Q5: F9 (option の seq 二引数が実挙動で機能しない) の扱い

**質問**: option 上の `seq:[path,value]` は definition-error なく受理されるのに、実 parse は 1 トークンしか取らない。一次判定 = 仕様上は複数トークン消費が正で**実装 bug 濃厚** (DESIGN §1.1/§1.3、DR-027、DR-041 §3 に消費 1 固定の前提なし)。ただし「long 値スロットが seq のとき子の数ぶん消費」の正面明文は無い。findings F9

- **(a) 推し: bug として kuu.mbt を修正 + DR-041/DESIGN 系へ 1 段落明文化 + fixture pin** (一次判定どおり)
- (b) 「option の値スロットは 1 トークン固定」を規範として明文化し、seq 宣言を definition-error に (二引数 option を諦める — 表現力の後退)
