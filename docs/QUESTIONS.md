# 裁定待ち一覧 (kawaz 確認用)

> 運用規約 (ゼロコンテキスト読者向け、新セッションはまずここを読む):
> - ユーザ裁定が必要な確認事項は、チャット提示と**同一ターン**で本ファイルに記録 + path 指定 commit する
> - **書式: 1 Q = 1 セクション** (`## 👺XX-Q1: <質問要旨>`)。**選択肢は箇条書きリスト** (1 行に詰め込まない)。推しには根拠 1 文。詳細の正本は findings / issue / DR 側に置き参照で示す (複製しない)
> - ラベルはバッチ毎に一意な短プレフィクス (XX-Q1 形式、Qn 単独の使い回し禁止)
> - **👺 は「いま裁定が必要」の項目とチャットの裁定依頼 (「👺XX-Q1 の裁定お願いします」) だけに付ける**。裁定済み・過去参照に付けない (ユーザは 👺 正規表現でハイライト/アラームしており誤陽性が有害)
> - 裁定が下りたら該当セクションを**即削除**し、内容は正規の記録先 (DR / issue / journal) へ反映。本ファイルは常に「現在待ち」だけを持つ
> - 「説明して」と返されたらチャットで長文説明せず、当該 Q をファイル内で説明付きに書き直して再提示
> - 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記

## 👺EXK-Q1: 結果スコープ内で同じ露出キーを名乗る「同名の別要素」をどう扱うか

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

## 👺EXK-Q2: scope 生成要素 (command) を露出キー衝突の検出対象に含めるか

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

### 選択肢

- (a) **検出を広げる** — binding の scope セグメント由来の claim を登録する (~30-40 行)。ただし `apply_export_keys` のセグメント解決 (`Null` の畳み込みによるパス算術、`#k` インデックスの素通し) を完全にミラーしないと path がズレる。`promote_collision_ambiguous_from` の drop 判定も拡張が要る
- (b) **spec 側で commands を衝突対象から除外する** — 除外を書くだけでは終わらず、同じキーに bool と scope object が来たときの **result マージ規則**を新規規定する必要がある。結果キーの静的型が入力依存で `bool | object` になり DESIGN §2.6 の型導出が破綻する。DESIGN §2.4 とも正面から矛盾する
- **統括推し: (a)**。worker も同意見で (b) は不採用推奨。既存 fixture への影響はゼロ、**壊れるのは kuu-cli 自身の定義のみ** (global `--help` option と `help` command が両方キー `help`。ambiguous になるのは `kuu help --help` / `kuu --help help` の 2 形だけで、定義側に `export_key` を 1 行足せば解消。副産物として kuu-cli の走査回避コードが不要になる)

## 👺EXK-Q3: help_query の `path` 導出規則を spec に書くか、どこまで書くか

### 背景説明

`help_query(definition, {path?, depth?, category_mode?})` の `path` を**何から決めるかが spec に無い**。内部セル → capability 入力の写像表 (DR-113 §2 / DESIGN §14.1 / §15.15) には `category_mode` / `depth` / renderer policy はあるが `path` の行が無い。

kawaz 整理 (2026-07-25): 「パース後の help 機構の発火フラグという点ではセルは 1 つだけど、**どのヘルプか?を区別するのは別問題**」。`#help` は「発火した」フラグとして 1 実体・link 合流で正しく、`path` は**パースが選択した最深の command scope**から決まる (`kuu --help sub --help` は深い方 = sub、`git --help commit` と同じ)。規則自体に悩みは無い。

問題は**書かれていない**ことで、実際 kuu-cli は導出を再発明し、result のキーを見る実装にして同名キー (`help` option と `help` command) の取り違えで root へ落ちた (修正済み: kuu-cli commit b07b7406)。

### 選択肢

- (a) **写像表に 1 行足すだけ** — 「`path` = パースが選択した最深の command scope」。導出手段はアプリの自由
- (b) **導出手段まで書く** — 加えて「result のキーを辿るのではなく ParserContext の selected 情報から取る」を推奨として明記。**result 経由は露出キー衝突に巻き込まれる**が ParserContext 経由なら結果キーの綴りと independent なので、kuu-cli が踏んだ事故を構造的に防げる
- **統括推し: (b)** — EXK-Q1/Q2 をどう裁いても、result のキーは「表示のための射影」であって scope 判定の一次情報ではない。一次情報を指す規定にしておけば、衝突裁定の結果に依存しない
