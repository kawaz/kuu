# 2026-07-15 kuu-core 正面玄関 API 昇格 + DR-107 descriptor 直交軸化サイクル

## 0. 背景 — VISION.md 成立

7-14 深夜、kawaz の「kuu-cli 構想覚えてる?」という一言から始まった。旧 `kuu.mbt`
リポの `kuu-v0` 枝 (旧 `main`) を掘り起こすと、`DR-0057` 等の設計判断や
`review` 枝に残る `README-kuu-cli.md` 等の独自ファイル群が見つかった。v0 は
一度全部捨てて AST 設計から再出発し現行 spec-as-core 体制に至った経緯があるが、
「v0 のまま進めても今の形には辿り着けなかった。cli も当然視野に入れながら
設計し直したから」(kawaz) という言葉の通り、CLI 独立コマンド構想は後付けの
思いつきではなく AST 再設計そのものが CLI を見据えていたことが判明した。

V-Q1=a の裁定で `docs/VISION.md` を新設。現行 conformance fixture の
`query` 語彙 (`parse`/`complete`/`definition_error`/`lower`) が conformance
runner の JSON in/out プロトコルとしてすでに稼働している事実は、そのまま
kuu-cli のサブコマンド構成に写せる「幻影コマンド体験」の原型だという気づきが
この過程で得られた。VISION.md の詳細は同ファイルを参照 (本 journal では
以降 §2 の DR-107 サイクルの動機として再登場する)。

## 1. ① kuu-core 正面玄関 API (kuu.mbt 側、MDR-005)

`parse_definition` / `parse` / `complete` の 3 関数を kuu-core の正面玄関
API として整理するサイクル。wire decode まわり (約 2300 行) を wbtest から
昇格させ、conformance runner 自体がドッグフーディングする形に構成し直した。
公開面は 41 個の候補から 18 個へキュレーションし、パッケージ分割は不要と
判明した (観測不変: 263/644/0/0、327/327、CI green)。

このサイクルの教訓は設計面ではなく着手判断にある。「まずは 1 つの API から」
という順序合意を、kawaz は着手指示のつもりで出していたが、こちら側は
「合意が取れた」段階で止まって号令を待ってしまった。kawaz から「着手だよ。
なんで待ってたの」と指摘された。**合意 = 着手指示** であり、合意形成の後に
別途の着手承認を待つのは discussion-style ルールの「方針が決まったら聞くな」
に反する振る舞いだった。

## 2. ② DR-107 descriptor 直交軸化

### 2.1 発端と設計調査

`docs/issue/archive/2026-07-14-descriptor-schema-declaration-axis-separation.md`
が扱っていた「descriptor の `kind` が role 軸と construction 軸を混在させて
いる」問題を、opus47 による設計調査 (案 A/B/C 比較) に委譲した。結果は
`docs/findings/2026-07-15-descriptor-axes-design-recon.md` に記録。

### 2.2 DAX-Q1〜Q7 裁定

調査結果を受けて DAX-Q1〜Q7 として提示、kawaz が裁定。特筆すべきは 2 点:

- **DAX-Q1=b**: role 軸の初期集合に `provider` を追加。この裁定の過程で
  kawaz から出た「デフォルトクロージャの signature は?」という質問が、
  provider 3 種 (`env_provider`/`config_provider`/`tty_provider`) 自体を
  descriptor 化するという発想の起点になった
- **DAX-Q3=a + 型体系裁定**: 「core 型は JSON 表現可能な値に限る、固定幅
  整数は持たない」という型体系そのものの裁定を伴った

裁定内容は `docs/decisions/DR-107-descriptor-orthogonal-axes.md` に構造化
されて反映され、DR land 後に main へ push した。

### 2.3 codex レビュー #4 (sol+high, A17+B17)

DR-107 起草直後に codex レビューを依頼 (2 本立て: A = DR-107 本文への
意味論レビュー、B = `schema/descriptor.schema.json` /
`schema/builtin-descriptors.json` の強制力レビュー、計 34 件)。全文は
`docs/findings/2026-07-15-codex-review4-dr107-triage.md` に無改変転記。

トリアージで最も判断が割れたのが **A-C1 (REJECTED)** — 「`fallibility` が
現役仕様の `Reject`/`Error` 二分を消している、filter は Reject/Error の
両方を返しうるので `fallibility` を撤回すべき」という指摘。統括の検証結果は
これを **既存設計の誤解に基づく過剰一般化** と判定した。根拠は
DR-037/kuu.mbt 参照実装の既存設計そのもの — Reject/Error の区別は filter の
宣言軸ではなく、**枝解決層 (branch resolution) が文脈に応じて実現する**
ものであり、descriptor 側の宣言に持ち込むべき情報ではない。この判定は
kuu.mbt の実装コメントを直接読んで確認しており、レビュー原文を鵜呑みに
せず一次資料への裏取りで却下した好例になった。

一方で **A-C4 は実バグとして CONFIRMED**: `builtin/tty` が
`fallibility:"total"` かつ `reasons:[]` と宣言されていたが、内部で
`builtin/bool_parser` と同じ経路を通る以上 `not_a_bool` で reject しうる。
descriptor の自己申告が実装と乖離していた。加えて「宣言的に total として
扱う」という **前例なき compositional exemption** (合成先の failure を
局所宣言で吸収する扱い) だったため、`fallibility:"reject"`、
`reasons:["not_a_bool"]` に修正した。

schema 側の強制力の抜けも A-M1/B-C1〜B-Maj7 等で多数指摘された。散文の
不変条件 (`construction:"factory"` なら `config` 必須、`fallibility:"total"`
なら `reasons` 空、等) が Schema の `if/then` で全く強制されておらず、
矛盾する descriptor が無警告で通っていた。

### 2.4 5 グループ Workflow 検証と修正反映

34 件のトリアージ・修正反映は 5 グループに分けた Workflow で並列実行した。
途中 1 グループが API 切断で中断したが、resume したところキャッシュ再生が
正しく機能し、中断前の進捗を失わずに再開できた。

修正反映では、統括が反例 16 パターンによる adversarial 検証を指示したところ、
担当 worker が自力で `collector`/`factory` 系の schema 漏れ (M-1 が指摘した
「不正 descriptor が通ってしまう」パターンの一部) を追加発見した。lint 用の
`lint-descriptors` task を新設し、schema 強制力の検証を CI に組み込んだ。

**DR-107/DR-106 が未 push 状態だった** ため、A-C6/A-M8 等が指摘した記述の
不正確さは「Superseded 節に明確化 note を追記する」形ではなく、**本文を
直接書き換える**形で反映した (= 既に確定・公開済みの決定を後から訂正する
のではなく、まだ外部に見えていない草稿の完成度を上げる扱い)。

### 2.5 VE-Q1 — `effect` → `output_mode` rename

A-M6 が指摘した通り、DR-107 の `effect` (preserve/transform) フィールド名は
kuu で既に確立している cell operation descriptor の `effect`/`effects` 語彙
(DESIGN §7.4 の 4 種表、DR-045 の効果記述子、CONFORMANCE.md §2 の 7-op 表)
と字面・意味論の両方で無関係なのに衝突していた。VE-Q1=a の裁定 (kawaz
2026-07-15) で `output_mode` に rename (値 `preserve`/`transform` は不変)。
この裁定はトリアージ本体とは別コミットで反映した。

最終的に push (main `6d16b158`)。

## 3. 派生 issue

本サイクルから以下の issue を分離起票 (本文に立ち入らず参照のみ):

- `docs/issue/2026-07-15-default-lexical-scope-borrow.md` — kawaz の
  socket-ttl 例から発した default クロージャの lexical scope 借用構想
- `docs/issue/2026-07-15-descriptor-conformance-promotion-revisit.md` —
  descriptor の実装 conformance 昇格 (DR-107 波及で射程外とした論点)
- `docs/issue/2026-07-14-from-entries-nonconforming-input-wire-form.md`
  (既存) — `from_entries` の入力型精密化。A-C5/B-C5/M-3 が繰り返し
  引き合いに出した未解決論点で、本サイクルでは対応せず追跡継続とした
- kuu.mbt 側 (別リポ) の `NoDashStr`/`DeprMark` 監査は本サイクルと並行して
  着手されたが、本 journal の対象範囲外

## 4. 並行: ccmsg 非 msg イベント再配信バグ

本サイクルと並行して、ccmsg (セッション間メッセージング) の非 msg イベント
(通知等) が意図せず再配信される挙動を観測した。上流 (ccmsg 開発元) に起票
したところ、担当セッション側で `event_seq` 方式による修正が入り v0.33.0 で
解消された。当方の観測内容はそのまま回帰テストとして採用されている。
dogfooding-feedback-upstream ルールに沿って、利用側 (本セッション) に
留めず上流へ還元した事例。
