# DR-104: 補完クエリ (`query: "complete"`) の fixture format — query 予約の実体化

> 由来: kawaz 裁定 (V1-Q1 = b: 4 プロファイル全部の green が v1.0.0 発行条件、`docs/QUESTIONS.md`) により complete クエリの fixture 系統が v1 blocker に昇格した。DR-065 §1 が「予約」のみとしていた query タグ `"complete"` の座席を、DR-070 (`"lower"`) / DR-082 (`"definition_error"`) と同格の確定 DR として実体化する。`docs/findings/2026-07-13-complete-fixture-recon.md` (輪郭調査: 意味論 14 軸のカバレッジマトリクス・wire format 案・fixture 10 本提案) と `docs/findings/2026-07-14-completion-constraint-and-identity.md` (COMP-Q4 の掘り下げ: 候補同一性の spec 空白の確定、制約×補完の非対称の発見と解消)、および `docs/journal/2026-07-14-completion-design-rulings.md` が記録する COMP-Q1〜Q5 裁定バッチ (kawaz 2026-07-14、`docs/QUESTIONS.md` 経由) を反映する。

## 決定

### 1. 入力フィールド: `args_before` / `args_after` / (将来予約) `word_before` / `word_after`

```
complete(atomic, {
  args_before: [tokens],    // カーソル前のトークン列 (必須)
  args_after?: [tokens],    // カーソル後のトークン列 (optional)
  word_before?: "...",      // カーソル単語の前半 (将来予約、v1 未実装のまま予約)
  word_after?: "...",       // カーソル単語の後半 (将来予約、v1 未実装のまま予約)
}) → candidates 構造
```

DR-060 §2 のシグネチャ `{before, word, word_suffix?, after?}` を、`args`/`args_pos` への改名サイクル (issue `argv-to-args-rename`) と同じ命名統一の流れで改名する: `before` → `args_before`、`after` → `args_after`、`word` (カーソル単語の前半) → `word_before`、`word_suffix` (カーソル単語の後半) → `word_after`。COMP-Q1 の議論過程では `before`/`after` 単独案・`argv_before`/`argv_after` 案も検討されたが、`argv` 自体が言語間で `$0` を含むかどうか割れる曖昧語であることが言語横断調査 (`docs/findings/2026-07-14-argv-vocabulary-survey.md`) で判明し不採用、`args` 系へ統一された (COMP-Q1d)。`before`/`after` 単独では「トークン列の前後」なのか「カーソル単語内の前後」なのか読み手が判別できないため、`args_`/`word_` の prefix で対象を明示する。

**`word_before`/`word_after` は v1 では未実装のまま予約する** — 参照実装 (`kuu.mbt` `src/core/outcome.mbt:303-308`) の `complete()` シグネチャは `(root, before, defs?, after?)` のみで word 系パラメータを持たない (DR-060 §2 の「v1 未使用可」と整合する未実装状態)。fixture では書かない。

### 2. `candidates` の wire 表現

```json
{"spelling": "--port", "is_value": false, "term": "word_end", "meta": {"is_alias": false, "hidden": false, "deprecated": false}}
{"is_value": true, "ty": "number", "origin": "port", "term": "word_end", "meta": {"is_alias": false, "hidden": false, "deprecated": false}}
```

参照実装の `Cand` 構造体 (`kuu.mbt` `node.mbt:644-652`) を直訳する:

| wire フィールド | 意味 | 必須性 |
|---|---|---|
| `spelling` | exact 候補の綴り (素の文字列)。`is_value:true` では意味を持たず省略可 (構造等価規約により省略 = `""` と等価、`Cand.spelling` の実装既定値と一致) | `is_value:false` では実質必須 |
| `is_value` | この候補が exact トリガ綴りか値位置かの区別 | 必須 |
| `ty` | 値位置候補の型 (`definition` の `type` 参照と同じ語彙、`"string"`/`"number"`/`"int"`/`"float"`/`"bool"`/`"flag"`/`"count"`/`"none"` 等)。`is_value:true` の時のみ意味を持つ | `is_value:true` では実質必須 |
| `origin` | 由来要素名 | 必須 |
| `term` | 終端ヒント (`Cand.term`、`TermHint` の直列化): `"word_end"` (確定、スペース可) / `"cont"` (継続、`--key=` の後等スペース不可) | 必須 |
| `meta` | `{is_alias, hidden, deprecated}` (`CandMeta` 直訳) | **必須 — 省略不可** (§3 参照) |
| `completer` (optional) | 値位置候補の completer 名 (DR-060 §3「値位置: 型情報 + completer 名」)。**wire には持たせるが fixture では opt-in 検証** (書けば検証、書かなければ未検証) — 参照実装の `Cand` にはまだ completer 名フィールドが存在せず (`node.mbt:644-652`)、実装側の追随タスクとして残る | opt-in |

`Cand.path` (祖先 scope 経路、DR-066 §4 由来) は **wire に含めない**。§3 の候補同一性判定から明示的に除外されている値であり (dedup 規則がまさに「path の違いを無視する」ことを目的とする)、含めても比較に使えない中途半端なフィールドになる。DR-073 の `claimants` のような「実体を区別する精密化」路線は本 DR では採らない — `origin` (由来要素名の文字列) までを候補同一性の粒度とする (§3)。

### 3. 候補の同一性 = wire 表現の構造等価 (dedup 規則)

**2 つの候補が同一とみなされるのは、`spelling`/`is_value`/`ty`/`origin`/`term`/`meta` の 6 フィールドが完全一致する場合に限る。** 参照実装 (`kuu.mbt` `outcome.mbt:316-343` の `complete()` 内 dedup ループ) が既に pin している規則をそのまま spec へ格上げする — 実装コメントの論拠 (`outcome.mbt:322-326`)「DR-060 §1 の "union of what's readable" is a union over SPELLINGS, not over the scopes that offer them」を正とする。異なる祖先 scope 経由で供給された同一綴りの候補は 1 件に畳まれる。

候補同一性の空白は DR-060/DR-066/DR-073 のいずれにも規定が存在しなかった (`docs/findings/2026-07-14-completion-constraint-and-identity.md` 調査項目 1 が確定させた事実)。`origin` (要素名の文字列) までを同一性の粒度とし、link/ref 越しの実体 id までの精密化 (DR-073 の「実体 entity」水準) は本 DR では採らない — `origin` の文字列一致で十分という実装の既定路線を追認する。

### 4. `candidates` は集合比較

DR-060 §1 の「和集合」は経路の和集合ではなくスペリングの和集合であり (§3 の dedup 規則がこれを裏付ける)、複数候補間に順序を課さない。`CONFORMANCE.md` §3 の `interpretations` (集合比較) と同じ扱いを `candidates` にも適用する。

### 5. 制約 (遅延述語) は before-only 補完の候補生存に不参加。`args_after` 供給時は完全経路判定が働く

**`args_before` のみの補完 (行末補完、最も一般的な形) では、`required`/`required_group`/`requires`/`exclusive_group`/`conflicts_with` の全ての遅延述語は候補生成・dead end 判定に一切参加しない。** 相区分は「dead end 判定 = parse 相、制約評価 = resolve 相」に固定する (v1 の線)。`docs/findings/2026-07-14-completion-constraint-and-identity.md` の決定 (kawaz 方向出し、2026-07-14) をそのまま反映する。

- **論拠 (相区分)**: DR-047 §4/§5 は遅延述語の評価対象を「値源ラダー充填後の最終状態」と規定し、DR-097 は「読める」の判定を「その entry 自身の値スロット消費の確保 + 値空間照合 (parse 相)」に限定して下流の帰結 (遅延述語含む) を判定に含めないと明記する。`complete` の `args_before` 走査時点では経路がまだ完結していないため、遅延述語評価に必要な「最終状態」がそもそも存在しない
- **論拠 (説明チャネルの非対称)**: 候補から消えるという表現は「なぜこの綴りが打てないか」を伝える手段を持たない。実行時に禁則を選んでしまった場合の失敗は `exclusive_group_violated` 等の機械可読な reason (DR-066 §3) つきで表面化する — 早期に候補から隠すより打たせて理由つきで教える方が説明力が高い (kawaz の理由づけ、findings 参照)
- 指定述語 (`exclusive_group`/`conflicts_with`) 限定で「committed 集合は単調だから `args_before` 段階でも一部の違反が証明可能」という単調性論による部分拡張も検討されたが不採用 (対象/非対象述語の非対称ルールを生成器実装者が覚える負担、`unset` による committed 取消しで単調性が破れる留保つきの実装複雑化、上記説明チャネル論点が上回るため。詳細は「採用しなかった案」参照)

**`args_after` が供給された場合は、after 整合フィルタが完全経路判定 (遅延述語込み) を行う。** 各 exact 候補 (`term: "word_end"`) について `args_before + [候補] + args_after` を組み立ててフル `parse()` を実行し、`Success`/`Ambiguous` なら残し `Failure` なら除外する (DR-060 §2、参照実装 `outcome.mbt:347-366`)。`parse()` は遅延述語評価を含むため、`args_after` 経由の判定は間接的に制約込みになる。**これは before-only の不参加と矛盾する非対称ではなく、DR-047 の教義 (遅延述語は完全経路の成立条件) の一様適用が生む 2 つの自然な帰結である** — `args_before` のみでは経路が未完結 (評価対象なし)、`args_before + 候補 + args_after` は完結した完全経路 (評価対象が存在する) という違いに過ぎない。値位置候補・`term: "cont"` の候補は after 整合フィルタの対象外 (ユーザ入力を発明できないため無条件で通る、DR-060 §2)。

## 採用しなかった案

### 単調性論による指定述語限定の部分拡張

`exclusive_group`/`conflicts_with` は判定入力が committed 集合のみで値源ラダーに依存せず単調 (「`args_before` の情報だけで `args_after` に何を補っても違反が確定する」ことが証明可能) という理屈は論理的には成立する (`docs/findings/2026-07-14-completion-constraint-and-identity.md` §3-3)。しかし `unset` (`--no-x`) による committed 取消しが対象に含まれる場合は単調性が破れるため「本当に単調か」の判定に新しい宣言軸が要る実装複雑化、対象述語と非対象述語の非対称ルールを生成器実装者が覚える負担、および §5 の説明チャネル論点が上位に立つため不採用 (kawaz 裁定)。

### `candidates` の順序込み比較

DR-060 §1 の「和集合」がスペリングの和集合である以上、複数候補間に生成順序の規範性はない。`interpretations` と同じく集合比較が自然。

### `Cand.path` を wire に含める

`path` は dedup 規則から明示的に除外されている値であり、含めても「定義済みだが比較には使われない」中途半端なフィールドになる。DR-073 の `claimants` (比較単位を束ねる精密化) と似た性質を持つが、`candidates` の同一性を `origin` の粒度に留める本 DR の方針 (§3) とは整合しない。

## 波及

- **DR-060 §2**: `before`/`word`/`word_suffix`/`after` の語彙は本 DR により `args_before`/`word_before`/`word_after`/`args_after` へ改名される (DR-047 §5 / DR-103 §3・§4 の明確化 note 前例形式で DR-060 §2 に追記)
- **DESIGN.md §15.13**: `complete(atomic, {before, word, word_suffix?, after?})` のシグネチャを `{args_before, args_after?, word_before?, word_after?}` に追随
- **CONFORMANCE.md**: §1 の「`"complete"` は予約」を削除し新設 §4「補完クエリ」への参照に変更 (既存 §4 ディレクトリ構成 → §5、§5 runner の契約 → §6 に繰り下げ)。新 §4 で `args_before`/`args_after`/`candidates` の入出力構造を規定。§3 比較規約に `candidates` の集合比較・`meta` 必須検証・`completer` opt-in 検証を追記
- **schema/fixture.schema.json**: `query:"complete"` の `if/then` 節と `completeExpect`/`candidate` の `$defs` を新設
- **fixtures/complete/**: `docs/findings/2026-07-13-complete-fixture-recon.md` §3 の 10 本提案 + `docs/findings/2026-07-14-completion-constraint-and-identity.md` の positive fixture 提案 (排他確定候補も候補に残る) を実体化 (別 commit、本 DR とは独立に着手)
- **DR-065 §1**: query タグ 4 種のうち `"complete"` が確定 (`"lower"` = DR-070、`"definition_error"` = DR-082 に続く 3 件目)。予約は尽きる

## 関連

- DR-060 (補完クエリの意味論 — 本 DR は fixture format の確定であり意味論自体は変更しない、語彙のみ改名)
- DR-070 (`"lower"` query の fixture format — 同型の格上げの前例)
- DR-082 (`"definition_error"` query の fixture format — 同型の格上げの前例、kind 語彙の宣言パターン)
- DR-047 (制約評価のレイヤリング — §5 の「遅延述語は完全経路の成立条件」がそのまま本 DR §5 の論拠)
- DR-097 (先食い/早閉じ抑制の精密化 — 「読める」の parse 相限定判定が complete の dead end 判定の基盤)
- DR-066 §4 (`path` — `Cand.path` の出所、本 DR では wire に含めない判断)
- DR-073 (`claimants` — 精密化パターンの前例、本 DR では採らない判断の対比先)
- DR-057 (alias) / DR-058 (hidden/deprecated) — `CandMeta` の 3 フィールドの出所
- `docs/findings/2026-07-13-complete-fixture-recon.md` (輪郭調査、fixture 提案の出所)
- `docs/findings/2026-07-14-completion-constraint-and-identity.md` (候補同一性・制約×補完の掘り下げ)
- `docs/journal/2026-07-14-completion-design-rulings.md` (COMP-Q1〜Q5 裁定の経緯)
- `docs/QUESTIONS.md` V1-Q1 (complete の v1 blocker 化)
- issue `2026-07-12-complete-query-fixture-coverage-gap` (発端)
