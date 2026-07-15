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

> **明確化 (統括検証 2026-07-14、codex レビュー #2 の反映): 上記は「改名のみ」ではなく、DR-060 §2 原文が `word` に課していた必須性を v1 で明示的に supersede する意味論変更である。** DR-060 §2 原文で「v1 未使用可」の注記が付いていたのは `word_suffix` (現 `word_after`) のみで、`word` (現 `word_before`) には付いておらず必須フィールドだった。本 DR は (a) 参照実装が word/word_suffix いずれも当初から未実装だった事実、(b) DR-060 §3 が「絞り込みポリシー (prefix 絞り含む) は候補メタを見た生成器側の選択であり、kuu は固定しない」と規定しており prefix filtering はもともと core が word の値を消費する契約を持たなかったこと、の 2 点により `word` 必須契約を v1 で supersede する。`args_before` はカーソル前で確定した完全トークンのみを含み、進行中の部分単語は含めない — 単語内カーソル時の core の候補集合は単語頭カーソル時と同一であり、絞り込みは生成器が word (将来実装) を使って行う。

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

> **明確化 (統括検証 2026-07-14、codex レビュー #2 の反映):**
>
> (a) 上記 §2 冒頭の exact 候補例、および CONFORMANCE.md §4 の公式例が `origin` を欠くのは誤記。表の「必須」が正 — 実 fixture (`fixtures/complete/*.json` 全 10 本) は例外なく exact 候補にも `origin` を書いている。
>
> (b) `ty` 行の「等」は誤り。値位置候補に出る型は解決済み primitive の `"string"`/`"number"`/`"int"`/`"float"`/`"bool"` の 5 種のみ (flag/count/none は値スロットを取らないため値位置候補として出現しない)。custom type の `ty` 表現は未確定のまま残る (実装追随時に確定)。
>
> (c) `origin` は alias 経由でも canonical 要素名を指す (DR-057 §26「効果は canonical の実体セルへ、結果キーは canonical のみ」の帰結、`fixtures/complete/meta.json` で pin 済み)。ref/link 越し・lowering 生成要素の origin 決定則は未定義のまま残る (別 issue で追跡)。
>
> (d) `completer` は参照実装の追随まで fixture に書かない — word_before/word_after と同じ「参照実装が追随するまで fixture では書かない」注記を明示する (書くなら実装追随と同一サイクルで着手する)。
>
> (e) `term` のスペース可否は表示 hint ではなく制約 — `cont` の後に空白を挿入すると継続 (`--key=` 等) の解釈が破綻する。

> **明確化 (統括検証 2026-07-15): custom type の `ty` 表現を確定する — (b) が「実装追随時に確定」と残していた宿題の解消。** custom type (types registry の factory 参照、DR-028) を使う definition で complete した場合も、`candidate.ty` は**基底 primitive に解決した値** (`"string"`/`"number"`/`"int"`/`"float"`/`"bool"` の 5 種) を返す。`ty` は補完生成器に「期待される入力の形」を伝える閉じた語彙であり、custom 型名は開いた集合 (DR-094 の拡張 ns を含む) で生成器側に解釈の当てがない — custom 型固有の補完体験は `completer` フィールド (DR-060 §3「値位置: 型情報 + completer 名」) が担う関心分離を維持する。参照実装もこの形 (custom type の shadow は基底 primitive のみを保持し、型名文字列を候補へ運ぶ経路を持たない — kuu.mbt `wire_decode.mbt` の types 復元)。`schema/fixture.schema.json` の `candidate.ty` enum (5 primitive 固定) は変更不要。custom type が primitive 以外の基底を持つ拡張 (DR-028 が構想した任意 value_parser の実装追随) が入る場合は、その拡張の DR で `ty` の表現を再検討する。
>
> **基底の決定規則 (codex レビュー #6 の補強、2026-07-15)**: 「基底 primitive」は type 定義が参照する **factory の種別が一意に定める** — `builtin/number_parser` → `"number"`、`builtin/int_parser` → `"int"`、`builtin/bool_parser` / `builtin/tty` → `"bool"` (v1 の type_parser 全 4 種、`schema/builtin-descriptors.json` の `role: "type_parser"` 住人)。factory config (int_round 等) は値空間・丸めを変えるが基底 kind は変えない。type 定義が別の type を参照する場合は解決順 (DR-035) を推移的に辿った**終端 factory** の kind で決まる。終端 factory を持たない type 定義 (構造テンプレのみ、DR-028「型定義の中身 = 普通の node」) の要素は値位置候補を構造展開先で生む (この規則の適用対象外)。descriptor の `io_type.output` (DR-107) は wire 型の粒度 (int/float を区別しない) なので candidate.ty の決定には使わない — 拡張 ns の type_parser が増える場合、その descriptor 宣言側で candidate.ty への写像 kind を宣言する必要がある (宣言軸の追加は当該拡張の DR の関心)。なお §3 の completer merge 規則 (6 フィールド一致 + completer 不一致 → completer を落とす) により、同一 6 フィールドに畳まれた複数経路の custom semantics が競合した場合は**安全側として custom completion を失う** — これは意図した仕様 (custom 固有体験の completer 委譲は、候補が custom 単独由来で同定できる場合の設計であり、競合時は基底 primitive の一般補完に退避する)。

> **明確化 (統括検証 2026-07-15): origin 決定則の部分確定 — (c) が未定義のまま残していた断面のうち、ref template 越し以外を確定する。** origin は lowering が要素へ刻んだ名前の単純伝播で決まり、以下 3 断面は参照実装の一貫挙動をそのまま規範化する: (i) **global (Rooted 衛星) 越し**の候補の origin は、コピー先の子 scope ではなく宣言元 canonical 要素名 ((c) の alias と同じ帰結。`fixtures/complete/global-scope-union.json` で pin 済み)。 (ii) **repeat lowering の内部 id** (`#` 予約名前空間、DR-046 §4) は origin に現れない — lowering 産物の内部でも primitive の name は元の要素名のまま伝播する (`fixtures/complete/repeat-internal-id-origin.json` で pin)。 (iii) **DR-063 A.1 の裸文字列→exact 正規化で生まれる匿名 exact 候補**の origin はその spelling 自身 — 名前を持たない要素の fallback であり、`origin` 必須規約と §3 の 6 フィールド同一性にそのまま乗る (`fixtures/complete/anonymous-exact-origin.json` で pin)。**ref template (DR-078) 越しの候補のみ未定義のまま残る** — 参照実装は trigger 候補に参照元要素名、値位置候補に template 内部 leaf 名を返す非対称を持ち、これを仕様化するか統一するかは実需 fixture が出た時に確定する (issue `lowering-generated-element-origin-rule` で追跡)。

### 3. 候補の同一性 = wire 表現の構造等価 (dedup 規則)

**2 つの候補が同一とみなされるのは、`spelling`/`is_value`/`ty`/`origin`/`term`/`meta` の 6 フィールドが完全一致する場合に限る。** 参照実装 (`kuu.mbt` `outcome.mbt:316-343` の `complete()` 内 dedup ループ) が既に pin している規則をそのまま spec へ格上げする — 実装コメントの論拠 (`outcome.mbt:322-326`)「DR-060 §1 の "union of what's readable" is a union over SPELLINGS, not over the scopes that offer them」を正とする。異なる祖先 scope 経由で供給された同一綴りの候補は 1 件に畳まれる。

候補同一性の空白は DR-060/DR-066/DR-073 のいずれにも規定が存在しなかった (`docs/findings/2026-07-14-completion-constraint-and-identity.md` 調査項目 1 が確定させた事実)。`origin` (要素名の文字列) までを同一性の粒度とし、link/ref 越しの実体 id までの精密化 (DR-073 の「実体 entity」水準) は本 DR では採らない — `origin` の文字列一致で十分という実装の既定路線を追認する。

> **明確化 (統括検証 2026-07-14、codex レビュー #2 の反映): 候補同一性の規範は上記太字文の「6 フィールド record 完全一致」のみであり、実装コメントが引用する「union over SPELLINGS」は spelling 単独の dedup 基準ではない。** 「union over SPELLINGS, not over the scopes that offer them」という論拠は、**path (祖先 scope 経路) を同一性の成分から除外する**論拠として引用されているのであって、「spelling が同じなら他のフィールドを無視して畳む」という意味ではない。同じ綴り (spelling) でも `origin` が異なる候補 (DR-041 §4 が合法とする「同一スコープ内で異なる origin の要素が同じトリガ綴りを持つ」重複トリガのシナリオ) は、6 フィールド規則により dedup されず 2 件のまま併存する。`completer` は同一性の成分ではない (6 フィールドに含まれない) — 6 フィールドが完全一致すれば `completer` だけが異なる候補は同一候補として扱われる。この場合にどちらの `completer` を残すかの merge 規則は、`completer` の実装追随時 (§2(d) 参照) に確定する。

> **明確化 (統括検証 2026-07-15): `completer` の merge 規則を確定する — §2(d) が残していた宿題の解消。** 6 フィールド (`spelling`/`is_value`/`ty`/`origin`/`term`/`meta`) が完全一致し `completer` の値だけが食い違う候補は、**`completer` を持たない候補として畳まれる** (wire では `completer` を省略する)。6 フィールドが完全一致し `completer` も一致する場合はそのまま 1 件に保持する。参照実装が `completer` を追随実装した (kuu.mbt 2026-07-15、DR-104 §2(d) の実装追随完了) ことに伴う確定であり、`fixtures/complete/completer-merge-conflict.json` / `fixtures/complete/completer-merge-match.json` がこの規則を pin する。

### 4. `candidates` は集合比較

DR-060 §1 の「和集合」は経路の和集合ではなくスペリングの和集合であり (§3 の dedup 規則がこれを裏付ける)、複数候補間に順序を課さない。`CONFORMANCE.md` §3 の `interpretations` (集合比較) と同じ扱いを `candidates` にも適用する。

> **明確化 (統括検証 2026-07-14、codex レビュー #3 の反映): `candidates` 比較の正確な規範は「producer は §3 の 6 フィールド identity で重複する候補を出力してはならない + 比較は順序非依存・多重度保持 (multiset) の一対一対応」であり、素朴な集合 (set) 比較ではない。** 「スペリングの和集合」という表現は、`path` (祖先 scope 経路) を候補同一性の成分から除外する趣旨 (§3 の「union over SPELLINGS, not over the scopes」引用、path を無視する論拠) であって、「spelling が一致すれば他のフィールドを無視して 1 件に畳む」という spelling 単独の dedup 基準ではない — 同一 spelling でも `term` (`fixtures/complete/eq-split-cont.json`) や `origin` (DR-041 §4 の重複トリガ) が異なる候補は畳まれず併存する。producer (実装) 側が §3 の 6 フィールド完全一致で重複を出力しなければ、multiset 比較と (重複のない) set 比較は結果として一致するため、旧文言は誤りではなく説明が不十分だった (codex レビュー #3 A-m2/B-M6 の反映、CONFORMANCE §3 の multiset 比較規定と同一の規範)。

### 5. 制約 (遅延述語) は before-only 補完の候補生存に不参加。`args_after` 供給時は完全経路判定が働く

**`args_before` のみの補完 (行末補完、最も一般的な形) では、`required`/`required_group`/`requires`/`exclusive_group`/`conflicts_with` の全ての遅延述語は候補生成・dead end 判定に一切参加しない。** 相区分は「dead end 判定 = parse 相、制約評価 = resolve 相」に固定する (v1 の線)。`docs/findings/2026-07-14-completion-constraint-and-identity.md` の決定 (kawaz 方向出し、2026-07-14) をそのまま反映する。

- **論拠 (相区分)**: DR-047 §4/§5 は遅延述語の評価対象を「値源ラダー充填後の最終状態」と規定し、DR-097 は「読める」の判定を「その entry 自身の値スロット消費の確保 + 値空間照合 (parse 相)」に限定して下流の帰結 (遅延述語含む) を判定に含めないと明記する。`complete` の `args_before` 走査時点では経路がまだ完結していないため、遅延述語評価に必要な「最終状態」がそもそも存在しない
- **論拠 (説明チャネルの非対称)**: 候補から消えるという表現は「なぜこの綴りが打てないか」を伝える手段を持たない。実行時に禁則を選んでしまった場合の失敗は `exclusive_group_violated` 等の機械可読な reason (DR-066 §3) つきで表面化する — 早期に候補から隠すより打たせて理由つきで教える方が説明力が高い (kawaz の理由づけ、findings 参照)
- 指定述語 (`exclusive_group`/`conflicts_with`) 限定で「committed 集合は単調だから `args_before` 段階でも一部の違反が証明可能」という単調性論による部分拡張も検討されたが不採用 (対象/非対象述語の非対称ルールを生成器実装者が覚える負担、`unset` による committed 取消しで単調性が破れる留保つきの実装複雑化、上記説明チャネル論点が上回るため。詳細は「採用しなかった案」参照)

**`args_after` が供給された場合は、after 整合フィルタが完全経路判定 (遅延述語込み) を行う。** 各 exact 候補 (`term: "word_end"`) について `args_before + [候補] + args_after` を組み立ててフル `parse()` を実行し、`Success`/`Ambiguous` なら残し `Failure` なら除外する (DR-060 §2、参照実装 `outcome.mbt:347-366`)。`parse()` は遅延述語評価を含むため、`args_after` 経由の判定は間接的に制約込みになる。**これは before-only の不参加と矛盾する非対称ではなく、DR-047 の教義 (遅延述語は完全経路の成立条件) の一様適用が生む 2 つの自然な帰結である** — `args_before` のみでは経路が未完結 (評価対象なし)、`args_before + 候補 + args_after` は完結した完全経路 (評価対象が存在する) という違いに過ぎない。値位置候補・`term: "cont"` の候補は after 整合フィルタの対象外 (ユーザ入力を発明できないため無条件で通る、DR-060 §2)。

> **明確化 (統括検証 2026-07-14、codex レビュー #2 の反映):**
>
> (a) after 整合フィルタの対象は「exact かつ `term: "word_end"` の候補」に限る。上記段落見出し「`args_after` 供給時は完全経路判定が働く」は候補種別を限定しない一般命題に読めるが、実際に完全経路判定されるのは exact/word_end 候補のみであり、値位置候補・`term: "cont"` の候補は (直前の文が既に述べる通り) 対象外で無条件生存する。
>
> (b) `args_after` の省略と明示的な空配列 `[]` の供給は同値 (length ベース判定、参照実装 `outcome.mbt:344` の `if after.length() == 0 { return cands }` と一致)。presence (フィールドの有無) ではなく length で判定する。

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
