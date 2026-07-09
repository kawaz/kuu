# filters (each 相) の適用対象裁定 + Unset fold サイクル

2026-07-09 の記録。kuu.mbt issue accum-filters-non-set-op-semantics (resolved)。

## 裁定の変遷 (kawaz との対話で 3 段階に精密化)

1. 初回裁定「Set のみでいい。あとは最近追加された update もか」
2. 精密化「update って結局 set(update) と同じで要はどちらも set でしょ」→
   単一原則化: filters (each 相) が乗るのは cell に書かれる実値のみ
   (set operand / update 適用結果)。accum × update は「意味論未定義」ではなく
   「build_result fold の実装未対応」と表現を訂正
3. 表記の指摘 2 件: 「filter chain と雑に言うな (pre_filters / filters /
   post_filters は位相が違う)」「属性語彙と一般名詞の区別がつかない表現を
   やめろ」→ 規定の主語を wire 属性 `filters` (each 相、段 5) と明示し、
   3 chain の位相差 (pre_filters は raw string 位相でそもそも走らない /
   post_filters は累積後位相で対象外) を書き分ける表記に全面修正

## codex stop-gate に 3 連で止められた記録 (すべて正当な指摘)

1. 「未明文化の argv_pos 規約を fixture で正本化している」(前サイクル) →
   CONFORMANCE §2 に明文化
2. 「新しい仕様文が既存の値源パイプラインと矛盾」→ 規定を効果 op 側に絞り、
   値源席由来の値の chain 通過は DR-049/050 への参照に留めた。DR-050 の
   post_filters ラベル曖昧性は issue design-6-2-piece-post-label-collision の
   射程に追記
3. 「update 結果への filters/post_filters 適用規定が衝突」→ 衝突の実体は
   PIPELINE §3.2 の要約劣化 (DR-077 §1 正本は「set 経路と対称に
   old → transform → filters → cell」で裁定と整合)。PIPELINE 側を修正

## 実装 (kuu.mbt commit 5b4fc96e、main 373c4e65 に push 済み)

- apply_entity_filters: 「Empty のみ skip」→「Set 以外は素通し」。Unset
  placeholder (VBool(false)) への in_range 誤適用でリセット操作
  (--ports 5 --reset-ports) が failure になるバグの根治 (実測 probe で
  誤動作を記録してから修正)
- build_result ACCUMULATE fold に Unset 解釈 (累積クリア)。Empty
  (committed) との差は sources に現れる (Unset → default タグ)。
  accum×unset×下位値源の限界は issue accum-fold-update-default-ops に記録
- wbtest 2 本 + conformance fixture multiple-parse/filters-cell-ops.json
  2 case
- conformance: decoded=146 / ran_cases=371 / skipped=0 / mismatches=0、
  159 テスト全 pass

## fixture サイクルでの検出事象

- fixture の variant DSL 記述ミスを impl worker が実測検出:
  "reset-ports:unset" は DR-011 affix 合成 (trigger = prefix + "-" +
  own_name) で --reset-ports-ports になる。"reset:unset" が正
  (unset-ladder.json の前例と整合)。三点根拠 (DR-011 理解 + 前例 +
  unexpected token 実測) の検出だった
- unset × accum の畳みの読み (累積列を [] へ戻す) は DR-045 + DR-044/051
  の合成から fixture worker が導出、監査で承認 — accum × unset を
  明示固定した初の fixture

## 関連イベント (同日)

- kawaz 指摘で MoonBit core (toolchain 標準ライブラリ) に第一級 Regex を
  発見 — regex_match のサブセット自前実装は廃案、core Regex の薄い
  wrapper へ方針変更 (kuu.mbt
  docs/findings/2026-07-09-regex-match-design-proposal.md に訂正)。
  教訓「.mooncakes だけ見て生態系に無いと結論しない、~/.moon/lib/core と
  公式 docs を実査」はメモリ化
- mbt 作業の前提知識インストール方針 (設計・監査担当は公式 docs 必読、
  機械的修正 worker は省略可) を kawaz が指示、メモリ化
- ref-template-result-shape は kawaz 裁定で「裁定待ち」から「実装バグ +
  result pin 作業」に書き直し (hlcolors は T[] の値セル、row 器)

## 残 issue

- kuu.mbt: accum-fold-update-default-ops (新規) / accum-post-filters-stage7 /
  config-string-pieceprocessor-gap / env-separator-split-gap /
  regex-match-filter (colon 対応の推奨提示済み) / 既存 4 件
- spec: ref-template-result-shape (実装バグ化) /
  design-6-2-piece-post-label-collision (DR-050 も射程) ほか
