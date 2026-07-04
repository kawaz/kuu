# kuu ロードマップ — spec-as-core と参照実装

> 本書は kuu 全体の構成方針と実装フェーズの現役計画。個別の設計判断は docs/decisions/ の DR を正本とする。

## 思想: core は仕様と conformance テスト集合

kuu の core は特定言語のバイナリではなく、**仕様 (DESIGN / LOWERING / DR) + API 契約 + conformance fixture (言語非依存のテストデータ集合)** である。各言語の kuu はこの core を実装するネイティブ実装であり、kuu.mbt はその**参照実装 (最初の言語実装)** と位置づける。

理由:

- **バンドルサイズ**: 引数パーサは誰もが依存する基盤であり、1 言語 core の FFI / WASM 同梱は採用判断で致命的なネガ。tree-shake (DR-040) も言語ネイティブでないと効かない
- **各言語の最適化余地**: 1 言語 core は他言語での実装最適化と慣習適合の余地を奪う。言語制約が本質でない内部実装を強いる実例も観測済み (slice PoC 第 16 弾の affix 保持断念)
- **既定路線の帰結**: 効果列 oracle (LOWERING §C.5)・matcher / 効果のデータ化 (DR-042/045)・canonical default の言語中立 (DR-040) は、いずれも実装非依存性のための決定だった

多重保守の重さは以下で抑える: (1) conformance fixture が実装間乖離を機械検出する、(2) 完全な DR コーパスが実装者の判断ブレを防ぐ、(3) 多言語展開は仕様と fixture の安定後 (当面は参照実装 1 本)。

## リポ構成 (単一 git リポ、root の empty commit から生える独立枝群)

| 枝 / ws | 役割 |
|---|---|
| `ast-spec` | **仕様正本 + 議論の場** (実装を置かない)。AST 仕様・エンジン契約 (DESIGN §15)・API 契約 (parse_definition = DR-054 / parse = DR-053 / complete = DR-060)・conformance fixtures (フェーズ 1-2 で新設)。仕様 DR (3 桁) の正本 |
| `main` (新設) | **MoonBit 参照実装**。ゼロから構築。実装 DR は別番号空間。ast-spec を仕様正本として参照する |
| `kuu-v0` (旧 main を改名) | 初期実験場のアーカイブ。旧実装コードは考古学対象 (直接読まない運用は継続) |
| `slice` | 垂直スライス PoC (167 テスト、凍結)。conformance fixture の蒸留元 |

## フェーズ

0. **ast-spec cleanup**: DR corpus cleanup runbook を 1 回実行 (DR-047〜060 の積層で INDEX 分類・旧記述の整理が未追従)。旧 main の kuu-v0 改名・新 main 枝の作成もここで
1. **直列形の確定 + fixture フォーマット設計**: AtomicAST の concrete JSON (greedy マーク・matcher データ・効果記述子の直列形 = DR-039 の宿題)、JSON Schema の実体化 (F-042 invariant / F-048 lifecycle をここで解消)、conformance fixture のフォーマット (定義 + argv + 期待効果列 / 結果。期待値の厳密度 — byte 厳密 vs 意味論 — が主論点、DR-040 の方言 spec 精度問題と接続)
2. **fixture 蒸留**: slice の 167 テストを言語非依存 fixture へ蒸留。効果列 oracle (LOWERING §C.5) を判定器として fixture runner の契約を定める
3. **参照実装 (新 main)**: fixture を pass させる形で構築。実装順は lowering 層 (記法糖衣 → installer 不動点 → 定義時検査) → 評価器 (path-search + matcher + 背骨 / 先食い / 早閉じ + 取り分選好。**完成オラクルのスコープ境界相対化の根治**と **pending 状態を表現する枝設計**が主要な実装設計論点 — PoC の既知の破れ / 分離判断が入力) → 値確定層 (ラダー + config 2 相 + 遅延述語 + 結果ビルダー) → 出口層 (Outcome + 失敗時アクション + complete)
4. **DX 層**: MoonBit UsefulAST DX、help レンダラ (registry 差し替え可)、completion 生成器 (DR-060 の層 2 — 各 shell の作法をここに封じる)
5. **多言語展開** (仕様安定後): TS 等。移植の定義は「fixture を pass させる」

## テスト戦略

- **conformance fixture** (言語非依存データ) が仕様準拠の正本。全実装が共有
- 参照実装固有のテスト (内部構造・性能) は新 main 側に置く
- fixture の意図コメント (なぜこの入力・なぜこの期待、DR 根拠) は fixture データに同梱する — テスト = 真の仕様書の原則を fixture 形式でも維持する

## 関連

- docs/DESIGN.md (現役仕様の単一ソース) / docs/LOWERING.md (糖衣カタログ)
- docs/decisions/ (仕様 DR、3 桁番号空間)
- docs/runbooks/2026-06-26-dr-corpus-cleanup.md (フェーズ 0 の手順)
- slice ws docs/journal/2026-07-02-slice-poc.md, 2026-07-03-slice-poc-5.md (PoC 実測の経緯)
