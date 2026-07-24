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

### F7 (整合バグ): README が勧める `$schema` 行を parse_definition が拒否する

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
