# DR-016: 結果オブジェクトと ParserContext の2層

> **更新 (DR-130、2026-08-01): 成功 result は実現スコープの宣言キーを全列挙し、値が確定しない座を `null` にする。** ParserContext が詳細状態を保持し、結果オブジェクトが単純な射影である 2 層分離は不変。値の無さを射影でキー削除せず null Value として表す。

## 決定

パース結果は2層構造で取り出せる:

```
パース → ParserContext (詳細状態)
           ↓ convert
         結果オブジェクト (シンプルなビュー)
```

### ParserContext (詳細モード)

各要素について:
- `value`: 現在値
- `default_value`: デフォルト値
- `committed` (or `is_set`): ユーザーが明示指定したか
- `selected`: この要素のいずれかの入口がマッチしたか
- `source`: 値の由来 (値源の種類。DR-031 参照)
- `selected_names`: マッチした入口名 (variant 含む)
- `selected_args`: マッチに使われた CLI 引数の部分集合

### 結果オブジェクト (シンプルモード)

各要素について **値だけ**:
```typescript
result.port    // 8080
result.color   // "red"
result.serve   // { port: 80, host: "..." }
```

通常ユーザーは結果オブジェクトを使う。デバッグ/高度な処理時に ParserContext。

## 経緯

variant の `default` (committed=true) と `unset` (committed=false) の違いをどう表現するかから始まった議論。

kawaz:
> 結果オブジェクトには基本でないが、パース自体の詳細モードだと色々最終的なパースコンテキスト詳細を見れるみたいなのはあって良いと思う。通常はその最終パーサコンテキストを、シンプルな結果オブジェクトにコンバートしてるだけなわけで。

つまり:
- **結果オブジェクト**: 値だけ (ユーザー向けに整形)
- **ParserContext**: 詳細状態 (内部用、明示要求でアクセス可)

## 結果オブジェクトの構造化

name を持つ要素が結果オブジェクトに1階層作る (DR-003):

> **更新 (TRG-Q4=a、2026-08-16): 本 DR 本文の「name がスコープを作る」系の記述は現役ではない。**
> スコープ生成の条件は **解決後の結果キー (`export_key`) 軸の占有**である (DR-025 / DR-033 /
> DR-006 の各更新注記が正本)。`name` は各軸へのデフォルト供給源にすぎず (DR-136 §1)、
> `{"name":"box","export_key":null}` はスコープを作らず、`{"id":"x","export_key":"box"}`
> (name 無し) はスコープを作る。結果スコープと lexical スコープは同じ判定を共有する。
>
> あわせて本 DR の `inheritable` 系の記述は **DR-124 で廃止**、`inherit` は **DR-125 で廃止**
> されている。宿主の参照先も DR-003 ではなく DR-025 (→ 現行条件は上記)。

```json
// CLI: --port 8080
{ "port": 8080 }

// CLI: serve --port 80
{ "serve": { "port": 80 } }
```

- export_key で結果キーを上書き可能 (null で透過、DR-052)

## scope chain でのアクセス

inheritable (DR-013) で書かれた値は、最終的に各インスタンスのフィールドとして焼き付けられる:

```bash
myapp --socket-ttl 60 --upstream --name up1 --socket /s1 --socket /s2
```

結果:
```json
{
  "upstream": {
    "up1": {
      "socket": {
        "/s1": {"path": "/s1", "ttl": 60},   // 親から継承解決済み
        "/s2": {"path": "/s2", "ttl": 60}    // 同
      }
    }
  }
}
```

**パース完了時に scope chain の解決を済ませて結果に焼き付ける**。読み出し時の遅延評価ではない。

## ParserContext での詳細アクセス

```typescript
const parsed = kuu(ast).parse(args);

// 通常使用
const result = parsed.result;
console.log(result.port);

// 詳細モード
const context = parsed.context;
console.log(context.get("port").committed);
console.log(context.get("port").source);
```

`committed`、`source`、`selected_names` 等は ParserContext からのみ参照可能。

## selected vs 値の有無

- **selected**: ユーザーが明示的にこの要素を起動したか
- **値**: 最終結果に出てくる値 (default_value or 消費結果)

両者は別の情報。制約 (required / requires / exclusive_group) がどちらを見るかは DR-047 で確定した (下記 Superseded 参照)。

## 関連

- DR-011 (variant の default/unset の committed 違い)
- DR-013 (inheritable の結果への焼き付け)
- DR-015 (値の発生と伝搬)
- DR-031 (値源の拡張: link/config/inherit)

## Superseded (歴史)

> **更新: DR-031 により本 DR の `source` 語彙が拡張された。本 DR の2層構造 (ParserContext / 結果オブジェクト) と scope chain 焼き付け方針は引き続き有効。**

### source 語彙 (DR-031 で更新)

当初 ParserContext の `source` は値の由来として以下の3値を想定していた:

- `cli` / `env` / `default`

DR-031 で値源が拡張され、`link` / `config` / `inherit` 等が追加された。現役の `source` 語彙は DR-031 を参照。

### required の判定入力 (DR-047 で更新)

> **更新: DR-047 により required の充足判定は「最終状態の値の有無 (default 込み)」に変更。exclusive_group / requires のトリガ側は committed を見る。本 DR の 2 層構造 (ParserContext / 結果オブジェクト) と selected / committed / source の軸定義は引き続き有効。**

元記述: 「`required` などの制約は committed/selected を見る (default_value で埋まっただけでは満たさない)。」

### export (bool) の廃止 (DR-052 で更新)

> **更新: DR-052 により結果キー軸は export_key: string | null の 1 フィールドに一本化。export (bool) フィールドは廃止。**

元記述: 「export: false で抑制可能」
