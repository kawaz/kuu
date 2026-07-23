# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺REV-Q1: engine パッケージ公開面の封鎖方式

**質問**: engine の pub(all) 67 型 (ElementDef/Node/Entity 等) が semver 生存不能 (フィールド/variant 追加が全て破壊変更)。kuu 玄関の戻り値も engine 型を直輸出。v1 後は直せない。正本: docs/findings/2026-07-24-fresh-eyes-adversarial-review.md B1

- **(a) 推し: 玄関で使う型 (Outcome/Candidate/Binding/Warning 等) を kuu package 側の opaque/pub 型に置き換え、engine は internal 化** (破壊変更だが v1 前の今なら無償)
- (b) engine を明示的 unstable 宣言 (docs で「engine 直 import は semver 保証外」) — 安いが強制力なし
- (c) pub(all) → pub (構築・全 match を封じる) の一括変換のみ — 中間、玄関直輸出は残る

## 👺REV-Q2: 整数精度 (2^53 問題) の v1 断定

**質問**: engine.Value の Number(Double) 一枚で int が 2^53 超で黙って精度落ち。DESIGN §3.3 の「bigxx 型」は実体なし。64-bit ID/offset の移植で穴。findings B2

- **(a) 推し: v1 は「int の保証精度は 2^53 (IEEE754 倍精度)」と DESIGN/REFERENCE に明記 + 超過値は definition/parse 段で reject または warning** (仕様として正直に閉じる)
- (b) bigint 経路 (Value に BigInt variant 追加) を v1 で設計 (v1 完備主義に忠実だが波及が wire/fixture/全実装に及ぶ)
- (c) 明記のみで reject なし (黙って落ちるよりましだが事故は残る)

## 👺REV-Q3: parse/resolve 2 相契約の閉じ方

**質問**: parse が内部で resolve 相当を実行し利用者は同じ env/config/tty を二重供給。「Ambiguous の resolve は未定」が doc comment 埋め。findings B3

- **(a) 推し: 段階型で強制 (parse → ParsedOutcome、resolve → ResolvedOutcome、output は ResolvedOutcome のみ受理) + Ambiguous の resolve 意味論を DR で裁定**
- (b) 1 発 API (parse が resolve まで完遂) を正にして 2 相を internal 化
- (c) 現状維持 + doc 明確化のみ

### REV-Q3 補足 (調査 2026-07-24): Ambiguous の扱いは本 Q の従属変数

- spec は「Ambiguous の構造と提示」まで規定、後続手順 (選んで続行) は未規定。「第一候補採用」は DR-053 §3 (順序は同一性成分でない) と原理矛盾するため選択肢にならない
- (a) 段階型なら「Ambiguous → 選択 → resolve」の遷移型が必要 = resolve 意味論の裁定が不可分。(b) 1 発 API なら「Ambiguous = 終端 (表示のみ)」と定義でき、追加裁定不要で閉じる
- どの案でも DR 追記が 1 点必要: 「interpretation ビューは何相まで適用した姿か」— 現 fixture (export-key/collision-default-divergent.json) は値パイプライン適用済み・値源ラダー不完全の中間状態を暗黙採用しており、明文が無い

## 👺REV-Q4: kuu-cli dogfooding の着手時期

**質問**: kuu-cli が自 argv を手書き parse (main.mbt 自白コメントあり)。kuu を売る CLI の存在意義に関わる。findings B4。CLI 慣習違反群 (help/exit/version 等 H2-H9) は dogfooding で書き直すと二度手間が消える

- **(a) 推し: 次サイクルで dogfooding 書き直しを主タスク化し、H2-H9 の慣習違反はその中で一括解消** (手書き側への逐次 patch は捨て作業になる)
- (b) H2-H9 を先に手書き側で速修 (公開が近いなら) → dogfooding は後
- (c) canonical impl 選定 (DR-0001) まで棚上げ

## 👺REV-Q5: API 磨き第 2 サイクルの編成

**質問**: veteran Major 群 (H10 registry 二重供給 / H11 命名割れ Candidate.ty / H12 値源供給 3 様 / H13 builtins 位置引数 / H14 bool flag 罠) を findings §2.2 に台帳化済み。前回の API 磨き (API-Q2/Q3) と同型のサイクルが要る

- **(a) 推し: REV-Q1〜Q3 の裁定後に「API 磨き第 2 サイクル」としてまとめて設計→裁定→実装** (B1 の型置き換えと同じ窓でやると破壊が 1 回で済む)
- (b) 個別に逐次消化
- (c) v1 スコープ外へ (veteran は「v1 後では直せない」と明言しており非推奨)

**補足**: 裁定不要の「やるだけリスト」(findings §4: kuu-cli 慣習修正 / validate 配線 / docs quickstart 群) は裁定を待たず着手可能。REV-Q4=a の場合 kuu-cli 分は dogfooding 窓に統合。

