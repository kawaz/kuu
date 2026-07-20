# DR-115: canonical help レンダラ — help_render 席・骨格テンプレ・既定 policy

> 由来: `docs/issue/2026-07-18-help-renderer-design.md` (kawaz 発題 2026-07-18) と REND-Q1〜Q7 裁定 (kawaz 2026-07-21、`docs/QUESTIONS.md` REND バッチ)。下敷きは `docs/findings/2026-07-21-help-renderer-design-plan.md`。本 DR は DR-113 (help model) と DR-114 (universal fn) を前提とし、DR-113 §8.1 を一部 update する。

## 決定

### 1. レンダラ指示語彙は `help_render` 席の 3 段 override (REND-Q1 = a)

レンダラへの表示様式指示は次の 3 段で与え、後段が前段を上書きする。

```
wire の一括席 (command 要素の help_render 属性)   … 定義者の既定
  ← wire の個別席 (entry 単位の help_xx 属性)      … 要素単位の上書き
    ← レンダラ API の style 引数                    … アプリ実行時の上書き
```

#### 1.1 一括席 `help_render`

- ルート definition と command 要素に置くオブジェクト属性。キーは §2 / §5 の `template` / `value_structure_style` / `types_style` / `origin_style`
- 階層継承はキー単位: 子 command は親の実効値を継承し、書いたキーだけ上書きする (DR-014 の config 継承と同じ機構)
- **`config` とは別席に立てる**。`config` はパース方言 (受理挙動に影響) の席であり、`help_render` は inert 表示メタ (パース挙動に影響しない、DR-113 §1「宣言層に inert 属性として残り、lowered 産物や評価器へ運ばない」)。位相の違う語彙を同じ席に混ぜない
- 所有は help_installer。回収語彙 (DR-113 §1) に `help_render` を追加し、unknown-vocab 正当化・definition-time 検査 (enum 値域の invalid-range、§2.4 の template 構文検査) を既存責務に載せる
- command でも ルート definition でもない要素への `help_render` は definition-error `invalid-range`

#### 1.2 個別席

v1 で追加する entry 個別席は `help_value_structure_style` の 1 語彙のみ (値は §5.1 の enum と同じ)。当該 entry の value_structure 表記だけを一括席の実効値から上書きする。値空間を持たない entry への付与は vacuous だが合法 (required の vacuous 前例、DR-047/DR-093 と同じ扱いで lint の領分)。

#### 1.3 レンダラ API

canonical レンダラの概念シグネチャ (言語側 API の規範化ではなく、3 段目の存在の確定):

```
render_help(model, {
  program_name?: string,          // DR-113 §4.4 の呼び出し側供給
  category_mode?, show_hidden?,   // 表示要求 (DR-113 §2 の写像、実行のたびに変わる)
  bindings?: {name: value, ...},  // §3 の binding 補間
  style?: {...}                   // 表示様式の上書き (§1.1 のキーと同じ語彙)
}) → text
```

`style` の中身・部品関数やセクション関数の差し替え (closure) は各言語レンダラ実装の API 設計に完全委任する (spec は関与も禁止もしない)。

#### 1.4 model への射影

一括席の実効値 (階層継承の適用後) を help model のトップレベル席 `render` に射影する。entry 個別席は当該 entry に `value_structure_style` として射影する。hidden が model に載って除外はレンダラ policy、と同じ構図 — 様式指定も「定義者の意図」という素材であり、model だけを受け取った独立レンダラが同じ指示に従える。wire 受理 → model 射影の搬送だけが conformance の検証対象で、レンダラがそれにどう従ったかは検証しない (§6)。

### 2. セクション骨格はプレースホルダ文字列テンプレで指定する (REND-Q2 = b)

`help_render.template` (string) がセクション骨格を指定する。kawaz 裁定の根拠は移行需要 — 既存 CLI の help 出力をバイトレベルで再現したい場合、セクションの並べ替え・省略 (識別子配列で足りる範囲) ではなくセクション**間**のバイト列そのものの制御が要る。テンプレはプレースホルダの間に書かれた文字を一切加工せずそのまま出すことで、この制御を definer に渡す。

テンプレ言語の沼 (タグ改廃・条件分岐・エスケープが際限なく仕様論点化する危険) は、以下の境界で b の枠内に封じる。

#### 2.1 文法 — 置換とエスケープのみ

- プレースホルダは `{識別子}` の 1 形式のみ。識別子は snake_case (`[a-z][a-z0-9_]*`、DR-022 の系)
- `{{` は literal `{` のエスケープ。単独の `}` は literal
- **制御構造・条件分岐・ループ・フィルタ・書式指定 (`{name:>10}` 等) は持たない**。将来の拡張要求 (「空セクションのとき行ごと消したい」等の条件分岐系) は本 DR の境界により reject する — この前提を本文で固定する (clap の轍: タグ文法は一度開くと拡張要求が際限なく続く)

#### 2.2 セクション識別子は閉集合 8 種

`usage` / `description` / `description_long` / `epilog` / `commands` / `options` / `positionals` / `types`。

- help model のトップレベルキー**由来** (発明ゼロの命名) だが、**機械的同一視はしない**。`command_path` / `help_entry` / `render` 等の非セクションキーは識別子ではなく、将来 model にキーが増えても自動的にテンプレ語彙にはならない。閉集合の改定は DR を要する
- 閉集合に一致しない識別子は binding 参照 (§3) として render 時に解決する。binding は open set なので、識別子名の definition-time 検証はしない (typo が silent に literal 残置される点は lint の領分)

#### 2.3 適用意味論 (canonical)

- 逐次置換。セクションプレースホルダは canonical レンダラが当該セクションを組んだテキスト (見出し込み) に置き換わる。空のセクションは空文字列に置き換わり、**周辺の空白・改行の自動整形はしない** (テンプレのバイトは definer の責任)
- セクション見出しの文言はセクション内部の一部であり canonical / 言語側 closure の管掌 — テンプレの域外とする (見出し用プレースホルダの追加要求への防波堤)
- `{options}` は origin_style (§5.3) 適用後の options 領域全体 (separate_section なら継承セクション込み)。継承セクションだけを別位置に置く分割はテンプレでは表現できない — 言語側 closure の領分
- **template 不在時の canonical 既定骨格 (セクション順・空セクションと見出しの省略判断) はレンダラ内蔵の挙動であり、テンプレでは表現しない**。条件分岐を持たないテンプレでは「空なら見出しごと省略」が書けないため、既定骨格をテンプレに還元する設計は採らない。テンプレ供給 = definer が骨格を引き取り、空セクションのギャップを含めて自分で管理する、というトレードオフを受容する

#### 2.4 definition-time 検査

template 文字列は help_installer が定義時に構文検査する: 未閉の `{`・空の `{}`・識別子規則に合わない中身は definition-error `invalid-range`。template は definer が能動的に書く構造指示なので strict に倒す (文言位置 §3 の寛容と非対称)。

### 3. 文言内の binding 補間は `{name}` 変数参照のみ (REND-Q3 = a)

- `help` / `help_long` / `help_epilog` の文字列中の `{識別子}` は binding 参照。**文言位置ではセクション展開は起きない** (§2.2 の閉集合はテンプレ位置専用)
- 文法はテンプレと同じ最小形: `{{` エスケープ、制御構造なし。「変数参照 1 機能だけの最小テンプレ」と「テンプレ言語」の境界をここで確定し、拡張議論を閉じる
- 文言位置は寛容: 識別子規則に合わない brace 列 (`{a,b}` 等) は literal として素通しし、definition-time 検査をしない。散文には `{` が普通に現れるため
- binding の供給はレンダラ API の `bindings` 引数。kuu-cli では `kuu help ... --binding name=value` に写る。`program_name` はレンダラ API の同名引数から暗黙 binding として供給する (明示 `bindings` の同名指定が優先)
- model は version 文字列を持たない原則 (DR-113 §4.4) は不変 — version は binding として model の外からレンダラに入る
- 補間は表示時。model の文言フィールドには `{name}` が生のまま残り、レンダラを通さない consumer には生で見える (「文言はレンダラの関心」の帰結として許容)
- 未解決 binding は canonical レンダラでは literal のまま残す (definer が typo に気づける)。独自レンダラの挙動は非規範

### 4. グループ宣言 entry の hidden (REND-Q4 = b、DR-113 §8.1 update)

- **wire**: グループ宣言 entry (DR-113 §8.1) に `hidden: bool` を許可する。§8.1 の「グループ属性だけを持つ」は「グループ属性と `hidden` だけを持つ」に改訂する
- **model**: group entry に sibling として射影する — `{"group": {"name", "title", "description"}, "hidden": true}`。通常 entry と同じく素材フィルタはしない (除外はレンダラ policy、DR-113 §4.4 の hidden 構図)
- **canonical の意味論** (category_mode との接続):
  - `"default"`: hidden group の所属 entry を省略し、グループ名の入口注記だけ残す (cargo `-Z` 型「グループ丸ごと隠して入口だけ露出」の受け皿)。注記の文言は非規範
  - `"all"`: hidden group も所属 entry 込みで表示する
  - `{"named": name}`: hidden group への名指しは明示要求なので表示する
- **hidden group × hidden entry の交差**: hidden group の所属 entry は entry 側の hidden を問わず全て省略する (group hidden が優先、「入口注記だけ残す」の逐語どおり)。`show_hidden` は entry 単位の hidden 判定にのみ関与し、group hidden の判定には関与しない — したがって default + show_hidden でも hidden group の所属 entry は出ず、入口注記のままである。非 hidden group / group 無所属の hidden entry だけが show_hidden で現れる
- 所属の復元: レンダラは各 entry の `help_group_name` を group entry の `group.name` に突き合わせて所属を判定する (model はフラット列のまま、DR-113 §8.1 の構造を変えない)
- これにより `help_all_category` は canonical レンダラで vacuous でなくなる (default/all の差分が生まれる)

### 5. canonical 既定 policy (REND-Q5 = a / REND-Q6 = b)

一括席の enum 語彙とその canonical 既定値。enum 値の受理・搬送は規範 (§6)、既定値と各値の表記実装は canonical レンダラの挙動 (非規範) だが、宣言の正本として本 DR に置く。

#### 5.1 `value_structure_style`: `"auto"` (既定) / `"inline"` / `"detail"`

- `"auto"`: tree の複雑度で切替。葉が single のみの単純 or は 1 行明示括弧 `<COLOR_NAME | <R G B>>` (各分岐を `<...>` で括り precedence を表記に反映、pipe の 2 読み曖昧を排除)。seq / repeat のネスト混在は詳細説明形式 (option 行の下に VALUE の枝を列挙)
- `"inline"`: 常に 1 行。`"detail"`: 常に詳細説明形式

#### 5.2 `types_style`: `"auto"` (既定) / `"aggregate"` / `"inline"`

- `"auto"`: `used_as` の参照回数 ≥ 2 の共有型は usage 行を value_name 短縮表記にし、`{types}` セクションで詳細展開。参照回数 1 は inline 展開して types に載せない
- `"aggregate"`: type_ref は常に types へ。`"inline"`: 常に inline 展開 (types セクションは空)

#### 5.3 `origin_style`: `"merge"` / `"separate_section"` (既定) / `"reference"` / `"omit"`

- 既定 = `"separate_section"` (gh の INHERITED FLAGS 型、実機確認済み: gh pr list / cargo = merge / kubectl = reference)。4 方式で唯一「継承であることの明示」と「値の表示」を両立し、origin を model に載せた設計判断 (DR-113 §4.3) の価値が既定で現れる
- `"merge"` = 由来を出さず混在 (cargo 型)、`"reference"` = 案内文のみ (kubectl 型)、`"omit"` = 出さない

### 6. spec 関与範囲 — 受理・搬送・射影まで、適用後バイト列は非規範

#### 6.1 conformance 対象

- wire 受理と well-formedness: `help_render` の席位置・キー・enum 値域、template の構文 (§2.4)、entry `help_value_structure_style`、グループ宣言 entry の `hidden`
- definition-error: 席違い・enum 値域外・template 構文不正の `invalid-range`
- model 射影: `render` 席 (継承適用後の実効値)、entry 上書き、group hidden の搬送

既存の help / definition_error profile に fixture を足す形で、新 profile は設けない。

#### 6.2 非規範

テンプレ適用後のバイト列、セクション内部の組版、入口注記の文言、未解決 binding の挙動、template 不在時の既定骨格順。canonical レンダラの出力は fixture pin しない (docopt の轍の回避を出力側にも貫く、DR-109 §1 柱 4)。

#### 6.3 移行需要 (バイトレベル再現) との整理

出力非 pin の原則と Q2 = b の決め手 (バイトレベル移行需要) は次の分担で両立する:

- **プレースホルダ間のバイト**はテンプレが definer に完全制御を渡す (§2.3 で自動整形をしないのはこのため)。テンプレの置換規則 (§2.1〜2.3) は wire 語彙の意味なので規範として本 DR が確定する — ただし conformance fixture では検証しない
- **セクション内部のバイト**は canonical 部品の安定性が担う。品質担保は kuu.mbt / kuu-cli 側の product テスト (golden テスト、spec 外) に置く
- 完全なバイト制御が要る移行は言語側のセクション関数 / 部品関数差し替え (closure) で行う — wire テンプレ = 移植可能な骨格制御、closure = 全制御、の 2 段
- **render conformance profile は v1 では設けない**。canonical 実装間 (言語間) の出力 drift が実際の移行事例で問題化した場合のみ再検討する。この割り切りを明記しないと「render プロファイルを足せ」の議論が再燃するため、本節を再燃時の参照先とする

#### 6.4 exit class ガイドライン (推奨、非規範)

DR-109 §1 柱 4 の policy 推奨に従い、help / version 表示は exit 0、usage error は exit 2 級を canonical レンダラ利用側の推奨とする。spec の規範 (受理・搬送) には触れない。

### 7. completion 生成器の表示 policy は本 DR の射程から除外する (REND-Q7 = a)

テンプレ層の語彙 (セクション骨格) は shell 補完表示に流用できず (表示の自由度が shell 側機能に律速され、セクション概念が無い)、候補順序の受け皿として `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` が既にある。生成器の既定表示 policy (候補説明・deprecated マーカー) は同 issue に統合して扱う。

## 採用しなかった案

### セクション識別子の配列 (`sections`、picocli sectionKeys 型)

findings の推し (REND-Q2 案 a) だったが不採用。kawaz 裁定 (2026-07-21): 移行需要 — 大きなプロダクトの移行では help 出力をバイトレベルで変えたくない場合があり、識別子配列 (並べ替え・省略) ではセクション間のバイト列を制御できない。テンプレは配列の表現力 (並べ替え = プレースホルダの順、省略 = 書かない) を包含する。

### テンプレへの制御構造 (条件分岐・ループ・書式指定)

タグ文法・条件分岐・エスケープがそれぞれ独立の仕様論点になる沼 (clap 自身 `{bin}` 非推奨化などタグ改廃を経験)。空セクションのギャップというコストを受容し、既定骨格の賢い省略はテンプレ外 (canonical 内蔵) に置くことで、置換 + エスケープのみで閉じる。

### セクション識別子 = model トップレベルキーの機械的同一視

`render` / `command_path` 等の非セクションキーが識別子に混入し、将来の model キー追加が無審査でテンプレ語彙になる。閉集合の明示列挙 (§2.2) を採る。

### 文言位置の構文 strict 化 (テンプレ位置と同じ definition-error)

散文には `{` が普通に現れ、既存文言を壊す。文言位置は寛容 (非マッチ literal 素通し)、テンプレ位置は strict、の非対称を意図して採る。

### wire に載せず、レンダラ API 引数のみ (REND-Q1 案 c)

定義ファイルだけで表示意図が完結せず、多言語で同じカスタマイズが移植できない。

### binding 補間なし (REND-Q3 案 b)

version binding の実需 (kawaz 承認 signal) を満たせない。アプリが文字列を組んでから渡す方式は、定義ファイル内の文言に version を埋められない。

### category_mode default = all の vacuous 維持 (REND-Q4 案 a)

v1 完備主義 — `help_all_category` が canonical で意味を持たない軸のまま残り、旧 HIP-Q バッチで消えた「グループ hidden」論点も未回収になる。

### 常に詳細説明形式 / 常に 1 行の既定 (REND-Q5 案 b / c)、merge / omit 既定 (REND-Q6 案 a / c)

複雑度で自動切替 + 語彙で明示選択可能 (auto) が単純ケースの密度と複雑ケースの可読性を両立する。merge / omit は origin 素材を活かさない既定になる。

### completion 表示 policy の同梱 (REND-Q7 案 b)

§7 のとおりレンダラ層の語彙が流用できず、独立 issue 側に order 語彙確定済みの受け皿がある。

### entry 個別席への types_style / origin_style の追加

entry 単位の上書き需要が実在するのは value_structure 表記 (この option だけ詳細形式で出したい) のみで、types 集約と origin 方式は一覧全体の一貫性が本質のため entry 単位で割る需要が薄い。個別席は `help_value_structure_style` の 1 語彙に絞る。

## 波及

### schema

- `schema/wire.schema.json`: command 要素 / ルートの `help_render` 席 (4 キー + enum 値域)、entry の `help_value_structure_style`、グループ宣言 entry の `hidden` 許可
- `schema/fixture.schema.json`: help model の `render` 席、entry の `value_structure_style`、group entry の `hidden`
- `schema/builtin-descriptors.json`: help_installer descriptor の owns に `help_render` / `help_value_structure_style` を追加

### fixtures

- 搬送: `help_render` の階層継承 (キー単位の子上書き) → `render` 射影、entry 上書き、template 文字列の opaque 搬送、group hidden の射影と category_mode 3 分岐の model 不変性 (default / all で entry 集合同一のまま)
- definition-error: template 構文不正・`help_render` の席違い・enum 値域外の `invalid-range`

### 関連 DR

- DR-113 §8.1 に本 DR による update 注記 (グループ宣言 entry の `hidden` 許可)。§1 の回収語彙列挙にも `help_render` / `help_value_structure_style` の追記
- INDEX の DR-113 行に updated by DR-115 の注記

### 実装 (lockstep 窓に同乗)

- kuu.mbt: help_installer の回収語彙拡張・definition-time 検査 (template 構文 / enum 値域 / 席検査)・`render` 射影・group hidden 射影
- kuu-cli: canonical レンダラ実装 (テンプレ適用・binding 補間・§5 の部品表記と既定 policy・group hidden の入口注記) と `--binding` オプション。出力の安定性は product 側 golden テストで担保 (§6.3)
- `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` へ生成器の既定表示 policy (候補説明・deprecated マーカー) を追記 (別 task)

## 射程外

- help / help_long / help_epilog のフォーマット位相 (plain / markdown 等) の宣言と解釈。v1 の文言はフォーマット無指定の素材として搬送する
- プリミティブ層の全て: 端末幅・折返し・整列・色・ページング・stdout / stderr
- 翻訳・L10n、man / Markdown 生成
- `-h` / `--help` の出し分け・help / help_long 相互フォールバックの変更 (DR-113 §4.4 のレンダラ policy のまま)
- レンダラ API の言語別具体形 (closure 差し替えの API 設計)
- 未解決 binding 挙動・入口注記文言の規範化

## リスク・悪い面

- 語彙を wire に載せる = 全実装に受理・搬送義務。レンダラを持たない consumer にも inert 属性の搬送コストが付く (表示メタ全般と同じ性質、増分は一括席 1 + entry 席 1 + group hidden)
- enum 値名 (`"detail"` 等) が canonical レンダラの表示形式に由来し、独自レンダラの解釈は非規範のため実装間で見た目が揃わない (「同じ定義なら同じ help」を期待するユーザには驚き)
- Q4 = b は DR-113 小改訂 + schema / fixtures / kuu.mbt の追随が lockstep 窓に入るスコープ増
- `{name}` 補間は「最初の一歩」リスク — 条件分岐の要求は将来必ず来る。§2.1 / §3 の境界明記と reject 前提の固定が防波堤
- 出力非 pin の対極リスク: kuu-cli の help 出力が実装都合で揺れても conformance は検知しない。§6.3 の product golden テストを実装しないとバイト移行需要の実質が空洞化する
- テンプレの typo プレースホルダ (`{opitons}` 等) は binding 扱いで silent に literal 残置される。検出は lint の領分
- テンプレ位置 strict / 文言位置寛容の非対称は学習コスト (根拠は却下案の節)
- 既存文言の移行リスク: 識別子規則に合致する brace 列 (`{name}` 等) を含む既存文言は、同名 binding が供給された時点で silent に置換される。§3 導入後の移行では literal を意図する箇所を `{{...}}` エスケープへリライトする必要がある
- `separate_section` 既定は多数派 CLI 慣習 (cargo 等の merge 型) から乖離する。origin 素材を活かす設計判断を優先した意図的な乖離だが、merge 慣習からの移行者には差分として現れる

## 関連

- DR-113 (help model — 入力契約、§8.1 を本 DR が update)
- DR-114 (universal fn — binding とは別機構であることに注意: default_fn はセル値の解決、binding は表示時補間)
- DR-109 §1 柱 4 (共通化の上限 — semantic model + policy まで共通、renderer は言語側)
- DR-060 §5 (責務 4 層の先例 — 生成器席の相似形)
- DR-058 (hidden — 受理不変・表示 policy の原則)
- DR-053 / DR-054 (素材とレンダラの分離)
- DR-022 (snake_case — プレースホルダ識別子の系)
- DR-014 (config の階層継承 — 同機構・別席)
- `docs/findings/2026-07-21-help-renderer-design-plan.md` (設計プラン、REND-Q バッチの出所)
- `docs/findings/2026-07-17-cli-help-vocab-survey.md` (clap help_template / picocli sectionKeys の実測)
- `docs/findings/2026-07-19-help-display-order-and-visibility-patterns.md` (origin 4 方式・cargo -Z 型の実測)
- `docs/issue/2026-07-18-help-renderer-design.md` (発題 issue)
- `docs/issue/2026-07-18-completion-ordering-and-lazy-candidates.md` (REND-Q7 の統合先)
