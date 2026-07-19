# kuu help 表示の表現力チェック — 4 方式 + 2 メタ軸 vs 現 kuu vs 追加提案

> 由来: kawaz 発題 (2026-07-19)「そもそもグローバルは global options みたいにグループ化されるのが普通じゃない?…一般にどんなパターンがあって kuu ではそれらを表現できるか?できないなら足すか?」+ 「コマンド軸でなく CLI パーサライブラリ軸で整理するとどうなる?」+ 「v1 では入れないの縮小推しは禁止 (v1 完備主義)」。
> 一次資料: `docs/findings/2026-07-17-cli-help-vocab-survey.md` (12 系統 CLI パーサ調査、focus はグループ見出し/順序) + `docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md` (実 CLI 20+ の実表示調査、focus は表示パターン)。両者の focus に「global option 継承 → 継承先 help 表示制御」の API 面が抜けていたため、統括が本 finding で補完する。
> 目的: HIP-Q1 (global option 配置) を「単一位置に pin する」でなく「表現力を持たせて全パターンを v1 で表現する」に組み直すための素材。

## 判明した事実

### 1. 実 CLI で観測された 4 方式 + 2 メタ軸 (2026-07-19 実 CLI 調査から)

- **方式 1 複製 (混在型)**: cargo — global option がサブコマンド定義に**同一セクション内で混在**して現れる (由来の可視化なし)
- **方式 1 複製 (独立ブロック型)**: yarn/jj — global option が別セクションでなく、同名見出しの下に**一字一句同一の全文再掲**
- **方式 2 省略**: rustup/git/docker/npm — サブコマンド help に一切見せない (ユーザは top-level を別途参照)
- **方式 3 参照**: kubectl — 値を出さず「入手経路」の案内文だけ末尾に固定表示 (`Use "kubectl options" for a list of global command-line options.`)
- **方式 4 専用セクション**: gh — `INHERITED FLAGS` 独立見出しで自前 (`FLAGS`) と分離、値も明示
- **メタ軸 A 深さ依存**: uv — 階層の深さで方式が切り替わる (`uv pip --help` は複製、`uv pip install --help` は省略)
- **メタ軸 B 条件依存**: az — 継承元の global 集合がコマンドの意味論 (リソース変更系か否か) で動的に変わる (`Global Arguments` 常時 + `Global Policy Arguments` 条件付き)

### 2. CLI パーサライブラリ 12 系統の global 継承 API の整理

CLI パーサライブラリ軸で「(a) global 宣言 API + (b) 継承先 help での既定表示 + (c) 表示制御 API」を整理:

| ライブラリ | (a) global 宣言 API | (b) 継承先 help の既定表示 | (c) 表示制御 API |
|---|---|---|---|
| clap v4 (Rust) | `Arg::global(true)` | 自動 (継承先の同一セクションに混在 = 方式 1 混在型) | `hide(true)` で個別非表示 (方式 2 相当)、`help_heading` で見出しグループ指定 (方式 4 準拠) |
| cobra (Go) | `cmd.PersistentFlags()` (persistent flags) | 自動 (継承先 help に `Global Flags:` セクション、末尾 = 方式 4 相当だがラベル固定) | `flag.Hidden` で個別非表示、`SetHelpTemplate` で全 template 書換 (見出し名変更の唯一手段) |
| urfave/cli v3 (Go) | `Command.Flags` を root で定義 + `HideHelpCommand` 等 | 継承先には出さない (方式 2 相当) | app 全体 template で組み替え |
| click (Python) | 明示的 global 継承なし (`@click.pass_context` で context 経由) | サブコマンド help に**出ない** (方式 2 相当) | rich-click 拡張で `rich_help_panel="Global"` を明示 (方式 4 相当) |
| argparse (Python) | `parents=[parent_parser]` (親の全 argument_group 継承) | 自動 (親のグループ = title 含む = がそのまま子に複製 = 方式 4 相当) | 継承時に group をカスタム argument_group に differ、`add_argument_group(title=...)` で新見出し可 |
| commander.js (Node) | `program.option(...)` は子から `.opts()` でアクセスのみ (help 継承なし) | 継承先 help に**出ない** (方式 2 相当) | `command.copyInheritedSettings(program)` 等 |
| yargs (Node) | `.global(['flag'])` | 継承先 help に自動表示 (方式 1 混在型) | usage テンプレート (`.usage(...)`) 書き換え |
| picocli (Java) | `@Command(scope = ScopeType.INHERIT)` | 自動 (継承先の同一セクションに混在 = 方式 1 混在型) | `hidden = true` で個別非表示、`@Command(sectionKeys = ...)` で見出しカスタム (方式 4 相当) |
| System.CommandLine (C#) | `Command.AddGlobalOption(option)` | 自動 (継承先 help の末尾に固定 = 方式 4 相当だがラベル固定) | 個別 `IsHidden` あり、見出しカスタムは全 template 書換 |
| thor (Ruby) | `class_option :flag` | 継承先 help のオプション一覧に**混在** (方式 1 混在型) | `hide` あり、`group(:name)` で見出し可 |
| Swift ArgumentParser (Swift) | `@OptionGroup(title: ...)` を共通 struct として抽出、各 subcommand で include | 継承先 help に自動、`title:` で見出し明示 (方式 4 相当、見出し自由) | `.hidden`、`title:` で自由 |
| cliffy (Deno) | `.globalOption(...)` | 継承先 help に自動 (方式 1 混在型 or 方式 4 相当、実装確認要) | `.hidden(true)` |
| kong (Go) | 共通 struct の `Embed` + `Groups: []` で明示グループ管理 | `Groups` slice の順で表示、`Key/Title/Description` で細かく制御 (方式 4 相当、最も詳細) | 個別 hidden + group プロパティ |

### 3. ライブラリ軸で見た表現力の下限

- **A. global 宣言**: **全ライブラリが持つ** (click 単体を除く)。宣言方法は差があるが「この option は継承する」の意図表現は共通
- **B. 継承先 help での既定表示**: 方式 1 (混在) 派と方式 4 (専用セクション) 派に分岐。「継承 = help 自動表示」が過半数
- **C. 表示位置・見出し名の制御**:
  - **C1 (個別非表示 = 方式 2 実現)**: 全ライブラリが `hidden`/`hide` を持つ
  - **C2 (見出しカスタム = 方式 4 実現)**: Swift AP / kong / clap / picocli / thor / argparse (親グループ経由) / rich-click (拡張) が持つ。過半数
  - **C3 (省略方式 = help 非表示の一括制御)**: cobra 等の「必ず表示」派を除き、大半のライブラリで template 書換 or 個別 hidden の組合せで実現可能
- **参照方式 (方式 3、kubectl)**: これは「レンダラが値を出さず案内文だけ表示」= **レンダラ policy の判断であり、ライブラリの表現力とは別軸**。ライブラリは素材を提供、レンダラが decide (kuu の DR-112「素材と policy 分離」と整合)

### 4. 現 kuu (DR-112 + DR-042) の表現力

現 kuu で提供されている道具:

- `global: true` (DR-042) — global installer が宣言層に「サブコマンドスコープへの継承コピー」を植える
- `inheritable: true` (DR-059) — inheritable installer が「祖先スコープへの prefix 入口コピー」を植える
- `help_group_name` (DR-112 §5) — options entry を表示グループに紐付ける
- グループ宣言エントリ (DR-112 §5) — グループ見出し + 表示メタを options 列先頭で宣言
- `help_order` / `help_group_order` / `help_after` (DR-112 §6) — 表示順の明示制御
- `hidden: bool` (DR-058) — 個別 hidden。面別 hidden は ref&link で分割 (DR-112 §10)

これらで各方式が表現できるか:

- **方式 1 (複製) 混在型**: `global: true` の宣言層寄与がサブコマンドスコープの options 列に混在される。**表現可能**
- **方式 1 (複製) 独立ブロック型**: global 由来の要素を専用グループ宣言エントリで包む (yarn/jj は事実上「見出しなしの独立ブロック」= グループ宣言エントリの title を「Options」と同名にする)。**表現可能だがレンダラの判断が要る**
- **方式 2 (省略)**: `hidden: true` を global 要素に付与すれば、レンダラの既定 policy (hidden は除外) で省略される。**表現可能**
- **方式 3 (参照)**: レンダラが global 由来要素を「値を出さず案内文だけ」表示する policy を持てば表現可能。**レンダラの範疇、素材側の追加不要**
- **方式 4 (専用セクション)**: global 由来要素を専用グループ宣言エントリに紐付ければ表現可能。ただし**「どの options が global 由来か」を model で判別できない**と、レンダラは「INHERITED FLAGS グループにどの要素を入れるか」を決められない → **不足**
- **メタ軸 A (深さ依存)**: レンダラが「呼び出し深さ」を見て global 表示を切り替える (= レンダラ policy)。素材側は現 kuu で十分。**表現可能 (レンダラ範疇)**
- **メタ軸 B (条件依存 az 式)**: 「特定コマンドの副作用属性で global 集合が動的に変わる」= コマンドの副作用 semantics は kuu spec の関心層外 (kuu は言語非依存 CLI 引数定義 spec、副作用は動作、引数定義はその宣言)。**射程外化 (「後回し」でなく「意識的に spec 対象外」)**

### 5. 表現力の不足点 — 1 語彙だけ追加すれば全表現可能

不足しているのは 1 点だけ:

**help model の options / commands entry に「由来 (origin)」を明示するフィールド**

現 DR-112 §3 の options entry には spellings / alias_spellings / value_name / display_name / help / help_long / help_group_name / default / env / required / multiple / hidden / deprecated しかない。「この entry が自前宣言か global 継承か inheritable 継承か alias 由来か」の識別素材が無い。

これがあれば:
- 方式 2 (省略): レンダラが「origin = global の entry を除外」policy
- 方式 3 (参照): レンダラが「origin = global の entry を案内文に集約」policy
- 方式 4 (専用セクション): レンダラが「origin = global の entry を独立見出し (`INHERITED FLAGS`) に束ねる」policy
- メタ軸 A (深さ依存): レンダラが「呼び出し深さ + origin」で表示切替 policy

全て**素材と policy 分離** (DR-112) の原則で表現可能になる。

## 実用的な示唆

### DR-112 §3 への追加提案

options entry と commands entry に `origin` フィールドを追加:

```json
"options": [
  {
    "spellings": ["--verbose", "-v"],
    "value_name": null,
    "help": "...",
    "origin": "local"  // ← 追加。値: "local" | {"kind": "global", "declared_at": ["<command_path>"]} | {"kind": "inheritable", "declared_at": [...]} | {"kind": "alias", "of": "<canonical_name>"}
  }
]
```

- 値 `"local"` は自前宣言 (省略時デフォルト = 冗長さ回避のため実装は "local" のみ省略可)
- `{"kind": "global", "declared_at": [...]}` は global installer による継承コピー。`declared_at` はどの祖先スコープで宣言されたかの path (レンダラが「どの階層で宣言されたか」を表示できる)
- `{"kind": "inheritable", ...}` は同型で inheritable (prefix 継承)
- `{"kind": "alias", "of": "port"}` は名前付き alias entry (現状 alias_spellings に併記されているが、独立 entry として現れるケースもあり得るため)

**素材と policy 分離の徹底**:

- kuu spec は origin を素材として提供するだけ
- 4 方式 (複製/省略/参照/専用セクション) + 深さ依存 の choice はすべてレンダラ policy
- kuu プロダクト標準の canonical レンダラ (層 2、DR-112 波及節「canonical レンダラ」で別 issue) が「gh 式 = 方式 4 = origin=global を INHERITED FLAGS に集約」を既定 policy として採用する等の判断は canonical レンダラ側

### v1 完備主義との整合 (kawaz 指示 2026-07-19)

- 「レンダラで解決」= 素材と policy 分離は v1 で意識的に選んだ設計 (DR-112 全体の骨格)。「後回し」ではない
- メタ軸 B (条件依存 az 式) は「コマンドの副作用属性で継承集合が変わる」= kuu spec の関心層外 (副作用 semantics は動作の話、spec は宣言の話)。**射程外化 = 意識的な spec 対象外**。「v1 では入れない」ではなく「v1 でも v2 でも入れない、az はそもそも kuu の spec が扱う面ではない」を明記する

### DR-042 (global installer) との整合

`origin` は「installer が宣言層に植えた寄与に元来含まれる情報」なので、global installer は自身が植えたコピーに `origin: {"kind": "global", "declared_at": [...]}` を付与するだけ。**新規機構でなく、既存 installer が持つ情報を model に露出するだけ**。実装コストは低い。

### 名称の検討

`origin` は英単語として自然だが、DR-112 の他語彙 (help_group_name / help_order / help_after / on_failure 等) と綴りの風味を揃えるなら `entry_origin` or `help_origin` も候補。ただし `origin` は kuu の他語彙と衝突しないため短くて良い。

## 検証の詳細

### 現 kuu で表現できないケース (前提: 追加語彙なしの状態)

以下の 3 fixture は現 DR-112 では pin できない:

1. **gh 式 (方式 4)**: root で `{"name": "verbose", "global": true, "long": true}` を宣言、`prog sub --help` を expect した時、`options[]` 内で `verbose` を「自前宣言と分離した専用セクション」に配置する model が組めない。レンダラが `INHERITED FLAGS` セクションを組もうにも、どの entry が global 由来かを判別できない
2. **kubectl 式 (方式 3、案内文だけ)**: レンダラは「global 由来 entry の値を出さず案内文だけ表示」policy を実現できない (判別素材なし)
3. **深さ依存 (uv 式)**: 深さ 2 では global を可視、深さ 3 では省略、を条件分岐できない (判別素材なし)

追加語彙 `origin` があれば 3 つとも表現可能になる。

### v1 スコープの確定 (「後回し」の禁則との整合)

- 追加語彙: `origin` 1 個 (options / commands entry の 1 フィールド)
- 実装コスト: 各 installer descriptor に「植える寄与に origin を付与」する 1 行、model 射影に 1 フィールド追加、fixture 追加
- 射程外化 (spec 対象外): メタ軸 B (条件依存 az 式) は spec 関心層外として明示

これで v1 で 4 方式 + メタ軸 A を全て表現可能、メタ軸 B は spec 対象外の意識的判断。**「後回し」なし**。

## 関連

- DR-112 §3 (help model schema — origin 追加対象)
- DR-042 (global installer — 寄与に origin 付与)
- DR-057 (alias — 名前付き alias の origin)
- DR-059 (inheritable — inheritable の origin)
- DR-058 (hidden — 個別非表示、方式 2 と組合せ)
- docs/findings/2026-07-17-cli-help-vocab-survey.md (12 系統ライブラリ、本 finding が global 継承 API 面を補完)
- docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md (実 CLI 20+ 表示調査、4 方式 + 2 メタ軸の観測源)
