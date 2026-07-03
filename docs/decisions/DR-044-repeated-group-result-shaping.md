# DR-044: 反復グループの結果整形 — 配列が既定、map は from_entries

> 由来: authsock-warden 型の入れ子反復グループ (`--upstream ... --socket ... filters...`) の結果表現の議論と、垂直スライス PoC 第 4 弾の実測。findings `2026-06-29-ast-missing-pieces.md` の F-021 (map 型の key 抽出) の片翼を確定する。

## 決定

### 1. 配列が既定

発火ごとに値が蓄積される要素 — `multiple: "append"` を持つ greedy グループ、反復される name スコープ — は、結果オブジェクトで**配列**になる:

- 要素が name スコープ (object を作る) なら**配列オブジェクト**: `{upstreams: [{path: ..., sockets: [...]}, ...]}`
- 要素がスカラなら**配列スカラ**: `{filters: ["filter1", "filter1"]}`

object / スカラで規則は分かれない (発火ごとの蓄積 = 添字付き要素、の一様規則)。

### 2. map 形は collector (from_entries)

蓄積された配列を object へ変換するのは **`from_entries` collector**。3 用法:

| 用法 | 入力の形 | 挙動 |
|---|---|---|
| `from_entries()` | `[[k, v], ...]` (無名 2 要素 seq の配列) | そのまま entries として object 化 |
| `from_entries({key: "k", value: "v"})` | `[{k, v}, ...]` (named フィールドの object 配列) | 指名 2 フィールドを key / value に |
| `from_entries({key: "path"})` | object 配列 | key フィールドが昇格・除去され、**残りのオブジェクト全体**が値になる |

```json
{"name": "upstreams", "multiple": {"preset": "map", "from_entries": {"key": "path"}}, ...}
```

→ `{upstreams: {"/path/to/up1": {sockets: {...}}, "/tmp/foo.sock": {...}}}`

- from_entries は反復グループ (name スコープ) ごとに付与する。入れ子の各段が独立に配列 / map を選べる
- 表記は DR-034 / DR-036 の既存合成順 (type → multiple → 直接書き) にそのまま乗る。collector は filters registry の住人 (DR-036) であり、新しい registry 区分は作らない
- 蓄積要素を `[k, v]` (無名 = 配列) と `{k, v}` (named = object) のどちらで作るかは DR-025 / §2.5 の name 有無規則そのもの — from_entries の 3 用法はその両方を受ける

### 3. 例 (authsock-warden)

```
--upstream /path/to/up1 --socket ~/.ssh/up1-s1.sock filter1 filter1 \
  --socket ~/.ssh/up1-s2.sock f2,f3 --upstream /tmp/foo.sock --socket /tmp/foo-bar.sock
```

配列形 (既定):

```json
{"upstreams": [
  {"path": "/path/to/up1", "sockets": [
    {"path": "~/.ssh/up1-s1.sock", "filters": ["filter1", "filter1"]},
    {"path": "~/.ssh/up1-s2.sock", "filters": ["f2,f3"]}]},
  {"path": "/tmp/foo.sock", "sockets": [
    {"path": "/tmp/foo-bar.sock", "filters": []}]}]}
```

map 形 (各段に `from_entries: {key: "path"}`):

```json
{"upstreams": {
  "/path/to/up1": {"sockets": {
    "~/.ssh/up1-s1.sock": {"filters": ["filter1", "filter1"]},
    "~/.ssh/up1-s2.sock": {"filters": ["f2,f3"]}}},
  "/tmp/foo.sock": {"sockets": {
    "/tmp/foo-bar.sock": {"filters": []}}}}}
```

いずれも垂直スライス PoC 第 4 弾で実測済み (配列形は一意成立、map 形は key 昇格の仮実装で確認)。

## 採用しなかった案

### 専用の「map グループ」プリミティブ

反復と整形は直交する関心で、整形は collector (既存機構) で足りる。構造側に map 概念を持ち込まない。

### key の自動推定 (最初の scalar フィールドをキーにする等)

暗黙ルール最小化 (§0.1) に反する。from_entries の明示指定のみ。

### to_map + key_from (専用 collector + 専用フィールド)

当初案。from_entries (JS の Object.fromEntries と同じ一般語彙) が entries 配列形・指名 2 フィールド形・key 昇格形の 3 用法を一本で覆うため置換した。

## 射程外

`-D KEY=VAL` 型 — 1 トークン (piece) 内の separator 分割による kv 抽出と value 型注釈 (findings F-021 の残り半分) — は本 DR では確定しない。本 DR の key_from は「グループ内フィールドからのキー抽出」であり、piece 内 2D separator は別途確定する。

## 関連

- DR-025 (name が結果スコープを作る — 配列既定はその反復版)
- DR-034 / DR-036 (collector の座席と合成順 — to_map / key_from はここに乗る)
- DR-042 (multiple installer — 「発火ごと蓄積」の宣言)
- DR-043 (repeat / multiple 分離 — 蓄積 (値面) と反復 (構造面) の役割分担)
- 垂直スライス PoC 第 4 弾 (journal `2026-07-02-slice-poc.md`)
- findings `2026-06-29-ast-missing-pieces.md` F-021 (片翼確定、separator 2D 側は残)
