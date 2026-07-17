# DR-102: `cell_filters` の属性分割 — `final_filters` (非 accum、最終値ガード) と `accum_filters` (累積配列)

> 由来: `cell_filters` が multiple 宣言の有無によって `T→T` (scalar filter registry) と `Acc→Acc` (ARRAY filter registry) という型の異なる 2 つの語彙を 1 つの属性名に内包している構造的欠陥について、kawaz が前提を棄却する裁定 (2026-07-13、issue `2026-07-14-cell-filters-attribute-split.md`)。「cell という名前自体が『値の置き場』という内部事情由来で利用者の目的に合っていない」「両方を 1 つのクロージャで扱いたい人はいない。違うものを同じものとして扱わない。解像度が上がった時点で名付けを正す」「既存を壊すことは正しさがあれば問題ない (ドラフト期)」。この前提棄却により、DR-101 §3 の判定マトリクス・層違い invalid-range 判定・旧 DR-102 (非 accum 位置の cell_filters に ARRAY-only 綴りを書いた場合の invalid-range 判定、未 push のまま abandon) が丸ごと不要化した。SPL-Q1〜Q6 の裁定バッチ (docs/QUESTIONS.md 経由、kawaz 2026-07-14) を反映する。

## 決定

### 1. 属性分割: 1 属性 = 1 registry = 1 語彙

| 属性 | 型シグネチャ | 対応 registry | 適用可能な要素 |
|---|---|---|---|
| `piece_filters` (不変) | `String → String` | scalar filter registry | 値要素 (座席 B、DR-079) |
| `value_filters` (不変) | `T → T` (each 相) | scalar filter registry | 値要素 (座席 C、DR-079) |
| `final_filters` (新設) | `T → T` (最終値) | scalar filter registry | **非 accum 要素**のみ |
| `accum_filters` (新設) | `T[] → T[]` (累積配列) | ARRAY filter registry | **accum 要素**のみ |

**accum 要素の定義**: `multiple` / `repeat` / `separator` のいずれかの宣言を持つ要素 (`is_accum_elem` 判定、DR-083 §5 の `collect_scalar_array_default` — 非 accum 要素への配列 default 宣言の構造不一致検査 — と同じ導出基準)。これら 3 属性のいずれかがあれば accumulator (段6) が意味を持つ複数値経路になるため、Acc→Acc の `accum_filters` が対象になる。いずれも無ければ非 accum 要素で、T→T の `final_filters` が対象になる。「multiple 宣言の有無」は代表例による簡略表現であり、正確な適格性は `is_accum_elem` (3 属性いずれか) で判定する — 以下、本 DR 内の「accum 要素」「非 accum 要素」はこの定義を指す。

`final_filters` は旧 `cell_filters` の非 accum 用法 (count 型の update fold 最終値、scalar set 経路の最終値) を引き継ぐ「最終値ガード」— `value_filters` が「実値を運ぶ効果 (set の operand、update の適用結果) の piece 直後」にのみ効くのに対し、`final_filters` は効果の種類 (set/update/default/unset) を問わず確定した最終セル値に一様に届く (§4 の argv_pos 実証差がこの違いを observable な形で示す)。`accum_filters` は旧 `cell_filters` の accum 用法 (累積配列全体への変換、`unique` 等) をそのまま引き継ぐ。

### 2. unknown-vocab 判定の単純化

分割後は 1 属性が要求する registry が 1 つに固定されるため、DR-101 §3 のような「一次判定 (両 registry 未登録) → 二次判定 (別 registry には登録済み、層違い)」という 2 段判定は不要になる。各属性は自分の registry の owns 集合のみを見て、載っていなければ一意に `unknown-vocab` (DR-101 §1 のまま)。他 registry との比較は発生しない。

**hint はこの単純化と直交する**: `final_filters` に ARRAY-only 綴り (`unique`) を書いた場合、kind は単純な `unknown-vocab` だが、DR-054 §4 の `hint` フィールド (message と同様レンダラ管轄) を使って「`unique` は `accum_filters` にのみ存在する綴りです」という誘導情報を提示できる。hint の生成要否・実装は kuu.mbt 側の裁量 — kind の選択にも fixture の `expect.errors` 比較 (element+kind の集合比較、DR-082 §1) にも影響しない。

> **明確化 (統括検証 2026-07-14、codex レビュー M-5 の反映): 「1 属性 1 registry」は綴りの登録有無だけでなく、factory 固有の静的検査 (`regex_match` の pattern compile 検査等) にも及ぶ — 検査はその属性が要求する registry が当該綴りを所有する場合にのみ走る。** ARRAY filter registry (`accum_filters` 用) は `regex_match` を所有しないため、`accum_filters` に `regex_match` という綴りを書いても、単純な unknown-vocab (綴りが ARRAY registry の owns 集合に無い) としてのみ判定され、scalar filter registry 側の pattern compile 検査 (DR-085 §1) は走らない。この限定を欠くと「未登録の綴りでも他 registry の同名 descriptor に基づく副次検査を行う」という例外を暗黙に認めることになり、「自 registry のみを見る」という §2 本文の単純化そのものと矛盾する。

### 3. 排他制約: definition-error kind=invalid-range (正規ゲートは parse_definition)

非 accum 要素に `accum_filters` を書く、または accum 要素に `final_filters` を書くケース (§1 の accum 要素定義 = `is_accum_elem`、multiple/repeat/separator のいずれか) は、その要素にそもそも存在しない属性を書いた構造不一致であり、`fixtures/definition-error/scalar-array-default-invalid-range.json` (非 accum 要素への配列 default 宣言、DR-083 §5、同じ `is_accum_elem` 判定を使う先例) と同型の **kind=invalid-range** で reject する。新 kind は不要 — 「要素の宣言形と合わない属性/値」は definition-error の確立パターン (DR-082 §2 の「構文上は書けるが構成として不成立」系統)。

正規のゲートは `parse_definition` (definition-error、fixture で pin 可能)。`schema/wire.schema.json` の `if/then` (accum 要素該当性で許容 properties を分岐) は補助として併用してよいが必須ではない — schema を経由しない conformance 実装では排他制約が効かなくなるため、spec としての正規契約は definition-error 側に置く。

> **明確化 (統括検証 2026-07-14、codex レビュー M-6 の反映): wrong-seat 判定 (本節) は構造ゲート先行 — 判定が成立したら、その属性の中身 (綴りの登録有無・factory 固有検査) は一切解釈しない。** 要素の宣言形と合わない属性 (非 accum 要素の `accum_filters`、accum 要素の `final_filters`) は、その属性にどんな綴りが書かれていても常に invalid-range のみを報告する — 綴りが unknown-vocab 相当 (§2 の owns 集合に無い) であっても、wrong-seat 判定が先行し unknown-vocab との二重報告は発生しない。definition_error の fixture 契約 (`expect.errors` は definition の全エラーの完全一致集合、DR-054 §4) における観測可能な wire 契約としてこれを固定する。
>
> **明確化 (統括検証 2026-07-14、codex レビュー M-9 の反映): `type:"none"` 要素 (値空間なし、DR-089) への `final_filters` 宣言も同じ invalid-range に属する。** `final_filters` は T→T (§1) で値空間の型 T への変換/検証を前提とするが、none には値空間そのものが無く T が存在しないため構成不能 — DR-089 §4 (値充足を要求される席には値空間が無いため立てない、静的に既知なので definition-error) と同型の帰結。accum 席の `accum_filters` (Acc→Acc) も同じく T ドメインへの依存があるため、none 要素が accum 適格 (multiple/repeat/separator のいずれか) を持つ場合の `accum_filters` 宣言も同型で invalid-range。`value_filters`/`piece_filters` (§1 座席 C/B) へ同じ理が及ぶかは、値スロットの構造 (DR-089 §1 の「食って捨てる」パターン) とトークン受理層の関係が本 DR の射程では未整理であり、本明確化の対象外とする。

### 4. argv_pos 帰属: `final_filters`/`accum_filters` ともに `argv.length`

実測 (`value-typing/cell-filter-reject.json` [現 `final-filter-reject.json`] の `out-of-range-rejected` case、`argv_pos=2`=`argv.length`、`count-parse/cell-filter-range.json` [現 `final-filter-range.json`] の `over-range-rejected` case、`argv_pos=1`=`argv.length`、いずれも piece の実位置とは不一致) により、旧 `cell_filters` の reject は非 accum・accum を問わず一貫して `argv.length` (特定トークンに帰属しない) に帰属することが確認されている。分割後もこの帰属規則は両属性で維持する — `value_filters` (piece 実位置に帰属) との違いは「どの piece が原因かを名指ししない、確定した最終値/累積配列全体への一括検証」という意味論の observable な現れであり、この差異こそが両者を独立属性として残す実証的な根拠 (SPL-Q6 = a の決め手)。CONFORMANCE.md §3 の記述を「累積後の」という accum 限定の文言から「`final_filters`/`accum_filters` 両席の reject は argv.length」に補正する。

> **明確化 (統括検証 2026-07-14、DR-105 の反映): `accum_filters` の reject 位置帰属 (`argv.length`) は、ARRAY filter registry の fallibility 確立 (DR-105 §4、`length_range` 等の Validate 系住人の追加) により初めて実効化される。** 本節策定時点では ARRAY filter registry に reject 可能な住人が存在せず (`unique` のみ、Transform)、この規定は `final_filters` 側の実測からの類推適用に留まっていた。
>
> **明確化 (統括検証 2026-07-17、codex レビュー M-7 の反映): 「`value_filters` は piece 実位置に帰属」は CLI 由来 piece に限る規定であり、非 CLI 由来 (env / config / 宣言 default) 由来 piece の reject は `argv.length` に帰属する。** piece 実位置は「その piece が argv 上でどのトークンから生成されたか」で定義され、CLI 経路 (argv トークン → matcher → piece) では原因トークンを一意に名指しできる。非 CLI 経路 (env `TIMEOUT=30` → parse → piece / config JSON の path → piece / 宣言 default 値 → piece) では piece の由来トークンが argv に存在しない — この場合 argv 上に名指しできる位置が無く、`final_filters`/`accum_filters` の argv.length 帰属 (「特定トークンに帰属しない一括検証」) と同じ理由で argv.length に落ちる。CONFORMANCE §3 の位置帰属規約と整合する挙動 (実装は既に正しく振る舞っており、本明確化は文言の過剰一般化を訂正するのみ、fixture 追加なし)。この規定は`value_filters` (座席 C、DR-079) 固有の帰属規則の精密化であって、`piece_filters` (座席 B、DR-079 の string 域) 側の帰属規則には及ばない (piece_filters は座席の入力源に関わらず piece 実位置がある場合はそこに帰属する既存規則のまま)。

### 5. 非 accum 要素の宣言 default 値の pieceProcessor 通過 (DR-050 §4 / DR-083 §2 の対称性から導出)

DR-083 §2 は multiple 要素の宣言 default 配列を「DR-050 §4 の config array と同型」— 各 piece は型一致なら T 域座席のみ (`value_filters` per piece → accumulator 畳み → `accum_filters`)、JSON string の piece は string 域 (`piece_filters` → parse) も通る、と規定する。DR-050 §4 自体は「config 値の型は要素の type が決める」という一般規則 (string → CLI/env と同一の全段 pipeline、非 string で型一致 → post_filters のみ、型一致ゆえ pre_filters/parse はスキップされる型の帰結) であり、accum 要素の宣言 default だけでなく **非 accum 要素 (§1 の定義、`is_accum_elem` に該当しない要素) の宣言 default にも同じ型依存規則がそのまま適用される** — 宣言 default は「値源」の一種であり、config 供給値と同じく「JSON 表現の型」に応じて pieceProcessor を通る/通らないかが決まる (これは値源の種別 (config か宣言 default か) ではなく値の型が決める規則であり、DR-050 §4 の対象を絞る理由がない)。

したがって: 非 accum 要素の宣言 default 値が JSON string なら `piece_filters` → parse → `value_filters` の全段を通り、宣言 default 値が要素の type と型一致 (number/bool) なら型の帰結で `piece_filters`/parse はスキップされ `value_filters` のみを通る。この値が `op=default` の発火 (DR-081 §2、書き換え済み default の明示 set) でセルに書き込まれる際、`final_filters` (最終値ガード) が一様に適用される — `count-parse/final-filter-range.json` (旧 `cell-filter-range.json`) が update fold の最終値に対して固定した意味論と同型。

## 波及

- **DR-079**: 座席格子表 (§1) の D 行 (`cell_filters`、「累積後のセル値、Acc→Acc、cell 単位」) を D1 (`final_filters`、確定値、T→T、非 multiple 専用) / D2 (`accum_filters`、累積配列、Acc→Acc、multiple 専用) に分割する Superseded 節を追記済み (全文は下記)。§2 (アンカー命名の決定文言)・§「採用しなかった案」の `accum_filters` 不採用理由 (「multiple 無し要素で名前が浮く」) は、非 accum 側を別属性に分離する本 DR により構造的に解消される
- **DR-101 §3**: 「非 accum 位置の cell_filters は scalar registry、accum 位置は ARRAY registry」という位置依存の判定マトリクス全体が前提 (1 属性が両方の位置で意味を持つこと) から崩れるため、§3 全体を Superseded 節で置換済み (全文は下記)。§1 (filter 名未登録は unknown-vocab の原則) と §2 (専用 kind を新設しない) は属性分割後も一般原則として妥当なため不変
- **旧 DR-102 (未 push、`decisions(DR-102)`/`fixtures(definition-error)`/`docs(DESIGN)` の 3 commit)**: SPL-Q3 裁定 (案 C) により `jj abandon` 済み。番号 102 は本 DR に再利用
- **fixtures**: `count-parse/cell-filter-range.json` (→ `final-filter-range.json` に改名) / `value-typing/cell-filter-reject.json` (→ `final-filter-reject.json` に改名) / `definition-error/cell-filters-unknown-vocab.json` (→ `final-filters-unknown-vocab.json` に改名) / `multiple-parse/default-cell-ops.json` (→ `default-accum-ops.json` に改名) の属性名リネームと why 文の書き直し (旧属性名 `cell_filters` への言及は残さない、no-historical-noise)。新規: `accum-filters-on-non-multiple-invalid-range.json` / `final-filters-on-multiple-invalid-range.json` (排他違反の両方向、definition-error kind=invalid-range。definition_error の実行契約 [1 definition = 1 構造的問題、expect.errors は全エラーの完全一致集合] のため 2 ファイルに分割) / `final-filters-on-repeat-only-invalid-range.json` (`multiple` 宣言なしでも `repeat` のみで accum 要素になる境界、`is_accum_elem` 判定の境界確認) と `final-filters-array-only-unknown-vocab.json` (`final_filters` への ARRAY-only 綴りの単純 unknown-vocab、旧 DR-102 fixture の置き換え)
- **schema/wire.schema.json**: `cell_filters` プロパティを `final_filters`/`accum_filters` の 2 プロパティに置換
- **schema/builtin-descriptors.json**: `unique` の description 内「cell_filters 相」を「accum_filters 相」に更新
- **DESIGN.md** §8.3/§8.5/§9 (required_group 波及との重複なし)・**PIPELINE.md** 段 7・**LOWERING.md** count 上限説明・**CONFORMANCE.md** §3 argv_pos 規約・**REFERENCE.md** 属性一覧/詳細節: 全 grep 追随、`just lint-reference` で検証

### 追記した Superseded 節 (適用済み、全文)

DR-079 末尾に追加済み:

```markdown
## Superseded (歴史)

> **更新: 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。**

### 座席格子 D 行 (`cell_filters`) の分割 (DR-102 で更新)

> **更新: `cell_filters` が multiple 宣言の有無で T→T/Acc→Acc という異なる型の語彙を 1 属性に内包していたことが構造的欠陥と判明し、D 行は D1 (`final_filters`、確定値 T→T、非 multiple 専用) / D2 (`accum_filters`、累積配列 Acc→Acc、multiple 専用) に分割された。§2 の artifact アンカー命名原則、§「採用しなかった案」の `accum_filters` 不採用理由 (「multiple 無し要素で名前が浮く」) は、本分割により該当ケースが構造的に無くなったため解消。他 3 座席 (A/B/C) の格子・命名原則は不変。**
```

DR-101 末尾に追加済み (§3 全体の置換):

```markdown
## Superseded (歴史)

> **更新: 以下の記述は後続 DR で覆された。現役仕様の理解には不要、判断経緯としてのみ残す。**

### §3 (accum 位置の cell_filters 判定マトリクス) (DR-102 で更新)

> **更新: `cell_filters` の multiple 有無による位置依存判定は、属性そのものの分割 (DR-102: `final_filters`/`accum_filters`) により前提から解消された。1 属性 1 registry の対応になったため、§3 が規定していた「一次 unknown-vocab → 二次 invalid-range (層違い)」の 2 段判定マトリクスは不要 — 各属性は自 registry の owns 集合のみで unknown-vocab を一意判定する。§1 (filter 名未登録は unknown-vocab) と §2 (専用 kind を新設しない) は不変。**
```

## 採用しなかった案

### 非 accum 側を廃止し `value_filters` へ一本化 (SPL-Q6 で kawaz 棄却)

「同じ値に何度も filter を通すなら 1 属性で足りる」という統合案。scalar set 経路では冪等な Validate 系 filter に限り実害が薄いが、count 型の update fold では per-application (各 update 発火ごとに検証) と final-once (fold 完了後の最終値のみ検証) で `in_range:2:3` のような下限付き range の意味論が実際に分岐する (理論的検証のみで実例による裏付けは無かった)。加えて §4 の argv_pos 帰属差 (`value_filters` は piece 実位置、`final_filters` は argv.length) は、統合すると既存の observable な wire 挙動を破壊的に変更することになる。kawaz 裁定: 「違うものを違うものとして扱え、同じにするな」。corpus 実例の不在は表現力削減 (統合) の論拠にならない — 実需の有無ではなく型/挙動の実際の違いで判断する。

### `cell_filters` の union 維持 + 位置依存判定の精密化 (旧 DR-102 の前提)

DR-101 §3 の判定マトリクスの 6 セル目 (非 accum × ARRAY-only 綴り) を invalid-range として確定させる旧 DR-102 のアプローチ。前提 (`cell_filters` が 1 属性のまま multiple 有無で T→T/Acc→Acc を切り替える) 自体が構造的欠陥であり、精密化ではなく解消すべきと kawaz が裁定 (2026-07-13)。旧 DR-102 は未 push のまま `jj abandon`、本 DR がその番号を引き継ぐ。

## 関連

- DR-079 (filter 座席の完全格子 — D 行の分割元、Superseded 節追記対象)
- DR-101 (filter 名の未登録は definition-error — §3 の Superseded 節追記対象、§1/§2 は不変)
- DR-082 (definition-error fixture format — invalid-range の受け皿、unknown-vocab の受け皿)
- DR-050 (config ファイル値源 — §4 の型依存 pieceProcessor 通過規則、本 DR §5 の導出元)
- DR-083 (multiple 要素の宣言 default — §2 の「分割済み pieces」規定、本 DR §5 の対称性の相方)
- DR-081 (default 席書き換えモデル — op=default 発火時の値確定)
- DR-054 (parse_definition の失敗挙動 — kind 語彙、hint フィールド)
- DR-077 (update 効果 — count 型 update fold の最終値ガード実例の出所)
- issue `2026-07-14-cell-filters-attribute-split.md` (裁定の記録)
- docs/QUESTIONS.md (SPL-Q1〜Q6 の裁定バッチ、削除済み — 裁定内容は本 DR に反映)
