# accum セルの filters(each) 配線 + Binding.at_pos 導入サイクル

2026-07-09 の記録。kuu.mbt issue accum-entity-filters-wiring (resolved)。前サイクル
(pre_filters 配線) に続き、filters/post_filters が scalar cell 限定だった問題へ。

## 発端と調査

- 4 次元並列調査 Workflow (resolve 構造 / harness バイパス / accum 経路 / spec 意味論)
  で偵察
- 確定した構造: regression (tags 2 値→1 値) の根 = resolve_entity_raw の CLI 座席 fold
  が e.accum を見ず DR-015 last-wins を一律適用。config 座席には accum 時の複数
  Binding 温存実装が既にありテンプレートになった
- 段 7 (累積後 post_filters) は AccumCell/build_result の設計変更 + 配列系 filter
  (sort/unique) の registry 追加が前提 → issue accum-post-filters-stage7 に切り出し

## 実装 (kuu.mbt commit c976da76、main 56275676 に push 済み)

- CLI 座席 fold の accum 分岐 (複数 Binding 温存)、harness の accum 除外ガード撤去
- Binding.at_pos : Int? 新設 — CLI 経路は piece 由来の値トークン位置、
  env/config/inherit/default は None (argv.length フォールバック)。filters(each)
  reject の argv_pos が CONFORMANCE §2 の piece 帰属規約どおりに
- wbtest 4 本 (accum 温存 regression / scalar last-wins 対比 / 全通過 / piece 位置 reject)
- conformance: decoded=143 / ran_cases=366 / skipped=0 / mismatches=1、157 テスト全 pass

## spec 側の成果

- fixtures/multiple-parse/filters-each.json 3 case (spec main 1eb1d821)。
  「1 piece でも reject すれば全体 failure (静かな部分除外ではない)」を why で明文化

## 実装中の発見 (3 問題の連鎖)

- fixture case 3 (separator 併用) が炙り出した:
  1. option 経路では separator 分割自体が未配線 (inst_long/inst_short が value_prim
     直呼びで e.separator を見ない)
  2. SepArg は分割するが型 parse をしない (既起票 issue)
  3. Binding に位置情報が無い
- worker が (1) を試験修正したところ (2) が即座に露呈して成功系まで壊れる連鎖を実測
  — 「段 1 と段 2 は片方だけ適用できない」と確定し issue
  separator-non-string-type-parse-gap に 2 段一括の対処方針として追記
- (3) は今サイクルで解決 (at_pos)。(1)(2) は次サイクル最優先候補。case 3 は
  known_divergences に issue ref 付き登録 (fixture の期待値は不変)

## 運用上の学び

- メッセージ交錯で worker が裁定前の文言 (「sep_binds 経由の piece 群」) を根拠に
  先走り着手 → 以後「最新指示の ack 後に着手」を徹底
- d52143a の CI failure は steps 空・ログ不存在・15 分 cancel という runner 障害
  シグネチャで、rerun success により GitHub 側一時障害と確定 (変更起因ではない)
- codex (gpt-5.5) への設計調査委譲を試験実施 (regex_match filter、issue
  regex-match-filter)。提案品質は良好、全文は kuu.mbt
  docs/findings/2026-07-09-regex-match-design-proposal.md。kawaz への DR 議論球
  2 点 (kuu_regex_min の構文範囲 / pattern 内 colon の DSL 対応) が発生
