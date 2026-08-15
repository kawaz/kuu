# DR-136: trigger_name — 綴り軸の一級化と、name の名前系値源への純化

> 由来: 本セッション (2026-08-15) の kawaz チャット議論。CMDID-Q1 (command も id 軸を占有する = DR-054 更新 5) の裁定直後に「では CLI 表面に出る綴りはどの軸なのか」を詰めたもの。command のトリガ綴りが `name` を直取りして exact に焼き込まれること (= キー寄りの値と CLI 表面の綴りが 1 フィールドに同居する) への違和感が出発点で、DR-046 の軸分解を綴り軸まで広げて決着した。

## 決定

### 1. trigger_name を一級軸として新設

CLI 表面に現れる**照合綴り**を担う軸を `trigger_name` として独立させる。DR-046 §1 の軸表は本 DR で次のとおり更新される (`name` からのデフォルト供給に、軸ごとの慣習的変換が入る):

| 軸 | フィールド | 役割 | 結果露出 | `name` からのデフォルト |
|---|---|---|---|---|
| 綴り (トリガ) | `trigger_name` | CLI 表面の照合綴り | しない | kebab(name) |
| 参照識別子 | `id` | ref / link の解決対象 | しない | snake(name) |
| 結果キー | `export_key` | 結果オブジェクトのキー、スコープ生成 | する | snake(name) |
| 値プレースホルダ | `value_name` | help / usage の `<PLACEHOLDER>` | しない | UPPER_SNAKE(name) |
| 説明ラベル | `display_name` | help でその引数を指す人間可読名 | しない | name (無変換) |

`name` は各軸へ値を供給するだけの存在であり、**それ自体は CLI 表面にも結果にも直接現れない**。

### 2. trigger_name が担う入口と、担わない入口

**担う**:

- **long の基幹綴り** — `--<trigger_name>`。variant の affix 構造 (DR-011 の prefix) と合成する点は不変で、合成の素が name から trigger_name に変わる
- **command のトリガ照合綴り** — 従来 name を直取りして exact に焼き込んでいた綴り
- **alias の入口綴り** — §5

**担わない**:

- **positional** — 入口綴りを持たない (位置で消費される)。name は他軸へ供給するのみ
- **short** — 明示専用の 1 文字綴りで name から導出されない (DR-071 §3 の「short は不変」がそのまま生きる)
- **`exact` 葉 / `values` 糖衣** — literal の直値であって name 由来ではない (DR-063 A.1 の裸文字列正規化形)

### 3. 供給変換は「name から供給されるときだけ」

| 変換 | 内容 |
|---|---|
| kebab(name) | underscore → hyphen |
| snake(name) | hyphen → underscore |
| UPPER_SNAKE(name) | snake 化してから ASCII 英字を大文字化 |

- **変換は underscore ↔ hyphen の置換と ASCII 大文字化のみ**。camel 系の変換 (camelCase ↔ snake_case 等) は含めない
- 非 ASCII はそのまま (大文字化も ASCII 英字のみに効く。i18n サブコマンド名が正規である点は DR-067 の name 制約と同じ)
- **明示指定は常に無変換** — `{"id": "ほげ"}` はそのまま `ほげ`、`{"trigger_name": "dry_run"}` はそのまま `--dry_run` を植える。変換は「書かなかった軸を name で埋める」ときの慣習であって、書いた値に掛かる正規化ではない

### 4. name は「汎用名前系値源」— ハイフンも書ける

`name` はキー寄りの汎用的な名前系値源に純化する。**使える文字にハイフンも許容する** (schema の `^[^#]+$` は元から許容しており、本 DR は意味論としてこれを明文化する)。

帰結として、`{"name": "dry_run"}` と `{"name": "dry-run"}` は**全軸で同一の結果に落ちる**:

| | trigger_name | id | export_key | value_name |
|---|---|---|---|---|
| `{"name": "dry_run"}` | `--dry-run` | `dry_run` | `dry_run` | `DRY_RUN` |
| `{"name": "dry-run"}` | `--dry-run` | `dry_run` | `dry_run` | `DRY_RUN` |

書き手は自分の好きな綴りで name を書けばよく、CLI 表面が kebab に、キー面が snake に落ちることは軸の変換が保証する。

### 5. alias は「綴り軸の別名を追加する入口ノード」

DR-057 §3 の継承原理を trigger_name 語彙で書き直す:

> **name から導出される入口の再導出とは、alias ノード自身の trigger_name (既定 kebab(alias の name)) を入口綴りとして使うことである。明示綴りの入口 (short) は継承されない。**

- `{"alias": "paths", "name": "files"}` → alias ノードの trigger_name = `files` で canonical の variant 構造が再導出され、`--files` / `--no-files` が立つ
- 再導出が具象綴りの文字列置換ではなく affix 構造との合成である点 (DR-057 §3) は不変
- alias が持つのは綴り軸だけで、id 軸・結果キー軸を占有しない点も不変 (DR-054 更新 5 の duplicate-id 不参加、DR-120 §4 の露出キー非占有)

### 6. 覆す範囲と残す範囲

**覆す**:

- **DR-071 §3** の「long の綴りは name 由来で決まる」 — 由来は trigger_name 軸になる (long の値空間が bool | variant DSL 配列である決定そのものは不変)
- **command の name 直取り** — トリガ綴りは trigger_name から導出する
- **DR-003 軸 1** (CLI マッチング) — 独立した trigger_name 軸として分離される (DR-046 が軸 2/軸 3 を分解したのと同じ処理)
- **DR-046 §1 の軸表** — trigger_name 行の追加と、デフォルト供給に変換が入る点 (§1 の表が新しい正本)

**残す**:

- **DR-022 の綴り慣習** — 「キー名は snake_case、CLI 値は kebab-case」。本 DR はこの慣習を軸として一級化するものであり、long トリガの現行挙動 (`dry_run` → `--dry-run`) を変えない (`fixtures/name-surface/snake-kebab.json` が既に pin 済み)
- **short の扱い** (DR-071 §3)、**positional に入口綴りが無いこと**、**exact / values の literal 直値**
- **id 軸・結果キー軸の重複規範** (DR-054 更新 5 / DR-120) — 本 DR は綴り軸を分離するだけで、重複判定の軸構成を動かさない

## 採用しなかった案

### name を CLI 表面へ直取りし続ける (現状維持)

キー面の都合 (snake) と CLI 慣習 (kebab) が 1 フィールドに同居し続ける。実際 long だけが kebab 変換を持ち command は name 直取りという非対称が生まれていたが、name 直取りを前提にする限りこの非対称を原理から説明できない。

### 軸ごとの完全独立 (デフォルト供給を置かない)

日常ケース (name 1 個で全軸を賄う) の書き味を壊す。DR-046 が同じ理由でデフォルト供給を残した判断をそのまま引き継ぐ。

### camel 系変換もデフォルトに含める

変換規則が増えるほど「name に書いた綴りがどの軸でどう化けるか」が読めなくなり、明示指定との差も曖昧になる。underscore ↔ hyphen は 2 つの綴り文化の間の機械的な写像であり、可逆で説明コストが低い。

## 射程外 (本 DR では決めない)

- **非英数のみからなる name への変換適用** — `dd` 要素の `name: "--"` のように英数を含まない name に snake / kebab をどう当てるか (`--` を参照している既存 fixture がある)
- **`effects[].entity` / `errors[].element` がどの軸を綴るか** — CONFORMANCE §2 は「name / id」と両論併記のまま。name とハイフン許容によって name と id が分岐しうるので確定が要る
- **short の複数文字化や trigger_name からの short 導出** — short は明示専用のまま (§2)
- **既存 fixture の追随作業そのもの** — 波及の一覧化までが本 DR の担当

## 関連

- DR-046 (name の軸分解 — 本 DR が trigger_name 行と供給変換を追加)
- DR-003 (name 3 軸兼任の原型 — 軸 1 が本 DR で分離)
- DR-022 (snake_case キー名 / kebab-case CLI 値の綴り慣習 — 本 DR が軸として一級化)
- DR-071 (long の責務分離 — §3 の綴り由来を本 DR が更新)
- DR-057 (alias — §3 の再導出を trigger_name 語彙へ)
- DR-054 更新 5 / DR-120 (id 軸・結果キー軸の重複規範 — 綴り軸と層が違う)
- DR-011 (variant の affix 構造 — 合成の相手)
- DR-067 (name / id の文字制約 — `#` 予約)
