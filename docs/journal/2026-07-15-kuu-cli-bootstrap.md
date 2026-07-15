# 2026-07-15 kuu-cli 立ち上げ (CLI-Q1=b) と front_door ekmap 露出

夜、CLI-Q1 裁定 (=b、新リポ) を受けて `kawaz/kuu-cli` を立ち上げ、MoonBit PoC を
land した。PoC が動かした dogfooding の過程で front_door API (MDR-005) の穴を
1 件見つけ、issue 起票 → 統括裁定 → 実装 → 両リポ push まで同日中に一周させた。

## CLI-Q1 裁定と monorepo 議論

CLI-Q1 の裁定は b (新リポ)。kawaz の理由は「canonical バイナリを MoonBit で
書くとは決まっていない」こと。`kawaz/die` の前例 (Go/Rust/MoonBit/Zig の 4 言語
並行実装 → 実測で Zig を選定、die 側 DR-0003/DR-0007) があり、全言語で同じもの
を作って fixture で審判するという構図は kuu の構想 (conformance fixtures が
言語非依存の審判) ともともと合致していた。

追加論点として「kuu-cli + kuu-cli-{lang} に分割した方が良いか」も出た。統括の
推しは「選定が済むまでは monorepo (`impl/{lang}` 並置)」— 選定という横断的判断
は 1 リポに置く方が計測 harness・比較表・DR を 1 箇所にまとめられ、PoC 期の
契約変更を N リポにロックステップさせる調整コストも避けられる、という根拠。
分割が有利になる条件 (選定後も多実装を製品として活かす / 言語コミュニティの
独立コントリビューションを受け入れる) が立った時点で再検討する。命名は
kuu.mbt に揃えて `kuu-cli.mbt` 形になる想定。kawaz「おk、じゃ進めて」で確定。

## リポ立ち上げ

`gh repo create kawaz/kuu-cli` (public) → bare + jj workspace 方式。骨格 commit
(`3c922c4`) で README ja/en・LICENSE (MIT)・`DR-0001-multi-impl-architecture.md`・
justfile・VERSION placeholder を敷いた。

DR-0001 の要点:

- `impl/<lang>/` 配下に言語別実装を並置。各実装は同じ CLI インターフェイス
  (サブコマンド・入出力 JSON 形) を実装し、spec の conformance fixtures + 本
  リポの CLI レベル e2e で同一挙動を検証する
- canonical 選定は後日。複数実装が出揃った時点で die DR-0007 と同じ計測軸
  (binary size / cold start / cross compile / 保守コスト) で選定し DR に記録
  する。それまで release は出さない (VERSION bump しない、justfile の push
  ゲートは lint+test のみ)
- PoC は `impl/mbt` (MoonBit) から。kuu spec の参照実装 kuu.mbt (front_door /
  wire_decode) をそのまま流用できるため、CLI の入出力契約の輪郭を最速で
  固められる。目的は「MoonBit を canonical に推す」ことではなく「CLI の
  入出力契約を確定させること」

justfile は kawaz/bump-semver の canonical push flow をそのまま模倣 (kuu.mbt
と同型): `ensure-clean` → `check-on-default-branch` → `lint`/`test` → `push`。

moon のローカルパス解決を実機検証した: moon.mod の inline path import 構文は
存在しない (TOML 風に見えるが inline table は不可)。正解は **`moon.work`
workspace + versioned import** — `members = ["./cli", "./deps/kuu.mbt"]` で
並置した上で `import { "kawaz/kuu@0.1.0" }` と書くとローカル解決される。
`deps/kuu.mbt` は kuu.mbt チェックアウトへの symlink (gitignore、`just setup`
が張る。CI では SHA-pin checkout で同 path に置く想定)。main package の宣言は
`options("is-main": true)` 形式 (`cli/src/main/moon.pkg`)。

## MoonBit PoC (impl/mbt)

`kuu parse` / `kuu complete` / `kuu validate` の 3 サブコマンド
(`aeaf5a1`)。出力は conformance fixture の expect と同じ語彙
(outcome/effects/result/errors/warnings) をそのまま踏襲。CLI レベル e2e
(`ef8cb36` で just task 配線) は spec の実 fixture 2 本を実行して expect と
一致することを assert する:

- `fixtures/multiple-parse/separator-typed.json` (separator + type parse の
  輪郭)
- `fixtures/export-key/rename.json` (export_key 適用: result key rename が
  front_door 経由で実際に効くかの確認 — 後述の ekmap 穴の発見元)

moon formatter の版ズレ (`moon` 0.1.20260709 が `options("is-main": true)` を
`pkgtype(kind: "executable")` に書き換えるが、同一 toolchain のコンパイラは
`pkgtype` を受け付けない) により `impl/mbt` の `moon fmt --check` は一時休止
中 (README Known issues に記録、`just lint` は `moon check` のみ実行)。

## front_door ekmap 露出 (dogfooding 還元の一周)

`export-key/rename.json` e2e を組む過程で PoC が発見: front_door
(`parse_definition`/`parse`) 経由では export_key 適用に必要な ekmap
(`build_export_map` の結果) に到達できない。`build_export_map` と
`dec_definition` は `wire_decode.mbt` 内部の非 pub fn で、
`parse_definition` が返す `AtomicAST` は root + registry のみ保持し生
`Definition` を復元できない構造だった。PoC は暫定で空 ekmap を渡しており、
export_key を持つ definition では result キーが name ベースのまま (rename
projection が効かない) という誤動作を抱えていた。

kuu.mbt 側に issue
`front-door-export-key-map-access` を起票 (「部外者フラグ」に沿い実装方針は
断定せず、一次資料 3 点 — kuu-cli `impl/mbt/cli/src/lib/wire.mbt` 頭部コメント
/ kuu.mbt `front_door.mbt` / `wire_decode.mbt` の `build_export_map` — の提示
に留めた)。当事者セッションの裏取りを経て統括裁定: `AtomicAST` に `ekmap`
フィールドを同梱 + `pub fn export_map(ast)` を新設。MDR-005 §「射程外」に
「definition から静的に導出される export_key 写像への到達経路はこの除外の
対象外」と追記 (`build_export_map`/`apply_export_keys` は元々 pub で、
`AtomicAST` が不透明ハンドルであるために ekmap だけ到達できない穴が残って
いたという整理)。

実装 (kuu.mbt commit `dbcd757b`) は `AtomicAST.ekmap` + `export_map(ast)` を
追加し、conformance runner (`json_conformance_wbtest.mbt`) 側も新経路に
移行して Definition の二重 decode を解消した。kuu-cli 側はこの
`export_map(ast)` に差し替え (`42f07ae`)。両リポ push、kuu.mbt CI green
(run `29410557641`)。issue は `close_reason: ["dr/MDR-005-front-door-api",
"implemented"]` で archive 済み (`docs/issue/archive/` に移動)。

途中、実装 worker が context 枯渇で応答不能になり、fresh spawn の引き継ぎ
worker が未 commit 変更を検分して採用する運用が機能した (前日確立した
「サイクル単位の fresh spawn」原則の実地適用)。issue close の archive 移動
が中途半端に残った点は plugin の `update close` で正規化した。

## PoC の残宿題 (入出力契約の正本化材料)

1. ambiguous の interpretations JSON 射影形 (DR-053 §3 / DR-073、spec 未確定)
   — kuu-ux 設計と合わせて次の節目で判断
2. exit code 割当 (0/1/2) の正本化
3. kuu-cli の CI 整備 (SHA-pin checkout での e2e)

## 最終状態

- `kawaz/kuu-cli` main = `42f07aee` (5 commits: 骨格 / workspace scaffold /
  parse・complete・validate / lint・test・setup・e2e task 配線 / ekmap 差し替え)
- kuu.mbt main = `99a7e5b5` (CI green)。moon test 347/347、conformance
  decoded=272 / ran_cases=661 / skipped=0 / mismatches=0
- spec 側は `docs/QUESTIONS.md` から CLI-Q1 を削除するのみ (commit
  `d19b4ab8`)。未 push、次の push 窓に同乗

## 関連

- `kawaz/kuu-cli` `docs/decisions/DR-0001-multi-impl-architecture.md`
- `kawaz/kuu-cli` `impl/mbt/README.md` (Known issues — moon fmt 版ズレ)
- kuu.mbt `docs/decisions/MDR-005-front-door-api.md` §射程外 (ekmap 到達経路の
  追記)
- kuu.mbt `docs/issue/archive/2026-07-15-front-door-export-key-map-access.md`
- `docs/journal/2026-07-15-small-issues-sweep.md` (同日先行、worker
  fresh spawn 運用の直近実例)
- `docs/journal/2026-07-14-acc-rulings-and-worker-rotation.md` (fresh spawn
  原則の確立元)
