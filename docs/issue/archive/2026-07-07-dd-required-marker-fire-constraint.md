---
title: dd 相当マーカーを「発火必須」にできない (values セルを持たないため required の判定対象にならない)
status: resolved
category: design
created: 2026-07-07T23:24:02+09:00
last_read:
open_entered: 2026-07-07T23:24:02+09:00
wip_entered:
blocked_entered:
pending_entered:
discarded_entered:
resolved_entered: 2026-07-12T00:51:17+09:00
discard_reason:
pending_reason:
close_reason: ["dr/DR-093","DD3 バッチ (kawaz 裁定 2026-07-11): required の充足は型委譲 — none 要素 (dd 含む) は発火 (committed) で充足","DD3-Q1 判定入力は committed / DD3-Q2 requires 目的語も型委譲に含める / DD3-Q3 opt-in 書き換え (DD2) は idea 降格","spec commit a1d60f3d","kuu.mbt 実装と corpus/real-cli/die.json の failure pin 更新は未実施、後続 issue 2026-07-12-dr-093-required-type-dispatch-implementation で追跡"]
blocked_by:
origin: kuu 自リポ TODO
---

# dd 相当マーカーを「発火必須」にできない (values セルを持たないため required の判定対象にならない)

## 概要

kawaz/die の `die [opts] -- ARGS...` は `--` (dd) の出現を**必須**とする (`--` が無い `die foo` は構文エラー)。しかし dd (DR-064) は値セルを持たない (fixtures/dd/export-key-inert.json で export_key すら inert と確認済み) ため、`required: true` の判定対象である「値の有無」(DESIGN.md §9.1) が dd には存在せず、「このマーカーが発火したこと」を制約として要求する手段が無い。

結果として、`corpus/real-cli/die.json` の定義では `args` (dd 越しに埋まる想定の positional) が dd の発火有無に関わらず背骨上で通常消費されてしまい (fixtures/dd/basic.json の no-dd-flag-fires と同型の創発)、`die msg` (`--` 無し) が実機では構文エラーであるにもかかわらず kuu の定義では success (`args=["msg"]`) になってしまう。

## 背景

- fixtures/dd/basic.json — dd は 0 回でも 1 回でも発火可能な greedy 面の住人。「発火 0 回」が正常系として固定されている (`no-dd-flag-fires` ケース)
- fixtures/dd/export-key-inert.json — dd に export_key を付けても結果に何のキーも現れない。dd の値効果なしは §4 の仕様断定
- `corpus/real-cli/die.json` の `bare-arg-without-dd-diverges` ケースが本ギャップを実例で固定 (kuu がどう出力するかを固定するものであり、die の正しい挙動ではないことを `why` に明記)

これは `docs/issue/2026-07-07-corpus-implicit-trailing-passthrough.md` (positional の充足が暗黙トリガになり pass-through する env/xargs/ssh/docker/ffmpeg のギャップ) とは**別種**の課題であることに注意: あちらは「マーカーが存在せず positional 自体が暗黙トリガになる」問題、本件は「明示マーカー (dd) は既にあるが、その発火自体を必須制約にできない」問題。

## 受け入れ条件

- [ ] dd (または marker 系語彙全般) に「発火したこと」を制約として要求する手段を検討する (候補: (a) 表現しない・現状維持で「-- 必須」なユースケースは kuu のスコープ外とする、(b) dd に発火有無を示す隠しセル (boolean、export_key と別軸) を持たせ required の対象にする、(c) 「positional は dd 発火後にしか埋まらない」ような構造的順序制約を positionals/dd の配置関係で表現する新語彙、(d) その他)
- [ ] 採用方針を DR として記録する (DR-064 / DESIGN §9.1 との関係を明示)
- [ ] 採用方針に応じて `corpus/real-cli/die.json` の `bare-arg-without-dd-diverges` を更新する (方針が「スコープ外」なら現状維持、表現手段を追加するなら正しい挙動 (failure) に更新)

## PoC 結果と改訂裁定案 (DD3 バッチ、2026-07-11)

### PoC (kuu.mbt エンジン直構築、2026-07-11 実測)

kawaz 提案「die の -- 必須は dd でなく greedy 面の素の seq で表現できる」を kuu.mbt の Scope/Node 直構築で検証。greedy 面に `Seq([Exact("--"), Ref(strings repeat min:1 の cons形)])` を置いた結果:

- `["msg"]` → failure (bare operand に消費者なし) / `["--","msg"]` → success / `["--","-x","msg"]` → success で `-x` は operand として一体消費 (dd 機構・severed フラグ一切なし) / `["--"]` → failure (min:1) / `["--verbose","--","msg"]` → success
- 結論: sever 相当は DESIGN L1086「greedy 内部は背骨なし一体消費」の構造的性質であり dd 固有ではない。「発火必須」は制約語彙なしに構造 (bare operand の消費者不在) から導出される
- ただし現行 JSON wire (`dec_option`) にこの形を直接書ける宣言語彙は無い (kawaz 例示の seq 記法は lowering 断面表記であり wire 入力語彙ではない)。エンジン能力は証明済み、宣言経路が未整備

### 改訂裁定案 (DD3 バッチ — DD2 を置換)

kawaz 提案 (2026-07-11): required のスコープを kind-dispatch で完備化する。cell あり node の required = 値充足 (現行 DR-047 §5、不変)、**cell なし node (type:none / dd) の required = 「そのノードが使用されたか」のチェック**。先例: DR-047 §5 の明確化 (2026-07-09) が既に「requires 目的語が bool 型なら充足 = 解決後値が true」という type-directed dispatch を導入済みで、同じ手の第 3 分岐。DR-089 §4 は none node の committed 参加を明文済みなので土台あり。die は {"type":"dd","required":true} で新 wire 語彙ゼロのまま表現でき、`die msg` は required_violated で failure になる。

- DD3-Q1. dispatch の判定入力: a) committed 【推奨 — DR-047 §5 が selected を診断メタに留めた線を維持、exclusive/conflicts と同軸】 / b) selected / c) 別軸
- DD3-Q2. requires の目的語が cell なしの場合も同 dispatch (「目的語が発火」で充足) に含め、DR-089 §4 の definition-error を置換するか: a) 含める 【推奨 — `A requires B` で B がマーカー、は意味を持つ】 / b) required のみに留める (requires 目的語は definition-error のまま)
- DD3-Q3. DD2 の opt-in 書き換え案 (dd → greedy Seq lowering) の扱い: a) idea 降格 【推奨 — PoC 知見 (sever は greedy Seq の構造的性質) は上記 PoC 小節に記録済み。宣言経路の需要が real-cli で複数実在したら再訪】 / b) 並行採用
- DD3-Q4. 裁定後の作業 (裁定不要、確認のみ): DR 起票 (DR-047 §5 表改訂 + DR-089 §4 置換、Supersede 注記) → kuu.mbt 実装 → corpus/real-cli/die.json を required:true 化し bare-arg-without-dd-diverges を failure (required_violated) pin へ → fixtures/ に輪郭 fixture → pin bump

留意点 (DR に明記予定、kawaz 整理 2026-07-11): 規範文は特例列挙でなく型への委譲で一様に書く — 「required は『解決後の充足』の保証であり、充足の定義は type (値空間) が与える。値空間あり: 値が在る (default 込み)、none (DR-089 §2 で第一級定義済み): 発火した (committed)」。型保証も一様 (T なら値 T が必ず在る、none なら発火事実が必ず在る — binding はフィールド非生成 (DR-051) だが保証は ParserContext 層の committed として実在)。この定式化では requires 目的語の cell なしケース (DD3-Q2) も「充足を問う場所は型に委譲」から自動導出され、bool 目的語の「true で充足」(DR-047 §5 明確化) も『bool 型の充足定義』として同じ枠に収まる。cell なし側の充足経路が CLI 発火のみ (default/env 席なし) である点は「充足 = 型が定義する存在」の帰結。

## 関連

- corpus/real-cli/die.json (`bare-arg-without-dd-diverges` ケースが本 issue を forward-reference)
- fixtures/dd/basic.json / fixtures/dd/export-key-inert.json
- docs/issue/2026-07-07-corpus-implicit-trailing-passthrough.md (別種の関連ギャップ)
