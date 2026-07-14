# kuu VISION — 全体構想

> 本書は kuu が何を目指すか (寿命の長い構想) の正本。どの順で作るかは [ROADMAP.md](../ROADMAP.md) が正本であり、本書とは役割が異なる。ROADMAP のフェーズが進んでも本書の構想自体は大きく動かない前提で書く。未確定の外周構想は「構想 (未確定)」と明示し、DR 裏付けのある確定設計と区別する。

## 1. 背景 — v0 からの再出発

kuu には前史がある。[kuu.mbt](https://github.com/kawaz/kuu.mbt) リポの `kuu-v0` 枝 (旧 `main`) では MoonBit ライブラリ + kuu-cli の実験が進められていたが、ある時点で**それを一度全部捨てて AST 設計から再出発**し、現行の spec-as-core 体制 (本リポ kawaz/kuu が仕様 + fixture の正本、kuu.mbt が参照実装) を作る方向に切り替えた。

> 「v0 で色々実験したのちそれを一度全部捨てて AST 設計を経て今の kuu リポジトリを作る方向性にしたのは、cli も当然視野に入れながら設計し直したから。v0 のまま進めても今の形には辿り着けなかった」(kawaz、2026-07-14)

つまり CLI 独立コマンド構想は後付けの思いつきではなく、**AST 再設計そのものが CLI を見据えて行われた**。v0 時代に書かれた kuu-cli 構想文書 (§6 に所在一覧) は、この経緯を踏まえた考古学資料として現行構想の土台になっている。旧文書の語彙 (`schema.json`、`opts` の 14 kind 等) は現行 spec の語彙 (`definition` / `args` / `descriptor` / `registry` 等) に対応しないものを含むため、本書では現行語彙に正規化して引き継ぐ。

## 2. レイヤ構造の全体像

kuu が目指す姿は、単一言語のライブラリではなく、以下の層が積み重なった生態系である。

| 層 | 内容 | 状態 |
|---|---|---|
| **1. spec-as-core** | 仕様 (DESIGN / LOWERING / DR) + API 契約 + conformance fixture。本リポ (kawaz/kuu) が正本。特定言語のバイナリではなく言語非依存のテストデータ集合そのものが core (README / ROADMAP) | 現行推進中 (ROADMAP フェーズ 0-2) |
| **2. 各言語 kuu-core** | fixture を pass させる形で構築するネイティブ実装。「移植の定義 = fixture を pass させること」(CONFORMANCE.md)。正面玄関 API は `parse_definition` (DR-054) / `parse` (DR-053) / `complete` (DR-060) の 3 契約 | kuu.mbt が参照実装として先行 (ROADMAP フェーズ 3) |
| **3. kuu-ux** | kuu-core をそのまま晒すのでなく、各言語の慣用に沿わせる「二つ目の顔」。cobra/clap 風のビルダー API、あるいは各言語固有の UX 慣習でラップする層 | 構想 (未確定) |
| **4. DX 層** | help レンダラ・completion 生成器。DR-060 §5 が定義する「責務 4 層」の層 2 に対応 — 各 shell の作法 (bash/zsh/fish の補完機構、completer 名から shell 機能へのマッピング) を全部この層に封じ、アプリ開発者や利用者に学ばせない | 設計は DR-060 で確定、実装は ROADMAP フェーズ 4 |
| **5. kuu-cli** | 言語非依存の独立コマンド。§3 で扱う | 構想 (旧 kuu.mbt DR-0057/DR-0047 の再輸入) |
| **6. 外周** | ショーケース リポジトリ・Web UI ビルダー・コードジェネレータ・多言語展開 | 構想 (未確定)、§5 |

DR-060 §5 が明記する「責務 4 層」(1. complete API + 候補構造 = 仕様の関心、2. kuu completion 生成器 = プロダクトの標準提供、3. アプリ開発者 = 生成器に繋ぐだけ、4. エンドユーザ = `source <(app completion bash)` するだけ) は、上表の層 1・層 4・層 3(kuu-ux 相当)・利用者の対応関係そのものである。「shell 作法の学習をアプリ開発者に丸投げしない」という DR-060 の原則は、本書のレイヤ構造全体を貫く思想でもある。

## 3. kuu-cli 構想 — 引数パースの独立コマンド

### 新ジャンル論

引数パースはこれまで各言語のライブラリに閉じ込められてきたが、やっていることは本質的に言語非依存 — 「文字列の配列と定義を受け取り、構造化された結果を返す」だけである。これを jq / sed / awk と同列の**独立コマンド**として提供する:

```
jq      → JSON処理の独立コマンド
sed/awk → テキスト処理の独立コマンド
kuu     → 引数パースの独立コマンド   ← 新ジャンル
```

### 幻影コマンド体験

kuu-cli 構想の核心は、単なる CLI 版パーサではなく次の体験にある:

> 独立 CLI として、各言語 UX 版の kuu で実行した定義を `app.json` として export しておけば、そのバイナリ実体 (アプリ本体) が無くても、定義 JSON さえあれば **あたかもそのコマンドが存在するかのように**引数パース・補完・ヘルプを体験できる。

利用イメージ:

```bash
kuu parse app.json -- "$@"
```

シェルスクリプト・Makefile・CI パイプライン・言語のラッパースクリプト・プロトタイピングから、実装言語を問わず同じ `app.json` を叩ける。アプリ本体を持たない環境でも、定義 JSON が「幻影」としてコマンドの引数パース・補完・ヘルプを再現する。

### query 語彙がそのままサブコマンドに写る

現行 conformance fixture の `query` 語彙 (`parse` / `complete` / `definition_error` / `lower`、CONFORMANCE.md §1) は、conformance runner の JSON in/out (`definition` + `args` → outcome) としてすでに稼働しているプロトコルの原型である。kuu-cli のサブコマンド構成はこの語彙をそのまま写せばよい:

```
kuu parse <definition.json> -- <args>...        # query: "parse"
kuu complete <definition.json> -- <args_before>...   # query: "complete"
kuu lower <definition.json>                      # query: "lower"
kuu validate <definition.json>                   # query: "definition_error"
```

新規プロトコルを設計する必要はなく、fixture format (CONFORMANCE.md) が仕様として既に確定させている入出力契約をそのまま CLI の I/O に転用できる、という点が現行 spec-as-core 体制ならではの強みである (v0 時代の JSON protocol v1 は各実装が個別に持つ手作りプロトコルだったが、現行は fixture format という共有された正本がある)。

## 4. 独自フィルタの可搬性 — descriptor による型・モック生成

kuu-cli / 幻影コマンド体験には限界が一つある。ユーザ定義の独自フィルタ (registry 拡張住人、たとえばアプリ固有のバリデーション関数) はホスト言語のクロージャであり、export した定義 JSON だけでは再現できない。

この限界を緩和する構想が、既に確定している descriptor 体系との接続である。installer / factory / filter / collector はいずれも自身を説明する descriptor を持ち、所有語彙 (`owns`)・観測語彙 (`observes`)・config キー・失敗理由 (`reasons`) を宣言する (DR-061 §1、DR-095、DR-106 の `kind`/`domain` 軸)。この仕組みを独自フィルタの**シグネチャ export**にも適用できる:

1. 独自フィルタが自身の descriptor (入出力の型、`signature` が `Validate`/`Transform` のどちらか、`reasons` 集合等) を宣言する
2. export した定義 JSON に、その独自フィルタの descriptor (実装本体ではなくシグネチャのみ) を同梱する
3. import 先の言語では、descriptor からそのフィルタの interface / struct 定義を生成し、型を当てたモックコードまで出力する
4. 開発者はその言語の型エラーに従って、足りない実装 (実際のバリデーションロジック) だけを埋めれば動く

これは DR-061 の「クロージャをデータ化する」原理 (matcher = DR-042、効果記述子 = DR-045、descriptor 自体 = DR-061 §1) の延長線上にあり、**descriptor という共有インフラが既に敷かれている**ことが、この構想を絵空事でなく現実的な拡張にしている根拠である。ただし export JSON への descriptor 同梱形式・言語別コード生成器は現時点で未設計であり、構想 (未確定) の段階にとどまる。

### WASM embed という可能性 (構想、未確定)

さらに踏み込んだ可能性として、独自フィルタの型シグネチャの export に留まらず、WASM embed モードでフィルタ実装そのものを definition JSON に同梱し、import 先でそのまま実行できるようにする、という構想がある。実装は用意されておらず、確定した設計判断は無い。将来面白い方向性として記録するに留める。

## 5. 外周構想 (未確定)

kuu-cli が実用段階に達した後の展開として、以下が構想されている。いずれも DR 裏付けのない未確定構想。

- **Web UI ビルダー**: 引数定義を GUI でポチポチ組み立て、definition JSON を export するツール。手書きせずに CLI 引数設計が完結する体験を目指す。export した JSON は kuu-cli でもライブラリとしての各言語 kuu でもそのまま使える
- **コードジェネレータ**: definition JSON から各言語のパースコードを生成する。定義上必要な installer やフィルタのみを import し、バンドルサイズを気にした最小コードを出力する。tree-shaking 前提の設計は既に ROADMAP・DR-040 に「未参照 parser は自明に dead-code」という原則があり、コードジェネレータはこの原則の上に立つ
- **100 コマンドショーケース リポジトリ**: curl / git / docker / ffmpeg / kubectl / terraform 等、著名 CLI ツールの definition JSON を大量に集めたショーケース。宣伝 (「kuu はこれだけのコマンドをパースできる動く証明」)・ドキュメント (「curl 風のオプションを書きたいなら curl の definition を見る」)・回帰テスト (100 件のパースが通り続けることを CI で保証) を兼ねる。旧 kuu.mbt DR-0057 (§6) が既に同種の構想を持っていた
- **多言語展開**: ROADMAP フェーズ 5 の射程。「移植の定義 = fixture を pass させること」がそのまま各言語展開の受け入れ基準になる

## 6. 考古学参照 — 旧 kuu-cli 構想の所在

v0 時代 (現行 spec-as-core 体制への移行前) に書かれた kuu-cli 関連文書。旧語彙のまま読む資料であり、現行 spec の正本ではない。

| リポ / 枝 | パス | 内容 |
|---|---|---|
| kuu.mbt リポ `kuu-v0` 枝 | `docs/decisions/DR-0057-kuu-cli-standalone-command-vision.md` | 「引数パースの独立コマンド」新ジャンル論の初出、多言語戦略表、100 コマンドショーケース構想の初出 |
| kuu.mbt リポ `kuu-v0` 枝 | `docs/design/kuu-cli.md` | サブコマンド構成 (`parse`/`completions`/`validate`/`help`) と JSON プロトコル v1 の設計 |
| kuu.mbt リポ `kuu-v0` 枝 | `docs/decisions/DR-0047-kuu-cli-embed-pattern.md` | embed+extract+exec パターン (各言語 DX レイヤーが kuu-cli バイナリをパッケージに同梱し、ユーザから隠蔽する配布方式) |
| kuu.mbt リポ `origin/claude/review-implementation-gLfMA` 枝 | `README-kuu-cli.md` | 上記 kuu-v0 文書と重複する内容 |
| kuu.mbt リポ `origin/claude/review-implementation-gLfMA` 枝 | `docs/plans/kuu-cli-implementation.md` | 実装フェーズ計画 (WASM bridge からの移植、C FFI 経由の stdin/stdout、互換性ゲート等) |

v0 時代の多言語戦略 (ネイティブ FFI / WASM-GC / kuu-cli embed の 3 経路併存) は特定の MoonBit 実装に強く依存した設計だった。現行の spec-as-core 体制では、各言語が fixture を pass させる独立実装を持つため、embed パターンのような配布上の技術的制約は各言語 kuu-ux / kuu-cli 実装側の関心事に留まり、spec 自体の構想には含めない。

## 関連

- [ROADMAP.md](../ROADMAP.md) — 実装フェーズの現役計画 (本書との役割分担は冒頭を参照)
- [docs/DESIGN.md](DESIGN.md) §13 (外部レジストリ) / §15 (パース挙動)
- [docs/CONFORMANCE.md](CONFORMANCE.md) §1 (`query` 語彙) — kuu-cli サブコマンド構成の写像元
- DR-040 (type registry の方言運用 — tree-shaking・kuu-cli 全部入りバイナリの既存言及)
- DR-060 (補完クエリ — 責務 4 層)
- DR-061 / DR-095 / DR-106 (descriptor 体系 — 独自フィルタ可搬性の受け皿)
