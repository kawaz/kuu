# kuu-ux 設計骨子 (統括起草、UX-Q 裁定バッチの土台)

2026-07-16、輪郭調査 2 本 (`2026-07-16-kuu-ux-internal-survey.md` = 内部材料 / `2026-07-16-kuu-ux-ecosystem-survey.md` = CLI 生態系 8 系統) と kuu-cli conformance sweep の実測 (245/547 pass、fail 4 系統) を統合した設計骨子。裁定前のドラフト — UX-Q 裁定で確定した部分から DR 化する。

## 判明した事実 (統合)

### 骨子を導く 3 つの確定的観察

1. **spec は既に 3 態モデルを予定している** (DESIGN §0.2): `UsefulAST (ネイティブ、クロージャあり) ↔ UsefulAST JSON ($required 化) → AtomicAST wire`。kuu-ux 設計は新規レイヤの発明ではなく、この予定地 (UsefulAST とその JSON 交換形) の実体化である。$required は名前だけ spec に登場し具体形が未定義
2. **生態系 8 系統に lossless round-trip は存在しない** (Click to_info_dict が唯一の一方向 lossy)。理由は構造的 — クロージャ (action/validator/completer/DI) が直列化不能。kuu は definition (宣言) と registry (クロージャ) を最初から分離済み (DR-010/028/061) なので、この構造問題を設計済み — **export 第一級は kuu の差別化点として成立する**
3. **成熟系 (clap/picocli) は複数の書き味が単一モデルに合流する**: derive/annotation と builder が同じ command model へ落ちる。kuu-ux の書き味 (UX-A) は排他選択でなく「合流先 = UsefulAST を固定し、書き味は言語ごとに複数共存」が生態系の答え

### 生態系調査の境界画定 (そのまま採用できる形)

- **横断で固定**: serializable Definition / parse_definition の diagnostics / Outcome 分類 / completion request/candidate protocol / help・error の semantic model と policy (renderer は含めない) / export 契約と unresolved capability の表現 / instance-scoped (global state 禁止 — Cobra の轍)
- **言語ごとに変える**: declaration surface (derive/decorator/fluent/annotation) / typed binding (codegen/adapter/dynamic) / dispatch / 例外・async・DI 統合 / naming・doc-comment 抽出

### conformance sweep の実測 (kuu-cli、2026-07-16)

parse fixture 547 case 中 245 pass / 302 fail / (別途 complete・definition_error は envelope 未確定 skip 73)。fail 4 系統 = (a) sources 未出力 (b) error object の message 余剰 (c) Infinity の JSON 表現 (d) effects の scope 余剰。全数分類は kuu-cli セッションが実施中。

## 骨子 (7 本柱)

### 柱 1: kuu-ux の定義 = UsefulAST の実体化

kuu-ux とは「各言語における UsefulAST の実装 + それを wire form へ落とす export 経路 + Outcome を言語型へ写す Binding」である。VISION §2 層 3 の「二つ目の顔」をこの 3 責務に分解する:

- **Definition 面** (UsefulAST): 人間が書く。クロージャ・表示メタ (help/display_name、DR-046 §3) を保持できる
- **Export 面**: UsefulAST → wire JSON。クロージャは $required 化 (柱 3)、表示メタは UsefulAST JSON 側に残す (AtomicAST 非搬送の既定を維持)
- **Binding 面**: Outcome (binds/result/errors/warnings) を言語の型へ写す。方式は言語慣用 (derive/codegen/accessor/dynamic) に委ね、spec は強制しない

### 柱 2: 書き味は「合流モデル」

言語ごとに derive/decorator/builder が共存してよいが、全て同一の UsefulAST に合流する (clap/picocli の実証形)。spec が管掌するのは合流先 (UsefulAST JSON の形) だけ。マイグレーションパス (UX-L) は「各言語の支配的ライブラリの気分に寄せる」を既定とする。

### 柱 3: $required の具体化 (UX-C/D の核)

生態系調査の含意 (hook を黙って落とすと「export した JSON で動作再現できる」誤認) から、export は次の 3 点セットで設計する:

- 未解決フックは wire に **named capability marker** として残す (例: registry 参照名。descriptor 体系 DR-061/107 が既に named reference の受け皿)
- export 時に未解決フックを**検出・列挙する validation** を必須にする (黙殺しない)
- import 側 (幻影コマンド/kuu-cli) は marker に遭遇したら「この definition は capability X を要求する」と機械可読に報告できる (VISION §4 のシグネチャ export と同じ線)

### 柱 4: help/error は「semantic model + policy まで共通、renderer は言語側」

docopt の轍 (usage text を正本にすると翻訳・rewrap が死ぬ) と DR-053/054 の既定 (素材はフィールド、文言はレンダラ) が一致。共通化の上限は error category / exit class / usage を添える条件 / suggestion 有無 / semantic sections まで。

### 柱 5: kuu-cli の envelope は fixture protocol を正本に持つ

VISION §3「query 語彙がそのままサブコマンドに写る」を活かし、CLI 出力 = conformance fixture の expect 語彙 (outcome union) を基本形にする。sweep の fail 4 系統は「fixture protocol にどこまで厳密に寄せるか」の裁定 (UX-Q) で解消する。sources / interpretations の resolve 適用 / 余剰フィールドの許容は個別裁定。

### 柱 6: completion 配布は「生成器標準提供 + runtime 問い合わせ」を第一候補に

生態系 3 系統 (静的生成 / 同一 binary 問い合わせ / 外部 engine) のうち、kuu の責務 4 層 (DR-060 §5) と幻影コマンド構想に整合するのは「生成 script が kuu-cli または app binary へ runtime 問い合わせる」形。dotnet-suggest の bootstrap 摩擦を轍として、shell 登録の体験設計は DX 層 (ROADMAP フェーズ 4) の関心に送る。

### 柱 7: 実装順 — MoonBit UsefulAST が一番手

ROADMAP フェーズ 4 の「MoonBit UsefulAST DX」を kuu-ux の最初の実装とし、kuu-cli の argv self-hosting (自身の引数定義を kuu definition で書く) を最初の dogfooding にする。

## spec 側の先行宿題 (ux 設計が依存する未確定、UX-Q と同時裁定)

1. **completer / accumulator の descriptor 宣言軸が未確定** (DR-107 §7 は owns/observes 禁止のみ) — 柱 3 の capability marker が completer を指せるためには要確定
2. **binds → result object 構築の production 昇格** (conformance runner 内に閉じている、MDR-005 射程外のまま) — Binding 面の土台
3. **interpretations の resolve 相適用が未規定** (DR-053 §3 / front_door resolve の「未定」コメント) — 柱 5 の ambiguous 出力形に直結

## 関連

- `docs/findings/2026-07-16-kuu-ux-internal-survey.md` (内部材料の一次調査)
- `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` (生態系の一次調査)
- docs/VISION.md §2-4 / docs/DESIGN.md §0.1-0.2 / ROADMAP.md フェーズ 4
- kuu-cli の docs/findings/2026-07-15-codex-review-1-poc.md (v1 契約 8 項目)
