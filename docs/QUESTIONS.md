# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺COMPQ-Q1: 同一 spelling で term 違いの候補を行応答でどう畳むか (慣習調査反映版)

**質問**: `long_eq_sep: "allow"` (既定 = eq/space 両受理) の時、素材段は `--port × WordEnd` (space 形) と `--port × Continue` (eq 形 nospace) の 2 件を正当に併存させる (DR-104 §3 pin、fixtures/complete/eq-split-cont.json)。行応答 (DR-117 §4/§5) に落とす段の畳み方が未規定で、現実装は 2 行 emit → shell に同一 flag が 2 回出る。require/deny 指定では片方しか生成されず問題は起きない。正本: docs/issue/2026-07-23-completion-query-duplicate-candidates.md

**他ライブラリ慣習調査の結果** (2026-07-23、出典付き詳細は裁定後 findings 化):
- **space 形が業界優勢**: clap_complete / argcomplete / click / fish / yargs は space 形既定
- **eq 形の積極既定は cobra のみ** (候補末尾 `=` + NoSpace directive の generator 規約)
- **定義者へ挿入形を露出する直接の先例は zsh `_arguments` の spec 記法** (`--opt=` 両受理 / `--opt=-` eq 強制) のみ
- 背景: bash が `COMP_WORDBREAKS` で `=` を単語分割するため eq 形は bash で壊れやすく、多くのライブラリが space 形へ倒れている

**選択肢** (割れているため、kawaz 提案どおり指定オプション案を追加):

- **(a′) 推し: 既定 = space 形 (WordEnd 側) に統合して 1 行 emit + 定義者向けの挿入形指定を設ける**
  - 既定を業界優勢 (space 形) に合わせ、bash の `=` 分割問題も回避。eq 形を出したいアプリ (cobra 系 UX 好み) は指定で切替
  - 指定の座席は completion_script preset のパラメータ (例 `insert_form: "space" | "eq"`) を想定 — 詳細設計は裁定後
- (b) 既定 = eq 形 (Continue/nospace 側) に統合 + 指定オプション (調査前の旧推し a 相当。cobra 少数派に既定を合わせる形になり bash 互換の弱さも負う)
- (c) 統合せず 2 行 emit 維持、glue で吸収 (shell 間 drift の温床、DR-117 §5 の思想に反する)
- (d) 指定オプション無しで space 形固定 (最小。将来 eq 派アプリの需要が出たら再設計)

**回答形式**: 「COMPQ-Q1=a′」等。裁定後: DR-117 §5 に merge 規則 + 指定を追記 → kuu.mbt 修正 → fixture 増分は指定オプションの lowering 分のみ。
