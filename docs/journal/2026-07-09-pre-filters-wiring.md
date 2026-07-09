# pre_filters (旧 pre_split_filters) の rename + 全経路実行配線サイクル

2026-07-09 の記録。kuu.mbt issue pre-split-filters-execution-wiring (filters registry
基盤 commit 7f1b0c96 の積み残し) に着手。4 次元並列調査 Workflow (eval 消費アーム /
matcher 分割 / registry 配管 / spec 意味論) で着手前偵察してから実装・spec 追従に入った。

## 最重要発見: spec 内の意味論矛盾

- PIPELINE.md (derived doc) は「pre_split_filters = 分割前の raw string 全体に 1 回」
  (旧 DR-009 意味論) のまま止まっていた
- 正本 (wire.schema.json / DESIGN.md §6.2 / DR-034 pieceProcessor / DR-062 改名) は
  「pre_filters = separator 分割後の各 piece 単位・type.parse 直前」で確定済み
- DR-009 自身の Superseded 節が DR-034 再構成を明記しており、PIPELINE.md の更新漏れと
  確定できた (導出可能な裁定として kawaz への再質問なしで確定)
- spec commit 3631b211 で PIPELINE.md 追従 (段 2/3 順序入替え + 改名 + 段 3 reject 出口明記)

## spec 側の成果

- fixtures/pre-filters/ 新設: 6 fixture / 12 case (per-piece 判別 / parse 救済 /
  non_empty reject / single 縮退 / 4 入口形収束 / env 経路)。per-piece-trim.json が
  「分割前全体 1 回」誤読との判別 fixture
- CONFORMANCE §2 に argv_pos 帰属規約を明文化 (commit ce52ffa5 系): piece 帰属の失敗
  = piece 由来の値トークン位置 / トークン非帰属 (枯渇・env/config 由来・累積後
  post_filters) = argv.length。codex stop-gate の「未明文化規約を fixture で正本化するな」
  指摘への対応として明文化した
- reject fixture は当初 regex_match を使ったが、kuu.mbt の filters registry に未登録
  (moonbitlang/x に regex なし) と判明 → reject 輪郭の関心は「parse 前に reject する」
  ことなので non_empty ベースに変更 (commit f21d9621)。regex_match は kuu.mbt issue
  regex-match-filter へ切り出し
- 新 issue: design-6-2-piece-post-label-collision (DESIGN §6.2 の pieceProcessor 図の
  相ラベル post_filters が wire フィールド名と衝突)

## kuu.mbt 側の成果 (commit 321f542c 相当、main b3cdd4f8 に push 済み)

- rename: ElemDef.pre_split_filters → pre_filters (decode キー含む)
- Node payload 運搬 (int_round 前例踏襲): 値 6 variant + LongEntry/ShortEntry。
  FilterArg/ReqArg はテスト専用 node で対象外
- apply_pre_filters ヘルパ (String→String、値源非依存) を CLI 全経路 + env_value
  (Entity 経由) の parse 直前に適用
- short_val / sep_binds の Result 化 (filter reject と parse 失敗の区別)
- conformance: decoded=142 / ran_cases=363 / skipped=0 / mismatches=0、153 テスト全 pass
- fixtures pin を f21d9621 へ bump

## 発見された隣接ギャップ (issue 起票済み、kuu.mbt 側)

- separator-non-string-type-parse-gap: SepArg が型を見ず常に VStr (separator ×
  非 string 型が型 parse を経由しない)
- config-string-pieceprocessor-gap: config の string 値が pre_filters を通らない
  (DR-050 乖離)
- env-separator-split-gap: env 値の separator 分割が未実装 (DR-049 乖離)
- regex-match-filter: DR-040 語彙の regex_match が registry 未登録、regex エンジン
  調達判断込み

## 運用上の学び

- sign-on-push で SHA が変わるため、doc に commit SHA を書くのは push 後
  (2 回修復が発生した)
- worker の moon fmt 未実行で push の fmt-check gate に止められた →
  fmt 差分は実装コミットへ squash して解決
- Workflow の統合検証 agent が schema 強制にダミー値 ("test") を返す失敗モードを観測
  (4 次元の生調査は有効、統合はメインで実施)
