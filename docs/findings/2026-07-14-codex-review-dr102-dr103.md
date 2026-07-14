# codex レビュー (gpt-5.6-sol) — DR-102 (cell_filters 属性分割) / DR-103 (required_group) postland

> land 直後の DR-102/DR-103 サイクル成果 (DR 本文・fixture・実装 diff) に対する codex (gpt-5.6-sol) の全方位レビュー全文。以下は無改変転記。

以下は提示された DR・fixture・diff に基づく静的レビュー。結論から言うと、**DR-102 は現状 1 件の Critical があり、このままでは仕様を実装できていない**。DR-103 は tar の例自体には動きそうだが、一般化した主張と実装の間に複数の穴がある。

## 総評

| 重要度 | 件数 | 概要 |
|---|---:|---|
| Critical | 1 | `accum_filters` の runtime reject 契約が実装上不可能 |
| Major | 10 | exactly-one の過剰主張、required と同型でない lowering、positional 非対応、unknown-vocab 判定の自己矛盾、fixture 軸不足など |
| Minor | 5 | accum/non-accum 語彙、guard/vacuous、古い fixture 名など |

---

# Critical

## C-1. `accum_filters` の reject と `argv_pos=argv.length` は現実装では表現不能

### 根拠

- DR-102 §4:
  > `final_filters`/`accum_filters` ともに `argv.length`
- 同節では両属性の **reject** を明示的に規定している。
- 一方、実装は以下の形:
  - `src/core/filters.mbt` 新 L315–359 付近
    - `ArrayFilterDescriptor.run` は `Array[Value] => Array[Value]`
    - `apply_accum_filter_chain` も `Array[Value] -> Array[Value]`
    - コメントでも「no `Result`, no error channel」と明記
  - `src/core/resolve.mbt` 新 L541–550 付近
    ```moonbit
    chain => apply_accum_filter_chain(chain, vals)
    ```
    エラーを返す経路がない。

### 問題

現在の型では `accum_filters` は変換しかできず、検証 filter が reject できない。したがって:

- `kind=filter`
- `reason=filter_rejected`
- `argv_pos=argv.length`

のいずれも `accum_filters` から発生させられない。

さらに、DR-102 §4 の根拠に挙げられている:

- `final-filter-reject.json`
- `final-filter-range.json`

は名前どおり非 accum の `final_filters` 実例であり、**accum 側の reject の実測根拠になっていない**。

### 修正案

二択にすべき。

1. `accum_filters` も fallible とする:
   ```moonbit
   run : (Array[Value], Array[String]) ->
     Result[Array[Value], (String, String)]
   ```
   `apply_accum_filter_chain`、`build_result`、resolve error plumbing まで `Result` を通し、`argv.length` を付与する。

2. `accum_filters` は infallible transform 専用と明記する:
   - DR-102 §4 から `accum_filters` の reject 規定を削除
   - `argv_pos` 規定は `final_filters` のみに限定
   - ARRAY registry に Validate 型 filter は存在しない契約にする

現 DR は 1 を要求しているが、実装は 2 になっている。**land blocker**。

---

# Major

## M-1. 「required + exclusive = exactly-one」は一般には成立しない

### 根拠

- DR-103 §1:
  - `required_group` は値述語
  - default を含む値の有無で判定
- DR-103 §3:
  > 最大 1 つ (`exclusive_group`) + 少なくとも 1 つ (`required_group`) = ちょうど 1 つ
- DR-103 §7:
  - `flag` や default 付き member は未発火でも値充足
- `exclusive_group` は committed による指定述語。

### 問題

2 つの制約は異なる述語を数えている。

- `exclusive_group`: committed な member が最大 1
- `required_group`: 値を持つ member が少なくとも 1

したがって一般には exactly-one にならない。

例:

```json
{"name":"a","type":"flag",
 "exclusive_group":["g"],"required_group":["g"]}
{"name":"b","type":"bool","long":[":set:true"],
 "exclusive_group":["g"],"required_group":["g"]}
```

argv 空の場合:

- `a` は暗黙 `default:false` により値充足
- committed member は 0
- required は成立
- exclusive も成立

つまり **0 トリガでも通る**。exactly-one ではない。

default/config/env で値が供給される member と、CLI committed member が同時に存在すれば、値を持つ member が複数でも exclusive は通り得る。

### 修正案

§3 の主張を次のように限定する必要がある。

> member の値充足と committed が一致する場合、すなわち default/preset/env/config/inherit 等の非 committed 値源を持たず、発火時にのみ値を持つ member 群では、両制約の合成で exactly-one committed trigger を表現できる。

tar fixture の plain bool 群はこの限定条件を満たすため、用途自体は成立する。

---

## M-2. `CRequiredGroup` は `CRequired` と同じ lowering/候補解決をしていない

### 根拠

- DR-103 §1/§7:
  > member 充足は required 単項と完全に同一
- `src/core/node.mbt` 新 L378–400 付近:
  ```moonbit
  CRequired(String, Array[String])
  ```
  `CRequired` は候補 cell 群を持つ。コメントでも `BOr` の分岐に必要と説明されている。
- 同ファイルの `CRequiredGroup`:
  ```moonbit
  CRequiredGroup(String, Array[String])
  ```
  単なる member 名しか持たない。
- `src/core/installer.mbt` 新 L2410–2435:
  ```moonbit
  members.push(e.name)
  ```
- `src/core/resolve.mbt` 新 L1479–1506:
  ```moonbit
  elem_value(resolved, path, m) != None
  ```

### 問題

`required` が候補配列を必要とする構造、特に `or`/`BOr` のように宣言要素名と実際の着地 cell が一致しないケースで、`required_group` は同じ判定にならない。

DR は「型委譲だけ同じ」ではなく「required 単項と完全に同一」と述べているが、実装は:

- `required`: 候補 cell 群を見る
- `required_group`: `e.name` だけを見る

という差がある。

`ref` が source 名ではなく target cell に値を着地させる構造でも、同種の誤判定が起きる可能性が高い。

### 修正案

例えば:

```moonbit
CRequiredGroup(String, Array[RequiredMember])
struct RequiredMember {
  display : String
  candidates : Array[String]
  ...
}
```

とし、`CRequired` と `CRequiredGroup` が同じ `required_member_satisfied` helper を使うべき。

最低限、以下の fixture が必要:

- `required_group` member が `or`/`BOr`
- `required_group` member が `ref`
- exact branch と non-exact branch の双方

---

## M-3. `required_group` は仕様上「要素属性」だが、wire 実装は positional で受理しない

### 根拠

- DR-103 §1:
  > `required_group`: 要素側属性
- DR-103 §5:
  > 各要素の group ラベルを集約
- `ElemDef` 自体には `required_group` が存在し、`inst_constraint` も options/positionals を `all` に集める構造。
- しかし `src/core/json_conformance_wbtest.mbt`:
  - option の allowed keys 新 L2896–2907 には `required_group` が追加済み
  - positional の allowed keys 新 L3179 付近には:
    ```moonbit
    ..., "required", "requires"
    ```
    だけで、`required_group` がない
  - positional constructor 新 L3298–3310 でも `required_group` を decode/受け渡ししていない。

### 問題

現文面の「要素」には option/positional の両方が含まれるのが自然だが、実装は option 限定。

内部型と installer は positional 対応可能な形なのに、wire decoder だけが拒否するため、意図的制限にも見えない。

### 修正案

- positional にも `required_group` を追加する
- または DR を明示的に「option 専用属性」と修正する

後者の場合、「exclusive_group と同型」という説明も適用範囲を含めて限定する必要がある。

---

## M-4. 単独 member は `required:true` と「観測上同じ」ではない

### 根拠

- DR-103 §2:
  - `required_group_violated`
  - element は group label
- DR-103 §4:
  > `required: true` と観測上同じ結果
- `required-group.json::solo-member-degenerates-to-required`:
  ```json
  {
    "element": "target_grp",
    "reason": "required_group_violated"
  }
  ```

通常の `required:true` なら element/reason は少なくとも:

- element = `target`
- reason = `required_violated`

となるはず。

### 問題

充足真偽は同じでも wire observable は違う。fixture 自身が §4 の「観測上同じ」を反証している。

### 修正案

§4 を:

> member が 1 要素のみの場合、充足条件の真偽は `required:true` と同値。ただし error の element/reason は group 制約固有であり wire 上は同一ではない。

に修正する。

---

## M-5. 「1 属性 1 registry、未登録なら一意に unknown-vocab」と regex 検査が矛盾

### 根拠

- DR-102 §2:
  > 各属性は自分の registry の owns 集合のみを見て、載っていなければ一意に unknown-vocab
- `src/core/installer.mbt` 新 L3711–3782:
  - `collect_invalid_regex_pattern` は `accum_filters` も無条件に走査
  - ARRAY registry が `regex_match` を所有しなくても、名前だけ見て scalar filter 固有の regex compile を実行
- `src/core/installer_wbtest.mbt` 新 L2019–2055:
  - malformed `regex_match` を `accum_filters` に書くと:
    - `unknown-vocab`
    - `invalid-argument`
    の両方を出すことを明示的に要求。

### 問題

ARRAY registry から見れば `regex_match` は未知の語彙であり、その args が regex pattern かどうかさえ確定していない。にもかかわらず scalar registry 側の factory 固有検査を走らせるのは、実質的に他 registry の意味を参照している。

これは「自 registry だけを見る」「装置選択で失敗し unknown-vocab」という説明と整合しない。

### 修正案

属性の registry lookup 成功後にのみ factory 固有静的検査を行う:

```text
accum_filters:
  lookup_array_filter(name)
    None    -> unknown-vocab
    Some(d) -> d 固有の args 検査
```

もし本当に両方報告したいなら、DR-102 §2 の「一意に unknown-vocab」を撤回し、**未知語彙でも他 registry の同名 descriptor に基づく副次検査を行う**という例外を明記する必要がある。

---

## M-6. 属性形不一致と unknown-vocab の合成規則が未定義で、実装は二重報告する

### 根拠

- DR-102 §2: 未登録名は unknown-vocab
- DR-102 §3: wrong-seat 属性は invalid-range
- 実装:
  - `collect_unknown_filter`
  - `collect_invalid_filter_attribute_mismatch`
  を独立に実行
  - `src/core/installer.mbt` 新 L3969 付近
- 両 gate の抑制条件はない。

### 例

accum 要素に:

```json
"final_filters": ["totally_unknown"]
```

を書くと、実装上は:

1. `final_filters` の scalar registry にない → `unknown-vocab`
2. accum 要素に `final_filters` がある → `invalid-range`

の両方が出る。

### 問題

definition-error fixture は完全一致集合なので、これは実装詳細ではなく wire 契約になる。しかし DR は:

- wrong-seat を先に見て invalid-range のみか
- 綴りも独立に検査して 2 件か
- unknown-vocab のみか

を定めていない。

### 修正案

推奨は、構造 gate を先行させ、wrong-seat 属性の内部は解釈しないこと:

```text
wrong attribute for element shape
  -> invalid-range only
```

両方出す方針なら、その旨を DR と fixture で明示する。

---

## M-7. `value_filters` の argv 位置に関する DR-102 の説明と参照実装が一致しない

### 根拠

- DR-102 §1/§4:
  > `value_filters` は piece 実位置に帰属  
  > `final_filters` は `argv.length`
- 一方 `src/core/json_conformance_wbtest.mbt` 新 L4742–4755:
  ```moonbit
  // value_filters/final_filters/accum_filters reject ...
  // at_pos: dc.argv.length()
  ```
- `src/core/resolve.mbt` 新 L2020–2075:
  - `value_filters`
  - `final_filters`
  が同じ `at_pos` を使って `filter_err` を生成。

### 問題

少なくとも resolve-layer の CLI/env/config/default 共通経路では、`value_filters` も `argv.length` になる。

したがって DR-102 §4 の:

> argv_pos の差が両属性を独立に残す実証的根拠

は、現参照実装については成立していないように見える。

### 修正案

二択:

1. CLI binding に元 token position を保持し、CLI 由来 `value_filters` reject は piece 位置を返す
2. DR を修正し、resolve-layer の `value_filters` は `argv.length`、piece 位置になるのは eval/token-stage filter のみと整理する

少なくとも「value_filters 一般が piece 実位置」は過剰一般化。

---

## M-8. DR-102 §5 は新しい規範的意味論なのに fixture がなく、diff にも明示的な実装追加がない

### 根拠

DR-102 §5 は以下を新たに明文化している:

- 非 accum default が JSON string:
  - `piece_filters`
  - parse
  - `value_filters`
  - `final_filters`
- native number/bool:
  - `piece_filters`/parse を skip
  - `value_filters`
  - `final_filters`

しかし新規 fixture 一覧に、この軸を直接検証するものがない。

また提示 diff の実行部分は主に `cell_filters` の rename/split であり、非 accum default の string→T 処理を追加する変更は確認できない。`apply_entity_filters` は既に解決済み `Value` に `value_filters`/`final_filters` を掛けるだけで、string default の parse 自体を保証しない。

### 問題

§5 は単なる説明変更ではなく、入力型によって observable pipeline が変わる規則。fixture なしでは:

- string default が parse されず VStr のまま流れる
- native default に `piece_filters` が誤適用される
- `value_filters` と `final_filters` の順序が逆になる

等を検出できない。

### 必須 fixture

最低でも:

1. number 要素 + default `"2"`  
   `piece_filters` が書き換え、parse、`value_filters`、`final_filters` の全順序を pin
2. number 要素 + default `2`  
   `piece_filters` が呼ばれず `value_filters`/`final_filters` のみ
3. string default の parse failure
4. default 由来 `final_filters` reject が `argv_pos=argv.length`

---

## M-9. `final_filters` の `type:none` 適用可否が未定義

### 根拠

- DR-102 §1 は適格性を accum/non-accum だけで定める。
- `type:none` の非 accum 要素は形式上 non-accum なので `final_filters` が許可される。
- しかし `final_filters` は `T→T` であり、`type:none` には T がない。
- `src/core/resolve.mbt` 新 L2020 以降では `Empty` binding は filter chain から除外される旨が記載されている。

### 問題

現在の実装では、非 accum `type:none` に `final_filters` を書いても、合法だが実質 no-op になる可能性が高い。

これは以下のどれなのか未決定:

- invalid-range
- 合法な no-op
- lint-only
- committed/placeholder に対して何らかの適用

`accum type:none` に `accum_filters` を書いた場合、空配列に適用するのかという対称の問題もある。

### 修正案

推奨:

- `final_filters`: 値空間を持つ non-accum 要素のみ
- `accum_filters`: accumulator が実値配列を構成する accum 要素のみ

とするか、no-value 要素では合法 no-op と明記して fixture 化する。

---

## M-10. 実装コメントの pipeline が DR-102 本文と逆になっている

### 根拠

- `src/core/eval.mbt` 新 L724:
  > separator → piece_filters → parse → final_filters/accum_filters, one piece at a time
- `src/core/node.mbt` 新 L126–130 にも同様の記述。
- しかし DR-102 §1/§5 の正しい順序は:
  - per piece: `piece_filters → parse → value_filters`
  - non-accum: 最終確定後 `final_filters`
  - accum: accumulation 後 `accum_filters`

### 問題

`final_filters`/`accum_filters` を「one piece at a time」と書くのは属性分割の核心に反する。

特に `accum_filters` は whole-array filter であり、piece 単位では絶対にない。

### 修正案

コメントを次に統一:

```text
separator
→ piece_filters per piece
→ parse per piece
→ value_filters per piece
→ scalar finalization → final_filters
  or accumulation → accum_filters
```

---

# Fixture 輪郭の不足

## DR-102

### Major: reverse unknown-vocab がない

現在あるのは:

- `final_filters` に ARRAY-only `unique` → unknown-vocab

逆方向も独立軸:

- `accum_filters` に scalar-only `in_range` / `non_empty` → unknown-vocab

`installer_wbtest` の malformed `regex_match` は `invalid-argument` まで混ざるため、純粋な conformance fixture の代用にならない。

推奨:

```text
fixtures/definition-error/
  accum-filters-scalar-only-unknown-vocab.json
```

---

### Major: wrong-seat × unknown spelling のエラー集合がない

M-6 の通り、実装は二重報告し得る。完全一致 fixture が必要。

- accum 要素 + `final_filters:["totally_unknown"]`
- non-accum 要素 + `accum_filters:["totally_unknown"]`

---

### Major: runtime accum filter reject がない

C-1 の契約を維持するなら必須:

- accum filter が reject
- `kind=filter`
- `argv_pos=argv.length`
- array 全体を見た reject

現実装では作れないため、まず実装設計を直す必要がある。

---

### Major: §5 の scalar default 型軸が丸ごとない

前述の string/native default の対が必要。

---

### Major: `accum_filters × collector` が未固定

`src/core/resolve.mbt` 新 L286–300 のコメントでは:

> collector/accum_filters interaction stays open

とされている一方、実装は明確に `accum_filters` を collector より先に適用している。

これは observable。少なくとも:

- `accum_filters:["unique"]`
- `collector:"unwrap_single"` または他 collector

を併用し、順序を fixture で固定すべき。

公開属性として切り出した後も「open」のままなのは危険。

---

### Minor: repeat-only は reject 側だけで、成功側がない

`final_filters` が invalid-range になることで repeat-only が accum と判定されることは pin されるが、次もあると強い:

- repeat-only + `accum_filters:["unique"]` が成功
- result が array filter 適用後になる

---

## DR-103

### Major: 名前空間独立性を fixture が実証していない

現 fixture は `exclusive_group:["mode"]` と `required_group:["mode"]` の member 集合が完全に同じ。

この形では、実装が誤って:

- group member 集合を共有
- 一方の集合を他方にも流用
- label ごとに単一 group object に統合

していても検出しにくい。

必要なのは同名・非対称 membership:

```text
required_group "g": [a, b]
exclusive_group "g": [a, c]
```

そして `b`/`c` の発火組合せで、両制約が別集合を見ていることを pin する。

---

### Major: `or`/`ref` member がない

M-2 を検出できない。required 単項と同型を主張するなら必須。

---

### Major: positional member がない

M-3 を検出できない。option-only の仕様なら、その制限を明記する必要がある。

---

### Major: 値空間なし member がない

DR-103 §1/§7 は明示的に:

- 値空間あり → 値の有無
- 値空間なし → committed

と規定しているが、fixture は値空間ありのみ。

`type:none` member の:

- 未発火 → 違反
- 発火 → 成立

を pin すべき。

---

### Major: scope 境界がない

§5 は scope 相互作用を `exclusive_group` と同型とするが、ALO は existential constraint なので、exclusive の fixture だけでは十分でない。

最低限:

- parent scope member と command scope member が同じ label
- command 未選択時
- command 選択時
- global/inherited option が member の場合

を確認すべき。

---

### Minor: 複数 required group の全エラー列挙がない

definition-error ではなく runtime constraint でも、全違反列挙が契約なら:

- 2 group とも未充足
- errors に 2 件

を pin した方がよい。

---

# Minor

## m-1. `multiple/non-multiple` と `accum/non-accum` が混在

### 箇所

- DR-079 Superseded:
  > 非 multiple 専用 / multiple 専用
- `accum-filters-on-non-multiple-invalid-range.json`
- fixture の why:
  > multiple 専用の accum_filters

DR-102 自身が repeat-only を導入し、「multiple の有無は簡略表現」と訂正しているため、現役説明では一貫して:

- accum
- non-accum
- `is_accum_elem`

を使うべき。

特に `accum_filters` は「multiple 専用」ではない。

---

## m-2. 「最終値ガード」は transform filter を含む語として狭すぎる

`final_filters`/`accum_filters` は Validate だけでなく変換も含む。`unique` は明確な transform。

「ガード」を反復すると reject-only の印象になるため:

- 最終値 filter chain
- final-stage chain
- 最終値変換・検証

程度が妥当。

---

## m-3. `vacuous` の用法が広すぎる

default/flag による成立は、論理学的には多くの場合「vacuous」より:

- structurally satisfied
- trivially satisfied
- 自動成立
- 恒真化

の方が正確。

特に「default:false という実値が存在するため成立」は、前件不存在による vacuous truth ではない。

---

## m-4. stale fixture 名がコメントに残っている

`src/core/installer.mbt` 新 L3577 付近:

> `fixtures/definition-error/filter-attribute-multiple-mismatch.json`

提示された fixture 名は:

- `accum-filters-on-non-multiple-invalid-range.json`
- `final-filters-on-multiple-invalid-range.json`
- `final-filters-on-repeat-only-invalid-range.json`

であり、実在しない総称名に見える。正しいファイル名を列挙するか、ファイル名参照を消すべき。

---

## m-5. 「4 phases すべてで regex_match」が語彙分割と不整合

`installer_wbtest.mbt` 新 L1977 付近では:

> 4 相すべてで regex_match pattern compile 検査

とされるが、`regex_match` は ARRAY registry の語彙ではなく `accum_filters` では使用不能。

「4 属性を機械的に走査する」は実装事実だが、「4 相で regex_match が使える」と読める表現は DR-102 の分割思想と逆。M-5 の修正と合わせ、owned registry の descriptor にだけ args 検査を委譲するのが自然。

---

# 修正優先順位

1. **`accum_filters` を fallible にするか、reject 規定を削るか決める**
2. DR-103 §3 の exactly-one を条件付き主張に修正
3. `CRequiredGroup` を `CRequired` と同じ candidate resolution に載せる
4. positional 適用可否を決め、decoder/spec を揃える
5. unknown-vocab と副次検査・wrong-seat のエラー合成順を規定
6. DR-102 §5 の default pipeline fixture を追加
7. required_group の `or/ref/type:none/scope/asymmetric namespace` fixture を追加
8. pipeline コメントと accum/non-accum 語彙を全面修正

## 最終判定

- **DR-102: Request changes。C-1 が解消されるまで仕様・実装とも未完。**
- **DR-103: Request changes。tar の plain-bool 使用例は成立するが、一般仕様としては exactly-one の主張、required 同型性、適用範囲が過剰または不一致。**

---

**追記 (2026-07-14)**: 統括検証の結果: M-2 は live probe でバグ確定 / M-1・M-4 は実文確認で成立 / C-1 は CR-Q1 として裁定待ち — トリアージは issue codex-review-dr102-dr103-postland 参照。
