# accum セルの cell 操作 op (default/empty/unset×env) 解釈サイクル

kuu.mbt issue `accum-fold-update-default-ops` (wip → resolved) の記録。導出の連鎖が
3 回折り返し、いずれも「fixture 先行 pin の禁則」が正しく機能して spec issue へ退避した
サイクル。

## 着手の経緯

issue 本文は 2026-07-09 (`accum-filters-non-set-op-semantics` サイクルからの切り出し)
から wip のまま残っていたが、blocker だった `design-6-2-piece-post-label-collision`
(DESIGN §6.2 の相ラベル誤り) が DR-079 リネームサイクルで解消し、DESIGN §14.3 の確定
(config scalar 値の T域座席通過は型の帰結) が波及して「導出可能になった」と判断し自律着手
した。実際には着手後に 3 つの新規裁定領域が露出し、blocker 解消だけでは足りなかった。

## 裁定の変遷 (3 回の折り返し)

### (a) accum×update: 実行時 Err → definition-error → format 未確定 → 保留

issue メモの文言は「transform の型 (T→T) と累積状態 (T[]) の不一致は実行時 Err で自然に
決まる」だった。これをそのまま fixture 化しようとすると、outcome=failure の
kind/reason/argv_pos が DR-066 の既存語彙 (kind=parse/filter/constraint) のどれにも
一意に該当せず、fixture が新語彙を発明する形になった。これを report した結果、kawaz/
team-lead 側で「静的 definition-error として導出し直す」裁定が下った — DR-077 §2 の
「transform でない・存在しない → definition-error」ファミリに、accum 宣言 (multiple)
も transform の同一性も定義時点で静的に既知という理由を足し、option ref repeat の
min>1 (未対応構成を DInvalidRange で明示 reject した前例) と同型と整理した。

ところが definition-error 版を書こうとして、リポ全体を `grep` した結果
`"query": "definition_error"` の fixture が **0 件**であることが判明した。DR-065 §1
は同タグを「予約のみ、フォーマット確定は後続」と明言しており (射程外節にも重ねて記載)、
definition-error fixture の expect 構造自体が spec としてまだ確定していなかった。
DR-054 §4 の parse_definition() 返値構造を転用する設計案 (kind 候補: `invalid-range` vs
`unknown-vocab` 系) を提示して再度 report した結果、「format の初実例化 + kind 判定という
2 つの新規 spec 判断が重なるため fixture 先行はここで止める」という最終裁定 (選択肢2:
保留) が下り、spec issue `definition-error-fixture-format` に退避、実装側は min>1 と
同型に wbtest で pin して先行させた。

### (b) 宣言 default 配列 (hosts case): 構文合法 → 意味論未規定 → 削除

multiple 要素に配列の宣言 default (`{"multiple": {...}, "default": ["localhost",
"localhost"]}`) を持たせ、書き戻された default 値が value_filters (non_empty) →
cell_filters (unique) を通ることを実証する hosts case を一度作成した。schema
(wire.schema.json の `default` は任意 JSON) 上は構文的に合法だが、DESIGN §11.4/§6.1/
§9.1 と DR-044/045/051 のいずれにも「multiple 要素への配列 default の意味論」を
規定した記述が見当たらず、既存 fixture にも実例が無いことが判明し、削除して
`[]` へ戻る 2 case のみに絞った。

ここでもメッセージが 2 度交錯した: 最初の削除判断 → 「schema 上合法だから維持」という
訂正 → さらに「構文合法性と意味論規定は別軸、削除が正」という再訂正、で 3 世代の指示が
短時間に発生した。最終的に削除で確定し、意味論ギャップは spec issue
`multiple-declared-default-semantics` (5 論点: 宣言 default の尊重可否 / per-piece
filter 適用か素通しか / default op 戻り先 / 値源ラダー供給時の扱い / scalar要素への
配列 default のエラー扱い) に切り出した。kuu.mbt 側の `default_values` 再型付け
(配列対応への拡張) も同時に取り下げられた。

### (c) codex 指摘: DR-031 明文と fixture 実践の既存矛盾

codex レビューで、`op=default` 適用後の `sources` タグについて **DR-031 の明文
(「committed=true な確定操作は sources=cli」) と、fixture が実際に pin している値
(sources=default)** が矛盾していることが検出された。この矛盾は今回新設した
accum 版 (default-cell-ops.json) だけでなく、既存の scalar 版 (unset-ladder.json の
default-commits-locked) にも 2026-07-09 の作成時点から潜在していた — 「commit
機構は cli 発火だが最終値の出所は default 席」という「値の由来席」読みで scalar/accum
の両方を一貫させていたため、今回のサイクルまで矛盾として顕在化しなかった。この構造的な
既存矛盾も spec issue `default-op-source-tag-contradiction` に退避し、裁定までは
fixture 実践 (sources=default) を現状仕様として維持している。

## 確定した実装 (kuu.mbt commit b8967505ae0b05965f9b00807320e4e75ab22705)

`resolve_entity_raw` の ACCUMULATE 分岐に cell 操作 op の解釈を追加:

- **Default**: `[]` + committed=true (ラダー非開放 — 下位 env があっても勝たせない)
- **Empty**: `[]` + committed=true (sources=cli — Default と最終値は同じだが由来タグが違う)
- **Unset**: committed=false で CLI 席が全 uncommitted なら env/config/inherit/default
  へ fall-through (unset 後に env が separator リストを供給すると sources=env が正しく出る
  — issue 追記1 の harness 誤り、「source タグを default に固定」を解消)

accum×update は静的 definition-error (`DInvalidRange`) で塞いだ:
`collect_unsupported_accum_update` が直接 variant と alias `long_override` 経由の両方を
走査、`collect_unsupported_count_multiple` が count×multiple (update(increment) 糖衣、
DR-077 §3) を要素レベルで reject する。codex レビューで両方の静的検査に「すり抜け」
(alias long_override 経由・count×short) が見つかり、Update binding の全生成源 (long
DSL / count 糖衣 / TCount short) を逆引きで確認しカバーした。fold 側 (実行時) は
到達不能な defensive abort として残した。

旧契約 (accum 分岐が生 bindings を温存する) を pin していた wbtest 1 本を新契約へ
書き換え (before/after を test docstring に明記)、env 供給側の対 unit case も追加した。

## spec fixture (spec commit 28fa57c4eb87127be3f42ca0c6d43b59df1e7291)

- **default-cell-ops.json** (新設、2 case): `ports` (宣言 default なし) への default
  発火は DR-051 §2 一様形の `[]` へ、下位 env があっても committed=true で無視する
- **filters-cell-ops.json** (既存に追記): empty case (sources=cli、unset の
  sources=default との対比)
- **unset-env-fallback.json** (新設、3 case): unset のラダー開放後に env が separator
  リストを供給する場合の sources=env、下位値源なしの基準線

accum×update の fixture のみ definition_error format 未確定のため保留 (上記 (a))。

## codex レビューでの検出と回収経路

High 2 件 (alias long_override 経由・count×short の静的 reject すり抜け → 実行時
abort に到達しうる欠陥) を検出・修正、Medium 1 件 (DR-031 の sources 矛盾、上記 (c)) は
issue へ退避。レビュー結果の回収は rollout jsonl からの抽出 + mtime 静止検知の Monitor
で自動化できた (`codex-rescue` の forwarder が停止する問題への対策として機能)。

## 数値

conformance: decoded=152 / ran_cases=388 / skipped=0 / mismatches=0。moon test 174 本
全 pass。両リポ push・CI green (kuu.mbt run 29045866863)。

## 教訓

- 「blocker 解消で導出可能」と見えた issue も、掘ると裁定が必要な新規領域が 3 本
  (fixture format 未確定 / 意味論未規定 / DR-fixture 既存矛盾) 出た。fixture 先行 pin
  の禁則 (= 正本明文化前に fixture で仕様を確定させない) が 3 回とも正しく機能し、
  独断で新語彙・新意味論を発明せず spec issue への退避で食い止めた
- メッセージ交錯によって worker (spec-rename) が 1 世代前の指示に ack してしまう事故が
  3 回発生した (hosts case の削除→維持→再削除、update fixture の実行時Err→
  definition-error→保留)。「最新指示を明示して再 ack させる」運用 (交錯訂正メッセージで
  直前の msg 内容を要約し、どちらが最新か明示する) が実効的だった — worker 側も
  jj op log を確認して並行コミットの実在を検出し、状況を都度 report する姿勢が事故の
  拡大を防いだ

## 関連

- kuu.mbt issue: `accum-fold-update-default-ops` (resolved, archive 済み) /
  `accum-filters-non-set-op-semantics` (前サイクル、本 issue の切り出し元)
- spec issue: `multiple-declared-default-semantics` / `definition-error-fixture-format` /
  `default-op-source-tag-contradiction` (すべて open、kawaz 裁定待ち)
- DR-077 (update 効果) / DR-045 (効果記述子) / DR-044 (一様配列) / DR-051 (absent 表現) /
  DR-031 (値源ラダー) / DR-054 (definition-error) / DR-065 (conformance fixture format) /
  DESIGN §14.3 (T域座席通過は型の帰結、design-6-2 close の帰結)
