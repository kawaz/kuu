# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。**本質だけを簡潔に**書く — 背景の詳細は findings / issue / DR 側に置き参照で示す (kawaz 指摘 2026-07-25「Q 内では本質だけをもう少し簡潔に。不足を感じた時にはより詳細説明を求める」)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺SRCADDR-Q1: sources のキーで結果アドレスをどう符号化するか

`sources` のキーは scope-path を `.` で連結した flat map (`{"sub.ttl": "cli"}`、CONFORMANCE §2)。
しかし `export_key` は任意 string で `.` の禁止も escaping も無い (`schema/wire.schema.json:87`) ため、
**`.` 連結が非単射**で、区別すべき 2 つの結果アドレスが同じ sources キーに潰れる。

実機で再現 (2026-07-26):

```json
定義: {"options":[{"name":"dotted","type":"flag","long":true,"export_key":"a.b"}],
       "commands":[{"type":"command","name":"a","options":[{"name":"b","type":"flag","long":true}]}]}
args: --dotted a --b

result:  {"a.b": true, "a": {"b": true}}   ← 2 セルを正しく区別している
sources: {"a.b": "cli"}                     ← 1 エントリしか無く、片方の由来が表現できない
```

この定義は DR-120 上**合法** (別 result scope なので露出キー衝突ではない)。
result が表現できる状態を sources が表現できないので、DR-109 §3 の「消費者が値の出所を機械判別できる」が破れる。

### 選択肢

- **(a) 露出キーに区切り文字を禁止する** — `export_key` / `name` に `.` を使えなくする。
  最も簡単だが、既存の名前空間を狭める破壊的制約。ドット入りキーを出したい正当な用途 (設定ファイルの
  キー名をそのまま出す等) を潰す
- **(b) escaping 付きの segment join を規定する** — `.` を `\.` にエスケープする等。
  符号化の規則を spec に書く必要があり、消費者側にも復号を要求する
- **(c) 既知の encoding を採用する** — JSON Pointer (`/a/b`、`~1` エスケープ) 等。
  車輪の再発明を避けられ、ライブラリが既にある。ただし記法が現行の `sub.ttl` から大きく変わる
- **(d) sources のキーを structured path にする** — flat map をやめ、
  `[{"path": ["a"], "key": "b", "source": "cli"}]` のような配列にする。
  符号化問題が消滅する (実装内部の `SourceEntry` と同じ形)。fixture の書き味と wire の冗長さは増す

### AI の推し: (d)

符号化を決めるのでなく**符号化を不要にする**のが筋。(a) は名前空間を狭める、(b)/(c) は消費者に
復号を要求し、復号を忘れた実装が静かに壊れる (テストでは通る)。(d) は実装内部の表現をそのまま
出すだけで、曖昧性が構造的に発生しない。

v1 前なので wire の破壊的変更は選択肢の材料にならない。

### (d) を採る場合の移行コスト (実測、2026-07-26)

| | 件数 |
|---|---|
| `expect.sources` を持つ fixture | 53 files / 126 cases |
| sources entry 総数 | 173 |
| うち non-root (現 key に `.` を含む) | 15 entries / 7 files |
| 機械変換できないケース | **0** |

non-root を持つ 7 files: `inheritable-parse/{shadow,ancestor-spelling,basic}.json` /
`constraints-parse/requires-bool-target-config-inherit.json` /
`export-key/sources-under-command.json` / `value-sources/{inherit-ladder,inheritable-ladder}.json`。
現 key に literal dot は 0 件、`/` `~` `#` 等の特殊文字も 0 件なので、
`"sub.ttl":"inherit"` → `{"path":["sub"],"key":"ttl","source":"inherit"}` の機械変換で全件通る
(ただし変換器は今回限りの migration 用として使い捨て、`split(".")` を恒久コードに残さない —
残すと本 Q の欠陥を再生産する)。

runner の比較方式 (集合比較) は継続可能。ただし比較用の canonical form でも
`path.join(".")` を使ってはならない (テスト比較層が同じ欠陥を見逃す)。
canonical JSON 1 行 (`{"path":["a"],"key":"b","source":"cli"}`) を sort する形にする。
あわせて `(path, key)` の重複を runner が検出して fail させる必要がある
(単純な tuple 集合比較だと、同一アドレスに異なる source が 2 件ある不正形を通してしまう)。

**関連**: `docs/CONFORMANCE.md` §2 success の sources 規定 / DR-052 (結果キー軸) /
DR-109 §3 (sources 常時出力) / `docs/issue/2026-07-26-array-element-provenance-sources-addressing.md`
(配列要素の provenance — この Q が (d) に決まると addressing の自由度が変わる)
