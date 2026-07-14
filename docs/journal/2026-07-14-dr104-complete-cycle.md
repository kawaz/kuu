# 2026-07-14 DR-104 (complete クエリ conformance 契約) サイクル

`docs/QUESTIONS.md` の V1-Q1=b 裁定 (v1.0.0 発行条件は parse-core/lowering/definition-error/completion
の 4 プロファイル全 green) により、DR-065 §1 で「予約」のみだった query タグ `"complete"` が
v1 blocker に昇格し、DR-070 (`"lower"`)・DR-082 (`"definition_error"`) と同格の確定 DR として
実体化したサイクル。COMP-Q1〜Q5 裁定バッチと `argv` 命名転回の経緯は
`docs/journal/2026-07-14-completion-design-rulings.md` が記録済みのためここでは繰り返さず、
DR-104 が確定した契約の中身と、fixture 実装フェーズで新たに見つかった 2 件の mismatch 裁定を記録する。

## DR-104 が確定した契約

`docs/decisions/DR-104-completion-fixture-format.md` の要点:

1. **入力フィールド**: `args_before` (必須) / `args_after` (optional) / `word_before` / `word_after`
   (将来予約、v1 未実装のまま)。DR-060 §2 の `before`/`word`/`word_suffix`/`after` を改名
2. **`candidates` の wire 表現**: `spelling`/`is_value`/`ty`/`origin`/`term`/`meta` (`CandMeta` = `is_alias`/
   `hidden`/`deprecated`、必須・省略不可)。`completer` は wire には持たせるが fixture では opt-in 検証。
   `Cand.path` (祖先 scope 経路) は wire に含めない — dedup 規則が明示的に無視する値であり、含めても
   比較に使えない中途半端なフィールドになるため
3. **候補の同一性 = wire 表現の 6 フィールド完全一致** (dedup 規則)。参照実装
   (`kuu.mbt` `outcome.mbt:316-343`) が既に pin していた規則をそのまま spec へ格上げした。異なる祖先
   scope 経由で供給された同一綴りの候補は 1 件に畳まれる — DR-060 §1 の「和集合」はスペリングの
   和集合であって経路の和集合ではない、という解釈をここで確定させた
4. **`candidates` は集合比較** (`CONFORMANCE.md` §3 の `interpretations` と同じ扱い)
5. **制約 (遅延述語) は before-only 補完の候補生存判定に不参加、`args_after` 供給時は完全経路判定が働く**:
   `args_before` のみの行末補完では `required`/`required_group`/`requires`/`exclusive_group`/
   `conflicts_with` の全ての遅延述語が候補生成・dead end 判定に一切参加しない (dead end 判定 = parse 相、
   制約評価 = resolve 相、という DR-097 の相区分の一様適用)。`args_after` が供給された場合は
   `args_before + [候補] + args_after` で完全な `parse()` を実行し、`Failure` になる候補は除外する
   (DR-060 §2、`outcome.mbt:347-366`)。これは非対称ではなく、DR-047 の教義 (遅延述語は完全経路の
   成立条件) を一様適用した結果、経路が未完結 (before のみ) か完結 (before+候補+after) かで自然に
   帰結が変わるだけ、という整理

fixture は `docs/findings/2026-07-13-complete-fixture-recon.md` §3 の輪郭調査で提案された 10 本 +
`docs/findings/2026-07-14-completion-constraint-and-identity.md` の positive fixture (排他確定候補も
候補に残ることを示す fixture) を実体化。kuu.mbt 側は decode/runner/集合比較器の基盤整備、および
`origin` の統一 (由来要素名で揃える) と `CandMeta` の実配線を行った。

## mismatch 裁定 2 件 (fixture 理論導出が実装検証で覆った)

DR-104 の fixture は「コード読解による理論導出」(実機での `complete()` 呼び出し確認なし) で書いた
ものが多く、`dr097-pending-mode-split.json` の注記に「ロックステップ運用により実装側 (kuu.mbt) の
検証で mismatch が出た場合は別途報告される前提でこの値を正とする」と明記されていた通り、
kuu.mbt 側の実装検証で 2 件の mismatch が実際に見つかり、統括裁定で fixture 側を修正した
(`befb8a853cbe`「fixtures(complete): mismatch裁定2件を反映 (単純フラグ冪等再発火 + eq-split隔離)」)。

### 1. 単純フラグの冪等再発火

`constraint-non-participation.json` の `exclusive-committed-partner-still-candidate` /
`exclusive-partner-excluded-by-after-consistency-check` の 2 ケースで、`args_before: ["--json"]` の
あと `--json` 自身が候補から消える、という期待値を書いていた。「トリガは 1 回消費されると再露出
しない」という直感をそのまま適用した結果だったが、実装検証で誤りと判明:

- **正しい規則**: `parse(["--json", "--json"])` は実機で `Success` になる (値スロットを持たない
  単純フラグの再発火は冪等に成立する)。「1 回消費されると再露出しない」という直感が成立するのは
  **値消費トリガ** (`--port` 型。消費後は値待ちで経路が変わり、同じトリガをもう一度打てる構造には
  ならない) に限られ、値を取らないフラグには適用されない
- 修正後は両ケースとも `--json` 自身が候補リストに残る。2 件目 (`args_after: ["--verbose"]` あり)
  では `--json` を採用した経路 `["--json", "--json", "--verbose"]` も exclusive_group 内で
  committed になる member が `json` のみのまま (`yaml` は一切発火していない) なので違反にならず、
  完全経路が成立して候補に残ることまで確認した

### 2. eq-split ノイズの隔離

`dr097-pending-mode-split.json` は DR-097 の parse/complete モード分岐 (`Pending` が complete モード
でのみ viable 扱いされ先食い抑制が働く) を pin する目的の fixture だったが、definition の
`long_eq_sep` が既定値 `"allow"` のままだったため、height の eq-split 由来候補 (`term: "cont"`) も
同時に候補として出てしまい、fixture が焦点にしたい「Pending の parse/complete モード分岐」がノイズに
埋もれる状態になっていた。`long_eq_sep: "deny"` (DR-096 §1) を definition の `config` に追加して
eq-split matcher の生成そのものを止め、関心を分離した (`basic-boundary.json` で既に使われていた
パターンの再適用)。

## 数値・関連

conformance 最終値: **decoded=239 / ran_cases=605 / skipped=0 / mismatches=0**、moon test 324。
ロックステップ push で spec main = `befb8a85`、kuu.mbt main = `d648fd63`。

- DR-104 (`docs/decisions/DR-104-completion-fixture-format.md`)
- DR-060 (補完クエリの意味論、DR-104 は fixture format の確定であり意味論自体は変更しない)
- DR-097 (先食い/早閉じ抑制の精密化 — dead end 判定の parse 相限定判定が本サイクルの土台)
- DR-047 (制約評価のレイヤリング — §5 の「遅延述語は完全経路の成立条件」が論拠)
- `docs/journal/2026-07-14-completion-design-rulings.md` (COMP-Q1〜Q5 裁定 + argv 命名転回の経緯、本 journal の前提)
- `docs/findings/2026-07-13-complete-fixture-recon.md` / `docs/findings/2026-07-14-completion-constraint-and-identity.md`
- fixtures/complete/ (10 系統)
