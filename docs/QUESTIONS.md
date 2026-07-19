# 裁定待ち一覧 (kawaz 確認用)

> 運用: 統括 Claude が kawaz の裁定が必要な確認事項を提示するとき、チャット提示と同一タイミングで本ファイルを更新する。
> 裁定が下りたら該当セクションを削除し、裁定内容は本来の記録先 (DR / issue / journal / close_reason) に反映する。
> 本ファイルは常に「現在待ちの質問」だけを持つ (経緯・履歴は git log と各記録先が担う)。
> チャットでは「VF-Q 待ち」のようにラベルだけで参照する。回答はラベル + 選択肢記号 (例「VF-b で」) だけで通じる。
> 参照パスは本リポ (spec) 相対。kuu.mbt 側は「kuu.mbt の <path>」と表記する。

> HELP-Q バッチは全問完了し DR-112 として land 済み。TRI-Q バッチも全問裁定済み。HOME-T1 (レジストリ publish) も完了。
>
> **HIP-Q バッチ**: kuu.mbt の help query 実装 (kuu.mbt の `src/kuu/help.mbt` ほか、conformance 全 green) と実 CLI 調査 (`docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md`) で顕在化した設計論点。
>
> **2026-07-19 通読による整理**: 統括が DR-112 全文と fixtures/help/ 全 13 本と kuu.mbt 実装を通読した結果、旧 HIP-Q1〜Q7 のうち Q2/Q5/Q6/Q7 は DR-112 §2〜§3 の規範に既に答えがあり Q でなく実装追随 issue (kuu.mbt 側に起票)。Q3 は DR-112 §5-6 の drift 訂正 (原裁定 findings に無い後段追加を削除)。真の裁定案件は Q1 (表現力チェック) と Q4 (グループ hidden の座) の 2 個。

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
