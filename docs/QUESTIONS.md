# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺REV-Q3: parse/resolve 2 相契約の閉じ方 (説明付き再提示)

### 背景説明: 現在の 3 玄関 (parse / resolve / output) が何をしているか

kuu.mbt の front door は現在 3 つの関数を直列に呼ぶ規約 (kuu.mbt src/kuu/front_door.mbt):

1. **`parse(ast, args, env, config, tty) -> Outcome`** — argv を読み、どのトークンがどの要素に割り当たったかの **binding 列** を作る。Outcome は Success(bindings) / Failure / Ambiguous の 3 択
   - **濁りの実態**: 名前は「parse = CLI を読むだけ」だが、実装は collision 昇格判定のために **env/config/tty をここで既に要求し、値源解決 (resolve 相当) を内部で 1 回実行している**
2. **`resolve(ast, outcome, env, config, tty) -> Outcome`** — Success の bindings に値源ラダー (CLI→env→config→default) を適用して各セルの最終値を確定する。**parse に渡したのと同じ env/config/tty をもう一度渡す** (doc comment 自身が「冗長さはあるが」と自白)。Success 以外 (Failure/Ambiguous) はそのまま素通し
3. **`output(ast, outcome) -> Json`** — 確定済み bindings を result オブジェクト (JSON) に射影する

**問題**: (i) 利用者は同じ値源を 2 回渡す。(ii) resolve は「任意の Outcome」を受けるので、**resolve を呼び忘れた生 bindings を output に渡してもコンパイルが通る** (値未確定のまま射影される事故が型で防げない)。(iii) Ambiguous を受けた後に何をすべきかが型からも doc からも読めない

### 選択肢

- **(a) 推し: 段階を型で強制する**
  - parse の戻りを `ParsedOutcome`、resolve の戻りを `ResolvedOutcome` という**別の型**にし、output は `ResolvedOutcome` しか受けない。「resolve を飛ばして output」がコンパイルエラーになる = 誤用が構造的に不可能
  - 利用者から見える関数は今の 3 つのまま、型が変わるだけ。Ambiguous の resolve 意味論の DR 裁定が同時に必要 (下記補足)
- **(b) 1 発 API を正にする**
  - parse が resolve まで完遂して最終 Outcome を返す形に統合 (値源は 1 回渡すだけ)。2 相は internal 化して公開面から消す
  - Ambiguous は「終端 (表示して終わり)」と定義でき、追加裁定不要で閉じる。「binding 列だけ欲しい」用途 (conformance runner の効果列検査等) には内部 API を残す
- **(c) 現状維持 + doc 明確化のみ** (型の強制なし、二重供給も残る)

### REV-Q3 補足 (調査 2026-07-24): Ambiguous の扱いは本 Q の従属変数

- spec は「Ambiguous の構造と提示」まで規定、後続手順 (選んで続行) は未規定。「第一候補採用」は DR-053 §3 (順序は同一性成分でない) と原理矛盾するため選択肢にならない
- (a) 段階型なら「Ambiguous → 選択 → resolve」の遷移型が必要 = resolve 意味論の裁定が不可分。(b) 1 発 API なら「Ambiguous = 終端 (表示のみ)」と定義でき、追加裁定不要で閉じる
- どの案でも DR 追記が 1 点必要: 「interpretation ビューは何相まで適用した姿か」— 現 fixture (export-key/collision-default-divergent.json) は値パイプライン適用済み・値源ラダー不完全の中間状態を暗黙採用しており、明文が無い

---

**裁定済み (2026-07-24、REV-Q3 のみ再提示中)**: REV-Q1=a (玄関型を kuu 側 opaque 化、engine internal 化) / REV-Q2=a+回収 (2^53 明記 + reject/warning。**bigint は core に入れず各言語実装側の拡張として個別実装** — 1st party 提供の 3rd ライブラリ的立場で「こう拡張できる」のデモを兼ねる) / REV-Q4=a (dogfooding 主タスク化、H2-H9 はその中で一括解消) / REV-Q5=a (API 磨き第 2 サイクルへ統合、REV-Q1 の型置き換えと同窓で破壊 1 回)

