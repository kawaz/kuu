# DR-011: variant の文字列 DSL とオブジェクト形式

## 決定

long の variant (`--no-X` のような同 opt の別入口) を以下で表現:

### 文字列 DSL (シンプルケース)

```
"<prefix>:<effect>[:<arg1>[:<arg2>...]]"
```

例:
- `"no:set:false"` — `--no-<name>` で false をセット
- `"no:set:none"` — `--no-<name>` で "none" をセット
- `"no:default"` — default_value に戻す (committed=true)
- `"no:unset"` — default_value に戻す (committed=false)
- `"reset:empty"` — 配列/Map を空に
- `"red:set:rgb:255:0:0"` — `--red-<name>` で複合値をセット

### オブジェクト形式 (複雑なケース)

```json
{
  "prefix": "red",
  "effect": "set",
  "args": ["rgb", "255", "0", "0"]
}
```

`args` はすべて **string** (CLI 引数パースと同じ手順を通す)。

## effect 語彙 (4種)

| effect | args | 意味 |
|---|---|---|
| `set` | 1個以上 (string[]) | 固定値をセット |
| `default` | なし | default_value に戻す (committed=true) |
| `unset` | なし | default_value に戻す (committed=false) |
| `empty` | なし | 配列/Map を空に |

## 経緯

### kuu 現状の Variation enum

```moonbit
pub enum Variation {
  Toggle(String)    // --{p}-{name}: !current
  True(String)      // --{p}-{name}: 常に true
  False(String)     // --{p}-{name}: 常に false
  Reset(String)     // committed=true で default に
  Unset(String)     // committed=false で default に
}
```

これを AST 仕様に落とすにあたって整理:

### Toggle の排除

「主名 (`--ssl`) を繰り返してトグル」のような挙動は CLI 慣習として薄い。kawaz:
> toggle:not とかでなく--ssl を重ねてトグルなんてある?まぁやるならpreconverter系フィルタで実現とか?

→ toggle は排除。

### True/False の統一

`Variation::True("force")` は `set:true` と等価、`Variation::False("no")` は `set:false` と等価。`set:<value>` で統一。

### Reset と Unset の差は committed

`default` (committed=true) と `unset` (committed=false) で残す。committed の差は値源ラダーの後段上書き可否 (DR-045) と exclusive_group / requires トリガの判定 (DR-047) に影響する。

## "no" ショートハンドは入れない

kawaz:
> noショートハンドとかは要らない。アプリによってnoの挙動は結構まちまちでコンセンサスがあるとは思えないので明記が良い。

`"no"` 単独で「自動で何かする」ようなショートハンドは入れない。常に `"no:set:false"` のように明示書き。

## args は string[] (引数パースと同じ手順)

オブジェクト形式の `args` も文字列 DSL の `:` 区切り部分も、すべて **string** で渡す。

kawaz:
> オブジェクト形式はprefixやeffectは問題ないけどargsはstring[]であるべきかな。引数パースと同じパース（なんならフィルタなどもあるだろうし）手順を経る方が一貫性がある。nullとか入れられても逆にそれは引数だとなんなの?空文字とは違うよね?みたいなことなるよね。

これで:
- variant で `set:none` が `--<name> none` の入力と等価な経路を通る
- value 型のパース・filter チェーンが variant にも自然に効く
- AST の同型性 (variant も普通の CLI 入力もデータパスが同じ)

## variant は AtomicAST で消える

variant 構造は **AtomicAST には残らない**。parseDefinition() の時点で:

```json
// UsefulAST
{"name": "color", "long": ["no:set:none"]}

// AtomicAST 展開後
{
  "type": "or",
  "name": "color",
  "children": [
    { /* 主名 --color X の入口 */ },
    {
      /* --no-color の入口 */
      "type": "exact",
      "match": "--no-color",
      "value": {"type": "string", "value": "none"}
    }
  ]
}
```

`set` 効果の variant は **exact + literal value 発生**に展開され、構造としては消える。

## 関連

- DR-009 (filter chain は同じ文法を使う)
- DR-022 (value オブジェクトの snake_case フィールド命名: `default_value`)
- DR-045 (非-set 効果の lowering を担う効果記述子)

## Superseded (歴史)

> **更新: DR-045 により、非-set 効果 (`default`/`unset`/`empty`) の lowering が exact + literal value 展開から効果記述子 (effect descriptor) に変更。本 DR の `set` 効果の exact + literal value 展開、variant の文字列 DSL / オブジェクト形式 / effect 語彙 (4種) の定義は引き続き有効。**

> **更新: DR-022 により、value オブジェクトのフィールド命名が camelCase から snake_case に変更 (`defaultValue` → `default_value`)。本 DR の variant DSL / effect 語彙の定義は引き続き有効。**

> **更新: DR-071 により long は bool | variant 配列の二形になり、主入口は `:set` (prefix 空文字列) としてリストの一級要素になった。`set` の effect に args なし形が追加: args なし = 値スロット (主入口。非消費 type では type 相応の固定値供給)、args 1 個以上 = 固定値 (本 DR の定義どおり不変)。`"set"` 単独 (`:` なし) は文法エラーのまま。**

> **更新: DR-077 により effect 語彙に `update` が追加 (5 語目)。`"<prefix>:update:<transform>[:args...]"` — transform は filters registry の T=>T エントリ名前参照。本 DR の 4 effect の定義は不変。**

> **明確化 (kawaz 裁定 2026-07-08): colon を含まない文字列 (例 `"verbose"`)、および effect 位置が語彙外 (`set`/`default`/`unset`/`empty`/`update` (DR-077) 以外) の文字列は、いずれも variant DSL の文法エラーで definition-error `unknown-vocab` (DR-054) に落とす。「colon 無し = literal 綴り指定」という解釈は不採用 — 実体名と異なる綴りの入口は DR-057 の alias 独立要素で書く (DR-057 が canonical 側リストを不採用にしたのと同根: 綴り指定の関心を long 配列へ二重表現しない)。文法エラーを literal 綴りへ fallback させると定義 typo が「マッチしない入口」として黙って通る (DR-054 の機械検出思想の逆行) ため、fallback も不採用。**
