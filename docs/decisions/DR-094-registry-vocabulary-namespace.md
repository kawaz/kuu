# DR-094: registry 語彙の namespace — builtin/拡張の分離と共通語彙の共有

> 由来: SCH バッチ (docs/issue/2026-07-08-schema-materialization-and-reason-descriptors.md) の裁定待ち論点。DR-066 §2 が抱えていた緊張 — filter 系 reason は open set (拡張 filter が自由に語彙を足せる) であってほしい一方、組み込み語彙は closed set として spec が管掌したい (SCH-Q3) — の解消と、`kuu_number_parser` 等の ad-hoc prefix (DR-061 §3, DR-074, DR-075) が実質的に果たしていた「疑似 namespace」を正規の機構へ引き上げる要求。kawaz 裁定 2026-07-11〜12 (「ns ok」= 全域案、「共通で使う系のエラーとかは builtin ネームスペースみたいなのを設ければ共通化はできる」)。

## 決定

### 1. namespace (ns) を導入し、スコープは registry 識別子全域とする

filter 名 (`value_filters`/`piece_filters`/`cell_filters` に現れる名前)・configurable factory 名 (DR-061 §3 の `name` フィールド)・type 参照名 (`"type": "..."` が引く types registry のキー)・reason 語彙 (DR-066 の `reason` フィールド値、descriptor `reasons` 宣言の識別子) のすべてに ns を通す。DESIGN §13.1 の 6 レジストリ区分 (types / filters / accumulators / multiple / env_provider / config_provider / completers) と installers descriptor の config キー宣言に一様に適用する — DR-061 §3 が「types を筆頭に filters/accumulators/completers/installer 自身の config にも一様に適用できる」と述べた configurable factory の射程と同じ範囲。

**installer が所有する特殊語彙のフィールド名自体 (`long` / `short` / `env` / `repeat` 等) は対象外**。これらは AtomicAST の構造プリミティブであり、registry の「住人の名前」ではない (DESIGN §13.9 の周辺概念と同族、名前解決の対象ではなく構造キーワード)。

### 2. builtin ns は closed set、拡張 ns は open set

- **`builtin`** ns: spec が管掌する組み込み語彙の閉集合。新規追加は spec 改訂 (DR/semver) を要する。DR-068 の semver 規約に従い、`builtin` 語彙の追加は minor、意味論変更は major。
- **拡張 ns** (ホスト言語 DX パッケージ・ユーザ拡張が名乗る任意の ns、例 `contrib_python`・`myapp`): 各提供元が自由に語彙を追加できる開いた集合。spec は ns 内部の語彙を管掌しない。

これにより SCH-Q3 の緊張が解消する: 組み込み filter (`in_range` 等) が emit する reason は `builtin` ns 内に属し、spec が閉じた集合として列挙・管理できる (SCH-Q3-b 案「組み込み filter だけ descriptor 単位で列挙、v1 表は総覧のまま」の構造的裏付けになる)。拡張 filter は自分の ns で新しい reason 識別子を open set のまま自由に追加してよい。「filter は open set」という DR-066 の性質は拡張 ns 側で維持され、「組み込みは closed set にしたい」という要求は `builtin` ns 側で満たされる — 両者は同じ語彙軸の別 ns なので対立しない。

### 3. bare 名は builtin ns の糖衣

`trim` = `builtin/trim`、`number` = `builtin/number`、`in_range` = `builtin/in_range`。既存の全 fixture / DR / DESIGN.md の記述 (`"trim"`, `"in_range:1:100"`, `"type": "number"` 等) は無傷のまま `builtin` ns への参照として再解釈される。段階導入コストはゼロ。

拡張 ns の語彙を使うときのみ明示的に ns を書く (`"type": "contrib_python/number"`)。

### 4. 区切り文字は `/`

候補は `:` / `.` / `/` の 3 つだったが、前二者は既存語彙と衝突するため使えない:

- **`:` は不可**: filter DSL の引数区切り (`"in_range:1:100"`, DESIGN §8.4 / L632) と variant DSL (`"no:set:false"`, DESIGN §7.3) で既に使用済み。`builtin:in_range:1:100` のような形にすると、どこまでが ns でどこからが引数かをトークン位置だけで判別することになり構文的に曖昧。
- **`.` は不可**: link の固定パス DSL (DR-029) が `.name` を「フィールドアクセス」の意味で既に専有している (`link:"timerange.since"`, `link:"color.rgb[0]"`)。config_key (DR-050) も同じ DSL を流用している。registry 名にも `.` を使うと、同じ記号が「階層アクセス」(link/config_key) と「名前空間区切り」(registry vocab) という異なる意味論を文脈依存で持つことになり、読み手が誤読しやすい。

- **`/` を採用**: kuu の既存語彙 (定義済み全 DR / DESIGN.md / fixtures) を検索した限り識別子として未使用 — 空き地。外部実績として protobuf の `Any.type_url` (`type.googleapis.com/google.protobuf.Duration`)・URL パス階層・npm scoped package (`@scope/name`) 等、「所有者/名前」を表す記号として広く通用している。

`builtin/in_range:1:100` は `/` が ns 区切り、`:` が引数区切りで階層が視覚的に一意に読める。

### 5. reason 語彙の kind との直交性

DR-066 の `{element, argv_pos, kind, reason, message}` 構造は変更しない。`kind` (parse/filter/constraint、発生層の分類) と `reason` の ns (`builtin`/拡張、語彙の所有者表記) は別軸で共存する — 同じ `kind: "filter"` の下で `reason: "builtin/too_small"` (組み込み) と `reason: "myapp/custom_reason"` (拡張) が両方現れうる。wire 上のフィールド構造 (DR-053/DR-066) はそのまま、`reason` フィールドの値が ns 付き識別子になるだけ。

### 6. definitions 領域のローカル識別子は ns 対象外

DR-035 の解決順 `definitions.X.name → registry.X.name → warn+フォールバック` のうち、**`definitions.X` 側のキー名 (ユーザが自由に付けるローカル識別子) は ns の対象外**。ns が解決するのは「グローバルに共有される語彙プール (registry 側)」の衝突であり、definitions はユーザのローカルスコープなので衝突相手がそもそも存在しない。

一方、`definitions.types.number.name` のように **registry 住人 (configurable factory) を参照する値**は ns 対象 (例: `"name": "builtin/number_parser"` や `"name": "contrib_python/number_parser"`)。DR-040 の「移行ロック」の例 (`definitions.types.number = "contrib_python_number_parser"`) は、ns 正規化後は `"contrib_python/number_parser"` のような表記になる (DR-040 の 3 層上書き構造・解決順そのものは無傷)。

### 7. DR-066 の「排他所有 prefix 却下」との整合

DR-066 は「採用しなかった案」で `filter:in_range:too_large` のような **発生源 (個々の filter) ごとの排他的 prefix** を明示的に却下している (「reason は分類語彙であって所有物ではない」)。本 DR の ns はこれと矛盾しない — 却下されたのは *個々の発生源単位* の排他 prefix (in_range だけが `too_large` を独占する形) であり、本 DR が導入する ns は *提供元カテゴリ単位* (builtin か拡張か) の分類であって共有可能。`builtin/too_large` は `in_range` と `len_range` の両方が emit してよい (DR-066 「reason はグローバル語彙で、排他所有ではない。同じ reason を複数の発生源が emit してよい」は本 DR でも不変)。ns が増やすのは「どの提供元カテゴリの語彙か」という 1 段の粗い分類だけで、発生源ごとの排他性は導入しない。

### 8. ns が解く問題・解かない問題

ns が解くのは「**名前の衝突回避と所有カテゴリの可視化**」(builtin か拡張か一目でわかる、複数拡張パッケージが同名を名乗っても ns が分ければ衝突しない)。

ns が解かないのは「**どの descriptor が何を emit するか (emission 対応表)**」— これは SCH-Q2 (descriptor の reasons 宣言の正本位置) の主題であり、本 DR はその宣言に使う識別子の綴り方を整理するだけで、宣言作業自体 (builtin descriptor の reasons 全列挙、Schema 実体化) を代替しない。

### 9. 旧 `kuu_` prefix (`kuu_number_parser` / `kuu_bool_parser` / `kuu_int_parser`) の扱い

DR-061 §3 / DR-074 / DR-075 で導入された `kuu_` prefix は、ns が正式導入される前の ad-hoc な疑似 namespace だったと位置づけられる。2 案を比較する:

**案 A: リネーム (`builtin/number_parser` / `builtin/bool_parser` / `builtin/int_parser`) 【推奨】**

- 利点: ns 導入の動機 (ad-hoc prefix の正規化) と一致する。`kuu_` は参照実装 (kuu.mbt, MoonBit) の命名慣習が spec 語彙に漏れ出したものであり、spec 正本としては実装非依存の名前が望ましい。他の builtin 名 (`trim`, `in_range` 等、prefix なし) との表記スタイルも揃う。
- 難点: 破壊的変更。ただしドラフト期 (DR-068 §3) につき仕様上の障害はない。
- fixture 影響の見積もり (実測、fixtures/ 配下 grep): `"name": "kuu_..."` 形での出現は 3 ファイル・計 17 箇所。
  - `fixtures/value-typing/int-hex-value-space.json`: `kuu_int_parser` × 3
  - `fixtures/value-typing/int-round-modes.json`: `kuu_int_parser` × 12
  - `fixtures/value-typing/number-base-prefix-optin.json`: `kuu_number_parser` × 2
  - `kuu_bool_parser` は fixtures 配下に出現なし (0 箇所)
  - 過去の DR 本文 (DR-061/074/075 等) の言及は決定当時の記録として無傷のままでよい。実改修が要るのは現行規範 (DESIGN.md) と fixtures のみ。

**案 B: 維持 (`builtin/kuu_number_parser` 等、`kuu_` を builtin ns 内の名前としてそのまま残す)**

- 利点: fixture 改修コストがゼロ (bare 糖衣がそのまま効く: `kuu_number_parser` = `builtin/kuu_number_parser`)。
- 難点: `builtin` という ns が既に「spec 組み込み」を表しているのに、名前の中にさらに `kuu_` という実装由来 prefix が残る二重表現になる。将来の新規 builtin factory 命名時に「`kuu_` を付けるべきか」という疑問を再生産し、命名規約が濁る。

推奨は案 A。実際のリネーム作業 (fixtures 一括更新 + DESIGN.md 該当箇所) は本 DR の射程外とし、別 issue で実施する。

## 採用しなかった案

上記「決定」節の各所で個別に理由を述べた `:` 区切り・`.` 区切りに加え、以下も不採用:

### ns なしで prefix 文字列の緩い規約に留める (例: `contrib_` / `kuu_` の命名慣習だけで運用)

`kuu_number_parser` の実例が示す通り、規約だけでは衝突検出・所有可視化が機械化されない (typo 検出や completeness チェックの判定入力になり得ない)。ns を語彙上の第一級区切りにすることで DR-054 の unknown-vocab 判定・DR-066 の completeness 検査の基盤になる。

### ns をレジストリ区分ごとに別記号にする (例: types は `.`, filters は `/`)

区分ごとに記号が変わると DSL の一貫性が失われ、学習コストが上がる。全 registry 区分で `/` に統一する。

## 射程外

- `builtin` ns 内の語彙全列挙 (`schema/builtin-descriptors.json` 等への実体化) — Schema 実体化 issue (docs/issue/2026-07-08-schema-materialization-and-reason-descriptors.md) 側の作業
- 拡張 ns の命名規約の正式化 (パッケージ名との対応・予約語彙の有無等) — spec は ns 名自体への強制機構を持たない、運用規約は各ホスト実装の関心
- `kuu_number_parser` 等の実際のリネーム作業 (fixtures 一括更新、DESIGN.md 該当箇所反映) — 案 A 採用が確定した後の別 issue
- schema/wire.schema.json への ns 語彙パターンの反映 — SCH-Q1 (Schema 実体化のスコープ) 側の作業

## 関連

- DR-066 (reason コード層 — reason フィールド追加・排他所有 prefix 却下との整合を §7 で確認、v1 最小語彙は `builtin` ns 内の一部として再解釈される)
- DR-061 (registry 装置の自己記述 — `reasons` を含む descriptor 全宣言軸が ns 対象、configurable factory の `name` が ns 付き識別子になる)
- DR-040 (type registry の方言運用 — 3 層上書き構造・「移行ロック」の named 方言パーサ例が ns 正規化後の表記に対応)
- DR-035 (definitions/registry 対称性 — 解決順は無傷、definitions キー自体は ns 対象外という区別の根拠)
- DR-062 (filter chain の継承 — 継承元解決 (ref → type registry デフォルト → 空配列) は ns 導入後も不変、filter 名の綴りが変わるだけ)
- DR-029 (link の固定パス DSL — `.` が既に専有している事実が区切り文字選定の根拠)
- DR-028 (type は definitions/registry への参照糖衣 — type 参照名が ns 対象になる位置づけの土台)
- DR-054 (unknown-vocab — ns 付き語彙の所有判定が同じ機構に乗る)
- docs/issue/2026-07-08-schema-materialization-and-reason-descriptors.md (SCH-Q2/Q3 の裁定待ち論点、本 DR が Q3 の緊張を解消)
