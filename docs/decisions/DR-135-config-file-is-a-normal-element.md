# DR-135: config_file は通常要素 — 内部セルの特別枠から外す

> **更新 (DR-140 §4、2026-08-16): §1 の「その要素が値を持つか」の分界は値カプセル
> (`value` 属性、DR-140 §1) を見て構造的に判定される形になった。** 判別は 「**`value` が不在、または `value` の type が `"none"` である**」という判別式で行う (`type: "none"` はカプセル語彙上「カプセル ⊘」だが wire 綴りとしては `"value": "none"` の縮退形を持つため、presence 単独では取れない)。分界の意味論は不変。
>
> **訂正 (2026-08-16): 上記を「presence で構造的に判定」と書いていたのは不正確** — DR-140 §4 が
> 「presence 単独では取れない」と明示している。正確形は上の 2 条件。

> 由来: kawaz 裁定 (2026-08-14)。DR-121 §2.1 は `type: "none"` / `config_file` / dd trigger を一括で
> 「内部セル」に分類し `effects` / `result` / `sources` のいずれにも現れないと規定したが、この 3 者は
> セルの性質が揃っていない。前提は DR-050 (config ファイル値源の正本 — §1 パス要素は普通の要素 /
> §5 循環禁止) / DR-120 (露出キー衝突検査と §4 の占有・非占有) / DR-130 (宣言キー全列挙と null 射影) /
> DR-052 (`export_key: null` の透過) / DR-122 (sources は result の shadow tree)。

## 決定

### 1. config_file は内部セルではない — 値を持つ通常の値セルである

`type: "config_file"` の要素を「内部セル」として結果面から一律に落とす規定を廃する。config_file は
**露出キーを持ち値セルを持つ通常要素**であり、結果アドレス軸 (`result` / `sources`) にも id 軸
(`effects`) にも、他の値要素と同じ規則で現れる。

分界は**その要素が値を持つか**である。DR-121 §2.1 が同じ枠に入れた 3 者は、この軸で割れる:

| 要素 | 値セル | 内部セル扱い |
|---|---|---|
| `type: "none"` | 持たない (値空間を持たない型、DR-089) | 継続 |
| `dd` trigger | 持たない (値セルも子も持たず、`export_key` を書いても結果に何も現れない、DR-064 §5) | 継続 |
| `type: "config_file"` | **持つ** (string のパス値。自分の cli > env > default ラダーで確定する、DR-050 §1) | **廃止 (本 DR)** |

none と dd は「値の無い構造マーカー」であり、結果に出そうにも出す値が無い。config_file は
DR-050 §1 が明言するとおり「**パス要素は普通の要素であり、long / short / env / default がそのまま乗る。
パス自体が値源ラダーで解決される**」— ラダー付きの普通のセルである。3 者を同枠に置いていた根拠は
「結果に出したくない」という観測上の都合だけで、セルの性質の違いを見ていなかった。

### 1.1 占有の規則は元から config_file を除外していない

この特別枠は DR-121 §2.1 と `docs/CONFORMANCE.md` §2 の 2 箇所にしか無く、**占有の判定を定める
DR-120 §4 と DR-130 §1b は config_file を非占有側に列挙していない**。両者の非占有列挙は
`link` / `alias` の参照ノード、結果キー軸を持たない要素、`dd`、`#` 予約 namespace と `definitions` 配下、
`type: "none"`、`global` の入口コピーであり、config_file はどこにも現れない。本 DR は新しい例外を
作るのではなく、**占有の正本 (DR-120 §4) が既に含意していた扱いへ、結果面の規定を揃える**。

### 2. name があれば result に出る — 値は確定したパス

露出キーを持つ config_file 要素は、その結果キーに**確定したパス**を値として持つ。

- **単値**: ラダーが確定させたパス文字列
- **`multiple`**: 供給順のパス列 (`string[]`)。0 供給なら `[]` (反復系の bottom default、DR-044 / DR-123)
- **`sources`**: 自分のラダー席のタグ (`cli` / `env` / `default`、link 経由なら `link`)。**config 席は
  循環禁止 (DR-050 §5) で持たないので、config_file 要素の座に `config` タグは立たない** — この点は
  本 DR で変わらない
- **どの席からもパスが供給されない座**: `result` / `sources` とも `null` (DR-130 §1 / §5)。`multiple` は
  上記のとおり `[]` / `[]`

### 2.1 結果値は「供給されたパス」であって「読めたパス」ではない

result に座るのは、その要素のラダーが確定させたパスである。provider がそのパスを読めたかどうかは
値に影響しない。

DR-050 §5 の依存順序が段を分けている — **経路確定 → config_file 要素の値確定 (CLI/env/default) →
provider 読込 → config 席の有効化**。要素の値を決めるのは 2 段目のラダーであって、3 段目の provider の
返り値ではない。したがって default 由来パスの不在が黙認されても (DR-133 §3)、その要素の値は default の
パスのまま result に座る。`multiple` の場合も、result に並ぶのは**供給された列**であって、読めたものだけを
残した列ではない — 読めたかどうかは fold (DR-133 §1) の関心であり、fold の入力である列そのものを
書き換える規則は無い。

「読めなかった」ことは result からは読めない。committed なパスの読込失敗は Error (DR-050 §2 /
DR-133 §3) として別面に出るので、成功 result にこの情報を持たせる必要はない。

### 3. effects にも通常要素として現れる

config_file が内部セルの列から抜ける以上、`effects` の一般規則がそのまま適用される
(CONFORMANCE §2 / DR-065):

- **`cli` / `link` 由来のパース時効果のみ載る**。`--config /cli.toml` は
  `{"entity": "config", "op": "set", "operand": "/cli.toml", "source": "cli"}`
- **env / default 由来のパス確定は載らない** — ラダー充填は完走後の値確定であり args 順の全順序を
  持たない。由来は `sources` 側で検証する
- `effects[].entity` は **id 軸** (TRG-Q3=a) であり `export_key` を適用しない (DR-121 §5) ので、
  `export_key: null` の透過 config_file であっても cli 発火は effects に現れる

### 4. 露出キー衝突検査に占有子として参加する

config_file は DR-120 §4 の「占有する (検査に参加する)」側 — 露出キーを持ち値セルを持つ要素 — である。

- 同一結果スコープで config_file と他の値セルが同じ露出キーへ解決する定義は definition-error
  kind `export-key-collision` (関与要素ごとに 1 件を全列挙、DR-120 §5)
- 判定は `export_key` 適用後の露出キー文字列で行い、identity 経由か mapped 経由かを区別しない
  (DR-120 §3)
- 検査は**構造的で到達可能性を見ない** (DR-120 §6) ため、透過スコープや排他な別 command の配下から
  昇格露出する config_file も対象になる
- **DR-134 §2 の共存表への帰結**: 値持ち command の内側に置ける非占有子に config_file は含まれない。
  露出キーを持つ config_file を値持ち command の内側に置く定義は `invalid-range` (DR-134 §2 の
  「露出キーを持ち値セルを持つ通常要素」行に落ちる)

### 5. 隠したいなら通常語彙で書く

結果に出したくない config_file は、他の要素と同じ書き方で隠す:

- **`export_key: null`** — 透過 (DR-052 §2)。結果キー軸を持たないので `result` / `sources` に現れず、
  DR-120 §4 の非占有側へ移って衝突検査からも外れる。**値の伝搬は止まらない** (DR-052 §1「export しないの
  ではなく名前が無くなるだけ」) ので、パスの供給と config 席の充填は従来どおり働く
- **name を書かない** — 露出規則 (DESIGN §2.4) により同じく結果キーを持たない

隠す手段が既に 2 つあるので、型に紐づいた特別枠を維持する必要がない。制御は利用者の手に移り、
「どの config が使われたか」を結果で見たい定義 (診断表示・ログ) は name を書くだけで書ける。

### 5.1 `export_key` は inert ではなく実効になる

DR-134 §6 は `dd` への `export_key` を **inert** (書いても何も起きない) な宣言として整理しているが、
config_file の `export_key` は本 DR で**実効**になる — 改名すれば結果のキー名が変わり、`null` なら結果から
消える。通常要素なので当然であり、config_file は「無意味だが無害な宣言」の側から離れる。
inert / vacuous の線 (DR-134 §6) が対象とするのは値の座を持たない要素であって、config_file は
その条件を満たさない。

### 6. 改訂される規定

- **DR-121 §2.1** — 内部セルの列挙から `config_file` を外す。残るのは `type: "none"` (DR-089) と
  dd trigger (DR-064)
- **`docs/CONFORMANCE.md` §2** — 「内部セルは射影しない」行から `config_file` を外す
- **DR-120 §4** — **判定そのものは変わらない**。§1.1 のとおり config_file は元から非占有側に列挙されて
  おらず、占有側の一般行 (露出キーを持ち値セルを持つ要素) にそのまま該当する。本 DR はこの読みを
  確定させるだけで、判定表の書き換えは伴わない
- **DESIGN §15.5** — 上記の読み違いが実際に起きていた (DR-121 §2.1 / CONFORMANCE §2 との分裂) ため、
  占有側の列挙に config_file を**明示する行を足す**。判定の変更ではなく曖昧性の除去である
- **DESIGN §14.3 / REFERENCE.md の `config_file` 行** — config_file 要素自身が結果に出ることと、
  隠す手段 (§5) を明示

## 根拠

### 値を持つ要素を結果から落とす規則には根拠が要る

result は「宣言したキーが漏れなく現れる」面である (DR-130 §1)。値を持つセルをそこから落とすのは
利用者から見て予想外の欠落であり、落とすなら理由が要る。config_file にその理由は無かった — 落ちていたのは
none / dd と一緒に列挙されていたからで、性質の共有ではなく分類の巻き添えだった。

### 隠す語彙が既にある

「結果に出したくない」は `export_key: null` と nameless が担う一般語彙であり、型ごとの特別枠は
その語彙の重複である。特別枠は利用者から制御できない (config_file を選ぶと強制的に隠れる) ぶん
一般語彙より弱い。

### 出したい需要が実在する

「どの config ファイルが実際に使われたか」は診断表示・ログ・`--print-config` 系の自然な需要で、
結果オブジェクトが設定の最終形である (DR-030 の appconfig 統合ストア) 以上、そこに出るのが素直である。
現行規定ではこの値を取り出す経路が無い。

### 規定の分裂を畳む

DR-120 §4 / DR-130 §1b (占有の正本) と DR-121 §2.1 / CONFORMANCE §2 (結果面) が config_file について
食い違っており、実装は結果面の規定に従っていた。片方に揃える必要があり、占有の正本側に揃えるのが
§1 の性質論と一致する。

## 採用しなかった案

### 内部セルのまま維持する (現行規定の追認)

「config のパスは実装の内部事情であって結果ではない」という読み。しかし config_file 要素は利用者が
`long` / `env` / `default` を書いて宣言する入口であり、内部事情ではない。この読みを採ると、隠したくない
定義に手段が無いまま残る (現行の非対称)。

### result には出すが衝突検査には参加させない

「出すが占有しない」構成。DR-120 §1 の中核規範 (1 結果スコープ・1 露出キー・1 値セル) が破れる —
非占有のまま結果キーを持つと、同名の値セルと 2 つの値が 1 キーへ落ちる形が到達可能になり、
DR-120 の由来 issue が実測した「値が黙って消える」経路を作り直すことになる。出すなら占有する。

### config_file 専用の「出す / 出さない」ダイヤルを足す

`expose_path: true` のような型固有フィールドを新設する案。`export_key` が既に担う軸の二重化であり
(DR-052 の結果キー軸一本化に反する)、矛盾組合せ (`export_key: "x"` + `expose_path: false`) を
書けてしまう。

## 波及

### fixture

- `fixtures/value-sources/config/{path,ladder,isomorphic-path,array-object,null-supply,value-typing}.json`
  — 名前付き config_file 要素の座が `result` / `sources` に増える。cli 供給のパスは `effects` にも
  1 件増える (`path.json` の `cli-path-wins`)。`path.json` の `default-read-tolerated` が §2.1
  (読めなくても値は座る) の pin を兼ねる
- **`multi-file.json` / `multi-file-path-absent.json` / `multi-file-multiple.json` は本 DR では
  手を付けない** — CFM-Q3a (複数 config_file 要素の並置は definition-error、kawaz 2026-08-14) により
  DR-133 の要素間規則が撤去されるため、3 本とも定義ごと組み替えになる。本 DR の帰結
  (`multiple` のパス列が `string[]` として座る / 供給されたパスが読めなくても座る) の pin は、
  再改稿後の `multiple` 1 要素形へ組み込む (DR-133 再改稿の作業単位)
- `fixtures/export-key/collision-config-file-option.json` (新規) — config_file が占有子として
  `export-key-collision` に参加する
- `fixtures/export-key/config-file-transparent-non-occupier.json` (新規) — `export_key: null` の
  config_file が結果に出ず衝突もせず、config 席の充填は働く (§5)。透過でも cli 発火は `effects` に
  出る (§3)
- `fixtures/export-key/unselected-scope-internal-cell-mask.json` — 内部セル除外席の negative list から
  config_file が抜けるため、config_file 側の座を `none` と分離して昇格露出の正の pin へ組み替える
- `fixtures/piece-filters/config-source.json` / `fixtures/constraints-parse/requires-bool-target-config-*.json`
  — 名前付き config_file の座が増える
- `fixtures/lowering/config/basic.json` — `query: "lower"` は結果面を持たないため**変更なし**
  (DR-050 §1 の「普通の要素」を lowering 断面で既に固定している)

### docs 本体

- `docs/CONFORMANCE.md` §2 の内部セル行 (§6)
- `docs/DESIGN.md` §14.3 と §15.5 の占有側列挙 (§6)
- `docs/REFERENCE.md` の `config_file` 行 (§6)
- DR-121 §2.1 の内部セル列挙への改訂 note (§6)、および DR-133「関連」の DR-121 §2 参照の差し替え

### issue

- `docs/issue/2026-08-12-export-key-non-occupying-co-export-fixture.md` — **前提が反転**したので close。
  「config_file (非占有) の export_key が実セルの露出キーと重なる合法構成」は本 DR で
  `export-key-collision` になり、要求されていた fixture は spec 上到達不能になった
  (`collision-config-file-option.json` が反転後の輪郭を持つ)
- `docs/issue/2026-08-12-config-committed-carry-over.md` — 「`multiple` の config_file が result / sources に
  `user=[]` として現れるのは DR-121 §2 違反」という観測が反転 (本 DR では**正しい挙動**)。受け入れ条件を
  差し替え
- `docs/issue/2026-08-14-dr133-redraft-single-config-file.md` — CFM-Q3a による DR-133 再改稿。上記
  multi-file 系 3 fixture の組み替えと、本 DR の `multiple` パス列 pin の受け皿を含む

### 実装 (参照実装の乖離)

参照実装 (kuu.mbt) は config_file 要素を結果射影の negative list で落としており、本 DR の fixture は
追随まで通らない。落とす対象を `type: "none"` と dd trigger に絞り、config_file を通常の値セルとして
射影する変更が要る。露出キー衝突検査 (`parse_definition`) の入力集合に config_file を含める変更も
同じ波及に入る。

## 射程外

- **id 軸の一意性** — 同一スコープの参照識別子の重複 (config_file `user` + option `user`) は露出キー軸とは
  別軸の問題で、報告に使う kind は **`duplicate-id`** に確定した (DNR-Q1=a、kawaz 裁定 2026-08-14 / 枠付けの訂正 2026-08-15、DR-054 更新 5)。本 DR は露出キー軸で
  掛かる範囲だけを確定させる
- 異なるスコープに宣言された config_file の関係 (DR-133 の射程外のまま)

## 関連

- DR-050 (config ファイル値源の正本 — §1「パス要素は普通の要素」が本 DR の直接の根拠、§5 の循環禁止で
  config 席を持たない点は不変)
- DR-121 (§2.1 の内部セル列挙から config_file を外す — 本 DR が改訂)
- DR-120 (§4 の占有 / 非占有 — config_file は占有側。判定表そのものは不変)
- DR-130 (宣言キー全列挙と null 射影 — 未供給パスの座が `null`、§1b の占有規則の参照)
- DR-052 (`export_key: null` の透過 — 隠す手段 §5)
- DR-133 (config パス列の fold — 供給された列と読めた列の分界 §2.1)
- DR-134 (§2 の共存表への帰結 §4、§6 の inert / vacuous の線との対比 §5.1)
- DR-122 (sources は result の shadow tree — `multiple` の列が持つタグの形)
- DR-064 / DR-089 (dd / `type: "none"` — 内部セルとして残る 2 者)
