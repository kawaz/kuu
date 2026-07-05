# フェーズ 2-②: lowering golden fixture の整備完了 (2026-07-05)

ROADMAP フェーズ 2-② (lowering conformance) の spec 側資産の整備記録。パイロット (long) → shape パイロット 4 種 → 量産 7 agents 並列 + 横断 verify、の 3 段で実施。

## 成果

- **fixtures/lowering/ 全 18 本** — 単独 installer 全種 (long×2 / short / dd / env / inherit / multiple / repeat / config / constraint×2) + 組合せ (command+long / global+long / inheritable+long / alias×2) + baseline (installers:[] の恒等境界 / 全収束 kitchen-sink)。横断 verify で golden 値の spec 逸脱ゼロを確認
- **schema/wire.schema.json** — DR-067 構文層のドラフト (\$id なし)。全 fixture definition + 合法/違反サンプルで実 validate 済み
- **断面表記の確定** (DR-063 §3 に集約): 5 面構造 {greedy, positionals, entities, constraints, templates} / 席宣言は宣言層の属性名を流用 (env / inherit / config_key / accumulator) / 入れ子は {exact, scope} / templates キーは `#` 予約 (ref 解決の一意性) / golden は正規形 (ref+link) で統一 / short は matcher 単独被覆 (LOWERING §B.2 を実測確定に追従) / global の root マークは不要 (lexical 解決に内包) / dd は素 exact (sever は宣言層 + 効果列 oracle の関心)
- **DR-064 §5**: dd プリセットが name デフォルト "--" を供給 ({type: "dd"} が canonical)、name はトリガ綴り軸限定、export_key は無効果 (absent)
- **既知 gap 台帳を DR-070 §1b に正式化** (5 件): flag preset default 未降格 / long:[] present-empty / reason 未実装 / dd spurious entity (options 配置) / global 子 entity 残存。後ろ 2 件は量産の写像実測で新発見 → slice issue 2026-07-05-lowering-entity-generation-gaps 起票済み

## 教訓

- パイロット → 規約確定 → 量産の 3 段が有効だった。写像規約 (D1〜D8) の大半はパイロット 1 本で出て、量産 7 本は既存型の反復 + 新表記 3 点 (constraints 面実例 / config_key 席 / snake→kebab 初適用) に収まった
- codex review gate が「DR-063 更新 → 参照先の追従漏れ」を 3 巡捕捉。断面規約の変更は LOWERING §0/§B/§C・DESIGN §15.7・既存 fixture の why まで横断掃除が必要という型
- 「golden は仕様準拠値 (実測ミラーでない)」の原則 (DR-070 §1b) が量産で効いた — slice 未追従箇所が全て KNOWN GAP として台帳化され、fixture の期待値は汚れなかった

## runner 実働化の完了 (同日追記)

- **lower query runner 実装 + 18 fixture 全 pass**: installers 部分適用 / canon → 5 面断面射影 (inline → ref+link collapse) / 緩比較 (故意破壊実験で過剰吸収でないことを実証) / 決定的 3 順列検査。moon test 200/200
- **gap 台帳 4 件解消** (旧 1/2/4/5): flag preset default 注入 (parse fixture の dd 8 cases も完全一致に)、long presence の Option 化 (absent / present-empty 区別 — LOWERING §B.1 の要点)、dd spurious entity、global 子 entity。残存は reason 未実装と alias add-if-absent の 2 件のみ
- **実食が新バグを 1 つ検出して即修正**: absent long conflation (present-empty 修正の初版が absent にも --name を発明、6 fixture divergence として検出) — 「fixture 実食が実装バグを検出する」ループが lower 側でも実働した
- codex フェーズ 2-② レビュー 7 指摘反映済み (name にも `#` 予約 / 面配列の順序規範 / 台帳一元化 等)
- **parse 8/8 + lower 18/18 の両クエリで conformance が実働** — フェーズ 2 の骨格完成。slice push 済み (41eb1cdb)

## 次

- long フィールドの責務混載 (presence + 主入口 + variants) の設計見直し検討中 — kawaz 提起、codex 検討並行中。B 案 (long: bool + variants 分離、presence 罠の構造的消滅) が有力
- フェーズ 2-③: slice 167 テストの parse fixture 蒸留 + 参照実装 (新 main) の縦切り並行

## 関連

- DR-063 §3 / DR-070 / DR-064 §5 / LOWERING §B.2 (追従済み)
- docs/journal/2026-07-05-phase2-fixture-runner-first-run.md (フェーズ 2-①)
- slice ws: docs/issue/2026-07-05-*.md (3 件)
