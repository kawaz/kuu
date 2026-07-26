# 裁定・確認待ち一覧 (ユーザ用)

> 運用規約 (ゼロコンテキスト読者向け、正本は claude-rules-personal の
> `questions-md-registry` rule):
> - 裁定待ち = ユーザの判断が要る項目。確認待ち = 実装済みで実機確認を待つ項目
> - ラベルはバッチ / セッション毎に一意な短プレフィクス (XX-Q1 / XX-C1 形式、
>   Qn 単独の使い回し禁止、長期一意性は不要)
> - 👺 は「いま待っている項目」とチャットの依頼文にだけ付ける
>   (裁定済み・過去参照に付けない。ユーザは正規表現でハイライト/アラームしており
>   誤陽性が有害)
> - チャット提示と同一ターンで本ファイルに記録 + path 指定 commit
> - 裁定が下りたら該当セクションを即削除し、内容は正規の記録先 (DR / issue /
>   journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 確認待ちの削除条件: ユーザが確認 OK を返した / 後続リリースで当該実装が
>   上書きされ確認対象でなくなった
> - 参照パスはリポ内相対 (リポ外はフルパス)

## 裁定待ち

### 👺SRCADDR-Q2: structural aggregate (nameless child を畳んだ値) は sources に席を持つか

`name` を持つ `seq` / `or` の子が nameless のとき、値は wrapper キーの下に現れるが、
**その結果アドレスに対応する値セルは存在しない** — 構造 node が nameless child の値を
畳んだ composite である。現 engine では child に entity が無いので `effects` も空。

実測 (2026-07-26)。いずれも `sources` は空:

```json
seq / nameless child 1 個:  result={"pair":["x"]}        effects=[]  sources={}
seq / nameless child 2 個:  result={"pair":["x","y"]}    effects=[]  sources={}
or  / nameless scalar 枝:   result={"TONE":"warm"}       effects=[]  sources={}

対照 (子が name を持つ = 値セルが在る):
result={"pair":{"a":"x","b":"y"}}   sources={"pair.a":"cli","pair.b":"cli"}
```

corpus にこの断面の `expect.sources` は 0 件なので、実装がたまたまこう振る舞っているだけで
規範として決まっていない。**cell provenance の既存則からは導出できない** (値セルが無いため) ので、
席を与えるなら structural aggregate の provenance を新規に定義することになる。

#### Q2-α: 単一 nameless value (or の選択枝 / seq の 1 child)

- **(a) wrapper address に entry 1 件を作る** — 値が 1 つなので潰れる情報が無い。
  実装は wrapper の activation とその席を運ぶ必要がある
- **(b) 席を持たない** — 値セルが無いものに provenance は与えない

**推し: (a)**。DR-109 §3 の「消費者が値の出所を機械判別できる」が目的である以上、
`result.TONE` に値があって由来が引けないのは目的に反する。潰れる情報が無いので
cell provenance の自然な拡張として無理がない。

#### Q2-β: 複数 nameless value (seq の N children / or が選んだ anonymous seq)

- **(a) wrapper に entry 1 件** — 複数 child の provenance を 1 タグに潰す
- **(b) 席を持たない**
- **(c) 要素ごとに entry** — 配列要素の addressing が要る
  (`array-element-provenance-sources-addressing` issue の裁定が前提)

**推し: (c)**。異なる席から来た child の共存は **spec 上到達可能**と確定した (下記) ので、
(a) は潰れる情報が実在するケースで誤報になる。

#### 異 source 共存の到達可能性 (調査結果、2026-07-26)

**spec 上は到達可能。** 最小形は nameless `seq` の子に「CLI 消費 leaf」と
「消費 0 の literal」を並べる構成:

```json
{"options":[{"name":"pair","long":true,"seq":[
  {"type":"string"},
  {"type":"string","value":"fallback"}]}]}
args: --pair x
→ 意図される最終値 pair=["x","fallback"]、要素 provenance は [cli, default]
```

根拠:
- DESIGN §5.1 が seq を「子の値の配列」と規定
- DESIGN §5.2 が `value:` / `default:` を「**消費しない literal**」と明記
  (`{"type":"number","value":30}` は消費 0 の実体だけノード)
- `schema/wire.schema.json` の `node` が「root も or/seq の子も command 部分木も**同型**」と明記
- DR-031 が CLI と `default` / `value` を**別席**として固定

**ただし現行実装は decode できない**: `kuu.mbt` の `wire_decode.mbt` の `dec_or_leaf` が
structural child を `type` / `name` / `value_name` のみに制限しており、
`or branch leaf has unsupported key 'value'` で弾く。schema と DR-067 (child 内の
multiple / repeat を合法とし構造属性の直交を明記) の双方に照らして、**これは実装追随 gap**
であって spec の到達可能性を否定する根拠ではない。

(実装で現在通る env separator split は wrapper 全体が 1 席 —
`PAIR=x:y` → `result={"pair":["x","y"]}, sources={"pair":"env"}` — なので child 異 source
ではない。)

→ **β は (c) で確定してよい。** 同時に `array-element-provenance-sources-addressing` issue の
調査順 1 (「source が異なる要素が共存する到達可能例を探す」) も**到達可能で決着**するので、
両者を統合して 1 つの裁定にできる。実装追随 (decoder の制限解除) は別 issue。

**α と β を分ける理由**: 単一値は潰れる情報が無いので cell provenance の拡張で閉じるが、
複数値は配列要素 provenance と同じ構造問題になる。一括で裁定すると β の誤報リスクを
α の合理性で押し通すことになる。

#### 現在の実装挙動 (裁定の参考、2026-07-26 時点)

`name` を持つ `seq` / `or` の accumulator は、**発火後に wrapper が entry を持たない**:

```
0 fire: sources={"pair":"default"}                      ← accumulator cell として default 席
1 fire: sources={"pair.path":"cli","pair.value":"cli"}  ← child だけ、wrapper は無し
2 fire: 同上
```

0-fire のときだけ wrapper に `default` が出るのは、`result` に `[]` が現れる
(DR-044 uniform array) 席として報告しているため。発火後は child が実体を持つので
wrapper は構造だけになり、entry を持たない。

この非対称 (0-fire だけ wrapper に出る) が意図した形かも α/β の裁定に含まれる。
「structural aggregate は席を持たない」で統一するなら 0-fire も wrapper に出さず
`result` の `[]` に対応する entry が無い状態になるが、それは「値があるのに由来が無い」
の別形になる。

**関連**: DESIGN §5.1 / §2.5 (nameless の扱い) / DR-052 §2 (nameless 同化の透過) /
DR-109 §3 (sources 常時出力の目的) /
`docs/issue/2026-07-26-array-element-provenance-sources-addressing.md`

### 👺SRCADDR-Q1: sources のキーで結果アドレスをどう符号化するか

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

#### 選択肢

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

#### AI の推し: (d)

符号化を決めるのでなく**符号化を不要にする**のが筋。(a) は名前空間を狭める、(b)/(c) は消費者に
復号を要求し、復号を忘れた実装が静かに壊れる (テストでは通る)。(d) は実装内部の表現をそのまま
出すだけで、曖昧性が構造的に発生しない。

v1 前なので wire の破壊的変更は選択肢の材料にならない。

#### (d) を採る場合の移行コスト (実測、2026-07-26)

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
