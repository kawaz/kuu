# DR-015: 値の発生と伝搬の構造的セマンティクス

## 決定

AST 要素の値の決定は **構造的セマンティクス** (値が tree を下から上に流れる) で表現する:

| type | 値の発生 | 親への伝搬 |
|---|---|---|
| primitive (`string`/`number`/...) | `value` 持つなら literal、無いなら CLI から1引数消費 | 自身の値を親に渡す |
| `exact` | `value` 持つなら literal、無いなら値なし | 値があれば親に渡す |
| `or` | 選ばれた子の値 | 子の値をそのまま伝搬 |
| `seq` / children sequence | 子の値の配列 (or 単独要素なら単独) | 配列または単独値を親に伝搬 |

消費数は値の発生とは別軸である。**消費数は Accept の報告値であり、value の有無から導出しない** (DR-041 §3): `value`
を持つ literal は消費 0 が既定、value を持たない primitive は CLI から 1 トークンを消費する (構造位置の裸
リテラルの照合消費は DESIGN §5.2 / LOWERING A.1・A.3)。`default` は消費数を変えない — 位置に依らず値源ラダーの席
であり (CHILDDEF-Q1=b、DR-031)、default を持つ子も通常どおり消費を試みる。

構造位置の裸リテラルは照合消費 + 値産出ノードのシュガー (DESIGN §5.2 / LOWERING A.1・A.3):
- `"red"` → `{"exact": "red"}` (消費 1、値 "red" を産出)
- `255` → number として照合消費 (値 255 を産出)
- `true` → bool として同様

非消費の literal (トークンを照合せず値だけ持つ) は `value:` フィールド経由でのみ書く。

## 経緯

kawaz の整理:
> valueを持ってる要素が値を持つ。親に伝搬。

これで or の意味論が明確になる:

```json
{
  "name": "color",
  "type":"or",
  "children": [
    {"type":"exact", "name":"--no-color", "value": {"type":"string", "value":"none"}},
    {"type":"seq", "array": false, "children": [
      {"type":"exact", "name":"--color"},
      {"type":"or", "children": [
        {"exact":"none"},
        {"exact":"always"},
        {"exact":"auto"}
      ]}
    ]}
  ]
}
```

- 子のいずれかが消費される
- 消費された子が値を持てば、それが or に伝搬
- 親 (この場合 color という name) に最終値が入る

## variant が自然に表現される

`long: ["no:set:none"]` の variant は:

```json
{
  "name": "color",
  "long": ["no:set:none"]
}
```

これは AtomicAST で:

```json
{
  "type": "or",
  "name": "color",
  "children": [
    /* --color X 入口 */
    {
      "type":"exact",
      "name":"--no-color",
      "value": {"type":"string", "value":"none"}
    }
  ]
}
```

`--no-color` の exact がマッチすると `value: "none"` の literal が発生、or に伝搬、color の値になる。

`set` 相当の効果は `value` フィールドに literal を埋めるだけで表現される (効果記述子の縮退形)。`default` / `unset` / `empty` は literal では表せず、効果記述子 (DR-045) が担う。

## リテラルもシュガー

```json
"values": ["red", "green", "blue"]
```

正規形 (各要素は照合消費の exact — 非消費の literal では enum にならない、DESIGN §5.3):
```json
{"or": [
  {"exact": "red"},
  {"exact": "green"},
  {"exact": "blue"}
]}
```

## values と children の意味分離

- `children`: 起動後に順次消費する子要素群
- `values`: その要素の取りうる値の選択肢 (or のショートハンド)

`values` 内の要素が or 構造のブランチに、各リテラルが exact マッチに展開される。

## あと勝ち mutation

値プレースホルダーは型のゼロ値/null で初期化、CLI 入力順に mutation:

```bash
--since A --timerange 'X..Y' --since B
# 1. since_value = A
# 2. timerange でセット → since_value=X, until_value=Y
# 3. since_value = B (最後勝ち)
# 最終: since=B, until=Y, timerange=[B, Y]
```

複雑な競合解決ルール不要、CLI 入力順がそのまま勝者。

## count の特殊扱い

count はこの構造的セマンティクスでは表現できない (現在値依存の increment は accumulator の仕事)。

- flag: `value: true` の literal でセット (構造的)
- count: accumulator が `(current) => current + 1` を担う (非構造的、reduce)

count だけ特殊だが、count は「type=count のシュガー」として隠蔽されるので、AST 全体の構造的セマンティクスは保たれる。


> **更新 (DR-139 / DR-140、2026-08-16): 座席名・`multiple` 属性・`value:` の綴りは値カプセルへ
> 移送される。** 座席は DR-102 の 4 綴りを経て DR-139 §1.2 のカプセル内 5 座席へ、`multiple` 属性は
> DR-139 §5 で廃止 (cardinality はカプセルの座から導出)、消費 0 literal の `value:` は
> DR-140 §2 の `const` field へ、供給 (`default` / `env` / `config_key` / `default_fn`) は
> DR-139 §1.1 の `defaults` へ集約される。本 DR の**判断**は綴りの下で生きている。移送の作業単位は
> `docs/research/2026-08-16-value-capsule-migration-ledger.md`。

## 関連

- DR-005 (type の子からの伝搬)
- DR-011 (variant DSL の本質)
- DR-034 (accumulator)

> **更新 (2026-07-26)**: 表中の `seq` の「単独要素なら単独」は撤回された。**要素数によらず常に配列**である
> (kawaz 裁定: 利用者が `seq` と書いたなら結果は配列。配列でない値が欲しければ `seq` を使わずに定義する話であって、
> kuu が要素数を見て構造を作り替えるのは越権)。結果キーを持つ子が 1 つでもあれば代わりに 1 個の kv になる (DR-120)。
> 現役の規定は DESIGN §5.1、pin は `fixtures/seq-parse/`。
