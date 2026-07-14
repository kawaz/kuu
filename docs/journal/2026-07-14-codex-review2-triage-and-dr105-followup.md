# 2026-07-14 codex レビュー #2 トリアージ + DR-105 実装反映サイクル

`docs/journal/2026-07-14-acc-rulings-and-worker-rotation.md` が記録した通り、DR-105
(accumulator flatten ダイヤル + ARRAY filter registry の fallibility 確立) は設計面のみ
本サイクル前半で完了し、fixture 書き換えと kuu.mbt 実装追随は issue
`2026-07-14-dr-105-fixture-impl-followup` へ意図的に持ち越されていた。本 journal は、その
持ち越し分の反映と並行して受けた codex レビュー #2 (`gpt-5.6-sol`、DR-104/DR-105 全方位)
のトリアージ、および両者の反映で発生した mismatch レビュー第 2 ラウンドの顛末を記録する。

## トリアージ運用の変更: 統括の事前精読を worker 起動の前提にする

codex レビュー #2 は 29 指摘 (Critical 4 + Major 21 + minor 4) という規模で、前回
(レビュー #1) と同じく worker への丸投げ検証も検討したが、kawaz から「流し読み統括の禁止」
という明示指示が入った。以降は **統括 (メイン) が worker を起動する前に一次資料 (DR-104/105/
060/102 全文 + CONFORMANCE.md + schema + 参照実装) を精読してから** 検証タスクを割り振る
運用に切り替えた。29 指摘を 8 グループに分割し、`sonnet5-worker-high` ×8 の並列 Workflow
(計 1.2M tokens) で各指摘を実物突き合わせ検証させ、最終的な CONFIRMED/PARTIAL/REJECTED の
確定は統括が行った。判定正本は `docs/findings/2026-07-14-codex-review2-triage-verdicts.md`。

## 判定結果: CONFIRMED 15 / PARTIAL 11 / REJECTED 3

REJECTED 3 件 (M-15「meta 必須化は運用止まり」/ M-19「ARRAY filter の fallible ABI が未規範化」/
m-3「args.length と args_pos の関係の明記」) はいずれも、codex 自身が指摘文中で「schema 本文が
提示されていないため確認できない」と自認した上で書いた箇所だった。実際に schema/CONFORMANCE.md
の該当節を読むと、meta の必須性は `candidate.required` + `candidateMeta.additionalProperties:false`
で二重に enforce 済み (M-15)、ARRAY filter の Validate/Transform 契約は
`schema/descriptor.schema.json` の `signature` フィールドと DESIGN.md §8.1/§8.3 の
`FilterChain[A,B]` 型で既に規範化済み (M-19)、`args_pos`=`args.length` の関係は
CONFORMANCE.md の failure outcome 節で accum_filters を名指しして既に規定済み (m-3) だった。
3 件とも「一次資料を読めば消える指摘」であり、統括の事前精読運用そのものの効果を裏付ける結果に
なった。

## 導出裁定 3 件 (kawaz 裁定なしで DR 体系から導出)

判定のうち 3 件は、新規の裁定質問を立てずに既存 DR 体系から結論を導出した:

- **M-16** (`flatten:false` 宣言時の扱いが未定義): DR-105 §2 の見出しと本文の間で「value 非依存の
  禁止」と「true 限定の禁止」の表現が割れていた。DR-102 §3 が確立した「要素の宣言形と合わない
  属性は、その属性にどんな値が書かれていても常に invalid-range を報告する」という**存在ベース**の
  先例 (DR-105 自身が「同型」と明記) に沿って統一し、`flatten` キーの宣言自体 (true/false いずれも)
  が append 以外の accumulator では invalid-range、と決着させた。DR-102 §3 wrong-seat 判定と同型。
- **M-18** (`length_range` の DSL 引数検査): `in_range` 実装のコメントが「filter DSL 引数の
  definition-time な arity/型検査は (yet) 存在しない」と明記していた通り、malformed 引数は
  現状 runtime reject のまま (definition-time 検査には未格上げ)。DR-083 §5 の慣例に沿って
  definition-time 検査を求めるか runtime reject を踏襲するかは別途一文追記で明示する扱いとした。
- **M-20/M-21** (descriptor の carrier×fallibility 二軸が schema 上見えない / collector が
  filter と語彙衝突): `in_range` (scalar) と `length_range` (array) が `kind`/`signature` の組だけ
  では区別不能な問題と、`unwrap_single`/`from_entries` が「collector 相」と自認しながら
  `kind:"filter"` で登録されている問題は、DR-036 の「collectors registry は新設しない (filters で
  代替)」という既存裁定を維持したまま、`descriptor.schema.json` に役割軸 `kind:"collector"` と
  担体軸 `domain:"scalar"|"array"` を追加する **DR-106 (descriptor の役割軸と担体軸の機械可読化)**
  として新設で解消した。DR-036 の「collectors registry を新設しない」判断そのものは不変。

## C-1: DR-104 の「改名のみ」主張の訂正

C-1 (`word` フィールドの「改名」が実質的な必須フィールド削除ではないか) は PARTIAL 判定。
DR-104 §1 は「DR-060 §2 の `before`/`word`/`word_suffix`/`after` を改名しただけ」と説明していたが、
DR-060 §2 の改訂前原文を確認すると「v1 未使用可」の注記が付いていたのは `word_suffix`
(現 `word_after`) のみで、`word` (現 `word_before`) には付いていなかった。つまり DR-104 は
DR-060 が MUST として要求していたフィールドを optional かつ v1 未実装に格下げする実質的な意味論
変更を「改名」というラベルで覆い隠していた。DR-104 §1 に、DR-060 §2 の `word` 必須契約を
明示的に supersede する旨の note を追記して決着させた。

## spec 側の反映

トリアージ結果と DR-105 の持ち越し分を合わせて spec 側へ反映した:

- DR-105 の fixture 化 (flatten ダイヤル移行 + ARRAY filter fallibility)
- complete クエリの codex レビュー #2 成立指摘の fixture 反映 (M-1 args_after 省略=空配列同値、
  M-6 term:cont の新規 fixture、M-10 Ambiguous 生存規則、M-16 flatten:false gate 等)
- `candidates` の multiset 比較の明文化 + `candidate` の tagged union 化 (schema, C-3/M-3 反映)
- DR-106 起草、REFERENCE.md §6 の filter 一覧表に `kind`/`domain` 列を追加
- DESIGN.md §15.13 の after 整合フィルタを「exact/word_end 候補限定」に精密化 (M-9)

kuu.mbt 側は flatten の decode 追随、ARRAY filter registry の Result 化、`length_range` の
実装、`flatten:false` gate の実装を並行して行った。

## mismatch レビュー第 2 ラウンド: 理論導出 fixture の誤り 7 件

DR-104 サイクルで確立した「fixture の期待値をコード読解で理論導出 → 実装検証で mismatch の
内訳を報告 → 統括裁定」という mismatch レビュー方式を、DR-105 の fixture 反映でも再度実施した。
今回は 2 段階で計 7 件の誤りが見つかった。

第 1 段 (2 件、単純な期待値 typo):

- `accumulator-flatten-legacy-unknown-vocab.json`: `expect.errors[0].element` が DR-105 §1 の
  例示要素名 `src` のまま fixture に混入していた。definition の実要素名 `tags` に修正
- `length-range-reject.json::under-min-length-rejected`: `args=["--tags","a"]` は 2 トークンなので
  DR-102 §4 (accum_filters の reject は `args_pos=args.length`) により正しい `args_pos` は 2。
  1 と誤って書いていたのを修正

第 2 段 (5 件、既存 pin の見落としによる導出ミス) は `fix(fixtures): constraint 系 complete
fixture の mismatch 裁定 5 件を反映` (`57ea0bc6deca`) にまとめて反映した。3 つの既存 pin
(`name-surface/snake-kebab.json` / `absent/required-positional.json` +
`value-sources/positional-default-presence.json` / `constraints-parse/required-group.json` の
値述語 vacuous 充足) を見落としたまま新規 fixture の期待値を導出していたのが原因:

- `constraint-required.json`: 素 positional 必須則 (DR-051 §2c) の下では、宣言 default が
  あれば absent でも充足する。why の「absent 許容」記述を「宣言 default による充足」に訂正
- `constraint-requires.json`: `--key_file` (snake) は主入口トリガとして kebab 変換される
  (`--key-file`、origin は `key_file` のまま、DR-022) — 見落としていた既存 pin
  (`snake-kebab.json`) 通りに want/why を修正
- `constraint-required-group.json`: member を default 無し bool + `long:[":set:true"]` に変更。
  plain flag のままだと暗黙 default:false で group が vacuous になり、意図した違反経路が
  構造的に作れなくなる問題を修正

この 3 件目が波及して見つかった白眉が **`constraint-required-group-vacuous-flag.json`** の新設
ケースだった。flag member (default 無しの plain bool) で `required_group` を構成すると、
暗黙 default により値述語が常時充足してしまい、group そのものが vacuous になる。fixture 作者
(理論導出段階) は「required_group はどれか 1 つ発火すれば満たされる」という発火ベース
(bool-truth) の読みに流れて期待値を書いていたが、実装は required を値述語として扱う設計
(`RG-Q1` 裁定「required は値述語 — 常時充足 (vacuous) は正」) に忠実に従い、group 由来の除外を
一切発生させなかった。理論と実装がずれたのではなく、**理論側の読み違いを実装が正しく拒否し、
過去の裁定の正しさを実装が実証した**格好になった。この vacuous 挙動自体も
`constraint-required-group-vacuous-flag.json` として独立に pin した。

## 確定値とロックステップ push

conformance 最終値: decoded=239/ran_cases=605 → **decoded=256/ran_cases=632** (+17)、
skipped=0/mismatches=0。moon test 324/324。ロックステップ push は
spec `57ea0bc6` → pin bump → kuu.mbt `0fe02498` の順で通し、CI run `29327970515` green
確認済み。push の途中、`just push` が moon fmt 非準拠で fmt-check により 1 回失敗した
(kuu.mbt 側の worker 委譲実装で fmt 確認が漏れていた) — `moon fmt` 実行 + style commit で
解消。次回のワーカー委譲時のチェックリストに fmt 確認を追加する材料になった。

## 残余は issue 3 件へ分離

本サイクルで扱いきらなかった論点は issue として起票済み:

- `lowering-generated-element-origin-rule`
- `custom-type-candidate-ty-representation`
- `cand-completer-followup`

トリアージ元 issue `codex-review-dr104-dr105-triage` と `2026-07-14-dr-105-fixture-impl-followup`
はいずれも本サイクルで close (archive 移動) 済み。

## 続報: codex レビュー #3 (同日夜)

DR-106 新設を含む反映が一段落した同日夜、節目ごとの codex レビュー運用に沿って
DR-104/DR-105/DR-106 と conformance 一式 (CONFORMANCE.md / schema / fixtures/complete)
を対象に codex レビュー #3 を受けた。

### 実施環境のハマり所 3 連発

このレビューは cliproxyapi が不安定だったため、通常の `/model` 切替経由ではなく
`ANTHROPIC_BASE_URL=... claude -p` で nested claude を直接叩く経路で実施した。この経路で
3 つの障害に連続して遭遇し、都度解決した:

1. **"Prompt is too long"**: nested claude が起動時に CLAUDE.md / rules 等の文脈を読み込んで
   プロンプトが肥大化していたのが原因。`--bare` オプションで文脈読み込みを止めて解消
2. **`--bare` にすると "Not logged in"**: `--bare` は通常の OAuth ログイン状態も読み飛ばすため
   認証エラーになる。プロキシは 127.0.0.1 バインドのローカル信頼構成のため、
   `ANTHROPIC_AUTH_TOKEN=local` という実質ダミーの値で認証チェックを通過させて解消
   (`cliproxyapi-codex-usage` 運用と同じ「ローカル信頼、api-keys 実質不要」前提)
3. **51KB のレビュー対象 bundle がリクエストサイズ上限を超過**: 二分探索で 32KB は通ることを
   確認した上で、bundle を 2 分割して個別に投入し解消

### トリアージ結果: 成立 ≈17 / 却下 (DR 本文直接編集要求) / issue 化 3

判定正本は `docs/findings/2026-07-14-codex-review3-dr106-conformance.md`。レビューは
DR notes 対象 (レビュー A) と CONFORMANCE/schema/fixtures 対象 (レビュー B) の 2 通に分かれ、
統括が全指摘をトリアージ表にまとめて判定した。却下に回ったのは「DR 本文を直接編集せよ」という
要求群 (A-M7 / A-m1 / A-m4 / B-m4 等) — 本リポの規約は「DR 本文は push 後不変、訂正は追記 note
のみ」であり、この規約と衝突する要求は指摘の当否によらず却下とした。issue 化 3 件は
`descriptor-schema-declaration-axis-separation` (新設)・`from-entries-nonconforming-input-wire-form`
(新設)・匿名 origin の扱い (既存 issue `lowering-generated-element-origin-rule` へ統合)。

### 白眉 3 件

1. **vacuous fixture が判別力ゼロだった件** (B-M3): 本サイクル前半で新設した
   `constraint-required-group-vacuous-flag.json` を codex が精読し、唯一の exact 候補
   `--verbose` が `required_group` の唯一の member 自身であることを指摘した。after-filter の
   検査経路は「候補自身を採用した経路」(`args_before + [候補] + args_after`) であり、
   group の唯一 member が候補自身なら誤って非 vacuous に実装しても `--verbose` は自分自身の
   発火で充足してしまい green のままになる — fixture 名と実際の検証内容が一致していなかった。
   「何を保証するテストか」を詰め切らずに書いた fixture が、まさに保証したかった性質
   (vacuous 実装と非 vacuous 実装を判別する力) を持っていなかった実例。group と無関係な
   `--quiet` を追加し、その経路で vacuous/非 vacuous が分岐するよう構成し直した
2. **`flatten` 存在ベース reject が DR-063 §4「省略=default」と正面衝突していた件** (B-C1/A-C4):
   `{"accumulator":"merge"}` (省略、default:false と構造等価) と
   `{"accumulator":"merge","flatten":false}` (存在ベースでは definition-error) が、
   同じ論理値を表しているのに一方は valid・他方は invalid になるという矛盾を codex が指摘。
   `flatten` を `absent`/`false`/`true` の三状態として明示的に保持する契約 (append 選択後の
   意味 default であって decode 時の補完値ではない、と schema コメントで明確化) を採用して
   決着させた
3. **`length_range` の非負整数規定が `in_range` にまで誤って遡及していた件** (B-M1): DR-105 §5
   明確化 note の書き方 (「`length_range` および同型の `in_range`」という言い回し) が原因で、
   本来 `length_range` (配列長、非負整数が自然) 限定のはずの制約が、scalar の `in_range`
   (`in_range:-1.5:2.5` のような負数・小数を正当に扱える範囲検査) にまで遡及適用される記述に
   なっていた。これは**これまでの mismatch レビューと構図が逆**だった点が特筆に値する —
   従来は「fixture 側の理論導出ミスを実装検証で検出する」パターンだったが、今回は
   **spec 本文 (DR-105 §5 note) の書き方の誤りを、fixture 化する過程で検出**した初めての例。
   `in_range` の負数境界 fixture を新設したところ実装は問題なく green (実装は元々正しかった
   ことの確認)、一方 `length_range` の非負整数制約 fixture 2 本は kuu.mbt 側に対応する
   definition-time 検査が無くいずれも mismatch — spec 先行・実装追随という通常の順序が
   ここでも成立し、実装側の追随課題として残った

### 確定値とロックステップ push #2

conformance 最終値: decoded=263/ran_cases=644/skipped=0/mismatches=0、moon test 327/327
(上記 `length_range` 非負整数 fixture 2 本の mismatch は kuu.mbt 側の追随実装で解消済み)。
ロックステップ push #2 は spec `9e8debe9` → kuu.mbt `d6261de1` の順で通した。push 時、
`just push` の fmt-check による失敗が前回に続き**2 連発**した (kuu.mbt 側の worker 委譲実装が
push 前に `moon fmt` を通していなかった) — worker 委譲プロンプトの完了チェックリストに
「push 前に moon fmt 必須」を明記する運用改善が必要な水準に達している。

## 数値・関連

- `docs/findings/2026-07-14-codex-review2-triage-verdicts.md` (判定正本、29 指摘の各論・根拠・
  反映方針)
- `docs/findings/2026-07-14-codex-review-dr104-dr105.md` (codex レビュー #2 全文)
- `docs/findings/2026-07-14-codex-review3-dr106-conformance.md` (codex レビュー #3 判定正本 +
  レビュー原文 A/B)
- DR-104 (`docs/decisions/DR-104-completion-fixture-format.md`, C-1 訂正反映)
- DR-105 (`docs/decisions/DR-105-accumulator-flatten-and-array-filter-fallibility.md`, 実装反映 +
  レビュー #3 note (a)〜(d))
- DR-106 (`docs/decisions/DR-106-descriptor-role-and-carrier-axes.md`, 新設 + レビュー #3 note)
- DR-102 §3 (wrong-seat 存在ベース判定、M-16 の先例)
- `docs/journal/2026-07-14-dr104-complete-cycle.md` (DR-104 契約確定 + mismatch レビュー第 1 弾)
- `docs/journal/2026-07-14-acc-rulings-and-worker-rotation.md` (DR-105 設計経緯 + worker fresh
  spawn 運用の導入)
- issue `descriptor-schema-declaration-axis-separation` / `from-entries-nonconforming-input-wire-form`
  (codex レビュー #3 由来の新規起票)
