# DR-002: すべての要素は同型である (CLI 慣習用語はシュガーへの愛称)

## 決定

AST の要素は本質的に同型で、以下の属性の組み合わせで表現する:

| 属性 | 値の例 |
|---|---|
| トリガ形式 | name で起動 / 位置で消費 / 無条件マッチ |
| 値の生成 | 自身が literal / 引数を消費して生成 / 子から伝搬 |
| 子要素を持つか | yes (children) / no |
| スコープ範囲 | 結果オブジェクトの1階層を作る (= name を持つ) / 素通し |

「フラグ」「long オプション」「サブコマンド」「positional」などの CLI 慣習名は、これらの組み合わせの特定パターンへの**愛称**に過ぎない。

| 慣習名 | トリガ | 値 | 子 | スコープ |
|---|---|---|---|---|
| フラグ `--verbose` | `--verbose` の exact | literal true | no | name で1階層 |
| long opt `--port 80` | `--port` の exact | 引数1個消費 | no | name で1階層 |
| subcommand `serve --port 80` | `serve` の exact | 子の結果集約 | yes | name で1階層 |
| count `-v -v -v` | `-v` の exact | accumulator | no | name で1階層 |
| positional `<FILE>` | 位置 | 引数1個消費 | no | name で1階層 |

## 経緯

Claude が当初「サブコマンドは特別な type」と整理していたところ、kawaz から忖度なしで再考を依頼された:

> 僕のイメージだとサブコマンドは名前を持つ事が特殊とは思えなくて、long オプションは、--(name) というexactと値(引数または自身完結のフラグやカウンタ)を生んで結果からはnameでアクセス出来るでしょってなと違いがあまり無い気がするんだけど。

これで気付いたのは、Claude が「CLI ユーザーの慣習的な分類」(フラグ/オプション/サブコマンド/positional) を AST type の語彙に持ち込んでいたこと。これは表面的な分類で、構造的には全要素が「name でトリガする可能性のある、children を持つかもしれない要素」として同型。

## 効果

- 「サブコマンドは特別」という暗黙の先入観が消える
- 構造プリミティブと慣習名 (愛称) が明確に分離される
- 慣習名で書きたいユーザーは糖衣プリセットを使える (別レイヤー。具体的な表現形式は DR-028 を参照)

## 関連

- [external: kuu.mbt DR-053] (primitive decomposition) と同じ発想
- 結果オブジェクトの構造化ルール「name を持つ要素が1階層作る」も同じ原理

## Superseded (歴史)

> **更新: DR-028 により type 3カテゴリ (値型 / 挙動シュガー / 慣習名) が廃止され、flag/count/command は type 値ではなく別レイヤーの糖衣プリセットに変更。本 DR の「全要素は同型」という決定 (トリガ/値/子/スコープの組み合わせで表現し、CLI 慣習名はその特定パターンへの愛称) は引き続き有効。**

DR-028 以前は、同型性を「type 語彙の2軸整理 (値型 + 挙動シュガー)」として表現し、慣習名を type 値のシュガーとして提供していた。当時の派生記述:

- `type: "command"` は seq + exact のシュガー
- `type: "flag"` は boolean + 起動時 true セットのシュガー
- `type: "count"` は number + increment accumulator のシュガー
- long の variant は or + exact のシュガー (variant 用文字列 DSL は便利のため残す)

DR-028 でこの type 値ベースの糖衣は廃止され、flag/count/command は type 値でなく糖衣プリセットの別レイヤーへ移された。

> **更新: DR-017 により本同型性の適用範囲が AtomicAST に限定。本 DR の同型性の洞察 (慣習名は愛称) は引き続き有効だが、その射程は AtomicAST 層に限られる。**
