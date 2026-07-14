# COMP-Q4: 補完クエリ × 制約 (遅延述語) の座席、および候補同一性の spec 空白

> 調査日: 2026-07-14 (read-only recon)。対象: spec = kawaz/kuu/main (working copy、cell_filters →
> final_filters/accum_filters 分割作業と並行中のため filter 関連記述は新旧混在の可能性あり)、
> 参照実装 = kawaz/kuu.mbt/main。
>
> **更新 (2026-07-14, kawaz 方向出し反映)**: 調査項目 2〜4 (制約 × complete) は「制約は complete
> に不参加」で確定済み (下記「決定」節)。本ファイルはこの方針を前提に組み直した。調査項目 1
> (候補同一性・dedup の spec 空白) は変更なく、こちらが提案書の主役。

## 調査項目 1: 候補の同一性・dedup の spec 空白の確定

**確定事実: spec (DESIGN §15.13 / DR-060 / DR-066 / DR-073) のいずれにも「候補の同一性」
「dedup 規則」の規定は存在しない。**

- DESIGN §15.13 (`docs/DESIGN.md:1217-1229`) は complete の定義・API・候補構造・責務 4 層を書くが、
  「同じトークン列を複数の partial 経路が生成した場合にどう束ねるか」への言及がゼロ
- DR-060 (`docs/decisions/DR-060-completion-query.md`) 全 97 行を精読。§1 (`:7-16`) は「和集合」と
  言うのみで dedup という語もキーもない。§3 (`:34-41`) の「候補構造」は候補 1 件の形 (spelling +
  メタ) を定義するだけで、複数候補間の同一性判定には触れない
- DR-066 (`docs/decisions/DR-066-error-reason-codes.md`) は `errors` 構造への `reason`/`path`
  追加が主題で、complete の候補には無関係 (`path` は ParseError 用、Cand 用の path 拡張ではない)
- DR-073 (`docs/decisions/DR-073-export-key-collision-carrier.md`) は **complete でなく
  interpretations (完全解決経路の結果ビュー) 同士の区別**を扱う別問題。§2 (`:14-21`) の「識別子は
  実体 entity (値でも source でも区別不能)」という論法は refined だが、対象は「露出キー衝突時の
  2 つの完全解決経路をどう区別するか」であって「complete が返す 2 つの候補が同じ候補か」ではない。
  射程が異なるため、この DR を「候補同一性の正本」として転用することはできない (関連性はあるが
  代替にはならない)

**kuu.mbt 実装が実際に pin している dedup 規則** (`src/core/outcome.mbt:303-367` の `complete()`):

```
outcome.mbt:316-343 (complete() 内の dedup ループ)
```

- 比較対象: `spelling / is_value / ty / origin / term / meta` の 6 フィールド完全一致
- **`path` (祖先スコープ列、DR-066 §4 由来で `Cand` 構造体に追加された field、`node.mbt:601-609`)
  は比較対象から明示的に除外** — 実装コメント (`outcome.mbt:322-326`) が理由を明言:
  > 「二つの候補が生成された祖先スコープの違いだけなら同一候補」「DR-060 §1 の "union of what's
  > readable" is a union over SPELLINGS, not over the scopes that offer them」
- これは **spec の記述からの演繹ではなく、実装者 (kuu.mbt 側) の独自解釈**。DR-060 §1 の「和集合」
  という言葉は「経路の和集合」とも「スペリングの和集合」とも読め、後者を選んだのは実装側の判断
- `Cand` 構造体 (`node.mbt:601-609`) 自体、`path` フィールドを additive 拡張として持たせながら
  dedup には使わない、という非対称な扱いを実装コメント (`node.mbt:598-600`) が自認している
  (「Pending's value-slot candidate can be converted to a missing_operand ParseError ... field
  additive, not a breaking change」)

**含意**: 現状は実装が一意に決め打ちしているが、spec が pin していないため、
(a) 別実装が「祖先スコープごとに別候補」という別の dedup 規則を採用しても DR-060 適合性は否定できない、
(b) conformance fixture で dedup 挙動を検証する根拠が spec 側に無い。DR-073 の「実体 entity」の
論法を援用し、candidate の同一性を「origin (由来要素) の実体」で揃える案は自然な拡張候補だが
(下記提案 (a) 参照)、現状は明文化されていない空白。

## 調査項目 2: 制約 × complete の現意味論 (確定事実、決定の前提)

**確定事実: 現行実装は遅延述語 (制約) を complete の候補生成に一切参加させない。ただし `after`
引数が与えられた場合のみ、間接的に遅延述語込みの完全解決チェックが働く。この 2 つの経路の
非対称性は spec 上どこにも明記されていない。**

### 2-1. `after` 無指定 (デフォルト、最も一般的な「行末での補完」)

`complete()` (`outcome.mbt:303-367`) の候補生成は `scope_step`/`eval` が返す `Branch`
(`Accept`/`Held`/`Pending`、`node.mbt:611-621`) の分岐のみで構成される。`Pending` だけを候補源とし
(`outcome.mbt:318-340`)、`Held` は無条件で捨てる (`outcome.mbt:341` の `_ => ()` コメント
「Held: dead end」)。

- `Branch` を生成する経路 (`greedy_engages`/`has_viable`、`eval.mbt:1092-1150`) は DR-097 が精密化
  した「読める」述語そのもので、**遅延述語 (`§15.9`) を判定に一切含めない**ことが実装コメント
  (`eval.mbt:1108-1115`) に明記: 「Downstream consequences (sibling elements' fulfillment,
  deferred constraints §15.9, later tokens' fate) play NO part」
- `after.length() == 0` の場合、`complete()` は `cands` をそのまま返す (`outcome.mbt:344-346`)。
  制約 installer の情報 (どの要素がどの `exclusive_group` に属するか等) には一切アクセスしない
- 具体例: `exclusive_group: ["format"]` を持つ `--json`/`--yaml` で `before = ["--json"]` の場合、
  `--yaml` の読み自体は成立する (値スロットを持たないフラグは即座に Accept、DR-097 の意味で
  「読める」) ため、`--yaml` は普通に候補として出る。制約は一切これを止めない

### 2-2. `after` 指定あり (行中補完)

`outcome.mbt:347-366` の after 整合フィルタは、各候補について `before + [candidate] + after` を
組み立てて `parse(root, toks2, defs~)` (`eval.mbt:3237`) をフル実行し、`Success`/`Ambiguous` なら
残し `Failure` なら除外する。

`parse()` の内部 (`eval.mbt:3237-...`) を読むと、遅延述語評価 (`eval_constraints`、
`eval.mbt:2986-2990` のコメント「Evaluate ONE scope's delayed predicates on a complete path's
FINAL state」) は KTop (トップレベル継続) で実行され、**違反があれば Accept ではなく Held として
返る** (`eval.mbt:3276` のコメント「constraint satisfaction is already decided at KTop ...
so every full-length Accept here IS a complete解決経路」)。したがって `after` 経由で呼ばれる
`parse()` は確実に `exclusive_group_violated`/`conflicts_with_violated`/`requires_violated`/
`required_violated` (`eval.mbt:2995-3067`、`3068-` 以降) を含めて判定する。

- 同じ具体例で「カーソルの後ろに 1 トークン以上ある」場合、`--yaml` を採用した
  `["--json", "--yaml"]` は `exclusive_group_violated` で `Failure` になるため除外される。
  **なお `after` 引数が渡されたかどうかの分岐は `outcome.mbt:344` の `after.length() == 0` で
  判定するため、呼び出し元が明示的に `after: []` を渡しても「行末」扱いになり素通る** — 真に
  after フィルタが効くのはカーソル後に 1 トークン以上ある場合のみ

### 2-3. spec 側の記述との対応

- DESIGN §15.9 (`:1162-1181`) / DR-047 は「遅延述語は完全解決経路の成立条件」「評価対象は値源
  ラダー充填後の最終状態」(DR-047 §4, `:23-25`) と規定。**`before` だけを消費した partial 経路は
  まだ「最終状態」に到達していない** — この教義に従う限り、`after` 無指定時に遅延述語を評価
  しようがない (評価対象そのものが存在しない) というのが最も自然な読み
- DR-060 §2 (`:18-32`) の after 整合フィルタは「候補採用後に after も消費して完全経路に到達
  できるもの」と書いており、「完全経路」の定義 (DR-047 §2 により遅延述語を含む) を素直に継承すれば
  制約込みチェックになるのは**論理的帰結**。DR-060 の議論記録にはこの帰結が明示的に意識された
  形跡はない (「制約」「exclusive_group」等の語が DR-060 に一切登場しない) が、決定 (下記) は
  この非対称自体を問題視せず、むしろ「after 無指定側の挙動 (制約不参加) を正とする」形で
  解消する

## 調査項目 3: dead end 除外との整合の導出 (決定の論拠)

### 3-1. DR-097 の相分離原則との類推

DR-097 (`docs/decisions/DR-097-greedy-reading-viability.md`) は「読める」の判定を精密化する際、
「完全経路 (遅延述語込み) の存在で判定する」案を明示的に検討し**棄却**した (§採用しなかった案、
`:63-70`)。棄却理由の核心 (`:67-68`):

> 制約の充足は値源不問 (DR-093 — env/config 経由でも充足しうる) ため、これを判定に入れると
> 環境変数の有無で同じ argv のトークンが option になったり文字列になったりする**層逆転**が起きる

この論拠は **値述語 (`required`/`required_group`) と `requires` の目的語側**に特有のもの —
これらの判定入力は「値の有無 (default/env/config 込み)」であり、`before` の時点でこれから
`after` の中で満たされる可能性を排除できない (非単調: 今 false でも後で true になりうる)。

一方 **指定述語 (`exclusive_group`/`conflicts_with`)** の判定入力は「committed 同士の衝突」の
みであり (DESIGN §15.9 表, `:1173-1179`)、値源ラダーに一切依存しない。DR-097 が問題視した
「層逆転」(env/config の値で意味が変わる) はこの述語には直接は当てはまらない — **とはいえ、
この部分反論は下記の決定では採用しないと判断されている (論拠 4 参照)**。

### 3-2. しかし「評価対象は最終状態」という DR-047 の教義がより根源的

DR-047 §2/§4 (`:12-16`, `:23-25`) は「遅延述語は完全解決経路の成立条件」であり「評価対象は値源
ラダー充填後の最終状態」と規定する。これは **述語の種類 (値述語 / 指定述語) を問わず**、
「経路が完結して初めて評価される」という教義である。`complete` の `before` 走査時点では経路は
まだ完結していない (これから何を打つか未定) ため、この教義に従えば **`exclusive_group` も
含めて、`complete` の時点で遅延述語を評価すること自体が前提を欠く**。

### 3-3. 「単調性」の観点で両論拠を統合する (理論的には拡張の余地があった、が不採用)

上記 3-1 (層逆転論、指定述語は例外にできそう) と 3-2 (評価対象論、遅延述語は一律不可) の緊張は
以下のように解消できる: dead end 拡張が正当化されるとしたら「経路の途中で遅延述語を評価してよい」
からではなく、**「`before` の情報だけで『`after` に何を補っても違反が確定する』という命題が
証明可能」だから**、という形に再定式化できる。この証明可能性は判定入力の**単調性**に依存する:

- `exclusive_group`/`conflicts_with`: 判定入力は committed 集合。**ただし unset (`--no-x`、
  DR-045、DESIGN §15.9 末尾 `:1181`) が「exclusive の衝突にも requires のトリガにも数えない」
  形で committed を取り消せる要素が対象に含まれる場合、単調性は破れる** — `before = ["--json"]`
  時点で `json` が committed でも、`after` 側に unset 相当があれば衝突は解消しうる
- `required`/`required_group`: 判定入力は値充足 (default 込み)。非単調 — 拡張対象外
- `requires`: トリガ側は上記 exclusive_group と同じ unset 留保つきで準単調、目的語側 (値充足) は
  非単調 — 目的語未充足を理由にトリガ候補を除外することはできない

**この単調性論は論理的には成立するが、下記「決定」ではこれによる部分拡張 (旧案 B/C) を
採用しないと判断された** — 理由は決定節「不採用の理由」を参照。

### 3-4. 素材 / ポリシー分離 (DESIGN §15.13, DR-060 §3) との整合

DESIGN §15.13 (`:1226`) の「絞り込みポリシー (tab-tab 切替等)・置換・着地は生成器と shell の
領分」は、**「複数の有効な候補からどれを見せるか選ぶ」レベルのポリシー**を指す
(DR-060 §3 `:34-41` の議論も同様、「未入力 tab-tab は alias を隠す」等が例)。

これに対し dead end 除外 (`before` 段階で「もう成立しえない解釈」を候補から外すこと) は
「素材の生存判定」であって「見せ方の選択」ではない — DR-060 §1 (`:15`) 自身が dead end
除外を「候補構造」節 (層 2 の関心) ではなく意味論の定義そのもの (§1) に置いていることがこれを
裏付ける。**この区別は「制約は complete に不参加」という決定と矛盾しない** — 制約評価は
「素材の生存判定」の対象にすらならない (3-2 の通り、評価に必要な最終状態が存在しないため)、
という位置づけになる。

## 決定 (kawaz 方向出し、team-lead 経由、2026-07-14): 制約は complete の候補生存判定に不参加

**結論**: `required`/`required_group`/`requires`/`exclusive_group`/`conflicts_with` の全ての
遅延述語は、`complete()` の候補生成・dead end 判定に一切参加しない。相区分は「dead end 判定 =
parse 相、制約評価 = resolve 相」に固定する (v1 の線)。指定述語 (`exclusive_group`/
`conflicts_with`) 限定の部分拡張 (3-3 の単調性論、旧提案の案 B/C) も不採用とする。

kawaz の理由づけ (原文要旨): 「補完では通してもよいのかもしれない」— 排他確定候補も補完には
出し、実行時の `exclusive_group` エラー (説明チャネルがある側) で落とす方が親切、実装も重い。

### 論拠 1: 相区分 — dead end は parse 相、制約は resolve 相 (評価に必要な情報が存在しない)

- DR-047 §5 (`:39`) は bool 目的語の requires 判定について「判定は全完全経路の収集後に、
  値源ラダーが解ける**後段 (resolve 層、post_filters と同じ側)** で経路フィルタとして適用する
  — eval 層 (経路探索) に値源を持ち込まない」と明記し、制約評価のタイミングを「resolve 層」
  という言葉で名指ししている
- DR-097 (`:9`) は「読める」の判定を「その entry 自身の値スロット消費の確保 + 値空間照合
  (parse 相)」に限定し、「下流の帰結 (遅延述語 §15.9) は判定に参加しない」と明記する。これは
  eval 層 (parse 相) の局所判定原則
- complete() の dead end 判定 (`Held` を捨てる、`outcome.mbt:341`) は、この同じ parse 相の
  Branch 分岐 (`Accept`/`Held`/`Pending`) を再利用している (2-1 で確認済み)。dead end は定義上
  すでに「parse 相の失敗」を指す概念であり、resolve 相の情報 (値源ラダー充填後の最終状態、
  DR-047 §4) を要する制約評価とは、評価に必要な入力が揃う相そのものが異なる
- complete の `before` 走査時点では経路がまだ完結していないため、「値源ラダー充填後の最終状態」
  という制約評価の前提が存在しない (3-2 の再掲)。3-1/3-3 の単調性論による部分反論はあるが、
  決定はこれを採用しない (論拠 4 参照)

### 論拠 2: 説明チャネルの非対称 — 候補除外は「なぜ無いか」を語れない、エラーは語れる

- 候補から消える (= complete が返さない) という表現は「なぜこの綴りが打てないか」を伝える
  手段を持たない。ユーザ (または生成器) は「候補に出ない」という事実からしか状況を推測できない
- 一方、実行時に `--yaml` を採用してしまった場合の失敗は `exclusive_group_violated`
  (DR-066 §3 の reason 語彙、`docs/decisions/DR-066-error-reason-codes.md:39`) という
  機械可読な理由つきで表面化する。DR-053 の `errors` 構造 (`element, argv_pos, kind, reason,
  message`) が「なぜ失敗したか」を明示的に運ぶのに対し、complete の「候補が無い」は同じ
  表現力を持たない
- kawaz の理由づけそのもの: 制約違反を早期に隠すより打たせてから理由つきで教える方が、
  ユーザが「なぜ出ない/なぜ失敗するか」を理解する負担が小さいという UX 判断

### 論拠 3: DR-097 の完全経路版棄却の前例 (類推であり complete 側の実測ではない)

- DR-097 の「採用しなかった案」(`:63-70`) は「読める」の判定を完全経路 (遅延述語込み) の存在
  に広げる案を、参照実装での実装実験で棄却した。無関係な下流失敗が局所判定に逆流する
  (`missing-positional` 反例) / 制約の層逆転 (env/config 依存で同じ argv の意味が変わる) の
  2 点が具体的破綻として実測されている
- complete の候補生成に制約を混ぜる場合も、構造的に同型のリスク (ある候補の生存判定に無関係な
  他要素の充足状況が逆流する) を負う可能性が高い。**本調査では complete 側での実装実験は
  行っておらず、これは DR-097 の前例からの類推であって実測ではない (未検証)**

### 論拠 4: 述語ごとのコスト非対称、部分拡張の実装コスト

- 3-3 の単調性論で示した通り、拡張の余地があるのは `exclusive_group`/`conflicts_with` に
  限られ、かつ unset (`--no-x`, DR-045) で取り消し可能な要素は対象から除く必要がある
- この部分拡張を実装するには、complete() が現在アクセスしていない制約 installer の情報
  (どの要素がどの `exclusive_group` に属するか、DESIGN §13.1 の constraint installer 所有
  語彙) への新規アクセス経路と、「要素が unset 可能かどうか」という新しい判定軸 (DR-045 の
  effect descriptor から導出できるか、新設が要るか) が必要になる
- 一律不参加はこの実装コストがゼロ。kawaz の「実装も重い」という判断はこの非対称を指している

### 不採用の理由 (単調性論による部分拡張、旧案 B/C を採らない理由)

- 3-3 の「exclusive_group/conflicts_with は committed のみに依存し単調なので before 段階で
  証明可能」という理屈自体は論理的に成立するが、以下の理由で採用しない:
  1. 対象述語 (`exclusive_group`/`conflicts_with` のみ) と非対象述語 (`required`/
     `required_group`/`requires`) の非対称ルールを生成器実装者が覚える負担
  2. unset 留保により「本当に単調か」の判定自体に新しい宣言軸が要り、実装が複雑化 (論拠 4)
  3. 論拠 2 (説明チャネル) — 早期に隠すより打たせて教える方が親切という UX 判断が上位に
     立つため、単調性による拡張の実装コストを払う動機自体が薄い

## fixture 案 (positive fixture): 排他確定候補も complete に出ることを明示的に固定する

現状 (2-1) の挙動が「未実装だからたまたまそうなっている」のではなく「意図した設計」であることを
conformance で保証するため、以下の positive fixture を追加する提案:

- 定義: `exclusive_group: ["format"]` を持つ `--json`/`--yaml` (共にフラグ、値スロットなし)
- 入力: `complete(atomic, {before: ["--json"], word: ""})`
- 期待: 返り値の候補集合に `--yaml` の exact candidate (spelling: `"--yaml"`) が **含まれる**
  ことを assert (= 排他相手が commit 済みでも候補から消えない)
- コメント指針 (テストコードは動く仕様書として書き、DR/経緯を fixture コメントに inline 化する
  方針に沿う): 「exclusive_group 違反は resolve 相の関心であり complete (parse 相の dead end
  判定) には不参加。打てば exclusive_group_violated の reason つきエラーになる (DR-066 §3) —
  早期に候補から隠すより打たせて理由つきで教える方針」を判断根拠として埋め込む
- 併せて `conflicts_with` 版・`requires`/`required` の目的語未充足でもトリガ候補が出続ける版も
  同型の positive fixture として追加するのが輪郭網羅上望ましい (該当なし: 現状これらの
  fixture は存在しないことを fixtures 全ディレクトリ列挙で確認済み、下記「未検証事項」参照)

## 将来拡張 (v1 射程外、記録のみ): constraint-conflict meta 案

`CandMeta` (`node.mbt:579-583`、現行フィールド `is_alias`/`hidden`/`deprecated`) に将来
第 4 のメタフィールドとして「この候補を採用すると衝突しうる制約」の素材を乗せる拡張案:

```
CandMeta { is_alias, hidden, deprecated, conflicts_with?: Array[String] }
```

- 用途: 生成器 (層 2) がこの meta を見て、「`--yaml` は `--json` と衝突します」のような
  事前警告を UI 上に出す・候補を薄く表示する等のポリシーを実装できる
- **素材とポリシーの分離 (DESIGN §15.13 / DR-060 §3) を保つ**: kuu 側は「衝突しうる」という
  事実 (素材) だけを追加で運び、隠す/警告する/そのまま見せるの選択は引き続き生成器の領分 —
  本決定 (制約は complete の判定に不参加) と両立する (「complete が判定に使わない」のと
  「complete が判定材料を運ぶだけ」は別軸)
- 対象は `exclusive_group`/`conflicts_with` (committed 由来、静的に列挙可能) に限られ、
  `required`/`requires` のような値依存の制約は「まだ何が起きるか分からない」ため meta として
  乗せる情報自体が定まらない (論拠 4 と同じ非対称)
- 本調査では射程外。将来 issue 化の候補として記録するのみ、裁定は求めない

## 提案 (a): 候補同一性の spec 明文化

- DR-060 §3 (候補構造) に dedup 規則を追加する: kuu.mbt 実装が pin した「`spelling`/`is_value`/
  `ty`/`origin`/`term`/`meta` の完全一致、`path` は比較対象外」を spec 側に格上げする案が
  最有力 (実装が既に動いている実績があり、DR-073 の「実体 entity」論法とも整合 — `origin` を
  実体の代理指標として使っている、と読める)
- 別解: `origin` だけでなく実体 id (link/ref 越しの同一実体判定、DR-073 §2 の精密さ) まで
  要求する、より厳密な同一性規則。現状の kuu.mbt 実装は `origin` (要素名の文字列) 比較のみで
  実体 id までは見ていないため、link/ref で複製された要素が同名 `origin` を持つ場合に誤って
  同一視される可能性がある (**未検証**: 具体的な fixture での確認が必要)

## kawaz 裁定が必要な分岐 (CQ4-Q)

制約 × complete (旧 CQ4-Q1/Q3/Q4) は上記「決定」で確定済みのため裁定不要。残る分岐は 1 点のみ:

- **CQ4-Q1**: 候補の同一性・dedup 規則を spec (DR-060 §3 または新 DR) で明文化するか。するなら
  kuu.mbt 実装 (`spelling`/`is_value`/`ty`/`origin`/`term`/`meta`、path 除外) をそのまま
  正本にするか、それとも DR-073 の「実体 entity」水準まで精密化するか (提案 (a) の 2 案)

## 未検証事項 (本調査で裏取りしていない点)

- DR-060 策定時の issue ログ (`docs/issue/2026-07-04-completion-partial-parse` 相当、DR-060
  冒頭の「由来」に記載) を精読すれば、after 整合フィルタが遅延述語込みになる帰結が議論時に
  意識されていたかどうかを確認できる可能性がある。本調査では issue ログ自体は未読
- link/ref 越しの同一実体が complete 候補の `origin` 文字列としてどう現れるか、fixture での
  実機確認は行っていない (提案 (a) の「別解」に関わる懸念)
- 論拠 3 (DR-097 前例の類推) は complete 側での実装実験を経ていない。DR-097 と同型の「無関係な
  下流失敗の逆流」が complete の候補生成でも実際に起こりうるかは、参照実装での検証が必要なら
  別途実施できる (今回は「制約不参加」の決定が先に確定したため実験の必要性自体が消えている)
- **確認済み**: spec fixtures 配下 (`fixtures/` 直下、`find` で全ディレクトリ列挙 + 制約系
  キーワードでの grep) に completion query (`complete()`) 専用のディレクトリは存在しない。
  `constraints-parse/` はあるが `complete` 系ではない。`path-search/complete-path-count.json`
  は「完全**経路**の本数」(completion query でなく DR-038 の complete path 概念、紛らわしい
  同名) の fixture であり無関係。すなわち制約 × complete の現状挙動は conformance fixture
  としてまだ固定されておらず、上記 positive fixture 提案は既存 fixture との後方互換を気にせず
  新規に組める

---

**追記 (2026-07-14)**: 裁定結果 — 遅延述語は before-only 補完に不参加 / after 整合フィルタは完全経路判定 (遅延述語込み、DR-047 の直接適用) / 候補同一性 = wire 構造等価で将来の complete DR に pin 予定。
