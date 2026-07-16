# DR-109: kuu-ux 設計骨子 (7 本柱) と kuu-cli 契約の初期裁定 — UX-Q1〜Q7

> 由来: kuu-cli PoC (kawaz/kuu-cli、CLI-Q1=b 裁定) の codex レビュー #1 が残した「v1 契約正本化前に決めること 8 項目」と、kuu-ux (VISION §2 層 3) の設計着手 (NEXT-Q1 の c)。輪郭調査 2 本 (`docs/findings/2026-07-16-kuu-ux-internal-survey.md` = 内部材料・v0 考古学 / `docs/findings/2026-07-16-kuu-ux-ecosystem-survey.md` = CLI 生態系 8 系統) と kuu-cli の conformance fail 全数分類 (kuu-cli リポ `docs/findings/2026-07-16-conformance-fail-taxonomy.md`、12 カテゴリ 415 件・分類不能ゼロ) を統合した設計骨子 (`docs/findings/2026-07-16-kuu-ux-design-skeleton.md`) に対する UX-Q1〜Q7 バッチ裁定 (kawaz 2026-07-16、`docs/QUESTIONS.md` 経由)。

## 決定

### 1. 設計骨子 7 本柱の承認 (UX-Q1=a)

`docs/findings/2026-07-16-kuu-ux-design-skeleton.md` の 7 本柱を kuu-ux 設計の確定骨子とする:

1. **kuu-ux = UsefulAST の実体化**: Definition 面 (人間が書く、クロージャ・表示メタ保持) / Export 面 (wire JSON 化、クロージャは capability marker 化) / Binding 面 (Outcome → 言語型) の 3 責務。DESIGN §0.2 の 4 層アーキテクチャの予定地の実体化であり新規レイヤの発明ではない
2. **書き味は合流モデル**: derive / decorator / builder が言語ごとに複数共存してよく、全て同一の UsefulAST に合流する (clap / picocli の実証形)。spec が管掌するのは合流先 (UsefulAST JSON の形) だけ
3. **$required の具体化**: 未解決フック (クロージャ) は wire に named capability marker として残す + export 時に未解決フックを検出・列挙する validation を必須にする + import 側は要求 capability を機械可読に報告できる。「hook を黙って落とすと export した JSON で動作再現できるという誤認を生む」(生態系調査の構造的教訓 — 主要 8 系統に lossless round-trip が存在しない理由そのもの) への対処
4. **help/error は semantic model + policy まで共通、renderer は言語側**: 共通化の上限は error category / exit class / usage を添える条件 / suggestion 有無 / semantic sections。docopt の轍 (usage text を正本にすると翻訳・rewrap が死ぬ) と DR-053/054 の「素材はフィールド、文言はレンダラ」の一致
5. **kuu-cli の envelope は fixture protocol が正本** (VISION §3 の実行。厳密度は §2)
6. **completion 配布は生成器標準提供 + runtime 問い合わせが第一候補** (DR-060 §5 と幻影コマンド構想に整合。dotnet-suggest の bootstrap 摩擦を轍として、shell 登録の体験設計は DX 層の関心)
7. **実装順: MoonBit UsefulAST が一番手、kuu-cli の argv self-hosting が最初の dogfooding**

### 2. CLI envelope は fixture expect と厳密一致 (UX-Q2=a)

`kuu parse` の出力は conformance fixture の expect 語彙と厳密に同形とし、**expect に無いフィールド (message / scope 等の余剰) は出さない**。人間向け情報は将来の opt-in (`--verbose` 等) に逃がす。

> 留保 (kawaz): 将来的には b (上位集合) や c (2 モード) を検討する。「結果以外の解析コンテキストを含む情報も見たくなるが、そこまでは構造設計しておらず実装依存になる」ため、**今は手を付けず後の話とする** — 解析コンテキストの構造化露出は将来の設計課題として保留。

### 3. sources は resolve 済み出力に常に含める (UX-Q3=a)

CLI の resolve 済み出力には常に `sources` を含める。fixture の optional 検証と整合し、消費者 (script) が値の出所を常に機械判別できる。

### 4. interpretations は resolve 相を適用しない (UX-Q4=a)

ambiguous の各 interpretation には値源ラダーを適用せず、parse 相の骨格 (result ビュー + claimants、DR-053 §3 / DR-073) のみ返す。

> 論拠 (kawaz): 最終結果が大事。**途中経過についてまで規定すると将来の最適化の余地を奪う** — interpretations の内部処理を規範化しないことで実装の自由度を保つ。DR-053 §3 の「重複解釈の dedup 可否を定めない」留保とも同じ思想。

### 5. spec 先行宿題の扱い (UX-Q5=a、「早めにやりたい」)

- **completer / accumulator の descriptor 宣言軸の確定** (DR-107 §7 の未確定 role): issue 起票して次サイクルで先行着手
- **binds → result object 構築の production 昇格** (MDR-005 射程外のまま runner 内に閉じている): UX-Q2/3 の envelope 実装と同サイクルで解消
- **interpretations の規定** (resolve 適用有無): 本 DR §4 で解消済み

### 6. env/config/tty の CLI 取得契約 — kuu-cli はテストツールではない (UX-Q6、kawaz 独自裁定)

提示した 3 案 (a: 注入のみ・実環境継承なし / b: 実環境既定 / c: a 既定 + passthrough opt-in) に対し、kawaz は **b 系を基本とする独自裁定**を下した:

> **kuu-cli はテストツールではない。アプリ内の kuu 実装と同じように動作することが求められる。なので環境も当然取得する。**

- **既定 = 実環境の取得** (env は実環境変数、config は実ファイル、tty は実観測)。アプリに組み込まれた kuu と kuu-cli が同じ definition で同じ振る舞いをすることが第一原理
- **試験用の環境無視・固定オプションを別途持つ**: `--no-env` / `--no-config` / `--tty <spec>` (固定) に加えて `--env k=v` / `--config <...>` (注入・上書き)。conformance gate はこれらで環境を固定して回す
- 裁定の背景にある構想 (VISION へ追記する新規 2 件):
  1. **極小バンドルモード**: kuu-cli の存在を前提に、アプリ内の kuu ロジックバンドルを無くした「ほぼ wrapper のみ」の言語 ux。**多言語展開の最初の一歩はこれを用意するだけで最低限実現できてしまう** — 言語ネイティブ実装 (fixture pass) より遥かに安い展開経路
  2. **RPC によるクロージャ注入 (第 3 の注入口)**: 本体アプリと kuu-cli の間のクロージャ RPC spec があれば、言語実装テンプレ (§骨子 3 の capability marker + codegen)、WASM embed (VISION §4 の構想) に次ぐ**第 3 のクロージャ注入口**になる。極小 wrapper + クロージャ対応まで可能な「RPC 付き 2nd 最小バンドル」オプションが取れる

### 7. CLI の resolve 適用条件と preset default の共露出非参加 (UX-Q7=a、「Q1-6 で出た話も含めて最高」)

- CLI (`kuu parse`) は**既定で resolve 適用のまま**とする (「kuu parse = ユーザが実際に使う完全なパース」の直感、§6 のアプリ同等原則とも整合)
- その上で **resolve 相でも preset default は export_key 共露出に参加しない**ことを仕様として確定する — `fixtures/export-key/collision.json::single-exposure-ok` の why が保留していた §divergence (「preset default が export_key 共露出に参加するかは要確認」) の決着。共露出検査は「実際の共露出」(発火・値供給があった実体) に対して行い、未発火 flag の preset default が resolve で充填されても共露出キーには現れない
- 参照実装 (kuu.mbt) は既にこの挙動 (conformance green)。kuu-cli の常時 resolve が fixture の resolve フラグ条件と無差別に交差して fail していたのは、この明文化で解消する

> **訂正 (2026-07-16、同日): 本 §7 は裁定の誤読に基づくため再考中 — UX-Q7R (docs/QUESTIONS.md) で追跡。** kawaz の原文「UX-Q7: Q1-6で出た話も含めて最高」は「〜含めて**再考**」の typo であり、Q7=a の承認ではなかった (kawaz 訂正 2026-07-16)。§7 の内容 (既定 resolve 維持 / preset default の共露出非参加) は再裁定が下りるまで**暫定**扱い。`fixtures/export-key/collision.json` の why 更新 (§divergence 決着) も同様に暫定。再裁定の反映はこの note の下に追記する。
>
> **再裁定確定 (UX-Q7R、kawaz 2026-07-16 夜)**: §7 の 2 論点は次の形で決着した。
>
> 1. **CLI の resolve 適用条件という論点は取り下げ** — kuu-cli と runner の挙動差は「公開面が過剰な core を呼び出し側が各自組み合わせている」構造の産物であり、kuu-core の engine/builtins/kuu 分離 (PKG-Q1〜4 裁定済み) 後の一本道の玄関で構造的に消える。CLI 単独で resolve の既定を裁定する問題ではなかった
> 2. **意味論の正しい定式化は「衝突検査の例外」ではなく「default 注入の充填判定が見る cell」** (kawaz 定式化): default 解決は「値 cell が空のままなら注入」という値源ラダーの既存意味論であり、export_key 共露出下ではその判定対象を **export_key 適用後の結果 cell 単位**とする。`--a` 発火で結果 cell x が埋まっていれば、b の default 解決は「x は空でない」を見て注入しない — 衝突自体が発生せず、例外規定は不要。対極も自然に切れる: b に env / config (default より上の席) が入っていれば x が埋まっていても主張になり、本物の衝突として Ambiguous になる (ユーザの意思表示は遠慮しない)。spec 明文化は DR-031 (値源ラダー) / DR-052 (export-key) の語彙でこの充填判定規則を書き、resolve 相込みで pin する fixture を追加する (runner が green だったのは検証層が届いていなかっただけ、の解消)。`fixtures/export-key/collision.json` の why はこの定式化で最終化する。kuu-cli の single-exposure-ok fail は core 分離後の新玄関乗り換えで自然解消見込み (それまで known-fail)

## 採用しなかった案

### UX-Q2 で (b) 上位集合 / (c) 2 モードを今採ること

解析コンテキストの構造化露出は未設計で、今出すと実装依存の形が契約化してしまう。厳密一致で始め、構造設計が済んでから opt-in を足す (kawaz 留保参照)。

### UX-Q6 で (a) 実環境継承なし (統括の当初推し)

「幻影コマンドの再現性優先」の発想はテストツール観に立っていた。kuu-cli の本義はアプリ内 kuu との同一挙動 (§6) であり、再現性の要求は試験用オプションで満たせば足りる。極小バンドルモード構想 (kuu-cli がアプリの実行経路そのものになる) では実環境取得が必須になる。

## 波及

- **VISION.md**: §3 に極小バンドルモード、§4 に RPC クロージャ注入 (第 3 の注入口) を構想として追記
- **fixtures/export-key/collision.json**: why の §divergence 保留を §7 の決着で更新
- **kuu-cli**: envelope 追随 (§2/§3 の出力形、§6 の環境取得 + 試験用オプション、§7 の既定 resolve 維持)。conformance sweep の gate 昇格は追随後
- **kuu.mbt**: binds → result object 構築の production 昇格 (§5)
- **issue**: completer/accumulator の descriptor 宣言軸確定 (§5、spec 側)

## 関連

- `docs/findings/2026-07-16-kuu-ux-design-skeleton.md` (骨子の導出過程)
- `docs/findings/2026-07-16-kuu-ux-internal-survey.md` / `-ecosystem-survey.md` (一次調査)
- kuu-cli の `docs/findings/2026-07-16-conformance-fail-taxonomy.md` (fail 全数分類、Q6/Q7 の実測根拠)
- DR-053 §3 / DR-073 (interpretations / claimants — §4 の前提)
- DR-060 §5 (責務 4 層 — 骨子柱 4/6 の前提)
- DR-107 (descriptor 直交軸 — §5 の宿題の所在)
- MDR-005 (kuu.mbt front_door — §5 の production 昇格の対象)
- docs/VISION.md §2-4 (kuu-ux / kuu-cli / 可搬性の構想正本)
