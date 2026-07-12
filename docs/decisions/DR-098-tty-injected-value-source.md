# DR-098: tty 判定の値源化 — ambient probe を注入 provider にする

> 由来: issue `docs/issue/2026-07-07-tty-value-as-injected-source.md` (kawaz/die の stdin 分岐が argv 由来でない ambient probe に依存し、`corpus/real-cli/die.json` でモデル化不能だったギャップ)。issue 記載の kawaz 初期見解 (「評価器の純粋性を守るため、ambient probe でなく env と同様の注入値源としてモデル化が筋」) と、kawaz の着手裁定 (2026-07-12「やっといて」) による。DESIGN §13.9 の既存記述 (「TTY / カラー / interactive: AtomicAST は端末状態を知らない」) との射程調整も本 DR で扱う (統括セッションの精読で発見、裁定は本 DR §5)。

## 決定

### 1. tty_provider — registry 単一スロット

```
tty_provider: (stream: "stdin" | "stdout" | "stderr") → bool | null
```

- **null = 提供なし** (その stream の判定を供給しない — env_provider の「未設定」/ config_provider の「読めない」と同じ「席が空」の扱い)
- env_provider (DR-049) / config_provider (DR-050) と同列の**単一スロット**。複数 provider の合成は持たない (合成が要るなら合成済み provider を 1 つ登録する既存流儀、DR-049 §採用しなかった案)
- production の既定実装は `isatty(3)` 相当 (各言語 DX の関心)。conformance / fixture は `tty: {"stdin": false, ...}` (§3 参照) でケース入力として注入し、production probe を経由しない
- 階層帰属はコア (env_provider と同格。CLI ツールの ambient 判定として広く必要になるため、config_provider のような opt-out 標準ではなくコア)

### 2. 評価器の純粋性は不変

パーサ・評価器は「argv + 各 provider の応答」という決定的写像のままである。tty_provider もこの写像の入力の 1 つに過ぎず、評価器自身が `isatty()` を呼ぶことはない — ambient probe の実行は provider 実装 (kuu 外側、ホスト言語 DX) の責務に完全に閉じる。env/config も既に「実行環境に依存する外部入力」を provider 経由で注入しており、tty はこの既存パターンの 3 例目である。

### 3. wire 属性 `tty` — 要素の席宣言

```json
{"name": "stdin_tty", "type": "bool", "tty": "stdin"}
```

- 値語彙は `"stdin" | "stdout" | "stderr"` の 3 値 enum
- **installer 所有語彙** (DR-042 不変則③): 新設する `tty` installer が所有し、値源ラダーの tty 席 (§4) に lookup を宣言する席宣言型 installer (env/config/inherit installer と同型、DR-042 不変則④)
- `tty` はフィールド名自体が installer 所有の特殊語彙であり ns 対象外 (DR-094 §1 「installer が所有する特殊語彙のフィールド名自体は対象外」の適用、`long` の prefix DSL 語彙・`env` 属性名と同じ扱い)

### 4. 供給値は native bool — 型不一致は definition-error

tty_provider の返り値は string でなく既に bool である。DR-050 §4 の config scalar と同じ「型一致で T 域直行」原理がそのまま適用される: `piece_filters` / `parse` (String→T の相) は型の帰結でスキップされ、`value_filters` / `cell_filters` (T→T の相) のみ通過する。

**`tty:` を bool 以外の要素に付けるのは definition-error** (kind=`invalid-range`、DR-083 §5「静的に既知の構造不一致は定義時に倒す」の筋、DR-082 §2 の「構文上は書けるが構成として不成立」系統):

- 非 bool の値プリミティブ (string / number / int / ...) への `tty:` — 値空間の型と供給値の型が定義時点で不一致と分かる
- **値なし要素 (`type: "none"`、dd 含む) への `tty:`** — DR-089 §4 の「値充足を要求される席には値空間が無いため立てない」と同型 (env の同型ケースは DR-089 の fixture `fixtures/definition-error/none-invalid-range.json` で先例化済み)
- **`flag` / `count` プリセットへの `tty:`** — 両者は `type: bool` / `type: number` を土台にするが、プリセットが同梱する「消費 0 の起動即書き込み」構造 (flag = 起動で true、count = 起動ごとに increment) は値源ラダーの tty 席 (§4、CLI より下位) と競合する固有の書き込み経路を持つ。tty 席が供給する値と flag/count の起動時書き込みは「同じ値セルへの別経路」の意味論が両立しない — tty 席は「値の供給」、flag/count の起動は「操作」であり、両者は別の相に属する。素の bool 値プリミティブ (プリセットなし) にのみ `tty:` を許可する

### 5. ラダー位置 (裁定)

```
1. CLI 明示 / link
2. 環境変数 (env)
3. config ファイル
4. inherit (祖先 scope)
5. tty (本 DR)
6. default / value
```

DR-031 の既存順 (CLI > env > config > inherit > default) に対し、**tty を default の直前 (inherit の直後) に挿入**する。根拠:

- 「明示 (CLI/env/config) > 継承 (inherit) > **観測** (tty) > 宣言既定 (default)」という一貫した序列が成り立つ。観測値 (実行時に判明する端末状態) はユーザの明示や設定より弱いが、単なる静的な宣言既定よりは強い
- 実世界の慣行がこの位置を裏付ける: `NO_COLOR` / `CLICOLOR_FORCE` (env) は tty 検出を上書きする、`--color` (CLI) はさらに上位。git の `color.ui=auto` は「config があれば従う、無ければ tty 判定」という config > tty の序列そのもの
- 観測値が明示より優先されてはならない (ユーザの意図を覆さない) が、宣言 default より無条件に劣ってはユースケース (die の stdin 分岐) を満たせない — default は「tty 判定すら得られない (provider が null を返す) 場合の最終フォールバック」の位置に留まる

### 6. source タグの拡張 (DR-031)

```
source ∈ { cli, link, env, config, inherit, tty, default }
```

`effects` には現れない (tty 由来値は env/config/inherit と同じく完走後の値確定であり、CONFORMANCE §2 の「effects は cli/link 由来のみ」の対象外)。`result` + `sources` で検証する。

### 7. §13.9 の TTY 除外記述の改訂

DESIGN §13.9 (旧文言、docs/DESIGN.md:959):

> **TTY / カラー / interactive**: AtomicAST は端末状態を知らない。出力レンダリングは実装側の責務。

を以下に改訂する:

> **カラー / interactive / 出力レンダリング / 端末制御**: AtomicAST は端末を操作しない。レンダリングは実装側の責務。**tty 判定値そのもの**は本 DR で注入値源 (tty_provider) として射程内化 — ただし ambient probe (isatty 呼び出し) は依然として評価器の外 (provider 実装の責務) であり、評価器が端末状態を能動的に知ることはない。

除外が元々守ろうとしていた関心 (評価器の純粋性・レンダリング責務の実装層への分離) は本 DR でも完全に維持される。改訂で射程内化されるのは「tty という bool 値を注入経由で受け取れる」ことのみであり、「AtomicAST が端末を操作する / 能動的にセンシングする」ことは引き続き範囲外。

除外の射程内化は新規の設計判断ではなく、issue (§13.9 より後発) が「env/config で代替もできない — 値源として存在しない」という表現ギャップを既に issue として認定していたことの解消である。§13.9 の TTY 行は元々「レンダリング責務の除外」と「値源としての不在」を一文に束ねていたが、本 DR は後者だけを解消する。

## 採用しなかった案

### ambient probe を評価器内に持ち込む (isatty を直接呼ぶ)

issue 記載の kawaz 初期見解の段階で既に退けられている。評価器が「argv → 結果」の決定的写像でなくなり、同じ定義・同じ argv でも実行するたびに結果が変わりうる (テスト不能・再現性喪失)。DR-049/DR-050 が env/config を注入 provider にしている既存パターンと非対称になる。

### tty を env_provider の拡張として表現する (専用 provider を新設しない)

env_provider のシグネチャは `(key: string) → string | null` で、鍵は環境変数名という文字列空間に属する。tty は鍵ではなく `{"stdin","stdout","stderr"}` という閉じた 3 値の列挙であり、文字列鍵にエンコードすると (例: `"$tty:stdin"` のような擬似鍵) 型の意味論が濁る。値も string でなく native bool (§4) であり、env の「string → pieceProcessor 全段通過」という契約とも異なる。独立 provider として新設する方が型が素直。

### §13.9 の TTY 除外を維持し、tty を扱わない (issue を却下)

die.json の 3 分岐 (bare-TTY → help fallback / non-TTY → stdin forward / `--`/`--help`/`--version` の meta 経路) が永久にモデル化不能なまま残る。実在 CLI (corpus/real-cli) の表現力がここで頭打ちになり、kuu の「言語非依存な引数定義」という目的に対し欠落が固定化する。issue が指摘した表現ギャップは正当であり、却下する理由がない。

## 射程外

- tty_provider の各言語デフォルト実装 (isatty(3) の呼び出し方、Windows のコンソール API 差異等) は本 DR では確定しない。各言語 DX の実装詳細
- 出力先ストリームの実際のカラー付与ロジック (ANSI エスケープの出し分け等) は引き続き §13.9 の責務外のまま。tty 値を受け取った後の応用判断はアプリ側の関心
- stdin/stdout/stderr 以外のストリーム (将来の任意 fd) への一般化は需要が出た時点で再訪

## 波及

- DESIGN: §11.4 のラダーに 5. tty を挿入 (default を 6 に)、§12 の後に tty 節を新設、§13.1 の registry 区分表に tty_provider 行、§13.9 の TTY 行を §7 の文言で改訂、§16 用語集に tty_provider
- schema/wire.schema.json: node の properties に `tty` (enum 3値) を追加
- schema/fixture.schema.json: case の `tty` フィールド (env と同型の注入形式) 追加、`sources` の enum に `tty` 追加
- fixtures: fixtures/value-sources/tty-ladder.json (ラダー輪郭)、fixtures/definition-error/tty-non-bool.json (§4 の definition-error 輪郭)
- corpus/real-cli/die.json: why の gap 記述を本 DR 解消済みに更新、`stdin_tty` 要素を definition に追加、tty 注入 case を追加
- kuu.mbt: tty_provider の実装・tty installer・§4 の definition-error 検査は本 DR 起草時点で未着手 (別途実装追随)
- issue `2026-07-07-tty-value-as-injected-source.md` は本 DR 起草 + fixture 化の完了をもって close (実装追随は別 issue に切り出す可能性がある、close 時に判断)

## 関連

- DR-049 (env lookup の契約 — 単一スロット provider の先行例、シグネチャ対比の根拠)
- DR-050 (config ファイル値源 — 型一致で T 域直行の先行例、§4 の直接の土台)
- DR-031 (値源ラダー — 本 DR が拡張する対象、source タグ)
- DR-042 (installer アーキテクチャ — 不変則④ 値源はラダー席への宣言、tty installer もこの型)
- DR-061 (registry 装置の自己記述 — tty installer の descriptor 宣言、owns=["tty"])
- DR-094 (registry 語彙の namespace — installer 所有の特殊語彙フィールド名は ns 対象外)
- DR-083 §5 (静的既知の不整合は definition-error — §4 の判断枠)
- DR-089 (type 省略 = none — §4 の値なし要素除外の先例、DR-093 による部分置換とは別軸)
- DR-093 (required/requires の型委譲 — none 要素の充足定義。§4 の definition-error 判断とは独立: 本 DR が禁じるのは「tty 値源を none 席に宣言すること」であり、none 要素の required/requires 充足判定 (DR-093 の管轄) には触れない)
- DESIGN §13.9 (AtomicAST 未予約 / 責務外の周辺概念 — 本 DR が TTY 行を改訂)
- issue `docs/issue/2026-07-07-tty-value-as-injected-source.md` (経緯)
