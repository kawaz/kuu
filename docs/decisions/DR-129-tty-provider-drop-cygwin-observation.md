# DR-129: tty_provider の cygwin 観測を削除する — 端末判定は provider 実装の内側の責務

> 由来: kawaz チャット裁定 2026-07-31 (ccmsg r98 mid=13) + MISC-C1 checkbox 確定 (2026-08-01)。
> DR-099 §4 が `tty_provider` のシグネチャを `(stream) → bool | null` から
> `(stream) → {terminal, cygwin} | null` へ改訂し、`tty_cygwin` config ダイヤルを spec 側の純データ計算
> として保つ設計にしたが、その 2 値観測をやめて bool 単一へ戻す。DR-098 のシグネチャへの回帰ではなく、
> 「fold の方言を spec 側に置く」という DR-099 §4 の動機自体を取り下げる裁定である。

## 決定

### 1. `tty_provider` の観測は `terminal` の bool 単一に戻す

```
tty_provider: (stream: "stdin" | "stdout" | "stderr") → bool | null
```

`cygwin` の観測面が `io_type.output` から消える。**cygwin 判定を含んだ端末判定は provider 実装の内側の
責務**であり、kuu が規定するのは「そのストリームは端末か否か」だけになる。

特殊な判定が要るホスト環境は、provider ごと差し替えられる (tty_provider は registry の単一スロット住人)。
判定ロジックの方言は住人の実装差として吸収され、spec の観測語彙には現れない。

### 2. `tty_cygwin` factory config を廃止する

`builtin/tty` の config キーは `tty_stream` (必須、3 値 enum) のみになる。`tty_cygwin` は削除する。

このダイヤルが意味を持つのは「cygwin pty を端末扱いから外したい」利用者が居る場合だが、そのような利用者は
考えにくい。ダイヤルの存在価値は、それが切り替える 2 つの挙動の**両方に利用者が居る**ことに依存する。

### 3. `default` 席の解決規則を単純化する

```
resolved_default = 観測 ?? 宣言 default ?? absent
```

DR-099 §2 の `resolved_default = fold(観測) ?? 宣言 default ?? absent` から `fold` が消える。
`fold(観測) = terminal || (tty_cygwin && cygwin)` という計算そのものが無くなり、観測 bool がそのまま
`default` 席の解決値になる。

観測が優先で宣言 default はフォールバック、という序列 (「明示 (CLI/env/config) > 継承 (inherit) >
観測 (tty) > 宣言既定 (default)」、DR-098 §5 / DR-125) は不変。source タグ (`tty` / `default`) も不変で、
観測由来か宣言 default 由来かの診断区別は維持される。値源ラダーが DR-031 の 5 段のままである点も不変
(DR-099 §2 の「tty 席はラダーに無く型の解決規則として吸収される」構造は変わらない)。

### 4. `tty_provider` の record 化は不要になる

DR-126 §波及は `builtin-descriptors.json` の `tty_provider` の `io_type.output` を
`[{"map": "value"}, "null"]` から `[{"record": {"terminal": "bool", "cygwin": "bool"}}, "null"]` へ
精密化することを、record 導入の旗艦例として挙げていた。cygwin 観測の削除により出力は
`["bool", "null"]` の単一 bool になるので、**この箇所は record 化そのものが不要**になる。

DR-126 の record 型は他の消費者 (link 固定パス DSL の静的化、codegen、help) を持つ独立した機能であり、
旗艦例が 1 つ消えても DR-126 の裁定は不変である。`config_provider` の `[{"map": "value"}, "null"]` が
真に開いた map のまま不変であることも変わらない。

## 根拠

### cygwin 判定は端末判定の実装都合の穴埋めであって、利用者の関心ではない

出自を辿ると、この 2 値は mattn/go-isatty の `IsCygwinTerminal` に行き着く。Windows の素の `isatty` が
msys / cygwin の pty に false を返すという**実装の穴**を、別関数として塞いだものである。
穴を塞ぐために 2 つの関数に分かれたのであって、「端末か」と「cygwin か」が利用者にとって別々に
知りたい 2 つの事実だったわけではない。

利用者 (kuu の定義を書く人) の関心は「端末か否か」の全体だけである。実装の穴の形を spec の観測語彙に
持ち上げると、その穴を持たないホスト言語の provider 実装まで `cygwin: false` を書かされることになる。

### ダイヤルは両側に利用者が居て初めて成立する

`tty_cygwin` が切り替えるのは「cygwin pty を端末扱いに含めるか」であり、既定は true。false 側を選ぶのは
「cygwin pty では色を付けたくない」という選好にあたるが、これを望む利用者は想定できない。
DR-099 §3 が既定 true の根拠として挙げた kawaz/die DR-0008 も、含める側の選択の根拠であって、
外す側に需要があることの根拠ではなかった。

### 差し替え可能な住人であることが、方言を spec に置かない理由になる

DR-099 §4 が 2 値観測を採った動機は「fold の方言 (`tty_cygwin`) を spec 側の純データ計算として保つ」ことで、
その裏返しとして「provider が bool に畳むと `tty_cygwin` が実質テスト不能になる」という懸念があった
(DR-099 採用しなかった案)。この懸念はダイヤル自体が廃止されれば消える。

そして tty_provider は registry の単一スロット住人なので、特殊判定が要る環境は provider ごと差し替えられる。
方言を spec の語彙に持たせなくても、方言を必要とする人は住人を差し替えれば済む — これは DR-061 の
「registry 装置が自分の責務を持つ」構図そのものである。

## 波及

- **DR-099**: §2 の `fold(観測)` 記述・§3 の config キー 2 種・§4 のシグネチャ改訂・§5 の informative note
  (cygwin pty の判定方法) に本 DR の追補注記を置く。§2 の値源ラダー 5 段復元・観測優先の序列・source タグ
  維持は不変。DR-099 §7 の `tty_stream` 必須違反の definition-error も不変
- **docs/DESIGN.md §12b**: configurable factory config の行から `tty_cygwin` を削除、`default` 席の解決規則を
  `resolved_default = 観測 ?? 宣言 default ?? absent` へ、`tty_provider` のシグネチャ記述を
  `(stream) → bool | null` へ。§3.3 の糖衣プリセット一覧の `tty` 行 (config キー列挙)、§13.1 の
  `tty_provider` 行、§16 用語集の `tty_provider` 行も同じシグネチャ更新が要る
- **docs/REFERENCE.md §3.3**: factory config キー表 (`kuu-lint:vocab factory-config-keys` ブロック内) から
  `tty_cygwin` 行を削除。`tty_stream` 行は不変
- **schema/builtin-descriptors.json**: `types.builtin/tty` の config から `tty_cygwin` を削除、
  `providers.tty_provider` の `io_type.output` を `["bool", "null"]` へ、description の散文シグネチャを更新
- **schema/fixture.schema.json**: `case.tty` のフィールド型を `stream → {terminal, cygwin}` から
  `stream → bool` へ戻す (`sources` enum の `tty` は維持)
- **docs/CONFORMANCE.md §1**: `cases[].tty` の記述を単一 bool 供給形へ更新
- **fixtures/value-sources/tty-ladder.json**: 注入形を `{"stdout": {"terminal": false, "cygwin": false}}` から
  `{"stdout": false}` へ。`cygwin-dial-pair` case と `definitions.types.stderr_tty_no_cygwin` /
  要素 `cygwin_dial_on` / `cygwin_dial_off` を削除する (ダイヤルが消えるので pin する対象が無い)。
  残る case (観測 false / cli 明示優先 / env 優先) は注入形の書き換えのみで意味論は不変
- **fixtures/definition-error/tty-stream-missing.json**: **影響なし** (確認済み — `tty_stream` 必須違反のみを
  扱い cygwin に触れていない)
- **corpus/real-cli/die.json**: `tty` 注入 2 箇所 (`{"stdin": {"terminal": false, "cygwin": false}}` /
  `{"stdin": {"terminal": true, "cygwin": false}}`) を単一 bool へ、why の記述も追随
- **kuu.mbt / kuu-cli**: tty_provider の ABI を bool 返しへ、`tty_cygwin` config の読み取りと fold 計算の撤去

## 採用しなかった案

### (a) 2 値観測を維持し、`tty_cygwin` の既定 true を固定して config から外す

観測 `{terminal, cygwin}` は残したまま fold を `terminal || cygwin` に固定する案。ダイヤルの需要が無い
という判断だけを反映し、観測の粒度は保つ。棄却理由は、ダイヤルが無ければ 2 値を分けて観測する理由も
無いこと — spec 側で常に `||` で畳むなら、その畳みは provider 実装の内側でやれば済み、全 provider 実装に
2 値を組み立てる義務だけが残る。

### (b) `cygwin` を optional フィールドにする

`{terminal: bool, cygwin?: bool}` として cygwin を持たない環境の provider を楽にする案。棄却理由は
根拠のとおり cygwin が利用者の関心でないこと。optional にしても spec の観測語彙に実装都合の穴の形が
残り、fixture の注入形も 2 形を持つことになる。

## 関連

- DR-099 (tty は型である — 本 DR が §2 の fold / §3 の config / §4 のシグネチャを改訂する対象)
- DR-098 §5/§6 (観測優先の序列・source タグ `tty` — 本 DR でも不変)
- DR-126 §波及 (tty_provider の record 化が旗艦例だった箇所 — §4 で不要になる)
- DR-107 §3/§6 (`io_type` の値型体系・provider 3 種の descriptor 収載 — 出力型の宣言先)
- DR-061 §4 (registry 装置の自己記述・config 検証は factory の責務 — 方言を住人側に置く構図の元)
- DR-031 / DESIGN §11.4 (値源ラダー 5 段 — 本 DR でも不変)
- DESIGN §12b (tty 判定値の正本記述)
