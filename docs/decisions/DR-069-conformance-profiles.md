# DR-069: 準拠プロファイル — 段階準拠と実装要求レベルの分離

> 由来: codex 方向性レビュー (2026-07-05)。DR-068 の「準拠 spec バージョンを 1 つ宣言」が all-or-nothing で、多言語実装が段階的に準拠を積む姿を表現できない問題と、descriptor インフラ (DR-061/066) の実装コストが parser 本体を押し上げる懸念への応答。

## 決定

### 1. 準拠はプロファイル単位で宣言する

実装は spec バージョン + 準拠プロファイルの組を宣言する:

| プロファイル | 内容 | fixture |
|---|---|---|
| `parse-core` | wire を読み parse を実行、outcome を再現 | query: "parse" |
| `lowering` | parse_definition の決定的 lowering を再現 | query: "lower" (DR-070) |
| `definition-error` | 定義時検査 (DR-054) を再現 | query: "definition_error" |
| `completion` | complete クエリ (DR-060) を再現 | query: "complete" |

parse-core は全実装必須の最小プロファイル (lowering を内包する — wire が宣言層 (DR-063) なので parse には lowering 実装が要る。lowering プロファイルは lowered 断面の緩比較까지検証する強い準拠)。他は opt-in。「kuu 準拠」を名乗る最小条件は parse-core green。

> **更新 (DR-112 §11、2026-07-18): `help` プロファイル (query: "help"、help query の再現、fixtures/help/) が opt-in として追加され、プロファイルは 5 つになった。** spec の v1.0.0 発行条件も 5 プロファイル全 green に改訂 (DR-108 §3 の note 参照)。実装の準拠名乗り最小条件 (parse-core green) は不変。

### 2. descriptor の実装要求レベル

conformance の成立に必須なのは **owns (unknown-vocab 判定) と reasons (fixture の reason 検証)** の 2 軸のみ。**observes と configurable factory の一般適用 (types 以外) は canonical 実装の装備**であり、準拠実装には要求しない (lint / diagnose / L10n 素材は品質の関心で準拠の関心ではない)。仕様としては DR-061 の全軸が確定済みのまま — 分けたのは実装への要求レベルであって仕様の地位ではない。

## 採用しなかった案

### observes / factory を experimental に降格

仕様の地位を落とすと canonical 実装と DX 層の設計根拠が失われる。問題は仕様の確度でなく実装要求の重さなので、要求レベルの分離で足りる。

### プロファイルなしの all-or-nothing 維持

completion まで含む全実装を最初から要求すると移植の敷居が上がり、多言語展開 (フェーズ 5) の実効性を下げる。

## 関連

- DR-068 (lifecycle — 準拠宣言の単位を本 DR が細分化。DR-108 明確化 note が「実装の準拠名乗り (本 DR) vs spec の v1.0.0 発行条件 (DR-068)」の別軸整理を追記)
- DR-061 / DR-066 (descriptor — §2 の要求レベル分離の対象)
- DR-063 (宣言層 wire — parse-core が lowering 実装を内包する根拠)
- ROADMAP (フェーズ 2 再構成と同時決定)
- DR-108 (spec リリースプロセス — v1.0.0 発行条件は本 DR の 4 プロファイル全 green、V1-Q1=b)
