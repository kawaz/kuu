# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺EXK-Q4: EXK-Q1 裁定 (definition-error) の射程 — DR-073 の runtime ambiguous をどこまで置き換えるか

### 裁定済みの前提 (kawaz 2026-07-25)

> EXK-Q1 = (a)。同スコープ同名 export で別入口は **link** で勝手にやれば良い。link なしで別セルを同スコープ同名露出は**定義エラー**。別タイプを同スコープ同名露出に相乗りは **or** でできる。この場合露出キーに対応するセルは **or 席**でありそこに複数タイプが相乗りするのは問題ないし、露出キーに対する値セル 1 つも崩れない。

正当な用途 (同一セルへの複数入口 = link / 複数タイプの相乗り = or) は既存語彙で表現でき、残る「link なしの別セル同名露出」に正当な用途は無い、という筋。これは受け入れる。

### 確認したいこと: 「同名」の射程

この規則を **export_key 経由で別名が同じキーに解決する場合**にも適用するかで、改訂範囲が大きく変わる。既存 fixture `fixtures/export-key/collision.json` が該当する:

```json
{"options": [{"name":"a","type":"flag","long":true,"export_key":"x"},
             {"name":"b","type":"flag","long":true,"export_key":"x","env":"B"}]}
```
- case `co-exposure-collision` (`--a --b`) → **ambiguous** を pin
- case `single-exposure-ok` (`--a` のみ) → **success** を pin

別名・別セル・link なし・or でもないので、裁定の文言をそのまま当てると **definition-error** になり、`single-exposure-ok` も「定義自体が違法」で success でなくなる。

### 選択肢

- (a) **狭い読み: 素の name が同じ場合だけ definition-error** — 今回発見した `option x` + `positional x` / `option x` + `command x` が対象。export_key 経由で衝突する場合は従来どおり DR-073 の runtime ambiguous。`collision.json` は無傷。DESIGN §15.5 / §15.6 / DR-021 も無傷
- (b) **広い読み: 露出キーが同じ別セルは全部 definition-error** — export_key 経由も含む。DR-073 の claimants 機構は「or / link で書かなかった定義を許さない」方針に置き換わり存在意義が縮む。`collision.json` の期待値変更 + DESIGN §15.5 / §15.6 / DR-021 の改訂が要る
- **統括推し: (a)** — 同スコープでも**排他的にしか発火しない** 2 要素 (`exclusive_group` で縛った等) は実際には共露出しないので、静的に弾くと表現力を削る。DR-021 の「定義時に潰さず、解決できる限り許す」はこの層のための規定と読める。一方 (a) が対象とする「素の同名」は、link でも or でもなく**名前の偶然の一致**で暗黙合流する形なので、正当な用途が本当に無い

### EXK-Q2=(a) 裁定との整合 (実質 (a) で決まっている可能性)

EXK-Q2 = (a) が裁定済み (= runtime の衝突検出を command にも広げ、DR-073 §2 の担体を拡張する) である以上、本 Q で (b) を採ると **Q2 で広げた runtime 機構が使われる場面が消える** (すべて静的に弾かれるため)。したがって Q2=(a) は **Q4=(a) 狭い読みと組でしか整合しない**。異論が無ければ (a) 確定として進める。

### (a) を採る場合に決めたいこと

「素の name が同じ」の判定は **export_key 適用前**の name で行う、という理解でよいか (= `{name:"x"}` と `{name:"x", export_key:"y"}` は別キーに露出するので衝突ではない、逆に `{name:"a", export_key:"x"}` と `{name:"b", export_key:"x"}` は同名ではないので (a) の対象外)。

## EXK-Q1 (裁定済み: definition-error): 結果スコープ内で同じ露出キーを名乗る「同名の別要素」をどう扱うか

### 背景説明

dogfooding D4 で、露出キー衝突の検出に**独立した 2 つのギャップ**が判明した (正本: `docs/issue/2026-07-25-expose-key-collision-option-command-silent-loss.md`、調査は kuu.mbt `src/kuu/resolve.mbt` 実物確認済み)。

**ギャップ A (本 Q の主題)**: claimants の同一性が **raw entity name の文字列**なので、同名の別要素が 1 claimant に潰れて衝突判定 (`length() > 1`) を満たさない。実測:

```
定義: option x (flag) + positional x
args: --x foo
実測: success {"x": "foo"}   ← flag の true が in-memory ごと消える (ambiguous にもならない)
```

これは「1 実体 × 複数入口 (link/alias、DR-029)」と「同名の別実体 2 つ」を binding 面で区別する手段が無いことに起因する。`@abi.Binding` の `key` は結果セルの葉名であって要素の同一性ではない。DR-073 §2 の「実体 entity の name が解釈間で一意な識別子」は **name がスコープ内で一意である前提**に立つが、その一意性はどこでも強制されていない (`kuu validate` も `ok:true`)。

**ギャップ B (EXK-Q2 の主題)** は scope 生成要素の話で独立。統括の再現ケース (option `x` + command `x`) は両方に該当するため、片方だけ直しても直らない。

### 選択肢

- (a) **definition-error にする** — 1 つの結果スコープ内で同じ露出キーを名乗る同名兄弟を静的に弾く。検出器が見る claimant は常に相異なる名前になり DR-073 §2 の前提が回復する。既存 fixture への影響ゼロ (cross-group 同名の fixture は 0 件、機械走査で確認)
- (b) **lint warn + 実行時 ambiguous** — DR-021 の「warn はする、reject はしない」哲学に沿う。ただし claimants が同名のままなので、2 解釈が CONFORMANCE §3 の (view, claimants) 集合比較で 1 つに縮退する問題が残る (DR-073 が解こうとした退化の再発)
- (c) **claimants の値を修飾する** (`"option:x"` / `"command:x"`、または `id` 軸 (DR-046) を必須の一意識別子に昇格) — (b) の縮退を回避できるが wire / CONFORMANCE / 全実装 / 全 fixture に波及
- **統括推し: (a)** — 名前の偶然の一致による**暗黙の link 合流**は DR-029 (link = 明示 opt-in の値同期) が認めていない挙動で、現状は「書いた覚えのない link」が起きている。DR-021 の「reject しない」は「一部入力で驚くだけの構造」が対象で、本件は**値が消える**ので DR-054 の「lowering が構成できない = Error」側に寄せて良いと考える。ただし DR-021 との擦れは明文化が要る

## EXK-Q2 (裁定済み: (a) 検出を広げる + DR-073 §2 改訂): scope 生成要素 (command) を露出キー衝突の検出対象に含めるか

### 背景説明

**ギャップ B**: command の結果キー占有が検出の入力空間に存在しない。binding 面で command は `scope` パスのセグメントとして表現され (`{key:"{}", scope:[label]}`)、検出器のグループキーは `(scope, exposed_key_of(key))` なので:

| 要素 | 検出器が見るグループ |
|---|---|
| option `x` (root) | `(scope=[], key="x")` |
| command `x` (root) | `(scope=["x"], key="{}")` |

別グループになり、command が root スコープのキー `x` を占有している事実がどこにも登録されない。`export_key` を command に付けた場合も同様 (result 側では rename されるのに検出器は生の名前すら見ていない)。

spec 側の根拠 (worker が全文書走査で確認、commands を除外する規定は**存在しない**):

- DESIGN §2.4 「その層にある name 持ちノードを**全て**結果キーにする」— root の options と commands は同じ層
- DESIGN §2.6 / DR-052 §3 「結果キーを持つスコープ生成要素 (**command 含む**) は、選ばれたら子が全部 absent でも空 kv `{}` を持つ」= 選択 = 値の発生 = 露出
- DESIGN §15.5 / DR-073 §1 は「**相異なる 2 要素**が同一入力で共露出」としか書かず要素種別を限定していない

### 決定的な前提: DR-073 の担体モデルに command の席が構造的に無い

2 つの規定が正面からぶつかっている (逐語確認済み):

- **DR-073 §2**: claimants の値は「**実体 entity の name**」。「実体 entity の name が解釈間で一意な識別子になる」
- **DR-063 §3**: 「**command は親 entities に実体を持たない**」(スコープ名はトリガ衛星の exact 綴りとして配置で表現される。結果オブジェクトの `{serve: {}}` presence は実行時 result builder の関心)

⇒ **command は entity ではないので claimants の値になれない**。ギャップ B は「実装の拾い漏らし」ではなく **spec の担体モデルに最初から席が無い**。したがって (a) は実装修正だけでは spec 準拠にならず、**DR-073 §2 の「実体 entity」を「結果キーを占有する要素」へ広げる改訂が必須**。

### 選択肢

- (a) **検出を広げる + DR-073 §2 を改訂** — binding の scope セグメント由来の claim を登録 (実装 ~30-40 行、ただし `apply_export_keys` のセグメント解決 (`Null` 畳み込みのパス算術、`#k` 素通し) を完全にミラーしないと path がズレる)。加えて上記 DR 改訂
- (b) **spec 側で commands を衝突対象から除外する** — **改訂が 3 箇所に増える**。重複キー result を合法化する方向なので: ① DR-063 §4 (「JSON object は unordered」= キー一意前提) ② CONFORMANCE §3 に重複キーの比較規約を新設 (fixture の JSON object リテラルでは**書けない形**をどう expect するかの発明が要る) ③ DR-109 §2 (envelope は fixture expect と厳密一致) の緩和。加えて結果キーの静的型が入力依存で `bool | object` になり DESIGN §2.6 の型導出が破綻、DESIGN §2.4 とも矛盾
- **統括推し: (a)**。worker も同意見で (b) は不採用推奨。(a)/(c) なら ambiguous に落ちて**重複キー result 自体が生成されない**ので上記 3 箇所は無傷。既存 fixture への影響はゼロ、**壊れるのは kuu-cli 自身の定義のみ** (global `--help` option と `help` command が両方キー `help`。ambiguous になるのは `kuu help --help` / `kuu --help help` の 2 形だけで、定義側に `export_key` を 1 行足せば解消。副産物として kuu-cli の走査回避コードが不要になる)

### EXK-Q1 との結合 (裁定時に一緒に見てほしい点)

Q1(c) (claimants の値を修飾 / `id` 軸を一意識別子に昇格) を採るなら、**Q2(a) の担体拡張は同じ改訂に乗る** — DR-073 §2 の改訂 1 本で両方が片付く。Q1(a)+Q2(a) だと改訂は「definition-error 規定」と「担体拡張」の 2 本になる。Q1(c) は wire / 全実装 / 全 fixture 波及でコストが高いので、**改訂本数 vs 波及範囲**のトレードオフとして裁定してほしい。

### 補足: 重複キー result の spec 上の位置づけ (調査結果)

`ResultValue::Object` が同名キーを 2 エントリ持てるのは **実装都合であって spec 規定ではない**。spec は result を「キーが一意な JSON object」としてモデル化している (DR-063 §4「JSON object は unordered」/ CONFORMANCE §3 の key ベース対応付け / DESIGN §2.4「結果キー」は集合の語彙)。そして重複キー result を JSON へ落とす規則も**無い** — DR-109 §2 が要求する「fixture expect と厳密同形」は、fixture が JSON object リテラルである以上**充足不能**。つまりこの断面は「fixture が未整備」ではなく「**通る expect が書けない = 到達してはいけない状態**」。なお kuu.mbt の conformance runner (`render_rval_sorted`) は dedup せずソートするので、fixture を書けば必ず mismatch する (盲目ではないが緑にする書き方が無い)。

## 👺EXK-Q3: help_query の `path` 導出規則を spec に書くか、どこまで書くか

### 背景説明

`help_query(definition, {path?, depth?, category_mode?})` の `path` を**何から決めるかが spec に無い**。内部セル → capability 入力の写像表 (DR-113 §2 / DESIGN §14.1 / §15.15) には `category_mode` / `depth` / renderer policy はあるが `path` の行が無い。

kawaz 整理 (2026-07-25): 「パース後の help 機構の発火フラグという点ではセルは 1 つだけど、**どのヘルプか?を区別するのは別問題**」。`#help` は「発火した」フラグとして 1 実体・link 合流で正しく、`path` は**パースが選択した最深の command scope**から決まる (`kuu --help sub --help` は深い方 = sub、`git --help commit` と同じ)。規則自体に悩みは無い。

問題は**書かれていない**ことで、実際 kuu-cli は導出を再発明し、result のキーを見る実装にして同名キー (`help` option と `help` command) の取り違えで root へ落ちた (修正済み: kuu-cli commit b07b7406)。

### 選択肢

- (a) **写像表に 1 行足すだけ** — 「`path` = パースが選択した最深の command scope」。導出手段はアプリの自由
- (b) **導出手段まで書く** — 加えて「result のキーを辿るのではなく ParserContext の selected 情報から取る」を推奨として明記。**result 経由は露出キー衝突に巻き込まれる**が ParserContext 経由なら結果キーの綴りと independent なので、kuu-cli が踏んだ事故を構造的に防げる
- **統括推し: (b)** — EXK-Q1/Q2 をどう裁いても、result のキーは「表示のための射影」であって scope 判定の一次情報ではない。一次情報を指す規定にしておけば、衝突裁定の結果に依存しない。**spec 側の裏付け**: DR-063 §3 が「結果オブジェクトの `{serve: {}}` presence は実行時 result builder の関心」と述べており、「result のキーは scope 判定の一次情報ではない」は元々の spec の立場。(b) はそれを明文化するだけで新しい制約を課さない
- **未確認事項** (裁定前に確認が要る): ParserContext の `selected` に相当する構造が spec 上どこまで確定しているか。DESIGN §0.3 は「absent 要素のメタ (committed / selected / source) は ParserContext から引ける」とだけ書き、`selected` の型・粒度・scope path の表現形は追えていない。(b) を採るならここの規定有無の確認が必要
