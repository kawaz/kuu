# DR-125: inherit の廃止 — 値源ラダーは 4 段、祖先参照は `default_fn: "borrow:<source>"` で書く

> 由来: kawaz 裁定 2026-07-29 (INH2-Q1=a)「borrow は default_fn に引数付き borrow という発想が生まれた今では
> 特別なものは不要。やるとしても ref/defaultborrow の糖衣程度。同じことを別機能として残す意味ない」。
> DR-124 で inheritable を廃止した際、その代替として inherit 席に寄せた経路を再検討した結果、
> inherit 自体が `borrow` cell fn と重複していることが確定した。

## 決定

### 1. `inherit` 属性を廃止し、値源ラダーは 4 段になる

```
1. CLI 明示 / link    (パース時操作、最優先)
2. 環境変数            (DR-049)
3. config ファイル     (DR-050)
4. default            (最終フォールバック、default_fn を含む)
```

wire 属性 `inherit` (bool 形・`{"from": ...}` object 形の両方)、それを回収する inherit installer、
`sources` タグ語彙の `inherit` を仕様から落とす。席が 1 つ減るので、席の共存規則と遅延解決の依存順
(DR-087) の分岐もその分減る。

### 2. `inherit` cell fn も廃止する — `borrow` と同型の重複だった

`cell_fns` には `inherit(source)` と `borrow(source)` が並んでいたが、descriptor の全軸が一致していた:
`role:"fn"` / `io_type.output:"value"` / `fallibility:"reject"` / `invocation` は `source: string` 1 個 /
`observes: ["option:<source>"]` / `reasons: ["absent-source"]`。説明文の「祖先 scope の」だけが差で、
機械可読な軸には一切現れていない。裁定の「同じことを別機能として残す意味ない」はこの重複を指す。
**`borrow` を残し `inherit` を落とす** — 名前が参照方向を含意せず、既に引数付きの汎用参照として
DR-114 §8 の canonical 住人だから。

### 3. 祖先スコープの値を参照する定義は `default_fn: "borrow:<source>"` で書く

既定値は**外側の要素に置き**、内側は borrow でそれを引く:

```json
{
  "options": [
    {"name": "socket_ttl", "type": "number", "long": true, "default": 60}
  ],
  "commands": [
    {
      "type": "command", "name": "socket",
      "options": [
        {"name": "ttl", "type": "number", "long": true, "default_fn": "borrow:socket_ttl"}
      ]
    }
  ]
}
```

外側で `--socket-ttl 30` と書けば内側 `ttl` は 30、`socket --ttl 10` なら内側 CLI が勝ち、どちらも
無ければ外側の default 60 が borrow 経由で内側に流れる。

`default` と `default_fn` は**同じ default 席**なので併用は definition-error `invalid-range`
(DESIGN §11.4)。したがって「内側にも固定 default を持たせつつ外側からも一括指定する」形は書けず、
既定値の置き場所は外側 1 箇所に決まる。inherit が inherit 席と default 席を別に持って両立させて
いたぶんの表現力は失われる — 意図した縮小で、既定値の在処が定義から一意に追えることを優先する。

### 4. `borrow:<source>` の名前解決は lexical scope chain

`borrow` が受ける `<source>` は、ref / link と同じ既存の名前解決規則で解決する: 現在スコープ →
外側スコープへ順に → definitions (DESIGN §2.7、DR-006 / DR-033 / DR-032)。§3 の例で子コマンド
`socket` の中から root の `socket_ttl` に届くのはこの規則による。

これは新しい決定ではなく、**既存の名前解決規則が `observes: option:<source>` の解決にも適用される
ことの明文化**である (kuu には名前解決規則が 1 つしかなく、fn 引数だけ別規則を持つ理由がない)。
自分自身を指す `borrow` は循環として definition-error `circular-ref` になる既定のまま
(DR-114 §10、`fixtures/help/def-error-borrow-cycle.json`)。

### 5. 同名祖先の暗黙探索は代替を持たない

`inherit: true` (自 name と同じ名前を祖先 scope chain から探す) に対応する書き方は残らない。
外側要素に別の name を与えて明示参照する (`socket_ttl` ↔ `ttl`)。暗黙探索の喪失は意図した縮小で、
「どこから値が来るか」が定義に書かれている状態を優先する。

## 根拠

### 引数付き `borrow` が既に canonical にある

`default_fn: "borrow:<source>"` は DR-114 §8 で確定済みの canonical 語彙で、REFERENCE §6b の
`cell_fns` 表・DESIGN §7.4 / §14.1 の help 連動 (`default_fn: "borrow:<source>"` を target 側に書く
一方向の汎用機構) で既に使われている。inherit はこれと同じ「他要素の値を既定値にする」機能を、
専用の席と専用の属性で二重に持っていた。

### 席を増やす形の機能は交差面を増やす

ラダー席は他の全席と共存規則を持ち、遅延解決の依存順・`unset` によるラダー開放 (DR-045 §2)・
書き換えモデル (DR-081)・sources タグ語彙のすべてに 1 列ずつ増やす。同じ表現力を fn 引数で得られる
なら、席として持つ理由がない。

### 廃止で不要になる規定

inherit 席の解決規則 (最近祖先の同名実体)、bool 形と object 形の 2 形、`inherit` と `default` の
席関係、`sources` の `inherit` タグ、LOWERING §B.7 の inherit installer、descriptor の重複住人。

## 波及

- **DESIGN**: §11.2 を削除し §11 の見出しを「スコープと値源」へ。§11.4 のラダーを 4 段に (「5 段固定」の
  記述も追随)、§3 の代替パターンを §11.4 の default_fn 節に置く。§1.4 フィールド一覧・§9.1 の値源不問の
  列挙・§13 の installers 表・§15 の共露出判定から `inherit` を除去。**§11.2 と §11.3 は欠番**
  (§11 は 11.1 と 11.4 だけになる) — 節番号は他リポと fixture から引用される安定識別子なので詰めない
  (DR-124 の波及節と同じ方針)
- **LOWERING**: §B.7 (inherit installer) を削除、§A のラダー順序記述を 4 段に
- **PIPELINE**: 値源の表から inherit 行、ラダーの mermaid ノードと本文を 4 段に
- **CONFORMANCE**: §2 の `sources` タグ語彙から `inherit`、effects 非掲載の席列挙から `inherit`
- **REFERENCE**: 語彙表と `inherit` 属性節、`cell_fns` 表の `inherit` 行、reasons 表の
  `absent-source` 発生源から `inherit` を除去
- **schema**: `wire.schema.json` の `inherit` プロパティ、`fixture.schema.json` の source enum、
  `builtin-descriptors.json` の `cell_fns.inherit`、`descriptor.schema.json` の cell_fns required 列挙
- **fixtures**: `value-sources/inherit-ladder.json` / `value-sources/inherit-from-ladder.json` /
  `lowering/inherit/basic.json` を削除、`constraints-parse/requires-bool-target-config-inherit.json` を
  inherit 非依存の形へ差し替え。代替の値源経路は borrow 版で取り直す
- **DR-013**: inherit 側も廃止され、DR 全体が Superseded になる (inheritable 側は DR-124)
- **DR-031**: ラダーが 5 段から 4 段へ (inherit 席の削除)
- **DR-042**: canonical installer セットから inherit が抜ける
- **DR-114**: `cell_fns` の住人一覧から `inherit` が抜ける (`borrow` は不変)
- **DR-124 §2**: 代替パターンの綴りが `inherit: {"from": ...}` から `default_fn: "borrow:..."` へ移る
  (パターンの骨格 — 外側に通常 option を置き内側が明示参照する — は不変)
- **DR-081 / DR-087 / DR-088 / DR-098 §5 / DR-123 §2**: 値源席の列挙から inherit が抜ける
- **kuu.mbt / kuu-cli**: inherit installer・decoder・sources タグの追随

## 採用しなかった案

### `inherit` を `borrow` の糖衣として残す

裁定の「やるとしても ref/defaultborrow の糖衣程度」に沿えば `inherit: {"from": "x"}` を
`default_fn: "borrow:x"` へ展開する糖衣は書ける。しかし糖衣も wire 語彙・installer・schema・
descriptor の面を占有し、読み手には 2 通りの書き方として見える。表現力が同じなら綴りは 1 つでよい。

### ラダー席として残し cell fn だけ削る (またはその逆)

席と fn のどちらか一方を残すと「祖先参照は席で書くのか fn で書くのか」が定義ごとに割れる。
重複解消が目的なので片方だけ残す形は採らない。

## 関連

- DR-013 (inherit / inheritable — 本 DR で inherit 側も廃止し、DR 全体が Superseded)
- DR-124 (inheritable の廃止 — 代替パターンの綴りを本 DR が更新)
- DR-031 (値源の優先順位 — 4 段へ) / DR-081 (default 席書き換え) / DR-087 (遅延解決) /
  DR-088 (宣言された値源はデフォルトの存在)
- DR-114 §4 / §8 / §10 (universal fn と `cell_fns` — `borrow` の正本、循環検査)
- DR-042 (installer — canonical セットから 1 件減る) / LOWERING §B.7 (削除対象)
- DESIGN §2.7 (lexical scope chain — §4 の解決規則の出所)
