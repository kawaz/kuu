# DR-103: 必須選択グループ — `required_group` (exclusive_group と同型のグループ単位「少なくとも1つ必須」)

> 由来: corpus tar 実機観測 (2026-07-12、bsdtar 3.5.3) — `tar -vzf archive.tar.gz` (モード文字 `c`/`t`/`x` 等を一切指定しない呼び出し) が `Must specify one of -c,-r,-t,-u,-x` の必須違反エラーになることを確認したが、kuu の現行語彙 (`exclusive_group` は排他のみ規定、必須性は未規定) にこの制約を表現する手段が無かった (issue `2026-07-12-exclusive-group-at-least-one-required.md`)。DR-047 §7 / DR-055 §射程外が「`at_least_one` 等の追加語彙は必要になった時に検討する」と予告していた席の実現。kawaz スケッチ `{required:true, or:[{ref}...]}` の不成立を journal (`2026-07-13-post-dr100-fixes-and-alo-recon.md`) で実証した上で、kawaz が `required_group` 属性の新設を裁定 (2026-07-14)。「グループは『この中から一つ必須』の語彙を扱うやつが勝手にグループ作って判断すりゃいいだけ」— definition/scope 側への 1 級座席 (`groups`) は棄却。

## 決定

### 1. `required_group`: 要素側属性、`exclusive_group` と同型の `Array[String]`

```json
{"name": "create",  "type": "bool", "long": [":set:true"], "required_group": ["mode"], "exclusive_group": ["mode"]}
{"name": "extract",  "type": "bool", "long": [":set:true"], "required_group": ["mode"], "exclusive_group": ["mode"]}
```

グループ `g` について、`required_group` に `g` を含む member のうち **少なくとも 1 つが値充足 (型委譲、DR-093) を満たしていなければ** constraint 違反。「充足」の定義は `required` 単項判定 (DR-093: 値空間を持つ要素 = 最終状態の値の有無、default 込み。値空間なし = 発火 committed) をグループの論理和に持ち上げた形 — 判定対象は個々の member の型委譲充足であり、`exclusive_group`/`conflicts_with` のような「committed の指定述語」ではない。DR-047 §5 の判定入力テーブルにおいて **`required_group` は `required` と同じ「値述語」に分類される** (`exclusive_group` の「指定述語」枠とは別軸)。

member は **plain bool** (`type:"bool"` + `long:[":set:true"]`、DR-076 §2 の裸トリガ糖衣を明示合成した形) で書く — `type:"flag"` (暗黙 `default:false` を同梱、DR-076 §2) を member にすると §7 の通り常に値充足しグループ判定が vacuous になるため、tar のような「未発火なら不充足」を機能させる実例には plain bool が必要 (kawaz 裁定 2026-07-14、詳細は §7)。

### 2. violation reason と kind

`required_group_violated`、`kind=constraint` (CONFORMANCE §2 の `<属性名>_violated` 統一規約に従う、DR-066)。element はグループラベル (`exclusive_group` の error 帰属パターン — `fixtures/constraints-parse/exclusive.json` の `element=g` — と同型)。

### 3. 名前空間は独立: `required_group` と `exclusive_group` のグループ名は別集合

```json
{"name": "create",  "type": "bool", "long": [":set:true"], "exclusive_group": ["mode"], "required_group": ["mode"]}
{"name": "extract",  "type": "bool", "long": [":set:true"], "exclusive_group": ["mode"], "required_group": ["mode"]}
{"name": "list",     "type": "bool", "long": [":set:true"], "exclusive_group": ["mode"], "required_group": ["mode"]}
```

同名文字列 `"mode"` を両属性に書いても、`required_group` の group 集合と `exclusive_group` の group 集合は別々に評価される独立した遅延述語 — 同名にすることで意味的に「同じグループ」を指しているように見えるが、機構としては 2 つの独立述語が同じラベル文字列を共有しているだけ (`conflicts_with` と `exclusive_group` の重複宣言が独立評価される既存パターン、`fixtures/constraints-parse/exclusive.json::both-members-violate` と同型)。この独立 2 述語の組み合わせにより、**「ちょうど 1 つ」(exactly-one、tar のモード必須)** が「最大 1 つ (exclusive_group)」+「少なくとも 1 つ (required_group)」の合成として表現できる。同名共有は必須ではない — `required_group` のみを異なるグループ名で書けば「複数 member 同時発火可・ただし最低 1 つは必須」という exactly-one でない ALO も表現できる。

### 4. 縮退: 単独 member の `required_group` は `required: true` と等価

グループの member が 1 要素のみの場合、その要素の `required_group` はグループ判定が単項判定に縮退し `required: true` と観測上同じ結果になる (`exclusive_group` が単独 member では排他が起こりようがなく no-op になるのと対称の性質)。

### 5. scope 相互作用は exclusive_group の既存規定を同型適用

`required_group` は `exclusive_group`/`conflicts_with`/`requires` と同じ **constraint installer** の所有語彙とする (DR-055 §5 の canonical セット拡張)。constraint installer が各要素の group ラベルをスコープ横断で集約し、グループごとに 1 つの遅延述語を宣言する — 集約範囲・スコープ境界の扱いは `exclusive_group` (DESIGN §9.2/§15.9) と同一の規定を流用し、`required_group` 固有の追加規定は設けない。

### 6. `groups` のような 1 級座席は新設しない

kawaz 裁定により、definition/scope 側に「グループ全体の規則」を宣言する専用座席は作らない。DR-012 の核判断 (「制約は要素属性として書く、グループ全体のルールを別場所に書く設計はしない」) は本 DR でも維持される — `required_group` は exclusive_group と同じく**要素属性**であり、DR-012 が禁じた `groupRules` 型の別座席ではない。

### 7. member 充足は required 単項と同一の型委譲 (値の有無) — 構造的に保証された充足は vacuous 成立で合法 (RG-Q1、kawaz 裁定 2026-07-14)

`required_group` の member 充足判定は `required` 単項と完全に同一の型委譲 (DR-093: 値空間ありは値の有無・default 込み、値空間なしは発火 committed) であり、`requires` 目的語のような bool 型の特殊化 (DR-047 §5 明確化「解決後の値が true であること」) は適用しない。

**値充足が構造的に保証される member (`type:"flag"` の暗黙 `default:false`、`default` 宣言を持つ値要素、`tty` preset 等) は常に値充足を満たすため、その member を含む group は判定上つねに成立する (vacuous)。これはバグではなく `required` 単項の既定の帰結 (DR-047 §5「required + default は常に充足する」の group への持ち上げ) であり、宣言自体は合法。** 「制約への効果が無い属性を宣言している」ことの指摘は lint (静的 warn) の関心であり、`exclusive_group`/`conflicts_with` の重複宣言許容 (DESIGN §9.5) と同じ棚に置く — parse_definition が reject する definition-error ではない。

**非対称の理由 (kawaz 裁定)**: 「requires 目的語の bool-truth 判定」(A requires B で B が bool 型なら「解決後の値が true であること」を要求) と「required / required_group の値充足判定」(値の有無) は**別の述語**である。requires は「依存述語」(相手が真であることを要求する) であり、required/required_group は「値述語」(結果に値がある/グループの誰かが値を持つことを保証する) — 両者を同じ bool-truth 判定に揃えることは、値述語に真理値述語の意味を混ぜて**別の述語を作る**ことになり、`required` の意味論 (「アプリは値を必要とする」) から逸脱する。この非対称は意図的であり、bug でも見落としでもない。

## 波及

- **DR-012 の一部主張を訂正 (Superseded 節追記を提案)**: DR-012 §「グループ的必須 (最低1つ必須) は or + required」は、journal (`2026-07-13-post-dr100-fixes-and-alo-recon.md` の Failed Attempts) の実証により**値選択型の oneof (1 つのトリガ発火後にどの型で読むかの分岐) にしか成立しない**ことが判明した。`or` の枝は「共有トリガ後の値文法分岐専用」であり、各枝が独自のトリガ/ref を持てない構造上の制約により、tar のような「独立した複数トリガ (flag) のうち少なくとも 1 つが発火する」制約は表現できない。DR-012 の核判断 (「制約は要素属性として書く」) は不変、`{required:true, or:[...]}` が「グループ的必須の唯一の表現」という主張のみが誤りだった。**本 DR は DR-012 本体を編集しない**、Superseded 節追記は統括の判断に委ねる (提案文言は下記「提案する追記文」参照)。
- **DR-055 §4 も同じ訂正が必要**: 「oneof は既存合成で足りる」「専用語彙は持たない」という記述も同根の誤り。DR-055 §射程外の「`at_least_one` 等の追加語彙は必要時に DR-047 の枠組みで分類」という予告が、本 DR でまさに実現された形。
- **DR-047 は訂正不要、関連リンクの追加のみ**: DR-047 §7 射程外の予告 (「必要になった時に本 DR の枠組みで分類する」) は本 DR がその実現であり、DR-047 自体の記述に誤りはない。§5 判定入力テーブルへの `required_group` (値述語) 行の追加は DESIGN.md 側 (§9.6/§15.9 の転記表) で行う。
- **DESIGN.md**:
  - §9.1: 「グループ的必須は or + required」という記述を「独立トリガ群からの選択は §9.2.5 required_group を使う (or + required は値選択型の oneof のみに有効)」に訂正
  - §9.2 直後に §9.2 節 (`exclusive_group`) と §9.3 (`requires`) の間に新設し `required_group` を規定 (決定 §1-4 の要約)
  - §9.5「group_rules は作らない (DR-012)」: 「『どれか1つ必須』は or+required で足りる」という誤った断定を「値選択型は or+required、独立トリガ群は required_group (DR-103)」に訂正。「groups のような別座席は作らない」という核方針自体は不変なので節タイトルは維持
  - §9.6 の遅延述語表・§15.9 の遅延述語表 (2 箇所): `required_group` を追加、判定入力は「値述語 (グループ内 member のいずれかが required 相当充足)」
  - 行 990 「宣言的制約 (§9 の 4 種) はコアの遅延述語」→ 5 種に更新
- **REFERENCE.md**: 属性一覧表 (§2.1)・属性詳細節 (`exclusive_group`/`conflicts_with` と並ぶ形で新設)・§7.4 近辺の reason 一覧表 (`required_group_violated` 追加)・kind 一覧の遅延述語列挙 (4→5 種) を追随、`just lint-reference` で検証
- **schema/wire.schema.json**: `exclusive_group` と同型の `required_group` プロパティ定義を追加
- **fixtures/constraints-parse/**: `required_group` 系新設。既存 `exclusive.json`/`required-*.json`/`default-interaction.json` の輪郭に倣い、以下の軸を pin する: (a) 充足 (plain bool member の 1 つが発火で success)、(b) 違反 (0 member 発火で `required_group_violated`)、(c) default との相互作用 (member の 1 つが default を持つ場合、default による値充足で自動的にグループ充足 — `required` の「required + default は常に充足」DR-047 §6 と同型の帰結)、(d) `exclusive_group` 同名併用による exactly-one (tar 型の直接表現)、(e) 縮退 (単独 member)、(f) **flag member の vacuous 成立境界** (`type:"flag"` を member にすると 0 発火でも群が常に成立する — §7 の帰結を実測で pin する)

### 提案する追記文 (DR-012, DR-055 への Superseded 節)

DR-012 末尾に追加を提案:

```markdown
## Superseded (歴史)

> **更新: 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。**

### 「グループ的必須は or + required で足りる」 (DR-103 で更新)

> **更新: `{required:true, or:[...]}` は「1 つのトリガ発火後にどの値文法で読むか」を選ぶ値選択型の oneof にしか成立しない (or の枝は共有トリガ後の分岐専用で独自トリガを持てないため)。独立した複数トリガ (flag 群) からの「少なくとも 1 つ必須」は DR-103 の `required_group` が担う。「制約は要素属性として書く」という本 DR の核判断・`groups` 型の別座席を作らない方針は DR-103 でも維持される。**
```

DR-055 末尾に追加を提案 (同型):

```markdown
## Superseded (歴史)

> **更新: 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。**

### §4「oneof は既存合成で足りる」 (DR-103 で更新)

> **更新: 独立トリガ群 (flag 群) からの「少なくとも 1 つ必須」は `{required:true, or:[...]}` では表現できないと判明 (DR-012 の Superseded 注記と同根)。DR-103 の `required_group` が担う。値選択型の oneof (§1 の値の枝への requires 合成と同系統) は本節の記述のまま有効。**
```

## 採用しなかった案

### (1) kawaz スケッチ `{required:true, or:[{ref}...]}`

既存の `or + required` 語彙をそのまま group 必須に転用する案。journal (`2026-07-13-post-dr100-fixes-and-alo-recon.md`) の検証で不成立と判明: kuu の `or` は「共有トリガ後の値文法分岐専用」(1 つの要素が発火した後、その値をどの型で読むかを分岐する構造) であり、or の枝は「独自のトリガ/ref を持てない」(トリガは or 親の 1 箇所に集約される)。tar のモード必須が要求するのは「独立した複数トリガ (flag) のうち少なくとも 1 つが発火する」制約で、各 flag は独自のトリガ (`-c`/`-t`/`-x` それぞれの CLI token) と ref を持つ — or の語彙ではこの構造を表現できない。

### (2) definition/scope 側の `groups` 1 級座席

`"groups": {"mode": {"required": true}}` のように definition/scope 側にグループ規則を宣言する専用座席を新設する案 (journal では ALO-a として統括推しだった)。kawaz 裁定で棄却: 「グループは『この中から一つ必須』の語彙を扱うやつが勝手にグループ作って判断すりゃいいだけ」— グループという概念自体は「制約を評価する側 (constraint installer)」が group ラベルの集約で構成すれば足り、definition 側に新しい構造座席を持つ必要がない。DR-012 の「制約は要素属性として書く、別場所 (groupRules) は作らない」という核判断とも整合する。

### (3) `exclusive_group` の object 詳細形

`{"name": "mode", "exclusive_group": [{"name": "g", "at_least_one": true}]}` のように既存 `exclusive_group` を string 配列から object 配列に拡張し、グループごとの詳細设定 (at_least_one 等) を持たせる案 (journal では ALO-b)。不採用: `exclusive_group` は「排他」という単一の意味を持つ語彙であり、そこに必須性という別軸の意味を混ぜると 1 属性が 2 つの独立した制約を担うことになる。**「排他」と「必須」は独立した軸であり、別属性として持つ方が「違うものを違うものとして扱う」原則に忠実** — 同名文字列で両属性を併用すれば合成で exactly-one が作れるため、表現力は失われない。

### (4) required / required_group の bool 型充足に requires 目的語と同じ truth-dispatch を適用 (RG-a、kawaz 棄却)

flag member が常に値充足し group が vacuous 成立する挙動 (§7) を「bug」とみなし、`requires` 目的語の bool-truth 判定 (DR-047 §5「解決後の値が true であること」) を `required`/`required_group` にも一様適用する案。RG-Q1 として提示し、統括推しでもあった。kawaz 裁定で棄却: 「flag に required 付けても常に充足はそれで OK。付けても付けなくても制約への影響は無い。せいぜい lint で『付ける意味ないよ』と言うくらい。default 付きや `type:"tty"` のような値充足が保証されてるやつ全般も同じ」— `required` は値述語 (「結果に値がある」保証) であり、bool-truth という真理値述語をそこに重ねると `required` 自体の意味が別の述語 (「真であることを保証する」) に変わってしまう。requires 目的語の truth-dispatch は「依存述語」という別の意味論の話であり、値述語である required 系には適用しない。この非対称は意図的 (§7 参照)。

## 関連

- DR-012 (制約は要素属性として書く — 核判断は不変、一部主張の訂正あり)
- DR-047 (制約評価のレイヤリング — 判定入力テーブルに `required_group` を値述語として追加、§7 射程外の予告を本 DR が実現)
- DR-055 (制約語彙の拡充 — §4 の訂正、constraint installer 所有語彙への追加)
- DR-093 (required/requires の型委譲充足 — `required_group` の「充足」定義がこの型委譲をグループに持ち上げる形)
- DR-066 (reason コード規約 — `<属性名>_violated` 統一)
- DR-054/082 (definition-error / conformance fixture format — 本 DR は definition-error でなく実行時 constraint 違反のため通常 parse fixture で pin)
- issue `2026-07-12-exclusive-group-at-least-one-required.md` (発端、tar 実機観測)
- journal `2026-07-13-post-dr100-fixes-and-alo-recon.md` §C (ALO 検証、Failed Attempts の実証記録)
- `corpus/real-cli/tar.json` (モード必須制約、本 DR の適用対象)
