# Dogfooding D1: kuu-cli 自己定義で見えた表現力の発見 9 件

> 由来: dogfooding 計画 (findings `2026-07-24-kuu-cli-dogfooding-plan.md`) の D1 実測。
> kuu-cli 自身の定義 `impl/mbt/cli/kuu-cli.def.json` と self harness
> `impl/mbt/tests/self/definition.sh` (いずれも kuu-cli リポ、main 未 push) を
> 書く過程で判明したもの。

## 判明した事実 (総括)

kuu-cli 自身の定義を wire 形で 1 本書き切る dogfooding は、初日 (D1) で
発見 9 件を出した — spec の実地テスト装置として機能している。内訳:

| 分類 | 発見 | 一言 |
|---|---|---|
| 裁定候補 (spec 拡張・裁定が要る) | F1 / F5 / F7 | 頻出 CLI パターンの宣言席が無い、または規定の衝突 |
| 要調査 (spec の規定確認が先) | F9 | option 上の `seq` 値構造の消費意味論 (本文で一次判定済み: 実装 bug 濃厚) |
| 教訓・確認 (spec 変更不要) | F2/F8 / F3 / F4 / F6 | 検出漏れの根因、既定路線の検証、資産ギャップ |

## 裁定候補

### F1 (不足): 「最初の positional 以降を全部 raw で取る」境界を宣言できない

- **欲しい形**: `docker run IMAGE CMD ARGS...` / `kubectl exec POD -- CMD...` 型 —
  定義済み positional (IMAGE 等) を充足した**後の**最初のトークンから先を丸ごと
  raw で子コマンドに渡す。kuu-cli 自身も `parse DEF_JSON ARGS...` で
  ARGS を raw で取りたい (現状は明示 `--` を要求している —
  definition.sh の全 parse_case が `--` を挟んでいるのはこのため)。
- **現状**: pattern dd (DR-090) のトリガは「トークンの形」(regex) だけで発火し、
  **背骨上の進行位置 (どの positional まで充足したか) を条件にできない**。
  xargs 型 pattern `^[^\-]` を書くと最初の非ハイフン operand = DEF_JSON 自体で
  発火してしまい、「DEF_JSON の次から」が表現できない。明示 `--` (exact dd) なら可。
- **裁定素材の輪郭**: (a) pattern dd に発火位置条件 (「この positional 席の充足後」)
  を足す拡張、(b) positional 席側の新属性 (DR-090 が採用しなかった
  `severs_trailing` 系の再検討)、(c) 現状維持 (明示 `--` を canonical とする)。
  DR-090 §3 は「pattern の設計で競合自体を避ける」方針なので、(a) は同 DR の
  設計思想 (位置条件を持たない) との整合を裁く必要がある。推し: (a) 系 —
  docker/kubectl 型は corpus 頻出で、`--` 強制は実用互換を欠く。

### F5 (不足): 「引数なし = help 表示 + exit 0」を宣言できない

- **欲しい形**: 引数・サブコマンドなしで実行したら help を表示して success 終了
  (cli-design-preferences の頻出要件。トップ・子・孫の全レベルで共通)。
- **現状**: 引数なしは `{"help": false}` の plain success になる
  (definition.sh の `no-arguments` case が現状挙動として固定している)。
  `help_on_failure` (DESIGN §15.10 / DR-113 §7.2) は failure 時の話であり、
  「引数なし成功時に help」の宣言席が無い。
- **裁定素材の輪郭**: (a) node 属性 `help_on_empty` 系 (引数ゼロ消費で完全経路が
  成立した時に #help を立てる)、(b) required サブコマンド + on_failure help の
  組み合わせで表現 (ただし exit 0 でなく failure になり要件と違う)、
  (c) アプリ責務 (result を見て自分で help を呼ぶ)。推し: (a) —
  「引数なし = help」は宣言的 CLI 定義の看板要件で、アプリ側分岐に逃がすと
  help 機構 (DR-113) を宣言層に持った意味が薄れる。

#### 再設計素材 (DOG-Q4 再提示、kawaz 示唆 2026-07-24)

kawaz 示唆: **「パース失敗 = help トリガー (help_on_failure) と同様に、引数なしも help に倒せる糖衣。
個別サブコマンドで指定しても、config でスコープ全体に効かせても良い」**。
つまり DR-113 §7.2 の `help_on_failure` (help_installer の 5 preset が既定 true で on_failure へ展開する糖衣)
と**対称**な形の「引数ゼロ発火糖衣」を設計する。以下、DOG-Q4 の再提示素材 (QUESTIONS 転記可能な粒度、
命名・所有・発火機構・スコープ昇格・既定値の 5 論点):

##### 素材 5-1: 命名 (省略形回避)

- 候補 A: `help_on_empty` — help_on_failure との対称性が最強、意味が読める
- 候補 B: `help_on_no_input` — no_input の 3 語がやや冗長だが「引数ゼロ」を明示できる
- 候補 C: `help_on_bare_invocation` — bare (裸呼び) は英語 CLI corpus で使われる語だが日本人には遠い
- 推し: A `help_on_empty` — 対称命名 (help_on_failure ↔ help_on_empty) が定義者の直観に最も乗る、
  「省略形は使わない」規約 (feedback-no-abbreviations) にも触れない (empty は完全形)

##### 素材 5-2: 所有 installer

- 候補 A: help_installer が所有 — help_on_failure と同じ屋根、DR-113 §7.2 の 5 preset の展開先を
  「on_failure」から「on_failure と on_empty の 2 経路」に拡張
- 候補 B: 独立の on_empty installer を立てる — 汎用に「引数ゼロで発火」する能力を語彙化し、
  help_on_empty はその上の糖衣とする (on_failure と on_failure 汎用属性の関係と同型)
- 推し: A — 現状 on_failure も汎用属性 (DR-113 §7.2) と help 糖衣の 2 層構成、
  同じパターンを踏襲すると DR 追記が最小、on_empty 汎用属性は現時点では users が居ない (YAGNI)

##### 素材 5-3: 「引数ゼロ」の正確な定義 (発火判定の意味論、本丸)

「引数なし」を宣言的 CLI として厳密に定義する必要がある — サブコマンド scope で
「引数ゼロ」とは何か:

- 候補 A: **完全経路 0 消費で成立した時** に発火 — 背骨が何も消費せず完全経路 (DR-041) を
  成立させたケース。global option だけ与えられた場合 (例: `cli --verbose`) は verbose を消費
  しているため「引数ゼロではない」= 発火しない
- 候補 B: **positional/subcommand 席が 0 消費で成立した時** に発火 — global option は
  消費に数えず、positional / subcommand 席が空 (背骨進行ゼロ) を条件とする。
  `cli --verbose` は help 発火する
- 候補 C: **候補経路が完全経路 0 本かつ dead end が起点位置 (0 消費) の時** に発火 —
  on_failure (DR-048) と同じ判定機構に乗せる、ただし「起点 dead end」= 引数ゼロと再定義
- 推し: **B** — 頻出要件 (「引数なしで help 出す」) の直観は positional/subcommand 席の
  空を指す。global option だけ与えた `cli --verbose` は「verbose の副作用は起きたが、
  やる仕事の指定が無い」状態 = help を見たい場面。ただし B は「positional/subcommand 席」を
  scope 内でどう識別するかの明文化が要る (options installer が生やす greedy 面 vs
  positionals/commands 面の区別 — DR-063 §3)

##### 素材 5-4: config 昇格 (スコープ全体)

DR-096 の config 軸 (installer の config パラメータ) との整合:

- 候補 A: help_installer の config キーとして昇格 (例: `help_installer.config.on_empty_default: true`) —
  スコープ chain 上で継承 (DR-014)、子 command は書けば上書き
- 候補 B: node 属性でのみ指定可能、config 昇格しない — 「引数なし = help」は入口 (root / 個別
  command) ごとに宣言する属性であり、chain 継承の意味が薄い
- 推し: A — cli-design-preferences で示された「トップ・子・孫の全レベルで共通」要件に応える
  最短経路が config 継承。書かない command には親の default が効く形が UX に合う

##### 素材 5-5: 既定値

- 候補 A: 既定 `true` (help_on_failure と同じ) — 引数なしで help が出るのが CLI の常識、
  定義者が「引数なしを別扱いしたい」時だけ false に落とす
- 候補 B: 既定 `false` — 「引数なし成功で help 表示」は non-trivial な UX 選択なので明示宣言を要求
- 推し: **B** — kawaz の cli-design-preferences は「頻出要件」と書いているが、これは
  「書きたい時にちゃんと書ける」ことが要件であり「暗黙に効く」ことではない。help_on_failure が
  既定 true なのは「失敗時にヒントを見せる」が保守的な選択 (害が小さい)、一方 `help_on_empty` 既定 true は
  「daemon 型 CLI (`myd` で常駐起動)」「REPL 起動型」等の場面で予期せぬ help 表示になり得る
  (= 「引数なし = 主機能起動」を意図した CLI が事故る)。明示宣言を要求する方が安全

##### 素材 5-6: on_failure 機構との共通化可否

kawaz 示唆の「help_on_failure と同様に」を機構レベルで実装する時:

- 候補 A: **共通化する** — 汎用 on_failure 属性 (DR-113 §7.2) の判定に「引数ゼロ成功」も 1 条件として
  足し、help_on_empty はその糖衣とする。実装は on_failure の failure-set に「empty-invocation」を
  仮想 failure として加える (完全経路 0 消費成功を failure と再定義するのは意味論的に無理筋)
- 候補 B: **別機構** — 「引数なしは failure ではない」ため、on_failure とは別の発火経路を立てる。
  help_installer は on_failure_expansion と on_empty_expansion の 2 経路の展開責務を持つ
- 推し: **B** — 意味論的に「成功 (完全経路成立) だが引数ゼロ」と「失敗 (完全経路 0 本)」は別現象。
  同じ判定機構に混ぜると result 生成 (DR-048 の on_failure 発火は result.status に影響) の意味論が
  混濁する。別機構にして「empty 発火時は success 経路のまま #help を立てて exit 0」を明確化する

##### 未解決 (裁定でなく調査/設計を要する)

- 素材 5-3 の推し B (positional/subcommand 席の空を条件とする) は「5 面構造 (DR-063 §3) の
  どの面の何を数えるか」の実装細部が要る — parse_definition 側で lowering 後にどう判定するか、
  fixture 化までに 1 段の解析が必要
- 素材 5-4 の config 昇格の canonical キー名 (`on_empty_default` / `help_on_empty_default` 等) は
  素材 5-1 の命名裁定後に決める


### F7 (整合バグ → **裁定済み DOG-Q3=a**): README が勧める `$schema` 行を parse_definition が拒否する

> **裁定 (DOG-Q3=a, 2026-07-24)**: (a) `$schema` を宣言層の inert 属性として語彙に正式追加。
> spec 反映: wire.schema.json の node.properties に `$schema` (string, inert annotation) を追加、
> DR-068 §4 に「語彙層の例外 (top-level `$schema` は inert 受理、要素レベルは unknown-vocab)」を追記、
> baseline lowering fixture `with-schema-annotation.json` で top-level 受理側を pin。
> 位置制限 (top-level only) の強制は parse_definition の実装課題として kuu.mbt 側で追従が必要
> (要素レベル拒否側 fixture の起票は将来 definition-error 領分)。
> 実運用の URI 発行: v1 公開後、gh-pages にバージョンディレクトリ付き schema 置き場
> (`https://kawaz.github.io/kuu/schema/v1/wire.schema.json` 形) を設ける (kawaz 示唆 2026-07-24)。


- **現象**: def.json 先頭の `"$schema": "https://.../wire.schema.json"` を
  parse_definition が未知キーとして拒否。definition.sh は
  `jq 'del(."$schema")'` で削ってから食わせるワークアラウンド中。
- **spec 上の位置づけ**: wire.schema.json の description は「additionalProperties を
  閉じない (未知語彙は parse_definition の unknown-vocab が担う)」— つまり
  未知キー拒否は語彙層 (DR-054/061/067) の仕様どおりの挙動であり、実装 bug ではない。
  衝突しているのは **README の推奨と語彙層の規定**。
- **裁定素材の輪郭**: (a) `$schema` を宣言層の inert 属性として語彙に正式追加
  (エディタ支援の実益があり、JSON Schema 生態系の慣習キー)、(b) `$` prefix キーを
  一括で無害無視する特例、(c) README 側を直す (`$schema` を書くなとする)。
  推し: (a) — (b) は特例の射程が広すぎ、(c) はエディタ補完という実益を捨てる。

## 要調査 → 一次判定済み

### F9: option 上の `seq: [path, value]` が実 parse で 2 個目のトークンを取らない

- **現象**: `config_file` option を `seq: [path, value]` の 2 子で宣言
  (kuu-cli.def.json の `config_file`、`--config-file PATH JSON` を意図)。
  definition-error は出ず lowering は収束するのに、実 parse では
  `--config-file p v` の `v` が config_file に入らず positional へ流れる —
  「二引数 option」の宣言席として seq が機能していない。
- **一次判定: 仕様上は複数トークン消費が正で、実装 bug 濃厚**。根拠:
  - `seq` = 「子を順に消費」し「子の値の配列」を返す (DESIGN §1.1/§1.3、DR-027)。
    option node も同型ノードであり `or`/`seq` は name 等と同居可能 (DESIGN §1.2)。
    wire schema も node の `seq` を無条件に許容し、definition-error なく通ることが
    「宣言として合法」の傍証。
  - DR-041 §3 は読みの消費数について「**value の有無から導出しない** (消費 0 の
    literal 産出も、消費 2 の外側借用もある)」と明記 — 消費数固定 1 の前提は無い。
  - よって「long 主入口 (`:set`、DR-071) が準備する値スロット = 常に 1 トークン」
    という実装側の仮定が、seq 値構造の「子を順に消費」を潰している構図。
- **残る規範の薄さ (bug 修正と別口で確認したい点)**: 「long 入口の値スロットが
  seq 値構造を持つとき、greedy の内部消費 (raw、背骨なし — DR-041 §4) として
  子の数ぶんトークンを順に確保する」ことを正面から書いた明文が見当たらない
  (DESIGN §7.1 は `:set` = 主入口 (値スロット) とだけ言う)。実装修正と同時に、
  DESIGN §15 系か DR-041 系への 1 段落の明文化を検討する価値がある。

## 教訓・確認

### F2/F8 (実装漏れ・対応中): 汎用 `on_failure` が schema 規定済みなのに kuu.mbt 未実装

修正 worker が走行中のため経過は略。findings として残す教訓は根因の方:
**fixture が `on_failure` を直接 pin していなかったため、schema に載った語彙の
未実装が dogfooding まで検出されなかった**。schema へ語彙を足す変更は、同じ
ロックステップ窓で「その語彙を直接 pin する fixture」を必ず伴わせるべき
(design-impl-bidirectional-check の B 方向を fixture が機械化する構図)。
definition.sh に残る `del(.on_failure)` の TODO ワークアラウンドが現状の痕跡。

### F3 (確認): `k=v` の分解はアプリ責務 — 既定路線どおり

`--env KEY=VALUE` は `piece_filters: [{regex_match, ["^[^=]+=.*$"]}]` で外形検証
まで、分解はアプリ側 (kuu-cli.def.json の `env` / `binding` で実証)。これは
発見でなく既定路線 (filter は検証・変換であり構造分解の席ではない) の検証結果。

### F4 (部分表現): closed enum + 開放形の混在は受理できるが補完に乗らない

`--category-mode` の値域 `default | all | named:<任意>` は
`regex_match ["^(default|all|named:.+)$"]` で**受理**は書けるが、`values` enum で
ないため補完候補の構造提示 (default / all / named: の 3 択) ができない —
「受理は書けるが補完に乗らない」ギャップ。or で `{values:[default,all]}` と
`{regex named:.+}` の枝を分ければ部分的に改善しうるが、option 値構造の or 枝が
補完候補にどう出るかは未検証。裁定候補ではなく、補完 (completion query) 側の
表現力課題として記録。

### F6 (資産ギャップ): fixture envelope を第三者が再利用する runner 資産が無い

self harness (definition.sh) は独自 shell に落ちた。spec リポの fixture envelope
形式を外部実装がそのまま食える共通 runner (または runner の書き方 runbook) が
あれば、dogfooding 実装ごとの harness 自作が不要になる。CONFORMANCE.md の
守備範囲拡張候補。

## 関連

- findings `2026-07-24-kuu-cli-dogfooding-plan.md` (D1 の計画側)
- DR-090 (pattern dd — F1)、DR-113 (help 機構 — F5)、DR-067/054 (語彙層 — F7)
- DR-027 / DR-041 / DR-071 / DR-097 (seq・読み意味論・long 入口 — F9)
