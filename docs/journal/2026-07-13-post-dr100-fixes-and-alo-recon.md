# 2026-07-13 post-DR-100 fixes and ALO recon

DR-101 (filter 名の未登録は definition-error) サイクルとは別筋で、
kuu.mbt 側の実装調査から浮かび上がった 3 系統の作業を記録する:
TypeShadow carry gap の一般化と副産物の plain bool default バグ (A)、
独立発見の bugs2 系実装バグ 2 件 (B)、tar 実機観測から生まれた
exclusive_group at-least-one 語彙欠落の検討 (C)。A/B は spec 側 fixture
pin と kuu.mbt 側実装修正が対で完結、C は issue 起票のみで裁定は未了
(status: idea)。

## A. carry/bool 修正

### 現象・原因

DR-099 journal (`2026-07-12-dr099-100-reference.md`) で把握されていた
TypeShadow carry gap — `dec_or_leaf`/`dec_positional_group` (or 分岐・
positional group 内側 leaf の decode 経路) が `TypeShadow` から
`base`/`int_round` の 2 フィールドしか carry しない — を一般化する形で
着手された。configurable factory で作った方言型 (`bool_parser` の
`bool_true_values`/`bool_false_values`、`number_parser` の
`number_allow_base_prefix` 等) を or 枝の葉や positional group 内側に
置くと、その枝だけ config が黙って canonical default に落ちる (エラー
は出ない) 挙動が残っていた。

修正の過程でもう 1 つ別根のバグが露見した: `ensure_entity` の暗黙
`default:false` 注入が `TBool` 全体 (plain bool + flag preset 由来の
`TBool`) にかかっていた。しかし `default:false` は **flag preset 固有の
展開** (LOWERING §A.5) であって、plain bool (`type: "bool"` を直接使う
通常要素) は他の値型と同様「未発火なら absent」が正しい。単純な条件
変更だけでは既存 fixture 65 件が回帰することを実測確認しており、
`normalize_option` の `TFlag`→`TBool` 書き換えと同じ場所で
`default:false` を前倒し確定させる形で対処した。

### spec 側 pin

- `14c15d0859a3` (`fixtures(value-typing): or 枝 / positional group 内側の
  factory config carry を pin`) — `or-leaf-factory-config.json` /
  `positional-group-factory-config.json` を新設。`yn_bool`
  (`bool_parser` + `bool_true_values`/`bool_false_values`) と `hex_num`
  (`number_parser` + `number_allow_base_prefix:true`) を or 枝の葉型に
  使い、方言 config が効いて初めて成立する枝と、方言なしでは成立しない
  対照 (`int`, canonical) を並べる。判別入力は「方言 config がある場合
  のみ成立する」トークン (`"yes"`/`"no"`/`"0x10"`) を選び、or 両枝が
  同時成立する ambiguous を避ける (DR-038 の完全経路一意性)
- `0e0a8b90ac99` (`docs(DESIGN): §9.3 requires bool 充足の文言精密化 +
  fixtures why 追記`) — DESIGN §9.3 の「bool は preset の暗黙
  default:false を常に持つ」という誤った一般化を「**plain bool は
  暗黙 default を持たない** — flag preset 固有の展開」に訂正。同時に
  `or-leaf-factory-config.json` の `bool-dialect-or-leaf-fallback-to-int-branch`
  / `bool-dialect-direct-option-baseline` の 2 case に「plain bool への
  暗黙 default:false 誤注入は carry gap とは別根の実装バグ」という
  区別を明記する why を追記した (この区別が無いと carry 修正が bool
  default バグを隠蔽したまま green になりうる)

### kuu.mbt 側修正

`00d1036eb5f0` (`fix(core): dec_or_leaf の TypeShadow 全フィールド
carry + plain bool 暗黙 default:false 除去`)。`dec_or_leaf` を
`dec_positional` と同じ全 7 フィールド (`allow_base_prefix`/
`bool_config`/`is_tty`/`tty_stream`/`tty_cygwin` 含む) carry に一般化。
`ensure_entity` の暗黙 `default:false` 注入対象を `TFlag` のみに絞り、
plain `TBool` は absent とした。wbtest 追加: `dec_or_leaf` 全フィールド
carry (2 件) / `ensure_entity` の `Entity.default_values` 直接 pin
(1 件、TFlag 由来 TBool と plain TBool の対照)。

kuu.mbt 側 issue: `typeshadow-carry-gap-or-leaf-positional-group`
(carry gap 本体) / `group-inner-bool-default-false-duplicate-top-level`
(bool default 副産物、いずれも archive 済み)。

## B. bugs2 修正

DR-099/100 サイクルとは独立に、kuu.mbt 実装調査中に発見された実装バグ
2 件。いずれも「spec fixture で実機挙動を pin → kuu.mbt 側で根治」の順で
処理した。

### B-1. BGroup bounded repeat が max を無視して over-consume

positional group (`{"name":..,"positionals":[...]}` の入れ子) の直後に
通常 positional が続く定義で、group が `repeat:{min:1,max:1}` のような
bounded (max 有限) 指定でも常に unbounded 相当 (greedy-max-forever) で
評価され、group が全トークンを飲み込んで後続 positional が
`missing_operand` になる不具合。

- spec pin: `9ed45189c19d` (`fixtures(repeat-parse): positional group
  直後の positional 消費バグを pin`) — `group-trailing-positional.json`。
  `grp` (repeat:{min:1,max:1}、positionals:[gflag]) の直後に `ctrl`
  (通常 positional) を置き、argv `["a","b"]` で `grp:[{gflag:"a"}],
  ctrl:"b"` の success を期待値として pin (実機は当時
  `fail:missing operand for ctrl`)。対照ケース `["a"]` (1 トークンのみ、
  構造的に両方は満たせない) は bug の有無に関わらず failure が正しい
  ベースラインとして併記
- kuu.mbt 修正: `86090c0fcda6` (`fix(core): BGroup bounded repeat
  (repeat:{min,max}) が max を無視して over-consume する不具合を修正`)
  — `IdxRepeat(String, Node, Int)` に `budget: Int?` (4th field) を追加
  し、`lower_positional` の BGroup ケースで `elem_repeat(e).max` を
  lowering 時に反映。`budget=None` (unbounded) の既存挙動は完全に不変
  (KNOWN GAP の backtrack 欠如テストは変更なし — bounded ケースは
  over-consume 自体が起きなくなるため backtrack 追加なしで解決)

kuu.mbt 側 issue: `positional-group-trailing-missing-operand`
(archive 済み)。

### B-2. structural or (型付き枝) + required の値供給時 missing

`{"required": true, "or": [{"type": ..., "name": ...}, ...]}` の形
(structural or、枝が型付き leaf を持つ) で、いずれの枝に値を供給しても
required missing エラーになる不具合。同じ `or + required` の組合せでも
value-enum 形 (`{"exact": ...}` の匿名照合枝) は正常動作しており、
structural 形とのみ非対称にバグが出ていた。

- spec pin: `d390df20fd3a` (`fixtures(constraints-parse): structural or
  + required の値供給時 missing バグを pin`) —
  `required-structural-or-branch.json` (structural 形、int 枝/bool 枝、
  値供給 2 case で success を期待するが実機は
  `fail:required 'level' is missing`) と
  `required-value-enum-or-branch.json` (対照、exact 枝は正常動作を
  確認済みとして pin) の 2 fixture。両者の非対称性がバグの輪郭そのもの
- kuu.mbt 修正: `2b8c0e23f2e6` (`fix(core): structural or (型付き枝) +
  required の値供給時 missing バグを修正`) — `CRequired(String)` を
  `CRequired(String, Array[String])` (display, candidates) に拡張。
  以前は BOr (structural or) の required 判定が wrapper 自身の name
  (値を持たない構造ディスパッチャ) で行われていたため、実際の値が
  選ばれた枝の leaf entity にのみ commit される structural 形では常に
  missing 判定になっていた。`inst_constraint` (installer.mbt) が BOr
  の場合は各枝の leaf name を candidates に展開し、eval.mbt (KTop 粗
  判定) / resolve.mbt (最終判定) は candidates のいずれか 1 つでも
  型委譲で充足していれば required OK と判定する (DR-093「or 親の値
  充足 = どの枝であれ発火して値が確定していること」を required 判定
  実装に反映)。BEnum (value-enum 形) は全枝が同じ name/cell に着地する
  ため candidates=[display] のまま従来どおり、通常要素 (BCell) も
  candidates=[display] の単一要素配列で判定は従来と完全に同一 (回帰なし)

kuu.mbt 側 issue: `structural-or-type-branch-required-missing`
(archive 済み)。

## C. ALO (at-least-one) 検証

corpus tar 実機検証 (2026-07-12、bsdtar 3.5.3) で `tar -vzf
archive.tar.gz` (モード文字 `c`/`t`/`x` 等を一切指定しない呼び出し) が
`Must specify one of -c,-r,-t,-u,-x` の必須違反エラーになることを観測
した。kuu の現行語彙にこの制約を表現する手段が無いことが判明し、issue
`docs/issue/2026-07-12-exclusive-group-at-least-one-required.md`
(status: idea) を起票済み。本文は現象・仕様根拠 (DESIGN §9.2 の
`exclusive_group` — 排他のみ規定、必須性は未規定) と受け入れ条件のみで、
以下の 3 案は issue 本文に未反映 (会話ログのみ):

- **ALO-a** (統括推し): definition/scope 側に groups 座席新設
  (`"groups": {"mode": {"required": true}}`)
- **ALO-b**: `exclusive_group` の object 詳細形 (`{"name": ..., "at_least_one": true}` 相当)
- **ALO-c**: 見送り (対応不要と裁定する案)

いずれも未裁定。次サイクルで issue 本文への反映・裁定が必要。

## Failed Attempts

kawaz が会話中に出したスケッチ `{required:true, or:[{ref}...]}`
(既存の or + required 語彙をそのまま group 必須に転用する案) は
不成立と判明した。kuu の `or` は **共有トリガ後の値文法分岐専用** —
1 つの要素が発火した後に、その値をどの型で読むかを分岐する構造
(`or-leaf-factory-config.json` の `switch`/`addr` のように、1 option
に対し int/bool/hex の読み方を分岐する形)。tar のモード必須が要求する
のは「独立した複数トリガ (flag) のうち少なくとも 1 つが発火する」制約
であり、各 flag は独自のトリガ (`-c`/`-t`/`-x` それぞれの CLI token)
と ref を持つ。or の枝は「独自のトリガ/ref を持てない」(トリガは or
親の 1 箇所に集約される) ため、tar 型 (独立トリガ flag 群の中から
at-least-one) をこの語彙で表現することはできない。

既存語彙で書ける形は「値選択型 (or + required、1 つの入力値をどう型
解釈するかの選択、B-2 の fixture 群がまさにこの形)」のみで、tar 型
(独立トリガ flag 群からの選択) は既存語彙の外側にある新規語彙 (ALO-a/b)
を要する、という整理がこの検証の主な学習点。

## 関連

- `docs/decisions/DR-093-required-type-directed-satisfaction.md`
  (required の型委譲、B-2 の根拠)
- `docs/decisions/DR-099-tty-is-a-preset-type.md` §2 (`resolved_default
  = fold(観測) ?? 宣言 default ?? absent`、A で参照した plain bool
  absent 終端の裏付け)
- `docs/decisions/DR-100-config-key-prefix-normalization.md`
  (`bool_` prefix、A の fixture が使う `bool_true_values` 等の語彙)
- `docs/issue/2026-07-12-exclusive-group-at-least-one-required.md`
  (ALO issue、status: idea のまま)
- `fixtures/value-typing/or-leaf-factory-config.json` /
  `fixtures/value-typing/positional-group-factory-config.json` (A pin)
- `fixtures/repeat-parse/group-trailing-positional.json` (B-1 pin)
- `fixtures/constraints-parse/required-structural-or-branch.json` /
  `fixtures/constraints-parse/required-value-enum-or-branch.json`
  (B-2 pin)
- kuu.mbt `docs/issue/archive/2026-07-12-typeshadow-carry-gap-or-leaf-positional-group.md`
- kuu.mbt `docs/issue/archive/2026-07-13-group-inner-bool-default-false-duplicate-top-level.md`
- kuu.mbt `docs/issue/archive/2026-07-13-positional-group-trailing-missing-operand.md`
- kuu.mbt `docs/issue/archive/2026-07-13-structural-or-type-branch-required-missing.md`
- 前回 journal: `docs/journal/2026-07-12-dr099-100-reference.md`
