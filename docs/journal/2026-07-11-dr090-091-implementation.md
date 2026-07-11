# DR-090/091 実装完遂 — dd 一般化と bare key=value 段階実装、corpus 5 CLI 到達

DR-090 (dd の一般化) と DR-091 (bare key=value の段階論) の kuu.mbt 実装、実装過程で発覚した
host 方言の実測差異、worker の判断精度差、worker 交代運用までを通したサイクルの記録。corpus
5 CLI (xargs/ssh/docker/dd/env) が全て第一級表現に到達し、corpus 系 issue 4 件が全て close した。

## DR-090 実装

`DdMatchSat` (exact 系は無改修) と `self:keep` (消費 0 Accept + 同 pos severed 再帰) を実装した。

**host 方言の実測発見**: DR-090 の canonical 表記では未 escape の `[^-]` を使っていたが、
core Regex では compile 不能と判明した。DR-090 の表記を escape 形 `[^\-]` に修正した。DR-085
(regex_match は host 方言準拠) の原則が実例で裏付けられた形になる — spec で規定した表記が
実際の host 実装 (core Regex) の文法制約に合っていなければ、spec 側を実測に合わせて直す。

corpus (xargs/ssh/docker) の書き直しでは worker が「単一 raw 配列への融合で必須検証が失われる」
という誤ったトレードオフを報告した。裁定: **severed は greedy 面のみに効く、positional 席の
型・必須は生きたまま** (`--` 後消費の既存 pin と同型の構造)。分離型付き positional 形に修正
した結果、xargs の no-utility (末尾に utility 指定なし) が正しく failure に反転するようになった。

commit: kuu.mbt `2cc6ff35`。

## kawaz との DR-090 議論の訂正 2 連

### (a) pattern の誤読 → 「劣後規則」の発明と撤回

team-lead (私) が pattern を `^-` (unknown option を拾う意図) と誤読し、それに基づいて
「劣後規則」(既知の option 解釈が優先し、pattern dd はそれに劣後する) という不要な規則を
発明してしまった。kawaz「dd (`^[^-]`) だろどう考えても」で撤回 — pattern が正しく
`^[^-]` (dash で始まらないトークン) であれば、severed の既存構造だけで全てが解決済みで、
新規の優先順位規則は要らなかった。

### (b) env 合成での代入トークン除外

env 合成の corpus では、pattern を `^[^\-][^=]*$` (dash で始まらず、かつ `=` を含まない) に
することで代入トークン (`KEY=value`) を pattern から除外した。「pattern の設計そのもので
競合を避ける」という一貫した解法が (a) と共通して機能した。

## DR-091 実装

`kv_map` accumulator (最初の `=` で分割 / last-wins / `=` を含まないトークンは reject —
reject の扱いは DR-091 への追記) と `require_equal_separator` を実装した。`require_equal_separator`
は nested config object (DESIGN §7.2 が示す形) の最小実装であり、§7.2 全体の対応は issue
`scope-config-object-gap` に切り出した。

worker が下した判断 3 件 (eq-split 経路が未登録だった点 / wire レベルでの表現 / wbtest 追加)
のうち、wire の扱いは「要素レベル」から「scope レベル」へ team-lead が監査で修正した。fixture
の `type: "file"` が未定義語彙だと判明し `string` へ差し替えた (第一級 file/path 型の導入は
将来課題として残す)。

commit: kuu.mbt `a683ec3c`。

## worker 交代

worker `impl-greedy` が 14 サイクル完走した後、コンテキスト超過で停止した。`impl-kv` へ
引き継いだ — 確定済みの裁定をプロンプトに焼き込み、`impl-greedy` の序盤 WIP は筋が良かった
ため活用した (ゼロから再着手ではなく、有効な途中成果を引き継ぐ判断)。長寿命 worker の寿命管理
(いつコンテキスト超過に達するか、超過前にどう切り出すか) は今後の運用課題として残る。

## corpus 5 CLI の到達点

xargs / ssh / docker / dd / env の corpus 5 CLI が全て第一級表現に到達した。corpus 系 issue
4 件は全て DR 化または裁定で close した。

## 最終状態

conformance: decoded=188 / ran_cases=487 / skipped=0 / mismatches=0。moon test 247 本。全 CI
green。

## commit 系譜

spec: `53a41c17` (DR-090 §4) → `9d6c2f5f` (env corpus) → `769120d3` (file→string) →
`b34ca024` (issue close)。kuu.mbt: `2cc6ff35` → `a683ec3c`。

## 関連

- DR-090 (`docs/decisions/DR-090-dd-generalization.md`、dd の一般化) / DR-091
  (`docs/decisions/DR-091-bare-key-value-staged-plan.md`、bare key=value 段階論)
- DR-085 (regex_match は host 方言準拠、DR-090 の escape 修正で実例裏付け)
- issue `scope-config-object-gap` (DESIGN §7.2 全体対応、DR-091 §3 実装から切り出し)
- 前回 journal: `2026-07-11-dr089-091-and-corpus-rulings.md`
