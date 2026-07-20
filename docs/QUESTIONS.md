# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺 API-Q2b: 補完 API の省略名展開 (説明付き再提示)

**裁定済み分**: API-Q2(a) = `RVal` → `ResultValue` (実施中)、(c) = `Sat` → `Satisfied` 展開 (実施中)。本 Q は (b) のみ。

### 背景説明 (何の話か)

kuu.mbt の**補完 (completion) API** の公開型の名前の話。シェル補完 (tab 補完) の候補を返す仕組みで、kuu.mbt の `complete()` (front door) が候補の配列を返す。その候補 1 個を表す型が現在 **`Cand`** という省略名になっている:

```
pub fn complete(AtomicAST, Array[String], ...) -> Array[@engine.Cand]

pub(all) struct Cand {          // ← 候補 1 個。Candidate の略
  spelling : String              //    補完候補の綴り (例 "--verbose")
  is_value : Bool
  term : TermHint                // ← 候補の後に word 境界が来るかのヒント
  meta : CandMeta                // ← is_alias / hidden / deprecated の表示メタ
  ...
}

pub(all) enum TermHint {
  WordEnd                        // 候補確定で単語が終わる (スペースを足してよい)
  Cont                           // ← Continue の略。候補の続きがある (例 "--log-" の先)
}
```

### 論点

この 3 つの省略名を展開するか:
- `Cand` → `Candidate`
- `CandMeta` → `CandidateMeta`
- `TermHint::Cont` → `Continue`

- **展開する (統括推し)**: 補完 API は拡張実装者・多言語移植者が読む公開契約の顔。`Cand` は文脈があれば読めるが、mbti 単体では何の略か判別根拠がない。省略で節約できる文字数に価値がない
- **現状維持**: 使用頻度が高い型なので短い方がコードが読みやすい、という立場もある

**回答形式**: `API-Q2b=展開` / `API-Q2b=維持` / 個別指定 (例「Cand は維持、Cont だけ展開」)。
