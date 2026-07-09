# separator×型 parse の 2 段一括配線

2026-07-09 の記録。kuu.mbt issue separator-non-string-type-parse-gap (resolved)。

## 発端

- accum×filters(each) サイクルの fixture case (separator 併用 reject) が炙り出した
  2 欠陥: (a) option 経路 (long/short/eq-split/cluster) では separator 分割自体が
  未配線 (inst_long/inst_short が value_prim 直呼びで e.separator を見ない)、
  (b) SepArg は分割するが piece の型 parse をしない (常に VStr)
- worker の試験実装で「段 1 (a の修正) 単独では段 2 (b) が露呈して成功系が regress
  する」連鎖を実測 → 2 段一括を issue に固定してから着手

## spec 側 (fixture 先行、spec main 0bd0ce04)

- fixtures/multiple-parse/separator-typed.json (option×number: 成功 [5,7] 数値化 /
  piece parse 失敗 `5,abc` → kind=parse not_a_number @1) と
  separator-typed-positional.json (positional×number 成功) の 2 fixture 3 case
- fixture 監査での学び: option/positional の同居 definition は option-only case で
  positional が missing_operand (CONFORMANCE §2 の構造的必須) になり輪郭が汚れる
  → 2 ファイル分割。「definition に positional を足す時は全 case の argv 充足を
  確認」

## kuu.mbt 側 (commit e2eee701、main f474129c に push 済み)

- 段 1: value_prim に separator? を統合して SepArg 構築を一元化、
  inst_long/inst_short/LongEntry/ShortEntry に separator 配線
- 段 2: SepArg に Ty/int_round/allow_base_prefix を運搬、sep_binds で piece ごとに
  pre_filters → 型 parse (canonical lexicon 再利用)。KFilter/KParse の区別、
  piece 帰属の argv_pos
- run_eq_split/short_val は separator 宣言時に sep_binds へ委譲。pre_filters の
  適用位置も「valstr 全体一括」から「分割後 per-piece」に是正 (DR-034 準拠)。
  short_val は Result[Array[Binding], ParseError] に再設計され walk_short の
  kind ガードが不要化
- filters-each.json::separator-piece-rejects-whole が GREEN 化、
  known_divergences ledger を空に復帰
- conformance: decoded=145 / ran_cases=369 / skipped=0 / mismatches=0、
  157 テスト全 pass

## 併走した codex 活用 (kawaz の新運用指針: 難しい設計・実装も codex に委譲してよい)

- accum 配線の codex レビューが「accum+filters × 非 Set 効果 (Default/Unset/Update)
  で placeholder に filter が走り得る」を指摘 → issue
  accum-filters-non-set-op-semantics 起票 (spec 裁定待ちの design issue)
- codex の結果回収は forwarder 問題が 2 回発生。回収実績: (1) bash job output の
  末尾 grep、(2) ~/.codex/sessions/ の rollout jsonl から最終メッセージ抽出 +
  mtime 静止検知 (GNU stat は -c %Y)

## 残 issue 状況 (kuu.mbt)

- accum-post-filters-stage7 / accum-filters-non-set-op-semantics /
  config-string-pieceprocessor-gap / env-separator-split-gap /
  regex-match-filter (DR 議論球: kuu_regex_min 構文範囲 + colon 対応) /
  既存 4 件 (greedy-once 等)
