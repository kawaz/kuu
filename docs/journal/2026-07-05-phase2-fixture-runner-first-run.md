# フェーズ 2-①: conformance fixture runner の初回実食 (2026-07-05)

ROADMAP フェーズ 2-① (codex 方向性レビューを受けた再構成 — 「追加設計でなく最小 runner の実測で前提を退役させる」) の実行記録。

## やったこと

- slice ws (kuu.mbt) の PoC エンジンに最小 fixture runner を実装 (`poc/fixture_runner_wbtest.mbt`、第 19 弾、Workflow: scout → implement → 2 並列 adversarial verify)
- fixtures/dd の全 8 cases (basic 7 + duplicate-decl 1) を faithful 転記 (wire form どおり、dd は options[] の canonical 配置) で実食
- JSON デコーダは PoC 射程外とし手転記 (転記元パスをコメント明記)。射影は CONFORMANCE §2 (effects = cli 効果 + sentinel 除外 / result / errors)、比較は §3 規約

## 結果

**fixture は 8/8 すべて正しい** (authoring error ゼロ)。転記突合・分類妥当性とも独立 verify が確認。

**slice エンジンの spec 乖離を 2 件検出** (いずれも既存 167 テストの盲点):

1. **dd の配置非依存回収 (DR-064 §2) 未実装**: inst_dd が def.positionals のみ走査し、canonical 配置 (options[]) の dd が install されない → sever が効かず 8 cases 中 6 が乖離。既存テストは全部 positionals 配置だった。→ slice `docs/issue/2026-07-05-dd-placement-agnostic-collection.md`
2. **構造的失敗の errors 空**: トークン枯渇 (case 3/5) と残余トークン (case 4) の failure で ParseError が emit されず、DR-053/065 の error 表現 (kind/element 省略/argv_pos 規約) が検証不能。DR-037 の held-error はトークンが存在して reject された場合のみ保持する。→ slice `docs/issue/2026-07-05-structural-failure-empty-errors.md`

既知 gap (flag preset default 未実装、slice 第 11 弾 note 1) は想定どおり result のみに現れ (case 1 の b=false / case 7 の a,b=false が absent)、乖離と正しく区別された。

## 教訓

- **「最小 runner を先に動かせ」(codex 方向性レビュー) は即日で回収された**: 設計を増やす前に実食したことで、fixture でなくエンジン側の乖離 2 件が初回で見つかった。conformance fixture が実装間乖離を機械検出する、という spec-as-core の中心仮説の最初の実証でもある
- **characterization と conformance の区別**: 現 runner は inspect による挙動凍結 (green = 凍結であって準拠ではない)。乖離解消後は「divergence = fail」の conformance モードへ育てる (slice issue 2 件目の関連メモに記録)
- runner の proj_effects は source を明示フィルタしていない (parse 時 binding は cli のみなので現状無害)。value-source fixture (フェーズ 2 後続) 導入時に要 1 行フィルタ

## 修正の完遂 (同日追記)

- **2 乖離とも修正済み**: (1) inst_dd を options/positionals 両面走査化 (inst_env/inst_inherit と対称のパターン、重複は add-if-absent が単一 DdSat に collapse)。(2) 構造的枯渇は scope 走査で Held ParseError (element/argv_pos=argv.length/kind=parse) を、残余トークンは top-level で element 省略・argv_pos=残余先頭の ParseError を合成 (両者は errors 空判定で排他)
- **既存 phase テスト 11 件の期待値更新**: 旧値「fail:no complete parse」は空 errors バグの characterization だった。全 11 件 failure→failure のメッセージ enrichment のみ (outcome flip ゼロ) で、意図を保った仕様準拠化として更新。エラー文言 (missing operand for X / unexpected token) は slice ローカルの選択 (message は仕様非拘束、DR-053/065)
- **runner を conformance モード化**: DIAG 6 件削除、faithful 8 cases の最終形 = **6 pass (2/3/4/5/6/dup1) + 2 preset-default gap のみ (1/7、KNOWN GAP コメントで可視化)**。case 3/4/5 の errors (kind/element 省略/argv_pos 規約) が実測検証可能になった
- moon test **175/175 green**。slice bookmark を新設し origin へ push 済み (ccdb99a7)。slice に justfile (test gate 付き push task) を新設
- 残 gap: flag preset default 未実装 (LOWERING §A.5) — case 1/7 の result 差分。別 issue として slice 側で追跡

## 次

- フェーズ 2-② (lowering conformance: `query: "lower"` 形式 + golden 断面) へ
- preset default (LOWERING §A.5) の slice 実装で case 1/7 も完全一致にできる

## 関連

- ROADMAP フェーズ 2 / docs/CONFORMANCE.md / DR-063〜069
- fixtures/dd/basic.json, duplicate-decl.json
- slice ws: poc/fixture_runner_wbtest.mbt (第 19 弾)、docs/issue/2026-07-05-* (2 件)
