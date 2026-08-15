# DR-003: name は3軸を兼任、必要に応じて export_key で分離

## 決定

> 注: 以下の 3 軸分類は制定時の理解。現役の軸モデルは DR-024 (3 層分離) → DR-046 (name = 各軸のデフォルト供給源) を参照 (末尾 Superseded も参照)。

`name` フィールドは以下の3つの役割を兼ねる:

1. **CLI マッチング (軸1)**: long opt の `--name` 生成、short opt のもとになる name、command のトリガ name、positional のヘルプ表示 (→ DR-136 で綴り軸 `trigger_name` として分離)
2. **結果 export key (軸2)**: 結果オブジェクトのキー (デフォルト name そのまま)
3. **AST 内部参照 (軸3)**: ref/link の参照対象 (scope 内で参照識別子が重複禁止)

別軸にしたいケースのために独立フィールド:

```json
{
  "name": "FROM",          // 軸3 内部参照 + 軸1 ヘルプ表示
  "export_key": "from"     // 軸2 別キーで export (null で export 抑制)
}
```

- `export_key`: 別キーで export (デフォルト name 流用)。`null` を指定すると export を抑制する (配列要素として扱う)

## 経緯

最初は name の3軸を全部混ぜていて、kawaz から「positional でも名前で export 可能だし、いまいち曖昧」と指摘。

> nameはhelp用に使うだけで取り出しは名無しのリストになって欲しい（--color R G B）とか、ポジショナルでも名前で取り出したい（rsync FROM TO）とかユースケースは色々あると思う。

Claude が `namedExport: boolean | string` のような複合フィールドを提案したが、kawaz から「ユニオン型ダメ、独立フィールド」と。

> exportKey:string 別名を着けたい
> export: false  exportを抑制したい
> の二つをオプショナルで用意するのが素直か?

(この原案の 2 フィールド構成のうち、抑制側 `export: false` は後に DR-052 で `export_key: null` へ統合された。下記 Superseded 参照)

## 効果

- 普通の opt は何も書かなくても自然に動く (name がそのまま使われる)
- 別キーで export したいケースは `export_key` に別名を書く
- 配列要素にしたい (export 抑制) ケースは `export_key: null` を書く
- 3軸が独立した役割を持ち、混乱しない

## 重複ルール

- **参照識別子 (id)** は同一 lexical スコープ (同じ command 配下の options + positionals すべて) で一意
- **露出キー (export_key)** も同じスコープで一意 (DR-120 §1)
- `id` は参照識別子軸の明示指定。一意性が要求されるのは**同一 lexical スコープ内**であって global ではない (解決は lexical 連鎖、DR-006 / DR-046 §2)

> **更新 (kawaz 裁定 2026-08-15): 一意性が要求されるのは `name` ではなく、name が供給しうる各軸の値である。** `name` は各軸のデフォルト供給源 (DR-046 §1) にすぎないので、同名の 2 要素が不正になるのは `id` / `export_key` 未指定のとき name が両軸へ供給され、**参照識別子が重複して ref/link 解決が曖昧になる** (definition-error `duplicate-id`、DR-054 更新 5) か、**露出キーが重複して結果キーが衝突する** (definition-error `export-key-collision`、DR-120 §1) からである。どちらか一方または双方の軸を明示フィールドで割ってあれば、name が揃っていても合法である。

## 関連

- DR-022: フィールド命名規約を snake_case に統一 (= `exportKey`/`export` → `export_key`/`export`)
- DR-024: name の役割を `key name` / `def name` / `value_name` の3層に再整理
- DR-052: export bool 廃止、export 抑制は `export_key: null` に統合
- DR-006: 重複禁止の対象は参照識別子 (id) 軸。スコープはセクション間 (options + positionals) にまたがる
- DR-054 更新 5: 参照識別子の重複を報告する kind `duplicate-id`
- DR-120: 露出キー軸の重複を報告する kind `export-key-collision`
- DR-136: 綴り軸 `trigger_name` の分離と、各軸への供給変換 (軸表の現行正本は DR-136 §1)

## Superseded (歴史)

> 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。

### フィールド命名 `exportKey` / `export` (camelCase) (DR-022 で更新)

> **更新: DR-022 によりフィールド命名規約が snake_case に統一。本文中の JSON 例の `exportKey` は現役仕様では `export_key` と読み替える。`export` は元から snake_case と一致するため変更なし。**

本文中の JSON 例 (`exportKey`, `export`) は当時の camelCase 表記で残してある (判断経緯の原文保持)。現役仕様での綴りは DR-022 を参照。

### export 抑制フィールド `export: false` (DR-052 で更新)

> **更新: DR-052 により `export: false` (bool) フィールドが廃止され、export 抑制は `export_key: null` に統合された。本 DR の「name は 3 軸を兼任、必要に応じて `export_key` で別軸分離する」という判断は引き続き有効。**

本 DR の原案は「別名は `export_key: string`、抑制は `export: false`」の独立 2 フィールド構成だった (「経緯」の kawaz 引用参照)。DR-052 で抑制も `export_key` 側に寄せ (= `null` で抑制)、`export` bool フィールドは削除された。決定/効果セクションの用例は現役仕様 (`export_key: null`) に書き換え済みで、原案の `export: false` は判断経緯としてここに残す。

### 3軸の整理 (DR-024 で更新)

> **更新: DR-024 で `key name` (CLI 表面) / `def name` (定義名・内部参照) / `value_name` (ヘルプ表示用の値プレースホルダ) の3層に再整理。本文の「CLI マッチング / 結果 export key / AST 内部参照」3軸分類は現役仕様ではない。役割を分離するという方針自体は引き継がれているが、各層の名前と境界は DR-024 を参照する。**

### DR-004 への参照 (現役関連から外した経緯)

旧「関連」セクションに記載されていた `DR-004 (3分割を捨てて or で書く方向に)` は、DR-003 の判断 (= name の役割兼任 + 独立フィールドで分離) とは別軸の議論。現役仕様への影響は DR-024 経由で吸収済みのため、現役関連からは外し参照経緯として記録のみ残す。

### CLI マッチング軸 (軸1) の分離 (DR-136 で更新)

> **更新: DR-136 により、CLI 表面の照合綴りは一級軸 `trigger_name` として分離された (name からのデフォルトは kebab(name))。** 本 DR の軸 1 が「name が CLI 表面の綴りを直接供給する」と読める点は現役仕様ではない。short が明示専用であること、positional が入口綴りを持たないことは DR-136 §2 が引き継ぐ。

### name の全軸兼任 (DR-046 で再解釈)

> **更新: DR-046 により name は「目的別名前軸 (id / 結果キー / value_name / display_name) のデフォルト供給源」と再定式化された。本 DR が同定した 3 軸は軸分解の原型として引き続き有効。**
