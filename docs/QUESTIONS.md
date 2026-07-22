# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> **本ファイルは常に「現在待ちの質問」だけを持つ** (経緯・履歴は git log と各記録先が担う、裁定済みを本ファイルに残さない)。
> 要裁定項目のヘッダーには必ず 👺 マーカーを付ける (kawaz が視認で探すため)。
> チャットでは「👺 XX-Q1 の裁定お願いします」形式でラベル参照する。回答はラベル + 選択肢記号 (例「Q13=a」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

## 👺GEN-Q3x: completion_script preset の形 (説明付き再提示)

**裁定済み**: Q4x=a (cword は KUU_COMPLETE_INDEX 別 env) / Q5x=a / Q6x=a (正本 = spec 新 ABI DR)。残り本 Q のみ。

### 背景説明 (何の話か)

補完スクリプトの「生成側の入口」を、help と同じ type preset として定義に書けるようにする話。定義例:

```json
{"options": [
  {"name": "completions", "long": true, "type": "completion_script"}
]}
```

こう書いたアプリは `prog --completions zsh` で zsh 用補完スクリプトを stdout に出力する。入口をサブコマンドにしたい人は positional/command で、env にしたい人は env で書ける (入口の形は定義者の自由 = 先の裁定どおり)。

### 論点 = この preset の細部 3 点をどう決めるか (推し a は 3 点セット)

**(1) 値の形 = shell 名必須の string preset (bool 枝なし)**:
`--completions` 単独 (値なし) を許さず、必ず `--completions zsh` のように shell 名を要求する。
- 理由: 値なしの時に出すべき「既定シェル」が存在しない (help の bool 枝は「既定の help を出す」という自明な既定があるが、補完スクリプトに既定シェルはない)
- 対案: bool 枝も許して値なしは「対応 shell 一覧を表示」等 — 発明が増えるので不採用推し

**(2) shell 名の値域を spec で閉じない**:
`zsh` / `bash` / `fish` を enum として spec に固定せず、未知の shell 名も受理される (生成器実装が対応していなければ「非対応」と応答)。
- 理由: 対応 shell は生成器 (product) の能力であって spec の関心でない。nushell / powershell 等を実装が足す時に spec 改訂が要らない
- 対案: enum で閉じる — shell 追加のたびに spec 改訂 + 全実装 lockstep になるので不採用推し

**(3) on_failure 既定 false**:
help preset は「パース失敗時に help を出す」(help_on_failure 既定 true) が、completion_script は失敗時に補完スクリプトを出しても意味がないので既定 false。
- これはほぼ自明 (true にする理由が無い)

**回答形式**: `GEN-Q3x=a` (3 点セット採用) / 個別変更指定 (例「(2) は enum で閉じる」)。
