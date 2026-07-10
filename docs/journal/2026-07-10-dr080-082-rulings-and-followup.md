# DR-080/081/082: kawaz 裁定 3 件の転写と DR-081/082 の spec 追従

2026-07-10 朝〜昼のチャット議論で下った kawaz 裁定 3 件を DR 3 本に転写し、そのうち DR-081/082 を
spec fixture へ追従したサイクルの記録。DR-080 (merge) は裁定転写のみで、実装サイクルは次に控える。

## kawaz 裁定 3 件 → DR-080/081/082

### DR-080: merge accumulator — piece マーカー語彙と old 合成

`APP_FIELDS=ts,ip,method,path,ua` + `--fields -ip,-ua,@,duration,ip` → `ts,method,path,duration,ip`
という継承リストの部分編集需要から、issue `list-merge-piece-op-vocabulary` の2ラウンドの議論で
意味論を確定。要点:

- merge は独立の node 属性ではなく **multiple registry の accumulator 語彙** (`{"multiple":
  {"accumulator": "merge", "separator": ","}}`) — DR-036/DR-077 §3 が既に予約していた座席の実体化
- マーカーは piece 全体一致のみ: `-<operand>` (remove、全削除)、`@` (splice、old の展開)、
  `+` エスケープ、それ以外は add
- 評価は左→右の一回走査。マーカーを1つも含まない発火は上書き (accumulator 無し要素と同じ
  last-wins 見え方)。マーカーを含む発火はマージモードで、明示 `@` が無ければ先頭に暗黙補完
- remove は双方向 (後置remove=作業リストから削除、前置remove=以後の `@` splice 内容から削除)
  だが以後の add には効かない
- canonical 例が 11 + escape 例 3 の計 14 例、DR 本文に収録

kawaz が当初の議論で「merge: true 属性」的な言い方をしていたが、これは accumulator 語彙
(node 属性でなく multiple.accumulator) が正しい座席だと kawaz 自身が訂正した。DR-080 本体は
裁定の転写のみで、fixture 化と kuu.mbt 実装は本サイクルには含まれない (次サイクルの本題)。

### DR-081: default 席書き換えモデル — source の確定と op=default の意味

issue `default-op-source-tag-contradiction` (DR-031 明文「op=default 適用後は cli」と fixture
実践「sources=default」の矛盾、codex レビュー検出) の裁定。kawaz が color の canonical 例表で
確定した:

- node は `default` (値) と隠し属性 `default_source` (初期値 "default") を持つ
- **env/config/inherit の供給は「席が勝つ」のではなく「default と default_source を書き換える」**
  モデル。複数席供給時は従来のラダー優先順で上書き
- `source = if committed { cli } else if default が在る { default_source } else { absent }`
- op=default は「その時点の (書き換え済み) default」を明示 set。source は常に **cli** — 値が
  default と同じでも確定させたのはユーザの明示操作 (DR-031 の cli 読みを再確認、「由来席」読みを
  覆した)
- 裁定時の例表に `default: "always"` と `(--colorなし) → auto` の不整合があったため、実世界の
  `--color` 慣習 (宣言 default = auto、裸 `--color` = always) に揃えて DR 本文に収録した

### DR-082: definition_error fixture format — DR-054 §4 返値の転用

DR-065 §1 が予約のみとしていた `query: "definition_error"` の expect 構造を確定。DR-054 §4 の
parse_definition() 返値をそのまま転用 (`{outcome: "definition-error", errors: [{element,
kind}]}`、message/hint は比較対象外、argv は書かない)。「構文上は書けるが構成として不成立」の
静的 reject (accum×update / count×multiple / option ref repeat min>1) は kind=**invalid-range**
に統一 (kuu.mbt の DInvalidRange 実装前例と一致)。unknown-vocab は「語彙自体が未知」の場合に
取っておく区別。

## DR-081/082 の spec 追従

fixture 6 ファイル (spec commit 8f4877f94e7cb67c9a9b4d96fe63a5182317fa5c):

- **value-sources/default-source-model.json** (新設、7 case): canonical 表の本質行を pin。核心
  対比は「env 書き換え済み default に対する op=default (committed=true, sources=cli) と
  op=unset (committed=false, sources=env) — 値は同じ (env 書き換え済み値) で確定主体と committed
  だけが違う」。`:set:always` (裸 `--color`) の枝競合行は values 制約なしでは `:set` の greedy
  消費と競合して別意味論になるため issue `values-variant-branch-competition` へ退避
- **value-sources/unset-ladder.json**: `default-commits-locked` → `default-commits-env-rewritten`
  に改名。値は env 書き換え済みの "always" (旧 "auto" から変更)、sources=cli (旧 default から
  変更)。why を「ロックは committed であって値の優先ではない」という新対比軸で全面書き換え
- **multiple-parse/default-cell-ops.json**: 2 case とも sources を cli へ。`default-ignores-lower-env`
  → `default-sets-env-rewritten-default` に改名、値を `[]` から `[10,20]` (env PORTS="10,20" の
  書き換え済み default) に変更
- **definition-error/** (新設ディレクトリ、3 ファイル、query=definition_error の初実例):
  accum-update-invalid-range.json / count-multiple-invalid-range.json /
  option-ref-repeat-min-invalid-range.json、いずれも kind=invalid-range。kuu.mbt の該当 wbtest
  (`installer_wbtest.mbt`) の definition 構造をそのまま裏取りして転写

kuu.mbt 側 (commit 3e5997b15934771ff162a6c694fb760a58779fc7、CI success):
`resolve_ladder_below_cli` として env/config/inherit/宣言default のラダーを単一関数化し、CLI 席
フォールスルーと op=default の「書き換え済み default」問い合わせが同じ実装を共有 (優先順の
二重保守を回避)。definition_error harness を新設し、definition decode と parse_definition 実行を
分離、DefError の element+kind 集合比較を実装。conformance decoded=158 / ran_cases=403 /
skipped=0 / mismatches=0、moon test 174 本全 pass。

## サイクル中の疑義と裁定

1. **unset-ladder は sources だけでなく値も変わる**: team-lead の当初指示は「sources のみ
   default→cli」だったが、DR-081 §4 の canonical 例 (`APP_COLOR=none --default-color #
   color=none source=cli`) を厳密に適用すると、env COLOR=always 下の default-commits-locked も
   同型の構造で値自体が auto→always に変わるはず、と worker (spec-rename) が指摘。team-lead が
   「指示の誤りだった、(b) 値も変わるが正」と訂正。「default は env に値で勝つ / unset は負ける」
   という旧対比軸が「値はどちらも同じ (env 書き換え済み) — 差は committed と source の2軸のみ」
   という新対比軸に転換した
2. **color canonical 表の values×variant 枝競合**: `values` 制約下での `:set` (値スロット) と
   `:set:always` (固定値、裸 `--color`) の経路競合は、values の書き方の問題ではなく意味論が
   正本に明文化されていない領域と判明。fixture 先行 pin の禁則に従い、本質行 (default 書き換え
   モデル) のみを縮小版 7 case で pin し、枝競合行は issue へ退避した
3. **DR-065「wire form」の読みの訂正**: worker が「definition は wire form (宣言層) — 糖衣展開は
   lowering fixture が専任」を「values 等の A群糖衣は展開済みで書く」と読んで values を or 展開
   した wire form を検討したが、team-lead が「wire form は糖衣込みが正 (`long: true` や
   `multiple: "append"` の既存慣習)、『展開は lowering fixture の仕事』は『展開結果の検証は
   lowering fixture の仕事』の意味」と訂正。ただし今回は values 抜きで進める判断 (上記2) 自体は
   変わらない — 「書けるか」と「意味論が明文化されているか」は別軸という整理

## issue close 2件

- **default-op-source-tag-contradiction**: resolved。close_reason に DR-081 実装先 (fixture 3本)
  と conformance 数値を記録。CONFORMANCE.md の sources フィールド説明への実文追記は
  doc-pending として残す (DR-081 波及節に記載済みなので後日整備で足りる)
- **definition-error-fixture-format**: resolved。close_reason に fixture 3本と「wbtest は昇格
  注記付きで unit 層 pin として残置」を記録 (spec fixture 化後も kuu.mbt 側の元 wbtest 自体は
  削除せず、由来コメントを付けて併存させる方針)

## 運用: API 接続エラーからの再開

サイクル中に API 接続エラーで worker 2名 (spec-rename 含む) が同時に停止した。team-lead が
「再開できていれば jj status の実出力で報告して続きから」という再開確認メッセージを送り、
working copy が無傷のまま作業を継続できた。メッセージ交錯は本サイクルでも2回発生
(values 方針の交錯、pin SHA の交錯) — 前サイクルで確立した「交錯を検出したら最新裁定を再送する」
運用を team-lead 側が継続し、worker 側も `jj op log` で並行コミットの実在を確認して都度状況を
報告する姿勢で対応した。

## 次サイクル

merge (DR-080) の実装が次の本題 — fixture 14例 (11 canonical + escape 3) と kuu.mbt の merge
accumulator 実装が最後の大物になる見込み。残る裁定待ちの issue: `multiple-declared-default-semantics`
(multiple 要素への宣言 default の意味論) / `values-variant-branch-competition` (今サイクルで退避) /
`multiple-ref-accum-gap` / regex_match の colon 対応。

## 関連

- DR-080 (`docs/decisions/DR-080-merge-accumulator.md`) / DR-081 (`docs/decisions/DR-081-default-seat-rewrite-and-source.md`) /
  DR-082 (`docs/decisions/DR-082-definition-error-fixture-format.md`)
- issue `list-merge-piece-op-vocabulary` (DR-080 の経緯元) / `multiple-declared-default-semantics` /
  `values-variant-branch-competition` (open、kawaz 裁定待ち)
- 前回 journal: `2026-07-10-accum-fold-cell-ops.md` (今回の3 issue のうち2件がそのサイクルの
  切り出し元)
