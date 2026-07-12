# DR-099: tty は型である — 値源ラダー席から preset 型への転換

> 由来: DR-098 (tty 判定の値源化) は kuu.mbt 実装完遂直後 (2026-07-12 `a396d21b`)。実装が固まった直後の見直しで kawaz が同モデルをより単純な形へ裁定 (2026-07-12「tty が何かに付く必要はない。`{type: "tty", name: "tty"}` — セルに最初から isatty が入ってるだけの存在で良い。微調整は tty_ 系 config で」)。DR-098 は tty 判定値を「bool 値要素に付与する wire 属性 + 値源ラダーの新設席」としてモデル化したが、この裁定により「値空間の土台そのものを差し替える preset 型」へ転換する。DR-076 (bool は通常の値型、flag/count が特殊) が既に切り開いていた「特殊性は型/preset 側の展開で吸収し、値型本体を歪めない」という筋を tty にも適用する帰結であり、DR-098 が導入した definition-error 3 分類・multiple×tty の未規定はこの転換で構文的に発生しなくなる (§1)。

## 決定

### 1. `type: "tty"` (builtin/tty) — bool を土台にする preset 型

`tty` は flag/count と同族の**糖衣プリセット** (DESIGN §3.3、DR-076 の枠) — bool を値空間の土台にする preset 型として `type:` フィールドで選択する:

```json
"definitions": {
  "types": {
    "stdout_tty": {"name": "builtin/tty", "config": {"tty_stream": "stdout"}}
  }
},
"options": [
  {"name": "use_color", "type": "stdout_tty", "long": true, "env": "CLICOLOR_FORCE", "default": true}
]
```

(DR-061 §3 の configurable factory 形。bare `type: "tty"` の可否は §3 参照)

preset が同梱するのは**「暗黙 default = tty 観測の fold」だけ**である。それ以外のすべて — long/short/env 席の宣言可否、multiple、filters、required 充足 (= 値空間あり判定) — は**素の bool と完全に同一**に振る舞う。flag/count が「起動即書き込み」という固有の値セル操作を持つのに対し、tty は値セル操作を一切持たず、値源ラダーの `default` 席の解決規則だけを差し替える。

この一般化により、DR-098 §4 が必要としていた definition-error 3 分類 (非 bool 型・値なし要素・flag/count プリセットへの `tty:` 付与) は**構文的に発生しなくなる**: `type:` は単一選択なので `type: "number"` と `type: "tty"` を同一要素に同時に書くこと自体ができない。同様に DR-098 が未規定のまま残していた multiple×tty の扱いも、「tty は素の bool と同一に振る舞う」の一般原則にそのまま吸収され、個別規定が不要になる。

### 2. 値源ラダーは元の 5 段に戻す (DR-098 §5 の挿入を撤回)

```
1. CLI 明示 / link
2. 環境変数 (env)
3. config ファイル
4. inherit (祖先 scope)
5. default / value
```

DR-031 の元の 5 段 (DESIGN §11.4) を復元する。「tty」という独立席はラダーから消える — tty 観測は**特定の型 (builtin/tty) が `default` 席をどう解決するかという、型ごとの解決規則**として吸収される。

tty 型要素の `default` 席の解決規則:

```
resolved_default = fold(観測) ?? 宣言 default ?? absent
```

- `fold(観測)` は §4 の `tty_provider` 応答から `terminal || (tty_cygwin && cygwin)` で計算する bool (§3)。観測が null (provider が未提供) なら `fold` も null
- **観測が優先、宣言 default は観測が得られない場合のフォールバック** — DR-098 §5 が確立した優先関係 (「明示 (CLI/env/config) > 継承 (inherit) > 観測 (tty) > 宣言既定 (default)」) は、ラダー席としてではなく tty 型自身の default 解決ロジックとして完全に維持される。宣言 default を明示していても、観測が得られる限り観測が勝つ
- 両方とも得られなければ absent (素の bool の default 無し要素と同じ帰結、§2.6)

source タグ `tty` (DR-098 §6) は**維持する** — 最終値が fold 由来なら `source: "tty"`、宣言 default 由来にフォールバックしたなら `source: "default"` (観測由来 vs 宣言 default 由来の診断区別、fixtures/value-sources/tty-ladder.json の case 群がこの区別を検証する)。`effects` には現れない (完走後の値確定、CONFORMANCE §2 は不変)。

### 3. configurable factory (builtin/tty) の config キー

- **`tty_stream`**: `"stdin"｜"stdout"｜"stderr"`。**必須** — 未指定 (bare `type: "tty"` を含む) は definition-error (kind=`invalid-range`、§7)。要素名からの推測はしない (kawaz 裁定 TTY-Q2=(c)、2026-07-12)
- **`tty_cygwin`**: bool、既定 **true** — fold の一部 `tty_cygwin && cygwin` を有効にするダイヤル。既定 true の根拠: kawaz/die DR-0008 が「Cygwin/MSYS pty は TTY 扱い」と裁定済み (go-isatty の `IsTerminal || IsCygwinTerminal` 慣行と同じ、§5)

### 4. tty_provider のシグネチャ改訂

```
tty_provider: (stream: "stdin" | "stdout" | "stderr") → {terminal: bool, cygwin: bool} | null
```

DR-098 §1 の `(stream) → bool | null` から改訂する。**bool でなく生観測 2 値を返す** — fold の方言 (`tty_cygwin`) が spec 側の純データ config になり、fixture 注入で決定的にテストできる (bool 単一値のままでは fold の計算自体が provider 実装側に隠れ、方言をテストできなかった)。

- **null = 提供なし** (DR-098 §1 の規定を継承)
- fixture 注入形式 (CONFORMANCE §1、schema/fixture.schema.json): `"tty": {"stdin": {"terminal": false, "cygwin": true}, ...}` — 省略キー / `null` は「供給なし」
- env_provider (DR-049) / config_provider (DR-050) と同列の単一スロットという位置づけは不変 (DR-098 §1)
- production の既定実装は host の TTY 判定 API (各言語 DX の関心、§5) — conformance / fixture は生観測 2 値をケース入力として注入し production probe を経由しない (DR-098 §1 の規定を継承)

### 5. informative note (非規範) — provider 実装の見るポイント

provider 実装 (ホスト言語 DX) が `{terminal, cygwin}` をどう得るかは kuu の規定外だが、参考として:

- POSIX: `isatty(3)` で `terminal` を判定
- Windows: `GetConsoleMode` で `terminal` を判定 (MSVCRT `_isatty` は NUL device を誤って terminal 判定するため cross-OS 実装では避ける、kawaz/die `docs/findings/2026-06-28-tty-detection-cross-os.md`)
- Cygwin/MSYS2/Git Bash の pty: named pipe の pipe 名パターンマッチで `cygwin` を判定 (`GetConsoleMode`/`_isatty` はどちらも false を返す独立した経路、go-isatty の `IsCygwinTerminal` 相当、同 findings ファイル)
- 参考実装: kawaz/die `docs/decisions/DR-0008-stdin-tty-routing-and-help-option.md`、mattn/go-isatty

kuu が規定するのは `{terminal, cygwin}` という観測値の意味とその fold 計算 (§2) までであり、取得手段そのものは各言語 DX の実装詳細 (DR-098 §射程外の規定を継承)。

### 6. DR-098 の supersede 範囲

DR-098 の §3 (wire 属性 `tty`)・§4 (definition-error 3 分類)・§5 (値源ラダー 5 位挿入) は本 DR で撤回する。§1 (tty_provider の存在、シグネチャは本 DR §4 で改訂)・§2 (評価器の純粋性)・§7 (DESIGN §13.9 の TTY 行改訂) は現役のまま引き継ぐ。§6 (source タグ) は「ラダー独立席の発生条件」としては撤回するが、タグ語彙 `tty` 自体 (観測由来の診断マーカー) は本 DR §2 で維持する。詳細は DR-098 の Superseded 節を参照。

## 採用しなかった案

### DR-098 の wire 属性 + ラダー席モデルを維持する

kawaz の明示裁定 (由来節) により退けられている。属性モデルは「bool 以外への `tty:` 付与」「値なし要素への付与」「flag/count への付与」という 3 つの definition-error を個別に規定する必要があり (DR-098 §4)、preset 型へ転換すればこれらは `type:` の単一選択という構文的制約だけで自動的に不成立になる。属性モデルは値空間の型 (`type`) と値源の由来 (`tty:`) という 2 つの独立した軸を持ち込むが、両者が組み合わせによっては意味をなさない (bool 以外・値なし要素) という非直交性を definition-error で後追いする形になっていた。preset 型モデルは軸を 1 つに集約し、非直交な組み合わせを構文的に排除する。

### provider が `{terminal, cygwin}` でなく bool 単一値に畳んで返す (DR-098 §1 のシグネチャを維持)

fold 計算 (`terminal || (tty_cygwin && cygwin)`) が provider 実装側に隠れてしまい、`tty_cygwin` という spec 側の config ダイヤルが実質的に無効化される (provider が独自に畳んだ bool を返してくる限り、kuu 側で `tty_cygwin: false` を指定してもテストで検証できない)。生観測 2 値を返させることで fold を spec 側の純データ計算として保ち、fixture で決定的にテストできる (DR-061 §5 の「相」線引きと同じ思想 — 観測の取得と観測の解釈を分離する)。

### `tty_stream` に既定値を持たせる (例: `"stdout"` 既定、または要素名から推測)

kawaz 裁定 (TTY-Q2=(c)、2026-07-12) で明示却下。`stdout` 既定 (色制御用途が最頻) と `stdin` 既定 (die のような入力分岐用途) はどちらも妥当な用途を持ち、一方を canonical default に選ぶこと自体が推測の押し付けになる。要素名からの推測 (`"stdin_tty"` という名前から stream を導く等) は DR-046 の name 3 軸分離の精神に反する (name は CLI マッチング/結果キー/内部参照の軸であり、config 値の暗黙供給源ではない)。必須にすることで宣言側の意図を明示させる。

## 射程外

- `tty_cygwin` に不正な型 (例: 文字列) を渡した場合の definition-error 分類は本 DR で確定しない。DR-061 §4「config 値の検証は factory 自身の責務」の原則は適用されるが、既存 corpus に factory config の型不正を definition-error として fixture 化した先例がなく (DR-095 の filter config も同様に未検証)、本 DR は `tty_stream` 必須違反 (§3/§7) のみを fixture 化し tty_cygwin 側は見送る。必要になれば別途 issue で fixture 化する
- provider 実装の各言語デフォルト (isatty(3) の呼び出し方、Windows API 差異) は DR-098 §射程外を継承、本 DR では確定しない
- stdin/stdout/stderr 以外のストリームへの一般化は DR-098 §射程外を継承
- 出力先ストリームのカラー付与ロジック自体は DR-098 §射程外・DESIGN §13.9 の責務外を継承

## 波及

- DESIGN: §3.3 の糖衣プリセット一覧に `tty` を追加、§11.4 のラダーを DR-031 の 5 段に復元、§12b を「型として」全面書き換え、§13.1 の `tty_provider` 行のシグネチャ更新・`installers` 行から `tty` (もはや installer 所有語彙でない) を除去、§16 用語集の `tty_provider` 行のシグネチャ更新
- docs/CONFORMANCE.md: `cases[].tty` の記述を `{terminal, cygwin}` 観測形へ更新
- schema/wire.schema.json: node の properties から `tty` (DR-098 §3 の wire 属性) を削除
- schema/fixture.schema.json: `case.tty` のフィールド型を `stream → bool` から `stream → {terminal, cygwin}` へ更新 (`sources` の enum の `tty` は維持)
- schema/builtin-descriptors.json: `types` に `builtin/tty` descriptor を追加 (config: `tty_stream` 必須・`tty_cygwin` 既定 true)
- fixtures: `fixtures/value-sources/tty-ladder.json` を preset 型形式で作り直し、`fixtures/definition-error/tty-non-bool.json` を廃止し `fixtures/definition-error/tty-stream-missing.json` (bare `type: "tty"` の definition-error) を新設
- corpus/real-cli/die.json: `stdin_tty` 要素を preset 型形式に書き直し、why の DR-098 言及を DR-099 に更新
- kuu.mbt: tty_provider シグネチャ改訂・`builtin/tty` factory 実装・DR-098 §4 の definition-error 検査コードの撤去は本 DR 起草時点で未着手 (別途実装追随、実装側は既に DR-098 モデルで完遂済みのため本 DR は破壊的な作り直しになる)

## 関連

- DR-098 (tty 判定の値源化 — 本 DR が部分的に supersede する対象、Superseded 節参照)
- DR-076 (bool は通常の値型、flag/count が特殊 — tty も同族の preset 型として本 DR で合流)
- DR-061 (registry 装置の自己記述 — configurable factory の形式、config 検証は factory の責務という原則の適用元)
- DR-031 (値源ラダー — 本 DR が DR-098 以前の 5 段に復元する対象)
- DR-094 (registry 語彙の namespace — `builtin/tty`、bare `tty` は builtin ns の糖衣)
- DR-049 (env lookup の契約 — 単一スロット provider の先行例、tty_provider のシグネチャ改訂もこの型を踏襲)
- DR-050 (config ファイル値源 — 型一致で T 域直行の先行例)
- DR-046 (name 3 軸分離 — tty_stream 必須化の理由づけ、name からの推測を却下する根拠)
- DESIGN §13.9 (AtomicAST 未予約 / 責務外の周辺概念 — DR-098 §7 の改訂は本 DR でも無傷)
- kawaz/die `docs/decisions/DR-0008-stdin-tty-routing-and-help-option.md` (informative、cygwin 既定 true の参照根拠)
- kawaz/die `docs/findings/2026-06-28-tty-detection-cross-os.md` (informative、provider 実装の見るポイント)
