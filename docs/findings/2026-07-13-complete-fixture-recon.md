# `fixtures/complete/` 系統新設 提案レポート

> 対象 issue: `docs/issue/2026-07-12-complete-query-fixture-coverage-gap.md` (status: wip)。
> 本レポートは 4 本の並列調査 (CONFORMANCE / DESIGN / kuu.mbt complete_wbtest / decode 層) の構造化結果を統合し、追加で spec/kuu.mbt の一次資料 (`schema/fixture.schema.json`、`docs/CONFORMANCE.md` §1-3、`docs/DESIGN.md` §15.13、kuu.mbt の `src/core/{node,eval,outcome,complete_wbtest}.mbt`、`docs/journal/2026-07-12-dr097-forestall-viability.md`) を実機確認して裏取りした。**read-only 調査のみ、ファイルは一切変更していない。**

DR-097 は journal 記述時点 (2026-07-12) では「main 未反映・codex レビュー中」だったが、実機確認時点 (kuu.mbt main HEAD `e5401c3e` 系列) では kuu.mbt の `src/core/eval.mbt:1092` の `has_viable` として **main に反映済み**であることを確認した (journal の記述はやや古い状態を指す)。

---

## 1. カバレッジマトリクス

DESIGN.md §15.13 (DR-060) が定める意味論軸を、kuu.mbt `complete_wbtest.mbt` (全 319 行、全 13 test を通読) の既存カバレッジ、および実機確認で追加判明した実装上のギャップと突き合わせる。

| # | 意味論軸 (DESIGN 根拠) | wbtest カバレッジ | fixture 化の要否 |
|---|---|---|---|
| A1 | 消費点の種別 (トリガ位置 / 値位置) | L33 (トリガ), L48 (値) でカバー済み | 要 (最優先の基本形) |
| A2 | 生存 partial 経路の複数性と和集合 (§15.13「全消費も一意性も課さない」) | L103, L245, L261, L278 でカバー済み (L261/L278 は codex レビュー起因の回帰テスト) | 要 |
| A3 | dead end 除外 | L120 でカバー済み | 要 |
| A4 | after 整合フィルタ (§2) | L134 でカバー済み | 要 |
| A5 | word / word_suffix (カーソル単語内位置) | **未実装** — `complete()` のシグネチャ (kuu.mbt の `src/core/outcome.mbt:303-308`) は `(root, before, defs?, after?)` のみで `word`/`word_suffix` パラメータが存在しない。DR-060 §2 の「v1 未使用可」に整合する未実装状態 | 不要 (v1 では pin する実体が無い、実装後に追補) |
| A6 | 候補メタ情報 (canonical/alias・hidden・deprecated) | **カバレッジ 0**。`struct CandMeta {is_alias, hidden, deprecated}` (kuu.mbt `node.mbt:579-583`) は存在するが、`complete_wbtest.mbt` 全文で `is_alias`/`hidden:`/`deprecated:` の言及は grep 実測でゼロ件 (= 全 candidate が meta 既定値 `{false,false,false}` のケースしか exercise していない) | **要 (カバレッジ穴として最優先級)** |
| A7 | 値位置候補の内訳 (型情報 / completer 名) | 型情報 (`ty: TNum` 等) のみ検証 (L48, L89 等)。**`Cand` 構造体 (kuu.mbt `node.mbt:601-609`) に completer 名フィールドが存在しない** — DESIGN.md line 1211 が言う「値位置の型情報 / completer 名」のうち completer 名側は現行 `Cand` に乗らない (未実装 or 未確認の設計判断、後述 COMP-Q3) | 型情報側のみ pin 可。completer 名側は裁定待ち |
| A8 | 先食い/早閉じの parse/complete モード分岐 (DR-097 の Pending 扱い) | **カバレッジ 0** — wbtest 13 ケースのいずれも該当なし。kuu.mbt `eval.mbt:1092-1101` の `has_viable` で `Pending(_, _) => if in_complete(ctx) { return true }` として明示的に mode 分岐している箇所自体がテスト対象外 | **要 (issue の最優先要求)** |
| A9 | dd (`--`) 境界と greedy 非露出 | **カバレッジ 0** — `DR-042 (line 101)` の PoC 実測列に言及があるのみで wbtest には該当ケースなし | 要 |
| A10 | command スコープ切替 | L66 でカバー済み | 要 |
| A11 | matcher 元綴り + 終端ヒント (term: WordEnd/Cont) | L187 でカバー済み | 要 |
| A12 | dedup 規則 (`spelling/is_value/ty/origin/term/meta` が一致すれば `path` 差を無視して畳む、kuu.mbt `outcome.mbt:322-333`) | L304 でカバー済み | 要 |
| A13 | `path` (祖先 scope 経路、DR-066 §4) | **カバレッジ 0** — `Cand.path` フィールド (kuu.mbt `node.mbt:608`) は存在し `missing_operand` エラーへの変換用に carry されるが (`node.mbt:590-599` のコメント参照)、wbtest のアサーションヘルパ `has_exact`/`has_value` はいずれも `path` を検査しない。dedup 規則がまさに `path` を無視する設計 (A12) なので、`path` 自体を fixture でどう検証するかは A6 と同様に穴 | 要否は COMP-Q4 (dedup 規則と整合する検証設計が必要) |
| A14 | 素材/ポリシー分離契約 (§15.13「素材とメタのみ返し、絞り込みポリシー・置換・着地は生成器と shell の領分」) | 設計原則そのもの (個別 test ではなく `complete_wbtest.mbt:5-7` の冒頭コメントが明記: 「word による prefix 絞り・alias/hidden ポリシーは層 2 の関心で、ここでは検証しない」) | fixture 化しない (仕様上の射程外を明示する docs 記述として CONFORMANCE 側に残すのみ) |

**カバレッジ穴の総括**: A6 (メタ属性)・A8 (DR-097 分岐)・A9 (dd 境界)・A13 (path) の 4 軸が wbtest でも fixture でも一切固定されていない。A8 は issue の受け入れ条件が名指しで要求している最優先項目。

---

## 2. `fixtures/complete/` の wire format 案

### 2.1 既存系統との整合点

`schema/fixture.schema.json` (実機確認) のトップレベル `fixture.$defs.fixture` は `query` の enum に `"complete"` を既に持つが (`fixture.schema.json:20`)、`allOf`/`if-then` 節 (`fixture.schema.json:42-55`) には `parse`/`definition_error`/`lower` の 3 分岐のみで complete 分岐が無い。`description` (`fixture.schema.json:4`) にも「complete (予約、構造未定義のため本 Schema は additionalProperties で緩く受ける)」と明記。→ **現行 schema では `query:"complete"` の fixture は形式検証を素通りする** (= 何を書いても schema エラーにならない、緩さの裏返しとして自由記述のリスクがある)。

`cases[]` を持つ既存 2 系統 (`parse` / `definition_error`) の骨格は共通:

```
{why, query, definition, cases: [{id, why, argv?, expect, env?, tty?, config?, config_files?}]}
```

`complete` も同型で `cases[]` を持つ形が自然 (issue の受け入れ条件 3「最低 1 件作成」も case 単位の粒度を想定している)。ただし `argv` は「カーソル前後」という complete 固有の入力構造 (`before`/`word`/`word_suffix?`/`after?`、DESIGN §15.13) を表現できないため、**`argv` をそのまま流用せず新規フィールドが必要**。

### 2.2 case 構造案 (spec 側で正式裁定が必要、以下は提案)

```json
{
  "why": "...",
  "query": "complete",
  "definition": { ... },
  "cases": [
    {
      "id": "trigger-boundary-spelling",
      "why": "...",
      "before": ["--port"],
      "after": ["5"],
      "expect": {
        "outcome": "complete",
        "candidates": [
          {"spelling": "--port", "is_value": false, "term": "word_end", "meta": {"is_alias": false, "hidden": false, "deprecated": false}},
          {"is_value": true, "ty": "num", "origin": "port", "term": "word_end", "meta": {"is_alias": false, "hidden": false, "deprecated": false}}
        ]
      }
    }
  ]
}
```

フィールド対応 (kuu.mbt の `Cand` struct `node.mbt:601-609` を直訳):

| wire フィールド | `Cand` フィールド | 備考 |
|---|---|---|
| `before` | `complete()` 第2引数 | `cases[].argv` の complete 版。命名は DESIGN §15.13 のシグネチャ語彙 `before` に合わせる案 (COMP-Q1) |
| `after` (optional) | `complete()` の `after?` 引数 (`outcome.mbt:307`) | 実装は既定値 `[]` |
| `word`/`word_suffix` | (実装なし) | A5 参照。v1 では省略、書かない |
| `expect.candidates[].spelling` | `Cand.spelling` | `is_value:true` では `""` (省略可能にするか要裁定) |
| `expect.candidates[].is_value` | `Cand.is_value` | |
| `expect.candidates[].ty` | `Cand.ty` (`TStr/TNum/TInt/TFloat/TFlag/TBool/TCount/...`) | `is_value:true` の時のみ意味を持つ |
| `expect.candidates[].origin` | `Cand.origin` | |
| `expect.candidates[].term` | `Cand.term` (`WordEnd`/`Cont`) | 文字列 `"word_end"`/`"cont"` へ直列化 |
| `expect.candidates[].meta` | `Cand.meta` (`CandMeta{is_alias,hidden,deprecated}`) | A6 のカバレッジ穴を埋めるため必須で書く運用にすべき (省略時 default 扱いにすると A6 と同じ穴が再現する) |
| (未マップ) | `Cand.path` (`Array[String]`) | A13。dedup 規則 (`outcome.mbt:322-333`) が明示的に「path は candidate の同一性に関与しない」としている — wire に含めるなら別フィールドとして「検証しても比較には使わない」の位置づけが必要 (COMP-Q4) |

比較規約: DR-060 §1「和集合」であり順序を課さない → `candidates` は **集合比較** (順序非規範) が自然。既存 `interpretations` (ambiguous outcome) と同じ集合比較パターンを踏襲する提案。

### 2.3 decode 層のギャップ (kuu.mbt 側、実装未着手)

definition_error が「予約」から実装済みに格上げされた際の経路 (DR-082) と同型で、以下が新規に必要 (kuu.mbt `json_conformance_wbtest.mbt` 実機確認: `q=="lower"` 5252 行 / `q=="definition_error"` 5267 行の分岐と、それ以外が全て `dec_fixture` (parse 専用デコーダ) にフォールバックする実装を確認済み):

1. `schema/fixture.schema.json` に `query:"complete"` 用の `if/then` 節 + `completeExpect` `$defs` の新設
2. kuu.mbt: `DCompleteCase` 相当の新規 decode 構造体 (`before`/`after`/`word?` 入力 + `candidates` 期待値)
3. kuu.mbt: `dec_complete` (仮) decoder 関数
4. kuu.mbt: runner dispatch に `if q == "complete"` 分岐追加、`complete()` 呼び出し + `candidates` の集合比較器
5. 候補集合比較器: `meta`/`term`/`ty` を含めた構造等価 + 集合比較 (順序非規範) のロジック新設

現状 (`query:"complete"` の fixture ファイルは実測 grep で spec/kuu.mbt 両リポジトリとも 0 件) は「実行不可能」であり、schema・decode・runner の 3 層が揃わない限り fixture を書いても pass/fail の判定手段がない。

---

## 3. fixture リスト提案

各件が pin する仕様点を 1 文で示す。**DR-097 の Pending 扱い分岐 (parse/complete モード差) を pin する fixture を最優先で含める** (issue 受け入れ条件 3)。DR 番号は本レポートでは新規に振らない (統括判断)。

| 提案 fixture (仮パス) | pin する仕様点 (1 文) | 対応する意味論軸 |
|---|---|---|
| `fixtures/complete/basic-boundary.json::trigger-spelling-at-word-start` | 単語頭でのカーソル補完は、まだ消費されていない greedy 面のトリガ綴りをそのまま候補として返す (DESIGN §15.13、DR-060 §1) | A1 |
| `fixtures/complete/basic-boundary.json::value-slot-after-trigger-consumed` | greedy トリガ消費直後、値スロットが飢えている位置では型+由来を持つ値候補が返り、消費済みのトリガ自身の綴りはもう候補に出ない | A1 |
| `fixtures/complete/partial-union.json::dead-end-excluded` | 値照合まで含めて成立しなくなった読み (dead end) は候補集合から完全に除外される (DR-060 §1「dead end は含めない」) | A3 |
| `fixtures/complete/partial-union.json::multiple-partial-paths-union` | or 選択や repeat の継続などで複数の partial 経路が並行生存する場合、和集合として複数候補が同時に返る (全消費も一意性も課さない、DR-060) | A2 |
| `fixtures/complete/after-filter.json::wordend-candidate-filtered-by-after` | `after` が与えられた場合、その候補採用後に `after` を消費して完全経路に到達できないものは候補から除外される (after 整合フィルタ、DR-060 §2) | A4 |
| `fixtures/complete/after-filter.json::value-candidate-passes-unexamined` | `after` 整合フィルタは値位置候補・Cont term の候補にはユーザ入力を発明できないため適用されず無条件で通る (DR-060 §2、`outcome.mbt:297-302` のコメントと一致) | A4 |
| `fixtures/complete/command-scope.json::command-name-candidate-then-child-scope` | サブコマンド境界をカーソルが跨ぐと、消費前は親スコープのコマンド名綴りのみが候補になり、消費後は子スコープの期待に候補集合が切り替わる (祖先の greedy が子に届かない構造、DESIGN §15.8) | A10 |
| `fixtures/complete/meta.json::alias-and-hidden-and-deprecated-candidates` | canonical/alias・hidden・deprecated の各メタ属性は独立に候補に乗り、hidden な入口も既定除外されずメタ付きで候補集合に残る (DR-058、DR-060 §3 の「メタ: canonical/alias か・hidden・deprecated」) — **wbtest カバレッジ 0 (A6) の穴を埋める最優先枠** | A6 |
| `fixtures/complete/dashdash-boundary.json::greedy-suppressed-after-dd` | `--` 発火後は greedy 面が非露出になり、それ以降のトークン位置での補完候補から greedy 系トリガ (option 等) が消え、素通し (positional/values) のみが候補になる (DR-042 実測列「dd 発火後の greedy 非露出」) | A9 |
| `fixtures/complete/dr097-pending-mode-split.json::pending-value-slot-viable-in-complete-mode-only` | **DR-097 の中核 pin**: 同一 definition・同一トークン列でも、argv 終端で値スロットが Pending になる読みは parse モードでは viable 扱いされず先食い抑制が働かない (= `fixtures/matcher-readings/long-empty-prefix-typed.json::unparsable-both-fall-through` が既に pin 済みの素通し解放挙動と対) のに対し、complete モードでは同じ Pending が viable 扱いされ先食い抑制が働くため、値スロット候補 (型+由来) が返る (`has_viable`, kuu.mbt `eval.mbt:1092-1101` の `if in_complete(ctx) { return true }` 分岐、DESIGN §15.13 は complete モードのこの分岐について沈黙) | **A8** |
| `fixtures/complete/dedup.json::same-spelling-different-ancestor-scope-collapses` | 異なる祖先 scope 経由で供給された同一綴りの候補は `path` の違いを無視して 1 件に畳まれる (`spelling/is_value/ty/origin/term/meta` の一致で dedup、`path` は同一性成分でない、`outcome.mbt:322-333`) | A12/A13 |

**DR-097 fixture の設計根拠**: `matcher-readings/long-empty-prefix-typed.json` (parse fixture、実機読了) の definition (`{name:"height", type:"number", long:true}` + `config.long_prefix:""` + `positionals:[{name:"rest", type:"string", repeat:{min:0}}]`) をそのまま流用し、`before:["height"]` (1 トークンのみ、カーソルがトークン末尾) で `complete()` を呼ぶ設計を提案する。**注意 (未検証)**: 実際に `complete()` を呼び出して返る候補集合を実機実行では確認していない (read-only 調査の範囲外)。上記の期待 (「値スロット候補が返る」) は `has_viable` のコード読解からの理論導出であり、fixture 作成時には kuu.mbt 側で `moon test` 等による実測確認が必須。

---

## 4. `docs/CONFORMANCE.md` 追随の必要箇所

実機確認 (`CONFORMANCE.md` 全文): 現行 `docs/CONFORMANCE.md:24` (§1 フィールド表 query 行) に「`"complete"` / `"definition_error"` は予約」と一言あるのみで、complete 専用の節は存在しない。**issue 本文が言及する「既存の CONFORMANCE 7 op 表 (parse/complete 含む) との整合確認」という記述は事実誤認**であることを実機確認で裏取り済み — CONFORMANCE.md §2 の 7 op 表 (`set`/`default`/`unset`/`empty`/`update`/`remove`/`splice`) は `effects[].op` の値セル副作用記述子語彙であり、query タグ (`parse`/`lower`/`definition_error`/`complete`) とは別軸。complete fixture の effects と 7 op 表は無関係 (complete は候補集合を返すクエリで、値セルへの副作用を持たない)。

追随が必要な箇所 (definition_error が §1 に「予約」から実体定義へ格上げされた際の変更パターンを踏襲):

1. **§1 フィールド表**: `query` 行の「`"complete"` は予約」を削除し、`"complete"` (本書 §4 として新設する節) を正式リンクに変更
2. **新規 §4 節 (仮称「補完クエリ」)**: `parse`/`lower`/`definition_error` に続く 4 番目の query 形式として、`before`/`after`/`word?` 入力構造と `candidates` 期待値構造 (§2.2 の wire format 案に対応) を規定
3. **§3 比較規約への追記**: `candidates` の比較規約 (集合比較か順序込みか) を明記。既存 §3 は `effects`(配列順込み)・`result`(構造等価)・`interpretations`(集合比較) の 3 パターンのみを規定しており、`candidates` がどちらに属するか (本レポート §2.2 の提案は集合比較) を正式裁定して追記する必要がある
4. **メタ比較の optional 検証パターン明記**: `errors.reason`/`tried_triggers` と同様、`meta`(alias/hidden/deprecated) や `path` を「書けば検証、書かなければ未検証」の optional 扱いにするか、それとも常に書く必須運用にするか (A6 のカバレッジ穴の再発防止に直結、COMP-Q2 参照) を明記
5. **7 op 表との無関係性を明示する 1 文の追加を検討**: issue の事実誤認 (「既存 7 op 表との整合確認」) が再発しないよう、complete 節の冒頭に「本節は §2 の 7 op 表とは独立の語彙体系である」旨を明記する案 (COMP-Q5 で要裁定、過去仕様言及にならない範囲での書き方が必要)

---

## 5. Open Questions (統括裁定が必要)

導出可能なものは question にせず本文中に導出結果として記載済み。以下は spec 側の正式裁定が必要な項目のみ。

- **COMP-Q1**: case の入力フィールド名は `before`/`after` (DESIGN §15.13 のシグネチャ語彙に合わせる) か、既存 `argv` を再利用しつつ complete 専用の解釈を足す形か。前者は新規語彙導入、後者は「query によって argv の意味が変わる」曖昧さを生む (definition_error が `argv` を省略で対応したのとは事情が異なり、complete は `argv` に相当するものが必須)。
- **COMP-Q2**: `candidates[].meta` (is_alias/hidden/deprecated) と `path` を fixture 上で必須フィールドにするか optional 検証にするか。A6/A13 のカバレッジ穴は「meta を省略すると default 値 `{false,false,false}` と等価」という §3 比較規約 (フィールド省略=default 値と等価) の運用がそのまま complete に持ち込まれると、書かなくても schema を通ってしまい今と同じ穴が再発する。definition_error の `errors.reason` が optional 検証で運用されている前例 (書けば検証、書かなければ kind までの検証) を complete にもそのまま適用するか、meta だけは必須にするかは方針判断。
- **COMP-Q3**: `Cand` 構造体 (kuu.mbt `node.mbt:601-609`) に completer 名フィールドが存在しない事実 (A7) について、これは (a) v1 では completer 名を返さない設計判断 (DESIGN line 1211 の記述が将来拡張の予約でしかない)、(b) 実装漏れ、のどちらか。DESIGN.md 本文レベルでは「値位置の型情報 / completer 名」と両方を候補構造の一部として明記しており、実装側 (`Cand`) には型情報しか乗っていない — 設計と実装の乖離の可能性がある。裁定次第で fixture 化対象が変わる (completer 名を pin する fixture を書けるかどうか自体が (a)/(b) の答え次第)。
- **COMP-Q4**: `Cand.path` (DR-066 §4 由来、祖先 scope 経路) は dedup 規則上「候補の同一性に関与しない」と実装コメント (`outcome.mbt:322-333`) が明言している。これを fixture でどう扱うか — (a) `path` は wire に含めず検証対象外と明記する、(b) `path` を wire に含めるが比較規約上は無視されるフィールドとして書く (定義済みだが未検証、を明示する目的)、(c) `path` 自体を fixture 化しない。ambiguous outcome の `claimants` (DR-073、比較単位を束ねる設計) と似た性質を持つため、その前例に倣うかどうかも論点になりうる。
- **COMP-Q5**: `docs/CONFORMANCE.md` の complete 新設節に「§2 の 7 op 表とは無関係」と明示する 1 文を残すか。恒常参照文書での除外明示は本来避ける対象だが、issue に実際に事実誤認が記録された実例がある (再発防止の価値) との比較衡量が必要。

---

## 付記: 調査データの正確性についての訂正

4 本の並列調査のうち conformance 調査の結果には「ユーザ言及の『7 op 表』(CONFORMANCE.md:44-54) は … complete と無関係」との記述があったが、これは実機確認で裏付けが取れた正確な指摘である。一方、issue 本文 (`docs/issue/2026-07-12-complete-query-fixture-coverage-gap.md:37-39`) の「既存の CONFORMANCE 7 op 表 (parse/complete 含む) との整合確認」という記述自体は、conformance 調査が指摘する通り事実として不正確 (7 op 表に `complete` は含まれない) であることを実機で確認した。本レポート §4 の追随案では、この事実誤認を踏まえた記述に改めている。
