# 型入力構造の splice — type が kuu 定義片で自分の消費文法を宣言する

> 由来: kawaz チャット議論 2026-07-31 (ccmsg r98 mid=8〜10)。発端は「`--timerange TIMERANGE` が
> string (`5m..now`) と pair (`[since, until]`) のどちらでも受けられる構造を descriptor でどう書くか」。
> tuple 型を value-type 体系に足す案 (統括提示) に対し、kawaz が「pair は kuu の positionals で
> 書けば良いのでは」と反転させた。DR 起草前の下敷き。record 型 (DR-126、出力側) とは独立で、
> こちらは**入力側**の機構。

## 0. TLDR

type は自分の CLI 消費文法を **kuu の wire 定義片 (or / seq / typed leaves)** で宣言する。
値スロットに当該 type が現れたら定義片を lowering 時に **splice** (template / preset 展開と同位相)、
sub-parse の結果 (or → union、seq → kv) を value_parser が受けて宣言済み出力型 (record 等、DR-126)
の JSON に変換して返す。tuple 型は不要になる (pair は定義片の seq がそのまま表す)。

## 1. 確定した骨格 (チャット裁定)

1. **入力宣言は kuu 定義片** (mid=9): 例 — timerange の入力は
   `{"or": [[{"name":"range","type":"string"}], [{"name":"since","type":"string"},{"name":"until","type":"string"}]]}`。
   1 トークン形と 2 トークン形の曖昧性解決は既存の or 枝選択 / Reject / バックトラック /
   variable-arity 機構がそのまま担う
2. **展開は lowering 時の splice** (mid=10): template / preset 展開と同位相。type preset が既に構造を
   注入している前例 (flag → bool + default、config_file → config 配線、tty → default 席規則) の一般化
3. **隔離境界 (sealed scope)** (mid=10): 定義片の namespace はそこで閉じる —
   - 定義片内から descriptor 外への link / ref 参照は不可
   - 定義片内の export_key は内部消費 (value_parser への入力の組み上げ) 専用で、外の result に漏れない
   - 「そのまま展開」ではなく隔離小世界。唯一の出力は value_parser へ渡る構造化 Value
4. **env 供給は string 枝のみ** (mid=10): env は string 1 本。それがパース不能なら受け入れ不可 (Reject 系)。
   sub-parse (トークン消費文法) は CLI 専用の概念
5. **config 供給は sub-parse を通らない** (mid=10 で統括理解に異議なし): 構造化 JSON は value_parser の
   入力へ直行。io_type.input (value-type 体系) は「供給値の形」の宣言として残り、定義片は
   「CLI トークン文法」の宣言 — 2 つは別軸で並ぶ
6. **拡張型の価値** (mid=10): 追加タイプが「type 名 + 構造宣言」でリッチな IO を持て、
   description 散文への依存が減る

## 2. 未確定の設計課題 (DR 起草前に詰める)

- **help 生成との整合** — 分析済み (2026-07-31、fable5-low 分析を統括が実物裏取り)。
  **結論: 既存 value_structure 表示への完全委譲で新規範ほぼゼロ**:
  - 決定的な先例 = `help_category` preset (DR-113 §2.3): 「type descriptor 由来で注入された構造が
    `value_structure` として help model に射影される」規範が既に存在する。splice はその一般化
  - 1 行合成 `<RANGE | <SINCE UNTIL>>` は DR-115 §5.1 `value_structure_style: "auto"` の既定挙動として規定済み
  - sealed scope が閉じるのは ref/link/export_key/result への露出であり、表示メタ (value_name、
    name からの uppercase 導出) は元々結果非露出 — fragment leaf の name を usage プレースホルダに
    使うのは既存規範と無矛盾。新概念不要
  - 「type 側が help 表示文字列を明示する」案は不採用 — DR-113 が「usage 一行文字列を model に含める」を
    却下済み (素材/policy 分離)。上書き需要は既存語彙 (value_name / help_value_structure_style) で充足
  - DR 起草時に決める残り: (i) registry 宣言 type を model の `types` 集約に載せるか (id namespace が
    definitions 側と未規定、v1 は inline 固定でも成立)、(ii) 位相の pin 文言 (help_query の読む断面に
    input_structure 由来構造が乗る — DR-113 §2.3 と同じ書き方)、(iii) fragment 内 repeat の可否
    (sealed scope 語彙範囲と連動)、(iv) ネスト splice の model 表現 (type_ref ネストで可能、可否は
    sealed scope 規則に従属)
- **補完**: 定義片内の枝・typed leaf の補完候補が外の補完機構にどう合流するか (splice なら
  構造は見えるはずだが、sealed scope の名前が候補 origin にどう出るか)
- **sealed scope の精密規則**: 定義片内で使える語彙の範囲 (installer 所有語彙はどこまで /
  定義片内の definitions は持てるか / ネスト = 定義片内の typed leaf がさらに定義片持ち type の場合)
- **descriptor での置き場**: `io_type.input` (value-type、供給値形) とは別軸の新フィールド
  (仮: `input_structure`、wire.schema の部分集合を参照)
- **既存 type (string/number/bool 等) との関係**: 定義片を持たない type は従来どおり 1 トークン消費
  (デフォルトの縮退形)。定義片は opt-in

## 3. 関連

- DR-126 (出力側の record 型 — 本機構の出口の型宣言)
- DR-107 §3 (value-type 体系 — tuple 不要になった経緯はこのノート §0)
- docs/research/2026-07-28-link-fixed-path-dsl-design.md §4b (record 裁定の正本)
- DESIGN §12b / DR-099 (type preset が構造・挙動を注入する前例)
- DR-030 / DR-046 (nameless 子・実体だけノード — 定義片内の leaf の座)
- fixtures/path-search/variable-arity-ambiguous.json (可変 arity 曖昧性の既存 pin)
