# DR-023: 構造プリミティブの確定形 (4プリミティブ + multiple 属性)

## 決定

トップダウン再設計の結果、構造を構成する要素を以下に確定する。

### 構造プリミティブ (4つ)

| プリミティブ | 役割 | 値の伝搬 |
|---|---|---|
| `primitive` (string/number/int/...) | 値の型。引数1個消費 or value literal | 自身の値を親へ |
| `exact` | name の完全一致でトリガ | value あれば literal を親へ、なければ値なし |
| `or` | 子から1つ選択 (排他) | 選ばれた子の値を親へ |
| `seq` | 子を順次消費 | 子の値の配列 (単独要素なら単独) を親へ |

### 値属性 (要素に付く)

| 属性 | 役割 |
|---|---|
| `multiple` | 値の畳み (option の複数回発火が生む値列を積む)。反復回数は repeat が担う (DR-043 で分離) |
| `value` | literal 値 (持てば exact/primitive が値を発生) |
| `values` | or の選択肢ショートハンド (DR-015) |

### 定義時の糖衣 (1級語彙)

UsefulAST でユーザが書く糖衣。AtomicAST で上記プリミティブへ展開:

| 糖衣 | 展開 |
|---|---|
| `command` | name でトリガ + 子要素をスコープ (exact + or/seq の組) |
| `flag` | boolean + default false + 起動で true セット |
| `count` | number + default 0 + 起動で increment (accumulator) |
| `commands` | 素の positionals と排他 (or 相当)。具体 lowering は DR-041/042 の greedy 背骨 (DR-018 現役文と同じ) |
| `option` / `positional` | 配置 (所属配列) で決まる、type 省略可 (DR-018) |
| `help` | 起動時に ParserContext の help フラグセット |

## この構成に至るまで

トップダウン再設計で確定した骨格:

1. command は定義時1級、パース時同型 (DR-017)
2. 配置で区別、commands は or 糖衣 (DR-018)
3. repeat を multiple に統合、4プリミティブ化 (DR-019)
4. 復帰/途中分岐は専用概念を持たずプリミティブで組む (DR-020)
5. キー名 snake_case、case 変換 pluggable (DR-022)

これらにより、前回ボトムアップでは表現できなかった `rm path...` / `mv a b c dst` / `cp src... dst` / 途中分岐 command が、すべて4プリミティブ + multiple + 糖衣で書けるようになった。

## 2層 AST との対応

```
UsefulAST (定義時):  command/option/positional/flag/count/commands を1級で書く
    ↓ 展開 (type 省略の復元・糖衣展開)
AtomicAST (パース時): primitive/exact/or/seq + multiple 属性の同型表現
```

定義時の配置主軸・type 省略と、パース時の同型は、**type の省略/復元**で繋がる (DR-017)。

## 関連

- DR-001 (2層 AST)
- DR-002 (同型)
- DR-015 (値の伝搬)
- DR-017〜020, DR-022 (本セッションの決定群)
- DR-026 (`exact` の葉再分類)
- DR-027 (`serial` → `seq` 改名)
- DR-034 (`multiple` の内部表現再構成)
- DR-038 (パース契約の再定式化)
- DR-039 (AtomicAST 単独確定方針の廃止)
- DR-043 (repeat と multiple の分離)

## Superseded (歴史)

> **更新: 本 DR の以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。本 DR の「4プリミティブ + multiple 属性 + 糖衣展開」という骨格自体は引き続き有効。**

### `serial` → `seq` 改名 (DR-027 により本 DR の用語 `serial` が `seq` に変更。役割は不変)

本 DR 本文中の `serial` プリミティブは、DR-027 で `seq` に改名された (子を順次消費し配列を親へ伝搬する役割は不変)。本ファイル現役上半分の表記は `seq` に更新済み。`serial` は廃止語。

### `multiple` の中身 (DR-034 により本 DR の `multiple` 内部表現が再構成。枠組みは有効)

「repeat を multiple に統合」した本 DR の整理は枠組みとして維持されているが、`multiple` の内部表現・適用ルールは DR-034 で再構成された (pieceProcessor + separator + accumulator + collector の4段)。詳細は DR-034 を参照。

### `repeat` と `multiple` の分離 (DR-043 により本 DR の「repeat を multiple に統合」が部分的に覆され、repeat/multiple が別概念に分離)

本 DR は「repeat を multiple に統合」して4プリミティブ化した (DR-019 由来、本文「この構成に至るまで」3.、および値属性表の `multiple` 行)。DR-043 でこの統合が部分的に覆され、以下の 2 概念に分離された:

- **repeat (構造閉包)**: 「同じ要素を複数回」という反復構造。再帰 ref への lowering で表現され、min/max は path-search の枝生成に効く構造制約。
- **multiple (値の畳み)**: option の複数回発火などが生む値列を積む DR-034 のパイプライン (separator / accumulator / collector)。出現回数・位置の制約は持たない。

この分離により、値属性表の `multiple` 行から「positional の個数」「repeat はここに統合」の面は更新された (反復個数は repeat が、値の畳みは multiple が担う)。DR-019 の「repeat を独立構造要素にしない (要素属性で表す)」判断自体は引き続き有効で、本 DR の「4プリミティブ + multiple 属性 + 糖衣展開」骨格のうち multiple 属性自体も有効。詳細は DR-043 を参照。

### `exact` の位置付け (DR-026 により本 DR の `exact` がプリミティブから葉要素に再分類。役割自体は不変)

本 DR は `exact` を「構造プリミティブ4つ」の1つとして並列に列挙していたが、DR-026 で `exact` は葉要素 (リテラル一致) として再分類された。`primitive`/`or`/`seq` の3つが構造プリミティブ、`exact` は葉、という位置づけが現役。本 DR 上半分の表は当時の理解として残置。

### 最長一致パースの前提 (DR-038 により「最長一致」契約は廃止)

本 DR は当初「最長一致パース、露出キー一意性は実行時、warn はする (DR-021)」を骨格 (旧 5.) の一部として含めていた。DR-038 で「最長一致」規則は廃止され、契約は「完全経路の一意性」(bounded path-search) に置換された。本 DR 上半分の「この構成に至るまで」リストから旧 5. (DR-021) を除去済み。

### 残る作業 (DR-039 により本 DR 末尾「残る作業」リストの全項目が陳腐化)

本 DR 末尾には以下の宿題が積まれていた:

- AtomicAST の正規形変換規則の網羅
- values 展開ルールの正式仕様
- or の細則: scope を作るか、name 重複
- これらが固まれば JSON Schema 発行

DR-039 でこの「AtomicAST を単独で仕様確定してから実装する」方針自体が廃止され、垂直スライスで実装と共設計しながら削り出す方針に変更された。JSON Schema 発行は最後の工程と再定義された。当時の参照先 (CONTEXT.md および「論点 A〜M」) は journal 削除に伴い既に無効。
