# Dogfooding D2-D4: 自己 definition 駆動化で出た欠陥 6 件と conformance の直積ギャップ

> 由来: dogfooding 計画 (findings `2026-07-24-kuu-cli-dogfooding-plan.md`) の D2-D4 実測。
> D1 の表現力発見は `2026-07-24-dogfooding-d1-expressiveness.md`、kuu-cli 側の生記録は
> kuu-cli リポ `docs/journal/2026-07-25-self-definition-dispatch.md`。
> 本文の commit id は各リポの**現行 (可視) commit**。jj の書き換えで id が動いた分は
> 現行側で書いてある (kuu-cli journal / QUESTIONS.md には旧 id が残っている箇所がある)。

## 判明した事実 (総括)

kuu-cli の argv 解析を **kuu 自身の definition + 玄関 API 駆動**へ全面書き直した
(kuu-cli `4855773f`、main.mbt 878 → 625 行、566 挿入 / 809 削除)。この過程で
参照実装 / spec / テスト資産にまたがる**欠陥 6 件**が出た。いずれも
「kuu で本物の CLI を 1 本書いて、その CLI に自分自身を食わせる」まで出なかったもの。

| ID | 層 | 欠陥 | 状態 |
|---|---|---|---|
| G1 | kuu.mbt | option 上の `seq` が 2 個目のトークンを消費しない (D1 の F9) | 修正済 (kuu.mbt `061598ba`) |
| G2 | kuu.mbt | dd 後の raw 域で祖先 command トリガが再発火する | 修正済 (kuu.mbt `20df9ad3`) + 断面 fixture (spec `b22bedf5`) |
| G3 | spec | bash glue が DR-117 §3.4 の COMP_WORDBREAKS 再結合を未実装 | 実装済 (spec `9d290b07`)、既知の限界を明記 (`7268f01d`)、忠実解は issue |
| G4 | kuu-cli (検査資産) | 日本語検査が C locale で機能せず `\|\| true` に飲まれて空文字 | 修正済 (kuu-cli `72049c54`) |
| G5 | kuu-cli | `help --help` / `completion --help` が root help へ落ちる | 修正済 (kuu-cli `baf41ae3`) |
| G6 | kuu.mbt + spec | 露出キー衝突が option × command / 同名兄弟で検出されない | 方針裁定済 (EXK-Q1=definition-error / EXK-Q2=検出拡張 + DR-073 §2 改訂)、射程は 👺EXK-Q4 |

そのうち **3 件が同じ形をしている** — G2 / G6 と、D1 の F2/F8 (`on_failure` 未実装)。
**fixture は「単体の語彙」を pin するが、「複数の語彙が同時に効く断面 = 語彙の直積」を
pin していない**。conformance corpus は語彙の**網羅性**を担保するが**直積**は担保しない、
という構造的な穴が本サイクルの主眼 (§3)。

## 1. サイクルの成果

### 1.1 書き直し

- 手書き argv 走査 (878 行) を全廃し、`SELF_DEFINITION_JSON` (368 行の
  `cli/kuu-cli.def.json` をビルド時に MoonBit string literal へ埋め込み) を
  `parse_definition` → `parse` → `resolve` → `output` に通して、得られた result の形で
  dispatch する構造にした
- main.mbt の行数推移: 878 (書き直し前) → **625** (`4855773f`) → 760 (D3 の bool hint と
  文言検査、`11baf1e9`) → 817 (G5 の scope 導出、`baf41ae3`)。**削ったのは手書き parser で、
  戻ってきたのは検査と診断**
- 敵対的レビュー台帳の H2-H9 + H14 を解消 (対応表は計画 §3 と kuu-cli journal
  「H 群をどう解消したか」)
- **価値実証点は H4**: `<subcmd> --help` は def.json の help option に `"global": true` を
  書いただけで全 scope に発生した (手書き分岐ゼロ)。逆に H8 (引数なし = help) は
  宣言席不要でアプリ裁量 (DOG-Q4γ=a、D1 の F5)

### 1.2 検証資産の拡張

| 層 | 前 | 後 |
|---|---|---|
| プロセス境界 (exit / stdout / stderr を個別ファイルへ採取) | 無し (command substitution で stdout のみ) | `proc_case` 8 本 + stdin 1 本 = 9 ケース (`63e66a11`) |
| 公開 help の文言検査 (DR 参照 0 件 + 純 ASCII + scope 一致) | root のみ | **8 scope** (`c3722e8f`) |
| 補完 smoke | 6 ケース | **19 ケース** (`9a9efc07` / `a61da5d6`) |
| 補完 smoke の内訳 (追加分) | — | 出荷 def.json の self-dogfood 3 shell syntax-check + 候補 3 種 (top-level / nested subcommand / enum values) + COMP_WORDBREAKS 再結合 2 → 7 形 |

`a61da5d6` の再結合 5 形追加 (連続 break char / 先頭 break char / 末尾空 word / `http://x` /
`name=value`) は spec の再結合規則から期待値を導出して書いたもので、**5 形とも実装と一致**
(未検証範囲だったがオフバイワンは無し)。テストを足すときは canary で red を確認してから
commit している (期待 exit を 2→0、cword を 3→2 等、5 本)。

### 1.3 最終状態

| リポ | commit | CI |
|---|---|---|
| spec (kuu) | `b2242077` (main bookmark) | CI workflow 無し (`release.yml` のみ) |
| kuu.mbt | `f7e9f3d9` | success |
| kuu-cli | `732ba965` | success |

CI は `gh run list` の実測 (2026-07-25)。同じ実測に G4 の証跡も残っている:
`9a9efc07` = **failure** → `72049c54` = success。

## 2. 欠陥 6 件

### G1 (修正済): option 上の `seq` が 2 個目のトークンを消費しない

D1 の F9。`--config-file PATH JSON` を `seq: [path, value]` で宣言したのに、実 parse で
2 個目が positional へ流れていた。long 入口が用意する値スロットが 1 トークン (Cell) に
潰れていたのが原因で、**greedy 側 (空白区切り) と eq 側 (`--opt=v1 v2`) の両経路で
子要素ごとの Scoped ノードを植える**修正 (kuu.mbt `061598ba`、DOG-Q5 裁定 = bug)。
short × seq は別の設計 issue へ。

「2 引数 option」は corpus 頻出の形だが、**自分で使うまで誰も宣言しなかった**。

### G2 (修正済): dd 後の raw 域で祖先 command トリガが再発火する

`kuu parse <def.json> -- parse <def2.json>` のように、`--` の後ろ (raw 域) の先頭に
サブコマンドと同綴りのトークンが来ると自己 parse が Ambiguous に落ちた。kuu-cli の
def.json は `parse` / `complete` / `validate` / `help` / `completion` を持つので、
**素直な argv で即踏む**。

原因は継続 (continuation) の伝播: 子 scope 内の dd 発火が、捕捉済み親 continuation の
`severed` を伝播せず、子 scope が閉じた瞬間に親の greedy 面が復活していた。
`sever_cont` を新設して dd 発火時に残り全 spine を severed へ畳む修正 (kuu.mbt
`20df9ad3`)。spec 側は断面 fixture `fixtures/dd/command-trigger-raw.json`
(case `same-command-spelling-after-dd-stays-raw`) で pin (`b22bedf5`)。

切り分けの教訓は kuu-cli journal 側にある: 「自分の def.json の書き方が悪い」で粘らず、
engine 直の最小再現 (scope 2 段 + dd + raw 域先頭に command 同綴り) を作って
参照実装を疑う方が早い。

### G3 (実装済): bash glue が DR-117 §3.4 の COMP_WORDBREAKS 再結合を未実装

台帳 H9 は「bash glue の TODO 平文焼き付き」= テンプレの文字列修正、と見積もられていたが、
実体は 2 点で違った。

1. **正本は kuu.mbt ではなく spec の `templates/completion.bash`**。修正は
   spec → kuu.mbt 追従 (`52953de9`) → kuu-cli pin bump の 3 リポ縦断
2. **焼き付いていた TODO 自体が spec 非準拠を指していた**。DR-117 §3.4 末尾は
   「shell 間差の正規化 (bash の `COMP_WORDBREAKS` が `--flag=value` を
   `[--flag, =, value]` へ割る等) は glue 側で吸収してから渡す」と規定しているのに、
   glue は素の `COMP_WORDS` を binary へ転送していた

修正 (spec `9d290b07`) は glue 内の inline 再結合ループ: `COMP_WORDBREAKS` から空白系を
除いた集合を分割 char とし、単独の分割 char を直前 word へ連結、cword も再結合後の index へ
変換。bash 5.3.9 / 3.2.57 × 5 ケース = 10 判定を実機で全通過。
**COMP_WORDS ベース再結合は空白情報を落とす**という原理的限界は
`templates/TRANSLATION.md` に既知の限界として明記し (`7268f01d`)、忠実解
(COMP_LINE / COMP_POINT 再字句解析) は issue
`bash-completion-comp-line-point-relex` へ (`8aba4afb`)。

### G4 (修正済): 日本語検査が C locale で機能しない

「公開 help に日本語を漏らさない」検査が macOS で green、Linux CI で red。
`japanese_count=$(grep -Ec '[ぁ-んァ-ヶ一-龠]' <<<"$help_out" || true)` の
マルチバイト文字範囲が C locale の grep で `Invalid range end` になり、その失敗が
`|| true` に飲まれて**空文字**を返していた。`assert_eq "$japanese_count" "0"` が
`got= want=0` で fail する。

`LC_ALL=C grep -c '[^ -~<TAB>]'` の非 ASCII バイト判定へ置換 (`72049c54`)。BSD/GNU で
同じ挙動になり、かつ「公開 help は純 ASCII」というより強い不変条件になる。

**教訓は検査資産の設計側**: `|| true` は失敗を握り潰して空文字を通すので、その値を数値
比較に使うと「**検査が壊れている**」と「検査が通っている」の区別が付かない。
locale 依存の文字クラスは CI と手元で挙動が割れる典型。

### G5 (修正済): `help --help` / `completion --help` が root help へ落ちる

8 scope の help 検査を足す過程で発見。落ちるのは **required 引数を持たない中間 scope**
の 2 つだけで、required を持つ scope は failure 経路に落ち `failure_path` が errors の
path から scope を復元するので正しく動いていた。

原因は kuu-cli の dispatch が **result の同名キーを取り違えていた**こと。
`ResultValue::Object` は `Array[(String, ResultValue)]` なので、help *option* の bool と
help *command* の kv が `[("help", Bool(true)), ("help", Object{...})]` と並存でき、
先頭一致で bool を拾っていた。修正は「型で絞る `help_requested()`」と「result を再帰的に
辿る `selected_command_path()`」の新設 (`baf41ae3`)。

**この取り違えが起きる前提そのもの (= 同じ result キーに option と command が並存できる)
が G6**。当初「kuu.mbt / spec は健全」と報告されたが誤りで、裏取りで根底の欠陥が出た。
spec 側には別の穴も見えた: `help_query` の `path` を**何から決めるかが spec に無い**
(DR-113 §2 / DESIGN §14.1 の写像表に `path` の行が無い) ため、kuu-cli は導出を再発明して
事故った → 👺EXK-Q3。

### G6 (方針裁定済、射程は裁定待ち): 露出キー衝突が検出されない — 独立した 2 つのギャップ

DESIGN §15.5 / DR-073 は「同じ露出キーへ解決する 2 要素が同一入力で両方露出したら
ambiguous」と規定し、`fixtures/export-key/collision.json::co-exposure-collision` が
**option × option** でこれを pin している。しかし:

- **ギャップ A**: claimants の同一性が raw entity name の**文字列**なので、同名の別要素が
  1 claimant に潰れて衝突判定 (`length() > 1`) を満たさない (option `x` + positional `x`)
- **ギャップ B**: command の結果キー占有が検出の入力空間に**存在しない**。検出器のグループ
  キーは `(scope, exposed_key)` なので option `x` は `(scope=[], key="x")`、command `x` は
  `(scope=["x"], key="{}")` で別グループになる

決定的なのは、これが実装の拾い漏らしではなく **spec の担体モデルに席が無い**こと:
DR-073 §2 は claimants の値を「実体 entity の name」とするが、DR-063 §3 は
「command は親 entities に実体を持たない」。**command は entity ではないので claimants の
値になれない** (= ギャップ B は実装の拾い漏らしではなく担体モデルの欠席)。

裁定 (2026-07-25):

- **EXK-Q1 = definition-error** — 同一結果スコープで同名の別セルを露出する定義は静的に弾く。
  正当な用途は既存語彙で書ける (同一セルへの複数入口 = `link`、複数タイプの相乗り = `or`
  — この場合の露出キーは or 席なので「露出キー 1 つに値セル 1 つ」は崩れない)
- **EXK-Q2 = (a) 検出を広げる + DR-073 §2 改訂** — runtime の衝突検出に command の
  結果キー占有を登録し、担体を「実体 entity」から「結果キーを占有する要素」へ広げる
- **射程は 👺EXK-Q4 で確認中** — 「同名」を素の name に限るか、`export_key` 経由で同じキーに
  解決する場合まで含めるか。後者まで含めると既存 fixture `export-key/collision.json` の
  期待値と DESIGN §15.5/§15.6 / DR-021 の改訂が要る

正本は `docs/QUESTIONS.md`、issue は
`docs/issue/2026-07-25-expose-key-collision-option-command-silent-loss.md`。

なお **この欠陥が直ると kuu-cli.def.json は自分で違反する** — global `--help` option と
`help` command が同じ素の name `help` を名乗っているため (EXK-Q1 の裁定どおりなら
definition-error、Q1 以前の runtime 検出だけなら ambiguous)。修正と同じ窓で def.json 側の
是正 (help option へ `export_key` を与えて内部識別子側を動かす。CLI の公開語彙
`kuu help` / `--help` は据え置ける) が要る。

## 3. 構造的教訓 — conformance は語彙の網羅を担保するが、語彙の直積は担保しない

G2 / G6 / D1 の F2・F8 は同じ形をしている。fixture corpus (320 件) は語彙を 1 つずつ
pin する設計になっていて、**複数の語彙が同時に効く断面を pin していない**。
機械走査で裏取りした 3 つの穴:

| 直積 | corpus の実態 (2026-07-25 実測) | 顕在化した形 |
|---|---|---|
| 汎用 `on_failure` × 実利用 | `schema/wire.schema.json` に語彙はあるが (`on_failure` 属性)、**320 件中 0 件**が pin。糖衣の `help_on_failure` は 1 件 | D1 の F2/F8 — schema に載った語彙の**未実装**が dogfooding まで露見しなかった |
| dd × 同綴り command | `fixtures/dd/` は dd 単体の面 (basic / global-sever / fail-action-sever / required-fire / …) を pin していたが、「dd 後の raw 域トークンが自 scope の command と同綴り」の断面は無かった | G2 |
| 露出キー × command | 同一 scope で command と option/positional が同じ露出キーを名乗る定義は **320 件中 0 件** (`export_key` 明示 (null/"" の透過は除外) または name で判定する走査) | G6 |

**人間はこれらの定義を思いつかない**。「dd の後に自分の command 名と同じトークンを置く」
「global option と同名の command を置く」は、書こうと思って書く形ではない。
だが kuu-cli の def.json は `parse` 等の command を持ち `--` で raw を取るので G2 を
素直な argv で踏み、global `--help` と `help` command を両方持つので G6 を踏んだ。
**生成器なら引き当てる断面**であり、実アプリを 1 本書くことでも引き当てられた。

対比として、D1 の F7 (`$schema`) は語彙追加と**同じ窓で** pin fixture
(`fixtures/lowering/baseline/with-schema-annotation.json`) を伴っている。D1 findings の
「schema へ語彙を足す変更は同じ窓で、その語彙を直接 pin する fixture を必ず伴わせる」は
効いている。**それでも直積は塞がらない** — 語彙 1 つの網羅と、語彙の組合せは別問題。

しかも直積側は expect を書きにくい。G6 の断面は「通る expect が書けない = 到達しては
いけない状態」で、fixture に書こうとすると重複キー result を JSON object リテラルで
表現する必要が出て充足不能になる (issue 本文の調査結果)。**直積の検査は「期待値を書く」
形では作れず、「不変則を書く」形にする必要がある** — これが次の 2 節の設計軸。

## 4. 対策として入れたもの — installer 順列の property test

kuu.mbt `f7e9f3d9`。直積のうち **installer 適用順の軸**を機械化した。

- **契約**: DR-042「5 つの不変則 (合成契約)」= installer の合成は順序非依存・冪等。
  PoC 期は 7 installer = 5040 順列を全数検査できたが、canonical chain は
  **installer 14 本** (kuu.mbt `src/kuu/registry.mbt` の `install_canonical`、実測) =
  14! ≈ 871 億順列で全数検査は不可能
- **残したもの**: 決定的 3 順列 (identity / reverse / rotate-1) を env 非依存の回帰網として
  維持 (DR-070「常時 = 決定的少数」)
- **足したもの**: xorshift32 + Fisher-Yates の**決定的 PRNG** によるランダム順列
  サンプリング。seed / サンプル数は `KUU_PERM_SEED` / `KUU_PERM_SAMPLES` で振れ、既定は
  固定 seed + 4 サンプル。fixture ごとの乱数列は `base seed ⊕ FNV-1a(相対パス)` で独立させ、
  **反例は fixture 名 / seed / サンプル番号 / 順列署名 / 順列の結果 vs identity 順の結果を
  全部出す** (再現できない property test には価値がない)
- **対象の拡張**: lower fixture 26 件のうち完全鎖を踏むのは 1 件だけ (残りは installer
  1〜3 個の subset) で 14! 空間をほとんど掘れない。そこで**鎖を canonical に固定して
  definition 側を corpus 全体 320 件へ広げる**別 property を追加した。判定基準は
  「同じ definition・同じ鎖なら順序によらず同じ結果」の 1 点で、fixture の `want` とは
  比較しない (完全鎖の lowered 結果は subset 鎖の期待値と一致しないため)。
  definition-error fixture も対象に含む (Reject された error 集合の順序非依存も同じ契約)

**§3 末尾の設計軸をそのまま実装している**: expect を書かず不変則だけを見るので、
corpus 全件へ一律に適用できる。

実行結果は 8 seed で反例ゼロ、故障注入で「検査した結果の green」であることも確認済み
(property test 担当 worker の報告、2026-07-25)。**本 findings の執筆時には再実行して
いない** — 当該 workspace は別エージェントが編集中のため (one-ws-one-writer)。

## 5. 次の一手 — definition 側の fuzzing

順列 property test が塞いだのは **installer 順序**の軸だけで、**定義の形**の直積は
手つかず。次は定義生成器を置く:

- **生成**: 語彙をランダムに組み合わせた definition を合成する
- **検査 (oracle は不変則側に置く)**: 順列不変 (§4 と同じ)、不動点収束、Reject/Error の
  一貫性 (定義時検査が通った定義は必ず lowering が構成できる、等)
- **引き当てたい典型**: DR-042 の「検証マトリクス」節が**「未実施」と明記**している
  `alias × inheritable` の合成。人間が書かない組で、かつ spec 側が自白している空白
- **同時に射程に入る収束の盲点**: kuu.mbt issue
  `fixpoint-convergence-tree-size-blind-spot` — 不動点収束の判定が tree_size のみを見る
  ため、**サイズ不変の in-place 書き換え**を検出できない。定義 fuzzing はこの種の
  「収束したことになっているが収束していない」を踏みにいける

## 6. 調査手法の教訓 (G5 の切り分けで得られたもの)

G5 の原因確定までに 2 回、**観測の側が嘘をついた**。いずれも実話として残す。

### 6.1 生成物を含むビルドで「直したのに直らない」→ 実装よりビルド入力の鮮度を疑う

`cli/src/main/def_embedded.mbt` は `just generate-self-definition` の生成物で、
**`moon build` はこれを再生成しない**。`just e2e` / `just smoke` / `just test` は前段に
generate を挟むので気付かないが、`moon build` を直接叩くと古い埋め込み定義のままリンク
される。self-hosted dispatch は**定義そのものが挙動**なので、stale な埋め込みは
そのまま挙動の差になる。

### 6.2 観測のために差し込んだデバッグ出力が、観測対象を変えた

`handle_self_failure` の冒頭に `fired_action` / `errors.length()` を読む eprintln を
入れたところ、**`kuu parse --help` が exit 2 / stdout 空**になった (eprintln 無しでは
exit 0 で正しい help)。しかも DBG は全ケースで `fired_action=<none>` を報告した。
この観測に基づいて「self 経路では failure になっている」と誤報告し、切り分けを誤らせた。

### 6.3 効いた切り分け — 実装に触らず、分岐ごとに副作用が違う入力を選ぶ

最終的に効いたのは、外形 (exit / stdout / stderr) だけを見る形:

```
kuu help /nonexistent.json --help  → exit 0 / root help      (definition を読みに行かない)
kuu help /nonexistent.json         → exit 1 / cannot read ... (run_help に入り読みに行く)
kuu help --show-hidden             → exit 0 / help scope の help
kuu help --help                    → exit 0 / root help
```

`run_help` に入れば definition を読んで exit 1、入らなければ exit 0 で root help、と
**経路が exit code に現れる**入力を選んだ。`--help` を足した瞬間に `run_help` へ入らなく
なることが確定し、dispatch 冒頭の分岐に原因が絞れた。

**外形で分岐が判別できる入力を探す方が速く、かつ嘘をつかない。**

なお G4 も同型の教訓を含む: `|| true` で握り潰された検査は「壊れている」と「通っている」を
区別できない。**検査が検査になっていることを別途確かめる**必要がある (§1.2 の canary red
確認、§4 の故障注入と同じ思想)。

## 7. 還流先 (台帳)

| 先 | 項目 |
|---|---|
| spec `docs/QUESTIONS.md` | EXK-Q1 / EXK-Q2 (裁定済、G6 参照) / 👺EXK-Q3 (`help_query` の `path` 導出規則) / 👺EXK-Q4 (EXK-Q1 裁定の射程) |
| spec `docs/issue/` | `expose-key-collision-option-command-silent-loss` (G6) / `bash-completion-comp-line-point-relex` (G3 の忠実解) / `raw-tail-capture-after-positional` (D1 F1) / `closed-enum-open-form-completion-gap` (D1 F4) / `fixture-envelope-shared-runner` (D1 F6) |
| kuu.mbt `docs/issue/` | `fixpoint-convergence-tree-size-blind-spot` / `collision-drop-filter-identity-exposure-production-gap` / `sources-projection-skips-export-key-under-commands` / `static-lint-warn-and-diagnose-unimplemented` |
| kuu-cli `docs/issue/` | `duplicate-key-json-serialize-silent-drop` (重複キー result の JSON 直列化規則が未定義) |

## 関連

- findings `2026-07-24-kuu-cli-dogfooding-plan.md` (計画 / H 群対応表 / 検証戦略)
- findings `2026-07-24-dogfooding-d1-expressiveness.md` (D1 の表現力発見 F1-F9)
- findings `2026-07-24-fresh-eyes-adversarial-review.md` (H 群の出所)
- DR-042 (installer 合成契約 — §4) / DR-070 (常時 = 決定的少数)
- DR-041 §4 / DR-090 (dd の継続と背骨 — G2)
- DR-117 §3.4 (glue の shell 間差正規化 — G3)
- DR-073 / DR-063 §3 / DESIGN §15.5 (露出キー衝突の担体モデル — G6)
- DR-113 §2 / DESIGN §14.1 (help_query の写像表 — 👺EXK-Q3)
