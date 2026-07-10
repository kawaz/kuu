# DR-081: default 席書き換えモデル — source の確定と op=default の意味

> 由来: issue default-op-source-tag-contradiction (DR-031 明文「op=default 適用後は cli」と fixture 実践「sources=default」の矛盾、codex レビュー 2026-07-10 検出)。kawaz が color の canonical 例表で裁定 (2026-07-10 チャット) — DR-031 の cli 読みを正としたうえで、「env/config は default 席を書き換える」モデルで values の由来と確定の主体を分離して整理した。

## 決定

### 1. 概念モデル: node は default 値と default_source を持つ

- node は `default` (値) と、観測用の隠し属性 **`default_source`** (初期値 `"default"`) を持つ。default_source は wire 属性ではなく、sources 観測面の説明モデル
- **env / config / inherit の供給は「席が勝つ」のではなく「node の default と default_source を書き換える」**: 供給があれば default = 供給値、default_source = その席の名。複数席が供給する場合は従来のラダー優先順 (inherit → config → env の順に上書き = env が最終) 
- 最終値と source の決定:

```
source = if committed { cli } else if default が在る { default_source } else { absent (DR-051 §1) }
```

観測挙動は従来のラダー選択と、**op=default の場合を除いて**同値 (unset → env 供給あり = sources=env、供給なし = sources=default、いずれも従来 pin と一致)。

### 2. op=default = 「現在の (書き換え済み) default」を明示 set

- `:default` variant の発火は **その時点の default 値** (env/config が書き換えていればその値) をセルへ書き、committed=true でロックする
- **source は `cli`** — 値の内容が default 値と同じでも、その値を確定させたのはユーザの明示操作 (DR-031 の明文を再確認)。「デフォルト値をユーザが選んだ」という意思の記録であり、default_source が env であっても cli
- accum セルでは default 値 = 一様形 `[]` (宣言 default なし時、DR-051 §2b) — 書き換え済み default があればそれ (multiple への宣言 default 配列の意味論は issue multiple-declared-default-semantics で別途裁定)

### 3. op=unset = uncommitted 化

従来どおり committed=false へ戻し、source は default_source になる (env 供給あり → env)。DR-045 の規定は不変。

### 4. canonical 例

定義: `{name: "color", long: [":set", ":set:always", "default:default", "unset:unset"], default: "auto", values: ["always", "none", "auto"], env: "APP_COLOR"}`

(元の裁定例表は `default: "always"` と `(--colorなし) → auto` が不整合だったため、実世界の `--color` 慣習 — 宣言 default = auto、裸 `--color` = always — に揃えて収録した。モデルの規定は「op=default は書き換え済み default を set」であり、具体値は宣言 default に従属する。)

```
(--colorなし)   # color=auto   source=default committed=false
--color always  # color=always source=cli committed=true  (:set)
--color         # color=always source=cli committed=true  (:set:always 引数なし枝。
                #   後続トークンが values 不一致 / option 様なら :set 読みが dead-end
                #   して引数なし枝が勝つ — 既存の経路探索の帰結で新規則なし)
--default-color # color=auto   source=cli committed=true  (op=default: 宣言 default を明示 set)
--unset-color   # color=auto   source=default committed=false

APP_COLOR=none (--colorなし)   # color=none source=env committed=false  (env が default を none に書き換え)
APP_COLOR=none --color always  # color=always source=cli committed=true (:set)
APP_COLOR=none --default-color # color=none source=cli committed=true   (書き換え済み default=none を明示 set — default_source が env でも確定主体は cli)
APP_COLOR=none --unset-color   # color=none source=env committed=false  (default_source=env)
```

## 採用しなかった案

### 由来席読み (op=default → sources=default)

fixture 実践 (unset-ladder.json default-commits-locked / default-cell-ops.json) が採っていた読み。「値がどの席から来たか」を source に映す設計も一貫はするが、committed 軸が別に観測できる以上、source は「**確定させた主体**」を指す方が情報量が多い (unset 後の env は default_source 経由で env と出るので由来情報は失われない)。DR-031 の明文が元々この立場だった — fixture 側が誤りだったと裁定。

## 波及 (要追従)

- **fixtures/value-sources/unset-ladder.json** `default-commits-locked`: sources default → **cli** へ修正
- **fixtures/multiple-parse/default-cell-ops.json**: 2 case とも sources default → **cli**。`default-ignores-lower-env` は意味論ごと変わる — env PORTS=10,20 が default を書き換えるため、`--restore-ports` の結果は `[]` ではなく **[10,20] (source=cli)**。case 名・why も追従
- **fixtures/multiple-parse/unset-env-fallback.json**: 新モデルと既に整合 (変更なし)
- kuu.mbt: op=default の適用値 (書き換え済み default) と source タグの修正
- DR-031: 本 DR はその明文の再確認 + モデル精密化 (改訂不要)。DR-049/050 の「env/config 供給」は default 書き換えとして再説明できる (観測同値、本文不変)
- CONFORMANCE の sources 説明に「source = 確定させた主体 (committed なら cli)、非 committed は default_source」を明記

## 関連

- DR-031 (source の定義、op=default → cli の明文) / DR-045 (committed 意味論) / DR-051 (absent)
- issue default-op-source-tag-contradiction (発端の矛盾)
- issue multiple-declared-default-semantics (multiple への宣言 default — 本 DR の default 書き換えモデルが前提を与える)
