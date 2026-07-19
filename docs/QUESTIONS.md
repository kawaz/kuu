# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチは全問完了し DR-112 として land 済み。TRI-Q バッチも全問裁定済み。HOME-T1 (レジストリ publish) も完了。
>
> **⚠ 2026-07-19 発覚した根本的 drift**: kawaz が DR-112 を初読し「意味わからん」と指摘。整理の結果、DR-112 の中心提案 (§1「help installer は存在しない、query に分解」) と wire 語彙の大量新設 (help_epilog / help_order / help_after 等) が **kawaz 個別 Q として裁定されていない worker 解釈拡大**である疑いが濃厚。help-plan (fable5-high) worker が起草し統括 (私) が逐条監査せず land させた結果。実装 (kuu.mbt / kuu-cli) は DR-112 全体を正本として完成しているため、撤回すれば実装コミット群 (424d6e08 / 8506fed5 / cd37433d / 7576ae0b / 5547f383) も再検討対象。まず **HIP-META-Q バッチ**で根本裁定を取り直す必要あり。HIP-Q バッチの個別議論は HIP-META-Q が確定してから再開。

## HIP-META-Q1: help_installer の要否

### kawaz 原発題 (2026-07-17)

> 「実装がない奴として help_installer が無くないですか？必要な機能やそれを実現するための語彙や展開方などの設計プランからまず立てる必要があるのでは」

これは **「help_installer の実装が無いことを指摘、必要な機能を設計せよ」と読むのが素直**。統括の再解釈でも「必要では」の指摘としか読めない。

### findings §2 での worker 中心提案 (原発題への worker 解釈)

```
## 2. 中心提案 — 「help installer」は installer ではなく query である
```

= worker (help-plan) が原発題を「そもそも installer は不要、query に分解する」と真逆に解釈した中心提案。**kawaz が個別 Q として承認していない** (HELP-Q1〜Q12 のどれにもこの命題の是非が立てられていない)。

### DR-112 §1 (現状の spec 記述)

DR-112 §1 は上記中心提案をそのまま spec 化。**kawaz 未承認の worker 解釈が spec に land した状態**。

### 選択肢

- **候補 a**: `help_installer が必要 (実装追加、DR-112 §1 撤回)`。kawaz 原発題の素直な読み。DR-112 §1 撤回 + help_installer の設計プランから立て直し + 実装コミット群のロールバック + 再設計。**推し (原発題の素直な読み)**
- 候補 b: `help_installer は不要、query に分解が正しい (DR-112 §1 を明示承認、実装維持)`。worker 解釈を kawaz が追認する形。合意されれば §1 は正式に承認された裁定になる
- 候補 c: 保留 (助言・追加情報要求)

## HIP-META-Q2: DR-112 で噴出した wire 語彙の逐条承認 or 撤回

### findings §5.3 の骨子

> 上の model は**既存の宣言語彙 (help / display_name / value_name / hidden / deprecated / alias / default / env / required / repeat / multiple / long / short / commands) だけから導出できる**。v1 で新設する要素属性は無し (`fail_action` の正式化は §4 で、これは表示でなく発火機構)。グループ化 (`help_group`) と長文分離 (`help_long`) は見送り候補 (HELP-Q3/Q4) — 追加互換な純表示メタなので、後から足しても既存定義・fixture を壊さない。

つまり findings は **「新規 wire 語彙は実質ゼロ」を骨子**として書いていた。

### 個別に kawaz が承認した語彙 (HELP-Q 裁定として明記あり)

- `help_long` (HELP-Q4=a、短長 2 本立て)
- `help_group_name` / `help_group_title` / `help_group_description` (HELP-Q3、グループ先頭宣言スタイル)
- `hidden: bool` (HELP-Q12=a、bool 1 本維持)
- `fail_action` → `on_failure` に改名 (HELP-Q1 相当 + kawaz 追補 2026-07-18)
- `type: "help"` / `"help_all"` / `"help_category"` (HELP-Q8/Q10 プリセット群)
- `values` (既存語彙 DR-055 の使用、新設ではない)

### DR-112 で追加された、kawaz 個別承認 signal が確認できない語彙

以下は DR-112 で worker が起草したが、findings 上で kawaz が個別に「入れる」と裁定した記録が確認できない:

- **`help_epilog`**: DR-112 §4 「セクション拡張席は survey で普遍的、v1 は末尾テキスト 1 本に絞る」 = worker 判断で 1 本を選定。findings §5.2 素案には無し
- **`help_order`** (number): DR-112 §6 で「表示順の明示指定」を導入。findings §5.3 は「新規語彙ゼロ」骨子と衝突
- **`help_group_order`** (number): 同上
- **`help_after`** (string): DR-112 §6 で相対配置を導入。findings §5.3 と衝突
- **`display_name`**: DR-112 §3 の options entry に登場。survey で普遍的だが kawaz 個別承認 signal 不明
- **`value_name`**: 既存語彙 (DESIGN §11 等) との整合は取れているが、DR-112 で help model 側に露出したのは worker 判断
- **`help_on_failure`** (bool、既定 true): DR-112 §8 で type:help プリセットが同梱する糖衣。kawaz 追補 (「type config で on_failure へ全展開」) は findings に signal あり、糖衣名は worker 判断

### 選択肢

- **候補 a**: 逐条承認する (現 DR-112 のまま、上記追加語彙すべてを spec 語彙として維持)。承認 signal を後付けで揃える
- 候補 b: findings §5.3 の骨子に戻す (help_long / help_group_* / hidden / fail_action → on_failure だけを承認、残り (help_epilog / help_order / help_group_order / help_after / display_name / help_on_failure) は撤回して v1 で持たない or 追加互換の予備席)。**「見送り候補」を worker が独断で採用した部分を戻す**
- 候補 c: 個別に逐条判定 (この語彙は要る、あの語彙は要らない、と 6 語彙を 1 つずつ裁定) — 手間はかかるが最も正確

### 推し

**候補 c (逐条判定)** — findings 骨子への忠実さと現 DR-112 の完成度のバランス。統括の暫定推し: help_epilog (survey 普遍性から採用 = a)、display_name (同 = a)、value_name (既存 = a)、help_on_failure (糖衣として自然 = a)、help_order / help_group_order / help_after / (裁定文言なしのため b 撤回、v1 では明示順序制御を持たず宣言順のみ)。**ただし推しはあくまで統括の暫定であり、逐条は kawaz の判断次第**。

## HIP-META-Q3: DR-112 の他の記述の中で kawaz 未承認と疑われる部分

### 記述

- §2 の「depth?: "scope" | "all"」の 2 値 = 中間の数値 depth は不採用。findings HELP-Q5 で「1 層 + 全層」の 2 段は裁定あり (`b: 全層再帰、depth 語彙で拡張可能に`) だが、数値未採用は worker 判断
- §3 の「positionals」フィールドと usage の has_options / has_positionals / has_dd の形式 = findings §5.2 素案から具体化された worker 提案
- §3 の「entries の順序は宣言順を並べ替え規則適用後に保存する」= worker 提案 (findings §5.3 で「宣言順」原則は kawaz 裁定 HELP-Q3 で明記あるが、model 内での順序保存規範は worker 起草)
- §3 の「spellings / alias_spellings」フィールド名 = worker 起草の名称。kawaz 承認 signal 不明
- §3 の「command_path」の起点規則 = worker 起草
- §7 の「type:help_category の内部 string 全体セル + or での bool 枝 / string 枝出し分け」= HELP-Q10 で kawaz 裁定 (「値スロットでなく型化」) の signal あるが、内部構造の詳細は worker 起草
- §9 の「help_meta installer」新設 = findings では所有座席の議論があるが、`help_meta` という installer 名は worker 起草
- §10 の hidden 面別分割 = HELP-Q12 で kawaz 裁定 signal あり (「ref & link で分割」)
- §11 の「5 プロファイル green を v1 発行条件」= HELP-Q7 で kawaz 裁定 signal あり (「a: 5 プロファイルにする」)

### 選択肢

- 候補 a: 上記の worker 起草部分をすべて明示承認 (現 DR-112 のまま)
- 候補 b: 逐条確認して裁定 signal を取り直す
- 候補 c: HIP-META-Q1 と Q2 の結果次第で判断 (Q1=b なら DR 全体維持で Q3 は a、Q1=a なら Q3 も逐条見直し)

### 統括判断

**HIP-META-Q1 と Q2 が確定してから議論を再開する** ことを推す。

## 個別自主修正

- **`remote add` の下に `run` の例示 (DR-112 §3)**: 意味不明な例、`run` を `mirror` 等の自然な例に修正 (自主修正、裁定不要)
- **options entry の `group` オブジェクト**: 「help model 側の射影形式で AST/wire に侵入しない」= confirm。DR-112 §5-7 の記述で「グループ宣言エントリは options 列に `{"group": {"name", "title", "description"}}` entry として載る」と help model の射影形として明示済み。AST/wire の実 entry 属性は `help_group_name` / `help_group_title` / `help_group_description` の 3 属性で、model 側の `{"group": {...}}` 形は help query が組む射影形

## 統括からの回答 (kawaz 質問 2026-07-19 mid=11)

### 回答 A: help model = 「あるスコープで help が呼ばれた後、レンダリング前のモデル」の理解 confirm

**その理解で正しい**。DR-112 §2 の help query は「wire form (宣言層)」を入力、「help model」を出力する純関数。model は文言・整形・並べ替えを含まない**素材**であり、レンダラ (kuu プロダクトの canonical レンダラ = 別 issue、kuu-cli 自身の `--help` 相当、あるいはアプリ側の独自レンダラ) が文字列に組む。

### 回答 B: options entry の `spellings` は AST/wire でなく help model 専用の用語

**その理解で正しい**。AST/wire form 側の宣言は `long: true` / `short: "p"` / `env: "PORT"` 等の従来通り。help query が model を組む時に、これらの入口を集約して `spellings: ["--port", "-p"]` の 1 配列に射影する。help model 側で「1 entry に対する全入口綴りの列」として扱うのが素直だから (レンダラは entry を 1 行として組みたいので入口を 1 まとめにする必要がある)。

### 回答 C: 複数引数 option (`--color r g b`, `--tag key value`) の表現 — **私は正確に把握できていない、要調査**

現 kuu spec で「1 個の option が複数の別引数を消費する形式」は、DESIGN.md §6 (multiple) / DR-034 / arity 駆動 (DESIGN.md l.270) の記述はあるが、`--color r g b` 相当の「1 option 直後に 3 個の値」の宣言 API がどう書かれるかは統括の把握内で完全でない。spec 側で:

- (i) option `color` + positional 3 個の seq 構造 (`{"seq": [{"name": "color", ...}, {"name": "r", ...}, ...]}`) で表現
- (ii) option value に multiple: `{separator: " ", collector: ...}` 相当を持たせ空白区切りで消費
- (iii) 独自 arity 属性が既に存在
- (iv) いずれの機構でも自然に書けず、追加設計が必要

のどれが該当するか、統括が spec を精査してから答える。**現状: kawaz の指摘を「重要な確認質問」として認識、DR-112 §3 の options entry の `spellings` (綴りの列) + `value_name` (値名 1 個) の schema がこの類の option を素材化できているか、model の schema 側で `value_names` (複数) が必要ではないかも合わせて確認する**。

このため HIP-META-Q4 として立てる (下記):

## HIP-META-Q4: 複数引数 option の help model 表現

`--color r g b` (positional 3 個消費) / `--tag key value` (2 個消費) / `--point x,y,z` (kv 型分解) 等、1 option が複数値を消費する形式が、現 kuu spec (DESIGN.md §6 の multiple / seq 構造 / arity 駆動) でどう宣言され、help model にどう射影されるか。DR-112 §3 の options entry は `value_name` 1 個しか持たないため、素材として不足の疑いあり。

- **候補 a**: 現 kuu spec で表現可能。help model 側は `value_name` を `value_names: []` に変更 (or 追加) して素材化。統括の要精査
- 候補 b: 現 kuu spec でそもそも複数引数 option が自然に書けない → 追加設計が要る (spec 側の arity/multi-slot 語彙追加)
- 候補 c: 保留 (統括の精査完了まで)

### 回答 D: `epilog` は変な略称ではない、実 CLI パーサで確立した用語

- **`epilog`** は英単語 (Ancient Greek `epílogos` 由来、`prologue` の対義語で「終章、結び」の意)。「略称」ではなく普通の英単語
- **実 CLI パーサでの実績**: argparse (`ArgumentParser(epilog="...")`)、click (`@click.command(epilog="...")`)、typer (`typer.Typer(epilog="...")`)、Commander.js (`.addHelpText('after', ...)`)、yargs (`.epilog("...")`) と広く採用。survey (`docs/findings/2026-07-17-cli-help-vocab-survey.md`) の統合サマリ 5 で「セクション拡張は普遍的、その中で過半数が持つのは末尾テキスト (argparse / click / typer / commander / yargs の epilog)」と裏取り済み

### 回答 E: グループ使うのにオプション 1 個の例では効果が見えない、完全版例が欲しい

DR-112 §3 の例は 1 option 1 group で確かに効果が見えない。完全版例 (グループ 2〜3 個 × グループ内 option 3〜4 個) を **DR-112 §5「例 (グループ先頭宣言スタイルのショールーム)」** に追記する自主修正案:

```json
{
  "commands": [{
    "name": "remote",
    "commands": [{
      "name": "add",
      "options": [
        {"help_group_name": "conn", "help_group_title": "Connection", "help_group_description": "..."},
        {"name": "url", "type": "string", "positional": true, "required": true, "help_group_name": "conn"},
        {"name": "port", "type": "number", "long": true, "short": "p", "default": 22, "help_group_name": "conn"},
        {"name": "timeout", "type": "duration", "long": true, "default": "30s", "help_group_name": "conn"},
        {"help_group_name": "auth", "help_group_title": "Authentication", "help_group_description": "..."},
        {"name": "user", "type": "string", "long": true, "short": "u", "help_group_name": "auth"},
        {"name": "identity", "type": "path", "long": true, "short": "i", "help_group_name": "auth"},
        {"help_group_name": "meta", "help_group_title": "Metadata"},
        {"name": "tags", "type": "string", "long": true, "multiple": "append", "help_group_name": "meta"}
      ]
    }]
  }]
}
```

↑ この完全版例を DR-112 §5 に追記 (裁定不要の質改善)。help model に射影されると: `Connection:` セクション → url, port, timeout の 3 entries / `Authentication:` セクション → user, identity の 2 entries / `Metadata:` セクション → tags の 1 entry、という 3 グループ構造がレンダラで組まれる。

### 回答 F: help に version 出す設計 + パーサ外から binding を渡す仕組み

**他 CLI パーサでの実装**:

- **clap (Rust)**: `Command::version("1.0.0")` で parser 側が version 文字列を保持。`--help` 出力の usage 直後に自動包含。help template 変数 `{version}` として参照可能
- **cobra (Go)**: `Command.Version = "1.0.0"` フィールド。`{{.Version}}` template 変数として help/usage template で参照可能。`--version` flag も自動追加
- **argparse (Python)**: `parser.add_argument('--version', action='version', version='%(prog)s 1.0')` で version action。help 内に自動包含する仕組みはなく、description に手動埋込か custom formatter
- **Commander.js (Node)**: `.version('1.0.0')` は `--version` flag 出力のみ。help template に含める仕組みはない
- **picocli (Java)**: `@Command(version = "prog 1.0.0", mixinStandardHelpOptions = true)` で `--version` と help 内 version 表示両方
- **yargs (Node)**: `.version()` は `--version` 出力のみ

**パーサ外から binding を渡してテンプレで使う仕組み — 設計としてありうる**:

cobra の `{{.Version}}` template 変数がこのパターン。パーサは「値の名前と型」を宣言 (`Version string` field)、値はパーサ外 (アプリ) から供給、help template が変数として使う。

**kuu での可能性**:

現 DR-112 §10「version はアプリ責務、AST にバージョン文字列は持たせない (DESIGN §14.2 不変)」= parser 側で version を持たない設計。ただし kawaz の提案する「パーサ外から binding を渡してテンプレで使う」は spec の射程外 (レンダラ層) で表現可能:

- kuu プロダクトの canonical レンダラ (層 2、DR-112 波及節「canonical レンダラ = 別 issue」) が binding 引数を受け取る API 設計にすればよい
- 例: `kuu-cli help <definition.json> --binding version=1.0.0 --binding build_date=2026-07-19` で、レンダラが `{version}` / `{build_date}` を description / epilog 内に埋め込む
- spec 側 (DR-112) の関心層外だが、レンダラ層の設計として自然
- version 以外にも build_hash / license / homepage_url / contact 等の binding を渡せる汎用機構になる

これは DR-112 の射程外なので裁定不要。canonical レンダラ設計 issue で扱う (レンダラ層の設計事項として承認 signal あり)。

## HIP-Q1: help model entry に `origin` フィールドを追加するか

### 背景説明

実 CLI 調査 (`docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md`) + CLI パーサライブラリ調査の統合 (`docs/findings/2026-07-19-kuu-help-display-expressibility-check.md`) で判明:

- 実 CLI は global option の表示に **4 方式併存** (複製 cargo / 省略 rustup など / 参照 kubectl / 専用セクション gh) + 2 メタ軸 (深さ依存 uv / 条件依存 az)
- 12 系統ライブラリ (clap / cobra / argparse / picocli / Swift AP / kong 等) は「継承先 help での表示」を「自動表示」派と「制御 API」派に分岐、過半数が個別 hidden + 見出しカスタム API を持つ
- **現 kuu (DR-112 + DR-042) で不足しているのは 1 点だけ**: help model の options / commands entry に「由来 (origin)」を明示する素材が無い。gh 式 (方式 4)・kubectl 式 (方式 3)・uv 式 (メタ軸 A) のいずれも「レンダラが origin を見て policy 分岐する」ことで実現できるが、その素材が model に無い

### 論点

DR-112 §3 の options / commands entry に `origin` フィールドを追加するか:

```json
"options": [
  {
    "spellings": ["--verbose", "-v"],
    "help": "...",
    "origin": "local"  // 値: "local" | {"kind": "global", "declared_at": [<command_path>]}
                       //     | {"kind": "inheritable", "declared_at": [...]} | {"kind": "alias", "of": "<canonical>"}
  }
]
```

これがあれば:
- 4 方式全てをレンダラ policy で実現 (素材と policy 分離の徹底、DR-112 骨格と整合)
- メタ軸 A (深さ依存) はレンダラが呼び出し深さ + origin で表示切替 (素材追加不要)
- メタ軸 B (条件依存 az 式) は「コマンドの副作用 semantics」= kuu spec の関心層外として**射程外化** (「後回し」でなく意識的な spec 対象外)

### 選択肢

- **候補 a (推し)**: `origin` フィールドを DR-112 §3 に追加。global installer / inheritable installer / alias 機構が寄与に origin を付与し、help query が model に露出。v1 で 4 方式 + メタ軸 A の全表現力を持たせる。メタ軸 B は明示射程外化 (spec 関心層外の明記)
- 候補 b: origin を追加せず、方式 4 (専用セクション) を諦める。実 CLI で gh 式が確実に存在する事実に対して kuu が表現不能を許容する
- 候補 c: 保留

### 詳細分析

`docs/findings/2026-07-19-kuu-help-display-expressibility-check.md` に全論点の展開あり (12 系統ライブラリ API 整理、現 kuu 表現力チェック、追加提案の詳細、v1 完備主義との整合、DR-042 への影響)。

### 参照

- DR-112 §3 (help model schema — origin 追加対象) / §2 (読む層) / §5 (グループ宣言エントリ)
- DR-042 (global installer) / DR-057 (alias) / DR-059 (inheritable)
- docs/findings/2026-07-19-kuu-help-display-expressibility-check.md (本 Q の詳細分析)
- docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md (4 方式 + 2 メタ軸の観測源)
- docs/findings/2026-07-17-cli-help-vocab-survey.md (12 系統ライブラリ基礎資料)

## HIP-Q3-drift: DR-112 §5-6-6 の「同一設定は冪等」削除 (原裁定への訂正)

### 背景説明

DR-112 §5-6-6 の記述:

> 同じグループ名に対する別設定の重複宣言は definition-error (kind: `invalid-range` — 構文上書けるが構成として不成立、DR-082 §2 の既存分類)。**同一設定の再宣言は冪等で合法**。

後半 (太字部分) は kawaz 原裁定 findings (`docs/findings/2026-07-17-help-mechanism-design-plan.md` の HELP-Q3 裁定原文、2026-07-18 更新) には無い後段追加。原文は「(5) 同じグループ名に対する**別設定の重複宣言は definition-error**」だけを書いており、「同一設定なら冪等」は誰か (DR-112 起草時または help-plan worker) が「別設定以外 = 同一設定 = OK」と字面から読み拡張した drift。fixture `fixtures/help/def-error-group-duplicate.json` の why 節が「同一設定の再宣言は冪等で合法 (DR-112 §5) だが、冪等時の model 射影は DR-112 未規定のため本初期セットでは pin しない」と自己申告 = **fixture 起草者自身が未確定領域と明示**。

kawaz 発題 (2026-07-19):「同名グループはスコープに 1 つでは?」= 原裁定の意図と整合し、「同一設定なら冪等」の後段拡張は原意図と乖離した drift の可能性が高い。

### 選択肢

- **候補 a (推し)**: DR-112 §5-6-6 後半「同一設定の再宣言は冪等で合法」を削除。同名グループの重複宣言は**別設定でも同一設定でも definition-error** (kind: `invalid-range`)。理由:
  - 原裁定 findings と整合
  - fixture 起草者が「未 pin」と自己申告 = 誰も pin していない
  - 「同一設定でも重複を書ける必要がある」実 kuu ユースケースが提示されていない
  - a を採用すると射影方式 (旧 HIP-Q3) の議論自体が消え、仕様が単純化
  - フォローアップ実装は「kuu.mbt の `collect_help_meta_errors` を『食い違う設定のみ error → 無条件 error』に強化」の 1 件のみ、fixture def-error-group-duplicate に「同一設定重複」ケースを追加
- 候補 b: 現 DR-112 のまま維持 (別設定 = error / 同一設定 = 冪等)。射影方式は「宣言数だけ保持」で pin (実装採用形の追認)。**「同一設定でも重複を書けると嬉しい実 kuu ユースケース」の提示が要る**
- 候補 c: 保留

### 参照

- DR-112 §5-6 (削除候補の記述)
- docs/findings/2026-07-17-help-mechanism-design-plan.md (HELP-Q3 裁定原文、原意図の物証)
- fixtures/help/def-error-group-duplicate.json (「本初期セットでは pin しない」の自己申告)

## HIP-Q4: グループ宣言エントリに `hidden` 属性を持たせるか

### 背景説明

DR-112 §5 のグループ宣言エントリ (`{"help_group_name": "net", "help_group_title": "...", "help_group_description": "..."}`) の許容属性は `help_group_name` / `help_group_title` / `help_group_description` / `help_group_order` の 4 種のみ。`hidden` は明示的に許容も禁止もされていない (仕様が言及していない、実装は Malformed で reject)。

DR-112 §10 の hidden 全体方針:

> `hidden: bool` 1 本を維持。面別 hidden 語彙 (`hidden: ["help"]` 等) は導入しない。clap の「-h では隠すが --help では出す」相当の非対称が欲しい場合は、**ref & link で分割定義**すれば良い

実 CLI 調査で「グループ丸ごと隠す」の実例は cargo `-Z` の 1 件のみ (かつ「完全非表示」でなく「入口 1 行 + 別コマンドで詳細」の二段階可視性)。az は「条件依存で global 集合が変わる」があるが hidden とは別軸。

### 選択肢

- **候補 a (推し)**: グループ宣言エントリに `hidden` 属性を**持たせない**。理由:
  - DR-112 §10 の「面別 hidden 語彙は導入しない、既存機構 (ref&link) で表現」哲学と整合
  - 「グループ丸ごと隠す」は「メンバー全 hidden」で表現可能 (追加語彙不要)
  - cargo `-Z` の二段階可視性は「グループ hidden」でなく「入口専用要素 + 別コマンドで詳細」の設計で、kuu では既存の type:help_category + カテゴリ別入口で同型が組める
  - 実装は現状 (Malformed で reject) のまま、fixture を追加して「hidden は書けない」を pin
- 候補 b: グループ宣言エントリに `hidden: bool` 属性を追加。cargo `-Z` 型「グループ全体を通常 help から除外」を語彙 1 つで表現。ただし「入口だけ露出 + 詳細は別」の二段階は 1 bool では表現不能で、単純化しすぎ
- 候補 c: 保留

### 参照

- DR-112 §5 (グループ宣言エントリの許容属性列挙) / §10 (hidden の全体方針)
- docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md (cargo `-Z` 唯一例、他ツールは対応パターン持たず)

---

## 統括作業 (裁定不要、実行タスク)

以下は本ファイル外で進める:

1. **DR-112 §5-6-6 後半削除** (HIP-Q3-drift = a なら): spec patch
2. **kuu.mbt 実装追随 issue** 4 件を kuu.mbt の docs/issue/ に起票:
   - depth:"all" 再帰実装 (旧 Q2、DR-112 §3 の scope 再帰埋め込みを実装)
   - alias entry の canonical 併記実装 (旧 Q5、alias 独立 entry でなく alias_spellings 併記)
   - variant spelling の宣言順保存 (旧 Q6、long 属性の宣言順そのまま)
   - command entry の aliases/hidden/deprecated 実装 (旧 Q7、ハードコード解消)
3. **task #4 (kuu の表現力チェック & ギャップ提案)** を統括が実施 → HIP-Q1 の推しを確定
