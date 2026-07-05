# DR-068: JSON Schema と仕様バージョンの lifecycle

> 由来: findings F-048 (JSON Schema の確定版発行タイミング・breaking change 手続きが未定義)。DR-063 で wire form が確定し、Schema が写像すべき対象 (DR-067 の構文層) が定まったため lifecycle を確定する。

## 決定

### 1. 確定版 (v1.0.0) の発行条件 = 参照実装が conformance fixture を green にした時 (フェーズ 3 完了)

spec-as-core の筋: 仕様は fixture で実証されて初めて確定と呼べる。フェーズ 2 (蒸留) 完了時ではなく、**参照実装 (kuu.mbt 新 main) が fixture 全 pass した時点**で spec バージョン v1.0.0 と JSON Schema 確定版を同時発行する。それまでは**ドラフト期** — 現行の DESIGN §0.1 宣言 (「共設計段階、全域で破壊的変更を許容」) がそのまま生きる。

### 2. バージョンの単位は「kuu spec」全体 (Schema 単独でバージョンしない)

バージョンが指すのは **DESIGN + LOWERING + CONFORMANCE + fixture 集合 + JSON Schema の一体** (spec バンドル)。fixture はバージョンに同梱され、言語実装は「準拠 spec バージョン」を 1 つ宣言する (Schema と fixture のバージョンがずれる状態を作らない)。

### 3. 確定後の変更規則 (semver)

| 変更 | レベル | 備考 |
|---|---|---|
| 意味論の変更 (同じ wire の解釈が変わる) | **major** | fixture の期待値が変わる変更は全てここ |
| フィールド / 語彙の削除・改名 | **major** | |
| 語彙の追加 (新 installer 語彙・新フィールド) | **minor** | 旧実装は新語彙入り定義を unknown-vocab Error で**正しく拒否**する (黙って無視しない)。「minor = 旧実装がそのまま読める」ではなく「minor = 新語彙を使わない定義の挙動が不変」 |
| reason 語彙・組み込み registry 住人の追加 | **minor** | 既存 fixture に影響しない |
| fixture の追加 (輪郭の増強、期待値変更なし) | **patch** | |
| 文書の明確化 (挙動不変) | **patch** | |

変更手続きはドラフト期・確定後とも同一: **DR 起票 → DESIGN/LOWERING/CONFORMANCE 反映 → fixture 追従** (ドラフト期はバージョン番号を持たず、確定後はこれに semver 判定が加わる)。

### 4. $schema URI

- ドラフト期: Schema ファイルはリポ内 `schema/` に置くが `$id` は与えない (参照は repo 相対)
- 確定後: バージョン付き URI (`https://kuu.kawaz.org/schema/<version>/wire.json` 形式、具体ホストは発行時に確定) を `$id` に与える。definition 側の `$schema` 記載は**任意** (書けば検証ツールが使う。無くても語彙層検査 (DR-067) が実効的な互換性検査になる)

## 準拠宣言はプロファイル単位へ細分化

> **更新: DR-069 により、実装の準拠宣言は「spec バージョン + プロファイル (parse-core / lowering / definition-error / completion)」の組になった。バージョン単位がバンドル一体である点は不変。**

## 採用しなかった案

### フェーズ 2 (蒸留完了) 時点での確定版発行

fixture が揃っても、それを pass する実装が存在しない段階では「fixture 自体の誤り」(期待値の書き損じ・仕様の矛盾) が検出されていない。実装との突き合わせが仕様の実証。

### Schema の独立バージョニング

Schema・fixture・文書のバージョンがずれた組合せが生まれ、「準拠」の意味が曖昧になる。バインディングの参照管理 (F-048 項目 4) もバンドル単位が最も単純。

### 「フィールド追加 = 後方互換 (旧実装は無視して読める)」

黙った無視は typo 検出 (unknown-vocab) を殺し、新語彙の意味論を欠いたまま誤って動く。拒否で立ち止まる方が安全 — 互換性の定義を「読める」でなく「既存定義の挙動不変」に置く。

## 射程外

- Schema ファイルの実体書き出し (DR-067 構文層の写像、ドラフトとして schema/ に置く作業)
- ホスト URI の確定 (発行時)
- 多言語実装の準拠宣言フォーマット (フェーズ 5)

## 関連

- findings 2026-06-29-ast-missing-pieces.md F-048 (解消)
- DR-067 (Schema が写像する構文層)
- DR-063 (wire form) / DR-061 (語彙層検査 = 実効的な互換性検査)
- DESIGN §0.1 (ドラフト期宣言) / ROADMAP (フェーズ 3 = 参照実装)
