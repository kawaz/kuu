# 2026-07-16 kuu-ux 設計サイクル (調査→骨子→UX-Q→DR-109→実装ライン)

NEXT-Q1 (c) — kuu-ux 設計着手の 1 日サイクル。並列調査 3 本 → 統括による骨子起草
→ UX-Q1〜7 バッチ裁定 (独自裁定 1 件 + 誤読事故 1 件を含む) → DR-109 land →
kuu.mbt / kuu-cli 双方の実装ラインへ接続、までを 1 サイクルで回した。

## 調査フェーズ (並列 2 本 + 実測 1 本)

### 内部調査 (opus47)

v0 考古学と spec 側の UX 接点棚卸しの 2 本立て。`kuu-v0` 枝から DR-0057/DR-0047 と
`kuu-cli.md` を発掘し、捨てられた設計 (opts 14 kind の統合、error+tip の平坦形) と
生き残った構想 (幻影コマンド、ショーケース) を仕分けた。spec 側は DESIGN §0.2 の
`$required` が名前だけ存在すること、DR-107 の completer/accumulator 軸が未確定な
こと、表示メタが `UsefulAST` 専用であることなど 12 の制約を洗い出し、UX-A〜L の
論点候補 12 件にまとめた。「kuu-ux 設計 = `UsefulAST` の復権」という整理がここで
出た。findings: `docs/findings/2026-07-16-kuu-ux-internal-survey.md`。

### 生態系調査 (codex-sol、5 並列 + 3 者反証監査)

clap / cobra / click / argparse / commander / yargs / picocli /
System.CommandLine の 8 系統マトリクス。lossless round-trip は 8 系統中ゼロ
(構造的理由 = クロージャの直列化不能) で、completion 配布は 3 系統、型橋渡しは
4 型に収斂していた。各系統の轍を集め、「JSON Definition・Outcome・Candidate
protocol だけが共通意味論を持ち、表面は言語慣用に委ねる」という境界を確定させた。
findings: `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md`。

### kuu-cli conformance sweep (r27 の fable-low セッションに委任)

kuu-cli 側の CI 整備と conformance fixture 全数 sweep を委任。sweep 母数は当初
547 case だったが `*/*.json` の 1 階層 glob が `fixtures/lowering/<sub>/` 等の
2 階層 fixture を取りこぼしていたと判明し、find 走査で 565 case に訂正
(kuu-cli commit `0e1d7b2e2c39`)。245 pass / 320 fail / skip 73 の fail 415 key
不一致を 12 カテゴリに排他分類し、分類不能ゼロで尽くした
(`docs/findings/2026-07-16-conformance-fail-taxonomy.md`、kuu-cli リポ)。

最大カテゴリは仮説になかった **B (env/config/tty 入力の未対応) 106 件**
(`kuu parse` が argv しか受け付けないため、fixture の `env`/`config`/
`config_files`/`tty` 入力が全滅する)。真の実装 bug 候補は 1 件のみ
(`export-key/collision.json :: single-exposure-ok`) で、これは後に UX-Q7 の
resolve 適用条件・preset default の共露出参加という spec 未確定点だったと判明
する。緩比較 (キー順序無視) を前倒し導入するだけで 22 case が即 pass すること
(245→267、kuu-cli commit `8802e525172a`) も同時に見つかった。

## 骨子起草と UX-Q1〜7 バッチ裁定

統括が 3 本の調査を統合し、設計骨子 7 本柱を起草
(`docs/findings/2026-07-16-kuu-ux-design-skeleton.md`):

1. kuu-ux = `UsefulAST` 実体化の 3 責務 (Definition 面 / Export 面 / Binding 面)
2. 書き味は合流モデル (derive/decorator/builder 複数共存 → 単一 `UsefulAST` へ)
3. `$required` = capability marker 化 + export validation
4. help/error は semantic model + policy まで共通、renderer は言語側
5. kuu-cli の envelope = fixture protocol が正本
6. completion 配布は生成器標準提供 + runtime 問い合わせ
7. 実装順は MoonBit `UsefulAST` が一番手

UX-Q1〜7 をバッチ提示し kawaz 裁定。Q1〜5 は統括推し通り (a) で確定 (DR-109
§1〜5)。CLI envelope は fixture expect と厳密一致 (Q2=a、余剰 field は出さない)、
sources は resolve 済み出力に常時同梱 (Q3=a)、interpretations は resolve 相を
適用しない (Q4=a、「途中経過まで規定すると将来の最適化余地を奪う」)。

## UX-Q6: 独自裁定 (kuu-cli はテストツールではない)

Q6 (env/config/tty の CLI 取得契約) で kawaz は提示した 3 案 (a: 注入のみ /
b: 実環境既定 / c: a 既定+opt-in) のいずれでもなく、独自裁定を下した:

> kuu-cli はテストツールではない。アプリ内の kuu 実装と同じように動作することが
> 求められる。なので環境も当然取得する。

既定を実環境取得とし (env は実環境変数、config は実ファイル、tty は実観測)、
試験用に `--no-env`/`--no-config`/`--tty <spec>` (固定) と `--env k=v`/
`--config <...>` (注入・上書き) を別途持たせる形に確定 (DR-109 §6)。統括の
当初推し (a: 実環境継承なし) は「幻影コマンドの再現性優先」というテストツール観
に立っていたと DR-109 の「採用しなかった案」に明記した。

裁定の背景から新構想 2 件が出て VISION.md に追記した (kuu-cli commit
`859e04f5903e`):

1. **極小バンドルモード**: kuu-cli の存在を前提に、アプリ内 kuu ロジックバンドル
   を持たない「ほぼ wrapper のみ」の言語 ux。多言語展開の最初の一歩を
   fixture pass より遥かに安いコストで用意できる
2. **RPC によるクロージャ注入**: 本体アプリと kuu-cli の間にクロージャ RPC spec
   があれば、言語実装テンプレ (capability marker + codegen)・WASM embed に
   次ぐ第 3 のクロージャ注入口になる

## UX-Q7 の誤読事故

Q7 (CLI の resolve 適用条件) への kawaz 回答「Q1-6 で出た話も含めて最高」を
**a 案承認と誤読**して DR-109 §7 を確定処理した。実際は「〜含めて**再考**」の
typo で、kawaz から訂正が入った。承認と誤読して land した §7 の内容 (既定
resolve 維持 + preset default の共露出非参加) は暫定 note に切り替え、
`docs/QUESTIONS.md` に UX-Q7R として再提示した (spec commit `c15fdb8adde3`)。

実害は文書 2 箇所 (DR-109 §7 の再考中マーク、`collision.json` の why 更新)
の暫定化のみで実装への波及なし — Q7=a が現状維持系の裁定だったため。教訓:
選択肢記号の明示がない曖昧な肯定語 (「最高」等) を、選択肢記号が付いた提示への
承認と即断しない。

## DR-109 land と波及

`docs/decisions/DR-109-kuu-ux-skeleton-and-cli-contract.md` を land
(spec commit `840fd855d9fd`、UX-Q6/Q7 波及の追記コミットは `859e04f5903e`
(VISION 追記) / `a851a5260b91` (collision.json §divergence 暫定決着))。
波及として issue 2 件を起票:

- spec 側: `completer/accumulator の descriptor 宣言軸を確定する`
  (DR-107 §7 の未確定 role、commit `4c73a2ffa163`)
- kuu.mbt 側: `binds → result object 構築の production 昇格`
  (MDR-005 射程外のまま runner 内に閉じていた箇所)

## kuu.mbt 実装ライン (projection-promoter worker)

DR-109 §5 の production 昇格 2 件を実装。

**result/sources 射影の front_door 昇格** (commit `70bd0fdf1a3a`): runner の
`proj_result_export`/`proj_sources`/`proj_sources_tree` の手組みを解消し、
`front_door.mbt` に `result(ast, binds)`/`sources(ast, resolved)` の薄い
ラッパーを追加。runner はこの 2 関数への委譲に書き換え、`result_sources` は
`has_commands(sc)` の有無で内部実装 (`collect_sources_flat`/
`collect_sources_tree`) が分岐するが呼び出し側はこの分岐を意識しない形にした。
乗り換え後も conformance は decoded=272/ran_cases=661/skipped=0/mismatches=0
で完全不変 (数字不変 = 同値性の証明、moon test 352/352 green)。

**ConfigVal/TtyObs の入力構築 API** (commit `ea13d4081aa7` + docs
`e8f10dfb6ece`): kuu-cli (外部利用者) が `front_door.parse`/`resolve` の
`env?`/`config?`/`tty?` 入力を構築できなかった穴 (UX-Q6 の実装ブロッカー) を
解消。`config_from_json(j: Json) -> ConfigVal` (JSON→ConfigVal の全域変換、
旧 runner の `json_to_configval` を昇格) と `tty_obs(terminal, cygwin) ->
TtyObs` (DR-099 §4 の生観測 2 値からの直接構築) を `front_door.mbt` に追加。
`ConfigVal`/`TtyObs` 自体は variant/フィールド非公開のまま公開面を最小に保った。
e2e wbtest 2 本を追加し、production API のみで config/tty の値が
result/sources に反映されることを固定。moon test 354/354 green。MDR-005 に
両追記を反映 (§2 の過去裁定「definition decode 昇格の対象は入力面のみ、encode
は含まない」を明示的に上書き)。

## kuu-cli 実装ライン (r27)

緩比較の前倒し導入 (245→267 pass、commit `8802e525172a`、統括承認 r27m9)。
DR-109 の Q2/Q3/Q4/Q6 envelope 追随 (fixture expect 厳密一致・sources 常時
同梱・interpretations resolve 相スキップ・環境取得契約) の実装は継続中。

## ロックステップ push

spec `4c73a2ffa163` → kuu.mbt pin bump `04b1f641e4bc` (CI green) → kuu.mbt
`e8f10dfb6ece` (result/sources 射影 + ConfigVal/TtyObs 入力 API、CI green)。

## 運用知見

- 統括セッション (kuu) が別リポの統括セッション (kuu-cli、fable-low 起動) に
  ccmsg room (r27) 経由でタスク委任する形が機能した。相談 (ConfigVal ブロッカー
  の指摘)・自主提案 (fail 全数分類への踏み込み)・訂正伝播 (Q7 誤読の巻き戻し)
  の双方向が同一 room 上で回った
- worker への「観点追加」指示 (expect 側にあるが出力に無い vs その逆方向を
  区別して分類する) が fail taxonomy の質を上げた。「expect にあるが CLI に
  無い」(機能未実装) と「CLI にあるが expect に無い」(射影裁定) を最初から
  分けて統括に返せたため、UX-Q の裁定材料として直接使えた
- MDR-005 §3 の記述 (pub はフィールドアクセス不可) と実機挙動 (クロスパッケージ
  読み取りは通る) の乖離を worker が発見。今回の作業には無関係だったため
  issue 化は保留、将来検証の宿題として記録に残す

## 関連

- `docs/findings/2026-07-16-kuu-ux-internal-survey.md` (内部調査)
- `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` (生態系調査)
- `docs/findings/2026-07-16-kuu-ux-design-skeleton.md` (骨子起草)
- `docs/decisions/DR-109-kuu-ux-skeleton-and-cli-contract.md` (UX-Q1〜7 裁定)
- `docs/QUESTIONS.md` UX-Q7R (Q7 誤読の巻き戻し、再裁定待ち)
- `docs/issue/2026-07-16-completer-accumulator-descriptor-axes.md` (spec 側
  波及 issue)
- kuu-cli `docs/findings/2026-07-16-conformance-fail-taxonomy.md` (fail 全数
  分類、UX-Q6/Q7 の実測根拠)
- kuu.mbt `docs/decisions/MDR-005-front-door-api.md` (result/sources 射影 +
  ConfigVal/TtyObs 追記)
- `docs/VISION.md` §3/§4 (極小バンドルモード、RPC クロージャ注入の構想追記)
- `docs/journal/2026-07-15-kuu-cli-bootstrap.md` (kuu-cli 立ち上げの前日経緯)
